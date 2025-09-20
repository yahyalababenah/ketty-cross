import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { TILE, COLS, VROWS, LEVEL_ROWS, START_SAFE, EAGLE_TIMEOUT, COLORS, LANE,
         leftX, rightX, colToX, rowToZ, reseed, MODEL_YAW_OFFSET, lerpAngle } from './util.mjs';
import { initMaterials } from './materials.mjs';
import { Sound } from './audio.mjs';
import { makeRobot } from './robot.mjs';
import { LANG, setLang, updatePills } from './ui.mjs';
import { makeLevel, makeLaneMesh, spawnEntities, clearEntities, placeCoins, makeCoin } from './level.mjs';

// DOM refs
const container = document.getElementById('game');
const startOverlay = document.getElementById('startOverlay');
const endOverlay   = document.getElementById('endOverlay');
const howOverlay   = document.getElementById('howOverlay');
const startBtn  = document.getElementById('startBtn');
const howBtn    = document.getElementById('howBtn');
const closeHow  = document.getElementById('closeHow');
const againBtn  = document.getElementById('againBtn');
const shareBtn  = document.getElementById('shareBtn');
const pauseBtn  = document.getElementById('pauseBtn');
const endTitle  = document.getElementById('endTitle');
const endStats  = document.getElementById('endStats');
const scorePill = document.getElementById('scorePill');
const bestPill  = document.getElementById('bestPill');
const settings  = document.getElementById('settings');
const shadowsToggle = document.getElementById('shadowsToggle');
const fxToggle      = document.getElementById('fxToggle');
const skinSelect    = document.getElementById('skinSelect');
const langSel   = document.getElementById('langSel');
const startTitle= document.getElementById('startTitle');
const startDesc = document.getElementById('startDesc');
const howTitle  = document.getElementById('howTitle');
const howText   = document.getElementById('howText');
const footerNote= document.getElementById('footerNote');
const lgd1=document.getElementById('lgd1'),lgd2=document.getElementById('lgd2'),lgd3=document.getElementById('lgd3'),lgd4=document.getElementById('lgd4');
const dom = {startTitle,startDesc,howTitle,howText,footerNote,lgd1,lgd2,lgd3,lgd4,startBtn,howBtn,closeHow,againBtn,shareBtn,pauseBtn,scorePill,bestPill,endTitle};

// Three.js renderer/scene
const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
container.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.sky, 18, 70);

let camera, camTargetZ=6, camLag=0;
function makeCamera(){
  const w = container.clientWidth || 360, h = container.clientHeight || 640;
  const aspect = w/h; const frustum = 18;
  camera = new THREE.OrthographicCamera( -frustum*aspect/2, frustum*aspect/2, frustum/2, -frustum/2, 0.1, 300 );
  camera.position.set(6,12,-6);
  camera.lookAt(0,0,camTargetZ);
  renderer.setSize(w,h,false);
}
window.addEventListener('resize', makeCamera);
makeCamera();

const hemi = new THREE.HemisphereLight(0xffffff, 0xb0d6ff, 0.7); scene.add(hemi);
const dir  = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(6,12,6); dir.castShadow=true;
dir.shadow.mapSize.set(1024,1024); dir.shadow.camera.top=20; dir.shadow.camera.bottom=-10; dir.shadow.camera.left=-15; dir.shadow.camera.right=15; scene.add(dir);

// assets
const assets = initMaterials(renderer);

// world + state
const world = new THREE.Group(); scene.add(world);
const State = {
  lanes: [], coins:new Set(),
  player: { col:Math.floor(COLS/2), row:0, alive:true, score:0, coins:0, maxRow:0, yaw:MODEL_YAW_OFFSET, targetYaw:MODEL_YAW_OFFSET },
  lastInputAt: performance.now(), over:false, win:false, paused:false,
  best: Number(localStorage.getItem('kc_highscore_3d')||0),
  shadows: true, fx: true, skin:'ketty-yellow',
  lang: localStorage.getItem('kc_lang') || 'ar'
};

const SFX = new Sound();
const particles=[]; 
function addBurst(x,z,color=0xffffff,count=12){
  for(let i=0;i<count;i++){
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10), new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.4, transparent:true}));
    particles.push({m,x,z, vx:(Math.random()*1.6-0.8), vy:(1+Math.random()*1.2), vz:(Math.random()*1.6-0.8), life:800, t:0});
    m.position.set(x,0.4,z); scene.add(m);
  }
}
function updateParticles(dt){
  for(const p of particles){
    p.t+=dt; p.m.position.x += p.vx*dt/1000; p.m.position.y += p.vy*dt/1000; p.m.position.z += p.vz*dt/1000; p.vy -= 3*dt/1000; 
    p.m.material.opacity = Math.max(0,1 - p.t/p.life);
  }
  for(let i=particles.length-1;i>=0;i--){ if(particles[i].t>particles[i].life){ scene.remove(particles[i].m); particles.splice(i,1); } }
}

