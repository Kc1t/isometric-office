// Uso: node tools/foto.mjs <nome> "<query>" <esperaMs> ["js antes da espera"] [W] [H]
import { abre } from './lib.mjs';
const [nome, query = '', ms = '2500', js = '', W = '1920', H = '1080'] = process.argv.slice(2);
const t = await abre(query, { w: +W, h: +H });
if (js) await t.ev(js);
await t.dorme(+ms);
const info = await t.ev(() => ({ quadros: __esc.quadros, tris: __esc.renderer.info.render.triangles, calls: __esc.renderer.info.render.calls, ags: __esc.esc.ags.size, estagio: __esc.esc.estagio }));
console.log(JSON.stringify(info));
await t.foto(nome); await t.fim();
