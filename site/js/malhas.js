// Reduz submissões sem simplificar a geometria nem trocar materiais e texturas.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function fundeEstatico(original) {
  const copia = original.clone(), raiz = new THREE.Group(); raiz.copy(original, false);
  copia.updateMatrixWorld(true);
  const inversa = copia.matrixWorld.clone().invert(), matriz = new THREE.Matrix4(), grupos = new Map();
  copia.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isSkinnedMesh || o.isInstancedMesh || o.morphTargetInfluences) throw new TypeError('A fusão aceita apenas malhas estáticas.');
    if (Array.isArray(o.material)) throw new TypeError('A fusão exige um material por malha.');
    matriz.multiplyMatrices(inversa, o.matrixWorld);
    const atributos = Object.keys(o.geometry.attributes).sort().map((k) => `${k}:${o.geometry.attributes[k].itemSize}:${o.geometry.attributes[k].normalized}:${o.geometry.attributes[k].array.constructor.name}`).join('|');
    // Transparências preservam a ordenação individual; sombras e semAO não podem se misturar.
    const chave = `${o.material.uuid}|${o.castShadow}|${o.receiveShadow}|${o.renderOrder}|${!!o.userData.semAO}|${atributos}` + (o.material.transparent ? `|${o.uuid}` : '');
    if (!grupos.has(chave)) grupos.set(chave, { modelo: o, partes: [] });
    grupos.get(chave).partes.push({ geo: o.geometry, matriz: matriz.clone() });
  });
  for (const { modelo, partes } of grupos.values()) {
    let malha;
    if (partes.length === 1) {
      // Uma malha isolada não ganha nada com a fusão: preserva a geometria compartilhada do acervo.
      malha = new THREE.Mesh(partes[0].geo, modelo.material);
      malha.matrixAutoUpdate = false; malha.matrix.copy(partes[0].matriz);
    } else {
      const geos = partes.map((p) => {
        const geo = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
        geo.applyMatrix4(p.matriz); geo.clearGroups(); return geo;
      });
      const geo = mergeGeometries(geos);
      for (const parte of geos) parte.dispose();
      if (!geo) throw new Error('Não foi possível fundir as geometrias estáticas.');
      malha = new THREE.Mesh(geo, modelo.material);
      malha.userData.fundida = true;
    }
    malha.castShadow = modelo.castShadow; malha.receiveShadow = modelo.receiveShadow;
    malha.renderOrder = modelo.renderOrder; malha.userData.semAO = !!modelo.userData.semAO;
    raiz.add(malha);
  }
  return raiz;
}

export class Lotes {
  constructor(cena, capacidade) {
    this.cena = cena; this.capacidade = capacidade; this.lotes = new Map();
    this.grupo = new THREE.Group(); cena.add(this.grupo);
  }
  adiciona(original) {
    const converte = (o) => {
      const copia = o.isMesh ? new THREE.Object3D().copy(o, false) : o.clone(false);
      if (o.isMesh) {
        if (Array.isArray(o.material) || o.isSkinnedMesh || o.isInstancedMesh || o.material.transparent) throw new TypeError('O lote exige uma malha rígida com um material opaco.');
        const chave = `${o.geometry.uuid}|${o.material.uuid}|${o.castShadow}|${o.receiveShadow}`;
        if (!this.lotes.has(chave)) {
          const malha = new THREE.InstancedMesh(o.geometry, o.material, this.capacidade);
          malha.count = 0; malha.castShadow = o.castShadow; malha.receiveShadow = o.receiveShadow;
          malha.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          this.grupo.add(malha); this.lotes.set(chave, { malha, fontes: [] });
        }
        this.lotes.get(chave).fontes.push(copia);
      }
      for (const filho of o.children) copia.add(converte(filho));
      return copia;
    };
    return converte(original);
  }
  update() {
    let mudou = false;
    for (const lote of this.lotes.values()) {
      const { malha, fontes } = lote; let n = 0, vivas = 0, sujo = false;
      for (const fonte of fontes) {
        let pai = fonte, visivel = true;
        while (pai !== this.cena && pai) { visivel = visivel && pai.visible; pai = pai.parent; }
        if (!pai) continue;
        fontes[vivas++] = fonte;
        if (!visivel) continue;
        if (n >= this.capacidade) throw new RangeError('A capacidade do lote de móveis foi excedida.');
        const elementos = fonte.matrixWorld.elements, buffer = malha.instanceMatrix.array, offset = n * 16;
        for (let i = 0; i < 16; i++) {
          if (buffer[offset + i] === Math.fround(elementos[i])) continue;
          malha.setMatrixAt(n, fonte.matrixWorld); sujo = true; break;
        }
        n++;
      }
      fontes.length = vivas;
      if (n !== malha.count) { malha.count = n; sujo = true; }
      if (!sujo) continue;
      malha.instanceMatrix.needsUpdate = true;
      // Recalcular só ao mover mantém o descarte por frustum correto durante quedas e remoções.
      malha.computeBoundingSphere(); mudou = true;
    }
    return mudou;
  }
}
