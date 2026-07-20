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
    treasureSpawned: [false, false, false, false], // 4, 8, 12, 16
    coinsThisRun: 0,
    cameraX: 0,
    cameraY: 0,
    levelUpTurn: 0,
    reviveTimer: 0,
    reviveTarget: null
};

// Inputs
let INPUTS = [
    { vx: 0, vy: 0 }, // 1P
    { vx: 0, vy: 0 }  // 2P
];

// Save Data
let SAVE_DATA = { 
    coins: 0, hpLvl: 0, luckLvl: 0, 
    atkLvl: 0, defLvl: 0, spdLvl: 0,
    wizUnlocked: false,
    bombUnlocked: false,
    boomerangUnlocked: false,
    iceblustUnlocked: false,
    stonedustUnlocked: false,
    regeneUnlocked: false,
    barrierUnlocked: false,
    healPlusLvl: 0,
    reviveLuneUnlocked: false,
    rerollLvl: 0,
    exrollLvl: 0
};

const CHARACTERS = [
    { id: 'knight', name: 'ナイト', desc: '勇かんなナイト。操作は難しいが、バランスのとれた強さ。', hp: 100, atk: 10, def: 5, spd: 100, luck: 1, sprite: 'hero_knight_down_1', unlocked: true, initialEquip: 'sword' },
    { id: 'wiz', name: 'ウィッチ', desc: 'まほうつかいの女の子。素早く動ける。', hp: 80, atk: 10, def: 6, spd: 130, luck: 2, sprite: 'hero_wiz_left_1', unlocked: false, initialEquip: 'magic_bullet' },
    { id: 'bomber', name: 'ボンバーマン', desc: 'ばくだん男。こうげきアイテムの装備数が多いかわりに、こうげき以外のアイテムが1つしか装備できない。', hp: 110, atk: 8, def: 6, spd: 100, luck: 2, sprite: 'hero_bomb_down_1', unlocked: false, maxAtk: 6, maxBuf: 1, initialEquip: 'bomb' },
    { id: 'villager', name: 'むらむすめ', desc: 'か弱い女の子。アイテム所持数が少ない代わりに、うんのよさが極めて高い', hp: 70, atk: 5, def: 5, spd: 150, luck: 10, sprite: 'hero_week_down_1', unlocked: false, maxAtk: 3, maxBuf: 3, initialEquip: 'poison_mist' }
];

const EQUIP_DATA = {
    // Attack
    magic_bullet: { type: 'atk', name: 'マジックショット', icon: 'item_magic_bullet', maxLvl: 10, desc: '一番近い敵に向かって飛んでいくこうげきを放つ。', enhance: '発射ショット数+1 / ダメージ量増加' },
    sword: { type: 'atk', name: 'ソード', icon: 'item_sword', maxLvl: 10, desc: '前方につるぎをふってこうげき。はんい内の敵にダメージをあたえる。', enhance: 'こうげきはんい拡大 / ダメージ量増加' },
    fireball: { type: 'atk', name: 'ファイヤーボール', icon: 'item_fireball', maxLvl: 10, desc: '自分の周りに、回転する火の玉を展開する。', enhance: '火の玉の数+1 / ダメージ量増加' },
    thunderbolt: { type: 'atk', name: 'サンダーボルト', icon: 'item_thunderbolt', maxLvl: 10, desc: 'ランダムに、敵にいかずちを落とす。周囲にもダメージ。', enhance: '雷の数+1 / クールタイム-0.2秒' },
    poison_mist: { type: 'atk', name: 'ポイズンミスト', icon: 'item_poison_mist', maxLvl: 10, desc: '毒のキリを発生させる。敵の移動速度を遅くさせつつダメージもあたえる。', enhance: '霧の数+1 / ダメージ量増加' },
    bomb: { type: 'atk', name: 'ボム', icon: 'item_bomb', maxLvl: 10, desc: '目の前にボムを設置。ばくふうのはんい内の敵にダメージをあたえる。', enhance: '設置個数+1 / 爆発時間-0.1秒' },
    axe: { type: 'atk', name: 'アックス', icon: 'item_axe', maxLvl: 10, desc: 'オノをなげて投げてこうげき。当たった敵全てにダメージをあたえる。', enhance: '発射数+1 / クールタイム減少' },
    boomerang: { type: 'atk', name: 'ブーメラン', icon: 'item_boomerang', maxLvl: 10, desc: '投げると返ってくるこうげきを放つ。', enhance: '発射数追加 / ダメージ量増加' },
    iceblust: { type: 'atk', name: 'アイスブラスト', icon: 'item_iceblust', maxLvl: 10, desc: '周囲に氷のエリアを展開し、敵をこおらせる。ダメージはぼほない。', enhance: '展開時間延長 / はんい拡大' },
    stonedust: { type: 'atk', name: 'ストーンダスト', icon: 'item_stonedust', maxLvl: 10, desc: 'たくさんの小石を放ち続けて、小さなダメージをあたえ続ける。', enhance: 'クールタイム短縮 / ダメージ量微増' },
    // Buff
    scroll: { type: 'buf', name: '巻物', icon: 'item_scroll', maxLvl: 5, desc: 'こうげきのクールタイムを短くする。', enhance: 'クールタイム追加短縮' },
    magnet: { type: 'buf', name: '磁石', icon: 'item_magnet', maxLvl: 5, desc: '落ちているアイテムを吸い寄せる。', enhance: '引き寄せはんい拡大' },
    magnifier: { type: 'buf', name: '拡大鏡', icon: 'item_magnifier', maxLvl: 5, desc: 'こうげきのはんいを拡げる。', enhance: 'サイズさらに拡大' },
    shield: { type: 'buf', name: 'シールド', icon: 'item_shield', maxLvl: 5, desc: '敵からうけるダメージを低減させる。', enhance: '防御力+2' },
    boots: { type: 'buf', name: 'ブーツ', icon: 'item_boots', maxLvl: 5, desc: 'このゲーム中に限り、すばやさが一時的に上がる。', enhance: 'すばやささらに上昇' },
    regeneration: { type: 'buf', name: 'リジェネレーション', icon: 'item_regene', maxLvl: 5, desc: 'レベルアップ時に、最大HPの割合に応じて回復する。', enhance: '回復量+3%' },
    magic_barrier: { type: 'buf', name: 'マジックバリア', icon: 'item_barrier', maxLvl: 5, desc: '敵が放つショットを1発だけ無力化するバリアを張る。時間が経つとバリアは復活する', enhance: 'クールタイム短縮' }
};

const SPAWN_TABLE = [
    { minTime: 0, maxTime: 120, interval: 2.0, enemies: [ 
        { type: 'snakey', scale: 0.8, weight: 10, formProb: 0.0, singleCount: 1 } 
    ] },
    { minTime: 120, maxTime: 300, interval: 1.5, enemies: [ 
        { type: 'snakey', scale: 0.8, weight: 10, formProb: 0.1, formType: 'circle', formCount: 10, singleCount: 2 },
        { type: 'bat', scale: 0.8, weight: 5, formProb: 0, singleCount: 1 } 
    ] },
    { minTime: 300, maxTime: 420, interval: 1.2, enemies: [
        { type: 'snakey', scale: 1.2, weight: 10, formProb: 0.15, formType: 'lines', formCount: 10, singleCount: 3 },
        { type: 'bat', scale: 0.8, weight: 5, formProb: 0.1, formType: 'group', formCount: 5, singleCount: 2 },
        { type: 'medusa', scale: 0.8, weight: 5, formProb: 0, singleCount: 2 }
    ] },
    { minTime: 420, maxTime: 540, interval: 1.0, enemies: [
        { type: 'snakey', scale: 1.2, weight: 10, formProb: 0.1, formType: 'circle', formCount: 15, singleCount: 3 },
        { type: 'bat', scale: 0.8, weight: 5, formProb: 0.1, formType: 'group', formCount: 8, singleCount: 3 },
        { type: 'medusa', scale: 1.2, weight: 5, formProb: 0.1, formType: 'lines', formCount: 10, singleCount: 2 },
        { type: 'knight', scale: 0.8, weight: 5, formProb: 0, singleCount: 2 }
    ] },
    { minTime: 540, maxTime: 600, interval: 0.8, enemies: [
        { type: 'snakey', scale: 3.2, weight: 5, formProb: 0, singleCount: 1 }, 
        { type: 'bat', scale: 1.2, weight: 8, formProb: 0.1, formType: 'group', formCount: 10, singleCount: 4 },
        { type: 'ghost', scale: 0.8, weight: 5, formProb: 0, singleCount: 1 },
        { type: 'medusa', scale: 1.2, weight: 10, formProb: 0.1, formType: 'circle', formCount: 15, singleCount: 3 },
        { type: 'knight', scale: 1.2, weight: 15, formProb: 0.1, formType: 'lines', formCount: 10, singleCount: 2 },
        { type: 'gol', scale: 0.8, weight: 10, formProb: 0, singleCount: 1 },
        { type: 'shooter_lily', scale: 0.8, weight: 1, formProb: 0, singleCount: 1 }
    ] },
    { minTime: 600, maxTime: 840, interval: 0.8, enemies: [
        { type: 'ghost', scale: 0.8, weight: 10, formProb: 0, singleCount: 1 },
        { type: 'medusa', scale: 1.2, weight: 10, formProb: 0.1, formType: 'circle', formCount: 15, singleCount: 3 },
        { type: 'knight', scale: 1.2, weight: 15, formProb: 0.1, formType: 'lines', formCount: 10, singleCount: 2 },
        { type: 'gol', scale: 0.8, weight: 10, formProb: 0, singleCount: 2 },
        { type: 'shooter_lily', scale: 0.8, weight: 3, formProb: 0, singleCount: 2 }, 
        { type: 'moving_statue', scale: 0.8, weight: 1, formProb: 0, singleCount: 1 }
    ] },
    { minTime: 840, maxTime: 900, interval: 0.5, enemies: [
        { type: 'bat', scale: 3.2, weight: 5, formProb: 0, singleCount: 1 },
        { type: 'medusa', scale: 3.2, weight: 7, formProb: 0, singleCount: 1 },
        { type: 'knight', scale: 1.2, weight: 7, formProb: 0.1, formType: 'lines', formCount: 15, singleCount: 3 },
        { type: 'gol', scale: 1.2, weight: 7, formProb: 0.1, formType: 'group', formCount: 8, singleCount: 2 },
        { type: 'ghost', scale: 1.2, weight: 5, formProb: 0, singleCount: 3 },
        { type: 'shooter_lily', scale: 0.8, weight: 2, formProb: 0, singleCount: 2 },
        { type: 'wolf', scale: 0.8, weight: 3, formProb: 0, singleCount: 2 },
        { type: 'moving_statue', scale: 0.8, weight: 2, formProb: 0, singleCount: 1 } 
    ] },
    { minTime: 900, maxTime: 9999, interval: 0.5, enemies: [
        { type: 'bat', scale: 3.2, weight: 4, formProb: 0, singleCount: 1 },
        { type: 'medusa', scale: 3.2, weight: 5, formProb: 0, singleCount: 1 },
        { type: 'knight', scale: 3.2, weight: 7, formProb: 0, singleCount: 1 },
        { type: 'gol', scale: 3.2, weight: 7, formProb: 0, singleCount: 1 },
        { type: 'ghost', scale: 3.2, weight: 5, formProb: 0.5, formType: 'lines', formCount: 10, singleCount: 1 },
        { type: 'shooter_lily', scale: 1.2, weight: 2, formProb: 0, singleCount: 1 },
        { type: 'wolf', scale: 0.8, weight: 4, formProb: 0, singleCount: 3 },
        { type: 'moving_statue', scale: 1.2, weight: 1, formProb: 0, singleCount: 2 } 
    ] }
];