const laneMeshes=[]; let robot; const coinMeshes=new Map();

function buildScene(){
  laneMeshes.forEach(m=>world.remove(m)); laneMeshes.length=0;
  clearEntities(State.lanes, world); if(robot) world.remove(robot);

  for(let r=0;r<State.lanes.length;r++){
    const data = State.lanes[r];
    const mesh = makeLaneMesh(data.type, assets); mesh.position.set(0,-0.1,rowToZ(r)); mesh.receiveShadow=true; world.add(mesh); laneMeshes.push(mesh);
    if(data.type===LANE.ROAD||data.type===LANE.RIVER||data.type===LANE.RAIL){ spawnEntities(data, assets, world); }
    if(data.type===LANE.RAIL && data.signal){ data.signal.position.z = rowToZ(r); }
  }
  coinMeshes.forEach(m=>world.remove(m)); coinMeshes.clear();
  State.coins.forEach(key=>{ const [r,c]=key.split(':').map(Number); const m=makeCoin(assets); m.position.set(colToX(c),0.4,rowToZ(r)); world.add(m); coinMeshes.set(key,m); });

  robot = makeRobot(State);
  robot.position.set(colToX(State.player.col),0.1,rowToZ(State.player.row));
  robot.rotation.y = State.player.yaw;
  world.add(robot);

  renderer.shadowMap.enabled = State.shadows; 
  [robot,...world.children].forEach(n=>{ if(n.isMesh) n.castShadow=State.shadows; });
}

function update(dt){
  if(State.paused||State.over) return;
  const targetZ = Math.max(0, Math.min(State.lanes.length - VROWS, State.player.row - 6));
  camTargetZ += (targetZ - camTargetZ) * 0.08; camLag += (targetZ - camLag) * 0.045;
  camera.position.z = -6 + camTargetZ; camera.lookAt(0,0, camLag+6);

  for(let r=0;r<State.lanes.length;r++){
    const lane = State.lanes[r]; if(!lane.ents) continue;
    if(lane.type===LANE.ROAD || lane.type===LANE.RIVER){
      const speed = lane.speed * TILE; const dir = Math.sign(lane.speed);
      const minX = leftX - 6, maxX = rightX + 6; const spacing = lane.spacing || 3;
      for(const m of lane.ents){ m.position.x += speed*dt/1000; m.position.z = rowToZ(r); }
      for(const m of lane.ents){
        if(dir>0 && m.position.x > maxX){ let min = Infinity; for(const e of lane.ents) min = Math.min(min, e.position.x); m.position.x = min - spacing; }
        if(dir<0 && m.position.x < minX){ let max = -Infinity; for(const e of lane.ents) max = Math.max(max, e.position.x); m.position.x = max + spacing; }
      }
    }
    if(lane.type===LANE.RAIL){
      if(lane.signal){ const lamp = lane.signal.userData.lamp; const blink = lane.next<1000; lamp.material.emissiveIntensity = blink? (Math.sin(performance.now()/120)>0? 0.6:0.15) : 0.15; lane.signal.position.z = rowToZ(r); }
      lane.next -= dt; if(lane.next<=0 && lane.ents.length===0){ const t = new THREE.Mesh(assets.geos.geoTrain, assets.mats.matTrain); t.castShadow=true; t.userData.kind='train';
        t.position.set(lane.dir>0? leftX-6 : rightX+6, 0.5, rowToZ(r)); world.add(t); lane.ents.push(t); lane.next = lane.cooldown + (Math.random()*1000); }
      const speed = lane.speed * TILE; lane.ents.forEach(m=> m.position.x += speed*dt/1000);
      lane.ents = lane.ents.filter(m=>{ const alive = (lane.dir>0? m.position.x < rightX+8 : m.position.x > leftX-8); if(!alive) world.remove(m); return alive; });
    }
  }

  if(performance.now()-State.lastInputAt > EAGLE_TIMEOUT){ gameOver(false, State.lang==='ar'? 'خطفك النسر!' : 'Caught by the eagle!'); }

  const pr = State.player.row; const lane = State.lanes[pr];
  if(lane && lane.type===LANE.RIVER){
    let onLog=false; let logSpeed=0;
    for(const m of lane.ents){ if(Math.abs(robot.position.x - m.position.x) < (m.scale.x*1.2) && Math.abs(robot.position.z - m.position.z) < 0.45){ onLog=true; logSpeed = lane.speed; break; } }
    if(onLog){ robot.position.x += logSpeed*dt/1000; State.player.col = Math.round((robot.position.x - leftX)/TILE); }
    else { if(State.fx) addBurst(robot.position.x, robot.position.z, 0x66ccff, 14); SFX.splash(); gameOver(false, State.lang==='ar'? 'سقطت في الماء':'Fell in water'); }
  }

  robot.position.x = Math.max(leftX, Math.min(rightX, robot.position.x));

  if(lane){
    if(lane.type===LANE.ROAD){ for(const m of lane.ents){ if(Math.abs(robot.position.x - m.position.x) < 0.6 && Math.abs(robot.position.z - m.position.z) < 0.45){ if(State.fx) addBurst(robot.position.x, robot.position.z, 0xff6b6b, 18); SFX.crash(); gameOver(false, State.lang==='ar'? 'اصطدام سيارة':'Car crash'); break; } } }
    if(lane.type===LANE.RAIL){ for(const m of lane.ents){ if(Math.abs(robot.position.x - m.position.x) < 1.6 && Math.abs(robot.position.z - m.position.z) < 0.6){ if(State.fx) addBurst(robot.position.x, robot.position.z, 0xcccccc, 20); SFX.crash(); gameOver(false, State.lang==='ar'? 'دهسك القطار':'Hit by train'); break; } } }
  }

  if(State.player.row >= State.lanes.length-1){ State.player.row = State.lanes.length-1; SFX.win(); gameOver(true); }

  const smooth = 1 - Math.pow(0.001, dt);
  State.player.yaw = lerpAngle(State.player.yaw, State.player.targetYaw, smooth);
  if (robot) robot.rotation.y = State.player.yaw;

  coinMeshes.forEach((m)=>{ m.rotation.z += dt/900; });
  updateParticles(dt);
}

