// iPhone 16 Pro Max — vista explosionada animada (ilustración esquemática).
// Unidades: milímetros. Teléfono acostado: X = largo (arriba del teléfono en -X),
// Z = ancho (+Z = lado derecho visto de frente), Y = grosor (+Y = espalda).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONTENT, ORDER, SHORT } from './content.js';

const W = 1920, H = 1080;

// ---------------------------------------------------------------- utilidades
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeIO = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const deg = THREE.MathUtils.degToRad;
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const qAxis = (axis, a) => new THREE.Quaternion().setFromAxisAngle(axis, a);
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

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

// ---------------------------------------------------------------- materiales
const M = {
  titanium: new THREE.MeshStandardMaterial({ color: 0x9e998f, metalness: 1, roughness: 0.3 }),
  alu: new THREE.MeshStandardMaterial({ color: 0xc3c7cd, metalness: 1, roughness: 0.42 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xaab0b8, metalness: 1, roughness: 0.3 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x80858c, metalness: 1, roughness: 0.3 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x383b41, metalness: 0.85, roughness: 0.36 }),
  camBody: new THREE.MeshStandardMaterial({ color: 0x4a4d55, metalness: 0.85, roughness: 0.3 }),
  magnet: new THREE.MeshStandardMaterial({ color: 0x3e4148, metalness: 0.9, roughness: 0.34 }),
  blackPlastic: new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.05, roughness: 0.6 }),
  blackGloss: new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: 0.1, roughness: 0.08, clearcoat: 1 }),
  film: new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.7 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xd88a55, metalness: 1, roughness: 0.3 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe6b860, metalness: 1, roughness: 0.28 }),
  flex: new THREE.MeshStandardMaterial({ color: 0xc9861f, metalness: 0.15, roughness: 0.42 }),
  pcbEdge: new THREE.MeshStandardMaterial({ color: 0x15211c, metalness: 0.1, roughness: 0.6 }),
  interposer: new THREE.MeshStandardMaterial({ color: 0x2f2c22, metalness: 0.45, roughness: 0.45 }),
  chipSide: new THREE.MeshStandardMaterial({ color: 0x1d1e21, metalness: 0.3, roughness: 0.5 }),
  battery: new THREE.MeshStandardMaterial({ color: 0x26282c, metalness: 0.45, roughness: 0.38 }),
  tab: new THREE.MeshStandardMaterial({ color: 0x2c5480, metalness: 0.1, roughness: 0.4 }),
  glassBack: new THREE.MeshPhysicalMaterial({ color: 0x9f998f, metalness: 0, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.45 }),
  glassGloss: new THREE.MeshPhysicalMaterial({ color: 0x99938a, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 }),
  lens: new THREE.MeshPhysicalMaterial({ color: 0x020306, metalness: 0, roughness: 0.03, clearcoat: 1, envMapIntensity: 0.22,
    iridescence: 0.9, iridescenceIOR: 1.45, iridescenceThicknessRange: [200, 450] }),
  sapphire: new THREE.MeshPhysicalMaterial({ color: 0x8e95a4, metalness: 0.35, roughness: 0.05, clearcoat: 1, iridescence: 0.45 }),
  flash: new THREE.MeshStandardMaterial({ color: 0xf3e6c4, roughness: 0.35, emissive: 0x2a2418 }),
  displayGlass: new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: 0.08, clearcoat: 1 }),
  capFilm: new THREE.MeshStandardMaterial({ color: 0x2f6b5e, metalness: 0.2, roughness: 0.45 }),
  force: new THREE.MeshStandardMaterial({ color: 0x2e3946, metalness: 0.5, roughness: 0.4 }),
  redGlass: new THREE.MeshPhysicalMaterial({ color: 0x3a0c12, roughness: 0.06, clearcoat: 1 }),
  antenna: new THREE.MeshStandardMaterial({ color: 0x4f4c47, metalness: 0.1, roughness: 0.55 }),
};

// ---------------------------------------------------------------- formas
function rrPath(p, x0, y0, x1, y1, r) {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0); p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  p.lineTo(x1, y1 - r); p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  p.lineTo(x0 + r, y1); p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  p.lineTo(x0, y0 + r); p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return p;
}
// Rectángulo redondeado en el plano XZ del mundo (la forma usa coordenadas (x, -z)).
const rrShape = (x0, z0, x1, z1, r) => rrPath(new THREE.Shape(), x0, -z1, x1, -z0, r);
const rrHole = (x0, z0, x1, z1, r) => rrPath(new THREE.Path(), x0, -z1, x1, -z0, r);
function circleShape(cx, cz, r) { const s = new THREE.Shape(); s.absarc(cx, -cz, r, 0, Math.PI * 2, false); return s; }
function circleHole(cx, cz, r) { const s = new THREE.Path(); s.absarc(cx, -cz, r, 0, Math.PI * 2, true); return s; }
function polyShape(pts, r) {
  const s = new THREE.Shape(); const n = pts.length;
  const P = pts.map(([x, z]) => new THREE.Vector2(x, -z));
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n];
    const p1 = b.clone().add(a.clone().sub(b).normalize().multiplyScalar(r));
    const p2 = b.clone().add(c.clone().sub(b).normalize().multiplyScalar(r));
    if (i === 0) s.moveTo(p1.x, p1.y); else s.lineTo(p1.x, p1.y);
    s.quadraticCurveTo(b.x, b.y, p2.x, p2.y);
  }
  s.closePath(); return s;
}
// Extruye una forma hacia +Y: ocupa de y0 a y0+thick.
function extrude(shape, y0, thick, bevel = 0.25, curveSegments = 28) {
  const b = Math.min(bevel, thick * 0.45);
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.01, thick - 2 * b), bevelEnabled: b > 0,
    bevelThickness: b, bevelSize: b * 0.8, bevelOffset: -b * 0.8, bevelSegments: 3, curveSegments });
  g.rotateX(-Math.PI / 2); g.translate(0, y0 + b, 0); return g;
}
function mk(geo, mat, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m;
}
const rbox = (w, h, d, r, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2) * 0.999);
const cyl = (r, h, s = 64) => new THREE.CylinderGeometry(r, r, h, s);

