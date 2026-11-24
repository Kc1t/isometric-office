// Utilidades: easing, animações por tempo, texturas de canvas e geometria.
import * as THREE from 'three';

export const PAL = {
  parede: 0xf0bd9e, paredeFora: 0xb4848f, rodape: 0xf7efe6,
  carvalho: 0xd6a06c, laje: 0x9c6646, creme: 0xf2e8da, cinza: 0x8f877d, cinzaClaro: 0xcfc6ba,
  terracota: 0xd9643a, escuro: 0x2a2a30, salvia: 0x8ea37e, brancoQuente: 0xfff3e2,
};

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const amort = (a, b, taxa, dt) => lerp(a, b, 1 - Math.exp(-taxa * dt));
export function amortAng(a, b, taxa, dt) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-taxa * dt));
}
export const E = {
  lin: (t) => t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  out3: (t) => 1 - Math.pow(1 - t, 3),
  in2: (t) => t * t,
  in3: (t) => t * t * t,
  inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};

// gerador pseudoaleatório com semente (layout estável entre recargas)
export function semente(s) {
  let a = s >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- animações ----------
const anims = [];
export function anim(o) { o.t = -(o.delay || 0); o.vivo = true; anims.push(o); return o; }
export function passoAnims(dt) {
  let mudou = false;
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    if (!a.vivo) { anims.splice(i, 1); continue; }
    a.t += dt; if (a.t < 0) continue;
    const k = a.dur > 0 ? Math.min(1, a.t / a.dur) : 1;
    if (a.update) { a.update((a.ease || E.lin)(k), k); mudou = mudou || dt > 0; }
    if (k >= 1) { a.vivo = false; anims.splice(i, 1); if (a.done) a.done(); }
  }
  return mudou;
}
export const espera = (s) => new Promise((r) => anim({ dur: s, done: r }));
export const tween = (dur, ease, update, delay = 0) => new Promise((r) => anim({ dur, ease, update, delay, done: r }));

// ---------- canvas ----------
export function tela(w, h, desenha) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (desenha) desenha(g, w, h); return c;
}
export function texCanvas(c, srgb = true) {
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

// textura radial macia (poeira, brilhos)
let _macia;
export function texMacia() {
  if (_macia) return _macia;
  _macia = texCanvas(tela(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }));
  return _macia;
}

// ---------- geometria ----------
// dobra a geometria em torno de um cilindro de raio R com centro à frente (+z): tela côncava para quem olha
export function dobra(geo, R) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), th = x / R, r = R - z;
    p.setX(i, r * Math.sin(th)); p.setZ(i, R - r * Math.cos(th));
  }
  p.needsUpdate = true; geo.computeVertexNormals(); return geo;
}

export function sombras(o, lanca = true, recebe = true) {
  o.traverse((m) => { if (m.isMesh) { m.castShadow = lanca; m.receiveShadow = recebe; } }); return o;
}
export function mat(cor, rug = .7, extra = {}) { return new THREE.MeshStandardMaterial({ color: cor, roughness: rug, metalness: 0, ...extra }); }
