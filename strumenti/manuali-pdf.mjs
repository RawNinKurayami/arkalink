#!/usr/bin/env node
/** Stampa i quattro HTML correnti con copertina usando il loro CSS di stampa.
 * Richiede Node e Playwright (Chromium), oppure --chrome /percorso/a/Chrome.
 * Il browser legge i file del repository: nessun account o dato utente.
 * node strumenti/manuali-pdf.mjs --output /cartella/pdf
 */
import { readFile, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
const root = path.resolve(option('--root', path.join(path.dirname(fileURLToPath(import.meta.url)), '..')));
const overlay = option('--overlay', null);
const output = path.resolve(option('--output', root));
const qa = option('--qa-dir', null);
const lang = option('--lang', 'it');
if(!['it','en'].includes(lang)) throw new Error('--lang must be it or en');
const prefix = lang==='en' ? '/en' : '';
const origin = 'https://manuali.arkalink.test';
const availableManuals = ['manuale', 'manuale-prestigio', 'manuale-cyborg', 'manuale-frutti'];
const manuals = option('--manuals', availableManuals.join(',')).split(',');
if(manuals.some(folder=>!availableManuals.includes(folder))) throw new Error('Unknown manual in --manuals');
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.jpg':'image/jpeg', '.webp':'image/webp', '.png':'image/png', '.pdf':'application/pdf' };
const browser = await chromium.launch({ headless:true, ...(option('--chrome', null) ? { executablePath:option('--chrome') } : {}) });
const context = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'reduce', acceptDownloads:true });
const unavailable = new Set();
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== origin) {
    // Solo i caratteri già usati dal sito possono essere caricati dall'esterno.
    if (['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    return route.abort();
  }
  let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const locations = [overlay, root].filter(Boolean);
  for (const base of locations) {
    const file = path.resolve(base, relative);
    if (!file.startsWith(path.resolve(base) + path.sep)) continue;
    try {
      if (!(await stat(file)).isFile()) continue;
      return route.fulfill({status:200,contentType:mime[path.extname(file)] || 'application/octet-stream',body:await readFile(file)});
    } catch {}
  }
  unavailable.add(relative);
  return route.fulfill({status:404,contentType:'text/plain',body:'File non trovato'});
});
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', error => consoleErrors.push(String(error)));
async function open(url) {
  await page.goto(origin + url, {waitUntil:'load',timeout:30000});
  await page.waitForFunction(() => !window.GLCI18n || window.GLCI18n.ready());
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.complete ? null : new Promise(resolve => {image.onload=resolve;image.onerror=resolve;}))));
}
const report = [];
try {
  if (qa) {
    await mkdir(qa, {recursive:true});
    await open('/manuali/?lang='+lang);
    await page.screenshot({path:path.join(qa,'biblioteca-desktop.png'),fullPage:true});
    report.push({page:'biblioteca',width:1440,covers:await page.locator('.pr-book-art img').count(),overflow:await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)});
    for (const width of [768,390,320]) {
      await page.setViewportSize({width,height:844});
      await page.screenshot({path:path.join(qa,`biblioteca-${width}.png`),fullPage:true});
      report.push({page:'biblioteca',width,overflow:await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)});
    }
    await page.setViewportSize({width:1440,height:1000});
  }
  for (const folder of manuals) {
    await open(`${prefix}/${folder}/?lang=${lang}`);
    const before = await page.evaluate(() => ({images:[...document.querySelectorAll('img')].map(i=>({source:i.currentSrc,loaded:i.complete && i.naturalWidth>0})),cover:document.querySelector('.man-copertina img').currentSrc,overflow:document.documentElement.scrollWidth>innerWidth,chapters:document.querySelectorAll('.man-cap').length}));
    if (before.images.some(image => !image.loaded)) throw new Error(`Immagine non caricata: ${folder}`);
    if (qa) {
      await page.screenshot({path:path.join(qa,`${folder}-desktop.png`)});
      await page.locator('#man-apri-indice').click();
      if (await page.locator('#man-apri-indice').getAttribute('aria-expanded') !== 'true') throw new Error('Indice non aperto');
      await page.locator('#man-cerca').fill('xyznessunrisultato');
      if (!(await page.locator('#man-nessuno').isVisible())) throw new Error('Ricerca indice non funzionante');
      await page.locator('#man-cerca').fill('');
      await page.keyboard.press('Escape');
      await page.evaluate(() => {window.__printCount=0;window.print=()=>window.__printCount++;});
      await page.locator('#man-stampa').click();
      if (await page.evaluate(()=>window.__printCount) !== 1) throw new Error('Tasto stampa non funzionante');
      await page.locator('.man-cap').first().scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(qa,`${folder}-lettura.png`)});
      await page.evaluate(() => window.scrollTo(0,0));
      await page.setViewportSize({width:390,height:844});
      await page.screenshot({path:path.join(qa,`${folder}-mobile.png`)});
      report.push({page:folder,width:390,overflow:await page.evaluate(() => document.documentElement.scrollWidth>innerWidth)});
      await page.setViewportSize({width:1440,height:1000});
    }
    await page.emulateMedia({media:'print'});
    // La source WebP è riservata allo schermo; la stampa usa la JPEG completa.
    await page.waitForFunction(() => {
      const image=document.querySelector('.man-copertina img');
      return image?.currentSrc.endsWith('.jpg') && image.complete && image.naturalWidth>0;
    });
    await page.locator('.man-copertina img').evaluate(image => image.decode());
    const printCover = await page.locator('.man-copertina img').evaluate(image => ({source:image.currentSrc,width:image.getBoundingClientRect().width,height:image.getBoundingClientRect().height}));
    if (!printCover.source.endsWith('.jpg')) throw new Error('Stampa senza asset a piena qualità');
    const target = path.join(output,lang==='en'?'en':'',folder,'manuale.pdf');
    await mkdir(path.dirname(target), {recursive:true});
    await page.pdf({path:target,printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,tagged:true,outline:true});
    const finish = spawnSync(option('--python','python3'), [path.join(path.dirname(fileURLToPath(import.meta.url)),'rifinisci-manuale-pdf.py'),target], {encoding:'utf8'});
    if (finish.status !== 0) throw new Error(finish.stderr || 'Rifinitura PDF non riuscita');
    if (finish.stdout.trim()) console.log(finish.stdout.trim());
    report.push({page:folder,width:1440,...before,printCover,pdf:target,pdfBytes:(await stat(target)).size});
    await page.emulateMedia({media:'screen'});
    console.log(`PDF pronto: ${folder}`);
  }
  if (consoleErrors.length || unavailable.size) throw new Error(JSON.stringify({consoleErrors,unavailable:[...unavailable]}));
  if (report.some(item=>item.overflow)) throw new Error('Layout più largo dello schermo');
  if (qa) await writeFile(path.join(qa,'browser-report.json'),JSON.stringify({report,consoleErrors,unavailable:[...unavailable]},null,2));
} finally {
  await browser.close();
}
