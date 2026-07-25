// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SCREEN_W = 640;
const SCREEN_H = 360;
let FPS = 60;

// Data
let MAP_DATA = null;
let PALETTE = {};
let SPRITES = {};
let PRE_RENDERED = {};

// Game State
let GAME = {
    mode: 'title', // title, town, map, gameover
    players: [],
    enemies: [],
    projectiles: [],
    particles: [],
    is2P: false,
    cameraX: 0,
    cameraY: 0,
    currentStage: null,
    currentArea: null,
    currentMapPattern: null,
    lastTime: performance.now()
};

// Inputs
let INPUTS = [
    { vx: 0, vy: 0, act: false, menu: false, palLeft: false, palRight: false, tVx: 0, tVy: 0, tAct: false, tMenu: false, tPalLeft: false, tPalRight: false, kAct: false, kMenu: false, kPalLeft: false, kPalRight: false, touchActive: false },
    { vx: 0, vy: 0, act: false, menu: false, palLeft: false, palRight: false, tVx: 0, tVy: 0, tAct: false, tMenu: false, tPalLeft: false, tPalRight: false, kAct: false, kMenu: false, kPalLeft: false, kPalRight: false, touchActive: false }
];

// Classes
const CLASS_DATA = {
    swordman: { name: 'ソードマン', hp: 150, mp: 20, atk: 15, def: 10, spd: 100, sprite: 'hero_knight_down_1', type: 'melee' },
    ranger: { name: 'レンジャー', hp: 100, mp: 30, atk: 12, def: 7, spd: 110, sprite: 'hero_wiz_down_1', type: 'ranged' },
    sorcerer: { name: 'ソーサラー', hp: 70, mp: 100, atk: 8, def: 5, spd: 90, sprite: 'hero_week_down_1', type: 'magic' }
};

const WEAPON_TYPES = {
    handgun: {
        attackType: 'ranged',
        motions: [0, 0, 0], // No movement during combo
        targetType: 'single',
        targetNum: 1,
        shape: 'none',
        icon: 'icon_weapon_gun',
        maxCombo: 3,
        timing: [0.8, 0.8], // Combo timings
        classMod: { swordman: 0.1, ranger: 0.0, sorcerer: 0.1 }
    },
    shotgun: {
        attackType: 'ranged',
        motions: [0, 0, 0],
        targetType: 'scopeN',
        targetNum: 5,
        shape: 'fan45',
        icon: 'icon_weapon_gun',
        maxCombo: 3,
        timing: [1.2, 1.2],
        classMod: { swordman: 0.1, ranger: 0.0, sorcerer: 0.1 }
    },
    saber: {
        attackType: 'melee',
        motions: [5, 5, 8],
        targetType: 'scope',
        targetNum: 99,
        shape: 'circle1', // radius 1 -> 10px scaled
        ranges: [60, 60, 80],
        offsets: [{angle: -20, dist: 30}, {angle: 0, dist: 30}, {angle: 0, dist: 40}], // 1st front-left
        icon: 'icon_weapon_sword',
        maxCombo: 3,
        timing: [0.8, 0.8],
        classMod: { swordman: 0.0, ranger: 0.2, sorcerer: 0.3 }
    },
    dagger: {
        attackType: 'melee',
        motions: [5, 5, 5],
        targetType: 'scopeN',
        targetNum: 2,
        shape: 'circle1',
        ranges: [60, 60, 50],
        offsets: [{angle: 0, dist: 30}, {angle: 0, dist: 30}, {angle: 0, dist: 0}], // 3rd around player
        icon: 'icon_weapon_sword',
        maxCombo: 3,
        timing: [0.7, 0.7],
        classMod: { swordman: 0.0, ranger: 0.3, sorcerer: 0.3 }
    },
    cane: {
        attackType: 'melee',
        motions: [3, 3, 5],
        targetType: 'scope',
        targetNum: 99,
        shape: 'circle1',
        ranges: [40, 40, 50],
        offsets: [{angle: 0, dist: 20}, {angle: 0, dist: 20}, {angle: 0, dist: 25}],
        icon: 'icon_weapon_cane',
        maxCombo: 3,
        timing: [0.7, 0.7],
        classMod: { swordman: 0.4, ranger: 0.4, sorcerer: 0.0 }
    }
};

const BASE_WEAPONS = {
    'w_handgun': { name: 'ハンドガン', desc: '圧縮した光子を撃ちだす短銃。扱いやすい形状をしている', price: 100, baseRarity: 1, basePow: 30, baseDex: 26, maxEnhance: 3, range: 250, reqClass: null, reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'handgun' },
    'w_railgun': { name: 'レールガン', desc: '圧縮した光子を撃ちだす短銃。扱いやすい形状をしている', price: 500, baseRarity: 4, basePow: 65, baseDex: 29, maxEnhance: 3, range: 250, reqClass: null, reqPow: 0, reqDex: 53, reqMind: 0, weaponType: 'handgun' },
    'w_shotgun': { name: 'ショットガン', desc: '圧縮した光子を広範囲に発射する', price: 300, baseRarity: 2, basePow: 35, baseDex: 25, maxEnhance: 3, range: 180, reqClass: 'ranger', reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'shotgun' },
    'w_saber':   { name: 'セイバー', desc: '圧縮した光子で生成された剣。扱いやすい形状。', price: 100, baseRarity: 1, basePow: 60, baseDex: 18, maxEnhance: 3, range: 60, reqClass: null, reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'saber' },
    'w_buster':  { name: 'バスター', desc: '圧縮した光子で生成された剣。扱いやすい形状をしている', price: 500, baseRarity: 4, basePow: 120, baseDex: 19, maxEnhance: 3, range: 60, reqClass: null, reqPow: 100, reqDex: 0, reqMind: 0, weaponType: 'saber' },
    'w_dagger':  { name: 'ダガー', desc: '圧縮した光子で生成された短剣', price: 200, baseRarity: 2, basePow: 45, baseDex: 20, maxEnhance: 3, range: 50, reqClass: 'swordman', reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'dagger' },
    'w_cane':    { name: 'ケイン', desc: '光子を放出する杖。', price: 100, baseRarity: 1, basePow: 20, baseDex: 18, baseDef: 5, maxEnhance: 3, range: 40, reqClass: 'sorcerer', reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'cane' },
    'w_mace':    { name: 'メイス', desc: '青い光子を放出する杖。', price: 500, baseRarity: 4, basePow: 50, baseDex: 19, baseDef: 5, maxEnhance: 3, range: 40, reqClass: 'sorcerer', reqPow: 0, reqDex: 0, reqMind: 100, weaponType: 'cane' },
};

const ENCHANTS = [
    { id: 'heat', name: 'ヒート', type: 'add_dmg', value: (lv) => 39 + Math.floor(lv / 4), effect: 'fire' },
    { id: 'fire', name: 'ファイア', type: 'add_dmg', value: (lv) => 59 + Math.floor(lv / 2), effect: 'fire' },
    { id: 'shock', name: 'ショック', type: 'add_dmg', value: (lv) => 39 + Math.floor(lv / 4), effect: 'thunder' },
    { id: 'thunder', name: 'サンダー', type: 'add_dmg', value: (lv) => 59 + Math.floor(lv / 2), effect: 'thunder' },
    { id: 'ice', name: 'アイス', type: 'status', prob: 0.03, status: 'freeze', effect: 'ice' },
    { id: 'frost', name: 'フロスト', type: 'status', prob: 0.06, status: 'freeze', effect: 'ice' },
    { id: 'panic', name: 'パニック', type: 'status', prob: 0.03, status: 'confuse', effect: 'purple_fog' },
    { id: 'riot', name: 'ライアット', type: 'status', prob: 0.06, status: 'confuse', effect: 'purple_fog' },
    { id: 'draw', name: 'ドロー', type: 'drain', drainPercent: 0.05, effect: 'green_fog' },
    { id: 'drain', name: 'ドレイン', type: 'drain', drainPercent: 0.09, effect: 'green_fog' }
];

