// Mede chamadas, triângulos e tempo por software, incluindo a passada de sombra.
import { mkdirSync, writeFileSync } from 'node:fs';
import { porSoftware } from './software.mjs';

await porSoftware(async (page, erros) => {
  await page.addInitScript(() => {
    let s = 42;
    Math.random = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  });
  await page.goto((process.env.SITE_URL || 'http://127.0.0.1:4421/') + 'hive.html?n=7');
  await page.waitForFunction(() => window.__esc?.pronto);
  await page.evaluate(() => { __esc.demo.livre = false; });
  await page.waitForFunction(() => [...__esc.col.ags.values()].every((a) => a.fase === 'sentado') && __esc.quadros > 150, null, { timeout: 45000 });
  const dados = await page.evaluate(async () => {
    const { renderer } = __esc, gl = renderer.getContext(), render = renderer.render;
    const mede = () => new Promise((resolve) => {
      const amostras = []; let anterior;
      renderer.render = function (...args) {
        const inicio = performance.now();
        render.apply(this, args); gl.finish();
        const fim = performance.now();
        if (anterior) amostras.push({ chamadas: this.info.render.calls, triangulos: this.info.render.triangles, renderMs: fim - inicio, quadroMs: fim - anterior });
        anterior = fim;
        if (amostras.length === 30) { renderer.render = render; resolve(amostras); }
      };
    });
    const animado = await mede();
    __esc.vel = 0;
    // A segunda janela mede a mesma cena sem movimento, após a última sombra.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const parado = await mede();
    const resumo = (lista) => {
      const media = (k) => lista.reduce((s, a) => s + a[k], 0) / lista.length;
      return { amostras: lista.length, chamadas: media('chamadas'), triangulos: media('triangulos'), renderMs: media('renderMs'), quadroMs: media('quadroMs'), chamadasMin: Math.min(...lista.map((a) => a.chamadas)), chamadasMax: Math.max(...lista.map((a) => a.chamadas)) };
    };
    return { viewport: '800×800', agentes: __esc.demo.principais().length, renderizador: gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL), animado: resumo(animado), parado: resumo(parado) };
  });
  mkdirSync('shots', { recursive: true });
  const nome = process.argv[2] || 'medicao';
  await page.screenshot({ path: `shots/${nome}.png` });
  writeFileSync(`shots/${nome}.json`, JSON.stringify({ ...dados, erros }, null, 2) + '\n');
  console.log(JSON.stringify({ ...dados, erros }, null, 2));
  if (erros.length) process.exitCode = 1;
});
