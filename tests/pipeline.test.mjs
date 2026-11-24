import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pipeline, TIMES, LIMITES, TEMPOS } from '../site/js/pipeline-logica.js';

function avanca(pipe, segundos) { for (let t = 0; t < segundos; t += .1) pipe.update(.1); }

test('a entrada distribui por ordem e mantém a tarefa na fila sem agente livre', () => {
  const pipe = new Pipeline();
  pipe.ajustaTime('planejamento', -1);
  const a = pipe.novaTarefa('Primeira'), b = pipe.novaTarefa('Segunda');
  avanca(pipe, TEMPOS.entrada + .2);
  assert.equal(pipe.times[0].agentes[0].tarefa, a.id);
  assert.deepEqual(pipe.times[0].fila, [b.id]);
  avanca(pipe, 18);
  assert.ok(pipe.tarefas.find((t) => t.id === b.id).time > 0 || pipe.times[0].agentes[0].tarefa === b.id);
});

test('uma tarefa passa por todos os times e sai sem acumular histórico', () => {
  const pipe = new Pipeline(); pipe.novaTarefa('Publicar documentação');
  const vistos = new Set(), estados = new Set();
  for (let t = 0; t < 140; t += .1) {
    pipe.update(.1);
    for (const tarefa of pipe.tarefas) vistos.add(tarefa.time);
    for (const time of pipe.times) for (const agente of time.agentes) estados.add(agente.estado);
  }
  assert.deepEqual([...vistos].sort(), TIMES.map((_, i) => i));
  assert.ok(estados.has('trabalhando') && estados.has('pensando') && estados.has('terminou'));
  assert.equal(pipe.entregues, 1); assert.equal(pipe.tarefas.length, 0);
});

test('a revisão devolve ocasionalmente ao código e aprova a segunda passagem', () => {
  const pipe = new Pipeline();
  for (let i = 0; i < 4; i++) pipe.novaTarefa('Tarefa ' + i);
  let voltou = false, esperou = false;
  for (let t = 0; t < 200; t += .1) {
    pipe.update(.1);
    voltou ||= pipe.tarefas.some((t) => t.de === 3 && t.time === 2 && t.devolucoes === 1);
    esperou ||= pipe.times.some((time) => time.agentes.some((a) => a.estado === 'esperando'));
  }
  assert.ok(voltou); assert.ok(esperou); assert.equal(pipe.entregues, 4);
});

test('comandos aceitam acentos, mantêm de um a quatro agentes e devolvem trabalho ao remover um ocupado', () => {
  const pipe = new Pipeline();
  pipe.comando('/time código -'); pipe.comando('/time código +'); pipe.comando('/time CODIGO +');
  assert.equal(pipe.times[2].agentes.length, LIMITES.agentes);
  assert.throws(() => pipe.comando('/time código +'), /máximo/);
  pipe.comando('/time pesquisa -');
  assert.equal(pipe.times[1].agentes.length, 1);
  pipe.novaTarefa('Em andamento'); pipe.novaTarefa('Outro trabalho'); avanca(pipe, TEMPOS.entrada + .2);
  pipe.ajustaTime('planejamento', -1);
  assert.equal(pipe.times[0].agentes.length, 1);
  assert.equal(pipe.times[0].agentes[0].tarefa, pipe.tarefas[0].id);
  assert.deepEqual(pipe.times[0].fila, [pipe.tarefas[1].id]);
});

test('limpar esvazia somente filas e entradas e menos remove a última tarefa aguardando', () => {
  const pipe = new Pipeline();
  const a = pipe.novaTarefa('Ativa'); avanca(pipe, TEMPOS.entrada + .2);
  pipe.novaTarefa('Aguardando 1'); const ultima = pipe.novaTarefa('Aguardando 2');
  assert.equal(pipe.menos().id, ultima.id);
  pipe.comando('/limpar');
  assert.deepEqual(pipe.tarefas.map((t) => t.id), [a.id]);
  assert.ok(pipe.times.every((t) => !t.fila.length));
});

test('auto alterna, respeita capacidade e comandos inválidos não alteram a pipeline', () => {
  const pipe = new Pipeline();
  pipe.comando('/auto'); assert.equal(pipe.auto, true);
  avanca(pipe, TEMPOS.auto + .2); assert.ok(pipe.tarefas.length);
  pipe.comando('/auto'); assert.equal(pipe.auto, false);
  const antes = pipe.tarefas.length;
  for (const comando of ['/time desconhecido +', '/time código x', '/nao']) assert.throws(() => pipe.comando(comando), /Time|Comando/);
  for (const texto of ['', ' ', null, 4]) assert.throws(() => pipe.novaTarefa(texto), /texto/);
  assert.throws(() => pipe.update(-1), /tempo/);
  assert.throws(() => pipe.ajustaTime('código', 2), /delta/);
  assert.equal(pipe.tarefas.length, antes);
  while (pipe.tarefas.length < LIMITES.tarefas) pipe.novaTarefa('Na fila');
  assert.throws(() => pipe.novaTarefa('Excedente'), /Limite/);
  pipe.comando('/auto'); assert.doesNotThrow(() => avanca(pipe, TEMPOS.auto + .2));
});


test('o relógio vazio não aloca estado e os eventos preservam o estado anterior', () => {
  const pipe = new Pipeline(), vazio = pipe.estado;
  pipe.update(.5); assert.equal(pipe.estado, vazio);
  const tarefa = pipe.novaTarefa('Preservar estado'), entrada = pipe.estado;
  pipe.update(.1); assert.equal(pipe.estado, entrada);
  avanca(pipe, TEMPOS.entrada + .1);
  assert.notEqual(pipe.estado, entrada);
  assert.equal(entrada.tarefas[0].fase, 'transito');
  assert.equal(tarefa.fase, 'transito');
  assert.ok(entrada.times[0].agentes.every((a) => a.tarefa === null));
});

test('adicionar um agente distribui a fila sem perder tarefas ao longo de muitas transições', () => {
  const pipe = new Pipeline(); pipe.ajustaTime('planejamento', -1);
  pipe.novaTarefa('Primeira'); const segunda = pipe.novaTarefa('Segunda');
  avanca(pipe, TEMPOS.entrada + .1); pipe.ajustaTime('planejamento', 1);
  assert.equal(pipe.times[0].fila.length, 0);
  assert.ok(pipe.times[0].agentes.some((a) => a.tarefa === segunda.id));
  pipe.comando('/auto');
  for (let passo = 0; passo < 600; passo++) {
    pipe.update(.5);
    const ids = new Set(pipe.tarefas.map((t) => t.id)), alocadas = [];
    assert.equal(ids.size, pipe.tarefas.length);
    assert.ok(pipe.tarefas.length <= LIMITES.tarefas);
    for (const time of pipe.times) {
      alocadas.push(...time.fila);
      for (const agente of time.agentes) if (agente.tarefa !== null) alocadas.push(agente.tarefa);
    }
    assert.equal(alocadas.length, new Set(alocadas).size);
    assert.ok(alocadas.every((id) => ids.has(id)));
    assert.equal(alocadas.length, pipe.tarefas.filter((t) => t.fase === 'fila' || t.fase === 'mesa').length);
  }
});
