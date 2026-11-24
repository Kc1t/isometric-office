// Colmeia: cada agente ganha um quarto em cubo. Vistos em isométrico exato, os cubos se encaixam como favos e a colmeia cresce em espiral.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as Mv from './moveis.js';
import { Robo } from './robo.js';
import { Demo, Real } from './dados.js';
import { ligaPrompt } from './prompt.js';
import { fundeEstatico, Lotes } from './malhas.js';
import { DECORACOES, PAREDE, LETREIRO, TAMANHO_SALA } from './decoracao.js';
import { anim, tween, passoAnims, E, clamp, lerp, amort, amortAng, semente, tela, texCanvas, mat } from './util.js';

const Q = new URLSearchParams(location.search);
const ALTA = Q.get('q') === 'alta';
const S = TAMANHO_SALA, T = .1, MESA = .74, ASSENTO = .47, DX = -1.5, MAX = 19, SUBS_POR_SALA = 2;

// ---------- grade em favo ----------
// coordenadas axiais (q, r) em espiral a partir do centro; todo quarto fica no plano x+y+z = constante,
// por isso nenhum cobre o outro e os hexágonos projetados encostam sem sobra
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const CELAS = [[0, 0]];
for (let k = 1; CELAS.length < MAX; k++) {
  let q = DIRS[4][0] * k, r = DIRS[4][1] * k;
  for (let i = 0; i < 6; i++) for (let j = 0; j < k; j++) { CELAS.push([q, r]); q += DIRS[i][0]; r += DIRS[i][1]; }
}
const posCela = (i) => new THREE.Vector3(CELAS[i][0] * S, CELAS[i][1] * S, -(CELAS[i][0] + CELAS[i][1]) * S);

const PALETA = [
  { par: 0xf3e6d8, piso: 0xc98a52, neon: '#ffffff', borda: '#5b5470' },
  { par: 0xf2a08e, piso: 0x7a4a3a, neon: '#ff4f7a', borda: '#2b6f8a' },
  { par: 0xcfc4f2, piso: 0x39508f, neon: '#ff86d6', borda: '#7a2f6a' },
  { par: 0xbfe0b4, piso: 0xb9a58c, neon: '#3d6bff', borda: '#b0302a' },
  { par: 0xf3b3d6, piso: 0xa85a3c, neon: '#a57bff', borda: '#3a2a7a' },
  { par: 0xf6c9a4, piso: 0x5a3a34, neon: '#ff3b30', borda: '#5a1210' },
  { par: 0xbcd9f2, piso: 0x8a6a52, neon: '#ffb347', borda: '#7a4a10' },
];

// ---------- cena ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(ALTA ? Math.min(devicePixelRatio, 2) : 1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = ALTA ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

const cena = new THREE.Scene();
// As matrizes são atualizadas uma vez antes dos lotes, etiquetas e renderização.
cena.matrixWorldAutoUpdate = false;
const lotes = new Lotes(cena, MAX * (1 + SUBS_POR_SALA));
const movel = (nome) => lotes.adiciona(Mv.novo(nome));
const fundoCv = tela(8, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#120e2a'); gr.addColorStop(.6, '#1a1238'); gr.addColorStop(1, '#3a1d63');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
});
cena.background = texCanvas(fundoCv);
const pm = new THREE.PMREMGenerator(renderer);
cena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; cena.environmentIntensity = .32;
cena.add(new THREE.HemisphereLight(0xd8d0ff, 0x4a3566, .95));
// luz principal quase na direção da câmera: a sombra de cada quarto cai dentro dele mesmo
const DIR_LUZ = new THREE.Vector3(1, 1.7, .72).normalize();
const sol = new THREE.DirectionalLight(0xffe6cc, 2.3); sol.castShadow = true;
sol.shadow.mapSize.setScalar(ALTA ? 4096 : 2048); sol.shadow.bias = -0.0004; sol.shadow.normalBias = .02;
cena.add(sol, sol.target);
const rosa = new THREE.DirectionalLight(0xff5fa8, .55); rosa.position.set(-6, 3, 8); cena.add(rosa);

const DIR_CAM = new THREE.Vector3(1, 1, 1).normalize();
const DIREITA = new THREE.Vector3(1, 0, -1).normalize(), CIMA = new THREE.Vector3(-1, 2, -1).normalize();
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 160);
const rig = { cx: 0, cy: 0, hh: 4, panX: 0, panY: 0, zoom: 1 };

