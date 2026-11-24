// Reel vertical (1080×1920, ~1 min) con narración: la línea de tiempo sale de reel_timing.json,
// que genera tts.py a partir de la duración real de cada frase de la voz.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { seg, easeIO, smooth, lerp, deg, AX, AY, qAxis, buildParts } from './parts.js';
import { ORDER } from './content.js';

const W = 1080, H = 1920;
const timing = await (await fetch('./reel_timing.json')).json();
const SEG = Object.fromEntries(timing.segments.map((s) => [s.id, s]));
const DURATION = timing.voice_end + 1.2;
window.DURATION = DURATION;

// ---------------------------------------------------------------- renderer (igual que scene.js)
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.85;
const FOV = 34;
const camera = new THREE.PerspectiveCamera(FOV, W / H, 120, 3000);
scene.add(camera);
const key = new THREE.DirectionalLight(0xfff0dd, 1.7); key.position.set(-250, 420, 320); scene.add(key);
const rimL = new THREE.DirectionalLight(0x9fc8ff, 1.1); rimL.position.set(320, 160, -320); scene.add(rimL);
const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(0, -300, 200); scene.add(fill);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));
const dim = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000),
  new THREE.MeshBasicMaterial({ color: 0x07080b, transparent: true, opacity: 0, depthWrite: false }));
dim.position.z = -352; camera.add(dim);

const { root, items } = buildParts(renderer);
scene.add(root);

// ---------------------------------------------------------------- línea de tiempo
const hook = SEG.hook, open = SEG.open, outro = SEG.outro;
const T = {
  spin: [hook.end - 1.25, hook.end + 0.15],
  lay: [open.start + 0.05, open.start + 1.25],
  explode: [open.start + 0.45, SEG.backGlass.start + 0.35],
  implode: [outro.start - 0.45, outro.start + 0.95],
  rise: [outro.start + 0.65, outro.start + 1.75],
  front: [outro.phrases[1].start - 0.55, outro.phrases[1].start + 0.55],
};
const QA = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)));
const QB = qAxis(AY, Math.PI).multiply(QA.clone());       // de pie, espalda a la cámara
const QS = qAxis(AY, Math.PI / 2).multiply(QA.clone());   // de perfil (lado izquierdo)
const QI = new THREE.Quaternion();

function rootQuat(t) {
  if (t < T.spin[0]) return qAxis(AY, deg(9) * Math.sin(t * 1.1)).multiply(QA.clone());
  if (t < T.lay[0]) return qAxis(AY, Math.PI * easeIO(seg(t, ...T.spin)) + deg(9) * Math.sin(T.spin[0] * 1.1) * (1 - seg(t, ...T.spin))).multiply(QA.clone());
  if (t < T.lay[1]) return QB.clone().slerp(QI, easeIO(seg(t, ...T.lay)));
  if (t < T.rise[0]) return QI.clone();
  if (t < T.front[0]) return QI.clone().slerp(QS, easeIO(seg(t, ...T.rise)));
  const q = QS.clone().slerp(QA, easeIO(seg(t, ...T.front)));
  return qAxis(AY, deg(6) * Math.sin((t - T.front[1]) * 1.2) * seg(t, T.front[1], T.front[1] + 0.6)).multiply(q);
}
const explodeAmt = (t) => easeIO(seg(t, ...T.explode)) * (1 - easeIO(seg(t, ...T.implode)));

const S = (tx, ty, tz, d, el, az) => ({ tx, ty, tz, d, el, az });
const lerpS = (a, b, e) => S(...['tx', 'ty', 'tz', 'd', 'el', 'az'].map((k) => lerp(a[k], b[k], e)));
const sIntro = (t) => S(0, -20, 0, 660 - 30 * seg(t, 0, T.lay[0]), 3, -8 + 16 * seg(t, 0, T.lay[0]));
const sFlat = S(0, 0, 0, 430, 30, 62);
const sStack = (t) => S(0, 52, 0, 610, 24, 62 + 10 * seg(t, T.explode[1], T.implode[0]));
const sOut = (t) => S(0, -12, 0, 700, 3, 3 * Math.sin((t - T.rise[1]) * 0.5));
function camState(t) {
  if (t < T.lay[0]) return sIntro(t);
  if (t < T.lay[1]) return lerpS(sIntro(T.lay[0]), sFlat, easeIO(seg(t, ...T.lay)));
  if (t < T.explode[1]) return lerpS(sFlat, sStack(T.explode[1]), easeIO(seg(t, T.lay[1] - 0.4, T.explode[1])));
  if (t < T.implode[0]) return sStack(t);
  if (t < T.rise[0]) return lerpS(sStack(T.implode[0]), sFlat, easeIO(seg(t, ...T.implode)));
  return lerpS(sFlat, sOut(t), easeIO(seg(t, T.rise[0], T.rise[1] + 0.3)));
}
function applyCam(s) {
  const el = deg(s.el), az = deg(s.az);
  camera.position.set(s.tx + s.d * Math.cos(el) * Math.sin(az), s.ty + s.d * Math.sin(el), s.tz + s.d * Math.cos(el) * Math.cos(az));
  camera.lookAt(s.tx, s.ty, s.tz);
  camera.updateMatrixWorld(true);
}

