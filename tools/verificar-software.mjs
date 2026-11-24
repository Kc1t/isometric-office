// Um cenário por execução: nunca abrir testes de navegador em paralelo.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { porSoftware } from './software.mjs';

const caso = process.argv[2] || 'hive';
const CAPTURAS = {
  'captura-hive-1': { pagina: 'hive.html', n: 1 },
  'captura-hive-7': { pagina: 'hive.html', n: 7 },
  'captura-index-3': { pagina: 'index.html', n: 3 },
};
const CASOS = ['hive', 'index', 'hive-alta', 'index-alta', ...Object.keys(CAPTURAS)];
if (!CASOS.includes(caso)) throw new Error('Escolha um cenário: ' + CASOS.join(', '));

await porSoftware(async (page) => {
  const captura = CAPTURAS[caso], hive = caso.includes('hive');
  const pagina = captura?.pagina || (hive ? 'hive.html' : 'index.html');
  await page.goto(`http://127.0.0.1:4421/${pagina}?n=${captura?.n || 1}&hora=15${caso.endsWith('-alta') ? '&q=alta' : ''}`);
  await page.waitForFunction(() => window.__esc?.pronto);
  await page.evaluate(() => { __esc.demo.livre = false; });
  const sentados = () => page.waitForFunction(() => [...(__esc.col || __esc.esc).ags.values()].every((a) => a.fase === 'sentado'));
  await sentados();
  if (captura) {
    await page.waitForFunction(() => __esc.quadros > 150, null, { timeout: 45000 });
    // A imagem fica estável e a barra permanece visível.
    await page.evaluate(() => { __esc.vel = 0; });
    mkdirSync('shots', { recursive: true });
    await page.screenshot({ path: `shots/${caso.replace('captura-', '')}.png` });
    console.log(`Captura salva: shots/${caso.replace('captura-', '')}.png`);
    return;
  }
  const campo = page.locator('#prompt');
  const quantidade = () => page.evaluate(() => __esc.demo.principais().length);
  const envia = async (texto) => { await campo.fill(texto); await campo.press('Enter'); };
  await page.keyboard.press('/');
  assert.equal(await campo.evaluate((e) => document.activeElement === e), true);
  const tarefa = 'Revisar s h + - 0123456789 com acentuação';
  await campo.pressSequentially(tarefa);
  assert.equal(await quantidade(), 1, 'Digitar atalhos no campo não altera agentes');
  assert.equal(await page.locator('#painel').evaluate((e) => e.classList.contains('gravando')), false);
  await campo.press('Escape');
  assert.equal(await campo.evaluate((e) => document.activeElement === e), false);
  await page.keyboard.press('/');
  assert.equal(await campo.inputValue(), tarefa, 'A tecla de foco não entra no texto');
  await campo.press('Enter');
  assert.equal(await quantidade(), 2);
  assert.equal(await page.evaluate(() => __esc.demo.principais().at(-1).tarefa), tarefa);
  await sentados();
  await page.waitForFunction((txt) => [...document.querySelectorAll('.etq.on u')].some((e) => e.textContent.includes(txt)), tarefa);
  await envia('/inexistente');
  assert.equal(await quantidade(), 2);
  assert.equal(await campo.inputValue(), '/inexistente');
  assert.match(await page.locator('#aviso').textContent(), /Comando desconhecido/);
  await envia('/sub');
  assert.equal(await page.evaluate(() => __esc.demo.lista.filter((a) => a.pai).length), 1);
  await sentados();
  await envia('/sair'); assert.equal(await quantidade(), 1);
  await envia('/limpar'); assert.equal(await quantidade(), 0);
  await page.waitForFunction(() => (__esc.col || __esc.esc).ags.size === 0);
  await envia('/sub'); assert.match(await page.locator('#aviso').textContent(), /Adicione um agente/);
  await envia('   '); assert.equal(await quantidade(), 0);
  await campo.fill('Criar pela seta'); await page.locator('#enviar').click(); assert.equal(await quantidade(), 1);
  await page.locator('#mais').click(); assert.equal(await quantidade(), 2);
  await page.locator('#menos').click(); assert.equal(await quantidade(), 1);
  await campo.focus(); await campo.press('Escape');
  await page.keyboard.press('3'); assert.equal(await quantidade(), 3);
  await page.keyboard.press('-'); assert.equal(await quantidade(), 2);
  await page.keyboard.press('+'); assert.equal(await quantidade(), 3);
  await page.keyboard.press('h');
  assert.equal(await page.locator('#painel').evaluate((e) => e.classList.contains('gravando')), true);
  await page.keyboard.press('/');
  assert.equal(await campo.evaluate((e) => document.activeElement === e), true);
  await page.evaluate(() => { __esc.demo.define(12); });
  await envia('Manter tarefa quando lotado');
  assert.equal(await quantidade(), 12);
  assert.equal(await campo.inputValue(), 'Manter tarefa quando lotado');
  await envia('/limpar');
  await page.setViewportSize({ width: 390, height: 800 });
  await campo.focus();
  const medidas = await page.locator('#painel').evaluate((e) => {
    const r = e.getBoundingClientRect(), campo = document.getElementById('prompt').getBoundingClientRect();
    return { x: r.x, fim: r.right, centro: r.x + r.width / 2, larguraPagina: document.documentElement.scrollWidth, larguraCampo: campo.width, filtro: getComputedStyle(e).backdropFilter };
  });
  assert.ok(medidas.x >= 0 && medidas.fim <= 390 && medidas.larguraPagina <= 390);
  assert.ok(Math.abs(medidas.centro - 195) < 1 && medidas.larguraCampo > 200);
  assert.equal(medidas.filtro, 'none');
  // Exercita o tratador de visibilidade; não substitui uma troca de aba em um dispositivo.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const parou = await page.evaluate(() => __esc.quadros);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => __esc.quadros), parou);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForFunction((n) => __esc.quadros > n, parou);
  console.log(`Verificação concluída por software: ${caso}, desktop e 390 px.`);
});
