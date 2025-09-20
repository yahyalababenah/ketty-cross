// src/main.mjs
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import {
  TILE, COLS, VROWS, LEVEL_ROWS, START_SAFE, EAGLE_TIMEOUT,
  COLORS, LANE, leftX, rightX, colToX, rowToZ, reseed,
  MODEL_YAW_OFFSET, lerpAngle
} from './util.mjs';
import { initMaterials } from './materials.mjs';
import { Sound } from './audio.mjs';
import { makeRobot } from './robot.mjs';
import { LANG, setLang, updatePills } from './ui.mjs';
import {
  makeLevel, makeLaneMesh, spawnEntities, clearEntities,
  placeCoins, makeCoin
} from './level.mjs';

/* ============ DOM refs ============ */
const container   = document.getElementById('game');
const startOverlay= document.getElementById('startOverlay');
const endOverlay  = document.getElementById('endOverlay');
const howOverlay  = document.getElementById('howOverlay');

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
const lgd1=document.getElementById('lgd1'),
      lgd2=document.getElementById('lgd2'),
      lgd3=document.getElementById('lgd3'),
      lgd4=document.getElementById('lgd4');

const dom = {
  startTitle,startDesc,howTitle,howText,footerNote,
  lgd1,lgd2,lgd3,lgd4,startBtn,howBtn,closeHow,againBtn,shareBtn,pauseBtn,
  scorePill,bestPill,endTitle
};

/* ============ Three: renderer / scene / camera ============ */
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
container.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.sky);
scene.fog = new THREE.Fog(COLORS.sky, 18, 70);

let camera, camTargetZ=6, camLag=0;
function makeCamera(){
  const w = container.clientWidth || 360;
  const h = container.clientHeight || 640;
  const aspect = w/h;
  const frustum = 18;
  camera = new THREE.OrthographicCamera(
    -frustum*aspect/2, frustum*aspect/2, frustum/2, -frustum/2, 0.1, 300
  );
  camera.position.set(6,12,-6);
  camera.lookAt(0,0,camTargetZ);
  renderer.setSize(w,h,false);
}
window.addEventListener('resize', makeCamera, { passive:true });
makeCamera();

/* Lights */
const hemi = new THREE.HemisphereLight(0xffffff, 0xb0d6ff, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(6,12,6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera, { top:20, bottom:-10, left:-15, right:15 });
scene.add(sun);

/* ============ Materials / assets (geometries + materials) ============ */
const assets = initMaterials(renderer); // يعتمد داخليًا على THREE كـ ESM

/* ============ World + State ============ */
const world = new THREE.Group();
scene.add(world);

const State = {
  lanes: [], coins:new Set(),
  player: {
    col:Math.floor(COLS/2), row:0, alive:true, score:0, coins:0, maxRow:0,
    yaw:MODEL_YAW_OFFSET, targetYaw:MODEL_YAW_OFFSET
  },
  lastInputAt: performance.now(), over:false, win:false, paused:false,
  best: Number(localStorage.getItem('kc_highscore_3d')||0),
  shadows: true, fx: true, skin:'ketty-yellow',
  lang: localStorage.getItem('kc_lang') || 'ar'
};

const SFX = new Sound();

/* ============ Particles ============ */
const particles=[];
function addBurst(x,z,color=0xffffff,count=12){
  for(let i=0;i<count;i++){
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05,10,10),
      new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:0.4, transparent:true})
    );
    particles.push({m,x,z,
      vx:(Math.random()*1.6-0.8),
      vy:(1+Math.random()*1.2),
      vz:(Math.random()*1.6-0.8),
      life:800,
