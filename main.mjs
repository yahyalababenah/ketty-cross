// src/main.mjs
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* ================== Constants / Colors / Skins ================== */
const TILE = 1, COLS = 9, VROWS = 14, LEVEL_ROWS = 52, START_SAFE = 3, EAGLE_TIMEOUT = 6500;
const CSS = n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const COLORS = {
  sky:CSS('--sky')||'#bde7ff', grass:CSS('--grass')||'#c5f68f', road:CSS('--road')||'#d4d4d4',
  rail:CSS('--rail')||'#b3a48f', river:CSS('--river')||'#9ed3ff', finish:CSS('--finish')||'#ffd166', ui:CSS('--ui')||'#0f172a'
};
const SKINS = {
  'ketty-yellow': { body:0xf4c84e, fascia:0x121417, base:0x6b7280, accent:0x3ed2ff },
  'ketty-black':  { body:0x111827, fascia:0x0c0f12, base:0x6b7280, accent:0x3ed2ff }
};
// الروبوت نموذجُه الافتراضي يواجه +X؛ نريد +Z
const MODEL_YAW_OFFSET = -Math.PI/2;
function lerpAngle(a,b,t){ let d=b-a; while(d> Math.PI) d-=Math.PI*2; while(d<-Math.PI) d+=Math.PI*2; return a+d*t; }

/* ================== UI refs ================== */
const container   = document.getElementById('game');
const startOverlay= document.getElementById('startOverlay');
const endOverlay  = document.getElementById('endOverlay');
const howOverlay  = document.getElementById('howOverlay');
const startBtn    = document.getElementById('startBtn');
const howBtn      = document.getElementById('howBtn');
const closeHow    = document.getElementById('closeHow');
const againBtn    = document.getElementById('againBtn');
const shareBtn    = document.getElementById('shareBtn');
const pauseBtn    = document.getElementById('pauseBtn');
const endTitle    = document.getElementById('endTitle');
const endStats    = document.getElementById('endStats');
const scorePill   = document.getElementById('scorePill');
const bestPill    = document.getElementById('bestPill');
const settings    = document.getElementById('settings');
const shadowsToggle=document.getElementById('shadowsToggle');
const fxToggle    = document.getElementById('fxToggle');
const skinSelect  = document.getElementById('skinSelect');
const langSel     = document.getElementById('langSel');
const startTitle  = document.getElementById('startTitle');
const startDesc   = document.getElementById('startDesc');
const howTitle    = document.getElementById('howTitle');
const howText     = document.getElementById('howText');
const footerNote  = document.getElementById('footerNote');

/* ================== i18n ================== */
const LANG = {
  ar: {
    startTitle:'ابدأ اللعب', startDesc:'أسلوب لعب وإحساس قريب من Crossy Road بفيزياء شبكية، جرافيكس نظيف، وصعوبة تتدرّج، مع نهاية للمستوى.',
    lgd1:'🚗 طرق بسيارات', lgd2:'🚆 سكك وقطارات مع إنذار', lgd3:'🌊 أنهار وجذوع حقيقية القوام', lgd4:'🪙 عملات دوّارة',
    start:'ابدأ', how:'الطريقة', ok:'تمام', again:'العب مجددًا',
    pause:'إيقاف مؤقت', resume:'استئناف', share:'شارك',
    endWin:'انتهى المستوى!', endLose:'انتهت اللعبة',
    howTitle:'كيف تلعب',
    howText:'• نقرة/مسافة = للأمام · سحب/أسهم = تحريك. تجنّب السيارات والقطارات. على الأنهار قف على الجذوع. اجمع العملات وواصل حتى خط النهاية.',
    score:'Score', coins:'Coins', best:'Best',
    footer:'موقع جاهز للنشر. انسخ الرابط لعرضه كـ QR على الروبوت.'
  },
  en: {
    startTitle:'Start Playing', startDesc:'Crossy Road–style grid movement, clean graphics, gradual difficulty, and a proper finish line.',
    lgd1:'🚗 Car lanes', lgd2:'🚆 Rails & trains with warning', lgd3:'🌊 Rivers with rideable logs', lgd4:'🪙 Rotating coins',
    start:'Start', how:'How to Play', ok:'OK', again:'Play Again',
    pause:'Pause', resume:'Resume', share:'Share',
    endWin:'Level Complete!', endLose:'Game Over',
    howTitle:'How to Play',
    howText:'• Tap/Space = forward · Swipe/Arrows = move. Avoid cars & trains. Ride logs across rivers. Collect coins and reach the finish.',
    score:'Score', coins:'Coins', best:'Best',
    footer:'Production-ready. Share the link or display a QR on the robot.'
  }
};
let lang = localStorage.getItem('kc_lang') || 'ar';
function setLang(l){
  lang=l; localStorage.setItem('kc_lang',l);
  document.documentElement.dir = l==='ar'?'rtl':'ltr';
  document.documentElement.lang = l;
  startTitle.textContent = LANG[l].startTitle;
  startDesc.textContent  = LANG[l].startDesc;
  document.getElementById('lgd1').textContent = LANG[l].lgd1;
  document.getElementById('lgd2').textContent = LANG[l].lgd2;
  document.getElementById('lgd3').textContent = LANG[l].lgd3;
  document.getElementById('lgd4').textContent = LANG[l].lgd4;
  startBtn.textContent   = LANG[l].start;
  howBtn.textContent     = LANG[l].how;
  closeHow.textContent   = LANG[l].ok;
  againBtn.textContent   = LANG[l].again;
  pauseBtn.textContent   = State.paused? LANG[l].resume : LANG[l].pause;
  shareBtn.textContent   = LANG[l].share;
  howTitle.textContent   = LANG[l].howTitle;
  howText.textContent    = LANG[l].howText;
  endTitle.textContent   = State.win? LANG[l].endWin : LANG[l].endLose;
  footerNote.textContent = LANG[l].footer;
  updatePills();
}
langSel.value = lang;
langSel.addEventListener('change', e=> setLang(e.target.value));