function generateWeapon(baseId, forcedEnhance = 0, forcedEnchant = null, forcedAttrs = null) {
    let base = BASE_WEAPONS[baseId];
    if (!base) return null;
    let wType = WEAPON_TYPES[base.weaponType];
    
    let w = {
        uid: 'w_' + Date.now() + Math.floor(Math.random() * 1000), // Unique ID
        id: baseId,
        type: 'weapon',
        weaponType: base.weaponType,
        baseName: base.name,
        desc: base.desc,
        reqClass: base.reqClass,
        reqPow: base.reqPow,
        reqDex: base.reqDex,
        reqMind: base.reqMind,
        basePow: base.basePow,
        baseDex: base.baseDex,
        baseDef: base.baseDef || 0,
        rarity: base.baseRarity,
        range: base.range,
        maxEnhance: base.maxEnhance,
        enhance: forcedEnhance,
        enchant: forcedEnchant,
        attrs: forcedAttrs || { native: 0, mutant: 0, machine: 0, dark: 0, hit: 0 }
    };
    
    // Calculate final stats
    w.atk = w.basePow + w.enhance;
    w.dex = w.baseDex; // Hit attribute logic might apply here later
    w.def = w.baseDef;
    
    // Construct display name
    let prefix = w.enchant ? ENCHANTS.find(e => e.id === w.enchant).name + ' ' : '';
    let suffix = w.enhance > 0 ? ' +' + w.enhance : '';
    w.name = prefix + w.baseName + suffix;
    
    return w;
}

// Player Entity
class Player {
    constructor(id, classId, x, y) {
        this.id = id; // 0 for 1P, 1 for 2P
        this.classId = classId;
        this.level = 1;
        const cdata = CLASS_DATA[classId];
        this.maxHp = cdata.hp;
        this.hp = this.maxHp;
        this.maxMp = cdata.mp;
        this.mp = this.maxMp;
        this.atk = cdata.atk;
        this.def = cdata.def;
        this.spd = cdata.spd;
        this.sprite = cdata.sprite;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.dirX = 0;
        this.dirY = 1;
        this.maxMp = cdata.mp;
        this.mp = this.maxMp;
        this.atk = cdata.atk;
        this.def = cdata.def;
        this.spd = cdata.spd;
        
        this.dex = 50;
        this.baseStats = {
            maxHp: cdata.hp,
            maxMp: cdata.mp,
            atk: cdata.atk,
            def: cdata.def,
            spd: cdata.spd,
            dex: 50,
            mind: 40,
            luck: 10
        };
        
        this.exp = 0;
        this.nextExp = 100;
        
        this.equip = { armor: null };
        
        this.palette = [null, null, null, null, null, null];
        this.paletteIndex = 1; // 0=L, 1=ACT, 2=R
        
        // Add requested default items
        this.inventory = [
            generateWeapon('w_saber', 0, 'heat', {native: 15, mutant: 0, machine: 0, dark: 5, hit: 5}),
            generateWeapon('w_handgun'),
            generateWeapon('w_shotgun', 2, 'ice'),
            generateWeapon('w_buster', 3, 'fire'),
            generateWeapon('w_railgun'),
            generateWeapon('w_dagger'),
            generateWeapon('w_cane', 0, 'draw'),
            generateWeapon('w_mace', 1, 'drain'),
            { id: 'a_armor', name: 'アーマー', type: 'armor', def: 10, slotCount: 2, slottedUnits: [null, null] },
            { id: 'u_acc', name: '命中＋ユニット', type: 'unit', dex: 10 },
            { id: 'u_hp', name: 'HP＋ユニット', type: 'unit', hp: 20 },
            { id: 'm_resta_1', name: 'レスタLv1ディスク', type: 'disk', magic: 'resta', lv: 1 },
            { id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50, stack: 3 },
            { id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30, stack: 2 }
        ].filter(i => i !== null);

        // Combo system
        this.comboCount = 0;
        this.comboTimer = 0;
        this.state = 'idle'; // idle, move, attack, dead
        this.menuOpen = false;
        
        this.debugInfo = [];
        this.lastAttackShape = null;
        
        this.attackMoveTime = 0;
        this.attackMoveTotal = 0;
        this.attackMoveStartX = 0;
        this.attackMoveStartY = 0;
        this.attackMoveTargetX = 0;
        this.attackMoveTargetY = 0;
        
        this.invincibleTimer = 0;

        // Default weapon for testing
        this.palette[0] = this.inventory[0];
        this.palette[1] = this.inventory[1];
    }
    
    recalculateStats() {
        let hpRatio = this.hp / this.maxHp;
        let mpRatio = this.maxMp > 0 ? (this.mp / this.maxMp) : 0;
        
        this.maxHp = this.baseStats.maxHp;
        this.maxMp = this.baseStats.maxMp;
        this.atk = this.baseStats.atk;
        this.def = this.baseStats.def;
        this.spd = this.baseStats.spd;
        this.dex = this.baseStats.dex;
        
        if (this.equip.armor) {
            if (this.equip.armor.def) this.def += this.equip.armor.def;
            if (this.equip.armor.slottedUnits) {
                this.equip.armor.slottedUnits.forEach(u => {
                    if (u) {
                        if (u.atk) this.atk += u.atk;
                        if (u.def) this.def += u.def;
                        if (u.hp) this.maxHp += u.hp;
                        if (u.dex) this.dex += u.dex;
                    }
                });
            }
        }
        
        this.hp = Math.min(this.maxHp, this.maxHp * hpRatio);
        this.mp = Math.min(this.maxMp, this.maxMp * mpRatio);
        
        // パレットにセットされている武器の条件を再チェック
        for (let i = 0; i < 6; i++) {
            let item = this.palette[i];
            if (item && item.type === 'weapon') {
                let valid = true;
                if (item.reqClass && this.classId !== item.reqClass) valid = false;
                if (item.reqDex && this.dex < item.reqDex) valid = false;
                
                if (!valid) {
                    this.palette[i] = null;
                    // Note: updatePaletteUI will be called if needed, or caller handles UI refresh
                }
            }
        }
    }

