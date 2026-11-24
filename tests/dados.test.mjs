import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Demo } from '../site/js/dados.js';

test('mais envia a tarefa digitada à cena e mantém o estado opcional', () => {
  let lista;
  const demo = new Demo({ sync: (nova) => { lista = nova; } }, false);
  const agente = demo.mais('pensando', 'Revisar autenticação');
  assert.equal(agente.tarefa, 'Revisar autenticação');
  assert.equal(lista[0].tarefa, 'Revisar autenticação');
  assert.equal(lista[0].estado, 'pensando');
});

test('mais recusa tarefa inválida antes de alterar a lista', () => {
  const demo = new Demo({ sync() { assert.fail('Não deve enviar dados inválidos'); } }, false);
  assert.throws(() => demo.mais('trabalhando', 123), TypeError);
  assert.throws(() => demo.mais('trabalhando', '   '), TypeError);
  assert.equal(demo.lista.length, 0);
});

test('mais mantém tarefas padrão e recusa ultrapassar o limite de agentes', () => {
  const demo = new Demo({ sync() {} }, false);
  demo.define(12);
  assert.ok(demo.lista.every((a) => a.tarefa.length));
  assert.equal(demo.mais(), null);
  assert.equal(demo.lista.length, 12);
});
