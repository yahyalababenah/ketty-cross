// src/robot.mjs
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { MODEL_YAW_OFFSET } from './util.mjs';

/* =========================================================
   1) إعدادات وقياسات حقيقية
   ========================================================= */
const DIM = { W:0.450, D:0.435, H:1.120 }; // العرض، العمق، الارتفاع (متر)

// شاشة 18.5" عمودية (16:9)
const DIAG = 18.5 * 0.0254;
const K = Math.sqrt(16*16 + 9*9);
const SCR = { W: DIAG * ( 9 / K), H: DIAG * (16 / K) }; // ≈ 0.230 × 0.409

/* =========================================================
   2) Utilities هندسية
   ========================================================= */
function roundedRectShape(w,h,r){
  const s = new THREE.Shape(), hw=w/2, hh=h/2, rr=Math.min(r, hw-1e-3, hh-1e-3);
  s.moveTo(-hw+rr, -hh);
  s.lineTo(hw-rr, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh+rr);
  s.lineTo(hw, hh-rr); s.quadraticCurveTo(hw, hh, hw-rr, hh);
  s.lineTo(-hw+rr, hh); s.quadraticCurveTo(-hw, hh, -hw, hh-rr);
  s.lineTo(-hw, -hh+rr); s.quadraticCurveTo(-hw, -hh, -hw+rr, -hh);
  return s;
}

// Super-ellipse: |x/a|^n + |y/b|^n = 1  (n بين 2 و 3 يعطي مستطيل-بيضي)
function superEllipseShape(a, b, n=2.7, segments=128){
  const s = new THREE.Shape();
  for(let i=0;i<=segments;i++){
    const t = (i/segments) * Math.PI*2;
    const ct = Math.cos(t), st = Math.sin(t);
    const x = Math.sign(ct) * Math.pow(Math.abs(ct), 2/n) * a;
    const y = Math.sign(st) * Math.pow(Math.abs(st), 2/n) * b;
    if(i===0) s.moveTo(x,y); else s.lineTo(x,y);
  }
  s.closePath();
  return s;
}

/* =========================================================
   3) مواد محايدة (الألوان ثانوية — التركيز هندسي)
   ========================================================= */
const MAT = {
  body  : new THREE.MeshPhysicalMaterial({ color:0xffc53d, roughness:0.35, metalness:0.06, clearcoat:0.65, clearcoatRoughness:0.3, sheen:0.18 }),
  fascia: new THREE.MeshPhysicalMaterial({ color:0x0b0e11, roughness:0.2,  metalness:0.12, clearcoat:0.75, clearcoatRoughness:0.25 }),
  screen: new THREE.MeshPhysicalMaterial({ color:0x0f1113, roughness:0.12, metalness:0.0, clearcoat:0.62, clearcoatRoughness:0.22, reflectivity:0.22 }),
  baseL : new THREE.MeshStandardMaterial({  color:0xbfc7cf, roughness:0.9,  metalness:0.06 }),
  baseD : new THREE.MeshStandardMaterial({  color:0x8f98a3, roughness:0.95, metalness:0.05 }),
  bumper: new THREE.MeshStandardMaterial({  color:0x111418, roughness:0.98 }),
  led   : new THREE.MeshStandardMaterial({  color:0xffffff, emissive:0xbde3ff, emissiveIntensity:0.9 }),
  cam   : new THREE.MeshStandardMaterial({  color:0x66ccff, emissive:0x66ccff, emissiveIntensity:0.95 }),
  tray  : new THREE.MeshStandardMaterial({  color:0xffd769, roughness:0.85, metalness:0.04 }),
  bin   : new THREE.MeshStandardMaterial({  color:0x555e68, roughness:0.9,  metalness:0.04 }),
};

/* =========================================================
   4) النموذج
   ========================================================= */