/* ================== Three setup ================== */
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
  camera.position.set(6, 12, -6);
  camera.lookAt(0,0,camTargetZ);
  renderer.setSize(w,h,false);
}
window.addEventListener('resize', makeCamera);
makeCamera();

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0xb0d6ff, 0.7); scene.add(hemi);
const dir  = new THREE.DirectionalLight(0xffffff, 0.9); dir.position.set(6,12,6); dir.castShadow=true;
dir.shadow.mapSize.set(1024,1024);
Object.assign(dir.shadow.camera, {top:20, bottom:-10, left:-15, right:15});
scene.add(dir);

/* ================== Textures / Materials ================== */
function makeWoodTexStrong(){
  const w=256,h=64; const cvs=document.createElement('canvas'); cvs.width=w; cvs.height=h; const ctx=cvs.getContext('2d');
  const base='#8b5a2b', dark='#6f4522', mid='#7a4d25';
  ctx.fillStyle=base; ctx.fillRect(0,0,w,h);
  for(let y=0;y<h;y++){
    const band = 0.5+0.5*Math.sin(y*0.15);
    for(let x=0;x<w;x++){
      const n = (Math.sin(x*0.08 + y*0.03)+1)/2 * 0.25 + (Math.random()*0.05);
      const g = Math.floor(60*band + 45*n);
      ctx.fillStyle = `rgb(${110+g},${70+g/3},${35})`;
      if(Math.random()<0.12) ctx.fillStyle = mid;
      ctx.fillRect(x,y,1,1);
    }
  }
  for(let k=0;k<12;k++){
    const cx=Math.random()*w, cy=Math.random()*h; const r=6+Math.random()*10;
    const grad=ctx.createRadialGradient(cx,cy,1,cx,cy,r);
    grad.addColorStop(0, dark); grad.addColorStop(1, base);
    ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  }
  const tex=new THREE.CanvasTexture(cvs); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(6,1);
  tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearMipmapLinearFilter; tex.generateMipmaps=true; return tex;
}
function makeBarkTex(){
  const w=64,h=128; const cvs=document.createElement('canvas'); cvs.width=w; cvs.height=h; const ctx=cvs.getContext('2d');
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const shade = 70 + Math.floor(30*Math.sin((x*0.3)+(y*0.15)) + 20*Math.random());
      ctx.fillStyle = `rgb(${shade},${shade-20},${shade-35})`; ctx.fillRect(x,y,1,1);
    }
  }
  const tex=new THREE.CanvasTexture(cvs); tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(1,2);
  tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearMipmapLinearFilter; tex.generateMipmaps=true; return tex;
}
const WOOD_TEX = makeWoodTexStrong();
const BARK_TEX = makeBarkTex();
if(renderer.capabilities.getMaxAnisotropy){
  const an=renderer.capabilities.getMaxAnisotropy(); WOOD_TEX.anisotropy=an; BARK_TEX.anisotropy=an;
}

const matGrass = new THREE.MeshStandardMaterial({color:0xfafafa, roughness:0.95, metalness:0.0});
const matRoad  = new THREE.MeshStandardMaterial({color:0x5f6f8f, roughness:0.88, metalness:0.05});
const matRail  = new THREE.MeshStandardMaterial({color:0x9aa0b4, roughness:0.7, metalness:0.1});
const matRiver = new THREE.MeshPhysicalMaterial({color:0x8fe3ff, roughness:0.18, metalness:0.05, transmission:0.0, clearcoat:0.5, clearcoatRoughness:0.4});
const matFinish= new THREE.MeshStandardMaterial({color:0xffd166, roughness:0.6});

const matCarA = new THREE.MeshStandardMaterial({color:0xffd54f, roughness:0.6});
const matCarB = new THREE.MeshStandardMaterial({color:0x9b59b6, roughness:0.6});
const matLog  = new THREE.MeshStandardMaterial({map:WOOD_TEX, color:0xffffff, roughness:0.75, metalness:0.08});
const matTrain= new THREE.MeshStandardMaterial({color:0x222222, roughness:0.7});
const matCoin = new THREE.MeshStandardMaterial({color:0xffd166, metalness:0.6, roughness:0.3, emissive:0xcfa64a, emissiveIntensity:0.25});

