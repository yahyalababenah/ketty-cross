import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export const TILE=1, COLS=9, VROWS=14, LEVEL_ROWS=52, START_SAFE=3, EAGLE_TIMEOUT=6500;
const CSS = n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const COLORS = {
  sky:CSS('--sky')||'#bde7ff', grass:CSS('--grass')||'#c5f68f',
  road:CSS('--road')||'#d4d4d4', rail:CSS('--rail')||'#b3a48f',
  river:CSS('--river')||'#9ed3ff', finish:CSS('--finish')||'#ffd166',
  ui:CSS('--ui')||'#0f172a'
};
export const LANE = { GRASS:'grass', ROAD:'road', RAIL:'rail', RIVER:'river', FINISH:'finish' };
export const leftX = -(COLS-1)/2*TILE, rightX = (COLS-1)/2*TILE;
export const colToX = c => leftX + c*TILE;
export const rowToZ = r => r*TILE;

export function rng(seed){ let s = seed>>>0; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return (s>>>0)/4294967296; }; }
let _rnd = rng(Math.floor(Math.random()*1e9));
export const rnd = ()=>_rnd();
export const rand=(a,b)=> a + _rnd()*(b-a);
export const pick=arr => arr[Math.floor(_rnd()*arr.length)];
export function reseed(){ _rnd = rng(Math.floor(Math.random()*1e9)); }

export const MODEL_YAW_OFFSET = -Math.PI/2;
export function lerpAngle(a,b,t){ let d=b-a; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return a+d*t; }

export function roundedRectShape(w,h,r){
  const s = new THREE.Shape(); const hw=w/2, hh=h/2; const rr=Math.min(r, hw-1e-3, hh-1e-3);
  s.moveTo(-hw+rr, -hh);
  s.lineTo(hw-rr, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh+rr);
  s.lineTo(hw, hh-rr); s.quadraticCurveTo(hw, hh, hw-rr, hh);
  s.lineTo(-hw+rr, hh); s.quadraticCurveTo(-hw, hh, -hw, hh-rr);
  s.lineTo(-hw, -hh+rr); s.quadraticCurveTo(-hw, -hh, -hw+rr, -hh);
  return s;
}
