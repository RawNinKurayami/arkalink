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
const rafficaCost = count => count * (count + 1) / 2;
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
define('Paramecia','Riflesso del Potere','passive','reactiveEvent',{action:'reaction'});
define('Paramecia','Potere Versatile|Dono Passivo|Seconda Natura','passive','any');
define('Paramecia','Doppio Uso|Potere Istintivo','active','fruit');
define('Paramecia','Potere Istintivo','passive','fruit',{action:'freeMain'});
define('Paramecia','Ciò che Resta|Nessuno dei Miei|Portata Naturale|Senza Contraccolpo','passive','fruit');
define('Paramecia','Forma di Combattimento','active','any',{gm:true});
define('Paramecia','Risveglio','active','fruit',{gm:true,noCard:true});
define('Logia','Sentire l’Elemento|Sentire l\'Elemento|Corpo Diffuso','passive','any');
define('Logia','Corpo Elementale','passive','move');
define('Logia','Sempre in Forma|Assorbire|Chi Ti Tocca','passive','defense');
define('Logia','Elemento Onnipresente|Dominio dell’Elemento|Dominio dell\'Elemento|Fonte Inesauribile','passive','fruit');
define('Logia','Forma Perduta','active','move');
define('Logia','Riformarsi Altrove','passive','reactiveEvent',{action:'reaction'});
define('Logia','Risveglio','active','fruit',{noCard:true});
define('Zoan','Forma Ibrida','active','physical');
define('Zoan','Tre Forme','active','physical');
define('Zoan','Artigli e Zanne|Stazza|Ferocia Crescente','passive','melee');
define('Zoan','Corsa Bestiale','passive','move');
define('Zoan','Resistenza Bestiale','passive','defense');
define('Zoan','Retaggio Ancestrale|Retaggio Mitologico|Retaggio Ancestrale / Mitologico|Zoan Mitologico / Ancestrale','passive','fruit');
define('Zoan','Istinto di Sopravvivenza|Trasformazione Istintiva','active','defense');
define('Zoan','Istinto di Sopravvivenza','passive','reactiveEvent');
define('Zoan','Trasformazione Istintiva','passive','reactiveEvent',{action:'reaction'});
define('Zoan','Risveglio','active','physical',{noCard:true});
define('Sniper','Ricarica Rapida','active','ranged',{action:'bonus'});
define('Swordsman','Riposta','passive','counter',{costST:1});
define('Striker','Slancio|Guardia Rotta','passive','unarmed');
define('Crusher','Rompiguardia','passive','blunt');
define('Crusher','Contrappeso','passive','outside',{action:'reaction'});
define('Swordsman','Taglio Netto','passive','blade');
define('Swordsman','Parata Perfetta','passive','parry',{action:'modifier'});
define('Sniper',"Tiro dall'Ombra",'passive','ranged');
define('Sniper','Appostamento','passive','ranged',{action:'prepared'});
define('Sniper','Tiro di Copertura','active','outside',{action:'normal'});
define('Sniper','Colpo Anticipato','passive','outside',{action:'reaction'});
define('Tossicologo','Colpo di Grazia','passive','attack');

/* Explicit timing wins over the historical ST heuristic. A zero-ST Reaction or
 * preparation is not an additional free attack or an extra Bonus Action. */
function talentST(desc) {
 const n=String(desc||'').match(/(?:spend\w*\s+|\+|,\s*)(\d+)\s*(?:ST|Stamina)\b/i)||String(desc||'').match(/\b(\d+)\s+ST\b/);
 return n?+n[1]:0;
}
function talentMeta(meta, desc) {
 return meta;
}

