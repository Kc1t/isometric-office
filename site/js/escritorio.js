// O escritório: postos de trabalho, agentes (robôs), subagentes e a expansão por estágios.
import * as THREE from 'three';
import { Sala, H } from './sala.js';
import * as Mv from './moveis.js';
import { Robo, ALT_EM_PE } from './robo.js';
import { anim, tween, espera, E, clamp, lerp, amort, amortAng, semente, texMacia, mat, PAL } from './util.js';

export const ESTAGIOS = [
  { nome: 'quarto', cap: 1, W: 3.6, D: 3.0 },
  { nome: 'home office', cap: 3, W: 8.3, D: 3.6 },
  { nome: 'estúdio', cap: 6, W: 11.5, D: 7.4 },
  { nome: 'andar inteiro', cap: 12, W: 18.8, D: 7.4 },
];
const COLS = [-2.35, -4.65, -6.95, -12.85, -15.15, -17.45];
const FILA_Z = [0, 3.75], CORREDOR_X = -.6, ASSENTO = .47, MESA = .74;
const posSlot = (i) => { const bloco = i >= 6 ? 1 : 0, j = i % 6, fila = j >= 3 ? 1 : 0; return { x: COLS[j % 3 + bloco * 3], z0: FILA_Z[fila], fila, bloco }; };
const V = (x, z, y = 0) => new THREE.Vector3(x, y, z);

// ---------- poeira e confete ----------
class Poeira {
  constructor(cena) {
    this.ps = [];
    for (let i = 0; i < 90; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texMacia(), color: 0xfff1e2, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false; s.userData.semAO = true; cena.add(s); this.ps.push({ s, vida: 0, v: new THREE.Vector3() });
    }
    this.i = 0;
  }
  uma(x, y, z, vx, vy, vz, tam, dur, cor, grav = 0) {
    const p = this.ps[this.i = (this.i + 1) % this.ps.length];
    p.s.position.set(x, y, z); p.v.set(vx, vy, vz); p.tam = tam; p.dur = p.vida = dur; p.grav = grav; p.s.material.color.set(cor); p.s.visible = true; p.conf = grav > 0;
  }
  sopro(pos, n = 8, raio = .35) {
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.28 + Math.random(), v = .5 + Math.random() * .6; this.uma(pos.x + Math.cos(a) * raio * .5, pos.y + .04, pos.z + Math.sin(a) * raio * .5, Math.cos(a) * v, .25 + Math.random() * .3, Math.sin(a) * v, .16 + Math.random() * .16, .55 + Math.random() * .3, 0xfff1e2); }
  }
  confete(pos) {
    const cores = [0x62e08a, 0xffc45e, 0xff8a52, 0xfff3e2, 0x8fb8d8];
    for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, v = .5 + Math.random() * .9; this.uma(pos.x, pos.y, pos.z, Math.cos(a) * v, 1.6 + Math.random() * 1.4, Math.sin(a) * v, .05 + Math.random() * .03, 1.1 + Math.random() * .5, cores[i % cores.length], 5.5); }
  }
  update(dt) {
    for (const p of this.ps) {
      if (p.vida <= 0) continue; p.vida -= dt; const k = 1 - p.vida / p.dur;
      if (p.vida <= 0) { p.s.visible = false; continue; }
      p.v.y -= p.grav * dt; if (!p.conf) p.v.multiplyScalar(1 - dt * 3);
      p.s.position.addScaledVector(p.v, dt);
      const t = p.conf ? p.tam : p.tam * (.5 + k * 1.6); p.s.scale.set(t, t, 1);
      p.s.material.opacity = p.conf ? Math.min(1, p.vida * 3) : .42 * (1 - k) * Math.min(1, k * 8);
    }
  }
}

