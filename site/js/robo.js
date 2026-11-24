// O robozinho: partes rígidas (cabeça, tronco, braços, pernas) animadas por poses-alvo amortecidas + movimento procedural.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, amort, clamp } from './util.js';
import { caneca } from './moveis.js';

let MAT;
function mats() {
  if (MAT) return MAT;
  MAT = {
    creme: new THREE.MeshPhysicalMaterial({ color: 0xf5ecdf, roughness: .42, clearcoat: .4, clearcoatRoughness: .45 }),
    junta: new THREE.MeshStandardMaterial({ color: 0xb9afa3, roughness: .6 }),
    terracota: new THREE.MeshPhysicalMaterial({ color: PAL.terracota, roughness: .45, clearcoat: .3, clearcoatRoughness: .5 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x15141b, roughness: .12, clearcoat: 1, clearcoatRoughness: .08 }),
  };
  return MAT;
}
const G = {
  tronco: new THREE.CapsuleGeometry(.125, .15, 8, 20), colar: new THREE.TorusGeometry(.098, .03, 10, 24),
  cabeca: new RoundedBoxGeometry(.37, .28, .31, 6, .125), visor: new RoundedBoxGeometry(.285, .165, .08, 5, .07),
  olho: new THREE.SphereGeometry(.026, 14, 10), sorriso: new THREE.TorusGeometry(.024, .0075, 6, 14, Math.PI),
  orelha: new THREE.CylinderGeometry(.062, .062, .034, 20), haste: new THREE.CylinderGeometry(.007, .007, .09, 6), bola: new THREE.SphereGeometry(.03, 14, 10),
  braco: new THREE.CapsuleGeometry(.034, .085, 4, 10), ante: new THREE.CapsuleGeometry(.032, .075, 4, 10), mao: new THREE.SphereGeometry(.048, 14, 10),
  coxa: new THREE.CapsuleGeometry(.044, .075, 4, 10), canela: new THREE.CapsuleGeometry(.04, .06, 4, 10), pe: new RoundedBoxGeometry(.1, .06, .15, 3, .028),
  ombro: new THREE.SphereGeometry(.042, 10, 8), luz: new THREE.CapsuleGeometry(.013, .04, 4, 8),
};

// ângulos-base de cada estado. om = [x, z] do ombro; ct = cotovelo; q = quadril; j = joelho
const SENT = { qE: -1.5, jE: 1.42, qD: -1.5, jD: 1.42 };
const POSES = {
  parado:      { inc: 0, cab: [0, 0, 0], omE: [.06, -.1], ctE: -.18, omD: [.06, .1], ctD: -.18, qE: 0, jE: 0, qD: 0, jD: 0 },
  andando:     { inc: .07, cab: [0, 0, 0], omE: [0, -.1], ctE: -.35, omD: [0, .1], ctD: -.35, qE: 0, jE: 0, qD: 0, jD: 0 },
  trabalhando: { inc: .1, cab: [.08, 0, 0], omE: [-1.12, .2], ctE: -.58, omD: [-1.12, -.2], ctD: -.58, ...SENT },
  pensando:    { inc: -.04, cab: [-.22, .25, .2], omE: [-.5, -.05], ctE: -.9, omD: [-.95, -.38], ctD: -2.05, ...SENT },
  esperando:   { inc: -.02, cab: [-.1, 0, -.1], omE: [-.45, -.05], ctE: -.8, omD: [-2.85, .28], ctD: -.25, ...SENT },
  ocioso:      { inc: -.26, cab: [.1, .12, .05], omE: [-.3, -.12], ctE: -.5, omD: [-.55, .05], ctD: -1.2, qE: -1.35, jE: 1.0, qD: -1.35, jD: 1.0 },
  terminou:    { inc: -.06, cab: [-.2, 0, 0], omE: [-2.7, -.5], ctE: -.2, omD: [-2.7, .5], ctD: -.2, ...SENT },
  sentado:     { inc: 0, cab: [0, 0, 0], omE: [-.4, -.05], ctE: -.7, omD: [-.4, .05], ctD: -.7, ...SENT },
};
const OMBROS = ['omE', 'omD'];
const ANGULOS = ['ctE', 'ctD', 'qE', 'jE', 'qD', 'jD'];
const CORES_LUZ = { trabalhando: 0xff8a52, pensando: 0xffc45e, esperando: 0xff7fc0, ocioso: 0x9a9088, terminou: 0x62e08a, andando: 0xff8a52, parado: 0xff8a52, sentado: 0xff8a52 };

