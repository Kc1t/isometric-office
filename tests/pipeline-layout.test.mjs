import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criaLayout, enquadra, ancoraTime, LAYOUT } from '../site/js/pipeline-layout.js';

const CENARIOS = [[390, 780, 126], [390, 600, 126], [1440, 900, 112], [800, 800, 126]];
test('os cinco times descem na tela e a fita chega a cada âncora sem saltos', () => {
  for (const estreito of [false, true]) {
    const layout = criaLayout(estreito);
    assert.equal(layout.times.length, 5);
    for (let i = 0; i < layout.times.length; i++) {
      const time = layout.times[i], f = ancoraTime(i) * LAYOUT.amostras, amostra = Math.floor(f), k = f - amostra;
      const d0 = (layout.fita[amostra * 3] + layout.fita[amostra * 3 + 2]) * Math.SQRT1_2;
      const d1 = (layout.fita[amostra * 3 + 3] + layout.fita[amostra * 3 + 5]) * Math.SQRT1_2;
      assert.ok(Math.abs(d0 + (d1 - d0) * k - time.d) < .001);
      if (i) assert.ok(time.d > layout.times[i - 1].d);
    }
    for (let i = 1; i <= LAYOUT.amostras; i++) assert.ok(Math.hypot(layout.fita[i * 3] - layout.fita[(i - 1) * 3], layout.fita[i * 3 + 2] - layout.fita[(i - 1) * 3 + 2]) < .4);
  }
});

test('o enquadramento ocupa 80% da altura útil e reserva espaço para rótulos e prompt', () => {
  for (const [largura, altura, painel] of CENARIOS) {
    const layout = criaLayout(largura <= 640, largura, altura), { hh, cy } = enquadra(layout, largura, altura, painel);
    const escala = altura / (2 * hh), topo = altura / 2 - (12 - cy) * escala, fim = altura / 2 - (-11.5 - cy) * escala;
    const topoUtil = altura < 620 ? 58 : 108, alturaUtil = altura - topoUtil - painel - 28;
    assert.ok(topo >= topoUtil); assert.ok(fim <= altura - painel - 28);
    assert.ok((fim - topo) / alturaUtil >= .79 && (fim - topo) / alturaUtil <= .81);
    assert.ok(largura / 2 - (layout.ilhaU + LAYOUT.margemIlha) * escala >= 12);
    assert.ok(largura / 2 - layout.rotuloU * escala - (layout.estreito ? 112 : 176) >= 12);
  }
});

test('os rótulos ficam fora da fita e não colidem com nenhuma ilha nem com outros rótulos', () => {
  const colidem = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  for (const [largura, altura, painel] of CENARIOS) {
    const layout = criaLayout(largura <= 640, largura, altura), { hh } = enquadra(layout, largura, altura, painel), escala = altura / (2 * hh);
    const rotulos = [], ilhas = [];
    for (const time of layout.times) {
      const x = -time.lado * layout.rotuloU, larguraTexto = (layout.estreito ? 112 : 176) / escala;
      const alturaTexto = (layout.estreito || altura < 620 ? 28 : 60) / escala, y = -time.d / Math.sqrt(3) + .85 * Math.sqrt(2 / 3);
      rotulos.push({ x0: time.lado === 1 ? x - larguraTexto : x, x1: time.lado === 1 ? x : x + larguraTexto, y0: y - alturaTexto / 2, y1: y + alturaTexto / 2 });
      ilhas.push({ x0: time.u - LAYOUT.larguraIlha / 2, x1: time.u + LAYOUT.larguraIlha / 2,
        y0: -time.d / Math.sqrt(3) - LAYOUT.profundidadeIlha / (2 * Math.sqrt(3)) - .16 * Math.sqrt(2 / 3),
        y1: -time.d / Math.sqrt(3) + LAYOUT.profundidadeIlha / (2 * Math.sqrt(3)) + 1.9 * Math.sqrt(2 / 3) });
    }
    for (let i = 0; i < rotulos.length; i++) {
      for (const ilha of ilhas) assert.equal(colidem(rotulos[i], ilha), false, `Rótulo ${i} em ${largura}×${altura}`);
      for (let j = i + 1; j < rotulos.length; j++) assert.equal(colidem(rotulos[i], rotulos[j]), false);
    }
  }
});
