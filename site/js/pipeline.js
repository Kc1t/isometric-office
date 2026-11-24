// Times em ilhas abertas, ligados pela mesma fita. A lógica não depende do renderer.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as Mv from './moveis.js';
import { Robo } from './robo.js';
import { instanciaRobo, geometriaIlha } from './pipeline-modelos.js';
import { Lotes, fundeEstatico } from './malhas.js';
import { mat, clamp, semente } from './util.js';
import { Pipeline, TIMES, LIMITES, ETAPAS } from './pipeline-logica.js';
import { LAYOUT, POSTOS, criaLayout, enquadra, ancoraTime } from './pipeline-layout.js';

const Q = new URLSearchParams(location.search), ALTA = Q.get('q') === 'alta';
const FPS = 30, INTERVALO_ROTULOS = .1, SETAS = 42, PASSOS_RETORNO = 48;
const ESCALA_POSTO = 1.05, TAMANHO_PACOTE = .26, ALTURA_PACOTE = .32;
const $ = (id) => document.getElementById(id), canvas = $('c'), camada = $('camada');
const aviso = (texto, ms = 6000) => {
  $('aviso').textContent = texto; $('aviso').classList.add('on'); clearTimeout(aviso.timer);
  aviso.timer = setTimeout(() => $('aviso').classList.remove('on'), ms);
};
const renderer = new THREE.WebGLRenderer({ canvas, antialias: ALTA, powerPreference: 'low-power' });
renderer.setPixelRatio(ALTA ? devicePixelRatio : 1);
renderer.shadowMap.enabled = true; renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.type = ALTA ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const cena = new THREE.Scene(); cena.background = new THREE.Color('#171032'); cena.matrixWorldAutoUpdate = false;
cena.add(new THREE.HemisphereLight(0xe3d9ff, 0x574466, 2));
const sol = new THREE.DirectionalLight(0xffedda, 2.5); sol.position.set(18, 32, 16); sol.castShadow = true;
sol.shadow.mapSize.setScalar(2048); sol.shadow.bias = -.0004; sol.shadow.normalBias = .025;
const sc = sol.shadow.camera; sc.left = sc.bottom = -27; sc.right = sc.top = 27; sc.near = 1; sc.far = 90;
sc.updateProjectionMatrix(); cena.add(sol, sol.target);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 160);
const DIREITA = new THREE.Vector3(1, 0, -1).normalize(), CIMA = new THREE.Vector3(-1, 2, -1).normalize();
const DIR_CAM = new THREE.Vector3(1, 1, 1).normalize(), alvoCam = new THREE.Vector3();
const rig = { hh: 24, cy: 0, panX: 0, panY: 0, zoom: 1 };
const PECAS_ESPELHADAS = 2;
const lotes = new Lotes(cena, TIMES.length * LIMITES.agentes * PECAS_ESPELHADAS);
const pipe = new Pipeline();
const api = window.__esc = { pronto: false, quadros: 0, renderer, cena, cam, vel: 1, pipe, rig };
let layout, cameraSuja = true, sombraSuja = true, revisao = -1, ultimoFim = -Infinity, entregues = 0;
const ilhas = [], visuais = [], matriz = new THREE.Object3D(), ponto = new THREE.Vector3(), origem = new THREE.Vector3(), destino = new THREE.Vector3();
const cor = new THREE.Color(), inicioRetorno = new THREE.Vector3(), fimRetorno = new THREE.Vector3();
function elemento(classe, texto = '') {
  const el = document.createElement('div'); el.className = classe; el.textContent = texto;
  if (window.CSSTranslate && window.CSSScale && el.attributeStyleMap) {
    el._movimento = new CSSTranslate(CSS.px(0), CSS.px(0)); el._alinhamento = new CSSTranslate(CSS.percent(-50), CSS.percent(-100)); el._escala = new CSSScale(CSS.number(1), CSS.number(1));
    el._transformacao = new CSSTransformValue([el._movimento, el._escala, el._alinhamento]);
  }
  camada.appendChild(el); return el;
}
function pontoFita(t, alvo) {
  const f = clamp(t, 0, 1) * LAYOUT.amostras, i = Math.min(LAYOUT.amostras - 1, Math.floor(f)), k = f - i, a = layout.fita;
  alvo.set(a[i * 3] + (a[i * 3 + 3] - a[i * 3]) * k, a[i * 3 + 1], a[i * 3 + 2] + (a[i * 3 + 5] - a[i * 3 + 2]) * k); return alvo;
}
function linha(pontos, material) {
  const o = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pontos), material); cena.add(o); return o;
}
const mLinha = new THREE.LineBasicMaterial({ color: '#8b7baf', transparent: true, opacity: .6 });
const mRetorno = new THREE.LineDashedMaterial({ color: TIMES[ETAPAS.revisao].cor, dashSize: .24, gapSize: .19, transparent: true, opacity: .65 });
const retorno = linha(Array.from({ length: PASSOS_RETORNO + 1 }, () => new THREE.Vector3()), mRetorno);
retorno.visible = false;
const entrada = elemento('ponta', 'ENTRADA'), saida = elemento('ponta', 'ENTREGUE'), volta = elemento('ponta', 'AJUSTAR ↶');
volta.hidden = true;
const placas = new THREE.InstancedMesh(geometriaIlha(), mat('#ffffff', .87), TIMES.length);
placas.receiveShadow = true; placas.castShadow = true;
for (let i = 0; i < TIMES.length; i++) placas.setColorAt(i, new THREE.Color(TIMES[i].cor).lerp(new THREE.Color('#fff5ed'), .56));
cena.add(placas);
const gPacote = new RoundedBoxGeometry(TAMANHO_PACOTE, TAMANHO_PACOTE, TAMANHO_PACOTE, 2, .045);
const pacotes = new THREE.InstancedMesh(gPacote, mat('#ffffff', .6), LIMITES.tarefas);
pacotes.castShadow = true; pacotes.receiveShadow = true; pacotes.frustumCulled = false;
pacotes.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cena.add(pacotes);
for (let i = 0; i < LIMITES.tarefas; i++) {
  matriz.scale.setScalar(0); matriz.updateMatrix(); pacotes.setMatrixAt(i, matriz.matrix); pacotes.setColorAt(i, cor.set('#ffffff'));
  const etiqueta = elemento('pacote'); etiqueta.hidden = true;
  visuais.push({ tarefa: null, etiqueta, pos: new THREE.Vector3() });
}
pacotes.instanceColor.setUsage(THREE.DynamicDrawUsage);
const gSeta = new THREE.BufferGeometry();
gSeta.setAttribute('position', new THREE.Float32BufferAttribute([-.12, 0, -.12, .12, 0, -.12, 0, 0, .15], 3));
gSeta.setIndex([0, 2, 1]); gSeta.computeVertexNormals();
const setas = new THREE.InstancedMesh(gSeta, new THREE.MeshBasicMaterial({ color: '#fff7ee', transparent: true, opacity: .62, side: THREE.DoubleSide }), SETAS);
const setasRetorno = new THREE.InstancedMesh(gSeta, new THREE.MeshBasicMaterial({ color: TIMES[ETAPAS.revisao].cor, side: THREE.DoubleSide }), 7);
setasRetorno.frustumCulled = false; setasRetorno.visible = false; setasRetorno.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cena.add(setasRetorno);
setas.frustumCulled = false; setas.instanceMatrix.setUsage(THREE.DynamicDrawUsage); cena.add(setas);
const anel = new THREE.Mesh(new THREE.TorusGeometry(.4, .016, 5, 32), new THREE.MeshBasicMaterial({ color: '#a2cb83', transparent: true }));
anel.rotation.x = -Math.PI / 2; anel.visible = false; cena.add(anel);
const fitas = [];
function geometriaFita(inicio, fim, largura) {
  const passos = 80, vertices = new Float32Array((passos + 1) * 6), indices = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i = 0; i <= passos; i++) {
    const t = inicio + (fim - inicio) * i / passos;
    pontoFita(t, a); pontoFita(Math.min(1, t + .001), b);
    if (t === 1) { pontoFita(t - .001, b); b.sub(a).negate(); } else b.sub(a);
    const tamanho = Math.hypot(b.x, b.z), nx = -b.z / tamanho * largura / 2, nz = b.x / tamanho * largura / 2;
    vertices.set([a.x + nx, a.y, a.z + nz, a.x - nx, a.y, a.z - nz], i * 6);
    if (i < passos) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}
