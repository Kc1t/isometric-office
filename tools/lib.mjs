// Base das capturas: abre o site no Chromium headless com GPU e devolve a página.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/Users/kauamiguel/Developer/personal/lousa-ia/');
const { chromium } = require('playwright');
export const RAIZ = new URL('..', import.meta.url).pathname;
export const SHOTS = RAIZ + 'shots/';
export async function abre(query = '', { w = 1920, h = 1080, url = 'http://127.0.0.1:4421/', espera = '__esc' } = {}) {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/Users/kauamiguel/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const erros = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  page.on('requestfailed', (r) => erros.push('falhou: ' + r.url()));
  await page.goto(url + (query ? '?' + query : ''));
  if (espera) {
    try { await page.waitForFunction((k) => window[k] && (window[k] === true || window[k].pronto), espera, { timeout: 60000 }); }
    catch (e) { console.log('NÃO CARREGOU'); console.log(erros.join('\n')); await browser.close(); process.exit(1); }
  }
  const foto = (nome, opt = {}) => page.screenshot({ path: SHOTS + nome + (nome.includes('.') ? '' : '.png'), ...opt });
  const fim = async () => { console.log(erros.length ? 'CONSOLE:\n' + [...new Set(erros)].slice(0, 15).join('\n') : 'console limpo'); await browser.close(); };
  return { page, foto, fim, erros, dorme: (ms) => page.waitForTimeout(ms), ev: (f, a) => page.evaluate(f, a) };
}
