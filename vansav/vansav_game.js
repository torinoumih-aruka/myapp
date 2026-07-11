// vansav_game.js

// --- Global Variables & Constants ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SCREEN_W = 640;
const SCREEN_H = 360;
const MAX_TIME = 20 * 60; // 20 minutes in seconds
const MAX_DROPS = 500;
let FPS = 60;

// Assets
let PALETTE = {};
let SPRITES = {};
let PRE_RENDERED = {};

// Audio
const music = window.loadMusic ? loadMusic(5) : { play:()=>{}, stop:()=>{} };
let audioSE = null;

// Game State
let GAME = {
    mode: 'title', // title, shop, char_select, game, levelup, chest, result
    players: [],
    enemies: [],
    projectiles: [],
    items: [],
    particles: [],
    damageTexts: [],
    time: 0,
    is2P: false,
    frameCount: 0,
    stageBounds: { minX: -2000, minY: -2000, maxX: 2000, maxY: 2000 },
    bgFeatures: [],
    spawnTimer: 0,
    bossSpawned: [false, false, false], // 5, 10, 15
    coinsThisRun: 0,
    cameraX: 0,
    cameraY: 0,
    levelUpTurn: 0
};

// Inputs
let INPUTS = [
    { vx: 0, vy: 0 }, // 1P
    { vx: 0, vy: 0 }  // 2P
];

// Save Data
let SAVE_DATA = { coins: 0, hpLvl: 0, luckLvl: 0, lalaUnlocked: false };

const CHARACTERS = [
    { id: 'knight', name: 'ナイト', desc: '主人公。平均的なステータス。', hp: 100, atk: 10, def: 5, spd: 100, luck: 1, sprite: 'hero_knight_down_1', unlocked: true },
    { id: 'wiz', name: 'ウィザード', desc: '魔法使い。体力が少し低いが、素早く行動できる。', hp: 80, atk: 10, def: 6, spd: 130, luck: 2, sprite: 'hero_wiz_left_1', unlocked: false }
];

const EQUIP_DATA = {
    // Attack
    magic_bullet: { type: 'atk', name: '魔法弾', icon: 'item_magic_bullet', maxLvl: 10, desc: '前方に魔法弾を発射する。', enhance: '発射弾数+1 / 威力増加' },
    sword: { type: 'atk', name: 'ソード', icon: 'item_sword', maxLvl: 10, desc: '近い敵を切り裂く。', enhance: '攻撃範囲拡大 / 威力増加' },
    fireball: { type: 'atk', name: 'ファイヤーボール', icon: 'item_fireball', maxLvl: 10, desc: '周囲を回転する炎をまとう。', enhance: '炎の数+1 / 威力増加' },
    thunderbolt: { type: 'atk', name: 'サンダーボルト', icon: 'item_thunderbolt', maxLvl: 10, desc: 'ランダムな敵に雷を落とす。', enhance: '雷の数+1 / クールタイム-0.2秒' },
    poison_mist: { type: 'atk', name: 'ポイズンミスト', icon: 'item_poison_mist', maxLvl: 10, desc: '敵を遅延・毒状態にする霧。', enhance: '霧の数+1 / 威力増加' },
    bomb: { type: 'atk', name: 'ボム', icon: 'item_bomb', maxLvl: 10, desc: '前方に爆弾を投げる。', enhance: '爆発範囲拡大 / 爆発時間-0.1秒' },
    axe: { type: 'atk', name: 'オノ', icon: 'item_axe', maxLvl: 10, desc: '上空へオノを投擲する。', enhance: '発射数+1 / クールタイム減少' },
    // Buff
    scroll: { type: 'buf', name: '巻物', icon: 'item_scroll', maxLvl: 5, desc: '武器のクールタイムを短縮。', enhance: 'クールタイム追加短縮' },
    magnet: { type: 'buf', name: '磁石', icon: 'item_magnet', maxLvl: 5, desc: 'アイテムを引き寄せる。', enhance: '引き寄せ範囲拡大' },
    magnifier: { type: 'buf', name: '拡大鏡', icon: 'item_magnifier', maxLvl: 5, desc: '攻撃のサイズを大きくする。', enhance: 'サイズさらに拡大' },
    shield: { type: 'buf', name: 'シールド', icon: 'shield', maxLvl: 5, desc: '被ダメージを軽減する。', enhance: '防御力+2' }
};

const REQUIRED_SPRITES = [
    'item_magic_bullet', 'item_sword', 'item_fireball', 'item_thunderbolt', 'item_poison_mist',
    'item_scroll', 'item_magnet', 'item_magnifier', 'item_bomb', 'item_axe', 'shield',
    'exp', 'exp_m', 'exp_l', 'exp_xl', 'item_boots', 'item_cross', 'item_coin_bag'
];

// --- Initialization & Asset Loading ---
async function boot() {
    loadSaveData();
    try {
        const res = await fetch('assets.json');
        const data = await res.json();
        PALETTE = data.palette;
        SPRITES = data.sprites;
        
        REQUIRED_SPRITES.forEach(id => {
            if (!SPRITES[id]) {
                SPRITES[id] = [
                    "........", "........", "........", "........",
                    "........", "........", "........", "........"
                ];
            }
        });
        preRenderSprites();
        if(window.loadSE) audioSE = await loadSE();
    } catch(e) { console.error("Asset loading failed", e); }
    
    setupUIEvents();
    setupInputEvents();
    setMode('title');
    requestAnimationFrame(gameLoop);
}
function preRenderSprites() {
    const dotSize = 4;
    for (let key in SPRITES) {
        const cvs = document.createElement('canvas');
        cvs.width = 32; cvs.height = 32;
        const cCtx = cvs.getContext('2d');
        const spriteData = SPRITES[key];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const colorCode = spriteData[r][c];
                if (PALETTE[colorCode]) {
                    cCtx.fillStyle = PALETTE[colorCode];
                    cCtx.fillRect(c * dotSize, r * dotSize, dotSize + 0.5, dotSize + 0.5);
                }
            }
        }
        PRE_RENDERED[key] = cvs;
    }
}

// --- Save Data Management ---
function loadSaveData() {
    let data = localStorage.getItem('vansav_save');
    if (data) {
        try {
            let p = JSON.parse(data);
            SAVE_DATA.coins = p.coins || 0;
            SAVE_DATA.hpLvl = p.hpLvl || 0;
            SAVE_DATA.luckLvl = p.luckLvl || 0;
            SAVE_DATA.lalaUnlocked = p.lalaUnlocked || false;
        } catch(e) {}
    }
    CHARACTERS.find(c => c.id === 'wiz').unlocked = SAVE_DATA.lalaUnlocked;
}
function saveGameData() { localStorage.setItem('vansav_save', JSON.stringify(SAVE_DATA)); }