// Piezas en primer plano: entran al empezar su frase y salen cuando entra la siguiente.
const scenes = timing.segments.filter((s) => s.item).map((s, i) => ({ k: s.item, i, a: s.start, b: s.end }));
const focusK = (sc, t) => easeIO(seg(t, sc.a - 0.3, sc.a + 0.45)) * (1 - easeIO(seg(t, sc.b - 0.3, sc.b + 0.45)));
const SHOW_D = 290, VH = 2 * SHOW_D * Math.tan(deg(FOV / 2)), VW = VH * W / H;
const SHOW_Y = (1 - 2 * 860 / H) * VH / 2;            // centro de la pieza a ~860 px desde arriba
const MAXW = 900 / W * VW, MAXH = 700 / H * VH;
const REEL_SCALE = { display: 0.42, cameraControl: 3.9, trueDepth: 3.0, taptic: 3.1 };
for (const k of ORDER) { const it = items[k]; it.reelScale = REEL_SCALE[k] ?? Math.min(MAXW / it.w, MAXH / it.h, 4); }
function showcase(it, u) {
  const pos = new THREE.Vector3(0, SHOW_Y, -SHOW_D).applyMatrix4(camera.matrixWorld);
  const q = camera.quaternion.clone()
    .multiply(qAxis(AY, deg(12) * Math.sin(u * 1.1 - 0.5)))
    .multiply(qAxis(AX, -it.tilt))
    .multiply(qAxis(AX, Math.PI / 2))
    .multiply(qAxis(AY, it.roll));
  return { pos, q };
}

