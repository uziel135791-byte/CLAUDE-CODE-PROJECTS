// iPhone 16 Pro Max — vista explosionada animada (ilustración esquemática).
// Unidades: milímetros. Teléfono acostado: X = largo (arriba del teléfono en -X),
// Z = ancho (+Z = lado derecho visto de frente), Y = grosor (+Y = espalda).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONTENT, ORDER, SHORT } from './content.js';

const W = 1920, H = 1080;

import { clamp, seg, easeIO, smooth, lerp, deg, AX, AY, qAxis, buildParts } from './parts.js';

// ---------------------------------------------------------------- renderer
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

const camera = new THREE.PerspectiveCamera(30, W / H, 120, 3000);
scene.add(camera);
const key = new THREE.DirectionalLight(0xfff0dd, 1.7); key.position.set(-250, 420, 320); scene.add(key);
const rimL = new THREE.DirectionalLight(0x9fc8ff, 1.1); rimL.position.set(320, 160, -320); scene.add(rimL);
const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(0, -300, 200); scene.add(fill);
scene.add(new THREE.AmbientLight(0xffffff, 0.12));

// Plano que oscurece la pila mientras una pieza está en primer plano.
const dim = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000),
  new THREE.MeshBasicMaterial({ color: 0x07080b, transparent: true, opacity: 0, depthWrite: false }));
dim.position.z = -352; camera.add(dim);

const { root, items } = buildParts(renderer);
scene.add(root);

// ---------------------------------------------------------------- línea de tiempo
const FOCUS0 = 21.8, PER = 7.6, N = ORDER.length;
const T = {
  titleIn: 1.0, spin: [4.8, 8.2], lay: [8.2, 11.2], explode: [11.2, 15.6], labels: [15.8, 21.4],
  implode: [FOCUS0 + (N - 1) * PER + 7.8, FOCUS0 + (N - 1) * PER + 12.2],
};
T.rise = [T.implode[1] - 0.4, T.implode[1] + 3.2];
T.outro = T.rise[1] - 0.6;
export const DURATION = T.outro + 6.6;
window.DURATION = DURATION;

// Pose inicial: teléfono de pie, pantalla hacia la cámara.
const QA = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)));
const QB = qAxis(AY, Math.PI).multiply(QA.clone()); // de pie, espalda hacia la cámara
const QI = new THREE.Quaternion();

function rootQuat(t) {
  const sway = qAxis(AY, deg(7) * Math.sin(t * 0.7) * (1 - seg(t, 4.2, 4.8)));
  if (t < T.spin[0]) return sway.multiply(QA.clone());
  if (t < T.spin[1]) return qAxis(AY, Math.PI * easeIO(seg(t, ...T.spin))).multiply(QA.clone());
  if (t < T.lay[1]) return QB.clone().slerp(QI, easeIO(seg(t, ...T.lay)));
  if (t < T.rise[0]) return QI.clone();
  const q = QI.clone().slerp(QB, easeIO(seg(t, ...T.rise)));
  return qAxis(AY, deg(8) * Math.sin((t - T.rise[1]) * 0.6) * seg(t, T.rise[1] - 1, T.rise[1] + 1)).multiply(q);
}
function explodeAmt(t) { return easeIO(seg(t, ...T.explode)) * (1 - easeIO(seg(t, ...T.implode))); }

// Cámara como (objetivo, distancia, elevación, azimut).
const S = (tx, ty, tz, d, el, az) => ({ tx, ty, tz, d, el, az });
const lerpS = (a, b, e) => S(...['tx', 'ty', 'tz', 'd', 'el', 'az'].map((k) => lerp(a[k], b[k], e)));
const sIntro = (t) => S(-60, 0, 0, 440 - 14 * seg(t, 0, 8.2), 3, -9 + 16 * seg(t, 0, 8.2));
const sFlat = S(0, 0, 0, 335, 34, 20);
const sExpl = (t) => S(0, 58, 0, 445, 19, 24 + 6 * seg(t, T.explode[1], FOCUS0));
const sFocus = (t) => S(0, 58, 0, 472, 19, 30 + 8 * seg(t, FOCUS0, T.implode[0]));
const sFlat2 = S(0, 0, 0, 345, 30, 30);
const sOut = (t) => S(58, 0, 0, 430, 3, 2 * Math.sin((t - T.rise[1]) * 0.3));
function camState(t) {
  if (t < T.lay[0]) return sIntro(t);
  if (t < T.lay[1]) return lerpS(sIntro(T.lay[0]), sFlat, easeIO(seg(t, ...T.lay)));
  if (t < T.explode[1]) return lerpS(sFlat, sExpl(T.explode[1]), easeIO(seg(t, ...T.explode)));
  if (t < FOCUS0) return sExpl(t);
  if (t < T.implode[0]) return lerpS(sExpl(FOCUS0), sFocus(t), easeIO(seg(t, FOCUS0, FOCUS0 + 1.4)));
  if (t < T.implode[1]) return lerpS(sFocus(T.implode[0]), sFlat2, easeIO(seg(t, ...T.implode)));
  return lerpS(sFlat2, sOut(t), easeIO(seg(t, ...T.rise)));
}
function applyCam(s) {
  const el = deg(s.el), az = deg(s.az);
  camera.position.set(s.tx + s.d * Math.cos(el) * Math.sin(az), s.ty + s.d * Math.sin(el), s.tz + s.d * Math.cos(el) * Math.cos(az));
  camera.lookAt(s.tx, s.ty, s.tz);
  camera.updateMatrixWorld(true);
}

