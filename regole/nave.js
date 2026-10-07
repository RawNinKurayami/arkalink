/* Regole navali del Manuale base, Capitolo 13. I dati registrati restano storici;
 * le conseguenze dei danni sono derivate senza riscrivere i dadi originari. */
(function(root){
 'use strict';
 const dice=['d4','d6','d8','d10','d12'],attributeDice=[...dice,'d20','d20+d4','d20+d6','d20+d8','d20+d10','d20+d12','d20+d20'];
 const ps={d4:20,d6:30,d8:40,d10:50,d12:60},slots={d4:1,d6:2,d8:3,d10:5,d12:7},cargo={d4:8,d6:12,d8:16,d10:20,d12:24};
 const components=['albero','timone','batteria','stiva','macchine','scafo'];
 const stations={capitano:'Spirito',timoniere:'Astuzia',cannoniere:'Tecnica',vedetta:'Astuzia',ingegnere:'Astuzia',combattente:'Forza'};
 const maneuvers={cannonate:{station:'cannoniere',stat:'artiglieria',attr:'Tecnica'},evasiva:{station:'timoniere',stat:'vele',attr:'Astuzia'},speronamento:{station:'capitano',stat:'scafo',attr:'Forza'},fuga:{station:'timoniere',stat:'vele',attr:'Astuzia'},emergenza:{station:'ingegnere',stat:'struttura',attr:'Astuzia'},traversata:{station:'timoniere',stat:'vele',attr:'Astuzia'}};
 const clone=x=>JSON.parse(JSON.stringify(x)),object=x=>x&&typeof x==='object'&&!Array.isArray(x),number=x=>Number.isFinite(Number(x))?Number(x):0;
 const canonical=s=>String(s||'').toLowerCase().replace(/[’']/g,'').trim();
 function blank(){return {nome:'',tipo:'',polena:'',legno:'',stats:{scafo:'d8',vele:'d6',artiglieria:'d6',struttura:'d6'},psCur:40,psMaxMod:0,crew:Object.fromEntries(Object.keys(stations).map(k=>[k,{nome:'',attr:'—',attrs:{},skills:{},charId:'',style:'',talents:[]}])),carpenteria:'d6',moduli:[],distrutti:Object.fromEntries(components.map(k=>[k,false])),png:{dim:'Ridotto (6–10)',lealta:5},magazzino:{},berry:0,cargo:'',note:'',log:[],stiva:{persone:0,provviste:0,cargo:0},miglioramenti:{},battle:{active:false,round:0,used:[],actions:[],uses:{},effects:{},criticalPending:false}};}
 function normalize(raw){
  const b=blank(),s=object(raw)?clone(raw):{},out={...b,...s};
  // Legacy nave d6/30 remains d6/30; new starting ships use the d8 allocation.
  for(const k of ['stats','distrutti','png','magazzino','stiva','miglioramenti','battle'])out[k]={...b[k],...(object(s[k])?s[k]:{})};
  out.crew={...(object(s.crew)?s.crew:{})};for(const k of Object.keys(stations))out.crew[k]={...b.crew[k],...(object(s.crew?.[k])?s.crew[k]:{}),attrs:{...(s.crew?.[k]?.attrs||{})},skills:{...(s.crew?.[k]?.skills||{})}};
  for(const k of ['moduli','log'])if(!Array.isArray(out[k])){out.legacyFields={...(out.legacyFields||{}),[k]:out[k]};out[k]=[];}
  const invalid=out.moduli.filter(m=>!object(m));if(invalid.length){out.legacyModuleRecords=[...(out.legacyModuleRecords||[]),...invalid];out.moduli=out.moduli.filter(object);}
  out.battle.used=Array.isArray(out.battle.used)?out.battle.used:[];out.battle.actions=Array.isArray(out.battle.actions)?out.battle.actions:[];
  out.battle.effects=object(out.battle.effects)?out.battle.effects:{};out.battle.uses=object(out.battle.uses)?out.battle.uses:{};
  return out;
 }
 function installed(m,s){return m.installato!==false&&!m.guasto&&(!m.danneggiato&&!m.distrutto||m.distrutto&&s.battle?.effects?.nonAffonda);}
 function modules(s,name){return s.moduli.filter(m=>installed(m,s)&&canonical(m.nome)===canonical(name));}
 function moduleBonus(s,name,key){return modules(s,name).reduce((n,m)=>n+number(m.parametri?.[key]),0);}
 function broken(s,key){return !!s.distrutti[key];}
 function step(d,n){const i=dice.indexOf(d);return i<0?d:dice[Math.max(0,Math.min(dice.length-1,i+n))];}
 function stat(s,k){let d=s.stats[k];if(k==='vele'&&broken(s,'albero')&&s.penalitaComponenti==='gradino')d=step(d,-1);if(k==='artiglieria'){if(s.battle?.effects?.batteriaRegolata)d=step(d,1);if(broken(s,'batteria')&&s.penalitaComponenti==='gradino')d=step(d,-1);}return d;}
 function psMax(s){const base=(ps[s.stats.scafo]||30)+number(s.psMaxMod),legend=number(s.miglioramenti?.naveLeggendaria);return Math.max(1,Math.ceil(base*(legend===2?2:legend===1?1.5:1))-(broken(s,'scafo')?10:0));}
 function slotsTotal(s){const m=s.miglioramenti||{};return (slots[s.stats.struttura]||2)+(m.naveLeggendaria===2?3:m.naveLeggendaria===1?2:m.maestroDeiModuli?1:0);}
 function slotsUsed(s){return s.moduli.filter(m=>m.installato!==false).reduce((n,m)=>n+(Number.isInteger(Number(m.slot))&&Number(m.slot)>0?Number(m.slot):1),0);}
 function sinking(s){return modules(s,'Compartimenti stagni').length?-10:0;}
 function condition(s){if(number(s.psCur)<=sinking(s))return 'AFFONDATA';const r=number(s.psCur)/psMax(s);return r>.75?'INTEGRA':r>.5?'DANNEGGIATA':r>.25?'GRAVE':'CRITICA';}
 function capacity(s){return (cargo[s.stats.struttura]||12)+moduleBonus(s,'Stiva ampliata','stiva');}
 function provisions(people,weeks=1,factor=1){requireValid(Number.isInteger(Number(weeks))&&Number(weeks)>=0,'Registra settimane complete; per tratte parziali concorda le provviste col GM.');return Math.ceil(Math.max(0,number(people))/5*Math.max(0,number(factor)))*Number(weeks);}
 function occupant(s,key,characters={}){const c=s.crew[key]||{};if(c.charId)return characters[c.charId]||null;const sk={...(c.skills||{}),...(key==='ingegnere'?{Carpenteria:c.skills?.Carpenteria||s.carpenteria}:{})};return c.nome?.trim()?{nome:c.nome,attr:{...(c.attrs||{}),[stations[key]]:c.attrs?.[stations[key]]||c.attr},skills:sk,role:c.style==='Navigatore'?'Navigatore':c.style==='Cuoco'?'Cuoco':c.style?'Ingegnere':null,style:c.style,roleSkillDie:sk[c.style==='Navigatore'?'Navigazione':c.style==='Meccanico'?'Meccanica':'Carpenteria']||'d4',talents:c.talents||[],manual:true}:null;}
 function talent(c,n){return !!c&&!!root.GLCTalents?.has(c,n,{includeInherited:true});}
 function skill(c,n){if(!c)return '';return root.GLCTalents?.skillDie(c,n)||c.skills?.[n]||'';}
 function isStyle(c,style){return c&&(c.style===style||c.style2===style||c.role===style||c.role2===style);}
 function actorId(s,key,c){return s.crew[key]?.charId||'manual:'+canonical(c?.nome||key);}
 function profile(s,type,characters={},options={}){
  const def=maneuvers[type];if(!def)return {valid:false,errors:['Manovra sconosciuta.'],dice:[]};
  const c=occupant(s,def.station,characters),errors=[],pool=[stat(s,def.stat)];
  if(!dice.includes(s.stats[def.stat]))errors.push('Statistica navale fuori dalla scala ordinaria d4–d12: serve una capacità esplicita prima dell’uso.');
  const damageComponent=def.stat==='vele'?'albero':def.stat==='artiglieria'?'batteria':'';
  if(damageComponent&&broken(s,damageComponent)){if(!['gradino','dado'].includes(s.penalitaComponenti))errors.push('Componente danneggiato: dichiara come il GM applica «−1 dado» alla formula.');else if(s.penalitaComponenti==='dado')pool.length=0;}
  if(!c)errors.push('Assegna un operatore alla postazione '+def.station+'.');
  const a=c?.attr?.[def.attr];if(!attributeDice.includes(a))errors.push('Serve il dado '+def.attr+' dell’operatore.');else pool.push(a);
  if(condition(s)==='AFFONDATA')errors.push('La nave ha raggiunto la soglia di affondamento.');
  if(type==='evasiva'&&broken(s,'timone'))errors.push('Il Timone danneggiato impedisce la Manovra Evasiva.');
  if(['fuga','speronamento','traversata'].includes(type)&&broken(s,'macchine'))errors.push('La Sala macchine danneggiata impedisce il movimento attivo.');
  if(type==='traversata'&&talent(c,'Mano al Timone')&&attributeDice.includes(skill(c,'Navigazione')))pool.push(skill(c,'Navigazione'));
  if(type==='evasiva'&&talent(c,'Timoniere Nato — Base')&&attributeDice.includes(skill(c,'Navigazione')))pool.push(skill(c,'Navigazione'));
  if(type==='cannonate'&&talent(c,'Macchinista')&&attributeDice.includes(skill(c,'Meccanica')))pool.push(skill(c,'Meccanica'));
  const bonusName=type==='evasiva'?'Timone gemello':type==='traversata'?'Cabina del navigatore':'';
  if(bonusName)modules(s,bonusName).forEach(m=>{if(attributeDice.includes(m.parametri?.dado))pool.push(m.parametri.dado);else errors.push(m.nome+': specifica quale dado aggiunge la scheda (§13.16.3).');});
  if(type==='emergenza'){if(!talent(c,"Riparazione d'Emergenza")&&!options.capacitaEsplicita)errors.push('Serve Riparazione d’Emergenza acquisita o una capacità esplicita.');if(!attributeDice.includes(skill(c,'Carpenteria')))errors.push('Serve il dado Carpenteria.');}
  const band=number(options.band??s.battle?.band??1),threshold=type==='cannonate'?(band===2?12:band>=3?null:8):8;
  if(type==='cannonate'&&threshold===null)errors.push('All’orizzonte: Artiglieria ordinaria fuori portata.');
  if(type==='speronamento'&&options.collision===false)errors.push('Non è materialmente possibile la collisione.');
  return {valid:!errors.length,errors,dice:pool,threshold,station:def.station,attr:def.attr,character:c,actor:c?actorId(s,def.station,c):'',damageDie:type==='cannonate'?stat(s,'artiglieria'):type==='speronamento'?step(stat(s,'scafo'),modules(s,"Sperone d'acciaio").length?1:0):'',repairDice:type==='emergenza'?(talent(c,'Mani sul Legno — Base')?2:1):0};
 }
 function requireValid(ok,text){if(!ok)throw Error(text);}
 function setPS(s,value){const before=condition(s),n=Number(value);requireValid(Number.isFinite(n),'PS non validi.');s.psCur=Math.min(psMax(s),s.battle.effects?.nonAffonda?Math.max(1,n):n);if(s.battle.active&&before!=='CRITICA'&&condition(s)==='CRITICA')s.battle.criticalPending=true;return s.psCur;}
 function setComponent(s,key,value){requireValid(components.includes(key),'Componente sconosciuto.');s.distrutti[key]=!!value;if(s.psCur>psMax(s))s.psCur=psMax(s);}
 function componentRoll(s,first,second){requireValid(s.battle.criticalPending&&!s.battle.componentGM,'Nessun tiro Componenti richiesto: eventuale secondo duplicato richiede la scelta del GM.');let k=components[Number(first)-1];requireValid(k,'Il tiro Componenti deve essere 1–6.');if(broken(s,k)){k=components[Number(second)-1];requireValid(k,'Componente già danneggiato: ritira una sola volta.');if(broken(s,k)){s.battle.componentGM={first:Number(first),second:Number(second),key:k};return {gm:true,key:k};}}setComponent(s,k,true);s.battle.criticalPending=false;return {key:k};}
 function resolveComponentGM(s,key,note){requireValid(s.battle.componentGM,'Non è richiesta una scelta GM.');requireValid(components.includes(key)||String(note||'').trim(),'Indica un componente esposto oppure descrivi l’aggravamento.');if(components.includes(key))setComponent(s,key,true);s.log.push({kind:'componenti-GM',at:new Date().toISOString(),tiri:s.battle.componentGM,componente:key||null,note:note||''});s.battle.componentGM=null;s.battle.criticalPending=false;}
 function beginBattle(s){requireValid(!s.battle.active,'La battaglia è già iniziata.');s.battle={...s.battle,active:true,round:0,used:[],actions:[],uses:{},effects:{},componentGM:null,criticalPending:condition(s)==='CRITICA'};}
 function beginRound(s){requireValid(s.battle.active,'Inizia prima la battaglia.');s.battle.round++;s.battle.used=[];s.battle.actions=[];}
 function endBattle(s){s.battle.active=false;if(s.battle.effects.nonAffonda)s.psCur=1;s.battle.effects={};}
 function maneuverAvailable(s,type,p,characters,options){
  if(type==='traversata')return;
  requireValid(s.battle.active&&s.battle.round>0,'Inizia la battaglia e il round.');requireValid(!s.battle.actions.includes(p.actor),'L’operatore ha già utilizzato la sua Azione in questo round.');
  const used=s.battle.used,helm=occupant(s,'timoniere',characters),base=1+(talent(helm,'Vento in Poppa')&&s.battle.veleUtilizzabili!==false&&!broken(s,'macchine')?1:0);
  if(used.length<base)return;
  const mastery=talent(helm,'Timoniere Nato — Maestria')&&used.length===1&&([type,...used].includes('cannonate'))&&[type,...used].some(t=>['evasiva','fuga'].includes(t));
  const twins=type==='cannonate'&&options.gemelli&&modules(s,'Cannoni gemelli').length&&!s.battle.uses.gemelli;
  requireValid(mastery||twins,'La nave ha esaurito le Manovre disponibili per questo round.');
 }
 function resolve(s,type,characters,options={}){
  const p=profile(s,type,characters,options);requireValid(p.valid,p.errors.join('\n'));requireValid(options.actionAvailable!==false,'L’operatore non ha un’Azione disponibile.');maneuverAvailable(s,type,p,characters,options);
  const total=Number(options.total);requireValid(options.total!=null&&Number.isFinite(total),'Registra il totale della Prova.');
  if(type==='emergenza')requireValid(options.materials===true,'Servono strumenti e materiali disponibili.');
  if(type==='speronamento')requireValid(options.collision===true&&Number.isInteger(options.recoil)&&options.recoil>=1&&options.recoil<=4,'Conferma la collisione e registra il contraccolpo 1d4.');
  const threshold=type==='traversata'?Number(options.threshold):type==='fuga'&&options.opposed?Number(options.opponent):p.threshold;
  requireValid(Number.isFinite(threshold)&&!(type==='fuga'&&options.opposed&&options.opponent==null),'Registra la Soglia o il tiro avversario.');const margin=total-threshold,success=type==='fuga'&&options.opposed?margin>0:margin>=0;
  if(type==='emergenza'&&success)requireValid(Number.isFinite(options.heal)&&options.heal>=0,'Registra il recupero tirato con il dado Carpenteria.');
  if(options.gemelli)requireValid(type==='cannonate'&&modules(s,'Cannoni gemelli').length&&!s.battle.uses.gemelli,'Cannoni gemelli non disponibili.');
  if(type!=='traversata'){s.battle.used.push(type);s.battle.actions.push(p.actor);if(options.gemelli)s.battle.uses.gemelli=true;}
  const result={type,total,threshold,margin,success,dice:p.dice};
  if(type==='evasiva'&&success)s.battle.effects.evasiva=true;
  if(type==='speronamento')setPS(s,number(s.psCur)-options.recoil);
  if(type==='emergenza'&&success){const multiplier=margin>=4&&isStyle(p.character,'Carpentiere')?2:1;result.heal=options.heal*multiplier;setPS(s,number(s.psCur)+result.heal);result.signature=multiplier===2;}
  if(type==='fuga'){if(success)s.battle.band=Math.min(3,number(s.battle.band??1)+1);const inRange=number(s.battle.band??1)<3||options.enemyExtendedRange===true;result.opportunity=margin<0&&inRange;result.opportunityNeedsRange=margin<0&&!inRange;}
  if(type==='traversata'&&margin>=4&&isStyle(p.character,'Navigatore')){s.rotta={...(s.rotta||{}),dado:'d6',disponibile:true};result.routeDie='d6';}
  s.log.push({kind:'manovra',at:new Date().toISOString(),...result});return result;
 }
 function install(s,m){requireValid(Number.isInteger(Number(m.slot))&&Number(m.slot)>0,'Gli slot devono essere un intero positivo.');requireValid(slotsUsed(s)+Number(m.slot)<=slotsTotal(s),'Slot insufficienti.');s.moduli.push({...clone(m),installato:true});}
 function warnings(s){const out=[];Object.entries(s.stats).forEach(([k,v])=>{if(!dice.includes(v))out.push(k+': Grado storico '+v+' non compreso nel catalogo ordinario d4–d12.');});if(slotsUsed(s)>slotsTotal(s))out.push('Moduli storici oltre capacità: conservati; nuove installazioni bloccate.');if(number(s.psCur)>psMax(s))out.push('PS storici oltre massimo attuale: correggili consapevolmente.');for(const m of s.moduli){if(['timone gemello','cabina del navigatore','officina di bordo', 'arpioni dabbordaggio'].includes(canonical(m.nome))&&!attributeDice.includes(m.parametri?.dado))out.push(m.nome+': manca il dado del bonus.');if(canonical(m.nome)==='stiva ampliata'&&!(number(m.parametri?.stiva)>0))out.push(m.nome+': indica quante Unità di Stiva aggiunge.');if(canonical(m.nome)==='chiglia veloce'&&!number(m.parametri?.iniziativa))out.push(m.nome+': indica il bonus di Iniziativa.');}return out;}
 root.GLCShip={dice,attributeDice,ps,slots,cargo,components,stations,maneuvers,blank,normalize,stat,psMax,slotsTotal,slotsUsed,sinking,condition,capacity,provisions,occupant,talent,skill,profile,setPS,setComponent,componentRoll,resolveComponentGM,beginBattle,beginRound,endBattle,resolve,install,warnings,modules,step};
})(typeof window!=='undefined'?window:globalThis);
