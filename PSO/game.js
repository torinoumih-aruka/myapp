// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SCREEN_W = 640;
const SCREEN_H = 360;
let FPS = 60;

// Data
let MAP_DATA = { town: null };
const MAP_PATTERNS = {
    forest1: 1,
    forest2: 1
};
let PALETTE = {};
let SPRITES = {};
let PRE_RENDERED = {};

// Game State
let GAME = {
    mode: 'title', // title, town, map, gameover
    progress: 1, // Store progress (unlocks etc)
    shopItems: [], // Current items available in shop
    players: [],
    enemies: [],
    projectiles: [],
    particles: [],
    drops: [],
    grid: null,
    rooms: [],
    doors: [],
    switches: [],
    boxes: [],
    events: [],
    teleporters: [],
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
    swordman: { name: 'ソードマン', hp: 40, mp: 30, atk: 45, def: 17, spd: 100, dex: 68, mind: 29, luck: 10, sprite: 'hero_knight_down_1', type: 'melee', levelUp: { hp: 10, mp: 5, atk: 6, def: 1, dex: 1, mind: 1, luck: 0, spd: 0 } },
    ranger: { name: 'レンジャー', hp: 30, mp: 20, atk: 23, def: 13, spd: 100, dex: 72, mind: 20, luck: 10, sprite: 'hero_wiz_down_1', type: 'ranged', levelUp: { hp: 6, mp: 4, atk: 5, def: 1, dex: 2, mind: 2, luck: 0, spd: 0 } },
    sorcerer: { name: 'ソーサラー', hp: 30, mp: 80, atk: 16, def: 10, spd: 100, dex: 63, mind: 53, luck: 10, sprite: 'hero_week_down_1', type: 'magic', levelUp: { hp: 4, mp: 9, atk: 3, def: 1, dex: 1, mind: 3, luck: 0, spd: 0 } }
};

const WEAPON_TYPES = {
    handgun: {
        attackType: 'ranged',
        motions: [0, 0, 0], // No movement during combo
        targetType: 'single',
        targetNum: 1,
        shape: 'fan30', // changed from none
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
        ranges: [195, 195, 195], // 180 + 15
        icon: 'icon_weapon_gun',
        maxCombo: 3,
        timing: [1.2, 1.2],
        classMod: { swordman: 0.1, ranger: 0.0, sorcerer: 0.1 }
    },
    saber: {
        attackType: 'melee',
        motions: [2.5, 2.5, 4],
        targetType: 'scope',
        targetNum: 99,
        shape: 'circle1', // radius 1 -> 10px scaled
        ranges: [68, 63, 78], // Saber -25
        offsets: [{angle: -20, dist: 80}, {angle: 0, dist: 80}, {angle: 0, dist: 90}], // 1st front-left
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
        ranges: [64, 59, 125], // Dagger -25, -25, +15
        offsets: [{angle: 0, dist: 80}, {angle: 0, dist: 80}, {angle: 0, dist: 0}], // 3rd around player
        icon: 'icon_weapon_sword',
        maxCombo: 3,
        timing: [0.7, 0.7],
        classMod: { swordman: 0.0, ranger: 0.3, sorcerer: 0.3 }
    },
    cane: {
        attackType: 'melee',
        motions: [1.5, 1.5, 2.5],
        targetType: 'scope',
        targetNum: 99,
        shape: 'circle1',
        ranges: [69, 65, 72], // [84-15, 85-20, 97-25]
        offsets: [{angle: 0, dist: 70}, {angle: 0, dist: 70}, {angle: 0, dist: 75}],
        icon: 'icon_weapon_cane',
        maxCombo: 3,
        timing: [0.7, 0.7],
        classMod: { swordman: 0.4, ranger: 0.4, sorcerer: 0.0 }
    },
    slicer: {
        attackType: 'ranged',
        motions: [5, 5, 5],
        targetType: 'slicer',
        targetNum: 5,
        shape: 'fan30', // base shape for initial target
        icon: 'icon_weapon_slicer',
        maxCombo: 3,
        timing: [1.0, 1.0],
        classMod: { swordman: 0.0, ranger: 0.3, sorcerer: 0.3 }
    }
};

const BASE_WEAPONS = {
    'w_handgun': { name: 'ハンドガン', desc: '圧縮した光子を撃ちだす短銃。扱いやすい形状をしている', price: 100, baseRarity: 1, basePow: 30, baseDex: 26, maxEnhance: 3, range: 350, reqClass: null, reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'handgun' },
    'w_railgun': { name: 'レールガン', desc: '圧縮した光子を撃ちだす短銃。扱いやすい形状をしている', price: 500, baseRarity: 4, basePow: 65, baseDex: 29, maxEnhance: 3, range: 350, reqClass: null, reqPow: 0, reqDex: 53, reqMind: 0, weaponType: 'handgun' },
    'w_shotgun': { name: 'ショットガン', desc: '圧縮した光子を広範囲に発射する', price: 300, baseRarity: 2, basePow: 35, baseDex: 27, maxEnhance: 3, range: 180, reqClass: 'ranger', reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'shotgun' },
    'w_saber':   { name: 'セイバー', desc: '圧縮した光子で生成された剣。扱いやすい形状。', price: 100, baseRarity: 1, basePow: 55, baseDex: 30, maxEnhance: 3, range: 60, reqClass: null, reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'saber' },
    'w_buster':  { name: 'バスター', desc: '圧縮した光子で生成された剣。扱いやすい形状をしている', price: 500, baseRarity: 4, basePow: 100, baseDex: 33, maxEnhance: 3, range: 60, reqClass: null, reqPow: 100, reqDex: 0, reqMind: 0, weaponType: 'saber' },
    'w_dagger':  { name: 'ダガー', desc: '圧縮した光子で生成された短剣', price: 200, baseRarity: 2, basePow: 45, baseDex: 20, maxEnhance: 3, range: 50, reqClass: 'swordman', reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'dagger' },
    'w_cane':    { name: 'ケイン', desc: '光子を放出する杖。', price: 100, baseRarity: 1, basePow: 30, baseDex: 30, baseDef: 5, maxEnhance: 3, range: 40, reqClass: 'sorcerer', reqPow: 0, reqDex: 0, reqMind: 0, weaponType: 'cane' },
    'w_mace':    { name: 'メイス', desc: '青い光子を放出する杖。', price: 500, baseRarity: 4, basePow: 60, baseDex: 32, baseDef: 5, maxEnhance: 3, range: 40, reqClass: 'sorcerer', reqPow: 0, reqDex: 0, reqMind: 100, weaponType: 'cane' },
    'w_slicer':  { name: 'スライサー', desc: '圧縮した光子で生成された刃を放つ。', price: 400, baseRarity: 3, basePow: 15, baseDex: 20, maxEnhance: 3, range: 250, reqClass: null, reqPow: 70, reqDex: 0, reqMind: 0, weaponType: 'slicer' },
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

const ENCHANT_PRICES = {
    'heat': 100, 'fire': 400,
    'shock': 100, 'thunder': 400,
    'ice': 100, 'frost': 400,
    'panic': 100, 'riot': 400,
    'draw': 100, 'drain': 400
};

function getItemPrice(item) {
    if (!item) return 0;
    
    if (item.type === 'weapon') {
        if (item.isUnidentified) return 10;
        let baseDef = BASE_WEAPONS[item.id];
        let base = baseDef ? baseDef.price : 100;
        
        let enhanceBonus = item.enhance ? Math.floor(base * 0.1 * item.enhance) : 0;
        let enchantBonus = item.enchant ? (ENCHANT_PRICES[item.enchant] || 0) : 0;
        
        let attrBonus = 0;
        if (item.attrs) {
            let totalAttr = 0;
            for (let k in item.attrs) totalAttr += item.attrs[k];
            attrBonus = totalAttr * 5;
        }
        
        return base + enhanceBonus + enchantBonus + attrBonus;
    } else if (item.type === 'armor') {
        let base = 500; // Base armor price
        let statBonus = ((item.def || 0) + (item.dex || 0) + (item.atk || 0) + (item.mind || 0)) * 1;
        let slotBonus = item.slotCount ? Math.floor(base * 0.2 * item.slotCount) : 0;
        return base + statBonus + slotBonus;
    } else if (item.type === 'disk') {
        let base = 100;
        if (item.magic === 'gifoie') base = 200;
        else if (item.magic === 'rafoie') base = 300;
        return base + Math.floor(base * 0.5 * (item.lv || 1));
    } else if (item.type === 'unit') {
        let base = 1000;
        let enhanceBonus = item.enhance ? Math.floor(base * 0.1 * item.enhance) : 0;
        return base + enhanceBonus;
    } else if (item.type === 'item') {
        if (item.id === 'monomate') return 50;
        if (item.id === 'monofluid') return 100;
        return 100;
    }
    return 10;
}


function generateWeapon(baseId, forcedEnhance = 0, forcedEnchant = null, forcedAttrs = null) {
    let base = BASE_WEAPONS[baseId];
    if (!base) return null;
    let wType = WEAPON_TYPES[base.weaponType];
    
    // Random enhance 0-3 if not forced and is a dropped weapon
    if (forcedEnhance === 0 && Math.random() < 0.5) { // Assuming some chance to get enhanced drop
        forcedEnhance = Math.floor(Math.random() * 4); // 0, 1, 2, 3
    }
    
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
        attrs: forcedAttrs || { native: 0, mutant: 0, machine: 0, dark: 0, hit: 0 },
        isUnidentified: forcedEnchant !== null // If it drops with an enchant, it's unidentified initially
    };
    
    // Calculate final stats
    w.atk = w.basePow + w.enhance;
    w.dex = w.baseDex; // Hit attribute logic might apply here later
    w.def = w.baseDef;
    
    // Construct display name
    let prefix = w.enchant ? ENCHANTS.find(e => e.id === w.enchant).name + ' ' : '';
    let suffix = w.enhance > 0 ? ' +' + w.enhance : '';
    if (w.isUnidentified) {
        w.name = '？？？？' + w.baseName + suffix;
    } else {
        w.name = prefix + w.baseName + suffix;
    }
    
    return w;
}

function generateArmor(forceSlots = -1, forceExtra = -1) {
    let extra = forceExtra >= 0 ? forceExtra : Math.floor(Math.random() * 3); // 0, 1, 2
    let slots = forceSlots >= 0 ? forceSlots : Math.floor(Math.random() * 3); // 0, 1, 2
    let arr = []; for(let i=0; i<slots; i++) arr.push(null);
    let name = extra > 0 ? `アーマー+${extra}` : `アーマー`;
    return { uid: 'a_' + Date.now() + Math.floor(Math.random() * 1000), id: 'a_armor', name: name, type: 'armor', def: 10 + extra, slotCount: slots, slottedUnits: arr };
}