// --- Classes ---
class Player {
    constructor(id, charData, x, y) {
        this.id = id;
        this.name = charData.name;
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 32;
        this.maxHp = charData.hp + (SAVE_DATA.hpLvl * 10);
        this.hp = this.maxHp;
        this.baseAtk = charData.atk;
        this.baseDef = charData.def;
        this.baseSpd = charData.spd;
        this.baseLuck = charData.luck + SAVE_DATA.luckLvl;
        if (charData.id === 'knight') this.spriteNameBase = 'hero_knight';
        else if (charData.id === 'wiz') this.spriteNameBase = 'hero_wiz';
        else this.spriteNameBase = charData.sprite.split('_')[0];
        this.dir = 'down';
        this.angle = Math.PI/2;
        
        this.exp = 0;
        this.level = 1;
        this.maxExp = 10;
        this.equips = []; // { id: 'magic_bullet', lvl: 1 }
        
        this.invincibleTimer = 0;
        this.dead = false;
        
        // Internal weapon timers
        this.weaponTimers = {};
    }
    get spd() { return this.baseSpd; }
    get atk() { return this.baseAtk; }
    get def() {
        let shield = this.equips.find(e => e.id === 'shield');
        return this.baseDef + (shield ? shield.lvl * 2 : 0);
    }
    get maxAtkSlots() { return GAME.is2P ? 2 : 4; }
    get maxBufSlots() { return GAME.is2P ? 1 : 2; }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.w = 32; this.h = 32;
        this.type = type;
        this.dead = false;
        
        let hpMultiplier = GAME.is2P ? 1.05 : 1.0;
        this.ignoreWalls = false;
        this.isBoss = false;
        this.scale = 0.8; // Small by default
        
        // Base stats (ATK is effectively doubled compared to original here)
        if (type === 'snakey') { this.hp = 20; this.spd = 40; this.atk = 20; this.expDrop = 2; this.sprite = 'snakey_left'; }
        else if (type === 'medusa') { this.hp = 50; this.spd = 30; this.atk = 30; this.expDrop = 5; this.sprite = 'medusa_awake'; this.ignoreWalls = true; }
        else if (type === 'gol') { this.hp = 100; this.spd = 20; this.atk = 40; this.expDrop = 10; this.sprite = 'gol_down_awake'; }
        else if (type === 'don_medusa') { this.hp = 500; this.spd = 25; this.atk = 60; this.expDrop = 50; this.sprite = 'don_medosa_1'; this.isBoss = true; this.scale = 1.0; }
        else if (type === 'bat') { this.hp = 10; this.spd = 80; this.atk = 20; this.expDrop = 3; this.sprite = 'bat'; }
        else if (type === 'knight') { this.hp = 200; this.spd = 15; this.atk = 60; this.expDrop = 15; this.sprite = 'knight'; }
        else if (type === 'ghost') { this.hp = 30; this.spd = 90; this.atk = 30; this.expDrop = 5; this.sprite = 'ghost'; this.ignoreWalls = true; }
        else { this.hp = 10; this.spd = 50; this.atk = 4; this.expDrop = 1; this.sprite = 'snakey_left'; }
        
        // Size variations (Not applied to bosses)
        if (!this.isBoss && type !== 'ghost') {
            let r = Math.random();
            if (r < 0.05) { // 5% Large
                this.scale = 3.2; // 400% of small
                this.hp *= 10;
                this.atk *= 5;
                this.expDrop *= 3;
            } else if (r < 0.25) { // 20% Medium
                this.scale = 1.2; // 150% of small
                this.hp *= 2;
                this.atk *= 2;
                this.expDrop = Math.ceil(this.expDrop * 1.5);
            }
        }
        
        this.w *= this.scale;
        this.h *= this.scale;
        this.hp *= hpMultiplier;
        this.maxHp = this.hp;
        
        // Ranged attack timer
        this.attackTimer = 2.0;
    }
}

class Drop {
    constructor(x, y, type, val) {
        this.x = x; this.y = y; this.w = 16; this.h = 16;
        this.type = type; // exp, heart, boots, chest, cross, coin
        this.val = val;
        this.pulled = false;
        this.dead = false;
    }
}

// --- Input Handling ---
function setupInputEvents() {
    document.querySelectorAll('.vpad').forEach(pad => {
        const pIdx = parseInt(pad.getAttribute('data-player'));
        const stick = pad.querySelector('.vstick');
        let dragging = false;
        
        const updateStick = (ev) => {
            let rect = pad.getBoundingClientRect();
            let centerX = rect.left + rect.width/2;
            let centerY = rect.top + rect.height/2;
            let dx = ev.clientX - centerX;
            let dy = ev.clientY - centerY;
            let dist = Math.hypot(dx, dy);
            let maxDist = 35;
            if (dist > maxDist) {
                dx = (dx/dist) * maxDist;
                dy = (dy/dist) * maxDist;
            }
            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            INPUTS[pIdx].vx = dx / maxDist;
            INPUTS[pIdx].vy = dy / maxDist;
        };
        
        const resetStick = () => {
            stick.style.transform = `translate(0px, 0px)`;
            INPUTS[pIdx].vx = 0;
            INPUTS[pIdx].vy = 0;
            dragging = false;
        };
        
        const startDrag = (e) => { 
            e.preventDefault(); dragging = true; 
            updateStick(e.touches ? e.touches[0] : e); 
        };
        const moveDrag = (e) => { 
            if(!dragging) return; e.preventDefault(); 
            updateStick(e.touches ? e.touches[0] : e); 
        };
        
        pad.addEventListener('touchstart', startDrag, {passive: false});
        pad.addEventListener('touchmove', moveDrag, {passive: false});
        pad.addEventListener('touchend', resetStick);
        pad.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', resetStick);
    });

    let keys = { up: false, down: false, left: false, right: false };
    const updateKeys = () => {
        let vx = 0, vy = 0;
        if(keys.up) vy -= 1; if(keys.down) vy += 1;
        if(keys.left) vx -= 1; if(keys.right) vx += 1;
        let len = Math.hypot(vx, vy);
        if (len > 0) { vx /= len; vy /= len; }
        INPUTS[0].vx = vx; INPUTS[0].vy = vy;
    };
    
    document.addEventListener('keydown', (e) => {
        if (GAME.mode !== 'game') return;
        if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
        if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
        updateKeys();
    });
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
        if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
        if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
        updateKeys();
    });
}

function updateGamepads() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let padCount = 0;
    for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
            const pIdx = padCount;
            if (pIdx > 1) break; 
            let vx = gp.axes[0]; let vy = gp.axes[1];
            if (gp.buttons[12]?.pressed) vy = -1;
            if (gp.buttons[13]?.pressed) vy = 1;
            if (gp.buttons[14]?.pressed) vx = -1;
            if (gp.buttons[15]?.pressed) vx = 1;
            
            if (Math.abs(vx) < 0.2) vx = 0;
            if (Math.abs(vy) < 0.2) vy = 0;
            let len = Math.hypot(vx, vy);
            if (len > 1) { vx /= len; vy /= len; }
            
            INPUTS[pIdx].vx = vx; INPUTS[pIdx].vy = vy;
            padCount++;
        }
    }
    if (GAME.mode === 'game') {
        document.getElementById('vpad-1p').style.display = padCount >= 1 ? 'none' : 'block';
        if (GAME.is2P) document.getElementById('vpad-2p').style.display = padCount >= 2 ? 'none' : 'block';
    } else {
        document.getElementById('vpad-1p').style.display = 'none';
        document.getElementById('vpad-2p').style.display = 'none';
    }
}

