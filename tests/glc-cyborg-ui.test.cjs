/* Exercise the actual Officina and Moduli UI callbacks against the Cyborg rules.
 * No browser storage, network, character fixtures shared with the live page,
 * or duplicate implementation of the installation/activation rules. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'regole/cyborg.js'),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));

function node(tag,props={},children=[]){
 return {tag,props,...props,children:children.filter(Boolean),
  appendChild(child){if(child)this.children.push(child);return child;}};
}
function walk(element){return element?[element,...(element.children||[]).flatMap(walk)]:[];}
function content(element){return walk(element).map(n=>[n.text,n.html].filter(Boolean).join(' ')).join(' ');}
function button(element,label){
 const result=walk(element).find(n=>n.tag==='button'&&(typeof label==='string'?n.text===label:label.test(n.text||'')));
 assert.ok(result,'Expected button '+label+' in '+content(element));return result;
}
function click(element,label){const b=button(element,label);assert.equal(typeof b.onclick,'function');b.onclick();return b;}
function moduleData(id,extra={}){
 return {id,nome:'Modulo '+id,req:'d8',tipo:['Utilità'],arma:false,
  funzione:'Sensore termico entro 25 m',funzioneTipo:'Sensore',funzioneUso:'Operativa',
  funzioneAttiva:'Rileva fonti di calore entro 25 m',funzioneInattiva:'',parametri:{sensori:25},
  eff:null,fuel:{on:false,tipo:'',max:'',cur:'',consumo:'',ricarica:'',rischi:''},
  stato:'integro',installato:true,note:'',...extra};
}
function setup(extra={}){
 const alerts=[];
 const pg={race:'cyborg',racialDie:'d8',role:'Cuoco',style:'Cambusa',roleSkillDie:'d8',
  attr:{Forza:'d12',Tecnica:'d12',Astuzia:'d8',Spirito:'d8'},talents:[],
  pvCur:7,pvMax:16,stCur:9,stMax:12,moduli:[],moduloAttivo:'',extraTech:[],...extra};
 const context=vm.createContext({console,pg,window:{},el:node,alert:t=>alerts.push(String(t)),confirm:()=>true,
  save:()=>{},render:()=>{},flyIn:()=>{},byText:()=>{},setTimeout:()=>{},
  closeModal:()=>{},closeBuilder:()=>{},bldSummary:()=>{},
  svgIcon:()=>'',dieIcon:d=>d,gradeLabel:d=>d,
  hasTalent:()=>false,isCombSpecial:()=>false,
  WEAPON_GRADI:[['d4','Comune'],['d6','Competente'],['d8','Esperto'],['d10','Maestro'],['d12','Leggenda'],['d20','Mitico']],
  TEC_EFF:[],EFF_CATS:['Sconto','Sblocco','Passiva','Reazione','Maledizione'],EFF_CAT_ICO:{},EFF_CAT_HINT:{},
  tecEffObj:()=>null,
 });
 context.mutate=context.mutateM=context.bldMutate=fn=>fn?.();
 context.openModal=(title,render)=>{context.modalTitle=title;context.modal=render();return context.modal;};
 context.openBuilder=config=>{context.builder=config;return config;};
 for(const name of ['field','taField','selField'])context[name]=(label,value,change)=>node('field',{label,value,change});
 for(const name of ['optCards','bldTiers','smbChips'])context[name]=(...args)=>{
  const options=typeof args[0]==='string'?args[1]:args[0];
  const value=typeof args[0]==='string'?args[2]:args[1];
  const change=typeof args[0]==='string'?args[3]:args[2];
  return node('options',{label:typeof args[0]==='string'?args[0]:'',options,value,change});
 };
 context.bldNote=(text,status)=>node('note',{text,status});
 vm.runInContext(engine,context);context.GLCCyborg=context.window.GLCCyborg;
 assert.ok(context.GLCCyborg,'Cyborg engine must be exported');
 const builderStart=html.indexOf('function modReadBack(mo){'),builderEnd=html.indexOf('\nconst ATTRS=',builderStart);
 const uiStart=html.indexOf('const MOD_TIPI='),uiEnd=html.indexOf('\n/* La Skill di Ruolo',uiStart);
 assert.ok(builderStart>=0&&builderEnd>builderStart,'Actual module Builder block');
 assert.ok(uiStart>=0&&uiEnd>uiStart,'Actual module management block');
 vm.runInContext(html.slice(builderStart,builderEnd)+'\n'+html.slice(uiStart,uiEnd),context);
 return {context,pg,alerts,sheet:i=>{context.moduleSheetModal(i);return context.modal;},
  builderStep:label=>{const step=context.builder.steps.find(s=>s.label===label);assert.ok(step,label);const h=node('div');step.render(h);return h;}};
}

test('Legacy normalization preserves module identity, actual grade, charge and valid active reference',()=>{
 const mo={id:'legacy-sensor',nome:'Occhio antico',req:'d8',die:'d20',grado:'d6',attr:'Tecnica',
  desc:'Testo storico',eff:'Effetto storico',stato:'integro',fuel:{on:true,tipo:'Olio',max:4,cur:2,consumo:1,ricarica:'Olio disponibile'}};
 const {context:c,pg}=setup({moduli:[mo],moduloAttivo:mo.id});c.normModules();
 assert.equal(mo.id,'legacy-sensor');assert.equal(mo.grado,'d6');assert.equal(mo.die,'d20');
 assert.equal(mo.fuel.cur,2);assert.equal(mo.fuel.max,4);assert.equal(mo.installato,true);
 assert.equal(pg.moduloAttivo,'legacy-sensor');assert.equal(mo.stato,'integro');
 assert.equal(mo.effLegacy,'Effetto storico');assert.match(content(c.moduleSheetModal(0)||c.modal),/storico/i);
});

test('Officina can save a new project with every physical slot occupied',()=>{
 const existing=[moduleData('one'),moduleData('two')];
 const {context:c,pg,alerts}=setup({moduli:existing});c.normModules();
 const before=c.GLCCyborg.slots(pg);assert.equal(before.used,2);assert.equal(before.free,0);
 c.officinaModal();click(c.modal,/Progetto personalizzato/);
 assert.equal(pg.moduli.length,3);assert.equal(pg.moduli[2].installato,false);
 assert.equal(c.GLCCyborg.slots(pg).used,2);assert.equal(alerts.length,0);
});

test('The Officina catalog contains exactly the ten ready manual entries and adds an uninstalled project',()=>{
 const {context:c,pg}=setup({moduli:[moduleData('one'),moduleData('two')]});c.officinaModal();
 const cards=walk(c.modal).filter(n=>(n.class||'').split(' ').includes('catcard'));
 assert.equal(cards.length,10);
 const names=['Braccio Utensile','Piastre Toraciche','Braccio Telescopico','Occhio Termico','Jet Heel',
  'Cannone a Pressione','Guardia Automatica','Bobina Magnetica','Motore Fenice','Occhio dell’Orizzonte'];
 for(const name of names)assert.ok(cards.some(card=>content(card).includes(name)),name);
 assert.doesNotMatch(content(c.modal),/proposte da approvare|Nessun effetto approvato/i);
 const card=cards.find(card=>content(card).includes('Jet Heel'));assert.equal(typeof card.onclick,'function');card.onclick();
 assert.equal(pg.moduli.length,3);assert.equal(pg.moduli[2].installato,false);assert.equal(pg.moduli[2].req,'d10');
 assert.equal(c.GLCCyborg.slots(pg).used,2);assert.equal(pg.moduloAttivo,'');
});

test('Installation rejects full slots and a higher Fascia even when the GM annotation is set',()=>{
 const project=moduleData('project',{installato:false,gmOk:true});
 const {context:c,pg,sheet,alerts}=setup({moduli:[moduleData('one'),moduleData('two'),project]});
 click(sheet(2),/^Installa/);assert.equal(project.installato,false);assert.equal(c.GLCCyborg.slots(pg).used,2);
 assert.match(alerts.join(' '),/slot/i);
 pg.moduli.splice(1,1);project.req='d10';alerts.length=0;
 click(sheet(1),/^Installa/);assert.equal(project.installato,false);assert.equal(c.GLCCyborg.slots(pg).used,1);
 assert.match(alerts.join(' '),/Corpo Meccanico|Fascia/i);
 project.req='d8';click(sheet(1),/^Installa/);
 assert.equal(project.installato,true);assert.equal(c.GLCCyborg.slots(pg).used,2);
 assert.equal(project.stato,'integro');assert.equal(pg.moduloAttivo,'');assert.equal(pg.pvCur,7);
});

test('Installation, integrity and active selection remain separate in the module sheet',()=>{
 const project=moduleData('project',{installato:false});
 const {context:c,pg,sheet}=setup({moduli:[project]});
 assert.match(content(sheet(0)),/non installato/i);
 assert.equal(walk(c.modal).some(n=>n.tag==='button'&&n.text==='Attiva'),false);
 click(c.modal,/^Installa/);assert.equal(project.installato,true);assert.equal(project.stato,'integro');assert.equal(pg.moduloAttivo,'');
 click(sheet(0),'Attiva');assert.equal(pg.moduloAttivo,project.id);assert.equal(project.installato,true);
 click(sheet(0),'Disattiva');assert.equal(pg.moduloAttivo,'');assert.equal(project.installato,true);assert.equal(project.stato,'integro');
 assert.equal(c.GLCCyborg.slots(pg).used,1);
});

test('Combat controls enforce one free own-turn switch and voluntary shutdown does not restore it',()=>{
 const {context:c,pg,sheet,alerts}=setup({moduli:[moduleData('one'),moduleData('two')],moduloAttivo:'one'});
 const controls=()=>{const h=node('div');c.modCombatControls(h);return h;};
 click(controls(),'Inizio scontro');assert.equal(pg.cyborgCombat.inCombat,true);
 click(sheet(1),'Attiva');assert.equal(pg.moduloAttivo,'one');assert.match(alerts.join(' '),/proprio turno/i);
 click(controls(),'Inizio del mio turno');click(sheet(1),'Attiva');assert.equal(pg.moduloAttivo,'two');
 assert.match(content(controls()),/cambio gratuito già usato/i);
 const repeatedStart=button(controls(),'Inizio del mio turno');assert.equal(repeatedStart.disabled,true);
 repeatedStart.onclick();click(sheet(0),'Attiva');assert.equal(pg.moduloAttivo,'two');
 click(sheet(1),'Disattiva');assert.equal(pg.moduloAttivo,'');
 click(sheet(0),'Attiva');assert.equal(pg.moduloAttivo,'');
 click(controls(),'Fine del mio turno');click(sheet(0),'Attiva');assert.equal(pg.moduloAttivo,'');
 click(controls(),'Inizio del mio turno');click(sheet(0),'Attiva');assert.equal(pg.moduloAttivo,'one');
 click(controls(),'Fine scontro');assert.equal(pg.moduloAttivo,'one');assert.equal(pg.cyborgCombat.inCombat,false);
 assert.equal(pg.pvCur,7);assert.equal(pg.stCur,9);
});

test('Marking module damage clears active operation without changing PV, ST or installation',()=>{
 const active=moduleData('active');
 const {context:c,pg,sheet}=setup({moduli:[active],moduloAttivo:active.id});
 click(sheet(0),/Segna danneggiato/);
 assert.equal(active.stato,'danneggiato');assert.equal(active.installato,true);assert.equal(pg.moduloAttivo,'');
 assert.equal(pg.pvCur,7);assert.equal(pg.stCur,9);assert.equal(c.GLCCyborg.slots(pg).used,1);
 assert.equal(c.GLCCyborg.evaluate(pg,active,{purpose:'use'}).operational,false);
 assert.match(content(sheet(0)),/Danneggiato/);assert.equal(walk(c.modal).some(n=>n.tag==='button'&&n.text==='Attiva'),false);
});

test('Ordinary module repair is blocked in combat and restores neither PV nor active selection',()=>{
 const damaged=moduleData('damaged',{stato:'danneggiato'});
 const {context:c,pg,sheet,alerts}=setup({moduli:[damaged]});
 c.GLCCyborg.startCombat(pg);click(sheet(0),/^Ripara/);
 assert.equal(damaged.stato,'danneggiato');assert.match(alerts.join(' '),/fuori dal combattimento/i);
 c.GLCCyborg.endCombat(pg);click(sheet(0),/^Ripara/);
 assert.equal(damaged.stato,'integro');assert.equal(damaged.installato,true);assert.equal(pg.moduloAttivo,'');
 assert.equal(pg.pvCur,7);assert.equal(pg.stCur,9);
});

test('The module Builder integrity step reports separate states and does not directly overwrite them',()=>{
 const damaged=moduleData('damaged',{stato:'danneggiato',installato:false});
 const {context:c,pg,builderStep}=setup({moduli:[damaged]});c.moduleModal(0);
 const step=builderStep('Integrità');assert.match(content(step),/Danneggiato/);assert.match(content(step),/Non installato/);
 assert.equal(walk(step).some(n=>n.tag==='options'),false);
 assert.equal(damaged.stato,'danneggiato');assert.equal(damaged.installato,false);assert.equal(pg.pvCur,7);
 c.builder.save();assert.equal(damaged.installato,false);assert.equal(damaged.stato,'danneggiato');
});

test('Module use consumes its own charge, clears an empty module and rejects a stale use button',()=>{
 const mo=moduleData('powered',{fuel:{on:true,tipo:'Olio',max:4,cur:1,consumo:1,ricarica:'10 minuti con Olio'}});
 const {context:c,pg,sheet,alerts}=setup({moduli:[mo],moduloAttivo:mo.id});
 const use=button(sheet(0),/^Usa funzione/);use.onclick();
 assert.equal(mo.fuel.cur,0);assert.equal(pg.moduloAttivo,'');assert.equal(pg.stCur,9);assert.equal(pg.pvCur,7);
 use.onclick();assert.equal(mo.fuel.cur,0);assert.equal(pg.stCur,9);assert.equal(pg.pvCur,7);
 assert.match(alerts.join(' '),/Cariche|Inattivo/i);
 assert.equal(walk(sheet(0)).some(n=>n.tag==='button'&&/^Usa funzione/.test(n.text||'')),false);
 c.moduleModal(0);assert.equal(mo.fuel.cur,0);assert.equal(pg.moduloAttivo,'');
});

test('Recharge requires the recorded ten-minute intervention outside combat and restores no activation or PV',()=>{
 const mo=moduleData('powered',{fuel:{on:true,tipo:'Olio',max:4,cur:0,consumo:1,ricarica:'10 minuti con Olio'}});
 const {context:c,pg,sheet,alerts}=setup({moduli:[mo]});c.GLCCyborg.startCombat(pg);
 click(sheet(0),/^Ricarica/);assert.equal(mo.fuel.cur,0);assert.match(alerts.join(' '),/fuori dal combattimento/i);
 c.GLCCyborg.endCombat(pg);c.confirm=()=>false;click(sheet(0),/^Ricarica/);assert.equal(mo.fuel.cur,0);
 c.confirm=()=>true;click(sheet(0),/^Ricarica/);assert.equal(mo.fuel.cur,4);assert.equal(pg.moduloAttivo,'');
 assert.equal(pg.pvCur,7);assert.equal(pg.stCur,9);
});

test('The Motore Fenice reaction activates an inactive module and pays a single charge atomically',()=>{
 const {context:c,pg,sheet,alerts}=setup({racialDie:'d20',moduli:[moduleData('one')],moduloAttivo:'one'});
 const mo=c.modNewProject(c.GLCCyborg.catalogue.find(m=>m.nome==='Motore Fenice'));mo.installato=true;pg.moduli.push(mo);
 c.GLCCyborg.startCombat(pg);const reaction=button(sheet(1),'Usa Reazione');reaction.onclick();
 assert.equal(pg.cyborgCombat.ownTurn,false);assert.equal(pg.moduloAttivo,mo.id);assert.equal(mo.fuel.cur,7);
 assert.equal(pg.pvCur,7);assert.equal(pg.stCur,9);
 reaction.onclick();assert.equal(mo.fuel.cur,7);assert.equal(pg.moduloAttivo,mo.id);
 assert.match(alerts.join(' '),/utilizzi|Reazione/i);
});

test('Module removal preserves the uninstalled device and linked Techniques and cannot happen during combat',()=>{
 const mo=moduleData('one'),linked={id:'linked-tech',nome:'Tecnica storica',modulo:mo.id,eff:['Presa']};
 const {context:c,pg,sheet,alerts}=setup({moduli:[mo],moduloAttivo:mo.id,extraTech:[linked]});
 const before=clone(linked);c.GLCCyborg.startCombat(pg);click(sheet(0),'Disinstalla');
 assert.equal(mo.installato,true);assert.equal(pg.moduloAttivo,mo.id);assert.match(alerts.join(' '),/combattimento/i);
 c.GLCCyborg.endCombat(pg);click(sheet(0),'Disinstalla');
 assert.equal(pg.moduli.length,1);assert.equal(mo.installato,false);assert.equal(mo.stato,'integro');assert.equal(pg.moduloAttivo,'');
 assert.deepEqual(linked,before);assert.equal(c.GLCCyborg.slots(pg).used,0);assert.equal(pg.pvCur,7);
});

test('Invalid module energy is preserved but Save returns a visible Builder error instead of installing',()=>{
 const mo=moduleData('project',{installato:false,fuel:{on:true,tipo:'Olio',max:4,cur:2,consumo:1,ricarica:'10 minuti con Olio'}});
 const {context:c,pg,builderStep}=setup({moduli:[mo]});c.moduleModal(0);
 const energy=builderStep('Energia'),capacity=walk(energy).find(n=>n.tag==='input'&&n['aria-label']==='Capacità di Cariche');
 assert.ok(capacity);capacity.value='9';capacity.oninput();const result=c.builder.save();
 assert.equal(typeof result,'object');assert.match(result.msg,/Cariche|Fascia/i);
 assert.equal(mo.fuel.max,9);assert.equal(mo.fuel.cur,2);assert.equal(mo.installato,false);
 assert.equal(pg.moduloAttivo,'');assert.equal(pg.pvCur,7);
});

test('Multiple historical effects require an explicit archived revision to one structured effect',()=>{
 const historical=[{cat:'Sconto',testo:'Vecchio testo'},'Effetto aggiuntivo storico'];
 const mo=moduleData('historical',{eff:clone(historical)});
 const {context:c,builderStep}=setup({moduli:[mo]});c.moduleModal(0);
 const effect=builderStep('Effetto');assert.deepEqual(mo.eff,historical);assert.match(content(effect),/Massimo un Effetto Speciale/i);
 click(effect,'Registra un solo Effetto');assert.deepEqual(clone(mo.effArchive),historical);
 assert.equal(Array.isArray(mo.eff),false);assert.equal(mo.eff.cat,'');assert.equal(mo.id,'historical');assert.equal(mo.installato,true);
});

test('Deleting an installed module cannot bypass combat restrictions and keeps linked Techniques',()=>{
 const mo=moduleData('installed'),linked={id:'legacy',nome:'Tecnica da ricontrollare',modulo:mo.id};
 const {context:c,pg,sheet,alerts}=setup({moduli:[mo],moduloAttivo:mo.id,extraTech:[linked]});
 c.GLCCyborg.startCombat(pg);click(sheet(0),/Rimuovi/);
 assert.equal(pg.moduli.length,1);assert.equal(mo.installato,true);assert.equal(pg.moduloAttivo,mo.id);
 assert.match(alerts.join(' '),/combattimento/i);assert.equal(pg.extraTech[0],linked);
 c.GLCCyborg.endCombat(pg);click(sheet(0),/Rimuovi/);
 assert.equal(pg.moduli.length,0);assert.equal(pg.moduloAttivo,'');assert.equal(pg.extraTech[0],linked);
 assert.equal(linked.modulo,'installed');assert.equal(pg.pvCur,7);assert.equal(pg.stCur,9);
});