/* ================== Geometries ================== */
const geoLane = new THREE.BoxGeometry(COLS*TILE, 0.2, TILE);
const geoCarS = new THREE.BoxGeometry(TILE*1.2, 0.48, TILE*0.8);
const geoCarL = new THREE.BoxGeometry(TILE*2.2, 0.48, TILE*0.8);
const geoLog  = new THREE.BoxGeometry(TILE*2.5, 0.42, TILE*0.8);
const geoTrain= new THREE.BoxGeometry(TILE*4.2, 0.7,  TILE*0.9);
const geoCoin = new THREE.CylinderGeometry(0.33,0.33,0.12,24);

/* ================== Helpers ================== */
const LANE = { GRASS:'grass', ROAD:'road', RAIL:'rail', RIVER:'river', FINISH:'finish' };
const leftX = -(COLS-1)/2*TILE, rightX = (COLS-1)/2*TILE;
const colToX = c => leftX + c*TILE;
const rowToZ = r => r*TILE;
function rng(seed){ let s = seed>>>0; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return (s>>>0)/4294967296; }; }
const rnd = rng(Math.floor(Math.random()*1e9));
const rand = (a,b)=> a + rnd()*(b-a);
const pick = arr => arr[Math.floor(rnd()*arr.length)];

function roundedRectShape(w,h,r){
  const s = new THREE.Shape(); const hw=w/2, hh=h/2; const rr=Math.min(r, hw-0.001, hh-0.001);
  s.moveTo(-hw+rr, -hh);
  s.lineTo(hw-rr, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh+rr);
  s.lineTo(hw, hh-rr);   s.quadraticCurveTo(hw, hh, hw-rr, hh);
  s.lineTo(-hw+rr, hh);  s.quadraticCurveTo(-hw, hh, -hw, hh-rr);
  s.lineTo(-hw, -hh+rr); s.quadraticCurveTo(-hw, -hh, -hw+rr, -hh);
  return s;
}

/* ================== Audio + Vibrate ================== */
function vibrate(p){ if(navigator.vibrate) try{ navigator.vibrate(p); }catch{} }
class Sound {
  constructor(){this.ctx=null;this.vol=0.25;}
  _ensure(){ if(!this.ctx){ this.ctx=new (window.AudioContext||window.webkitAudioContext)(); } }
  beep(f=440,d=0.06,t='square',v=this.vol){
    this._ensure(); const c=this.ctx; const t0=c.currentTime;
    const o=c.createOscillator(); const g=c.createGain(); o.type=t; o.frequency.setValueAtTime(f,t0);
    g.gain.setValueAtTime(0.0001,t0); g.gain.exponentialRampToValueAtTime(v,t0+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+d); o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0+d+0.01);
  }
  move(){this.beep(740,0.035,'square',0.18);}
  coin(){this.beep(880,0.05,'triangle',0.22); this.beep(1320,0.05,'triangle',0.18); vibrate([8,16]);}
  crash(){this.beep(140,0.12,'sawtooth',0.28); vibrate([16,64,16]);}
  splash(){this.beep(220,0.09,'sine',0.2); vibrate([8,16]);}
  win(){this.beep(660,0.07,'triangle',0.24); setTimeout(()=>this.beep(880,0.09,'triangle',0.24),90); setTimeout(()=>this.beep(1100,0.11,'triangle',0.24),200); vibrate([20,40,20]);}
}
const SFX = new Sound();

/* ================== Particles ================== */
const particles = [];
function addBurst(x,z,color=0xffffff,count=12){
  for(let i=0;i<count;i++){
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05,10,10),
      new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.4, transparent:true}));
    particles.push({m,x,z, vx:rand(-0.8,0.8), vy:rand(1,2.2), vz:rand(-0.8,0.8), life:800, t:0});
    m.position.set(x,0.4,z); scene.add(m);
  }
}
function updateParticles(dt){
  for(const p of particles){
    p.t+=dt; p.m.position.x += p.vx*dt/1000; p.m.position.y += p.vy*dt/1000; p.m.position.z += p.vz*dt/1000;
    p.vy -= 3*dt/1000; p.m.material.opacity = Math.max(0,1 - p.t/p.life);
  }
  for(let i=particles.length-1;i>=0;i--){ if(particles[i].t>particles[i].life){ scene.remove(particles[i].m); particles.splice(i,1); } }
}

/* ================== Rail Signal ================== */
function makeSignal(){
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,10), new THREE.MeshStandardMaterial({color:0x666666})); pole.position.y=0.5; g.add(pole);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08,10,10), new THREE.MeshStandardMaterial({color:0xaa0000, emissive:0x220000, emissiveIntensity:0.2}));
  lamp.position.set(0.18,1.05,0); g.add(lamp); g.userData.lamp = lamp; return g;
}

/* ================== World & Entities ================== */
const world = new THREE.Group(); scene.add(world);