// ---------- animações de peça ----------
function cair(o, atraso = 0, alt = 2.4) {
  const y0 = o.position.y, s0 = o.scale.clone(); o.visible = false;
  return new Promise((res) => anim({ delay: atraso, dur: .7, update: (_, k) => {
    o.visible = true; let y, sq = 0;
    if (k < .6) { const u = k / .6; y = alt * (1 - u * u); } else { const v = (k - .6) / .4; y = .07 * Math.sin(Math.PI * v); sq = .2 * (1 - v) * (1 - v); }
    o.position.y = y0 + y; o.scale.set(s0.x * (1 + sq * .5), s0.y * (1 - sq), s0.z * (1 + sq * .5));
  }, done: () => { o.position.y = y0; o.scale.copy(s0); res(); } }));
}
function brotar(o, atraso = 0) {
  const s0 = o.scale.clone(); o.visible = false;
  return tween(.45, E.outBack, (k) => { o.visible = true; o.scale.copy(s0).multiplyScalar(Math.max(.001, k)); }, atraso);
}
function sumir(o, dur = .3) {
  const s0 = o.scale.clone();
  return tween(dur, E.in2, (k) => o.scale.copy(s0).multiplyScalar(Math.max(.001, 1 - k))).then(() => {
    o.parent && o.parent.remove(o);
    o.traverse((m) => { if (m.userData.fundida) m.geometry.dispose(); });
  });
}

const CAIXA = new THREE.BoxGeometry(1, 1, 1);

// ---------- quarto ----------
class Sala {
  constructor(idx) {
    this.idx = idx; this.pal = PALETA[idx % PALETA.length]; this.decoracao = DECORACOES[idx % DECORACOES.length]; this.ocupante = null; this.subs = Array(SUBS_POR_SALA).fill(null); this.vivo = true;
    this.g = new THREE.Group(); this.g.position.copy(posCela(idx)); cena.add(this.g);
    this.cad = { rot: Math.PI, z: .95, rotAlvo: Math.PI, zAlvo: .95 }; this.luzK = 0;
    const rnd = this.rnd = semente(300 + idx * 13), mPar = mat(this.pal.par, .92), mPiso = mat(this.pal.piso, this.decoracao.carpete ? 1 : .7);
    // casca: piso e duas paredes (a espessura fica para fora do cubo)
    const piso = new THREE.Mesh(CAIXA, mPiso); piso.scale.set(S + T, T, S + T); piso.position.set(-(S + T) / 2, -T / 2, (S - T) / 2 + T / 2); piso.receiveShadow = true;
    const pd = new THREE.Mesh(CAIXA, mPar); pd.scale.set(S + T, S, T); pd.position.set(-(S + T) / 2, S / 2, -T / 2); pd.receiveShadow = true;   // parede do fundo (z = 0)
    const pe = new THREE.Mesh(CAIXA, mPar); pe.scale.set(T, S, S); pe.position.set(-S - T / 2, S / 2, S / 2); pe.receiveShadow = true;             // parede lateral (x = -S)
    this.g.add(piso, pd, pe);
    piso.scale.set(.001, T, .001);
    tween(.5, E.outBack, (k) => piso.scale.set(Math.max(.001, (S + T) * k), T, Math.max(.001, (S + T) * k)));
    for (const [p, d] of [[pd, .18], [pe, .3]]) { p.visible = false; tween(.55, E.outBack, (k) => { p.visible = true; p.scale.y = Math.max(.001, S * k); p.position.y = S / 2 * k; }, d); }
    this.pronto = this.mobiliar(.55);
  }

