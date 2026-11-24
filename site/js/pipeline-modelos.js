import * as THREE from 'three';
import { LAYOUT } from './pipeline-layout.js';

// Mantém as articulações do Robo apontando para a hierarquia copiada pelo lote.
export function instanciaRobo(robo, lotes) {
  const referencias = new Map(), proxy = lotes.adiciona(robo.g);
  function relaciona(original, copia) {
    referencias.set(original, copia);
    for (let i = 0; i < original.children.length; i++) relaciona(original.children[i], copia.children[i]);
  }
  relaciona(robo.g, proxy);
  const resultado = Object.assign(Object.create(Object.getPrototypeOf(robo)), robo);
  for (const chave of Object.keys(robo)) if (referencias.has(robo[chave])) resultado[chave] = referencias.get(robo[chave]);
  for (const chave of ['bE', 'bD', 'pE', 'pD']) resultado[chave] = Object.fromEntries(Object.entries(robo[chave]).map(([parte, objeto]) => [parte, referencias.get(objeto)]));
  return resultado;
}

// A curva em planta independe da espessura: o piso continua arredondado visto de cima.
export function geometriaIlha() {
  const x = LAYOUT.larguraIlha / 2, z = LAYOUT.profundidadeIlha / 2, r = LAYOUT.raioIlha, forma = new THREE.Shape();
  forma.moveTo(-x + r, -z); forma.lineTo(x - r, -z); forma.quadraticCurveTo(x, -z, x, -z + r);
  forma.lineTo(x, z - r); forma.quadraticCurveTo(x, z, x - r, z);
  forma.lineTo(-x + r, z); forma.quadraticCurveTo(-x, z, -x, z - r);
  forma.lineTo(-x, -z + r); forma.quadraticCurveTo(-x, -z, -x + r, -z);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: LAYOUT.espessuraIlha, bevelEnabled: false, steps: 1, curveSegments: 6 });
  geo.translate(0, 0, -LAYOUT.espessuraIlha / 2); geo.rotateX(-Math.PI / 2); return geo;
}
