import './three-local.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const THREE = await import('three');
const { fundeEstatico, Lotes } = await import('../site/js/malhas.js');
const { vasinho } = await import('../site/js/moveis.js');
const { semente } = await import('../site/js/util.js');
const triangulos = (g) => {
  let total = 0;
  g.traverse((o) => { if (o.isMesh) total += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; });
  return total;
};

test('fundir um vasinho preserva triângulos, limites, materiais e o original', () => {
  const original = vasinho(semente(42)), antes = new THREE.Box3().setFromObject(original, true);
  const fundido = fundeEstatico(original), depois = new THREE.Box3().setFromObject(fundido, true);
  assert.equal(original.children.length, 10);
  assert.equal(fundido.children.length, 2);
  assert.equal(triangulos(fundido), triangulos(original));
  assert.ok(antes.min.distanceTo(depois.min) < 1e-6 && antes.max.distanceTo(depois.max) < 1e-6);
  assert.equal(fundido.children[0].material, original.children[0].material);
  assert.ok(fundido.children.every((o) => o.castShadow && o.receiveShadow));
});

test('fundir recusa malhas animadas antes de perder suas articulações', () => {
  assert.throws(() => fundeEstatico(new THREE.SkinnedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())), /estáticas/);
});

test('fusão preserva transformações aninhadas e compartilha geometrias que já são únicas', () => {
  const original = new THREE.Group(), ramo = new THREE.Group(), material = new THREE.MeshBasicMaterial();
  original.position.set(3, 1, -2); original.rotation.y = .3;
  ramo.rotation.z = .2; ramo.scale.set(2, 1, .5); original.add(ramo);
  const a = new THREE.Mesh(new THREE.BoxGeometry(), material), b = new THREE.Mesh(a.geometry, material);
  a.position.y = 2; b.position.x = -3; ramo.add(a, b);
  const unico = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshBasicMaterial()); original.add(unico);
  const resultado = fundeEstatico(original), antes = new THREE.Box3().setFromObject(original, true), depois = new THREE.Box3().setFromObject(resultado, true);
  assert.equal(resultado.children.length, 2);
  assert.ok(antes.min.distanceTo(depois.min) < 1e-6 && antes.max.distanceTo(depois.max) < 1e-6);
  assert.equal(resultado.children.find((o) => o.material === unico.material).geometry, unico.geometry);
  assert.equal(triangulos(resultado), triangulos(original));
});

test('instâncias repetidas preservam transformações e acompanham animação, ocultação e remoção', () => {
  const cena = new THREE.Scene(), lotes = new Lotes(cena, 4);
  const modelo = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); modelo.castShadow = true;
  const a = lotes.adiciona(modelo), b = lotes.adiciona(modelo);
  a.position.x = 2; b.position.y = 3; cena.add(a, b); cena.updateMatrixWorld(true);
  assert.equal(lotes.update(), true);
  const [lote] = lotes.grupo.children, m = new THREE.Matrix4();
  assert.equal(lote.count, 2); assert.equal(lote.castShadow, true);
  lote.getMatrixAt(1, m); assert.equal(m.elements[13], 3);
  assert.equal(modelo.isMesh, true); assert.equal(modelo.parent, null);
  assert.equal(lotes.update(), false);
  a.visible = false; cena.updateMatrixWorld(true); lotes.update(); assert.equal(lote.count, 1);
  b.position.y = 5; cena.updateMatrixWorld(true); lotes.update(); lote.getMatrixAt(0, m); assert.equal(m.elements[13], 5);
  cena.remove(b); lotes.update(); assert.equal(lote.count, 0);
});

test('instâncias recusam ultrapassar a capacidade antes de escrever fora do buffer', () => {
  const cena = new THREE.Scene(), lotes = new Lotes(cena, 1);
  const modelo = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  cena.add(lotes.adiciona(modelo), lotes.adiciona(modelo)); cena.updateMatrixWorld(true);
  assert.throws(() => lotes.update(), /capacidade/);
});