function laneMaterial(type){ return type===LANE.ROAD? matRoad : type===LANE.RIVER? matRiver : type===LANE.RAIL? matRail : type===LANE.FINISH? matFinish : matGrass; }
function makeLaneMesh(type){
  const lane = new THREE.Mesh(geoLane, laneMaterial(type)); lane.receiveShadow=true;
  if(type===LANE.ROAD){
    const marks = new THREE.Group();
    const dashGeo = new THREE.BoxGeometry(0.45,0.05,0.06);
    const dashMat = new THREE.MeshStandardMaterial({color:0xaab3cf, roughness:0.6});
    for(let i=-COLS*2;i<=COLS*2;i++){ const d=new THREE.Mesh(dashGeo,dashMat); d.position.set(i*0.45,0.12,0); marks.add(d); }
    lane.add(marks);
  }
  if(type===LANE.RIVER){
    lane.material.transparent=true; lane.material.opacity=0.98;
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(COLS*TILE, TILE), new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:0.05, metalness:0.0, transparent:true, opacity:0.15}));
    shine.rotation.x = -Math.PI/2; shine.position.y = 0.01; lane.add(shine);
  }
  if(type===LANE.GRASS){
    const deco = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({color:0x6b4f2a, map:BARK_TEX, roughness:0.95});
    const leafCols=[0x7ec850,0x6dbb4a,0x8fd46a];
    const n = Math.floor(rand(2,5));
    for(let i=0;i<n;i++){
      const tx = rand(-COLS*0.45, COLS*0.45);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10,0.12,0.7,10), trunkMat); trunk.position.set(tx,0.35,0); trunk.castShadow=true; deco.add(trunk);
      const leafMat = new THREE.MeshStandardMaterial({color:leafCols[Math.floor(rand(0,leafCols.length))], roughness:0.7, metalness:0.02});
      const k1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,0), leafMat); k1.position.set(tx,0.95,0); k1.castShadow=true; deco.add(k1);
      const k2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38,0), leafMat); k2.position.set(tx+rand(-0.18,0.18),1.15,rand(-0.1,0.1)); k2.castShadow=true; deco.add(k2);
      const k3 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32,0), leafMat); k3.position.set(tx+rand(-0.2,0.2),0.85,rand(-0.12,0.12)); k3.castShadow=true; deco.add(k3);
    }
    lane.add(deco);
  }
  return lane;
}
function makeCar(long=false){
  const car = new THREE.Mesh(long? geoCarL : geoCarS, rnd()<0.5? matCarA : matCarB); car.castShadow=true; car.userData.kind='car';
  const wheelGeo = new THREE.CylinderGeometry(0.18,0.18,0.1,14); const wheelMat = new THREE.MeshStandardMaterial({color:0x222222, metalness:0.2, roughness:0.6});
  for(const ox of [-0.4,0.4]){ for(const oz of [-0.28,0.28]){ const w=new THREE.Mesh(wheelGeo,wheelMat); w.rotation.z=Math.PI/2; w.position.set(ox,-0.10,oz); car.add(w);} }
  const glass = new THREE.Mesh(new THREE.BoxGeometry((long?1.7:0.8),0.18,0.5), new THREE.MeshStandardMaterial({color:0xeeeeff, roughness:0.1, transparent:true, opacity:0.6})); glass.position.set(0,0.22,0); car.add(glass);
  return car;
}
function makeLog(){ const m = new THREE.Mesh(geoLog, matLog); m.castShadow=true; m.userData.kind='log'; return m; }
function makeTrain(){ const m = new THREE.Mesh(geoTrain, matTrain); m.castShadow=true; m.userData.kind='train'; return m; }
function makeCoin(){ const m = new THREE.Mesh(geoCoin, matCoin); m.rotation.x = Math.PI/2; m.castShadow=true; m.userData.kind='coin'; return m; }

