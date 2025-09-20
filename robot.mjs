import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { roundedRectShape } from './util.mjs';

export const SKINS = {
  'ketty-yellow': { body:0xf4c84e, fascia:0x121417, base:0x6b7280, accent:0x3ed2ff },
  'ketty-black':  { body:0x111827, fascia:0x0c0f12, base:0x6b7280, accent:0x3ed2ff }
};
export const SCREEN_SCALE_DEFAULT = 1.25;

export function makeRobot(State){
  const skin = SKINS[State.skin] || SKINS['ketty-yellow'];
  const DIM = { W:0.435, D:0.450, H:1.120 };
  const DIAG = 18.5 * 0.0254; const k = Math.sqrt(16*16+9*9);
  const SCRW = (DIAG*(16/k)) * SCREEN_SCALE_DEFAULT;
  const SCRH = (DIAG*(9/k))  * SCREEN_SCALE_DEFAULT;
  const eps = 0.0035;

  const bodyMat   = new THREE.MeshStandardMaterial({color:skin.body,  metalness:0.08, roughness:0.48});
  const fasciaMat = new THREE.MeshPhysicalMaterial({color:skin.fascia, metalness:0.15, roughness:0.22, clearcoat:0.5, clearcoatRoughness:0.35});
  const baseMat   = new THREE.MeshStandardMaterial({color:skin.base,  metalness:0.04, roughness:0.92});
  const accentMat = new THREE.MeshStandardMaterial({color:skin.accent, emissive:skin.accent, emissiveIntensity:0.65});

  const g = new THREE.Group();

  // base
  const baseH = 0.13;
  const baseDia = Math.min(DIM.W,DIM.D)*0.92, baseR=baseDia/2;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR, baseH, 48), baseMat);
  base.position.y=baseH/2; base.scale.z = DIM.D / DIM.W; base.castShadow=true; g.add(base);
  const skirt = new THREE.Mesh(new THREE.TorusGeometry(baseR*0.96, 0.022, 14, 64), new THREE.MeshStandardMaterial({color:0x0d1115, roughness:0.9}));
  skirt.rotation.x=Math.PI/2; skirt.position.y=base.position.y+0.001; skirt.scale.z = DIM.D/DIM.W; g.add(skirt);

  // shell
  const shellH = DIM.H - baseH - 0.01;
  const shellW = Math.max(SCRW + 0.02, DIM.W * 0.94);
  const shellD = DIM.D * 0.62;
  const shellR = Math.min(shellW, shellH) * 0.14;
  const shellGeo = new THREE.ExtrudeGeometry(roundedRectShape(shellW, shellH, shellR), { depth: shellD, bevelEnabled:false });
  shellGeo.rotateY(Math.PI/2);
  const shell = new THREE.Mesh(shellGeo, bodyMat);
  shell.position.set(0, baseH/2 + shellH/2, 0); shell.castShadow=true;
  const bodyGroup = new THREE.Group(); bodyGroup.rotation.z = -0.12; bodyGroup.add(shell); g.add(bodyGroup);

  // fascia (screen)
  const fasT = 0.055; const fasR = Math.min(SCRW, SCRH) * 0.12;
  const fasGeo = new THREE.ExtrudeGeometry(roundedRectShape(SCRW, SCRH, fasR), { depth: fasT, bevelEnabled:false });
  fasGeo.rotateY(Math.PI/2);
  const fascia = new THREE.Mesh(fasGeo, fasciaMat);
  fascia.position.set(shell.position.x + shellD/2 + fasT/2 + 0.02, shell.position.y, shell.position.z);
  fascia.castShadow = true; bodyGroup.add(fascia);

  const bezelGeo = new THREE.ExtrudeGeometry(roundedRectShape(SCRW+0.018, SCRH+0.018, fasR+0.008), { depth: 0.018, bevelEnabled:false });
  bezelGeo.rotateY(Math.PI/2);
  const bezel = new THREE.Mesh(bezelGeo, bodyMat);
  bezel.position.copy(fascia.position).add(new THREE.Vector3(-0.02-eps,0,0));
  bodyGroup.add(bezel);

  const chinGeo = new THREE.ExtrudeGeometry(roundedRectShape(shellW*0.78, 0.11, 0.03), { depth: 0.05, bevelEnabled:false });
  chinGeo.rotateY(Math.PI/2);
  const chin = new THREE.Mesh(chinGeo, bodyMat);
  chin.position.set(fascia.position.x - 0.006, fascia.position.y - SCRH/2 + 0.095, 0);
  bodyGroup.add(chin);

  const arc = new THREE.Mesh(new THREE.TorusGeometry(shellW*0.72/2, 0.042, 20, 72, Math.PI*1.06), bodyMat);
  arc.rotation.set(Math.PI/2,0,Math.PI*0.46);
  arc.position.set(0.06, shell.position.y + shellH/2 - 0.02, 0); bodyGroup.add(arc);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 14, 36), accentMat);
  ring.rotation.y = Math.PI/2;
  ring.position.set(fascia.position.x + fasT/2 + 0.004, fascia.position.y + SCRH/2 - 0.10, 0);
  bodyGroup.add(ring);

  const shelfW=shellW*0.86, shelfD=shellD*0.78, shelfT=0.035, shelfGeo=new THREE.BoxGeometry(shelfW, shelfT, shelfD);
  const shelf1 = new THREE.Mesh(shelfGeo, baseMat); shelf1.position.set(0.04, baseH/2 + shellH*0.70, 0); shelf1.castShadow=true; bodyGroup.add(shelf1);
  const shelf2 = new THREE.Mesh(shelfGeo, baseMat); shelf2.position.set(0.03, baseH/2 + shellH*0.48, 0); shelf2.castShadow=true; bodyGroup.add(shelf2);

  const wheelMat = new THREE.MeshStandardMaterial({color:0x0f1317, roughness:0.95});
  const wheelGeo = new THREE.CylinderGeometry(0.085,0.085,0.05,22);
  for(const p of [[-shellW*0.42,-shellD*0.35],[shellW*0.42,-shellD*0.35],[-shellW*0.42,shellD*0.35],[shellW*0.42,shellD*0.35]]){
    const w=new THREE.Mesh(wheelGeo,wheelMat); w.rotation.z=Math.PI/2; w.position.set(p[0],0.03,p[1]); g.add(w);
  }

  const bb = new THREE.Box3().setFromObject(g);
  const hNow = bb.max.y - bb.min.y; if (Math.abs(hNow - DIM.H) > 1e-4){ const s = DIM.H / hNow; g.scale.set(s,s,s); }

  g.castShadow = true;
  return g;
}