export function makeRobot(State){
  
  const opt = Object.assign({
    mode:'cover',    // 'cover' أو 'trays'
    trays:2,
    leanDeg:7        // ميل واجهة الرأس للأمام
  }, State||{});

  const root = new THREE.Group();

  /* ---------- قاعدة Super-Ellipse بواقعية أعلى ---------- */
  const baseH = 0.12;
  const a = DIM.W*0.48, b = DIM.D*0.48;

  // جزء سفلي داكن مع Bevel لطيف
  const se = superEllipseShape(a*0.98, b*0.98, 2.7, 160);
  const baseDark = new THREE.Mesh(
    new THREE.ExtrudeGeometry(se, {
      depth: baseH*0.56,
      bevelEnabled:true, bevelSize:0.008, bevelThickness:0.006, bevelSegments:4,
      curveSegments:160
    }),
    MAT.baseD
  );
  baseDark.rotation.x = -Math.PI/2; // Extrude Z→Y
  baseDark.position.y = baseH*0.28;
  baseDark.castShadow = true;
  root.add(baseDark);

  // جزء علوي فاتح
  const se2 = superEllipseShape(a, b, 2.7, 160);
  const baseLight = new THREE.Mesh(
    new THREE.ExtrudeGeometry(se2, {
      depth: baseH*0.44,
      bevelEnabled:true, bevelSize:0.006, bevelThickness:0.006, bevelSegments:3,
      curveSegments:160
    }),
    MAT.baseL
  );
  baseLight.rotation.x = -Math.PI/2;
  baseLight.position.y = baseH*0.78;
  baseLight.castShadow = true;
  root.add(baseLight);

  // مصدّ محيطي: حلقة مُفرّغة (شكل خارجي + ثقب داخلي)
  const ringOuter = superEllipseShape(a*1.005, b*1.005, 2.7, 200);
  const ringInner = superEllipseShape(a*0.965, b*0.965, 2.7, 200);
  ringOuter.holes.push(ringInner);
  const bumper = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ringOuter, { depth: 0.02, bevelEnabled:false, curveSegments:200 }),
    MAT.bumper
  );
  bumper.rotation.x = -Math.PI/2;
  bumper.position.y = baseH*0.78 + 0.001;
  bumper.castShadow = true;
  root.add(bumper);

  /* ---------- جسم Lathe بروفيـل واقعي (C-Shape + ذقن أمامي) ---------- */
  const shellH = DIM.H - baseH;
  const r0 = Math.min(DIM.W, DIM.D) * 0.465;

  // ملامح مأخوذة بصريًا: قاعدة ممتلئة → خصر → كتف/رقبة → جبهة (chamfer) → قمة
  const yr = [
    [0.00, r0*1.06], [0.05, r0*1.04],      // عند القاعدة
    [0.15, r0*0.98], [0.30, r0*0.92],      // بطن خفيف
    [0.48, r0*0.84], [0.65, r0*0.79],      // خصر
    [0.82, r0*0.73], [0.90, r0*0.71],      // كتف
    [0.96, r0*0.67], [0.985, r0*0.645],    // رقبة
    [1.00, r0*0.625]                       // قمة
  ];
  const profile = yr.map(([yf,r]) => new THREE.Vector2(r, baseH + yf*shellH));
  profile.push(new THREE.Vector2(0.0, baseH + shellH + 1e-3));

  const shellGeo = new THREE.LatheGeometry(profile, 200);
  shellGeo.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeo, MAT.body);
  shell.castShadow = true;
  root.add(shell);

  /* ---------- مجموعة الرأس والواجهة (تميل للأمام فقط) ---------- */
  const head = new THREE.Group(); root.add(head);
  const lean = THREE.MathUtils.degToRad(opt.leanDeg||7);

  // Fascia سوداء سميكة + شاشة غائرة قليلاً
  const fasT = 0.052;
  const fasW = SCR.W + 0.045;
  const fasH = SCR.H + 0.045;

  // وضع أمامي دقيق
  const frontX = r0*1.02 + fasT*0.5;
  const screenBottomY = baseH + 0.21;
  const screenCenterY = screenBottomY + SCR.H/2;

  const fasGeo = new THREE.ExtrudeGeometry(roundedRectShape(fasW, fasH, 0.062), { depth: fasT, bevelEnabled:false });
  fasGeo.rotateY(Math.PI/2);
  const fascia = new THREE.Mesh(fasGeo, MAT.fascia);
  fascia.position.set(frontX + 0.016, screenCenterY, 0);
  fascia.castShadow = true;
  head.add(fascia);

  const scrGeo = new THREE.ExtrudeGeometry(roundedRectShape(SCR.W, SCR.H, 0.046), { depth: 0.013, bevelEnabled:false });
  scrGeo.rotateY(Math.PI/2);
  const screen = new THREE.Mesh(scrGeo, MAT.screen);
  screen.position.copy(fascia.position).add(new THREE.Vector3(fasT/2 + 0.006, 0, 0));
  screen.castShadow = false;
  head.add(screen);

  // حلقة LED + تجويف كاميرا
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.012, 18, 80), MAT.led);
  ring.rotation.y = Math.PI/2;
  ring.position.set(fascia.position.x + 0.02, baseH + shellH - 0.112, 0);
  head.add(ring);

  const camBezel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.012, 24),
    new THREE.MeshStandardMaterial({ color:0x0b0e11, roughness:0.4, metalness:0.2 })
  );
  camBezel.rotation.z = Math.PI/2;
  camBezel.position.set(fascia.position.x + 0.036, baseH + shellH - 0.105, 0.052);
  head.add(camBezel);

  const cam = new THREE.Mesh(new THREE.SphereGeometry(0.009, 20, 20), MAT.cam);
  cam.position.copy(camBezel.position).add(new THREE.Vector3(0.006, 0, 0));
  head.add(cam);

  // قبّة رأس منحنية (نصف كرة مفلطحة قليلاً)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 32, 24, 0, Math.PI*2, 0, Math.PI/2), MAT.body);
  cap.position.set(r0*0.70, baseH + shellH - 0.02, 0);
  cap.scale.set(1.05, 0.7, 0.95);
  head.add(cap);

  // إمالة الرأس للأمام فقط (لا نميل الجسم)
  head.rotation.x = -lean;

  /* ---------- الخلف: غطاء أو صواني (اختياري) ---------- */
  if (opt.mode === 'trays'){
    const shelfW = DIM.W*0.36, shelfD = DIM.D*0.34, shelfT = 0.018;
    const mkTray = ()=> new THREE.Mesh(new THREE.BoxGeometry(shelfW, shelfT, shelfD), MAT.tray);
    const offsets = (opt.trays===3) ? [0.56, 0.72, 0.86] : [0.64, 0.82];
    offsets.forEach((yf)=>{
      const t = mkTray();
      t.position.set(0.02, baseH + yf, 0);
      t.castShadow = true;
      root.add(t);
    });
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(shelfD*0.48, shelfD*0.48, 0.12, 48), MAT.bin);
    bin.position.set(0.02, baseH + 0.40, 0);
    bin.castShadow = true;
    root.add(bin);
  }else{
    // غطاء خلفي بسيط يوحي بالهيكل المغلق
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(DIM.W*0.36, 0.90, DIM.D*0.30),
      new THREE.MeshStandardMaterial({ color:0xffc53d, roughness:0.6, metalness:0.05 })
    );
    cover.position.set(-0.02, baseH + 0.62, 0);
    cover.rotation.x = 0.05;
    cover.castShadow = true;
    root.add(cover);
  }

  /* ---------- تطبيع الارتفاع ليتطابق مع DIM.H بدقة ---------- */
  const box = new THREE.Box3().setFromObject(root);
  const hNow = box.max.y - box.min.y;
  if (Math.abs(hNow - DIM.H) > 1e-4){
    const scale = DIM.H / hNow;
    root.scale.set(scale, scale, scale);
  }

  root.userData.facing = '+X';
  return root;
}
