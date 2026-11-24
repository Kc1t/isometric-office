import './three-local.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const THREE = await import('three');
const { Robo } = await import('../site/js/robo.js');
const { Lotes } = await import('../site/js/malhas.js');
const { instanciaRobo, geometriaIlha } = await import('../site/js/pipeline-modelos.js');
const { TIMES, LIMITES } = await import('../site/js/pipeline-logica.js');

test('vinte robôs conservam poses, ocultação e peças espelhadas ao serem instanciados', () => {
  const cena = new THREE.Scene(), quantidade = TIMES.length * LIMITES.agentes, lotes = new Lotes(cena, quantidade * 2), robos = [];
  for (let i = 0; i < quantidade; i++) {
    const original = new Robo(), robo = instanciaRobo(original, lotes);
    assert.notEqual(robo.g, original.g); assert.notEqual(robo.bE, original.bE);
    assert.notEqual(robo.bE.om, original.bE.om);
    robo.g.position.x = i; cena.add(robo.g); robo.setEstado('trabalhando'); robo.update(1 / 30); robos.push(robo);
  }
  cena.updateMatrixWorld(); assert.equal(lotes.update(), true);
  const troncos = [...lotes.lotes.values()].find((l) => l.fontes.includes(robos[0].corpo.children[0]));
  assert.equal(troncos.malha.count, quantidade);
  assert.ok([...lotes.lotes.values()].some((l) => l.malha.count === quantidade * 2));
  const matriz = new THREE.Matrix4(); troncos.malha.getMatrixAt(0, matriz);
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(matriz.elements[i] - robos[0].corpo.children[0].matrixWorld.elements[i]) < .00001);
  robos[0].g.visible = false; cena.updateMatrixWorld(); lotes.update();
  assert.equal(troncos.malha.count, quantidade - 1);
});

test('o lote recusa uma articulação com capacidade insuficiente', () => {
  const cena = new THREE.Scene(), lotes = new Lotes(cena, 1), robo = instanciaRobo(new Robo(), lotes);
  cena.add(robo.g); cena.updateMatrixWorld(); assert.throws(() => lotes.update(), /capacidade/);
});


test('a ilha tem espessura e cantos arredondados no plano do piso', () => {
  const geo = geometriaIlha(); geo.computeBoundingBox();
  const tamanho = geo.boundingBox.getSize(new THREE.Vector3());
  assert.ok(Math.abs(tamanho.x - 6.4) < .00001);
  assert.ok(Math.abs(tamanho.z - 4.8) < .00001);
  assert.ok(Math.abs(tamanho.y - .38) < .00001);
  const vertices = geo.attributes.position;
  for (let i = 0; i < vertices.count; i++) assert.ok(Math.abs(vertices.getX(i)) < 3.19 || Math.abs(vertices.getZ(i)) < 2.39);
  geo.dispose();
});
