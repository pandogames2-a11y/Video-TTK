// Animações explicativas em 3D (Three.js): fundo preto, objetos que sobem com efeito,
// câmera que desliza entre etapas. Desenho original; textos desenhados na camada 2D por cima.
import * as THREE from './node_modules/three/build/three.module.js';
import { RoundedBoxGeometry } from './node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js';

const W = 1920, H = 1080;
const gl = document.createElement('canvas'); gl.width = W; gl.height = H;
const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, d) => clamp((t - a) / d);
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const eio = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eb = t => { t = clamp(t); const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;

const PAL = [0x8a2be2, 0xd1238f, 0xff7a3d, 0x2f8cff, 0x19c37d, 0xffc400];

function baseScene() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030206); scene.fog = new THREE.Fog(0x030206, 14, 34);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.SpotLight(0xffffff, 220, 40, Math.PI / 5, 0.5, 1.2); key.position.set(-4, 12, 8); scene.add(key); scene.add(key.target);
  const rimL = new THREE.PointLight(0xff2e88, 60, 30); rimL.position.set(-9, 4, -4); scene.add(rimL);
  const rimR = new THREE.PointLight(0x2f6bff, 60, 30); rimR.position.set(9, 4, -4); scene.add(rimR);
  // piso escuro com brilho e linhas finas
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x07050c, roughness: 0.35, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(200, 100, 0x2a1240, 0x150a22); grid.position.y = 0.002; scene.add(grid);
  return scene;
}
function pillarMat(color) { return new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15, emissive: color, emissiveIntensity: 0.12 }); }

const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
const cache = new Map();
const project = (v) => { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H, z: p.z }; };

