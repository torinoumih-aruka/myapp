// ----------------------------------------------------
// 3D Star Fox Clone - Main Logic
// ----------------------------------------------------

const STATE = { START: 0, PLAYING: 1, GAMEOVER: 2, CLEAR: 3 };
let currentState = STATE.START;

const container = document.getElementById('canvas-container');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const gameClearScreen = document.getElementById('game-clear-screen');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpBarBg = document.getElementById('hp-bar-bg');
const stageInfo = document.getElementById('stage-info');
const scoreDisplay = document.getElementById('score-display');
const finalScoreOver = document.getElementById('final-score-over');
const finalScoreClear = document.getElementById('final-score-clear');
const damageOverlay = document.getElementById('damage-overlay');

const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas.getContext('2d');
radarCanvas.width = 160;
radarCanvas.height = 160;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 50, 400);

const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.insertBefore(renderer.domElement, container.firstChild);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

// ----------------------------------------------------
// Game Objects & Variables
// ----------------------------------------------------
let gameTime = 0;
let lastTime = 0;
let baseSpeed = 50;
let currentSpeed = baseSpeed;
let score = 0;

const playerGeom = new THREE.ConeGeometry(3, 8, 4);
playerGeom.rotateX(Math.PI / 2);
const playerMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
const player = new THREE.Mesh(playerGeom, playerMat);
player.position.set(0, 5, 0);
scene.add(player);

let playerHP = 100;
let maxHP = 100;
let playerInvincible = 0; 
let cameraShakeTime = 0;
let lastFireTime = 0;
const fireRate = 0.15;

const camOffset = new THREE.Vector3(0, 10, 25);
const playerRadius = 3.5; 

const bullets = [];
const enemyBullets = [];
const enemies = [];
const scenery = [];
const formations = [];
const items = [];
const rings = [];
const particles = [];

let currentStageIdx = 0;
let ringsSpawned = 0;
let turretCount = 0;
let midbossSpawns = [];
let mountainRingSpawned = false;
let finalBossSpawned = false;

const stages = [
    { name: 'OCEAN', color: 0x1E90FF, duration: 20, sceneryType: 'none' },
    { name: 'CITY', color: 0x555555, duration: 100, sceneryType: 'city' },
    { name: 'MOUNTAINS', color: 0x27ae60, duration: 60, sceneryType: 'mountain' },
    { name: 'LAKE (BOSS)', color: 0x2980b9, duration: 60, sceneryType: 'none' }
];