// ---------- posto de trabalho ----------
class Posto {
  constructor(esc, slot) {
    this.esc = esc; this.slot = slot; Object.assign(this, posSlot(slot));
    this.g = new THREE.Group(); this.g.position.set(this.x, 0, this.z0); esc.cena.add(this.g);
    this.ocupante = null; this.subs = [null, null]; this.vivo = true;
    this.cad = { rot: Math.PI, z: .95, rotAlvo: Math.PI, zAlvo: .95 };
    this.luzK = 0;
  }
  aprox() { return V(this.x, this.z0 + 1.9); }
  mobiliar(atraso = 0) {
    const g = this.g, esc = this.esc, rnd = semente(100 + this.slot * 7), v = this.slot === 0 ? 0 : 1 + (this.slot % 3), ps = [];
    const poe = (o, x, y, z, d, tipo = 'cai') => { o.position.set(x, y, z); g.add(o); ps.push(tipo === 'cai' ? esc.cair(o, atraso + d, y < .1) : esc.brotar(o, atraso + d)); return o; };
    poe(Mv.novo('mesa'), 0, 0, .45, 0);
    const torre = Mv.novo('torre');
    const mA = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.0, .35) });
    for (const [ax, ay] of [[-.085, .3], [-.085, .15]]) { const a = new THREE.Mesh(new THREE.TorusGeometry(.048, .007, 8, 28), mA); a.position.set(ax, ay, .139); torre.add(a); }
    const bt = Mv.brilho(0xff8a3a, .6, .6); bt.position.set(-.02, .22, .15); bt.material.opacity = .35; torre.add(bt);
    poe(torre, 1.0, 0, .3, .12);
    this.cadeira = new THREE.Group(); const cm = Mv.novo('cadeira'); this.cadeira.add(cm); this.cadeira.rotation.y = Math.PI; poe(this.cadeira, 0, 0, .95, .26);
    this.monitor = Mv.monitor(); poe(this.monitor.g, 0, MESA, .27, .42);
    poe(Mv.novo('teclado'), 0, MESA, .6, .52); poe(Mv.mouse(), .34, MESA, .62, .57);
    if (v === 0) {
      const cs = Mv.novo('caixa-som'); cs.rotation.y = .35; poe(cs, -.6, MESA, .3, .62);
      this.relogio = Mv.relogio(); this.relogio.g.rotation.y = -.3; poe(this.relogio.g, .56, MESA, .4, .68);
      poe(Mv.caneca(), -.4, MESA, .64, .74);
    } else if (v === 1) {
      poe(Mv.vasinho(rnd), -.58, MESA, .28, .62); const cs = Mv.novo('caixa-som'); cs.rotation.y = -.3; poe(cs, .58, MESA, .3, .68);
    } else if (v === 2) {
      const cs = Mv.novo('caixa-som'); cs.rotation.y = .3; poe(cs, -.6, MESA, .3, .62); poe(Mv.caneca(Mv.MATS.creme), .5, MESA, .56, .7); poe(Mv.vasinho(rnd, Mv.MATS.terracota), .6, MESA, .3, .74);
    } else {
      const lv = Mv.livros(3, rnd, true); lv.rotation.y = .2; poe(lv, -.55, MESA, .32, .62); poe(Mv.caneca(Mv.MATS.salvia), .52, MESA, .5, .7);
    }
    // parede (só a fila encostada no fundo) e brilho do LED
    if (this.fila === 0) {
      const b = Mv.brilho(0xff9448, 1.9, 1.2); b.position.set(0, 1.12, .006); g.add(b); this.brilho = b; b.material.opacity = 0;
      if (v === 0) poe(Mv.prateleira(1.3, rnd, 0), 0, 1.8, 0, .35, 'brota');
      else if (v === 1) { poe(Mv.quadro(rnd, .46, .58), -.3, 1.82, 0, .35, 'brota'); poe(Mv.quadro(rnd, .34, .34), .26, 1.72, 0, .45, 'brota'); }
      else if (v === 2) poe(Mv.prateleira(1.2, rnd, 1), 0, 1.78, 0, .35, 'brota');
      else poe(Mv.prateleira(1.25, rnd, 2), 0, 1.8, 0, .35, 'brota');
    } else {
      const b = Mv.brilho(0xff9448, 1.3, .7); b.rotation.x = -Math.PI / 2; b.position.set(0, MESA + .004, .2); g.add(b); this.brilho = b; b.material.opacity = 0;
    }
    this.luz = esc.luzes[this.slot]; this.luz.position.set(this.x, 1.12, this.z0 + .42);
    this.pronto = Promise.all(ps); return this.pronto;
  }
  alvoCadeira(estado) {
    const c = this.cad;
    if (estado === 'trabalhando') { c.rotAlvo = Math.PI; c.zAlvo = .95; }
    else if (estado === 'pensando') { c.rotAlvo = Math.PI - .85; c.zAlvo = 1.06; }
    else if (estado === 'ocioso') { c.rotAlvo = 1.5; c.zAlvo = 1.2; }
    else if (estado === 'recebe') { c.rotAlvo = 0; c.zAlvo = 1.2; }
    else { c.rotAlvo = .78; c.zAlvo = 1.22; }
  }
  update(dt, noite) {
    if (!this.cadeira) return;
    const c = this.cad; c.rot = amortAng(c.rot, c.rotAlvo, 5, dt); c.z = amort(c.z, c.zAlvo, 5, dt);
    this.cadeira.rotation.y = c.rot; this.cadeira.position.z = c.z;
    this.monitor.update(dt);
    const ligado = this.monitor.brilho > .1 ? 1 : .22;
    this.luzK = amort(this.luzK, ligado, 4, dt);
    if (this.luz) this.luz.intensity = this.luzK * lerp(.3, 1.5, noite);
    if (this.brilho) this.brilho.material.opacity = this.luzK * lerp(.3, .75, noite);
  }
  remover() {
    this.vivo = false; if (this.luz) this.luz.intensity = 0; for (const s of this.subs) if (s) s.remover();
    const g = this.g; this.esc.poeira.sopro(V(this.x, this.z0 + .6), 10, .8);
    tween(.3, E.in2, (k) => { g.scale.setScalar(1 - k); g.position.y = k * .5; }).then(() => { g.parent && g.parent.remove(g); });
  }
}