// ----- pilares: N colunas que sobem em sequência, com rótulo e ícone/número no topo -----
function buildPillars(ex) {
  const scene = baseScene(), n = ex.items.length, gap = n > 4 ? 2.3 : 3.0, objs = [];
  ex.items.forEach((it, i) => {
    const color = PAL[(it.c ?? i) % PAL.length], h = 1.6 + 2.6 * (it.h ?? 1);
    const geo = new RoundedBoxGeometry(1.5, 1, 1.5, 4, 0.12); geo.translate(0, 0.5, 0);
    const m = new THREE.Mesh(geo, pillarMat(color)); m.position.x = (i - (n - 1) / 2) * gap; scene.add(m);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 48), new THREE.MeshBasicMaterial({ color })); cap.rotation.x = Math.PI / 2; cap.position.x = m.position.x; scene.add(cap);
    objs.push({ m, cap, h, it, color });
  });
  return { scene, objs, n, gap };
}
function drawPillars(S, ex, pt, dur) {
  const step = Math.min(0.55, (dur - 1.2) / S.n);
  S.objs.forEach((o, i) => {
    const k = eb(seg(pt, 0.3 + i * step, 0.7)), h = Math.max(0.001, o.h * k);
    o.m.scale.y = h; o.m.rotation.y = (1 - eo(seg(pt, 0.3 + i * step, 0.9))) * 0.8;
    o.cap.position.y = 0.02 + 0.3 * Math.sin(pt * 3 + i) * 0.05; o.cap.scale.setScalar(0.6 + 0.4 * k); o.cap.material.opacity = k;
    o.top = new THREE.Vector3(o.m.position.x, h + 0.35, 0); o.base = new THREE.Vector3(o.m.position.x, -0.05, 0.9); o.k = clamp(seg(pt, 0.5 + i * step, 0.4));
  });
  // câmera: entra de cima, faz um travelling lateral lento
  const u = eio(seg(pt, 0, 1.4)), drift = pt / Math.max(1, dur);
  const far = S.n > 4 ? 1.45 : 1; camera.position.set(lerp(-3, 0, u) + 1.2 * (drift - 0.5), lerp(9, 4.2, u) * far, (lerp(16, 12.5, u) - 1.2 * drift) * far); camera.lookAt(0, 2.2, 0);
}
// ----- blocos: comparação de tamanho (ex.: mapa GTA 5 x GTA 6) -----
function buildBlocks(ex) {
  const scene = baseScene(), objs = [];
  ex.items.forEach((it, i) => { const geo = new RoundedBoxGeometry(1, 1, 1, 4, 0.06); geo.translate(0, 0.5, 0);
    const m = new THREE.Mesh(geo, pillarMat(PAL[it.c ?? i])); scene.add(m); objs.push({ m, it }); });
  return { scene, objs };
}
function drawBlocks(S, ex, pt, dur) {
  const n = S.objs.length;
  S.objs.forEach((o, i) => { const area = o.it.s, side = 3.2 * Math.sqrt(area), k = eb(seg(pt, 0.4 + i * 1.1, 0.9));
    o.m.scale.set(side * Math.max(0.001, k), 0.5 * Math.max(0.001, k), side * Math.max(0.001, k));
    o.m.position.x = i === 0 ? -4.6 : 2.4; o.m.rotation.y = 0.15;
    o.top = new THREE.Vector3(o.m.position.x, 0.5 * k + 0.4, 0); o.base = new THREE.Vector3(o.m.position.x, 0, side / 2 + 0.6); o.k = clamp(seg(pt, 0.6 + i * 1.1, 0.4)); });
  const u = eio(seg(pt, 0, 1.6)); camera.position.set(lerp(0, -1, u), lerp(12, 8, u), lerp(14, 13, u)); camera.lookAt(-0.8, 0.5, 0);
}
// ----- etapas: cubos em linha ligados por setas; a câmera desliza para a esquerda a cada etapa -----
function buildFlow(ex) {
  const scene = baseScene(), objs = [], gap = 6;
  ex.items.forEach((it, i) => { const geo = new RoundedBoxGeometry(2.2, 2.2, 2.2, 5, 0.2); geo.translate(0, 1.1, 0);
    const m = new THREE.Mesh(geo, pillarMat(PAL[it.c ?? i])); m.position.x = i * gap; scene.add(m);
    let arrow = null; if (i < ex.items.length - 1) { arrow = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      arrow.rotation.z = -Math.PI / 2; arrow.position.set(i * gap + gap / 2, 1.1, 0); scene.add(arrow); }
    objs.push({ m, arrow, it }); });
  return { scene, objs, gap };
}
function drawFlow(S, ex, pt, dur) {
  const n = S.objs.length, per = (dur - 0.3) / n;
  S.objs.forEach((o, i) => { const k = eb(seg(pt, 0.2 + i * per, 0.6)); o.m.scale.setScalar(Math.max(0.001, k)); o.m.rotation.y = (1 - eo(seg(pt, 0.2 + i * per, 0.8))) * 1.2 + 0.25 * Math.sin(pt * 0.8 + i);
    if (o.arrow) { const ka = eo(seg(pt, 0.2 + (i + 0.6) * per, 0.4)); o.arrow.scale.setScalar(Math.max(0.001, ka)); }
    o.top = new THREE.Vector3(o.m.position.x, 2.2 * k + 0.5, 0); o.base = new THREE.Vector3(o.m.position.x, 0, 1.6); o.k = clamp(seg(pt, 0.35 + i * per, 0.4)); });
  // keyframes da câmera: desliza de uma etapa para a outra
  let x = 0; for (let i = 1; i < n; i++) x += S.gap * eio(seg(pt, 0.2 + i * per - 0.45, 0.6));
  camera.position.set(x - 1.2, 3.6, 9.5); camera.lookAt(x, 1.3, 0);
}

const KINDS = { pillars: [buildPillars, drawPillars], blocks: [buildBlocks, drawBlocks], flow: [buildFlow, drawFlow] };
window.EXPLAIN = {
  canvas: gl,
  render(id, ex, pt, dur) {
    const [build, draw] = KINDS[ex.k]; if (!cache.has(id)) { for (const [k, v] of cache) { v.scene.traverse(o => { o.geometry?.dispose?.(); }); cache.delete(k); } cache.set(id, build(ex)); }
    const S = cache.get(id); draw(S, ex, pt, dur); renderer.render(S.scene, camera);
    // posições na tela para os rótulos (desenhados na camada 2D)
    return (S.objs || []).map(o => ({ it: o.it, k: o.k ?? 1, top: project(o.top), base: project(o.base), color: '#' + new THREE.Color(o.color ?? PAL[o.it.c ?? 0]).getHexString() }));
  },
};
window.EXPLAIN_READY = true;