const floorGeom = new THREE.PlaneGeometry(1500, 3000, 50, 100);
floorGeom.attributes.position.setUsage(THREE.DynamicDrawUsage);
const floorMat = new THREE.MeshLambertMaterial({ color: stages[0].color, wireframe: false });
const floor = new THREE.Mesh(floorGeom, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// ----------------------------------------------------
// Input / UI Logic
// ----------------------------------------------------
let joyActive = false;
let joyInput = { x: 0, y: 0 };
let isBoosting = false;
let isBraking = false;

const joyArea = document.getElementById('joystick-area');
const joyKnob = document.getElementById('joystick-knob');
let joyCenter = { x: 0, y: 0 };

joyArea.addEventListener('pointerdown', (e) => {
    if(currentState !== STATE.PLAYING) return;
    joyActive = true;
    const rect = joyArea.getBoundingClientRect();
    joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoystick(e);
});
document.addEventListener('pointermove', (e) => {
    if(joyActive) updateJoystick(e);
});
document.addEventListener('pointerup', () => {
    joyActive = false;
    joyInput = { x: 0, y: 0 };
    joyKnob.style.transform = `translate(0px, 0px)`;
});

function updateJoystick(e) {
    let dx = e.clientX - joyCenter.x;
    let dy = e.clientY - joyCenter.y;
    const maxDist = 40;
    const dist = Math.hypot(dx, dy);
    if(dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
    }
    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joyInput.x = dx / maxDist;
    joyInput.y = dy / maxDist;
}

document.getElementById('btn-boost').addEventListener('pointerdown', () => isBoosting = true);
document.getElementById('btn-boost').addEventListener('pointerup', () => isBoosting = false);
document.getElementById('btn-brake').addEventListener('pointerdown', () => isBraking = true);
document.getElementById('btn-brake').addEventListener('pointerup', () => isBraking = false);

// ----------------------------------------------------
// Game Functions
// ----------------------------------------------------
function updateHP() {
    hpBarFill.style.width = Math.max(0, (playerHP / maxHP) * 100) + '%';
    hpBarBg.style.width = maxHP + 'px';
    if(playerHP <= 0 && currentState === STATE.PLAYING) {
        gameOver();
    }
}

function damagePlayer(amt) {
    if(playerInvincible > 0) return;
    playerHP -= amt;
    updateHP();
    playerInvincible = 1.0; 
    playerMat.emissive.setHex(0xff0000);
    setTimeout(() => playerMat.emissive.setHex(0x000000), 200);
    
    cameraShakeTime = 0.5;
    damageOverlay.classList.add('damage-active');
    setTimeout(() => damageOverlay.classList.remove('damage-active'), 200);
}

function addScore(pts) {
    score += pts;
    scoreDisplay.innerText = "SCORE: " + score;
}

function fireBullet() {
    const geom = new THREE.BoxGeometry(0.5, 0.5, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(geom, mat);
    bullet.position.copy(player.position);
    bullet.position.z -= 3;
    scene.add(bullet);
    bullets.push({ mesh: bullet, life: 1.5 });
}

function fireEnemyBullet(pos, type, targetPos) {
    const geom = new THREE.BoxGeometry(1, 1, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const bullet = new THREE.Mesh(geom, mat);
    bullet.position.copy(pos);
    
    let vel = new THREE.Vector3(0, 0, 70); 
    let dmg = 10;
    
    if (type === 'red') {
        dmg = 10;
    } else if (type === 'blue' || type === 'turret') {
        dmg = 15;
        if (targetPos) vel.subVectors(targetPos, pos).normalize().multiplyScalar(100);
    } else if (type === 'midboss' || type === 'finalboss') {
        dmg = 20;
        if (targetPos) vel.subVectors(targetPos, pos).normalize().multiplyScalar(100);
    }
    
    scene.add(bullet);
    enemyBullets.push({ mesh: bullet, life: 4.0, vel: vel, dmg: dmg });
}

let formationIdCounter = 0;
function spawnEnemyFormation() {
    const formationSize = 3; 
    const fId = formationIdCounter++;
    const pattern = Math.floor(Math.random() * 4); 
    const startY = 10 + Math.random() * 30;
    const fObj = { id: fId, total: formationSize, killed: 0 };
    formations.push(fObj);
    const enemyGeom = new THREE.BoxGeometry(8, 8, 8); 

    let startX = 0;
    let startZ = player.position.z - 300;
    
    if (pattern === 0 || pattern === 1) {
        startX = (Math.random() - 0.5) * 80;
    } else if (pattern === 2) {
        startX = -150;
        startZ = player.position.z - 400; 
    } else if (pattern === 3) {
        startX = 150;
        startZ = player.position.z - 400; 
    }

    for(let i=0; i<formationSize; i++) {
        const enemyMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const enemy = new THREE.Mesh(enemyGeom, enemyMat);
        let ox = 0, oz = 0;
        if(pattern === 0) {
            ox = (i % 2 === 0 ? 1 : -1) * Math.ceil(i/2) * 12;
            oz = Math.ceil(i/2) * 12;
        } else if(pattern === 1) {
            ox = (i - (formationSize-1)/2) * 12;
        } else if(pattern === 2 || pattern === 3) {
            oz = i * 25; 
        }
        enemy.position.set(startX + ox, startY, startZ + oz);
        scene.add(enemy);
        
        const isLeader = (i === 0);
        const initialHp = isLeader ? 30 : 10;
        if(isLeader) enemyMat.color.setHex(0xaa0000); 

        enemies.push({ mesh: enemy, type: 'red', hp: initialHp, fId: fId, t: 0, startX: startX+ox, startY: startY, pattern: pattern, hitTimer: 0, isLeader: isLeader, hasShot: false });
    }
}

function spawnBlueEnemy() {
    const geom = new THREE.BoxGeometry(8, 8, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0x0000ff });
    const enemy = new THREE.Mesh(geom, mat);
    enemy.position.set((Math.random()-0.5)*100, 10 + Math.random()*40, player.position.z - 400);
    scene.add(enemy);
    enemies.push({ mesh: enemy, type: 'blue', hp: 30, t: 0, startX: enemy.position.x, startY: enemy.position.y, hitTimer: 0, shotCount: 0 });
}

function spawnMidBoss() {
    const geom = new THREE.BoxGeometry(25, 25, 25);
    const mat = new THREE.MeshLambertMaterial({ color: 0xff00ff });
    const boss = new THREE.Mesh(geom, mat);
    const side = Math.random() > 0.5 ? 1 : -1;
    boss.position.set(side * 150, 30, player.position.z - 150);
    scene.add(boss);
    enemies.push({ mesh: boss, type: 'midboss', hp: 150, t: 0, hitTimer: 0, shotCount: 0, state: 'enter', targetXY: new THREE.Vector2(0, 30), waitTimer: 0 });
}

function spawnFinalBoss() {
    const geom = new THREE.BoxGeometry(40, 40, 40);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const boss = new THREE.Mesh(geom, mat);
    boss.position.set(0, 100, player.position.z - 300);
    scene.add(boss);
    
    enemies.push({ 
        mesh: boss, 
        type: 'finalboss', 
        hp: 500, // 50 shots
        t: 0, 
        hitTimer: 0, 
        shotCount: 0, 
        state: 'enter', 
        targetXY: new THREE.Vector2(0, 30), 
        waitTimer: 0,
        phase2: false,
        turretTimer: 0
    });
}

function spawnBossParticles(pos) {
    const geom = new THREE.BoxGeometry(6, 6, 6);
    const mat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const count = 5 + Math.floor(Math.random() * 4); // 5 to 8
    for(let i=0; i<count; i++) {
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(pos);
        mesh.position.x += (Math.random()-0.5)*20;
        mesh.position.y += (Math.random()-0.5)*20;
        mesh.position.z += (Math.random()-0.5)*20;
        scene.add(mesh);
        
        particles.push({
            mesh: mesh,
            vx: (Math.random()-0.5)*30,
            vy: 20 + Math.random()*20,
            vz: (Math.random()-0.5)*30,
            life: 3.0
        });
    }
}

function spawnTurret(spawnZ) {
    const geom = new THREE.BoxGeometry(10, 10, 10);
    const mat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set((Math.random()-0.5)*80, 5, spawnZ);
    addSceneryObj(mesh); 
    enemies.push({ mesh: mesh, type: 'turret', hp: 50, hitTimer: 0, burstCount: 0, burstTimer: 0 });
    turretCount++;
}

function spawnItem(pos) {
    const geom = new THREE.BoxGeometry(5, 5, 5);
    const mat = new THREE.MeshLambertMaterial({ color: 0x00ff00 }); 
    const item = new THREE.Mesh(geom, mat);
    item.position.copy(pos);
    scene.add(item);
    items.push({ mesh: item });
}

function spawnRing(spawnZ) {
    const geom = new THREE.TorusGeometry(12, 2, 8, 20);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });
    const ring = new THREE.Mesh(geom, mat);
    ring.position.set((Math.random()-0.5)*80, 15 + Math.random()*20, spawnZ);
    scene.add(ring);
    rings.push({ mesh: ring });
}

