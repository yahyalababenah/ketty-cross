// level.mjs — إنشاء المستوى والمسارات (lanes)

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { LANE, leftX, rightX, rowToZ, pick, rand } from './util.mjs';

export function makeLevel(START_SAFE, LEVEL_ROWS){
  const lanes=[]; let hazardStreak=0; let last=LANE.GRASS;
  for(let r=0;r<START_SAFE;r++) lanes.push({type:LANE.GRASS});
  for(let r=START_SAFE;r<LEVEL_ROWS;r++){
    let options=[LANE.ROAD,LANE.RIVER,LANE.RAIL,LANE.GRASS,LANE.GRASS];
    if(hazardStreak>=2) options=[LANE.GRASS];
    let type; do{ type=pick(options); } while(type===last && Math.random()<0.45);
    if(type===LANE.GRASS){ lanes.push({type}); hazardStreak=0; last=type; continue; }
    hazardStreak++; last=type;
    const dir = Math.random()<0.5? -1:1; const t = (r-START_SAFE)/(LEVEL_ROWS-START_SAFE);
    if(type===LANE.ROAD) lanes.push({type,dir,speed:(1.3+t*1.6)*dir,gap:2.0,ents:[],spacing:0});
    if(type===LANE.RIVER)lanes.push({type,dir,speed:(1.0+t*1.4)*dir,gap:1.6,ents:[],spacing:0});
    if(type===LANE.RAIL) lanes.push({type,dir,speed:(4.2+t*2.4)*dir,cooldown:1800,next:rand(900,1600),ents:[],signal:null});
  }
  lanes.push({type:LANE.FINISH});
  return lanes;
}

// بناء مسار lane
export function makeLaneMesh(type, assets){
  const lane = new THREE.Mesh(assets.geos.geoLane, laneMaterial(type, assets));
  lane.receiveShadow = true;
  return lane;
}
function laneMaterial(type, assets){
  return type===LANE.ROAD? assets.mats.matRoad
       :type===LANE.RIVER? assets.mats.matRiver
       :type===LANE.RAIL? assets.mats.matRail
       :type===LANE.FINISH? assets.mats.matFinish
       :assets.mats.matGrass;
}

// إنشاء الكائنات (سيارات / logs / قطارات)
export function spawnEntities(lane, assets, world){
  const spanMin = leftX - 6, spanMax = rightX + 6;
  if(lane.type===LANE.ROAD){
    lane.ents.length=0;
    for(let i=0;i<4;i++){
      const m = new THREE.Mesh(Math.random()<0.5?assets.geos.geoCarS:assets.geos.geoCarL,
                               Math.random()<0.5?assets.mats.matCarA:assets.mats.matCarB);
      m.castShadow=true; m.userData.kind='car';
      m.position.set(spanMin+i*4,0.35,0); world.add(m); lane.ents.push(m);
    }
  }
  if(lane.type===LANE.RIVER){
    lane.ents.length=0;
    for(let i=0;i<5;i++){
      const m=new THREE.Mesh(assets.geos.geoLog, assets.mats.matLog);
      m.castShadow=true; m.userData.kind='log';
      m.position.set(spanMin+i*3,0.14,0); world.add(m); lane.ents.push(m);
    }
  }
  if(lane.type===LANE.RAIL && !lane.signal){
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,10),
                              new THREE.MeshStandardMaterial({color:0x666666}));
    pole.position.y=0.5;
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(0.08,10,10),
                              new THREE.MeshStandardMaterial({color:0xaa0000,emissive:0x220000,emissiveIntensity:0.2}));
    lamp.position.set(0.18,1.05,0);
    const g=new THREE.Group(); g.add(pole); g.add(lamp);
    g.userData.lamp=lamp;
    lane.signal=g; world.add(g);
  }
}

// مسح الكائنات
export function clearEntities(lanes, world){
  lanes.forEach(l=>{
    if(l.ents){ l.ents.forEach(e=>world.remove(e)); l.ents.length=0; }
    if(l.signal){ world.remove(l.signal); l.signal=null; }
  });
}

// عملات
export function placeCoins(lanes){
  const s=new Set();
  for(let r=1;r<lanes.length-1;r++){
    if(Math.random()<0.22 && (lanes[r].type===LANE.GRASS||lanes[r].type===LANE.ROAD)){
      s.add(`${r}:${Math.floor(rand(0,9))}`);
    }
  }
  return s;
}
export function makeCoin(assets){
  const m=new THREE.Mesh(assets.geos.geoCoin, assets.mats.matCoin);
  m.rotation.x=Math.PI/2; m.castShadow=true; m.userData.kind='coin';
  return m;
}
