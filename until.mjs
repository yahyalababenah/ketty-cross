// src/util.mjs
export const TILE = 1, COLS = 9, VROWS = 14, LEVEL_ROWS = 52, START_SAFE = 3, EAGLE_TIMEOUT = 6500;

export const COLORS = {
  sky:'#bde7ff', grass:'#c5f68f', road:'#d4d4d4', rail:'#b3a48f', river:'#9ed3ff', finish:'#ffd166', ui:'#0f172a'
};

export const LANE = { GRASS:'grass', ROAD:'road', RAIL:'rail', RIVER:'river', FINISH:'finish' };

export const leftX = -(COLS-1)/2*TILE;
export const rightX = (COLS-1)/2*TILE;
export const colToX = c => leftX + c*TILE;
export const rowToZ = r => r*TILE;

// نموذج الروبوت مُنشأ باتجاه +X، ونحن نعتبر الأمام +Z
export const MODEL_YAW_OFFSET = -Math.PI/2;

// مزج زوايا مع معالجة التفاف ±π
export function lerpAngle(a, b, t){
  let d = b - a;
  while (d >  Math.PI) d -= Math.PI*2;
  while (d < -Math.PI) d += Math.PI*2;
  return a + d * t;
}

// واجهات اختيارية (بعض الملفات قد تناديها)
export function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
export function rand(a,b){ return a + Math.random()*(b-a); }
export function reseed(){ /* لا شيء — نستخدم Math.random */ }