  mobiliar(atraso) {
    const g = this.g, rnd = this.rnd, v = this.idx % 4, decor = this.decoracao, ps = [];
    const poe = (o, x, y, z, d, tipo = 'cai', ry) => { o.position.set(x, y, z); if (ry != null) o.rotation.y = ry; g.add(o); ps.push(tipo === 'cai' ? cair(o, atraso + d) : brotar(o, atraso + d)); return o; };
    if (decor.tapete) { const t = decor.tapete; poe(Mv.tapete(t.w, t.d, rnd), DX, 0, t.z, 0, 'cai', t.rot); }
    poe(movel('mesa'), DX, 0, .45, .08);
    poe(movel('torre'), DX + 1.0, 0, .3, .18);
    this.cadeira = new THREE.Group(); this.cadeira.add(movel('cadeira')); poe(this.cadeira, DX, 0, .95, .3, 'cai', Math.PI);
    this.monitor = Mv.monitor(); poe(this.monitor.g, DX, MESA, .27, .44);
    poe(movel('teclado'), DX, MESA, .6, .52); poe(Mv.mouse(), DX + .34, MESA, .62, .56);
    if (v === 0) { poe(movel('caixa-som'), DX - .6, MESA, .3, .62, 'cai', .35); poe(fundeEstatico(Mv.caneca()), DX - .4, MESA, .64, .7); }
    else if (v === 1) { poe(fundeEstatico(Mv.vasinho(rnd)), DX - .58, MESA, .28, .62); poe(movel('caixa-som'), DX + .58, MESA, .3, .68, 'cai', -.3); }
    else if (v === 2) { poe(fundeEstatico(Mv.caneca(Mv.MATS.creme)), DX + .5, MESA, .56, .62); poe(fundeEstatico(Mv.vasinho(rnd, Mv.MATS.terracota)), DX - .6, MESA, .3, .7); }
    else { poe(fundeEstatico(Mv.livros(3, rnd, true)), DX - .55, MESA, .32, .62, 'cai', .2); poe(fundeEstatico(Mv.caneca(Mv.MATS.salvia)), DX + .52, MESA, .5, .7); }
    // parede do fundo: brilho do monitor e prateleira ou quadros
    const b = this.brilho = Mv.brilho(0xff9448, 1.9, 1.2); b.position.set(DX, 1.12, .006); b.material.opacity = 0; g.add(b);
    const naParede = (o, p, d) => {
      const fundo = p.parede === PAREDE.FUNDO;
      return poe(o, fundo ? p.centro : -S, p.y, fundo ? 0 : p.centro, d, 'brota', fundo ? 0 : Math.PI / 2);
    };
    if (decor.prateleira) { const p = decor.prateleira; naParede(fundeEstatico(Mv.prateleira(1.25, rnd, p.variante)), p, .4); }
    decor.quadros.forEach((q, i) => naParede(fundeEstatico(Mv.quadro(rnd, q.w, q.h)), q, .46 + i * .08));
    if (decor.luminaria) poe(fundeEstatico(Mv.luminariaChao()), -S + .42, 0, .42, .6);
    else { const pl = movel('planta'); pl.scale.setScalar(.8); poe(pl, -S + .5, 0, .5, .6, 'cai', rnd() * 6); }
    // letreiro com o nome do agente
    this.letCv = tela(768, 192);
    this.letreiro = new THREE.Mesh(new THREE.PlaneGeometry(LETREIRO.largura, LETREIRO.altura), new THREE.MeshBasicMaterial({ map: texCanvas(this.letCv), transparent: true, depthWrite: false, toneMapped: false }));
    this.letreiro.position.set(-S / 2, S - LETREIRO.margemTopo, .012); this.letreiro.visible = false; g.add(this.letreiro);
    return Promise.all(ps);
  }