/* ================== Robot (Ketty-like) ================== */
function makeRobot(){
  const skin = SKINS[State.skin] || SKINS['ketty-yellow'];
  // أبعاد تقريبية حقيقية
  const DIM = { W:0.435, D:0.450, H:1.120 };
  const INCH = 0.0254; const DIAG_SCREEN_M = 18.5 * INCH;
  const k = Math.sqrt(16*16 + 9*9);
  // تكبير الشاشة (يمكن تغيير الرقم)
  const SCREEN_SCALE = 1.25;
  const SCRW = (DIAG_SCREEN_M*(16/k))*SCREEN_SCALE;
  const SCRH = (DIAG_SCREEN_M*(9/k))*SCREEN_SCALE;

  const eps = 0.0035;
  const bodyMat   = new THREE.MeshStandardMaterial({color:skin.body,  metalness:0.08, roughness:0.48});
  const fasciaMat = new THREE.MeshPhysicalMaterial({color:skin.fascia, metalness:0.15, roughness:0.22, clearcoat:0.5, clearcoatRoughness:0.35});
  const baseMat   = new THREE.MeshStandardMaterial({color:skin.base,  metalness:0.04, roughness:0.92});
  const accentMat = new THREE.MeshStandardMaterial({color:skin.accent, emissive:skin.accent, emissiveIntensity:0.65});

  const g = new THREE.Group();

  // القاعدة
  const baseH=0.13, baseDia=Math.min(DIM.W,DIM.D)*0.92, baseR=baseDia/2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR, baseH, 48), baseMat);
  base.position.y = baseH/2; base.scale.z = DIM.D / DIM.W; base.castShadow=true; g.add(base);
  const skirt = new THREE.Mesh(new THREE.TorusGeometry(baseR*0.96, 0.022, 14, 64), new THREE.MeshStandardMaterial({color:0x0d1115, roughness:0.9}));
  skirt.rotation.x = Math.PI/2; skirt.position.y = base.position.y + 0.001; skirt.scale.z = DIM.D / DIM.W; g.add(skirt);

  // جسم خلفي
  const shellH = DIM.H - baseH - 0.01;
  const shellW = Math.max(SCRW + 0.02, DIM.W * 0.94);
  const shellD = DIM.D * 0.62;
  const shellR = Math.min(shellW, shellH) * 0.14;
  const shellGeo = new THREE.ExtrudeGeometry(roundedRectShape(shellW, shellH, shellR), { depth: shellD, bevelEnabled:false });
  shellGeo.rotateY(Math.PI/2);
  const shell = new THREE.Mesh(shellGeo, bodyMat);
  shell.position.set(0, baseH/2 + shellH/2, 0); shell.castShadow=true;

  const bodyGroup = new THREE.Group();
  bodyGroup.rotation.z = -0.12; // ميل للأمام
  bodyGroup.add(shell);
  g.add(bodyGroup);

  // الواجهة (الشاشة)
  const fasT=0.055, fasR = Math.min(SCRW, SCRH)*0.12;
  const fasGeo = new THREE.ExtrudeGeometry(roundedRectShape(SCRW, SCRH, fasR), { depth: fasT, bevelEnabled:false });
  fasGeo.rotateY(Math.PI/2);
  const fascia = new THREE.Mesh(fasGeo, fasciaMat);
  fascia.position.set(shell.position.x + shellD/2 + fasT/2 + 0.02, shell.position.y, shell.position.z);
  fascia.castShadow=true; bodyGroup.add(fascia);

  // حلية/إطار
  const bezelGeo = new THREE.ExtrudeGeometry(roundedRectShape(SCRW+0.018, SCRH+0.018, fasR+0.008), { depth:0.018, bevelEnabled:false});
  bezelGeo.rotateY(Math.PI/2);
  const bezel = new THREE.Mesh(bezelGeo, bodyMat);
  bezel.position.copy(fascia.position).add(new THREE.Vector3(-0.02-eps,0,0));
  bodyGroup.add(bezel);

  // الذقن
  const chinGeo = new THREE.ExtrudeGeometry(roundedRectShape(shellW*0.78, 0.11, 0.03), { depth: 0.05, bevelEnabled:false });
  chinGeo.rotateY(Math.PI/2);
  const chin = new THREE.Mesh(chinGeo, bodyMat);
  chin.position.set(fascia.position.x - 0.006, fascia.position.y - SCRH/2 + 0.095, 0);
  bodyGroup.add(chin);

  // قوس علوي C
  const arc = new THREE.Mesh(new THREE.TorusGeometry(shellW*0.72/2, 0.042, 20, 72, Math.PI*1.06), bodyMat);
  arc.rotation.set(Math.PI/2, 0, Math.PI*0.46);
  arc.position.set(0.06, shell.position.y + shellH/2 - 0.02, 0);
  bodyGroup.add(arc);

  // حلقة إضاءة
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 14, 36), accentMat);
  ring.rotation.y = Math.PI/2;
  ring.position.set(fascia.position.x + fasT/2 + 0.004, fascia.position.y + SCRH/2 - 0.10, 0);
  bodyGroup.add(ring);

  // رفّان داخليان
  const shelfW = shellW*0.86, shelfD = shellD*0.78, shelfT = 0.035;
  const shelfGeo = new THREE.BoxGeometry(shelfW, shelfT, shelfD);
  const shelf1 = new THREE.Mesh(shelfGeo, baseMat); shelf1.position.set(0.04, baseH/2 + shellH*0.70, 0); shelf1.castShadow=true; bodyGroup.add(shelf1);
  const shelf2 = new THREE.Mesh(shelfGeo, baseMat); shelf2.position.set(0.03, baseH/2 + shellH*0.48, 0); shelf2.castShadow=true; bodyGroup.add(shelf2);

  // عجلات صغيرة
  const wheelMat = new THREE.MeshStandardMaterial({color:0x0f1317, roughness:0.95});
  const wheelGeo = new THREE.CylinderGeometry(0.085,0.085,0.05,22);
  for(const p of [[-shellW*0.42,-shellD*0.35],[shellW*0.42,-shellD*0.35],[-shellW*0.42,shellD*0.35],[shellW*0.42,shellD*0.35]]){
    const w=new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z=Math.PI/2; w.position.set(p[0], 0.03, p[1]); g.add(w);
  }

  // تضبيط الارتفاع النهائي = 1.12م
  const bb = new THREE.Box3().setFromObject(g); const hNow = bb.max.y - bb.min.y;
  if (Math.abs(hNow - DIM.H) > 1e-4){ const scale = DIM.H / hNow; g.scale.set(scale, scale, scale); }

  g.castShadow = true;
  return g;
}