function montaFita() {
  for (const f of fitas) { cena.remove(f); f.geometry.dispose(); f.material.dispose(); } fitas.length = 0;
  const base = new THREE.Mesh(geometriaFita(0, 1, LAYOUT.larguraFita + .18), mat('#403252', .9, { side: THREE.DoubleSide }));
  base.position.y = -.07; cena.add(base); fitas.push(base);
  for (let i = 0; i < TIMES.length; i++) {
    const inicio = i === 0 ? 0 : ancoraTime(i);
    const fim = i === TIMES.length - 1 ? 1 : ancoraTime(i + 1);
    const fita = new THREE.Mesh(geometriaFita(inicio, fim, LAYOUT.larguraFita), mat(TIMES[i].cor, .85, { side: THREE.DoubleSide }));
    fita.receiveShadow = true; cena.add(fita); fitas.push(fita);
  }
}

function poe(grupo, objeto, x, y, z, rot = 0) {
  objeto.position.set(x, y, z); objeto.rotation.y = rot; grupo.add(objeto); return objeto;
}
function montaIlhas() {
  const vaso = fundeEstatico(Mv.vasinho(semente(23))), mouse = Mv.mouse(), monitorBase = Mv.monitor();
  const geometriasMonitor = []; monitorBase.g.traverse((o) => { if (o.isMesh) geometriasMonitor.push(o.geometry); });
  for (let i = 0; i < TIMES.length; i++) {
    const g = new THREE.Group(); cena.add(g);
    const etiqueta = elemento('time'); etiqueta.style.setProperty('--cor', TIMES[i].cor);
    const h = document.createElement('h2'), numero = document.createElement('small'); numero.textContent = '0' + (i + 1);
    h.append(numero, TIMES[i].nome); const p = document.createElement('p'); p.textContent = TIMES[i].descricao;
    const contagem = document.createElement('output'); etiqueta.append(h, p, contagem);
    const conexao = linha([new THREE.Vector3(), new THREE.Vector3()], mLinha), postos = [];
    for (let j = 0; j < LIMITES.agentes; j++) {
      const grupo = new THREE.Group(); grupo.scale.setScalar(ESCALA_POSTO); grupo.position.set(POSTOS[j][0], 0, POSTOS[j][1]); g.add(grupo);
      poe(grupo, lotes.adiciona(Mv.novo('mesa')), 0, 0, -.25);
      poe(grupo, lotes.adiciona(Mv.novo('torre')), .87, 0, -.3);
      poe(grupo, lotes.adiciona(Mv.novo('cadeira')), 0, 0, .4, Math.PI);
      poe(grupo, lotes.adiciona(Mv.novo('teclado')), 0, .74, -.1);
      poe(grupo, lotes.adiciona(mouse), .34, .74, -.08);
      const monitor = Mv.monitor(); let k = 0;
      monitor.g.traverse((o) => { if (o.isMesh) o.geometry = geometriasMonitor[k++]; });
      monitor.led.material = monitorBase.led.material;
      monitor.g = lotes.adiciona(monitor.g); poe(grupo, monitor.g, 0, .74, -.54);
      const robo = instanciaRobo(new Robo(), lotes); robo.altura = .02;
      poe(grupo, robo.g, 0, .47, .36, Math.PI);
      const etq = elemento('agente'); etq.innerHTML = '<i></i><span></span>';
      const balao = elemento('balao'); balao.hidden = true;
      postos.push({ g: grupo, robo, monitor, etq, balao, agente: null, mesa: new THREE.Vector3(), cabeca: new THREE.Vector3(), rodape: new THREE.Vector3() });
    }
    poe(g, lotes.adiciona(vaso), -2.95, 0, -2.05);
    ilhas.push({ g, postos, etiqueta, contagem, conexao });
  }
}
function camera() {
  alvoCam.set(0, 0, 0).addScaledVector(DIREITA, rig.panX).addScaledVector(CIMA, rig.cy + rig.panY);
  cam.position.copy(alvoCam).addScaledVector(DIR_CAM, 70); cam.lookAt(alvoCam);
  const hh = rig.hh * rig.zoom, aspecto = innerWidth / innerHeight;
  cam.left = -hh * aspecto; cam.right = hh * aspecto; cam.top = hh; cam.bottom = -hh;
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(); cameraSuja = false;
  const larguraEtiqueta = Math.max(24, Math.min(104, (POSTOS[1][0] - POSTOS[0][0]) * innerHeight / (2 * hh) - 10));
  for (const ilha of ilhas) {
    ilha.etiqueta._zoom = Math.min(1, 1 / rig.zoom);
    for (const posto of ilha.postos) posto.etq.style.maxWidth = larguraEtiqueta.toFixed(1) + 'px';
  }
}
function redimensiona() {
  layout = criaLayout(innerWidth <= 640, innerWidth, innerHeight); renderer.setSize(innerWidth, innerHeight, false);
  const medida = enquadra(layout, innerWidth, innerHeight, $('painel').getBoundingClientRect().height);
  rig.hh = medida.hh; rig.cy = medida.cy; montaFita();
  for (let i = 0; i < ilhas.length; i++) {
    const ilha = ilhas[i], pos = layout.times[i]; ilha.g.position.set(pos.x, LAYOUT.alturaIlha, pos.z); ilha.g.rotation.y = LAYOUT.rotacaoIlha;
    matriz.position.set(pos.x, LAYOUT.alturaIlha - LAYOUT.espessuraIlha / 2, pos.z); matriz.rotation.set(0, LAYOUT.rotacaoIlha, 0); matriz.scale.setScalar(1); matriz.updateMatrix(); placas.setMatrixAt(i, matriz.matrix);
    ilha.etiqueta.classList.toggle('esquerda', pos.lado === 1);
    pontoFita(ancoraTime(i), ponto);
    const pontos = ilha.conexao.geometry.attributes.position;
    pontos.setXYZ(0, ponto.x, ponto.y + .01, ponto.z); pontos.setXYZ(1, pos.x, LAYOUT.alturaIlha, pos.z); pontos.needsUpdate = true;
    ilha.conexao.geometry.computeBoundingSphere();
  }
  placas.instanceMatrix.needsUpdate = true; placas.computeBoundingSphere();
  const pontos = retorno.geometry.attributes.position;
  for (let i = 0; i <= PASSOS_RETORNO; i++) {
    pontoRetorno(i / PASSOS_RETORNO, ponto); pontos.setXYZ(i, ponto.x, ponto.y - .12, ponto.z);
  }
  pontos.needsUpdate = true; retorno.computeLineDistances(); retorno.geometry.computeBoundingSphere();
  cameraSuja = sombraSuja = true;
}
function sincroniza() {
  if (revisao === pipe.revisao) return;
  revisao = pipe.revisao; sombraSuja = true;
  for (const visual of visuais) {
    if (!visual.tarefa) continue;
    visual.tarefa = pipe.tarefas.find((t) => t.id === visual.tarefa.id) || null;
    visual.etiqueta.hidden = !visual.tarefa || visual.tarefa.fase === 'mesa';
  }
  for (const tarefa of pipe.tarefas) {
    let visual = visuais.find((v) => v.tarefa?.id === tarefa.id);
    if (!visual) { visual = visuais.find((v) => !v.tarefa); visual.tarefa = tarefa; visual.etiqueta.textContent = tarefa.texto; visual.etiqueta.title = tarefa.texto; visual.etiqueta.hidden = false; }
    visual.etiqueta.hidden = tarefa.fase === 'mesa'; visual.etiqueta.style.color = TIMES[tarefa.time].cor;
  }
  for (let i = 0; i < ilhas.length; i++) {
    const ilha = ilhas[i], time = pipe.times[i];
    ilha.contagem.textContent = time.agentes.length + (time.agentes.length === 1 ? ' agente' : ' agentes') + ' · ' + time.fila.length + ' na fila';
    for (let j = 0; j < ilha.postos.length; j++) {
      const posto = ilha.postos[j], agente = time.agentes.find((a) => a.posto === j);
      posto.agente = agente || null; posto.g.visible = !!agente; posto.etq.hidden = !agente || agente.tarefa === null;
      if (!agente) { posto.balao.hidden = true; continue; }
      posto.robo.setEstado(agente.estado); posto.monitor.setModo(agente.estado);
      const tarefa = agente.tarefa === null ? null : pipe.tarefas.find((t) => t.id === agente.tarefa);
      const texto = tarefa ? tarefa.texto : ''; posto.etq.lastElementChild.textContent = texto;
      posto.etq.title = TIMES[i].nome + ' · agente ' + (j + 1) + ' · ' + agente.estado + ' · ' + texto;
      posto.etq.dataset.e = agente.estado;
      const e = agente.estado; posto.balao.hidden = e !== 'pensando' && e !== 'esperando' && e !== 'terminou';
      posto.balao.className = 'balao' + (e === 'terminou' ? ' ok' : e === 'esperando' ? ' espera' : '');
      posto.balao.textContent = e === 'terminou' ? '✓' : e === 'esperando' ? '?' : '···';
    }
  }
  if (pipe.entregues !== entregues) { entregues = pipe.entregues; ultimoFim = pipe.tempo; }
  $('conta').textContent = pipe.tarefas.length; $('estagio').textContent = pipe.entregues + ' entregues';
  $('modo').lastElementChild.textContent = pipe.auto ? 'demo · auto' : 'demo · manual';
}
function posicaoMesa(time, posto, alvo) { return alvo.copy(ilhas[time].postos[posto].mesa); }
function pontoRetorno(t, alvo) {
  const a = layout.times[ETAPAS.revisao], b = layout.times[ETAPAS.codigo], u = -(layout.ilhaU + 2.5) - Math.sin(t * Math.PI) * .7;
  const d = a.d + (b.d - a.d) * clamp((t - .15) / .7, 0, 1);
  alvo.set((u + d) * Math.SQRT1_2, ALTURA_PACOTE, (d - u) * Math.SQRT1_2);
  if (t < .15) { pontoFita(ancoraTime(ETAPAS.revisao), inicioRetorno); alvo.lerpVectors(inicioRetorno, alvo, t / .15); }
  if (t > .85) { pontoFita(ancoraTime(ETAPAS.codigo), fimRetorno); alvo.lerp(fimRetorno, (t - .85) / .15); }
  alvo.y = ALTURA_PACOTE; return alvo;
}
function posicaoTarefa(tarefa, alvo) {
  const i = tarefa.time, agora = pipe.tempo;
  if (tarefa.fase === 'mesa') {
    posicaoMesa(i, tarefa.agente, destino); pontoFita(ancoraTime(i), origem); origem.y = ALTURA_PACOTE;
    return alvo.lerpVectors(origem, destino, clamp((agora - tarefa.inicio) / .65, 0, 1));
  }
  if (tarefa.fase === 'fila') {
    const ordem = pipe.times[i].fila.indexOf(tarefa.id);
    pontoFita(ancoraTime(i) - .012 * (Math.floor(ordem / 3) + 1), alvo);
    alvo.addScaledVector(DIREITA, ((ordem % 3) - 1) * .32); alvo.y = ALTURA_PACOTE; return alvo;
  }
  const progresso = clamp((agora - tarefa.inicio) / (tarefa.chegaEm - tarefa.inicio), 0, 1);
  if (tarefa.de >= 0 && progresso < .2) {
    posicaoMesa(tarefa.de, tarefa.deAgente, origem); pontoFita(ancoraTime(tarefa.de), destino); destino.y = ALTURA_PACOTE;
    return alvo.lerpVectors(origem, destino, progresso / .2);
  }
  const t = tarefa.de < 0 ? progresso : (progresso - .2) / .8;
  if (tarefa.fase === 'saida') { pontoFita(ancoraTime(i) + (1 - ancoraTime(i)) * t, alvo); alvo.y = ALTURA_PACOTE; return alvo; }
  if (tarefa.de === -1) { pontoFita(ancoraTime(0) * t, alvo); alvo.y = ALTURA_PACOTE; return alvo; }
  // A devolução percorre a linha lateral, sem atravessar ilhas nem saltar de etapa.
  if (tarefa.de > tarefa.time) {
    return pontoRetorno(t, alvo);
  }
  pontoFita(ancoraTime(tarefa.de) + (ancoraTime(i) - ancoraTime(tarefa.de)) * t, alvo); alvo.y = ALTURA_PACOTE; return alvo;
}
function atualizaPacotes() {
  let devolvendo = false;
  matriz.rotation.set(0, 0, 0);
  for (let i = 0; i < visuais.length; i++) {
    const v = visuais[i], tarefa = v.tarefa;
    if (!tarefa) { matriz.scale.setScalar(0); matriz.updateMatrix(); pacotes.setMatrixAt(i, matriz.matrix); continue; }
    posicaoTarefa(tarefa, v.pos); matriz.position.copy(v.pos);
    const fim = tarefa.fase === 'saida' ? clamp((tarefa.chegaEm - pipe.tempo) / .55, 0, 1) : 1;
    matriz.scale.setScalar(fim); matriz.rotation.y = tarefa.fase === 'mesa' ? 0 : pipe.tempo * .35; matriz.updateMatrix();
    pacotes.setMatrixAt(i, matriz.matrix); pacotes.setColorAt(i, cor.set(TIMES[tarefa.time].cor));
    devolvendo ||= tarefa.fase === 'transito' && tarefa.de > tarefa.time;
  }
  pacotes.instanceMatrix.needsUpdate = true; pacotes.instanceColor.needsUpdate = true;
  retorno.visible = setasRetorno.visible = devolvendo; volta.hidden = !devolvendo;
  const t = (pipe.tempo - ultimoFim) / 1.2; anel.visible = t >= 0 && t < 1;
  if (anel.visible) { pontoFita(1, anel.position); anel.position.y += .03; anel.scale.setScalar(1 + t * 2); anel.material.opacity = (1 - t) * .6; }
}
function atualizaSetas() {
  matriz.scale.setScalar(1);
  for (let i = 0; i < SETAS; i++) {
    const t = (i / SETAS + pipe.tempo * .012) % 1;
    pontoFita(t, origem); pontoFita(Math.min(1, t + .001), destino);
    matriz.position.copy(origem); matriz.position.y += .016;
    matriz.rotation.set(0, Math.atan2(destino.x - origem.x, destino.z - origem.z), 0); matriz.updateMatrix(); setas.setMatrixAt(i, matriz.matrix);
  }
  setas.instanceMatrix.needsUpdate = true;
  if (!setasRetorno.visible) return;
  for (let i = 0; i < setasRetorno.count; i++) {
    const t = (i / setasRetorno.count + pipe.tempo * .12) % 1;
    pontoRetorno(t, ponto); pontoRetorno(Math.min(1, t + .001), destino);
    matriz.position.copy(ponto); matriz.position.y -= .09;
    matriz.rotation.set(0, Math.atan2(destino.x - ponto.x, destino.z - ponto.z), 0); matriz.updateMatrix(); setasRetorno.setMatrixAt(i, matriz.matrix);
  }
  setasRetorno.instanceMatrix.needsUpdate = true;
}
function posiciona(el, pos, alinhamento = 'centro', elevar = 0, centroVertical = false) {
  ponto.copy(pos); ponto.y += elevar; ponto.project(cam);
  const x = (ponto.x * .5 + .5) * innerWidth, y = (-ponto.y * .5 + .5) * innerHeight;
  const ax = alinhamento === 'esquerda' ? -100 : alinhamento === 'direita' ? 0 : -50, ay = centroVertical ? -50 : -100;
  if (el._transformacao) {
    el._movimento.x.value = x; el._movimento.y.value = y; el._escala.x = el._escala.y = el._zoom || 1; el._alinhamento.x.value = ax; el._alinhamento.y.value = ay;
    el.attributeStyleMap.set('transform', el._transformacao); return;
  }
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${el._zoom || 1}) translate(${ax}%, ${ay}%)`;
}
function etiquetas() {
  for (let i = 0; i < ilhas.length; i++) {
    const ilha = ilhas[i], pos = layout.times[i];
    origem.set(pos.rotuloX, LAYOUT.alturaRotulo, pos.rotuloZ); posiciona(ilha.etiqueta, origem, pos.lado === 1 ? 'esquerda' : 'direita', 0, true);
    for (const posto of ilha.postos) {
      if (!posto.agente) continue;
      if (!posto.etq.hidden) {
        posiciona(posto.etq, posto.rodape, 'centro', 0, true);
      }
      if (!posto.balao.hidden) posiciona(posto.balao, posto.cabeca, 'centro', .14);
    }
  }
  for (const v of visuais) if (v.tarefa && !v.etiqueta.hidden) posiciona(v.etiqueta, v.pos, 'centro', .24);
  pontoFita(0, origem); posiciona(entrada, origem, 'centro', .48);
  pontoFita(1, origem); posiciona(saida, origem, 'centro', -.55);
  const pos = retorno.geometry.attributes.position; origem.fromBufferAttribute(pos, PASSOS_RETORNO / 2); posiciona(volta, origem, 'esquerda', .3);
}

// Mesmos controles visuais do hive; comandos próprios, sem alterar seu controlador.
const campo = $('prompt');
function executa(acao) { try { const resultado = acao(); if (typeof resultado === 'string') aviso(resultado); return true; } catch (erro) { aviso(erro.message); return false; } }
$('painel').addEventListener('submit', (e) => {
  e.preventDefault(); if (executa(() => pipe.comando(campo.value))) { campo.value = ''; campo.focus(); }
});
$('mais').onclick = () => executa(() => pipe.exemplo()); $('menos').onclick = () => pipe.menos();
campo.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); campo.blur(); } if (e.isComposing && e.key === 'Enter') e.preventDefault(); });
const editando = (alvo) => alvo instanceof Element && !!alvo.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing || editando(e.target) || editando(document.activeElement)) return;
  if (e.key === '/') { e.preventDefault(); campo.focus(); }
  if (e.key === '+' || e.key === '=') executa(() => pipe.exemplo());
  if (e.key === '-' || e.key === '_') pipe.menos();
});
let arrasta = false, inicioX = 0, inicioY = 0, panX = 0, panY = 0;
canvas.addEventListener('pointerdown', (e) => {
  arrasta = true; inicioX = e.clientX; inicioY = e.clientY; panX = rig.panX; panY = rig.panY;
  canvas.setPointerCapture(e.pointerId); canvas.classList.add('arrasta');
});
canvas.addEventListener('pointermove', (e) => {
  if (!arrasta) return;
  const u = 2 * rig.hh * rig.zoom / innerHeight; rig.panX = panX - (e.clientX - inicioX) * u; rig.panY = panY + (e.clientY - inicioY) * u; cameraSuja = true;
});
const solta = () => { arrasta = false; canvas.classList.remove('arrasta'); };
canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', solta); canvas.addEventListener('lostpointercapture', solta);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.zoom = clamp(rig.zoom * Math.exp(e.deltaY * .001), .4, 2); cameraSuja = true; }, { passive: false });
canvas.addEventListener('dblclick', () => { rig.panX = rig.panY = 0; rig.zoom = 1; cameraSuja = true; });
addEventListener('resize', redimensiona);

try { await Mv.carregaAcervo(); } catch (erro) { $('carga').textContent = 'Não foi possível carregar os móveis. Recarregue a página.'; throw erro; }
montaIlhas(); redimensiona();
pipe.exemplo();
if (Q.get('auto') !== '0') pipe.comando('/auto');
const relogio = new THREE.Clock(); let parado = false, lentos = 0, acum = 0, desdeQuadro = 0, acumRotulos = INTERVALO_ROTULOS, pedido = 0;
function quadro() {
  pedido = 0; if (parado || document.hidden) return;
  pedido = requestAnimationFrame(quadro);
  const bruto = relogio.getDelta();
  if (bruto > 1 && api.quadros > 2) {
    if (++lentos >= 3) { parado = true; cancelAnimationFrame(pedido); aviso('Cena pausada: três quadros levaram mais de um segundo. Recarregue para tentar de novo.', 600000); return; }
  } else lentos = 0;
  acum += bruto; desdeQuadro += bruto; if (!ALTA && acum < 1 / FPS) return;
  const decorrido = desdeQuadro, dt = Math.min(.05, decorrido) * api.vel;
  acum = ALTA ? 0 : acum % (1 / FPS); desdeQuadro = 0;
  pipe.update(dt); sincroniza();
  for (const ilha of ilhas) for (const posto of ilha.postos) {
    if (!posto.agente || dt === 0) continue;
    posto.robo.update(dt); posto.monitor.update(dt);
  }
  const moveuCamera = cameraSuja; if (cameraSuja) camera();
  cena.updateMatrixWorld();
  for (const ilha of ilhas) for (const posto of ilha.postos) {
    posto.rodape.set(0, .08, 1).applyMatrix4(posto.g.matrixWorld);
    posto.mesa.set(.55, .94, -.18).applyMatrix4(posto.g.matrixWorld);
    posto.robo.pesc.getWorldPosition(posto.cabeca); posto.cabeca.y += .34 * ESCALA_POSTO;
  }
  const moveisMudaram = lotes.update(); atualizaPacotes(); atualizaSetas();
  // Pacotes e setas mudaram depois da atualização geral; só suas matrizes precisam acompanhar.
  anel.updateMatrixWorld();
  acumRotulos += Math.min(.1, decorrido);
  if (acumRotulos >= INTERVALO_ROTULOS || moveuCamera) { etiquetas(); acumRotulos = 0; }
  sombraSuja ||= moveisMudaram || dt > 0;
  renderer.shadowMap.needsUpdate = sombraSuja && (ALTA || api.quadros % 2 === 0);
  if (renderer.shadowMap.needsUpdate) sombraSuja = false;
  renderer.render(cena, cam); api.quadros++;
}
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(pedido); relogio.stop(); acum = desdeQuadro = 0; lentos = 0;
  if (!document.hidden && !parado) { relogio.start(); pedido = requestAnimationFrame(quadro); }
});
if (!document.hidden) quadro();
$('carga').classList.add('fora'); api.pronto = true;