  nome(txt) {
    if (txt === this._nome) return; this._nome = txt;
    const c = this.letCv.getContext('2d'), W = 768, H = 192; c.clearRect(0, 0, W, H);
    if (!txt) { tween(.25, E.in2, (k) => { this.letreiro.material.opacity = 1 - k; }).then(() => { if (!this._nome) this.letreiro.visible = false; }); return; }
    const t = txt.toUpperCase().slice(0, 14);
    let px = 130; c.textAlign = 'center'; c.textBaseline = 'middle';
    const fonte = () => { c.font = `800 ${px}px "Avenir Next Condensed", "Arial Narrow", "Helvetica Neue", Arial, sans-serif`; };
    fonte(); while (c.measureText(t).width > W - 60 && px > 40) { px -= 6; fonte(); }
    c.fillStyle = this.pal.borda; for (let i = 7; i >= 1; i--) c.fillText(t, W / 2 + i, H / 2 + i + 4);   // volume do letreiro
    c.shadowColor = this.pal.neon; c.shadowBlur = 26; c.fillStyle = this.pal.neon; c.fillText(t, W / 2, H / 2 + 4);
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.22)'; c.fillText(t, W / 2, H / 2 + 4);
    this.letreiro.material.map.needsUpdate = true; this.letreiro.visible = true;
    tween(.4, E.out2, (k) => { this.letreiro.material.opacity = k; });
  }

  alvoCadeira(e) {
    const c = this.cad;
    if (e === 'trabalhando') { c.rotAlvo = Math.PI; c.zAlvo = .95; }
    else if (e === 'pensando') { c.rotAlvo = Math.PI - .85; c.zAlvo = 1.06; }
    else if (e === 'ocioso') { c.rotAlvo = 1.5; c.zAlvo = 1.2; }
    else { c.rotAlvo = .78; c.zAlvo = 1.22; }
  }

  // cantinho de subagente: banquinho, mesinha e monitor pequeno na frente do quarto
  canto(i) {
    const g = new THREE.Group(), x = DX + (i ? .7 : -.7); g.position.set(x, 0, 0); this.g.add(g);
    const poe = (o, y, z, d) => { o.position.set(0, y, z); g.add(o); cair(o, d); return o; };
    poe(fundeEstatico(Mv.banquinho()), 0, 1.95, 0); poe(fundeEstatico(Mv.mesinha()), 0, 2.33, .1);
    const mon = Mv.monitor(.46); mon.g.rotation.y = Math.PI; poe(mon.g, .515, 2.41, .28);
    const tc = movel('teclado'); tc.scale.setScalar(.62); tc.rotation.y = Math.PI; poe(tc, .515, 2.21, .34);
    return { g, monitor: mon, x };
  }

  limpa() { this.ocupante = null; this.nome(''); this.monitor.setModo('off'); this.alvoCadeira('trabalhando'); }
  some() { this.vivo = false; sumir(this.g, .35); }

  update(dt) {
    if (!this.cadeira) return;
    const c = this.cad; c.rot = amortAng(c.rot, c.rotAlvo, 5, dt); c.z = amort(c.z, c.zAlvo, 5, dt);
    this.cadeira.rotation.y = c.rot; this.cadeira.position.z = c.z;
    this.monitor.update(dt);
    this.luzK = amort(this.luzK, this.monitor.brilho > .1 ? 1 : .15, 4, dt);
    this.brilho.material.opacity = this.luzK * .7;
    for (const s of this.subs) if (s) s.monitor.update(dt);
  }
}

// ---------- agentes ----------
const camada = document.getElementById('camada');
class Agente {
  constructor(d) {
    this.id = d.id; this.pai = d.pai || null; this.sub = !!d.pai; this.robo = new Robo(this.sub ? .7 : 1);
    this.fase = 'fila'; this.vivo = true; this.estado = null; this.sala = null; this.saindo = false; this._txt = '';
    this.etq = document.createElement('div'); this.etq.className = 'etq' + (this.sub ? ' sub' : ''); this.etq.innerHTML = '<i></i><b></b><u style="text-decoration:none"></u><span></span>'; camada.appendChild(this.etq);
    this.balao = document.createElement('div'); this.balao.className = 'balao' + (this.sub ? ' sub' : ''); this.balao.innerHTML = '<div></div>'; camada.appendChild(this.balao);
    this.dados(d);
  }
  dados(d) { this.nome = d.nome; this.tarefa = d.tarefa || ''; this.desde = d.desde || Date.now(); this.extra = d.extra || ''; this.querEstado = d.estado || this.querEstado || 'trabalhando'; }
  some() { this.etq.remove(); this.balao.remove(); const g = this.robo.g; g.parent && g.parent.remove(g); }
}
const idade = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); if (s < 60) return s + ' s'; const m = Math.floor(s / 60); if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };

class Colmeia {
  constructor() { this.ags = new Map(); this.salas = []; this.salas[0] = new Sala(0); this.sujo = true; this.sombraSuja = true; this.quantidade = 0; }
  principais() { return [...this.ags.values()].filter((a) => !a.sub && !a.saindo); }
  nSalas() { let n = 0; for (const s of this.salas) if (s && s.vivo) n++; return n; }