function addSceneryObj(mesh, type='box', radius=0, height=0) {
    scene.add(mesh);
    scenery.push({ mesh: mesh, type: type, radius: radius, height: height, box: new THREE.Box3().setFromObject(mesh) });
}

let lastScenerySpawn = 0;
function spawnScenery() {
    const type = stages[currentStageIdx].sceneryType;
    if(type === 'none') return;
    
    let spawnZ = player.position.z - 600;

    if(type === 'city') {
        if(ringsSpawned < 2 && Math.random() < 0.05) {
            spawnRing(spawnZ);
            ringsSpawned++;
        }
        
        if(turretCount < 10 && Math.random() < 0.1) {
            spawnTurret(spawnZ);
        } else {
            const cityPattern = Math.random();
            const cityMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
            const houseMat = new THREE.MeshLambertMaterial({ color: 0x995555 });
            const lightMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });

            if(cityPattern < 0.3) {
                const geom = new THREE.BoxGeometry(15, 40 + Math.random()*60, 15);
                const mesh = new THREE.Mesh(geom, cityMat);
                const side = Math.random() > 0.5 ? 1 : -1;
                mesh.position.set(side * (30 + Math.random() * 60), mesh.geometry.parameters.height/2, spawnZ);
                addSceneryObj(mesh);
            } else if(cityPattern < 0.5) {
                const geom = new THREE.BoxGeometry(20, 50, 20);
                const mesh = new THREE.Mesh(geom, cityMat);
                mesh.position.set((Math.random()-0.5)*40, 25, spawnZ);
                addSceneryObj(mesh);
            } else if(cityPattern < 0.8) {
                const geom = new THREE.BoxGeometry(15, 10, 15);
                const mesh = new THREE.Mesh(geom, houseMat);
                mesh.position.set((Math.random()-0.5)*80, 5, spawnZ);
                addSceneryObj(mesh);
            } else if(cityPattern < 0.9) {
                const geom = new THREE.BoxGeometry(1, 20, 1);
                const mesh = new THREE.Mesh(geom, lightMat);
                const side = Math.random() > 0.5 ? 1 : -1;
                mesh.position.set(side * 20, 10, spawnZ);
                addSceneryObj(mesh);
            } else {
                const w = 40 + Math.random() * 60;
                const h = 20 + Math.random() * 30;
                const cx = (Math.random() - 0.5) * 60;
                
                const pGeom = new THREE.BoxGeometry(4, h, 10);
                const p1 = new THREE.Mesh(pGeom, cityMat);
                p1.position.set(cx - w/2, h/2, spawnZ);
                addSceneryObj(p1);
                
                const p2 = new THREE.Mesh(pGeom, cityMat);
                p2.position.set(cx + w/2, h/2, spawnZ);
                addSceneryObj(p2);
                
                const rGeom = new THREE.BoxGeometry(w+4, 4, 10);
                const roof = new THREE.Mesh(rGeom, cityMat);
                roof.position.set(cx, h, spawnZ);
                addSceneryObj(roof);
            }
        }
    } else if(type === 'mountain') {
        if(Math.random() < 0.8) {
            let radius = 20 + Math.random()*30;
            let height = 60 + Math.random()*80;
            const geom = new THREE.ConeGeometry(radius, height, 4);
            const mat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
            const mesh = new THREE.Mesh(geom, mat);
            const side = Math.random() > 0.5 ? 1 : -1;
            mesh.position.set(side * (40 + Math.random() * 80), height/2, spawnZ);
            addSceneryObj(mesh, 'cone', radius, height);
        } else {
            const geom = new THREE.BoxGeometry(40, 2, 100);
            const mat = new THREE.MeshLambertMaterial({ color: 0x1E90FF });
            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.set((Math.random()-0.5)*60, 1, spawnZ);
            addSceneryObj(mesh);
        }
    }
}