// ---------------------------------------------------------------- texturas (canvas)
function ctex(wmm, hmm, ppm, draw) {
  const cw = Math.min(2048, Math.round(wmm * ppm)), ch = Math.min(2048, Math.round(hmm * ppm));
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const ctx = c.getContext('2d'); ctx.scale(cw / wmm, ch / hmm); draw(ctx, wmm, hmm);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
function txt(ctx, s, x, y, size, weight = 600, color = '#fff', align = 'left') {
  ctx.font = `${weight} ${size}px Inter`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}
function roundPoly(ctx, pts, r) {
  const n = pts.length, a = pts[n - 1], b = pts[0];
  ctx.beginPath(); ctx.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  for (let i = 0; i < n; i++) ctx.arcTo(pts[i][0], pts[i][1], pts[(i + 1) % n][0], pts[(i + 1) % n][1], r);
  ctx.closePath();
}
function dataMatrix(ctx, x, y, s, R, color) {
  const n = 12, c = s / n; ctx.fillStyle = color;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === 0 || j === n - 1 || (i === n - 1 && j % 2 === 0) || (j === 0 && i % 2 === 1) || R() < 0.45) ctx.fillRect(x + j * c, y + i * c, c, c);
  }
}
// Plano con textura apoyado sobre una cara (mira a +Y, o a -Y con down=true).
function decal(parent, x0, z0, x1, z1, y, tex, o = {}) {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(o.down ? Math.PI / 2 : -Math.PI / 2);
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, alphaToCoverage: true,
    roughness: o.roughness ?? 0.6, metalness: o.metalness ?? 0, ...(o.mat || {}) });
  return mk(g, m, parent, (x0 + x1) / 2, y, (z0 + z1) / 2);
}
function chipTex(w, h, lines) {
  return ctex(w, h, 70, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#2a2b30'); g.addColorStop(1, '#141518');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'; ctx.lineWidth = 0.12; ctx.strokeRect(0.25, 0.25, w - 0.5, h - 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(0.8, 0.8, 0.25, 0, 7); ctx.fill();
    const total = lines.reduce((s, l) => s + l[1] * 1.3, 0);
    let y = h / 2 - total / 2;
    for (const [s, size, weight, color] of lines) { txt(ctx, s, w / 2, y + size * 0.65, size, weight || 700, color || '#c3c8cf', 'center'); y += size * 1.3; }
  });
}
function chip(parent, x, y, z, w, hgt, d, lines) {
  const top = new THREE.MeshStandardMaterial({ map: chipTex(w, d, lines), roughness: 0.42, metalness: 0.2 });
  const s = M.chipSide;
  return mk(new THREE.BoxGeometry(w, hgt, d), [s, s, top, s, s, s], parent, x, y + hgt / 2, z);
}
function pcbTex(w, h, seed, deco) {
  return ctex(w, h, 28, (ctx) => {
    const R = rng(seed);
    ctx.save(); rr(ctx, 0, 0, w, h, 3); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1c2b26'); g.addColorStop(1, '#101a17');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 0.13; ctx.lineJoin = 'round';
    for (let i = 0; i < 90; i++) {
      let x = R() * w, y = R() * h; ctx.strokeStyle = `rgba(80,140,115,${0.18 + R() * 0.25})`;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { if (R() < 0.5) x += (R() - 0.5) * 16; else y += (R() - 0.5) * 10; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    for (let i = 0; i < 220; i++) { ctx.fillStyle = '#b99a50'; ctx.beginPath(); ctx.arc(R() * w, R() * h, 0.16, 0, 7); ctx.fill(); }
    for (let i = 0; i < 330; i++) {
      const x = R() * w, y = R() * h, v = R() < 0.5, a = 0.55 + R() * 0.5, b = 0.28 + R() * 0.14;
      const cw = v ? b : a, ch = v ? a : b;
      ctx.fillStyle = R() < 0.6 ? '#7d6c4f' : '#2b2b2e'; ctx.fillRect(x, y, cw, ch);
      ctx.fillStyle = '#cfd2d6';
      if (v) { ctx.fillRect(x, y, cw, ch * 0.22); ctx.fillRect(x, y + ch * 0.78, cw, ch * 0.22); }
      else { ctx.fillRect(x, y, cw * 0.22, ch); ctx.fillRect(x + cw * 0.78, y, cw * 0.22, ch); }
    }
    ctx.fillStyle = '#caa24e';
    for (let x = 3; x < w - 3; x += 1.1) { ctx.fillRect(x, 0.6, 0.55, 0.45); ctx.fillRect(x, h - 1.05, 0.55, 0.45); }
    if (deco) deco(ctx, R);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- piezas
const root = new THREE.Group(); scene.add(root);
const items = {};
function makeItem(key, o) {
  const group = new THREE.Group(); root.add(group);
  const inner = new THREE.Group(); group.add(inner);
  const basePos = new THREE.Vector3(...o.pos);
  if (o.phone) inner.position.copy(basePos).multiplyScalar(-1);
  const it = {
    key, group, inner, basePos, baseQuat: o.quat || new THREE.Quaternion(), level: o.level,
    roll: o.roll || 0, tilt: deg(o.tilt ?? 24),
    scale: o.scale ?? Math.min(116 / o.w, 96 / o.h, 6),
    anchor: { obj: inner, p: new THREE.Vector3(...o.anchor) }, callouts: [], sub: null,
  };
  items[key] = it; return it;
}
const co = (obj, p, text, dx, dy) => ({ obj, p: new THREE.Vector3(...p), text, dx, dy });

// Posiciones del módulo de cámaras (vista trasera: arriba-izquierda).
const LENSES = [[-67, 23.5], [-46, 23.5], [-56.5, 2]];
const FLASH = [-71.5, 0.5], LIDAR = [-41.5, 0.5], RMIC = [-56.5, 12.7];

// 1. Cristal trasero ---------------------------------------------------------
{
  const it = makeItem('backGlass', { pos: [0, 3.6, 0], level: 7.4, w: 163, h: 77.6, phone: true, anchor: [30, 3.9, 25], tilt: 30 });
  const P = it.inner;
  mk(extrude(rrShape(-80.4, -37.7, 80.4, 37.7, 10.6), 3.2, 0.7, 0.25), M.glassBack, P);
  mk(extrude(rrShape(-78.5, -9.5, -34.5, 35, 9.5), 3.85, 1.05, 0.4), M.glassGloss, P);
  for (const [x, z] of LENSES) {
    mk(new THREE.CylinderGeometry(7.7, 7.95, 1.5, 72), M.titanium, P, x, 5.65, z);
    mk(cyl(6.65, 0.2), M.blackGloss, P, x, 6.41, z);
    mk(cyl(6.05, 0.25), M.lens, P, x, 6.45, z);
  }
  mk(cyl(2.7, 0.25), M.flash, P, FLASH[0], 4.95, FLASH[1]);
  mk(cyl(3.1, 0.25), M.blackGloss, P, LIDAR[0], 4.95, LIDAR[1]);
  mk(cyl(0.55, 0.12, 24), M.blackPlastic, P, RMIC[0], 4.92, RMIC[1]);
  it.callouts = [
    co(P, [-67, 6.5, 23.5], 'Cubiertas de lente de zafiro', -30, 150),
    co(P, [40, 3.9, 10], 'Vidrio texturizado mate', 40, -250),
  ];
}

// 2. MagSafe -----------------------------------------------------------------
{
  const cx = 2;
  const it = makeItem('magsafe', { pos: [cx, 2.75, 0], level: 6.4, w: 76, h: 56, phone: true, anchor: [cx, 3.3, 25], tilt: 28 });
  const P = it.inner;
  mk(cyl(28, 0.2, 96), M.film, P, cx, 2.45, 0);
  const ring = circleShape(cx, 0, 27.6); ring.holes.push(circleHole(cx, 0, 22.6));
  mk(extrude(ring, 2.55, 0.75, 0.15, 96), M.magnet, P);
  const ringTex = ctex(55.2, 55.2, 30, (ctx) => {
    ctx.translate(27.6, 27.6);
    for (let i = 0; i < 18; i++) {
      const a0 = i * Math.PI * 2 / 18 + 0.014, a1 = (i + 1) * Math.PI * 2 / 18 - 0.014;
      ctx.beginPath(); ctx.arc(0, 0, 27.3, a0, a1); ctx.arc(0, 0, 22.9, a1, a0, true); ctx.closePath();
      const g = ctx.createRadialGradient(0, 0, 22.9, 0, 0, 27.3);
      g.addColorStop(0, '#3a3d43'); g.addColorStop(0.5, '#62666e'); g.addColorStop(1, '#34373c');
      ctx.fillStyle = g; ctx.fill();
    }
  });
  decal(P, cx - 27.6, -27.6, cx + 27.6, 27.6, 3.31, ringTex, { metalness: 0.7, roughness: 0.32 });
  const coil = circleShape(cx, 0, 20.5); coil.holes.push(circleHole(cx, 0, 5.5));
  mk(extrude(coil, 2.55, 0.3, 0.08, 96), M.copper, P);
  const coilTex = ctex(41, 41, 40, (ctx) => {
    ctx.translate(20.5, 20.5);
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 21); g.addColorStop(0, '#f2b083'); g.addColorStop(0.6, '#c8794a'); g.addColorStop(1, '#9e5a33');
    ctx.beginPath(); ctx.arc(0, 0, 20.4, 0, Math.PI * 2); ctx.moveTo(5.6, 0); ctx.arc(0, 0, 5.6, 0, Math.PI * 2, true); ctx.fillStyle = g; ctx.fill('evenodd');
    ctx.lineWidth = 0.1; ctx.strokeStyle = 'rgba(70,30,12,0.6)';
    for (let r = 5.9; r < 20.3; r += 0.42) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); }
  });
  decal(P, cx - 20.5, -20.5, cx + 20.5, 20.5, 2.86, coilTex, { metalness: 1, roughness: 0.3 });
  mk(rbox(5.5, 0.75, 11, 0.6), M.magnet, P, cx + 33, 2.93, 0);
  mk(extrude(rrShape(-37, -19, -12, -13, 1), 2.28, 0.16, 0.04), M.flex, P);
  mk(rbox(3.5, 0.6, 6.5, 0.4), M.gold, P, -35.5, 2.6, -16);
  it.callouts = [
    co(P, [cx - 10, 3.3, 23], 'Anillo de imanes', -150, -40),
    co(P, [cx + 8, 2.9, -10], 'Bobina de cobre', 170, -150),
    co(P, [cx + 33, 3.3, 0], 'Imán de orientación', 120, 60),
  ];
}

// 3. Módulo de cámaras --------------------------------------------------------
{
  const it = makeItem('cameraModule', { pos: [-56.5, 1.5, 9.5], level: 5.4, w: 42, h: 49, phone: true, anchor: [-67, 6.4, 23.5], tilt: 34 });
  const P = it.inner;
  mk(extrude(rrShape(-77.5, -8.5, -35.5, 34, 6), -2.0, 1.0, 0.25), M.darkMetal, P);
  for (const [x, z] of LENSES) {
    mk(rbox(16.5, 5.6, 16.5, 1.6), M.camBody, P, x, 1.8, z);
    mk(new THREE.CylinderGeometry(6.5, 6.8, 1.7, 64), M.blackPlastic, P, x, 5.45, z);
    mk(cyl(5.9, 0.12), M.steelDark, P, x, 6.31, z);
    mk(cyl(5.1, 0.2), M.lens, P, x, 6.4, z);
    mk(extrude(rrShape(x - 2.5, -15, x + 2.5, -6, 0.8), -1.05, 0.15, 0.04), M.flex, P);
    mk(rbox(4.2, 0.6, 3, 0.25), M.gold, P, x, -0.65, -13.5);
  }
  mk(rbox(5.6, 2.2, 5.6, 0.8), M.blackPlastic, P, FLASH[0], 0.1, FLASH[1]);
  mk(cyl(2.3, 0.2), M.flash, P, FLASH[0], 1.25, FLASH[1]);
  mk(rbox(7, 3, 6, 0.8), M.blackPlastic, P, LIDAR[0], 0.5, LIDAR[1]);
  mk(cyl(1.2, 0.2, 32), M.lens, P, LIDAR[0], 2.05, LIDAR[1] - 1.5);
  mk(cyl(1.2, 0.2, 32), M.lens, P, LIDAR[0], 2.05, LIDAR[1] + 1.5);
  it.callouts = [
    co(P, [LIDAR[0], 2.0, LIDAR[1]], 'Escáner LiDAR', 150, 80),
    co(P, [FLASH[0], 1.3, FLASH[1]], 'Flash True Tone', -110, 90),
  ];
}

// 4. Placa lógica (sándwich) --------------------------------------------------
{
  const it = makeItem('logicBoard', { pos: [-48.5, -0.5, -23], level: 4, w: 57, h: 26, phone: true, anchor: [-63, 2.1, -23], tilt: 46, scale: 1.85 });
  const P = it.inner;
  const lower = new THREE.Group(), mid = new THREE.Group(), upper = new THREE.Group();
  P.add(lower, mid, upper);
  const board = () => rrShape(-77, -36, -20, -10, 3);
  // Placa inferior: módem y radio.
  mk(extrude(board(), -2.0, 0.8, 0.15), M.pcbEdge, lower);
  decal(lower, -77, -36, -20, -10, -1.19, pcbTex(57, 26, 11), { roughness: 0.55 });
  chip(lower, -62, -1.2, -22, 10, 0.9, 10, [['QUALCOMM', 1.05, 700, '#d4d7dc'], ['SDX71M', 1.5, 800, '#eef0f2'], ['Módem 5G', 0.95, 600, '#9ba1a9']]);
  chip(lower, -45, -1.2, -30, 7, 0.65, 5.5, [['RF', 1.2, 800], ['5G', 0.9, 600, '#9ba1a9']]);
  chip(lower, -45, -1.2, -17, 7, 0.7, 6, [['TRX', 1.2, 800], ['RF', 0.9, 600, '#9ba1a9']]);
  chip(lower, -30, -1.2, -24, 6.5, 0.7, 7, [['PMIC', 1.1, 800], ['RF', 0.85, 600, '#9ba1a9']]);
  // Interposer.
  const ip = rrShape(-76.5, -35.5, -20.5, -10.5, 2.6); ip.holes.push(rrHole(-74.5, -33.5, -22.5, -12.5, 1.2));
  mk(extrude(ip, -1.2, 1.4, 0.1), M.interposer, mid);
  // Placa superior: A18 Pro, NAND, Wi‑Fi.
  mk(extrude(board(), 0.2, 0.8, 0.15), M.pcbEdge, upper);
  decal(upper, -77, -36, -20, -10, 1.01, pcbTex(57, 26, 23), { roughness: 0.55 });
  chip(upper, -63, 1.0, -23, 13, 1.1, 13, [['A18 PRO', 2.5, 800, '#eceef1'], ['3 nm · 8 GB', 1.15, 600, '#9ba1a9']]);
  chip(upper, -47.5, 1.0, -28.5, 11, 0.9, 9, [['NAND', 1.7, 800, '#e2e5e9'], ['256 GB – 1 TB', 0.95, 600, '#9ba1a9']]);
  chip(upper, -46.5, 1.0, -15.8, 7, 0.8, 6.6, [['Wi‑Fi 7', 1.1, 800], ['BT 5.3', 0.9, 600, '#9ba1a9']]);
  chip(upper, -34.5, 1.0, -29.5, 6, 0.7, 6, [['PMIC', 1.0, 800]]);
  chip(upper, -34, 1.0, -17.5, 4.6, 0.6, 4.6, [['UWB', 0.95, 800]]);
  chip(upper, -26.5, 1.0, -23.5, 3.6, 0.55, 3.6, [['NFC', 0.75, 800]]);
  mk(rbox(2.2, 0.9, 6, 0.3), M.gold, upper, -22.6, 1.45, -31);
  mk(rbox(2.2, 0.9, 6, 0.3), M.gold, upper, -22.6, 1.45, -14.5);
  mk(rbox(6, 0.9, 2.2, 0.3), M.gold, upper, -72, 1.45, -12.4);
  it.sub = (k, e) => { upper.position.y = 4 * e + 11 * k; mid.position.y = 2 * e + 5.5 * k; };
  it.callouts = [
    co(upper, [-20.5, 1.2, -36], 'Placa superior: A18 Pro, NAND, Wi‑Fi', 70, -150),
    co(mid, [-20.5, 0, -23], 'Interposer: une las dos placas', 150, 10),
    co(lower, [-34, -1.2, -10], 'Placa inferior: módem 5G y radio', 60, 140),
  ];
}

// 5. Batería -----------------------------------------------------------------
{
  const it = makeItem('battery', { pos: [20, 0.1, 0], level: 3, w: 100, h: 68, phone: true, anchor: [24, 2.4, 14], tilt: 28 });
  const P = it.inner;
  const pts = [[-30, -8], [-30, 34], [62, 34], [62, -34], [-18, -34], [-18, -8]];
  mk(extrude(polyShape(pts, 2.5), -2.2, 4.6, 0.6), M.battery, P);
  const tex = ctex(92, 68, 15, (ctx) => {
    const R = rng(7);
    roundPoly(ctx, pts.map(([x, z]) => [clamp(x + 30, 0.4, 91.6), clamp(z + 34, 0.4, 67.6)]), 2.4);
    ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 92, 68); g.addColorStop(0, '#30333a'); g.addColorStop(0.5, '#1f2125'); g.addColorStop(1, '#2a2d32');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 92, 68);
    rr(ctx, 22, 11, 60, 46, 2.5); ctx.fillStyle = '#373a41'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 0.25; ctx.stroke();
    txt(ctx, 'Batería de ion de litio', 26, 18.5, 3.3, 600, '#d9dce1');
    txt(ctx, '4 685 mAh', 26, 29, 8.6, 800, '#ffffff');
    txt(ctx, 'Li‑ion · Recargable · iPhone 16 Pro Max', 26, 38, 2.3, 500, '#a3a8b0');
    for (let i = 0; i < 3; i++) {
      const x = 27 + i * 7, y = 47; ctx.beginPath(); ctx.moveTo(x, y + 2.6); ctx.lineTo(x + 2.6, y - 2); ctx.lineTo(x + 5.2, y + 2.6); ctx.closePath();
      ctx.strokeStyle = '#c3c7cd'; ctx.lineWidth = 0.35; ctx.stroke(); txt(ctx, '!', x + 2.6, y + 1.0, 2.2, 800, '#c3c7cd', 'center');
    }
    txt(ctx, 'No perforar · No calentar · No desmontar', 48, 47.6, 1.9, 500, '#8b9098');
    dataMatrix(ctx, 70, 15, 8, R, 'rgba(210,214,220,0.75)');
  });
  decal(P, -30, -34, 62, 34, 2.41, tex, { roughness: 0.4, metalness: 0.25 });
  mk(extrude(rrShape(54, -25, 70, -14, 1.2), 2.42, 0.12, 0.04), M.tab, P);
  mk(extrude(rrShape(54, 14, 70, 25, 1.2), 2.42, 0.12, 0.04), M.tab, P);
  mk(extrude(rrShape(-25, -23, -17, -16, 1), 0.6, 0.2, 0.05), M.flex, P);
  mk(rbox(3, 0.5, 5, 0.2), M.gold, P, -23.5, 0.95, -19.5);
  it.callouts = [
    co(P, [68, 2.6, 19.5], 'Lengüetas adhesivas', 60, 120),
    co(P, [-23.5, 1.2, -19.5], 'Conector a la placa', -60, -120),
  ];
}