    update(dt) {
        if (this.hp <= 0) {
           if (this.state === 'dead') return;
        }
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        
        let input = INPUTS[this.id];
        
        if (this.state === 'attack') {
            this.comboTimer += dt;
            let action = this.palette[this.paletteIndex];
            
            this.debugInfo = [
                `Combo: ${this.comboCount}`,
                `Timer: ${this.comboTimer.toFixed(2)}`
            ];
            
            if (action && action.weaponType) {
                let wType = WEAPON_TYPES[action.weaponType];
                if (this.comboCount < wType.maxCombo) {
                    let classMod = wType.classMod[this.classId] || 0;
                    let targetTime = wType.timing[this.comboCount - 1] + classMod;
                    this.debugInfo.push(`Window: ${targetTime.toFixed(2)} - ${(targetTime+0.15).toFixed(2)}`);
                    
                    if (this.comboTimer > targetTime + 0.15) {
                        this.state = 'idle';
                        this.comboCount = 0;
                        this.lastAttackShape = null;
                    }
                } else {
                    if (this.comboTimer > 0.6) {
                        this.state = 'idle';
                        this.comboCount = 0;
                        this.lastAttackShape = null;
                    }
                }
            } else {
                if (this.comboTimer > 0.5) { this.state = 'idle'; this.comboCount = 0; this.lastAttackShape = null; }
            }
            
            // Continuous attack movement
            if (this.attackMoveTime < this.attackMoveTotal) {
                this.attackMoveTime += dt;
                let progress = Math.min(1, this.attackMoveTime / this.attackMoveTotal);
                this.x = this.attackMoveStartX + (this.attackMoveTargetX - this.attackMoveStartX) * progress;
                this.y = this.attackMoveStartY + (this.attackMoveTargetY - this.attackMoveStartY) * progress;
                
                // Update shape origin
                if (this.lastAttackShape) {
                    if (this.lastAttackShape.type === 'circle1' && action.weaponType) {
                        let offset = WEAPON_TYPES[action.weaponType].offsets[this.comboCount - 1];
                        if (offset) {
                            let hitAngle = this.lastAttackShape.angle + (offset.angle * Math.PI / 180);
                            this.lastAttackShape.cx = this.x + Math.cos(hitAngle) * offset.dist;
                            this.lastAttackShape.cy = this.y + Math.sin(hitAngle) * offset.dist;
                        }
                    } else if (this.lastAttackShape.type === 'fan45') {
                        this.lastAttackShape.cx = this.x;
                        this.lastAttackShape.cy = this.y;
                    }
                }
            }
        } else {
            this.debugInfo = [];
            this.lastAttackShape = null;
            // Movement
            if (input.vx !== 0 || input.vy !== 0) {
                this.vx = input.vx * this.spd;
                this.vy = input.vy * this.spd;
                this.dirX = input.vx;
                this.dirY = input.vy;
                this.state = 'move';
            } else {
                this.vx = 0;
                this.vy = 0;
                this.state = 'idle';
            }

            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // 2P Screen Constraint (Invisible wall relative to 1P)
            if (this.id === 1 && GAME.players[0]) {
                const p1 = GAME.players[0];
                const halfW = SCREEN_W / 2;
                const halfH = SCREEN_H / 2;
                if (this.x < p1.x - halfW + 16) this.x = p1.x - halfW + 16;
                if (this.x > p1.x + halfW - 16) this.x = p1.x + halfW - 16;
                if (this.y < p1.y - halfH + 16) this.y = p1.y - halfH + 16;
                if (this.y > p1.y + halfH - 16) this.y = p1.y + halfH - 16;
            }
        }
    }

    draw(ctx) {
        if (this.state === 'dead') return;
        ctx.fillStyle = this.id === 0 ? 'blue' : 'green';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
        
        // Draw Direction Indicator
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.dirX * 20, this.y + this.dirY * 20);
        ctx.stroke();

        // Draw attack bounding box (Visualizer)
        if (this.state === 'attack' && this.lastAttackShape) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            ctx.beginPath();
            let shape = this.lastAttackShape;
            
