/* Special Moves: a read-only snapshot of the existing resolver, for the illustrated PDF.
 * No rules, resource consumption, character writes or media writes belong here.
 */
(function () {
'use strict';
const list = value => Array.isArray(value) ? value : [];
const text = value => value == null ? '' : String(value);
const copy = value => JSON.parse(JSON.stringify(value));
const STATUS = {ready:'Ricetta pronta',repair:'Da riparare',costs:'Costi da registrare',unavailable:'Risorse / stato insufficienti',refresh:'Dati di stampa da aggiornare'};
const KIND = {tech:'Tecnica',talent:'Talento',haki:'Haki',fruit:'Frutto del Diavolo',weapon:'Arma',module:'Modulo'};
const refreshNotice = 'Apri Azioni → Scheda illustrata (PDF) dalla gestione di questo pirata per aggiornare fonti, formule e costi delle Special Moves.';
const urls = new Set();

// A freshness check, not a game calculation. Ignore only the dashboard's large images.
function fingerprint(character) {
 const data = {...character};
 delete data.photo; delete data.sceneBackground;
 const json = JSON.stringify(data, (key, value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
   const sorted = {}; Object.keys(value).sort().forEach(k => {sorted[k] = value[k];}); return sorted;
  }
  return value;
 });
 let hash = 2166136261;
 for (let i = 0; i < json.length; i++) hash = Math.imul(hash ^ json.charCodeAt(i), 16777619);
 return json.length + ':' + (hash >>> 0).toString(16);
}
function cardIdentity(move = {}) {
 return {id:text(move.id),name:text(move.name)||'Special Move senza nome',notes:text(move.notes),presentation:copy(move.presentation || {})};
}
function unresolved(move, warning = refreshNotice) {
 return {...cardIdentity(move || {}),status:'refresh',baseName:'',sources:[],totals:null,rows:[],formulas:[],conditions:[],resources:[],pipByColor:[],warnings:[warning]};
}
function snapshot(character, owner) {
 const cards = list(character.specialMoves).map(input => {
  try {
   if (!window.GLCMoves) return unresolved(input);
   const r = window.GLCMoves.resolve(input), m = r.move;
   const rank = s => s.kind === 'fruit' ? 0 : s.kind === 'haki' ? 1 : s.kind === 'tech' ? 3 : s.kind === 'talent' ? 4 : 2;
   const order = [...new Set([...list(m.sequence), ...[...r.selected].sort((a,b) => rank(a)-rank(b)).map(s => s.id)])];
   const sources = order.map(id => r.selected.find(s => s.id === id)).filter(Boolean).map(s => ({
    id:s.id,kind:s.kind,name:s.name,subtitle:s.subtitle || '',description:s.desc || '',emblem:s.emblem || '',
    mode:s.meta?.mode || '',duration:s.kind === 'tech' ? s.raw.durata || '' : ''
   }));
   return {...cardIdentity(input || {}),presentation:copy(m.presentation),status:r.status,
    baseName:r.tech?.name || '',sources,
    totals:copy(r.totals),rows:copy(r.rows),formulas:copy(r.formulas),conditions:copy(r.conditions),resources:copy(r.resources),
    pipByColor:Object.entries(r.pipByColor).map(([id,cost]) => ({name:r.sources.find(s => s.id === id)?.name || id,cost})),
    warnings:[...r.errors.map(e => e.text),...r.unknown.map(s => s.name+': registra i costi approvati dal GM.'),...r.unavailable]
   };
  } catch (error) {
   // One damaged/imported recipe must not suppress other cards or the original sheet.
   return unresolved(input,'Impossibile preparare questa ricetta. Controlla la carta nella gestione del pirata e riapri la scheda PDF.');
  }
 });
 return {v:1,owner:text(owner),fingerprint:fingerprint(character),generatedAt:Date.now(),cards};
}
function ownerFromStorage() {
 try {
  const q = new URLSearchParams(location.search), ct = JSON.parse(localStorage.getItem('glc_pirata_v4') || 'null');
  if (q.has('blank') || !ct?.chars) return '';
  const requested = q.get('c') || q.get('id');
  return requested && ct.chars[requested] ? requested : ct.chars[ct.activeId] ? ct.activeId : Object.keys(ct.chars)[0] || '';
 } catch (error) {return '';}
}
function printable(character, payload) {
 const moves = list(character.specialMoves), pack = payload?.specialMoves, owner = ownerFromStorage();
 const fresh = pack?.v === 1 && owner && payload.charId === owner && pack.owner === owner && pack.fingerprint === fingerprint(character) &&
  Array.isArray(pack.cards) && pack.cards.length === moves.length && pack.cards.every((c,i) => c && c.id === text(moves[i]?.id));
 return {cards:fresh ? pack.cards : moves.map(m => unresolved(m)),generatedAt:fresh ? pack.generatedAt : null};
}
function node(tag, cls, value) {
 const el = document.createElement(tag); if (cls) el.className = cls;
 if (value != null) el.textContent = text(value); return el;
}
function section(parent, title) {
 const el = node('section','smp-section'); el.append(node('h3','',title)); parent.append(el); return el;
}
function paragraph(parent, value, cls = '') {if (value) parent.append(node('p',cls,value));}
function amount(value) {return value == null ? '—' : text(value);}
function bound(value, fallback, min, max) {
 const n = value == null || value === '' ? fallback : Number(value);
 return Math.max(min,Math.min(max,Number.isFinite(n) ? n : fallback));
}
function emblem(parent, card, tasks) {
 const sources = list(card.sources), selected = sources.find(s => s.id === card.presentation?.emblemId) || sources.find(s => s.kind === 'tech') || sources[0];
 const crest = node('span','smp-crest','✦'); crest.setAttribute('aria-hidden','true'); parent.append(crest);
 if (selected?.emblem && /^[a-z0-9_-]+$/i.test(selected.emblem)) {
  const img = node('img','smp-emblem'); img.alt = ''; crest.append(img);
  tasks.push(loadImage(img,'/img/icons/'+selected.emblem+'.png').then(ok => {if (ok) crest.classList.add('smp-crest-loaded');else img.remove();}));
 }
}
function buildCard(card, index, count, character, generatedAt, tasks) {
 const page = node('article','page smp-page');
 page.dataset.screenLabel = 'Special Move '+(index+1)+' — '+card.name;
 const header = node('header','smp-header');
 header.append(node('span','','Grand Line Chronicles'),node('span','','Special Moves · '+String(index+1).padStart(2,'0')+' / '+String(count).padStart(2,'0')));
 page.append(header);
 const identity = node('div','smp-identity'); emblem(identity,card,tasks);
 const titles = node('div','smp-titles');
 paragraph(titles,card.presentation?.subtitle,'smp-eyebrow');
 titles.append(node('h2','smp-title',card.name));
 paragraph(titles,(character.nome || 'Pirata senza nome')+(card.baseName ? ' · '+card.baseName : ''),'smp-owner');
 identity.append(titles); page.append(identity);
 if (card.presentation?.artId) {
  const art = node('figure','smp-art'), img = node('img','smp-art-image'), caption = node('figcaption','','Illustrazione in caricamento…');
  img.alt = 'Illustrazione di '+card.name;
  img.style.objectPosition = bound(card.presentation.x,50,0,100)+'% '+bound(card.presentation.y,50,0,100)+'%';
  img.style.transform = 'scale('+bound(card.presentation.zoom,1,1,2.5)+')';
  art.append(img,caption); page.append(art);
  tasks.push(readArt(card.presentation.artId).then(blob => {
   if (!blob || !/^image\/(png|jpeg|webp|gif)$/.test(blob.type)) return false;
   const url = URL.createObjectURL(blob); urls.add(url); return loadImage(img,url);
  }).catch(() => false).then(ok => {
   if (ok) {art.classList.add('smp-art-loaded');caption.remove();}
   else {img.remove();art.classList.add('smp-art-missing');caption.textContent = 'Illustrazione non disponibile su questo dispositivo. I dati della carta sono riportati qui sotto.';}
  }));
 }
 if (card.presentation?.quote) page.append(node('blockquote','smp-quote','“'+card.presentation.quote+'”'));
 const state = node('p','smp-state',STATUS[card.status] || STATUS.refresh);page.append(state);
 const budget = node('div','smp-budget');
 [['ST',card.totals?.st],['PIP',card.totals?.pip],['ST / turno',card.totals?.maintenanceST],['PIP / turno',card.totals?.maintenancePIP]].forEach(([label,value]) => {
  const cell = node('div','smp-budget-cell');cell.append(node('strong','',amount(value)),node('span','',label));budget.append(cell);
 });page.append(budget);
 if (list(card.warnings).length) {
  const warnings = section(page,'Avvertenze della ricetta');warnings.classList.add('smp-warnings');
  card.warnings.forEach(warning => paragraph(warnings,warning));
  if (!card.totals) paragraph(warnings,'Totali non disponibili: non considerarli pari a zero.');
 }
 if (list(card.formulas).length) {
  const formulas = section(page,'Risoluzione');card.formulas.forEach(f => {
   const block = node('div','smp-formula');block.append(node('h4','',f.label));paragraph(block,f.text);formulas.append(block);
  });
 }
 if (list(card.rows).length || list(card.resources).length) {
  const costs = section(page,'Composizione del costo');
  if (list(card.rows).length) {
   const table = node('table','smp-costs');
   const head = node('thead'), tr = node('tr');
   ['Fonte','ST','PIP','ST / turno','PIP / turno'].forEach(label => {const th = node('th','',label);th.scope='col';tr.append(th);});head.append(tr);table.append(head);
   const body = node('tbody');card.rows.forEach(row => {
    const line = node('tr');const name = node('th','',row.name);name.scope='row';line.append(name);
    [row.st,row.pip,row.maintenanceST,row.maintenancePIP].forEach(value => line.append(node('td','',amount(value))));body.append(line);
   });table.append(body);costs.append(table);
   card.rows.filter(row => row.note).forEach(row => paragraph(costs,row.name+': '+row.note,'smp-cost-note'));
  }
  list(card.pipByColor).forEach(pip => paragraph(costs,pip.name+': '+pip.cost+' PIP','smp-cost-note'));
  list(card.resources).forEach(r => paragraph(costs,r.name+': '+r.cost+(r.available != null ? ' / '+r.available+' disponibili' : '')+(r.text ? ' · '+r.text : ''),'smp-resource'));
 }
 if (list(card.sources).length) {
  const sequence = section(page,'Sequenza di esecuzione');
  paragraph(sequence,'L’ordine è un promemoria: tempi, reazioni e condizioni restano quelli delle fonti.','smp-hint');
  const ol = node('ol','smp-sequence');card.sources.forEach(s => {
   const item = node('li');item.append(node('h4','',s.name));
   paragraph(item,[KIND[s.kind] || s.kind,s.mode === 'active' ? 'Attivo' : s.mode === 'passive' ? 'Passivo' : '',s.subtitle,s.duration].filter(Boolean).join(' · '),'smp-source-meta');
   // Full talent/equipment descriptions are already included in resolver conditions.
   if (s.kind === 'tech' || s.kind === 'fruit') paragraph(item,s.description);
   ol.append(item);
  });sequence.append(ol);
 }
 if (list(card.conditions).length) {
  const conditions = section(page,'Effetti e condizioni');card.conditions.forEach(c => paragraph(conditions,c.text,'smp-condition'));
 }
 if (card.notes) paragraph(section(page,'Note personali'),card.notes,'smp-notes');
 const date = generatedAt ? new Date(generatedAt).toLocaleString('it-IT') : '';
 paragraph(page,(date ? 'Situazione al '+date+'. ' : '')+'Costi e disponibilità riflettono lo stato del personaggio al momento della preparazione. La stampa non consuma risorse.','smp-footer');
 return page;
}
function loadImage(img, src) {
 return new Promise(resolve => {
  let done = false;
  const finish = ok => {if (done) return;done=true;clearTimeout(timer);img.onload=null;img.onerror=null;resolve(ok);};
  const timer = setTimeout(() => finish(false),8000);
  img.onload = () => finish(true);img.onerror = () => finish(false);img.src = src;
  if (img.complete && img.naturalWidth) finish(true);
 });
}
function readArt(id) {
 // Only read an existing store: abort creation if no media database exists here.
 return new Promise(resolve => {
  if (!window.indexedDB) {resolve(null);return;}
  let done = false, db;
  const finish = value => {if (done) return;done=true;clearTimeout(timer);if (db) db.close();resolve(value || null);};
  const timer = setTimeout(() => finish(null),5000);
  try {
   const request = indexedDB.open('glc_special_move_media_v1',1);
   request.onupgradeneeded = () => {request.transaction.abort();finish(null);};
   request.onerror = request.onblocked = () => finish(null);
   request.onsuccess = () => {
    db = request.result;if (done) {db.close();return;}
    try {
     if (!db.objectStoreNames.contains('art')) {finish(null);return;}
     const tx = db.transaction('art','readonly'), get = tx.objectStore('art').get(id);
     get.onsuccess = () => finish(get.result);get.onerror = tx.onerror = tx.onabort = () => finish(null);
    } catch (error) {finish(null);}
   };
  } catch (error) {finish(null);}
 });
}
function fontsReady() {
 if (!document.fonts?.ready) return Promise.resolve();
 return new Promise(resolve => {
  const timer = setTimeout(resolve,5000);
  document.fonts.ready.then(() => {clearTimeout(timer);resolve();},() => {clearTimeout(timer);resolve();});
 });
}
async function render(character, payload) {
 if (!character || new URLSearchParams(location.search).has('blank')) return;
 // The host may ask for another preview; don't duplicate an appendix or retain old media.
 document.querySelectorAll('.smp-page,#smp-print-status').forEach(el => el.remove());
 urls.forEach(url => URL.revokeObjectURL(url));urls.clear();
 const {cards,generatedAt} = printable(character,payload);
 if (!cards.length) return;
 const parent = document.querySelector('.page')?.parentNode;if (!parent) return;
 const button = document.querySelector('.nb-print'), bar = document.querySelector('.noprint-bar');
 const status = node('span','smp-print-status','Preparazione Special Moves…');status.id='smp-print-status';status.setAttribute('role','status');bar?.append(status);
 if (button) button.disabled=true;
 try {
  const tasks = [];cards.forEach((card,index) => parent.append(buildCard(card,index,cards.length,character,generatedAt,tasks)));
  await Promise.allSettled([...tasks,fontsReady()]);
  const unavailableArt = document.querySelectorAll('.smp-art-missing').length;
  status.textContent = cards.length+' Special Move'+(cards.length === 1 ? '' : 's')+' incluse nel PDF'+(cards.some(c => c.status === 'refresh') ? ' · aggiorna i dati dalla gestione' : '')+(unavailableArt ? ' · '+unavailableArt+' illustrazioni non disponibili' : '');
 } catch (error) {
  status.textContent = 'Preparazione Special Moves incompleta. Riapri la scheda illustrata dalla gestione del pirata.';
 } finally {if (button) button.disabled=false;}
}
window.addEventListener('pagehide',event => {if (!event.persisted) {urls.forEach(url => URL.revokeObjectURL(url));urls.clear();}});
window.GLCPrintMoves = {snapshot,render,ready:Promise.resolve()};
})();