const REQUIRED_SPRITES = [
    'item_magic_bullet', 'item_sword', 'item_fireball', 'item_thunderbolt', 'item_poison_mist',
    'item_scroll', 'item_magnet', 'item_magnifier', 'item_bomb', 'item_axe', 'item_shield',
    'exp', 'exp_m', 'exp_l', 'exp_xl', 'item_boots', 'item_cross', 'item_coin_bag',
    'item_regene', 'item_barrier', 'attract_ball', 'status_healplus', 'status_lune', 'status_reroll', 'status_exroll'
];
const _dirs = ['down', 'left', 'right', 'up'];
['bomb', 'week'].forEach(h => _dirs.forEach(d => [1,2].forEach(n => REQUIRED_SPRITES.push(`hero_${h}_${d}_${n}`))));

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
            let parsed = JSON.parse(data);
            SAVE_DATA = Object.assign({ 
                coins: 0, hpLvl: 0, luckLvl: 0, atkLvl: 0, defLvl: 0, spdLvl: 0, 
                wizUnlocked: false, bombUnlocked: false, boomerangUnlocked: false, iceblustUnlocked: false, stonedustUnlocked: false,
                regeneUnlocked: false, barrierUnlocked: false, healPlusLvl: 0, reviveLuneUnlocked: false, rerollLvl: 0, exrollLvl: 0,
                bomberUnlocked: false, villagerUnlocked: false,
                clearedChars: [], clearedEquips: []
            }, parsed);
            if (SAVE_DATA.wizUnlocked) {
                let wiz = CHARACTERS.find(c => c.id === 'wiz');
                if (wiz) wiz.unlocked = true;
            }
            if (SAVE_DATA.bomberUnlocked) {
                let bomber = CHARACTERS.find(c => c.id === 'bomber');
                if (bomber) bomber.unlocked = true;
            }
            if (SAVE_DATA.villagerUnlocked) {
                let villager = CHARACTERS.find(c => c.id === 'villager');
                if (villager) villager.unlocked = true;
            }
            if (SAVE_DATA.clearedChars) {
                // Do not mutate CHARACTERS array here
            }
            if (SAVE_DATA.clearedEquips) {
                // Do not mutate EQUIP_DATA array here
            }
        } catch(e) {}
    }
}
function saveGameData() { localStorage.setItem('vansav_save', JSON.stringify(SAVE_DATA)); }

// --- Classes ---
class Player {
    constructor(id, charData, x, y) {
        this.id = id;
        this.charData = charData;
        this.name = charData.name;
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 32;
        this.maxHp = charData.hp + (SAVE_DATA.hpLvl * 10);
        this.hp = this.maxHp;
        this.baseAtk = charData.atk + (SAVE_DATA.atkLvl * 2);
        this.baseDef = charData.def + (SAVE_DATA.defLvl * 1);
        this.baseSpd = charData.spd + (SAVE_DATA.spdLvl * 10);
        this.baseLuck = charData.luck + SAVE_DATA.luckLvl;
        let parts = charData.sprite.split('_');
        this.spriteNameBase = parts[0] + '_' + parts[1];
        this.dir = 'down';
        this.angle = Math.PI/2;
        
        this.exp = 0;
        this.level = 1;
        this.maxExp = 10;
        this.equips = []; // { id: 'magic_bullet', lvl: 1 }
        
        this.invincibleTimer = 0;
        this.dead = false;
        
        this.totalDmgDealt = 0;
        this.totalDmgTaken = 0;
        this.totalKills = 0;
        
        this.barrierTimer = 0;
        this.hasBarrier = false;
        this.barrierRot1 = 0;
        this.barrierRot2 = 0;
        
        this.rerollCount = SAVE_DATA.rerollLvl || 0;
        this.revived = false;
        
        // Internal weapon timers
        this.weaponTimers = {};
    }
    get spd() { 
        let boots = this.equips.find(e => e.id === 'boots');
        return this.baseSpd + (boots ? boots.lvl * 20 : 0);
    }
    get atk() { return this.baseAtk; }
    get def() {
        let shield = this.equips.find(e => e.id === 'shield');
        return this.baseDef + (shield ? shield.lvl * 2 : 0);
    }
    get maxAtkSlots() { return GAME.is2P ? 2 : 4; }
    get maxBufSlots() { return GAME.is2P ? 1 : 2; }
}

class Enemy {
    constructor(x, y, type, forcedScale = null) {
        this.x = x; this.y = y; this.w = 32; this.h = 32;
        this.type = type;
        this.dead = false;
        
        let hpMultiplier = GAME.is2P ? 1.05 : 1.0;
        this.ignoreWalls = false;
        this.isBoss = false;
        this.scale = 0.8; // Small by default
        
        // Base stats
        if (type === 'snakey') { this.hp = 20; this.spd = 40; this.atk = 20; this.expDrop = 2; this.sprite = 'snakey_left'; }
        else if (type === 'medusa') { this.hp = 100; this.spd = 30; this.atk = 25; this.def = 2; this.expDrop = 5; this.sprite = 'medusa_awake'; this.ignoreWalls = false; }
        else if (type === 'gol') { this.hp = 75; this.spd = 40; this.atk = 40; this.def = 0; this.expDrop = 12; this.sprite = 'gol_down_awake'; }
        else if (type === 'don_medusa_1') { this.hp = 1000; this.spd = 25; this.atk = 30; this.def = 2; this.expDrop = 100; this.sprite = 'don_medosa_1'; this.isBoss = true; this.scale = 1.0; }
        else if (type === 'don_medusa_2') { this.hp = 3000; this.spd = 35; this.atk = 60; this.def = 3; this.expDrop = 1000; this.sprite = 'don_medosa_1'; this.isBoss = true; this.scale = 1.5; }
        else if (type === 'don_medusa_3') { this.hp = 8000; this.spd = 45; this.atk = 80; this.def = 5; this.expDrop = 5000; this.sprite = 'don_medosa_1'; this.isBoss = true; this.scale = 4.0; }
        else if (type === 'bat') { this.hp = 10; this.spd = 65; this.atk = 20; this.expDrop = 3; this.sprite = 'bat'; }
        else if (type === 'knight') { this.hp = 180; this.spd = 15; this.atk = 35; this.def = 3; this.expDrop = 15; this.sprite = 'knight'; }
        else if (type === 'ghost') { this.hp = 25; this.spd = 110; this.atk = 30; this.expDrop = 8; this.sprite = 'ghost'; this.ignoreWalls = true; }
        else if (type === 'item_box') { this.hp = 1; this.spd = 0; this.atk = 0; this.expDrop = 0; this.sprite = 'itembox'; this.isItemBox = true; }
        else if (type === 'moving_statue') { this.hp = 500; this.spd = 25; this.atk = 40; this.def = 5; this.expDrop = 100; this.sprite = 'moving_statue'; }
        else if (type === 'shooter_lily') { this.hp = 50; this.spd = 10; this.atk = 50; this.expDrop = 60; this.sprite = 'shooter_lily'; this.isShooter = true; this.attackTimer = 7.0; }
        else if (type === 'wolf') { this.hp = 110; this.spd = 120; this.atk = 40; this.def = 1; this.expDrop = 90; this.sprite = 'wolf'; this.isWolf = true; this.wolfState = 'arc'; this.wolfTimer = 2.0; this.wolfArcDir = Math.random()>0.5?1:-1; this.ignoreWalls = true; }
        else { this.hp = 20; this.spd = 40; this.atk = 20; this.expDrop = 2; this.sprite = 'snakey_left'; }
        
        // Size variations are now passed via constructor
        if (!this.isBoss && forcedScale === null) {
            this.scale = 0.8;
        } else if (forcedScale !== null) {
            this.scale = forcedScale;
            this.hp *= (this.scale / 0.8);
            this.atk *= (this.scale / 0.8);
            this.expDrop = Math.ceil(this.expDrop * (this.scale / 0.8));
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
        let dragging = false;
        
        const getIdx = () => {
            let base = parseInt(pad.getAttribute('data-player'));
            if (base === 0 && GAME.is2P) return GAME.gamepad1P ? 1 : 0;
            return base;
        };

        const updateStick = (ev) => {
            let pIdx = getIdx();
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
            let stick = pad.querySelector('.vstick');
            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            INPUTS[pIdx].vx = dx / maxDist;
            INPUTS[pIdx].vy = dy / maxDist;
        };
        
        const resetStick = () => {
            let pIdx = getIdx();
            let stick = pad.querySelector('.vstick');
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
            let pIdx = padCount;
            if (GAME.is2P) {
                if (padCount === 0) pIdx = GAME.gamepad1P ? 0 : 1;
                else continue;
            }
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
        if (!GAME.is2P) {
            document.getElementById('vpad-1p').style.display = padCount >= 1 ? 'none' : 'block';
            document.getElementById('vpad-2p').style.display = 'none';
        } else {
            document.getElementById('vpad-1p').style.display = 'block';
            document.getElementById('vpad-2p').style.display = 'none';
        }
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
        if(GAME.mode !== 'pause') INPUTS = [{vx:0,vy:0},{vx:0,vy:0}]; // Don't reset inputs if unpausing? Actually just reset them to be safe
        INPUTS = [{vx:0,vy:0},{vx:0,vy:0}];
    } else if (mode === 'pause') {
        document.getElementById('hud').style.display = 'block';
        document.getElementById('screen-pause').style.display = 'flex';
    } else if (mode === 'levelup') {
        document.getElementById('screen-levelup').style.display = 'flex';
    } else if (mode === 'chest') {
        document.getElementById('screen-chest').style.display = 'flex';
    } else if (mode === 'result') {
        document.getElementById('screen-result').style.display = 'flex';
        let resultTitle = document.getElementById('result-title');
        if (resultTitle) {
            if (GAME.isCleared) {
                resultTitle.innerText = "Complete";
                resultTitle.style.color = "gold";
            } else {
                resultTitle.innerText = "GAME OVER";
                resultTitle.style.color = "red";
            }
        }
        document.getElementById('result-time').innerText = Math.floor(GAME.time/60) + "分 " + Math.floor(GAME.time%60) + "秒";
        document.getElementById('result-coins').innerText = GAME.coinsThisRun;
        document.getElementById('result-dmg-dealt').innerText = GAME.players[0].totalDmgDealt;
        document.getElementById('result-dmg-taken').innerText = GAME.players[0].totalDmgTaken;
        document.getElementById('result-kills').innerText = GAME.players[0].totalKills;
        
        let equipBox = document.getElementById('result-equips');
        if (equipBox) {
            equipBox.innerHTML = '';
            GAME.players[0].equips.forEach(eq => {
                let div = document.createElement('div');
                let d = EQUIP_DATA[eq.id];
                div.style.textAlign = 'center';
                div.innerHTML = `<canvas width="32" height="32" style="border:1px solid #fff;"></canvas><br><span style="font-size:12px;">Lv.${eq.lvl}</span>`;
                if (PRE_RENDERED[d.icon]) {
                    let ctx = div.querySelector('canvas').getContext('2d');
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(PRE_RENDERED[d.icon], 0, 0, 32, 32);
                }
                equipBox.appendChild(div);
            });
        }
        
        SAVE_DATA.coins += GAME.coinsThisRun;
        saveGameData();
    }
}

function setupUIEvents() {
    document.getElementById('btn-start-1p').addEventListener('click', () => { GAME.is2P = false; GAME.p1SelectedChar = null; setMode('char_select'); });
    document.getElementById('btn-start-2p').addEventListener('click', () => { 
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        let padCount = 0;
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i] && gamepads[i].connected) padCount++;
        }
        if (padCount === 0) {
            alert('2人で遊ぶときはゲームパッドの接続が必要です。');
            return;
        }
        GAME.is2P = true; 
        GAME.p1SelectedChar = null; 
        GAME.p2SelectedChar = null; 
        GAME.gamepad1P = true;
        setMode('char_select'); 
    });
    document.getElementById('btn-shop').addEventListener('click', () => setMode('shop'));
    
    document.getElementById('btn-shop-back').addEventListener('click', () => setMode('title'));
    document.getElementById('btn-char-back').addEventListener('click', () => setMode('title'));
    document.getElementById('btn-result-back').addEventListener('click', () => setMode('title'));
    
    document.getElementById('btn-char-decide').addEventListener('click', () => {
        if (!GAME.p1SelectedChar) return;
        if (GAME.is2P && GAME.p1SelectedChar && !GAME.p2SelectedChar) {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            let padCount = 0;
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i] && gamepads[i].connected) padCount++;
            }
            if (padCount >= 1) {
                GAME.gamepad1P = confirm('1Pをゲームパッドで操作しますか？');
            }
            document.getElementById('char-select-title').innerText = "キャラクターセレクト (2P)";
            updateCharacterList();
            document.getElementById('btn-char-decide').classList.add('disabled');
        } else {
            startGame();
        }
    });
    
    document.getElementById('btn-pause').addEventListener('click', (e) => {
        if (GAME.mode === 'game') {
            setMode('pause');
            e.stopPropagation();
        }
    });
    document.getElementById('screen-pause').addEventListener('click', () => {
        if (GAME.mode === 'pause') setMode('game');
    });
    document.getElementById('btn-pause-back').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('タイトル画面に戻ります。よろしいですか？※ゲーム中に獲得したコインは失われます。')) {
            setMode('title');
        }
    });
}