            if (shape.type === 'fan45') {
                ctx.moveTo(this.x, this.y);
                ctx.arc(this.x, this.y, shape.range, shape.angle - Math.PI/8, shape.angle + Math.PI/8);
                ctx.closePath();
                ctx.fill();
            } else if (shape.type === 'circle1') {
                ctx.arc(shape.cx, shape.cy, shape.radius, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        // Debug Text
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        for (let i = 0; i < this.debugInfo.length; i++) {
            ctx.fillText(this.debugInfo[i], this.x - 20, this.y - 30 - (i * 14));
        }
    }

    doAction() {
        if (this.state === 'dead') return;

        if (GAME.mode === 'town') {
            // Check NPC distance
            let closestNPC = null;
            let minDist = 30;
            MAP_DATA.town.npcs.forEach(npc => {
                let dist = Math.hypot(npc.x - this.x, npc.y - this.y);
                if (dist < minDist) { minDist = dist; closestNPC = npc; }
            });
            if (closestNPC) {
                if (closestNPC.type === 'inn') {
                    if (confirm('宿屋に泊まりますか？ (10コイン)')) {
                        this.hp = this.maxHp; this.mp = this.maxMp;
                        alert('HPとMPが回復しました！');
                    }
                } else if (closestNPC.type === 'appraiser') {
                    alert('未鑑定アイテムはありません。');
                } else if (closestNPC.type === 'shop') {
                    alert('ショップ機能は準備中です。');
                } else if (closestNPC.type === 'teleporter') {
                    if (confirm('ステージ1へ転送しますか？')) {
                        GAME.mode = 'map';
                        loadArea(MAP_DATA.stages[0].areas[0].patterns[0]);
                    }
                }
                return;
            }
        }

        let action = this.palette[this.paletteIndex];
        if (!action) return;

        if (action.type === 'weapon') {
            let wType = WEAPON_TYPES[action.weaponType];
            let classMod = wType.classMod[this.classId] || 0;
            
            if (this.state === 'attack') {
                if (this.comboCount >= wType.maxCombo) return;
                
                let targetTime = wType.timing[this.comboCount - 1] + classMod;
                if (this.comboTimer >= targetTime && this.comboTimer <= targetTime + 0.15) {
                    this.comboCount++;
                } else {
                    return; // Ignore if pressed outside window
                }
            } else {
                this.state = 'attack';
                this.comboCount = 1;
            }
            
            this.comboTimer = 0;
            
            // Motion
            let motion = wType.motions[this.comboCount - 1];
            let dirLen = Math.hypot(this.dirX, this.dirY);
            let nX = dirLen > 0 ? this.dirX / dirLen : 0;
            let nY = dirLen > 0 ? this.dirY / dirLen : 1;
            
            if (motion > 0) {
                this.attackMoveTotal = 0.5; // 0.5s move
                this.attackMoveTime = 0;
                this.attackMoveStartX = this.x;
                this.attackMoveStartY = this.y;
                this.attackMoveTargetX = this.x + nX * motion * 5;
                this.attackMoveTargetY = this.y + nY * motion * 5;
                this.debugInfo.push(`Move Target: ${motion*5}px`);
            } else {
                this.attackMoveTotal = 0;
            }
            
            console.log(`Player ${this.id+1} attacks! Combo: ${this.comboCount}, Weapon: ${action.name}`);
            
            // Target logic
            let targets = [];
            let inRange = GAME.enemies.filter(e => Math.hypot(e.x - this.x, e.y - this.y) <= action.range);
            
            let pAngle = Math.atan2(this.dirY, this.dirX);
            
            this.lastAttackShape = { type: wType.shape, angle: pAngle, range: action.range, cx: this.x, cy: this.y, radius: 20 };
            
            if (wType.shape === 'none') {
                // Just get the closest one
                if (inRange.length > 0) {
                    inRange.sort((a,b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                    targets.push(inRange[0]);
                }
            } else if (wType.shape === 'fan45') {
                targets = inRange.filter(e => {
                    let angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                    let diff = Math.abs(angleToEnemy - pAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;
                    return diff <= (Math.PI / 8); // 45 degrees is +/- 22.5 (PI/8)
                });
            } else if (wType.shape === 'circle1') {
                let offset = wType.offsets[this.comboCount - 1];
                let cx = this.x;
                let cy = this.y;
                let radius = 20; // 1 -> 20px scaled radius
                if (offset) {
                    let hitAngle = pAngle + (offset.angle * Math.PI / 180);
                    cx += Math.cos(hitAngle) * offset.dist;
                    cy += Math.sin(hitAngle) * offset.dist;
                    if (offset.dist === 0 && action.weaponType === 'dagger') radius = action.range; 
                }
                this.lastAttackShape.cx = cx;
                this.lastAttackShape.cy = cy;
                this.lastAttackShape.radius = radius;
                
                targets = inRange.filter(e => Math.hypot(e.x - cx, e.y - cy) <= radius);
            }
            
            // Apply target limits
            if (wType.targetType === 'single' && targets.length > 1) {
                targets.sort((a,b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
                targets = [targets[0]];
            } else if (wType.targetType === 'scopeN' && targets.length > wType.targetNum) {
                targets.sort(() => Math.random() - 0.5);
                targets = targets.slice(0, wType.targetNum);
            }

            targets.forEach(target => {
                let dmg = this.atk * (1 + this.comboCount * 0.2);
                if (action.attrs && action.attrs.native) dmg *= 1.2;
                dmg = Math.floor(dmg);
                target.hp -= dmg;
                target.stunTimer = 1.0; // Stun for 1.0s on hit
                addFloatingText(target.x, target.y - 20, dmg, 'white');
                console.log(`Hit enemy! Enemy HP: ${target.hp}`);
                
                // Trigger enchant on 3rd combo
                if (this.comboCount === 3 && action.enchant) {
                    let ench = ENCHANTS.find(e => e.id === action.enchant);
                    if (ench) {
                        this.debugInfo.push(`Enchant: ${ench.name}!`);
                        if (ench.type === 'add_dmg') {
                            let edmg = Math.floor(ench.value(this.level));
                            target.hp -= edmg;
                            addFloatingText(target.x, target.y - 40, edmg, 'white');
                            console.log(`Enchant Damage! +${edmg}`);
                        } else if (ench.type === 'drain') {
                            let heal = Math.floor(target.hp * ench.drainPercent);
                            this.hp = Math.min(this.maxHp, this.hp + heal);
                            addFloatingText(this.x, this.y - 20, heal, '#33ff33');
                            console.log(`Drain! Healed: ${heal}`);
                        }
                    }
                }
            });

        } else if (action.type === 'item') {
            if (action.healHp) {
                let heal = Math.min(this.maxHp - this.hp, action.healHp);
                this.hp += heal;
                addFloatingText(this.x, this.y - 20, heal, '#33ff33');
                if (action.stack > 0) action.stack--;
                if (action.stack <= 0) {
                    this.palette[this.paletteIndex] = null;
                    this.inventory = this.inventory.filter(i => i !== action);
                    renderMenu(this.id);
                }
            }
            if (action.healMp) {
                let heal = Math.min(this.maxMp - this.mp, action.healMp);
                this.mp += heal;
                addFloatingText(this.x, this.y - 20, heal, '#33ff33');
                if (action.stack > 0) action.stack--;
                if (action.stack <= 0) {
                    this.palette[this.paletteIndex] = null;
                    this.inventory = this.inventory.filter(i => i !== action);
                    renderMenu(this.id);
                }
            }
            this.state = 'idle'; // Prevent item spam
            
        } else if (action.type === 'disk') {
            if (action.magic === 'resta') {
                let cost = 10;
                if (this.mp >= cost) {
                    this.mp -= cost;
                    let heal = Math.min(this.maxHp - this.hp, 50 * action.lv);
                    this.hp += heal;
                    addFloatingText(this.x, this.y - 20, heal, '#33ff33');
                } else {
                    this.debugInfo.push("Not enough MP");
                }
            }
            this.state = 'idle';
        }
    }
}

// Enemy Entity
class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = 50;
        this.maxHp = 50;
        this.atk = 5;
        this.baseSpd = 30; // Reduced default speed
        this.spd = this.baseSpd; // Can be modified by difficulty later
        this.stunTimer = 0;
        this.dirX = 0;
        this.dirY = 1;
    }

    update(dt) {
        if (this.hp <= 0) return;
        
        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return;
        }
        
        // Simple follow 1P
        let target = GAME.players[0];
        if (!target || target.state === 'dead') return;

        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let dist = Math.hypot(dx, dy);
        
        if (dist > 20) {
            this.dirX = dx / dist;
            this.dirY = dy / dist;
            this.x += this.dirX * this.spd * dt;
            this.y += this.dirY * this.spd * dt;
        }
    }

    draw(ctx) {
        if (this.hp <= 0) return;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
        
        // HP Bar
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - 10, this.y - 15, 20, 4);
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 10, this.y - 15, 20 * (this.hp / this.maxHp), 4);
    }
}

// Map Loading
async function loadMapData() {
    try {
        const res = await fetch('maps.json');
        MAP_DATA = await res.json();
    } catch(e) {
        console.error('Failed to load maps.json', e);
    }
}

function loadArea(areaPattern) {
    GAME.currentMapPattern = areaPattern;
    GAME.enemies = [];
    if (areaPattern.enemies) {
        areaPattern.enemies.forEach(ed => {
            GAME.enemies.push(new Enemy(ed.type, ed.x, ed.y));
        });
    }
    
    // Set players to start
    GAME.players.forEach(p => {
        p.x = areaPattern.start.x;
        p.y = areaPattern.start.y;
    });
}

function startGame(is2P, class1, class2) {
    GAME.mode = 'town';
    GAME.is2P = is2P;
    GAME.players = [];
    GAME.players.push(new Player(0, class1, MAP_DATA.town.start.x, MAP_DATA.town.start.y));
    if (is2P) {
        GAME.players.push(new Player(1, class2 || 'ranger', MAP_DATA.town.start.x + 30, MAP_DATA.town.start.y));
    }
    
    // Hide screens
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById('hud').style.display = 'block';
    
    if (is2P) {
        document.getElementById('status-2p').style.display = 'flex';
        document.getElementById('palette-2p').style.display = 'flex';
    }

    // Touch controls
    document.getElementById('vpad-1p').style.display = 'block';
    document.getElementById('btns-1p').style.display = 'block';

    updateUI();
}

// Input Handling
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup', e => { keys[e.code] = false; });

function processInputs() {
    let i1 = INPUTS[0];
    let kx = 0; let ky = 0;
    if (keys['ArrowUp'] || keys['KeyW']) ky = -1;
    if (keys['ArrowDown'] || keys['KeyS']) ky = 1;
    if (keys['ArrowLeft'] || keys['KeyA']) kx = -1;
    if (keys['ArrowRight'] || keys['KeyD']) kx = 1;

    if (kx !== 0 && ky !== 0) {
        let len = Math.hypot(kx, ky);
        kx /= len; ky /= len;
    }

    if (i1.touchActive) {
        i1.vx = i1.tVx;
        i1.vy = i1.tVy;
    } else {
        i1.vx = kx;
        i1.vy = ky;
    }

    let rawAct = keys['Space'] || i1.tAct;
    if (rawAct) { if (!i1.actHeld) { i1.act = true; i1.actHeld = true; } else { i1.act = false; } }
    else { i1.actHeld = false; i1.act = false; }
    
    let rawPalLeft = keys['KeyQ'] || i1.tPalLeft;
    if (rawPalLeft) { if (!i1.lHeld) { i1.palLeft = true; i1.lHeld = true; } else { i1.palLeft = false; } }
    else { i1.lHeld = false; i1.palLeft = false; }
    
    let rawPalRight = keys['KeyE'] || i1.tPalRight;
    if (rawPalRight) { if (!i1.rHeld) { i1.palRight = true; i1.rHeld = true; } else { i1.palRight = false; } }
    else { i1.rHeld = false; i1.palRight = false; }
    
    let rawMenu = keys['Enter'] || i1.tMenu;
    if (rawMenu) { if (!i1.mHeld) { i1.menu = true; i1.mHeld = true; } else { i1.menu = false; } }
    else { i1.mHeld = false; i1.menu = false; }

    // Gamepad override for 1P/2P
    const pads = navigator.getGamepads();
    for (let i = 0; i < 2; i++) {
        const pad = pads[i];
        if (pad && INPUTS[i]) {
            let px = pad.axes[0];
            let py = pad.axes[1];
            if (Math.abs(px) < 0.2) px = 0;
            if (Math.abs(py) < 0.2) py = 0;
            if (px !== 0 || py !== 0) {
                INPUTS[i].vx = px;
                INPUTS[i].vy = py;
            }
            // Buttons
            if (pad.buttons[0].pressed) { if (!INPUTS[i].actHeldP) { INPUTS[i].act = true; INPUTS[i].actHeldP = true; } else { INPUTS[i].act = false; } }
            else { INPUTS[i].actHeldP = false; }
        }
    }
}

function handleActions() {
    GAME.players.forEach(p => {
        let input = INPUTS[p.id];
        
        if (input.palLeft) {
            p.paletteIndex--;
            if (p.paletteIndex < 0) p.paletteIndex = 5;
            updatePaletteUI(p.id);
        }
        if (input.palRight) {
            p.paletteIndex++;
            if (p.paletteIndex > 5) p.paletteIndex = 0;
            updatePaletteUI(p.id);
        }
        if (input.act && !p.menuOpen) {
            p.doAction();
        }
        if (input.menu) {
            p.menuOpen = !p.menuOpen;
            let el = document.getElementById(`menu-${p.id + 1}p`);
            if (p.menuOpen) {
                el.classList.add('open');
                renderMenu(p.id);
            } else {
                el.classList.remove('open');
            }
        }
    });
}


let currentMenuTab = 'inv';

let currentModalItem = null;
let currentModalPid = 0;

function openItemModal(item, pid, source, slotIdx = -1) {
    let p = GAME.players[pid];
    let modal = document.getElementById('item-modal');
    currentModalItem = item;
    currentModalPid = pid;
    
    document.getElementById('modal-item-name').innerText = item.name;
    
    let descTxt = item.desc || (item.name + " の説明文がここに入ります。");
    if (item.rarity) {
        let stars = Math.floor(item.rarity / 2) + 1;
        descTxt = "★".repeat(stars) + "\n" + descTxt;
    }
    document.getElementById('modal-item-desc').innerText = descTxt;
    
    let bonus = { atk: 0, def: 0, hp: 0, dex: 0 };
    if (item.type === 'armor' && item.slottedUnits) {
        item.slottedUnits.forEach(u => {
            if (u) {
                if (u.atk) bonus.atk += u.atk;
                if (u.def) bonus.def += u.def;
                if (u.hp) bonus.hp += u.hp;
                if (u.dex) bonus.dex += u.dex;
            }
        });
    }

    let stats = "";
    if (item.atk || bonus.atk) stats += `ATK: ${item.atk || 0} ` + (bonus.atk ? `<span style="color: #88ff88;">(+${bonus.atk})</span> ` : '');
    if (item.def || bonus.def) stats += `DEF: ${item.def || 0} ` + (bonus.def ? `<span style="color: #88ff88;">(+${bonus.def})</span> ` : '');
    if (item.hp || bonus.hp) stats += `HP: ${item.hp || 0} ` + (bonus.hp ? `<span style="color: #88ff88;">(+${bonus.hp})</span> ` : '');
    if (item.dex || bonus.dex) stats += `DEX: ${item.dex || 0} ` + (bonus.dex ? `<span style="color: #88ff88;">(+${bonus.dex})</span> ` : '');
    if (item.healHp) stats += "回復HP: " + item.healHp + " ";
    if (item.healMp) stats += "回復MP: " + item.healMp + " ";
    
    if (item.attrs) {
        let attrStr = [];
        if (item.attrs.native) attrStr.push(`原生生物 ${item.attrs.native}%`);
        if (item.attrs.mutant) attrStr.push(`突然変異 ${item.attrs.mutant}%`);
        if (item.attrs.machine) attrStr.push(`機械 ${item.attrs.machine}%`);
        if (item.attrs.dark) attrStr.push(`闇 ${item.attrs.dark}%`);
        if (item.attrs.hit) attrStr.push(`Hit ${item.attrs.hit}%`);
        if (attrStr.length > 0) {
            stats += `<br><span style="color: #ffaa00; font-size:12px;">属性: ${attrStr.join(', ')}</span>`;
        }
    }
    
    document.getElementById('modal-item-stats').innerHTML = stats;
    
    let btnUse = document.getElementById('btn-modal-use');
    let btnEquip = document.getElementById('btn-modal-equip');
    btnUse.style.display = 'none';
    btnEquip.style.display = 'none';
    
    let slotsEl = document.getElementById('modal-item-slots');
    let invEl = document.getElementById('modal-item-inventory');
    let trashEl = document.getElementById('modal-trash');
    let modalContent = document.getElementById('modal-content');
    let rightCol = document.getElementById('modal-col-right');
    slotsEl.style.display = 'none';
    trashEl.style.display = 'none';
    rightCol.style.display = 'none';
    modalContent.classList.remove('two-col');
    slotsEl.innerHTML = '';
    invEl.innerHTML = '';
    
    if (item.type === 'armor' && item.slotCount) {
        modalContent.classList.add('two-col');
        slotsEl.style.display = 'flex';
        trashEl.style.display = 'block';
        rightCol.style.display = 'flex';
        invEl.style.display = 'flex';
        if (!item.slottedUnits) item.slottedUnits = new Array(item.slotCount).fill(null);
        
        // Render Slots
        for (let i = 0; i < item.slotCount; i++) {
            let u = item.slottedUnits[i];
            let div = document.createElement('div');
            div.className = 'modal-slot';
            div.setAttribute('data-modal-slot-idx', i);
            div.innerHTML = `[Slot ${i+1}] ${u ? u.name : '空'}`;
            if (u) {
                div.addEventListener('pointerdown', e => {
                    e.preventDefault();
                    div.setPointerCapture(e.pointerId);
                    dndState = { item: u, clone: null, pid: pid, startX: e.clientX, startY: e.clientY, startTime: Date.now(), source: 'modal-slot', slotIdx: i, longPressTimer: null };
                });
            }
            slotsEl.appendChild(div);
        }
        
        // Render Units in Inventory
        let units = p.inventory.filter(i => i !== null && i.type === 'unit');
        units.forEach(u => {
            let div = document.createElement('div');
            div.className = 'menu-item';
            div.innerText = u.name;
            div.addEventListener('pointerdown', e => {
                e.preventDefault();
                div.setPointerCapture(e.pointerId);
                dndState = { item: u, clone: null, pid: pid, startX: e.clientX, startY: e.clientY, startTime: Date.now(), source: 'modal-inv', slotIdx: -1, longPressTimer: null };
            });
            invEl.appendChild(div);
        });
        
        btnEquip.style.display = 'inline-block';
        if (p.equip.armor === item) {
            btnEquip.innerText = '外す';
            btnEquip.onclick = () => {
                p.equip.armor = null;
                p.recalculateStats();
                modal.style.display = 'none';
                renderMenu(pid);
            };
        } else {
            btnEquip.innerText = '装備する';
            btnEquip.onclick = () => {
                p.equip.armor = item;
                p.recalculateStats();
                modal.style.display = 'none';
                renderMenu(pid);
            };
        }
    }

    if (item.type === 'item' || item.type === 'disk') {
        btnUse.style.display = 'inline-block';
        btnUse.onclick = () => {
            if (item.type === 'item') {
                if (item.healHp) p.hp = Math.min(p.maxHp, p.hp + item.healHp);
                if (item.healMp) p.mp = Math.min(p.maxMp, p.mp + item.healMp);
                if (item.stack > 0) item.stack--;
                if (item.stack <= 0) p.inventory = p.inventory.filter(i => i !== item);
            } else if (item.type === 'disk') {
                if (!p.magic) p.magic = [];
                p.magic.push({ id: item.id, name: item.name.replace('ディスク',''), type: 'magic', magic: item.magic, lv: item.lv });
                p.inventory = p.inventory.filter(i => i !== item);
            }
            modal.style.display = 'none';
            renderMenu(pid);
        };
    }
    
    document.getElementById('btn-modal-close').onclick = () => {
        modal.style.display = 'none';
        currentModalItem = null;
    };
    
    modal.style.display = 'flex';
}

// Global Drag and Drop state
let dndState = {
    item: null,
    clone: null,
    pid: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    source: null, // 'inv', 'magic', 'palette'
    slotIdx: -1,
    longPressTimer: null
};

// --- Floating Text System ---
let floatingTexts = [];
function addFloatingText(x, y, text, color, isLevelUp = false) {
    floatingTexts.push({
        x: x, y: y, text: text, color: color, life: 1.5, maxLife: 1.5, isLevelUp: isLevelUp
    });
}
function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i];
        ft.life -= dt;
        if (!ft.isLevelUp) ft.y -= 20 * dt; // float up
        if (ft.life <= 0) floatingTexts.splice(i, 1);
    }
}
function drawFloatingTexts(ctx) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px sans-serif';
    ctx.lineWidth = 3;
    floatingTexts.forEach(ft => {
        if (ft.isLevelUp) return; // Drawn separately in UI
        ctx.strokeStyle = 'black';
        ctx.fillStyle = ft.color;
        let alpha = Math.max(0, ft.life / ft.maxLife);
        ctx.globalAlpha = alpha;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1.0;
}
function drawLevelUpUI(ctx) {
    let lvUp = floatingTexts.find(ft => ft.isLevelUp);
    if (!lvUp) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform for screen space
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = lvUp.color;
    let lines = lvUp.text.split('\n');
    let alpha = Math.max(0, Math.min(1, lvUp.life)); // fade out at end
    ctx.globalAlpha = alpha;
    let startY = SCREEN_H / 2 - (lines.length * 20) / 2;
    lines.forEach((line, i) => {
        ctx.strokeText(line, 20, startY + i * 22);
        ctx.fillText(line, 20, startY + i * 22);
    });
    ctx.restore();
}

function gainExp(p, amount) {
    p.exp += amount;
    addFloatingText(p.x, p.y - 40, `+${amount} EXP`, '#e066ff');
    if (p.exp >= p.nextExp) {
        p.exp -= p.nextExp;
        p.level++;
        p.nextExp = 100; // Flat for now
        
        p.baseStats.maxHp += 10;
        p.baseStats.maxMp += 5;
        p.baseStats.atk += 2;
        p.baseStats.def += 2;
        p.baseStats.dex += 1;
        p.baseStats.mind += 1;
        p.baseStats.luck += 1;
        
        p.hp = p.baseStats.maxHp;
        p.mp = p.baseStats.maxMp;
        p.recalculateStats();
        
        let msg = `LEVEL UP!\nLv ${p.level}\nHP +10\nMP +5\nPOW +2\nDEF +2\nDEX +1\nMIND +1\nLUCK +1`;
        addFloatingText(0, 0, msg, '#ffcc00', true);
    }
}
// -----------------------------

function renderMenu(pid) {
    let p = GAME.players[pid];
    if (!p.magic) p.magic = [];
    
    if (currentMenuTab === 'status') {
        let st = document.getElementById('status-content');
        if (st) {
            st.innerHTML = `
                LV: ${p.level} <br>
                EXP: 0 / 100 <br>
                HP: ${Math.floor(p.hp)} / ${p.maxHp} <br>
                MP: ${Math.floor(p.mp)} / ${p.maxMp} <br>
                POW: ${p.atk} <br>
                DEF: ${p.def} <br>
                DEX: ${p.dex} <br>
                MIND: 40 <br>
                EIV: 30 <br>
                LUCK: 10 <br>
            `;
        }
        let equipList = document.getElementById('equip-list');
        if (equipList) {
            let actWeapon = p.palette[p.paletteIndex];
            let weaponName = (actWeapon && actWeapon.type === 'weapon') ? actWeapon.name : 'なし';
            let armorName = p.equip.armor ? p.equip.armor.name : 'なし';
            let unitsStr = '';
            if (p.equip.armor && p.equip.armor.slottedUnits) {
                p.equip.armor.slottedUnits.forEach((u, i) => {
                    unitsStr += `スロット${i+1}: ${u ? u.name : '空'}<br>`;
                });
            }
            equipList.innerHTML = `武器: ${weaponName}<br>防具: ${armorName}<br>ユニット:<br>${unitsStr}`;
        }
        return;
    }

    let isMagic = (currentMenuTab === 'magic');
    let invEl = document.getElementById(isMagic ? `menu-magic-${pid+1}p` : `menu-list-${pid+1}p`);
    let palEl = document.getElementById(isMagic ? `menu-palette-magic-${pid+1}p` : `menu-palette-${pid+1}p`);
    if (!invEl || !palEl) return;
    
    invEl.innerHTML = '';
    palEl.innerHTML = '';
    
    // Render palette slots
    for (let i = 0; i < 6; i++) {
        let pdiv = document.createElement('div');
        pdiv.className = 'menu-item palette-menu-slot';
        pdiv.setAttribute('data-slot-idx', i);
        pdiv.style.minHeight = '30px';
        let item = p.palette[i];
        pdiv.innerHTML = `<span>[${i+1}] ${item ? item.name : '空'}</span>`;
        
        if (item) {
            pdiv.addEventListener('pointerdown', e => {
                e.preventDefault();
                pdiv.setPointerCapture(e.pointerId);
                dndState = { item: item, clone: null, pid: pid, startX: e.clientX, startY: e.clientY, startTime: Date.now(), source: 'palette', slotIdx: i };
                dndState.longPressTimer = setTimeout(() => {
                    if (dndState.item) {
                        let i_ref = dndState.item;
                        dndState.item = null; // Cancel D&D
                        openItemModal(i_ref, pid, 'palette', i);
                    }
                }, 500);
            });
        }
        palEl.appendChild(pdiv);
    }
    
    let listSource = isMagic ? p.magic : p.inventory.filter(i => i !== null);
    
    if (!isMagic) {
        let typeOrder = { 'weapon': 1, 'armor': 2, 'unit': 3, 'item': 4, 'disk': 5 };
        listSource.sort((a, b) => {
            let aEquip = (p.equip.armor === a || p.palette.includes(a)) ? 0 : 1;
            let bEquip = (p.equip.armor === b || p.palette.includes(b)) ? 0 : 1;
            if (aEquip !== bEquip) return aEquip - bEquip;
            
            let aT = typeOrder[a.type] || 99;
            let bT = typeOrder[b.type] || 99;
            if (aT !== bT) return aT - bT;
            
            return a.id.localeCompare(b.id);
        });
    }
    
    listSource.forEach((item, idx) => {
        let div = document.createElement('div');
        div.className = 'menu-item';
        
        let isEquipable = true;
        let prefix = '';
        if (!isMagic) {
            let isEquipped = p.equip.armor === item;
            let isPalette = p.palette.includes(item);
            
            if (item.type === 'weapon') {
                if (item.reqClass && p.classId !== item.reqClass) isEquipable = false;
                if (item.reqDex && p.dex < item.reqDex) isEquipable = false;
            }
            if (!isEquipable) {
                div.style.borderColor = '#444';
                div.style.color = '#777';
            }
            if (isEquipped) prefix = '[E] ';
            if (isPalette) prefix = '[P] ';
        }

        div.innerHTML = `<span>${prefix}${item.name} ${item.stack ? 'x'+item.stack : ''}</span>`;
        
        div.addEventListener('pointerdown', (e) => {
            if (!isEquipable) return; // Prevent drag
            e.preventDefault();
            div.setPointerCapture(e.pointerId);
            dndState = { item: item, clone: null, pid: pid, startX: e.clientX, startY: e.clientY, startTime: Date.now(), source: isMagic ? 'magic' : 'inv', slotIdx: -1 };
        });

        invEl.appendChild(div);
    });
}

// Global touch handlers for drag and drop
window.addEventListener('pointermove', (e) => {
    if (dndState.item) {
        let dx = e.clientX - dndState.startX;
        let dy = e.clientY - dndState.startY;
        if (Math.hypot(dx, dy) > 10) {
            clearTimeout(dndState.longPressTimer);
            if (!dndState.clone) {
                let div = document.createElement('div');
                div.className = 'menu-item';
                div.style.background = '#ffcc00';
                div.style.color = '#000';
                div.innerText = dndState.item.name;
                dndState.clone = div;
                dndState.clone.style.position = 'fixed';
                dndState.clone.style.zIndex = 1000;
                dndState.clone.style.opacity = '0.8';
                dndState.clone.style.pointerEvents = 'none';
                document.body.appendChild(dndState.clone);
            }
            dndState.clone.style.left = e.clientX - 50 + 'px';
            dndState.clone.style.top = e.clientY - 20 + 'px';
        }
    }
});

window.addEventListener('pointerup', cleanupDnd);
window.addEventListener('pointercancel', cleanupDnd);

function cleanupDnd(e) {
    if (dndState.item) {
        clearTimeout(dndState.longPressTimer);
        let dx = e.clientX - dndState.startX;
        let dy = e.clientY - dndState.startY;
        let isTap = Math.hypot(dx, dy) <= 10 && (Date.now() - dndState.startTime < 500);

        if (isTap && dndState.source !== 'palette' && dndState.source !== 'modal-slot' && dndState.source !== 'modal-inv') {
            // Tap on inventory/magic item -> open modal
            openItemModal(dndState.item, dndState.pid, dndState.source);
        } else if (dndState.clone) {
            // It was dragged
            let target = document.elementFromPoint(e.clientX, e.clientY);
            if (target) {
                let slot = target.closest('.palette-menu-slot');
                let trash = target.closest('.trash-bin');
                let mSlot = target.closest('.modal-slot');
                let mTrash = target.closest('.modal-trash');
                let p = GAME.players[dndState.pid];
                
                if (mSlot && dndState.source === 'modal-inv' && currentModalItem) {
                    let targetIdx = parseInt(mSlot.getAttribute('data-modal-slot-idx'));
                    let prevUnit = currentModalItem.slottedUnits[targetIdx];
                    if (prevUnit) p.inventory.push(prevUnit);
                    currentModalItem.slottedUnits[targetIdx] = dndState.item;
                    p.inventory = p.inventory.filter(i => i !== dndState.item);
                    if (p.equip.armor === currentModalItem) p.recalculateStats();
                    openItemModal(currentModalItem, dndState.pid, 'inv');
                } else if (mTrash && dndState.source === 'modal-slot' && currentModalItem) {
                    p.inventory.push(dndState.item);
                    currentModalItem.slottedUnits[dndState.slotIdx] = null;
                    if (p.equip.armor === currentModalItem) p.recalculateStats();
                    openItemModal(currentModalItem, dndState.pid, 'inv');
                } else if (trash && dndState.source === 'palette') {
                    // Remove from palette
                    p.palette[dndState.slotIdx] = null;
                    updatePaletteUI(dndState.pid);
                    renderMenu(dndState.pid);
                } else if (slot && dndState.source !== 'palette' && dndState.source !== 'modal-slot' && dndState.source !== 'modal-inv') {
                    // Validate D&D
                    let item = dndState.item;
                    let valid = false;
                    let errorMsg = "このアイテム種別はパレットにセットできません。";
                    
                    if (dndState.source === 'inv' && (item.type === 'weapon' || item.type === 'item')) {
                        valid = true;
                        if (item.type === 'weapon') {
                            if (item.reqClass && p.classId !== item.reqClass) {
                                valid = false;
                                errorMsg = `装備できません。要求クラス: ${item.reqClass}`;
                            }
                            if (item.reqDex && p.dex < item.reqDex) {
                                valid = false;
                                errorMsg = `装備できません。要求命中力(DEX)が足りません (必要: ${item.reqDex}, 現在: ${p.dex})`;
                            }
                        }
                    }
                    if (dndState.source === 'magic' && (item.type === 'magic' || item.type === 'disk')) valid = true;
                    
                    if (valid) {
                        let targetIdx = parseInt(slot.getAttribute('data-slot-idx'));
                        p.palette[targetIdx] = item;
                        updatePaletteUI(dndState.pid);
                        renderMenu(dndState.pid);
                    } else {
                        alert(errorMsg);
                    }
                }
            }
        }
        
        if (dndState.clone) dndState.clone.remove();
        dndState.item = null;
        dndState.clone = null;
    }
}

function updateUI() {
    GAME.players.forEach(p => {
        let idstr = `${p.id + 1}p`;
        document.getElementById(`hp-${idstr}`).style.width = `${(p.hp / p.maxHp) * 100}%`;
        document.getElementById(`mp-${idstr}`).style.width = `${(p.mp / p.maxMp) * 100}%`;
        
        document.getElementById(`hp-val-${idstr}`).innerText = `${Math.floor(p.hp)}/${p.maxHp}`;
        document.getElementById(`mp-val-${idstr}`).innerText = `${Math.floor(p.mp)}/${p.maxMp}`;
        
        let cdata = CLASS_DATA[p.classId];
        document.getElementById(`info-${idstr}`).innerText = `Lv.${p.level} ${cdata.name}`;
        
        updatePaletteUI(p.id);
    });
}

function updatePaletteUI(pid) {
    let p = GAME.players[pid];
    let idstr = `${pid + 1}p`;
    
    let leftIdx = (p.paletteIndex - 1 + 6) % 6;
    let rightIdx = (p.paletteIndex + 1) % 6;
    
    document.querySelector(`#pal-${idstr}-left .slot-name`).innerText = p.palette[leftIdx] ? p.palette[leftIdx].name.substring(0,2) : '';
    document.querySelector(`#pal-${idstr}-center .slot-name`).innerText = p.palette[p.paletteIndex] ? p.palette[p.paletteIndex].name.substring(0,4) : '空';
    document.querySelector(`#pal-${idstr}-right .slot-name`).innerText = p.palette[rightIdx] ? p.palette[rightIdx].name.substring(0,2) : '';
}

function hitPlayer(p, e) {
    if (p.invincibleTimer > 0 || p.state === 'dead') return;
    p.hp -= e.atk;
    p.invincibleTimer = 1.0; // 1s invincibility
    addFloatingText(p.x, p.y - 20, e.atk, '#ff3333');
    if (p.menuOpen) {
        p.menuOpen = false;
        let menuEl = document.getElementById(`menu-${p.id + 1}p`);
        if (menuEl) menuEl.classList.remove('open');
    }
}

function resolveCollisions(dt) {
    let entities = [...GAME.players.filter(p => p.state !== 'dead'), ...GAME.enemies.filter(e => e.hp > 0)];
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            let a = entities[i];
            let b = entities[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);
            let minDist = 20; // 10 radius + 10 radius
            
            if (dist < minDist - 3) { // 3px overlap allowed
                let overlap = (minDist - 3) - dist;
                let nx = dx / (dist || 1);
                let ny = dy / (dist || 1);
                
                let pushA = (a instanceof Player) ? 0.2 : 0.5;
                let pushB = (b instanceof Player) ? 0.2 : 0.5;
                
                a.x -= nx * overlap * pushA;
                a.y -= ny * overlap * pushA;
                b.x += nx * overlap * pushB;
                b.y += ny * overlap * pushB;
                
                // Circling logic for enemies if blocked: center is 1 character length (20px) behind enemy
                if (a instanceof Enemy) {
                    let dTheta = (a.spd * dt) / 20; // angular velocity v/r
                    // Tangent vector to the circle centered at (x - fx*20, y - fy*20)
                    // The tangent vector simplifies to moving perpendicular to facing dir
                    a.x += -a.dirY * 20 * dTheta;
                    a.y += a.dirX * 20 * dTheta;
                }
                if (b instanceof Enemy) {
                    let dTheta = (b.spd * dt) / 20;
                    b.x += b.dirY * 20 * dTheta; // arbitrary rotate direction
                    b.y += -b.dirX * 20 * dTheta;
                }
                
                // Damage player
                if (a instanceof Enemy && b instanceof Player) hitPlayer(b, a);
                if (b instanceof Enemy && a instanceof Player) hitPlayer(a, b);
            }
        }
    }
}