// mini posto de subagente: banquinho + mesinha + monitor pequeno, de frente para a câmera
class SubPosto {
  constructor(esc, pai, idx) {
    this.esc = esc; this.pai = pai; this.idx = idx; const dx = idx ? .55 : -.55;
    this.x = pai.x + dx; this.z0 = pai.z0; this.g = new THREE.Group(); this.g.position.set(this.x, 0, pai.z0); esc.cena.add(this.g);
    const ps = [];
    const poe = (o, x, y, z, d) => { o.position.set(x, y, z); this.g.add(o); ps.push(esc.cair(o, d, y < .1)); return o; };
    this.banco = poe(Mv.banquinho(), 0, 0, 2.4, 0); poe(Mv.mesinha(), 0, 0, 2.78, .1);
    this.monitor = Mv.monitor(.46); this.monitor.g.rotation.y = Math.PI; poe(this.monitor.g, 0, .515, 2.86, .3);
    const tc = Mv.novo('teclado'); tc.scale.setScalar(.62); tc.rotation.y = Math.PI; poe(tc, 0, .515, 2.66, .36);
    // linha fina no chão ligando ao pai
    const a = V(pai.x, pai.z0 + 1.42, .017), b = V(this.x, pai.z0 + 2.24, .017), d = b.clone().sub(a), L = d.length();
    const ln = this.linha = new THREE.Mesh(new THREE.BoxGeometry(1, .004, .022), new THREE.MeshBasicMaterial({ color: 0xe0703f }));
    ln.position.copy(a); ln.rotation.y = -Math.atan2(d.z, d.x); ln.geometry.translate(.5, 0, 0); ln.scale.x = .001; ln.userData.semAO = true; esc.cena.add(ln);
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .004, 16), ln.material); p1.position.copy(b); p1.scale.setScalar(.001); esc.cena.add(p1); this.ponta = p1; p1.userData.semAO = true;
    tween(.6, E.out3, (k) => { ln.scale.x = Math.max(.001, k * L); p1.scale.setScalar(Math.max(.001, k)); }, .35);
    this.pronto = Promise.all(ps); this.vivo = true;
  }
  aprox() { return V(this.x, this.z0 + 1.9); }
  update(dt) { this.monitor.update(dt); }
  remover() {
    this.vivo = false; const g = this.g, ln = this.linha, p1 = this.ponta; this.esc.poeira.sopro(V(this.x, this.z0 + 2.5), 6, .4);
    tween(.3, E.in2, (k) => { g.scale.setScalar(1 - k); g.position.y = k * .4; ln.scale.x = Math.max(.001, ln.scale.x * (1 - k)); p1.scale.setScalar(Math.max(.001, 1 - k)); })
      .then(() => { for (const o of [g, ln, p1]) o.parent && o.parent.remove(o); });
  }
}

