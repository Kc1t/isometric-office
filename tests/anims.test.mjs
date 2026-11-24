import './three-local.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const { anim, passoAnims } = await import('../site/js/util.js');

test('passoAnims sinaliza movimento somente ao avançar uma animação e inclui o último quadro', () => {
  let atualizacoes = 0, terminou = false;
  anim({ delay: .1, dur: .2, update: () => { atualizacoes++; }, done: () => { terminou = true; } });
  assert.equal(passoAnims(.05), false);
  assert.equal(atualizacoes, 0);
  assert.equal(passoAnims(.1), true);
  assert.equal(passoAnims(0), false);
  assert.equal(passoAnims(.2), true);
  assert.equal(terminou, true);
  assert.equal(passoAnims(.1), false);
});
