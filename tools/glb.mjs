import { abre } from './lib.mjs';
const t = await abre('', { w: 1600, h: 900, url: 'http://127.0.0.1:4421/glb.html', espera: 'pronto' });
console.log(JSON.stringify(await t.ev(() => window.info), null, 0).replace(/},/g, '},\n'));
await t.foto('_glb'); await t.fim();