// ---------- agente ----------
class Agente {
  constructor(esc, d) {
    this.esc = esc; this.id = d.id; this.pai = d.pai || null; this.sub = !!d.pai;
    this.robo = new Robo(this.sub ? .7 : 1); this.fase = 'fila'; this.vivo = true; this.estado = null; this.querEstado = d.estado || 'trabalhando';
    this.rumo = 0; this.posto = null; this.saindo = false;
    const c = document.getElementById('camada');
    this.etq = document.createElement('div'); this.etq.className = 'etq' + (this.sub ? ' sub' : ''); this.etq.innerHTML = '<i></i><b></b><u style="text-decoration:none"></u><span></span>'; c.appendChild(this.etq);
    this.balao = document.createElement('div'); this.balao.className = 'balao' + (this.sub ? ' sub' : ''); this.balao.innerHTML = '<div></div>'; c.appendChild(this.balao);
    this.dados(d); this._txt = '';
  }
  dados(d) { this.nome = d.nome; this.tarefa = d.tarefa || ''; this.desde = d.desde || Date.now(); this.extra = d.extra || ''; this.querEstado = d.estado || this.querEstado; }
  some() { this.etq.remove(); this.balao.remove(); const g = this.robo.g; g.parent && g.parent.remove(g); }
}
const idade = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };

export class Escritorio {
  constructor(cena, luz) {
    this.cena = cena; this.luz = luz; this.sala = new Sala(cena); this.poeira = new Poeira(cena);
    this.ags = new Map(); this.postos = []; this.estagio = 0; this.W = this.sala.W; this.D = this.sala.D;
    this.portaUso = 0; this.proxEntrada = 0; this.t = 0; this.vazioT = 0; this.travado = false; this.decor = [[], [], [], []];
    this.luzes = []; for (let i = 0; i < 12; i++) { const l = new THREE.PointLight(0xffa868, 0, 3.4, 1.7); l.position.set(0, -5, 0); if (globalThis.__ALTA) cena.add(l); this.luzes.push(l); }
    this.montaBase();
    this.aoMudar = null;
  }

  // ---------- animações de peça ----------
  cair(o, atraso = 0, noChao = true, alt = 3.2) {
    const y0 = o.position.y, s0 = o.scale.clone(); o.visible = false; let bateu = false; const wp = new THREE.Vector3();
    return new Promise((res) => anim({ delay: atraso, dur: .8, update: (_, k) => {
      o.visible = true; const t = k * .8; let y, sq;
      if (t < .4) { const u = t / .4; y = alt * (1 - u * u); sq = -.08 * u; }
      else if (t < .62) { const u = (t - .4) / .22; y = .11 * Math.sin(Math.PI * u); sq = .26 * (1 - u) * (1 - u) - .04 * Math.sin(Math.PI * u); }
      else { const u = (t - .62) / .18; y = .022 * Math.sin(Math.PI * u); sq = .06 * (1 - u); }
      o.position.y = y0 + y; o.scale.set(s0.x * (1 + sq * .55), s0.y * (1 - sq), s0.z * (1 + sq * .55));
      if (!bateu && t >= .4) { bateu = true; if (noChao) { o.getWorldPosition(wp); wp.y = 0; this.poeira.sopro(wp, 7, .5); } }
    }, done: () => { o.position.y = y0; o.scale.copy(s0); res(); } }));
  }
  brotar(o, atraso = 0) {
    const s0 = o.scale.clone(); o.visible = false;
    return tween(.5, E.outBack, (k) => { o.visible = true; o.scale.copy(s0).multiplyScalar(Math.max(.001, k)); }, atraso);
  }
  sumir(o, atraso = 0) {
    const s0 = o.scale.clone();
    return tween(.28, E.in2, (k) => { o.scale.copy(s0).multiplyScalar(Math.max(.001, 1 - k)); }, atraso).then(() => { o.parent && o.parent.remove(o); o.scale.copy(s0); });
  }

