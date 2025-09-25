// src/level.mjs
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { TILE, COLS, LANE, leftX, rightX, rowToZ, colToX } from './util.mjs';

const pick = arr => arr[Math.floor(Math.random()*arr.length)];
const rand = (a,b)=> a + Math.random()*(b-a);

export function makeLaneMesh(type, assets){
  const lane = new THREE.Mesh(assets.geos.geoLane,
    type===LANE.ROAD   ? assets.mats.matRoad  :
    type===LANE.RIVER  ? assets.mats.matRiver :
    type===LANE.RAIL   ? assets.mats.matRail  :
    type===LANE.FINISH ? assets.mats.matFinish: assets.mats.matGrass
  );
  lane.receiveShadow=true;

  if(type===LANE.ROAD){
    const marks = new THREE.Group();
    const dashGeo = new THREE.BoxGeometry(0.45,0.05,0.06);
    const dashMat = new THREE.MeshStandardMaterial({color:0xaab3cf, roughness:0.6});
    for(let i=-COLS*2;i<=COLS*2;i++){
      const d = new THREE.Mesh(dashGeo, dashMat); d.position.set(i*0.45,0.12,0); marks.add(d);
    }
    lane.add(marks);
  }
  if(type===LANE.RIVER){
    lane.material.transparent=true; lane.material.opacity=0.98;
    const shine = new THREE.Mesh(new THREE.PlaneGeometry(COLS*TILE, TILE),
      new THREE.MeshPhysicalMaterial({color:0xffffff, roughness:0.05, metalness:0.0, transparent:true, opacity:0.15}));
    shine.rotation.x = -Math.PI/2; shine.position.y = 0.01; lane.add(shine);
  }
  if(type===LANE.GRASS){
    const deco = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({color:0x6b4f2a, map:assets.mats.BARK_TEX, roughness:0.95});
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

export function makeCoin(assets){
  const m = new THREE.Mesh(assets.geos.geoCoin, assets.mats.matCoin);
  m.rotation.x = Math.PI/2; m.castShadow=true; m.userData.kind='coin';
  return m;
}

function makeCar(assets, long=false){
  const car = new THREE.Mesh(long? assets.geos.geoCarL : assets.geos.geoCarS, Math.random()<0.5? assets.mats.matCarA : assets.mats.matCarB);
  car.castShadow=true; car.userData.kind='car';
  const wheelGeo = new THREE.CylinderGeometry(0.18,0.18,0.1,14);
  const wheelMat = new THREE.MeshStandardMaterial({color:0x222222, metalness:0.2, roughness:0.6});
  for(const ox of [-0.4,0.4]){ for(const oz of [-0.28,0.28]){ const w=new THREE.Mesh(wheelGeo,wheelMat); w.rotation.z=Math.PI/2; w.position.set(ox,-0.10,oz); car.add(w);} }
  const glass = new THREE.Mesh(new THREE.BoxGeometry((long?1.7:0.8),0.18,0.5),
    new THREE.MeshStandardMaterial({color:0xeeeeff, roughness:0.1, transparent:true, opacity:0.6}));
  glass.position.set(0,0.22,0); car.add(glass);
  return car;
}
function makeLog(assets){
  const m = new THREE.Mesh(assets.geos.geoLog, assets.mats.matLog);
  m.castShadow=true; m.userData.kind='log'; return m;
}

export function spawnEntities(lane, assets, world){
  const spanMin = leftX - 6, spanMax = rightX + 6; const spanWidth = spanMax - spanMin;

  if(lane.type===LANE.ROAD){
    lane.ents = []; const len = lane.size===2? 2 : 1;
    const minSpacing = len + Math.max(1.2, lane.gap||1.2);
    const n = Math.max(3, Math.ceil(spanWidth/minSpacing));
    const spacing = spanWidth / n; lane.spacing = spacing;
    for(let i=0;i<n;i++){
      const m = makeCar(assets, len===2); const jitter = rand(-0.2,0.2);
      const x = spanMin + i*spacing + jitter; m.position.set(x, 0.35, 0); world.add(m); lane.ents.push(m);
    }
  }

  if(lane.type===LANE.RIVER){
    lane.ents = []; const len = lane.size; const laneWidthTiles = (rightX-leftX)+1;
    let n = Math.ceil(0.65 * laneWidthTiles / len); n = Math.max(3, Math.min(8, n));
    const spacing = spanWidth / n; lane.spacing = spacing;
    for(let i=0;i<n;i++){
      const m = makeLog(assets); m.scale.x = len/2.5; const jitter = rand(-0.15,0.15);
      const x = spanMin + i*spacing + jitter; m.position.set(x, 0.14, 0); world.add(m); lane.ents.push(m);
    }
    // ضمان جذع يغطي عمود اللاعب
    const must = makeLog(assets);
    must.scale.x = Math.max(1.2, len/2.5);
    must.position.set(colToX(Math.floor(COLS/2)), 0.14, 0); world.add(must); lane.ents.push(must);
  }

  if(lane.type===LANE.RAIL && !lane.signal){
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,10),
      new THREE.MeshStandardMaterial({color:0x666666})); pole.position.y=0.5; g.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08,10,10),
      new THREE.MeshStandardMaterial({color:0xaa0000, emissive:0x220000, emissiveIntensity:0.2}));
    lamp.position.set(0.18,1.05,0); g.add(lamp);
    g.userData.lamp = lamp;
    lane.signal = g;
    g.position.set(rightX+0.8,0,rowToZ(0));
    world.add(g);
  }
}

