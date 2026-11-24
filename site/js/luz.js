// Luz: sol baixo com "gobo" (persiana + folhas), preenchimento frio fraco, fundo em degradê e hora do dia.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { tela, texCanvas, lerp, semente } from './util.js';

const C = (h) => new THREE.Color(h);
// quadros-chave por hora. sol: cor, força, elevação (graus). hemi: céu, chão, força. fundo: topo, base. exp: exposição. noite: 0..1
const CHAVES = [
  { h: 0,    sol: 0x8c9be0, f: .22, el: 40, ceu: 0x3b4690, chao: 0x2c2238, hf: .30, amb: .10, topo: 0x241f3a, base: 0x35294a, exp: 1.0, noite: 1 },
  { h: 5.2,  sol: 0x8c9be0, f: .22, el: 40, ceu: 0x3b4690, chao: 0x2c2238, hf: .30, amb: .10, topo: 0x241f3a, base: 0x35294a, exp: 1.0, noite: 1 },
  { h: 6.6,  sol: 0xffc7a0, f: 1.7, el: 14, ceu: 0xc9d4f2, chao: 0xe8c9b8, hf: .55, amb: .30, topo: 0xcfd3e6, base: 0xeed9d6, exp: .95, noite: .25 },
  { h: 9,    sol: 0xfff0dc, f: 2.5, el: 34, ceu: 0xdbe7ff, chao: 0xf1e2d2, hf: .85, amb: .55, topo: 0xdde6f1, base: 0xf1ece9, exp: .92, noite: 0 },
  { h: 13,   sol: 0xfff1df, f: 2.6, el: 44, ceu: 0xe2e9fb, chao: 0xf3e3d0, hf: .85, amb: .55, topo: 0xe3e3ee, base: 0xf2ebe8, exp: .92, noite: 0 },
  { h: 16.5, sol: 0xffc78c, f: 3.0, el: 27, ceu: 0xdccbe6, chao: 0xf6d2b4, hf: .62, amb: .42, topo: 0xd9c5d6, base: 0xecdde2, exp: .95, noite: 0 },
  { h: 18.2, sol: 0xffa565, f: 3.0, el: 17, ceu: 0xcdb6dc, chao: 0xf2bf9c, hf: .5,  amb: .34, topo: 0xcbb0c8, base: 0xe9cfd2, exp: 1.0, noite: .15 },
  { h: 19.3, sol: 0xff7a4a, f: 1.0, el: 8,  ceu: 0x8c7fc0, chao: 0x7a556a, hf: .38, amb: .2,  topo: 0x5b4a78, base: 0x9a6f86, exp: 1.0, noite: .7 },
  { h: 20.2, sol: 0x8c9be0, f: .22, el: 40, ceu: 0x3b4690, chao: 0x2c2238, hf: .30, amb: .10, topo: 0x241f3a, base: 0x35294a, exp: 1.0, noite: 1 },
  { h: 24,   sol: 0x8c9be0, f: .22, el: 40, ceu: 0x3b4690, chao: 0x2c2238, hf: .30, amb: .10, topo: 0x241f3a, base: 0x35294a, exp: 1.0, noite: 1 },
];