// ---------------------------------------------------------------- capa HTML
const $ = (id) => document.getElementById(id);
const REEL_TITLE = {
  backGlass: ['Cristal trasero', 'Vidrio mate · lentes de zafiro'],
  magsafe: ['MagSafe', 'Hasta 25 W'],
  cameraModule: ['Cámaras', '48 MP + 48 MP + zoom 5x'],
  logicBoard: ['Placa lógica', 'A18 Pro · 3 nm'],
  battery: ['Batería', '≈ 4 685 mAh'],
  taptic: ['Taptic Engine', 'Vibración háptica'],
  bottomAssy: ['Altavoz y USB‑C', 'USB 3 · 10 Gb/s'],
  cameraControl: ['Control de Cámara', 'Zafiro + 3 sensores'],
  trueDepth: ['Face ID', '+30 000 puntos infrarrojos'],
  frame: ['Chasis', 'Titanio de grado 5'],
  display: ['Pantalla', '6.9″ · 120 Hz'],
};
const dots = $('dots');
scenes.forEach(() => dots.appendChild(document.createElement('span')));
const head = $('head'), hk = head.querySelector('.k'), hh = head.querySelector('h1'), hp = head.querySelector('.pill');
let headKey = null;
function headState(t) {
  // [clave, inicio, fin, ceja, título, píldora]
  const st = [['intro', -1, SEG.backGlass.start, 'Desmontaje visual', 'iPhone 16 Pro Max', '']];
  for (const sc of scenes) st.push([sc.k, sc.a, sc.b, `${String(sc.i + 1).padStart(2, '0')} / ${scenes.length}`, ...REEL_TITLE[sc.k]]);
  st.push(['outro', outro.start, 1e9, 'Resumen', 'iPhone 16 Pro Max', '8.25 mm · 227 g']);
  for (const s of st) if (t >= s[1] - 0.3 && t < s[2] - 0.3) return { s, a: smooth(seg(t, s[1] - 0.3, s[1])) * (1 - smooth(seg(t, s[2] - 0.55, s[2] - 0.3))) };
  return { s: st[0], a: 0 };
}
const cap = $('cap');
const phrases = timing.segments.flatMap((s) => s.phrases);
let capIdx = -1, capSpans = [];
function updateOverlay(t) {
  const f = $('fade'); const fa = 1 - seg(t, 0, 0.25); f.style.opacity = fa; f.style.display = fa > 0 ? '' : 'none';
  const { s, a } = headState(t);
  if (s[0] !== headKey) { headKey = s[0]; hk.textContent = s[3]; hh.textContent = s[4]; hp.textContent = s[5]; hp.style.display = s[5] ? '' : 'none'; }
  head.style.opacity = a.toFixed(3); head.style.transform = `translateY(${(1 - a) * 14}px)`;
  const reached = scenes.filter((sc) => t >= sc.a - 0.3).length;
  [...dots.children].forEach((d, i) => d.classList.toggle('on', i < reached));
  const ha = smooth(seg(t, SEG.backGlass.start - 0.8, SEG.backGlass.start)) * (1 - smooth(seg(t, outro.start, outro.start + 0.4)));
  $('hud').style.opacity = ha; dots.style.opacity = ha;

  // Subtítulos: la frase actual, palabra por palabra.
  let idx = -1;
  for (let i = 0; i < phrases.length; i++) if (t >= phrases[i].start - 0.12) idx = i;
  if (idx !== capIdx) {
    capIdx = idx; cap.innerHTML = '';
    capSpans = idx < 0 ? [] : phrases[idx].words.map((w) => { const sp = document.createElement('span'); sp.textContent = w.w; cap.appendChild(sp); return sp; });
  }
  if (idx >= 0) {
    const ws = phrases[idx].words;
    capSpans.forEach((sp, i) => {
      const now = t >= ws[i].t0 - 0.04 && t < ws[i].t1 - 0.04;
      sp.className = now ? 'now' : (t >= ws[i].t1 - 0.04 ? 'said' : '');
    });
    const p = phrases[idx];
    const nextStart = idx + 1 < phrases.length ? phrases[idx + 1].start : 1e9;
    const ca = smooth(seg(t, p.start - 0.12, p.start + 0.05)) * (1 - smooth(seg(t, Math.min(p.end + 0.6, nextStart - 0.12), Math.min(p.end + 0.8, nextStart - 0.12) + 0.001)));
    cap.style.opacity = ca.toFixed(3);
    cap.style.transform = `translateY(${(1 - smooth(seg(t, p.start - 0.12, p.start + 0.1))) * 18}px)`;
  } else cap.style.opacity = 0;
}

// ---------------------------------------------------------------- render
const G = 16;
const INTERNAL = new Set(['magsafe', 'cameraModule', 'logicBoard', 'battery', 'taptic', 'bottomAssy', 'trueDepth']);
const _p = new THREE.Vector3();
window.renderAt = (t) => {
  root.quaternion.copy(rootQuat(t)); root.updateMatrixWorld(true);
  const e = explodeAmt(t);
  applyCam(camState(t));
  let dimA = 0;
  for (const k of ORDER) {
    const it = items[k];
    it.group.visible = !INTERNAL.has(k) || e > 0.002;
    it.group.position.copy(it.basePos).add(_p.set(0, it.level * G * e, 0));
    it.group.quaternion.copy(it.baseQuat); it.group.scale.setScalar(1);
    const sc = scenes.find((x) => x.k === k);
    const kk = sc ? focusK(sc, t) : 0;
    if (kk > 0) {
      dimA = Math.max(dimA, kk);
      const s = showcase(it, t - sc.a);
      it.group.position.lerp(s.pos, kk).add(_p.set(0, Math.sin(Math.PI * kk) * 22, 0));
      it.group.quaternion.slerp(s.q, kk);
      it.group.scale.setScalar(lerp(1, it.reelScale, kk));
    }
    if (it.sub) it.sub(easeIO(seg(kk, 0.35, 1)), e);
  }
  dim.material.opacity = 0.7 * smooth(dimA);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
  updateOverlay(t);
  return true;
};

await document.fonts.ready;
window.renderAt(0);
window.READY = true;
