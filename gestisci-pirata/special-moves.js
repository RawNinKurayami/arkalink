/* Grand Line Chronicles · Special Moves
 * Recipes contain source IDs, selection state and presentation only.
 * The original builders and their persistence/consumption handlers are untouched.
 */
(function () {
'use strict';
const STEPS = ['Identità','Tecnica','Talenti','Poteri','Equipaggiamento','Ricetta','Carta'];
const copy = value => JSON.parse(JSON.stringify(value));
const list = value => Array.isArray(value) ? value : [];
const number = (v, fallback=0) => Number.isFinite(Number(v)) && v!=='' && v!=null ? Number(v) : fallback;
const clean = s => String(s || '').replace(/<[^>]*>/g,'');
const uniq = a => [...new Set(a)];
const uid = () => 'sm_'+(window.crypto?.randomUUID?.() || Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
let UI = null, refreshQueued = false;
const mediaURLs = new Map();

/* Explicit applicability metadata. Names below are immutable aliases on definitions,
 * not player-facing copies of rules. Costs and descriptions are read from live sources. */
const META = {};
function define(branch, names, mode, match, extra={}) {
 names.split('|').forEach(name => {META[branch+'|'+name] = {mode,match,...extra};});
}
define('Striker','Raffica — Base|Raffica — Migliorato|Raffica — Maestria','active','unarmed',{quantity:true});
define('Striker','Passo Fulmineo','active','physical');
define('Striker','Presa di Ferro','passive','grab');
define('Striker','Guardia del Combattente','active','defense');
define('Striker','Pressione Costante','passive','unarmed');
define('Striker','Slancio|Guardia Rotta','active','unarmed');
define('Striker','Contraccolpo','passive','counter');
define('Striker','Proiezione','active','grab');
define('Striker','Pugni che Rompono','passive','unarmed');
define('Crusher','Colpo Pesante — Base|Colpo Pesante — Migliorato|Colpo Pesante — Maestria','active','blunt');
define('Crusher','Piedi Piantati|Baricentro Assoluto','passive','physical');
define('Crusher','Demolitore','passive','blunt');
define('Crusher','Onda d’Urto|Onda d\'Urto|Rompiguardia','active','blunt');
define('Crusher','Contrappeso','active','defense');
define('Crusher','Impatto a Catena','passive','shock');
define('Crusher','Contraccolpo','passive','counter');
define('Swordsman','Più Spade — Base','passive','blade');
define('Swordsman','Postura Imperturbabile','active','physical');
define('Swordsman','Parata Perfetta','active','parry');
define('Swordsman','Taglio Netto|Fendente d’Aria|Fendente d\'Aria|Affilatura|Sguainata Fulminea','active','blade');
define('Swordsman','Più Spade — Migliorato|Più Spade — Maestria','active','twoBlades');
define('Swordsman','Contraccolpo','passive','counter');
define('Swordsman','Riposta','active','counter');
define('Swordsman','Lama Indistruttibile','passive','parry');
define('Sniper','Tiro Lungo — Base|Tiro Lungo — Migliorato|Tiro Lungo — Maestria|Occhio Fermo|Occhio del Falco','passive','ranged');
define('Sniper','Appostamento|Colpo Mirato|Colpo Impossibile|Respiro Trattenuto|Colpo Anticipato|Tiro di Copertura|Ricarica Rapida|Tiro dall\'Ombra','active','ranged');
define('Infermeria','Punti di Pressione','active','melee');
define('Tossicologo','Lama Intinta','active','attack');
define('Tossicologo','Tossine Raffinate — Base|Tossine Raffinate — Migliorato|Tossine Raffinate — Maestria','passive','poison');
define('Tossicologo','Colpo di Grazia','passive','attack');
define('Navigatore','Sfruttare la Tempesta','passive','any');
define('Navigatore','Via di Fuga','passive','move');
define('Carpentiere','Punto di Rottura','passive','attack');
define('Musicista','Musica Incrollabile|Contrappunto — Base|Contrappunto — Migliorato|Contrappunto — Maestria|Fiato Lungo|Requiem|Il Canto che Resta|Coro della Ciurma','passive','song');
define('Musicista','Suonare per i Caduti','active','song');
define('Paramecia','Potere Versatile|Dono Passivo|Seconda Natura','passive','any');
define('Paramecia','Doppio Uso|Potere Istintivo','active','fruit');
define('Paramecia','Ciò che Resta|Nessuno dei Miei|Marchio Duraturo|Portata Naturale|Senza Contraccolpo','passive','fruit');
define('Paramecia','Forma di Combattimento','active','any',{gm:true});
define('Paramecia','Risveglio','active','fruit',{gm:true,noCard:true});
define('Logia','Sentire l’Elemento|Sentire l\'Elemento|Corpo Diffuso','passive','any');
define('Logia','Corpo Elementale','passive','move');
define('Logia','Sempre in Forma|Assorbire|Reintegrazione|Chi Ti Tocca','passive','defense');
define('Logia','Elemento Onnipresente|Dominio dell’Elemento|Dominio dell\'Elemento|Fonte Inesauribile','passive','fruit');
define('Logia','Forma Perduta','active','move');
define('Logia','Risveglio','active','fruit',{noCard:true});
define('Zoan','Forma Ibrida','active','physical');
define('Zoan','Tre Forme','active','physical');
define('Zoan','Artigli e Zanne|Stazza|Ferocia Crescente','passive','melee');
define('Zoan','Corsa Bestiale','passive','move');
define('Zoan','Resistenza Bestiale','passive','defense');
define('Zoan','Zoan Mitologico / Ancestrale','passive','fruit');
define('Zoan','Istinto di Sopravvivenza|Trasformazione Istintiva','active','defense');
define('Zoan','Risveglio','active','physical',{noCard:true});

/* A talent that costs no ST is passive: only talents that spend Stamina take the active slot.
 * GM-priced talents keep their mode, since their cost is decided at the table.
 * Risveglio stays active but never enters a card (noCard). */
function talentST(desc) {
 const n=String(desc||'').match(/(?:spend\w*\s+|\+|,\s*)(\d+)\s*(?:ST|Stamina)\b/i)||String(desc||'').match(/\b(\d+)\s+ST\b/);
 return n?+n[1]:0;
}
function talentMeta(meta, desc) {
 return meta&&meta.mode==='active'&&!meta.gm&&!meta.noCard&&!talentST(desc)?{...meta,mode:'passive'}:meta;
}

function transaction(change, owner=CT.activeId) {
 if(owner!==CT.activeId || !CT.chars[owner]) throw Error('Il personaggio attivo è cambiato. Riapri la carta sul suo proprietario.');
 const next=copy(pg), state=copy(CT);change(next);state.chars[owner]=next;
 // Write first. A failed write cannot erase portraits or mutate in-memory data.
 localStorage.setItem(KEY,JSON.stringify(state));
 pg=next;CT=state;
 return next;
}
function ensureReferences() {
 const needs=['t1','t2'].some(k=>pg[k]?.nome&&!pg[k].smcId) || list(pg.haki).some(h=>!h.smcId);
 if(needs)transaction(p=>{
  ['t1','t2'].forEach(k=>{if(p[k]?.nome&&!p[k].smcId)p[k].smcId=uid();});
  list(p.haki).forEach(h=>{if(!h.smcId)h.smcId=uid();});
 });
}
function sourceIcon(s,size=24) {
 if(!s)return svgIcon('star',size);
 if(s.kind==='haki')return hakiIcon(s.raw,size);
 if(s.emblem)return emblem(s.emblem,size);
 return svgIcon(s.icon||'star',size);
}
function sourceTech(t,id,kind='built') {
 return {id,kind:'tech',techKind:kind,name:t.nome||'Tecnica senza nome',raw:t,
  desc:t.desc||'',icon:FORMA_ICO[t.forma]||'burst',emblem:t.fonte==='Frutto'?'frutto':STYLE_IMG[t.stile],
  subtitle:[t.fonte,t.stile||t.fruitType,t.forma,t.die].filter(Boolean).join(' · ')};
}
function sources() {
 const out=[];
 list(pg.extraTech).forEach(t=>{if(t?.id)out.push(sourceTech(t,'tech:'+t.id));});
 ['t1','t2'].forEach(k=>{const t=pg[k];if(t?.nome)out.push(sourceTech(t,'tech:'+(t.smcId||k),'legacy'));});
 const r=race();if(r)out.push(sourceTech({nome:r.tech,desc:r.techDesc,die:pg.racialDie,attr:'',fonte:'Razziale',eff:[]},'racial:'+r.id,'racial'));
 const scan=(role,style,slot)=>{
  const T=TALENTS[role];if(!T)return;const branch=T.multi?(style||Object.keys(T.styles)[0]):Object.keys(T.styles)[0];
  if(!styleVisible(branch))return;
  const tree=T.styles[branch];if(!tree)return;
  const prefix=role+' · '+(T.multi?branch:role)+' · ', owned=n=>list(pg.talents).includes(prefix+n);
  tree.talenti.forEach(t=>{
   const alias=t.smcAlias||t.n, meta=talentMeta(t.smc||META[branch+'|'+alias],t.d);
   const reqDef=tree.talenti.find(x=>x.n===t.req||x.smcAlias===t.req);
   const unlocked=dieRank(roleSkillDieOf(role,style,slot))>=dieRank(t.tier||'d8')&&(!t.req||owned(t.req)||(reqDef&&owned(reqDef.n)));
   if(meta?.noCard)return;
   if(owned(t.n)||owned(alias))out.push({id:t.smcId,kind:'talent',name:t.n,alias,raw:t,meta,branch,unlocked,desc:t.d,icon:talentGlyph(t.n,STYLE_ICON[branch]||'star'),emblem:STYLE_IMG[branch]||ROLE_IMG[role],subtitle:branch+' · '+t.tier});
  });
 };
 scan(pg.role,pg.style,1);scan(pg.role2,pg.style2,2);
 if(pg.frutto?.has){const f=pg.frutto;
  out.push({id:'fruit:'+f.tipo,kind:'fruit',name:f.nome||f.tipo||'Frutto del Diavolo',raw:f,desc:f.desc||'',emblem:'frutto',subtitle:f.tipo+' · '+f.die});
  const tree=FRUIT_TALENTS[f.tipo];if(tree)tree.talenti.forEach(t=>{
   const alias=t.smcAlias||t.n,prefix='Frutto · '+f.tipo+' · ',owned=n=>list(pg.talents).includes(prefix+n);
   if((t.smc||META[f.tipo+'|'+alias])?.noCard)return;
   if(owned(t.n)||owned(alias))out.push({id:t.smcId,kind:'talent',fruit:true,name:t.n,alias,raw:t,meta:talentMeta(t.smc||META[f.tipo+'|'+alias],t.d),branch:f.tipo,unlocked:dieRank(f.die)>=dieRank(t.tier||'d4')&&(!t.req||owned(t.req)),desc:t.d,icon:'fruit',emblem:'frutto',subtitle:f.tipo+' · '+t.tier});
  });
 }
 list(pg.haki).forEach(h=>{if(h&&hakiUnlocked(h).length)out.push({id:'haki:'+(h.smcId||h.name)+':'+HAKI_NAMES.indexOf(h.name),kind:'haki',name:h.name,raw:h,desc:'',icon:h.name===HAKI_NAMES[0]?'fist':h.name===HAKI_NAMES[1]?'eye':'crown',subtitle:hakiGrade(h)});});
 list(pg.armi).forEach(a=>out.push({id:'weapon:'+a.id,kind:'weapon',name:a.nome||'Arma senza nome',raw:a,icon:WEAPON_ICO[a.tipo]||'sword',desc:a.eff?.desc||'',subtitle:a.tipo+' · '+a.grado}));
 list(pg.moduli).forEach(m=>out.push({id:'module:'+m.id,kind:'module',name:m.nome||'Modulo senza nome',raw:m,icon:'gear',desc:[m.funzione,m.eff?.testo,m.eff?.cond,m.eff?.limiti,m.effLegacy].filter(Boolean).join('\n'),subtitle:modStateLabel(m).t||m.stato}));
 return out.filter((s,i,a)=>s.id&&a.findIndex(x=>x.id===s.id)===i);
}
const findSource=(id,ss=sources())=>ss.find(s=>s.id===id);
const hasEffect=(t,n)=>list(t?.eff).includes(n);
const isAttack=t=>['Singolo','Area'].includes(t?.forma);
const isMelee=t=>isAttack(t)&&t.stile!=='Sniper'&&t.forma!=='Area';
const isDefense=t=>t?.forma==='Difesa';
const isPhysical=t=>t?.fonte==='Stile'&&t?.forma!=='Canzone';
function applicable(s,tech,move={}) {
 const t=tech?.raw;if(!t||!s?.meta||!s.unlocked)return false;
 const m=s.meta.match;
 if(s.kind==='talent'&&!s.fruit&&['Striker','Crusher','Swordsman','Sniper'].includes(s.branch)&&t.stile!==s.branch)return false;
 const active=findSource(move.activeTalentId),an=active?.alias;
 return ({any:true,attack:isAttack(t),physical:isPhysical(t)||t.fruitType==='Zoan',
  unarmed:t.stile==='Striker'&&isAttack(t),blunt:t.stile==='Crusher'&&isAttack(t),
  blade:t.stile==='Swordsman'&&isMelee(t),ranged:t.stile==='Sniper'&&isAttack(t),
  melee:isMelee(t),move:t.forma==='Spostamento'||hasEffect(t,'Scatto')||hasEffect(t,'Inseguire'),
  grab:hasEffect(t,'Presa')||hasEffect(t,'Proiezione'),counter:hasEffect(t,'Contrattacco'),
  parry:hasEffect(t,'Parata'),defense:isDefense(t),song:t.forma==='Canzone',fruit:t.fonte==='Frutto',
  poison:hasEffect(t,'Veleno')||an==='Lama Intinta',shock:/^Onda d['’]Urto$/.test(an||''),
  twoBlades:t.stile==='Swordsman'&&isAttack(t)&&list(pg.armi).filter(a=>a.tipo==='Lama').length>=2
 })[m]===true;
}
function compatibleEquipment(s,tech,ignoreState=false) {
 const t=tech?.raw;if(!t||t.fonte!=='Stile'||t.forma==='Canzone')return false;
 if(s.kind==='weapon')return t.stile!=='Striker'&&weaponCompat(s.raw).s==='ok'&&weaponStyleReq(s.raw)===t.stile;
 if(s.kind==='module')return moduliVisibili() && !(t.stile==='Striker'&&s.raw.arma) &&
  (!s.raw.eff?.tgt||hasEffect(t,s.raw.eff.tgt)) &&
  (ignoreState||(s.raw.stato!=='danneggiato'&&pg.moduloAttivo===s.raw.id));
 return false;
}
function techniqueProblems(s) {
 if(!s||s.kind!=='tech')return ['Scegli una Tecnica esistente.'];
 if(s.techKind!=='built')return [];
 // Reuse the existing validator on a temporary draft, restoring BOTH globals.
 const beforeT=TBUILD,beforeD=SMBD;let checked,D;
 try {TBUILD=copy(s.raw);D=tbCompute();checked=copy(TBUILD);} finally {TBUILD=beforeT;SMBD=beforeD;}
 const errors=[];
 if(D.stato.s!=='ok')errors.push(clean(D.stato.m));
 ['fonte','forma','die'].forEach(k=>{if(checked[k]!==s.raw[k])errors.push('La Tecnica non rispetta più il valore di '+k+' nella scheda.');});
 if(s.raw.fonte==='Stile'&&s.raw.forma!=='Canzone'&&checked.stile!==s.raw.stile)errors.push('Lo Stile della Tecnica non è più disponibile.');
 if(JSON.stringify(checked.eff)!==JSON.stringify(s.raw.eff||[]))errors.push('Uno o più effetti della Tecnica non sono più compatibili con dado, forma o Stile.');
 if(!pg.attr?.[s.raw.attr])errors.push('Manca il dado dell’Attributo della Tecnica.');
 if(s.raw.fonte==='Frutto'&&s.raw.fruitType!==pg.frutto?.tipo)errors.push('La Tecnica appartiene a un altro Frutto.');
 return uniq(errors);
}
function hakiState(s) {
 const max=hakiPipAxis(s.raw)?hakiPipOf(s.raw):Math.min(hakiPip(s.raw.die),HAKI_PROG[s.name]?.max||5);
 const v=pg.specialMoveSession?.haki?.[s.id]||{};
 return {active:v.active===true,pipRemaining:Math.max(0,Math.min(max,number(v.pipRemaining,max))),turns:Math.max(0,number(v.turns,0)),max};
}
function hakiEffects(s,tech) {
 const t=tech?.raw;
 return hakiUnlocked(s.raw).flatMap(row=>{
  const key=String(row.k),a=[];
  if(row.pass)a.push({id:'pass:'+key,mode:'passive',name:row.liv+' · '+key,desc:row.pass,cost:0,row});
  if(row.act){let ok=true;
   if(s.name===HAKI_NAMES[0])ok=key==='d8'?isDefense(t):isAttack(t);
   if(s.name===HAKI_NAMES[1]&&key==='d8')ok=hasEffect(t,'Contrattacco');
   if(s.name===HAKI_NAMES[1]&&key==='d12')ok=isDefense(t);
   if(s.name===HAKI_NAMES[2]&&key==='3')ok=isAttack(t)&&isPhysical(t);
   if(ok)a.push({id:'act:'+key,mode:'active',name:row.act.split(':')[0],desc:row.act,cost:row.cost||0,row});
  }return a;
 });
}
function costFields(v) {
 if(!v||!['st','pip','maintenanceST','maintenancePIP','resource'].every(k=>Number.isInteger(v[k])&&v[k]>=0&&v[k]<=999))return null;
 if((v.pip||v.maintenancePIP)&&!v.pipSourceId)return null;
 return v;
}
function costBasis(s) {
 const value=JSON.stringify(s.kind==='module'?[s.raw.eff,s.raw.effLegacy,s.raw.fuel?.on,s.raw.fuel?.consumo]:s.kind==='weapon'?s.raw.eff:s.desc);
 let hash=2166136261;for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
 return 'v1:'+ (hash>>>0).toString(16);
}
function recordsDiscount(s) {
 const e=s.raw.eff;return ['weapon','module'].includes(s.kind)&&e?.cat==='Sconto'&&/\b(?:ST|Stamina)\b/i.test(e.desc||e.testo||'');
}
function requiresGM(s) {
 if(s.kind==='tech')return s.techKind!=='built' && !(s.techKind==='racial'&&pg.race==='umano');
 if(s.kind==='talent')return !!s.meta?.gm;
 if(s.kind==='weapon')return !!s.raw.eff&&(s.raw.eff.prezzo!=='Nessuno'||s.raw.eff.cat==='Sconto');
 if(s.kind==='module')return !!(s.raw.eff?.testo||s.raw.effLegacy||s.raw.fuel?.on);
 return false;
}
function sourceCost(s) {
 if(requiresGM(s)){
  const stored=pg.specialMoveSourceCosts?.[s.id],c=costFields(stored);
  if(!c||stored.basis!==costBasis(s))return null;
  if(recordsDiscount(s)&&!['discountST','minimumST'].every(k=>Number.isInteger(c[k])&&c[k]>=0&&c[k]<=999))return null;
  return c;
 }
 const c={st:0,pip:0,maintenanceST:0,maintenancePIP:0,resource:0};
 if(s.kind==='tech'&&s.techKind==='built'){const v=tecCost(s.raw);c.st=v.st;c.maintenanceST=v.pt;}
 if(s.kind==='talent'&&s.meta?.mode==='active'){
  c.st=talentST(s.desc);
 }
 return c;
}
function noCardIds() {
 const ids=new Set();
 Object.entries(FRUIT_TALENTS).forEach(([tipo,tree])=>list(tree?.talenti).forEach(t=>{if((t.smc||META[tipo+'|'+(t.smcAlias||t.n)])?.noCard)ids.add(t.smcId);}));
 return ids;
}
function normalizeMove(m={}) {
 if(!m||typeof m!=='object')m={};
 // Cards saved while a 0 ST talent was still active keep it, now among the passive ones.
 if(m.activeTalentId&&findSource(m.activeTalentId,sources())?.meta?.mode==='passive')
  m={...m,passiveTalentIds:[...list(m.passiveTalentIds),m.activeTalentId],activeTalentId:''};
 // Talents that can never enter a card (Risveglio) are dropped from cards saved earlier.
 const barred=noCardIds();
 if(barred.has(m.activeTalentId)||list(m.passiveTalentIds).some(id=>barred.has(id)))
  m={...m,activeTalentId:barred.has(m.activeTalentId)?'':m.activeTalentId,passiveTalentIds:list(m.passiveTalentIds).filter(id=>!barred.has(id))};
 return {id:m.id||uid(),name:String(m.name||''),baseTechId:m.baseTechId||'',activeTalentId:m.activeTalentId||'',
  passiveTalentIds:uniq(list(m.passiveTalentIds)),hakiSelections:list(m.hakiSelections).map(h=>({id:h.id,use:h.use||'offense',effects:uniq(list(h.effects))})),
  fruitSelections:uniq(list(m.fruitSelections)),weaponId:m.weaponId||'',moduleId:m.moduleId||'',
  talentUses:m.talentUses||{},conditions:m.conditions||{},sequence:uniq(list(m.sequence)),
  presentation:{subtitle:'',quote:'',quoteZone:'bottom',variant:'dossier',finish:'none',zoom:1,x:50,y:50,...m.presentation},notes:String(m.notes||'')};
}
function selectedIDs(m) {return uniq([m.baseTechId,m.activeTalentId,...list(m.passiveTalentIds),...list(m.fruitSelections),...list(m.hakiSelections).map(h=>h.id),m.weaponId,m.moduleId].filter(Boolean));}
function resolve(input) {
 const m=normalizeMove(input),ss=sources(),tech=findSource(m.baseTechId,ss),t=tech?.raw;
 const errors=[],unavailable=[],unknown=[],rows=[],conditions=[],formulas=[],resources=[];
 const selected=selectedIDs(m).map(id=>findSource(id,ss)).filter(Boolean);
 selectedIDs(m).forEach(id=>{if(!findSource(id,ss))errors.push({id,text:'Fonte non più presente · '+id});});
 techniqueProblems(tech).forEach(text=>errors.push({id:m.baseTechId,text}));
 let st=0,pip=0,maintenanceST=0,maintenancePIP=0;const pipByColor={};
 const talentSelected=selected.filter(s=>s.kind==='talent');
 if(talentSelected.filter(s=>s.meta?.mode==='active').length>1)errors.push({text:'La carta contiene più di un Talento attivo.'});
 talentSelected.forEach(s=>{if(!applicable(s,tech,m))errors.push({id:s.id,text:s.name+': non più acquisito, sbloccato o compatibile.'});
  if(s.meta?.mode==='active'&&s.id!==m.activeTalentId)errors.push({id:s.id,text:s.name+': deve occupare lo slot del Talento attivo.'});
  if(s.meta?.mode==='passive'&&s.id===m.activeTalentId)errors.push({id:s.id,text:s.name+': è un Talento passivo.'});
 });
 if(m.weaponId&&m.moduleId)errors.push({text:'Una Tecnica usa un’arma oppure un modulo, mai entrambi.'});
 selected.filter(s=>['weapon','module'].includes(s.kind)).forEach(s=>{
  if(!compatibleEquipment(s,tech,true))errors.push({id:s.id,text:s.name+': esecutore incompatibile con la Tecnica.'});
  if(s.kind==='module' && (s.raw.stato==='danneggiato'||pg.moduloAttivo!==s.raw.id))unavailable.push(s.name+': '+(s.raw.stato==='danneggiato'?'danneggiato':'inattivo · attivalo dalla scheda del modulo'));
 });
 const aliases=talentSelected.map(s=>s.alias),owns=n=>aliases.includes(n);
 selected.filter(s=>s.kind!=='haki'&&s.kind!=='fruit').forEach(s=>{
  let c=sourceCost(s);if(!c){unknown.push(s);return;}c={...c};
  const notes=[];
  if(s.kind==='talent'&&s.meta?.quantity){const max=s.alias.includes('Maestria')?3:s.alias.includes('Migliorato')?2:1;const q=Math.max(1,Math.min(max,number(m.talentUses[s.id],1)));c.st*=q;notes.push(q+' attacch'+(q===1?'o':'i')+' base extra · 1×/turno');}
  if(s===tech&&s.techKind==='built'){
   let raw=list(t.eff).reduce((sum,n)=>sum+(tecEffObj(n)?.[4]||0),0)+(TEC_DUR.find(d=>d[0]===t.durata)?.[1]||0);
   if(t.fonte==='Frutto'){
    if(owns('Nessuno dei Miei')&&hasEffect(t,'Occhio del Ciclone')){raw-=tecEffObj('Occhio del Ciclone')[4];notes.push('Occhio del Ciclone gratuito');}
    if(owns('Marchio Duraturo')&&hasEffect(t,'Marchio Esplosivo')){raw-=Math.max(0,tecEffObj('Marchio Esplosivo')[4]-1);notes.push('Marchio: 1 ST');}
    if(owns('Portata Naturale')){raw-=list(t.eff).filter(n=>tecEffObj(n)?.[6]==='gittata').reduce((v,n)=>v+tecEffObj(n)[4],0);if(hasEffect(t,'Catena'))raw-=1;notes.push('Sconti di Portata Naturale');}
   }
   c.st=Math.max(1,raw);
   if(t.forma==='Canzone'&&owns('Fiato Lungo')){c.st=Math.max(1,c.st-1);notes.push('Fiato Lungo: −1, minimo 1');}
   if(t.forma==='Canzone'&&owns('Contrappunto — Maestria')){c.maintenanceST=0;notes.push('Contrappunto: mantenimento gratuito');}
   if(t.fonte==='Frutto'&&owns('Senza Contraccolpo')){c.st=Math.max(1,c.st-1);notes.push('Senza Contraccolpo: −1, minimo 1');}
   if(t.fonte==='Frutto'&&owns('Ciò che Resta')){if(t.durata==='Mantieni (+1/turno)')conditions.push({id:s.id,text:'Ciò che Resta: primo turno di mantenimento gratuito; poi '+c.maintenanceST+' ST/turno.'});if(t.durata==='Un turno')conditions.push({id:s.id,text:'Ciò che Resta: durata 3 turni senza sovrapprezzo.'});}
   if(t.fonte==='Frutto'&&owns('Fonte Inesauribile')){if(m.conditions.elementSource){c.st=0;c.maintenanceST=0;notes.push('Fonte Inesauribile: condizione dichiarata');}else conditions.push({id:s.id,text:'Fonte Inesauribile: costo 0 ST solo dentro o a ridosso di una grande fonte del tuo elemento.'});}
   const logiaAwake=talentSelected.some(x=>x.branch==='Logia'&&x.alias==='Risveglio');
   if(t.fonte==='Frutto'&&logiaAwake){c.st=0;c.maintenanceST=0;notes.push('Risveglio Logia: entro 50 m, per la scena');}
  }
  if(c.pip||c.maintenancePIP){const hs=findSource(c.pipSourceId,ss);if(!hs||hs.kind!=='haki'){unknown.push(s);return;}pipByColor[hs.id]=(pipByColor[hs.id]||0)+c.pip;}
  st+=c.st;pip+=c.pip;maintenanceST+=c.maintenanceST;maintenancePIP+=c.maintenancePIP;
  rows.push({id:s.id,name:s.name,...c,note:notes.join(' · ')});
  if(s.kind==='module'&&s.raw.fuel?.on){const f=s.raw.fuel;resources.push({id:s.id,name:f.tipo||'Risorsa modulo',cost:c.resource,available:number(f.cur),text:clean(f.consumo||'')});if(number(f.cur)<c.resource)unavailable.push(s.name+': '+(f.tipo||'risorse')+' insufficienti.');}
  if(s.kind==='weapon'&&s.raw.eff?.prezzo==='Una carica')resources.push({id:s.id,name:'Carica arma',cost:1,available:null,text:'Gestisci il consumo nella scheda dell’arma.'});
 });
 const techniqueRow=rows.find(row=>row.id===m.baseTechId);
 rows.filter(row=>row.discountST>0).forEach(row=>{
  if(!techniqueRow)return;
  const before=techniqueRow.st;techniqueRow.st=Math.max(row.minimumST,techniqueRow.st-row.discountST);
  st+=techniqueRow.st-before;techniqueRow.note+=(techniqueRow.note?' · ':'')+row.name+': −'+row.discountST+' ST, minimo '+row.minimumST;
 });
 m.hakiSelections.forEach(hsel=>{
  const s=findSource(hsel.id,ss);if(!s||s.kind!=='haki')return;
  const h=s.raw,session=hakiState(s),fx=hakiEffects(s,tech),chosen=[];
  list(hsel.effects).forEach(id=>{const e=fx.find(x=>x.id===id);if(e)chosen.push(e);else errors.push({id:s.id,text:s.name+': effetto non più sbloccato o compatibile ('+id+').'});});
  if(s.name===HAKI_NAMES[0]&&(!['offense','defense'].includes(hsel.use)||(hsel.use==='offense'&&!isAttack(t))||(hsel.use==='defense'&&!isDefense(t))))errors.push({id:s.id,text:'Armamento: scegli un impiego coerente con la forma della Tecnica.'});
  const activation=session.active?0:1,effectCost=chosen.reduce((sum,e)=>sum+e.cost,0),free=s.name===HAKI_NAMES[0]&&dieRank(h.die)>=dieRank('d12');
  const ongoing=free&&(!session.active||session.turns<3)?0:1;
  pip+=activation+effectCost;pipByColor[s.id]=(pipByColor[s.id]||0)+activation+effectCost;maintenanceST+=ongoing;
  rows.push({id:s.id,name:s.name,st:0,pip:activation+effectCost,maintenanceST:ongoing,maintenancePIP:0,note:(session.active?'Già attivo: 0 PIP di attivazione':'Da attivare: 1 PIP')+(effectCost?' + '+effectCost+' PIP effetti':'')+(free?' · 3 tuoi turni gratuiti, poi 1 ST/turno':'')});
  if(!session.active)conditions.push({id:s.id,text:'Attiva '+s.name+' prima di applicarne i benefici: il costo di attivazione è incluso.'});
  chosen.forEach(e=>conditions.push({id:s.id,text:e.desc}));
 });
 Object.entries(pipByColor).forEach(([id,n])=>{const s=findSource(id,ss);if(s&&hakiState(s).pipRemaining<n)unavailable.push(s.name+': servono '+n+' PIP, disponibili '+hakiState(s).pipRemaining+'.');});
 if(number(pg.stCur,6)<st)unavailable.push('Stamina: servono '+st+' ST, disponibili '+number(pg.stCur,6)+'.');
 if(tech){
  const attr=pg.attr?.[t.attr],roll=(attr||'Attributo da definire')+' '+(t.attr||'')+' + '+t.die+' Tecnica';
  const arm=m.hakiSelections.find(x=>findSource(x.id,ss)?.name===HAKI_NAMES[0]);
  const armSource=arm&&findSource(arm.id,ss),armTerm=armSource?armSource.raw.die+' Armamento':'';
  const obs=m.hakiSelections.find(x=>findSource(x.id,ss)?.name===HAKI_NAMES[1]&&x.effects.includes('act:d8'));
  if(isAttack(t)){
   formulas.push({label:'Per colpire',text:roll,id:tech.id});
   const terms=[t.die+' Tecnica'];
   list(t.eff).forEach(n=>{const e=n.match(/^\+1(d\d+) Dado Danno$/);if(e)terms.push(e[1]+' '+n);});
   if(arm?.use==='offense')terms.push(armTerm);
   const crush=talentSelected.find(s=>s.branch==='Crusher'&&s.alias.startsWith('Colpo Pesante'));
   if(crush)terms.push((crush.alias.includes('Maestria')?'2 × ':'')+t.die+' '+crush.name);
   let damage=terms.join(' + ');
   if(hasEffect(t,'Sovraccarico'))damage='2 × ('+damage+') · Sovraccarico';
   if(hasEffect(t,'Colpo Annientante'))damage='3 × ('+damage+') · Colpo Annientante';
   if(owns("Fendente d'Aria"))damage='⌈('+damage+') / 2⌉ · Fendente d’Aria';
   formulas.push({label:owns('Colpo Mirato')?'Colpo Mirato':'Danno · fonti',text:owns('Colpo Mirato')?'Effetto mirato al posto del danno. Soglia +2.':damage,id:tech.id});
   const conditional=(label,text,id=tech.id)=>formulas.push({label,text,id});
   if(hasEffect(t,'Carica'))conditional('Carica · condizionale','2 × Dadi Danno, Vantaggio, ignora copertura · al prossimo turno, solo se non vieni colpito.');
   if(hasEffect(t,'Tutto o Niente'))conditional('Tutto o Niente · colpo pulito','3 × danno solo sul +4. Se manchi non puoi difenderti dal prossimo attacco.');
   if(hasEffect(t,'Esecuzione'))conditional('Esecuzione · Quasi Morto','+ '+t.die+' Esecuzione, solo contro un bersaglio Quasi Morto.');
   if(hasEffect(t,'Schianto'))conditional('Schianto · collisione','+ d8 Schianto, solo se il bersaglio urta qualcosa o qualcuno.');
   if(hasEffect(t,'Colpo Pesante'))conditional('Colpo Pesante · minimo','Il danno non scende sotto metà del dado.');
   if(owns('Colpo di Grazia'))conditional('Colpo di Grazia · Avvelenato','+ '+t.die+' Colpo di Grazia, solo contro un bersaglio già Avvelenato.');
   if(owns('Forma Ibrida'))conditional('Forma Ibrida · mischia','+1 dado ai tiri fisici e al Danno in mischia; usa il dado previsto dalla tua forma.');
   if(owns('Ferocia Crescente'))conditional('Ferocia Crescente','+1 dado al Danno in mischia dopo essere sceso sotto metà PV, fino a fine scontro.');
   const armRyou=m.hakiSelections.some(h=>findSource(h.id,ss)?.name===HAKI_NAMES[0]&&h.effects.includes('act:d20'));
   if(armRyou)conditional('Ryou · Armamento','Danni interni ×2, ignora la difesa. Applica al danno interno secondo la fonte.');
  }else if(isDefense(t)){
   let defense='Effetto difensivo della Tecnica';
   if(hasEffect(t,'Contrattacco'))defense=roll;
   if(hasEffect(t,'Parata')){const w=findSource(m.weaponId,ss);defense=(attr||'Attributo da definire')+' '+(t.attr||'')+' + '+(w?.raw.grado||'dado arma da collegare')+' arma';if(!w)errors.push({id:tech.id,text:'Parata: collega un’arma compatibile.'});}
   if(hasEffect(t,'Guardia'))defense='Difesa Passiva attuale + 2 Guardia';
   if(arm?.use==='defense')defense+=' + '+armTerm;
   if(obs)defense+=' + 2 × '+findSource(obs.id,ss).raw.die+' Anticipo (Osservazione)';
   formulas.push({label:'Difesa',text:defense,id:tech.id});
   if(owns('Contraccolpo')&&hasEffect(t,'Contrattacco'))formulas.push({label:'Contraccolpo',text:t.die+' Tecnica · solo se il contrattacco supera l’attacco nemico',id:tech.id});
  }else formulas.push({label:t.forma||'Risoluzione',text:t.forma==='Canzone'?'Effetto sugli alleati; Salvezza per i nemici secondo la Melodia.':tech.techKind==='racial'?t.desc:roll+' · applica gli effetti della Tecnica',id:tech.id});
  list(t.eff).forEach(n=>{const e=tecEffObj(n);if(e)conditions.push({id:tech.id,text:n+': '+e[2]});});
  if(t.durata)conditions.push({id:tech.id,text:'Durata: '+t.durata});
 }
 talentSelected.forEach(s=>conditions.push({id:s.id,text:s.name+': '+s.desc}));
 selected.filter(s=>s.kind==='weapon'||s.kind==='module').forEach(s=>{if(s.desc)conditions.push({id:s.id,text:s.name+': '+s.desc});if(s.raw.eff?.freq)conditions.push({id:s.id,text:s.raw.eff.freq});if(s.raw.eff?.prezzo==='PV')conditions.push({id:s.id,text:'Prezzo in PV: '+s.raw.eff.prezzoDett});});
 const invalid=errors.length>0||unknown.length>0;
 return {move:m,sources:ss,selected,tech,errors,unknown,unavailable,rows,conditions,formulas,resources,pipByColor,
  totals:invalid?null:{st,pip,maintenanceST,maintenancePIP},status:errors.length?'repair':unknown.length?'costs':unavailable.length?'unavailable':'ready'};
}

/* ---------- Media: blobs live outside the character JSON ---------- */
let dbPromise;
function mediaDB() {
 if(!window.indexedDB)return Promise.reject(Error('Archivio immagini non disponibile in questo browser. La ricetta resta salvabile.'));
 if(!dbPromise)dbPromise=new Promise((yes,no)=>{const r=indexedDB.open('glc_special_move_media_v1',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('art');
  r.onsuccess=()=>yes(r.result);r.onerror=()=>{dbPromise=null;no(Error('Impossibile aprire l’archivio immagini.'));};
  r.onblocked=()=>{dbPromise=null;no(Error('Chiudi le altre schede locali per aggiornare l’archivio immagini.'));};
 });return dbPromise;
}
/* ---------- Copia sincronizzata delle illustrazioni ----------
   IndexedDB resta l'archivio veloce, ma vive solo su questo dispositivo: la
   copia in localStorage (chiave glc_media_v1) viaggia col resto del
   salvataggio, così la carta mostra la sua immagine anche sul telefono. */
const MEDIA_KEY='glc_media_v1';
const MEDIA_MAX=8*1024*1024;
function mediaStore() {
 try {return JSON.parse(localStorage.getItem(MEDIA_KEY)||'{}')||{};}catch(e){return {};}
}
function mediaStoreWrite(store) {
 try {localStorage.setItem(MEDIA_KEY,JSON.stringify(store));return true;}
 catch(e){return false;}
}
function blobToDataURL(blob) {
 return new Promise((yes,no)=>{const r=new FileReader();r.onload=()=>yes(String(r.result||''));r.onerror=()=>no(Error('Immagine non leggibile.'));r.readAsDataURL(blob);});
}
async function mediaShare(id,blob) {
 try {
  const url=await blobToDataURL(blob),store=mediaStore();
  store[id]=url;
  const peso=Object.values(store).reduce((n,v)=>n+String(v).length,0);
  if(peso>MEDIA_MAX){announce('Illustrazioni molto pesanti: questa resta solo su questo dispositivo.');return false;}
  if(!mediaStoreWrite(store)){announce('Spazio esaurito: l’illustrazione resta solo su questo dispositivo.');return false;}
  return true;
 }catch(e){return false;}
}
function mediaShared(id) {const v=mediaStore()[id];return typeof v==='string'&&v.slice(0,5)==='data:'?v:null;}

async function mediaPut(id,blob) {
 const db=await mediaDB();await new Promise((yes,no)=>{const tx=db.transaction('art','readwrite');tx.objectStore('art').put(blob,id);tx.oncomplete=yes;tx.onerror=()=>no(Error('Spazio immagini esaurito: la ricetta e la vecchia immagine sono intatte.'));tx.onabort=tx.onerror;});
 await mediaShare(id,blob);
}
async function mediaGet(id) {
 if(mediaURLs.has(id))return mediaURLs.get(id);
 let blob=null;
 try {const db=await mediaDB();blob=await new Promise((yes,no)=>{const tx=db.transaction('art'),r=tx.objectStore('art').get(id);r.onsuccess=()=>yes(r.result);r.onerror=no;});}catch(e){/* si prova la copia sincronizzata */}
 if(blob){const url=URL.createObjectURL(blob);mediaURLs.set(id,url);
  if(!mediaShared(id))mediaShare(id,blob);
  return url;}
 /* Arrivata da un altro dispositivo: la si tiene anche qui, per la prossima volta. */
 const dato=mediaShared(id);
 if(!dato)return null;
 mediaURLs.set(id,dato);
 try {const risposta=await fetch(dato),copia=await risposta.blob();const db=await mediaDB();
  await new Promise((yes,no)=>{const tx=db.transaction('art','readwrite');tx.objectStore('art').put(copia,id);tx.oncomplete=yes;tx.onerror=no;tx.onabort=no;});}catch(e){/* la carta si vede comunque */}
 return dato;
}
async function mediaDelete(id) {
 try {const store=mediaStore();if(store[id]){delete store[id];mediaStoreWrite(store);}}catch(e){}
 try {const db=await mediaDB();await new Promise((yes,no)=>{const tx=db.transaction('art','readwrite');tx.objectStore('art').delete(id);tx.oncomplete=yes;tx.onerror=no;});if(mediaURLs.has(id)){URL.revokeObjectURL(mediaURLs.get(id));mediaURLs.delete(id);}}catch(e){/* Orphan cleanup must never block a recipe. */}
}
function artInUse(id) {return Object.values(CT.chars).some(p=>list(p.specialMoves).some(m=>m.presentation?.artId===id));}
async function optimizeArt(file) {
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Scegli un’immagine JPG, PNG o WebP.');
 if(file.size>20*1024*1024)throw Error('L’immagine supera 20 MB. Scegli una versione più leggera.');
 const url=URL.createObjectURL(file);
 try {const img=await new Promise((yes,no)=>{const i=new Image();i.onload=()=>yes(i);i.onerror=()=>no(Error('L’immagine non è leggibile.'));i.src=url;});
  if(!img.width||!img.height||img.width*img.height>48000000)throw Error('Immagine troppo grande: usa una versione sotto 48 megapixel.');
  const scale=Math.min(1,1600/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(yes=>canvas.toBlob(yes,'image/webp',.86));if(!blob)throw Error('Il browser non riesce a elaborare l’immagine.');return blob;
 }finally{URL.revokeObjectURL(url);}
}

/* ---------- Scoped UI ---------- */
function node(tag,cls,text,children) {return el(tag,{class:cls||'',...(text!=null?{text}: {})},children);}
function button(text,fn,cls='smc-button',props={}) {return el('button',{class:cls,type:'button',text,onclick:fn,...props});}
function note(text,cls='') {return node('p','smc-note '+cls,text);}
function heading(label,detail) {return node('div','smc-section-heading',null,[node('h3','',label),detail?note(detail):null]);}
function iconNode(s,size=24) {return el('span',{class:'smc-icon',html:sourceIcon(s,size),'aria-hidden':'true'});}
function field(label,value,oninput,type='text',attrs={}) {
 const input=el(type==='textarea'?'textarea':'input',{...(type==='textarea'?{}:{type}),...attrs});input.value=value??'';input.oninput=()=>oninput(input.value);
 return node('label','smc-field',null,[node('span','',label),input]);
}
function selectField(label,value,options,onchange) {
 const select=el('select',{'data-smc-focus':'select-'+label.replace(/[^a-z0-9]/gi,'')});options.forEach(([v,l])=>{const o=el('option',{value:v,text:l});select.appendChild(o);});select.value=value||'';select.onchange=()=>onchange(select.value);
 return node('label','smc-field',null,[node('span','',label),select]);
}
function announce(message,error=false) {
 let out=document.getElementById('smc-toast');if(!out){out=el('div',{id:'smc-toast',role:'status','aria-live':'polite'});document.body.appendChild(out);}
 out.textContent=message;out.className=error?'error':'';out.hidden=false;clearTimeout(out._timer);out._timer=setTimeout(()=>out.hidden=true,5000);
}
function uiError(error) {if(UI){UI.error=error.message||String(error);renderDialog();}else announce(error.message||String(error),true);}
function changeDraft(fn,full=true){if(!UI?.draft)return;fn(UI.draft);UI.error='';if(full)renderDialog();else renderPreview();}
function savedCard(id){return list(pg.specialMoves).find(m=>m.id===id);}
function sessionChanged() {renderManage();if(UI)renderDialog();}
function liveChange(fn) {try{transaction(fn,UI?.owner);sessionChanged();}catch(e){uiError(e);}}
function openOverlay(state) {
 const previousFocus=document.activeElement;
 if(UI)close(true);
 UI={...state,owner:CT.activeId,previousFocus,error:'',mediaBusy:false,saving:false,newArt:[],previewFull:false,previewOpen:false};
 const dialog=el('div',{id:'smc-dialog',role:'dialog','aria-modal':'true','aria-label':state.mode==='composer'?'Special Move Composer':'Special Moves',tabindex:'-1'});
 UI.inert=[...document.body.children].filter(n=>n!==dialog&&n.id!=='smc-toast').map(n=>({n,value:n.inert}));UI.inert.forEach(({n})=>n.inert=true);
 document.body.appendChild(dialog);document.body.classList.add('smc-open');document.addEventListener('keydown',keyHandler,true);renderDialog(true);
}
function openComposer(id,duplicate=false) {
 try{ensureReferences();}catch(e){uiError(e);return;}
 let draft=normalizeMove(id?savedCard(id):{});if(id&&!savedCard(id)){announce('La carta non è più presente.',true);return;}
 if(duplicate){draft.id=uid();draft.name=(draft.name+' · copia').slice(0,100);}
 openOverlay({mode:'composer',draft,initial:JSON.stringify(draft),step:0,editing:!!id&&!duplicate});
}
function openCard(id) {if(!savedCard(id))return;openOverlay({mode:'card',cardId:id});}
function close(force=false) {
 if(!UI)return true;
 if(!force && UI.mode==='composer'&&JSON.stringify(UI.draft)!==UI.initial&&!confirm('Lasciare il Composer e scartare le modifiche non salvate alla carta? I costi GM e lo stato Haki già registrati sulle fonti rimangono.'))return false;
 const old=UI;UI=null;document.getElementById('smc-dialog')?.remove();document.removeEventListener('keydown',keyHandler,true);document.body.classList.remove('smc-open');
 old.inert.forEach(({n,value})=>n.inert=value);
 old.newArt.forEach(id=>{if(!artInUse(id))mediaDelete(id);});
 if(old.previousFocus?.isConnected)old.previousFocus.focus();else document.querySelector('#smc-shelf button')?.focus();return true;
}
function keyHandler(e) {
 if(!UI)return;const host=document.getElementById('smc-dialog');
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(host.querySelector('.smc-detail')){host.querySelector('.smc-detail').remove();UI.detailFocus?.focus();}else if(UI.previewOpen){UI.previewOpen=false;renderDialog();}else close();return;}
 if(e.key!=='Tab')return;
 const root=host.querySelector('.smc-detail')||host;
 const targets=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,[tabindex="0"],summary')].filter(n=>!n.hidden&&!n.closest('[hidden]')&&getComputedStyle(n).display!=='none');
 const first=targets[0],last=targets[targets.length-1];
 if(!first){e.preventDefault();root.focus();return;}
 if(e.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){e.preventDefault();last.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){e.preventDefault();first.focus();}
}
function sourceDetails(s) {
 if(!s)return;const host=document.getElementById('smc-dialog');host.querySelector('.smc-detail')?.remove();UI.detailFocus=document.activeElement;
 const panel=el('section',{class:'smc-detail',role:'dialog','aria-modal':'true','aria-label':'Fonte: '+s.name,tabindex:'-1'});
 panel.append(node('div','smc-detail-head',null,[iconNode(s,38),node('div','',null,[node('small','','FONTE ORIGINALE'),node('h2','',s.name)]),button('Chiudi',()=>{panel.remove();UI.detailFocus?.focus();})]));
 panel.append(note(s.subtitle),node('p','smc-source-text',s.desc||'Nessuna descrizione aggiuntiva.'));
 if(s.kind==='tech')list(s.raw.eff).forEach(n=>panel.append(note(n+' — '+(tecEffObj(n)?.[2]||'Effetto non più presente.'))));
 if(s.kind==='haki')hakiUnlocked(s.raw).forEach(r=>{panel.append(note(r.liv+' · '+r.k),note(r.pass));if(r.act)panel.append(note(r.act+' · '+r.cost+' PIP'));});
 panel.append(note('Questo pannello consulta la fonte. Le modifiche alle regole si effettuano nelle sue funzioni originali.'));
 host.append(panel);panel.querySelector('button').focus();
}
function statusLabel(r) {return ({ready:'Ricetta pronta',repair:'Da riparare',costs:'Costi da registrare',unavailable:'Risorse / stato insufficienti'})[r.status];}
function budget(r) {
 const b=node('div','smc-budget');[['ST',r.totals?.st],['PIP',r.totals?.pip],['ST / turno',r.totals?.maintenanceST]].forEach(([label,v])=>b.append(node('div','',null,[node('strong','',v==null?'—':String(v)),node('span','',label)])));
 if(r.totals?.maintenancePIP)b.append(node('div','',null,[node('strong','',r.totals.maintenancePIP),node('span','','PIP / turno')]));return b;
}
function breakdown(r) {
 const details=node('details','smc-breakdown');details.append(node('summary','','Come si compone il costo'));
 r.rows.forEach(row=>{const s=findSource(row.id,r.sources),parts=[row.st+' ST',row.pip+' PIP'];if(row.maintenanceST)parts.push('+'+row.maintenanceST+' ST/turno');if(row.maintenancePIP)parts.push('+'+row.maintenancePIP+' PIP/turno');details.append(node('div','smc-cost-row',null,[iconNode(s,18),node('div','',null,[node('b','',row.name),node('span','',parts.join(' · ')),row.note?note(row.note):null])]));});
 r.unknown.forEach(s=>details.append(note(s.name+': costo non ancora registrato.','smc-warning')));
 r.resources.forEach(v=>details.append(note(v.name+': '+v.cost+(v.available!=null?' / '+v.available+' disponibili':'')+' · '+v.text)));
 if(r.errors.length)details.append(note('Totali sospesi finché i collegamenti non sono riparati.'));
 return details;
}
function validEmblems(r) {return r.selected.filter(s=>s.kind!=='weapon'&&s.kind!=='module');}
function cardElement(input,full=false,interactive=true) {
 const r=resolve(input),m=r.move,p=m.presentation,card=node('article','smc-card '+(full?'smc-full ':'smc-compact ')+(p.variant==='cinematic'?'smc-cinematic':'smc-dossier'));
 const crest=validEmblems(r).find(s=>s.id===p.emblemId)||r.tech||r.selected[0];
 const art=node('div','smc-art');art.append(el('div',{class:'smc-compass','aria-hidden':'true',html:smbSigil()}));
 art.append(el('div',{class:'smc-art-placeholder','aria-hidden':'true',html:sourceIcon(crest,180)}));
 if(p.artId){const img=el('img',{class:'smc-art-img',alt:'',decoding:'async'});img.style.objectPosition=Math.max(0,Math.min(100,number(p.x,50)))+'% '+Math.max(0,Math.min(100,number(p.y,50)))+'%';img.style.transform='scale('+Math.max(1,Math.min(2.5,number(p.zoom,1)))+')';art.append(img);
  mediaGet(p.artId).then(url=>{if(url){img.src=url;img.onload=()=>card.classList.add('smc-has-art');}else{img.remove();if(full)art.append(node('small','smc-art-missing','Illustrazione non presente su questo dispositivo'));}}).catch(()=>{img.remove();if(full)art.append(node('small','smc-art-missing','Illustrazione non disponibile · ricetta intatta'));});
 }
 const crestEl=el('div',{class:'smc-crest','aria-hidden':'true',html:sourceIcon(crest,66)});art.append(crestEl);
 art.append(node('div','smc-edition',null,[node('span','','GRAND LINE CHRONICLES'),node('span','','SPECIAL MOVE')]));
 if(p.quote&&p.quoteZone==='top')art.append(node('blockquote','smc-quote smc-quote-top','“'+p.quote+'”'));
 const title=node('div','smc-card-title',null,[p.subtitle?node('span','smc-eyebrow',p.subtitle):null,node('h3','',m.name||'La tua prossima leggenda'),node('p','',r.tech?.name||'Scegli la Tecnica di base')]);art.append(title);
 card.append(art);
 const main=node('div','smc-card-data');main.append(node('span','smc-state '+r.status,statusLabel(r)),budget(r));
 const formulas=full?r.formulas:r.formulas.slice(0,2);
 formulas.forEach(f=>main.append(node('div','smc-formula',null,[node('span','',f.label),node('strong','',f.text)])));
 const rail=node('div','smc-rail',null);
 r.selected.forEach(s=>{const b=interactive?button('',()=>sourceDetails(s),'smc-medallion',{title:s.name,'aria-label':'Leggi '+s.name}):node('span','smc-medallion');b.append(iconNode(s,24));rail.append(b);});main.append(rail);
 if(p.quote&&p.quoteZone!=='top')main.append(node('blockquote','smc-quote','“'+p.quote+'”'));
 if(full){
  r.errors.forEach(e=>main.append(note(e.text,'smc-warning')));r.unknown.forEach(s=>main.append(note(s.name+': registra i costi approvati dal GM.','smc-warning')));
  r.unavailable.forEach(s=>main.append(note(s,'smc-warning')));main.append(breakdown(r));
  main.append(heading('Sequenza di esecuzione','L’ordine è un promemoria: tempi, reazioni e condizioni restano quelli delle fonti.'));
  orderedSources(m,r).forEach((s,i)=>{const block=node('div','smc-recipe-line',null,[node('span','smc-recipe-n',String(i+1).padStart(2,'0')),iconNode(s,22),node('div','',null,[node('b','',s.name),note(sourceSummary(s,m,true))])]);if(interactive)block.append(button('Fonte ↗',()=>sourceDetails(s),'smc-link'));main.append(block);});
  if(r.conditions.length){main.append(heading('Effetti e condizioni'));r.conditions.forEach(c=>main.append(node('div','smc-condition',null,[iconNode(findSource(c.id,r.sources),18),node('p','',c.text)])));}
  if(m.notes)main.append(heading('Note personali'),note(m.notes));
 }
 card.append(main);return card;
}
function sourceSummary(s,m,concise=false) {
 if(s.kind==='talent')return (s.meta?.mode==='active'?'ATTIVO':'PASSIVO')+' · '+(concise?s.subtitle:s.desc);
 if(s.kind==='tech')return s.subtitle+(s.raw.durata?' · '+s.raw.durata:'');
 if(s.kind==='haki'){const state=hakiState(s);return (state.active?'Già attivo':'Da attivare · 1 PIP')+' · '+s.raw.die;}
 if(s.kind==='fruit')return 'Contesto del Frutto · '+s.subtitle+(concise?'':' · '+s.desc);
 return s.subtitle+' · '+s.desc;
}
function orderedSources(m,r=resolve(m)) {
 const fallback=[...r.selected].sort((a,b)=>{const rank=s=>s.kind==='fruit'?0:s.kind==='haki'?1:s.kind==='tech'?3:s.kind==='talent'?4:2;return rank(a)-rank(b);});
 return uniq([...list(m.sequence),...fallback.map(s=>s.id)]).map(id=>r.selected.find(s=>s.id===id)).filter(Boolean);
}
function shelf() {
 if(UI && !refreshQueued){refreshQueued=true;queueMicrotask(()=>{refreshQueued=false;if(!UI)return;if(UI.owner!==CT.activeId){close(true);announce('Personaggio cambiato: riapri la carta dal suo dossier.');}else renderDialog();});}
 const shelf=el('section',{id:'smc-shelf','aria-labelledby':'smc-shelf-title'}),moves=list(pg.specialMoves);
 shelf.append(node('div','smc-shelf-head',null,[node('div','',null,[node('span','smc-eyebrow','IL TUO ASSO NELLA MANICA'),el('h2',{id:'smc-shelf-title',text:'Special Moves'}),note('Una Tecnica. I tuoi poteri. Una carta da portare in battaglia.')]),button('+ Crea Special Move',()=>openComposer(),'smc-button smc-primary')]));
 if(!moves.length){const empty=node('div','smc-empty-shelf',null,[el('span',{class:'smc-empty-mark','aria-hidden':'true',html:smbSigil()}),node('div','',null,[node('h3','','Dai un nome al tuo colpo più memorabile.'),note('Collega Tecniche, Talenti, Haki ed equipaggiamento già in scheda. Crea la tua prima carta.')]),button('Apri il Composer →',()=>openComposer(),'smc-link')]);shelf.append(empty);}
 else {const grid=node('div','smc-shelf-grid');moves.slice(0,4).forEach(m=>grid.append(shelfTile(m)));shelf.append(grid);if(moves.length>4)shelf.append(button('Vedi tutte le '+moves.length+' carte',()=>openOverlay({mode:'collection'})));}
 return shelf;
}
function safeShelf() {
 try{return shelf();}catch(e){
  // A malformed imported recipe must never take down the existing dashboard.
  return el('section',{id:'smc-shelf'},[heading('Special Moves'),note('Una carta contiene dati non leggibili. Le altre funzioni del personaggio restano disponibili; nessun dato è stato eliminato.')]);
 }
}
function shelfTile(m) {
 const tile=node('div','smc-shelf-tile'),open=button('',()=>openCard(m.id),'smc-card-open',{'aria-label':'Apri '+m.name});open.append(cardElement(m,false,false));tile.append(open);
 const actions=node('details','smc-actions');actions.append(node('summary','','Azioni ···'));
 actions.append(button('Guarda carta',()=>{if(window.GLCCardView)GLCCardView.open(m);},'smc-link'),button(resolve(m).status==='repair'?'Ripara':'Modifica',()=>openComposer(m.id),'smc-link'),button('Duplica',()=>openComposer(m.id,true),'smc-link'),button('Elimina',()=>deleteCard(m.id),'smc-link'));
 tile.append(actions);return tile;
}
function deleteCard(id) {
 const m=savedCard(id);if(!m||!confirm('Eliminare la carta «'+m.name+'»? Tecnica, Talenti, Haki ed equipaggiamento restano in scheda.'))return;
 try{transaction(p=>{p.specialMoves=list(p.specialMoves).filter(x=>x.id!==id);});if(UI?.cardId===id)close(true);renderManage();if(UI)renderDialog();announce('Carta eliminata. Le fonti sono intatte.');if(m.presentation?.artId&&!artInUse(m.presentation.artId))mediaDelete(m.presentation.artId);}catch(e){uiError(e);}
}
function renderDialog(focus=false) {
 if(!UI)return;const root=document.getElementById('smc-dialog');if(!root)return;
 if(UI.owner!==CT.activeId){close(true);return;}
 const active=document.activeElement,focusId=active?.dataset?.smcFocus,scroll=root.querySelector('.smc-work')?.scrollTop||0;
 UI.disclosures=UI.disclosures||{};root.querySelectorAll('details[data-smc-state]').forEach(n=>UI.disclosures[n.dataset.smcState]=n.open);
 root.replaceChildren();
 const bar=node('header','smc-topbar',null,[el('span',{class:'smc-brand-mark','aria-hidden':'true',html:SMB_MARK}),node('div','smc-title-block',null,[node('span','smc-eyebrow','GRAND LINE CHRONICLES'),node('h2','',UI.mode==='composer'?'Special Move Composer':UI.mode==='collection'?'Le tue Special Moves':savedCard(UI.cardId)?.name||'Carta')]),button('Chiudi ✕',()=>close(),'smc-button')]);root.append(bar);
 if(UI.mode==='composer'){
  const nav=el('nav',{class:'smc-steps','aria-label':'Fasi del Composer'});
  STEPS.forEach((name,i)=>{const b=button('',()=>goStep(i),'smc-step'+(UI.step===i?' current':''),{...(UI.step===i?{'aria-current':'step'}:{})});b.append(node('span','',String(i+1).padStart(2,'0')),node('b','',name));nav.append(b);});root.append(nav);
  const main=node('div','smc-composer-main'),work=node('section','smc-work');work.append(node('div','smc-work-title',null,[node('span','smc-eyebrow','PASSO '+String(UI.step+1).padStart(2,'0')),el('h2',{text:STEPS[UI.step],tabindex:'-1'})]));
  if(UI.error)work.append(el('p',{class:'smc-error',role:'alert',text:UI.error}));
  [stepIdentity,stepTechnique,stepTalents,stepPowers,stepEquipment,stepRecipe,stepCard][UI.step](work);
  const preview=el('aside',{class:'smc-preview'+(UI.previewOpen?' is-open':''),'aria-label':'Anteprima della carta'});main.append(work,preview);root.append(main);
  const foot=node('footer','smc-footer',null,[button('← Indietro',()=>goStep(UI.step-1),'smc-button',{...(UI.step===0?{disabled:''}:{})}),node('span','smc-save-state',UI.saving?'Salvataggio…':UI.mediaBusy?'Elaborazione immagine…':'Bozza · '+(UI.draft.name||'senza nome')),button('Anteprima',()=>{UI.previewOpen=!UI.previewOpen;renderDialog();},'smc-button smc-preview-toggle'),UI.step<6?button('Avanti →',()=>goStep(UI.step+1),'smc-button smc-primary'):button(UI.editing?'Salva modifiche':'Salva carta',saveCard,'smc-button smc-primary',{...(UI.saving||UI.mediaBusy?{disabled:''}:{})})]);root.append(foot);renderPreview();
  work.scrollTop=focus?0:scroll;
  if(focus)work.querySelector('h2').focus();
 }else if(UI.mode==='card'){
  const m=savedCard(UI.cardId);if(!m){close(true);return;}
  const content=node('div','smc-card-view');content.append(cardElement(m,true));
  const buttons=node('div','smc-card-controls',null,[button('Guarda carta',()=>{if(window.GLCCardView)GLCCardView.open(m);},'smc-button smc-primary'),button('Modifica / ripara',()=>openComposer(m.id)),button('Duplica',()=>openComposer(m.id,true)),button('Elimina',()=>deleteCard(m.id))]);content.prepend(buttons);
  if(list(m.hakiSelections).length){const live=el('details',{class:'smc-live-panel','data-smc-state':'haki-live'});live.append(node('summary','','Stato Haki condiviso · sessione'));hakiLiveControls(live);content.insertBefore(live,content.querySelector('.smc-full'));}
  root.append(content);
 }else{const collection=node('div','smc-collection');collection.append(button('+ Crea Special Move',()=>openComposer(),'smc-button smc-primary'));const grid=node('div','smc-shelf-grid');list(pg.specialMoves).forEach(m=>grid.append(shelfTile(m)));collection.append(grid);root.append(collection);}
 root.querySelectorAll('details[data-smc-state]').forEach(n=>{if(Object.prototype.hasOwnProperty.call(UI.disclosures,n.dataset.smcState))n.open=UI.disclosures[n.dataset.smcState];});
 if(!focus&&focusId)root.querySelector('[data-smc-focus="'+focusId+'"]')?.focus();
 if(focus&&UI.mode!=='composer')root.querySelector('button')?.focus();
}
function renderPreview() {
 if(!UI||UI.mode!=='composer')return;const target=document.querySelector('#smc-dialog .smc-preview');if(!target)return;
 target.replaceChildren();
 const toggles=node('div','smc-preview-head',null,[node('span','smc-eyebrow','ANTEPRIMA LIVE'),button(UI.previewFull?'Compatta':'Carta completa',()=>{UI.previewFull=!UI.previewFull;renderPreview();},'smc-link'),button('Chiudi anteprima',()=>{UI.previewOpen=false;renderDialog();},'smc-link smc-preview-toggle')]);target.append(toggles,cardElement(UI.draft,UI.previewFull));
 const r=resolve(UI.draft);if(!UI.previewFull&&(r.errors.length||r.unknown.length||r.unavailable.length))target.append(note([...r.errors.map(e=>e.text),...r.unknown.map(s=>s.name+': costi da registrare'),...r.unavailable].join(' · '),'smc-warning'));
 const state=document.querySelector('.smc-save-state');if(state)state.textContent=UI.mediaBusy?'Elaborazione immagine…':'Bozza · '+(UI.draft.name||'senza nome');
}
function goStep(next) {
 if(next<0||next>=7)return;
 if(next>UI.step&&UI.step===0&&!UI.draft.name.trim()){UI.error='Dai un nome alla Special Move.';renderDialog();return;}
 if(next>1&&!UI.draft.baseTechId){UI.step=1;UI.error='Scegli prima una Tecnica di base.';renderDialog(true);return;}
 UI.step=next;UI.error='';renderDialog(true);
}
function stepIdentity(work) {
 work.append(note('Una mossa che porta la tua firma. Nome, epiteto e citazione raccontano il personaggio; le regole verranno dalle sue fonti.'));
 work.append(field('Nome della Special Move *',UI.draft.name,v=>changeDraft(m=>m.name=v,false),'text',{maxlength:100,placeholder:'Il nome che urlerai in battaglia','data-smc-focus':'name'}));
 work.append(field('Epiteto / sottotitolo',UI.draft.presentation.subtitle,v=>changeDraft(m=>m.presentation.subtitle=v,false),'text',{maxlength:100,placeholder:'La promessa della tua ciurma'}));
 work.append(field('Citazione personale',UI.draft.presentation.quote,v=>changeDraft(m=>m.presentation.quote=v,false),'textarea',{maxlength:300,rows:3,placeholder:'“…”'}));
}
function optionCard(s,selected,onPick,detail=true,suffix='') {
 const tile=node('div','smc-option'+(selected?' selected':''));
 const pick=button('',onPick,'smc-option-pick',{'aria-pressed':String(selected),'data-smc-focus':'source-'+s.id});
 pick.append(iconNode(s,38),node('span','smc-option-copy',null,[node('strong','',s.name),node('small','',s.subtitle||''),node('span','',suffix||s.desc)]),node('span','smc-check',selected?'✓':'+'));
 tile.append(pick);if(detail)tile.append(button('Fonte ↗',()=>sourceDetails(s),'smc-option-detail'));return tile;
}
function stepTechnique(work) {
 work.append(note('La Tecnica è la base meccanica. I suoi dati restano collegati alla scheda e si aggiornano insieme a lei.'));
 const ss=sources().filter(s=>s.kind==='tech');if(!ss.length){work.append(note('Non hai ancora Tecniche: creane una dal Signature Move Builder e torna qui.'));return;}
 const grid=node('div','smc-options');ss.forEach(s=>{
  const cost=sourceCost(s),suffix=(cost?cost.st+' ST'+(cost.maintenanceST?' · +'+cost.maintenanceST+' ST/turno':''):'Costi GM da registrare')+' · '+(list(s.raw.eff).join(' · ')||s.desc||'Senza effetti aggiuntivi');
  grid.append(optionCard(s,UI.draft.baseTechId===s.id,()=>changeDraft(m=>{m.baseTechId=s.id;m.weaponId=s.raw.arma?'weapon:'+s.raw.arma:'';m.moduleId=s.raw.modulo?'module:'+s.raw.modulo:'';}),true,suffix));
 });work.append(grid);
 const chosen=findSource(UI.draft.baseTechId);if(chosen&&requiresGM(chosen))work.append(gmCostEditor(chosen));
 const issues=resolve(UI.draft).errors.filter(e=>e.id===UI.draft.baseTechId);issues.forEach(e=>work.append(note(e.text,'smc-warning')));
}
function selectTalent(s) {
 const m=UI.draft;if(s.meta.mode==='active'){
  if(m.activeTalentId===s.id){changeDraft(x=>x.activeTalentId='');return;}
  if(m.activeTalentId&&!confirm('Sostituire «'+(findSource(m.activeTalentId)?.name||'Talento non disponibile')+'» con «'+s.name+'»? Una carta può contenere un solo Talento attivo, anche fra i poteri del Frutto.'))return;
  changeDraft(x=>{x.activeTalentId=s.id;x.passiveTalentIds=x.passiveTalentIds.filter(id=>id!==s.id);x.fruitSelections=x.fruitSelections.filter(id=>id!==s.id);});
 }else{const key=s.fruit?'fruitSelections':'passiveTalentIds';changeDraft(x=>{x[key]=x[key].includes(s.id)?x[key].filter(id=>id!==s.id):[...x[key],s.id];});}
}
function talentsArea(work,fruit) {
 const m=UI.draft,ss=sources(),tech=findSource(m.baseTechId,ss),available=ss.filter(s=>s.kind==='talent'&&!!s.fruit===fruit&&applicable(s,tech,m));
 if(!available.length){work.append(note('Nessun Talento '+(fruit?'del Frutto ':'')+'acquisito e compatibile con questa Tecnica.'));return;}
 for(const mode of ['active','passive']){
  const choices=available.filter(s=>s.meta.mode===mode);if(!choices.length)continue;
  work.append(heading(mode==='active'?'Talento attivo · un solo slot':'Talenti passivi',mode==='active'?'Pagamento, reazione o frequenza occupano lo stesso slot, anche per il Frutto.':'Scegli i passivi pertinenti. Le condizioni originali restano sempre visibili.'));
  const grid=node('div','smc-options');choices.forEach(s=>{const on=selectedIDs(m).includes(s.id),c=sourceCost(s);const suffix=(mode==='active'?(c?c.st+' ST · ':'Costo GM · '):'PASSIVO · ')+s.desc;grid.append(optionCard(s,on,()=>selectTalent(s),true,suffix));
   if(on&&s.meta.quantity){const max=s.alias.includes('Maestria')?3:s.alias.includes('Migliorato')?2:1;grid.append(selectField('Attacchi base extra',String(m.talentUses[s.id]||1),Array.from({length:max},(_,i)=>[String(i+1),String(i+1)+' · '+(i+1)+' ST']),v=>changeDraft(d=>d.talentUses[s.id]=+v)));}
   if(on&&requiresGM(s))grid.append(gmCostEditor(s));
  });work.append(grid);
 }
}
function stepTalents(work) {talentsArea(work,false);invalidSelections(work,'talent');}
function hakiLiveControls(work) {
 sources().filter(s=>s.kind==='haki').forEach(s=>{
  const state=hakiState(s),group=node('div','smc-live-haki');group.append(iconNode(s,26),node('b','',s.name));
  const update=patch=>liveChange(p=>{p.specialMoveSession=p.specialMoveSession||{};p.specialMoveSession.haki=p.specialMoveSession.haki||{};p.specialMoveSession.haki[s.id]={...state,...patch};delete p.specialMoveSession.haki[s.id].max;});
  group.append(button(state.active?'Attivo ✓':'Inattivo',()=>update({active:!state.active,turns:0}),'smc-button',{'aria-pressed':String(state.active),'data-smc-focus':'live-'+s.id}));
  const remaining=field('PIP rimasti / '+state.max,state.pipRemaining,()=>{},'number',{min:0,max:state.max,step:1,'data-smc-focus':'pip-'+s.id});remaining.querySelector('input').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=0&&v<=state.max)update({pipRemaining:v});else {e.target.value=state.pipRemaining;announce('Inserisci PIP fra 0 e '+state.max,true);}};group.append(remaining);
  if(s.name===HAKI_NAMES[0]&&dieRank(s.raw.die)>=dieRank('d12')){const turns=field('Tuoi turni trascorsi',state.turns,()=>{},'number',{min:0,max:999,step:1,'data-smc-focus':'turns-'+s.id});turns.querySelector('input').onchange=e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=999)update({turns:n});else e.target.value=state.turns;};group.append(turns);}
  work.append(group);
 });
 work.append(note('Stato condiviso da tutte le carte di questo personaggio. Registra ciò che è già avvenuto al tavolo: questi controlli non spendono ST o PIP e non modificano la progressione Haki.'));
}
function stepPowers(work) {
 const m=UI.draft,ss=sources(),tech=findSource(m.baseTechId,ss),haki=ss.filter(s=>s.kind==='haki');
 if(haki.length){work.append(heading('Haki','Attivazione, effetti e mantenimento rimangono distinti. Solo l’Armamento aggiunge il suo dado a danno o difesa.'));
  const live=el('details',{class:'smc-live-panel','data-smc-state':'haki-live'});live.append(node('summary','','Stato del combattimento · condiviso fra le carte'));hakiLiveControls(live);work.append(live);
  haki.forEach(s=>{
   const selected=m.hakiSelections.find(h=>h.id===s.id),canUse=s.name!==HAKI_NAMES[0]||isAttack(tech?.raw)||isDefense(tech?.raw);if(!canUse&&!selected)return;
   const state=hakiState(s),block=node('div','smc-power');block.append(optionCard(s,!!selected,()=>changeDraft(d=>{d.hakiSelections=selected?d.hakiSelections.filter(h=>h.id!==s.id):[...d.hakiSelections,{id:s.id,use:isDefense(tech?.raw)?'defense':'offense',effects:[]}];}),true,(state.active?'Attivo · 0':'Da attivare · 1')+' PIP attivazione · '+state.pipRemaining+'/'+state.max+' PIP disponibili'));
   if(selected){
    if(s.name===HAKI_NAMES[0])block.append(selectField('Impiego dell’Armamento',selected.use,isDefense(tech?.raw)?[['defense','Difesa · aggiungi il dado alla difesa']]:[['offense','Offesa · aggiungi il dado al danno']],v=>changeDraft(d=>d.hakiSelections.find(h=>h.id===s.id).use=v)));
    hakiEffects(s,tech).forEach(e=>{const on=selected.effects.includes(e.id),line=button('',()=>changeDraft(d=>{const h=d.hakiSelections.find(h=>h.id===s.id);h.effects=on?h.effects.filter(x=>x!==e.id):[...h.effects,e.id];}),'smc-effect'+(on?' selected':''),{'aria-pressed':String(on),'data-smc-focus':'effect-'+s.id+'-'+e.id});line.append(node('span','smc-effect-mode',e.mode==='active'?e.cost+' PIP':'PASSIVO'),node('span','',null,[node('b','',e.name),node('span','',e.desc)]),node('b','smc-check',on?'✓':'+'));block.append(line);});
   }work.append(block);
  });
 }
 if(pg.frutto?.has){const s=ss.find(x=>x.kind==='fruit');work.append(heading('Frutto del Diavolo',s.name+' · '+s.subtitle));
  work.append(optionCard(s,m.fruitSelections.includes(s.id),()=>changeDraft(d=>{d.fruitSelections=d.fruitSelections.includes(s.id)?d.fruitSelections.filter(id=>id!==s.id):[...d.fruitSelections,s.id];}),true,'Includi il contesto del Frutto: '+s.desc));
  work.append(note('La descrizione personale è contesto narrativo. Seleziona sotto i Talenti acquisiti per includerne gli effetti.'));talentsArea(work,true);
  if(selectedIDs(m).some(id=>findSource(id,ss)?.alias==='Fonte Inesauribile'))work.append(button((m.conditions.elementSource?'✓ ':'')+'Sono dentro o a ridosso di una grande fonte del mio elemento',()=>changeDraft(d=>d.conditions.elementSource=!d.conditions.elementSource),'smc-effect',{'aria-pressed':String(!!m.conditions.elementSource)}));
 }
 if(!haki.length&&!pg.frutto?.has)work.append(note('Non hai Haki o un Frutto in scheda. Puoi proseguire con la Tecnica e i tuoi Talenti.'));
 invalidSelections(work);
}
function stepEquipment(work) {
 const m=UI.draft,ss=sources(),tech=findSource(m.baseTechId,ss);
 if(tech?.raw.stile==='Striker')work.append(note('Striker · questa Tecnica si esegue a mani nude.'));
 {
  ['weapon','module'].forEach(kind=>{const items=ss.filter(s=>s.kind===kind&&compatibleEquipment(s,tech));if(!items.length)return;
   work.append(heading(kind==='weapon'?'Arma esecutrice':'Modulo esecutore',kind==='module'?'Solo moduli attivi e integri. Cariche ed energia restano gestite dalla scheda del modulo.':'Il Grado dell’arma non sostituisce il Dado Danno della Tecnica.'));
   const grid=node('div','smc-options');items.forEach(s=>{const selected=m[kind==='weapon'?'weaponId':'moduleId']===s.id;
    grid.append(optionCard(s,selected,()=>changeDraft(d=>{d.weaponId=kind==='weapon'&&!selected?s.id:'';d.moduleId=kind==='module'&&!selected?s.id:'';}),true));
    if(selected&&requiresGM(s))grid.append(gmCostEditor(s));
   });work.append(grid);
  });
  if(!ss.some(s=>compatibleEquipment(s,tech)))work.append(note('Nessun esecutore compatibile disponibile. Le Tecniche del Frutto e le Canzoni mantengono le proprie fonti.'));
 }
 invalidSelections(work,'equipment');
}
function invalidSelections(work,kind) {
 const r=resolve(UI.draft),warnings=r.errors.filter(e=>e.id&&e.id!==UI.draft.baseTechId&&(!kind||kind==='talent'&&findSource(e.id,r.sources)?.kind==='talent'||kind==='equipment'&&/^(weapon|module):/.test(e.id)));
 if(!warnings.length)return;
 const block=node('div','smc-repair');block.append(heading('Collegamenti da riparare'));
 uniq(warnings.map(e=>e.id)).forEach(id=>{const text=warnings.filter(e=>e.id===id).map(e=>e.text).join(' · ');block.append(node('div','smc-repair-row',null,[note(text),button('Scollega',()=>changeDraft(m=>{if(m.activeTalentId===id)m.activeTalentId='';m.passiveTalentIds=m.passiveTalentIds.filter(x=>x!==id);m.fruitSelections=m.fruitSelections.filter(x=>x!==id);m.hakiSelections=m.hakiSelections.filter(x=>x.id!==id);if(m.weaponId===id)m.weaponId='';if(m.moduleId===id)m.moduleId='';}),'smc-link')]));});work.append(block);
}
function gmCostEditor(s) {
 const details=el('details',{class:'smc-gm','data-smc-state':'cost-'+s.id});details.open=!sourceCost(s);details.append(node('summary','','Costi già approvati dal GM · '+s.name));
 details.append(note('Registrazione sulla fonte, condivisa da tutte le carte. Inserisci 0 quando il costo è esplicitamente nullo. Questi campi non concedono nuovi effetti.'));
 const old=pg.specialMoveSourceCosts?.[s.id]||{},values={},grid=node('div','smc-form-grid');
 [['st','ST all’uso'],['pip','PIP all’uso'],['maintenanceST','ST / turno'],['maintenancePIP','PIP / turno'],['resource','Cariche / energia all’uso']].forEach(([k,label])=>{const f=field(label,old[k]??'',()=>{},'number',{min:0,max:999,step:1,required:''});values[k]=f.querySelector('input');grid.append(f);});
 if(recordsDiscount(s)){[['discountST','Sconto ST sulla Tecnica già approvato'],['minimumST','Costo minimo della Tecnica previsto dalla fonte']].forEach(([k,label])=>{const f=field(label,old[k]??'',()=>{},'number',{min:0,max:999,step:1,required:''});values[k]=f.querySelector('input');grid.append(f);});}
 let selectedPip=old.pipSourceId||'';grid.append(selectField('Colore che paga eventuali PIP',selectedPip,[['','Nessun costo PIP'],...sources().filter(x=>x.kind==='haki').map(x=>[x.id,x.name])],v=>selectedPip=v));
 details.append(grid);
 const info=el('p',{class:'smc-note',role:'status'});details.append(info,button('Registra sulla fonte',()=>{
  const val=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v.value===''?NaN:Number(v.value)]));val.pipSourceId=selectedPip;
  if(!costFields(val)||!Object.keys(values).every(k=>Number.isInteger(val[k])&&val[k]>=0&&val[k]<=999)){info.textContent='Compila tutti i costi con numeri interi da 0 a 999. Per un costo PIP scegli il relativo colore.';return;}
  val.basis=costBasis(s);
  try{transaction(p=>{p.specialMoveSourceCosts=p.specialMoveSourceCosts||{};p.specialMoveSourceCosts[s.id]=val;},UI.owner);UI.error='';renderManage();renderDialog();announce('Costi registrati. Tutte le carte collegate sono aggiornate.');}catch(e){info.textContent='Salvataggio non riuscito: '+e.message;}
 },'smc-button smc-primary'));return details;
}
function stepRecipe(work) {
 const r=resolve(UI.draft);work.append(note('Ordina il tuo promemoria con il trascinamento o con le frecce. L’ordine visivo non cambia tempi, costi o legalità.'));
 const ordered=orderedSources(UI.draft,r),stack=node('div','smc-recipe-stack');let dragging='';
 const moveTo=(id,index)=>changeDraft(m=>{const ids=orderedSources(m).map(s=>s.id);const old=ids.indexOf(id);if(old<0)return;ids.splice(old,1);ids.splice(index,0,id);m.sequence=ids;});
 ordered.forEach((s,i)=>{const block=el('div',{class:'smc-recipe-block',draggable:'true'});block.ondragstart=e=>{dragging=s.id;e.dataTransfer?.setData('text/plain',s.id);};block.ondragover=e=>e.preventDefault();block.ondrop=e=>{e.preventDefault();if(ordered.some(x=>x.id===dragging))moveTo(dragging,i);};
  block.append(node('span','smc-recipe-n',String(i+1).padStart(2,'0')),iconNode(s,28),node('div','smc-recipe-text',null,[node('b','',s.name),note(sourceSummary(s,UI.draft))]),node('div','smc-order-buttons',null,[button('↑',()=>moveTo(s.id,i-1),'smc-button',{'aria-label':'Sposta prima '+s.name,...(i===0?{disabled:''}:{})}),button('↓',()=>moveTo(s.id,i+1),'smc-button',{'aria-label':'Sposta dopo '+s.name,...(i===ordered.length-1?{disabled:''}:{})})]));stack.append(block);});work.append(stack);
 work.append(heading('Risoluzione'),budget(r));r.formulas.forEach(f=>work.append(node('div','smc-formula',null,[node('span','',f.label),node('strong','',f.text)])));work.append(breakdown(r));
 r.errors.forEach(e=>work.append(note(e.text,'smc-warning')));r.unavailable.forEach(s=>work.append(note(s,'smc-warning')));r.unknown.forEach(s=>work.append(gmCostEditor(s)));invalidSelections(work);
 const detail=node('details','smc-breakdown');detail.append(node('summary','','Tutti gli effetti, i limiti e le condizioni'));r.conditions.forEach(c=>detail.append(node('div','smc-condition',null,[iconNode(findSource(c.id,r.sources),18),note(c.text)])));work.append(detail);
 work.append(field('Note per l’esecuzione',UI.draft.notes,v=>changeDraft(m=>m.notes=v,false),'textarea',{maxlength:2000,rows:3}));
}
function stepCard(work) {
 const m=UI.draft,r=resolve(m),art=el('input',{type:'file',accept:'image/png,image/jpeg,image/webp','aria-label':'Illustrazione della Special Move'});
 art.onchange=async()=>{
  const file=art.files[0];if(!file)return;const owner=UI,token=uid();owner.uploadToken=token;owner.mediaBusy=true;renderDialog();
  let id;
  try{const blob=await optimizeArt(file);if(UI!==owner||owner.uploadToken!==token||owner.owner!==CT.activeId)return;id=uid();await mediaPut(id,blob);
   if(UI!==owner||owner.uploadToken!==token||owner.owner!==CT.activeId){await mediaDelete(id);return;}
   owner.newArt.push(id);owner.draft.presentation.artId=id;owner.draft.presentation.zoom=1;owner.draft.presentation.x=50;owner.draft.presentation.y=50;
  }catch(e){if(UI===owner)owner.error=e.message;}finally{if(UI===owner){owner.mediaBusy=false;renderDialog();}}
 };
 work.append(heading('Illustrazione','JPG, PNG o WebP. Il ritaglio riguarda solo la carta e lascia intatto il ritratto del personaggio.'),art);
 if(m.presentation.artId)work.append(button('Rimuovi dalla carta',()=>changeDraft(d=>delete d.presentation.artId),'smc-link'));
 const crop=node('div','smc-form-grid');[['zoom','Zoom',1,2.5,.05],['x','Fuoco orizzontale',0,100,1],['y','Fuoco verticale',0,100,1]].forEach(([k,label,min,max,step])=>crop.append(field(label,m.presentation[k],v=>changeDraft(d=>d.presentation[k]=+v,false),'range',{min,max,step})));work.append(crop);
 work.append(note('L’illustrazione viaggia col salvataggio: la ritrovi sugli altri dispositivi con cui sei entrato. Se le immagini diventano troppe, le ultime restano solo qui e il sito te lo dice.'));
 work.append(selectField('Composizione',m.presentation.variant,[['dossier','Dossier · stemma e illustrazione'],['cinematic','Cinematica · immagine protagonista']],v=>changeDraft(d=>d.presentation.variant=v)));
 work.append(selectField('Finitura della carta',m.presentation.finish||'none',[['none','Opaca · nessun riflesso'],['foil','Foil olografico'],['oro','Lamina d’oro'],['prisma','Prismatica'],['stelle','Pioggia di stelle']],v=>changeDraft(d=>d.presentation.finish=v)));
 work.append(note('La finitura si vede muovendo la carta in «Guarda carta».'));
 work.append(selectField('Posizione della citazione',m.presentation.quoteZone,[['bottom','Sotto le statistiche'],['top','Nella parte alta dell’illustrazione']],v=>changeDraft(d=>d.presentation.quoteZone=v)));
 work.append(selectField('Stemma principale',m.presentation.emblemId||'',[['','Automatico · Tecnica'],...validEmblems(r).map(s=>[s.id,s.name])],v=>changeDraft(d=>d.presentation.emblemId=v)));
 work.append(button(UI.previewFull?'Mostra carta compatta':'Mostra carta completa',()=>{UI.previewFull=!UI.previewFull;renderPreview();},'smc-button'));
}
function saveCard() {
 if(!UI||UI.saving||UI.mediaBusy)return;
 const owner=UI,m=normalizeMove(owner.draft),r=resolve(m);
 if(!m.name.trim()){owner.step=0;owner.error='Dai un nome alla carta.';renderDialog(true);return;}
 if(r.errors.length||r.unknown.length){owner.step=5;owner.error='Ripara i collegamenti e registra i costi mancanti prima di salvare. Le risorse momentaneamente insufficienti non impediscono il salvataggio.';renderDialog(true);return;}
 owner.saving=true;renderDialog();
 try{
  const previousArt=savedCard(m.id)?.presentation?.artId;
  m.name=m.name.trim();transaction(p=>{p.specialMoves=list(p.specialMoves);const ix=p.specialMoves.findIndex(x=>x.id===m.id);if(ix>=0)p.specialMoves[ix]=m;else p.specialMoves.push(m);},owner.owner);
  close(true);renderManage();announce('Special Move salvata.');openCard(m.id);
  if(previousArt&&previousArt!==m.presentation.artId&&!artInUse(previousArt))mediaDelete(previousArt);
 }catch(e){owner.saving=false;owner.error='Carta non salvata: '+e.message+'. La bozza è ancora qui.';renderDialog();}
}
window.GLCMoves={shelf:safeShelf,open:openComposer,openCard,close,resolve,sources,art:mediaGet,transaction,ensureReferences,normalizeMove,applicable,compatibleEquipment,hakiState,hakiEffects,sourceCost,costBasis,requiresGM,techniqueProblems,metadata:META};
})();
