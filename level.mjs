// src/level.mjs
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { TILE, COLS, LANE, leftX, rightX, rowToZ, colToX, rand, pick } from './util.mjs';

// إشارة القطار (عمود + لمبة تحذير)
function makeSignal(){
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,10), new THREE.MeshStandardMaterial({color:0x666666}));
  pole.position.y=0.5; g.add(pole);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08,10,10), new THREE.MeshStandardMaterial({color:0xaa0000, emissive:0x220000, emissiveIntensity:0.2}));
  lamp.position.set(0.18,1.05,0); g.add(lamp);
  g.userData.lamp = lamp;
  return g;
}

// سيارة
export function makeCar(assets,long=false){
  const {geos:{geoCarS,geoCarL}, mats:{matCarA,matCarB}} = assets;
  const car = new THREE.Mesh(long? geoCarL : geoCarS, (Math.random()<0.5? matCarA:matCarB));
  car.castShadow=true; car.userData.kind='car';

  const wheelGeo = new THREE.CylinderGeometry(0.18,0.18,0.14);
  const wheelMat = new THREE.MeshStandardMaterial({color:0x222222, metalness:0.2, roughness:0.6});
  for(const ox of [-0.4,0.4]){
    for(const oz of [-0.28,0.28]){
      const w=new THREE.Mesh(wheelGeo,wheelMat);
      w.rotation.z=Math.PI/2;
      w.position.set(ox,0.10,oz);
      car.add(w);
    }
  }

  const glass = new THREE.Mesh(new THREE.BoxGeometry(long?1.0:0.8,0.18,0.5), new THREE.MeshStandardMaterial({color:0xeeeeff, roughness:0.1, transparent:true, opacity:0.6}));
  glass.position.set(0,0.22,0); car.add(glass);

  return car;
}

// كائنات أخرى
export const makeLog   = assets => { const m=new THREE.Mesh(assets.geos.geoLog, assets.mats.matLog); m.castShadow=true; m.userData.kind='log'; return m; };
export const makeTrain = assets => { const m=new THREE.Mesh(assets.geos.geoTrain, assets.mats.matTrain); m.castShadow=true; m.userData.kind='train'; return m; };
export const makeCoin  = assets => { const m=new THREE.Mesh(assets.geos.geoCoin, assets.mats.matCoin); m.rotation.x=Math.PI/2; m.castShadow=true; m.userData.kind='coin'; return m; };

// Lane أساسي
function laneMaterial(type, mats){
  return type===LANE.ROAD? mats.matRoad :
         type===LANE.RIVER? mats.matRiver :
         type===LANE.RAIL? mats.matRail :
         type===LANE.FINISH? mats.matFinish : mats.matGrass;
}

export function makeLaneMesh(type, assets){
  const mat = laneMaterial(type, assets.mats);
  const m   = new THREE.Mesh(assets.geos.geoLane, mat);
  m.receiveShadow=true;
  return m;
}

// إنشاء المستوى (بسيط: سطر safe + وسط + finish)
export function makeLevel(startSafe, rows){
  const lanes=[];
  for(let r=0;r<rows;r++){
    let type;
    if(r<startSafe) type=LANE.GRASS;
    else if(r===rows-1) type=LANE.FINISH;
    else{
      const dice=Math.random();
      if(dice<0.25) type=LANE.ROAD;
      else if(dice<0.5) type=LANE.RIVER;
      else if(dice<0.6) type=LANE.RAIL;
      else type=LANE.GRASS;
    }
    lanes.push({type, ents:[], coins:[], row:r});
  }
  return lanes;
}

// توليد محتوى الكائنات في lane
export function spawnEntities(lane, assets, world){
  if(lane.type===LANE.ROAD){
    for(let i=0;i<3;i++){ const c=makeCar(assets, Math.random()<0.5); c.position.set(rand(leftX,rightX),0.25,rowToZ(lane.row)); world.add(c); lane.ents.push(c); }
  }
  if(lane.type===LANE.RIVER){
    for(let i=0;i<2;i++){ const log=makeLog(assets); log.position.set(rand(leftX,rightX),0.2,rowToZ(lane.row)); world.add(log); lane.ents.push(log); }
  }
  if(lane.type===LANE.RAIL){
    lane.signal=makeSignal(); lane.signal.position.set(-COLS/2,0,rowToZ(lane.row)); world.add(lane.signal);
    lane.ents=[];
  }
}

// حذف الكائنات
export function clearEntities(lanes, world){
  for(const lane of lanes){
    if(lane.ents){ for(const m of lane.ents){ world.remove(m); } }
    if(lane.signal){ world.remove(lane.signal); }
  }
}

// توزيع العملات
export function placeCoins(lanes){
  const set=new Set();
  for(const lane of lanes){
    if(lane.type===LANE.GRASS && Math.random()<0.3){
      const col=Math.floor(Math.random()*COLS);
      set.add(`${lane.row}:${col}`);
    }
  }
  return set;
}