/* ================== Level Gen / Spawning ================== */
function makeLevel(){
  const lanes=[]; let hazardStreak=0; let last=LANE.GRASS;
  for(let r=0;r<START_SAFE;r++) lanes.push({type:LANE.GRASS});
  for(let r=START_SAFE;r<LEVEL_ROWS;r++){
    let options=[LANE.ROAD,LANE.RIVER,LANE.RAIL,LANE.GRASS,LANE.GRASS];
    if(hazardStreak>=2) options=[LANE.GRASS];
    let type; do{ type=pick(options); } while(type===last && rnd()<0.45);
    if(type===LANE.GRASS){ lanes.push({type}); hazardStreak=0; last=type; continue; }
    hazardStreak++; last=type;
    const dir = rnd()<0.5? -1:1; const t = (r-START_SAFE)/(LEVEL_ROWS-START_SAFE);
    if(type===LANE.ROAD)  lanes.push({type,dir,speed:(1.3+t*1.6)*dir,gap:Math.max(1.6,2.6 - t*0.7),size:rnd()<0.45?2:1,ents:[],spacing:0});
    if(type===LANE.RIVER) lanes.push({type,dir,speed:(1.0+t*1.4)*dir,gap:Math.max(1.4,2.2 - t*0.6),size:Math.floor(3+rand(0,2)),ents:[],spacing:0});
    if(type===LANE.RAIL)  lanes.push({type,dir,speed:(4.2+t*2.4)*dir,cooldown:1800 - t*1000,next:rand(900,1600),ents:[],signal:null});
  }
  lanes.push({type:LANE.FINISH});
  return lanes;
}
function spawnEntities(lane){
  const spanMin = leftX - 6, spanMax = rightX + 6; const spanWidth = spanMax - spanMin;
  if(lane.type===LANE.ROAD){
    lane.ents.length=0; const len = lane.size===2? 2 : 1;
    const minSpacing = len + Math.max(1.2, lane.gap||1.2);
    const n = Math.max(3, Math.ceil(spanWidth/minSpacing));
    const spacing = spanWidth / n; lane.spacing = spacing;
    for(let i=0;i<n;i++){
      const m = makeCar(len===2); const jitter = rand(-0.2,0.2);
      const x = spanMin + i*spacing + jitter; m.position.set(x, 0.35, 0); world.add(m); lane.ents.push(m);
    }
  }
  if(lane.type===LANE.RIVER){
    lane.ents.length=0; const len = lane.size; const laneWidthTiles = (rightX-leftX)+1;
    let n = Math.ceil(0.65 * laneWidthTiles / len); n = Math.max(3, Math.min(8, n));
    const spacing = spanWidth / n; lane.spacing = spacing;
    for(let i=0;i<n;i++){
      const m = makeLog(); m.scale.x = len/2.5; const jitter = rand(-0.15,0.15);
      const x = spanMin + i*spacing + jitter; m.position.set(x, 0.14, 0); world.add(m); lane.ents.push(m);
    }
    // ضمان جذع يمرّ بعمود اللاعب دوريًا
    const pathCol = (State && State.player)? State.player.col : Math.floor(COLS/2);
    const must = makeLog(); must.scale.x = Math.max(1.2, len/2.5); must.position.set(colToX(pathCol), 0.14, 0); world.add(must); lane.ents.push(must);
  }
  if(lane.type===LANE.RAIL && !lane.signal){ lane.signal = makeSignal(); lane.signal.position.set(rightX+0.8,0,rowToZ(0)); world.add(lane.signal); }
}
function clearEntities(lanes){ lanes.forEach(l=>{ if(l.ents){ l.ents.forEach(e=>world.remove(e)); l.ents.length=0; } if(l.signal){ world.remove(l.signal); l.signal=null; } }); }

/* ================== Coins ================== */
function placeCoins(lanes){ const s=new Set(); for(let r=1;r<lanes.length-1;r++){ if(rnd()<0.22 && (lanes[r].type===LANE.GRASS||lanes[r].type===LANE.ROAD)){ s.add(`${r}:${Math.floor(rand(0,COLS))}`);} } return s; }
const coinMeshes = new Map();

/* ================== Game State ================== */
const State = {
  lanes: [], coins:new Set(),
  player: { col:Math.floor(COLS/2), row:0, alive:true, score:0, coins:0, maxRow:0, yaw:MODEL_YAW_OFFSET, targetYaw:MODEL_YAW_OFFSET },
  lastInputAt: performance.now(), over:false, win:false, paused:false,
  best: Number(localStorage.getItem('kc_highscore_3d')||0),
  shadows: true, fx: true, skin:'ketty-yellow'
};

/* ================== Build Scene ================== */
const laneMeshes = []; let robot;
function buildScene(){
  laneMeshes.forEach(m=>world.remove(m)); laneMeshes.length=0; clearEntities(State.lanes); if(robot) world.remove(robot);
  for(let r=0;r<State.lanes.length;r++){
    const data = State.lanes[r]; const mesh = makeLaneMesh(data.type); mesh.position.set(0,-0.1,rowToZ(r)); mesh.receiveShadow=true; world.add(mesh); laneMeshes.push(mesh);
    if(data.type===LANE.ROAD||data.type===LANE.RIVER||data.type===LANE.RAIL) spawnEntities(data);
    if(data.type===LANE.RAIL && data.signal) data.signal.position.z = rowToZ(r);
  }
  coinMeshes.forEach(m=>world.remove(m)); coinMeshes.clear();
  State.coins.forEach(key=>{ const [r,c]=key.split(':').map(Number); const m=makeCoin(); m.position.set(colToX(c),0.4,rowToZ(r)); world.add(m); coinMeshes.set(key,m); });
  robot = makeRobot();
  robot.position.set(colToX(State.player.col),0.1,rowToZ(State.player.row));
  robot.rotation.y = State.player.yaw; // يواجه الأمام
  world.add(robot);
  renderer.shadowMap.enabled = State.shadows;
  [robot,...world.children].forEach(n=>{ if(n.isMesh) n.castShadow=State.shadows; });
}