// --- UI Navigation ---
function setMode(mode) {
    GAME.mode = mode;
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('hud').style.display = 'none';
    
    if (mode === 'title') {
        document.getElementById('screen-title').style.display = 'flex';
        if(music.play) music.play(1, 0, 100); // Title bgm
    } else if (mode === 'shop') {
        buildShopUI();
        document.getElementById('screen-shop').style.display = 'flex';
    } else if (mode === 'char_select') {
        buildCharSelectUI();
        document.getElementById('screen-char').style.display = 'flex';
    } else if (mode === 'game') {
        document.getElementById('hud').style.display = 'block';
        INPUTS = [{vx:0,vy:0},{vx:0,vy:0}];
    } else if (mode === 'levelup') {
        document.getElementById('screen-levelup').style.display = 'flex';
    } else if (mode === 'chest') {
        document.getElementById('screen-chest').style.display = 'flex';
    } else if (mode === 'result') {
        document.getElementById('screen-result').style.display = 'flex';
        document.getElementById('result-time').innerText = Math.floor(GAME.time/60) + "分 " + Math.floor(GAME.time%60) + "秒";
        document.getElementById('result-coins').innerText = GAME.coinsThisRun;
        SAVE_DATA.coins += GAME.coinsThisRun;
        saveGameData();
    }
}

function setupUIEvents() {
    document.getElementById('btn-start-1p').addEventListener('click', () => { GAME.is2P = false; GAME.p1SelectedChar = null; setMode('char_select'); });
    document.getElementById('btn-start-2p').addEventListener('click', () => { GAME.is2P = true; GAME.p1SelectedChar = null; GAME.p2SelectedChar = null; setMode('char_select'); });
    document.getElementById('btn-shop').addEventListener('click', () => setMode('shop'));
    
    document.getElementById('btn-shop-back').addEventListener('click', () => setMode('title'));
    document.getElementById('btn-char-back').addEventListener('click', () => setMode('title'));
    document.getElementById('btn-result-back').addEventListener('click', () => setMode('title'));
    
    document.getElementById('btn-char-decide').addEventListener('click', () => {
        if (!GAME.p1SelectedChar) return;
        if (GAME.is2P && !GAME.p2SelectedChar) {
            document.getElementById('char-select-title').innerText = "キャラクター選択 (2P)";
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            document.getElementById('btn-char-decide').classList.add('disabled');
            return;
        }
        startGame();
    });
}

function buildShopUI() {
    document.getElementById('shop-coins').innerText = SAVE_DATA.coins;
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    const prices = [100, 500, 1000, 2000, 4000];
    
    const addItem = (title, icon, lvl, maxLvl, desc, condition, action) => {
        let div = document.createElement('div'); div.className = 'popup-item';
        let cost = lvl < maxLvl ? prices[lvl] : (lvl==='unlock'? (condition? '解放済':1000) : 'MAX');
        div.innerHTML = `<div class="popup-icon"><canvas></canvas></div><div class="popup-desc"><b>${title}</b><br>${desc}<br>価格: ${cost}</div>`;
        if (PRE_RENDERED[icon]) div.querySelector('canvas').getContext('2d').drawImage(PRE_RENDERED[icon], 0, 0);
        div.addEventListener('click', () => {
            if (lvl < maxLvl && SAVE_DATA.coins >= prices[lvl]) { SAVE_DATA.coins -= prices[lvl]; action(); buildShopUI(); }
            else if (lvl === 'unlock' && !condition && SAVE_DATA.coins >= 1000) { SAVE_DATA.coins -= 1000; action(); buildShopUI(); }
        });
        list.appendChild(div);
    };
    
    addItem('HPアップ', 'heart_normal', SAVE_DATA.hpLvl, 5, `(Lv.${SAVE_DATA.hpLvl}/5) 初期HP+10`, false, () => { SAVE_DATA.hpLvl++; saveGameData(); });
    addItem('うんのよさアップ', 'item_cross', SAVE_DATA.luckLvl, 5, `(Lv.${SAVE_DATA.luckLvl}/5) 初期運+1`, false, () => { SAVE_DATA.luckLvl++; saveGameData(); });
    addItem('キャラ解放: ウィザード', 'hero_wiz_left_1', 'unlock', 1, `キャラクターを追加`, SAVE_DATA.lalaUnlocked, () => { SAVE_DATA.lalaUnlocked = true; CHARACTERS.find(c => c.id === 'wiz').unlocked = true; saveGameData(); });
    
    let btnResetUnlock = document.createElement('div'); btnResetUnlock.className = 'btn'; btnResetUnlock.innerText = 'キャラ解放リセット';
    btnResetUnlock.style.marginTop = '20px';
    btnResetUnlock.onclick = () => { SAVE_DATA.lalaUnlocked = false; CHARACTERS.find(c => c.id === 'wiz').unlocked = false; saveGameData(); buildShopUI(); };
    list.appendChild(btnResetUnlock);
    
    let btnResetUpgrades = document.createElement('div'); btnResetUpgrades.className = 'btn'; btnResetUpgrades.innerText = '強化リセット';
    btnResetUpgrades.onclick = () => { SAVE_DATA.hpLvl = 0; SAVE_DATA.luckLvl = 0; saveGameData(); buildShopUI(); };
    list.appendChild(btnResetUpgrades);
}

function buildCharSelectUI() {
    document.getElementById('char-select-title').innerText = "キャラクター選択 (1P)";
    document.getElementById('btn-char-decide').classList.add('disabled');
    const list = document.getElementById('char-list');
    list.innerHTML = '';
    CHARACTERS.forEach(char => {
        let card = document.createElement('div'); card.className = 'char-card';
        if (!char.unlocked) card.classList.add('locked');
        card.innerHTML = `<div><canvas></canvas></div><div class="char-stats"><b>${char.name}</b><br>${char.desc}<br>HP:${char.hp} 攻:${char.atk} 防:${char.def} 速:${char.spd} 運:${char.luck}</div>`;
        if (PRE_RENDERED[char.sprite]) card.querySelector('canvas').getContext('2d').drawImage(PRE_RENDERED[char.sprite], 0, 0, 48, 48);
        card.addEventListener('click', () => {
            if (!char.unlocked) return;
            document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            if (!GAME.is2P || !GAME.p1SelectedChar || document.getElementById('char-select-title').innerText.includes('1P')) GAME.p1SelectedChar = char;
            else GAME.p2SelectedChar = char;
            document.getElementById('btn-char-decide').classList.remove('disabled');
        });
        list.appendChild(card);
    });
}

