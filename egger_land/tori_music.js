/**
 * Tori Music Library
 * MML Studioで出力したJSONデータをBGMとして再生するゲーム用ライブラリ
 */

const ToriAudio = (function() {
    let audioCtx = null;
    let noiseBuffer = null;
    let activeMusic = null; // 現在再生中のMusicオブジェクトを保持（排他制御用）

    // Web Audio APIの初期化
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (!noiseBuffer) {
            const size = audioCtx.sampleRate * 2;
            noiseBuffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
            const out = noiseBuffer.getChannelData(0);
            for (let i = 0; i < size; i++) out[i] = Math.random() * 2 - 1;
        }
    }

    // ファミコン風波形生成
    function createFamicomWave(ctx, type) {
        if (type.startsWith('square')) {
            const duty = { 'square12': 0.125, 'square25': 0.25, 'square50': 0.5 }[type] || 0.5;
            const real = new Float32Array(32), imag = new Float32Array(32);
            for (let i = 1; i < 32; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(Math.PI * i * duty);
            return ctx.createPeriodicWave(real, imag);
        }
        return null;
    }

    const TICKS_PER_BEAT = 24;

    class Music {
        constructor(numberStr) {
            this.number = numberStr;
            this.data = null;
            this.isLoaded = false;
            this.isPlaying = false;
            this.playRequested = false;
            this.playParams = [];

            // プロパティアクセスのためのキー変数（下位互換対応）
            this.kT = 'tick';
            this.kL = 'len';
            this.kP = 'pitchIdx';
            this.kV = 'vol';

            // オーディオノード管理
            this.masterGain = null;
            this.activeNodes = [];
            this.scheduleTimer = null;
            this.currentPlayTick = 0;
            this.nextTickTime = 0;

            this._loadData();
        }

        // JSONファイルのフォールバック読み込み
        async _loadData() {
            const paths = [
                `music_${this.number}.json`,
                `resource/music_${this.number}.json`,
                `resource/music/music_${this.number}.json`
            ];

            for (let path of paths) {
                try {
                    const res = await fetch(path);
                    if (res.ok) {
                        this.data = await res.json();
                        
                        // --- キー名の省略形式(t,l,p,v)か従来形式かを1件目のデータで判定 ---
                        let firstNote = null;
                        for (let track of this.data.mml_data.tracks) {
                            if (track.notes && track.notes.length > 0) {
                                firstNote = track.notes[0];
                                break;
                            }
                        }
                        if (firstNote && firstNote.t !== undefined) {
                            // 新フォーマット（省略形）
                            this.kT = 't'; this.kL = 'l'; this.kP = 'p'; this.kV = 'v';
                        } else {
                            // 旧フォーマット
                            this.kT = 'tick'; this.kL = 'len'; this.kP = 'pitchIdx'; this.kV = 'vol';
                        }

                        this.isLoaded = true;
                        // ロード完了前にplay()が呼ばれていた場合は、ロード完了後に自動再生
                        if (this.playRequested) {
                            this.play(...this.playParams);
                        }
                        return;
                    }
                } catch (e) {
                    // 無視して次のパスを試す
                }
            }
            console.error(`[tori_music] Error: music_${this.number}.json could not be loaded from any expected directories.`);
        }

        /**
         * 音楽を再生する
         * @param {number} masterVolume 0～100 (デフォルト100)
         * @param {number} pitch -30～+30 (デフォルト0) 半音単位
         * @param {number} tempoRate 1～200 (デフォルト100) パーセント
         * @param {boolean} playTr1 トラック1を再生するか (デフォルトTrue)
         * @param {boolean} playTr2 トラック2を再生するか (デフォルトTrue)
         * @param {boolean} playTr3 トラック3を再生するか (デフォルトTrue)
         * @param {boolean} playTr4 トラック4を再生するか (デフォルトTrue)
         */
        play(masterVolume = 100, pitch = 0, tempoRate = 100, playTr1 = true, playTr2 = true, playTr3 = true, playTr4 = true) {
            if (!this.isLoaded) {
                this.playRequested = true;
                this.playParams = arguments;
                return;
            }

            initAudio();

            // 排他制御: 他の曲が再生中なら自動的に止める
            if (activeMusic && activeMusic !== this && activeMusic.isPlaying) {
                console.warn(`[tori_music] Warning: music_${activeMusic.number} is currently playing. It will be automatically stopped.`);
                activeMusic.stop();
            }

            activeMusic = this;
            this.stop(); 
            this.isPlaying = true;
            this.playRequested = false;

            this.params = {
                vol: Math.max(0, Math.min(100, masterVolume)) / 100,
                pitch: Math.max(-30, Math.min(30, pitch)),
                tempo: Math.max(1, Math.min(200, tempoRate)) / 100,
                tracks: [playTr1, playTr2, playTr3, playTr4]
            };

            this.masterGain = audioCtx.createGain();
            this.masterGain.gain.value = this.params.vol;
            this.masterGain.connect(audioCtx.destination);

            this.currentPlayTick = 0;
            this.nextTickTime = audioCtx.currentTime + 0.05;
            this._sequencerLoop();
        }

        stop() {
            this.isPlaying = false;
            this.playRequested = false;
            if (this.scheduleTimer) {
                cancelAnimationFrame(this.scheduleTimer);
                this.scheduleTimer = null;
            }
            this.activeNodes.forEach(n => {
                try { n.source.stop(); } catch (e) {}
                n.source.disconnect();
                if (n.gainNode) n.gainNode.disconnect();
            });
            this.activeNodes = [];
            if (this.masterGain) {
                this.masterGain.disconnect();
                this.masterGain = null;
            }
        }

        fadeOutStop(durationSec = 2.0) {
            if (!this.isPlaying || !this.masterGain) return;
            this.isPlaying = false; 
            if (this.scheduleTimer) {
                cancelAnimationFrame(this.scheduleTimer);
                this.scheduleTimer = null;
            }
            
            const currTime = audioCtx.currentTime;
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, currTime);
            this.masterGain.gain.linearRampToValueAtTime(0.01, currTime + durationSec);
            
            setTimeout(() => { this.stop(); }, durationSec * 1000 + 100);
        }

        _schedulePlaybackTrack(note, trackData, tIdx, sTime) {
            const baseTempo = this.data.mml_data.tempo || 120;
            const actualTempo = baseTempo * this.params.tempo;
            const secPerTick = (60 / actualTempo) / TICKS_PER_BEAT;
            
            // 音の長さ
            const dur = note[this.kL] * secPerTick;
            
            // ボリュームのフォールバック処理
            const noteVol = note[this.kV] !== undefined ? note[this.kV] : (this.data.mml_data.defaultVol !== undefined ? this.data.mml_data.defaultVol : 80);
            const maxVol = (noteVol / 100) * 0.3;
            
            const gainNode = audioCtx.createGain();
            gainNode.connect(this.masterGain);

            if (tIdx === 3) {
                // ノイズ(ドラム)トラック
                const p = note[this.kP];
                if (p === 36) { // Kick
                    const osc = audioCtx.createOscillator(); osc.type = 'sine';
                    osc.frequency.setValueAtTime(150, sTime); osc.frequency.exponentialRampToValueAtTime(0.01, sTime + 0.15);
                    gainNode.gain.setValueAtTime(maxVol * 2, sTime); gainNode.gain.exponentialRampToValueAtTime(0.01, sTime + 0.15);
                    osc.connect(gainNode); osc.start(sTime); osc.stop(sTime + 0.15);
                    this.activeNodes.push({ source: osc, gainNode: gainNode, endTime: sTime + 0.15 });
                } else if (p === 38) { // Snare
                    const tri = audioCtx.createOscillator(); tri.type = 'triangle';
                    tri.frequency.setValueAtTime(150, sTime); tri.frequency.exponentialRampToValueAtTime(50, sTime + 0.1);
                    const triGain = audioCtx.createGain();
                    triGain.gain.setValueAtTime(maxVol, sTime); triGain.gain.exponentialRampToValueAtTime(0.01, sTime + 0.1);
                    tri.connect(triGain); triGain.connect(gainNode);
                    tri.start(sTime); tri.stop(sTime + 0.1);
                    this.activeNodes.push({ source: tri, gainNode: triGain, endTime: sTime + 0.1 });
                    
                    const nSrc = audioCtx.createBufferSource(); nSrc.buffer = noiseBuffer;
                    const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 1000;
                    const nGain = audioCtx.createGain();
                    nGain.gain.setValueAtTime(maxVol, sTime); nGain.gain.exponentialRampToValueAtTime(0.01, sTime + 0.2);
                    nSrc.connect(filter); filter.connect(nGain); nGain.connect(gainNode);
                    nSrc.start(sTime); nSrc.stop(sTime + 0.2);
                    this.activeNodes.push({ source: nSrc, gainNode: nGain, endTime: sTime + 0.2 });
                } else if (p === 40) { // CHH
                    const hSrc = audioCtx.createBufferSource(); hSrc.buffer = noiseBuffer;
                    const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 7000;
                    gainNode.gain.setValueAtTime(maxVol * 0.5, sTime); gainNode.gain.exponentialRampToValueAtTime(0.01, sTime + 0.05);
                    hSrc.connect(filter).connect(gainNode); hSrc.start(sTime); hSrc.stop(sTime + 0.05);
                    this.activeNodes.push({ source: hSrc, gainNode: gainNode, endTime: sTime + 0.05 });
                } else if (p === 41) { // OHH
                    const hSrc = audioCtx.createBufferSource(); hSrc.buffer = noiseBuffer;
                    const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 7000;
                    gainNode.gain.setValueAtTime(maxVol * 0.5, sTime); gainNode.gain.exponentialRampToValueAtTime(0.01, sTime + 0.3);
                    hSrc.connect(filter).connect(gainNode); hSrc.start(sTime); hSrc.stop(sTime + 0.3);
                    this.activeNodes.push({ source: hSrc, gainNode: gainNode, endTime: sTime + 0.3 });
                } else if (p === 43) { // Crash
                    const cSrc = audioCtx.createBufferSource(); cSrc.buffer = noiseBuffer;
                    const filter = audioCtx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 4000;
                    gainNode.gain.setValueAtTime(maxVol * 0.8, sTime); gainNode.gain.exponentialRampToValueAtTime(0.01, sTime + 1.0);
                    cSrc.connect(filter).connect(gainNode); cSrc.start(sTime); cSrc.stop(sTime + 1.0);
                    this.activeNodes.push({ source: cSrc, gainNode: gainNode, endTime: sTime + 1.0 });
                }
            } else {
                // メロディトラック
                const targetPitch = note[this.kP] + this.params.pitch;
                const freq = 440 * Math.pow(2, (targetPitch - 45) / 12);
                
                const trackInfo = this.data.track_info ? this.data.track_info[tIdx] : null;
                const waveType = trackInfo ? trackInfo.type : (tIdx === 2 ? 'triangle' : 'square50');
                const env = trackInfo ? trackInfo.env : {a: 0.01, d: 0.1, s: 0.5, r: 0.1};

                // 【修正箇所】
                // Release開始時間がsTime（発音開始時点）より過去になり、マイナス数値のクラッシュを引き起こすのを防ぐ
                let releaseStartTime = sTime + dur - env.r;
                if (releaseStartTime < sTime) {
                    releaseStartTime = sTime; 
                }

                // 【修正箇所】独自の時間補正をすべて取り除き、エディタ側の挙動・パラメータ順序と完全一致させる
                gainNode.gain.setValueAtTime(0, sTime);
                gainNode.gain.linearRampToValueAtTime(maxVol, sTime + env.a);
                gainNode.gain.linearRampToValueAtTime(maxVol * env.s, sTime + env.a + env.d);
                //gainNode.gain.setValueAtTime(maxVol * env.s, sTime + dur - env.r);
                gainNode.gain.setValueAtTime(maxVol * env.s, releaseStartTime);
                
                gainNode.gain.linearRampToValueAtTime(0, sTime + dur);
                
                const osc = audioCtx.createOscillator();
                if (waveType === 'triangle') osc.type = 'triangle';
                else osc.setPeriodicWave(createFamicomWave(audioCtx, waveType));
                
                osc.frequency.value = freq;
                osc.connect(gainNode); 
                osc.start(sTime); 
                osc.stop(sTime + dur);
                
                // ノードの解放監視時間もエディタ側の計算式（+1.0秒）に完全追従
                this.activeNodes.push({ source: osc, gainNode: gainNode, endTime: sTime + dur + 1.0 });
            }
        }
        _sequencerLoop() {
            if (!this.isPlaying) return;

            const baseTempo = this.data.mml_data.tempo || 120;
            const actualTempo = baseTempo * this.params.tempo;
            const secPerTick = (60 / actualTempo) / TICKS_PER_BEAT;

            while (this.nextTickTime < audioCtx.currentTime + 0.1) {
                this.data.mml_data.tracks.forEach((track, tIdx) => {
                    if (this.params.tracks[tIdx]) {
                        track.notes.forEach(note => {
                            if (note[this.kT] === this.currentPlayTick) {
                                this._schedulePlaybackTrack(note, track, tIdx, this.nextTickTime);
                            }
                        });
                    }
                });

                this.nextTickTime += secPerTick;
                this.currentPlayTick++;

                const loopStartTick = ((this.data.mml_data.loopS || 1) - 1) * TICKS_PER_BEAT;
                const loopEndTick = ((this.data.mml_data.loopE || 17) - 1) * TICKS_PER_BEAT;

                if (this.currentPlayTick >= loopEndTick) {
                    this.currentPlayTick = loopStartTick;
                }
            }

            const currTime = audioCtx.currentTime;
            this.activeNodes = this.activeNodes.filter(n => n.endTime > currTime);

            if (this.isPlaying) {
                this.scheduleTimer = requestAnimationFrame(() => this._sequencerLoop());
            }
        }
    }

    return {
        loadMusic: function(number) {
            const numStr = String(number).padStart(2, '0');
            return new Music(numStr);
        }
    };
})();

const loadMusic = ToriAudio.loadMusic;