// Escena de enfoque i: k = cuánto ha salido la pieza hacia el primer plano.
function focusK(u) { return easeIO(seg(u, 0, 1.25)) * (1 - easeIO(seg(u, 6.45, 7.8))); }
const SHOW_D = 290;
const VH = 2 * SHOW_D * Math.tan(deg(15)), VW = VH * W / H;
function showcase(it, u) {
  const pos = new THREE.Vector3(-0.2 * VW, -0.015 * VH, -SHOW_D).applyMatrix4(camera.matrixWorld);
  const q = camera.quaternion.clone()
    .multiply(qAxis(AY, deg(11) * Math.sin(u * 0.85 - 0.6)))
    .multiply(qAxis(AX, -it.tilt))
    .multiply(qAxis(AX, Math.PI / 2))
    .multiply(qAxis(AY, it.roll));
  return { pos, q };
}

// ---------------------------------------------------------------- capa HTML
const $ = (id) => document.getElementById(id);
const ov = $('ov'), NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('width', W); svg.setAttribute('height', H);
ov.insertBefore(svg, ov.firstChild);
function svgEl(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }
const labels = ORDER.map((k, i) => {
  const div = document.createElement('div'); div.className = 'lbl';
  div.innerHTML = `<i>${String(i + 1).padStart(2, '0')}</i>${SHORT[k]}`; ov.appendChild(div);
  const line = svgEl('polyline', { fill: 'none', stroke: 'rgba(255,255,255,0.45)', 'stroke-width': 1.5 });
  const dot = svgEl('circle', { r: 4.5, fill: '#ffb45e' });
  return { k, div, line, dot };
});
const callPool = Array.from({ length: 6 }, () => {
  const div = document.createElement('div'); div.className = 'co'; ov.appendChild(div);
  const line = svgEl('polyline', { fill: 'none', stroke: 'rgba(255,180,94,0.85)', 'stroke-width': 1.6 });
  const dot = svgEl('circle', { r: 4.5, fill: '#ffb45e', stroke: '#07080b', 'stroke-width': 2 });
  return { div, line, dot };
});
const card = $('card'); let cardKey = null;
function setCard(k) {
  if (k === cardKey) return; cardKey = k; const c = CONTENT[k], i = ORDER.indexOf(k);
  card.innerHTML = `<div class="eb"><span>${c.eyebrow}</span><span>${String(i + 1).padStart(2, '0')} / ${N}</span></div>
    <h2>${c.title}</h2><p class="lead">${c.lead}</p><ul>${c.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
    ${c.stat ? `<div class="stat"><b>${c.stat[0]}</b><span>${c.stat[1]}</span></div>` : ''}`;
}
const vis = (e, a, extra = '') => { e.style.opacity = a.toFixed(3); e.style.display = a > 0.002 ? '' : 'none'; if (extra) e.style.transform = extra; };
const _v = new THREE.Vector3();
function toScreen(obj, p) { _v.copy(p); obj.localToWorld(_v); _v.project(camera); return [(_v.x + 1) / 2 * W, (1 - _v.y) / 2 * H]; }