function drawRadar() {
    radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
    const cx = radarCanvas.width / 2;
    const cy = radarCanvas.height / 2;
    const radarRadius = cx;

    radarCtx.beginPath();
    radarCtx.arc(cx, cy, radarRadius - 2, 0, Math.PI * 2);
    radarCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    radarCtx.lineWidth = 2;
    radarCtx.stroke();
    
    radarCtx.beginPath();
    radarCtx.moveTo(cx, 0); radarCtx.lineTo(cx, radarCanvas.height);
    radarCtx.moveTo(0, cy); radarCtx.lineTo(radarCanvas.width, cy);
    radarCtx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    radarCtx.stroke();

    radarCtx.beginPath();
    radarCtx.arc(cx, cy, 4, 0, Math.PI * 2);
    radarCtx.fillStyle = playerInvincible > 0 ? '#aaa' : '#fff'; 
    radarCtx.fill();

    const radarScale = radarRadius / 200; 
    radarCtx.fillStyle = '#ff0000';
    for(const e of enemies) {
        const dx = e.mesh.position.x - player.position.x;
        const dz = e.mesh.position.z - player.position.z; 
        const rx = cx + dx * radarScale;
        const ry = cy + dz * radarScale;
        const distToCenter = Math.hypot(rx - cx, ry - cy);
        if(distToCenter < radarRadius - 4) {
            radarCtx.beginPath();
            let dotSize = 5;
            if(e.type === 'midboss') dotSize = 8;
            if(e.type === 'finalboss') dotSize = 12;
            if(e.type === 'turret') dotSize = 3;
            radarCtx.arc(rx, ry, dotSize, 0, Math.PI * 2);
            radarCtx.fill();
        }
    }
}

