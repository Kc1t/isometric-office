// Usa a própria versão vendorizada de Three, sem instalar dependências.
import { registerHooks } from 'node:module';
const base = new URL('../site/vendor/three/', import.meta.url);
registerHooks({ resolve(nome, contexto, proximo) {
  if (nome === 'three') return { url: new URL('build/three.module.js', base).href, shortCircuit: true };
  if (nome.startsWith('three/addons/')) return { url: new URL('examples/jsm/' + nome.slice('three/addons/'.length), base).href, shortCircuit: true };
  return proximo(nome, contexto);
} });
