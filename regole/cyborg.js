/* Corpo Meccanico V2 · shared, pure validation and explicit session actions.
 * Source: Manuale del Cyborg §§2–13. Normalization never grants capabilities,
 * upgrades devices, activates a module, restores charges or changes PV/ST. */
(function(root){
'use strict';
const DICE=['d6','d8','d10','d12','d20'],WEAPON_DICE=['d4',...DICE];
const FUNCTIONS=['Corazza','Scudo','Propulsore','Manipolatore','Sensore','Strumento','Emissione','Arma','Personalizzata'];
const CATEGORIES=['Offensivo','Difensivo','Controllo','Mobilità','Utilità'];
const WEAPON_TYPES=['Lama','Contundente','Ad asta','A distanza','Da lancio'];
const EFFECTS=['Sconto','Sblocco','Passiva','Reazione','Maledizione'];
const PARAMETERS=['portata','spostamento','carico','sensori','area'];
const rows=[
 ['d6',3,5,100,10,1,1,0,0,3,25,1,'combat','d4',8,8,1000,5000,30,10],
 ['d8',5,10,250,25,2,2,0,0,4,50,2,'combat','d6',10,16,5000,15000,60,20],
 ['d10',10,20,500,50,3,3,1,2,5,75,1,'round','d8',12,24,15000,35000,120,30],
 ['d12',20,30,2000,100,5,4,3,3,6,100,1,'round','d10',16,48,40000,85000,240,60],
 ['d20',50,50,10000,300,10,6,null,5,8,150,1,'round','d12',20,96,100000,200000,480,120]
];
const flight=['Spinta assistita; nessun volo continuativo.','Spostamento aereo breve; termina su una superficie.','Volo e permanenza in aria finché operativo.','Volo avanzato in condizioni difficili ordinarie.','Volo leggendario, entro distanza ed energia.'];
const tools=['Singolo utensile o strumento comune','Piccolo set professionale','Attrezzatura avanzata e di precisione','Postazione tecnica specializzata portatile','Laboratorio mobile specializzato in un singolo ambito'];
const tiers=Object.fromEntries(rows.map((r,i)=>[r[0],{
 die:r[0],slots:i+1,portata:r[1],spostamento:r[2],carico:r[3],sensori:r[4],area:r[5],corazza:r[6],scudoDP:2,scudoAlleati:r[7],scudoRaggio:r[8],
 charges:r[9],discountPoints:i+1,optimizationPercent:r[10],reactionUses:r[11],reactionFrequency:r[12],overloadDie:r[13],
 volo:flight[i],flight:i>=2,strumento:tools[i],construction:{skill:r[0],threshold:r[14],hours:r[15],materialCost:r[16],commissionCost:r[17]},installationMinutes:r[18],repairMinutes:r[19]
}]));
const list=v=>Array.isArray(v)?v:[],unique=v=>[...new Set(v)],present=v=>v!==''&&v!=null;
const rank=d=>/^d20\+d(?:4|6|8|10|12|20)$/.test(String(d))?6:WEAPON_DICE.indexOf(d);
const error=(code,text)=>({code,text});
function fail(code,text){const e=Error(text);e.code=code;e.errors=[error(code,text)];throw e;}
function numeric(v){if(typeof v==='boolean'||!present(v))return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function integer(v){const n=numeric(v);return n!=null&&Number.isInteger(n)?n:null;}
function newId(){return root.crypto?.randomUUID?.()||'modulo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
function normalizedKind(m){return m.funzioneTipo==='Altro'||m.funzioneModello==='Altro'?'Personalizzata':FUNCTIONS.includes(m.funzioneTipo)?m.funzioneTipo:FUNCTIONS.includes(m.funzioneModello)?m.funzioneModello:(m.arma?'Arma':'Personalizzata');}
function normalizeModule(m){
 if(!m||typeof m!=='object'||Array.isArray(m))return m;
 if(!m.id)m.id=newId();
 if(m.installato==null)m.installato=true;
 if(m.funzioneAttiva==null)m.funzioneAttiva=m.funzione||m.desc||'';
 if(m.funzioneInattiva==null)m.funzioneInattiva='';
 if(m.funzioneTipo==null)m.funzioneTipo=normalizedKind(m);
 if(m.funzioneUso==null)m.funzioneUso='Operativa';
 if(m.armaTipo==null)m.armaTipo='';
 if(m.attr==null)m.attr='';
 return m;
}
function normalize(pg){
 if(!pg||typeof pg!=='object')return pg;
 list(pg.moduli).forEach(normalizeModule);return pg;
}
const installed=m=>!!m&&m.installato!==false;
function slots(pg){
 const n=pg?.race==='cyborg'?(tiers[pg.racialDie]?.slots||0):0;
 const used=list(pg?.moduli).filter(installed).length;
 return {n,used,free:Math.max(0,n-used),over:Math.max(0,used-n),razza:n,talento:0};
}
function weapon(m){
 if(!m?.arma||!installed(m)||m.stato==='danneggiato')return null;
 const grade=m.gradoArma||m.grado;
 if(!WEAPON_DICE.includes(grade)||!DICE.includes(m.req)||rank(grade)>rank(m.req)||!WEAPON_TYPES.includes(m.armaTipo)||!['Forza','Tecnica'].includes(m.attr))return null;
 if(m.armaTipo==='Ad asta'&&!['Tagliente','Contundente'].includes(m.asta))return null;
 return {id:m.id,tipo:m.armaTipo,attr:m.attr,grado:grade,die:grade,asta:m.asta||'',portata:m.portata||'',nome:m.nome||'Modulo-Arma',modulo:true};
}
function effectName(e){return Array.isArray(e)?e[1]:e?.name||e?.n||e?.nome||'';}
function effectGrade(e){return Array.isArray(e)?e[3]:e?.grade||e?.tier||e?.min||e?.grado;}
function effectST(e){return Array.isArray(e)?Number(e[4])||0:Number(e?.st??e?.costST)||0;}
function effectSlot(e){if(Array.isArray(e)&&e[6]==='sagoma')return 0;return numeric(e?.slots)??(effectName(e)==='Urto'?2:1);}
function price(effect){
 const raw=effect?.prezzo,kind=typeof raw==='string'?raw:raw?.tipo||raw?.type||'',text=String(kind).trim().toLocaleLowerCase('it');
 const result={valid:true,st:0,chargeMultiplier:1,overheats:false,overload:false,kind,text};
 if(['consumo raddoppiato','consumo ×2','cariche doppie'].includes(text))result.chargeMultiplier=2;
 else if(['+1 st per utilizzo','+1 st'].includes(text))result.st=1;
 else if(['surriscaldamento','surriscaldamento fino al prossimo turno'].includes(text))result.overheats=true;
 else if(['danno da sovraccarico','sovraccarico'].includes(text))result.overload=true;
 else if(['vulnerabilità operativa specifica','vulnerabilità'].includes(text)&&String(raw?.condizione||effect?.cond||'').trim())result.vulnerability=String(raw?.condizione||effect.cond);
 else result.valid=false;
 return result;
}
function reactionFrequency(effect,tier){
 const frequency=effect?.freq,raw=typeof frequency==='object'?frequency?.periodo:frequency;
 const written=String(raw||'').trim().toLocaleLowerCase('it').match(/^(\d+)\s+volt[ae]\s+per\s+(scontro|combattimento|round)$/);
 const period=written?written[2]:raw;
 const explicit=integer(effect?.utilizzi??effect?.uses??(typeof frequency==='object'?frequency?.n:undefined));
 return {period:['scontro','combattimento','combat'].includes(period)?'combat':['round','turno'].includes(period)?'round':'',
  uses:explicit??(written?Number(written[1]):tier?.reactionUses||1)};
}
function evaluate(pg,m,options={}){
 pg=pg||{};m=m||{};const errors=[],runtime=[],add=(code,text)=>errors.push(error(code,text)),tier=tiers[m.req],purpose=options.purpose||'project';
 const isInstalled=installed(m),selected=pg.moduloAttivo===m.id&&!!m.id,integro=m.stato==null||m.stato==='integro';
 if(pg.race!=='cyborg')add('cyborg-access','Il sistema Corpo Meccanico richiede un Cyborg; le capacità Legacy non concedono accesso automaticamente.');
 if(!tiers[pg.racialDie])add('cyborg-grade','Corpo Meccanico deve avere Grado da d6 a d20, senza progressione di Prestigio.');
 if(!tier)add('module-tier','La Fascia Tecnologica del Modulo deve essere d6, d8, d10, d12 o d20.');
 else if(rank(pg.racialDie)<rank(m.req))add('module-tier-cap','Corpo Meccanico '+(pg.racialDie||'—')+' non permette Moduli di Fascia '+m.req+'.');
 if(isInstalled&&slots(pg).over)add('module-slots','I Moduli installati superano gli slot disponibili di Corpo Meccanico.');
 if(!isInstalled&&purpose!=='project')add('module-installed','Il Modulo deve essere installato per eseguire o costruire una Tecnica collegata.');
 if(!integro&&purpose!=='project')add('module-damaged','Il Modulo è Danneggiato: Funzione attiva, Effetto Speciale e Tecniche collegate richiedono la riparazione.');
 const kind=normalizedKind(m);
 if(!String(m.funzioneAttiva??m.funzione??'').trim())add('module-function','Definisci la Funzione attiva concreta del Modulo.');
 if(m.funzioneUso!=null&&!['Operativa','Continua'].includes(m.funzioneUso))add('module-function-use','La Funzione è Operativa oppure Continua.');
 if(m.tipo!=null&&(!Array.isArray(m.tipo)||m.tipo.some(t=>!CATEGORIES.includes(t))))add('module-category','Scegli categorie di Modulo valide.');
 let physicalWeapon=null;
 if(m.arma){
  const grade=m.gradoArma||m.grado;
  if(!WEAPON_DICE.includes(grade))add('module-weapon-grade','Definisci un Grado d’Arma da d4 a d20.');
  else if(tier&&rank(grade)>rank(m.req))add('module-weapon-tier','Il Grado d’Arma non può superare la Fascia Tecnologica del Modulo.');
  if(!WEAPON_TYPES.includes(m.armaTipo))add('module-weapon-type','Definisci un tipo di arma fisica compatibile con l’Arsenale.');
  if(m.armaTipo==='Ad asta'&&!['Tagliente','Contundente'].includes(m.asta))add('module-weapon-shaft','Un’arma Ad asta deve indicare Tagliente oppure Contundente.');
  if(!['Forza','Tecnica'].includes(m.attr))add('module-weapon-attribute','Il Modulo-Arma deve registrare Forza oppure Tecnica come Attributo.');
  else if(WEAPON_DICE.includes(grade)&&rank(pg.attr?.[m.attr])<rank(grade))add('module-weapon-attribute-cap','Il Grado d’Arma richiede '+m.attr+' almeno '+grade+'.');
  physicalWeapon=weapon(m);
  if(errors.some(e=>e.code.startsWith('module-weapon')))physicalWeapon=null;
 }else if(kind==='Arma')add('module-weapon-structure','Una Funzione Arma richiede la struttura Modulo-Arma.');
 const eff=m.eff,hasEffect=eff!=null&&eff!==''&&(typeof eff!=='object'||Object.keys(eff).length>0&&!!(eff.cat||eff.testo));
 let structuredKnown=!hasEffect,legacyUnresolved=false,special=null,curse=null,base='',unlocks=[];
 const catalogue=list(options.catalogue);
 if(hasEffect){
  if(typeof eff!=='object'||Array.isArray(eff)||!EFFECTS.includes(eff.cat)){
   legacyUnresolved=true;add('module-effect-unresolved','L’Effetto Speciale storico deve essere registrato con una categoria e parametri strutturati.');
  }else{
   base=eff.cat==='Maledizione'?eff.base:eff.cat;
   if(eff.cat==='Maledizione'){
    if(!['Sconto','Sblocco','Passiva','Reazione'].includes(base))add('module-curse-base','La Maledizione deve indicare quale Sconto, Sblocco, Passiva o Reazione amplia.');
    curse=price(eff);if(!curse.valid)add('module-curse-price','La Maledizione richiede una conseguenza meccanica reale e registrata, non un limite soltanto narrativo.');
   }
   special={category:eff.cat,base,target:eff.tgt||'',price:curse};
   if(base==='Sconto'){
    const st=integer(eff.scontoST),slot=integer(eff.scontoSlot);
    if(!String(eff.tgt||'').trim())add('module-discount-target','Lo Sconto richiede un singolo bersaglio preciso: Effetto o Tecnica.');
    if(st==null&&slot==null){legacyUnresolved=true;add('module-discount-values','Registra lo Sconto in ST e Slot con valori numerici; il testo storico non assegna uno Sconto automaticamente.');}
    else{
     if(st!=null&&st<0||slot!=null&&slot<0)add('module-discount-negative','I valori di Sconto devono essere interi non negativi.');
     if(tier&&(Math.max(0,st||0)+2*Math.max(0,slot||0)>tier.discountPoints))add('module-discount-budget','Lo Sconto supera i '+tier.discountPoints+' Punti Sconto della Fascia '+m.req+'.');
     if(slot>0&&rank(m.req)<rank('d8'))add('module-discount-slot-grade','Ridurre uno Slot Effetto richiede almeno Fascia d8.');
     if((st||0)+(slot||0)<=0)add('module-discount-empty','Lo Sconto deve ridurre almeno un costo specifico.');
    }
   }else if(base==='Sblocco'){
    if(!Array.isArray(eff.sblocchi)||!eff.sblocchi.length){legacyUnresolved=true;add('module-unlock-values','Registra il nome esatto dell’Effetto sbloccato nella lista Sblocchi.');}
    unlocks=unique(list(eff.sblocchi).filter(n=>typeof n==='string'&&n.trim()));
    if(unlocks.length>(eff.cat==='Maledizione'?2:1))add('module-unlock-count','Sblocco concede un solo Effetto; una Maledizione può concederne due strettamente collegati.');
    if(unlocks.length!==list(eff.sblocchi).length)add('module-unlock-duplicate','Ogni Sblocco deve indicare un nome unico e completo.');
    for(const name of unlocks){
     const entry=catalogue.find(e=>effectName(e)===name);
     if(catalogue.length&&!entry)add('module-unlock-missing','Sblocco '+name+': Effetto assente dal catalogo aggiornato.');
     else if(entry&&tier&&rank(effectGrade(entry))>rank(m.req))add('module-unlock-grade','Sblocco '+name+' richiede una Fascia almeno '+effectGrade(entry)+'.');
    }
   }else if(base==='Passiva'){
    const minima={'Ottimizzazione':'d6','Stabilizzazione':'d8','Compensazione':'d10','Resistenza Specializzata':'d12','Sistema Leggendario':'d20'};
    const minimum=minima[eff.modello];
    if(!minimum){legacyUnresolved=true;add('module-passive-model','Scegli un modello di Passiva del Manuale del Cyborg.');}
    else if(rank(m.req)<rank(minimum))add('module-passive-grade',eff.modello+' richiede almeno Fascia '+minimum+'.');
    if(!String(eff.parametro||'').trim())add('module-passive-parameter','La Passiva deve indicare un parametro o una condizione specifica della propria Funzione.');
    if(eff.modello==='Ottimizzazione'){
     const increase=numeric(eff.aumento);
     if(!PARAMETERS.includes(eff.parametro)&&!['corazza','scudoRaggio'].includes(eff.parametro))add('module-optimization-parameter','Ottimizzazione migliora un solo parametro numerico della Funzione Principale.');
     if(increase==null||increase<=0||tier&&increase>tier.optimizationPercent)add('module-optimization-cap','L’aumento di Ottimizzazione deve restare entro il limite percentuale della Fascia.');
    }
   }else if(base==='Reazione'){
    if(!String(eff.trigger||'').trim())add('module-reaction-trigger','Registra un Trigger specifico della Reazione.');
    const frequency=reactionFrequency(eff,tier),count=frequency.uses;
    const allowedPeriod=tier?.reactionFrequency;
    const normalizedPeriod=frequency.period;
    const max=tier?((eff.cat==='Maledizione'&&allowedPeriod==='combat')?tier.reactionUses+1:tier.reactionUses):0;
    if(!normalizedPeriod){legacyUnresolved=true;add('module-reaction-frequency','La Reazione deve indicare una frequenza per scontro oppure per round.');}
    else if(tier&&allowedPeriod==='combat'&&normalizedPeriod!=='combat')add('module-reaction-frequency-cap','Questa Fascia permette soltanto Reazioni limitate per scontro.');
    if(count!=null&&(count<1||count>max))add('module-reaction-use-cap','La frequenza supera gli utilizzi ammessi dalla Fascia.');
    if(eff.usaAzione&&rank(m.req)<rank('d12'))add('module-reaction-action-grade','Usare come Reazione una Funzione normalmente da Azione richiede almeno Fascia d12.');
    if(eff.emergenza&&m.req!=='d20')add('module-emergency-grade','L’Attivazione d’emergenza come parte della Reazione richiede Fascia d20.');
   }
   structuredKnown=!errors.some(e=>e.code.startsWith('module-discount')||e.code.startsWith('module-unlock')||e.code.startsWith('module-passive')||e.code.startsWith('module-optimization')||e.code.startsWith('module-reaction')||e.code.startsWith('module-curse')||e.code==='module-emergency-grade');
  }
 }
 const parametri={...m.parametri},limits=tier?{...tier}:null;
 if(tier){
  if(base==='Passiva'&&eff.modello==='Ottimizzazione'&&structuredKnown&&Object.hasOwn(limits,eff.parametro))limits[eff.parametro]=tier[eff.parametro]*(1+Number(eff.aumento)/100);
  for(const [key,value]of Object.entries(parametri)){
   if(!PARAMETERS.includes(key)&&!['corazza','scudoRaggio'].includes(key))continue;
   const n=numeric(value);if(n==null||n<0||n>limits[key])add('module-function-limit','Il parametro '+key+' supera il limite della Funzione in Fascia '+m.req+'.');
  }
 }
 const fuel=m.fuel||{},enabled=fuel.on===true,current=enabled?integer(fuel.cur):null,max=enabled?integer(fuel.max):null;
 const rawConsumption=present(fuel.consumo)?integer(fuel.consumo):1;
 const consumption=enabled?(rawConsumption??0)*(curse?.chargeMultiplier||1):0;
 if(enabled){
  if(max==null||max<1||tier&&max>tier.charges)add('module-charge-capacity','La capacità di Cariche deve essere un intero positivo entro il limite della Fascia.');
  if(current==null||current<0||max!=null&&current>max)add('module-charge-current','Le Cariche attuali devono essere intere, tra 0 e la capacità registrata.');
  if(rawConsumption==null||rawConsumption<1)add('module-charge-consumption','Registra un consumo intero positivo; un uso normale consuma 1 Carica.');
  else if(max!=null&&consumption>max)add('module-charge-consumption-cap','Il consumo di un utilizzo non può superare la capacità di Cariche del Modulo.');
 }
 if(curse?.chargeMultiplier>1&&!enabled)add('module-curse-no-energy','Consumo raddoppiato richiede una risorsa effettivamente consumata.');
 if(!isInstalled)runtime.push(error('module-installed','Il Modulo non è installato.'));
 if(!integro)runtime.push(error('module-damaged','Il Modulo è Danneggiato.'));
 if(!selected)runtime.push(error('module-inactive','Il Modulo è Inattivo.'));
 if(pg.cyborgCombat?.overheatedModules?.[m.id])runtime.push(error('module-overheated','Il Modulo surriscaldato resta Inattivo fino all’inizio del prossimo turno.'));
 if(enabled&&(current==null||current<consumption))runtime.push(error('module-empty','Il Modulo non dispone delle Cariche necessarie.'));
 const valid=!errors.length,active=selected&&isInstalled&&integro&&(!enabled||current!=null&&current>=consumption),operational=valid&&active&&!runtime.length;
 return {valid,errors,installed:isInstalled,selected,active,integro,operational,operationalErrors:runtime,reason:[...errors,...runtime].map(e=>e.text).join(' '),weapon:physicalWeapon,
  limits,functionType:kind,functionUse:m.funzioneUso||'Operativa',energy:{enabled,cost:consumption,current,max,type:fuel.tipo||'Cariche'},
  cost:{st:curse?.st||0,resource:consumption},special,structuredKnown,legacyUnresolved,unlocks:valid?unlocks:[]};
}
function techModifiers(pg,t,catalogue){
 const result={discountST:0,discountSlots:0,requestedDiscountST:0,requestedDiscountSlots:0,target:'',targetKind:'',unlocks:[],errors:[],module:null,weapon:null};
 const m=list(pg?.moduli).find(m=>m.id===t?.modulo);if(!t?.modulo)return result;
 if(!m){result.errors.push(error('module-missing','Il Modulo collegato non è registrato.'));return result;}
 result.module=m;const ev=evaluate(pg,m,{purpose:'build',catalogue});result.weapon=ev.weapon;result.errors=ev.errors.slice();
 if(!ev.valid||!ev.installed||!ev.integro)return result;
 if(m.tecnicheCompatibili&&typeof m.tecnicheCompatibili==='object'){
  const compatible=m.tecnicheCompatibili;
  const permits=(key,value)=>!Array.isArray(compatible[key])||compatible[key].includes(value);
  if(!permits('forme',t.forma)||!permits('stili',t.stile)||!permits('attributi',t.attr)){
   result.errors.push(error('module-technique-compatible','La Tecnica non rispetta le compatibilità strutturate del Modulo.'));return result;
  }
  if(Array.isArray(compatible.effetti)&&list(t.eff).some(n=>!compatible.effetti.includes(n))){result.errors.push(error('module-technique-effects','Un Effetto della Tecnica non è compatibile con questo Modulo.'));return result;}
 }
 result.unlocks=ev.unlocks;
 if(ev.special?.base!=='Sconto')return result;
 const eff=m.eff,target=String(eff.tgt||'');result.target=target;
 result.requestedDiscountST=Number(eff.scontoST)||0;result.requestedDiscountSlots=Number(eff.scontoSlot)||0;
 const entry=list(catalogue).find(e=>effectName(e)===target),selected=list(t.eff).includes(target);
 if(selected&&entry){
  result.targetKind='effect';result.discountST=Math.min(result.requestedDiscountST,Math.max(0,effectST(entry)-1));result.discountSlots=Math.min(result.requestedDiscountSlots,effectSlot(entry));
 }else if(target&&target===t.nome){
  result.targetKind='technique';const baseCost=list(t.eff).reduce((sum,name)=>sum+effectST(list(catalogue).find(e=>effectName(e)===name)),0);
  result.discountST=Math.min(result.requestedDiscountST,Math.max(0,baseCost-1));
  result.discountSlots=Math.min(result.requestedDiscountSlots,list(t.eff).reduce((sum,name)=>sum+effectSlot(list(catalogue).find(e=>effectName(e)===name)),0));
 }
 return result;
}
function state(pg){
 if(!pg.cyborgCombat||typeof pg.cyborgCombat!=='object'||Array.isArray(pg.cyborgCombat))pg.cyborgCombat={};
 return pg.cyborgCombat;
}
function currentState(pg){return pg.cyborgCombat&&typeof pg.cyborgCombat==='object'&&!Array.isArray(pg.cyborgCombat)?pg.cyborgCombat:{};}
function getModule(pg,id){const m=list(pg?.moduli).find(m=>m.id===id);if(!m)fail('module-missing','Modulo non presente sul pirata.');return m;}
function ensure(pg,m,purpose='build'){
 const ev=evaluate(pg,m,{purpose});if(!ev.valid){const e=Error(ev.errors.map(e=>e.text).join(' '));e.errors=ev.errors;e.code=ev.errors[0].code;throw e;}return ev;
}
function operationalSelection(pg){const selected=list(pg.moduli).find(m=>m.id===pg.moduloAttivo);return !!selected&&evaluate(pg,selected,{purpose:'use'}).operational;}
function startCombat(pg){
 const s=state(pg);if(!s.inCombat){s.inCombat=true;s.ownTurn=false;s.switched=false;s.initialSelectionAvailable=!operationalSelection(pg);s.emergencyUsed=false;s.reactionUses={};}
 return {ok:true,state:s};
}
function beginTurn(pg){if(!pg.cyborgCombat?.inCombat)fail('module-combat','Avvia lo scontro prima di iniziare il turno.');const s=state(pg);if(s.ownTurn)return {ok:true,state:s};s.ownTurn=true;s.switched=false;s.emergencyUsed=false;s.roundUses={};s.overheatedModules={};return {ok:true,state:s};}
function endTurn(pg){const s=state(pg);s.ownTurn=false;return {ok:true,state:s};}
function endCombat(pg){const s=state(pg);s.inCombat=false;s.ownTurn=false;s.switched=false;s.initialSelectionAvailable=false;s.overheatedModules={};return {ok:true,state:s};}
function activate(pg,id,options={}){
 const m=getModule(pg,id),ev=ensure(pg,m);if(!ev.installed||!ev.integro)fail('module-operation','Solo un Modulo installato e Integro può diventare Attivo.');
 if(pg.cyborgCombat?.overheatedModules?.[id])fail('module-overheated','Il Modulo surriscaldato resta Inattivo fino all’inizio del prossimo turno.');
 if(ev.energy.enabled&&ev.energy.current<ev.energy.cost)fail('module-empty','Il Modulo non dispone delle Cariche necessarie.');
 if(pg.moduloAttivo===id)return {ok:true,module:m,evaluation:ev,state:pg.cyborgCombat||{}};
 const s=currentState(pg);
 if(s.inCombat&&options.emergency)return use(pg,id,{...options,reaction:true,emergency:true});
 if(s.inCombat){
  if(s.initialSelectionAvailable&&!operationalSelection(pg)){s.initialSelectionAvailable=false;}
  else{
   if(!s.ownTurn)fail('module-own-turn','Il cambio gratuito del Modulo avviene soltanto durante il proprio turno.');
   if(s.switched)fail('module-switch-used','Hai già effettuato il cambio gratuito del Modulo in questo turno.');
   s.switched=true;
  }
 }
 pg.cyborgCombat=s;pg.moduloAttivo=id;return {ok:true,module:m,evaluation:evaluate(pg,m),state:s,reactionRequired:false};
}
function deactivate(pg){
 const s=state(pg);if(s.inCombat&&!s.ownTurn)fail('module-own-turn','Lo spegnimento volontario avviene durante il proprio turno.');
 pg.moduloAttivo='';return {ok:true,state:s};
}
function damage(pg,id){const m=getModule(pg,id);m.stato='danneggiato';if(pg.moduloAttivo===id)pg.moduloAttivo='';return {ok:true,module:m,state:pg.cyborgCombat||{}};}
function use(pg,id,options={}){
 const m=getModule(pg,id),ev=ensure(pg,m,'use');
 const emergency=!ev.active&&options.reaction&&m.req==='d20'&&ev.structuredKnown&&ev.special?.base==='Reazione'&&m.eff.emergenza;
 if(!ev.operational&&!emergency)fail(ev.operationalErrors[0]?.code||'module-operation',ev.reason||'Il Modulo non è operativo.');
 if(emergency&&ev.operationalErrors.some(e=>e.code!=='module-inactive'))fail('module-emergency-operation',ev.reason);
 if(ev.cost.st&&(!Number.isFinite(Number(pg.stCur))||Number(pg.stCur)<ev.cost.st))fail('module-stamina','Stamina insufficiente per il prezzo meccanico del Modulo.');
 const s=currentState(pg);
 if(options.reaction){
  if(ev.special?.base!=='Reazione')fail('module-reaction','Il Modulo non possiede una Reazione registrata.');
  if(options.reactionAvailable===false)fail('module-reaction-used','La Reazione non è disponibile.');
  const frequency=reactionFrequency(m.eff,tiers[m.req]),round=frequency.period==='round',counter=round?(s.roundUses||{}):(s.reactionUses||{}),limit=frequency.uses;
  if((counter[id]||0)>=limit)fail('module-reaction-frequency','Gli utilizzi della Reazione sono esauriti per questo '+(round?'round':'scontro')+'.');
  if(emergency&&s.emergencyUsed)fail('module-emergency-used','L’Attivazione d’emergenza è già stata utilizzata in questo round.');
  pg.cyborgCombat=s;
  if(emergency){pg.moduloAttivo=id;s.emergencyUsed=true;s.initialSelectionAvailable=false;}
  if(round)s.roundUses={...counter,[id]:(counter[id]||0)+1};else s.reactionUses={...counter,[id]:(counter[id]||0)+1};
 }
 if(ev.energy.enabled)m.fuel.cur=ev.energy.current-ev.energy.cost;
 if(ev.cost.st)pg.stCur=Number(pg.stCur)-ev.cost.st;
 if(ev.special?.price?.overheats){pg.cyborgCombat=s;s.overheatedModules={...s.overheatedModules,[id]:true};}
 if(ev.energy.enabled&&m.fuel.cur<ev.energy.cost||ev.special?.price?.overheats)pg.moduloAttivo='';
 return {ok:true,module:m,evaluation:evaluate(pg,m),state:s,cost:ev.cost,overloadDie:ev.special?.price?.overload?tiers[m.req].overloadDie:null};
}
function install(pg,id,take=true){
 const m=getModule(pg,id);if(pg.cyborgCombat?.inCombat)fail('module-install-combat','Installare o rimuovere un Modulo richiede un intervento fuori dal combattimento.');if(take){
  ensure(pg,{...m,installato:false},'project');
  if(!installed(m)&&!slots(pg).free)fail('module-slot-free','Nessuno slot libero per installare il Modulo.');
 }else if(pg.moduloAttivo===id)pg.moduloAttivo='';
 m.installato=!!take;return {ok:true,module:m,slots:slots(pg)};
}
function repair(pg,id){const m=getModule(pg,id);if(pg.cyborgCombat?.inCombat)fail('module-repair-combat','Una normale riparazione del Modulo avviene fuori dal combattimento.');const wasDamaged=m.stato==='danneggiato';m.stato='integro';if(wasDamaged&&pg.moduloAttivo===id)pg.moduloAttivo='';return {ok:true,module:m,minutes:tiers[m.req]?.repairMinutes||null};}
function recharge(pg,id,options={}){
 const m=getModule(pg,id);if(pg.cyborgCombat?.inCombat)fail('module-recharge-combat','La ricarica normale richiede 10 minuti fuori dal combattimento.');
 if(!options.resourceAvailable)fail('module-recharge-resource','La risorsa prevista dal progetto deve essere disponibile per ricaricare.');
 if(!m.fuel?.on)fail('module-recharge-none','Il Modulo non utilizza Cariche.');
 const max=integer(m.fuel.max);if(max==null||max<1||max>(tiers[m.req]?.charges||0))fail('module-charge-capacity','La capacità di Cariche non è valida.');
 const before=integer(m.fuel.cur),consumption=present(m.fuel.consumo)?integer(m.fuel.consumo):1;
 if(pg.moduloAttivo===id&&(before==null||before<(consumption||1)))pg.moduloAttivo='';
 m.fuel.cur=max;return {ok:true,module:m,minutes:10};
}
const template=(id,n,req,tipo,kind,fn,extra={})=>({id,n,nome:n,req,tipo,arma:false,grado:'',installato:false,stato:'integro',funzioneTipo:kind,funzioneUso:['Corazza','Scudo','Sensore'].includes(kind)?'Continua':'Operativa',funzione:fn,funzioneAttiva:fn,funzioneInattiva:'',eff:null,fuel:{on:false,tipo:'',max:'',cur:'',consumo:'',ricarica:'',rischi:''},...extra});
const charges=n=>({on:true,tipo:'Cariche',max:n,cur:n,consumo:1,ricarica:'10 minuti fuori combattimento, con la risorsa disponibile.',rischi:''});
const catalogue=[
 template('braccio-utensile','Braccio Utensile','d6',['Utilità','Controllo'],'Manipolatore','Manipolatore 3 m; integra un singolo utensile comune.',{parametri:{portata:3}}),
 template('piastre-toraciche','Piastre Toraciche','d6',['Difensivo'],'Corazza','Corazza: riduzione −1 danno fisico.',{parametri:{corazza:1}}),
 template('braccio-telescopico','Braccio Telescopico','d8',['Controllo','Utilità'],'Manipolatore','Manipolatore 5 m, carico 250 kg.',{parametri:{portata:5,carico:250},eff:{cat:'Sblocco',sblocchi:['Attrazione']}}),
 template('occhio-termico','Occhio Termico','d8',['Utilità'],'Sensore','Rileva fonti di calore entro 25 m.',{parametri:{sensori:25},eff:{cat:'Passiva',modello:'Stabilizzazione',parametro:'Prove di rilevamento termico'}}),
 template('jet-heel','Jet Heel','d10',['Mobilità'],'Propulsore','Spostamento 20 m e Volo d10.',{parametri:{spostamento:20},eff:{cat:'Passiva',modello:'Ottimizzazione',parametro:'spostamento',aumento:75},fuel:charges(5)}),
 template('cannone-pressione','Cannone a Pressione','d10',['Offensivo'],'Arma','Modulo-Arma a distanza d10.',{arma:true,armaTipo:'A distanza',armaSottotipo:'Cannone',attr:'',grado:'d10',eff:{cat:'Sconto',tgt:'+1 Dado Danno',scontoST:3,scontoSlot:0},fuel:charges(5),note:'Definire Forza oppure Tecnica con il GM. Lo Sconto non concede dadi danno aggiuntivi: il bersaglio deve essere già concesso da una regola specifica.'}),
 template('guardia-automatica','Guardia Automatica','d12',['Difensivo'],'Scudo','Scudo: DP +2; protegge utilizzatore + fino a 3 alleati entro 3 m.',{parametri:{scudoRaggio:3},eff:{cat:'Reazione',trigger:'Un alleato entro la protezione dello Scudo viene bersagliato.',freq:'round',utilizzi:1,testo:'Applica lo Scudo all’alleato bersagliato.'}}),
 template('bobina-magnetica','Bobina Magnetica','d12',['Controllo'],'Manipolatore','Manipola oggetti metallici entro 20 m, fino a 2 t.',{parametri:{portata:20,carico:2000},eff:{cat:'Sblocco',sblocchi:['Attrazione']},fuel:charges(6)}),
 template('motore-fenice','Motore Fenice','d20',['Mobilità'],'Propulsore','Spostamento 50 m e Volo d20.',{parametri:{spostamento:50},eff:{cat:'Reazione',trigger:'Una minaccia richiede immediatamente lo spostamento del Cyborg.',freq:'round',utilizzi:1,emergenza:true},fuel:charges(8)}),
 template('occhio-orizzonte','Occhio dell’Orizzonte','d20',['Utilità'],'Sensore','Sensore specializzato fino a 300 m.',{parametri:{sensori:300},eff:{cat:'Passiva',modello:'Resistenza Specializzata',parametro:'Interferenze ordinarie del sensore'}})
];
root.GLCCyborg={DICE,WEAPON_DICE,FUNCTIONS,CATEGORIES,WEAPON_TYPES,EFFECTS,PARAMETERS,tiers,catalogue,normalizeModule,normalize,slots,evaluate,weapon,techModifiers,startCombat,beginTurn,endTurn,endCombat,activate,deactivate,damage,use,install,repair,recharge};
})(typeof window!=='undefined'?window:globalThis);