// Game Loop
function update() {
    let now = performance.now();
    let dt = (now - GAME.lastTime) / 1000;
    GAME.lastTime = now;
    if (dt > 0.1) dt = 0.1;

    processInputs();

    if (GAME.mode === 'town' || GAME.mode === 'map') {
        handleActions();

        GAME.players.forEach(p => p.update(dt));
        
        GAME.enemies.forEach(e => {
            e.update(dt);
            if (e.hp <= 0 && !e.deadProcessed) {
                e.deadProcessed = true;
                gainExp(GAME.players[0], 10);
            }
        });
        GAME.enemies = GAME.enemies.filter(e => e.hp > 0);
        
        // Repopulate enemies up to 8
        if (GAME.mode === 'map' && GAME.enemies.length < 8) {
            let spawnX = GAME.players[0].x + (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 100);
            let spawnY = GAME.players[0].y + (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 100);
            GAME.enemies.push(new Enemy('booma', spawnX, spawnY));
        }
        
        resolveCollisions(dt);
        updateFloatingTexts(dt);

        // Map transition (Removed auto-transition, now using Teleporter)
        
        // Camera logic (Focus 1P)
        if (GAME.players[0]) {
            GAME.cameraX = GAME.players[0].x - SCREEN_W / 2;
            GAME.cameraY = GAME.players[0].y - SCREEN_H / 2;
        }

        updateUI();
    }
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.save();
    ctx.translate(-GAME.cameraX, -GAME.cameraY);

    // Draw Map grid (Placeholder)
    ctx.strokeStyle = '#333';
    for (let x = 0; x < 2000; x+=100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 2000); ctx.stroke();
    }
    for (let y = 0; y < 2000; y+=100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2000, y); ctx.stroke();
    }

    if (GAME.mode === 'town') {
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        MAP_DATA.town.npcs.forEach(npc => {
            ctx.fillStyle = 'purple';
            ctx.fillRect(npc.x - 15, npc.y - 15, 30, 30);
            ctx.fillStyle = 'white';
            ctx.fillText(npc.name, npc.x - 20, npc.y - 20);
        });
    }

    if (GAME.mode === 'map') {
        GAME.enemies.forEach(e => e.draw(ctx));
    }

    GAME.players.forEach(p => p.draw(ctx));

    drawFloatingTexts(ctx);

    ctx.restore();
    
    drawLevelUpUI(ctx);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Init