function startGame() {
    GAME.players = [];
    GAME.enemies = [];
    GAME.items = [];
    GAME.projectiles = [];
    GAME.particles = [];
    GAME.damageTexts = [];
    GAME.time = 0;
    GAME.frameCount = 0;
    GAME.spawnTimer = 0;
    GAME.bossSpawned = [false, false, false];
    GAME.coinsThisRun = 0;
    GAME.bgFeatures = [];
    
    // Generate Random Map Features
    for(let i=0; i<300; i++) {
        GAME.bgFeatures.push({
            type: Math.random()>0.5 ? 'flower_1':'flower_2',
            x: Math.random() * 3800 - 1900,
            y: Math.random() * 3800 - 1900,
            solid: false
        });
    }
    // Generate Borders
    for(let x=-2000; x<=2000; x+=32) {
        GAME.bgFeatures.push({ type: Math.random()>0.5?'wall_1':'tree', x: x, y: -2000, solid: true });
        GAME.bgFeatures.push({ type: Math.random()>0.5?'wall_1':'tree', x: x, y: 2000, solid: true });
    }
    for(let y=-1968; y<=1968; y+=32) {
        GAME.bgFeatures.push({ type: Math.random()>0.5?'wall_1':'tree', x: -2000, y: y, solid: true });
        GAME.bgFeatures.push({ type: Math.random()>0.5?'wall_1':'tree', x: 2000, y: y, solid: true });
    }

    let p1 = new Player(0, GAME.p1SelectedChar, 0, 0);
    p1.equips.push({ id: GAME.p1SelectedChar.id === 'knight' ? 'sword' : 'magic_bullet', lvl: 1 }); // Starter weapon
    GAME.players.push(p1);
    
    if (GAME.is2P && GAME.p2SelectedChar) {
        let p2 = new Player(1, GAME.p2SelectedChar, 40, 0);
        p2.equips.push({ id: GAME.p2SelectedChar.id === 'knight' ? 'sword' : 'magic_bullet', lvl: 1 });
        GAME.players.push(p2);
        document.getElementById('equip-2p').style.display = 'flex';
    } else {
        document.getElementById('equip-2p').style.display = 'none';
    }
    
    if(music.play) music.play(2, 0, 100); // Game BGM
    setMode('game');
    updateHUD();
}

// --- Main Loop ---
function checkWallCollision(x, y, radius) {
    for(let i=0; i<GAME.bgFeatures.length; i++) {
        let f = GAME.bgFeatures[i];
        if (f.solid && f.x < x + radius && f.x + 32 > x - radius && f.y < y + radius && f.y + 32 > y - radius) {
            return true;
        }
    }
    return false;
}

let lastTime = 0;
function gameLoop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    lastTime = timestamp;
    
    updateGamepads();
    
    if (GAME.mode === 'game') {
        updateGame(dt);
        drawGame();
    }
    requestAnimationFrame(gameLoop);
}