function transaction(change, owner=CT.activeId) {
 if(owner!==CT.activeId || !CT.chars[owner]) throw Error('Il personaggio attivo è cambiato. Riapri la carta sul suo proprietario.');
 const next=copy(pg), state=copy(CT);change(next);state.chars[owner]=next;
 // Write first. A failed write cannot erase portraits or mutate in-memory data.
 (window.GLCStore||localStorage).setItem(KEY,JSON.stringify(state));
 pg=next;CT=state;
 return next;
}
function ensureReferences() {
 const needs=['t1','t2'].some(k=>pg[k]?.nome&&!pg[k].smcId) || list(pg.haki).some(h=>!h.smcId) || list(pg.strumenti).some(i=>!i.smcId);
 if(needs)transaction(p=>{
  ['t1','t2'].forEach(k=>{if(p[k]?.nome&&!p[k].smcId)p[k].smcId=k;});
  list(p.haki).forEach(h=>{if(!h.smcId)h.smcId=uid();});
  list(p.strumenti).forEach(i=>{if(!i.smcId)i.smcId=uid();});
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
 const out=[],talentStates=window.GLCTalents?.states(pg)||[];
 list(pg.extraTech).forEach(t=>{if(t?.id)out.push(sourceTech(t,'tech:'+t.id));});
 ['t1','t2'].forEach(k=>{const t=pg[k];if(t?.nome)out.push(sourceTech(t,'tech:'+(t.smcId||k),'legacy'));});
 const r=race();if(r)out.push({...sourceTech({nome:r.tech,desc:r.techDesc,die:pg.racialDie,attr:'',fonte:'Razziale',eff:[]},'racial:'+r.id,'racial'),historical:!!r.historical});
 const scan=(role,style,slot)=>{
  const T=TALENTS[role];if(!T)return;const branch=T.multi?(style||Object.keys(T.styles)[0]):Object.keys(T.styles)[0];
  if(!styleVisible(branch))return;
  const tree=T.styles[branch];if(!tree)return;
  const prefix=role+' · '+(T.multi?branch:role)+' · ', owned=n=>list(pg.talents).includes(prefix+n);
  tree.talenti.forEach(t=>{
   const alias=t.smcAlias||t.n, meta=talentMeta(t.smc||META[branch+'|'+alias],t.d);
   const reqDef=tree.talenti.find(x=>x.n===t.req||x.smcAlias===t.req);
   const replacedBy=window.GLCPrestige?.superseded(pg,prefix+t.n)||'';
   const state=talentStates.find(x=>x.key===prefix+t.n);
   const unlocked=state?state.active:!replacedBy&&dieRank(roleSkillDieOf(role,style,slot))>=dieRank(t.tier||'d8')&&(!t.req||owned(t.req)||(reqDef&&owned(reqDef.n)));
   if(meta?.noCard)return;
   if(owned(t.n)||owned(alias)||state?.owned)out.push({id:t.smcId,kind:'talent',name:t.n,alias,raw:t,meta,branch,role,roleSlot:slot,unlocked,replacedBy,desc:[t.d,...(window.GLCPrestige?.inherited(pg,prefix+t.n)||[]).map(x=>'Beneficio incorporato — '+x.n+': '+x.d)].join('\n'),icon:talentGlyph(t.n,STYLE_ICON[branch]||'star'),emblem:STYLE_IMG[branch]||ROLE_IMG[role],subtitle:branch+' · '+t.tier});
  });
 };
 scan(pg.role,pg.style,1);scan(pg.role2,pg.style2,2);
 (window.GLCPrestige?.acquired(pg)||[]).filter(t=>!['outside','baseOnly','spirit'].includes(t.match)).forEach(t=>out.push({
  id:'prestige:'+t.id,kind:'talent',prestige:true,name:t.name,alias:t.name,raw:t,branch:t.path.style,unlocked:true,
  meta:{mode:t.action==='bonus'?'active':'passive',match:t.match,action:t.action,quantity:t.id==='raffica-senza-fine'},
  desc:window.GLCPrestigeView.talentText(pg,t),icon:STYLE_ICON[t.path.style]||'star',emblem:STYLE_IMG[t.path.style]||ROLE_IMG[t.path.role],subtitle:'Prestigio · '+t.path.skill+' '+t.path.die
 }));
 (window.GLCTratti?.active(pg)||[]).forEach(t=>out.push({
  id:'trait:'+t.id,kind:'talent',subtype:'uniqueTrait',name:t.name,alias:t.name,raw:t,branch:'Tratti Unici',unlocked:true,
  meta:{mode:'passive',action:'passive',match:'uniqueTrait'},
  desc:[t.metadata||'Tipo: Passivo · Requisiti: '+t.requirementsText,...t.effects,
   'Si applica soltanto quando ricorrono le condizioni della regola; verifica il contesto al tavolo. Non modifica automaticamente il tiro o il costo della Tecnica.'].join('\n'),
  icon:'star',subtitle:'Tratto Unico · '+t.requirementsText
 }));
 if(pg.frutto?.has){const f=pg.frutto;
  const dossier=window.GLCFruits?.dossier(pg),description=dossier?[f.desc,...dossier.sections.flatMap(s=>[s.title,...s.rows.filter(r=>r.value).map(r=>r.label+': '+r.value+(r.warning?' · '+r.warning:''))]),dossier.notes].filter(Boolean).join('\n'):f.desc||'';
  out.push({id:'fruit:'+f.tipo,kind:'fruit',name:f.nome||f.tipo||'Frutto del Diavolo',raw:f,desc:description,emblem:'frutto',subtitle:f.tipo+' · '+f.die});
  const tree=FRUIT_TALENTS[f.tipo];if(tree)tree.talenti.forEach(t=>{
   const alias=t.smcAlias||t.n,prefix='Frutto · '+f.tipo+' · ',owned=n=>list(pg.talents).includes(prefix+n);
   if((t.smc||META[f.tipo+'|'+alias])?.noCard)return;
   const state=talentStates.find(x=>x.key===prefix+t.n);
   const project=t.n==='Forma di Combattimento'&&f.formaCombattimento&&window.GLCFruits
    ?['Progetto corrente della Forma · valori concordati con il GM',...GLCFruits.fields(f,'formaCombattimento',GLCFruits.combat).map(x=>x.label+': '+(x.value||'Da registrare'))].join('\n'):'';
   if(owned(t.n)||owned(alias)||state?.owned)out.push({id:t.smcId,kind:'talent',fruit:true,name:t.n,alias,raw:t,meta:talentMeta(t.smc||META[f.tipo+'|'+alias],t.d),branch:f.tipo,unlocked:state?state.active:dieRank(f.die)>=dieRank(t.tier||'d4')&&(!t.req||owned(t.req)),desc:[t.d,project].filter(Boolean).join('\n'),icon:'fruit',emblem:'frutto',subtitle:f.tipo+' · '+t.tier});
  });
 }
 list(pg.haki).forEach(h=>{if(h&&hakiUnlocked(h).length)out.push({id:'haki:'+(h.smcId||h.name)+':'+HAKI_NAMES.indexOf(h.name),kind:'haki',name:h.name,raw:h,desc:'',icon:h.name===HAKI_NAMES[0]?'fist':h.name===HAKI_NAMES[1]?'eye':'crown',subtitle:hakiGrade(h)});});
 list(pg.armi).forEach(a=>out.push({id:'weapon:'+a.id,kind:'weapon',name:a.nome||'Arma senza nome',raw:a,icon:WEAPON_ICO[a.tipo]||'sword',desc:a.eff?.desc||'',subtitle:a.tipo+' · '+a.grado}));
 (window.GLCFruits?.naturalWeapons(pg,{purpose:'use'})||[]).filter(a=>a.id).forEach(a=>out.push({id:'weapon:'+a.id,kind:'weapon',subtype:'naturalWeapon',name:a.nome||'Arma Naturale',raw:a,icon:WEAPON_ICO[a.tipo]||'sword',desc:[a.anatomia,'Forme: '+list(a.forme).join(', '),'Portata: '+a.portata,a.note,'Fuori Arsenale; richiede Artigli e Zanne. Non concede Stili o loro Talenti.'].filter(Boolean).join('\n'),subtitle:a.tipo+' · '+a.grado+' · '+(a.operational?'disponibile':a.errors.concat(a.operationalErrors).join(' · '))}));
 if(typeof isMusicista==='function'&&isMusicista()){
  out.push({id:'instrument:voice',kind:'instrument',name:'La tua voce',raw:{die:'d4'},icon:'music',desc:'Strumento d4 sempre disponibile.',subtitle:'Voce · d4'});
  list(pg.strumenti).forEach(i=>{if(i.smcId)out.push({id:'instrument:'+i.smcId,kind:'instrument',name:i.nome||'Strumento senza nome',raw:i,icon:'music',desc:i.note||'',subtitle:(i.tipo||'Strumento')+' · '+i.die});});
 }
 list(pg.moduli).forEach(m=>{
  const state=window.GLCCyborg?.evaluate(pg,m,{purpose:'use'}),weapon=window.GLCCyborg?.weapon(m);
  out.push({id:'module:'+m.id,kind:'module',name:m.nome||'Modulo senza nome',raw:m,icon:'gear',
   desc:[m.funzione,weapon?'Modulo-Arma: '+weapon.tipo+' · '+weapon.attr+' · '+weapon.grado:'Modulo funzionale',m.funzioneInattiva?'Funzione inattiva: '+m.funzioneInattiva:'',m.funzioneAttiva?'Funzione attiva: '+m.funzioneAttiva:'',m.eff?.testo,m.eff?.cond,m.eff?.limiti,m.effLegacy].filter(Boolean).join('\n'),
   subtitle:state?((state.operational?'Attivo · operativo':state.operationalErrors.map(e=>e.text).join(' · '))+' · Fascia '+m.req):(modStateLabel(m).t||m.stato)});
 });
 out.filter(s=>s.id==='glc-talent-014').forEach(s=>{
  s.resolution=smashHitProfile(s);
  s.desc+='\nSkill di Ruolo corrente: '+s.resolution.skill+' '+s.resolution.die+'. Quattro tiri con '+s.resolution.attackFormula+', tutti con Vantaggio; il Dado Danno usa lo stesso pool '+s.resolution.die+'.';
 });
 return out.filter((s,i,a)=>s.id&&a.findIndex(x=>x.id===s.id)===i);
}
const findSource=(id,ss=sources())=>ss.find(s=>s.id===id);
const hasEffect=(t,n)=>list(t?.eff).includes(n);
const isAttack=t=>['Singolo','Area'].includes(t?.forma);
const isMelee=t=>isAttack(t)&&t.stile!=='Sniper'&&t.forma!=='Area';
const isDefense=t=>t?.forma==='Difesa';
const isActiveDefense=(t,m={})=>isAttack(t)&&m.techniqueUse==='defense';
const isNormalParry=(t,m={})=>isAttack(t)&&t.fonte==='Stile'&&['Swordsman','Crusher'].includes(t.stile)&&m.techniqueUse==='parry';
const isDefending=(t,m={})=>isDefense(t)||isActiveDefense(t,m)||isNormalParry(t,m);
const isPhysical=t=>t?.fonte==='Stile'&&t?.forma!=='Canzone';
function usableBladeCount(){
 const blades=(window.GLCFruits?window.GLCFruits.arsenal(pg,{purpose:'use'}).filter(w=>!w.natural||w.operational):list(pg.armi)).filter(a=>a.tipo==='Lama'&&(!window.GLCTechniques||!window.GLCTechniques.weaponUseError(pg,a))).map(a=>a.moduloId||a.moduleId||a.id);
 if(window.GLCCyborg)list(pg.moduli).forEach(m=>{
  const state=window.GLCCyborg.evaluate(pg,m,{purpose:'use'}),weapon=window.GLCCyborg.weapon(m);
  if(state.operational&&weapon?.tipo==='Lama')blades.push(m.id);
 });
 return new Set(blades.filter(Boolean)).size;
}
function applicable(s,tech,move={}) {
 const t=tech?.raw;if(!t||!s?.meta||!s.unlocked)return false;
 if(s.subtype==='uniqueTrait')return !!window.GLCTratti?.has(pg,s.raw.id);
 const m=s.meta.match;
 if(s.kind==='talent'&&!s.fruit&&['Striker','Crusher','Swordsman','Sniper'].includes(s.branch)&&t.stile!==s.branch)return false;
 const active=findSource(move.activeTalentId),an=active?.alias,defending=isActiveDefense(t,move)||isNormalParry(t,move),parry=isNormalParry(t,move);
 if(defending&&(s.meta.quantity||s.meta.action==='bonus'||s.meta.action==='normal'))return false;
 if(s.prestige&&s.raw.id==='guardia-invalicabile'&&!parry)return false;
 if(parry&&!['parry','defense','successfulDefense','any','blade','physical'].includes(m))return false;
 if(s.branch==='Musicista'&&s.alias==='Requiem'&&!hasEffect(t,'Requiem Beffardo'))return false;
 if(s.branch==='Tossicologo'&&s.alias==='Lama Intinta'&&(!isAttack(t)||t.stile==='Striker'||!recipeWeapon(tech,move)))return false;
 return ({any:true,attack:isAttack(t),physical:isPhysical(t)||t.fruitType==='Zoan',
  unarmed:t.stile==='Striker'&&isAttack(t),blunt:t.stile==='Crusher'&&isAttack(t),
  blade:t.stile==='Swordsman'&&isMelee(t),ranged:t.stile==='Sniper'&&isAttack(t),
  melee:isMelee(t),move:t.forma==='Spostamento'||hasEffect(t,'Scatto')||hasEffect(t,'Inseguire'),
  grab:hasEffect(t,'Presa')||hasEffect(t,'Proiezione'),counter:defending,
  parry,successfulDefense:defending,defense:isDefending(t,move),song:t.forma==='Canzone',fruit:t.fonte==='Frutto',
  poison:hasEffect(t,'Veleno')||an==='Lama Intinta',shock:/^Onda d['’]Urto$/.test(an||''),
  precision:t.stile==='Striker'&&t.attr==='Tecnica'&&isMelee(t),
  seismic:t.stile==='Crusher'&&t.attr==='Forza'&&isAttack(t)&&!!window.GLCPrestige?.level(pg.attr?.Forza),
  singleRanged:t.stile==='Sniper'&&t.forma==='Singolo'&&!hasEffect(t,'Catena')&&!hasEffect(t,'Rimbalzo'),
  ricochet:t.stile==='Sniper'&&(hasEffect(t,'Catena')||hasEffect(t,'Rimbalzo')),
  support:true,reactiveEvent:true,healing:hasEffect(t,'Cura'),preparato:false,invention:!!move.moduleId,
  twoBlades:t.stile==='Swordsman'&&isAttack(t)&&usableBladeCount()>=2
 })[m]===true;
}
function compatibleEquipment(s,tech,ignoreState=false) {
 const t=tech?.raw;if(!t||t.fonte!=='Stile'||t.forma==='Canzone')return false;
 if(s.kind==='weapon')return window.GLCTechniques?window.GLCTechniques.compatibleWeapon(s.raw,t.stile)&&!window.GLCTechniques.weaponUseError(pg,s.raw):t.stile!=='Striker'&&weaponCompat(s.raw).s==='ok'&&weaponStyleReq(s.raw)===t.stile;
 if(s.kind==='module'&&window.GLCCyborg){
  const check=window.GLCCyborg.evaluate(pg,s.raw,{purpose:ignoreState?'build':'use'}),weapon=window.GLCCyborg.weapon(s.raw);
  return check.valid&&(ignoreState||check.operational)&&!(t.stile==='Striker'&&s.raw.arma)&&
   (!['Swordsman','Crusher','Sniper'].includes(t.stile)||!!weapon&&window.GLCTechniques.compatibleWeapon(weapon,t.stile));
 }
 if(s.kind==='module')return moduliVisibili() && !(t.stile==='Striker'&&s.raw.arma) &&
  (!s.raw.eff?.tgt||hasEffect(t,s.raw.eff.tgt)) &&
  (ignoreState||(s.raw.stato!=='danneggiato'&&pg.moduloAttivo===s.raw.id));
 return false;
}
function techniqueRules(){
 const owned=name=>window.GLCTalents?window.GLCTalents.has(pg,name,{includeInherited:true}):list(pg.talents).some(key=>String(key).split(' · ').pop()===name);
 return {pg,catalogue:TEC_EFF,whitelist:STILE_WHITELIST,precisioneAssoluta:!!window.GLCPrestige?.has(pg,'precisione-assoluta'),nessunoDeiMiei:owned('Nessuno dei Miei')};
}
function techniqueDraft(s,move={}){
 const draft=copy(s?.raw||{});
 if(move.weaponId){draft.arma=move.weaponId.replace(/^weapon:/,'');draft.modulo='';}
 else if(move.moduleId){draft.modulo=move.moduleId.replace(/^module:/,'');draft.arma='';}
 return draft;
}
function recipeWeapon(tech,move={},ss=sources()){
 const module=findSource(move.moduleId||(!move.weaponId&&tech?.raw.modulo?'module:'+tech.raw.modulo:''),ss);
 const virtual=module&&window.GLCCyborg?.weapon(module.raw);
 return virtual?{...module,raw:virtual}:findSource(move.weaponId,ss);
}
function currentRoleSaveSource(source={}){
 const slot=source.roleSlot||((source.branch===pg.style2&&pg.role2==='Combattente')?2:1);
 const skill=window.GLCTalents?.skillName(pg,slot)||((slot===2?pg.roleSkillChoice2:pg.roleSkillChoice)==='Acrobazia'?'Acrobazia':'Atletica');
 return {name:skill,die:window.GLCTalents?.skillDie(pg,skill)||(slot===1?pg.roleSkillDie:pg.skills?.[skill])||''};
}
function directSaveProfile(id,name,state,attribute,source,when){
 return {id,name,state,attribute,source:source.name,die:source.die,threshold:window.GLCPrestige?.saveThreshold(source.die)??null,when};
}
function strikerSignatureSaves(source={},attack={}){
 const from=attack.base?currentRoleSaveSource(source):{name:'Grado della Tecnica',die:attack.technique?.die||''};
 const when='Il Colpo Sfonda si attiva su '+(attack.base?'un attacco base a mani nude':'questa Tecnica offensiva Striker')+' con colpo pulito di margine +4, al massimo una volta per turno fra tutti i colpi, e scegli lo Stato previsto per 1 turno';
 return [directSaveProfile(attack.id||source.id,'Firma · Il Colpo Sfonda'+(attack.base?' · attacco base':''),'Stordito','Forza',from,when),directSaveProfile(attack.id||source.id,'Firma · Il Colpo Sfonda'+(attack.base?' · attacco base':''),'Sbilanciato','Tecnica',from,when)];
}
function smashHitProfile(source){
 const from=currentRoleSaveSource(source),save=directSaveProfile(source.id,source.name,'Stordito','Forza',from,'Smash Hit ottiene almeno tre colpi riusciti nella sua unica combinazione; i singoli colpi non attivano Pressione Costante, Guardia Rotta o Il Colpo Sfonda');
 return {skill:from.name,die:from.die,rolls:4,advantage:true,attackFormula:'Attributo scelto + ('+from.die+') '+from.name,
  damage:[0,1,2,4,6].map((dice,hits)=>({hits,dice,pool:from.die,formula:dice?dice+' × ('+from.die+')':'Nessun danno',state:hits>=3?'Stordito':''})),
  save,costST:5,uses:1,frequency:'scontro',requiresGM:true,singleCombination:true,excluded:['altre Tecniche','altri Talenti','Firma dello Stile','effetti dell’arma']};
}
function directTalentSaves(s){
 if(!s||s.kind!=='talent'||s.subtype==='uniqueTrait')return [];
 const skill=name=>({name,die:window.GLCTalents?.skillDie(pg,name)||pg.skills?.[name]||''});
 const profiles={
  'glc-talent-011':()=>directSaveProfile(s.id,s.name,'Sbilanciato','Tecnica',currentRoleSaveSource(s),'il Talento lancia una creatura già Trattenuta, rispettando le condizioni della Proiezione; vale anche per il secondo nemico colpito nella collisione'),
  'glc-talent-023':()=>directSaveProfile(s.id,s.name,'Sbilanciato','Tecnica',skill('Atletica'),'Colpo Pesante Maestria applica Sbilanciato dopo un colpo riuscito'),
  'glc-talent-080':()=>directSaveProfile(s.id,s.name,'Sbilanciato','Tecnica',skill('Medicina'),'Punti di Pressione si applica con un colpo riuscito in mischia a una creatura vivente, una volta per scontro'),
  'glc-talent-095':()=>directSaveProfile(s.id,s.name,'Sbilanciato','Tecnica',skill('Medicina'),'Colpo di Grazia colpisce una creatura già Avvelenata e il colpo la porta sotto metà PV; questa Salvezza è distinta da quella della dose'),
  'glc-talent-258':()=>directSaveProfile(s.id,s.name,'Sbilanciato','Tecnica',{name:'Dado del Frutto',die:pg.frutto?.die||''},'Stazza travolge una creatura di Stazza inferiore muovendoti attraverso di lei in Forma Bestiale'),
  // Ultimate use their own execution, and stay outside a normal Technique recipe.
  'glc-talent-014':()=>smashHitProfile(s).save,
  'glc-talent-028':()=>directSaveProfile(s.id,s.name,'Sbilanciato','Tecnica',skill('Atletica'),'l’Onda d’Urto di Cataclisma colpisce il bersaglio, secondo la procedura propria della Ultimate'),
 };
 return profiles[s.id]?[profiles[s.id]()]:[];
}
function techniqueProblems(s,move={}) {
 if(!s||s.kind!=='tech')return ['Scegli una Tecnica esistente.'];
 if(s.techKind!=='built'){
  if(s.techKind==='racial')return s.historical?['Questa Tecnica Razziale appartiene a una Razza storica rimossa dal regolamento corrente. I dati e i riferimenti della carta sono conservati, ma la capacità non è disponibile per l’esecuzione.']:[];
  const errors=['Questa Tecnica storica richiede la conversione nel Costruttore: scegli Fonte, Stile, Forma e profilo degli effetti. La descrizione libera e un costo registrato non sostituiscono la validazione delle regole.'];
  if(!['d4','d6','d8','d10','d12','d20'].includes(s.raw.die))errors.push('Le Tecniche personalizzate non possono superare d20. Correggi il Grado della Tecnica salvata.');
  if(s.raw.attr&&!pg.attr?.[s.raw.attr])errors.push('Manca l’Attributo della Tecnica salvata.');
  if(s.raw.attr&&pg.attr?.[s.raw.attr]&&dieRank(s.raw.die)>Math.min(dieRank(pg.attr[s.raw.attr]),dieRank('d20')))errors.push('Il Grado della Tecnica salvata supera il suo Attributo.');
  return errors;
 }
 if(window.GLCTechniques){
  const draft=techniqueDraft(s,move);
  return window.GLCTechniques.evaluate(pg,draft,techniqueRules()).errors.map(e=>e.text);
 }
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
 const max=hakiPipAxis(s.raw)?hakiPipOf(s.raw):Math.min(hakiPip(window.GLCPrestige?.effectiveHakiDie(pg,s.raw)||s.raw.die),HAKI_PROG[s.name]?.max||5);
 const v=pg.specialMoveSession?.haki?.[s.id]||{};
 const effects={};
 hakiUnlocked(s.raw).forEach(row=>{if(row.durationTurns>1){const id='act:'+row.k;effects[id]=row.prestige&&!v.active?0:Math.max(0,Math.min(row.durationTurns,Math.floor(number(v.effects?.[id],0))));}});
 return {active:v.active===true,pipRemaining:Math.max(0,Math.min(max,number(v.pipRemaining,max))),turns:Math.max(0,number(v.turns,0)),effects,max};
}
/* Each use has one shared Bonus Action. Preparation is a requirement, not an
 * automatic activation or a free extension of an effect's original duration. */
function actionPlan(m,ss=sources(),tech=findSource(m.baseTechId,ss)) {
 const bonus=[],haki=[],errors=[],reaction=[],normal=[];
 const defending=isActiveDefense(tech?.raw,m)||isNormalParry(tech?.raw,m);
 if(tech)(defending?reaction:normal).push({id:tech.id,text:tech.name});
 ss.filter(s=>selectedIDs(m).includes(s.id)&&s.kind==='talent').forEach(s=>{
  const action=s.meta?.action;
  if(action==='reaction'&&!(defending&&['defense','counter','parry'].includes(s.meta?.match)))reaction.push({id:s.id,text:s.name});
  else if(action==='normal')normal.push({id:s.id,text:s.name});
  else if(action==='bonus'||s.meta?.mode==='active')bonus.push({id:s.id,text:s.name});
 });
 if(ss.some(s=>selectedIDs(m).includes(s.id)&&s.kind==='talent'&&s.unlocked&&s.meta?.action==='freeMain'&&applicable(s,tech,m))&&!defending){const i=normal.findIndex(n=>n.id===tech?.id);if(i>=0)normal.splice(i,1);}
 list(m.hakiSelections).forEach(selection=>{
  const s=findSource(selection.id,ss);if(s?.kind!=='haki')return;
  const state=hakiState(s),effects=hakiEffects(s,tech,m),chosen=list(selection.effects).map(id=>effects.find(e=>e.id===id)).filter(Boolean);
  const prepared=selection.activation==='prepared',activation=!prepared&&!state.active;
  const preparedEffects=[];
  list(selection.preparedEffects).forEach(id=>{
   const effect=chosen.find(e=>e.id===id);
   if(!effect||effect.mode!=='active'||!(effect.row.durationTurns>1))errors.push({id:s.id,text:s.name+': questo effetto non può essere conservato da un turno precedente ('+id+').'});
   else preparedEffects.push(effect);
  });
  const fresh=chosen.filter(e=>e.mode==='active'&&!preparedEffects.includes(e));
  if(activation)bonus.push({id:s.id,text:'Attivazione '+s.name,activation:true});
  fresh.forEach(e=>bonus.push({id:s.id,text:e.name}));
  haki.push({source:s,selection,state,chosen,preparedEffects,fresh,prepared,activation});
 });
 // Sintonia groups only color activations: every color still pays its own PIP.
 if(window.GLCPrestige?.has(pg,'sintonia-dei-colori')){
  const activations=bonus.filter(b=>b.activation),capacity=window.GLCPrestige.level(pg.attr?.Spirito)===6?3:2;
  if(activations.length>1){const count=Math.min(capacity,activations.length),group=activations.slice(0,count);group.forEach(b=>bonus.splice(bonus.indexOf(b),1));bonus.push({id:'prestige:sintonia-dei-colori',text:'Sintonia dei Colori · '+count+' attivazioni (1 PIP ciascuna)'});}
 }
 if(bonus.length>1)errors.push({code:'bonus',text:'Una sola Azione Bonus per turno: '+bonus.map(b=>b.text).join(' + ')+'. Scegli un solo effetto attivo; l’Haki e gli effetti persistenti necessari vanno preparati nei turni precedenti.'});
 if(reaction.length>1)errors.push({code:'reaction',text:'Una sola Reazione disponibile: '+reaction.map(r=>r.text).join(' + ')+'. La ricetta non concede Reazioni aggiuntive.'});
 if(normal.length>1)errors.push({code:'normal',text:'Una sola Azione principale: '+normal.map(r=>r.text).join(' + ')+'. Le preparazioni vanno eseguite nel turno previsto dalla loro regola.'});
 return {normal:normal.length,reactions:reaction.length,used:bonus.length,limit:1,bonus,haki,errors};
}
function hakiEffects(s,tech,move={}) {
 const t=tech?.raw;
 const defending=isDefending(t,move),activeDefense=isActiveDefense(t,move)||isNormalParry(t,move);
 return hakiUnlocked(s.raw).flatMap(row=>{
  const key=String(row.k),a=[];
  if(row.pass)a.push({id:'pass:'+key,mode:'passive',name:row.liv+' · '+key,desc:row.pass,cost:0,row});
  if(row.act){let ok=true;
   if(s.name===HAKI_NAMES[0])ok=['d8','d12'].includes(key)?defending:isAttack(t)&&!activeDefense;
   if(s.name===HAKI_NAMES[1]&&key==='d8')ok=activeDefense;
   if(s.name===HAKI_NAMES[1]&&key==='d12')ok=defending;
   if(s.name===HAKI_NAMES[2]&&key==='3')ok=isAttack(t)&&isPhysical(t)&&!activeDefense;
   if(row.prestige)ok=row.id==='ryou-persistente'?isAttack(t)&&!activeDefense:({any:true,defense:defending,attack:isAttack(t)&&isPhysical(t)&&!activeDefense,physical:isAttack(t)&&isPhysical(t)&&!activeDefense,counter:activeDefense})[row.match]===true;
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
 if(s.kind==='module'){
  const check=window.GLCCyborg?.evaluate(pg,s.raw,{purpose:'build'});
  return check?!!check.legacyUnresolved||!check.structuredKnown:!!(s.raw.eff?.testo||s.raw.effLegacy||s.raw.fuel?.on);
 }
 return false;
}
function sourceCost(s,move={}) {
 if(requiresGM(s)){
  const stored=pg.specialMoveSourceCosts?.[s.id],c=costFields(stored);
  if(!c||stored.basis!==costBasis(s))return null;
  if(recordsDiscount(s)&&!['discountST','minimumST'].every(k=>Number.isInteger(c[k])&&c[k]>=0&&c[k]<=999))return null;
  return c;
 }
 const c={st:0,pip:0,maintenanceST:0,maintenancePIP:0,resource:0};
 if(s.kind==='tech'&&s.techKind==='built'){const t=techniqueDraft(s,move),v=window.GLCTechniques?window.GLCTechniques.cost(t,TEC_EFF,techniqueRules()):tecCost(t);c.st=v.st;c.maintenanceST=v.pt;}
 if(s.kind==='module'&&window.GLCCyborg){const check=window.GLCCyborg.evaluate(pg,s.raw,{purpose:'use'});c.st=check.cost.st;c.resource=check.cost.resource;}
 if(s.prestige)c.st=s.raw.costST;
 else if(s.kind==='talent'&&Number.isInteger(s.meta?.costST))c.st=s.meta.costST;
 else if(s.kind==='talent'&&s.meta?.mode==='active'){
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
 const base=findSource(m.baseTechId);
 if(!m.weaponId&&!m.moduleId&&base?.raw.modulo)m={...m,moduleId:'module:'+base.raw.modulo};
 if(!m.weaponId&&!m.moduleId&&String(base?.raw.arma||'').startsWith('natural:'))m={...m,weaponId:'weapon:'+base.raw.arma};
 // Cards saved while a 0 ST talent was still active keep it, now among the passive ones.
 if(m.activeTalentId&&findSource(m.activeTalentId,sources())?.meta?.mode==='passive')
  m={...m,passiveTalentIds:[...list(m.passiveTalentIds),m.activeTalentId],activeTalentId:''};
 // Talents that can never enter a card (Risveglio) are dropped from cards saved earlier.
 const barred=noCardIds();
 if(barred.has(m.activeTalentId)||list(m.passiveTalentIds).some(id=>barred.has(id)))
  m={...m,activeTalentId:barred.has(m.activeTalentId)?'':m.activeTalentId,passiveTalentIds:list(m.passiveTalentIds).filter(id=>!barred.has(id))};
 return {...m,id:m.id||uid(),name:String(m.name||''),baseTechId:m.baseTechId||'',techniqueUse:['defense','parry'].includes(m.techniqueUse)?m.techniqueUse:'normal',instrumentId:m.instrumentId||'',activeTalentId:m.activeTalentId||'',
  passiveTalentIds:uniq(list(m.passiveTalentIds)),hakiSelections:list(m.hakiSelections).filter(h=>h&&typeof h==='object').map(h=>({...h,id:h.id,use:h.use||'offense',effects:uniq(list(h.effects)),activation:h.activation==='prepared'?'prepared':'auto',preparedEffects:uniq(list(h.preparedEffects))})),
  fruitSelections:uniq(list(m.fruitSelections)),weaponId:m.weaponId||'',moduleId:m.moduleId||'',
  talentUses:m.talentUses||{},talentTechniqueUses:m.talentTechniqueUses||{},conditions:m.conditions||{},sequence:uniq(list(m.sequence)),
  presentation:{subtitle:'',quote:'',quoteZone:'bottom',variant:'dossier',finish:'none',zoom:1,x:50,y:50,...m.presentation},notes:String(m.notes||'')};
}
function selectedIDs(m) {return uniq([m.baseTechId,m.activeTalentId,...list(m.passiveTalentIds),...list(m.fruitSelections),...list(m.hakiSelections).map(h=>h.id),m.weaponId,m.moduleId,m.instrumentId].filter(Boolean));}
function resolve(input) {
 const m=normalizeMove(input),ss=sources(),tech=findSource(m.baseTechId,ss),t=tech&&techniqueDraft(tech,m);
 const errors=[],unavailable=[],unknown=[],rows=[],conditions=[],formulas=[],resources=[],directSaves=[];
 const selected=selectedIDs(m).map(id=>findSource(id,ss)).filter(Boolean);
 const economy=actionPlan(m,ss,tech);errors.push(...economy.errors);
 conditions.push({id:tech?.id,text:'Economia del turno: '+economy.normal+' Azione normale + '+economy.reactions+'/1 Reazione + '+economy.used+'/1 Azione Bonus'+(economy.bonus.length?' ('+economy.bonus.map(b=>b.text).join(' + ')+')':' (Bonus libera)')+'. I passivi e il mantenimento Haki non occupano la Bonus.'});
 selectedIDs(m).forEach(id=>{
  if(findSource(id,ss))return;
  if(id.startsWith('trait:')){
   const trait=window.GLCTratti?.states(pg).find(t=>t.id===id.slice(6));
   const text=!window.GLCTratti?'Catalogo dei Tratti Unici non disponibile. Aggiorna la pagina prima di utilizzare questa carta.':
    !trait?'Tratto Unico non più presente nel catalogo · '+id:trait.superseded?trait.name+': '+trait.reason:
    !trait.acquired?trait.name+': non più acquisito. La carta conserva il riferimento finché non lo correggi.':trait.name+': inattivo. '+trait.reason;
   errors.push({id,text});
  }else errors.push({id,text:'Fonte non più presente · '+id});
 });
 techniqueProblems(tech,m).forEach(text=>errors.push({id:m.baseTechId,text}));
 if(t&&window.GLCFruits)unavailable.push(...window.GLCFruits.useProblems(pg,t));
 if(t&&window.GLCTechniques){const opts=techniqueRules(),area=window.GLCTechniques.areaUpgrade(t,opts),duration=window.GLCTechniques.durationBenefit(t,opts);if(area)conditions.push({id:tech.id,text:area.text});if(duration)conditions.push({id:tech.id,text:duration.text});}
 if(m.techniqueUse==='defense'&&!isAttack(t))errors.push({id:m.baseTechId,text:'La Difesa Attiva con una Tecnica richiede una Tecnica d’attacco compatibile.'});
 if(m.techniqueUse==='parry'&&!isNormalParry(t,m))errors.push({id:m.baseTechId,text:'La Parata con arma richiede una Tecnica di contesto Swordsman o Crusher e un’arma da mischia compatibile.'});
 if(isNormalParry(t,m)&&!recipeWeapon(tech,m,ss))errors.push({id:m.baseTechId,text:'Parata: collega l’arma compatibile effettivamente impugnata.'});
 if(m.instrumentId&&t?.forma!=='Canzone')errors.push({id:m.instrumentId,text:'Lo strumento musicale si collega soltanto a una Canzone.'});
 let st=0,pip=0,maintenanceST=0,maintenancePIP=0;const pipByColor={};
 const talentSelected=selected.filter(s=>s.kind==='talent');
 if(talentSelected.filter(s=>s.meta?.mode==='active').length>1)errors.push({text:'La carta contiene più di un Talento attivo.'});
 talentSelected.forEach(s=>{if(!applicable(s,tech,m))errors.push({id:s.id,text:s.name+(s.replacedBy?': evoluto in '+s.replacedBy+'. La versione precedente non è più utilizzabile.':': non più acquisito, sbloccato o compatibile.')});
  if(s.meta?.mode==='active'&&s.id!==m.activeTalentId)errors.push({id:s.id,text:s.name+': deve occupare lo slot del Talento attivo.'});
  if(s.meta?.mode==='passive'&&s.id===m.activeTalentId)errors.push({id:s.id,text:s.name+': è un Talento passivo.'});
 });
 if(m.weaponId&&m.moduleId)errors.push({text:'Una Tecnica usa un’arma oppure un modulo, mai entrambi.'});
 selected.filter(s=>['weapon','module'].includes(s.kind)).forEach(s=>{
  if(!compatibleEquipment(s,tech,true))errors.push({id:s.id,text:s.name+': esecutore incompatibile con la Tecnica.'});
  if(s.subtype==='naturalWeapon'){if(!s.raw.valid)s.raw.errors.forEach(text=>errors.push({id:s.id,text}));else if(!s.raw.operational)s.raw.operationalErrors.forEach(text=>unavailable.push(s.name+': '+text));}
  if(s.kind==='module'&&window.GLCCyborg){
   const check=window.GLCCyborg.evaluate(pg,s.raw,{purpose:'use'});
   if(!check.operational)check.operationalErrors.forEach(e=>unavailable.push(s.name+': '+e.text));
  }else if(s.kind==='module' && (s.raw.stato==='danneggiato'||pg.moduloAttivo!==s.raw.id))unavailable.push(s.name+': '+(s.raw.stato==='danneggiato'?'danneggiato':'inattivo · attivalo dalla scheda del modulo'));
 });
 const aliases=talentSelected.map(s=>s.alias),owns=n=>aliases.includes(n),prestige=id=>talentSelected.find(s=>s.prestige&&s.raw.id===id);
 talentSelected.filter(s=>s.prestige&&s.raw.limit).forEach(s=>{if((Number(pg.prestige?.session?.uses?.[s.raw.id])||0)>=s.raw.limit)unavailable.push(s.name+': utilizzi disponibili esauriti.');});
 const reactions=talentSelected.filter(s=>s.meta?.action==='reaction');
 if(reactions.length)conditions.push({id:reactions[0].id,text:'Questa risposta impiega la tua Reazione disponibile; non concede una Reazione aggiuntiva né un’Azione extra.'});
 selected.filter(s=>s.kind!=='haki'&&s.kind!=='fruit').forEach(s=>{
  let c=sourceCost(s,m);if(!c){unknown.push(s);return;}c={...c};
  const notes=[];
  if(s.prestige&&s.meta.quantity){const q=Number(m.talentUses[s.id]??1);if(!Number.isSafeInteger(q)||q<1||!Number.isSafeInteger(rafficaCost(q)))errors.push({id:s.id,text:'Raffica: indica un numero intero positivo di attacchi extra.'});else{c.st=rafficaCost(q);notes.push(q+' attacchi extra · costi progressivi da 1 a '+q+' ST · 1 Bonus complessiva');}}
  else if(s.kind==='talent'&&s.meta?.quantity){const max=s.alias.includes('Maestria')?3:s.alias.includes('Migliorato')?2:1;const q=Number(m.talentUses[s.id]??1);if(!Number.isSafeInteger(q)||q<1||q>max)errors.push({id:s.id,text:'Raffica: indica da 1 a '+max+' attacchi base extra, con un numero intero.'});else{c.st=rafficaCost(q);notes.push(q+' attacch'+(q===1?'o':'i')+' base extra · costi progressivi da 1 a '+q+' ST · 1×/turno');}conditions.push({id:s.id,text:'Raffica ordinaria: gli extra sono sempre attacchi base a mani nude, non altri usi della Tecnica. Paga prima di ciascun attacco; un mancato consuma ST ma non interrompe la sequenza. Puoi fermarti dopo qualunque extra; Il Colpo Sfonda si attiva al massimo una volta per turno.'});}
  if(s===tech&&s.techKind==='built'){
   if(isNormalParry(t,m)){c.st=0;c.maintenanceST=0;notes.push('Tecnica di contesto: la Parata non ne esegue gli effetti o il mantenimento');}
   let raw=c.st;
   if(t.fonte==='Frutto'){
    if(owns('Nessuno dei Miei')&&hasEffect(t,'Occhio del Ciclone'))notes.push('Occhio del Ciclone gratuito');
    if(window.GLCFruits?.has(pg,'Portata Naturale'))notes.push('Portata Naturale: Gittata gratuita e senza slot; Catena −1 ST, già inclusi nel costo');
   }
   c.st=Math.max(0,raw);
   if(t.forma==='Canzone'&&owns('Fiato Lungo')){c.st=Math.max(1,c.st-1);notes.push('Fiato Lungo: −1, minimo 1');}
   if(t.forma==='Canzone'&&(owns('Contrappunto — Maestria')||prestige('orchestra-vivente'))){c.maintenanceST=0;notes.push('Contrappunto: mantenimento gratuito');}
   if(t.fonte==='Frutto'&&window.GLCFruits?.has(pg,'Senza Contraccolpo'))notes.push('Senza Contraccolpo: −1, minimo 1, già incluso nel costo; ignora solo i Contraccolpi naturali registrati');
   if(t.fonte==='Frutto'&&window.GLCTalents?.has(pg,'Ciò che Resta')){if(t.durata==='Mantieni (+1/turno)')conditions.push({id:s.id,text:'Ciò che Resta: primo turno di mantenimento gratuito; poi '+c.maintenanceST+' ST/turno.'});if(t.durata==='Un turno'&&t.forma==='Area'&&list(t.eff).some(n=>tecEffObj(n)?.[0]==='Zona Persistente'))conditions.push({id:s.id,text:'Ciò che Resta: durata 3 turni senza sovrapprezzo.'});}
   if(t.fonte==='Frutto'&&owns('Fonte Inesauribile')){if(m.conditions.elementSource){c.st=0;c.maintenanceST=0;notes.push('Fonte Inesauribile: condizione dichiarata');}else conditions.push({id:s.id,text:'Fonte Inesauribile: costo 0 ST solo dentro o a ridosso di una grande fonte del tuo elemento.'});}
   /* Il Risveglio Logia non azzera piu` il costo delle Tecniche: si costruisce
      con la Linea Guida del Risveglio, quindi gli effetti li concorda il GM. */
  }
  if(c.pip||c.maintenancePIP){const hs=findSource(c.pipSourceId,ss);if(!hs||hs.kind!=='haki'){unknown.push(s);return;}pipByColor[hs.id]=(pipByColor[hs.id]||0)+c.pip;}
  st+=c.st;pip+=c.pip;maintenanceST+=c.maintenanceST;maintenancePIP+=c.maintenancePIP;
  rows.push({id:s.id,name:s.name,...c,note:notes.join(' · ')});
  if(s.kind==='module'&&window.GLCCyborg){const energy=window.GLCCyborg.evaluate(pg,s.raw,{purpose:'use'}).energy;if(energy.enabled)resources.push({id:s.id,name:energy.type||'Cariche modulo',cost:energy.cost,available:energy.current,max:energy.max,text:'Cariche e ST si pagano separatamente. Il consumo avviene soltanto con l’azione esplicita nella scheda del modulo.'});}
  else if(s.kind==='module'&&s.raw.fuel?.on){const f=s.raw.fuel;resources.push({id:s.id,name:f.tipo||'Risorsa modulo',cost:c.resource,available:number(f.cur),text:clean(f.consumo||'')});if(number(f.cur)<c.resource)unavailable.push(s.name+': '+(f.tipo||'risorse')+' insufficienti.');}
  if(s.kind==='weapon'&&s.raw.eff?.prezzo==='Una carica')resources.push({id:s.id,name:'Carica arma',cost:1,available:null,text:'Gestisci il consumo nella scheda dell’arma.'});
 });
 const techniqueRow=rows.find(row=>row.id===m.baseTechId);
 rows.filter(row=>row.discountST>0).forEach(row=>{
  if(!techniqueRow)return;
  const before=techniqueRow.st;techniqueRow.st=Math.max(row.minimumST,techniqueRow.st-row.discountST);
  st+=techniqueRow.st-before;techniqueRow.note+=(techniqueRow.note?' · ':'')+row.name+': −'+row.discountST+' ST, minimo '+row.minimumST;
 });
 const endless=prestige('raffica-senza-fine');
 if(endless&&techniqueRow){
  const count=Number(m.talentTechniqueUses[endless.id]||0),total=Number(m.talentUses[endless.id]??1);
  if(!Number.isSafeInteger(count)||count<0||count>total||count&&!isMelee(t))errors.push({id:endless.id,text:'Raffica: gli usi aggiuntivi della Tecnica devono essere da 0 al totale degli attacchi extra e richiedono una Tecnica offensiva Striker in mischia.'});
  else if(count){const row=rows.find(r=>r.id===endless.id),extra=count*techniqueRow.st;row.st+=extra;st+=extra;row.note+=' · '+count+' usi aggiuntivi di '+tech.name+' ('+techniqueRow.st+' ST ciascuno)';}
  conditions.push({id:endless.id,text:'Raffica: '+(total-count)+' attacchi base a mani nude extra e '+count+' usi extra della Tecnica offensiva Striker in mischia, oltre all’attacco iniziale. Ogni extra paga il costo progressivo della Raffica più il costo completo della Tecnica e dei suoi effetti, quando usata. Ogni colpo ha un tiro separato. Nessuna nuova Azione, Bonus, Special Move, attivazione Haki o riserva di movimento; paga prima di ciascun colpo e puoi interrompere la sequenza. Un mancato consuma ST ma non interrompe la Raffica. Il Colpo Sfonda si attiva al massimo una volta per turno.'});
 }
 m.hakiSelections.forEach(hsel=>{
  const s=findSource(hsel.id,ss);if(!s||s.kind!=='haki')return;
  const h=s.raw,session=hakiState(s),fx=hakiEffects(s,tech,m),chosen=[];
  list(hsel.effects).forEach(id=>{const e=fx.find(x=>x.id===id);if(e)chosen.push(e);else errors.push({id:s.id,text:s.name+': effetto non più sbloccato o compatibile ('+id+').'});});
  const groups=new Set();chosen.filter(e=>e.mode==='active').forEach(e=>{const group=e.row.variantGroup||String(e.row.k);if(groups.has(group))errors.push({id:s.id,text:s.name+': scegli una sola versione dello stesso effetto Haki, base oppure Prestigio.'});groups.add(group);});
  if(s.name===HAKI_NAMES[0]&&(!['offense','defense'].includes(hsel.use)||(hsel.use==='offense'&&(!isAttack(t)||isActiveDefense(t,m)||isNormalParry(t,m)))||(hsel.use==='defense'&&!isDefending(t,m))))errors.push({id:s.id,text:'Armamento: scegli un impiego coerente con la forma e l’uso della Tecnica.'});
  const plan=economy.haki.find(p=>p.selection===hsel),activation=plan.activation?1:0,effectCost=plan.fresh.reduce((sum,e)=>sum+e.cost,0);
  /* Padronanza dell'Armamento: dal d12, una volta attivato, non chiede più ST. */
  const free=s.name===HAKI_NAMES[0]&&dieRank(window.GLCPrestige?.effectiveHakiDie(pg,h)||h.die)>=dieRank('d12');
  const ongoing=free?0:1;
  pip+=activation+effectCost;pipByColor[s.id]=(pipByColor[s.id]||0)+activation+effectCost;maintenanceST+=ongoing;
  rows.push({id:s.id,name:s.name,st:0,pip:activation+effectCost,maintenanceST:ongoing,maintenancePIP:0,note:(plan.prepared?'Preparato prima: 0 PIP di attivazione in questa mossa':session.active?'Già attivo: 0 PIP di attivazione':'Da attivare: 1 PIP · 1 Bonus')+(effectCost?' + '+effectCost+' PIP effetti':'')+(free?' · dal d12 nessun ST di mantenimento':'')});
  if(plan.prepared){
   conditions.push({id:s.id,text:'Prima della mossa: attiva '+s.name+' in un turno precedente (1 Azione Bonus, 1 PIP già pagato). Nel turno della mossa mantienilo: '+ongoing+' ST/turno, nessuna nuova Bonus o PIP di attivazione.'});
   if(!session.active)unavailable.push(s.name+': preparazione richiesta. Registra il Colore già attivo nello stato del combattimento solo dopo averlo attivato al tavolo.');
  }else if(activation)conditions.push({id:s.id,text:'In questo turno: attiva '+s.name+' con 1 Azione Bonus e 1 PIP, incluso nel costo.'});
  plan.preparedEffects.forEach(e=>{
   const remaining=session.effects[e.id]||0;
   conditions.push({id:s.id,text:e.name+': preparato in un turno precedente con 1 Azione Bonus e '+e.cost+' PIP. Durata originale '+e.row.durationTurns+' turni; residui registrati '+remaining+'. Non ripaga PIP e non occupa la Bonus di questa mossa. Non rinnova la durata.'});
   if(!remaining)unavailable.push(e.name+': effetto preparato assente o scaduto. Registra i turni residui nello stato del combattimento.');
  });
  if(s.name===HAKI_NAMES[2]&&chosen.some(e=>['act:2','act:prestige-pressione-imperiale'].includes(e.id))&&pg.prestige?.session?.emperorUsed)unavailable.push('Grido / Pressione Imperiale: utilizzo condiviso già speso in questo combattimento.');
  chosen.forEach(e=>conditions.push({id:s.id,text:e.desc}));
 });
 Object.entries(pipByColor).forEach(([id,n])=>{const s=findSource(id,ss);if(s&&hakiState(s).pipRemaining<n)unavailable.push(s.name+': servono '+n+' PIP, disponibili '+hakiState(s).pipRemaining+'.');});
 if(number(pg.stCur,6)<st)unavailable.push('Stamina: servono '+st+' ST, disponibili '+number(pg.stCur,6)+'.');
 if(tech){
  const attr=pg.attr?.[t.attr],roll=(attr||'Attributo da definire')+' '+(t.attr||'')+' + '+t.die+' Tecnica';
  const arm=m.hakiSelections.find(x=>findSource(x.id,ss)?.name===HAKI_NAMES[0]);
  const armSource=arm&&findSource(arm.id,ss),armTerm=armSource?(window.GLCPrestige?.effectiveHakiDie(pg,armSource.raw)||armSource.raw.die)+' Armamento':'';
  const obs=m.hakiSelections.find(x=>findSource(x.id,ss)?.name===HAKI_NAMES[1]&&x.effects.some(id=>['act:d8','act:prestige-anticipo-superiore'].includes(id)));
  const hakiFX=id=>m.hakiSelections.find(h=>h.effects.some(key=>key==='act:prestige-'+id||key==='act:prestige-'+id+'-standard'));
  const fullDie=h=>{const source=findSource(h.id,ss);return window.GLCPrestige?.effectiveHakiDie(pg,source.raw)||source.raw.die;};
  if(isAttack(t)&&!isActiveDefense(t,m)&&!isNormalParry(t,m)){
   const anticipation=hakiFX('anticipo-offensivo'),anticipationSource=anticipation&&findSource(anticipation.id,ss);
   formulas.push({label:'Per colpire',text:roll+(anticipation?' + '+(window.GLCPrestige.hakiLevel(pg,anticipationSource.raw)===6&&!anticipation.effects.includes('act:prestige-anticipo-offensivo-standard')?3:2)+' × ('+fullDie(anticipation)+') Anticipo Offensivo · solo questo attacco':''),id:tech.id});
   const terms=[t.die+' Tecnica'];
   list(t.eff).forEach(n=>{const e=n.match(/^\+1(d\d+) Dado Danno$/);if(e)terms.push(e[1]+' '+n);});
   const king=m.hakiSelections.find(h=>findSource(h.id,ss)?.name===HAKI_NAMES[2]&&h.effects.some(id=>['act:3','act:prestige-impatto-sovrano','act:prestige-volonta-illeggibile'].includes(id)));
   if(prestige('maglio-inarrestabile'))terms.push('2 × '+t.die+' Maglio Inarrestabile');
   if(arm?.use==='offense')terms.push(armTerm);
   if(prestige('potenza-del-titano'))terms.push('('+pg.attr.Forza+') Potenza del Titano');
   if(prestige('maglio-inarrestabile'))terms.push('('+pg.attr.Forza+') Forza di Maglio Inarrestabile');
   if(prestige('tiro-risolutivo'))terms.push('('+pg.attr.Astuzia+') Tiro Risolutivo');
   const crush=talentSelected.find(s=>s.branch==='Crusher'&&s.alias.startsWith('Colpo Pesante'));
   if(crush)terms.push((crush.alias.includes('Maestria')?'2 × ':'')+t.die+' '+crush.name);
   // The King's multiplier only maximizes DD, never Attribute, Skill or Armamento.
   let damage=terms.join(' + ');
   if(king){const evolved=king.effects.some(id=>id.startsWith('act:prestige-')),dd=terms.filter(x=>x.includes('Tecnica')||x.includes('Dado Danno')||x.includes('Colpo Pesante')||/^2 × .* Maglio/.test(x)),others=terms.filter(x=>!dd.includes(x));damage=(evolved?'2 × ':'')+'massimo('+dd.join(' + ')+')'+(others.length?' + '+others.join(' + '):'');}

   if(hasEffect(t,'Sovraccarico'))damage='2 × ('+damage+') · Sovraccarico';
   if(hasEffect(t,'Colpo Annientante'))damage='3 × ('+damage+') · Colpo Annientante';
   if(owns("Fendente d'Aria"))damage='⌈('+damage+') / 2⌉ · Fendente d’Aria';
   if(t.forma==='Area')damage='⌊('+damage+') / 2⌋ · per ogni bersaglio dell’Area';
   const ryou=m.hakiSelections.find(h=>findSource(h.id,ss)?.name===HAKI_NAMES[0]&&h.effects.includes('act:d20'))||hakiFX('ryou-persistente');
   if(ryou){const conditionalDamage=owns('Colpo di Grazia')||owns('Forma Ibrida')||owns('Ferocia Crescente')||hasEffect(t,'Esecuzione');damage='2 × ('+damage+(conditionalDamage?' + bonus condizionali al danno effettivamente applicabili':'')+') · Ryou sul totale, una sola volta, solo se è l’attacco fisico compatibile scelto';}
   formulas.push({label:owns('Colpo Mirato')?'Colpo Mirato':'Danno · fonti',text:owns('Colpo Mirato')?'Effetto mirato al posto del danno. Difesa Passiva del bersaglio +2; questa difficoltà non modifica le Salvezze.':damage,id:tech.id});
   const conditional=(label,text,id=tech.id)=>formulas.push({label,text,id});
   if(hasEffect(t,'Carica'))conditional('Carica · condizionale','2 × Dadi Danno, Vantaggio, ignora copertura · al prossimo turno, solo se non vieni colpito.');
   if(hasEffect(t,'Tutto o Niente'))conditional('Tutto o Niente · colpo pulito','3 × danno solo sul +4. Se manchi non puoi difenderti dal prossimo attacco.');
   if(hasEffect(t,'Esecuzione'))conditional('Esecuzione · Quasi Morto','+ '+t.die+' Esecuzione, solo contro un bersaglio Quasi Morto.');
   if(hasEffect(t,'Schianto'))conditional('Schianto · collisione',window.GLCPrestige?.techniqueBenefits(pg,t).some(b=>b.id==='projection')?'Un tiro completo di Forza ('+pg.attr.Forza+') sostituisce d8: una volta al primo urto, sul bersaglio lanciato e sul primo ostacolo. Non ripete gli altri bonus del colpo.':'+ d8 Schianto, solo se il bersaglio urta qualcosa o qualcuno.');
   if(prestige('taglio-colossale'))conditional('Taglio Colossale · solo scenario','+ ('+attr+') al danno strutturale. Nessun danno aggiuntivo diretto alle creature.');
   if(prestige('maglio-inarrestabile')){conditional('Maglio · Parata riuscita','Metà del danno complessivo, arrotondata per difetto, se il tiro per colpire supera la difesa richiesta. Nessun effetto del colpo o innesco da colpo riuscito. Una Schivata riuscita evita tutto.');conditions.push({id:prestige('maglio-inarrestabile').id,text:'Maglio: Vantaggio e DP −5 fino al tuo prossimo turno, anche se manchi. Sbilancia soltanto su colpo riuscito.'});}
   if(prestige('danza-dei-proiettili'))conditional('Danza dei Proiettili','Rimbalzo / Catena: danno pieno a ogni bersaglio previsto. Tiri per colpire separati e un solo tiro di danno; nessun bersaglio aggiuntivo.');
   if(prestige('precisione-chirurgica'))conditional('Precisione Chirurgica · +4','Danno normale più la conseguenza mirata su colpo pulito; 2 ST, nessuna Bonus aggiuntiva.');
   if(hasEffect(t,'Colpo Pesante'))conditional('Colpo Pesante · minimo','Il danno non scende sotto metà del dado.');
   if(owns('Colpo di Grazia'))conditional('Colpo di Grazia · Avvelenato','+ '+t.die+' Colpo di Grazia, solo contro un bersaglio già Avvelenato.');
   if(owns('Forma Ibrida'))conditional('Forma Ibrida · mischia','+1 dado ai tiri fisici e al Danno in mischia; usa il dado previsto dalla tua forma.');
   if(owns('Ferocia Crescente'))conditional('Ferocia Crescente','+1 dado al Danno in mischia dopo essere sceso sotto metà PV, fino a fine scontro.');
   if(ryou){conditional('Ryou · Armamento','Solo su un attacco fisico compatibile: calcola prima il danno totale dell’attacco scelto, con tutti i dadi e bonus effettivamente applicabili, incluse le righe condizionali soltanto quando ne ricorrono i requisiti; poi moltiplica ×2 una sola volta. Non potenzia emissioni elementali o attacchi non fisici. Non moltiplicare nuovamente le singole componenti. Il colpo dall’interno è narrativo, senza una componente numerica separata; il bersaglio conserva Difesa Passiva, Difesa Attiva e Riduzione del Danno.');if(t.fonte==='Frutto')conditions.push({id:tech.id,text:'Ryou: verifica con il GM che questa applicazione del Frutto produca un attacco fisico compatibile. La Fonte Frutto non concede automaticamente questa proprietà; senza la condizione usa il danno ordinario, senza ×2.'});}
   if(hakiFX('ryou-persistente'))conditional('Ryou Persistente · limite del turno','Un solo attacco fisico compatibile per tuo turno durante la durata. Scegli l’attacco prima del tiro: un mancato consuma l’applicazione del turno. Non aggiunge attacchi e non potenzia automaticamente tutti i colpi della Raffica; paghi le azioni e i costi ordinari. Termina se Armamento viene interrotto.');
   if(hakiFX('esplosione-haki-superiore'))conditional('Esplosione Haki Superiore · bersagli secondari','Gli altri nemici risolvono le difese contro il tiro originario e, se colpiti, subiscono ⌊D pertinente / 2⌋, poi le proprie riduzioni. Ryou determina il danno totale dell’attacco secondo la sua regola ×2, senza una componente numerica separata. Nessuna seconda copia sul bersaglio principale; Proiezione, Schianto ed effetti riservati al bersaglio principale non si propagano automaticamente.');
  }else if(isDefending(t,m)){
   const parry=isNormalParry(t,m),weapon=recipeWeapon(tech,m,ss);
   const weaponAttr=weapon?.raw.attr,weaponPool=pg.attr?.[weaponAttr];
   let defense=parry?(weaponPool||'Attributo arma da definire')+' '+(weaponAttr||'')+' + '+(prestige('maestria-assoluta-della-lama')?'d20':weapon?.raw.grado||'Grado arma da collegare')+' arma':isActiveDefense(t,m)?roll:'Effetto difensivo della Tecnica';
   const activeDefense=isActiveDefense(t,m)||parry,guard=parry?'':list(t.eff).find(n=>/^Guardia(?: Migliorata| Maestria| Suprema)?$/.test(n));
   const guardBonus={Guardia:2,'Guardia Migliorata':3,'Guardia Maestria':4,'Guardia Suprema':5}[guard]||0;
   const corazza=arm?.use==='defense'&&arm.effects.includes('act:d12');
   // Manuale 8.7: i dadi appartengono alla Difesa Attiva, mai alla Passiva.
   if(activeDefense){
    if(arm?.use==='defense')defense+=' + '+armTerm;
    if(obs)defense+=' + '+(obs.effects.includes('act:prestige-anticipo-superiore')?3:2)+' × ('+fullDie(obs)+') Anticipo (Osservazione)';
    if(parry&&prestige('guardia-invalicabile'))defense+=' + ('+prestige('guardia-invalicabile').raw.path.die+') Atletica';
    formulas.push({label:parry?'Parata con arma':'Difesa Attiva',text:defense,id:tech.id});
    conditions.push({id:tech.id,text:parry?'Parata con arma: spendi la Reazione e gli eventuali costi della capacità difensiva prima di tirare. La Tecnica scelta dà solo contesto e non esegue né paga i propri effetti. Un risultato pari o superiore all’attacco neutralizza il colpo. Nessun danno automatico.':'Dichiara la Difesa Attiva prima del tiro nemico; spendi la Reazione e il costo completo della Tecnica e degli eventuali potenziamenti prima di tirare. Un risultato pari o superiore all’attacco neutralizza il colpo. Il pareggio non infligge danni; gli effetti offensivi non si applicano automaticamente.'});
   }
   if(guard||corazza)formulas.push({label:'Difesa Passiva',text:'Difesa Passiva attuale'+(guard?' + '+guardBonus+' '+guard+' (fino all’inizio del prossimo turno)':'')+(corazza?' + 4 Corazza d’Armamento (2 turni)':''),id:tech.id});
   if(!activeDefense&&!guard&&!corazza)formulas.push({label:'Difesa',text:defense,id:tech.id});
   if(owns('Contraccolpo')&&activeDefense&&!parry)formulas.push({label:'Contraccolpo',text:t.die+' Dado Danno della Tecnica · soltanto se la Difesa Attiva supera strettamente l’attacco nemico. Il pareggio evita il colpo senza contro-danno; nessun altro effetto offensivo automatico.',id:tech.id});
   if(owns('Riposta')&&activeDefense&&!parry){const w=recipeWeapon(tech,m,ss)||findSource('weapon:'+t.arma,ss);formulas.push({label:'Riposta · attacco separato',text:'Dopo una Difesa Attiva riuscita con la Tecnica, anche in pareggio, puoi spendere 1 ST per un attacco base separato: '+(pg.attr?.[w?.raw.attr]||'Attributo arma da definire')+' '+(w?.raw.attr||'')+' + '+(prestige('maestria-assoluta-della-lama')?'d20':w?.raw.grado||'Grado arma compatibile')+' arma per colpire; un Dado Arma di danno. Non garantisce il colpo e non ripete automaticamente la Tecnica.',id:tech.id});}
  }else formulas.push({label:t.forma||'Risoluzione',text:t.forma==='Canzone'?'Effetto sugli alleati; Salvezza per i nemici secondo la Melodia.':t.forma==='Potenziamento'?'Spendi un’Azione principale e il costo della Tecnica. Il beneficio dura per la scena e lascia libera la Bonus.':tech.techKind==='racial'?t.desc:roll+' · applica gli effetti della Tecnica',id:tech.id});
  if(window.GLCPrestige){
   const b=window.GLCPrestige.techniqueBenefits(pg,t);
   b.forEach(x=>{if(x.id==='projection'&&hasEffect(t,'Proiezione')||x.id==='movement'&&list(t.eff).some(n=>['Scatto','Inseguire','Balzo'].includes(n))||x.id==='jump'&&hasEffect(t,'Balzo')||x.id==='range'&&t.stile==='Sniper'||x.id==='slash'&&prestige('fendente-sovrano')||x.id==='cut'&&prestige('taglio-colossale'))conditions.push({id:tech.id,text:x.name+': '+x.value+' '+x.unit+'. '+x.detail});});
   if(t.stile==='Sniper'&&owns('Colpo Impossibile')){const geometry=window.GLCPrestige.benefits(pg,'Astuzia').find(x=>x.id==='deviations');if(geometry)conditions.push({id:tech.id,text:geometry.name+': '+geometry.value+' '+geometry.unit+'. '+geometry.detail});}
   if(prestige('fendente-sovrano')&&!b.some(x=>x.id==='slash'))conditions.push({id:tech.id,text:'Fendente Sovrano: 10 m di portata con Attributo non ancora in Prestigio; danno pieno e +1 ST.'});
   if(prestige('risonanza-leggendaria')&&t.forma==='Canzone')formulas.push({label:'Risonanza Leggendaria',text:(prestige('risonanza-leggendaria').raw.level===6?'3':'2')+' × dadi di recupero ST, dadi bonus alle prove e importo degli sconti ST della Melodia ordinaria. Sconto con minimo 1 ST; non moltiplica PIP, Vantaggio, portata, bersagli o Ultimate.',id:prestige('risonanza-leggendaria').id});
  }
  if(!isNormalParry(t,m))list(t.eff).forEach(n=>{const e=tecEffObj(n);if(e)conditions.push({id:tech.id,text:n+': '+e[2]});});
  const saveAttributes={Sbilancio:'Tecnica',Sfondamento:'Forza',Accecante:'Tecnica',Terrore:'Spirito',Paralisi:'Forza',Sopore:'Spirito',Prigione:'l’Attributo coerente con la Prigione'};
  const saving=window.GLCTechniques?.states?window.GLCTechniques.states(t,techniqueRules()).filter(x=>x.threshold):list(t.eff).filter(n=>saveAttributes[n]).map(effect=>({effect,attribute:saveAttributes[effect],threshold:window.GLCPrestige?.saveThreshold(t.die)}));
  if(saving.length&&!isActiveDefense(t,m)&&!isNormalParry(t,m)){
   saving.forEach(state=>formulas.push({label:'Salvezza · '+state.effect,text:'Il bersaglio tira soltanto '+state.attribute+' contro Soglia '+state.threshold+' dal Grado '+t.die+' della Tecnica. Un risultato pari o superiore riesce.',id:tech.id}));
   conditions.push({id:tech.id,text:'La fonte non tira per la Salvezza. Se lo Stato persiste, ripeti a fine turno del bersaglio con la Soglia originaria di questa applicazione, salvo una procedura specifica.'});
  }
  if(hasEffect(t,'Presa')&&!isNormalParry(t,m))conditions.push({id:tech.id,text:'Presa: contesa di Forza ogni turno, senza Salvezza graduata. Paghi 1 ST quando la applichi e 1 ST all’inizio di ogni tuo turno successivo, prima di agire; senza pagamento o presa fisica termina.'});
  if(hasEffect(t,'Lacerazione')&&!isNormalParry(t,m))conditions.push({id:tech.id,text:'Sanguinante: non concede Salvezza automatica; lo Stato non si cumula con se stesso e termina con Medicina o una cura appropriata.'});
  if(t.forma==='Canzone'){
   const instrument=findSource(m.instrumentId,ss),effective=instrument&&typeof instrEff==='function'?instrEff(instrument.raw):{eff:'d4',soglia:3};
   if(!instrument&&m.instrumentId)errors.push({id:m.instrumentId,text:'Lo strumento selezionato non è più disponibile: scegli uno strumento posseduto o la voce.'});
   if(list(t.eff).some(n=>['Richiamo','Requiem Beffardo','Ninnananna','Marcia Funebre'].includes(n)))formulas.push({label:'Salvezza · Canzone',text:'Il nemico tira soltanto Spirito contro Soglia '+effective.soglia+' dal Grado effettivo '+effective.eff+' dello strumento '+(instrument?.name||'La tua voce')+'. Arte limita il Grado utilizzabile; il Dado Tecnica non determina questa Soglia.',id:tech.id});
   conditions.push({id:tech.id,text:'Canzone: nessun tiro per colpire, nessuna attivazione della Firma tramite margine +4. Gli alleati ricevono automaticamente gli effetti previsti. La Canzone richiede l’Azione principale.'});
  }
  if(t.durata&&!isNormalParry(t,m))conditions.push({id:tech.id,text:'Durata: '+(window.GLCTechniques?.durationBenefit(t,techniqueRules())?.duration||t.durata)});
 }
 talentSelected.forEach(s=>conditions.push({id:s.id,text:s.name+': '+s.desc}));
 if(owns('Riformarsi Altrove'))formulas.push({label:'Riformarsi Altrove · Reazione',text:'Sequenza distinta: la Tecnica usa la propria Azione e i propri costi nel momento previsto. Riformarsi Altrove impiega una Reazione, 1 volta per scontro, in risposta a un evento immediato e percepibile valutato dal GM: ti ricomponi entro 15 m in un punto visibile e raggiungibile dal tuo elemento, senza Azione principale o Reazioni dovute allo spostamento. Non autorizza questa Tecnica fuori dal tuo turno e non annulla automaticamente un attacco.',id:talentSelected.find(s=>s.alias==='Riformarsi Altrove').id});
 if(owns('Riflesso del Potere'))conditions.push({id:talentSelected.find(s=>s.alias==='Riflesso del Potere').id,text:'Riflesso del Potere: Reazione distinta, 1 volta per scontro, 0 ST, quando tu o un alleato entro 5 m state per subire un attacco. Tutti i Dadi Danno scendono di un Grado, minimo d4; non modifica tiro per colpire, Stati o altri effetti. Non esegue la Tecnica come Reazione e non applica protezioni automaticamente.'});
 if(owns('Istinto di Sopravvivenza'))conditions.push({id:talentSelected.find(s=>s.alias==='Istinto di Sopravvivenza').id,text:'Istinto di Sopravvivenza: 1 volta per scontro, quando scenderesti a 0 PV. Resti cosciente con 1 PV temporaneo fino alla fine del prossimo turno, poi scendi a 0 salvo vera guarigione. Nessuna Bonus, Reazione o cura automatica.'});
 if(owns('Potere Istintivo'))conditions.push({id:talentSelected.find(s=>s.alias==='Potere Istintivo').id,text:'Potere Istintivo: una singola mossa del Frutto non spende l’Azione principale, 1 volta per scena, anche fuori turno. Costi, PIP, mantenimenti e requisiti restano; nessun turno, Movimento, Bonus, Reazione o sequenza aggiuntivi.'});
 if(owns('Trasformazione Istintiva'))conditions.push({id:talentSelected.find(s=>s.alias==='Trasformazione Istintiva').id,text:'Trasformazione Istintiva: Reazione, 0 ST, 1 volta per scena; effettua solo il cambio di forma prima del pericolo, anche senza sensi. La Tecnica della carta mantiene la propria Azione e i propri costi: la Reazione non la esegue e non attiva altri Talenti.'});
 if(m.techniqueUse==='normal')talentSelected.filter(s=>s.unlocked&&applicable(s,tech,m)).forEach(s=>directSaves.push(...directTalentSaves(s)));
 if(tech&&m.techniqueUse==='normal'){
  if(t.fonte==='Stile'&&t.stile==='Striker'&&isAttack(t)){
   if(!hasEffect(t,'Punto di Rottura'))directSaves.push(...strikerSignatureSaves({}, {id:tech.id,technique:t}));
   const flurry=talentSelected.find(s=>s.meta?.quantity&&s.unlocked&&applicable(s,tech,m));
   if(flurry&&(!flurry.prestige||Number(m.talentTechniqueUses[flurry.id]||0)<Number(m.talentUses[flurry.id]??1)))directSaves.push(...strikerSignatureSaves({branch:'Striker',roleSlot:pg.role==='Combattente'&&pg.style==='Striker'?1:2},{id:flurry.id,base:true}));
  }
  if(pg.frutto?.has&&pg.frutto.tipo==='Zoan'&&(!window.GLCFruits||GLCFruits.dice.includes(pg.frutto.die))&&isAttack(t))directSaves.push(directSaveProfile(tech.id,'Firma · Zoan','Stordito','Forza',{name:'Dado del Frutto',die:pg.frutto.die||''},'la Firma Zoan si attiva con un colpo pulito di margine +4 in Forma Ibrida e scegli Stordito al posto del Dado Danno aggiuntivo'));
  if(tech.techKind==='racial'&&pg.race==='mink')directSaves.push(directSaveProfile(tech.id,'Electro','Paralizzato','Forza',{name:'Grado di Electro',die:pg.racialDie||''},'Electro applica la propria Paralisi; conserva durata e costi razziali, e la normale Salvezza ogni turno'));
 }
 directSaves.forEach(profile=>formulas.push({label:'Salvezza condizionale · '+profile.name+' · '+profile.state,
  text:'Quando '+profile.when+': il bersaglio tira soltanto '+profile.attribute+' contro '+(profile.threshold==null?'la Soglia da definire dalla fonte':'Soglia '+profile.threshold)+' da '+profile.source+' ('+(profile.die||'Grado da definire')+'). Un risultato pari o superiore riesce. Questa indicazione non applica automaticamente lo Stato e non modifica la Soglia degli effetti della Tecnica.',id:profile.id}));
 if(talentSelected.some(s=>s.subtype==='uniqueTrait'))conditions.push({text:'Tratti Unici: questi riferimenti sono promemoria condizionali. Non aggiungono Azioni, Bonus, Reazioni, costi, dadi o Vantaggio alla ricetta. I bonus alla Difesa Passiva già inclusi nella scheda non si sommano una seconda volta.'});
 selected.filter(s=>s.kind==='weapon'||s.kind==='module').forEach(s=>{if(s.desc)conditions.push({id:s.id,text:s.name+': '+s.desc});if(s.raw.eff?.freq)conditions.push({id:s.id,text:s.raw.eff.freq});if(s.raw.eff?.prezzo==='PV')conditions.push({id:s.id,text:'Prezzo in PV: '+s.raw.eff.prezzoDett});});
 const invalid=errors.length>0||unknown.length>0;
 return {move:m,sources:ss,selected,tech,errors,unknown,unavailable,rows,conditions,formulas,resources,directSaves,pipByColor,economy,
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
 try {(window.GLCStore||localStorage).setItem(MEDIA_KEY,JSON.stringify(store));return true;}
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
 // A newly synchronized illustration takes precedence over the old device cache.
 const shared=mediaShared(id);if(shared){mediaURLs.set(id,shared);return shared;}
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
 return GLCImages.prepare(file);
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
function actionBudget(r) {
 const e=r.economy,box=node('div','smc-action-budget'+(e.used>e.limit?' smc-action-conflict':''));
 box.append(node('span','smc-eyebrow','NEL TURNO DELLA MOSSA'),node('strong','',e.normal+' Azione · '+e.reactions+'/1 Reazione · '+e.used+'/1 Bonus'),note(e.bonus.length?e.bonus.map(b=>b.text).join(' + '):'Bonus libera · passivi e mantenimento non la consumano.'));
 return box;
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
 const main=node('div','smc-card-data');main.append(node('span','smc-state '+r.status,statusLabel(r)),budget(r),actionBudget(r));
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
 if(s.kind==='haki'){const state=hakiState(s),selection=m.hakiSelections.find(h=>h.id===s.id);return (selection?.activation==='prepared'?(state.active?'Preparato prima · solo mantenimento':'Da preparare prima della mossa'):state.active?'Già attivo':'Da attivare · 1 Bonus e 1 PIP')+' · '+s.subtitle;}
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
function optionCard(s,selected,onPick,detail=true,suffix='',blocked='') {
 const tile=node('div','smc-option'+(selected?' selected':''));
 const pick=button('',onPick,'smc-option-pick',{'aria-pressed':String(selected),'data-smc-focus':'source-'+s.id,...(blocked?{disabled:'',title:blocked}:{})});
 pick.append(iconNode(s,38),node('span','smc-option-copy',null,[node('strong','',s.name),node('small','',s.subtitle||''),node('span','',suffix||s.desc)]),node('span','smc-check',selected?'✓':'+'));
 tile.append(pick);if(blocked)tile.append(note(blocked,'smc-option-reason'));if(detail)tile.append(button('Fonte ↗',()=>sourceDetails(s),'smc-option-detail'));return tile;
}
function stepTechnique(work) {
 work.append(note('La Tecnica è la base meccanica. I suoi dati restano collegati alla scheda e si aggiornano insieme a lei.'));
 const ss=sources().filter(s=>s.kind==='tech');if(!ss.length){work.append(note('Non hai ancora Tecniche: creane una dal Signature Move Builder e torna qui.'));return;}
 const grid=node('div','smc-options');ss.forEach(s=>{
  const cost=sourceCost(s),suffix=(cost?cost.st+' ST'+(cost.maintenanceST?' · +'+cost.maintenanceST+' ST/turno':''):'Costi GM da registrare')+' · '+(list(s.raw.eff).join(' · ')||s.desc||'Senza effetti aggiuntivi');
  grid.append(optionCard(s,UI.draft.baseTechId===s.id,()=>changeDraft(m=>{m.baseTechId=s.id;m.weaponId=s.raw.arma?'weapon:'+s.raw.arma:'';m.moduleId=s.raw.modulo?'module:'+s.raw.modulo:'';if(!isAttack(s.raw))m.techniqueUse='normal';if(s.raw.forma!=='Canzone')m.instrumentId='';}),true,suffix));
 });work.append(grid);
 const chosen=findSource(UI.draft.baseTechId);if(chosen&&chosen.techKind!=='legacy'&&requiresGM(chosen))work.append(gmCostEditor(chosen));
 if(isAttack(chosen?.raw))work.append(selectField('Impiego della Tecnica',UI.draft.techniqueUse,[['normal','Attacco · Azione principale'],['defense','Difesa Attiva con la Tecnica · Reazione'],...(chosen.raw.fonte==='Stile'&&['Swordsman','Crusher'].includes(chosen.raw.stile)?[['parry','Parata con arma · Reazione, senza effetti della Tecnica']]:[])],v=>changeDraft(m=>{m.techniqueUse=v;m.hakiSelections.forEach(h=>{if(findSource(h.id)?.name===HAKI_NAMES[0])h.use=v==='normal'?'offense':'defense';});})));
 if(UI.draft.techniqueUse==='parry')work.append(note('Parata con arma: la Tecnica selezionata fornisce solo il contesto dello Stile e dell’Attributo. La Parata usa l’arma collegata, non esegue gli effetti della Tecnica e non ne paga il costo.'));
 if(chosen?.raw.forma==='Canzone')work.append(selectField('Strumento della Canzone',UI.draft.instrumentId||'instrument:voice',sources().filter(s=>s.kind==='instrument').map(s=>[s.id,s.name+' · '+(typeof instrEff==='function'?instrEff(s.raw).eff:s.raw.die)]),v=>changeDraft(m=>m.instrumentId=v)));
 const issues=resolve(UI.draft).errors.filter(e=>e.id===UI.draft.baseTechId);issues.forEach(e=>work.append(note(e.text,'smc-warning')));
}
function selectTalent(s) {
 const m=UI.draft;if(s.meta.mode==='active'){
  if(m.activeTalentId===s.id){changeDraft(x=>x.activeTalentId='');return;}
  if(actionPlan({...m,activeTalentId:s.id}).used>1){UI.error='La Bonus è già impegnata dall’Haki. In Poteri puoi richiedere un Colore già attivo o togliere l’effetto ⚡ da attivare in questo turno.';renderDialog();return;}
  if(m.activeTalentId&&!confirm('Sostituire «'+(findSource(m.activeTalentId)?.name||'Talento non disponibile')+'» con «'+s.name+'»? Una carta può contenere un solo Talento attivo, anche fra i poteri del Frutto.'))return;
  changeDraft(x=>{x.activeTalentId=s.id;x.passiveTalentIds=x.passiveTalentIds.filter(id=>id!==s.id);x.fruitSelections=x.fruitSelections.filter(id=>id!==s.id);});
 }else{const key=s.fruit?'fruitSelections':'passiveTalentIds';changeDraft(x=>{x[key]=x[key].includes(s.id)?x[key].filter(id=>id!==s.id):[...x[key],s.id];});}
}
function talentsArea(work,fruit) {
 const m=UI.draft,ss=sources(),tech=findSource(m.baseTechId,ss),available=ss.filter(s=>s.kind==='talent'&&!!s.fruit===fruit&&applicable(s,tech,m));
 if(!available.length){work.append(note('Nessun Talento '+(fruit?'del Frutto ':'')+'acquisito e compatibile con questa Tecnica.'));return;}
 for(const mode of ['active','passive']){
  const choices=available.filter(s=>s.meta.mode===mode&&s.subtype!=='uniqueTrait');if(!choices.length)continue;
  work.append(heading(mode==='active'?'Talento attivo':'Passivi, modificatori e reazioni',mode==='active'?'Il Talento conserva il proprio tempo di attivazione. Una sola Bonus è condivisa con l’Haki; preparazioni e Reazioni rispettano le proprie condizioni.':'Non occupano la Bonus. Modificatori e Reazioni conservano i propri costi e requisiti.'));
  const grid=node('div','smc-options');choices.forEach(s=>{const on=selectedIDs(m).includes(s.id),c=sourceCost(s);const suffix=(s.prestige?(s.meta.action==='reaction'?'REAZIONE · ':s.meta.action==='modifier'?'MODIFICATORE · ':mode==='active'?'BONUS · ':'PASSIVO · ')+(c?c.st+' ST · ':''):mode==='active'?(c?c.st+' ST · ':'Costo GM · '):'PASSIVO · ')+s.desc;
   const blocked=!on&&mode==='active'&&actionPlan({...m,activeTalentId:s.id},ss,tech).used>1?'Bonus impegnata dall’Haki: modifica la preparazione in Poteri.':'';
   grid.append(optionCard(s,on,()=>selectTalent(s),true,suffix,blocked));
   if(on&&s.prestige&&s.meta.quantity){
    const quantities=node('div','smc-live-panel');
    const add=(label,value,key,min)=>{const f=field(label,value,()=>{},'number',{min,step:1});f.querySelector('input').onchange=e=>{const n=Number(e.target.value);if(Number.isSafeInteger(n)&&n>=min)changeDraft(d=>d[key][s.id]=n);else {UI.error='Indica un numero intero valido.';renderDialog();}};quantities.append(f);};
    add('Attacchi extra totali · costi 1, 2, 3, 4… ST',m.talentUses[s.id]??1,'talentUses',1);
    add('Di questi, usi della stessa Tecnica · paghi anche il suo costo',m.talentTechniqueUses[s.id]||0,'talentTechniqueUses',0);grid.append(quantities);
   }else if(on&&s.meta.quantity){const max=s.alias.includes('Maestria')?3:s.alias.includes('Migliorato')?2:1;grid.append(selectField('Attacchi base extra',String(m.talentUses[s.id]||1),Array.from({length:max},(_,i)=>[String(i+1),String(i+1)+' · '+rafficaCost(i+1)+' ST totali']),v=>changeDraft(d=>d.talentUses[s.id]=+v)));}
   if(on&&requiresGM(s))grid.append(gmCostEditor(s));
  });work.append(grid);
 }
 const traits=available.filter(s=>s.subtype==='uniqueTrait');
 if(traits.length){
  work.append(heading('Tratti Unici · promemoria condizionali','Si applicano soltanto quando ricorrono le condizioni della regola; verifica il contesto al tavolo. Associarli alla carta non cambia le formule o i costi della Tecnica.'));
  const grid=node('div','smc-options');traits.forEach(s=>grid.append(optionCard(s,selectedIDs(m).includes(s.id),()=>selectTalent(s),true,'PASSIVO · '+s.desc)));work.append(grid);
 }
}
function stepTalents(work) {work.append(actionBudget(resolve(UI.draft)));talentsArea(work,false);invalidSelections(work,'talent');}
function hakiLiveControls(work) {
 sources().filter(s=>s.kind==='haki').forEach(s=>{
  const state=hakiState(s),group=node('div','smc-live-haki');group.append(iconNode(s,26),node('b','',s.name));
  const update=patch=>liveChange(p=>{p.specialMoveSession=p.specialMoveSession||{};p.specialMoveSession.haki=p.specialMoveSession.haki||{};p.specialMoveSession.haki[s.id]={...state,...patch};delete p.specialMoveSession.haki[s.id].max;});
  group.append(button(state.active?'Attivo ✓':'Inattivo',()=>update({active:!state.active,turns:0,effects:state.active?Object.fromEntries(Object.entries(state.effects).map(([id,n])=>[id,id.startsWith('act:prestige-')?0:n])):state.effects}),'smc-button',{'aria-pressed':String(state.active),'data-smc-focus':'live-'+s.id}));
  const remaining=field('PIP rimasti / '+state.max,state.pipRemaining,()=>{},'number',{min:0,max:state.max,step:1,'data-smc-focus':'pip-'+s.id});remaining.querySelector('input').onchange=e=>{const v=Number(e.target.value);if(Number.isInteger(v)&&v>=0&&v<=state.max)update({pipRemaining:v});else {e.target.value=state.pipRemaining;announce('Inserisci PIP fra 0 e '+state.max,true);}};group.append(remaining);
  hakiUnlocked(s.raw).filter(row=>row.act&&row.durationTurns>1).forEach(row=>{
   const id='act:'+row.k,turns=field(row.act.split(':')[0]+' · turni residui',state.effects[id],()=>{},'number',{min:0,max:row.durationTurns,step:1,'data-smc-focus':'duration-'+s.id+'-'+id});
   turns.classList.add('smc-live-duration');turns.querySelector('input').onchange=e=>{const value=Number(e.target.value);if(e.target.value!==''&&Number.isInteger(value)&&value>=0&&value<=row.durationTurns)update({effects:{...state.effects,[id]:value}});else{e.target.value=state.effects[id];announce('Inserisci i turni rimasti, da 0 a '+row.durationTurns+'.',true);}};group.append(turns);
  });
  /* Dal d12 l'Armamento non chiede più ST: non c'è più un conto di turni gratuiti da tenere. */
  work.append(group);
 });
 work.append(note('Stato condiviso da tutte le carte di questo personaggio. Registra i Colori già attivati e gli effetti preparati nei turni precedenti. Aggiorna i PIP rimasti e i turni residui dopo ogni turno; metti 0 quando l’effetto scade. I controlli non spendono ST o PIP, non fanno trascorrere il turno e non modificano la progressione Haki.'));
}
function stepPowers(work) {
 const m=UI.draft,ss=sources(),tech=findSource(m.baseTechId,ss),haki=ss.filter(s=>s.kind==='haki');
 work.append(actionBudget(resolve(m)));
 if(haki.length){work.append(heading('Haki','Attivazione, effetti e mantenimento rimangono distinti. Solo l’Armamento aggiunge il suo dado al danno o alla Difesa Attiva.'));
  const live=el('details',{class:'smc-live-panel','data-smc-state':'haki-live'});live.append(node('summary','','Stato del combattimento · condiviso fra le carte'));hakiLiveControls(live);work.append(live);
  haki.forEach(s=>{
   const selected=m.hakiSelections.find(h=>h.id===s.id),canUse=s.name!==HAKI_NAMES[0]||isAttack(tech?.raw)||isDefense(tech?.raw);if(!canUse&&!selected)return;
   const state=hakiState(s),block=node('div','smc-power');block.append(optionCard(s,!!selected,()=>changeDraft(d=>{d.hakiSelections=selected?d.hakiSelections.filter(h=>h.id!==s.id):[...d.hakiSelections,{id:s.id,use:isDefense(tech?.raw)?'defense':'offense',effects:[],preparedEffects:[],activation:!state.active&&actionPlan(d).used?'prepared':'auto'}];}),true,(state.active?'Attivo · 0':'Da attivare · 1')+' PIP attivazione · '+state.pipRemaining+'/'+state.max+' PIP disponibili'));
   if(selected){
    block.append(selectField('Quando attivi '+s.name,selected.activation||'auto',[
     ['auto',state.active?'Colore già attivo nello stato del combattimento':'In questa mossa · 1 Bonus + 1 PIP'],
     ['prepared','Prima della mossa · richiede il Colore già attivo']
    ],v=>changeDraft(d=>d.hakiSelections.find(h=>h.id===s.id).activation=v)));
    if(selected.activation==='prepared')block.append(note('Preparazione: attiva questo Colore in un turno precedente, pagando 1 PIP e la Bonus. Nel turno della mossa applichi il mantenimento; i costi preparatori non si pagano di nuovo.'));
    if(s.name===HAKI_NAMES[0])block.append(selectField('Impiego dell’Armamento',selected.use,isDefending(tech?.raw,m)?[['defense',isActiveDefense(tech?.raw,m)?'Difesa Attiva · aggiungi il dado al tiro':'Difesa · effetti Haki, senza dado alla Difesa Passiva']]:[['offense','Offesa · aggiungi il dado al danno']],v=>changeDraft(d=>d.hakiSelections.find(h=>h.id===s.id).use=v)));
    hakiEffects(s,tech,m).forEach(e=>{
     const on=selected.effects.includes(e.id),prepared=list(selected.preparedEffects).includes(e.id),persistent=e.mode==='active'&&e.row.durationTurns>1;
     const candidate={...m,hakiSelections:m.hakiSelections.map(h=>h.id===s.id?{...h,effects:[...h.effects,e.id]}:h)};
     const blocked=!on&&e.mode==='active'&&actionPlan(candidate,ss,tech).used>1;
     const line=button('',()=>changeDraft(d=>{const h=d.hakiSelections.find(h=>h.id===s.id);h.effects=on?h.effects.filter(x=>x!==e.id):[...h.effects,e.id];if(on)h.preparedEffects=list(h.preparedEffects).filter(x=>x!==e.id);}),
      'smc-effect'+(on?' selected':''),{'aria-pressed':String(on),'data-smc-focus':'effect-'+s.id+'-'+e.id,...(blocked?{disabled:'',title:'Una sola Bonus: Talento, attivazione del Colore oppure effetto Haki.'}:{})});
     line.append(node('span','smc-effect-mode',prepared?'PREPARATO':e.mode==='active'?'⚡ '+e.cost+' PIP':'PASSIVO'),node('span','',null,[node('b','',e.name),node('span','',e.desc)]),node('b','smc-check',on?'✓':'+'));block.append(line);
     if(blocked)block.append(note('Bonus già occupata: questo effetto non può essere attivato nella stessa mossa.','smc-effect-hint'));
     if(persistent&&!on)block.append(button('Usa l’effetto già preparato · '+e.name,()=>changeDraft(d=>{const h=d.hakiSelections.find(h=>h.id===s.id);h.effects=[...h.effects,e.id];h.preparedEffects=[...list(h.preparedEffects),e.id];h.activation='prepared';}),'smc-link',{'data-smc-focus':'prepare-'+s.id+'-'+e.id}));
     if(on&&persistent)block.append(selectField('Uso di '+e.name,prepared?'prepared':'now',[
      ['now','Attiva in questo turno · 1 Bonus + '+e.cost+' PIP'],['prepared','Già preparato · deve avere turni residui']
     ],v=>changeDraft(d=>{const h=d.hakiSelections.find(h=>h.id===s.id);h.preparedEffects=v==='prepared'?uniq([...list(h.preparedEffects),e.id]):list(h.preparedEffects).filter(x=>x!==e.id);if(v==='prepared')h.activation='prepared';})));
    });
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
 const r=resolve(UI.draft),warnings=r.errors.filter(e=>e.id&&e.id!==UI.draft.baseTechId&&(!kind||kind==='talent'&&(findSource(e.id,r.sources)?.kind==='talent'||e.id.startsWith('trait:'))||kind==='equipment'&&/^(weapon|module):/.test(e.id)));
 if(!warnings.length)return;
 const block=node('div','smc-repair');block.append(heading('Collegamenti da riparare'));
 uniq(warnings.map(e=>e.id)).forEach(id=>{const text=warnings.filter(e=>e.id===id).map(e=>e.text).join(' · ');block.append(node('div','smc-repair-row',null,[note(text),button('Scollega',()=>changeDraft(m=>{if(m.activeTalentId===id)m.activeTalentId='';m.passiveTalentIds=m.passiveTalentIds.filter(x=>x!==id);m.fruitSelections=m.fruitSelections.filter(x=>x!==id);m.hakiSelections=m.hakiSelections.filter(x=>x.id!==id);if(m.weaponId===id)m.weaponId='';if(m.moduleId===id)m.moduleId='';}),'smc-link')]));});work.append(block);
}
function gmCostEditor(s) {
 if(s.techKind==='legacy')return note(s.name+': converti la Tecnica storica nel Costruttore prima di definirne effetti e costi.','smc-warning');
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
 work.append(heading('Risoluzione'),actionBudget(r),budget(r));r.formulas.forEach(f=>work.append(node('div','smc-formula',null,[node('span','',f.label),node('strong','',f.text)])));work.append(breakdown(r));
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
 if(r.errors.length||r.unknown.length){owner.step=5;owner.error='Controlla l’Azione Bonus, i collegamenti e i costi prima di salvare. Puoi salvare una mossa da preparare: sarà utilizzabile solo quando lo stato richiesto sarà registrato.';renderDialog(true);return;}
 owner.saving=true;renderDialog();
 try{
  const previousArt=savedCard(m.id)?.presentation?.artId;
  m.name=m.name.trim();transaction(p=>{p.specialMoves=list(p.specialMoves);const ix=p.specialMoves.findIndex(x=>x.id===m.id);if(ix>=0)p.specialMoves[ix]=m;else p.specialMoves.push(m);},owner.owner);
  close(true);renderManage();announce('Special Move salvata.');openCard(m.id);
  if(previousArt&&previousArt!==m.presentation.artId&&!artInUse(previousArt))mediaDelete(previousArt);
 }catch(e){owner.saving=false;owner.error='Carta non salvata: '+e.message+'. La bozza è ancora qui.';renderDialog();}
}
window.GLCMoves={shelf:safeShelf,open:openComposer,openCard,close,resolve,sources,art:mediaGet,transaction,ensureReferences,normalizeMove,applicable,compatibleEquipment,hakiState,hakiEffects,sourceCost,costBasis,requiresGM,techniqueProblems,directTalentSaves,strikerSignatureSaves,smashHitProfile,metadata:META};
})();