// ----------------------------------------------------
// Main Loop
// ----------------------------------------------------
function update(dt) {
    if(currentState !== STATE.PLAYING) return;
    
    gameTime += dt;
    if(playerInvincible > 0) playerInvincible -= dt;
    if(cameraShakeTime > 0) cameraShakeTime -= dt;
    
    let stageTotalTime = 0;
    for(let i=0; i<stages.length; i++) {
        stageTotalTime += stages[i].duration;
        if(gameTime < stageTotalTime) {
            if(currentStageIdx !== i) {
                currentStageIdx = i;
                stageInfo.innerText = "STAGE: " + stages[i].name;
                floorMat.color.setHex(stages[i].color);
                scene.fog.color.setHex(stages[i].color === 0x1E90FF ? 0x87CEEB : 0xaaaaaa);
                scene.background.setHex(stages[i].color === 0x1E90FF ? 0x87CEEB : 0xaaaaaa);
            }
            break;
        }
    }

    // Mountain Stage Ring Check
    if (currentStageIdx === 2 && !mountainRingSpawned) {
        spawnRing(player.position.z - 500);
        mountainRingSpawned = true;
    }

    // Final Boss Check
    if (currentStageIdx === 3 && !finalBossSpawned) {
        spawnFinalBoss();
        finalBossSpawned = true;
    }
    
    for (let i=0; i<midbossSpawns.length; i++) {
        if (!midbossSpawns[i].spawned && gameTime >= midbossSpawns[i].time && currentStageIdx < 3) {
            spawnMidBoss();
            midbossSpawns[i].spawned = true;
        }
    }
    
    if(isBoosting) currentSpeed = baseSpeed * 2.5;
    else if(isBraking) currentSpeed = baseSpeed * 0.4;
    else currentSpeed = baseSpeed;
    
    const moveSpeed = 45;
    player.position.x += joyInput.x * moveSpeed * dt;
    player.position.y -= joyInput.y * moveSpeed * dt; 
    
    player.position.x = Math.max(-80, Math.min(80, player.position.x));
    player.position.y = Math.max(2, Math.min(60, player.position.y));
    
    player.rotation.z = -joyInput.x * 0.6;
    player.rotation.x = joyInput.y * 0.4;
    
    player.position.z -= currentSpeed * dt;
    
    let tgtCamX = player.position.x + camOffset.x;
    let tgtCamY = player.position.y + camOffset.y;
    camera.position.x += (tgtCamX - camera.position.x) * 0.1;
    camera.position.y += (tgtCamY - camera.position.y) * 0.1;
    camera.position.z = player.position.z + camOffset.z;
    
    if (cameraShakeTime > 0) {
        camera.position.x += (Math.random() - 0.5) * 4;
        camera.position.y += (Math.random() - 0.5) * 4;
    }
    
    floor.position.z = player.position.z - 500;
    
    if(stages[currentStageIdx].name === 'MOUNTAINS') {
        const posAttr = floorGeom.attributes.position;
        for(let i=0; i<posAttr.count; i++) {
            let x = posAttr.getX(i); 
            let y = posAttr.getY(i); 
            let worldZ = floor.position.z - y;
            let elevation = Math.sin(worldZ * 0.01) * Math.cos(x * 0.02) * 20;
            elevation += Math.sin(worldZ * 0.05 + x * 0.05) * 5;
            const centerDist = Math.abs(x);
            if(centerDist < 30) elevation *= (centerDist / 30);
            posAttr.setZ(i, elevation); 
        }
        posAttr.needsUpdate = true;
        floorGeom.computeVertexNormals(); 
    } else {
        const posAttr = floorGeom.attributes.position;
        for(let i=0; i<posAttr.count; i++) posAttr.setZ(i, 0);
        posAttr.needsUpdate = true;
    }

    const scenerySpawnRate = (stages[currentStageIdx].name === 'CITY') ? 0.4 : 0.2;
    lastScenerySpawn += dt;
    if(lastScenerySpawn > scenerySpawnRate && currentStageIdx < 3) { 
        spawnScenery();
        lastScenerySpawn = 0;
    }
    
    const playerBox = new THREE.Box3().setFromCenterAndSize(player.position, new THREE.Vector3(playerRadius*2, playerRadius*2, playerRadius*2));

    for(let i=scenery.length-1; i>=0; i--) {
        const s = scenery[i];
        if(s.mesh.position.z > player.position.z + 50) {
            scene.remove(s.mesh);
            scenery.splice(i, 1);
        } else {
            let hit = false;
            if (s.type === 'cone') {
                let dx = player.position.x - s.mesh.position.x;
                let dz = player.position.z - s.mesh.position.z;
                let distXZ = Math.hypot(dx, dz);
                let base_y = s.mesh.position.y - s.height/2;
                let relY = player.position.y - base_y;
                let currentRadius = s.radius * (1 - (relY / s.height));
                if (currentRadius < 0) currentRadius = 0;
                
                if (distXZ < currentRadius + playerRadius && relY > 0) {
                    hit = true;
                }
            } else {
                s.box.copy(s.mesh.geometry.boundingBox).applyMatrix4(s.mesh.matrixWorld);
                if(s.box.intersectsBox(playerBox)) {
                    hit = true;
                }
            }
            
            if(playerInvincible <= 0 && hit) {
                damagePlayer(20);
                currentSpeed = -baseSpeed;
                player.position.z += 10; 
            }
        }
    }

    lastFireTime += dt;
    if(lastFireTime >= fireRate) {
        fireBullet();
        lastFireTime = 0;
    }
    
    for(let i=bullets.length-1; i>=0; i--) {
        const b = bullets[i];
        b.mesh.position.z -= 300 * dt; 
        b.life -= dt;
        
        let bulletRemoved = false;
        if(b.life <= 0) bulletRemoved = true;
        
        if(!bulletRemoved) {
            const bulletBox = new THREE.Box3().setFromObject(b.mesh);
            for(const s of scenery) {
                let hit = false;
                if (s.type === 'cone') {
                    let dx = b.mesh.position.x - s.mesh.position.x;
                    let dz = b.mesh.position.z - s.mesh.position.z;
                    let distXZ = Math.hypot(dx, dz);
                    let base_y = s.mesh.position.y - s.height/2;
                    let relY = b.mesh.position.y - base_y;
                    let currentRadius = s.radius * (1 - (relY / s.height));
                    if (currentRadius < 0) currentRadius = 0;
                    if (distXZ < currentRadius && relY > 0) hit = true;
                } else {
                    if(s.box.intersectsBox(bulletBox)) hit = true;
                }
                
                if(hit) {
                    bulletRemoved = true;
                    break;
                }
            }
        }
        if(bulletRemoved) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }
    
    for(let i=enemyBullets.length-1; i>=0; i--) {
        const b = enemyBullets[i];
        b.mesh.position.addScaledVector(b.vel, dt);
        b.life -= dt;
        
        if(playerInvincible <= 0 && b.mesh.position.distanceTo(player.position) < 5) {
            damagePlayer(b.dmg);
            scene.remove(b.mesh);
            enemyBullets.splice(i, 1);
            continue;
        }
        if(b.life <= 0) {
            scene.remove(b.mesh);
            enemyBullets.splice(i, 1);
        }
    }

    // Update particles (gravity)
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        p.vy -= 60 * dt; // gravity
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.rotation.x += 3 * dt;
        p.mesh.rotation.y += 3 * dt;
        
        // ground collision or scroll past
        if(p.mesh.position.y <= 0 || p.mesh.position.z > player.position.z + 50) {
            scene.remove(p.mesh);
            particles.splice(i, 1);
        }
    }
    
    const enemySpawnRate = (stages[currentStageIdx].name === 'OCEAN') ? 0.007 : 0.015;
    if(Math.random() < enemySpawnRate && currentStageIdx < 3) {
        if(Math.random() < 0.7) spawnBlueEnemy(); 
        else spawnEnemyFormation(); 
    }
    
    for(let i=enemies.length-1; i>=0; i--) {
        const e = enemies[i];
        e.t += dt;
        
        if (e.type === 'red') {
            if(e.pattern === 0 || e.pattern === 1) {
                e.mesh.position.z += 10 * dt;
                e.mesh.position.x = e.startX + Math.sin(e.t * 0.8) * 20;
                e.mesh.position.y = e.startY + Math.cos(e.t * 0.8) * 10;
            } else if(e.pattern === 2) {
                e.mesh.position.x += 60 * dt;
                e.mesh.position.z += 10 * dt;
            } else if(e.pattern === 3) {
                e.mesh.position.x -= 60 * dt;
                e.mesh.position.z += 10 * dt;
            }
            e.mesh.rotation.y = Math.sin(e.t * 0.8) * 0.3;
            e.mesh.rotation.x = Math.cos(e.t * 0.8) * 0.3;
            
            if(e.isLeader && !e.hasShot && e.t > 1.5) {
                fireEnemyBullet(e.mesh.position, 'red', null);
                e.hasShot = true;
            }
        } else if (e.type === 'blue') {
            e.mesh.position.z += 15 * dt;
            e.mesh.position.y += Math.sin(e.t * 2) * 5 * dt; 
            
            if (e.shotCount < 2 && e.t > (e.shotCount + 1) * 1.5 && e.mesh.position.z < player.position.z - 50) {
                fireEnemyBullet(e.mesh.position, 'blue', player.position);
                e.shotCount++;
            }
        } else if (e.type === 'turret') {
            e.mesh.position.z += currentSpeed * dt;
            if (e.mesh.position.z > player.position.z - 200 && e.mesh.position.z < player.position.z) {
                if (e.burstCount < 3) {
                    e.burstTimer -= dt;
                    if (e.burstTimer <= 0) {
                        fireEnemyBullet(e.mesh.position.clone().add(new THREE.Vector3(0,5,0)), 'turret', player.position);
                        e.burstCount++;
                        e.burstTimer = 0.2; 
                    }
                }
            }
        } else if (e.type === 'midboss') {
            e.mesh.position.z = player.position.z - 150;
            
            if (e.state === 'enter') {
                e.mesh.position.x += (0 - e.mesh.position.x) * 2 * dt;
                if (Math.abs(e.mesh.position.x) < 5) e.state = 'fight';
            } else if (e.state === 'fight') {
                e.waitTimer -= dt;
                if (e.waitTimer <= 0) {
                    e.mesh.position.x += (e.targetXY.x - e.mesh.position.x) * 3 * dt;
                    e.mesh.position.y += (e.targetXY.y - e.mesh.position.y) * 3 * dt;
                    
                    if (Math.hypot(e.targetXY.x - e.mesh.position.x, e.targetXY.y - e.mesh.position.y) < 2) {
                        if (e.shotCount < 8) {
                            fireEnemyBullet(e.mesh.position, 'midboss', player.position);
                            e.shotCount++;
                            e.targetXY.set((Math.random() - 0.5) * 80, 15 + Math.random() * 30);
                            e.waitTimer = 1.5; 
                        } else {
                            e.state = 'leave';
                        }
                    }
                }
            } else if (e.state === 'leave') {
                e.mesh.position.x += 100 * dt; 
            }
        } else if (e.type === 'finalboss') {
            const speedMult = e.phase2 ? 2 : 1;
            const threshold = e.phase2 ? 3 : 4;
            
            if(e.hp <= 200 && !e.phase2) {
                e.phase2 = true;
                e.mesh.scale.set(0.5, 0.5, 0.5);
                e.mesh.material.color.setHex(0x888888);
                spawnBossParticles(e.mesh.position);
            }
            
            if (e.phase2) {
                e.turretTimer -= dt;
                if(e.turretTimer <= 0) {
                    spawnTurret(player.position.z - 400 + Math.random()*200);
                    e.turretTimer = 4.0;
                }
            }
            
            if(e.state === 'enter') {
                e.mesh.position.y += (30 - e.mesh.position.y) * 2 * dt;
                if(Math.abs(e.mesh.position.y - 30) < 2) {
                    e.state = 'fight';
                    e.waitTimer = 1.0;
                }
            } else if(e.state === 'fight') {
                e.mesh.position.z = player.position.z - 250; 
                e.waitTimer -= dt;
                if (e.waitTimer <= 0) {
                    e.mesh.position.x += (e.targetXY.x - e.mesh.position.x) * 3 * speedMult * dt;
                    e.mesh.position.y += (e.targetXY.y - e.mesh.position.y) * 3 * speedMult * dt;
                    
                    if (Math.hypot(e.targetXY.x - e.mesh.position.x, e.targetXY.y - e.mesh.position.y) < 2) {
                        if (e.shotCount < threshold) {
                            fireEnemyBullet(e.mesh.position, 'finalboss', player.position);
                            e.shotCount++;
                            let rangeX = e.phase2 ? 120 : 60;
                            let rangeY = e.phase2 ? 50 : 30;
                            e.targetXY.set((Math.random() - 0.5) * rangeX, 15 + Math.random() * rangeY);
                            e.waitTimer = 1.0 / speedMult; 
                        } else {
                            e.state = 'charge_prepare';
                            e.waitTimer = 1.0; // wind up
                        }
                    }
                }
            } else if(e.state === 'charge_prepare') {
                e.mesh.position.z = player.position.z - 250; 
                e.waitTimer -= dt;
                // slight shake
                e.mesh.position.x += (Math.random()-0.5)*2;
                e.mesh.position.y += (Math.random()-0.5)*2;
                if(e.waitTimer <= 0) {
                    e.state = 'charge';
                    // aim exactly at player's current xy
                    e.targetXY.set(player.position.x, player.position.y);
                }
            } else if(e.state === 'charge') {
                // Dash super fast towards player Z
                e.mesh.position.z += 400 * speedMult * dt;
                e.mesh.position.x += (e.targetXY.x - e.mesh.position.x) * 5 * dt;
                e.mesh.position.y += (e.targetXY.y - e.mesh.position.y) * 5 * dt;
                
                if(e.mesh.position.z > player.position.z + 50) {
                    e.state = 'return';
                }
            } else if(e.state === 'return') {
                // Teleport or fly back quickly
                e.mesh.position.z -= 600 * dt;
                if(e.mesh.position.z < player.position.z - 250) {
                    e.state = 'fight';
                    e.shotCount = 0;
                    e.waitTimer = 1.0;
                }
            }
        }

        if(e.hitTimer > 0) {
            e.hitTimer -= dt;
            if(e.hitTimer <= 0) {
                if (e.type === 'red' && e.hp > 10) e.mesh.material.emissive.setHex(0x330000);
                else e.mesh.material.emissive.setHex(0x000000);
            }
        }
        
        for(let j=bullets.length-1; j>=0; j--) {
            let hitRadius = 8;
            if(e.type === 'midboss') hitRadius = 15;
            if(e.type === 'finalboss') hitRadius = e.phase2 ? 10 : 20;
            
            if(bullets[j].mesh.position.distanceTo(e.mesh.position) < hitRadius) {
                e.hp -= 10; 
                e.hitTimer = 0.1;
                e.mesh.material.emissive.setHex(0xffffff);
                scene.remove(bullets[j].mesh);
                bullets.splice(j, 1);
            }
        }
        
        let colRadius = 8;
        if(e.type === 'midboss') colRadius = 15;
        if(e.type === 'finalboss') colRadius = e.phase2 ? 10 : 20;
        
        if(playerInvincible <= 0 && e.mesh.position.distanceTo(player.position) < colRadius) {
            damagePlayer(20);
            if(e.type !== 'finalboss') e.hp = 0; 
        }
        
        if(e.hp <= 0 || (e.type !== 'finalboss' && e.mesh.position.z > player.position.z + 50) || (e.type === 'midboss' && Math.abs(e.mesh.position.x) > 200)) {
            if(e.hp <= 0) {
                if (e.type === 'finalboss') {
                    addScore(20000);
                    spawnBossParticles(e.mesh.position);
                    gameClear();
                } else if (e.type === 'midboss') {
                    addScore(5000);
                    spawnItem(e.mesh.position);
                } else if (e.type === 'turret') {
                    addScore(1000);
                } else if (e.type === 'blue') {
                    addScore(1000);
                } else if (e.type === 'red') {
                    if (e.isLeader) addScore(300);
                    else addScore(100);
                }

                if (e.type === 'red') {
                    const f = formations.find(f => f.id === e.fId);
                    if(f) {
                        f.killed++;
                        if(f.killed >= f.total) {
                            spawnItem(e.mesh.position);
                            addScore(500); 
                            formations.splice(formations.indexOf(f), 1);
                        }
                    }
                }
            }
            scene.remove(e.mesh);
            enemies.splice(i, 1);
        }
    }

    for(let i=rings.length-1; i>=0; i--) {
        const r = rings[i];
        r.mesh.rotation.z += 1 * dt;
        if(r.mesh.position.distanceTo(player.position) < 25) {
            maxHP += 20;
            playerHP = maxHP;
            updateHP();
            score += 1000;
            addScore(0);
            
            scene.remove(r.mesh);
            rings.splice(i, 1);
        } else if(r.mesh.position.z > player.position.z + 20) {
            scene.remove(r.mesh);
            rings.splice(i, 1);
        }
    }

    for(let i=items.length-1; i>=0; i--) {
        const it = items[i];
        it.mesh.position.z -= 10 * dt;
        it.mesh.rotation.y += 2 * dt;
        it.mesh.rotation.x += 2 * dt;
        
        if(it.mesh.position.distanceTo(player.position) < 15) {
            playerHP = Math.min(maxHP, playerHP + 30);
            updateHP();
            scene.remove(it.mesh);
            items.splice(i, 1);
        } else if(it.mesh.position.z > player.position.z + 30) {
            scene.remove(it.mesh);
            items.splice(i, 1);
        }
    }

    drawRadar();
}