function updateGame(dt) {
    GAME.time += dt;
    GAME.frameCount++;
    
    if (GAME.time >= MAX_TIME) {
        if(audioSE) audioSE.playSE("gameover");
        setMode('result');
        return;
    }
    
    let allDead = true;
    
    // Players Update
    GAME.players.forEach((p, idx) => {
        if (p.dead) return;
        allDead = false;
        
        let vx = INPUTS[idx].vx;
        let vy = INPUTS[idx].vy;
        
        if (vx !== 0 || vy !== 0) {
            let angle = Math.atan2(vy, vx);
            p.angle = angle;
            if (angle > -Math.PI/4 && angle <= Math.PI/4) p.dir = 'right';
            else if (angle > Math.PI/4 && angle <= 3*Math.PI/4) p.dir = 'down';
            else if (angle > -3*Math.PI/4 && angle <= -Math.PI/4) p.dir = 'up';
            else p.dir = 'left';
        }
        
        let nextX = p.x + vx * p.spd * dt;
        let nextY = p.y + vy * p.spd * dt;
        
        if (!checkWallCollision(nextX, p.y, 14)) p.x = nextX;
        if (!checkWallCollision(p.x, nextY, 14)) p.y = nextY;
        
        nextX = p.x;
        nextY = p.y;
        
        // Boundaries
        if (nextX < GAME.stageBounds.minX) nextX = GAME.stageBounds.minX;
        if (nextX > GAME.stageBounds.maxX) nextX = GAME.stageBounds.maxX;
        if (nextY < GAME.stageBounds.minY) nextY = GAME.stageBounds.minY;
        if (nextY > GAME.stageBounds.maxY) nextY = GAME.stageBounds.maxY;
        
        // 2P screen bound constraint
        if (idx === 1) {
            let p1 = GAME.players[0];
            if (!p1.dead) {
                let camL = p1.x - SCREEN_W/2;
                let camR = p1.x + SCREEN_W/2;
                let camT = p1.y - SCREEN_H/2;
                let camB = p1.y + SCREEN_H/2;
                if (nextX < camL + 16) nextX = camL + 16;
                if (nextX > camR - 16) nextX = camR - 16;
                if (nextY < camT + 16) nextY = camT + 16;
                if (nextY > camB - 16) nextY = camB - 16;
            }
        }
        
        p.x = nextX;
        p.y = nextY;
        
        if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
        
        // Handle Weapons
        p.equips.forEach(eq => {
            if (EQUIP_DATA[eq.id].type === 'atk') {
                if (!p.weaponTimers[eq.id]) p.weaponTimers[eq.id] = 0;
                p.weaponTimers[eq.id] -= dt;
                if (p.weaponTimers[eq.id] <= 0) {
                    fireWeapon(p, eq);
                }
            }
        });
        
        // Axe Queue Update
        if (p.axeQueue && p.axeQueue.length > 0) {
            for(let i=p.axeQueue.length-1; i>=0; i--) {
                let q = p.axeQueue[i];
                q.delay -= dt;
                if (q.delay <= 0) {
                    let randAng = q.ang + (Math.random() - 0.5) * 0.2;
                    GAME.projectiles.push({
                        x: p.x, y: p.y, vx: Math.cos(randAng)*150, vy: -150,
                        life: 3, size: 16, dmg: q.dmg, pierce: true, type: 'axe', rot: 0
                    });
                    p.axeQueue.splice(i, 1);
                    if(audioSE) audioSE.playSE("shot");
                }
            }
        }
        
        // Magnet & Item Pickup
        let magnetRange = 50;
        let magEquip = p.equips.find(e => e.id === 'magnet');
        if (magEquip) magnetRange += magEquip.lvl * 20;
        
        GAME.items.forEach(itm => {
            if (itm.dead) return;
            let dist = Math.hypot(p.x - itm.x, p.y - itm.y);
            if (dist < magnetRange) {
                itm.pulled = true;
                let ang = Math.atan2(p.y - itm.y, p.x - itm.x);
                itm.x += Math.cos(ang) * 300 * dt;
                itm.y += Math.sin(ang) * 300 * dt;
            }
            if (dist < 20) {
                collectItem(p, itm);
                itm.dead = true;
            }
        });
    });
    
    if (allDead) {
        if(audioSE) audioSE.playSE("gameover");
        setMode('result');
        return;
    }
    
    GAME.items = GAME.items.filter(i => !i.dead);
    
    // Spawning Logic
    GAME.spawnTimer -= dt;
    if (GAME.spawnTimer <= 0) {
        spawnEnemies();
        GAME.spawnTimer = Math.max(0.5, 2 - (GAME.time / 600)); // Gets faster over time
    }
    
    // Midbosses
    let mins = GAME.time / 60;
    if (mins >= 5 && !GAME.bossSpawned[0]) { spawnMidBoss(); GAME.bossSpawned[0] = true; }
    if (mins >= 10 && !GAME.bossSpawned[1]) { spawnMidBoss(); GAME.bossSpawned[1] = true; }
    if (mins >= 15 && !GAME.bossSpawned[2]) { spawnMidBoss(); GAME.bossSpawned[2] = true; }
    
    // Enemies Update
    GAME.enemies.forEach(e => {
        if (e.dead) return;
        
        if (e.fbTimers) {
            for(let key in e.fbTimers) {
                if (e.fbTimers[key] > 0) e.fbTimers[key] -= dt;
            }
        }
        
        // Find closest player
        let targetP = null, minDist = Infinity;
        GAME.players.forEach(p => {
            if (p.dead) return;
            let d = Math.hypot(p.x - e.x, p.y - e.y);
            if (d < minDist) { minDist = d; targetP = p; }
        });
        
        if (targetP) {
            let ang = Math.atan2(targetP.y - e.y, targetP.x - e.x);
            let nextX = e.x + Math.cos(ang) * e.spd * dt;
            let nextY = e.y + Math.sin(ang) * e.spd * dt;
            
            if (e.ignoreWalls) {
                e.x = nextX; e.y = nextY;
            } else {
                if (!checkWallCollision(nextX, e.y, 14)) e.x = nextX;
                if (!checkWallCollision(e.x, nextY, 14)) e.y = nextY;
            }
            
            if (e.isBoss) {
                e.attackTimer -= dt;
                if (e.attackTimer <= 0) {
                    e.attackTimer = 1.5;
                    GAME.projectiles.push({
                        x: e.x, y: e.y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150,
                        life: 4, size: 12, dmg: e.atk, pierce: false, type: 'enemy_shot'
                    });
                }
            }
            
            // Player collision
            if (minDist < 20 && targetP.invincibleTimer <= 0) {
                let dmg = Math.max(1, e.atk - targetP.def);
                targetP.hp -= dmg;
                targetP.invincibleTimer = 0.5;
                addDamageText(targetP.x, targetP.y - 20, `-${dmg}`, '#ff0000');
                if(audioSE) audioSE.playSE("damage");
                if (targetP.hp <= 0) {
                    targetP.hp = 0; targetP.dead = true;
                }
            }
        }
    });
    
    // Projectiles Update
    GAME.projectiles.forEach(proj => {
        if (proj.dead) return;
        proj.life -= dt;
        
        if (proj.type === 'bomb' && proj.life <= 0) {
            GAME.particles.push({x: proj.x, y: proj.y, type:'thunder', life:0.5, radius: proj.blastRadius});
            GAME.enemies.forEach(e => {
                if(e.dead) return;
                if (Math.hypot(e.x - proj.x, e.y - proj.y) < proj.blastRadius) {
                    e.hp -= proj.dmg;
                    addDamageText(e.x, e.y - 20, `${proj.dmg}`, '#ffffff');
                    if (e.hp <= 0) { e.dead = true; dropItem(e); }
                }
            });
            proj.dead = true;
            return;
        }
        
        if (proj.life <= 0) { proj.dead = true; return; }
        
        if (proj.type === 'axe') {
            proj.rot += 10 * dt;
            proj.vy += 400 * dt; // gravity
        }
        
        if (proj.type === 'fireball') {
            proj.rotAngle += dt * 3;
            proj.x = proj.owner.x + Math.cos(proj.rotAngle) * proj.orbitDist;
            proj.y = proj.owner.y + Math.sin(proj.rotAngle) * proj.orbitDist;
        } else {
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
        }
        
        if (proj.type === 'enemy_shot') {
            GAME.players.forEach(p => {
                if (p.dead || proj.dead || p.invincibleTimer > 0) return;
                let d = Math.hypot(p.x - proj.x, p.y - proj.y);
                if (d < (proj.size + p.w/2)) {
                    let dmg = Math.max(1, proj.dmg - p.def);
                    p.hp -= dmg;
                    p.invincibleTimer = 0.5;
                    addDamageText(p.x, p.y - 20, `-${dmg}`, '#ff0000');
                    if(audioSE) audioSE.playSE("damage");
                    if (p.hp <= 0) { p.hp = 0; p.dead = true; }
                    if (!proj.pierce) proj.dead = true;
                }
            });
        } else {
            // Hit detection
            GAME.enemies.forEach(e => {
                if (e.dead || proj.dead) return;
                
                if (proj.type === 'fireball') {
                    if (!e.fbTimers) e.fbTimers = {};
                    if (e.fbTimers[proj.projId] > 0) return;
                }
                
                let d = Math.hypot(e.x - proj.x, e.y - proj.y);
                if (d < (proj.size + e.w/2)) {
                    e.hp -= proj.dmg;
                    addDamageText(e.x, e.y - 20, `${proj.dmg}`, '#ffffff');
                    if (e.hp <= 0) {
                        e.dead = true;
                        dropItem(e);
                    }
                    if (proj.type === 'fireball') {
                        e.fbTimers[proj.projId] = 0.5;
                    }
                    if (!proj.pierce) proj.dead = true;
                }
            });
        }
    });
    
    GAME.projectiles = GAME.projectiles.filter(p => !p.dead);
    GAME.enemies = GAME.enemies.filter(e => !e.dead);
    
    // Particles (including poison mist logic)
    GAME.particles.forEach(pt => {
        pt.life -= dt;
        if (pt.type === 'poison') {
            // Apply dot and slow
            GAME.enemies.forEach(e => {
                if (e.dead) return;
                if (Math.hypot(e.x - pt.x, e.y - pt.y) < pt.radius) {
                    if (GAME.frameCount % 30 === 0) { // dmg tick every 0.5s roughly
                        e.hp -= pt.dmg;
                        addDamageText(e.x, e.y - 20, `${Math.floor(pt.dmg)}`, '#cc00ff');
                        if (e.hp <= 0) { e.dead = true; dropItem(e); }
                    }
                    e.x -= Math.cos(Math.atan2(e.y - pt.y, e.x - pt.x)) * e.spd * 0.5 * dt; // Simple slow by pushing back
                }
            });
        }
    });
    GAME.particles = GAME.particles.filter(pt => pt.life > 0);
    
    // UI Update
    GAME.damageTexts.forEach(t => t.life -= dt);
    GAME.damageTexts = GAME.damageTexts.filter(t => t.life > 0);
    
    updateHUD();
}

