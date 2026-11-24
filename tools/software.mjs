// Toda execução de navegador deste módulo é limitada, sequencial e por software.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire('/Users/kauamiguel/Developer/personal/lousa-ia/');
const { chromium } = require('playwright');
const MAX_VIEWPORT = 800, LIMITE_MS = 55000;
const mata = () => { try { execFileSync('pkill', ['-9', '-f', 'chrome-headless-shell'], { stdio: 'ignore' }); } catch {} };

export async function porSoftware(teste, viewport = { width: MAX_VIEWPORT, height: MAX_VIEWPORT }) {
  if (viewport.width > MAX_VIEWPORT || viewport.height > MAX_VIEWPORT) throw new RangeError('O viewport deve ter no máximo 800×800.');
  const limite = setTimeout(() => { mata(); process.exit(124); }, LIMITE_MS);
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell',
      args: ['--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    });
    const page = await browser.newPage({ viewport });
    page.setDefaultTimeout(12000);
    const erros = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
    await teste(page, erros);
    if (erros.length) throw new Error(erros.join('\n'));
  } finally {
    try {
      if (browser) await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 3000).unref())]);
    } finally { mata(); clearTimeout(limite); }
  }
}