  // lista: [{ id, nome, tarefa, estado, desde, pai, extra }]
  sync(lista) {
    this.sombraSuja = true; this.quantidade = lista.filter((a) => !a.pai).length;
    const vistos = new Set();
    for (const d of lista) {
      vistos.add(d.id); let a = this.ags.get(d.id);
      if (a && a.saindo) continue;
      if (!a) { a = new Agente(d); this.ags.set(d.id, a); } else a.dados(d);
    }
    for (const a of this.ags.values()) if (!vistos.has(a.id) && !a.saindo) this.sai(a);
  }

  celaLivre() { for (let i = 0; i < MAX; i++) { const s = this.salas[i]; if (!s || (s.vivo && !s.ocupante)) return i; } return -1; }

  async entra(a) {
    const r = a.robo, s = a.sala; a.fase = 'entrando';
    await s.pronto; if (!a.vivo || a.saindo) return;
    if (a.sub) {
      const c = s.subs[a.canto]; s.g.add(r.g); r.g.position.set(c.x, .352, 1.95); r.g.rotation.y = 0;
    } else { s.cadeira.add(r.g); r.g.position.set(0, ASSENTO, .04); r.g.rotation.y = 0; s.nome(a.nome); }
    r.setEstado('sentado'); r.altura = .02; r.g.scale.setScalar(.001);
    await tween(.45, E.outBack, (k) => r.g.scale.setScalar(Math.max(.001, r.escala * k)));
    a.visivel = true; a.fase = 'sentado'; a.estado = null;
  }

  async sai(a) {
    if (a.saindo) return; a.saindo = true; a.vivo = false; this.balaoDe(a, null);
    if (!a.sub) for (const s of this.ags.values()) if (s.sub && s.pai === a.id) this.sai(s);
    const s = a.sala;
    if (s) {
      if (a.fase === 'sentado') await tween(.28, E.in2, (k) => a.robo.g.scale.setScalar(Math.max(.001, a.robo.escala * (1 - k))));
      if (a.sub) { const c = s.subs[a.canto]; s.subs[a.canto] = null; if (c && s.vivo) sumir(c.g); }
      else if (s.idx === 0) s.limpa();
      else { s.ocupante = null; s.some(); this.salas[s.idx] = null; this.sujo = true; }
    }
    a.some(); this.ags.delete(a.id);
  }

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
    const e = a.querEstado; a.estado = e; a.robo.setEstado(e);
    if (a.sub) { const c = a.sala.subs[a.canto]; if (c) c.monitor.setModo(e); } else { a.sala.monitor.setModo(e); a.sala.alvoCadeira(e); }
    this.balaoDe(a, e === 'pensando' || e === 'esperando' || e === 'terminou' ? e : null);
    a.etq.dataset.e = e;
  }

  update(dt) {
    for (const a of this.ags.values()) {
      if (a.fase !== 'fila' || a.saindo) continue;
      if (!a.sub) {
        const i = this.celaLivre(); if (i < 0) continue;
        a.sala = this.salas[i] || (this.salas[i] = new Sala(i)); a.sala.ocupante = a; this.sujo = true; this.entra(a);
      } else {
        const pai = this.ags.get(a.pai); if (!pai || !pai.sala || pai.fase !== 'sentado') continue;
        const i = pai.sala.subs.indexOf(null); if (i < 0) continue;
        a.sala = pai.sala; a.canto = i; pai.sala.subs[i] = pai.sala.canto(i); this.entra(a);
      }
    }
    for (const s of this.salas) if (s && s.vivo) s.update(dt);
    for (const a of this.ags.values()) {
      if (a.fase === 'sentado' && !a.saindo && a.estado !== a.querEstado) this.aplicaEstado(a);
      if (a.fase === 'sentado' && !a.sub && a.sala) a.sala.nome(a.nome);
      if (a.robo.g.parent) a.robo.update(dt);
    }
  }

  etiquetas(larg, alt) {
    const wp = this._wp || (this._wp = new THREE.Vector3()), agora = Date.now();
    for (const a of this.ags.values()) {
      const r = a.robo;
      const mostra = !!r.g.parent && a.visivel && !a.saindo;
      if (mostra !== a._mostra) { a._mostra = mostra; a.etq.classList.toggle('on', mostra); }
      if (!r.g.parent) continue;
      r.pesc.getWorldPosition(wp); wp.y += .47 * r.escala; wp.project(cam);
      const sx = (wp.x * .5 + .5) * larg, sy = (-wp.y * .5 + .5) * alt;
      let pos;
      if (a.sub) pos = `translate(${sx.toFixed(1)}px, ${(sy - (a._balao ? 30 : 0)).toFixed(1)}px) translate(-50%, -100%)`;
      else {
        wp.copy(a.sala.g.position); wp.x -= .12; wp.z += S - .12; wp.y += .02; wp.project(cam);
        pos = `translate(${((wp.x * .5 + .5) * larg).toFixed(1)}px, ${((-wp.y * .5 + .5) * alt).toFixed(1)}px) translate(-50%, -135%)`;
      }
      if (pos !== a._pos) { a._pos = pos; a.etq.style.transform = pos; }
      const balao = `translate(${sx.toFixed(1)}px, ${(sy - 2).toFixed(1)}px)`;
      if (a._balao && balao !== a._posBalao) { a._posBalao = balao; a.balao.style.transform = balao; }
      const txt = `${a.nome}|${a.tarefa}|${idade(agora - a.desde)}|${a.extra}`;
      if (txt !== a._txt) { a._txt = txt; a.etq.title = a.tarefa; const k = a.etq.children; k[1].textContent = a.sub ? a.nome : ''; k[2].textContent = a.tarefa ? (a.sub ? ' ' : '') + a.tarefa : ''; k[3].textContent = idade(agora - a.desde) + (a.extra ? ' · ' + a.extra : ''); }
    }
  }
}