function fireWeapon(p, eq) {
    let scroll = p.equips.find(e => e.id === 'scroll');
    let cdReducer = scroll ? (1 - scroll.lvl * 0.1) : 1;
    let mag = p.equips.find(e => e.id === 'magnifier');
    let sizeMul = mag ? (1 + mag.lvl * 0.1) : 1;
    
    if (eq.id === 'magic_bullet') {
        p.weaponTimers[eq.id] = 1.0 * cdReducer;
        let count = Math.min(3, Math.ceil(eq.lvl / 3));
        for(let i=0; i<count; i++) {
            let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
            ang += (i - (count-1)/2) * 0.2;
            GAME.projectiles.push({
                x: p.x, y: p.y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200,
                life: 2, size: 5 * sizeMul, dmg: p.atk + eq.lvl*2, pierce: false, type: 'bullet'
            });
        }
        if(audioSE) audioSE.playSE("shot");
    }
    else if (eq.id === 'sword') {
        p.weaponTimers[eq.id] = 1.5 * cdReducer;
        let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
        let range = 60 * sizeMul + eq.lvl * 5;
        let arc = Math.PI/2 + (eq.lvl * 0.1);
        GAME.enemies.forEach(e => {
            if (e.dead) return;
            let d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < range) {
                let ea = Math.atan2(e.y - p.y, e.x - p.x);
                let diff = Math.abs(ea - ang);
                if (diff > Math.PI) diff = Math.PI*2 - diff;
                if (diff <= arc/2) {
                    e.hp -= (p.atk + eq.lvl * 3);
                    addDamageText(e.x, e.y - 20, `${p.atk + eq.lvl * 3}`, '#ffffff');
                    if (e.hp <= 0) { e.dead = true; dropItem(e); }
                }
            }
        });
        if(audioSE) audioSE.playSE("shot"); // placeholder se
        // Visual effect
        GAME.particles.push({x: p.x, y: p.y, type:'slash', ang, range, arc, life:0.2});
    }
    else if (eq.id === 'fireball') {
        p.weaponTimers[eq.id] = 3.5 * cdReducer;
        let count = 2 + Math.floor(eq.lvl/2);
        for(let i=0; i<count; i++) {
            GAME.projectiles.push({
                owner: p, rotAngle: (i/count) * Math.PI*2, orbitDist: 40 + sizeMul*10,
                x: p.x, y: p.y, vx: 0, vy: 0,
                life: 3, size: 15 * sizeMul, dmg: p.atk + eq.lvl, pierce: true, type: 'fireball', projId: Math.random()
            });
        }
    }
    else if (eq.id === 'bomb') {
        p.weaponTimers[eq.id] = Math.max(1.5, 4.0 - eq.lvl * 0.2) * cdReducer;
        let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
        let bx = p.x + Math.cos(ang) * 60;
        let by = p.y + Math.sin(ang) * 60;
        GAME.projectiles.push({
            x: bx, y: by, vx: 0, vy: 0,
            life: Math.max(0.5, 1.0 - eq.lvl * 0.05), size: 16, dmg: p.atk * 2 + eq.lvl * 5, pierce: true, type: 'bomb',
            blastRadius: 50 + eq.lvl * 5 * sizeMul
        });
    }
    else if (eq.id === 'axe') {
        p.weaponTimers[eq.id] = Math.max(1.0, 3.0 - eq.lvl * 0.2) * cdReducer;
        let count = Math.min(5, eq.lvl);
        let baseAng = (p.angle !== undefined) ? p.angle : Math.PI/2;
        for(let i=0; i<count; i++) {
            if (!p.axeQueue) p.axeQueue = [];
            p.axeQueue.push({ delay: i * 0.2, ang: baseAng - Math.PI/6, dmg: p.atk + eq.lvl * 4 });
            p.axeQueue.push({ delay: i * 0.2, ang: baseAng + Math.PI/6, dmg: p.atk + eq.lvl * 4 });
        }
    }
    else if (eq.id === 'thunderbolt') {
        p.weaponTimers[eq.id] = Math.max(2.0, 5.0 - eq.lvl*0.2) * cdReducer;
        let count = 1 + Math.floor((eq.lvl-1)/3);
        let targets = [...GAME.enemies].sort(()=>0.5-Math.random()).slice(0, count);
        targets.forEach(t => {
            let area = 50 * sizeMul;
            GAME.particles.push({x: t.x, y: t.y, type:'thunder', life:0.5, radius: area});
            GAME.enemies.forEach(e => {
                if(e.dead) return;
                if (Math.hypot(e.x - t.x, e.y - t.y) < area) {
                    e.hp -= (p.atk * 1.5 + eq.lvl * 5);
                    addDamageText(e.x, e.y - 20, `${p.atk * 1.5 + eq.lvl * 5}`, '#ffffff');
                    if (e.hp <= 0) { e.dead = true; dropItem(e); }
                }
            });
        });
    }
    else if (eq.id === 'poison_mist') {
        p.weaponTimers[eq.id] = 2.0 * cdReducer;
        let dist = 100; // 3 units away roughly
        let count = 1 + Math.floor(eq.lvl/2);
        for(let i=0; i<count; i++) {
            let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
            if (i>0) ang += (i%2===0? 1 : -1) * Math.ceil(i/2) * (Math.PI/2);
            GAME.particles.push({x: p.x + Math.cos(ang)*dist, y: p.y + Math.sin(ang)*dist, type:'poison', life:3, radius: 40 * sizeMul, dmg: p.atk*0.5 + eq.lvl, owner: p});
        }
    }
}

function dropItem(e) {
    if (GAME.items.length >= MAX_DROPS) GAME.items.shift();
    
    let luck = Math.max(...GAME.players.filter(p=>!p.dead).map(p=>p.baseLuck));
    
    if (e.isBoss) {
        GAME.items.push(new Drop(e.x, e.y, 'chest', 1));
        return;
    }
    
    let baseDrop = 0.05;
    if (e.expDrop >= 50) baseDrop += 0.1;
    let prob = baseDrop + luck * 0.05;
    
    let rand = Math.random() * 100;
    if (rand < prob) GAME.items.push(new Drop(e.x, e.y, 'heart', 1));
    else if (rand < prob * 2) GAME.items.push(new Drop(e.x, e.y, 'cross', 1));
    else if (rand < prob * 4) GAME.items.push(new Drop(e.x, e.y, 'coin_bag', Math.floor(GAME.time/60)+1));
    else GAME.items.push(new Drop(e.x, e.y, 'exp', e.expDrop));
}

function collectItem(p, itm) {
    if (itm.type === 'exp') {
        p.exp += itm.val;
        if(audioSE) audioSE.playSE("get_item");
        if (p.exp >= p.maxExp) {
            p.exp -= p.maxExp;
            p.level++;
            p.maxExp = Math.floor(p.maxExp * 1.2);
            GAME.levelUpTurn++;
            let targetP = p;
            if (GAME.is2P) {
                targetP = GAME.players[GAME.levelUpTurn % 2];
                if (targetP.dead) targetP = GAME.players[(GAME.levelUpTurn + 1) % 2];
            }
            triggerLevelUp(targetP);
        }
    } else if (itm.type === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.2);
    } else if (itm.type === 'coin_bag') {
        GAME.coinsThisRun += Math.ceil((itm.val * 10) / 25);
    } else if (itm.type === 'chest') {
        triggerChest();
    } else if (itm.type === 'cross') {
        GAME.enemies.forEach(e => { if(!e.isBoss) { e.dead = true; dropItem(e); } });
    }
}

function spawnEnemies() {
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if(p.dead) return;
    
    let phase = Math.floor(GAME.time / 120);
    let types = ['snakey'];
    if (GAME.time > 120) types.push('bat');
    if (GAME.time > 180) types.push('medusa');
    if (GAME.time > 240) types.push('knight');
    if (GAME.time > 300) types.push('gol');
    if (GAME.time > 420) types.push('ghost');
    
    let type = types[Math.floor(Math.random() * types.length)];
    let dist = 400; // Outside screen
    
    if (phase >= 1 && Math.random() < 0.15) {
        let count = 10 + phase * 2;
        for(let i=0; i<count; i++) {
            let ang = (i/count) * Math.PI * 2;
            GAME.enemies.push(new Enemy(p.x + Math.cos(ang)*dist, p.y + Math.sin(ang)*dist, type));
        }
    } else {
        let spawnCount = 1 + phase;
        for(let i=0; i<spawnCount; i++) {
            let ang = Math.random() * Math.PI * 2;
            GAME.enemies.push(new Enemy(p.x + Math.cos(ang)*dist, p.y + Math.sin(ang)*dist, type));
        }
    }
}

