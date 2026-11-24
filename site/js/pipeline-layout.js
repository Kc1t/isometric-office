// Coordenadas em u (direita da tela) e d (profundidade, para baixo na tela).
import { TIMES } from './pipeline-logica.js';
export const LAYOUT = { inicio: -19, fim: 19, passo: 7.5, primeiro: -15, amostras: 360, larguraFita: 2.3, alturaFita: .08, alturaIlha: .22, margemIlha: 3.4, larguraIlha: 6.4, profundidadeIlha: 4.8, rotacaoIlha: Math.PI / 4, espessuraIlha: .38, raioIlha: .65, alturaRotulo: .85 };
export const POSTOS = [[-1.48, -1.15], [1.48, -1.15], [-1.48, 1.15], [1.48, 1.15]];
export const ancoraTime = (i) => (LAYOUT.primeiro + i * LAYOUT.passo - LAYOUT.inicio) / (LAYOUT.fim - LAYOUT.inicio);
export function criaLayout(estreito, largura = 800, altura = 800) {
  const ilhaU = estreito ? 3.8 : Math.max(9, Math.min(18, 10.5 * largura / altura));
  const amplitude = estreito ? 1.05 : ilhaU * .34, rotuloU = amplitude + LAYOUT.larguraFita / 2 + .65;
  const fita = new Float32Array((LAYOUT.amostras + 1) * 3);
  for (let i = 0; i <= LAYOUT.amostras; i++) {
    const d = LAYOUT.inicio + (LAYOUT.fim - LAYOUT.inicio) * i / LAYOUT.amostras;
    const u = -amplitude * Math.cos((d - LAYOUT.primeiro) * Math.PI / LAYOUT.passo);
    fita[i * 3] = (u + d) * Math.SQRT1_2; fita[i * 3 + 1] = LAYOUT.alturaFita; fita[i * 3 + 2] = (d - u) * Math.SQRT1_2;
  }
  const times = Array.from({ length: TIMES.length }, (_, i) => {
    const lado = i % 2 ? -1 : 1, d = LAYOUT.primeiro + LAYOUT.passo * i;
    const u = lado * ilhaU, rotulo = -lado * rotuloU;
    return { lado, u, d, x: (u + d) * Math.SQRT1_2, z: (d - u) * Math.SQRT1_2,
      rotuloX: (rotulo + d) * Math.SQRT1_2, rotuloZ: (d - rotulo) * Math.SQRT1_2 };
  });
  return { fita, times, ilhaU, rotuloU, estreito };
}
export function enquadra(layout, largura, altura, alturaPainel) {
  const topo = altura < 620 ? 58 : 108, rodape = alturaPainel + 28;
  const maxY = 12, minY = -11.5, area = Math.max(100, altura - topo - rodape) * .8;
  const larguraRotulo = layout.estreito ? 112 : 176, aspecto = largura / altura;
  const hh = Math.max((maxY - minY) * altura / (2 * area), (layout.ilhaU + LAYOUT.margemIlha) / (aspecto - 24 / altura), layout.rotuloU / Math.max(.05, aspecto - 2 * (larguraRotulo + 12) / altura));
  return { hh, cy: (maxY + minY) / 2 + (topo - rodape) * hh / altura };
}