// ---------- câmera isométrica: enquadra a colmeia e acompanha o crescimento ----------
const RAIO = S * Math.sqrt(2 / 3), MEIA = S * Math.SQRT1_2;
const meta = { cx: 0, cy: 0, hx: 1, hy: 1, centro: new THREE.Vector3(), raio: S };
function medeColmeia() {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; const cs = [], c = new THREE.Vector3();
  col.salas.forEach((s) => {
    if (!s || !s.vivo) return; const p = s.g.position.clone().add(new THREE.Vector3(-S / 2, S / 2, S / 2)); cs.push(p); c.add(p);
    const x = p.dot(DIREITA), y = p.dot(CIMA); x0 = Math.min(x0, x - MEIA); x1 = Math.max(x1, x + MEIA); y0 = Math.min(y0, y - RAIO); y1 = Math.max(y1, y + RAIO);
  });
  c.divideScalar(cs.length); meta.cx = (x0 + x1) / 2; meta.cy = (y0 + y1) / 2; meta.hx = (x1 - x0) / 2; meta.hy = (y1 - y0) / 2;
  meta.centro.copy(c); meta.raio = Math.max(...cs.map((p) => p.distanceTo(c))) + S * 1.1;
  // sombra: a câmera da luz cobre a colmeia inteira
  sol.target.position.copy(c); sol.position.copy(c).addScaledVector(DIR_LUZ, 60);
  const sc = sol.shadow.camera; sc.left = sc.bottom = -meta.raio; sc.right = sc.top = meta.raio; sc.near = 60 - meta.raio - 4; sc.far = 60 + meta.raio + 4; sc.updateProjectionMatrix();
}
const alvoCam = new THREE.Vector3();
function atualizaCam(dt, duro) {
  const aspecto = innerWidth / innerHeight, estreito = aspecto < 1;
  const hh = Math.max(meta.hy / (estreito ? .56 : .64), meta.hx / (estreito ? .92 : .8) / aspecto), k = duro ? 1 : 1 - Math.exp(-dt * 2.2);
  rig.cx += (meta.cx - rig.cx) * k; rig.cy += (meta.cy + hh * (estreito ? -.2 : -.17) - rig.cy) * k; rig.hh += (hh - rig.hh) * k;
  const h = rig.hh * rig.zoom, alvo = alvoCam.set(0, 0, 0).addScaledVector(DIREITA, rig.cx + rig.panX).addScaledVector(CIMA, rig.cy + rig.panY);
  cam.position.copy(alvo).addScaledVector(DIR_CAM, 70); cam.up.set(0, 1, 0); cam.lookAt(alvo);
  cam.left = -h * aspecto; cam.right = h * aspecto; cam.top = h; cam.bottom = -h; cam.updateProjectionMatrix();
}
let arrasta = null;
canvas.addEventListener('pointerdown', (e) => { arrasta = { x: e.clientX, y: e.clientY, px: rig.panX, py: rig.panY }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('arrasta'); });
canvas.addEventListener('pointermove', (e) => { if (!arrasta) return; const u = 2 * rig.hh * rig.zoom / innerHeight; rig.panX = arrasta.px - (e.clientX - arrasta.x) * u; rig.panY = arrasta.py + (e.clientY - arrasta.y) * u; });
const solta = () => { arrasta = null; canvas.classList.remove('arrasta'); };
canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', solta);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom = clamp(rig.zoom * Math.exp(e.deltaY * .001), .35, 1.6); }, { passive: false });
canvas.addEventListener('dblclick', () => { rig.panX = rig.panY = 0; rig.zoom = 1; });
function redimensiona() { renderer.setSize(innerWidth, innerHeight, false); }
addEventListener('resize', redimensiona);