/* ================== Update / Physics ================== */
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
      if(lane.signal){ const lamp = lane.signal.userData.lamp; const blink = lane.next<1000; lamp.material.emissiveIntensity = blink? (Math.sin(performance.now()/120)>0? 0.6:0.05) : 0.15; lane.signal.position.z = rowToZ(r); }
      lane.next -= dt; if(lane.next<=0 && lane.ents.length===0){ const t = makeTrain(); t.position.set(lane.dir>0? leftX-6 : rightX+6, 0.5, rowToZ(r)); world.add(t); lane.ents.push(t); lane.next = lane.cooldown + rand(0,1000); }
      const speed = lane.speed * TILE; lane.ents.forEach(m=> m.position.x += speed*dt/1000);
      lane.ents = lane.ents.filter(m=>{ const alive = (lane.dir>0? m.position.x < rightX+8 : m.position.x > leftX-8); if(!alive) world.remove(m); return alive; });
    }
  }

  if(performance.now()-State.lastInputAt > EAGLE_TIMEOUT){ gameOver(false, lang==='ar'? 'خطفك النسر!' : 'Caught by the eagle!'); }

  const pr = State.player.row; const lane = State.lanes[pr];
  if(lane && lane.type===LANE.RIVER){
    let onLog=false; let logSpeed=0;
    for(const m of lane.ents){ if(Math.abs(robot.position.x - m.position.x) < (m.scale.x*1.2) && Math.abs(robot.position.z - m.position.z) < 0.45){ onLog=true; logSpeed = lane.speed; break; } }
    if(onLog){ robot.position.x += logSpeed*dt/1000; State.player.col = Math.round((robot.position.x - leftX)/TILE); }
    else { if(State.fx) addBurst(robot.position.x, robot.position.z, 0x66ccff, 14); SFX.splash(); gameOver(false, lang==='ar'? 'سقطت في الماء':'Fell in water'); }
  }

  robot.position.x = Math.max(leftX, Math.min(rightX, robot.position.x));

  if(lane){
    if(lane.type===LANE.ROAD){ for(const m of lane.ents){ if(Math.abs(robot.position.x - m.position.x) < 0.6 && Math.abs(robot.position.z - m.position.z) < 0.45){ if(State.fx) addBurst(robot.position.x, robot.position.z, 0xff6b6b, 18); SFX.crash(); gameOver(false, lang==='ar'? 'اصطدام سيارة':'Car crash'); break; } } }
    if(lane.type===LANE.RAIL){ for(const m of lane.ents){ if(Math.abs(robot.position.x - m.position.x) < 1.6 && Math.abs(robot.position.z - m.position.z) < 0.6){ if(State.fx) addBurst(robot.position.x, robot.position.z, 0xcccccc, 20); SFX.crash(); gameOver(false, lang==='ar'? 'دهسك القطار':'Hit by train'); break; } } }
  }

  if(State.player.row >= State.lanes.length-1){ State.player.row = State.lanes.length-1; SFX.win(); gameOver(true); }

  // دوران ناعم
  const smooth = 1 - Math.pow(0.001, dt);
  State.player.yaw = lerpAngle(State.player.yaw, State.player.targetYaw, smooth);
  if (robot) robot.rotation.y = State.player.yaw;

  coinMeshes.forEach((m)=>{ m.rotation.z += dt/900; });
  updateParticles(dt);
}

/* ================== Render ================== */
function render(){ renderer.render(scene, camera); }

/* ================== Input ================== */
function tryMove(dc,dr){
  if(State.over||State.paused) return;
  const p = State.player; const targetCol = Math.max(0, Math.min(COLS-1, p.col+dc));
  const targetRow = Math.max(0, Math.min(State.lanes.length-1, p.row+dr));
  if(targetCol===p.col && targetRow===p.row) return;
  p.col = targetCol; p.row = targetRow; State.lastInputAt = performance.now();
  robot.position.set(colToX(p.col), robot.position.y, rowToZ(p.row)); SFX.move();

  // اتجاه الوجه
  let aim;
  if (Math.abs(dr) >= Math.abs(dc)) aim = (dr > 0) ? 0 : Math.PI;
  else                             aim = (dc > 0) ?  Math.PI/2 : -Math.PI/2;
  State.player.targetYaw = MODEL_YAW_OFFSET + aim;

  if(p.row > p.maxRow){ p.maxRow=p.row; p.score += 1; }
  const key = `${p.row}:${p.col}`; if(State.coins.has(key)){ State.coins.delete(key); const m = coinMeshes.get(key); if(m){ world.remove(m); coinMeshes.delete(key); } p.coins++; p.score+=5; SFX.coin(); }
  updatePills();
}

window.addEventListener('keydown', e=>{
  if(['ArrowUp','Space'].includes(e.code)){ tryMove(0,+1); e.preventDefault(); }
  if(e.code==='ArrowLeft'){ tryMove(-1,0); e.preventDefault(); }
  if(e.code==='ArrowRight'){ tryMove(+1,0); e.preventDefault(); }
  if(e.code==='ArrowDown'){ tryMove(0,-1); e.preventDefault(); }
  if(e.code==='KeyP'){ togglePause(); }
  if(e.code==='KeyO'){ settings.classList.toggle('hide'); }
});

