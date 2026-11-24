// Escritório dos agentes: montagem da cena, câmera, pós-processamento e laço principal.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { Luz } from './luz.js';
import { carregaAcervo } from './moveis.js';
import { Escritorio, ESTAGIOS } from './escritorio.js';
import { Demo, Real } from './dados.js';
import { ligaPrompt } from './prompt.js';
import { passoAnims, amort, clamp } from './util.js';

const Q = new URLSearchParams(location.search);
// modo leve é o padrão (a cena completa travou a placa de vídeo); ?q=alta liga tudo
const ALTA = globalThis.__ALTA = Q.get('q') === 'alta';
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(ALTA ? Math.min(devicePixelRatio, 2) : 1);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = ALTA ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const cena = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(20, 1, 1, 300);
const luz = new Luz(cena, renderer);

// ---------- pós ----------
const comp = new EffectComposer(renderer);
comp.addPass(new RenderPass(cena, cam));
const gtao = new GTAOPass(cena, cam, 2, 2);
gtao.updateGtaoMaterial({ radius: .5, distanceExponent: 1.4, thickness: 1.3, scale: 1.25, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
gtao.blendIntensity = .95;
// brilhos, vidros e partículas não entram na oclusão
const escondidos = [];
const ov = gtao.overrideVisibility.bind(gtao), rv = gtao.restoreVisibility.bind(gtao);
gtao.overrideVisibility = () => { ov(); cena.traverseVisible((o) => { if (o.userData.semAO) { o.visible = false; escondidos.push(o); } }); };
gtao.restoreVisibility = () => { rv(); for (const o of escondidos) o.visible = true; escondidos.length = 0; };
if (ALTA) comp.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(2, 2), .28, .55, 1.0); if (ALTA) comp.addPass(bloom);
comp.addPass(new OutputPass());
const smaa = new SMAAPass(2, 2); if (ALTA) comp.addPass(smaa);

// ---------- câmera: enquadra a sala, órbita suave e respiração ----------
const AZ = [.74, .66, .7, .6], EL = [.52, .5, .56, .56];
const rig = { az: AZ[0], el: EL[0], alvo: new THREE.Vector3(-1.8, 1.1, 1.5), dist: 30, uAz: 0, uEl: 0, uZoom: 1, pAz: 0, pEl: 0, mx: 0, my: 0, manual: null, t: 0 };
const _d = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(), _v = new THREE.Vector3(), CIMA = new THREE.Vector3(0, 1, 0);
function enquadra(lim, az, el, aspecto) {
  _d.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
  const f = _d.clone().negate(); _r.crossVectors(f, CIMA).normalize(); _u.crossVectors(_r, f);
  const x0 = -lim.W - .3, x1 = .15, y0 = -.2, y1 = lim.H + .45, z0 = -.25, z1 = lim.D + .1, c = new THREE.Vector3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const pts = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) { _v.set(x, y, z).sub(c); pts.push([_v.dot(_r), _v.dot(_u), _v.dot(f)]); }
  let a = Infinity, b = -Infinity, e = Infinity, g = -Infinity; for (const p of pts) { a = Math.min(a, p[0]); b = Math.max(b, p[0]); e = Math.min(e, p[1]); g = Math.max(g, p[1]); }
  const mx = (a + b) / 2, my = (e + g) / 2, tv = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)), th = tv * aspecto;
  const estreito = aspecto < 1, mh = estreito ? .94 : .8, mv = estreito ? .7 : .8;
  let dist = 0; for (const p of pts) dist = Math.max(dist, Math.abs(p[0] - mx) / (th * mh) - p[2], Math.abs(p[1] - my) / (tv * mv) - p[2]);
  return { alvo: c.addScaledVector(_r, mx).addScaledVector(_u, my + (estreito ? 0 : -.02 * dist * tv)), dist };
}
let meta = null, metaChave = '';
function atualizaCam(dt, duro) {
  rig.t += dt;
  const lim = esc.limites(), aspecto = innerWidth / innerHeight, chave = `${lim.W}|${lim.D}|${aspecto.toFixed(3)}|${esc.estagio}`;
  if (chave !== metaChave) { metaChave = chave; meta = enquadra(lim, AZ[esc.estagio], EL[esc.estagio], aspecto); meta.az = AZ[esc.estagio]; meta.el = EL[esc.estagio]; }
  const m = rig.manual || meta, k = duro ? 1 : 1 - Math.exp(-dt * (rig.manual ? 3 : 1.9));
  rig.alvo.lerp(m.alvo, k); rig.dist += (m.dist - rig.dist) * k; rig.az += (m.az - rig.az) * k; rig.el += (m.el - rig.el) * k;
  rig.pAz = amort(rig.pAz, rig.mx * -.05, 3, dt); rig.pEl = amort(rig.pEl, rig.my * .025, 3, dt);
  const az = rig.az + rig.uAz + rig.pAz + Math.sin(rig.t * .23) * .012, el = clamp(rig.el + rig.uEl + rig.pEl + Math.sin(rig.t * .31) * .006, .12, 1.35);
  const dist = rig.dist * rig.uZoom * (1 + Math.sin(rig.t * .17) * .006);
  cam.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(rig.alvo);
  cam.lookAt(rig.alvo); cam.near = Math.max(1, dist - 40); cam.far = dist + 60; cam.updateProjectionMatrix();
}
let arrasta = null;
canvas.addEventListener('pointerdown', (e) => { arrasta = { x: e.clientX, y: e.clientY, az: rig.uAz, el: rig.uEl }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('arrasta'); });
canvas.addEventListener('pointermove', (e) => {
  rig.mx = (e.clientX / innerWidth) * 2 - 1; rig.my = (e.clientY / innerHeight) * 2 - 1;
  if (arrasta) { rig.uAz = clamp(arrasta.az - (e.clientX - arrasta.x) * .004, -.75, .75); rig.uEl = clamp(arrasta.el + (e.clientY - arrasta.y) * .003, -.3, .5); }
});
const solta = () => { arrasta = null; canvas.classList.remove('arrasta'); };
canvas.addEventListener('pointerup', solta); canvas.addEventListener('pointercancel', solta);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); rig.uZoom = clamp(rig.uZoom * Math.exp(e.deltaY * .001), .45, 1.5); }, { passive: false });
canvas.addEventListener('dblclick', () => { rig.uAz = rig.uEl = 0; rig.uZoom = 1; });