  // ---------- decoração fixa e por estágio ----------
  montaBase() {
    const lat = this.sala.lateral, rnd = semente(40);
    const pp = Mv.painelPerfurado(); pp.position.set(0, 1.55, 1.42); lat.add(pp);
    const pl = Mv.novo('planta'); pl.position.set(.5, 0, 2.5); pl.rotation.y = .6; lat.add(pl);
    // peças por estágio: [fábrica, pai, x, y, z, rotY, tipo]
    const D = this.defs = [[], [], [], []];
    D[1].push([() => Mv.luminariaChao(), lat, .34, 0, .36, 0, 'cai'], [() => Mv.quadro(rnd, .5, .62), lat, .0, 1.62, 2.95, Math.PI / 2, 'brota']);
    D[2].push(
      [() => Mv.tapete(1.9, 2.3, rnd), null, -9.9, 0, 3.75, 0, 'cai'],
      [() => Mv.novo('sofa'), null, -11.02, 0, 3.75, Math.PI / 2, 'cai'],
      [() => Mv.mesaRedonda(), null, -9.82, 0, 3.75, 0, 'cai'],
      [() => Mv.balcao(1.5), null, -9.45, 0, .3, 0, 'cai'],
      [() => { const c = Mv.novo('cafe'); return c; }, null, -9.75, .88, .3, 0, 'cai'],
      [() => Mv.caneca(Mv.MATS.creme), null, -9.3, .88, .36, 0, 'cai'], [() => Mv.caneca(), null, -9.18, .88, .26, 0, 'cai'], [() => Mv.vasinho(rnd), null, -8.95, .88, .3, 0, 'cai'],
      [() => Mv.novo('estante'), null, -10.92, 0, .28, 0, 'cai'],
      [() => { const p = Mv.novo('planta'); p.scale.setScalar(.85); return p; }, null, -8.75, 0, 6.75, 2, 'cai'],
      [() => Mv.quadro(rnd, .6, .45), null, -9.5, 1.75, 0, 0, 'brota'],
    );
    const vz = (x, z, comp) => [() => Mv.vidro(comp), null, x, 0, z, -Math.PI / 2, 'sobe'];   // ao longo de +z
    const vx = (x, z, comp) => [() => Mv.vidro(comp), null, x, 0, z, 0, 'sobe'];              // ao longo de +x
    D[3].push(
      [() => Mv.novo('sofa'), null, -8.78, 0, 3.75, -Math.PI / 2, 'cai'],
      vx(-8.3, 3.3, 7.05), vx(-18.8, 3.3, 7.3),
      ...[-1.25, -8.3, -11.5].flatMap((x) => [vz(x, .05, 1.25), vz(x, 2.5, .8), vz(x, 3.3, 1.75), vz(x, 6.25, 1.1)]),
      [() => { const p = Mv.novo('planta'); p.scale.setScalar(.9); return p; }, null, -11.05, 0, 6.8, 4, 'cai'],
      [() => { const p = Mv.novo('planta'); p.scale.setScalar(.7); return p; }, null, -.55, 0, 6.9, 1, 'cai'],
      [() => Mv.luminariaChao(), null, -10.95, 0, 2.72, 0, 'cai'],
    );
    this.nomesSala = ['site', 'api', 'app', 'dados'];
    [[-1.25, .67], [-1.25, 4.17], [-11.5, .67], [-11.5, 4.17]].forEach(([x, z], i) => D[3].push([() => { const p = Mv.placa('projeto ' + this.nomesSala[i]); return p; }, null, x + .03, 1.5, z, Math.PI / 2, 'brota']));
  }
  poeDecor(n, atraso) {
    this.defs[n].forEach(([fab, pai, x, y, z, ry, tipo], i) => {
      const o = fab(); o.position.set(x, y, z); o.rotation.y = ry; (pai || this.cena).add(o); this.decor[n].push(o);
      const d = atraso + i * .09;
      if (tipo === 'cai') this.cair(o, d, y < .1); else if (tipo === 'brota') this.brotar(o, d);
      else { o.scale.y = .001; o.visible = false; tween(.7, E.outBack, (k) => { o.visible = true; o.scale.y = Math.max(.001, k); }, d); }
    });
  }
  tiraDecor(n) { this.decor[n].forEach((o, i) => this.sumir(o, i * .03)); this.decor[n] = []; }

  // ---------- estágios ----------
  principais() { return [...this.ags.values()].filter((a) => !a.sub && !a.saindo); }
  temSubs() { return [...this.ags.values()].some((a) => a.sub && a.posto); }
  alvo() { const e = ESTAGIOS[this.estagio]; return { W: e.W, D: Math.max(e.D, this.temSubs() ? 3.6 : 0) }; }
  redimensiona(dur = 1.7) {
    const a = this.alvo(); if (this._alvoW === a.W && this._alvoD === a.D) return; this._alvoW = a.W; this._alvoD = a.D;
    if (this._tw) this._tw.vivo = false;
    const w0 = this.W, d0 = this.D; this.crescendoAte = this.t + dur;
    this._tw = anim({ dur, ease: E.inOut, update: (k) => { this.W = lerp(w0, a.W, k); this.D = lerp(d0, a.D, k); this.sala.W = this.W; this.sala.D = this.D; this.sala.aplica(); } });
    // poeira no pé da parede que desliza
    if (Math.abs(a.W - w0) > .5) for (let i = 0; i < 6; i++) anim({ delay: .15 + i * dur / 7, dur: .01, done: () => this.poeira.sopro(V(-this.W + .1, Math.random() * Math.min(this.D, 3)), 4, .3) });
  }
  cresce(n) {
    while (this.estagio < n) { this.estagio++; this.poeDecor(this.estagio, 1.35); }
    this.redimensiona(); this.vazioT = 0; if (this.aoMudar) this.aoMudar();
  }
  async encolhe() {
    this.travado = true; const novo = this.estagio - 1, cap = ESTAGIOS[novo].cap;
    // quem está fora do novo limite muda de mesa primeiro
    const mud = this.principais().filter((a) => a.posto && a.posto.slot >= cap).map((a) => this.muda(a, cap));
    await Promise.all(mud); await espera(.3);
    for (let i = cap; i < this.postos.length; i++) if (this.postos[i]) { this.postos[i].remover(); this.postos[i] = null; }
    this.tiraDecor(this.estagio); this.estagio = novo; await espera(.45);
    this.redimensiona(1.5); if (this.aoMudar) this.aoMudar(); await espera(1.5); this.travado = false; this.vazioT = 0;
  }
  slotLivre(cap = ESTAGIOS[this.estagio].cap) { for (let i = 0; i < cap; i++) { const p = this.postos[i]; if (!p || !p.ocupante) return i; } return -1; }
  garantePosto(i) {
    if (this.postos[i]) return this.postos[i];
    const p = this.postos[i] = new Posto(this, i); p.mobiliar(Math.max(0, (this.crescendoAte || 0) - this.t - .35) + (i === 0 && this.t < 1 ? 0 : 0)); return p;
  }

