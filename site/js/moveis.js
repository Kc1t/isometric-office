// Móveis: modelos GLB (gerados) normalizados + tudo que é feito em código (monitor, prateleira, painel perfurado, relógio...).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, mat, tela, texCanvas, rr, dobra, sombras, semente, texMacia } from './util.js';

// tamanho final de cada modelo já girado (frente em +z). caixa: [largura x, altura, profundidade z]; só "h" = escala uniforme pela altura
const MODELOS = {
  mesa: { caixa: [1.5, .74, .76] },
  cadeira: { h: 1.04 },
  torre: { h: .45 },
  planta: { h: 1.3 },
  pendente: { h: .6 },
  'caixa-som': { h: .25 },
  sofa: { w: 1.75 },
  cafe: { h: .38 },
  teclado: { w: .42 },
  estante: { h: 1.8 },
};
const acervo = {};

export async function carregaAcervo() {
  const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(Object.keys(MODELOS).map(async (n) => {
    const cena = (await L.loadAsync(`./assets/glb/${n}.glb`)).scene, cfg = MODELOS[n];
    const piv = new THREE.Group(); cena.rotation.y = -Math.PI / 2; piv.add(cena); piv.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(piv), t = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    cena.position.set(-c.x, -b.min.y, -c.z);
    const g = new THREE.Group(); g.add(piv);
    if (cfg.caixa) piv.scale.set(cfg.caixa[0] / t.x, cfg.caixa[1] / t.y, cfg.caixa[2] / t.z);
    else piv.scale.setScalar(cfg.h ? cfg.h / t.y : cfg.w / t.x);
    g.traverse((m) => {
      if (!m.isMesh) return; m.castShadow = true; m.receiveShadow = true;
      m.material.envMapIntensity = 1; if (m.material.map) m.material.map.anisotropy = 8;
    });
    acervo[n] = g;
  }));
}
export function novo(nome) { return acervo[nome].clone(); }

const caixaR = (w, h, d, r, m, seg = 3) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, seg, r), m);
const M = {
  madeira: mat(0xd9a873, .6), madeiraEsc: mat(0xb9824f, .6), branco: mat(0xf6f1ea, .5), creme: mat(PAL.creme, .55),
  cinza: mat(PAL.cinza, .6), escuro: mat(PAL.escuro, .45), terracota: mat(PAL.terracota, .55), salvia: mat(PAL.salvia, .7),
  metal: mat(0xd8d2ca, .35, { metalness: .7 }),
};
export { M as MATS };