export class Robo {
  constructor(escala = 1) {
    const m = mats(), g = this.g = new THREE.Group(); g.scale.setScalar(escala); this.escala = escala;
    const malha = (geo, mt, p) => { const o = new THREE.Mesh(geo, mt); o.castShadow = true; o.receiveShadow = true; if (p) p.add(o); return o; };
    // corpo: origem no quadril
    const corpo = this.corpo = new THREE.Group(); corpo.position.y = .33; g.add(corpo);
    const tronco = malha(G.tronco, m.creme, corpo); tronco.position.y = .2; tronco.scale.set(1.05, 1, .88);
    const colar = malha(G.colar, m.terracota, corpo); colar.rotation.x = Math.PI / 2; colar.position.y = .385; colar.scale.set(1, .9, .75);
    this.mLuz = new THREE.MeshBasicMaterial({ color: 0xff8a52 });
    const luz = new THREE.Mesh(G.luz, this.mLuz); luz.rotation.z = Math.PI / 2; luz.position.set(0, .23, .113); corpo.add(luz);

    const pesc = this.pesc = new THREE.Group(); pesc.position.y = .405; corpo.add(pesc);
    const cab = malha(G.cabeca, m.creme, pesc); cab.position.y = .155;
    const visor = malha(G.visor, m.visor, pesc); visor.position.set(0, .15, .123); visor.castShadow = false;
    this.mOlho = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.25, .75) });
    this.olhos = new THREE.Group(); this.olhos.position.set(0, .152, .166); pesc.add(this.olhos);
    this.oE = new THREE.Mesh(G.olho, this.mOlho); this.oE.position.x = -.062; this.oD = new THREE.Mesh(G.olho, this.mOlho); this.oD.position.x = .062;
    for (const o of [this.oE, this.oD]) { o.scale.set(.82, 1.25, .3); this.olhos.add(o); }
    this.sE = new THREE.Mesh(G.sorriso, this.mOlho); this.sE.position.set(-.062, -.008, 0); this.sD = new THREE.Mesh(G.sorriso, this.mOlho); this.sD.position.set(.062, -.008, 0);
    this.sE.visible = this.sD.visible = false; this.olhos.add(this.sE, this.sD);
    for (const s of [-1, 1]) { const o = malha(G.orelha, m.terracota, pesc); o.rotation.z = Math.PI / 2; o.position.set(s * .187, .15, 0); }
    this.antena = new THREE.Group(); this.antena.position.set(.07, .29, 0); pesc.add(this.antena);
    const haste = malha(G.haste, m.junta, this.antena); haste.position.y = .045;
    const bola = malha(G.bola, m.terracota, this.antena); bola.position.y = .1;

    // braços
    const braco = (s) => {
      const om = new THREE.Group(); om.position.set(s * .162, .31, 0); corpo.add(om);
      malha(G.ombro, m.junta, om);
      const b = malha(G.braco, m.creme, om); b.position.y = -.07;
      const ct = new THREE.Group(); ct.position.y = -.14; om.add(ct);
      const a = malha(G.ante, m.creme, ct); a.position.y = -.065;
      const mao = new THREE.Group(); mao.position.y = -.15; ct.add(mao); malha(G.mao, m.terracota, mao).scale.set(1, .9, 1);
      return { om, ct, mao };
    };
    this.bE = braco(-1); this.bD = braco(1);
    this.caneca = caneca(); this.caneca.scale.setScalar(.95); this.caneca.position.set(-.01, -.03, .045); this.caneca.rotation.x = 1.45; this.caneca.visible = false; this.bD.mao.add(this.caneca);
    // pernas
    const perna = (s) => {
      const q = new THREE.Group(); q.position.set(s * .068, .02, 0); corpo.add(q);
      const c = malha(G.coxa, m.creme, q); c.position.y = -.07;
      const j = new THREE.Group(); j.position.y = -.15; q.add(j);
      const cn = malha(G.canela, m.creme, j); cn.position.y = -.06;
      const pe = malha(G.pe, m.terracota, j); pe.position.set(0, -.15, .028);
      return { q, j };
    };
    this.pE = perna(-1); this.pD = perna(1);

    this.estado = 'parado'; this.t = Math.random() * 20; this.fase = 0; this.vel = 0;
    this.p = JSON.parse(JSON.stringify(POSES.parado)); this.alturaCorpo = .33; this.altura = .33;
    this.pisca = 2 + Math.random() * 3; this.olhoY = 1; this.gole = 4 + Math.random() * 3; this.festa = 0; this.antV = 0; this.antA = 0;
  }

  setEstado(e) {
    if (e === this.estado) return; this.estado = e; this.festa = e === 'terminou' ? 0 : this.festa;
    this.mLuz.color.set(CORES_LUZ[e] || 0xff8a52).multiplyScalar(1.5);
    this.antV += 3; // estalinho na antena a cada troca
  }

  update(dt) {
    const t = (this.t += dt), e = this.estado, P = POSES[e] || POSES.parado, p = this.p, k = e === 'andando' ? 14 : 7;
    p.inc = amort(p.inc, P.inc, k, dt); for (let i = 0; i < 3; i++) p.cab[i] = amort(p.cab[i], P.cab[i], k, dt);
    for (const n of OMBROS) { p[n][0] = amort(p[n][0], P[n][0], k, dt); p[n][1] = amort(p[n][1], P[n][1], k, dt); }
    for (const n of ANGULOS) p[n] = amort(p[n], P[n], k, dt);

    // cópia de trabalho com o movimento procedural por cima
    let inc = p.inc, cx = p.cab[0], cy = p.cab[1], cz = p.cab[2], oEx = p.omE[0], oEz = p.omE[1], cE = p.ctE, oDx = p.omD[0], oDz = p.omD[1], cD = p.ctD;
    let qE = p.qE, jE = p.jE, qD = p.qD, jD = p.jD, dy = 0, feliz = false, abre = 1, olharX = 0, olharY = 0;
    const resp = Math.sin(t * 1.7) * .006;

    if (e === 'andando') {
      this.fase += dt * this.vel * 7.2; const s = Math.sin(this.fase), c = Math.cos(this.fase);
      qE += s * .62; qD -= s * .62; jE += Math.max(0, c) * .75; jD += Math.max(0, -c) * .75;
      oEx += -s * .55; oDx += s * .55; dy = Math.abs(c) * .018; cz += s * .03; inc += .02;
    } else if (e === 'trabalhando') {
      const r1 = Math.sin(t * 17) * Math.sin(t * 2.3 + 1), r2 = Math.sin(t * 15.3 + 2) * Math.cos(t * 1.9);
      cE += r1 * .11 - .02; cD += r2 * .11 - .02; oEx += r1 * .03; oDx += r2 * .03;
      oEz += Math.sin(t * .9) * .05; oDz += Math.sin(t * 1.1 + 1) * .05;
      cx += Math.sin(t * 2.1) * .025; cy += Math.sin(t * .45) * .16 * Math.sin(t * .13); cz += Math.sin(t * .8) * .02;
      olharX = Math.sin(t * .9) * .25;
    } else if (e === 'pensando') {
      cz += Math.sin(t * .8) * .05; cx += Math.sin(t * .55) * .04; oDz += Math.sin(t * 1.3) * .02; cD += Math.sin(t * 2.6) * .04;
      qE += Math.sin(t * 1.6) * .12; qD += Math.sin(t * 1.6 + 2.2) * .12; olharX = .5; olharY = .55;
    } else if (e === 'esperando') {
      oDz += Math.sin(t * 5.2) * .26; cD += Math.sin(t * 5.2 + .8) * .12; cz += Math.sin(t * 2.6) * .05; dy = Math.max(0, Math.sin(t * 2.6)) * .012; abre = 1.18;
    } else if (e === 'ocioso') {
      // gole de café de tempos em tempos
      this.gole -= dt; let g = 0;
      if (this.gole < 0) { const u = -this.gole; g = u < .5 ? u / .5 : u < 1.5 ? 1 : u < 2 ? 1 - (u - 1.5) / .5 : 0; if (u >= 2) this.gole = 4 + Math.random() * 4; }
      g = g * g * (3 - 2 * g);
      oDx += g * -.75; cD += g * -.95; oDz += g * -.32; cx += g * -.22;
      qE += Math.sin(t * 1.1) * .16; qD += Math.sin(t * 1.1 + 1.7) * .16; inc += Math.sin(t * .6) * .02; abre = .55; cy += Math.sin(t * .3) * .12;
    } else if (e === 'terminou') {
      this.festa += dt; const f = clamp(1 - (this.festa - 5) / 1.5, .25, 1);
      const pulo = Math.abs(Math.sin(t * 6.2)) * f; dy = pulo * .06;
      oEz += Math.sin(t * 6.2) * .22 * f; oDz -= Math.sin(t * 6.2) * .22 * f; oEx += (1 - f) * 1.9; oDx += (1 - f) * 1.9; cE -= (1 - f) * .7; cD -= (1 - f) * .7;
      cz += Math.sin(t * 6.2) * .08 * f; qE += pulo * .3; qD += pulo * .3; feliz = true;
    } else { cy += Math.sin(t * .5) * .06; }

    this.corpo.position.y = this.altura + dy + resp; this.corpo.rotation.x = inc;
    this.pesc.rotation.set(cx, cy, cz);
    this.bE.om.rotation.set(oEx, 0, oEz); this.bE.ct.rotation.x = cE; this.bD.om.rotation.set(oDx, 0, oDz); this.bD.ct.rotation.x = cD;
    this.pE.q.rotation.x = qE; this.pE.j.rotation.x = jE; this.pD.q.rotation.x = qD; this.pD.j.rotation.x = jD;

    // antena com molinha
    this.antV += (-this.antA * 60 - this.antV * 5) * dt + (e === 'andando' ? Math.cos(this.fase) * dt * 14 : 0) + (e === 'terminou' ? Math.sin(t * 6.2) * dt * 20 : 0);
    this.antA += this.antV * dt; this.antena.rotation.z = clamp(this.antA, -.6, .6) - .12;

    // olhos
    this.pisca -= dt; let fecha = 1;
    if (this.pisca < 0) { fecha = Math.abs(this.pisca + .07) / .07; if (this.pisca < -.14) this.pisca = 1.8 + Math.random() * 3.5; }
    this.olhoY = amort(this.olhoY, abre * Math.min(1, fecha), 30, dt);
    this.oE.visible = this.oD.visible = !feliz; this.sE.visible = this.sD.visible = feliz;
    this.oE.scale.y = this.oD.scale.y = 1.25 * Math.max(.08, this.olhoY);
    this.olhos.position.x = amort(this.olhos.position.x, olharX * .022, 6, dt); this.olhos.position.y = amort(this.olhos.position.y, .152 + olharY * .02, 6, dt);
    this.caneca.visible = e === 'ocioso';
  }
}
export const ALT_EM_PE = .33;