window.onload = async () => {
    await loadMapData();

    // DOM bindings
    document.getElementById('btn-start-1p').onclick = () => {
        document.getElementById('screen-title').style.display = 'none';
        document.getElementById('screen-class').style.display = 'flex';
        GAME.is2P = false;
    };
    
    document.getElementById('btn-start-2p').onclick = () => {
        document.getElementById('screen-title').style.display = 'none';
        document.getElementById('screen-class').style.display = 'flex';
        GAME.is2P = true;
    };

    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.onclick = () => {
            let cls = btn.getAttribute('data-class');
            startGame(GAME.is2P, cls, 'ranger');
        };
    });

    // Virtual Stick logic (pointer events for robust tap/mouse emulation)
    const vpad = document.getElementById('vpad-1p');
    const vstick = vpad.querySelector('.vstick');
    let vpadPointerId = null;

    vpad.addEventListener('pointerdown', e => {
        e.preventDefault();
        vpadPointerId = e.pointerId;
        vpad.setPointerCapture(vpadPointerId);
        INPUTS[0].touchActive = true;
        updateStick(e);
    });
    vpad.addEventListener('pointermove', e => {
        e.preventDefault();
        if (e.pointerId === vpadPointerId) updateStick(e);
    });
    const endStick = e => {
        e.preventDefault();
        if (e.pointerId === vpadPointerId) {
            vpadPointerId = null;
            vstick.style.transform = `translate(0px, 0px)`;
            INPUTS[0].tVx = 0; INPUTS[0].tVy = 0;
            INPUTS[0].touchActive = false;
        }
    };
    vpad.addEventListener('pointerup', endStick);
    vpad.addEventListener('pointercancel', endStick);

    function updateStick(t) {
        let rect = vpad.getBoundingClientRect();
        let cx = rect.left + rect.width / 2;
        let cy = rect.top + rect.height / 2;
        let dx = t.clientX - cx;
        let dy = t.clientY - cy;
        let dist = Math.hypot(dx, dy);
        if (dist > 35) { dx = dx/dist*35; dy = dy/dist*35; }
        vstick.style.transform = `translate(${dx}px, ${dy}px)`;
        
        let normDist = Math.min(dist / 35, 1.0);
        let ang = Math.atan2(dy, dx);
        INPUTS[0].tVx = Math.cos(ang) * normDist;
        INPUTS[0].tVy = Math.sin(ang) * normDist;
    }
    
    // Action buttons touch support (pointer events)
    ['up','down','left','right'].forEach(dir => {
        let btn = document.getElementById(`btn-1p-${dir}`);
        if(btn) {
            btn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                btn.setPointerCapture(e.pointerId);
                if (dir === 'up') INPUTS[0].tAct = true;
                if (dir === 'left') INPUTS[0].tPalLeft = true;
                if (dir === 'right') INPUTS[0].tPalRight = true;
                if (dir === 'down') INPUTS[0].tMenu = true;
            });
            const handleRelease = (e) => {
                e.preventDefault();
                if (dir === 'up') INPUTS[0].tAct = false;
                if (dir === 'left') INPUTS[0].tPalLeft = false;
                if (dir === 'right') INPUTS[0].tPalRight = false;
                if (dir === 'down') INPUTS[0].tMenu = false;
            };
            btn.addEventListener('pointerup', handleRelease);
            btn.addEventListener('pointercancel', handleRelease);
        }
    });
    
    // Close menus
    document.getElementById('btn-menu-close-1p').onclick = () => {
        GAME.players[0].menuOpen = false;
        document.getElementById('menu-1p').classList.remove('open');
    };

    // Menu Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.style.borderColor = '#fff';
                b.classList.remove('active');
            });
            btn.style.borderColor = '#ffcc00';
            btn.classList.add('active');
            currentMenuTab = btn.getAttribute('data-tab');
            document.getElementById('tab-inv').style.display = 'none';
            document.getElementById('tab-magic').style.display = 'none';
            document.getElementById('tab-status').style.display = 'none';
            
            document.getElementById(`tab-${currentMenuTab}`).style.display = 'flex';
            renderMenu(0);
        };
    });

    requestAnimationFrame(loop);
};
