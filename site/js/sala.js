// A sala em corte: laje, tábuas (instanciadas, recortadas pelo limite da sala), duas paredes, rodapé e porta.
// Sistema de coordenadas: parede do fundo em z=0 (vai de x=0 até x=-W), parede lateral em x=-W (desliza), frente aberta em z=D.
import * as THREE from 'three';
import { PAL, E, mat, tela, texCanvas, semente, clamp } from './util.js';

export const H = 2.6, ESP = .16;          // altura e espessura das paredes
export const PORTA = { x0: -1.05, x1: -.15, h: 2.02 };
const WMAX = 19.8, DMAX = 7.8;

function geoParede(h, r = .05) {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0, h - r); s.absarc(r, h - r, r, Math.PI, Math.PI / 2, true);
  s.lineTo(ESP - r, h); s.absarc(ESP - r, h - r, r, Math.PI / 2, 0, true); s.lineTo(ESP, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: 5 });
  // face interna (x = ESP) na cor da parede; topo e costas na cor de fora
  const p = g.attributes.position, c = new Float32Array(p.count * 3), a = new THREE.Color(PAL.parede), b = new THREE.Color(PAL.paredeFora);
  for (let i = 0; i < p.count; i++) { const k = p.getX(i) > ESP - 1e-4 ? a : b; c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

export class Sala {
  constructor(scene) {
    this.g = new THREE.Group(); scene.add(this.g);
    this.W = 3.6; this.D = 3.0;
    this.recX = new THREE.Plane(new THREE.Vector3(1, 0, 0), this.W);
    this.recZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), this.D);

    const mPar = [mat(PAL.paredeFora, .9), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .93 })];
    const gP = geoParede(H);
    const pega = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // parede do fundo: trecho fixo à direita da porta, verga e trecho comprido que estica
    const fundo = (geo) => { const m = pega(new THREE.Mesh(geo, mPar)); m.rotation.y = -Math.PI / 2; m.position.z = -ESP; this.g.add(m); return m; };
    const pA = fundo(gP); pA.position.x = 0; pA.scale.z = -PORTA.x1;
    const gV = geoParede(H - PORTA.h); const pB = fundo(gV); pB.position.set(PORTA.x1, PORTA.h, -ESP); pB.scale.z = PORTA.x1 - PORTA.x0;
    this.fundoC = fundo(gP); this.fundoC.position.x = PORTA.x0;

    // parede lateral (grupo que desliza em x)
    this.lateral = new THREE.Group(); this.g.add(this.lateral);
    this.latM = pega(new THREE.Mesh(gP, mPar)); this.latM.position.x = -ESP; this.lateral.add(this.latM);

    // rodapés
    const mRod = mat(PAL.rodape, .6), gRod = new THREE.BoxGeometry(1, .09, .018);
    this.rodF = pega(new THREE.Mesh(gRod, mRod)); this.g.add(this.rodF);
    const rodA = pega(new THREE.Mesh(gRod, mRod)); rodA.scale.x = -PORTA.x1; rodA.position.set(PORTA.x1 / 2, .045, .009); this.g.add(rodA);
    this.rodL = pega(new THREE.Mesh(gRod, mRod)); this.rodL.rotation.y = Math.PI / 2; this.lateral.add(this.rodL);

    // laje
    this.laje = pega(new THREE.Mesh(new THREE.BoxGeometry(1, .15, 1), mat(PAL.laje, .7))); this.laje.castShadow = false; this.g.add(this.laje);
    // sombra de contato embaixo do diorama
    const tS = texCanvas(tela(256, 256, (g) => {
      const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
      gr.addColorStop(0, 'rgba(60,30,40,.5)'); gr.addColorStop(.6, 'rgba(60,30,40,.22)'); gr.addColorStop(1, 'rgba(60,30,40,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }));
    this.sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tS, transparent: true, depthWrite: false, toneMapped: false }));
    this.sombra.rotation.x = -Math.PI / 2; this.sombra.position.y = -.17; this.sombra.userData.semAO = true; this.g.add(this.sombra);

    this.fazTabuas();
    this.fazPorta(pega);
    this.aplica();
    this.encaixa();
  }

  fazTabuas() {
    const rnd = semente(11), larg = .19, folga = .004, lista = [];
    for (let z = 0; z < DMAX; z += larg) {
      let x = -rnd() * 1.2;
      while (x < WMAX) { const L = .9 + rnd() * 1.3, x0 = Math.max(0, x), x1 = Math.min(WMAX, x + L); if (x1 - x0 > .02) lista.push({ x0, x1, z0: z, z1: z + larg, k: 0, on: 0, at: 0 }); x += L; }
    }
    this.tabuas = lista;
    const grao = texCanvas(tela(512, 64, (g, w, h) => {
      g.fillStyle = '#f4f0ea'; g.fillRect(0, 0, w, h);
      const r = semente(3);
      for (let i = 0; i < 90; i++) {
        const y = r() * h, e = r(); g.strokeStyle = e > .5 ? `rgba(120,70,30,${.05 + r() * .1})` : `rgba(255,250,240,${.1 + r() * .12})`; g.lineWidth = .5 + r() * 1.6;
        g.beginPath(); g.moveTo(0, y); const a = (r() - .5) * 6; g.bezierCurveTo(w * .3, y + a, w * .6, y - a, w, y + (r() - .5) * 3); g.stroke();
      }
    }));
    grao.wrapS = grao.wrapT = THREE.RepeatWrapping;
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grao, roughness: .62, clippingPlanes: [this.recX, this.recZ], clipShadows: true });
    m.onBeforeCompile = (s) => {
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aUv;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vMapUv * vec2(aUv.z, 1.0) + aUv.xy;\n#endif');
    };
    const geo = new THREE.BoxGeometry(1, .014, 1);
    const n = lista.length, im = this.pranchas = new THREE.InstancedMesh(geo, m, n);
    const aUv = new Float32Array(n * 3), cor = new THREE.Color(), base = new THREE.Color(PAL.carvalho), hsl = {};
    base.getHSL(hsl);
    lista.forEach((t, i) => {
      aUv[i * 3] = rnd(); aUv[i * 3 + 1] = rnd(); aUv[i * 3 + 2] = (t.x1 - t.x0) / 2.4;
      cor.setHSL(hsl.h + (rnd() - .5) * .018, hsl.s * (.88 + rnd() * .2), hsl.l * (.88 + rnd() * .22)); im.setColorAt(i, cor);
      t.folga = folga;
    });
    geo.setAttribute('aUv', new THREE.InstancedBufferAttribute(aUv, 3));
    im.receiveShadow = true; im.frustumCulled = false; this.g.add(im);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
  }

  fazPorta(pega) {
    const mB = mat(PAL.rodape, .55), g = this.g, lx = PORTA.x1 - PORTA.x0, cx = (PORTA.x0 + PORTA.x1) / 2;
    const guarn = (w, h, x, y) => { const m = pega(new THREE.Mesh(new THREE.BoxGeometry(w, h, .03), mB)); m.position.set(x, y, .012); g.add(m); };
    guarn(.06, PORTA.h + .03, PORTA.x0 - .03, (PORTA.h + .03) / 2); guarn(.06, PORTA.h + .03, PORTA.x1 + .03, (PORTA.h + .03) / 2); guarn(lx + .12, .06, cx, PORTA.h + .03);
    // folha
    this.folha = new THREE.Group(); this.folha.position.set(PORTA.x0 + .01, 0, -.05); g.add(this.folha);
    const f = pega(new THREE.Mesh(new THREE.BoxGeometry(lx - .02, PORTA.h - .02, .045), mat(0xe7c9a4, .6))); f.position.set((lx - .02) / 2, PORTA.h / 2, 0); this.folha.add(f);
    const almofada = (y, h) => { const a = new THREE.Mesh(new THREE.BoxGeometry(lx - .26, h, .012), mat(0xdcb98f, .6)); a.position.set((lx - .02) / 2, y, .025); a.receiveShadow = true; this.folha.add(a); };
    almofada(1.42, .82); almofada(.52, .66);
    const mac = pega(new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .12, 10), mat(PAL.escuro, .35, { metalness: .6 }))); mac.rotation.z = Math.PI / 2; mac.position.set(lx - .16, 1.02, .05); this.folha.add(mac);
    // patamar do lado de fora e capacho
    const pat = pega(new THREE.Mesh(new THREE.BoxGeometry(1.3, .15, 1.0), mat(PAL.laje, .7))); pat.position.set(cx, -.089, -ESP - .5); g.add(pat);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.7, .012, .4), mat(0x8b6a58, .95)); cap.position.set(cx, .006, .32); cap.receiveShadow = true; g.add(cap);
    this.aberta = 0; this.querAberta = 0;
  }

  // posiciona tudo conforme W e D atuais
  aplica() {
    const W = this.W, D = this.D;
    this.recX.constant = W; this.recZ.constant = D;
    this.fundoC.scale.z = W + ESP + PORTA.x0;
    this.lateral.position.x = -W; this.latM.scale.z = D;
    this.rodF.scale.x = W + PORTA.x0; this.rodF.position.set(PORTA.x0 - (W + PORTA.x0) / 2, .045, .009);
    this.rodL.scale.x = D; this.rodL.position.set(.009, .045, D / 2);
    this.laje.scale.set(W + ESP, 1, D + ESP); this.laje.position.set(-(W + ESP) / 2, -.089, (D - ESP) / 2);
    this.sombra.scale.set((W + D) * 1.5, (W + D) * 1.5, 1); this.sombra.position.set(-W / 2, -.17, D / 2);
  }

  // todas as tábuas dentro do limite aparecem na hora (estado inicial)
  encaixa() { for (const t of this.tabuas) { t.on = t.x0 < this.W && t.z0 < this.D ? 1 : 0; t.k = t.on; t.at = 0; } this.escreve(true); }

  escreve(tudo) {
    const im = this.pranchas, m = this._m, q = this._q, p = this._p, s = this._s; let mudou = false;
    this.tabuas.forEach((t, i) => {
      if (!tudo && !t.suja) return; t.suja = false; mudou = true;
      const e = t.k <= 0 ? 0 : E.outBack(t.k), L = t.x1 - t.x0 - t.folga, Z = t.z1 - t.z0 - t.folga;
      p.set(-(t.x0 + t.x1) / 2, -.007 + (1 - t.k) * (1 - t.k) * .45, (t.z0 + t.z1) / 2);
      s.set(L * (t.k <= 0 ? 0 : .75 + .25 * e), t.k <= 0 ? 0 : 1, Z * (t.k <= 0 ? 0 : e));
      m.compose(p, q, s); im.setMatrixAt(i, m);
    });
    if (mudou) im.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    // tábuas acompanham o limite: as que entram na sala caem no lugar, com um atraso aleatório
    const W = this.W, D = this.D;
    for (const t of this.tabuas) {
      const quer = t.x0 < W - .02 && t.z0 < D - .02 ? 1 : 0;
      if (quer !== t.on) { t.on = quer; t.at = quer ? Math.random() * .28 : 0; }
      if (t.k !== t.on) {
        if (t.at > 0) { t.at -= dt; continue; }
        t.k = clamp(t.k + (t.on ? dt / .42 : -dt / .18), 0, 1); t.suja = true;
      }
    }
    this.escreve(false);
    if (this.aberta !== this.querAberta) {
      this.aberta = clamp(this.aberta + Math.sign(this.querAberta - this.aberta) * dt / .45, 0, 1);
      this.folha.rotation.y = -1.75 * E.inOut(this.aberta);
    }
  }
}
