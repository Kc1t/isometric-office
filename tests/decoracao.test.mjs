import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECORACOES, LETREIRO, ALTURA_PRATELEIRA, TAMANHO_SALA } from '../site/js/decoracao.js';

test('os primeiros sete quartos têm composições diferentes com e sem tapete', () => {
  assert.equal(DECORACOES.length, 7);
  assert.equal(new Set(DECORACOES.map((d) => JSON.stringify(d))).size, 7);
  assert.ok(DECORACOES.some((d) => d.tapete));
  assert.ok(DECORACOES.some((d) => !d.tapete && d.carpete));
});

test('quadros e prateleiras deixam livre a faixa do letreiro', () => {
  assert.ok(DECORACOES.length);
  const baseNome = TAMANHO_SALA - LETREIRO.margemTopo - LETREIRO.altura / 2;
  for (const d of DECORACOES) {
    for (const q of d.quadros) assert.ok(q.y + q.h / 2 < baseNome);
    if (d.prateleira) assert.ok(d.prateleira.y + ALTURA_PRATELEIRA < baseNome);
  }
});
