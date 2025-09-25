// src/materials.mjs
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { COLS, TILE, COLORS } from './util.mjs';

// === توليد خامات كانفس (خشب قوي + لحاء) ===
function makeWoodTexStrong(renderer){
  const w=256,h=64;
  const cvs=document.createElement('canvas'); cvs.width=w; cvs.height=h;
  const ctx=cvs.getContext('2d');
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
  const tex=new THREE.CanvasTexture(cvs);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(6,1);
  tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps=true;
  if(renderer.capabilities.getMaxAnisotropy){
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return tex;
}

function makeBarkTex(renderer){
  const w=64,h=128;
  const cvs=document.createElement('canvas'); cvs.width=w; cvs.height=h;
  const ctx=cvs.getContext('2d');
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++){
      const shade = 70 + Math.floor(30*Math.sin((x*0.3)+(y*0.15)) + 20*Math.random());
      ctx.fillStyle = `rgb(${shade},${shade-20},${shade-35})`;
      ctx.fillRect(x,y,1,1);
    }
  }
  const tex=new THREE.CanvasTexture(cvs);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(1,2);
  tex.magFilter=THREE.LinearFilter; tex.minFilter=THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps=true;
  if(renderer.capabilities.getMaxAnisotropy){
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }
  return tex;
}

// === نقطة الدخول: ترجيع geos + mats في كائن واحد ===
export function initMaterials(renderer){
  // Textures
  const WOOD_TEX = makeWoodTexStrong(renderer);
  const BARK_TEX = makeBarkTex(renderer);

  // Materials
  const matGrass = new THREE.MeshStandardMaterial({color:new THREE.Color(0xfafafa), roughness:0.95, metalness:0.0});
  const matRoad  = new THREE.MeshStandardMaterial({color:new THREE.Color(0x5f6f8f), roughness:0.88, metalness:0.05});
  const matRail  = new THREE.MeshStandardMaterial({color:new THREE.Color(0x9aa0b4), roughness:0.7,  metalness:0.1});
  const matRiver = new THREE.MeshPhysicalMaterial({color:new THREE.Color(0x8fe3ff), roughness:0.18, metalness:0.05, transmission:0.0, clearcoat:0.5, clearcoatRoughness:0.4});
  const matFinish= new THREE.MeshStandardMaterial({color:new THREE.Color(0xffd166), roughness:0.6});

  const matCarA  = new THREE.MeshStandardMaterial({color:new THREE.Color(0xffd54f), roughness:0.6});
  const matCarB  = new THREE.MeshStandardMaterial({color:new THREE.Color(0x9b59b6), roughness:0.6});
  const matLog   = new THREE.MeshStandardMaterial({map:WOOD_TEX, color:0xffffff, roughness:0.75, metalness:0.08});
  const matTrain = new THREE.MeshStandardMaterial({color:new THREE.Color(0x222222), roughness:0.7});
  const matCoin  = new THREE.MeshStandardMaterial({color:new THREE.Color(0xffd166), metalness:0.6, roughness:0.3, emissive:0xcfa64a, emissiveIntensity:0.25});

  // Geometries
  const geoLane  = new THREE.BoxGeometry(COLS*TILE, 0.2, TILE);
  const geoCarS  = new THREE.BoxGeometry(TILE*1.2, 0.48, TILE*0.8);
  const geoCarL  = new THREE.BoxGeometry(TILE*2.2, 0.48, TILE*0.8);
  const geoLog   = new THREE.BoxGeometry(TILE*2.5, 0.42, TILE*0.8);
  const geoTrain = new THREE.BoxGeometry(TILE*4.2, 0.7,  TILE*0.9);
  const geoCoin  = new THREE.CylinderGeometry(0.33,0.33,0.12,24);

  return {
    tex: { WOOD_TEX, BARK_TEX },
    mats: { matGrass, matRoad, matRail, matRiver, matFinish, matCarA, matCarB, matLog, matTrain, matCoin },
    geos: { geoLane, geoCarS, geoCarL, geoLog, geoTrain, geoCoin },
    colors: COLORS
  };
}