// 6. Taptic Engine -----------------------------------------------------------
{
  const it = makeItem('taptic', { pos: [66.5, -1.4, 22.5], level: 2, w: 19, h: 20, phone: true, anchor: [69.5, 0.4, 22.5], tilt: 34, scale: 4.6 });
  const P = it.inner;
  mk(rbox(13, 3.6, 20, 1.0), M.steel, P, 69.5, -1.4, 22.5);
  const tex = ctex(13, 20, 60, (ctx) => {
    const R = rng(5);
    rr(ctx, 0.2, 0.2, 12.6, 19.6, 0.9); ctx.save(); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 13, 20); g.addColorStop(0, '#d2d6db'); g.addColorStop(1, '#9ea3aa');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 13, 20);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.03;
    for (let y = 0; y < 20; y += 0.12) { ctx.beginPath(); ctx.moveTo(0, y + R() * 0.05); ctx.lineTo(13, y); ctx.stroke(); }
    txt(ctx, 'TAPTIC', 6.5, 6.6, 1.75, 800, 'rgba(55,60,66,0.8)', 'center');
    txt(ctx, 'ENGINE', 6.5, 8.8, 1.75, 800, 'rgba(55,60,66,0.8)', 'center');
    dataMatrix(ctx, 4.7, 12.2, 3.6, R, 'rgba(60,64,70,0.7)');
    ctx.restore();
  });
  decal(P, 63, 12.5, 76, 32.5, 0.41, tex, { metalness: 0.9, roughness: 0.3 });
  for (const z of [15.5, 29.5]) {
    mk(extrude(rrShape(59.5, z - 2, 63.5, z + 2, 1.2), -1.6, 0.4, 0.1), M.steel, P);
    mk(cyl(0.9, 0.6, 24), M.darkMetal, P, 61.4, -1.0, z);
  }
  mk(extrude(rrShape(57, 20, 63.2, 25, 0.8), -0.6, 0.15, 0.04), M.flex, P);
}