  // ---------- sincronização com a fonte de dados ----------
  // lista: [{ id, nome, tarefa, estado, desde, pai }]
  sync(lista) {
    const vistos = new Set();
    for (const d of lista) {
      vistos.add(d.id); let a = this.ags.get(d.id);
      if (a && a.saindo) continue;
      if (!a) { a = new Agente(this, d); this.ags.set(d.id, a); } else a.dados(d);
    }
    for (const a of this.ags.values()) if (!vistos.has(a.id) && !a.saindo) this.sai(a);
  }

  // ---------- movimento ----------
  async anda(a, pts, vel) {
    const r = a.robo; let total = 0, p0 = r.g.position.clone(); for (const p of pts) { total += p.distanceTo(p0); p0 = p; }
    vel = vel || clamp(total / 3.4, 1.7, 3.0); r.setEstado('andando'); r.altura = ALT_EM_PE;
    for (const p of pts) {
      const de = r.g.position.clone(), d = de.distanceTo(p); if (d < .02) continue;
      a.rumo = Math.atan2(p.x - de.x, p.z - de.z); r.vel = Math.min(vel, 2.3);
      await tween(d / vel, E.lin, (k) => { r.g.position.lerpVectors(de, p, k); });
      if (!a.vivo) return;
    }
    r.setEstado('parado');
  }
  // rota do corredor da porta até o ponto de aproximação do assento
  rota(de, ate) {
    const pts = []; const mesmaFila = Math.abs(de.z - ate.z) < .1;
    if (!mesmaFila) { if (Math.abs(de.x - CORREDOR_X) > .05) pts.push(V(CORREDOR_X, de.z)); pts.push(V(CORREDOR_X, ate.z)); }
    pts.push(ate.clone()); return pts;
  }
  async salto(r, de, ate, rot0, rot1, dur = .42, alt = .3) {
    await tween(dur, E.lin, (k) => { r.g.position.lerpVectors(de, ate, E.inOut(k)); r.g.position.y += Math.sin(Math.PI * k) * alt; r.g.rotation.y = lerp(rot0, rot1, E.inOut(k)); });
  }
  async senta(a) {
    const r = a.robo, p = a.posto, ap = r.g.position.clone();
    if (a.sub) {
      const ate = V(p.x, p.z0 + 2.4, .352); a.rumoLivre = true;
      r.setEstado('sentado'); await this.salto(r, ap, ate, r.g.rotation.y, 0, .4, .25);
      r.altura = .02; r.g.position.copy(ate); r.g.rotation.y = 0; this.poeira.sopro(V(ate.x, ate.z), 3, .15);
    } else {
      p.alvoCadeira('recebe'); await espera(.7); if (!a.vivo) return;
      const ate = V(p.x, p.z0 + 1.2 + .04, ASSENTO); a.rumoLivre = true;
      r.setEstado('sentado'); await this.salto(r, ap, ate, r.g.rotation.y, r.g.rotation.y - Math.PI, .46, .34);
      p.cadeira.add(r.g); r.g.position.set(0, ASSENTO, .04); r.g.rotation.y = 0; r.altura = .02;
      // a cadeira afunda um tico
      const cm = p.cadeira.children[0]; tween(.3, E.lin, (k) => { cm.scale.y = 1 - .07 * Math.sin(Math.PI * k); });
      await espera(.25);
    }
    if (!a.vivo) return;
    a.fase = 'sentado'; a.estado = null;
  }
  async levanta(a) {
    const r = a.robo, p = a.posto; a.fase = 'andando'; a.estado = null; this.balaoDe(a, null);
    p.monitor.setModo('off');
    if (!a.sub) { p.alvoCadeira('recebe'); await espera(.7); }
    const wp = new THREE.Vector3(); r.g.getWorldPosition(wp); this.cena.add(r.g); r.g.position.copy(wp); r.g.rotation.y = 0;
    a.rumoLivre = true; r.setEstado('parado'); r.altura = ALT_EM_PE;
    const ate = p.aprox(); await this.salto(r, wp, ate, 0, a.sub ? Math.PI : 0, .4, .25); r.g.position.copy(ate); a.rumo = r.g.rotation.y; a.rumoLivre = false;
    if (!a.sub) p.alvoCadeira('trabalhando');
  }
  async entra(a) {
    const r = a.robo; a.fase = 'entrando';
    await a.posto.pronto; if (!a.vivo) return;
    const espereAte = Math.max(this.proxEntrada, this.t); this.proxEntrada = espereAte + .9; if (espereAte > this.t) await espera(espereAte - this.t);
    this.cena.add(r.g); r.g.position.set(CORREDOR_X, 0, -.8); r.g.rotation.y = a.rumo = 0; const e = r.escala;
    await tween(.3, E.outBack, (k) => r.g.scale.setScalar(Math.max(.001, e * k)));
    this.portaUso++; await espera(.38); a.visivel = true;
    await this.anda(a, [V(CORREDOR_X, .95)]); setTimeout(() => this.portaUso--, 250);
    if (!a.vivo) return;
    await this.anda(a, this.rota(V(CORREDOR_X, 1.9), a.posto.aprox()));
    if (!a.vivo) return;
    a.rumo = a.sub ? 0 : Math.PI; await espera(.12);
    await this.senta(a);
  }
  async sai(a) {
    if (a.saindo) return; a.saindo = true;
    // subagentes saem junto com o pai
    if (!a.sub) for (const s of this.ags.values()) if (s.sub && s.pai === a.id) this.sai(s);
    if (a.fase === 'fila' || !a.posto) { a.vivo = false; a.some(); this.ags.delete(a.id); return; }
    for (let i = 0; i < 400 && a.fase !== 'sentado'; i++) await espera(.1);   // se ainda está chegando, senta antes de sair
    if (!a.sub) for (let i = 0; i < 100 && a.posto.subs.some((x) => x); i++) await espera(.1);
    const p = a.posto;
    await this.levanta(a);
    if (a.sub) { p.pai.subs[p.idx] = null; a.posto = null; p.remover(); this.redimensiona(1.2); } else p.ocupante = null;
    await this.anda(a, [...this.rota(p.aprox(), V(CORREDOR_X, 1.9)), V(CORREDOR_X, .95)]);
    this.portaUso++; await espera(.3);
    await this.anda(a, [V(CORREDOR_X, -.8)]);
    const e = a.robo.escala; await tween(.22, E.in2, (k) => a.robo.g.scale.setScalar(Math.max(.001, e * (1 - k))));
    this.portaUso--; a.vivo = false; a.some(); this.ags.delete(a.id);
  }
  async muda(a, cap) {
    for (let i = 0; i < 100 && a.fase !== 'sentado'; i++) await espera(.1);
    const s = this.slotLivre(cap); if (s < 0) return;
    const velho = a.posto, novo = this.garantePosto(s); novo.ocupante = a;
    await this.levanta(a); velho.ocupante = null; a.posto = novo; await novo.pronto;
    await this.anda(a, this.rota(velho.aprox(), novo.aprox())); a.rumo = Math.PI; await espera(.12);
    await this.senta(a);
  }