function buildShopUI() {
    document.getElementById('shop-coins').innerText = SAVE_DATA.coins;
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    const prices = [100, 500, 1000, 2000, 4000];
    
    const addItem = (title, icon, lvl, maxLvl, desc, condition, action, fixedCost = null, customPrices = null) => {
        let div = document.createElement('div'); div.className = 'popup-item';
        let cost;
        if (fixedCost !== null && lvl === 'unlock') cost = condition ? '解放済' : fixedCost;
        else if (customPrices) cost = lvl < maxLvl ? customPrices[lvl] : 'MAX';
        else cost = lvl < maxLvl ? prices[lvl] : (lvl==='unlock'? (condition? '解放済':1000) : 'MAX');
        
        div.innerHTML = `<div class="popup-icon"><canvas></canvas></div><div class="popup-desc"><b>${title}</b><br>${desc}<br>価格: ${cost}</div>`;
        if (PRE_RENDERED[icon]) {
            let cvs = div.querySelector('canvas');
            cvs.width = 48; cvs.height = 48;
            cvs.getContext('2d').drawImage(PRE_RENDERED[icon], 0, 0, 48, 48);
        }
        div.addEventListener('click', () => {
            if (lvl < maxLvl && cost !== 'MAX' && SAVE_DATA.coins >= cost) { SAVE_DATA.coins -= cost; action(); buildShopUI(); }
            else if (lvl === 'unlock' && !condition && SAVE_DATA.coins >= cost) { SAVE_DATA.coins -= cost; action(); buildShopUI(); }
        });
        list.appendChild(div);
    };
    
    addItem('HPアップ', 'heart_normal', SAVE_DATA.hpLvl, 5, `(Lv.${SAVE_DATA.hpLvl}/5) HP+10`, false, () => { SAVE_DATA.hpLvl++; saveGameData(); });
    addItem('うんのよさアップ', 'status_lukup', SAVE_DATA.luckLvl, 5, `(Lv.${SAVE_DATA.luckLvl}/5) うんのよさ+1`, false, () => { SAVE_DATA.luckLvl++; saveGameData(); });
    addItem('こうげきアップ', 'status_atkup', SAVE_DATA.atkLvl, 5, `(Lv.${SAVE_DATA.atkLvl}/5) こうげき+2`, false, () => { SAVE_DATA.atkLvl++; saveGameData(); });
    addItem('ぼうぎょアップ', 'status_defup', SAVE_DATA.defLvl, 5, `(Lv.${SAVE_DATA.defLvl}/5) ぼうぎょ+1`, false, () => { SAVE_DATA.defLvl++; saveGameData(); });
    addItem('すばやさアップ', 'status_spdup', SAVE_DATA.spdLvl, 5, `(Lv.${SAVE_DATA.spdLvl}/5) すばやさ+10`, false, () => { SAVE_DATA.spdLvl++; saveGameData(); });
    addItem('回復量アップ', 'status_healplus', SAVE_DATA.healPlusLvl, 5, `(Lv.${SAVE_DATA.healPlusLvl}/5) 回復量+3%`, false, () => { SAVE_DATA.healPlusLvl++; saveGameData(); }, null, [100, 400, 1000, 2500, 5000]);
    addItem('エクストラロール', 'status_exroll', SAVE_DATA.exrollLvl, 5, `(Lv.${SAVE_DATA.exrollLvl}/5) レベルアップ時、アップグレード候補が3つになる確率+10%`, false, () => { SAVE_DATA.exrollLvl++; saveGameData(); }, null, [500, 1500, 2500, 3500, 4500]);
    addItem('リロール', 'status_reroll', SAVE_DATA.rerollLvl, 3, `(Lv.${SAVE_DATA.rerollLvl}/3) リロール回数+1`, false, () => { SAVE_DATA.rerollLvl++; saveGameData(); }, null, [3000, 6000, 9000]);
    
    addItem('そせいのルーン', 'status_lune', 'unlock', 1, `HP0時に1度だけ復活。`, SAVE_DATA.reviveLuneUnlocked, () => { SAVE_DATA.reviveLuneUnlocked = true; saveGameData(); }, 5000);
    addItem('キャラ: ウィッチ', 'hero_wiz_left_1', 'unlock', 1, `まほうつかいの女の子。`, SAVE_DATA.wizUnlocked, () => { SAVE_DATA.wizUnlocked = true; CHARACTERS.find(c => c.id === 'wiz').unlocked = true; saveGameData(); }, 1);
    if (SAVE_DATA.clearedChars && SAVE_DATA.clearedChars.length > 0) {
        addItem('キャラ: ボンバーマン', 'hero_bomb_down_1', 'unlock', 1, `ばくだん男。こうげきアイテムの装備数が多いかわりに、こうげき以外のアイテムが1つしか装備できない。`, SAVE_DATA.bomberUnlocked, () => { SAVE_DATA.bomberUnlocked = true; CHARACTERS.find(c => c.id === 'bomber').unlocked = true; saveGameData(); }, 100);
    }
    if (SAVE_DATA.clearedChars && ['knight', 'wiz', 'bomber'].every(id => SAVE_DATA.clearedChars.includes(id))) {
        addItem('キャラ: むらむすめ', 'hero_week_down_1', 'unlock', 1, `か弱い女の子。アイテム所持数が少ない代わりに、うんのよさが極めて高い`, SAVE_DATA.villagerUnlocked, () => { SAVE_DATA.villagerUnlocked = true; CHARACTERS.find(c => c.id === 'villager').unlocked = true; saveGameData(); }, 100);
    }
    addItem('装備解放: ボム', 'item_bomb', 'unlock', 1, `ボムが登場するようになる`, SAVE_DATA.bombUnlocked, () => { SAVE_DATA.bombUnlocked = true; saveGameData(); }, 300);
    addItem('装備解放: ブーメラン', 'item_boomerang', 'unlock', 1, `ブーメランが登場するようになる`, SAVE_DATA.boomerangUnlocked, () => { SAVE_DATA.boomerangUnlocked = true; saveGameData(); }, 500);
    addItem('装備解放: リジェネレーション', 'item_regene', 'unlock', 1, `リジェネレーションが登場するようになる`, SAVE_DATA.regeneUnlocked, () => { SAVE_DATA.regeneUnlocked = true; saveGameData(); }, 600);
    addItem('装備解放: マジックバリア', 'item_barrier', 'unlock', 1, `マジックバリアが登場するようになる`, SAVE_DATA.barrierUnlocked, () => { SAVE_DATA.barrierUnlocked = true; saveGameData(); }, 600);
    addItem('装備解放: アイスブラスト', 'item_iceblust', 'unlock', 1, `アイスブラストが登場するようになる`, SAVE_DATA.iceblustUnlocked, () => { SAVE_DATA.iceblustUnlocked = true; saveGameData(); }, 1000);
    addItem('装備解放: ストーンダスト', 'item_stonedust', 'unlock', 1, `ストーンダストを登場するようになる`, SAVE_DATA.stonedustUnlocked, () => { SAVE_DATA.stonedustUnlocked = true; saveGameData(); }, 1500);
    
    let btnResetUnlock = document.createElement('div'); btnResetUnlock.className = 'btn'; btnResetUnlock.innerText = 'データリセット';
    btnResetUnlock.style.marginTop = '20px';
    btnResetUnlock.onclick = () => { 
        if (confirm('本当にリセットしても良いですか？y/n')) {
            SAVE_DATA = { 
                coins: 0, hpLvl: 0, luckLvl: 0, atkLvl: 0, defLvl: 0, spdLvl: 0, 
                wizUnlocked: false, bombUnlocked: false, boomerangUnlocked: false, iceblustUnlocked: false, stonedustUnlocked: false,
                regeneUnlocked: false, barrierUnlocked: false, healPlusLvl: 0, reviveLuneUnlocked: false, rerollLvl: 0, exrollLvl: 0
            }; 
            CHARACTERS.find(c => c.id === 'wiz').unlocked = false; 
            CHARACTERS.find(c => c.id === 'bomber').unlocked = false; 
            CHARACTERS.find(c => c.id === 'villager').unlocked = false; 
            saveGameData(); buildShopUI(); 
        }
    };
    list.appendChild(btnResetUnlock);
}