// 7. Altavoz, micrófono y USB‑C ----------------------------------------------
{
  const it = makeItem('bottomAssy', { pos: [66.75, -1.3, -14.65], level: 2, w: 30, h: 39, phone: true, anchor: [70, 0.6, -24], tilt: 34 });
  const P = it.inner;
  mk(rbox(14, 3.8, 24, 1.0), M.blackPlastic, P, 70, -1.3, -22);
  const tex = ctex(14, 24, 45, (ctx) => {
    rr(ctx, 0.2, 0.2, 13.6, 23.6, 0.9); ctx.save(); ctx.clip();
    ctx.fillStyle = '#17181b'; ctx.fillRect(0, 0, 14, 24);
    ctx.fillStyle = '#0b0c0e';
    for (let x = 2.2; x < 12; x += 0.7) for (let y = 3; y < 15; y += 0.7) { ctx.beginPath(); ctx.arc(x, y, 0.22, 0, 7); ctx.fill(); }
    rr(ctx, 2, 17, 10, 4.6, 0.6); ctx.fillStyle = '#25272b'; ctx.fill();
    txt(ctx, 'SPK', 7, 19.3, 1.5, 800, '#7d838b', 'center');
    ctx.restore();
  });
  decal(P, 63, -34, 77, -10, 0.61, tex, { roughness: 0.55 });
  mk(rbox(1.2, 1.6, 18, 0.5), M.blackGloss, P, 77.4, -1.3, -22);
  mk(rbox(9, 3.4, 9.4, 1.4), M.steel, P, 76.5, -1.3, 0);
  mk(rbox(0.4, 2.6, 8.3, 0.18), M.blackGloss, P, 81.05, -1.3, 0);
  mk(new THREE.BoxGeometry(0.3, 0.7, 6.6), M.gold, P, 81.15, -1.3, 0);
  mk(extrude(rrShape(52, -4, 72.5, 4, 1), -3.0, 0.2, 0.05), M.flex, P);
  mk(rbox(2.6, 1.0, 2.6, 0.4), M.steel, P, 57, -2.3, 0);
  mk(cyl(0.5, 0.1, 24), M.blackPlastic, P, 57, -1.78, 0);
  chip(P, 63, -2.8, 2.2, 2.4, 0.5, 2.4, [['IC', 0.7, 800]]);
  it.callouts = [
    co(P, [70, 0.6, -24], 'Altavoz inferior', -150, -100),
    co(P, [79, 0.4, 0], 'Puerto USB‑C (USB 3)', 120, -80),
    co(P, [57, -1.8, 0], 'Micrófono', -130, 90),
  ];
}