function render(){ renderer.render(scene, camera); }

function tryMove(dc,dr){
  if(State.over||State.paused) return;
  const p = State.player; const targetCol = Math.max(0, Math.min(COLS-1, p.col+dc));
  const targetRow = Math.max(0, Math.min(State.lanes.length-1, p.row+dr));
  if(targetCol===p.col && targetRow===p.row) return;
  p.col = targetCol; p.row = targetRow; State.lastInputAt = performance.now();
  robot.position.set(colToX(p.col), robot.position.y, rowToZ(p.row)); SFX.move();

  let aim; if (Math.abs(dr) >= Math.abs(dc)) aim = (dr > 0) ? 0 : Math.PI; else aim = (dc > 0) ?  Math.PI/2 : -Math.PI/2;
  State.player.targetYaw = MODEL_YAW_OFFSET + aim;

  if(p.row > p.maxRow){ p.maxRow=p.row; p.score += 1; }
  const key = `${p.row}:${p.col}`;
  if(State.coins.has(key)){
    State.coins.delete(key); const m = coinMeshes.get(key);
    if(m){ world.remove(m); coinMeshes.delete(key); }
    p.coins++; p.score+=5; SFX.coin();
  }
  updatePills(LANG[State.lang], State, {scorePill, bestPill});
}

// input
window.addEventListener('keydown', e=>{
  if(['ArrowUp','Space'].includes(e.code)){ tryMove(0,+1); e.preventDefault(); }
  if(e.code==='ArrowLeft'){ tryMove(-1,0); e.preventDefault(); }
  if(e.code==='ArrowRight'){ tryMove(+1,0); e.preventDefault(); }
  if(e.code==='ArrowDown'){ tryMove(0,-1); e.preventDefault(); }
  if(e.code==='KeyP'){ togglePause(); }
  if(e.code==='KeyO'){ settings.classList.toggle('hide'); }
});
container.addEventListener('click', e=>{ if(e.target.closest('.overlay') || e.target.closest('button')) return; tryMove(0,+1); });
let touchStart=null; 
container.addEventListener('touchstart', e=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY,t:performance.now()}; }, {passive:true});
container.addEventListener('touchend', e=>{
  if(!touchStart) return; const dx=e.changedTouches[0].clientX-touchStart.x; const dy=e.changedTouches[0].clientY-touchStart.y; const absX=Math.abs(dx), absY=Math.abs(dy);
  if(absX<24 && absY<24){ tryMove(0,+1); } else if(absX>absY){ tryMove(dx>0? +1 : -1, 0); } else { tryMove(0, dy>0? -1 : +1); }
  touchStart=null;
});