function redimensiona() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); comp.setSize(w, h);
  cam.aspect = w / h; cam.updateProjectionMatrix();
}
addEventListener('resize', redimensiona);

// ---------- montagem ----------
await carregaAcervo();
const esc = new Escritorio(cena, luz);
esc.postos[0] = esc.garantePosto(0);
const $ = (id) => document.getElementById(id);
const aviso = (txt, ms = 6000) => { const a = $('aviso'); a.textContent = txt; a.classList.add('on'); clearTimeout(aviso.t); aviso.t = setTimeout(() => a.classList.remove('on'), ms); };

let demo = null, real = null;
function ligaDemo() {
  demo = new Demo(esc, Q.get('auto') === '1');
  $('modo').classList.remove('real'); $('modo').lastElementChild.textContent = demo.auto ? 'demo · roteiro' : 'demo';
  if (demo.auto || Q.get('limpo') === '1') { $('painel').classList.add('gravando'); $('modo').classList.add('gravando'); }
  if (Q.get('n')) demo.define(+Q.get('n'));
}
if (Q.get('real') === '1') {
  real = new Real(esc, aviso, ligaDemo);
  $('modo').classList.add('real'); $('modo').lastElementChild.textContent = 'real · sessões do Claude Code'; $('painel').style.display = 'none';
  real.comeca().then((ok) => { if (!ok) { real = null; $('painel').style.display = ''; } });
} else ligaDemo();

ligaPrompt(() => demo, aviso);
esc.aoMudar = () => { $('estagio').textContent = ESTAGIOS[esc.estagio].nome; };

const horaForcada = Q.has('hora') ? parseFloat(Q.get('hora')) : null;
const horaAgora = () => { if (api.hora != null) return api.hora; const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
const api = window.__esc = { pronto: false, esc, rig, luz, cena, cam, renderer, hora: horaForcada, get demo() { return demo; }, vel: 1, gtao, bloom, quadros: 0 };

redimensiona(); luz.setHora(horaAgora()); atualizaCam(0, true);
const relogio = new THREE.Clock(); let parado = false, lentos = 0, acum = 0, contaTela = -1, pedido = 0;
function quadro() {
  pedido = 0;
  if (parado || document.hidden) return;
  pedido = requestAnimationFrame(quadro);
  let bruto = relogio.getDelta();
  // trava de segurança: três quadros seguidos acima de 1 s com a aba visível param a cena
  if (!document.hidden && bruto > 1 && api.quadros > 2) { if (++lentos >= 3) { parado = true; aviso('Cena pausada: a placa de vídeo não deu conta. Recarregue para tentar de novo.', 600000); return; } } else lentos = 0;
  if (!ALTA) { acum += bruto; if (acum < 1 / 31) return; bruto = acum; acum = 0; }   // modo leve: 30 quadros por segundo
  const dt = Math.min(.05, bruto) * api.vel;
  passoAnims(dt); if (demo) demo.update(dt);
  luz.setHora(horaAgora());
  atualizaCam(dt);
  esc.update(dt, cam, innerWidth, innerHeight);
  const nAg = esc.principais().length; if (nAg !== contaTela) $('conta').textContent = contaTela = nAg;
  renderer.shadowMap.needsUpdate = ALTA || api.quadros % 2 === 0;   // modo leve: sombra recalculada a cada dois quadros
  comp.render(dt); api.quadros++;
}
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(pedido); relogio.stop(); acum = 0; lentos = 0;
  if (!document.hidden && !parado) { relogio.start(); pedido = requestAnimationFrame(quadro); }
});
quadro();
$('carga').classList.add('fora'); api.pronto = true;