  // ---------- estado, balões e etiquetas ----------
  balaoDe(a, tipo) {
    const b = a.balao; if (a._balao === tipo) return; a._balao = tipo;
    b.classList.remove('on', 'q', 'ok'); if (!tipo) return;
    const d = b.firstChild;
    if (tipo === 'pensando') d.innerHTML = '<em></em><em></em><em></em>';
    else if (tipo === 'esperando') { d.textContent = '?'; b.classList.add('q'); }
    else { d.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 10.5l3.8 3.8L15.5 6"/></svg>'; b.classList.add('ok'); }
    requestAnimationFrame(() => b.classList.add('on'));
  }
  aplicaEstado(a) {
    const e = a.querEstado; a.estado = e; a.robo.setEstado(e); a.posto.monitor.setModo(e);
    if (!a.sub) a.posto.alvoCadeira(e);
    this.balaoDe(a, e === 'pensando' || e === 'esperando' || e === 'terminou' ? e : null);
    a.etq.dataset.e = e;
    if (e === 'terminou') { const wp = new THREE.Vector3(); a.robo.pesc.getWorldPosition(wp); wp.y += .3; this.poeira.confete(wp); }
  }

  update(dt, cam, larg, alt) {
    this.t += dt; const noite = this.luz.estado.noite;
    // fila: dá mesa a quem chegou
    if (!this.travado) {
      const pr = this.principais(), n = Math.min(12, pr.length);
      let quer = this.estagio; while (quer < 3 && n > ESTAGIOS[quer].cap) quer++;
      if (quer > this.estagio) this.cresce(quer);
      for (const a of this.ags.values()) {
        if (a.fase !== 'fila') continue;
        if (!a.sub) { const s = this.slotLivre(); if (s < 0) continue; a.posto = this.garantePosto(s); a.posto.ocupante = a; this.entra(a); }
        else {
          const pai = this.ags.get(a.pai); if (!pai || !pai.posto || pai.fase !== 'sentado') continue;
          const i = pai.posto.subs.indexOf(null); if (i < 0) continue;
          a.posto = pai.posto.subs[i] = new SubPosto(this, pai.posto, i); this.redimensiona(1.2); this.entra(a);
        }
      }
      // encolhe só quando sobra muito vazio por um tempo
      if (this.estagio > 0 && n <= Math.max(1, ESTAGIOS[this.estagio - 1].cap - 1) && ![...this.ags.values()].some((a) => a.fase === 'entrando' || a.saindo || a.fase === 'andando')) {
        this.vazioT += dt; if (this.vazioT > 4) this.encolhe();
      } else this.vazioT = 0;
    }
    this.sala.querAberta = this.portaUso > 0 ? 1 : 0;
    this.sala.update(dt); this.poeira.update(dt);
    for (const p of this.postos) if (p) { p.update(dt, noite); for (const s of p.subs) if (s) s.update(dt); }
    if (this.postos[0] && this.postos[0].relogio) this.postos[0].relogio.update(this.agora ? this.agora() : new Date());

    const wp = this._wp || (this._wp = new THREE.Vector3()), agora = Date.now();
    for (const a of this.ags.values()) {
      const r = a.robo;
      if (a.fase === 'sentado' && a.estado !== a.querEstado) this.aplicaEstado(a);
      if (r.g.parent) {
        if (!a.rumoLivre && r.estado === 'andando') r.g.rotation.y = amortAng(r.g.rotation.y, a.rumo, 11, dt);
        else if (!a.rumoLivre && a.fase !== 'sentado') r.g.rotation.y = amortAng(r.g.rotation.y, a.rumo, 9, dt);
        if (r.estado === 'andando') a.rumoLivre = false;
        r.update(dt);
      }
      // etiqueta e balão em coordenadas de tela
      const mostra = !!r.g.parent && a.visivel && !a.saindo;
      a.etq.classList.toggle('on', mostra);
      if (!r.g.parent) continue;
      r.pesc.getWorldPosition(wp); wp.y += .47 * r.escala; wp.project(cam);
      const sx = (wp.x * .5 + .5) * larg, sy = (-wp.y * .5 + .5) * alt;
      a.etq.style.transform = `translate(${sx.toFixed(1)}px, ${(sy - (a._balao ? (a.sub ? 30 : 40) : 0)).toFixed(1)}px) translate(-50%, -100%)`;
      a.balao.style.transform = `translate(${sx.toFixed(1)}px, ${(sy - 2).toFixed(1)}px)`;
      const txt = `${a.nome}|${a.tarefa}|${idade(agora - a.desde)}|${a.extra}`;
      if (txt !== a._txt) { a._txt = txt; const k = a.etq.children; k[1].textContent = a.nome; k[2].textContent = a.tarefa ? ' ' + a.tarefa : ''; k[3].textContent = idade(agora - a.desde) + (a.extra ? ' · ' + a.extra : ''); }
    }
  }

  limites() { const a = this.alvo(); return { W: a.W, D: a.D, H }; }
}