// 8. Control de Cámara (construido con su cristal mirando a +Y local) -------
{
  const it = makeItem('cameraControl', { pos: [18, 0, 37.6], quat: qAxis(AX, Math.PI / 2), level: 2, w: 20, h: 6,
    anchor: [0, 1.2, 0], tilt: 50, scale: 5.2 });
  const P = it.inner;
  const parts = {};
  for (const k of ['crystal', 'housing', 'cap', 'force', 'haptic', 'flex']) { parts[k] = new THREE.Group(); P.add(parts[k]); }
  mk(rbox(18, 0.9, 4.2, 0.44), M.sapphire, parts.crystal, 0, 0.75, 0);
  const hs = rrShape(-9.9, -2.95, 9.9, 2.95, 2.9); hs.holes.push(rrHole(-9.1, -2.15, 9.1, 2.15, 2.1));
  mk(extrude(hs, -0.6, 1.6, 0.2), M.steel, parts.housing);
  mk(extrude(rrShape(-8.5, -1.9, 8.5, 1.9, 1.5), -0.25, 0.12, 0.03), M.capFilm, parts.cap);
  const capTex = ctex(17, 3.8, 80, (ctx) => {
    rr(ctx, 0.05, 0.05, 16.9, 3.7, 1.5); ctx.save(); ctx.clip();
    ctx.fillStyle = '#2f6b5e'; ctx.fillRect(0, 0, 17, 3.8);
    ctx.strokeStyle = '#e3b45f'; ctx.lineWidth = 0.09;
    for (let x = 1.2; x < 16; x += 0.5) { ctx.beginPath(); ctx.moveTo(x, (x * 2) % 1 < 0.5 ? 0.5 : 0.9); ctx.lineTo(x, (x * 2) % 1 < 0.5 ? 2.9 : 3.3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(1, 0.5); ctx.lineTo(16, 0.5); ctx.moveTo(1, 3.3); ctx.lineTo(16, 3.3); ctx.stroke();
    ctx.restore();
  });
  decal(parts.cap, -8.5, -1.9, 8.5, 1.9, -0.12, capTex, { metalness: 0.3, roughness: 0.4 });
  mk(rbox(7, 0.7, 3.2, 0.3), M.force, parts.force, 0, -1.25, 0);
  mk(rbox(1.4, 0.3, 1.4, 0.12), M.gold, parts.force, -2.2, -0.85, 0);
  mk(rbox(1.4, 0.3, 1.4, 0.12), M.gold, parts.force, 2.2, -0.85, 0);
  mk(rbox(15, 2.0, 3.6, 0.6), M.steelDark, parts.haptic, 0, -2.85, 0);
  mk(extrude(rrShape(-6, -1.6, 16, 1.6, 0.8), -4.25, 0.15, 0.04), M.flex, parts.flex);
  mk(rbox(3.2, 0.5, 2.6, 0.2), M.gold, parts.flex, 14.2, -3.85, 0);
  const offs = { crystal: 2.6, housing: 0, cap: -2.2, force: -4.4, haptic: -6.8, flex: -9.6 };
  it.sub = (k) => { for (const n in parts) parts[n].position.y = offs[n] * k; };
  it.callouts = [
    co(parts.crystal, [-6, 1.2, 0], 'Cristal de zafiro', -180, -60),
    co(parts.cap, [7, -0.12, 0], 'Sensor capacitivo', 150, -60),
    co(parts.force, [-3, -0.95, 0], 'Sensor de fuerza', -190, 10),
    co(parts.haptic, [6, -1.85, 0], 'Motor háptico', 150, 20),
    co(parts.flex, [-4, -4.1, 0], 'Flex de conexión', -170, 70),
  ];
}

// 9. TrueDepth (cara de sensores = +Y local, mira hacia la pantalla) --------
{
  const it = makeItem('trueDepth', { pos: [-75, 0.3, 0], quat: qAxis(AX, Math.PI), level: 2, w: 28, h: 10,
    roll: -Math.PI / 2, anchor: [0, -2.1, 0], tilt: 32, scale: 4.2 });
  const P = it.inner;
  mk(rbox(9, 2.4, 27, 0.8), M.darkMetal, P, 0, -0.9, 0);
  // Grupo Face ID (izquierda) y cámara frontal (derecha), vistos de frente.
  mk(cyl(2.0, 1.6, 40), M.camBody, P, 0, 1.1, 10.5);
  mk(cyl(1.3, 0.2, 40), M.lens, P, 0, 1.95, 10.5);
  mk(rbox(2.6, 0.9, 3.0, 0.4), M.blackGloss, P, 0, 0.75, 5.6);
  mk(rbox(2.0, 0.8, 2.0, 0.35), M.redGlass, P, 0, 0.7, 2.3);
  mk(rbox(6, 2.6, 6, 1.2), M.camBody, P, 0, 1.6, -4.5);
  mk(new THREE.CylinderGeometry(2.2, 2.4, 0.8, 48), M.blackPlastic, P, 0, 3.3, -4.5);
  mk(cyl(1.7, 0.2, 48), M.lens, P, 0, 3.75, -4.5);
  mk(rbox(4, 1.8, 4.2, 0.6), M.camBody, P, 0, 1.2, -11);
  mk(cyl(1.3, 0.2, 40), M.lens, P, 0, 2.15, -11);
  mk(extrude(rrShape(4.5, -3, 12, 3, 1), -2.3, 0.15, 0.04), M.flex, P);
  mk(rbox(2.4, 0.5, 4.5, 0.2), M.gold, P, 11, -2.0, 0);
  it.callouts = [
    co(P, [0, 3.85, -4.5], 'Cámara frontal 12 MP', 120, -110),
    co(P, [0, 2.0, 8], 'Sensores infrarrojos Face ID', -140, -110),
    co(P, [0, 2.2, -11], 'Proyector de puntos', 130, 100),
  ];
}

// 10. Chasis -----------------------------------------------------------------
{
  const it = makeItem('frame', { pos: [0, 0, 0], level: 1, w: 163, h: 80, phone: true, anchor: [45, 4.1, 38.4], tilt: 40, scale: 0.7 });
  const P = it.inner;
  const rim = rrShape(-81.5, -38.8, 81.5, 38.8, 11.8); rim.holes.push(rrHole(-79.7, -37, 79.7, 37, 10.1));
  mk(extrude(rim, -4.125, 8.25, 0.7, 48), M.titanium, P);
  mk(extrude(rrShape(-79.8, -37.1, 79.8, 37.1, 10.1), -3.0, 0.6, 0.1, 48), M.alu, P);
  const mid = ctex(159.6, 74.2, 9, (ctx) => {
    const R = rng(3);
    rr(ctx, 0.1, 0.1, 159.4, 74, 10); ctx.save(); ctx.clip();
    ctx.fillStyle = '#b6bac0'; ctx.fillRect(0, 0, 160, 75);
    ctx.lineWidth = 0.06;
    for (let y = 0; y < 75; y += 0.25) { ctx.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '60,64,70'},${0.05 + R() * 0.08})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(160, y + (R() - 0.5) * 0.2); ctx.stroke(); }
    const pocket = (x0, z0, x1, z1, r, c) => { rr(ctx, x0 + 79.8, z0 + 37.1, x1 - x0, z1 - z0, r); ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = 'rgba(40,44,50,0.45)'; ctx.lineWidth = 0.35; ctx.stroke(); };
    pocket(-31, -35, 63, 35, 3, '#a7abb1');
    pocket(-77.5, -36, -19.5, -9.5, 3, '#9fa3a9');
    pocket(-78, -9, -34, 35.5, 7, '#24262a');
    pocket(62.5, -35, 78, 35, 4, '#a3a7ad');
    for (const [x, z] of [[-24, -33], [-24, 33], [60, -33], [60, 33], [-74, -6], [-30, 0], [76, -3], [76, 8]]) {
      ctx.beginPath(); ctx.arc(x + 79.8, z + 37.1, 1.1, 0, 7); ctx.fillStyle = '#4a4e55'; ctx.fill();
      ctx.beginPath(); ctx.arc(x + 79.8, z + 37.1, 0.55, 0, 7); ctx.fillStyle = '#2b2e33'; ctx.fill();
    }
    ctx.restore();
  });
  decal(P, -79.8, -37.1, 79.8, 37.1, -2.39, mid, { metalness: 0.85, roughness: 0.45 });
  // Botones: Acción y volumen (lado izquierdo, -Z); lateral (lado derecho, +Z).
  mk(rbox(7.5, 3.0, 1.2, 0.55), M.titanium, P, -52, 0.2, -39.0);
  mk(rbox(10.5, 3.0, 1.2, 0.55), M.titanium, P, -38, 0.2, -39.0);
  mk(rbox(10.5, 3.0, 1.2, 0.55), M.titanium, P, -24.5, 0.2, -39.0);
  mk(rbox(17, 3.0, 1.2, 0.55), M.titanium, P, -31, 0.2, 39.0);
  // Líneas de antena.
  for (const x of [-64, 64]) for (const z of [-38.85, 38.85]) mk(new THREE.BoxGeometry(0.9, 7.4, 0.35), M.antenna, P, x, 0, z);
  for (const z of [-20, 20]) mk(new THREE.BoxGeometry(0.35, 7.4, 0.9), M.antenna, P, -81.6, 0, z);
  // Rejillas inferiores y puerto.
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) mk(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 20).rotateZ(Math.PI / 2), M.blackGloss, P, 81.55, 0, side * (14 + i * 2.6));
  mk(rbox(0.3, 2.9, 9, 0.14), M.blackGloss, P, 81.55, 0, 0);
  it.callouts = [
    co(P, [-52, 1.7, -39.2], 'Botón de Acción', -80, -110),
    co(P, [-31, 1.7, -39.2], 'Volumen', 40, -130),
    co(P, [-31, -1.3, 39.4], 'Botón lateral', -60, 110),
    co(P, [20, -2.4, -5], 'Subestructura de aluminio', 130, -170),
    co(P, [60, 4.1, 38.6], 'Titanio de grado 5', 90, 110),
  ];
}