function generateShopLineup() {
    GAME.shopItems = [];
    
    // Guaranteed items
    GAME.shopItems.push({ uid: 'shop_' + Date.now() + '1', id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50 });
    GAME.shopItems.push({ uid: 'shop_' + Date.now() + '2', id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30 });
    
    let weapons = ['w_saber', 'w_handgun', 'w_cane'];
    let magics = [{id:'m_resta', name:'レスタ', m:'resta'}, {id:'m_fire', name:'ファイア', m:'fire'}, {id:'m_gifoie', name:'ギフォイエ', m:'gifoie'}, {id:'m_rafoie', name:'ラフォイエ', m:'rafoie'}];
    
    // 8 random items based on progress
    for (let i = 0; i < 8; i++) {
        let rand = Math.random();
        if (rand < 0.4) {
            // Weapon
            let wId = weapons[Math.floor(Math.random() * weapons.length)];
            let enchant = null;
            if (Math.random() < 0.5) enchant = ENCHANTS[Math.floor(Math.random() * 2)].id; // low rank
            if (enchant === 'heat') enchant = ['heat', 'shock', 'ice', 'panic', 'draw'][Math.floor(Math.random() * 5)];
            
            let attrs = null;
            if (Math.random() < 0.5) {
                let attrNames = ['native', 'mutant', 'machine', 'dark', 'hit'];
                attrs = {};
                attrs[attrNames[Math.floor(Math.random() * attrNames.length)]] = 5 + Math.floor(Math.random() * 2) * 5; // 5 or 10
            }
            
            let w = generateWeapon(wId, 0, enchant, attrs);
            if (w) {
                w.isUnidentified = false; // Shop weapons are always identified
                w.name = w.name.replace('？？？？', ''); // Remove unidentified prefix if any
                GAME.shopItems.push(w);
            }
        } else if (rand < 0.7) {
            // Armor
            GAME.shopItems.push(generateArmor());
        } else {
            // Disk (Lv 1-3)
            let chosen = magics[Math.floor(Math.random() * magics.length)];
            let lv = 1 + Math.floor(Math.random() * 3);
            GAME.shopItems.push({ uid: 'shop_' + Date.now() + '_' + i, id: chosen.id+'_'+lv, name: `${chosen.name}Lv${lv}ディスク`, type: 'disk', magic: chosen.m, lv: lv });
        }
    }
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
        
        this.dex = cdata.dex || 50;
        this.baseStats = {
            maxHp: cdata.hp,
            maxMp: cdata.mp,
            atk: cdata.atk,
            def: cdata.def,
            spd: cdata.spd,
            dex: cdata.dex || 50,
            mind: 40,
            luck: 10
        };
        
        this.exp = 0;
        this.nextExp = 50;
        this.coins = 0;
        this.targetDrop = null;
        
        this.equip = { armor: null };
        
        this.palette = [null, null, null, null, null, null];
        this.paletteIndex = 1; // 0=L, 1=ACT, 2=R
        this.coins = 500;
        this.magicCooldowns = { resta: 0, fire: 0, gifoie: 0, rafoie: 0 };
        this.magic = [];
        
        // Add requested default items
        if (this.classId === 'swordman') {
            this.inventory = [
                generateWeapon('w_saber'),
                { id: 'a_armor', name: 'アーマー', type: 'armor', def: 10, slotCount: 0, slottedUnits: [] },
                { id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50, stack: 5 },
                { id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30, stack: 3 }
            ];
        } else if (this.classId === 'ranger') {
            this.inventory = [
                generateWeapon('w_handgun'),
                { id: 'a_armor', name: 'アーマー', type: 'armor', def: 10, slotCount: 0, slottedUnits: [] },
                { id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50, stack: 5 },
                { id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30, stack: 3 }
            ];
        } else if (this.classId === 'sorcerer') {
            this.inventory = [
                generateWeapon('w_cane'),
                { id: 'a_armor', name: 'アーマー', type: 'armor', def: 10, slotCount: 0, slottedUnits: [] },
                { id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50, stack: 3 },
                { id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30, stack: 5 },
                { id: 'm_resta_1', name: 'レスタLv1ディスク', type: 'disk', magic: 'resta', lv: 1 },
                { id: 'm_fire_1', name: 'ファイアLv1ディスク', type: 'disk', magic: 'fire', lv: 1 }
            ];
        } else {
            this.inventory = [];
        }


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
        
        this.magicCooldown = 0;
        this.mainTarget = null;
        this.radius = 10;
        
        this.invincibleTimer = 0;

        // Default equip and palette setup
        this.palette[1] = this.inventory[0]; // Weapon (ACT)
        this.equip.armor = this.inventory[1]; // Armor
        this.palette[0] = this.inventory[2]; // Monomate (L)
        this.palette[2] = this.inventory[3]; // Monofluid (R)
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
        if (this.magicCooldowns) {
            for (let k in this.magicCooldowns) {
                if (this.magicCooldowns[k] > 0) this.magicCooldowns[k] -= dt;
            }
        }
        if (this.hp <= 0) {
           if (this.state === 'dead') return;
        }
        if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
        
        // Passive targeting
        let actItem = this.palette[this.paletteIndex];
        if (this.state !== 'attack' && actItem && (actItem.type === 'weapon' || actItem.type === 'disk' || actItem.type === 'magic')) {
            let pAngle = Math.atan2(this.dirY, this.dirX);
            let range = 150;
            let isCone = false;
            
            if (actItem.type === 'weapon') {
                let wType = WEAPON_TYPES[actItem.weaponType];
                if (wType) {
                    range = wType.range || actItem.range;
                    if (wType.shape === 'fan30' || wType.shape === 'fan45') isCone = true;
                }
            } else if (actItem.magic === 'fire' || actItem.magic === 'rafoie') {
                isCone = true;
                if (actItem.magic === 'rafoie') range = 150;
            }
            
            let inRangeEnemies = GAME.enemies.filter(e => e.hp>0 && e.roomId === this.roomId && Math.hypot(e.x-this.x, e.y-this.y)<=range);
            let inRangeBoxes = (GAME.boxes || []).filter(b => Math.hypot(b.x-this.x, b.y-this.y)<=range);
            let inRange = [...inRangeEnemies, ...inRangeBoxes];
            
            if (isCone) {
                let validTargets = inRange.filter(e => {
                    let diff = Math.abs(Math.atan2(e.y-this.y, e.x-this.x) - pAngle);
                    if(diff>Math.PI) diff = Math.PI*2-diff;
                    return diff<=(Math.PI/12); // strict angle like attack logic (30 degrees total)
                });
                validTargets.sort((a,b) => {
                    let aIsBox = !!(GAME.boxes && GAME.boxes.includes(a));
                    let bIsBox = !!(GAME.boxes && GAME.boxes.includes(b));
                    if (aIsBox !== bIsBox) return aIsBox ? 1 : -1;
                    
                    let diffA = Math.abs(Math.atan2(a.y-this.y, a.x-this.x) - pAngle);
                    if(diffA>Math.PI) diffA = Math.PI*2-diffA;
                    let diffB = Math.abs(Math.atan2(b.y-this.y, b.x-this.x) - pAngle);
                    if(diffB>Math.PI) diffB = Math.PI*2-diffB;
                    return diffA - diffB;
                });
                inRange = validTargets;
            } else {
                inRange.sort((a,b) => {
                    let aIsBox = !!(GAME.boxes && GAME.boxes.includes(a));
                    let bIsBox = !!(GAME.boxes && GAME.boxes.includes(b));
                    if (aIsBox !== bIsBox) return aIsBox ? 1 : -1;
                    return Math.hypot(a.x-this.x, a.y-this.y) - Math.hypot(b.x-this.x, b.y-this.y);
                });
            }
            
            let currentIsBox = !!(this.mainTarget && GAME.boxes && GAME.boxes.includes(this.mainTarget));
            if (!this.mainTarget || (!currentIsBox && this.mainTarget.hp <= 0) || !inRange.includes(this.mainTarget)) {
                this.mainTarget = inRange.length > 0 ? inRange[0] : null;
            }
        }

        
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
                    this.debugInfo.push(`Window: ${(targetTime - 0.05).toFixed(2)} - ${(targetTime + 0.25).toFixed(2)}`);
                    
                    if (this.comboTimer > targetTime + 0.25) {
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
            
            // Town wall collision
            if (GAME.mode === 'town' && MAP_DATA.town && MAP_DATA.town.walls) {
                MAP_DATA.town.walls.forEach(w => {
                    let closestX = Math.max(w.x, Math.min(this.x, w.x + w.width));
                    let closestY = Math.max(w.y, Math.min(this.y, w.y + w.height));
                    let dx = this.x - closestX;
                    let dy = this.y - closestY;
                    let dist = Math.hypot(dx, dy);
                    if (dist < this.radius) {
                        if (dist === 0) {
                            this.y -= this.radius; // push up if exactly inside
                        } else {
                            let push = this.radius - dist;
                            this.x += (dx / dist) * push;
                            this.y += (dy / dist) * push;
                        }
                    }
                });
            }
        }
    }

    draw(ctx) {
        if (this.state === 'dead') return;
        
        // Draw facing direction indicator
        let pAngle = Math.atan2(this.dirY, this.dirX);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(pAngle);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.beginPath();
        ctx.moveTo(this.radius + 15, 0); // pointing forward
        ctx.lineTo(this.radius + 5, -8);
        ctx.lineTo(this.radius + 5, 8);
        ctx.fill();
        ctx.restore();

        let dirStr = 'down';
        if (Math.abs(this.dirX) > Math.abs(this.dirY)) {
            dirStr = this.dirX > 0 ? 'right' : 'left';
        } else {
            if (this.dirY < 0) dirStr = 'up';
            else if (this.dirY > 0) dirStr = 'down';
        }
        
        let animStep = 1;
        if (this.vx !== 0 || this.vy !== 0) {
            animStep = Math.floor(performance.now() / 200) % 2 === 0 ? 1 : 2;
        }
        
        let baseSprite = 'hero_knight'; // Could depend on class in future
        if (this.classId === 'ranger') baseSprite = 'hero_wiz';
        if (this.classId === 'sorcerer') baseSprite = 'hero_week';
        
        let spriteName = `${baseSprite}_${dirStr}_${animStep}`;
        
        if (PRE_RENDERED[spriteName]) {
            ctx.drawImage(PRE_RENDERED[spriteName], this.x - 16, this.y - 16, 32, 32);
        } else {
            ctx.fillStyle = this.id === 0 ? 'blue' : 'green';
            ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
            
            // Draw Direction Indicator
            ctx.strokeStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.dirX * 20, this.y + this.dirY * 20);
            ctx.stroke();
        }

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
        
        // Draw target indicator if action is weapon or magic
        let actItem = this.palette[this.paletteIndex];
        let isBoxTarget = !!(this.mainTarget && GAME.boxes && GAME.boxes.includes(this.mainTarget));
        if (actItem && (actItem.type === 'weapon' || actItem.type === 'disk' || actItem.type === 'magic') && this.mainTarget && (this.mainTarget.hp > 0 || isBoxTarget)) {
            ctx.save();
            ctx.translate(this.mainTarget.x, this.mainTarget.y);
            // Rotate slowly
            ctx.rotate(performance.now() / 1000);
            ctx.strokeStyle = 'black';
            ctx.fillStyle = 'white';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate(i * Math.PI * 2 / 3); // 120 degrees
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(8, -35);
                ctx.lineTo(-8, -35);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }

        // Action Combo Timing UI
        if (this.state === 'attack' && this.comboCount > 0 && this.comboCount <= 2) {
            let action = this.palette[this.paletteIndex];
            if (action && action.weaponType) {
                let wType = WEAPON_TYPES[action.weaponType];
                if (this.comboCount < wType.maxCombo) {
                    let classMod = wType.classMod[this.classId] || 0;
                    let targetTime = wType.timing[this.comboCount - 1] + classMod;
                    let centerTime = targetTime + 0.10;
                    
                    if (this.comboTimer <= targetTime + 0.25) {
                        let diff = centerTime - this.comboTimer;
                        let ringRadius = 10 + Math.max(0, (diff / 0.15)) * 5; // Max 15px, shrinks to 10px
                        
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, ringRadius, 0, Math.PI * 2);
                        
                        // Check if in perfect timing window (e.g. within 0.03s of center)
                        let isJust = Math.abs(this.comboTimer - centerTime) <= 0.03;
                        
                        if (isJust) {
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 2;
                            ctx.shadowBlur = 10;
                            ctx.shadowColor = '#fff';
                        } else {
                            ctx.strokeStyle = (this.comboCount === 1) ? '#888' : '#ccc';
                            ctx.lineWidth = 1;
                            ctx.shadowBlur = 0;
                        }
                        
                        ctx.stroke();
                        ctx.shadowBlur = 0; // reset
                    }
                }
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

        // Pickup drop
        if (this.targetDrop) {
            let drop = this.targetDrop.item;
            if (drop.type === 'coin') {
                this.coins += drop.amount;
                addFloatingText(this.x, this.y - 20, `${drop.amount} コイン`, 'yellow');
                GAME.drops = GAME.drops.filter(d => d !== this.targetDrop);
                this.targetDrop = null;
                return;
            } else {
                let isStackable = (drop.id === 'i_monomate' || drop.id === 'i_monofluid');
                if (isStackable) {
                    let existing = this.inventory.find(i => i.id === drop.id);
                    if (existing && existing.stack < 10) {
                        existing.stack++;
                        addFloatingText(this.x, this.y - 20, `${drop.name} を拾った`, 'green');
                        GAME.drops = GAME.drops.filter(d => d !== this.targetDrop);
                        this.targetDrop = null;
                        return;
                    } else if (existing && existing.stack >= 10) {
                        addFloatingText(this.x, this.y - 20, `これ以上持てません`, 'red');
                        return;
                    }
                }
                
                if (this.inventory.length < 20) {
                    if (isStackable && !drop.stack) drop.stack = 1;
                    this.inventory.push(drop);
                    addFloatingText(this.x, this.y - 20, `${drop.name} を拾った`, 'green');
                    GAME.drops = GAME.drops.filter(d => d !== this.targetDrop);
                    this.targetDrop = null;
                    return;
                } else {
                    addFloatingText(this.x, this.y - 20, `インベントリが一杯です`, 'red');
                    return;
                }
            }
        }

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
                    openAppraiserModal(this);
                } else if (closestNPC.type === 'shop') {
                    openShopModal(this);
                } else if (closestNPC.type === 'teleporter') {
                    if (confirm('ステージ1へ転送しますか？')) {
                        GAME.mode = 'map';
                        let n = Math.floor(Math.random() * MAP_PATTERNS.forest1) + 1;
                        loadAreaFromFile(`forest1_${n}.json`);
                    }
                }
                return;
            }
        }

        if (GAME.mode === 'map' && GAME.currentMapPattern) {
            let start = GAME.currentMapPattern.start;
            let dist = Math.hypot(start.x * 50 + 25 - this.x, start.y * 50 + 25 - this.y);
            if (dist < 40) {
                if (confirm('タウンに戻りますか？')) {
                    GAME.mode = 'town';
                    generateShopLineup();
                    this.x = MAP_DATA.town.start.x;
                    this.y = MAP_DATA.town.start.y;
                    GAME.eventFlags = {}; // Reset event flags
                }
                return;
            }
            
            // Check Action events
            if (GAME.events) {
                let triggeredEvent = false;
                GAME.events.forEach(ev => {
                    if (ev.type === 'action') {
                        let dx = Math.abs(this.x - (ev.x * 50 + 25));
                        let dy = Math.abs(this.y - (ev.y * 50 + 25));
                        if (dx < 30 && dy < 30) {
                            alert(ev.message);
                            triggeredEvent = true;
                        }
                    }
                });
                if (triggeredEvent) return; // skip attack
            }
            
            // Check Next Area
            if (GAME.teleporters) {
                let nextTp = GAME.teleporters.find(t => t.type === 'next');
                if (nextTp) {
                    let dx = Math.abs(this.x - (nextTp.x * 50 + 25));
                    let dy = Math.abs(this.y - (nextTp.y * 50 + 25));
                    if (dx < 25 && dy < 25) {
                        if (confirm('次のエリアに進みますか？')) {
                            let n = Math.floor(Math.random() * MAP_PATTERNS.forest2) + 1;
                            loadAreaFromFile(`forest2_${n}.json`);
                        }
                        return;
                    }
                }
                
                let townTp = GAME.teleporters.find(t => t.type === 'town');
                if (townTp) {
                    let dx = Math.abs(this.x - (townTp.x * 50 + 25));
                    let dy = Math.abs(this.y - (townTp.y * 50 + 25));
                    if (dx < 25 && dy < 25) {
                        if (confirm('タウンに戻りますか？')) {
                            GAME.mode = 'town';
                            generateShopLineup();
                            this.x = MAP_DATA.town.start.x;
                            this.y = MAP_DATA.town.start.y;
                            GAME.eventFlags = {}; // Reset event flags
                        }
                        return;
                    }
                }
            }
        }

        let action = this.palette[this.paletteIndex];

        if (action.type === 'weapon') {
            let wType = WEAPON_TYPES[action.weaponType];
            let classMod = wType.classMod[this.classId] || 0;
            
            if (this.state === 'attack') {
                if (this.comboCount >= wType.maxCombo) return;
                
                let targetTime = wType.timing[this.comboCount - 1] + classMod;
                if (this.comboTimer >= targetTime - 0.05 && this.comboTimer <= targetTime + 0.25) {
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
                let tx = this.x + nX * motion * 5;
                let ty = this.y + nY * motion * 5;
                if (checkLineOfSight(this.x, this.y, tx, ty, true)) {
                    this.attackMoveTargetX = this.x;
                    this.attackMoveTargetY = this.y;
                } else {
                    this.attackMoveTargetX = tx;
                    this.attackMoveTargetY = ty;
                }
                this.debugInfo.push(`Move Target: ${motion*5}px`);
            } else {
                this.attackMoveTotal = 0;
            }
            
            console.log(`Player ${this.id+1} attacks! Combo: ${this.comboCount}, Weapon: ${action.name}`);
            
            // Target logic
            let targets = [];
            let checkRange = action.range;
            if (wType.shape === 'circle1') {
                let offset = wType.offsets[this.comboCount - 1];
                if (offset) checkRange += offset.dist;
            }
            let inRangeEnemies = GAME.enemies.filter(e => e.hp > 0 && e.roomId === this.roomId && Math.hypot(e.x - this.x, e.y - this.y) <= checkRange);
            let inRangeBoxes = (GAME.boxes || []).filter(b => Math.hypot(b.x - this.x, b.y - this.y) <= checkRange);
            let inRange = [...inRangeEnemies, ...inRangeBoxes];
            
            let pAngle = Math.atan2(this.dirY, this.dirX);
            
            let rad = (wType.ranges && wType.ranges[this.comboCount - 1]) ? wType.ranges[this.comboCount - 1] - 20 : 20;
            this.lastAttackShape = { type: wType.shape, angle: pAngle, range: action.range, cx: this.x, cy: this.y, radius: rad };
            
            if (wType.shape === 'none') {
                // Just get the closest one
                if (inRange.length > 0) {
                    inRange.sort((a,b) => {
                        let aIsBox = !!(GAME.boxes && GAME.boxes.includes(a));
                        let bIsBox = !!(GAME.boxes && GAME.boxes.includes(b));
                        if (aIsBox !== bIsBox) return aIsBox ? 1 : -1;
                        return Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y);
                    });
                    targets.push(inRange[0]);
                }
            } else if (wType.shape === 'fan45') {
                targets = inRange.filter(e => {
                    let angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                    let diff = Math.abs(angleToEnemy - pAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;
                    return diff <= (Math.PI / 8); // 45 degrees is +/- 22.5 (PI/8)
                });
            } else if (wType.shape === 'fan30') {
                targets = inRange.filter(e => {
                    let angleToEnemy = Math.atan2(e.y - this.y, e.x - this.x);
                    let diff = Math.abs(angleToEnemy - pAngle);
                    if (diff > Math.PI) diff = Math.PI * 2 - diff;
                    return diff <= (Math.PI / 12); // 30 degrees is +/- 15 (PI/12)
                });
            } else if (wType.shape === 'circle1') {
                let offset = wType.offsets[this.comboCount - 1];
                let cx = this.x;
                let cy = this.y;
                let radius = (wType.ranges && wType.ranges[this.comboCount - 1]) ? wType.ranges[this.comboCount - 1] - 20 : 20;
                if (offset) {
                    let hitAngle = pAngle + (offset.angle * Math.PI / 180);
                    cx += Math.cos(hitAngle) * offset.dist;
                    cy += Math.sin(hitAngle) * offset.dist;
                    if (offset.dist === 0 && action.weaponType === 'dagger') radius = action.range - 20; 
                }
                this.lastAttackShape.cx = cx;
                this.lastAttackShape.cy = cy;
                this.lastAttackShape.radius = radius;
                
                targets = inRange.filter(e => Math.hypot(e.x - cx, e.y - cy) <= radius);
            }
            
            // Apply target limits
            targets.sort((a,b) => {
                let aIsBox = !!(GAME.boxes && GAME.boxes.includes(a));
                let bIsBox = !!(GAME.boxes && GAME.boxes.includes(b));
                if (aIsBox !== bIsBox) return aIsBox ? 1 : -1;
                return Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y);
            });

            let currentIsBox = !!(this.mainTarget && GAME.boxes && GAME.boxes.includes(this.mainTarget));
            if (this.comboCount === 1 || !this.mainTarget || (!currentIsBox && this.mainTarget.hp <= 0) || !targets.includes(this.mainTarget)) {
                this.mainTarget = targets.length > 0 ? targets[0] : null;
            }

            if (wType.targetType === 'single') {
                targets = this.mainTarget ? [this.mainTarget] : [];
            } else if (wType.targetType === 'scopeN' && targets.length > wType.targetNum) {
                let finalTargets = [];
                if (this.mainTarget) {
                    finalTargets.push(this.mainTarget);
                    targets = targets.filter(t => t !== this.mainTarget);
                }
                for (let i = targets.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [targets[i], targets[j]] = [targets[j], targets[i]];
                }
                finalTargets = finalTargets.concat(targets.slice(0, wType.targetNum - finalTargets.length));
                targets = finalTargets;
            } else if (wType.targetType === 'slicer') {
                let firstTarget = this.mainTarget;
                targets = [];
                if (firstTarget) {
                    let hitWall = checkLineOfSight(this.x, this.y, firstTarget.x, firstTarget.y);
                    if (hitWall) {
                        addEffect('bullet', { x1: this.x, y1: this.y, x2: hitWall.x, y2: hitWall.y, color: '#00ffff' });
                    } else {
                        let chained = [firstTarget];
                        let current = firstTarget;
                        for (let i = 0; i < wType.targetNum - 1; i++) {
                            let candidates = GAME.enemies.filter(e => e.hp > 0 && e.roomId === this.roomId && !chained.includes(e) && Math.hypot(e.x - current.x, e.y - current.y) <= 40);
                            if (candidates.length === 0) break;
                            let next = candidates[Math.floor(Math.random() * candidates.length)];
                            chained.push(next);
                            current = next;
                        }
                        PROJECTILES.push({
                            roomId: this.roomId,
                            type: 'slicer',
                            owner: this,
                            comboCount: this.comboCount,
                            targets: chained,
                            currentIndex: 0,
                            delayTimer: 0.0,
                            x: this.x,
                            y: this.y,
                            life: 10.0,
                            applyHit: (t, comboDmg, isCrit) => {
                                if (t instanceof Enemy) hitEnemy(t, this, comboDmg, isCrit);
                                else {
                                    t.hp -= 1;
                                    if (t.hp <= 0) breakBox(t);
                                }
                            }
                        });
                    }
                }
            }
            
            // Hit enemies
            // Visual Effects (Particles / Trails)
            if (action.weaponType === 'saber' || action.weaponType === 'cane') {
                let isLeftToRight = (this.comboCount !== 2); // 1 and 3 are L->R
                let startAng = pAngle + (isLeftToRight ? -Math.PI/2 : Math.PI/2);
                let endAng = pAngle + (isLeftToRight ? Math.PI/2 : -Math.PI/2);
                addEffect('slash', { cx: this.lastAttackShape.cx, cy: this.lastAttackShape.cy, r: this.lastAttackShape.radius, startAngle: startAng, endAngle: endAng, anticlockwise: !isLeftToRight, color: '#00ffff' });
            } else if (action.weaponType === 'dagger') {
                let startAng = pAngle - Math.PI/2;
                let endAng = pAngle + Math.PI/2;
                let anticlockwise = false;
                if (this.comboCount === 2) {
                    startAng = pAngle + Math.PI/2;
                    endAng = pAngle - Math.PI/2;
                    anticlockwise = true;
                    addEffect('slash', { cx: this.lastAttackShape.cx, cy: this.lastAttackShape.cy, r: this.lastAttackShape.radius, startAngle: startAng, endAngle: endAng, anticlockwise: anticlockwise, color: '#00ffff' });
                } else if (this.comboCount === 3) {
                    startAng = pAngle;
                    endAng = pAngle + Math.PI;
                    addEffect('slash', { cx: this.lastAttackShape.cx, cy: this.lastAttackShape.cy, r: this.lastAttackShape.radius, startAngle: startAng, endAngle: endAng, anticlockwise: false, color: '#00ffff' });
                    addEffect('slash', { cx: this.lastAttackShape.cx, cy: this.lastAttackShape.cy, r: this.lastAttackShape.radius, startAngle: startAng + Math.PI, endAngle: endAng + Math.PI, anticlockwise: false, color: '#00ffff' });
                } else {
                    addEffect('slash', { cx: this.lastAttackShape.cx, cy: this.lastAttackShape.cy, r: this.lastAttackShape.radius, startAngle: startAng, endAngle: endAng, anticlockwise: anticlockwise, color: '#00ffff' });
                }
            } else if (action.weaponType === 'handgun' || action.weaponType === 'shotgun') {
                targets.forEach(t => {
                    let hitWall = checkLineOfSight(this.x, this.y, t.x, t.y);
                    if (hitWall) {
                        addEffect('bullet', { x1: this.x, y1: this.y, x2: hitWall.x, y2: hitWall.y, color: '#ffcc00' });
                        t.blockedByWall = true;
                    } else {
                        addEffect('bullet', { x1: this.x, y1: this.y, x2: t.x, y2: t.y, color: '#ffcc00' });
                        t.blockedByWall = false;
                    }
                });
                targets = targets.filter(t => !t.blockedByWall);
            }

            let allTargets = targets;
            allTargets.forEach((target, i) => {
                let delay = wType.hitDelay || 0;
                if (Array.isArray(delay)) delay = delay[Math.min(this.comboCount - 1, delay.length - 1)];
                setTimeout(() => {
                    // Accuracy check
                    let myDex = this.baseStats.dex;
                    if (this.equip.weapon && this.equip.weapon.dex) myDex += this.equip.weapon.dex;
                    if (this.equip.armor) {
                        if (this.equip.armor.dex) myDex += this.equip.armor.dex;
                        if (this.equip.armor.slottedUnits) {
                            this.equip.armor.slottedUnits.forEach(u => { if (u && u.dex) myDex += u.dex; });
                        }
                    }
                    let isBox = !!(GAME.boxes && GAME.boxes.includes(target));
                    let targetEvi = isBox ? 0 : (target.evi || 10);
                    
                    let hitRate = myDex - (targetEvi * 0.2);
                    let distPenalty = 0;
                    
                    if (wType && (wType.shape === 'fan30' || wType.shape === 'fan45')) {
                        let dist = Math.hypot(target.x - this.x, target.y - this.y);
                        distPenalty = (dist / 10);
                    }
                    hitRate -= distPenalty;
                    
                    if (!isBox && Math.random() * 100 > hitRate) {
                        addFloatingText(target.x, target.y - 20, "miss", 'white');
                        return; // Missed
                    }
                    
                    let myLuck = this.baseStats.luck;
                    if (this.equip.weapon && this.equip.weapon.luck) myLuck += this.equip.weapon.luck;
                    if (this.equip.armor) {
                        if (this.equip.armor.luck) myLuck += this.equip.armor.luck;
                        if (this.equip.armor.slottedUnits) {
                            this.equip.armor.slottedUnits.forEach(u => { if (u && u.luck) myLuck += u.luck; });
                        }
                    }
                    
                    let myAtk = this.baseStats.atk;
                    if (this.equip.weapon && this.equip.weapon.atk) myAtk += this.equip.weapon.atk;
                    if (this.equip.armor) {
                        if (this.equip.armor.atk) myAtk += this.equip.armor.atk;
                        if (this.equip.armor.slottedUnits) {
                            this.equip.armor.slottedUnits.forEach(u => { if (u && u.atk) myAtk += u.atk; });
                        }
                    }
                    
                    let comboMult = [0.9, 1.7, 2.5][this.comboCount - 1] || 1.0;
                    let isCrit = (Math.random() * 100) < (myLuck / 5);
                    let critMult = isCrit ? 1.5 : 1.0;
                    let defenderDef = isBox ? 0 : (target.def || 5);
                    
                    let baseDmg = (myAtk - (defenderDef / 5)) * critMult;
                    if (baseDmg < 1) baseDmg = 1;
                    let dmg = Math.floor(baseDmg * comboMult);
                    
                    if (action.attrs && action.attrs.native) dmg = Math.floor(dmg * 1.2);
                    
                    if (target instanceof Enemy) {
                        target.hp -= dmg;
                        target.stunTimer = 1.0; // Stun for 1.0s on hit
                        addFloatingText(target.x, target.y - 20, dmg, isCrit ? 'yellow' : 'white');
                        console.log(`Hit enemy! Enemy HP: ${target.hp}`);
                        
                        // Trigger enchant on 3rd combo
                        if (this.comboCount === 3 && action.enchant && !action.isUnidentified) {
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
                    } else {
                        target.hp -= 1;
                        if (target.hp <= 0) breakBox(target);
                    }
                }, delay * 1000);
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
            
        } else if (action.type === 'disk' || action.type === 'magic') {
            if (action.magic === 'resta') {
                if (this.magicCooldowns.resta > 0) return;
                let cost = 10;
                if (this.mp >= cost) {
                    this.mp -= cost;
                    this.magicCooldowns.resta = 3.0;
                    let lv = action.lv || 1;
                    let heal = Math.min(this.maxHp - this.hp, 50 * lv);
                    this.hp += heal;
                    addFloatingText(this.x, this.y - 20, heal, '#33ff33');
                } else {
                    this.debugInfo.push("Not enough MP");
                }
            } else if (action.magic === 'fire') {
                if (this.magicCooldowns.fire > 0) return;
                let lv = action.lv || 1;
                let cost = 3 + lv;
                if (this.mp >= cost) {
                    this.mp -= cost;
                    this.magicCooldowns.fire = 3.0;
                    this.state = 'attack';
                    this.comboTimer = 0;
                    this.comboCount = 0;
                    
                    let pAngle = Math.atan2(this.dirY, this.dirX);
                    let range = 150;
                    let inRange = GAME.enemies.filter(e => e.hp>0 && e.roomId === this.roomId && Math.hypot(e.x-this.x, e.y-this.y)<=range);
                    let validTargets = inRange.filter(e => {
                        let diff = Math.abs(Math.atan2(e.y-this.y, e.x-this.x) - pAngle);
                        if(diff>Math.PI) diff = Math.PI*2-diff;
                        return diff<=(Math.PI/12);
                    });
                    validTargets.sort((a,b) => {
                        let diffA = Math.abs(Math.atan2(a.y-this.y, a.x-this.x) - pAngle);
                        if(diffA>Math.PI) diffA = Math.PI*2-diffA;
                        let diffB = Math.abs(Math.atan2(b.y-this.y, b.x-this.x) - pAngle);
                        if(diffB>Math.PI) diffB = Math.PI*2-diffB;
                        return diffA - diffB;
                    });
                    let target = validTargets.length > 0 ? validTargets[0] : null;
                    this.mainTarget = target;
                    
                    let dmg = Math.floor(this.baseStats.mind + 10 + (lv * 2));
                    let r = lv >= 21 ? 12 : (lv >= 11 ? 8 : 4);
                    let projVx = this.dirX * 200;
                    let projVy = this.dirY * 200;
                    if (target) {
                        let ang = Math.atan2(target.y - this.y, target.x - this.x);
                        projVx = Math.cos(ang)*200;
                        projVy = Math.sin(ang)*200;
                    }
                    PROJECTILES.push({ roomId: this.roomId, type: 'fire', x: this.x, y: this.y, vx: projVx, vy: projVy, dmg: dmg, lv: lv, r: r, life: 1.5 });
                } else {
                    this.debugInfo.push("Not enough MP");
                }
            } else if (action.magic === 'gifoie') {
                if (this.magicCooldowns.gifoie > 0) return;
                let lv = action.lv || 1;
                let cost = 8 + lv;
                if (this.mp >= cost) {
                    this.mp -= cost;
                    this.magicCooldowns.gifoie = 3.0;
                    this.state = 'attack';
                    this.comboTimer = 0;
                    this.comboCount = 0;
                    
                    let dmg = Math.floor((this.baseStats.mind * 2/3) + 10 + (lv * 2));
                    let numBullets = Math.floor(2 + (lv / 10));
                    let r = lv >= 21 ? 12 : (lv >= 11 ? 8 : 4);
                    for (let i = 0; i < numBullets; i++) {
                        let startAng = (i / numBullets) * Math.PI * 2;
                        PROJECTILES.push({ roomId: this.roomId, type: 'gifoie', cx: this.x, cy: this.y, angle: startAng, speed: 40, dmg: dmg, lv: lv, r: r, life: 5.0, maxLife: 5.0, hitTargets: new Set() });
                    }
                } else {
                    this.debugInfo.push("Not enough MP");
                }
            } else if (action.magic === 'rafoie') {
                if (this.magicCooldowns.rafoie > 0) return;
                let lv = action.lv || 1;
                let cost = 15 + lv;
                if (this.mp >= cost) {
                    this.mp -= cost;
                    this.magicCooldowns.rafoie = 4.0;
                    this.state = 'attack';
                    this.comboTimer = 0;
                    this.comboCount = 0;
                    
                    let pAngle = Math.atan2(this.dirY, this.dirX);
                    let range = 150;
                    let inRange = GAME.enemies.filter(e => e.hp>0 && e.roomId === this.roomId && Math.hypot(e.x-this.x, e.y-this.y)<=range);
                    let validTargets = inRange.filter(e => {
                        let diff = Math.abs(Math.atan2(e.y-this.y, e.x-this.x) - pAngle);
                        if(diff>Math.PI) diff = Math.PI*2-diff;
                        return diff<=(Math.PI/12);
                    });
                    validTargets.sort((a,b) => {
                        let diffA = Math.abs(Math.atan2(a.y-this.y, a.x-this.x) - pAngle);
                        if(diffA>Math.PI) diffA = Math.PI*2-diffA;
                        let diffB = Math.abs(Math.atan2(b.y-this.y, b.x-this.x) - pAngle);
                        if(diffB>Math.PI) diffB = Math.PI*2-diffB;
                        return diffA - diffB;
                    });
                    let target = validTargets.length > 0 ? validTargets[0] : null;
                    this.mainTarget = target;
                    
                    let cx = target ? target.x : this.x + this.dirX * range;
                    let cy = target ? target.y : this.y + this.dirY * range;
                    
                    let dmg = Math.floor((this.baseStats.mind * 3/4) + 5 + (lv * 2));
                    PROJECTILES.push({ roomId: this.roomId, type: 'rafoie', cx: cx, cy: cy, dmg: dmg, lv: lv, life: 0.2 });
                } else {
                    this.debugInfo.push("Not enough MP");
                }
            }
            if (action.magic !== 'resta') {
                // If it was not resta, it handled cooldown and state above
            } else {
                this.state = 'idle';
            }
        }
    }
}

// Enemy Entity
class Enemy {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        let ang = Math.random() * Math.PI * 2;
        this.dirX = Math.cos(ang);
        this.dirY = Math.sin(ang);
        this.stunTimer = 0;
        this.invincible = false;
        this.state = 'idle';
        this.spawnTimer = 1.0;
        
        if (type === 'hildebear') {
            this.hp = 180;
            this.maxHp = 180;
            this.atk = 35;
            this.def = 20;
            this.dex = 70;
            this.evi = 22;
            this.luck = 10;
            this.exp = 15;
            this.radius = 30;
            this.baseSpd = 10;
            this.resists = { fire: 70, ice: 0, thunder: 30, light: 50, dark: 30 };
        } else if (type === 'gobooma') {
            this.hp = 85;
            this.maxHp = 85;
            this.atk = 17;
            this.def = 5;
            this.dex = 15;
            this.evi = 12;
            this.luck = 5;
            this.exp = 6;
            this.radius = 10;
            this.baseSpd = 15;
            this.resists = { fire: 0, ice: 0, thunder: 0, light: 0, dark: 0 };
        } else if (type === 'jigobooma') {
            this.hp = 110;
            this.maxHp = 110;
            this.atk = 20;
            this.def = 8;
            this.dex = 20;
            this.evi = 15;
            this.luck = 5;
            this.exp = 7;
            this.radius = 10;
            this.baseSpd = 15;
            this.resists = { fire: 0, ice: 0, thunder: 0, light: 0, dark: 0 };
        } else {
            // booma (default)
            this.hp = 60;
            this.maxHp = 60;
            this.atk = 15;
            this.def = 5;
            this.dex = 12;
            this.evi = 10;
            this.luck = 5;
            this.exp = 6;
            this.radius = 10;
            this.baseSpd = 15;
            this.resists = { fire: 0, ice: 0, thunder: 0, light: 0, dark: 0 };
        }
        this.spd = this.baseSpd;
    }

    update(dt) {
        if (this.hp <= 0) return;
        
        if (this.spawnTimer > 0) {
            this.spawnTimer -= dt;
            return;
        }

        if (this.stunTimer > 0) {
            this.stunTimer -= dt;
            return;
        }
        
        let target = GAME.players[0];
        if (!target || target.state === 'dead') return;

        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let dist = Math.hypot(dx, dy);
        
        if (this.type === 'hildebear') {
            if (this.state === 'idle') {
                if (dist <= 250) {
                    this.state = 'jump';
                    this.invincible = true;
                    this.spd = 120;
                    this.jumpTargetX = target.x;
                    this.jumpTargetY = target.y;
                    let jdx = this.jumpTargetX - this.x;
                    let jdy = this.jumpTargetY - this.y;
                    let jdist = Math.hypot(jdx, jdy);
                    this.dirX = jdist > 0 ? jdx / jdist : 0;
                    this.dirY = jdist > 0 ? jdy / jdist : 0;
                }
            } else if (this.state === 'jump') {
                let jdx = this.jumpTargetX - this.x;
                let jdy = this.jumpTargetY - this.y;
                let jdist = Math.hypot(jdx, jdy);
                let moveDist = this.spd * dt;
                
                let nextX = this.x + this.dirX * moveDist;
                let nextY = this.y + this.dirY * moveDist;
                let blocked = checkLineOfSight(this.x, this.y, nextX, nextY, true);
                let dot = jdx * this.dirX + jdy * this.dirY;
                
                if (dot <= 0 || jdist <= moveDist || blocked) { // Reached destination or blocked
                    if (!blocked && dot > 0) {
                        this.x = this.jumpTargetX;
                        this.y = this.jumpTargetY;
                    }
                    this.state = 'chase';
                    this.invincible = false;
                    this.spd = this.baseSpd;
                } else {
                    this.x = nextX;
                    this.y = nextY;
                }
            } else if (this.state === 'chase') {
                if (dist > this.radius + target.radius) {
                    this.dirX = dx / dist;
                    this.dirY = dy / dist;
                    this.x += this.dirX * this.spd * dt;
                    this.y += this.dirY * this.spd * dt;
                }
            }
        } else {
            if (this.state === 'idle') {
                if (dist <= 300) this.state = 'chase';
            } else if (this.state === 'chase') {
                if (dist > this.radius + target.radius) {
                    this.dirX = dx / dist;
                    this.dirY = dy / dist;
                    this.x += this.dirX * this.spd * dt;
                    this.y += this.dirY * this.spd * dt;
                }
            }
        }
        
        if (GAME.mode === 'map') {
            let room = GAME.rooms.find(r => r.id === this.roomId);
            if (room) {
                let ts = 50;
                let minX = room.x * ts + this.radius;
                let maxX = (room.x + room.w) * ts - this.radius;
                let minY = room.y * ts + this.radius;
                let maxY = (room.y + room.h) * ts - this.radius;
                this.x = Math.max(minX, Math.min(this.x, maxX));
                this.y = Math.max(minY, Math.min(this.y, maxY));
            }
        }
    }

    draw(ctx) {
        if (this.hp <= 0) return;
        
        ctx.save();
        if (this.spawnTimer > 0) {
            ctx.globalAlpha = Math.max(0, 1.0 - this.spawnTimer);
        }

        let spriteName = 'snakey_left';
        if (this.type === 'gobooma') spriteName = 'medusa_awake';
        else if (this.type === 'jigobooma') spriteName = 'gol_down_awake';
        else if (this.type === 'hildebear') spriteName = 'don_medosa_1';

        if (PRE_RENDERED[spriteName]) {
            let size = this.radius * 2.5; // Slightly larger than hitbox
            ctx.drawImage(PRE_RENDERED[spriteName], this.x - size/2, this.y - size/2, size, size);
        } else {
            if (this.type === 'hildebear') {
                ctx.fillStyle = 'purple';
                ctx.fillRect(this.x - 30, this.y - 30, 60, 60);
            } else if (this.type === 'gobooma') {
                ctx.fillStyle = '#ff6600'; // orange
                ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
            } else if (this.type === 'jigobooma') {
                ctx.fillStyle = '#cc0000'; // dark red
                ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
            } else {
                ctx.fillStyle = 'red';
                ctx.fillRect(this.x - 10, this.y - 10, 20, 20);
            }
        }
        
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 5, this.radius * 2, 4);
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - this.radius, this.y - this.radius - 5, (this.radius * 2) * (this.hp / this.maxHp), 4);
        
        ctx.restore();
    }
}