function spawnMidBoss() {
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if(p.dead) return;
    let ang = Math.random() * Math.PI * 2;
    GAME.enemies.push(new Enemy(p.x + Math.cos(ang)*400, p.y + Math.sin(ang)*400, 'don_medusa'));
}

function addDamageText(x, y, text, color) {
    GAME.damageTexts.push({ x, y, text, color, life: 1.0 });
}

function updateHUD() {
    if (GAME.mode !== 'game') return;
    
    // Shared EXP bar based on P1 (or P2 if 1 is dead)
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if (p) {
        document.getElementById('exp-bar').style.width = `${(p.exp / p.maxExp) * 100}%`;
    }
    
    let mins = Math.floor(GAME.time / 60);
    let secs = Math.floor(GAME.time % 60);
    document.getElementById('timer').innerText = `${mins.toString().padStart(2,'0')}:${secs.toString().padStart(2,'0')}`;
    document.getElementById('coin-disp').innerText = `${GAME.coinsThisRun} G`;
    
    // Equipments
    GAME.players.forEach(pl => {
        let atkRow = document.getElementById(`eq-atk-${pl.id+1}p`);
        let bufRow = document.getElementById(`eq-buf-${pl.id+1}p`);
        if(atkRow) {
            atkRow.innerHTML = ''; bufRow.innerHTML = '';
            pl.equips.forEach(eq => {
                let d = EQUIP_DATA[eq.id];
                let slot = document.createElement('div'); slot.className = 'equip-slot';
                let cvs = document.createElement('canvas'); cvs.width=24; cvs.height=24;
                if(PRE_RENDERED[d.icon]) cvs.getContext('2d').drawImage(PRE_RENDERED[d.icon],0,0,24,24);
                slot.appendChild(cvs);
                let lvl = document.createElement('div'); lvl.className = 'equip-lvl'; lvl.innerText = `Lv${eq.lvl}`;
                slot.appendChild(lvl);
                if(d.type === 'atk') atkRow.appendChild(slot); else bufRow.appendChild(slot);
            });
        }
    });
}

function drawGame() {
    // Camera follow 1P (or 2P if 1P dead)
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if (!p) return;
    
    // Smooth camera
    GAME.cameraX += (p.x - GAME.cameraX) * 0.1;
    GAME.cameraY += (p.y - GAME.cameraY) * 0.1;
    
    let cx = GAME.cameraX - SCREEN_W/2;
    let cy = GAME.cameraY - SCREEN_H/2;
    
    ctx.save();
    ctx.translate(-cx, -cy);
    
    // Background grass (tiling)
    if (PRE_RENDERED['grasses']) {
        let pat = ctx.createPattern(PRE_RENDERED['grasses'], 'repeat');
        ctx.fillStyle = pat;
        ctx.fillRect(cx, cy, SCREEN_W, SCREEN_H);
    } else {
        ctx.fillStyle = '#225522';
        ctx.fillRect(cx, cy, SCREEN_W, SCREEN_H);
    }
    
    // Draw BG features
    GAME.bgFeatures.forEach(f => {
        if(f.x > cx - 64 && f.x < cx + SCREEN_W + 64 && f.y > cy - 64 && f.y < cy + SCREEN_H + 64) {
            if(PRE_RENDERED[f.type]) ctx.drawImage(PRE_RENDERED[f.type], f.x, f.y);
        }
    });
    
    // Drops
    GAME.items.forEach(itm => {
        let spr = itm.type === 'heart' ? 'heart_normal' : itm.type === 'coin_bag' ? 'item_coin_bag' : itm.type === 'chest' ? 'chest_closed' : itm.type === 'cross' ? 'item_cross' : 'exp';
        if (itm.type === 'exp') {
            if (itm.val >= 100) spr = 'exp_xl';
            else if (itm.val >= 30) spr = 'exp_l';
            else if (itm.val >= 6) spr = 'exp_m';
        }
        
        if(PRE_RENDERED[spr]) {
            let scale = (itm.type !== 'exp') ? 0.75 : 1.0;
            ctx.drawImage(PRE_RENDERED[spr], 0, 0, 32, 32, itm.x - 16*scale, itm.y - 16*scale, 32*scale, 32*scale);
        }
    });
    
    // Enemies
    GAME.enemies.forEach(e => {
        if(PRE_RENDERED[e.sprite]) {
            ctx.drawImage(PRE_RENDERED[e.sprite], 0, 0, 32, 32, e.x - 16*e.scale, e.y - 16*e.scale, 32*e.scale, 32*e.scale);
        }
        // HP Bar
        ctx.fillStyle = 'red'; ctx.fillRect(e.x - 16, e.y - 20 - 16*(e.scale-1), 32, 4);
        ctx.fillStyle = 'green'; ctx.fillRect(e.x - 16, e.y - 20 - 16*(e.scale-1), 32 * (e.hp/e.maxHp), 4);
    });
    
    // Players
    GAME.players.forEach(pl => {
        if (pl.dead) return;
        if (pl.invincibleTimer > 0 && GAME.frameCount % 10 < 5) return; // blink
        let spr = `${pl.spriteNameBase}_${pl.dir}`;
        // Animation toggle
        spr += (GAME.frameCount % 20 < 10) ? '_1' : '_2';
        // Replace with direction mapping if needed
        if(PRE_RENDERED[spr]) ctx.drawImage(PRE_RENDERED[spr], pl.x - 16, pl.y - 16);
        else if (PRE_RENDERED['player_down_1']) ctx.drawImage(PRE_RENDERED['player_down_1'], pl.x - 16, pl.y - 16);
        
        // HP Bar
        ctx.fillStyle = 'red'; ctx.fillRect(pl.x - 16, pl.y - 20, 32, 4);
        ctx.fillStyle = 'blue'; ctx.fillRect(pl.x - 16, pl.y - 20, 32 * (pl.hp/pl.maxHp), 4);
    });
    
    // Projectiles
    GAME.projectiles.forEach(proj => {
        if (proj.type === 'enemy_shot') {
            ctx.fillStyle = 'black';
            ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = 'red';
            ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.size * 0.6, 0, Math.PI*2); ctx.fill();
        } else {
            if (proj.type === 'fireball') {
                if (PRE_RENDERED['item_fireball']) {
                    ctx.drawImage(PRE_RENDERED['item_fireball'], 0, 0, 32, 32, proj.x - 16, proj.y - 16, 32, 32);
                } else {
                    ctx.fillStyle = 'orange'; ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI*2); ctx.fill();
                }
            } else if (proj.type === 'axe') {
                ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(proj.rot);
                if (PRE_RENDERED['item_axe']) ctx.drawImage(PRE_RENDERED['item_axe'], -16, -16);
                ctx.restore();
            } else if (proj.type === 'bomb') {
                if (PRE_RENDERED['item_bomb']) ctx.drawImage(PRE_RENDERED['item_bomb'], proj.x - 16, proj.y - 16);
            } else {
                ctx.fillStyle = 'yellow';
                ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI*2); ctx.fill();
            }
        }
    });
    
    // Particles
    GAME.particles.forEach(pt => {
        if (pt.type === 'slash') {
            ctx.strokeStyle = `rgba(200, 200, 255, ${pt.life * 5})`;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.range, pt.ang - pt.arc/2, pt.ang + pt.arc/2);
            ctx.stroke();
        } else if (pt.type === 'thunder') {
            ctx.fillStyle = `rgba(255, 255, 0, ${pt.life * 2})`;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = `rgba(255, 255, 255, ${pt.life * 2})`;
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x + (Math.random()*40-20), pt.y - 400); ctx.stroke();
        } else if (pt.type === 'poison') {
            ctx.fillStyle = `rgba(150, 0, 200, ${pt.life > 1 ? 0.3 : pt.life * 0.3})`;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI*2); ctx.fill();
        }
    });
    
    // Damage Texts
    ctx.font = '16px sans-serif';
    GAME.damageTexts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y - (1 - t.life) * 20);
    });
    
    ctx.restore();
}