// 11. Pantalla (cara frontal = +Y local; montada boca abajo) ----------------
{
  const it = makeItem('display', { pos: [0, -3.45, 0], quat: qAxis(AX, Math.PI), level: 0, w: 78, h: 163,
    roll: -Math.PI / 2, anchor: [30, -0.66, 0], tilt: 14, scale: 0.6 });
  const P = it.inner;
  mk(extrude(rrShape(-81.3, -38.6, 81.3, 38.6, 11.6), -0.65, 1.3, 0.35, 48), M.displayGlass, P);
  const screen = ctex(163, 77.6, 12, (ctx) => {
    rr(ctx, 0.1, 0.1, 162.8, 77.4, 11.4); ctx.fillStyle = '#000'; ctx.fill();
    ctx.save(); ctx.translate(81.5, 38.8); ctx.rotate(-Math.PI / 2); ctx.translate(-38.8, -81.5);
    ctx.save(); rr(ctx, 1.2, 1.2, 75.2, 160.6, 10.2); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 20, 163);
    g.addColorStop(0, '#0b1636'); g.addColorStop(0.42, '#35286a'); g.addColorStop(0.72, '#b4532f'); g.addColorStop(1, '#f2a54c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 78, 163);
    const blob = (x, y, r, c) => { const b = ctx.createRadialGradient(x, y, 0, x, y, r); b.addColorStop(0, c); b.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = b; ctx.fillRect(0, 0, 78, 163); };
    blob(62, 108, 48, 'rgba(255,120,60,0.55)'); blob(10, 70, 40, 'rgba(90,70,200,0.5)'); blob(40, 150, 35, 'rgba(255,200,110,0.5)');
    txt(ctx, 'lunes, 9 de septiembre', 38.8, 22, 3.3, 600, 'rgba(255,255,255,0.86)', 'center');
    txt(ctx, '9:41', 38.8, 37, 22, 700, 'rgba(255,255,255,0.95)', 'center');
    for (const x of [12.5, 65.1]) { ctx.beginPath(); ctx.arc(x, 147.5, 4.4, 0, 7); ctx.fillStyle = 'rgba(20,20,30,0.45)'; ctx.fill(); }
    rr(ctx, 11.6, 145.2, 1.8, 4.6, 0.5); ctx.fillStyle = '#fff'; ctx.fill();
    rr(ctx, 62.8, 146.1, 4.6, 3.2, 0.6); ctx.fill(); ctx.beginPath(); ctx.arc(65.1, 147.7, 0.9, 0, 7); ctx.fillStyle = '#333'; ctx.fill();
    rr(ctx, 25.8, 158.4, 26, 1.0, 0.5); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
    ctx.restore();
    rr(ctx, 38.8 - 10.4, 3.0, 20.8, 6.1, 3.05); ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
  });
  decal(P, -81.5, -38.8, 81.5, 38.8, 0.66, screen, { roughness: 0.12, mat: { color: 0x000000, emissive: 0xffffff, emissiveMap: screen, emissiveIntensity: 1.15 } });
  const back = ctex(163, 77.6, 8, (ctx) => {
    rr(ctx, 0.3, 0.3, 162.4, 77, 11.3); ctx.fillStyle = '#1c1d21'; ctx.fill();
    rr(ctx, 7, 6, 142, 65.6, 6); const g = ctx.createLinearGradient(0, 0, 163, 77);
    g.addColorStop(0, '#5f4a39'); g.addColorStop(1, '#3a2f27'); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.3; ctx.stroke();
    txt(ctx, 'OLED · 6.9″ · 120 Hz', 14, 12, 2.6, 600, 'rgba(255,230,210,0.5)');
  });
  decal(P, -81.5, -38.8, 81.5, 38.8, -0.66, back, { down: true, roughness: 0.5, metalness: 0.3 });
  mk(extrude(rrShape(66, -12, 80, 12, 1.5), -0.9, 0.15, 0.04), M.flex, P);
  it.callouts = [
    co(P, [-74, 0.7, 0], 'Dynamic Island', 170, -10),
    co(P, [-10, 0.7, 38.4], 'Bordes ultradelgados', 150, 0),
    co(P, [40, 0.7, -20], 'Ceramic Shield', -170, 40),
  ];
}

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