// Asset Loading
async function loadAssets() {
    try {
        const res = await fetch('assets.json');
        const data = await res.json();
        PALETTE = data.palette;
        SPRITES = data.sprites;
        preRenderSprites();
    } catch(e) {
        console.error('Failed to load assets.json', e);
    }
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

// Map Loading
async function loadMapData() {
    try {
        const res = await fetch('town.json');
        MAP_DATA.town = await res.json();
    } catch(e) {
        console.error('Failed to load town.json', e);
    }
}

async function loadAreaFromFile(filename) {
    try {
        const res = await fetch(filename);
        let areaPattern = await res.json();
        loadArea(areaPattern);
    } catch(e) {
        console.error('Failed to load ' + filename, e);
    }
}

function loadArea(areaPattern) {
    GAME.currentMapPattern = areaPattern;
    GAME.enemies = [];
    GAME.drops = [];
    GAME.grid = areaPattern.grid ? JSON.parse(JSON.stringify(areaPattern.grid)) : null;
    
    GAME.rooms = (areaPattern.rooms || []).map(r => ({
        ...r,
        currentWave: -1,
        active: false,
        cleared: false
    }));
    
    GAME.doors = [];
    GAME.rooms.forEach(r => {
        if (r.doors) r.doors.forEach(d => GAME.doors.push({...d, open: false, roomDef: r.id}));
    });
    if (areaPattern.standaloneDoors) {
        areaPattern.standaloneDoors.forEach(d => GAME.doors.push({...d, open: false, roomDef: null}));
    }
    
    // Write closed doors to grid
    GAME.doors.forEach(d => {
        if (!GAME.grid) return;
        for (let dy = 0; dy < d.h; dy++) {
            for (let dx = 0; dx < d.w; dx++) {
                if (GAME.grid[d.y + dy] && GAME.grid[d.y + dy][d.x + dx] !== undefined) {
                    GAME.grid[d.y + dy][d.x + dx] = 0; // Wall
                }
            }
        }
    });
    
    GAME.switches = JSON.parse(JSON.stringify(areaPattern.switches || []));
    GAME.boxes = (areaPattern.boxes || []).map(b => ({
        x: b.x * 50 + 25,
        y: b.y * 50 + 25,
        hp: 1,
        radius: 20
    }));
    GAME.events = JSON.parse(JSON.stringify(areaPattern.events || []));
    GAME.teleporters = JSON.parse(JSON.stringify(areaPattern.teleporters || []));
    
    // Set players to start
    GAME.players.forEach(p => {
        if (areaPattern.start) {
            p.x = areaPattern.start.x * 50 + 25; // center of tile
            p.y = areaPattern.start.y * 50 + 25;
        }
    });
}

function startGame(is2P, class1, class2) {
    GAME.mode = 'town';
    GAME.progress = 1;
    generateShopLineup();
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
    document.getElementById('palette-1p').style.display = 'flex';

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
        
        if (input.palLeft && p.state !== 'attack') {
            p.paletteIndex--;
            if (p.paletteIndex < 0) p.paletteIndex = 5;
            updatePaletteUI(p.id);
        }
        if (input.palRight && p.state !== 'attack') {
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

let currentAppraisalItem = null;
let currentAppraisalPlayer = null;
let appraisalResult = null;

function openAppraiserModal(p) {
    let unids = p.inventory.filter(i => i && i.type === 'weapon' && i.isUnidentified);
    let listEl = document.getElementById('appraiser-list');
    listEl.innerHTML = '';
    
    if (unids.length === 0) {
        listEl.innerHTML = '<div style="color:#aaa;">未鑑定のアイテムがありません。</div>';
    } else {
        unids.forEach(item => {
            let div = document.createElement('div');
            div.className = 'menu-item';
            div.innerText = item.name;
            div.onclick = () => {
                if (p.coins >= 100) {
                    p.coins -= 100;
                    document.getElementById('appraiser-modal').style.display = 'none';
                    performAppraisal(p, item);
                } else {
                    alert("コインが足りません！");
                }
            };
            listEl.appendChild(div);
        });
    }
    
    document.getElementById('btn-appraiser-close').onclick = () => {
        document.getElementById('appraiser-modal').style.display = 'none';
    };
    
    document.getElementById('appraiser-modal').style.display = 'flex';
}

function performAppraisal(p, item) {
    currentAppraisalItem = item;
    currentAppraisalPlayer = p;
    
    // Determine new enchant
    let enchId = item.enchant;
    let upChances = {
        'heat': 'fire',
        'ice': 'freeze',
        'shock': 'bind',
        'confuse': 'panic', // Or riot, but we use panic for now
        'draw': 'drain'
    };
    let newEnchId = enchId;
    if (enchId && upChances[enchId] && Math.random() < 0.1) {
        newEnchId = upChances[enchId];
    }
    
    // Determine attributes 5-30% across Native, Mutant, Machine, Dark, Hit
    let attrs = { native: 0, mutant: 0, machine: 0, dark: 0, hit: 0 };
    let attrNames = ['native', 'mutant', 'machine', 'dark', 'hit'];
    let numAttrs = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numAttrs; i++) {
        let attr = attrNames[Math.floor(Math.random() * attrNames.length)];
        attrs[attr] += (Math.floor(Math.random() * 6) + 1) * 5; // 5,10,15,20,25,30
    }
    
    // Build display result
    let base = BASE_WEAPONS[item.id];
    let prefix = newEnchId ? ENCHANTS.find(e => e.id === newEnchId).name + ' ' : '';
    let suffix = item.enhance > 0 ? ' +' + item.enhance : '';
    let newName = prefix + item.baseName + suffix;
    
    appraisalResult = {
        enchant: newEnchId,
        attrs: attrs,
        name: newName
    };
    
    document.getElementById('appraiser-result-name').innerText = newName;
    let stats = "";
    stats += `<div style="color: #ffaa00; font-size:14px; line-height: 1.4;">`;
    stats += `原生生物 ${attrs.native}%<br>`;
    stats += `突然変異 ${attrs.mutant}%<br>`;
    stats += `機械 ${attrs.machine}%<br>`;
    stats += `闇 ${attrs.dark}%<br>`;
    stats += `Hit ${attrs.hit}%`;
    stats += `</div>`;
    document.getElementById('appraiser-result-stats').innerHTML = stats;
    
    document.getElementById('appraiser-result-modal').style.display = 'flex';
    
    document.getElementById('btn-appraiser-accept').onclick = () => {
        item.isUnidentified = false;
        item.enchant = appraisalResult.enchant;
        item.attrs = appraisalResult.attrs;
        item.name = appraisalResult.name;
        document.getElementById('appraiser-result-modal').style.display = 'none';
        renderMenu(p.id);
    };
    
    document.getElementById('btn-appraiser-cancel').onclick = () => {
        // Return to appraiser list, coin is already consumed
        document.getElementById('appraiser-result-modal').style.display = 'none';
        openAppraiserModal(p);
    };
}
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
        stats += `<div style="color: #ffaa00; font-size:12px; line-height: 1.4; margin-top: 5px;">`;
        stats += `原生生物 ${item.attrs.native || 0}%<br>`;
        stats += `突然変異 ${item.attrs.mutant || 0}%<br>`;
        stats += `機械 ${item.attrs.machine || 0}%<br>`;
        stats += `闇 ${item.attrs.dark || 0}%<br>`;
        stats += `Hit ${item.attrs.hit || 0}%`;
        stats += `</div>`;
    }
    
    document.getElementById('modal-item-stats').innerHTML = stats;
    
    let btnUse = document.getElementById('btn-modal-use');
    let btnEquip = document.getElementById('btn-modal-equip');
    let btnDrop = document.getElementById('btn-modal-drop');
    btnUse.style.display = 'none';
    btnEquip.style.display = 'none';
    btnDrop.style.display = 'none';
    
    // Check if item is droppable (not equipped or in palette)
    let isEquipped = (p.equip.armor === item);
    let isPalette = p.palette.includes(item);
    if (!isEquipped && !isPalette && source !== 'magic' && source !== 'modal-slot' && source !== 'modal-inv') {
        btnDrop.style.display = 'inline-block';
        btnDrop.onclick = () => {
            // Return slotted units to inventory if it's an armor
            if (item.type === 'armor' && item.slottedUnits) {
                for (let i = 0; i < item.slottedUnits.length; i++) {
                    let u = item.slottedUnits[i];
                    if (u) {
                        if (p.inventory.length < 20) {
                            p.inventory.push(u);
                        } else {
                            // If inventory is full, drop the unit as well
                            GAME.drops.push({ x: p.x, y: p.y, item: u });
                        }
                        item.slottedUnits[i] = null;
                    }
                }
            }
            
            // Remove from inventory
            if (item.stack && item.stack > 1) {
                item.stack--;
                let dropItem = Object.assign({}, item);
                dropItem.stack = 1;
                GAME.drops.push({ x: p.x, y: p.y, item: dropItem });
            } else {
                p.inventory = p.inventory.filter(i => i !== item);
                GAME.drops.push({ x: p.x, y: p.y, item: item });
            }
            
            modal.style.display = 'none';
            renderMenu(pid);
        };
    }
    
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
    
    if (item.type === 'armor' && item.slotCount !== undefined) {
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
        
        let isEquipable = true;
        if (item.type === 'weapon') {
            if (item.reqClass && p.classId !== item.reqClass) isEquipable = false;
            if (item.reqDex && p.dex < item.reqDex) isEquipable = false;
        }

        if (isEquipable) {
            btnEquip.style.display = 'inline-block';
        } else {
            btnEquip.style.display = 'none';
        }
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
                let existing = p.magic.find(m => m.magic === item.magic);
                if (existing) {
                    if (item.lv > existing.lv) {
                        existing.lv = item.lv;
                        existing.id = item.id;
                        existing.name = item.name.replace('ディスク','');
                        p.inventory = p.inventory.filter(i => i !== item);
                    } else {
                        // Level too low, do nothing or show msg
                        p.inventory = p.inventory.filter(i => i !== item); // Consume anyway? Let's consume it.
                    }
                } else {
                    p.magic.push({ id: item.id, name: item.name.replace('ディスク',''), type: 'magic', magic: item.magic, lv: item.lv });
                    p.inventory = p.inventory.filter(i => i !== item);
                }
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

// --- Projectile System ---
let PROJECTILES = [];
function updateProjectiles(dt) {
    for (let i = PROJECTILES.length - 1; i >= 0; i--) {
        let proj = PROJECTILES[i];
        proj.life -= dt;
        if (proj.type === 'fire') {
            proj.x += proj.vx * dt;
            proj.y += proj.vy * dt;
            let colors = ['#ff3300', '#ffcc00'];
            if (proj.lv >= 21) colors = ['#0033ff', '#00ffff'];
            else if (proj.lv >= 11) colors = ['#ff00ff', '#ffaaaa'];
            addEffect('particle', { x: proj.x, y: proj.y, color: colors[Math.floor(Math.random()*2)], r: proj.r });
            
            let hit = false;
            let targets = [...GAME.enemies.filter(e=>e.hp>0 && e.roomId === proj.roomId), ...(GAME.boxes || [])];
            for (let e of targets) {
                let eRadius = e.radius || 15;
                if (Math.hypot(e.x - proj.x, e.y - proj.y) <= eRadius + proj.r) {
                    if (e instanceof Enemy) hitEnemyWithMagic(e, proj);
                    else { e.hp = (e.hp||1)-1; if (e.hp<=0) breakBox(e); }
                    hit = true; break;
                }
            }
            if (hit || proj.life <= 0) PROJECTILES.splice(i, 1);
        } else if (proj.type === 'gifoie') {
            proj.angle += 3 * dt;
            let currentRadius = (5.0 - proj.life) * proj.speed;
            proj.x = proj.cx + Math.cos(proj.angle) * currentRadius;
            proj.y = proj.cy + Math.sin(proj.angle) * currentRadius;
            
            let colors = ['#ff3300', '#ffcc00'];
            if (proj.lv >= 21) colors = ['#0033ff', '#00ffff'];
            else if (proj.lv >= 11) colors = ['#ff00ff', '#ffaaaa'];
            addEffect('particle', { x: proj.x, y: proj.y, color: colors[Math.floor(Math.random()*2)], r: proj.r });
            
            let targets = [...GAME.enemies.filter(e=>e.hp>0 && e.roomId === proj.roomId), ...(GAME.boxes || [])];
            for (let e of targets) {
                let eRadius = e.radius || 15;
                if (Math.hypot(e.x - proj.x, e.y - proj.y) <= eRadius + proj.r) {
                    if (!proj.hitTargets.has(e)) {
                        proj.hitTargets.add(e);
                        if (e instanceof Enemy) hitEnemyWithMagic(e, proj);
                        else { e.hp = (e.hp||1)-1; if (e.hp<=0) breakBox(e); }
                    }
                }
            }
            if (proj.life <= 0) PROJECTILES.splice(i, 1);
        } else if (proj.type === 'rafoie') {
            if (proj.life <= 0) {
                addEffect('explosion', { x: proj.cx, y: proj.cy, r: 35, lv: proj.lv });
                let targets = [...GAME.enemies.filter(e=>e.hp>0 && e.roomId === proj.roomId), ...(GAME.boxes || [])];
                for (let e of targets) {
                    let eRadius = e.radius || 15;
                    if (Math.hypot(e.x - proj.cx, e.y - proj.cy) <= eRadius + 35) {
                        if (e instanceof Enemy) hitEnemyWithMagic(e, proj);
                        else { e.hp = (e.hp||1)-1; if (e.hp<=0) breakBox(e); }
                    }
                }
                PROJECTILES.splice(i, 1);
            }
        } else if (proj.type === 'slicer') {
            proj.delayTimer -= dt;
            if (proj.delayTimer <= 0) {
                let target = proj.targets[proj.currentIndex];
                let p = proj.owner;
                
                if (target && target.hp > 0) {
                    let myDex = p.baseStats.dex;
                    if (p.equip.weapon && p.equip.weapon.dex) myDex += p.equip.weapon.dex;
                    if (p.equip.armor) {
                        if (p.equip.armor.dex) myDex += p.equip.armor.dex;
                        if (p.equip.armor.slottedUnits) {
                            p.equip.armor.slottedUnits.forEach(u => { if (u && u.dex) myDex += u.dex; });
                        }
                    }
                    let targetEvi = target.evi || 10;
                    let hitRate = myDex - (targetEvi * 0.2);
                    
                    let distFromPlayer = Math.hypot(target.x - p.x, target.y - p.y);
                    hitRate -= (distFromPlayer / 10);
                    
                    addEffect('bullet', { x1: proj.x, y1: proj.y, x2: target.x, y2: target.y, color: '#00ffff' });
                    // Additional particle effects for slicer to make it obvious
                    for(let k = 0; k < 8; k++) {
                        addEffect('particle', { x: target.x, y: target.y, color: '#00ffff', r: 3 });
                    }
                    
                    if (Math.random() * 100 > hitRate) {
                        addFloatingText(target.x, target.y - 20, "miss", 'white');
                    } else {
                        let comboMult = [0.9, 1.7, 2.5][proj.comboCount - 1] || 1.0;
                        let isCrit = (Math.random() * 100) < (p.baseStats.luck / 5);
                        let critMult = isCrit ? 1.5 : 1.0;
                        let defenderDef = target.def || 5;
                        let baseDmg = (p.atk - (defenderDef / 5)) * critMult;
                        if (baseDmg < 1) baseDmg = 1;
                        let dmg = Math.floor(baseDmg * comboMult);
                        
                        let action = p.palette[p.paletteIndex];
                        if (action && action.attrs && action.attrs.native) dmg = Math.floor(dmg * 1.2);
                        
                        target.hp -= dmg;
                        target.stunTimer = 1.0;
                        addFloatingText(target.x, target.y - 20, dmg, 'white');
                        console.log(`Slicer hit! Enemy HP: ${target.hp}`);
                        
                        if (proj.comboCount === 3 && action && action.enchant && !action.isUnidentified) {
                            let ench = ENCHANTS.find(e => e.id === action.enchant);
                            if (ench) {
                                p.debugInfo.push(`Enchant: ${ench.name}!`);
                                if (ench.type === 'add_dmg') {
                                    let edmg = Math.floor(ench.value(p.level));
                                    target.hp -= edmg;
                                    addFloatingText(target.x, target.y - 40, edmg, 'white');
                                } else if (ench.type === 'drain') {
                                    let heal = Math.floor(target.hp * ench.drainPercent);
                                    p.hp = Math.min(p.maxHp, p.hp + heal);
                                    addFloatingText(p.x, p.y - 20, heal, '#33ff33');
                                }
                            }
                        }
                    }
                    
                    proj.x = target.x;
                    proj.y = target.y;
                }
                
                proj.currentIndex++;
                if (proj.currentIndex >= proj.targets.length) {
                    proj.life = 0;
                } else {
                    proj.delayTimer = 0.05;
                }
            }
            if (proj.life <= 0) PROJECTILES.splice(i, 1);
        }
    }
}
function hitEnemyWithMagic(target, proj) {
    target.hp -= proj.dmg;
    target.stunTimer = 1.0;
    addFloatingText(target.x, target.y - 20, proj.dmg, '#ffaa00');
    console.log(`Magic hit! Enemy HP: ${target.hp}`);
}
function drawProjectiles(ctx) {
    PROJECTILES.forEach(proj => {
        if (proj.type === 'fire' || proj.type === 'gifoie') {
            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.r, 0, Math.PI*2);
            ctx.fill();
        }
    });
}

// --- Effects System ---
let EFFECTS = [];
function addEffect(type, data) {
    EFFECTS.push({ type: type, data: data, life: 0.2, maxLife: 0.2 });
}
function updateEffects(dt) {
    for (let i = EFFECTS.length - 1; i >= 0; i--) {
        EFFECTS[i].life -= dt;
        if (EFFECTS[i].life <= 0) EFFECTS.splice(i, 1);
    }
}
function drawEffects(ctx) {
    ctx.save();
    EFFECTS.forEach(ef => {
        let p = ef.life / ef.maxLife; // 1 to 0
        ctx.globalAlpha = p;
        if (ef.type === 'slash') {
            let curAngle = ef.data.startAngle + (ef.data.endAngle - ef.data.startAngle) * Math.max(0, 1.0 - p); // sweep progress
            let sweepDist = (ef.data.endAngle - ef.data.startAngle) * 0.5; // length of tail is half of total arc
            
            ctx.beginPath();
            ctx.arc(ef.data.cx, ef.data.cy, ef.data.r, curAngle - sweepDist, curAngle, ef.data.anticlockwise);
            ctx.strokeStyle = ef.data.color;
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Add a subtle inner glow line for particle-like look
            ctx.beginPath();
            ctx.arc(ef.data.cx, ef.data.cy, ef.data.r, curAngle - sweepDist, curAngle, ef.data.anticlockwise);
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (ef.type === 'bullet') {
            ctx.globalAlpha = Math.max(0.6, p); // Decrease transparency
            ctx.beginPath();
            ctx.moveTo(ef.data.x1, ef.data.y1);
            let cx = ef.data.x1 + (ef.data.x2 - ef.data.x1) * (1-p);
            let cy = ef.data.y1 + (ef.data.y2 - ef.data.y1) * (1-p);
            ctx.lineTo(cx, cy);
            ctx.strokeStyle = ef.data.color;
            ctx.lineWidth = 4; // Increase width by 2px
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI*2);
            ctx.fillStyle = ef.data.color;
            ctx.fill();
        } else if (ef.type === 'particle') {
            ctx.beginPath();
            ctx.arc(ef.data.x, ef.data.y, ef.data.r * p, 0, Math.PI*2);
            ctx.fillStyle = ef.data.color;
            ctx.fill();
        } else if (ef.type === 'explosion') {
            ctx.beginPath();
            ctx.arc(ef.data.x, ef.data.y, ef.data.r, 0, Math.PI*2);
            ctx.fillStyle = 'orange';
            ctx.fill();
            if (ef.data.lv >= 11) {
                for (let i=0; i<3; i++) {
                    let ang = Math.random() * Math.PI * 2;
                    let ex = ef.data.x + Math.cos(ang)*ef.data.r;
                    let ey = ef.data.y + Math.sin(ang)*ef.data.r;
                    ctx.beginPath();
                    ctx.arc(ex, ey, ef.data.r/2, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
    });
    ctx.restore();
}

function gainExp(p, amount) {
    p.exp += amount;
    addFloatingText(p.x, p.y - 40, `+${amount} EXP`, '#e066ff');
    if (p.exp >= p.nextExp) {
        p.exp -= p.nextExp;
        p.level++;
        p.nextExp = Math.floor(((p.level - 1) * 100) + 50 + (Math.pow(p.level, 3) / 15));
        
        let cdata = CLASS_DATA[p.classId];
        let lu = cdata.levelUp;
        p.baseStats.maxHp += lu.hp;
        p.baseStats.maxMp += lu.mp;
        p.baseStats.atk += lu.atk;
        p.baseStats.def += lu.def;
        p.baseStats.dex += lu.dex;
        p.baseStats.mind += lu.mind;
        p.baseStats.luck += lu.luck;
        p.baseStats.spd += lu.spd;
        
        p.hp = p.baseStats.maxHp;
        p.mp = p.baseStats.maxMp;
        p.recalculateStats();
        
        let msg = `LEVEL UP!\nLv ${p.level}\nHP +${lu.hp}\nMP +${lu.mp}\nPOW +${lu.atk}\nDEF +${lu.def}\nDEX +${lu.dex}\nMIND +${lu.mind}`;
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
                EXP: ${p.exp} / ${p.nextExp} <br>
                HP: ${Math.floor(p.hp)} / ${p.maxHp} <br>
                MP: ${Math.floor(p.mp)} / ${p.maxMp} <br>
                POW: ${p.atk} <br>
                DEF: ${p.def} <br>
                DEX: ${p.dex} <br>
                MIND: 40 <br>
                EIV: 30 <br>
                LUCK: 10 <br>
                所持コイン: ${p.coins} <br>
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
            e.preventDefault();
            div.setPointerCapture(e.pointerId);
            dndState = { item: item, clone: null, pid: pid, startX: e.clientX, startY: e.clientY, startTime: Date.now(), source: isMagic ? 'magic' : 'inv', slotIdx: -1, isEquipable: isEquipable };
        });

        invEl.appendChild(div);

        if (!isMagic && item.type === 'armor' && item.slottedUnits) {
            item.slottedUnits.forEach((u, i) => {
                let uDiv = document.createElement('div');
                uDiv.className = 'menu-item';
                uDiv.style.marginLeft = '10px';
                uDiv.style.width = 'calc(100% - 14px)';
                uDiv.style.backgroundColor = '#333';
                uDiv.style.color = '#888';
                uDiv.style.borderColor = '#555';
                uDiv.style.minHeight = '24px';
                uDiv.style.padding = '5px';
                uDiv.innerHTML = `<span>┗ [Slot ${i+1}] ${u ? u.name : '空'}</span>`;
                invEl.appendChild(uDiv);
            });
        }
    });
}

// Global touch handlers for drag and drop
window.addEventListener('pointermove', (e) => {
    if (dndState.item) {
        let dx = e.clientX - dndState.startX;
        let dy = e.clientY - dndState.startY;
        if (Math.hypot(dx, dy) > 10) {
            clearTimeout(dndState.longPressTimer);
            if (!dndState.clone && dndState.isEquipable !== false) {
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
            if (dndState.clone) {
                dndState.clone.style.left = e.clientX - 50 + 'px';
                dndState.clone.style.top = e.clientY - 20 + 'px';
            }
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
        let waveStr = "";
        if (GAME.mode === 'map' && p.roomId && GAME.rooms) {
            let r = GAME.rooms.find(rm => rm.id === p.roomId);
            if (r && r.waves && r.waves.length > 0 && !r.cleared) {
                let symbols = [];
                for (let i = 0; i < r.waves.length; i++) {
                    if (i < r.currentWave) symbols.push("◉");
                    else symbols.push("◎");
                }
                waveStr = "  " + symbols.join("-");
            }
        }
        
        document.getElementById(`info-${idstr}`).innerText = `Lv.${p.level} ${cdata.name}`;
        
        let waveElem = document.getElementById(`wave-${idstr}`);
        if (waveElem) waveElem.innerText = waveStr.trim() !== "" ? waveStr.trim() : "";
        
        updatePaletteUI(p.id);
    });
}

function updatePaletteUI(pid) {
    let p = GAME.players[pid];
    let idstr = `${pid + 1}p`;
    
    let leftIdx = (p.paletteIndex - 1 + 6) % 6;
    let rightIdx = (p.paletteIndex + 1) % 6;
    
    document.querySelector(`#pal-${idstr}-left .slot-name`).innerText = p.palette[leftIdx] ? p.palette[leftIdx].name.substring(0,8) : '';
    document.querySelector(`#pal-${idstr}-center .slot-name`).innerText = p.palette[p.paletteIndex] ? p.palette[p.paletteIndex].name.substring(0,12) : '空';
    document.querySelector(`#pal-${idstr}-right .slot-name`).innerText = p.palette[rightIdx] ? p.palette[rightIdx].name.substring(0,8) : '';
}

function hitPlayer(p, e) {
    if (p.invincibleTimer > 0 || p.state === 'dead') return;
    
    let targetEvi = p.baseStats.evi;
    if (p.equip.armor) {
        if (p.equip.armor.evi) targetEvi += p.equip.armor.evi;
        if (p.equip.armor.slottedUnits) {
            p.equip.armor.slottedUnits.forEach(u => { if (u && u.evi) targetEvi += u.evi; });
        }
    }
    
    let hitRate = (e.dex || 10) - (targetEvi * 0.2);
    if (Math.random() * 100 > hitRate) {
        addFloatingText(p.x, p.y - 20, "miss", 'white');
        return;
    }
    
    let isCrit = (Math.random() * 100) < ((e.luck || 10) / 5); // Enemy luck is 10
    let critMult = isCrit ? 1.5 : 1.0;
    let defenderDef = p.def;
    let baseDmg = (e.atk - (defenderDef / 5)) * critMult;
    if (baseDmg < 1) baseDmg = 1;
    let dmg = Math.floor(baseDmg);
    
    p.hp -= dmg;
    p.invincibleTimer = 1.0; // 1s invincibility
    addFloatingText(p.x, p.y - 20, dmg, '#ff3333');
    if (p.menuOpen) {
        p.menuOpen = false;
        let menuEl = document.getElementById(`menu-${p.id + 1}p`);
        if (menuEl) menuEl.classList.remove('open');
    }
}

// Helper: line intersection with grid walls
function checkLineOfSight(x1, y1, x2, y2, blockHoles = false) {
    if (GAME.mode !== 'map' || !GAME.grid) return null;
    let ts = 50;
    let h = GAME.grid.length;
    let w = GAME.grid[0].length;
    
    let dist = Math.hypot(x2 - x1, y2 - y1);
    if (dist === 0) return null;
    let steps = Math.ceil(dist / (ts / 4));
    let dx = (x2 - x1) / steps;
    let dy = (y2 - y1) / steps;
    
    let cx = x1;
    let cy = y1;
    for (let i = 0; i <= steps; i++) {
        let r = Math.floor(cy / ts);
        let c = Math.floor(cx / ts);
        if (r >= 0 && r < h && c >= 0 && c < w) {
            let tile = GAME.grid[r][c];
            if (tile === 0 || (blockHoles && tile === 2)) {
                return { x: cx, y: cy };
            }
        }
        cx += dx;
        cy += dy;
    }
    return null;
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
            let minDist = (a.radius || 10) + (b.radius || 10);
            let requiredDist = minDist + 3; // Must be at least 3px apart
            
            if (dist < requiredDist) {
                let overlap = requiredDist - dist;
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
    // Grid Wall collisions
    if (GAME.mode === 'map' && GAME.grid) {
        let ts = 50;
        let h = GAME.grid.length;
        let w = GAME.grid[0].length;
        for (let a of entities) {
            let leftCol = Math.floor((a.x - a.radius) / ts);
            let rightCol = Math.floor((a.x + a.radius) / ts);
            let topRow = Math.floor((a.y - a.radius) / ts);
            let bottomRow = Math.floor((a.y + a.radius) / ts);
            
            for (let r = topRow; r <= bottomRow; r++) {
                for (let c = leftCol; c <= rightCol; c++) {
                    if (r < 0 || r >= h || c < 0 || c >= w) continue;
                    let tile = GAME.grid[r][c];
                    let solid = (tile === 0);
                    if (tile === 2 && a instanceof Player) solid = true; // holes block players
                    if (tile === 2 && a instanceof Enemy) solid = true; // holes block current enemies
                    
                    if (solid) {
                        let rx = c * ts;
                        let ry = r * ts;
                        let cx = Math.max(rx, Math.min(a.x, rx + ts));
                        let cy = Math.max(ry, Math.min(a.y, ry + ts));
                        let dx = a.x - cx;
                        let dy = a.y - cy;
                        let dist = Math.hypot(dx, dy);
                        if (dist < a.radius) {
                            let overlap = a.radius - dist;
                            let nx = dx / (dist || 1);
                            let ny = dy / (dist || 1);
                            if (dist === 0) { nx = 1; ny = 0; }
                            a.x += nx * overlap;
                            a.y += ny * overlap;
                            
                            if (a instanceof Enemy && a.type === 'hildebear' && a.state === 'jump') {
                                a.state = 'chase';
                                a.invincible = false;
                                a.spd = a.baseSpd;
                            }
                        }
                    }
                }
            }
        }
    }
}

function updateRooms(dt) {
    if (GAME.mode !== 'map' || !GAME.rooms) return;
    
    let p = GAME.players[0];
    if (!p || p.state === 'dead') return;
    
    let ts = 50;
    let gridX = Math.floor(p.x / ts);
    let gridY = Math.floor(p.y / ts);
    
    let insideAny = false;
    GAME.rooms.forEach(r => {
        let inside = (gridX >= r.x && gridX < r.x + r.w && gridY >= r.y && gridY < r.y + r.h);
        
        if (inside) {
            insideAny = true;
            p.roomId = r.id;
        }
        
        if (inside && !r.active && !r.cleared) {
            r.active = true;
            if (r.currentWave === -1) r.currentWave = 0;
            spawnWave(r);
        } else if (!inside && r.active) {
            r.active = false;
            // Despawn enemies
            GAME.enemies = GAME.enemies.filter(e => e.roomId !== r.id);
        }
        
        if (r.active && !r.cleared) {
            // Check if current wave enemies are dead
            let aliveEnemies = GAME.enemies.filter(e => e.roomId === r.id && e.hp > 0);
            // We need to know if the wave was actually spawned to prevent instant clear if wave was empty
            // But wave.enemies is populated.
            if (aliveEnemies.length === 0) {
                r.currentWave++;
                if (r.currentWave >= r.waves.length) {
                    r.cleared = true;
                    if (r.doors) {
                        r.doors.forEach(dDef => {
                            let door = GAME.doors.find(d => d.id === dDef.id);
                            if (door) {
                                door.open = true;
                                for (let dy = 0; dy < door.h; dy++) {
                                    for (let dx = 0; dx < door.w; dx++) {
                                        if (GAME.grid[door.y + dy]) GAME.grid[door.y + dy][door.x + dx] = 1;
                                    }
                                }
                            }
                        });
                    }
                    addFloatingText(p.x, p.y - 50, 'ROOM CLEARED!', 'cyan');
                } else {
                    spawnWave(r);
                }
            }
        }
    });
    if (!insideAny) p.roomId = null;
}

function updateGimmicks(dt) {
    if (GAME.mode !== 'map') return;
    let p = GAME.players[0];
    if (!p || p.state === 'dead') return;
    
    // Switches
    if (GAME.switches) {
        GAME.switches.forEach(sw => {
            if (!sw.pressed) {
                let dx = Math.abs(p.x - (sw.x * 50 + 25));
                let dy = Math.abs(p.y - (sw.y * 50 + 25));
                if (dx < 20 && dy < 20) {
                    sw.pressed = true;
                    // Open target doors
                    if (sw.targetDoors) {
                        sw.targetDoors.forEach(tid => {
                            let d = GAME.doors.find(d => d.id === tid);
                            if (d && !d.open) {
                                d.open = true;
                                for (let dY = 0; dY < d.h; dY++) {
                                    for (let dX = 0; dX < d.w; dX++) {
                                        if (GAME.grid[d.y + dY]) GAME.grid[d.y + dY][d.x + dX] = 1;
                                    }
                                }
                            }
                        });
                    }
                }
            }
        });
    }
    
    // Auto Events
    if (GAME.events) {
        if (!GAME.eventFlags) GAME.eventFlags = {};
        GAME.events.forEach(ev => {
            if (ev.type === 'auto' && !GAME.eventFlags[ev.id]) {
                let dx = Math.abs(p.x - (ev.x * 50 + 25));
                let dy = Math.abs(p.y - (ev.y * 50 + 25));
                if (dx < 25 && dy < 25) {
                    GAME.eventFlags[ev.id] = true;
                    alert(ev.message);
                }
            }
        });
    }
}

function spawnWave(r) {
    if (r.currentWave >= r.waves.length) return;
    let wave = r.waves[r.currentWave];
    GAME.enemies = GAME.enemies.filter(e => e.roomId !== r.id);
    if (wave.enemies) {
        wave.enemies.forEach((ed, idx) => {
            if (ed.dead) return;
            let e = new Enemy(ed.type, ed.x * 50 + 25, ed.y * 50 + 25);
            e.roomId = r.id;
            e.waveIdx = r.currentWave;
            e.enemyIdx = idx;
            GAME.enemies.push(e);
        });
    }
}

function breakBox(b) {
    if (GAME.boxes) {
        GAME.boxes = GAME.boxes.filter(box => box !== b);
        addEffect('explosion', { x: b.x, y: b.y, r: 20 });
        if (Math.random() < 0.5) {
            let rand = Math.random();
            let dropItem = null;
            if (rand < 0.15) dropItem = { id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50 };
            else if (rand < 0.3) dropItem = { id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30 };
            else if (rand < 0.5) {
                 let magics = [{id:'m_resta', name:'レスタ', m:'resta'}, {id:'m_fire', name:'ファイア', m:'fire'}, {id:'m_gifoie', name:'ギファイア', m:'gifoie'}, {id:'m_rafoie', name:'ラファイア', m:'rafoie'}];
                 let chosen = magics[Math.floor(Math.random() * magics.length)];
                 let lv = Math.floor(Math.random() * 3) + 1; // 1-3
                 dropItem = { id: chosen.id+'_'+lv, name: `${chosen.name}Lv${lv}ディスク`, type: 'disk', magic: chosen.m, lv: lv };
            }
            else if (rand < 0.7) {
                let baseWeapons = ['w_handgun', 'w_shotgun', 'w_saber', 'w_dagger', 'w_cane', 'w_slicer'];
                let baseId = baseWeapons[Math.floor(Math.random() * baseWeapons.length)];
                let enchant = null;
                if (Math.random() < 0.3) enchant = ['heat', 'shock', 'ice', 'panic', 'draw'][Math.floor(Math.random() * 5)];
                dropItem = generateWeapon(baseId, 0, enchant);
            }
            else dropItem = { id: 'i_coin', name: 'コイン', type: 'coin', amount: Math.floor(Math.random() * 50) + 10 };
            if (dropItem) GAME.drops.push({ x: b.x, y: b.y, item: dropItem });
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
                gainExp(GAME.players[0], e.exp || 10);
                
                let room = GAME.rooms.find(r => r.id === e.roomId);
                if (room && e.waveIdx !== undefined && e.enemyIdx !== undefined) {
                    if (room.waves[e.waveIdx] && room.waves[e.waveIdx].enemies[e.enemyIdx]) {
                        room.waves[e.waveIdx].enemies[e.enemyIdx].dead = true;
                    }
                }
                
                // Drop logic
                if (Math.random() < 0.2) {
                    let rand = Math.random();
                    let dropItem = null;
                    if (rand < 0.15) dropItem = { id: 'i_monomate', name: 'モノメイト', type: 'item', healHp: 50 };
                    else if (rand < 0.30) dropItem = { id: 'i_monofluid', name: 'モノフルイド', type: 'item', healMp: 30 };
                    else if (rand < 0.50) { // Armor
                        let extra = Math.floor(Math.random() * 3); // 0, 1, 2
                        let slots = Math.floor(Math.random() * 3); // 0, 1, 2
                        let arr = []; for(let i=0; i<slots; i++) arr.push(null);
                        let name = extra > 0 ? `アーマー+${extra}` : `アーマー`;
                        dropItem = { id: 'a_armor', name: name, type: 'armor', def: 10 + extra, slotCount: slots, slottedUnits: arr };
                    }
                    else if (rand < 0.70) { // Disk
                        let magics = [{id:'m_resta', name:'レスタ', m:'resta'}, {id:'m_fire', name:'ファイア', m:'fire'}, {id:'m_gifoie', name:'ギファイア', m:'gifoie'}, {id:'m_rafoie', name:'ラファイア', m:'rafoie'}];
                        let chosen = magics[Math.floor(Math.random() * magics.length)];
                        let lv = Math.floor(Math.random() * 3) + 1; // 1-3
                        dropItem = { id: chosen.id+'_'+lv, name: `${chosen.name}Lv${lv}ディスク`, type: 'disk', magic: chosen.m, lv: lv };
                    }
                    else if (rand < 0.90) { // Weapon
                        let baseWeapons = ['w_handgun', 'w_shotgun', 'w_saber', 'w_dagger', 'w_cane', 'w_slicer'];
                        let baseId = baseWeapons[Math.floor(Math.random() * baseWeapons.length)];
                        
                        let enchant = null;
                        if (Math.random() < 0.3) { // 30% chance for enchant
                            let enchants = ['heat', 'shock', 'ice', 'panic', 'draw'];
                            enchant = enchants[Math.floor(Math.random() * enchants.length)];
                        }
                        
                        let attrs = { native: 0, mutant: 0, machine: 0, dark: 0, hit: 0 };
                        if (Math.random() < 0.4) { // 40% chance for attributes
                            let attrNames = ['native', 'mutant', 'machine', 'dark', 'hit'];
                            let remaining = 30; // max total points
                            // Pick 1 to 3 attributes
                            let numAttrs = Math.floor(Math.random() * 3) + 1; 
                            for(let i=0; i<numAttrs; i++) {
                                let attr = attrNames[Math.floor(Math.random() * attrNames.length)];
                                let val = Math.min(remaining, Math.floor(Math.random() * 20) + 5); // 5 to 20 per attr
                                val = Math.ceil(val / 5) * 5; // round to nearest 5
                                if (val > remaining) val = remaining;
                                attrs[attr] = (attrs[attr] || 0) + val;
                                remaining -= val;
                                if (remaining <= 0) break;
                            }
                        }
                        dropItem = generateWeapon(baseId, 0, enchant, attrs);
                    }
                    
                    if (dropItem) {
                        GAME.drops.push({
                            x: e.x,
                            y: e.y,
                            item: dropItem
                        });
                    }
                }
            }
        });
        GAME.enemies = GAME.enemies.filter(e => e.hp > 0);
        GAME.enemies = GAME.enemies.filter(e => e.hp > 0);
        
        updateRooms(dt);
        updateGimmicks(dt);
        resolveCollisions(dt);
        
        // Target Drop
        GAME.players.forEach(p => {
            p.targetDrop = null;
            let closestDrop = null;
            let minDist = 25;
            GAME.drops.forEach(d => {
                let dist = Math.hypot(d.x - p.x, d.y - p.y);
                if (dist <= minDist) {
                    minDist = dist;
                    closestDrop = d;
                }
            });
            p.targetDrop = closestDrop;
        });

        updateProjectiles(dt);
        updateFloatingTexts(dt);
        updateEffects(dt);

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

    // Draw Map grid
    if (GAME.mode === 'map' && GAME.grid) {
        let ts = 50;
        let h = GAME.grid.length;
        let w = GAME.grid[0].length;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let px = x * ts;
                let py = y * ts;
                // Culling
                if (px + ts < GAME.cameraX || px > GAME.cameraX + SCREEN_W || py + ts < GAME.cameraY || py > GAME.cameraY + SCREEN_H) continue;
                
                let tile = GAME.grid[y][x];
                let spriteName = tile === 0 ? 'wall_1' : (tile === 2 ? 'tree' : 'grasses');
                
                if (PRE_RENDERED[spriteName]) {
                    ctx.drawImage(PRE_RENDERED[spriteName], px, py, ts, ts);
                } else {
                    if (tile === 0) {
                        ctx.fillStyle = '#333';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.strokeStyle = '#111';
                        ctx.strokeRect(px, py, ts, ts);
                    } else if (tile === 1) {
                        ctx.fillStyle = '#1a1a1a';
                        ctx.fillRect(px, py, ts, ts);
                        ctx.strokeStyle = '#222';
                        ctx.strokeRect(px, py, ts, ts);
                    } else if (tile === 2) {
                        ctx.fillStyle = '#000';
                        ctx.fillRect(px, py, ts, ts);
                    }
                }
            }
        }
        
        // Draw Doors as sprites if needed (for now grid 0 handles wall)
        GAME.doors.forEach(d => {
            if (!d.open) {
                ctx.fillStyle = '#663300';
                ctx.fillRect(d.x * 50, d.y * 50, d.w * 50, d.h * 50);
                ctx.strokeStyle = '#ff9900';
                ctx.strokeRect(d.x * 50, d.y * 50, d.w * 50, d.h * 50);
            }
        });
        
        // Draw Switches
        if (GAME.switches) {
            GAME.switches.forEach(sw => {
                ctx.fillStyle = sw.pressed ? '#88cc88' : '#cc8888';
                ctx.beginPath();
                ctx.arc(sw.x * 50 + 25, sw.y * 50 + 25, 15, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            });
        }
        
        // Draw Events
        if (GAME.events) {
            GAME.events.forEach(ev => {
                ctx.fillStyle = ev.type === 'action' ? 'rgba(255, 255, 0, 0.4)' : 'rgba(0, 255, 0, 0.4)';
                ctx.fillRect(ev.x * 50 + 10, ev.y * 50 + 10, 30, 30);
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('EV', ev.x * 50 + 25, ev.y * 50 + 28);
            });
        }

        // Draw Boxes
        if (GAME.boxes) {
            GAME.boxes.forEach(b => {
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(b.x - 15, b.y - 15, 30, 30);
                ctx.strokeStyle = '#5c3a21';
                ctx.strokeRect(b.x - 15, b.y - 15, 30, 30);
            });
        }
        
        // Draw Teleporters
        GAME.teleporters.forEach(t => {
            ctx.fillStyle = t.type === 'town' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 0, 255, 0.3)';
            ctx.strokeStyle = t.type === 'town' ? 'cyan' : 'magenta';
            ctx.beginPath();
            ctx.arc(t.x * 50 + 25, t.y * 50 + 25, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(t.type === 'town' ? 'Town' : 'Next', t.x * 50 + 25, t.y * 50 + 30);
        });
    }



    if (GAME.mode === 'town') {
        if (MAP_DATA.town.walls) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            MAP_DATA.town.walls.forEach(w => {
                ctx.fillRect(w.x, w.y, w.width, w.height);
                ctx.strokeRect(w.x, w.y, w.width, w.height);
            });
        }
        
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
        GAME.particles.forEach(p => p.draw(ctx));
        drawProjectiles(ctx);
        drawEffects(ctx);
        
        // Draw Drops
        GAME.drops.forEach(d => {
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.rotate(Math.PI / 4); // diamond
            let size = 8;
            if (d.item.type === 'item' || d.item.type === 'disk') ctx.fillStyle = '#00ff00';
            else if (d.item.type === 'armor' || d.item.type === 'unit') ctx.fillStyle = '#00ffff';
            else if (d.item.type === 'weapon') ctx.fillStyle = '#ffa500';
            else if (d.item.type === 'coin') { ctx.fillStyle = '#ffff00'; size = 5; }
            else ctx.fillStyle = '#ffffff';
            
            ctx.fillRect(-size/2, -size/2, size, size);
            ctx.restore();
        });

        drawFloatingTexts(ctx);
        drawLevelUpUI(ctx);
    }

    GAME.players.forEach(p => p.draw(ctx));

    ctx.restore();
    
    // Draw target drop / enemy UI on right side
    let p1 = GAME.players[0];
    if (p1) {
        let drawInfoBox = (title, lines) => {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 100, 0.7)';
            ctx.fillRect(SCREEN_W - 160, SCREEN_H / 2 - 30, 150, 60);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(SCREEN_W - 160, SCREEN_H / 2 - 30, 150, 60);
            
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            
            ctx.fillText(title, SCREEN_W - 150, SCREEN_H / 2 - 12);
            lines.forEach((line, i) => {
                ctx.fillText(line, SCREEN_W - 150, SCREEN_H / 2 + 5 + (i * 15));
            });
            ctx.restore();
        };

        if (p1.targetDrop) {
            let name = p1.targetDrop.item.name;
            if (p1.targetDrop.item.type === 'coin') name = p1.targetDrop.item.amount + name;
            drawInfoBox(name, []);
        } else if (p1.mainTarget) {
            let t = p1.mainTarget;
            let isBoxTarget = !!(GAME.boxes && GAME.boxes.includes(t));
            if (isBoxTarget) {
                drawInfoBox("アイテムボックス", []);
            } else if (t.hp > 0) {
                let name = t.type;
                if (t.type === 'booma') name = "ブーマ";
                else if (t.type === 'gobooma') name = "ゴブーマ";
                else if (t.type === 'jigobooma') name = "ジゴブーマ";
                else if (t.type === 'hildebear') name = "ヒルデベア";
                
                drawInfoBox(name, [`属性: Native`, `HP: ${t.hp} / ${t.maxHp}`]);
            }
        }
    }
    
    drawLevelUpUI(ctx);
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// Init
window.onload = async () => {
    await loadAssets();
    await loadMapData();
    GAME.walls = [
        {x: 200, y: 150, w: 100, h: 50},
        {x: 400, y: 300, w: 50, h: 100}
    ];

    // DOM bindings
    document.getElementById('btn-start-1p').onclick = () => {
        document.getElementById('screen-title').style.display = 'none';
        document.getElementById('screen-class').style.display = 'flex';
        GAME.is2P = false;
    };
    
    // Continuous Scrolling Logic
    let scrollInterval = null;
    function setupScrollBtn(id, targetId, direction) {
        let btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            let el = document.getElementById(targetId);
            if (!el) return;
            if (scrollInterval) clearInterval(scrollInterval);
            scrollInterval = setInterval(() => {
                el.scrollTop += direction * 15;
            }, 30);
        });
        btn.addEventListener('pointerup', () => { if (scrollInterval) clearInterval(scrollInterval); });
        btn.addEventListener('pointerleave', () => { if (scrollInterval) clearInterval(scrollInterval); });
        btn.addEventListener('pointercancel', () => { if (scrollInterval) clearInterval(scrollInterval); });
    }
    
    setupScrollBtn('scroll-inv-up', 'menu-list-1p', -1);
    setupScrollBtn('scroll-inv-down', 'menu-list-1p', 1);
    setupScrollBtn('scroll-mag-up', 'menu-magic-1p', -1);
    setupScrollBtn('scroll-mag-down', 'menu-magic-1p', 1);
    setupScrollBtn('scroll-modal-up', 'modal-item-inventory', -1);
    setupScrollBtn('scroll-modal-down', 'modal-item-inventory', 1);
    setupScrollBtn('scroll-pal-inv-up', 'menu-palette-1p', -1);
    setupScrollBtn('scroll-pal-inv-down', 'menu-palette-1p', 1);
    setupScrollBtn('scroll-pal-mag-up', 'menu-palette-magic-1p', -1);
    setupScrollBtn('scroll-pal-mag-down', 'menu-palette-magic-1p', 1);
    
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

let currentShopPlayer = null;
let currentShopTab = 'buy';
let currentShopItem = null;

function openShopModal(p) {
    currentShopPlayer = p;
    currentShopTab = 'buy';
    document.getElementById('shop-modal').style.display = 'flex';
    document.getElementById('shop-subwindow').style.display = 'none';
    
    document.getElementById('btn-shop-close').onclick = () => {
        document.getElementById('shop-modal').style.display = 'none';
    };
    
    document.getElementById('tab-shop-buy').onclick = () => {
        currentShopTab = 'buy';
        document.getElementById('tab-shop-buy').classList.add('active');
        document.getElementById('tab-shop-buy').style.borderColor = '#ffcc00';
        document.getElementById('tab-shop-sell').classList.remove('active');
        document.getElementById('tab-shop-sell').style.borderColor = 'transparent';
        document.getElementById('shop-subwindow').style.display = 'none';
        renderShopList();
    };
    
    document.getElementById('tab-shop-sell').onclick = () => {
        currentShopTab = 'sell';
        document.getElementById('tab-shop-sell').classList.add('active');
        document.getElementById('tab-shop-sell').style.borderColor = '#ffcc00';
        document.getElementById('tab-shop-buy').classList.remove('active');
        document.getElementById('tab-shop-buy').style.borderColor = 'transparent';
        document.getElementById('shop-subwindow').style.display = 'none';
        renderShopList();
    };
    
    renderShopList();
}

function renderShopList() {
    let listEl = document.getElementById('shop-item-list');
    listEl.innerHTML = '';
    document.getElementById('shop-meseta').innerText = currentShopPlayer.meseta || 0;
    
    let items = [];
    if (currentShopTab === 'buy') {
        items = GAME.shopItems;
    } else {
        items = currentShopPlayer.inventory.filter(i => i !== null);
        let typeOrder = { 'weapon': 1, 'armor': 2, 'unit': 3, 'item': 4, 'disk': 5 };
        items.sort((a, b) => {
            let aEquip = (currentShopPlayer.equip && currentShopPlayer.equip.armor === a || currentShopPlayer.palette.includes(a)) ? 0 : 1;
            let bEquip = (currentShopPlayer.equip && currentShopPlayer.equip.armor === b || currentShopPlayer.palette.includes(b)) ? 0 : 1;
            if (aEquip !== bEquip) return aEquip - bEquip;
            let aT = typeOrder[a.type] || 99;
            let bT = typeOrder[b.type] || 99;
            if (aT !== bT) return aT - bT;
            return (a.id || '').localeCompare(b.id || '');
        });
    }
    
    if (items.length === 0) {
        listEl.innerHTML = '<div style="color:#aaa; padding:10px;">アイテムがありません</div>';
        return;
    }
    
    items.forEach(item => {
        let div = document.createElement('div');
        div.className = 'menu-item';
        
        let isEquipped = currentShopPlayer.equip && currentShopPlayer.equip.armor === item;
        let isPalette = currentShopPlayer.palette.includes(item);
        
        let prefix = '';
        if (isEquipped || isPalette) prefix = '<span style="color:#00ff00;">E </span>';
        else if (item.isUnidentified) prefix = '<span style="color:#ff0000;">? </span>';
        
        div.innerHTML = prefix + item.name;
        
        // Indicate if selling is blocked because equipped
        if (currentShopTab === 'sell' && (isEquipped || isPalette)) {
            div.style.opacity = '0.5';
        }
        
        div.onclick = () => {
            if (currentShopTab === 'sell' && (isEquipped || isPalette)) return;
            showShopSubwindow(item);
        };
        listEl.appendChild(div);
    });
}

function showShopSubwindow(item) {
    currentShopItem = item;
    let sub = document.getElementById('shop-subwindow');
    sub.style.display = 'flex';
    
    document.getElementById('shop-sub-name').innerText = item.name;
    document.getElementById('shop-sub-desc').innerText = item.desc || (item.name + ' のアイテム');
    
    let stats = '';
    if (item.type === 'weapon') {
        stats = `POW: ${item.basePow || 0}`;
        if (item.enhance) stats += ` (+${item.enhance})`;
        stats += `<br>DEX: ${item.baseDex || 0}`;
        if (item.attrs) {
            let attrNames = { native: '原生生物', mutant: '突然変異', machine: '機械', dark: 'ダーク', hit: 'Hit' };
            for (let k in item.attrs) {
                if (item.attrs[k] > 0) stats += `<br>${attrNames[k]}: ${item.attrs[k]}%`;
            }
        }
    } else if (item.type === 'armor') {
        stats = `DEF: ${item.def || 0}<br>スロット: ${item.slotCount || 0}`;
    }
    document.getElementById('shop-sub-stats').innerHTML = stats;
    
    let price = getItemPrice(item);
    if (currentShopTab === 'sell') {
        price = Math.floor(price * 0.5);
    }
    document.getElementById('shop-sub-price').innerText = price + ' コイン';
    
    let btn = document.getElementById('btn-shop-action');
    btn.innerText = currentShopTab === 'buy' ? '購入' : '売却';
    
    if (currentShopTab === 'buy' && (currentShopPlayer.meseta || 0) < price) {
        btn.style.background = '#555';
        btn.style.pointerEvents = 'none';
    } else {
        btn.style.background = currentShopTab === 'buy' ? '#0066cc' : '#ff4444';
        btn.style.pointerEvents = 'auto';
    }
    
    btn.onclick = () => {
        if (currentShopTab === 'buy') {
            if ((currentShopPlayer.meseta || 0) >= price) {
                if (currentShopPlayer.inventory.filter(i => i !== null).length >= 30) {
                    alert('インベントリがいっぱいです！');
                    return;
                }
                currentShopPlayer.meseta -= price;
                let itemCopy = JSON.parse(JSON.stringify(item));
                itemCopy.uid = 'i_' + Date.now() + Math.floor(Math.random()*1000); 
                currentShopPlayer.inventory.push(itemCopy);
                
                document.getElementById('shop-subwindow').style.display = 'none';
                renderShopList();
            }
        } else {
            // Sell
            currentShopPlayer.meseta = (currentShopPlayer.meseta || 0) + price;
            currentShopPlayer.inventory = currentShopPlayer.inventory.filter(i => i !== item);
            document.getElementById('shop-subwindow').style.display = 'none';
            renderShopList();
        }
    };
}
