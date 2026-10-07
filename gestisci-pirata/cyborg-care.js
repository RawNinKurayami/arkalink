/* Cyborg §11; ordinary Stabilization: Base §6.12.1.
 * Records interventions resolved at the table. Never rolls dice or reloads a Module. */
(function (root) {
 'use strict';
 const DICE=['d4','d6','d8','d10','d12','d20','d20+d4','d20+d6','d20+d8','d20+d10','d20+d12','d20+d20'];
 const feedback=new WeakMap();
 const list=x=>Array.isArray(x)?x:[];
 const rank=x=>DICE.indexOf(x);
 const numeric=x=>typeof x==='number'&&Number.isFinite(x);
 const integer=x=>x!==''&&x!=null&&Number.isSafeInteger(Number(x));
 const bounds=die=>DICE.includes(die)?{min:die.split('+').length,max:die.split('+').reduce((sum,d)=>sum+Number(d.slice(1)),0)}:null;
 function selfMechanic(c){return [[c.role,c.style],[c.role2,c.style2]].some(([role,style])=>role==='Ingegnere'&&style==='Meccanico');}
 function mechanicsDie(c){
  if(root.GLCTalents?.skillDie)return root.GLCTalents.skillDie(c,'Meccanica');
  return c.role==='Ingegnere'&&c.style==='Meccanico'?(c.roleSkillDie||'d8'):(c.skills?.Meccanica||'');
 }
 function activeCarne(c,die){
  if(rank(die)<rank('d12')||!selfMechanic(c))return false;
  if(root.GLCTalents?.active)return root.GLCTalents.active(c).some(t=>t.src==='role'&&t.role==='Ingegnere'&&t.style==='Meccanico'&&t.name==='Carne e Metallo');
  return list(c.talents).includes('Ingegnere · Meccanico · Carne e Metallo');
 }
 function profile(c,options={}){
  const self=options.performer==='self',die=self?mechanicsDie(c):options.mechanicsDie,astuzia=self?c.attr?.Astuzia:options.astuziaDie;
  const eligible=self?selfMechanic(c):options.performer==='external';
  const carne=self?activeCarne(c,die):eligible&&rank(die)>=rank('d12')&&options.carneMetallo===true;
  return {performer:options.performer,eligible,die,astuzia,carneMetallo:carne,healingDice:carne?2:1,selfAvailable:selfMechanic(c)};
 }
 function evaluate(c,request={}){
  const p=profile(c,request),errors=[],add=(code,text)=>errors.push({code,text});
  const kind=request.kind,field=kind==='field-repair',stabilize=kind==='stabilize';
  if(c.race!=='cyborg')add('race','Questa procedura è riservata ai Cyborg.');
  if(!field&&!stabilize)add('procedure','Scegli Riparazione di Campo oppure Stabilizzazione.');
  if(!p.eligible)add('mechanic','Serve un Meccanico; la sola Skill Meccanica non concede la Riparazione di Campo su se stessi.');
  if(!bounds(p.die)||!bounds(p.astuzia))add('dice','Definisci i dadi effettivi di Astuzia e Meccanica dell’operatore.');
  if(request.performer==='self'&&numeric(c.pvCur)&&c.pvCur<=0)add('down','A 0 PV non puoi intervenire normalmente su te stesso.');
  if(request.performer==='external'&&request.reachable!==true)add('reach','Il Meccanico deve raggiungere e trattare fisicamente il Cyborg.');
  if(request.tools!==true)add('tools','Servono strumenti da Meccanico.');
  if(field){
   if(request.outsideCombat!==true||c.cyborgCombat?.inCombat===true)add('combat','Riparazione di Campo: 10 minuti fuori dal combattimento.');
   if(request.spares!==true)add('spares','Servono ricambi ordinari per la Riparazione di Campo.');
   if(c.cyborgCombat?.fieldRepairUsed)add('used','Riparazione di Campo già ricevuta: occorre un Riposo Breve o Lungo.');
   if(!numeric(c.pvMax)||c.pvMax<0||!numeric(c.pvCur))add('hp','Definisci i PV attuali e massimi prima di registrare il recupero.');
  }
  if(stabilize&&c.pvCur!==0)add('target','La normale Stabilizzazione si applica a un personaggio a 0 PV.');
  if(!integer(request.rollTotal)||Number(request.rollTotal)<0)add('roll','Inserisci il totale della Prova Astuzia + Meccanica già tirata.');
  const success=integer(request.rollTotal)&&Number(request.rollTotal)>=8;
  const moduleId=request.moduleId||'',module=moduleId&&list(c.moduli).find(m=>m.id===moduleId);
  if(moduleId){
   if(!field||!p.carneMetallo)add('module-talent','Riparare un Modulo durante l’intervento richiede Carne e Metallo attivo.');
   if(typeof moduleId!=='string'||!module||module.stato!=='danneggiato')add('module','Scegli un solo Modulo Danneggiato. Non ricostruisce Moduli Distrutti.');
   if(request.moduleMaterials!==true||request.moduleRequirements!==true)add('module-materials','Conferma materiali e requisiti speciali del Modulo scelto.');
  }
  if(field&&success){
   const b=bounds(p.die);
   if(!integer(request.healingTotal)||!b||Number(request.healingTotal)<b.min*p.healingDice||Number(request.healingTotal)>b.max*p.healingDice)add('healing','Inserisci il risultato effettivo di '+p.healingDice+' tiro'+(p.healingDice===1?'':'i')+' completo'+(p.healingDice===1?'':'i')+' di Meccanica per i PV.');
  }
  return {valid:!errors.length,errors,success,threshold:8,action:stabilize?'Azione':'10 minuti fuori combattimento',...p,moduleId,healing:field&&success?Number(request.healingTotal)||0:0};
 }
 function apply(c,request){
  const result=evaluate(c,request);
  if(!result.valid)throw Error(result.errors.map(e=>e.text).join(' '));
  if(!result.success)return {...result,recovered:0,repairedModuleId:''};
  c.cyborgCombat??={};
  if(request.kind==='stabilize'){c.cyborgCombat.stabilized=true;return {...result,recovered:0,repairedModuleId:''};}
  const before=Math.max(0,c.pvCur),after=Math.min(c.pvMax,before+result.healing);
  c.pvCur=after;c.cyborgCombat.fieldRepairUsed=true;
  if(result.moduleId)list(c.moduli).find(m=>m.id===result.moduleId).stato='integro';
  return {...result,recovered:Math.max(0,after-before),repairedModuleId:result.moduleId};
 }
 function resetRepair(c){if(c.cyborgCombat)c.cyborgCombat.fieldRepairUsed=false;return c;}
 function recoveryRule(source){return {allowed:['short-rest','long-rest','food','direct-hp'].includes(source),repairsModules:false,reloadsCharges:false};}
 function render(parent){
  if(typeof pg==='undefined'||pg.race!=='cyborg'||typeof el!=='function')return null;
  const c=pg,wrap=el('details',{class:'lsec cyborg-care'}),body=el('div',{class:'cyborg-care-body'});
  wrap.appendChild(el('summary',{class:'slots-h',text:'Cure e riparazioni del Cyborg'}));wrap.appendChild(body);parent.appendChild(wrap);
  body.appendChild(el('p',{class:'sub',text:'Riposo, cibo e recuperi diretti di PV funzionano normalmente. Le cure biologiche con Medicina non recuperano PV. Il contatore PV resta modificabile per registrare quanto avviene al tavolo.'}));
  body.appendChild(el('p',{class:'sub',text:'Recuperare PV non ripara i Moduli e non ricarica le Cariche. Manuale Cyborg §11; Stabilizzazione normale §6.12.1.'}));
  let draft={kind:'field-repair',performer:selfMechanic(c)&&c.pvCur>0?'self':'external',mechanicsDie:'d8',astuziaDie:'d8',tools:false,spares:false,reachable:false,outsideCombat:false,carneMetallo:false,moduleId:'',moduleMaterials:false,moduleRequirements:false},message=feedback.get(c)||'';
  const form=el('div',{});body.appendChild(form);
  const redraw=()=>{
   form.replaceChildren();
   const select=(label,key,items)=>{const box=el('label',{class:'fld',text:label}),input=el('select',{'aria-label':label},items.map(([value,text])=>el('option',{value,text})));input.value=draft[key];input.onchange=()=>{draft[key]=input.value;if(key==='kind')draft.moduleId='';redraw();};box.appendChild(input);form.appendChild(box);return input;};
   const check=(label,key)=>{const input=el('input',{type:'checkbox','aria-label':label});input.checked=!!draft[key];input.onchange=()=>{draft[key]=input.checked;redraw();};form.appendChild(el('label',{class:'sub'},[input,el('span',{text:' '+label})]));};
   const numberInput=(label,key)=>{const input=el('input',{type:'number',min:'0',step:'1','aria-label':label});input.value=draft[key]??'';input.oninput=()=>{draft[key]=input.value;};form.appendChild(el('label',{class:'fld',text:label},input));};
   select('Intervento','kind',[['field-repair','Riparazione di Campo · 10 minuti'],['stabilize','Stabilizzazione · Azione, 0 PV recuperati']]);
   const performers=[['external','Un Meccanico esterno']];if(selfMechanic(c)&&c.pvCur>0)performers.unshift(['self','Intervengo su me stesso']);select('Operatore','performer',performers);
   if(draft.performer==='external'){
    select('Meccanica dell’operatore','mechanicsDie',DICE.map(d=>[d,d]));select('Astuzia dell’operatore','astuziaDie',DICE.map(d=>[d,d]));
    if(rank(draft.mechanicsDie)>=rank('d12'))check('L’operatore ha acquisito Carne e Metallo','carneMetallo');
    check('Il Meccanico raggiunge fisicamente il Cyborg','reachable');
   }
   const p=profile(c,draft);form.appendChild(el('p',{class:'sub',text:'Prova: '+(p.astuzia||'Astuzia da definire')+' Astuzia + '+(p.die||'Meccanica da definire')+' Meccanica · Soglia 8.'}));
   check('Strumenti da Meccanico disponibili','tools');
   if(draft.kind==='field-repair'){
    form.appendChild(el('p',{class:'sub',text:c.cyborgCombat?.fieldRepairUsed?'Già ricevuta: serve un Riposo Breve o Lungo.':'Una Riparazione di Campo tra due Riposi Brevi.'}));
    check('Ricambi ordinari disponibili','spares');check('Intervento svolto: 10 minuti fuori combattimento','outsideCombat');
    form.appendChild(el('p',{class:'sub',text:'Successo: '+p.healingDice+' × ('+(p.die||'Meccanica')+') PV, entro il massimo'+(p.carneMetallo?' · Carne e Metallo attivo.':'.')}));
    numberInput('Totale dei PV tirati con Meccanica','healingTotal');
    if(p.carneMetallo||draft.moduleId){
     select('Modulo da riparare nello stesso intervento','moduleId',[['','Nessun Modulo'],...list(c.moduli).filter(m=>m.stato==='danneggiato').map(m=>[m.id,m.nome||'Modulo Danneggiato'])]);
     if(draft.moduleId){check('Materiali necessari al Modulo disponibili','moduleMaterials');check('Requisiti speciali del Modulo rispettati','moduleRequirements');}
    }
   }else form.appendChild(el('p',{class:'sub',text:'Solo a 0 PV: il successo stabilizza le ferite, senza recuperare PV, far tornare cosciente o riparare Moduli. È una normale Azione.'}));
   numberInput('Totale della Prova Astuzia + Meccanica','rollTotal');
   if(message)form.appendChild(el('p',{class:'sub',role:'status',text:message}));
   form.appendChild(el('button',{type:'button',class:'btn sm gold',text:'Registra l’esito già tirato',onclick:()=>{
    try{mutateM(()=>{const result=apply(c,draft);message=result.success?(draft.kind==='stabilize'?'Cyborg Stabilizzato: PV invariati.':'Recuperati '+result.recovered+' PV.'+(result.repairedModuleId?' Un Modulo riparato.':'')):'Prova fallita: nessun recupero o riparazione, limite disponibile.';feedback.set(c,message);});}
    catch(error){message=error.message;}redraw();
   }}));
  };redraw();
  body.appendChild(el('button',{type:'button',class:'btn sm',text:'Registra Riposo Breve/Lungo',onclick:()=>mutateM(()=>{resetRepair(c);feedback.set(c,'Riposo completato: Riparazione di Campo disponibile.');})}));
  body.appendChild(el('p',{class:'sub',text:'Registra un Riposo già completato: rende disponibile la Riparazione di Campo. I recuperi del Riposo si annotano normalmente nei contatori; le Cariche non si ricaricano.'}));
  body.appendChild(el('a',{class:'sub',href:'/manuale-cyborg/#sez-11-2',target:'_blank',rel:'noopener',text:'Regole delle cure Cyborg ↗'}));
  return wrap;
 }
 const api={DICE:Object.freeze(DICE),profile,evaluate,apply,resetRepair,recoveryRule,render};root.GLCCyborgCare=api;
 if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