// ---------- telas ----------
const CORES_COD = ['#e9805a', '#f2e3cf', '#9fbf8f', '#c5a8e8', '#f0c267', '#8fb8d8'];
let texs;
function telas() {
  if (texs) return texs;
  const W = 512, Hc = 1024, fundo = '#191722';
  const codigo = tela(W, Hc, (g) => {
    g.fillStyle = fundo; g.fillRect(0, 0, W, Hc);
    g.fillStyle = '#211e2c'; g.fillRect(0, 0, 44, Hc);
    const r = semente(5); let ind = 0;
    for (let y = 8, i = 0; y < Hc - 8; y += 16, i++) {
      g.fillStyle = '#4a4560'; rr(g, 14, y + 3, 16, 6, 3); g.fill();
      if (r() < .1) { ind = Math.max(0, ind - 1); continue; }
      ind = Math.max(0, Math.min(5, ind + (r() < .3 ? 1 : r() < .3 ? -1 : 0)));
      let x = 58 + ind * 22; const n = 1 + Math.floor(r() * 4);
      for (let k = 0; k < n && x < W - 60; k++) {
        const w = 18 + r() * 90; g.fillStyle = CORES_COD[Math.floor(r() * CORES_COD.length)]; g.globalAlpha = .92;
        rr(g, x, y + 2, Math.min(w, W - 30 - x), 8, 4); g.fill(); x += w + 9;
      }
      g.globalAlpha = 1;
    }
    // costura do rolar: mesma faixa em cima e embaixo já é o fundo liso
  });
  const tC = texCanvas(codigo); tC.wrapT = THREE.RepeatWrapping; tC.repeat.set(1, 214 / Hc);
  const cartao = (desenha) => texCanvas(tela(W, 214, (g) => { g.fillStyle = fundo; g.fillRect(0, 0, W, 214); desenha(g); }));
  const txt = (g, s, y, cor, px = 26, peso = 600) => { g.font = `${peso} ${px}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = cor; g.fillText(s, W / 2, y); };
  texs = {
    codigo: tC,
    esperando: cartao((g) => {
      g.fillStyle = '#2a2436'; rr(g, 96, 30, 320, 154, 26); g.fill();
      g.fillStyle = '#e88bb8'; g.beginPath(); g.arc(W / 2, 84, 30, 0, 7); g.fill();
      txt(g, '?', 86, '#191722', 40, 800); txt(g, 'aguardando você', 146, '#f2e3cf', 26);
    }),
    terminou: cartao((g) => {
      g.fillStyle = '#1d2a22'; g.fillRect(0, 0, W, 214);
      g.fillStyle = '#58c07a'; g.beginPath(); g.arc(W / 2, 84, 40, 0, 7); g.fill();
      g.strokeStyle = '#132018'; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(W / 2 - 18, 86); g.lineTo(W / 2 - 4, 100); g.lineTo(W / 2 + 20, 70); g.stroke();
      txt(g, 'concluído', 160, '#d8f2df', 28);
    }),
    ocioso: cartao((g) => {
      const gr = g.createLinearGradient(0, 0, W, 214); gr.addColorStop(0, '#2b2238'); gr.addColorStop(1, '#3b2a33'); g.fillStyle = gr; g.fillRect(0, 0, W, 214);
      g.fillStyle = '#e9a37a'; g.beginPath(); g.arc(W / 2 - 4, 90, 34, 0, 7); g.fill(); g.fillStyle = '#31253a'; g.beginPath(); g.arc(W / 2 + 12, 80, 30, 0, 7); g.fill();
      txt(g, 'em pausa', 162, '#cbb9c6', 24, 500);
    }),
  };
  return texs;
}

// monitor curvo com tela viva. modos: off | trabalhando | pensando | esperando | ocioso | terminou
export function monitor(escala = 1) {
  const g = new THREE.Group(), w = .88, h = .37, R = 1.25;
  const casco = new THREE.Mesh(dobra(new THREE.BoxGeometry(w + .024, h + .024, .026, 28, 1, 1), R), M.escuro);
  casco.position.z = -.016; g.add(casco);
  const t = telas(), mTela = new THREE.MeshBasicMaterial({ color: 0x060608 });
  const tl = new THREE.Mesh(dobra(new THREE.PlaneGeometry(w, h, 28, 1), R), mTela); tl.position.z = -.002; tl.userData.semAO = false; g.add(tl);
  g.position.y = .15 + h / 2; // pivô no tampo
  const pe = new THREE.Group();
  const haste = caixaR(.05, .3, .03, .01, M.escuro); haste.position.set(0, -.185, -.045);
  const base = caixaR(.3, .016, .19, .007, M.escuro); base.position.set(0, -h / 2 - .142, -.03);
  pe.add(haste, base); g.add(pe);
  // fita de LED nas costas
  const led = new THREE.Mesh(dobra(new THREE.BoxGeometry(w * .82, .014, .012, 16, 1, 1), R), new THREE.MeshBasicMaterial({ color: 0xffb070 }));
  led.position.set(0, h / 2 - .03, -.036); g.add(led);
  const raiz = new THREE.Group(); raiz.add(g); raiz.scale.setScalar(escala);
  sombras(raiz); tl.castShadow = false; led.castShadow = false;
  const tex = { codigo: t.codigo.clone() }; tex.codigo.needsUpdate = true;
  const o = {
    g: raiz, tela: tl, led, modo: 'off', vel: 0, brilho: 0, alvo: 0, t: Math.random() * 10,
    setModo(m) {
      if (m === o.modo) return; o.modo = m;
      if (m === 'off') { o.alvo = 0; return; }
      mTela.map = m === 'trabalhando' || m === 'pensando' ? tex.codigo : t[m]; mTela.needsUpdate = true;
      o.vel = m === 'trabalhando' ? .055 : 0; o.alvo = m === 'ocioso' ? .7 : 1.25;
    },
    update(dt) {
      o.t += dt;
      o.brilho += (o.alvo - o.brilho) * Math.min(1, dt * 6);
      let b = o.brilho;
      if (o.modo === 'esperando') b *= .82 + .18 * Math.sin(o.t * 3.2);
      if (o.modo === 'pensando') b *= .8 + .12 * Math.sin(o.t * 1.6);
      mTela.color.setScalar(Math.max(.012, b));
      if (o.vel) tex.codigo.offset.y -= o.vel * dt * (.6 + .4 * Math.sin(o.t * .7) ** 2 + (Math.sin(o.t * 2.3) > .6 ? 1.2 : 0));
    },
  };
  return o;
}

// mouse, caneca, relógio digital
export function mouse() { const m = new THREE.Mesh(new THREE.SphereGeometry(.034, 16, 10), M.creme); m.scale.set(.82, .5, 1.3); m.position.y = .014; m.castShadow = true; return m; }
export function caneca(cor = M.terracota) {
  const g = new THREE.Group(), c = new THREE.Mesh(new THREE.CylinderGeometry(.036, .031, .075, 18, 1, true), cor); c.material.side = THREE.DoubleSide; c.position.y = .0375;
  const f = new THREE.Mesh(new THREE.CircleGeometry(.031, 18), cor); f.rotation.x = -Math.PI / 2; f.position.y = .004;
  const cafe = new THREE.Mesh(new THREE.CircleGeometry(.033, 18), mat(0x4a2c1c, .3)); cafe.rotation.x = -Math.PI / 2; cafe.position.y = .062;
  const alca = new THREE.Mesh(new THREE.TorusGeometry(.022, .007, 8, 14, Math.PI), cor); alca.rotation.z = -Math.PI / 2; alca.position.set(.036, .038, 0);
  g.add(c, f, cafe, alca); return sombras(g, true, false);
}
export function relogio() {
  const g = new THREE.Group(), corpo = caixaR(.2, .085, .07, .02, M.escuro); corpo.position.y = .0425; g.add(corpo);
  const cv = tela(160, 56), tx = texCanvas(cv);
  const vis = new THREE.Mesh(new THREE.PlaneGeometry(.17, .06), new THREE.MeshBasicMaterial({ map: tx })); vis.position.set(0, .044, .0355); g.add(vis);
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  function digito(c, n, x, y, w, h) {
    const e = 5, s = SEG[n]; c.lineCap = 'round'; c.lineWidth = e;
    const L = { a: [x, y, x + w, y], b: [x + w, y, x + w, y + h / 2], c: [x + w, y + h / 2, x + w, y + h], d: [x, y + h, x + w, y + h], e: [x, y + h / 2, x, y + h], f: [x, y, x, y + h / 2], g: [x, y + h / 2, x + w, y + h / 2] };
    for (const k of 'abcdefg') { c.strokeStyle = s.includes(k) ? '#ffcf9a' : 'rgba(255,200,150,.07)'; const [x0, y0, x1, y1] = L[k]; c.beginPath(); c.moveTo(x0 + (x1 > x0 ? 3 : 0), y0 + (y1 > y0 ? 3 : 0)); c.lineTo(x1 - (x1 > x0 ? 3 : 0), y1 - (y1 > y0 ? 3 : 0)); c.stroke(); }
  }
  let ultimo = '';
  const o = { g: sombras(g), update(agora) {
    const hh = agora.getHours(), mm = agora.getMinutes(), s = `${hh}:${mm}:${agora.getSeconds() % 2}`; if (s === ultimo) return; ultimo = s;
    const c = cv.getContext('2d'); c.fillStyle = '#17141a'; c.fillRect(0, 0, 160, 56);
    [Math.floor(hh / 10), hh % 10, Math.floor(mm / 10), mm % 10].forEach((d, i) => digito(c, d, 14 + i * 32 + (i > 1 ? 14 : 0), 12, 20, 32));
    if (agora.getSeconds() % 2 === 0) { c.fillStyle = '#ffcf9a'; c.beginPath(); c.arc(80, 21, 3, 0, 7); c.arc(80, 36, 3, 0, 7); c.fill(); }
    tx.needsUpdate = true;
  } };
  vis.castShadow = false; return o;
}

// ---------- parede ----------
const CORES_LIVRO = [0xf0e2cc, 0xd9643a, 0x8ea37e, 0x9a8f86, 0xe7b98a, 0xc9795a, 0xf6efe4, 0x6f7d8c];
export function livros(n, rnd, deitados = false) {
  const g = new THREE.Group(); let x = 0;
  for (let i = 0; i < n; i++) {
    const e = .022 + rnd() * .022, h = .17 + rnd() * .06, p = .12 + rnd() * .03;
    const b = new THREE.Mesh(new THREE.BoxGeometry(deitados ? h : e, deitados ? e : h, p), mat(CORES_LIVRO[Math.floor(rnd() * CORES_LIVRO.length)], .8));
    if (deitados) { b.position.set(0, x + e / 2, 0); b.rotation.y = (rnd() - .5) * .25; } else { b.position.set(x + e / 2, h / 2, 0); if (i === n - 1 && rnd() < .6) { b.rotation.z = -.22; b.position.x += .02; b.position.y -= .004; } }
    x += e + .002; g.add(b);
  }
  g.userData.larg = x; return sombras(g);
}
export function prateleira(larg, rnd, variante = 0) {
  const g = new THREE.Group(), t = caixaR(larg, .034, .23, .012, M.madeira); t.position.set(0, 0, .115); g.add(t);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.03, .12, .16), M.branco); m.position.set(s * (larg / 2 - .16), -.07, .09); g.add(m); }
  sombras(g);
  const topo = .017;
  const l1 = livros(5 + Math.floor(rnd() * 3), rnd); l1.position.set(-larg / 2 + .1, topo, .12); g.add(l1);
  if (variante !== 2) { const l2 = livros(3, rnd, true); l2.position.set(larg / 2 - .52, topo, .12); g.add(l2); }
  if (variante === 0) {
    const p = novo('pendente'); p.position.set(larg / 2 - .22, topo - .37, .12); g.add(p);
    const fig = foguete(); fig.position.set(.06, topo, .12); g.add(fig);
  } else if (variante === 1) {
    const v = vasinho(rnd); v.position.set(larg / 2 - .2, topo, .12); g.add(v);
  } else { const p = novo('pendente'); p.scale.setScalar(.8); p.position.set(larg / 2 - .3, topo - .3, .12); g.add(p); const c = novo('caixa-som'); c.scale.setScalar(.8); c.position.set(.1, topo, .12); g.add(c); }
  return g;
}
function foguete() {
  const g = new THREE.Group(), c = new THREE.Mesh(new THREE.CapsuleGeometry(.032, .07, 6, 14), M.creme); c.position.y = .09;
  const p = new THREE.Mesh(new THREE.ConeGeometry(.033, .05, 14), M.terracota); p.position.y = .175;
  const j = new THREE.Mesh(new THREE.SphereGeometry(.012, 10, 8), M.escuro); j.position.set(0, .105, .03);
  g.add(c, p, j);
  for (let i = 0; i < 3; i++) { const a = new THREE.Mesh(new THREE.BoxGeometry(.008, .05, .035), M.terracota); const an = i * 2.094; a.position.set(Math.sin(an) * .036, .035, Math.cos(an) * .036); a.rotation.y = an; g.add(a); }
  return sombras(g);
}
export function vasinho(rnd, cor = M.creme) {
  const g = new THREE.Group(), v = new THREE.Mesh(new THREE.CylinderGeometry(.05, .038, .08, 16), cor); v.position.y = .04; g.add(v);
  const mF = mat(0x6f9a52, .7, { side: THREE.DoubleSide });
  for (let i = 0; i < 9; i++) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), mF), a = rnd() * 6.28, r = .01 + rnd() * .035;
    f.scale.set(.55, 1.5 + rnd(), .22); f.position.set(Math.sin(a) * r, .1 + rnd() * .04, Math.cos(a) * r); f.rotation.set((rnd() - .5) * .9, a, (rnd() - .5) * .9); g.add(f);
  }
  return sombras(g);
}

// painel perfurado (fica na parede lateral; frente em +x no espaço do grupo da parede)
export function painelPerfurado() {
  const g = new THREE.Group(), L = 1.3, A = .95, placa = caixaR(L, A, .024, .012, mat(0xf4ebdf, .7)); placa.position.z = .03; g.add(placa);
  for (const [x, y] of [[-L / 2 + .08, A / 2 - .08], [L / 2 - .08, A / 2 - .08], [-L / 2 + .08, -A / 2 + .08], [L / 2 - .08, -A / 2 + .08]]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .03, 8), M.branco); e.rotation.x = Math.PI / 2; e.position.set(x, y, .015); g.add(e); }
  const nx = 19, ny = 13, furos = new THREE.InstancedMesh(new THREE.CircleGeometry(.0085, 10), new THREE.MeshBasicMaterial({ color: 0x8a6f5f }), nx * ny), m4 = new THREE.Matrix4();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { m4.makeTranslation((i - (nx - 1) / 2) * .064, (j - (ny - 1) / 2) * .064, .0425); furos.setMatrixAt(j * nx + i, m4); }
  furos.userData.semAO = true; g.add(furos);
  const pino = (x, y, c = .07) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, c, 8), M.madeira); p.rotation.x = Math.PI / 2; p.position.set(x, y, .042 + c / 2); g.add(p); return p; };
  // prateleirinha com vaso e caneca
  const pr = caixaR(.34, .018, .12, .006, M.madeira); pr.position.set(-.38, .16, .1); g.add(pr);
  const rnd = semente(21), v = vasinho(rnd, M.terracota); v.scale.setScalar(.8); v.position.set(-.46, .17, .1); g.add(v);
  const cn = caneca(M.creme); cn.position.set(-.29, .17, .1); g.add(cn);
  // fones pendurados
  const fones = new THREE.Group(); const arco = new THREE.Mesh(new THREE.TorusGeometry(.085, .011, 8, 22, Math.PI), M.cinza); fones.add(arco);
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .03, 16), M.creme); c.rotation.z = Math.PI / 2; c.position.set(s * .085, -.02, 0); const e = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .014, 16), M.cinza); e.rotation.z = Math.PI / 2; e.position.set(s * .068, -.02, 0); fones.add(c, e); }
  fones.position.set(.22, .12, .085); g.add(fones); pino(.22, .21, .09);
  // porta-canetas
  const pc = caixaR(.11, .11, .06, .012, M.creme); pc.position.set(.47, .2, .075); g.add(pc);
  [[-.025, M.terracota], [0, M.escuro], [.025, M.salvia]].forEach(([dx, mm], i) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .13, 6), mm); c.position.set(.47 + dx, .28, .078); c.rotation.z = (i - 1) * .12; g.add(c); });
  // bilhetes
  [[-.44, -.22, 0xf4c26b, .06], [-.3, -.2, 0xe9805a, -.05], [-.37, -.34, 0xf2e3cf, .02]].forEach(([x, y, c, r]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.105, .105, .003), mat(c, .9)); b.position.set(x, y, .045); b.rotation.z = r; g.add(b); });
  // bandeja com caixinhas
  const bj = caixaR(.36, .07, .09, .01, M.creme); bj.position.set(.3, -.26, .085); g.add(bj);
  [[.2, M.terracota], [.29, M.madeira], [.39, M.salvia]].forEach(([x, mm]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.07, .08, .05), mm); b.position.set(x, -.215, .085); g.add(b); });
  // régua/tesoura simbólicas
  const rg = new THREE.Mesh(new THREE.BoxGeometry(.03, .3, .005), M.madeira); rg.position.set(0, -.22, .05); rg.rotation.z = .08; g.add(rg); pino(0, -.06, .03);
  sombras(g); furos.castShadow = false; furos.receiveShadow = false;
  const raiz = new THREE.Group(); g.rotation.y = Math.PI / 2; raiz.add(g); return raiz;
}

// quadro abstrato original (formas simples)
export function quadro(rnd, w = .5, h = .62) {
  const g = new THREE.Group(), mold = caixaR(w, h, .03, .008, M.madeira); mold.position.z = .015; g.add(mold);
  const cores = ['#d9643a', '#f2e3cf', '#8ea37e', '#e7b98a', '#b4848f', '#f4c26b'];
  const tx = texCanvas(tela(200, 248, (c, W, Hh) => {
    c.fillStyle = '#f6efe4'; c.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 4; i++) { c.fillStyle = cores[Math.floor(rnd() * cores.length)]; c.beginPath(); const t = rnd(); if (t < .5) c.arc(rnd() * W, rnd() * Hh, 30 + rnd() * 50, 0, 7); else c.roundRect(rnd() * W * .6, rnd() * Hh * .7, 50 + rnd() * 80, 40 + rnd() * 90, 18); c.fill(); }
    c.fillStyle = '#d9643a'; c.beginPath(); c.arc(W * .68, Hh * .3, 26, 0, 7); c.fill();
  }));
  const arte = new THREE.Mesh(new THREE.PlaneGeometry(w - .07, h - .07), new THREE.MeshStandardMaterial({ map: tx, roughness: .9 })); arte.position.z = .031; g.add(arte);
  return sombras(g);
}

// brilho falso (aditivo) para LED na parede/tampo
export function brilho(cor, w, h) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texMacia(), color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 }));
  m.userData.semAO = true; return m;
}

// ---------- subagentes: mesinha, banquinho e monitor pequeno ----------
export function mesinha() {
  const g = new THREE.Group(), t = caixaR(.78, .03, .42, .012, M.madeira); t.position.y = .5; g.add(t);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.014, .012, .49, 8), M.branco); p.position.set(sx * .33, .245, sz * .16); g.add(p); }
  return sombras(g);
}
export function banquinho() {
  const g = new THREE.Group(), a = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .045, 20), M.creme); a.position.y = .31;
  const al = new THREE.Mesh(new THREE.CylinderGeometry(.118, .118, .02, 20), M.terracota); al.position.y = .342;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .28, 8), M.metal); h.position.y = .15;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, .02, 20), M.cinza); b.position.y = .01;
  g.add(a, al, h, b); return sombras(g);
}

// ---------- área comum ----------
export function tapete(w, d, rnd) {
  const tx = texCanvas(tela(256, 160, (c, W, Hh) => {
    c.fillStyle = '#f1e2cf'; c.fillRect(0, 0, W, Hh);
    c.strokeStyle = '#d9643a'; c.lineWidth = 8; rr(c, 16, 16, W - 32, Hh - 32, 14); c.stroke();
    c.strokeStyle = '#8ea37e'; c.lineWidth = 4; rr(c, 34, 34, W - 68, Hh - 68, 8); c.stroke();
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(120,80,50,${rnd() * .08})`; c.fillRect(rnd() * W, rnd() * Hh, 2, 2); }
  }));
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, .014, d, 2, .007), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 })); m.position.y = .007; m.receiveShadow = true; return m;
}
export function balcao(w = 1.5) {
  const g = new THREE.Group(), c = caixaR(w, .82, .5, .015, M.creme); c.position.set(0, .43, 0); g.add(c);
  const t = caixaR(w + .05, .04, .56, .012, M.madeira); t.position.set(0, .86, .01); g.add(t);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(w - .06, .08, .44), M.cinza); rod.position.set(0, .04, -.01); g.add(rod);
  for (let i = 0; i < 3; i++) { const x = (i - 1) * (w / 3); const p = new THREE.Mesh(new THREE.BoxGeometry(.012, .1, .012), M.metal); p.position.set(x + w / 6 - .05, .6, .255); g.add(p); if (i) { const f = new THREE.Mesh(new THREE.BoxGeometry(.004, .7, .004), M.cinza); f.position.set(x - w / 6, .45, .251); g.add(f); } }
  return sombras(g);
}
export function luminariaChao() {
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.CylinderGeometry(.14, .15, .025, 24), M.cinza); b.position.y = .0125;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1.45, 8), M.metal); h.position.y = .74;
  const mC = new THREE.MeshStandardMaterial({ color: 0xfff1dc, emissive: 0xffb877, emissiveIntensity: .9, roughness: .8, side: THREE.DoubleSide });
  const c = new THREE.Mesh(new THREE.CylinderGeometry(.13, .19, .26, 24, 1, true), mC); c.position.y = 1.52;
  g.add(b, h, c); sombras(g); c.castShadow = false; g.userData.cupula = mC; return g;
}
export function mesaRedonda() {
  const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .035, 36), M.madeira); t.position.y = .45;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .43, 10), M.branco); h.position.y = .22;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.22, .24, .02, 24), M.branco); b.position.y = .01;
  g.add(t, h, b); const cn = caneca(M.creme); cn.position.set(.12, .468, .05); g.add(cn);
  const lv = livros(2, semente(9), true); lv.position.set(-.12, .468, -.05); g.add(lv);
  return sombras(g);
}
// divisória de vidro ao longo de +x, com montantes
export function vidro(comp, alt = 1.85) {
  const g = new THREE.Group();
  const pano = new THREE.Mesh(new THREE.BoxGeometry(comp - .04, alt - .1, .012), new THREE.MeshStandardMaterial({ color: 0xd5ecf0, roughness: .08, metalness: 0, transparent: true, opacity: .2, depthWrite: false }));
  pano.position.set(comp / 2, alt / 2, 0); pano.userData.semAO = true; pano.renderOrder = 2; g.add(pano);
  const mQ = M.branco, barra = (w, h, x, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .04), mQ); b.position.set(x, y, 0); b.castShadow = true; b.receiveShadow = true; g.add(b); };
  barra(comp, .05, comp / 2, alt - .025); barra(comp, .06, comp / 2, .03); barra(.045, alt, .0225, alt / 2); barra(.045, alt, comp - .0225, alt / 2);
  const n = Math.round(comp / 1.25); for (let i = 1; i < n; i++) barra(.03, alt, comp * i / n, alt / 2);
  return g;
}
export function placa(texto) {
  const cv = tela(320, 72, (c) => { c.fillStyle = '#fff7ee'; rr(c, 0, 0, 320, 72, 20); c.fill(); c.fillStyle = '#d9643a'; c.beginPath(); c.arc(38, 36, 11, 0, 7); c.fill(); c.fillStyle = '#3b2a2a'; c.font = '600 30px "Avenir Next", "Helvetica Neue", Arial, sans-serif'; c.textBaseline = 'middle'; c.fillText(texto, 62, 38); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(.8, .18), new THREE.MeshBasicMaterial({ map: texCanvas(cv), transparent: true, side: THREE.DoubleSide })); m.userData.semAO = true; m.renderOrder = 3; return m;
}