function triggerLevelUp(p) {
    if(audioSE) audioSE.playSE("get_egg");
    setMode('levelup');
    let title = document.getElementById('levelup-title');
    title.innerText = `レベルアップ！ (${p.id+1}P)`;
    
    let choicesBox = document.getElementById('levelup-choices');
    choicesBox.innerHTML = '';
    
    // Generate 2 random choices
    let available = [];
    for(let k in EQUIP_DATA) {
        let eq = EQUIP_DATA[k];
        let has = p.equips.find(e => e.id === k);
        let currentLvl = has ? has.lvl : 0;
        if (currentLvl < eq.maxLvl) {
            let typeCount = p.equips.filter(e => EQUIP_DATA[e.id].type === eq.type).length;
            if (has || (eq.type === 'atk' && typeCount < p.maxAtkSlots) || (eq.type === 'buf' && typeCount < p.maxBufSlots)) {
                available.push(k);
            }
        }
    }
    
    available.sort(() => Math.random() - 0.5);
    let choices = available.slice(0, 2);
    
    if (choices.length === 0) {
        choicesBox.innerHTML = '<div class="btn">MAX - 回復する</div>';
        choicesBox.querySelector('.btn').addEventListener('click', () => { p.hp = p.maxHp; setMode('game'); });
        return;
    }
    
    choices.forEach(cid => {
        let d = EQUIP_DATA[cid];
        let has = p.equips.find(e => e.id === cid);
        let nextLvl = has ? has.lvl + 1 : 1;
        let div = document.createElement('div');
        div.className = 'popup-item';
        div.innerHTML = `<div class="popup-icon"><canvas></canvas></div><div class="popup-desc"><b>${d.name}</b> (Lv.${nextLvl})<br><span style="font-size:12px;">${d.desc}</span><br><span style="color:yellow; font-weight:bold; font-size:12px;">${d.enhance}</span></div>`;
        if (PRE_RENDERED[d.icon]) {
            let ctx = div.querySelector('canvas').getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(PRE_RENDERED[d.icon],0,0,32,32);
        }
        div.addEventListener('click', () => {
            if (has) has.lvl++; else p.equips.push({id: cid, lvl: 1});
            updateHUD();
            setMode('game');
        });
        choicesBox.appendChild(div);
    });
}

let chestAnimState = 0;
let chestItems = [];
let chestTimer = 0;

function triggerChest() {
    if(audioSE) audioSE.playSE("get_egg"); // Or a special jingle
    setMode('chest');
    let chestCanvas = document.getElementById('chestCanvas');
    let cCtx = chestCanvas.getContext('2d');
    cCtx.clearRect(0,0,SCREEN_W, SCREEN_H);
    
    let itemsBox = document.getElementById('chest-items');
    itemsBox.innerHTML = '';
    document.getElementById('btn-chest-close').style.display = 'none';
    
    let numItems = 1;
    let rand = Math.random() * 100;
    if (!GAME.is2P) {
        if (rand < 1) numItems = 5;
        else if (rand < 6) numItems = 3;
    }
    
    chestItems = [];
    let p = GAME.players[0]; // Simplification for chest to P1
    for(let i=0; i<numItems; i++) {
        let dKeys = Object.keys(EQUIP_DATA);
        let cid = dKeys[Math.floor(Math.random()*dKeys.length)];
        let d = EQUIP_DATA[cid];
        let has = p.equips.find(e => e.id === cid);
        if (has && has.lvl < d.maxLvl) has.lvl++;
        else if (!has && ((d.type==='atk' && p.equips.filter(e=>EQUIP_DATA[e.id].type==='atk').length < p.maxAtkSlots) || (d.type==='buf' && p.equips.filter(e=>EQUIP_DATA[e.id].type==='buf').length < p.maxBufSlots))) {
            p.equips.push({id: cid, lvl: 1});
        }
        chestItems.push(d);
    }
    
    chestAnimState = 1;
    chestTimer = 0;
    requestAnimationFrame(chestAnimLoop);
}

function chestAnimLoop(time) {
    if (GAME.mode !== 'chest') return;
    
    let canvas = document.getElementById('chestCanvas');
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,SCREEN_W, SCREEN_H);
    
    chestTimer += 1/60; // Approx
    
    let cx = SCREEN_W/2;
    let cy = SCREEN_H/2;
    
    if (chestAnimState === 1) { // Shaking
        if(audioSE && Math.random()<0.1) audioSE.playSE("damage"); // rattle
        let shake = Math.sin(chestTimer * 50) * 5;
        if (PRE_RENDERED['chest_closed']) {
            ctx.drawImage(PRE_RENDERED['chest_closed'], 0, 0, 32, 32, cx - 32 + shake, cy - 32, 64, 64);
        }
        if (chestTimer > 1.5) {
            chestAnimState = 2;
            chestTimer = 0;
            if(audioSE) audioSE.playSE("get_egg");
            
            let itemsBox = document.getElementById('chest-items');
            chestItems.forEach(d => {
                let div = document.createElement('div'); div.className = 'popup-icon';
                let cvs = document.createElement('canvas'); cvs.width=32; cvs.height=32;
                if (PRE_RENDERED[d.icon]) cvs.getContext('2d').drawImage(PRE_RENDERED[d.icon],0,0);
                div.appendChild(cvs);
                itemsBox.appendChild(div);
            });
            document.getElementById('btn-chest-close').style.display = 'block';
            document.getElementById('btn-chest-close').onclick = () => { setMode('game'); updateHUD(); };
        }
    } else if (chestAnimState === 2) { // Open
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(chestTimer * 2);
        for(let i=0; i<12; i++) {
            ctx.rotate((Math.PI*2)/12);
            ctx.fillStyle = `rgba(255, 255, 100, ${Math.abs(Math.sin(chestTimer*3)) * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(-20, 300); ctx.lineTo(20, 300); ctx.fill();
        }
        ctx.restore();
        
        if (PRE_RENDERED['item_coin_bag']) { // Using coin bag as placeholder for open chest
            ctx.drawImage(PRE_RENDERED['item_coin_bag'], 0, 0, 32, 32, cx - 32, cy - 32, 64, 64);
        }
    }
    
    requestAnimationFrame(chestAnimLoop);
}

// Bootstrap
window.onload = boot;