// Click-to-advance (desktop) خارج الأوفرلاي
container.addEventListener('click', e=>{ if(e.target.closest('.overlay') || e.target.closest('button')) return; tryMove(0,+1); });

// لمس
let touchStart=null;
container.addEventListener('touchstart', e=>{ touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY,t:performance.now()}; }, {passive:true});
container.addEventListener('touchend', e=>{
  const t=performance.now(); if(!touchStart) return;
  const dx=e.changedTouches[0].clientX-touchStart.x; const dy=e.changedTouches[0].clientY-touchStart.y; const absX=Math.abs(dx), absY=Math.abs(dy);
  if(absX<24 && absY<24){ tryMove(0,+1); } else if(absX>absY){ tryMove(dx>0? +1 : -1, 0); } else { tryMove(0, dy>0? -1 : +1); }
  touchStart=null;
});

/* ================== Loop (fixed-step) ================== */
const STEP = 1000/60; let acc=0, lastRAF=performance.now(), started=false;
function tick(ts){
  let dt=ts-lastRAF; lastRAF=ts; if (dt>250) dt=250; acc+=dt;
  while(acc>=STEP){ update(STEP); acc-=STEP; }
  render();
  if(started) requestAnimationFrame(tick);
}
function startGame(){
  if(!started){ started=true; requestAnimationFrame(tick); }
  startOverlay.style.display='none';
  reset();
  SFX.move();
}

/* ================== Game Over / Pause ================== */
function gameOver(win=false, reason=''){
  if(State.over) return; State.over=true; State.win=win;
  if(State.player.score>State.best){ State.best=State.player.score; localStorage.setItem('kc_highscore_3d', String(State.best)); }
  endTitle.textContent = win? LANG[lang].endWin : LANG[lang].endLose;
  endStats.textContent = `${reason? reason+' · ' : ''}${LANG[lang].score} ${State.player.score} · ${LANG[lang].coins} ${State.player.coins} · ${LANG[lang].best} ${State.best}`;
  updatePills(); endOverlay.style.display='grid';
}
function togglePause(){ if(State.over) return; State.paused=!State.paused; pauseBtn.textContent = State.paused? LANG[lang].resume : LANG[lang].pause; }

/* ================== UI wiring ================== */
function updatePills(){ scorePill.textContent = `${LANG[lang].score} ${State.player.score} · ${LANG[lang].coins} ${State.player.coins}`; bestPill.textContent = `${LANG[lang].best} ${State.best}`; }
startBtn.addEventListener('click', startGame);
startOverlay.addEventListener('click', (e)=>{ if(e.target.closest('button')) return; startGame(); });
againBtn.addEventListener('click', ()=>{ endOverlay.style.display='none'; reset(); });
howBtn.addEventListener('click', ()=> howOverlay.style.display='grid');
closeHow.addEventListener('click', ()=> howOverlay.style.display='none');
pauseBtn.addEventListener('click', togglePause);
shareBtn.addEventListener('click', async()=>{
  const url=location.href;
  if(navigator.share){ try{ await navigator.share({title:'Ketty Cross', text:'Play Ketty Cross — 3D', url}); }catch{} }
  else { try{ await navigator.clipboard.writeText(url); shareBtn.textContent=(lang==='ar'?'تم نسخ الرابط':'Link copied'); setTimeout(()=>shareBtn.textContent=LANG[lang].share,1200);}catch{ alert(url); } }
});
shadowsToggle.addEventListener('change', e=>{ State.shadows=e.target.checked; renderer.shadowMap.enabled = State.shadows; });
fxToggle.addEventListener('change', e=>{ State.fx=e.target.checked; });
if(skinSelect){
  skinSelect.value = State.skin;
  skinSelect.addEventListener('change', e=>{
    State.skin = e.target.value;
    if(robot){ world.remove(robot); }
    robot = makeRobot();
    robot.position.set(colToX(State.player.col),0.1,rowToZ(State.player.row));
    robot.rotation.y = State.player.yaw;
    world.add(robot);
    [robot,...world.children].forEach(n=>{ if(n.isMesh) n.castShadow=State.shadows; });
  });
}

/* ================== Reset ================== */
function reset(){
  try{ clearEntities(State.lanes); }catch{}
  try{ coinMeshes.forEach(m=>{ if(m) world.remove(m); }); coinMeshes.clear(); }catch{}
  try{ laneMeshes.forEach(m=>{ if(m) world.remove(m); }); laneMeshes.length=0; }catch{}
  try{ if(robot){ world.remove(robot); robot=null; } }catch{}
  State.lanes = makeLevel();
  State.coins = placeCoins(State.lanes);
  State.player = { col:Math.floor(COLS/2), row:0, alive:true, score:0, coins:0, maxRow:0, yaw:MODEL_YAW_OFFSET, targetYaw:MODEL_YAW_OFFSET };
  State.over=false; State.win=false; State.paused=false; State.lastInputAt=performance.now();
  buildScene(); updatePills();
}

/* ================== Init ================== */
setLang(lang);
updatePills();