function updateOverlay(t, scenes) {
  vis($('fade'), Math.max(1 - seg(t, 0, 0.9), seg(t, DURATION - 1.1, DURATION - 0.1)));
  const tIn = smooth(seg(t, T.titleIn, T.titleIn + 0.9)), tOut = smooth(seg(t, 4.4, 5.2));
  vis($('title'), tIn * (1 - tOut), `translateY(calc(-50% + ${(1 - tIn) * 24 - tOut * 10}px))`);
  vis($('hud'), smooth(seg(t, T.lay[1], T.lay[1] + 1)) * (1 - smooth(seg(t, T.rise[0], T.rise[0] + 0.8))));
  $('progress').style.width = `${(t / DURATION) * 100}%`;
  vis($('caption'), smooth(seg(t, T.labels[0] + 0.3, T.labels[0] + 1)) * (1 - smooth(seg(t, T.labels[1] - 0.3, T.labels[1] + 0.2))));

  // Etiquetas de la vista explosionada.
  const lv = (i) => smooth(seg(t, T.labels[0] + i * 0.09, T.labels[0] + 0.6 + i * 0.09)) * (1 - smooth(seg(t, T.labels[1] - 0.4, T.labels[1] + 0.1)));
  if (lv(0) > 0 || lv(N - 1) > 0) {
    const pts = labels.map((L, i) => { const it = items[L.k]; const [x, y] = toScreen(it.anchor.obj, it.anchor.p); return { L, i, x, y, ty: y }; });
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    for (const side of ['left', 'right']) {
      const arr = pts.filter((p) => (side === 'left') === (p.x < cx)).sort((a, b) => a.y - b.y);
      for (let j = 1; j < arr.length; j++) arr[j].ty = Math.max(arr[j].ty, arr[j - 1].ty + 52);
      const over = arr.length ? arr[arr.length - 1].ty - 990 : 0; if (over > 0) arr.forEach((p) => (p.ty -= over));
      for (const p of arr) {
        const lx = side === 'left' ? 400 : 1520, a = lv(p.i);
        p.L.div.className = `lbl ${side}`; p.L.div.style.left = `${lx + (side === 'left' ? -14 : 14)}px`; p.L.div.style.top = `${p.ty}px`;
        vis(p.L.div, a);
        const ex = side === 'left' ? lx + 40 : lx - 40;
        p.L.line.setAttribute('points', `${p.x},${p.y} ${ex},${p.ty} ${lx},${p.ty}`);
        p.L.line.style.opacity = a; p.L.dot.setAttribute('cx', p.x); p.L.dot.setAttribute('cy', p.y); p.L.dot.style.opacity = a;
      }
    }
  } else labels.forEach((L) => { vis(L.div, 0); L.line.style.opacity = 0; L.dot.style.opacity = 0; });

  // Tarjeta y llamadas de la pieza en primer plano.
  let cardA = 0, cur = null;
  for (const s of scenes) { const a = smooth(seg(s.u, 0.9, 1.45)) * (1 - smooth(seg(s.u, 6.25, 6.7))); if (a > cardA) { cardA = a; cur = s; } }
  if (cur) setCard(cur.k);
  vis(card, cardA, `translate(${(1 - cardA) * 36}px, -50%)`);
  let used = 0;
  for (const s of scenes) {
    const a = smooth(seg(s.u, 1.6, 2.2)) * (1 - smooth(seg(s.u, 6.0, 6.4)));
    if (a <= 0) continue;
    items[s.k].callouts.forEach((c, j) => {
      const P = callPool[used++]; if (!P) return;
      const [x, y] = toScreen(c.obj, c.p); const aj = a * smooth(seg(s.u, 1.6 + j * 0.15, 2.2 + j * 0.15));
      const lx = x + c.dx, ly = y + c.dy; P.div.textContent = c.text;
      const w = P.div.offsetWidth || 200;
      let left = c.dx < 0 ? lx - w : lx; left = Math.max(40, Math.min(1170 - w, left));
      P.div.style.left = `${left}px`; P.div.style.top = `${ly - 19}px`; vis(P.div, aj);
      const ex = c.dx < 0 ? left + w : left;
      P.line.setAttribute('points', `${x},${y} ${ex},${ly}`); P.line.style.opacity = aj;
      P.dot.setAttribute('cx', x); P.dot.setAttribute('cy', y); P.dot.style.opacity = aj;
    });
  }
  for (let j = used; j < callPool.length; j++) { vis(callPool[j].div, 0); callPool[j].line.style.opacity = 0; callPool[j].dot.style.opacity = 0; }

  const oa = smooth(seg(t, T.outro, T.outro + 1.0));
  vis($('outro'), oa, `translateY(calc(-50% + ${(1 - oa) * 26}px))`);
}

// ---------------------------------------------------------------- render
const G = 16; // separación entre capas en la vista explosionada (mm)
// Piezas internas: con el teléfono cerrado no se ven, así que se ocultan
// (evita que sus bordes se filtren a través del cristal en el render por software).
const INTERNAL = new Set(['magsafe', 'cameraModule', 'logicBoard', 'battery', 'taptic', 'bottomAssy', 'trueDepth']);
const _p = new THREE.Vector3();
window.renderAt = (t) => {
  root.quaternion.copy(rootQuat(t)); root.updateMatrixWorld(true);
  const e = explodeAmt(t);
  applyCam(camState(t));
  const scenes = [];
  ORDER.forEach((k, i) => { const u = t - (FOCUS0 + i * PER); if (u > -0.01 && u < 8) scenes.push({ k, u, kk: focusK(u) }); });
  let dimA = 0;
  for (const k of ORDER) {
    const it = items[k];
    it.group.visible = !INTERNAL.has(k) || e > 0.002;
    it.group.position.copy(it.basePos).add(_p.set(0, it.level * G * e, 0));
    it.group.quaternion.copy(it.baseQuat); it.group.scale.setScalar(1);
    let kk = 0;
    const s = scenes.find((x) => x.k === k);
    if (s && s.kk > 0) {
      kk = s.kk; dimA = Math.max(dimA, kk);
      const sc = showcase(it, s.u);
      const arc = Math.sin(Math.PI * kk) * 26;
      it.group.position.lerp(sc.pos, kk).add(_p.set(0, arc, 0));
      it.group.quaternion.slerp(sc.q, kk);
      it.group.scale.setScalar(lerp(1, it.scale, kk));
    }
    if (it.sub) it.sub(easeIO(seg(kk, 0.35, 1)), e);
  }
  dim.material.opacity = 0.66 * smooth(dimA);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
  updateOverlay(t, scenes);
  return true;
};

await document.fonts.ready;
window.renderAt(0);
window.READY = true;