function animate(time) {
    requestAnimationFrame(animate);
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    if(dt > 0.1) return;
    
    update(dt);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function startGame() {
    currentState = STATE.PLAYING;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameClearScreen.classList.add('hidden');
    
    maxHP = 100;
    playerHP = maxHP;
    gameTime = 0;
    score = 0;
    addScore(0);
    ringsSpawned = 0;
    turretCount = 0;
    currentStageIdx = 0;
    mountainRingSpawned = false;
    finalBossSpawned = false;
    
    midbossSpawns = [
        { time: 50 + (Math.random()*10 - 5), spawned: false },
        { time: 110 + (Math.random()*10 - 5), spawned: false },
        { time: 150 + (Math.random()*10 - 5), spawned: false }
    ];
    
    player.position.set(0, 5, 0);
    playerInvincible = 0;
    cameraShakeTime = 0;
    
    for(let e of enemies) scene.remove(e.mesh);
    enemies.length = 0;
    for(let b of bullets) scene.remove(b.mesh);
    bullets.length = 0;
    for(let b of enemyBullets) scene.remove(b.mesh);
    enemyBullets.length = 0;
    for(let s of scenery) scene.remove(s.mesh);
    scenery.length = 0;
    for(let it of items) scene.remove(it.mesh);
    items.length = 0;
    for(let r of rings) scene.remove(r.mesh);
    rings.length = 0;
    for(let p of particles) scene.remove(p.mesh);
    particles.length = 0;
    formations.length = 0;
    
    updateHP();
}

function gameOver() {
    currentState = STATE.GAMEOVER;
    finalScoreOver.innerText = "SCORE: " + score;
    gameOverScreen.classList.remove('hidden');
}

function gameClear() {
    currentState = STATE.CLEAR;
    finalScoreClear.innerText = "SCORE: " + score;
    gameClearScreen.classList.remove('hidden');
}

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-restart').addEventListener('click', startGame);
document.getElementById('btn-restart-clear').addEventListener('click', startGame);

requestAnimationFrame((time) => {
    lastTime = time;
    drawRadar();
    animate(time);
});