export function clearEntities(lanes, world){
  lanes.forEach(l=>{
    if(l.ents){ l.ents.forEach(e=>world.remove(e)); l.ents.length=0; }
    if(l.signal){ world.remove(l.signal); l.signal=null; }
  });
}

export function makeLevel(START_SAFE, LEVEL_ROWS){
  const lanes=[]; let hazardStreak=0; let last=LANE.GRASS;
  for(let r=0;r<START_SAFE;r++){ lanes.push({type:LANE.GRASS}); }
  for(let r=START_SAFE;r<LEVEL_ROWS;r++){
    let options=[LANE.ROAD,LANE.RIVER,LANE.RAIL,LANE.GRASS,LANE.GRASS];
    if(hazardStreak>=2){ options=[LANE.GRASS]; }
    let type; do{ type=pick(options); } while(type===last && Math.random()<0.45);
    if(type===LANE.GRASS){ lanes.push({type}); hazardStreak=0; last=type; continue; }
    hazardStreak++; last=type;
    const dir = Math.random()<0.5? -1:1; const t = (r-START_SAFE)/(LEVEL_ROWS-START_SAFE);
    if(type===LANE.ROAD){ lanes.push({type,dir,speed:(1.3+t*1.6)*dir,gap:Math.max(1.6,2.6 - t*0.7),size:Math.random()<0.45?2:1,ents:[],spacing:0}); }
    if(type===LANE.RIVER){ lanes.push({type,dir,speed:(1.0+t*1.4)*dir,gap:Math.max(1.4,2.2 - t*0.6),size:Math.floor(3+rand(0,2)),ents:[],spacing:0}); }
    if(type===LANE.RAIL){ lanes.push({type,dir,speed:(4.2+t*2.4)*dir,cooldown:1800 - t*1000,next:rand(900,1600),ents:[],signal:null}); }
  }
  lanes.push({type:LANE.FINISH});
  return lanes;
}

export function placeCoins(lanes){
  const s=new Set();
  for(let r=1;r<lanes.length-1;r++){
    if(Math.random()<0.22 && (lanes[r].type===LANE.GRASS||lanes[r].type===LANE.ROAD)){
      s.add(`${r}:${Math.floor(Math.random()*COLS)}`);
    }
  }
  return s;
}