export class Luz {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer;
    this.estado = { noite: 0 };

    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = .3;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, .6); scene.add(this.hemi);

    // sol: spot muito distante (raios quase paralelos) porque só spot aceita textura projetada
    const sol = this.sol = new THREE.SpotLight(0xffffff, 3, 0, .2, .25, 0);
    this.alvo = new THREE.Vector3(-9.4, .6, 3.4);
    sol.target.position.copy(this.alvo); scene.add(sol, sol.target);
    sol.castShadow = true; sol.shadow.mapSize.setScalar(globalThis.__ALTA ? 4096 : 1024); sol.shadow.bias = -0.00012; sol.shadow.normalBias = .012;
    sol.shadow.camera.near = 40; sol.shadow.camera.far = 100;
    this.dist = 66; this.raio = 13.5;
    sol.angle = Math.atan(this.raio / this.dist);
    sol.shadow.camera.fov = THREE.MathUtils.radToDeg(sol.angle) * 2; sol.shadow.focus = 1;
    sol.map = this.gobo = this.fazGobo();

    // preenchimento frio, bem fraco, do lado oposto
    this.frio = new THREE.DirectionalLight(0xbcd0ff, .22); this.frio.position.set(-6, 5, 9); scene.add(this.frio);

    this.fundoCv = tela(8, 256);
    this.fundo = texCanvas(this.fundoCv); scene.background = this.fundo;
    this.hora = -1;
  }

  // persianas e folhas: janelas claras em grade sobre penumbra
  fazGobo() {
    const N = globalThis.__ALTA ? 2048 : 1024, mundo = this.raio * 2, px = N / mundo; // px por metro no plano do alvo
    const cv = tela(N, N, (g) => {
      g.fillStyle = 'rgb(86,86,86)'; g.fillRect(0, 0, N, N);
      const rnd = semente(7);
      const jw = 1.55 * px, jh = 2.15 * px, passoX = 2.3 * px, passoY = 3.4 * px;
      for (let iy = -1; iy < N / passoY + 1; iy++) for (let ix = -1; ix < N / passoX + 1; ix++) {
        const x = ix * passoX + (iy % 2 ? passoX * .5 : 0) + .1 * px, y = iy * passoY + .5 * px;
        g.fillStyle = '#fff'; g.fillRect(x, y, jw, jh);
        // lâminas da persiana
        g.fillStyle = 'rgb(70,70,70)';
        const lam = .105 * px;
        for (let ly = y + lam * .2; ly < y + jh; ly += lam) g.fillRect(x - 2, ly, jw + 4, lam * .42);
        // montante
        g.fillRect(x + jw * .5 - 3, y, 6, jh);
      }
      // folhas na frente de algumas janelas
      g.fillStyle = 'rgba(40,40,40,.9)';
      for (let i = 0; i < 46; i++) {
        const cx = rnd() * N, cy = rnd() * N, n = 5 + Math.floor(rnd() * 4), base = rnd() * 6.28;
        for (let k = 0; k < n; k++) {
          const a = base + (k / n - .5) * 2.4, L = (.5 + rnd() * .7) * px, wd = L * (.2 + rnd() * .14);
          g.save(); g.translate(cx, cy); g.rotate(a);
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(wd, -L * .3, wd, -L * .8, 0, -L); g.bezierCurveTo(-wd, -L * .8, -wd, -L * .3, 0, 0); g.fill();
          g.restore();
        }
      }
    });
    // desfoque aplicado uma única vez no desenho pronto (filtro em cada retângulo travava a máquina: milhares de desfoques)
    const macio = tela(N, N, (g) => { g.filter = `blur(${(N / 1024 * 1.6).toFixed(1)}px)`; g.drawImage(cv, 0, 0); g.filter = 'none'; });
    const t = texCanvas(macio); t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
  }

  amostra(h) {
    h = ((h % 24) + 24) % 24;
    let i = 0; while (i < CHAVES.length - 2 && CHAVES[i + 1].h <= h) i++;
    const a = CHAVES[i], b = CHAVES[i + 1], t = THREE.MathUtils.smoothstep((h - a.h) / (b.h - a.h), 0, 1);
    const cor = (k) => C(a[k]).lerp(C(b[k]), t), n = (k) => lerp(a[k], b[k], t);
    return { sol: cor('sol'), f: n('f'), el: n('el'), ceu: cor('ceu'), chao: cor('chao'), hf: n('hf'), amb: n('amb'), topo: cor('topo'), base: cor('base'), exp: n('exp'), noite: n('noite') };
  }

  setHora(h) {
    if (Math.abs(h - this.hora) < 1 / 240) return; this.hora = h;
    const s = this.amostra(h); this.estado = s;
    this.sol.color.copy(s.sol); this.sol.intensity = s.f;
    const el = THREE.MathUtils.degToRad(s.el), az = THREE.MathUtils.degToRad(34); // azimute medido de +z para +x
    const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sol.position.copy(this.alvo).addScaledVector(d, this.dist);
    this.hemi.color.copy(s.ceu); this.hemi.groundColor.copy(s.chao); this.hemi.intensity = s.hf;
    this.scene.environmentIntensity = s.amb;
    this.frio.intensity = lerp(.22, .08, s.noite);
    this.renderer.toneMappingExposure = s.exp;
    const g = this.fundoCv.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#' + s.topo.getHexString()); gr.addColorStop(1, '#' + s.base.getHexString());
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256); this.fundo.needsUpdate = true;
    document.body.style.background = '#' + s.base.getHexString();
  }
}