function buildCharSelectUI() {
    document.getElementById('char-select-title').innerText = "キャラクターセレクト (1P)";
    updateCharacterList();
}

function updateCharacterList() {
    document.getElementById('btn-char-decide').classList.add('disabled');
    const list = document.getElementById('char-list');
    list.innerHTML = '';
    CHARACTERS.forEach(char => {
        let card = document.createElement('div'); card.className = 'char-card';
        if (!char.unlocked) card.classList.add('locked');
        let dispName = char.name;
        if (SAVE_DATA && SAVE_DATA.clearedChars && SAVE_DATA.clearedChars.includes(char.id)) dispName += '＊';
        card.innerHTML = `<div><canvas></canvas></div><div class="char-stats"><b>${dispName}</b><br>${char.desc}<br>HP:${char.hp} こ:${char.atk} ぼ:${char.def} す:${char.spd} う:${char.luck}</div>`;
        if (PRE_RENDERED[char.sprite]) {
            let cvs = card.querySelector('canvas');
            cvs.width = 48; cvs.height = 48;
            cvs.getContext('2d').drawImage(PRE_RENDERED[char.sprite], 0, 0, 48, 48);
        }
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
    GAME.itemBoxTimer = 120;
    GAME.bossSpawned = [false, false, false];
    GAME.treasureSpawned = [false, false, false, false];
    GAME.coinsThisRun = 0;
    GAME.isCleared = false;
    GAME.bgFeatures = [];
    
    // Generate Random Map Features
    for(let i=0; i<300; i++) {
        let typeRand = Math.random();
        let type = 'flower_1';
        if (typeRand > 0.95) type = 'tree';
        else if (typeRand > 0.9) type = 'wall_1';
        else if (typeRand > 0.45) type = 'flower_2';
        let bx = Math.random() * 3800 - 1900;
        let by = Math.random() * 3800 - 1900;
        let solid = (type === 'tree' || type === 'wall_1');
        if (solid && Math.abs(bx - 20) < 150 && Math.abs(by) < 150) continue;
        GAME.bgFeatures.push({ type: type, x: bx, y: by, solid: solid });
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
    p1.equips.push({ id: GAME.p1SelectedChar.initialEquip, lvl: 1 }); // Starter weapon
    GAME.players.push(p1);
    
    if (GAME.is2P && GAME.p2SelectedChar) {
        let p2 = new Player(1, GAME.p2SelectedChar, 40, 0);
        p2.equips.push({ id: GAME.p2SelectedChar.initialEquip, lvl: 1 });
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
    if (GAME.reviveTimer > 0) {
        GAME.reviveTimer -= dt;
        if (GAME.reviveTarget && Math.random() < 0.3) {
            GAME.particles.push({x: GAME.reviveTarget.x + (Math.random()-0.5)*30, y: GAME.reviveTarget.y + (Math.random()-0.5)*30, type: 'sparkle', life: 0.5, radius: 3});
        }
        if (GAME.reviveTimer <= 0 && GAME.reviveTarget) {
            let p = GAME.reviveTarget;
            let healBonus = SAVE_DATA.healPlusLvl * 0.03;
            p.hp = Math.floor(p.maxHp * (0.5 + healBonus));
            p.invincibleTimer = 3.0;
            if(audioSE) audioSE.playSE("heal");
            GAME.particles.push({x: p.x, y: p.y, type:'heal', life:1});
            GAME.flashTimer = 0.4; // Screen flash at end
            GAME.reviveTarget = null;
        }
        return;
    }
    
    GAME.time += dt;
    GAME.frameCount++;
    
    if (GAME.time >= MAX_TIME) {
        let isCleared = GAME.bossSpawned[0] && GAME.bossSpawned[1] && GAME.bossSpawned[2] && 
                        !GAME.enemies.some(e => e.type.startsWith('don_medusa_'));
        GAME.isCleared = isCleared;
        if (isCleared) {
            GAME.players.forEach(p => {
                let charId = p.charData.id;
                let cData = CHARACTERS.find(c => c.id === charId);
                if (cData) {
                    if (!SAVE_DATA.clearedChars) SAVE_DATA.clearedChars = [];
                    if (!SAVE_DATA.clearedChars.includes(charId)) SAVE_DATA.clearedChars.push(charId);
                }
                
                if (!SAVE_DATA.clearedEquips) SAVE_DATA.clearedEquips = [];
                p.equips.forEach(eq => {
                    let maxLvl = EQUIP_DATA[eq.id].maxLvl;
                    if (eq.lvl >= maxLvl) {
                        let eData = EQUIP_DATA[eq.id];
                        if (eData) {
                            if (!SAVE_DATA.clearedEquips.includes(eq.id)) SAVE_DATA.clearedEquips.push(eq.id);
                        }
                    }
                });
            });
            saveGameData();
        }
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
        
        let bEquip = p.equips.find(e => e.id === 'magic_barrier');
        if (bEquip) {
            if (p.barrierRot1 === undefined) { p.barrierRot1 = 0; p.barrierRot2 = 0; }
            if (!p.hasBarrier && p.barrierTimer <= 0) p.hasBarrier = true;
            if (p.barrierTimer > 0) {
                p.barrierTimer -= dt;
                if (p.barrierTimer <= 0) p.hasBarrier = true;
            }
            p.barrierRot1 += dt * 2;
            p.barrierRot2 -= dt * 2;
        } else {
            p.hasBarrier = false;
        }
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
            
            if (dist < magnetRange || itm.pulledByAttract) {
                itm.pulled = true;
                let speed = itm.pulledByAttract ? 600 : 300;
                let ang = Math.atan2(p.y - itm.y, p.x - itm.x);
                itm.x += Math.cos(ang) * speed * dt;
                itm.y += Math.sin(ang) * speed * dt;
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
    
    if (GAME.flashTimer > 0) {
        GAME.flashTimer -= dt;
    }
    
    // Spawning Logic
    GAME.spawnTimer -= dt;
    if (GAME.spawnTimer <= 0) {
        spawnEnemies();
        GAME.spawnTimer = Math.max(0.5, 2 - (GAME.time / 600)); // Gets faster over time
    }
    
    // Midbosses and Treasure Monsters
    let mins = GAME.time / 60;
    if (mins >= 5 && !GAME.bossSpawned[0]) { spawnMidBoss(1); GAME.bossSpawned[0] = true; }
    if (mins >= 10 && !GAME.bossSpawned[1]) { spawnMidBoss(2); GAME.bossSpawned[1] = true; }
    if (mins >= 15 && !GAME.bossSpawned[2]) { spawnMidBoss(3); GAME.bossSpawned[2] = true; }
    
    if (mins >= 4 && !GAME.treasureSpawned[0]) { spawnTreasureEnemy(1); GAME.treasureSpawned[0] = true; }
    if (mins >= 8 && !GAME.treasureSpawned[1]) { spawnTreasureEnemy(2); GAME.treasureSpawned[1] = true; }
    if (mins >= 12 && !GAME.treasureSpawned[2]) { spawnTreasureEnemy(3); GAME.treasureSpawned[2] = true; }
    if (mins >= 16 && !GAME.treasureSpawned[3]) { spawnTreasureEnemy(4); GAME.treasureSpawned[3] = true; }
    
    GAME.itemBoxTimer -= dt;
    if (GAME.itemBoxTimer <= 0) {
        GAME.itemBoxTimer = 120;
        let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
        if (p) {
            let ang = Math.random() * Math.PI * 2;
            spawnSingleEnemy(p.x + Math.cos(ang)*300, p.y + Math.sin(ang)*300, 'item_box', 1.0);
        }
    }
    
    // Enemies Update
    GAME.enemies.forEach(e => {
        if (e.dead) return;
        
        if (e.bombInvincible > 0) e.bombInvincible -= dt;
        
        if (e.fbTimers) {
            for(let key in e.fbTimers) {
                if (e.fbTimers[key] > 0) e.fbTimers[key] -= dt;
            }
        }
        if (e.boomInvincibles) {
            for(let key in e.boomInvincibles) {
                if(e.boomInvincibles[key]>0) e.boomInvincibles[key]-=dt;
            }
        }
        if (e.axeInvincibles) {
            for(let key in e.axeInvincibles) {
                if(e.axeInvincibles[key]>0) e.axeInvincibles[key]-=dt;
            }
        }
        
        if (e.frozenTimer > 0) {
            e.frozenTimer -= dt;
            return;
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
            if (e.isTreasure) {
                e.treasureTimer -= dt;
                if (e.treasureTimer <= 0) {
                    if (!e.escaping) {
                        e.escaping = true;
                        e.spd *= 4;
                        e.escapeAng = Math.atan2(e.y - targetP.y, e.x - targetP.x); // away from player
                    }
                    e.ignoreWalls = true;
                }
                if (e.escaping) {
                    ang = e.escapeAng;
                    if (minDist > 1000) { e.dead = true; e.hp = 0; }
                }
                if (Math.random() < 0.2) GAME.particles.push({x: e.x + (Math.random()-0.5)*32, y: e.y + (Math.random()-0.5)*32, type:'sparkle', life: 0.3, size: 2});
            }
            
            let nextX, nextY;
            if (e.isItemBox) {
                nextX = e.x; nextY = e.y;
            } else if (e.isWolf) {
                e.wolfTimer -= dt;
                if (e.wolfState === 'arc') {
                    let arcAng = ang + (Math.PI/2) * e.wolfArcDir;
                    nextX = e.x + Math.cos(arcAng) * e.spd * dt;
                    nextY = e.y + Math.sin(arcAng) * e.spd * dt;
                    if (e.wolfTimer <= 0) {
                        e.wolfState = 'dash';
                        e.wolfTimer = 1.0;
                        e.dashAng = ang; // Lock angle
                    }
                } else if (e.wolfState === 'dash') {
                    nextX = e.x + Math.cos(e.dashAng) * (e.spd * 2.5) * dt;
                    nextY = e.y + Math.sin(e.dashAng) * (e.spd * 2.5) * dt;
                    if (e.wolfTimer <= 0) {
                        e.wolfState = 'arc';
                        e.wolfTimer = 2.0;
                        e.wolfArcDir = Math.random()>0.5?1:-1;
                    }
                }
            } else {
                nextX = e.x + Math.cos(ang) * e.spd * dt;
                nextY = e.y + Math.sin(ang) * e.spd * dt;
            }
            
            if (e.ignoreWalls) {
                e.x = nextX; e.y = nextY;
            } else {
                if (!checkWallCollision(nextX, e.y, 14)) e.x = nextX;
                if (!checkWallCollision(e.x, nextY, 14)) e.y = nextY;
            }
            
            if (e.isBoss || e.isShooter) {
                e.attackTimer -= dt;
                if (e.attackTimer <= 0) {
                    e.attackTimer = e.isShooter ? 7.0 : 1.5;
                    GAME.projectiles.push({
                        x: e.x, y: e.y, vx: Math.cos(ang)*(e.isShooter?200:150), vy: Math.sin(ang)*(e.isShooter?200:150),
                        life: 4, size: e.isShooter?8:12, dmg: e.atk, pierce: false, type: 'enemy_shot'
                    });
                }
            }
            
            // Player collision
            if (minDist < 20 && targetP.invincibleTimer <= 0) {
                let dmg = Math.ceil(Math.max(1, e.atk - targetP.baseDef));
                targetP.hp -= dmg;
                targetP.totalDmgTaken += dmg;
                targetP.invincibleTimer = 0.5;
                addDamageText(targetP.x, targetP.y - 20, `-${dmg}`, '#ff0000');
                if(audioSE) audioSE.playSE("damage");
                if (targetP.hp <= 0) {
                    let healBonus = SAVE_DATA.healPlusLvl * 0.03;
                    if (SAVE_DATA.reviveLuneUnlocked && !targetP.revived) {
                        targetP.revived = true;
                        targetP.hp = 1; // Keep alive during animation
                        GAME.reviveTimer = 3.5;
                        GAME.reviveTarget = targetP;
                    } else {
                        targetP.hp = 0; targetP.dead = true;
                    }
                }
            }
        }
    });
    
    // Projectiles Update
    GAME.projectiles.forEach(proj => {
        if (proj.dead) return;
        proj.life -= dt;
        
        if (proj.type === 'bomb' && proj.life <= 0) {
            GAME.particles.push({x: proj.x, y: proj.y, type:'bomb_blast', life:0.5, radius: proj.blastRadius});
            GAME.enemies.forEach(e => {
                if(e.dead) return;
                if (e.bombInvincible > 0) return;
                if (Math.hypot(e.x - proj.x, e.y - proj.y) < proj.blastRadius) {
                    let dmg = Math.ceil(Math.max(1, proj.dmg - (e.def || 0)));
                    e.hp -= dmg;
                    e.bombInvincible = 0.3;
                    addDamageText(e.x, e.y - 20, `${dmg}`, '#ffffff');
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
        } else if (proj.type === 'boomerang') {
            proj.rot = (proj.rot || 0) + 15 * dt;
            proj.vx += proj.ax * dt;
            proj.vy += proj.ay * dt;
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
        } else {
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
        }
        
        if (proj.type === 'enemy_shot') {
            GAME.players.forEach(p => {
                if (p.dead || proj.dead || p.invincibleTimer > 0) return;
                let d = Math.hypot(p.x - proj.x, p.y - proj.y);
                if (d < (proj.size + p.w/2)) {
                    if (p.hasBarrier) {
                        p.hasBarrier = false;
                        let barrierLvl = (p.equips.find(e=>e.id==='magic_barrier')||{lvl:1}).lvl;
                        p.barrierTimer = 100 - (barrierLvl - 1) * 15;
                        proj.dead = true;
                        if(audioSE) audioSE.playSE("guard"); // placeholder
                        return;
                    }
                    let dmg = Math.ceil(Math.max(1, proj.dmg - p.baseDef));
                    p.hp -= dmg;
                    p.totalDmgTaken += dmg;
                    p.invincibleTimer = 0.5;
                    addDamageText(p.x, p.y - 20, `-${dmg}`, '#ff0000');
                    if(audioSE) audioSE.playSE("damage");
                    if (p.hp <= 0) {
                        let healBonus = SAVE_DATA.healPlusLvl * 0.03;
                        if (SAVE_DATA.reviveLuneUnlocked && !p.revived) {
                            p.revived = true;
                            p.hp = 1;
                            GAME.reviveTimer = 3.5;
                            GAME.reviveTarget = p;
                        } else {
                            p.hp = 0; p.dead = true;
                        }
                    }
                    if (!proj.pierce) proj.dead = true;
                }
            });
        } else {
            // Hit detection
            GAME.enemies.forEach(e => {
                if (e.dead || proj.dead) return;
                if (proj.type === 'bomb') return; // no damage before explosion
                
                if (proj.type === 'fireball') {
                    if (!e.fbTimers) e.fbTimers = {};
                    if (e.fbTimers[proj.projId] > 0) return;
                }
                if (proj.type === 'boomerang') {
                    if (!e.boomInvincibles) e.boomInvincibles = {};
                    if (e.boomInvincibles[proj.projId] > 0) return;
                }
                if (proj.type === 'axe') {
                    if (!e.axeInvincibles) e.axeInvincibles = {};
                    if (e.axeInvincibles[proj.projId] > 0) return;
                }
                
                let hitRange = proj.size + e.w/2;
                if (proj.type === 'sword') hitRange += 30; // extend sword forward
                
                let d = Math.hypot(e.x - proj.x, e.y - proj.y);
                if (d < hitRange) {
                    let dmg = Math.ceil(Math.max(1, proj.dmg - (e.def || 0)));
                    e.hp -= dmg;
                    if (proj.owner) proj.owner.totalDmgDealt += dmg;
                    else GAME.players[0].totalDmgDealt += dmg;
                    
                    addDamageText(e.x, e.y - 20, `${dmg}`, '#ffffff');
                    if (e.hp <= 0) {
                        e.dead = true;
                        if (proj.owner) proj.owner.totalKills++;
                        else GAME.players[0].totalKills++;
                        dropItem(e);
                    }
                    if (proj.type === 'fireball') {
                        e.fbTimers[proj.projId] = 0.5;
                    }
                    if (proj.type === 'boomerang') {
                        e.boomInvincibles[proj.projId] = 0.8;
                    }
                    if (proj.type === 'axe') {
                        e.axeInvincibles[proj.projId] = 0.7;
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
                        let dmg = Math.ceil(Math.max(1, pt.dmg - (e.def || 0)));
                        e.hp -= dmg;
                        if (pt.owner) pt.owner.totalDmgDealt += dmg;
                        else GAME.players[0].totalDmgDealt += dmg;
                        addDamageText(e.x, e.y - 20, `${dmg}`, '#cc00ff');
                        if (e.hp <= 0) { 
                            e.dead = true; 
                            if (pt.owner) pt.owner.totalKills++;
                            else GAME.players[0].totalKills++;
                            dropItem(e); 
                        }
                    }
                    e.x -= Math.cos(Math.atan2(e.y - pt.y, e.x - pt.x)) * e.spd * 0.5 * dt; // Simple slow by pushing back
                }
            });
        } else if (pt.type === 'iceblust') {
            pt.x = pt.owner.x; pt.y = pt.owner.y; // Follow player
            GAME.enemies.forEach(e => {
                if (e.dead) return;
                if (Math.hypot(e.x - pt.x, e.y - pt.y) < pt.radius) {
                    if (GAME.frameCount % 10 === 0) {
                        let dmg = Math.ceil(Math.max(1, pt.dmg - (e.def || 0)));
                        e.hp -= dmg;
                        addDamageText(e.x, e.y - 20, `${dmg}`, '#00ffff');
                        if (e.hp <= 0) { e.dead = true; dropItem(e); }
                    }
                    e.frozenTimer = pt.freezeTime;
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
        p.weaponTimers[eq.id] = Math.max(0.5, 2.0 - eq.lvl * 0.1) * cdReducer;
        // Target nearest enemy
        let targetE = null, minDist = Infinity;
        GAME.enemies.forEach(e => {
            if (e.dead || e.frozenTimer > 0) return;
            let d = Math.hypot(e.x - p.x, e.y - p.y);
            if (d < minDist) { minDist = d; targetE = e; }
        });
        
        let count = Math.min(3, Math.ceil(eq.lvl / 3));
        for(let i=0; i<count; i++) {
            let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
            if (targetE) ang = Math.atan2(targetE.y - p.y, targetE.x - p.x);
            ang += (i - (count-1)/2) * 0.2;
            GAME.projectiles.push({
                x: p.x, y: p.y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200,
                life: 2, size: 5 * sizeMul, dmg: p.atk + eq.lvl*2 + eq.lvl, pierce: false, type: 'bullet'
            });
        }
        if(audioSE) audioSE.playSE("shot");
    }
    else if (eq.id === 'sword') {
        p.weaponTimers[eq.id] = 1.5 * cdReducer;
        let slashes = eq.lvl >= 10 ? 3 : eq.lvl >= 5 ? 2 : 1;
        for(let i=0; i<slashes; i++) {
            setTimeout(() => {
                if (p.dead) return;
                let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
                let range = 60 * sizeMul + eq.lvl * 5;
                let arc = Math.PI/2 + (eq.lvl * 0.1);
                GAME.enemies.forEach(e => {
                    if (e.dead) return;
                    let d = Math.hypot(e.x - p.x, e.y - p.y);
                    if (d < range + 30) {
                        let ea = Math.atan2(e.y - p.y, e.x - p.x);
                        let diff = Math.abs(ea - ang);
                        if (diff > Math.PI) diff = Math.PI*2 - diff;
                        if (diff <= arc/2) {
                            let dmg = Math.ceil(Math.max(1, p.atk + eq.lvl * 7 + eq.lvl - (e.def || 0)));
                            e.hp -= dmg;
                            p.totalDmgDealt += dmg;
                            addDamageText(e.x, e.y - 20, `${dmg}`, '#ffffff');
                            if (e.hp <= 0) { e.dead = true; p.totalKills++; dropItem(e); }
                        }
                    }
                });
                if(audioSE) audioSE.playSE("shot"); // placeholder se
                // Visual effect
                GAME.particles.push({x: p.x, y: p.y, type:'slash', ang, range, arc, life:0.2});
            }, i * 200);
        }
    }
    else if (eq.id === 'fireball') {
        p.weaponTimers[eq.id] = 5.5 * cdReducer;
        let fbCounts = [1,1,2,2,3,3,4,4,5,5];
        let count = fbCounts[Math.min(eq.lvl-1, 9)] || 5;
        let speed = 1.5 + eq.lvl * 0.15;
        for(let i=0; i<count; i++) {
            GAME.projectiles.push({
                owner: p, rotAngle: (i/count) * Math.PI*2, orbitDist: 56 + sizeMul*30,
                x: p.x, y: p.y, vx: 0, vy: 0,
                life: 3, size: 11.25 * sizeMul, dmg: ((p.atk*2) + eq.lvl)/2, pierce: true, type: 'fireball', projId: Math.random()
            });
        }
    }
    else if (eq.id === 'bomb') {
        p.weaponTimers[eq.id] = Math.max(1.5, 4.0 - eq.lvl * 0.2) * cdReducer;
        let count = 1 + Math.floor((eq.lvl - 1) / 2);
        if (count > 5) count = 5;
        let baseAng = (p.angle !== undefined) ? p.angle : Math.PI/2;
        let step = Math.PI * 2 / count;
        
        for (let i = 0; i < count; i++) {
            let ang = baseAng + i * step;
            let bx = p.x + Math.cos(ang) * 60;
            let by = p.y + Math.sin(ang) * 60;
            GAME.projectiles.push({
                x: bx, y: by, vx: 0, vy: 0,
                life: Math.max(0.5, 1.0 - eq.lvl * 0.05), size: 16, dmg: p.atk * 2 + eq.lvl * 5, pierce: true, type: 'bomb',
                blastRadius: 50 * sizeMul
            });
        }
    }
    else if (eq.id === 'axe') {
        p.weaponTimers[eq.id] = Math.max(1.5, 3.5 - eq.lvl * 0.1) * cdReducer;
        let axCounts = [1,1,2,2,3,4,4,5,5,6];
        let count = axCounts[Math.min(eq.lvl-1, 9)] || 6;
        let baseAng = (p.angle !== undefined) ? p.angle : Math.PI/2;
        for(let i=0; i<count; i++) {
            if (!p.axeQueue) p.axeQueue = [];
            let ang = baseAng + (i%2===0?1:-1) * Math.ceil(i/2) * (Math.PI/6);
            p.axeQueue.push({ delay: i * 0.2, ang: ang, dmg: p.atk + eq.lvl * 4, projId: Math.random() });
        }
    }
    else if (eq.id === 'thunderbolt') {
        p.weaponTimers[eq.id] = Math.max(2.0, 5.0 - eq.lvl*0.2) * cdReducer;
        let count = 1;
        if (eq.lvl >= 4) count = 2;
        if (eq.lvl >= 8) count = 3;
        let cx = GAME.cameraX - SCREEN_W/2;
        let cy = GAME.cameraY - SCREEN_H/2;
        let onScreenEnemies = GAME.enemies.filter(e => 
            e.x > cx - 50 && e.x < cx + SCREEN_W + 50 &&
            e.y > cy - 50 && e.y < cy + SCREEN_H + 50
        );
        let candidateEnemies = onScreenEnemies.length > 0 ? onScreenEnemies : GAME.enemies;
        let targets = [...candidateEnemies].sort(()=>0.5-Math.random()).slice(0, count);
        targets.forEach(t => {
            let area = 50 * sizeMul;
            GAME.particles.push({x: t.x, y: t.y, type:'thunder', life:0.5, radius: area});
            GAME.enemies.forEach(e => {
                if(e.dead) return;
                if (Math.hypot(e.x - t.x, e.y - t.y) < area) {
                    let dmg = Math.ceil((p.atk * 1.5) + (eq.lvl * 4));
                    e.hp -= dmg;
                    p.totalDmgDealt += dmg;
                    addDamageText(e.x, e.y - 20, `${dmg}`, '#ffffff');
                    if (e.hp <= 0) { e.dead = true; p.totalKills++; dropItem(e); }
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
            ang += i * (25 * Math.PI / 180);
            let life = 1.0 + (eq.lvl - 1) * 0.1;
            setTimeout(() => {
                if (p.dead) return;
                GAME.particles.push({x: p.x + Math.cos(ang)*dist, y: p.y + Math.sin(ang)*dist, type:'poison', life: life, radius: 40 * sizeMul, dmg: p.atk*0.5 + eq.lvl, owner: p});
            }, i * 100);
        }
    }
    else if (eq.id === 'boomerang') {
        p.weaponTimers[eq.id] = 3.0 * cdReducer;
        let count = eq.lvl >= 10 ? 4 : 1 + Math.floor((eq.lvl - 1) / 3);
        let ang = (p.angle !== undefined) ? p.angle : Math.PI/2;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                if (p.dead) return;
                GAME.projectiles.push({
                    x: p.x, y: p.y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300,
                    ax: -Math.cos(ang) * 300, ay: -Math.sin(ang) * 300,
                    startX: p.x, startY: p.y, returning: false, projId: Math.random(),
                    life: 5, size: 16 * sizeMul, dmg: p.atk * 1.2 + eq.lvl * 2 + 7, pierce: true, type: 'boomerang'
                });
            }, i * 300);
        }
    }
    else if (eq.id === 'iceblust') {
        p.weaponTimers[eq.id] = 4.0 * cdReducer;
        let lvlIdx = Math.min(eq.lvl - 1, 9);
        let durations = [0.5, 0.8, 1, 1.2, 1.3, 1.5, 1.7, 1.8, 1.9, 2];
        let ranges = [1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.2, 3.5];
        let freezes = [1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5, 3, 3];
        
        GAME.particles.push({
            owner: p, x: p.x, y: p.y, type: 'iceblust', 
            life: durations[lvlIdx], radius: 32 * ranges[lvlIdx] * sizeMul, freezeTime: freezes[lvlIdx], dmg: 1
        });
    }
    else if (eq.id === 'stonedust') {
        p.weaponTimers[eq.id] = Math.max(0.15, 0.3 - (eq.lvl - 1) * 0.02) * cdReducer;
        let count = 1 + Math.floor((eq.lvl - 1) / 2);
        for(let i=0; i<count; i++) {
            let baseAng = (p.angle !== undefined) ? p.angle : Math.PI/2;
            let ang = baseAng + (Math.random() - 0.5) * (25 * Math.PI / 180);
            GAME.projectiles.push({
                x: p.x, y: p.y, vx: Math.cos(ang) * 400, vy: Math.sin(ang) * 400,
                life: 1.5, size: 4 * sizeMul, dmg: 2 + eq.lvl * 0.3, pierce: false, type: 'stonedust'
            });
        }
    }
}

function dropItem(e) {
    if (GAME.items.length >= MAX_DROPS) GAME.items.shift();
    
    let luck = Math.max(...GAME.players.filter(p=>!p.dead).map(p=>p.baseLuck));
    
    // Always drop EXP if expDrop > 0
    if (e.expDrop > 0) {
        GAME.items.push(new Drop(e.x, e.y, 'exp', e.expDrop));
    }

    if (e.isBoss) {
        GAME.items.push(new Drop(e.x, e.y, 'chest', 1));
        return;
    }
    if (e.isTreasure && !e.escaping) {
        GAME.items.push(new Drop(e.x, e.y, 'chest', 1));
        return;
    }
    if (e.isTreasure && e.escaping) {
        return;
    }

    if (e.isItemBox) {
        let r = Math.random() * 100;
        if (r < 80) GAME.items.push(new Drop(e.x, e.y, 'heart', 1));
        else if (r < 90) GAME.items.push(new Drop(e.x, e.y, 'coin_bag', (Math.floor(GAME.time/60)+1) * 5));
        else if (r < 95) GAME.items.push(new Drop(e.x, e.y, 'attract_ball', 1));
        else GAME.items.push(new Drop(e.x, e.y, 'cross', 1));
        return;
    }
    
    let prob = 0.1 + luck * 0.05;
    
    let rand = Math.random() * 100;
    if (rand < prob * 2) GAME.items.push(new Drop(e.x, e.y, 'heart', 1));
    else if (rand < prob * 3) GAME.items.push(new Drop(e.x, e.y, 'cross', 1));
    else if (rand < prob * 4) GAME.items.push(new Drop(e.x, e.y, 'attract_ball', 1));
    else if (rand < prob * 10) GAME.items.push(new Drop(e.x, e.y, 'coin_bag', (Math.floor(GAME.time/60)+1) * 5));
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
        let healBonus = SAVE_DATA.healPlusLvl * 0.03;
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * (0.2 + healBonus));
    } else if (itm.type === 'coin_bag') {
        GAME.coinsThisRun += itm.val * 2;
    } else if (itm.type === 'chest') {
        triggerChest();
    } else if (itm.type === 'cross') {
        GAME.flashTimer = 1.0;
        GAME.enemies.forEach(e => { if(!e.isBoss) { e.dead = true; dropItem(e); } });
    } else if (itm.type === 'attract_ball') {
        if(audioSE) audioSE.playSE("heal"); // Reused sound
        GAME.items.forEach(i => {
            if (i.type === 'exp') {
                i.pulledByAttract = true;
            }
        });
    }
}

function spawnEnemies() {
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if(p.dead) return;
    
    let currentPhase = SPAWN_TABLE.find(t => GAME.time >= t.minTime && GAME.time < t.maxTime) || SPAWN_TABLE[SPAWN_TABLE.length-1];
    GAME.spawnTimer = currentPhase.interval;
    
    let totalWeight = currentPhase.enemies.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * totalWeight;
    let selectedEnemy = null;
    for (let e of currentPhase.enemies) {
        if (r < e.weight) { selectedEnemy = e; break; }
        r -= e.weight;
    }
    if (!selectedEnemy) selectedEnemy = currentPhase.enemies[0];
    
    let dist = 400; // Outside screen
    
    if (Math.random() < selectedEnemy.formProb) {
        let count = selectedEnemy.formCount;
        let formType = selectedEnemy.formType || 'circle';
        
        if (formType === 'circle') {
            for(let i=0; i<count; i++) {
                let ang = (i/count) * Math.PI * 2;
                spawnSingleEnemy(p.x + Math.cos(ang)*dist, p.y + Math.sin(ang)*dist, selectedEnemy.type, selectedEnemy.scale);
            }
        } else if (formType === 'group') {
            let baseAng = Math.random() * Math.PI * 2;
            let cx = p.x + Math.cos(baseAng)*dist;
            let cy = p.y + Math.sin(baseAng)*dist;
            for(let i=0; i<count; i++) {
                let offX = (Math.random() - 0.5) * 100;
                let offY = (Math.random() - 0.5) * 100;
                spawnSingleEnemy(cx + offX, cy + offY, selectedEnemy.type, selectedEnemy.scale);
            }
        } else if (formType === 'lines') {
            // Two vertical lines on left and right of the player
            let countPerSide = Math.ceil(count / 2);
            for(let i=0; i<countPerSide; i++) {
                let yOff = (i - countPerSide/2) * 50;
                spawnSingleEnemy(p.x - dist, p.y + yOff, selectedEnemy.type, selectedEnemy.scale);
                spawnSingleEnemy(p.x + dist, p.y + yOff, selectedEnemy.type, selectedEnemy.scale);
            }
        }
    } else {
        let spawnCount = selectedEnemy.singleCount || 1;
        for(let i=0; i<spawnCount; i++) {
            let ex = 0, ey = 0;
            for(let tries = 0; tries < 10; tries++) {
                let ang = Math.random() * Math.PI * 2;
                ex = p.x + Math.cos(ang)*dist;
                ey = p.y + Math.sin(ang)*dist;
                if (!GAME.bgFeatures.some(bg => bg.solid && Math.abs(ex - bg.x) < 32 && Math.abs(ey - bg.y) < 32)) break;
            }
            spawnSingleEnemy(ex, ey, selectedEnemy.type, selectedEnemy.scale);
        }
    }
}

function spawnSingleEnemy(ex, ey, type, scale) {
    if (ex < GAME.stageBounds.minX) ex = GAME.stageBounds.minX;
    if (ex > GAME.stageBounds.maxX) ex = GAME.stageBounds.maxX;
    if (ey < GAME.stageBounds.minY) ey = GAME.stageBounds.minY;
    if (ey > GAME.stageBounds.maxY) ey = GAME.stageBounds.maxY;
    GAME.enemies.push(new Enemy(ex, ey, type, scale));
}

function spawnMidBoss(level) {
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if(p.dead) return;
    let ex = 0, ey = 0;
    for(let tries = 0; tries < 10; tries++) {
        let ang = Math.random() * Math.PI * 2;
        ex = p.x + Math.cos(ang)*400;
        ey = p.y + Math.sin(ang)*400;
        if (!GAME.bgFeatures.some(bg => bg.solid && Math.abs(ex - bg.x) < 48 && Math.abs(ey - bg.y) < 48)) break;
    }
    if (ex < GAME.stageBounds.minX) ex = GAME.stageBounds.minX;
    if (ex > GAME.stageBounds.maxX) ex = GAME.stageBounds.maxX;
    if (ey < GAME.stageBounds.minY) ey = GAME.stageBounds.minY;
    if (ey > GAME.stageBounds.maxY) ey = GAME.stageBounds.maxY;
    let e = new Enemy(ex, ey, 'don_medusa_' + level);
    if (level === 2 || level === 3) e.ignoreWalls = true;
    GAME.enemies.push(e);
}

function spawnTreasureEnemy(level) {
    let p = GAME.players[0]; if(p.dead && GAME.players[1]) p = GAME.players[1];
    if(p.dead) return;
    
    let table = SPAWN_TABLE.find(t => GAME.time >= t.minTime && GAME.time < t.maxTime);
    if (!table) table = SPAWN_TABLE[SPAWN_TABLE.length - 1];
    let type = table.enemies[Math.floor(Math.random() * table.enemies.length)].type;
    
    let ex = 0, ey = 0;
    for(let tries = 0; tries < 10; tries++) {
        ex = GAME.cameraX + (Math.random() > 0.5 ? SCREEN_W : -100);
        ey = GAME.cameraY + (Math.random() - 0.5) * SCREEN_H;
        if (!GAME.bgFeatures.some(bg => bg.solid && Math.abs(ex - bg.x) < 32 && Math.abs(ey - bg.y) < 32)) break;
    }
    
    let e = new Enemy(ex, ey, type);
    e.isTreasure = true;
    e.treasureLevel = level;
    e.hp += level * 240;
    e.maxHp = e.hp;
    e.def = (e.def || 0) + (level * 10);
    e.spd *= 0.5;
    e.scale *= 0.75;
    e.expDrop = 0;
    e.treasureTimer = 120; // 120 seconds
    GAME.enemies.push(e);
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
        let spr = 'exp';
        if (itm.type === 'heart') spr = 'heart_normal';
        else if (itm.type === 'coin_bag') spr = 'item_coin_bag';
        else if (itm.type === 'chest') spr = 'chest_closed';
        else if (itm.type === 'cross') spr = 'item_cross';
        else if (itm.type === 'attract_ball') spr = 'attract_ball';
        
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
            if (e.frozenTimer > 0) {
                ctx.save();
                ctx.translate(e.x, e.y);
                if (e.isTreasure) ctx.filter = 'grayscale(100%)';
                ctx.drawImage(PRE_RENDERED[e.sprite], 0, 0, 32, 32, -16*e.scale, -16*e.scale, 32*e.scale, 32*e.scale);
                ctx.filter = 'none';
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
                ctx.fillRect(-16*e.scale, -16*e.scale, 32*e.scale, 32*e.scale);
                ctx.globalCompositeOperation = 'source-over';
                // Additional icy particles
                if (Math.random() < 0.2) GAME.particles.push({x: e.x + (Math.random()-0.5)*32*e.scale, y: e.y + (Math.random()-0.5)*32*e.scale, type:'sparkle', life: 0.3, size: 2});
                ctx.restore();
            } else {
                ctx.save();
                if (e.isTreasure) ctx.filter = 'grayscale(100%)';
                ctx.drawImage(PRE_RENDERED[e.sprite], 0, 0, 32, 32, e.x - 16*e.scale, e.y - 16*e.scale, 32*e.scale, 32*e.scale);
                ctx.restore();
            }
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
        
        // Barrier Render
        if (pl.hasBarrier) {
            ctx.save();
            ctx.translate(pl.x, pl.y);
            let bSize = 25;
            let sides = 12;
            
            ctx.lineWidth = 1;
            
            // Red Dodecagon
            ctx.strokeStyle = 'red';
            ctx.beginPath();
            for(let i=0; i<=sides; i++) {
                let a = pl.barrierRot1 + (i * Math.PI * 2 / sides);
                let px = Math.cos(a) * bSize;
                let py = Math.sin(a) * bSize;
                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
            
            // Yellow Dodecagon
            ctx.strokeStyle = 'yellow';
            ctx.beginPath();
            for(let i=0; i<=sides; i++) {
                let a = pl.barrierRot2 + (i * Math.PI * 2 / sides);
                let px = Math.cos(a) * (bSize + 2);
                let py = Math.sin(a) * (bSize + 2);
                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
            
            // Particles/Glow
            if (Math.random() < 0.3) {
                let a = Math.random() * Math.PI * 2;
                GAME.particles.push({x: pl.x + Math.cos(a)*bSize, y: pl.y + Math.sin(a)*bSize, type:'sparkle', life: 0.2, size: 2, color: Math.random()>0.5?'red':'yellow'});
            }
            ctx.restore();
        }
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
            } else if (proj.type === 'axe' || proj.type === 'boomerang') {
                ctx.save(); ctx.translate(proj.x, proj.y); ctx.rotate(proj.rot);
                if (PRE_RENDERED['item_' + proj.type]) {
                    ctx.drawImage(PRE_RENDERED['item_' + proj.type], 0, 0, 32, 32, -16, -16, 32, 32);
                }
                ctx.restore();
            } else if (proj.type === 'bomb') {
                if (PRE_RENDERED['item_bomb']) ctx.drawImage(PRE_RENDERED['item_bomb'], 0, 0, 32, 32, proj.x - 16, proj.y - 16, 32, 32);
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
        } else if (pt.type === 'bomb_blast') {
            ctx.fillStyle = `rgba(255, 100, 0, ${pt.life * 2})`;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI*2); ctx.fill();
            for(let i=0; i<4; i++) {
                let bx = pt.x + Math.cos(i*Math.PI/2 + pt.life*10) * pt.radius;
                let by = pt.y + Math.sin(i*Math.PI/2 + pt.life*10) * pt.radius;
                ctx.beginPath(); ctx.arc(bx, by, pt.radius * 0.4, 0, Math.PI*2); ctx.fill();
            }
        } else if (pt.type === 'poison') {
            ctx.fillStyle = `rgba(200, 160, 255, ${pt.life > 1 ? 0.3 : pt.life * 0.3})`;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI*2); ctx.fill();
        } else if (pt.type === 'iceblust') {
            ctx.fillStyle = `rgba(100, 255, 255, ${pt.life > 0.5 ? 0.3 : pt.life * 0.6})`;
            ctx.beginPath();
            for(let i=0; i<6; i++) {
                let ang = i * Math.PI / 3 + GAME.time;
                let px = pt.x + Math.cos(ang) * pt.radius;
                let py = pt.y + Math.sin(ang) * pt.radius;
                if (i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.fill();
            if (Math.random() < 0.5) {
                let r = Math.random() * pt.radius;
                let a = Math.random() * Math.PI * 2;
                GAME.particles.push({x: pt.x + Math.cos(a)*r, y: pt.y + Math.sin(a)*r, type: 'sparkle', life: 0.3, size: 2});
            }
        } else if (pt.type === 'sparkle') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); ctx.fill();
        }
    });
    
    // Damage Texts
    ctx.font = '20px DonguriDuel';
    GAME.damageTexts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y - (1 - t.life) * 20);
    });
    
    ctx.restore();
    
    if (GAME.flashTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${GAME.flashTimer})`;
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }
    
    if (GAME.reviveTimer > 0) {
        let elapsed = 3.5 - GAME.reviveTimer;
        
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
        
        if (GAME.reviveTarget && elapsed > 0.5) {
            let p = GAME.reviveTarget;
            let cx = p.x - (GAME.cameraX - SCREEN_W/2);
            let cy = p.y - (GAME.cameraY - SCREEN_H/2);
            let beamElapsed = elapsed - 0.5;
            let beamHeight = Math.min(cy + 16, (beamElapsed / 3.0) * SCREEN_H);
            
            let grd = ctx.createLinearGradient(0, cy - beamHeight, 0, cy);
            grd.addColorStop(0, 'rgba(255, 255, 255, 0)');
            grd.addColorStop(0.5, 'rgba(255, 255, 150, 0.8)');
            grd.addColorStop(1, 'rgba(255, 255, 255, 1)');
            
            ctx.fillStyle = grd;
            ctx.fillRect(cx - 20, cy - beamHeight, 40, beamHeight);
        }
    }
}
function getEnhanceText(id, lvl) {
    if (lvl === 1) return '新しく取得する';
    const textMap = {
        'magic_bullet': [
            'クールタイム-0.1秒, ダメージ増加', 'クールタイム-0.1秒, ダメージ増加', 'ショット数 2発, クールタイム-0.1秒, ダメージ増加',
            'クールタイム-0.1秒, ダメージ増加', 'クールタイム-0.1秒, ダメージ増加', 'ショット数 3発, クールタイム-0.1秒, ダメージ増加',
            'クールタイム-0.1秒, ダメージ増加', 'クールタイム-0.1秒, ダメージ増加', 'クールタイム-0.1秒, ダメージ増加'
        ],
        'sword': [
            'こうげきはんい拡大, ダメージ大きく増加', 'こうげきはんい拡大, ダメージ大きく増加', 'こうげきはんい拡大, ダメージ大きく増加',
            '攻撃回数 2回, こうげきはんい拡大, ダメージ大きく増加', 'こうげきはんい拡大, ダメージ大きく増加', 'こうげきはんい拡大, ダメージ大きく増加',
            'こうげきはんい拡大, ダメージ大きく増加', 'こうげきはんい拡大, ダメージ大きく増加', '攻撃回数 3回, こうげきはんい拡大, ダメージ大きく増加'
        ],
        'fireball': [
            'ダメージ増加', 'こうげき数 2個, ダメージ増加', 'ダメージ増加',
            'こうげき数 3個, ダメージ増加', 'ダメージ増加', 'こうげき数 4個, ダメージ増加',
            'ダメージ増加', 'こうげき数 5個, ダメージ増加', 'ダメージ増加'
        ],
        'thunderbolt': [
            'クールタイム-0.2秒, ダメージ増加', 'クールタイム-0.2秒, ダメージ増加', 'こうげき数 2発, クールタイム-0.2秒, ダメージ増加',
            'クールタイム-0.2秒, ダメージ増加', 'クールタイム-0.2秒, ダメージ増加', 'クールタイム-0.2秒, ダメージ増加',
            'こうげき数 3発, クールタイム-0.2秒, ダメージ増加', 'クールタイム-0.2秒, ダメージ増加', 'クールタイム-0.2秒, ダメージ増加'
        ],
        'poison_mist': [
            'こうげき数 2個, 持続時間+0.1秒, ダメージ増加', '持続時間+0.1秒, ダメージ増加', 'こうげき数 3個, 持続時間+0.1秒, ダメージ増加',
            '持続時間+0.1秒, ダメージ増加', 'こうげき数 4個, 持続時間+0.1秒, ダメージ増加', '持続時間+0.1秒, ダメージ増加',
            'こうげき数 5個, 持続時間+0.1秒, ダメージ増加', '持続時間+0.1秒, ダメージ増加', 'こうげき数 6個, 持続時間+0.1秒, ダメージ増加'
        ],
        'bomb': [
            'クールタイム-0.2秒, バクハツ時間-0.05秒', '設置数 2個, クールタイム-0.2秒, バクハツ時間-0.05秒', 'クールタイム-0.2秒, バクハツ時間-0.05秒',
            '設置数 3個, クールタイム-0.2秒, バクハツ時間-0.05秒', 'クールタイム-0.2秒, バクハツ時間-0.05秒', '設置数 4個, クールタイム-0.2秒, バクハツ時間-0.05秒',
            'クールタイム-0.2秒, バクハツ時間-0.05秒', '設置数 5個, クールタイム-0.2秒, バクハツ時間-0.05秒', 'クールタイム-0.2秒, バクハツ時間-0.05秒'
        ],
        'axe': [
            'クールタイム-0.1秒', 'こうげき数 2発, クールタイム-0.1秒', 'クールタイム-0.1秒',
            'こうげき数 3発, クールタイム-0.1秒', 'こうげき数 4発, クールタイム-0.1秒', 'クールタイム-0.1秒',
            'こうげき数 5発, クールタイム-0.1秒', 'クールタイム-0.1秒', 'こうげき数 6発, クールタイム-0.1秒'
        ],
        'boomerang': [
            'クールタイム-0.15秒', 'クールタイム-0.15秒', '設置数 2発, クールタイム-0.15秒',
            'クールタイム-0.15秒', 'クールタイム-0.15秒', '設置数 3発, クールタイム-0.15秒',
            'クールタイム-0.15秒', 'クールタイム-0.15秒', '設置数 4発, クールタイム-0.15秒'
        ],
        'iceblust': [
            'こうげきはんい拡大, クールタイム-0.1秒', 'こうげきはんい拡大, クールタイム-0.1秒', 'こうげきはんい拡大, クールタイム-0.1秒',
            'こうげきはんい拡大, クールタイム-0.1秒', 'こうげきはんい拡大, クールタイム-0.1秒', 'こうげきはんい拡大, クールタイム-0.1秒',
            'こうげきはんい拡大, クールタイム-0.1秒', 'こうげきはんい拡大, クールタイム-0.1秒', 'こうげきはんい拡大, クールタイム-0.1秒'
        ],
        'stonedust': [
            'クールタイム-0.02秒', 'ショット数 4発, クールタイム-0.02秒', 'クールタイム-0.02秒',
            'ショット数 5発, クールタイム-0.02秒', 'クールタイム-0.02秒', 'ショット数 6発, クールタイム-0.02秒',
            'クールタイム-0.02秒', 'ショット数 7発, クールタイム-0.02秒', 'クールタイム-0.02秒'
        ],
        'scroll': [
            '武器のクールタイム10%短縮', '武器のクールタイム10%短縮', '武器のクールタイム10%短縮', '武器のクールタイム10%短縮'
        ],
        'magnet': [
            'アイテムのひきよせはんい+20', 'アイテムのひきよせはんい+20', 'アイテムのひきよせはんい+20', 'アイテムのひきよせはんい+20'
        ],
        'magnifier': [
            'こうげきはんい10%拡大', 'こうげきはんい10%拡大', 'こうげきはんい10%拡大', 'こうげきはんい10%拡大'
        ],
        'shield': [
            'ぼうぎょ+2', 'ぼうぎょ+2', 'ぼうぎょ+2', 'ぼうぎょ+2'
        ],
        'boots': [
            'すばやさ+10', 'すばやさ+10', 'すばやさ+10', 'すばやさ+10'
        ],
        'regeneration': [
            'レベルアップ時の回復量+最大HPの3%', 'レベルアップ時の回復量+最大HPの3%', 'レベルアップ時の回復量+最大HPの3%', 'レベルアップ時の回復量+最大HPの3%'
        ],
        'magic_barrier': [
            'バリア復活のクールタイム-15秒', 'バリア復活のクールタイム-15秒', 'バリア復活のクールタイム-15秒', 'バリア復活のクールタイム-15秒'
        ]
    };
    if (textMap[id] && textMap[id][lvl - 2]) {
        return textMap[id][lvl - 2];
    }
    return EQUIP_DATA[id] ? EQUIP_DATA[id].enhance : '強化！';
}

function triggerLevelUp(p, isReroll = false) {
    if (!isReroll) {
        if(audioSE) audioSE.playSE("get_egg");
        
        // Apply Regeneration
        if (p.equips.some(e=>e.id==='regeneration')) {
            let regeneLvl = p.equips.find(e=>e.id==='regeneration').lvl;
            let healPct = (regeneLvl * 0.03) + (SAVE_DATA.healPlusLvl * 0.03);
            p.hp = Math.min(p.maxHp, p.hp + p.maxHp * healPct);
            if(audioSE) audioSE.playSE("heal");
            GAME.particles.push({x: p.x, y: p.y, type:'heal', life:1});
        }
    }
    
    setMode('levelup');
    let title = document.getElementById('levelup-title');
    title.innerText = `レベルアップ！ (${p.id+1}P)`;
    
    let choicesBox = document.getElementById('levelup-choices');
    choicesBox.innerHTML = '';
    
    // Reroll UI
    let rerollContainer = document.getElementById('reroll-container');
    let rerollBtn = document.getElementById('btn-reroll');
    let rerollCount = document.getElementById('reroll-count');
    if (SAVE_DATA.rerollLvl > 0) {
        rerollContainer.style.display = 'flex';
        rerollCount.innerText = p.rerollCount;
        if (p.rerollCount > 0) {
            rerollBtn.className = 'btn';
            rerollBtn.onclick = () => {
                p.rerollCount--;
                triggerLevelUp(p, true);
            };
        } else {
            rerollBtn.className = 'btn disabled';
            rerollBtn.onclick = null;
        }
    } else {
        rerollContainer.style.display = 'none';
    }
    
    let available = [];
    for(let k in EQUIP_DATA) {
        let eq = EQUIP_DATA[k];
        if (k === 'bomb' && !SAVE_DATA.bombUnlocked) continue;
        if (k === 'boomerang' && !SAVE_DATA.boomerangUnlocked) continue;
        if (k === 'iceblust' && !SAVE_DATA.iceblustUnlocked) continue;
        if (k === 'stonedust' && !SAVE_DATA.stonedustUnlocked) continue;
        if (k === 'regeneration' && !SAVE_DATA.regeneUnlocked) continue;
        if (k === 'magic_barrier' && !SAVE_DATA.barrierUnlocked) continue;
        
        let has = p.equips.find(e => e.id === k);
        let currentLvl = has ? has.lvl : 0;
        if (currentLvl < eq.maxLvl) {
            let typeCount = p.equips.filter(e => EQUIP_DATA[e.id].type === eq.type).length;
            let maxAtk = p.charData.maxAtk || 4;
            let maxBuf = p.charData.maxBuf || 3;
            if (GAME.is2P) {
                maxAtk = Math.max(1, maxAtk - 1);
                maxBuf = Math.max(0, maxBuf - 1);
            }
            if (has || (eq.type === 'atk' && typeCount < maxAtk) || (eq.type === 'buf' && typeCount < maxBuf)) {
                available.push(k);
            }
        }
    }
    
    available.sort(() => Math.random() - 0.5);
    
    // Extra Roll logic
    let rollCount = 2;
    if (SAVE_DATA.exrollLvl > 0 && Math.random() < SAVE_DATA.exrollLvl * 0.1) {
        rollCount = 3;
    }
    let choices = available.slice(0, rollCount);
    
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
        div.style.width = 'auto';
        div.style.flex = '1';
        if (choices.length === 3) div.style.margin = '5px'; // Adjust for 3 choices
        let enhanceText = getEnhanceText(cid, nextLvl);
        let dispName = d.name;
        if (SAVE_DATA && SAVE_DATA.clearedEquips && SAVE_DATA.clearedEquips.includes(cid)) dispName += '＊';
        div.innerHTML = `<div class="popup-icon"><canvas></canvas></div><div class="popup-desc"><b>${dispName}</b> (Lv.${nextLvl})<br><span style="font-size:12px;">${d.desc}</span><br><span style="color:yellow; font-weight:bold; font-size:12px;">${enhanceText}</span></div>`;
        if (PRE_RENDERED[d.icon]) {
            let cvs = div.querySelector('canvas');
            cvs.width = 48; cvs.height = 48;
            let ctx = cvs.getContext('2d');
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(PRE_RENDERED[d.icon],0,0,48,48);
        }
        div.addEventListener('click', () => {
            if (has) has.lvl++; else p.equips.push({id: cid, lvl: 1});
            GAME.players.forEach(pl => { if (!pl.dead) pl.invincibleTimer = 1.0; });
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
        let availableKeys = p.equips.filter(e => e.lvl < EQUIP_DATA[e.id].maxLvl).map(e => e.id);
        
        if (availableKeys.length === 0) {
            // Already MAXed all equipped, fallback to random coin drop
            GAME.coinsThisRun += 100;
            chestItems.push({name: "コイン袋", desc: "100G獲得", icon: "item_coin_bag"});
            continue;
        }
        
        let cid = availableKeys[Math.floor(Math.random()*availableKeys.length)];
        let d = EQUIP_DATA[cid];
        let has = p.equips.find(e => e.id === cid);
        if (has && has.lvl < d.maxLvl) has.lvl++;
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
                let cvs = document.createElement('canvas'); cvs.width=48; cvs.height=48;
                if (PRE_RENDERED[d.icon]) cvs.getContext('2d').drawImage(PRE_RENDERED[d.icon],0,0,48,48);
                div.appendChild(cvs);
                itemsBox.appendChild(div);
            });
            document.getElementById('btn-chest-close').style.display = 'block';
            document.getElementById('btn-chest-close').onclick = () => { 
                GAME.players.forEach(p => { if (!p.dead) p.invincibleTimer = 1.0; });
                setMode('game'); 
                updateHUD(); 
            };
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
