/* Grand Line Chronicles · Vista carta
   «Guarda carta»: la Special Move arriva al centro dello schermo come una carta
   da gioco. Lo sfondo si sfoca, la carta si gira col dito o col mouse, e il
   retro porta gli effetti. Qui non si decide nulla: tutto viene da
   GLCMoves.resolve(), che resta l'unica fonte delle regole. */
(function () {
'use strict';

const lista = v => Array.isArray(v) ? v : [];
const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
let VISTA = null;

function el(tag, attr, figli) {
 const n = document.createElement(tag);
 Object.entries(attr || {}).forEach(([k, v]) => {
  if (v == null) return;
  if (k === 'text') n.textContent = v;
  else if (k === 'html') n.innerHTML = v;
  else n.setAttribute(k, v);
 });
 lista(figli).forEach(f => f && n.append(f));
 return n;
}
const nodo = (tag, cls, testo, figli) => el(tag, { class: cls || null, text: testo == null ? null : testo }, figli);

/* Lo stemma di una fonte, con gli stessi disegni del resto del sito. */
function stemma(s, grande) {
 const misura = grande ? 150 : 22;
 if (!s) return el('span', { html: window.svgIcon ? svgIcon('star', misura) : '' });
 if (s.emblem && window.emblem) return el('span', { html: emblem(s.emblem, misura) });
 if (s.kind === 'haki' && window.hakiIcon) return el('span', { html: hakiIcon(s.raw, misura) });
 return el('span', { html: window.svgIcon ? svgIcon(s.icon || 'star', misura) : '' });
}

/* Lo spessore del cartoncino: quattro bordi che chiudono il volume. */
function bordi(carta) {
 ['l', 'r', 't', 'b'].forEach(lato => carta.append(nodo('div', 'cvw-edge cvw-edge-' + lato)));
}

function fronte(r, carta) {
 const m = r.move, p = m.presentation || {};
 const faccia = nodo('div', 'cvw-face cvw-front');
 const arte = nodo('div', 'cvw-art');
 const crest = r.selected.find(s => s.id === p.emblemId) || r.tech || r.selected[0];
 arte.append(nodo('div', 'cvw-fallback', null, [stemma(crest, true)]));
 if (p.artId && window.GLCMoves && GLCMoves.art) {
  const img = el('img', { alt: '', decoding: 'async' });
  img.style.objectPosition = Math.max(0, Math.min(100, num(p.x, 50))) + '% ' + Math.max(0, Math.min(100, num(p.y, 50))) + '%';
  img.style.transform = 'scale(' + Math.max(1, Math.min(2.5, num(p.zoom, 1))) + ')';
  GLCMoves.art(p.artId).then(url => { if (url) { img.src = url; arte.append(img); } }).catch(() => {});
 }
 arte.append(nodo('div', 'cvw-veil'));
 faccia.append(arte);
 faccia.append(nodo('div', 'cvw-fin'));

 const dentro = nodo('div', 'cvw-front-in');
 dentro.append(nodo('div', 'cvw-edition', null, [nodo('span', '', 'Grand Line Chronicles'), nodo('span', '', 'Special Move')]));
 dentro.append(nodo('div', 'cvw-crest', null, [stemma(crest, false)]));
 const piede = nodo('div', 'cvw-front-foot');
 if (p.quote) piede.append(nodo('blockquote', 'cvw-quote', '“' + p.quote + '”'));
 if (p.subtitle) piede.append(nodo('span', 'cvw-eyebrow', p.subtitle));
 piede.append(nodo('h3', 'cvw-title', m.name || 'Special Move'));
 piede.append(nodo('div', 'cvw-sub', r.tech ? r.tech.name : 'Tecnica non collegata'));
 const testo = r.tech && r.tech.desc ? r.tech.desc : (m.notes || '');
 if (testo) piede.append(nodo('p', 'cvw-desc', testo));
 dentro.append(piede);
 faccia.append(dentro);
 carta.append(faccia);
}

function retro(r, carta) {
 const m = r.move;
 const faccia = nodo('div', 'cvw-face cvw-back');
 const dentro = nodo('div', 'cvw-back-in');
 dentro.append(nodo('h4', '', 'Costo'));
 const costi = nodo('div', 'cvw-cost');
 const t = r.totals || {};
 [['ST', t.st], ['PIP', t.pip], ['ST / turno', t.maintenanceST]].forEach(([etichetta, v]) => {
  costi.append(nodo('div', '', null, [nodo('strong', '', v == null ? '—' : String(v)), nodo('span', '', etichetta)]));
 });
 if (t.maintenancePIP) costi.append(nodo('div', '', null, [nodo('strong', '', String(t.maintenancePIP)), nodo('span', '', 'PIP / turno')]));
 dentro.append(costi);

 if (lista(r.formulas).length) {
  dentro.append(nodo('h4', '', 'Tiri'));
  r.formulas.forEach(f => dentro.append(nodo('div', 'cvw-line', null, [nodo('div', '', null, [nodo('b', '', f.label), nodo('p', '', f.text)])])));
 }

 const ordine = lista(r.move.sequence);
 const passi = lista(r.selected).slice().sort((a, b) => {
  const ia = ordine.indexOf(a.id), ib = ordine.indexOf(b.id);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
 });
 if (passi.length) {
  dentro.append(nodo('h4', '', 'Esecuzione'));
  passi.forEach((s, i) => {
   dentro.append(nodo('div', 'cvw-line', null, [
    nodo('span', 'cvw-n', String(i + 1).padStart(2, '0')),
    nodo('span', 'cvw-ico', null, [stemma(s, false)]),
    nodo('div', '', null, [nodo('b', '', s.name), nodo('p', '', s.subtitle || '')])
   ]));
  });
 }

 if (lista(r.conditions).length) {
  dentro.append(nodo('h4', '', 'Effetti e condizioni'));
  r.conditions.forEach(c => dentro.append(nodo('div', 'cvw-line', null, [nodo('div', '', null, [nodo('p', '', c.text)])])));
 }
 lista(r.errors).forEach(e => dentro.append(nodo('div', 'cvw-warn', '⚠ ' + e.text)));
 lista(r.unavailable).forEach(v => dentro.append(nodo('div', 'cvw-warn', '⚠ ' + v)));
 if (m.notes) { dentro.append(nodo('h4', '', 'Note')); dentro.append(nodo('div', 'cvw-line', null, [nodo('div', '', null, [nodo('p', '', m.notes)])])); }
 if (!dentro.querySelector('.cvw-line')) dentro.append(nodo('p', 'cvw-empty', 'Questa carta non ha ancora effetti da mostrare.'));
 faccia.append(dentro);
 faccia.append(nodo('div', 'cvw-fin'));
 carta.append(faccia);
}

/* La carta si manovra come un oggetto: si trascina per inclinarla, e il giro
   completo resta un gesto deciso (pulsante, doppio tocco o trascinata ampia). */
function manovra(carta, stato) {
 let giu = null;
 const posa = () => {
  carta.style.setProperty('--rx', stato.rx.toFixed(2) + 'deg');
  carta.style.setProperty('--ry', (stato.ry + (stato.girata ? 180 : 0)).toFixed(2) + 'deg');
  /* La luce si sposta con l'inclinazione: è questo che fa «brillare» il foil. */
  carta.style.setProperty('--gx', (50 + Math.max(-50, Math.min(50, stato.ry * 1.1))).toFixed(1));
  carta.style.setProperty('--gy', (50 - Math.max(-50, Math.min(50, stato.rx * 1.2))).toFixed(1));
  carta.style.setProperty('--ang', (115 + stato.ry * .9 - stato.rx * .6).toFixed(1));
 };
 stato.posa = posa;
 stato.gira = () => { stato.girata = !stato.girata; stato.rx = 0; stato.ry = 0; posa(); };
 posa();

 const punto = e => e.touches ? e.touches[0] : e;
 const inizio = e => {
  if (e.target.closest('.cvw-back-in') && stato.girata) return;   /* il retro si scorre */
  const p = punto(e);
  giu = { x: p.clientX, y: p.clientY, rx: stato.rx, ry: stato.ry, t: Date.now(), mosso: 0 };
  carta.classList.add('cvw-drag');
 };
 const muovi = e => {
  if (!giu) return;
  const p = punto(e);
  const dx = p.clientX - giu.x, dy = p.clientY - giu.y;
  giu.mosso = Math.max(giu.mosso, Math.abs(dx) + Math.abs(dy));
  stato.ry = giu.ry + dx * .45;
  stato.rx = Math.max(-42, Math.min(42, giu.rx - dy * .35));
  posa();
  if (e.cancelable) e.preventDefault();
 };
 const fine = () => {
  if (!giu) return;
  carta.classList.remove('cvw-drag');
  const giroCompleto = Math.abs(stato.ry) > 90;
  if (giroCompleto) stato.girata = !stato.girata;
  stato.rx = 0; stato.ry = 0;
  posa();
  const breve = Date.now() - giu.t < 260 && giu.mosso < 8;
  giu = null;
  if (breve) stato.gira();
 };
 carta.addEventListener('mousedown', inizio);
 window.addEventListener('mousemove', muovi);
 window.addEventListener('mouseup', fine);
 carta.addEventListener('touchstart', inizio, { passive: true });
 carta.addEventListener('touchmove', muovi, { passive: false });
 carta.addEventListener('touchend', fine);
 stato.stacca = () => { window.removeEventListener('mousemove', muovi); window.removeEventListener('mouseup', fine); };
}

function chiudi() {
 if (!VISTA) return;
 const v = VISTA; VISTA = null;
 v.stato.stacca && v.stato.stacca();
 v.stato.sensore && v.stato.sensore();
 document.removeEventListener('keydown', v.tasti, true);
 v.host.classList.remove('cvw-on');
 document.body.classList.remove('cvw-open');
 setTimeout(() => v.host.remove(), 260);
 if (v.tornaA && v.tornaA.isConnected) v.tornaA.focus();
}

function apri(mossa) {
 if (!window.GLCMoves || !GLCMoves.resolve) return false;
 const dato = typeof mossa === 'string' ? trovaPerId(mossa) : mossa;
 if (!dato) return false;
 chiudi();
 /* Se un'altra carta sta ancora sfumando, va tolta subito: due viste insieme
    confonderebbero tastiera e trascinamento. */
 document.querySelectorAll('#cvw').forEach(n => n.remove());
 const r = GLCMoves.resolve(dato);
 const tornaA = document.activeElement;

 const host = el('div', { id: 'cvw', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Carta: ' + (r.move.name || 'Special Move'), tabindex: '-1' });
 const carta = nodo('div', 'cvw-card');
 const finiture = ['foil', 'oro', 'prisma', 'stelle'];
 const scelta = (r.move.presentation || {}).finish;
 carta.setAttribute('data-fin', finiture.includes(scelta) ? scelta : 'none');
 const stato = { rx: 0, ry: 0, girata: false };

 const barra = nodo('div', 'cvw-bar');
 barra.append(nodo('span', 'cvw-name', r.move.name || 'Special Move'));
 const chiudiBtn = el('button', { class: 'cvw-btn', type: 'button', text: 'Chiudi ✕' });
 chiudiBtn.onclick = chiudi;
 barra.append(chiudiBtn);

 fronte(r, carta);
 retro(r, carta);
 bordi(carta);
 const tavolo = nodo('div', 'cvw-stage', null, [carta]);

 const giraBtn = el('button', { class: 'cvw-btn cvw-primary', type: 'button', text: 'Gira la carta ↻' });
 giraBtn.onclick = () => stato.gira();
 const attrezzi = nodo('div', 'cvw-tools', null, [giraBtn]);
 if (window.GLCCardExport) {
  const scarica = el('button', { class: 'cvw-btn', type: 'button', text: 'Scarica fronte e retro' });
  scarica.onclick = async () => {
   const etichetta = scarica.textContent;
   scarica.disabled = true; scarica.textContent = 'Preparo le immagini…';
   try { await GLCCardExport.esporta(dato, 'entrambi'); scarica.textContent = 'Scaricate ✓'; }
   catch (err) { scarica.textContent = 'Non riuscito'; }
   setTimeout(() => { scarica.disabled = false; scarica.textContent = etichetta; }, 2200);
  };
  attrezzi.append(scarica);
 }
 /* Sul telefono la carta può seguire l'inclinazione vera: si chiede il
    permesso solo quando è il giocatore a volerlo. */
 if (window.DeviceOrientationEvent && matchMedia('(pointer: coarse)').matches) {
  const tiltBtn = el('button', { class: 'cvw-btn', type: 'button', text: 'Inclina col telefono' });
  tiltBtn.onclick = async () => {
   try {
    const chiedi = DeviceOrientationEvent.requestPermission;
    if (typeof chiedi === 'function') { const esito = await chiedi(); if (esito !== 'granted') { tiltBtn.textContent = 'Permesso negato'; return; } }
    if (stato.sensore) { stato.sensore(); stato.sensore = null; tiltBtn.textContent = 'Inclina col telefono'; return; }
    const ascolta = e => {
     if (e.gamma == null && e.beta == null) return;
     stato.ry = Math.max(-30, Math.min(30, (e.gamma || 0) * .7));
     stato.rx = Math.max(-26, Math.min(26, ((e.beta || 0) - 45) * .5));
     stato.posa();
    };
    window.addEventListener('deviceorientation', ascolta);
    stato.sensore = () => window.removeEventListener('deviceorientation', ascolta);
    tiltBtn.textContent = 'Ferma l’inclinazione';
   } catch (err) { tiltBtn.textContent = 'Inclinazione non disponibile'; }
  };
  attrezzi.append(tiltBtn);
 }
 const piede = nodo('div', '', null, [
  attrezzi,
  nodo('p', 'cvw-hint', 'Trascina per inclinarla · tocca la carta o premi Spazio per girarla · Esc per chiudere')
 ]);

 host.append(barra, tavolo, piede);
 host.addEventListener('mousedown', e => { if (e.target === host) chiudi(); });
 document.body.append(host);
 document.body.classList.add('cvw-open');
 manovra(carta, stato);
 requestAnimationFrame(() => host.classList.add('cvw-on'));

 const tasti = e => {
  if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
  else if (e.key === ' ' || e.key === 'Enter') { if (e.target === host || e.target === carta) { e.preventDefault(); stato.gira(); } }
 };
 document.addEventListener('keydown', tasti, true);
 VISTA = { host, stato, tasti, tornaA };
 host.focus();
 return true;
}

function trovaPerId(id) {
 /* pg è dichiarato con let nella pagina: esiste come binding globale,
    ma non come proprietà di window. */
 try {
  const scheda = (typeof pg !== 'undefined') ? pg : null;
  return lista(scheda && scheda.specialMoves).find(m => m && m.id === id) || null;
 } catch (e) { return null; }
}

window.GLCCardView = Object.freeze({ open: apri, close: chiudi });
})();