// loop
const STEP = 1000/60; let acc=0, lastRAF=performance.now(); let started=false;
function tick(ts){ let dt = ts - lastRAF; lastRAF = ts; if (dt > 250) dt = 250; acc += dt; while (acc >= STEP) { update(STEP); acc -= STEP; } render(); if (started) requestAnimationFrame(tick); }
function startGame(){ if (!started) { started = true; requestAnimationFrame(tick); } startOverlay.style.display='none'; reset(); SFX.move(); }
function gameOver(win=false, reason=''){ if(State.over) return; State.over=true; State.win=win;
  if(State.player.score>State.best){ State.best=State.player.score; localStorage.setItem('kc_highscore_3d', String(State.best)); }
  endTitle.textContent = win? LANG[State.lang].endWin : LANG[State.lang].endLose;
  endStats.textContent = `${reason? reason+' · ' : ''}${LANG[State.lang].score} ${State.player.score} · ${LANG[State.lang].coins} ${State.player.coins} · ${LANG[State.lang].best} ${State.best}`;
  updatePills(LANG[State.lang], State, {scorePill, bestPill}); endOverlay.style.display='grid'; }
function togglePause(){ if(State.over) return; State.paused=!State.paused; pauseBtn.textContent = State.paused? LANG[State.lang].resume : LANG[State.lang].pause; }

// UI
startBtn.addEventListener('click', startGame);
startOverlay.addEventListener('click', (e)=>{ if(e.target.closest('button')) return; startGame(); });
againBtn.addEventListener('click', ()=>{ endOverlay.style.display='none'; reset(); });
howBtn.addEventListener('click', ()=> howOverlay.style.display='grid');
closeHow.addEventListener('click', ()=> howOverlay.style.display='none');
pauseBtn.addEventListener('click', togglePause);
shareBtn.addEventListener('click', async()=>{
  const url=location.href;
  if(navigator.share){ try{await navigator.share({title:'Ketty Cross',text:'Play Ketty Cross — 3D',url});}catch{} }
  else { try{ await navigator.clipboard.writeText(url); shareBtn.textContent=(State.lang==='ar'?'تم نسخ الرابط':'Link copied'); setTimeout(()=>shareBtn.textContent=LANG[State.lang].share,1200);} catch{ alert(url); } }
});
shadowsToggle.addEventListener('change', e=>{ State.shadows=e.target.checked; renderer.shadowMap.enabled = State.shadows; });
fxToggle.addEventListener('change', e=>{ State.fx=e.target.checked; });

if(skinSelect){
  skinSelect.value = State.skin;
  skinSelect.addEventListener('change', e=>{
    State.skin = e.target.value;
    if(robot){ world.remove(robot); }
    robot = makeRobot(State);
    robot.position.set(colToX(State.player.col),0.1,rowToZ(State.player.row));
    robot.rotation.y = State.player.yaw;
    world.add(robot);
    [robot,...world.children].forEach(n=>{ if(n.isMesh) n.castShadow=State.shadows; });
  });
}

langSel.value = State.lang;
langSel.addEventListener('change', e=>{ State.lang=e.target.value; localStorage.setItem('kc_lang', State.lang); setLang(State.lang, dom, State); });

// reset
function reset(){
  clearEntities(State.lanes, world);
  coinMeshes.forEach(m=>{ if(m) world.remove(m); }); coinMeshes.clear();
  laneMeshes.forEach(m=>{ if(m) world.remove(m); }); laneMeshes.length=0;
  if(robot){ world.remove(robot); robot=null; }

  reseed();
  State.lanes = makeLevel(START_SAFE, LEVEL_ROWS);
  State.coins = placeCoins(State.lanes);
  State.player = { col:Math.floor(COLS/2), row:0, alive:true, score:0, coins:0, maxRow:0, yaw:MODEL_YAW_OFFSET, targetYaw:MODEL_YAW_OFFSET };
  State.over=false; State.win=false; State.paused=false; State.lastInputAt=performance.now();

  buildScene(); updatePills(LANG[State.lang], State, {scorePill, bestPill});
}

// init i18n
setLang(State.lang, dom, State);
updatePills(LANG[State.lang], State, {scorePill, bestPill});