// ---------- montagem ----------
await Mv.carregaAcervo();
const col = new Colmeia();
const $ = (id) => document.getElementById(id);
const aviso = (txt, ms = 6000) => { const a = $('aviso'); a.textContent = txt; a.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('on'), ms); };

let demo = null, real = null;
function ligaDemo() {
  demo = new Demo(col, Q.get('auto') === '1');
  $('modo').classList.remove('real'); $('modo').lastElementChild.textContent = demo.auto ? 'demo · roteiro' : 'demo';
  if (demo.auto || Q.get('limpo') === '1') { $('painel').classList.add('gravando'); $('modo').classList.add('gravando'); }
  if (Q.get('n')) demo.define(+Q.get('n'));
}
if (Q.get('real') === '1') {
  real = new Real(col, aviso, ligaDemo);
  $('modo').classList.add('real'); $('modo').lastElementChild.textContent = 'real · sessões do Claude Code'; $('painel').style.display = 'none';
  real.comeca().then((ok) => { if (!ok) { real = null; $('painel').style.display = ''; } });
} else ligaDemo();
ligaPrompt(() => demo, aviso);

const api = window.__esc = { pronto: false, col, rig, cena, cam, renderer, vel: 1, quadros: 0, get demo() { return demo; } };
redimensiona(); medeColmeia(); atualizaCam(0, true);
const relogio = new THREE.Clock(); let parado = false, lentos = 0, acum = 0, conta = -1, salas = -1, pedido = 0;
function quadro() {
  pedido = 0;
  if (parado || document.hidden) return;
  pedido = requestAnimationFrame(quadro);
  let bruto = relogio.getDelta();
  // trava de segurança: três quadros seguidos acima de 1 s com a aba visível param a cena
  if (!document.hidden && bruto > 1 && api.quadros > 2) { if (++lentos >= 3) { parado = true; aviso('Cena pausada: a placa de vídeo não deu conta. Recarregue para tentar de novo.', 600000); return; } } else lentos = 0;
  if (!ALTA) { acum += bruto; if (acum < 1 / 31) return; bruto = acum; acum = 0; }   // modo leve: 30 quadros por segundo
  const dt = Math.min(.05, bruto) * api.vel;
  const animando = passoAnims(dt); if (demo) demo.update(dt);
  col.update(dt);
  if (col.sujo) { col.sujo = false; medeColmeia(); }
  atualizaCam(dt); cam.updateMatrixWorld(); cena.updateMatrixWorld();
  const moveisMudaram = lotes.update();
  col.etiquetas(innerWidth, innerHeight);
  const n = col.quantidade, ns = col.nSalas();
  if (n !== conta) $('conta').textContent = conta = n;
  if (ns !== salas) { salas = ns; $('estagio').textContent = ns === 1 ? '1 quarto' : ns + ' quartos'; }
  // Robôs têm movimento procedural contínuo; a sombra só pode parar quando o tempo ou a cena param.
  col.sombraSuja ||= moveisMudaram || animando || (dt > 0 && col.ags.size > 0);
  renderer.shadowMap.needsUpdate = col.sombraSuja && (ALTA || api.quadros % 2 === 0);
  if (renderer.shadowMap.needsUpdate) col.sombraSuja = false;
  renderer.render(cena, cam); api.quadros++;
}
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(pedido); relogio.stop(); acum = 0; lentos = 0;
  if (!document.hidden && !parado) { relogio.start(); pedido = requestAnimationFrame(quadro); }
});
quadro();
$('carga').classList.add('fora'); api.pronto = true;
