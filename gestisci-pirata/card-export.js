/* Grand Line Chronicles · Immagine della carta
   Disegna fronte e retro su una tela, alla risoluzione più alta che
   l'illustrazione permette, e li consegna come PNG. Non legge regole: riceve
   il risultato di GLCMoves.resolve() e lo mette in bella copia. */
(function () {
'use strict';

const lista = v => Array.isArray(v) ? v : [];
const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;

const ORO = '#f0a441', ORO_CHIARO = '#ffd394', AVORIO = '#f2e9d8', FONDO = '#0b0906';

/* --- utilità di disegno --- */
function rettArrotondato(c, x, y, w, h, r) {
 c.beginPath();
 c.moveTo(x + r, y);
 c.arcTo(x + w, y, x + w, y + h, r);
 c.arcTo(x + w, y + h, x, y + h, r);
 c.arcTo(x, y + h, x, y, r);
 c.arcTo(x, y, x + w, y, r);
 c.closePath();
}
function spezza(c, testo, larghezza, righeMax) {
 const parole = String(testo || '').split(/\s+/).filter(Boolean), righe = [];
 let riga = '';
 parole.forEach(p => {
  const prova = riga ? riga + ' ' + p : p;
  if (c.measureText(prova).width <= larghezza || !riga) riga = prova;
  else { righe.push(riga); riga = p; }
 });
 if (riga) righe.push(riga);
 if (righeMax && righe.length > righeMax) {
  const tagliate = righe.slice(0, righeMax);
  tagliate[righeMax - 1] = tagliate[righeMax - 1].replace(/[.,;:\s]*$/, '') + '…';
  return tagliate;
 }
 return righe;
}
function scrivi(c, testo, x, y, opzioni) {
 const o = opzioni || {};
 c.save();
 c.font = o.font || '400 24px Inter, system-ui, sans-serif';
 c.fillStyle = o.colore || AVORIO;
 c.textAlign = o.allinea || 'left';
 c.textBaseline = 'alphabetic';
 if (o.spaziatura && 'letterSpacing' in c) c.letterSpacing = o.spaziatura;
 if (o.ombra) { c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = o.ombra; }
 const righe = o.larghezza ? spezza(c, testo, o.larghezza, o.righeMax) : [String(testo || '')];
 const passo = o.interlinea || (parseInt(c.font, 10) * 1.3);
 righe.forEach((riga, i) => c.fillText(riga, x, y + i * passo));
 c.restore();
 return righe.length * passo;
}
/* Carica un'immagine da una sorgente qualsiasi: file, data URL o SVG del sito. */
function immagine(src) {
 return new Promise(risolvi => {
  if (!src) { risolvi(null); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => risolvi(img);
  img.onerror = () => risolvi(null);
  img.src = src;
 });
}
function daNodo(nodo) {
 if (!nodo) return Promise.resolve(null);
 const img = nodo.querySelector('img');
 if (img && img.getAttribute('src')) return immagine(img.getAttribute('src'));
 const svg = nodo.querySelector('svg');
 if (svg) {
  const copia = svg.cloneNode(true);
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  if (!copia.getAttribute('width')) copia.setAttribute('width', '256');
  if (!copia.getAttribute('height')) copia.setAttribute('height', '256');
  const testo = new XMLSerializer().serializeToString(copia);
  return immagine('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(testo));
 }
 return Promise.resolve(null);
}
/* Lo stemma della carta, ricavato dalle fonti: non dipende dalla vista aperta. */
function stemmaDelle(r) {
 const p = r.move.presentation || {};
 const s = lista(r.selected).find(x => x.id === p.emblemId) || r.tech || lista(r.selected)[0];
 const contenitore = document.createElement('span');
 if (!s) return Promise.resolve(null);
 if (s.emblem && window.emblem) contenitore.innerHTML = emblem(s.emblem, 256);
 else if (s.kind === 'haki' && window.hakiIcon) contenitore.innerHTML = hakiIcon(s.raw, 256);
 else if (window.svgIcon) contenitore.innerHTML = svgIcon(s.icon || 'star', 256);
 return daNodo(contenitore);
}
/* L'illustrazione riempie la carta come nella vista, rispettando fuoco e zoom. */
function disegnaCoperta(c, img, x, y, w, h, px, py, zoom) {
 const scala = Math.max(w / img.width, h / img.height) * Math.max(1, zoom || 1);
 const lw = img.width * scala, lh = img.height * scala;
 const dx = x + (w - lw) * (num(px, 50) / 100), dy = y + (h - lh) * (num(py, 50) / 100);
 c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
 c.drawImage(img, dx, dy, lw, lh);
 c.restore();
}
/* La finitura resta un velo leggero: deve accennare il riflesso, non coprire. */
function finitura(c, tipo, w, h) {
 if (!tipo || tipo === 'none') return;
 c.save();
 const g = c.createLinearGradient(0, 0, w, h);
 if (tipo === 'foil') {
  c.globalCompositeOperation = 'screen'; c.globalAlpha = .17;
  [[0, '#ff2f86'], [.2, '#ffd400'], [.4, '#00ffb7'], [.6, '#009cff'], [.8, '#a800ff'], [1, '#ff2f86']].forEach(([p, col]) => g.addColorStop(p, col));
 } else if (tipo === 'oro') {
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = .2;
  [[0, 'rgba(120,78,20,0)'], [.42, '#ffdd96'], [.5, '#fff8e0'], [.62, '#d6a03c'], [1, 'rgba(90,60,18,0)']].forEach(([p, col]) => g.addColorStop(p, col));
 } else if (tipo === 'prisma') {
  c.globalCompositeOperation = 'screen'; c.globalAlpha = .14;
  [[0, '#ffffff'], [.25, '#00eaff'], [.5, '#ff00bf'], [.75, '#ffee00'], [1, '#ffffff']].forEach(([p, col]) => g.addColorStop(p, col));
 } else if (tipo === 'stelle') {
  c.globalCompositeOperation = 'screen'; c.globalAlpha = .5;
  const passo = Math.round(w / 26);
  c.fillStyle = '#fff6d6';
  for (let y = passo; y < h; y += passo) {
   for (let x = passo; x < w; x += passo) {
    const r = ((x * 7 + y * 13) % 11) / 11;
    if (r > .72) { c.beginPath(); c.arc(x + r * passo * .4, y + r * passo * .3, Math.max(1, w / 900 * (1 + r)), 0, 7); c.fill(); }
   }
  }
  c.restore(); return;
 }
 c.fillStyle = g; c.fillRect(0, 0, w, h);
 c.restore();
}

/* --- il fronte --- */
async function fronte(r, W, H) {
 const m = r.move, p = m.presentation || {};
 const tela = document.createElement('canvas');
 tela.width = W; tela.height = H;
 const c = tela.getContext('2d');
 const raggio = W * .045;

 c.fillStyle = FONDO; c.fillRect(0, 0, W, H);
 rettArrotondato(c, 0, 0, W, H, raggio); c.save(); c.clip();

 const arte = p.artId && window.GLCMoves && GLCMoves.art ? await GLCMoves.art(p.artId).then(immagine).catch(() => null) : null;
 if (arte) disegnaCoperta(c, arte, 0, 0, W, H, p.x, p.y, p.zoom);
 else {
  const sfondo = c.createRadialGradient(W / 2, H * .3, W * .1, W / 2, H * .45, H * .7);
  sfondo.addColorStop(0, '#2a2018'); sfondo.addColorStop(1, FONDO);
  c.fillStyle = sfondo; c.fillRect(0, 0, W, H);
 }

 /* velo: lascia leggibili testate e piede */
 const velo = c.createLinearGradient(0, 0, 0, H);
 velo.addColorStop(0, 'rgba(8,6,4,.62)'); velo.addColorStop(.32, 'rgba(8,6,4,0)');
 velo.addColorStop(.52, 'rgba(8,6,4,.18)'); velo.addColorStop(.88, 'rgba(8,6,4,.93)');
 c.fillStyle = velo; c.fillRect(0, 0, W, H);

 finitura(c, p.finish, W, H);

 const margine = W * .075, u = W / 1000;
 scrivi(c, 'GRAND LINE CHRONICLES', margine, margine + 14 * u, { font: (20 * u) + 'px Inter, sans-serif', colore: 'rgba(242,233,216,.75)', spaziatura: (4 * u) + 'px' });
 scrivi(c, 'SPECIAL MOVE', W - margine, margine + 14 * u, { font: (20 * u) + 'px Inter, sans-serif', colore: 'rgba(242,233,216,.75)', allinea: 'right', spaziatura: (4 * u) + 'px' });

 const stemma = await stemmaDelle(r);
 if (stemma) {
  const lato = W * .17;
  c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18 * u;
  c.drawImage(stemma, (W - lato) / 2, margine + 40 * u, lato, lato);
  c.restore();
 }

 /* piede: citazione, titolo, tecnica, descrizione */
 const larghezza = W - margine * 2;
 let y = H - margine;
 const desc = r.tech && r.tech.desc ? r.tech.desc : (m.notes || '');
 c.font = (30 * u) + 'px "Cormorant Garamond", Georgia, serif';
 const righeDesc = desc ? spezza(c, desc, larghezza, 4) : [];
 const altezzaDesc = righeDesc.length * 38 * u;
 c.font = 'italic ' + (34 * u) + 'px "Cormorant Garamond", Georgia, serif';
 const righeCit = p.quote ? spezza(c, '“' + p.quote + '”', larghezza, 3) : [];
 const altezzaCit = righeCit.length * 44 * u;

 y -= altezzaDesc;
 if (righeDesc.length) scrivi(c, desc, W / 2, y + 30 * u, { font: (30 * u) + 'px "Cormorant Garamond", Georgia, serif', colore: 'rgba(242,233,216,.9)', allinea: 'center', larghezza, righeMax: 4, interlinea: 38 * u });
 y -= 26 * u;
 scrivi(c, r.tech ? r.tech.name : 'Tecnica non collegata', W / 2, y, { font: (26 * u) + 'px Inter, sans-serif', colore: 'rgba(242,233,216,.8)', allinea: 'center' });
 y -= 56 * u;
 scrivi(c, m.name || 'Special Move', W / 2, y, { font: '700 ' + (62 * u) + 'px "Cinzel Decorative", "Marcellus SC", serif', colore: '#fff3dd', allinea: 'center', ombra: 24 * u });
 if (p.subtitle) { y -= 34 * u; scrivi(c, p.subtitle.toUpperCase(), W / 2, y, { font: (21 * u) + 'px Inter, sans-serif', colore: ORO_CHIARO, allinea: 'center', spaziatura: (5 * u) + 'px' }); }
 if (righeCit.length) { y -= altezzaCit + 14 * u; scrivi(c, '“' + p.quote + '”', W / 2, y + 34 * u, { font: 'italic ' + (34 * u) + 'px "Cormorant Garamond", Georgia, serif', colore: '#e7d6b4', allinea: 'center', larghezza, righeMax: 3, interlinea: 44 * u }); }

 c.restore();
 cornice(c, W, H, raggio);
 return tela;
}

function cornice(c, W, H, raggio) {
 c.save();
 rettArrotondato(c, 2, 2, W - 4, H - 4, raggio);
 c.lineWidth = Math.max(2, W / 320);
 c.strokeStyle = 'rgba(240,164,65,.55)';
 c.stroke();
 c.restore();
}

/* --- il retro ---
   Prima si misura tutto, poi si disegna: se il contenuto è tanto, il corpo del
   testo si stringe invece di essere tagliato via. */
async function retro(r, W, H) {
 const m = r.move, p = m.presentation || {};
 const tela = document.createElement('canvas');
 tela.width = W; tela.height = H;
 const c = tela.getContext('2d');
 const raggio = W * .045, u = W / 1000, margine = W * .075;
 const larghezza = W - margine * 2;

 /* --- che cosa va scritto --- */
 const blocchi = [];
 const t = r.totals || {};
 const voci = [['ST', t.st], ['PIP', t.pip], ['ST / turno', t.maintenanceST]];
 if (t.maintenancePIP) voci.push(['PIP / turno', t.maintenancePIP]);
 blocchi.push({ tipo: 'costi', voci });
 if (lista(r.formulas).length) {
  blocchi.push({ tipo: 'titolo', testo: 'Tiri' });
  r.formulas.forEach(f => blocchi.push({ tipo: 'riga', testa: f.label, corpo: f.text }));
 }
 const ordine = lista(m.sequence);
 const passi = lista(r.selected).slice().sort((a, b) => {
  const ia = ordine.indexOf(a.id), ib = ordine.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
 });
 if (passi.length) {
  blocchi.push({ tipo: 'titolo', testo: 'Esecuzione' });
  passi.forEach((s, i) => blocchi.push({ tipo: 'riga', numero: String(i + 1).padStart(2, '0'), testa: s.name, corpo: s.subtitle || '' }));
 }
 if (lista(r.conditions).length) {
  blocchi.push({ tipo: 'titolo', testo: 'Effetti e condizioni' });
  r.conditions.forEach(cond => blocchi.push({ tipo: 'riga', corpo: cond.text }));
 }
 lista(r.errors).forEach(e => blocchi.push({ tipo: 'riga', corpo: '⚠ ' + e.text, colore: '#f0c9b0' }));
 if (m.notes) { blocchi.push({ tipo: 'titolo', testo: 'Note' }); blocchi.push({ tipo: 'riga', corpo: m.notes }); }

 /* --- quanto spazio serve, a una data scala --- */
 const altezza = (scala, disegna) => {
  const f = u * scala;
  let y = margine + 26 * u;
  if (disegna) scrivi(c, m.name || 'Special Move', margine, y, { font: '700 ' + (40 * u) + 'px "Cinzel Decorative", "Marcellus SC", serif', colore: '#fff3dd' });
  y += 16 * u;
  blocchi.forEach(b => {
   if (b.tipo === 'titolo') {
    y += 18 * f;
    if (disegna) scrivi(c, b.testo.toUpperCase(), margine, y, { font: (22 * f) + 'px "Marcellus SC", serif', colore: ORO_CHIARO, spaziatura: (4 * f) + 'px' });
    y += 12 * f;
    if (disegna) { c.save(); c.strokeStyle = 'rgba(240,164,65,.3)'; c.lineWidth = 1.5 * f; c.beginPath(); c.moveTo(margine, y); c.lineTo(W - margine, y); c.stroke(); c.restore(); }
    y += 26 * f;
    return;
   }
   if (b.tipo === 'costi') {
    const largRiquadro = (larghezza - (b.voci.length - 1) * 14 * u) / b.voci.length;
    if (disegna) b.voci.forEach(([etichetta, v], i) => {
     const x = margine + i * (largRiquadro + 14 * u);
     c.save();
     rettArrotondato(c, x, y, largRiquadro, 96 * u, 14 * u);
     c.fillStyle = 'rgba(20,14,8,.55)'; c.fill();
     c.strokeStyle = 'rgba(240,164,65,.32)'; c.lineWidth = 1.6 * u; c.stroke();
     c.restore();
     scrivi(c, v == null ? '—' : String(v), x + largRiquadro / 2, y + 48 * u, { font: '600 ' + (38 * u) + 'px Inter, sans-serif', colore: ORO_CHIARO, allinea: 'center' });
     scrivi(c, etichetta.toUpperCase(), x + largRiquadro / 2, y + 78 * u, { font: (18 * u) + 'px Inter, sans-serif', colore: 'rgba(242,233,216,.72)', allinea: 'center', spaziatura: (2 * u) + 'px' });
    });
    y += 116 * u;
    return;
   }
   const x = margine + (b.numero ? 46 * f : 0);
   if (b.numero && disegna) scrivi(c, b.numero, margine, y + 20 * f, { font: (24 * f) + 'px "Marcellus SC", serif', colore: 'rgba(240,164,65,.8)' });
   if (b.testa) {
    if (disegna) scrivi(c, b.testa, x, y + 20 * f, { font: '600 ' + (26 * f) + 'px Inter, sans-serif', colore: ORO_CHIARO });
    y += 30 * f;
   }
   if (b.corpo) {
    const opzioni = { font: (24 * f) + 'px Inter, sans-serif', colore: b.colore || 'rgba(242,233,216,.82)', larghezza: larghezza - (b.numero ? 46 * f : 0), righeMax: 4, interlinea: 30 * f };
    if (disegna) y += scrivi(c, b.corpo, x, y + 20 * f, opzioni);
    else { c.font = opzioni.font; y += spezza(c, b.corpo, opzioni.larghezza, 4).length * 30 * f; }
   }
   y += 14 * f;
  });
  return y;
 };

 /* --- sfondo --- */
 rettArrotondato(c, 0, 0, W, H, raggio); c.save(); c.clip();
 const sfondo = c.createLinearGradient(0, 0, W, H);
 sfondo.addColorStop(0, '#1b1510'); sfondo.addColorStop(.7, FONDO);
 c.fillStyle = sfondo; c.fillRect(0, 0, W, H);
 c.save(); c.globalAlpha = .06; c.strokeStyle = ORO; c.lineWidth = 2 * u;
 for (let i = -H; i < W; i += 18 * u) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H, H); c.stroke(); }
 c.restore();
 finitura(c, p.finish, W, H);

 /* --- scala che fa entrare tutto --- */
 /* L'altezza cresce in modo lineare con la scala: due misure bastano a
    separare la parte fissa (titolo, riquadri dei costi) da quella che si
    stringe, e a trovare la scala giusta senza rimpicciolire troppo. */
 const piede = margine * .9;
 const h1 = altezza(1, false), hm = altezza(.5, false);
 const variabile = Math.max(1, (h1 - hm) * 2), fisso = h1 - variabile;
 let scala = 1;
 if (h1 > H - piede) scala = Math.max(.5, Math.min(1, (H - piede - fisso) / variabile));
 altezza(scala, true);

 scrivi(c, 'GRAND LINE CHRONICLES', W / 2, H - margine * .55, { font: (18 * u) + 'px Inter, sans-serif', colore: 'rgba(242,233,216,.5)', allinea: 'center', spaziatura: (4 * u) + 'px' });
 c.restore();
 cornice(c, W, H, raggio);
 return tela;
}

/* --- consegna --- */
function nomeFile(mossa, faccia) {
 const base = String(mossa.name || 'special-move').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
 return (base || 'special-move') + '-' + faccia + '.png';
}
function salva(tela, nome) {
 return new Promise(risolvi => {
  tela.toBlob(blob => {
   if (!blob) { risolvi(false); return; }
   const url = URL.createObjectURL(blob), a = document.createElement('a');
   a.href = url; a.download = nome;
   document.body.append(a); a.click(); a.remove();
   setTimeout(() => URL.revokeObjectURL(url), 4000);
   risolvi(true);
  }, 'image/png');
 });
}
/* La risoluzione segue l'illustrazione: più è grande, più grande esce la carta. */
async function misura(r) {
 const p = r.move.presentation || {};
 let W = 1500;
 if (p.artId && window.GLCMoves && GLCMoves.art) {
  const url = await GLCMoves.art(p.artId).catch(() => null);
  const img = await immagine(url);
  if (img) W = Math.min(3000, Math.max(1500, img.width));
 }
 return { W: Math.round(W), H: Math.round(W * 1.5) };
}
async function esporta(mossa, quali) {
 if (!window.GLCMoves || !GLCMoves.resolve) return false;
 const r = GLCMoves.resolve(mossa);
 try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
 const { W, H } = await misura(r);
 if (quali !== 'retro') await salva(await fronte(r, W, H), nomeFile(r.move, 'fronte'));
 if (quali !== 'fronte') await salva(await retro(r, W, H), nomeFile(r.move, 'retro'));
 return true;
}

window.GLCCardExport = Object.freeze({ esporta, fronte, retro, misura });
})();
