const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const plain=x=>JSON.parse(JSON.stringify(x));
function setup(){
 const ctx=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'regole/cyborg.js'),'utf8'),ctx);
 const C=ctx.window.GLCCyborg;
 const module=(id='m1',extra={})=>({id,nome:'Modulo di prova',req:'d8',tipo:['Utilità'],arma:false,installato:true,stato:'integro',funzione:'Sensore termico entro 25 m.',funzioneTipo:'Sensore',funzioneUso:'Continua',funzioneAttiva:'Sensore termico entro 25 m.',funzioneInattiva:'',fuel:{on:false},...extra});
 const pg={race:'cyborg',racialDie:'d20',attr:{Forza:'d20',Tecnica:'d20',Astuzia:'d20',Spirito:'d20'},moduli:[module()],moduloAttivo:'m1',pvCur:12,stCur:20};
 return {C,pg,module};
}
const catalogue=[['Spostamento','Attrazione','Avvicina','d8',1,['Spostamento']],['Spostamento','Scatto','Muove','d6',1,['Spostamento']],['Controllo','Schianto','Urto','d6',2,['Singolo']],['Controllo','Urto','Due slot','d12',3,['Singolo']],['Controllo','Paralisi','Paralizza','d12',3,['Singolo']]];

test('All ordinary Cyborg tiers reproduce the manual tables, including energy, defenses, work and technology limits',()=>{
 const {C}=setup(),source=JSON.parse(fs.readFileSync(path.join(root,'regole/cyborg-fonti.json'),'utf8'));
 const table=header=>source.find(b=>b.type==='table'&&b.rows[0][1]===header).rows.slice(1);
 const number=t=>Number(String(t).replace(/[^\d.-]/g,''));
 assert.deepEqual(plain(C.DICE),['d6','d8','d10','d12','d20']);
 for(const [die,slots] of table('Slot disponibili'))assert.equal(C.tiers[die].slots,Number(slots));
 for(const [die,range,movement,load,sensors,area] of table('Portata funzionale')){
  const t=C.tiers[die];assert.equal(t.portata,number(range));assert.equal(t.spostamento,number(movement));assert.equal(t.carico,number(load)*(load.includes(' t')?1000:1));assert.equal(t.sensori,number(sensors));assert.equal(t.area,number(area));
 }
 for(const [header,field] of [['Riduzione danno fisico','corazza'],['Punti Sconto','discountPoints'],['Aumento massimo','optimizationPercent'],['Cariche massime','charges']])for(const [die,value]of table(header))assert.equal(C.tiers[die][field],number(value));
 for(const [die,mechanics,dc,time]of table('Meccanica minima'))assert.deepEqual(plain({...C.tiers[die].construction,materialCost:undefined,commissionCost:undefined}),{skill:mechanics,threshold:Number(dc),hours:number(time)});
 for(const [header,field]of [['Tempo base di installazione','installationMinutes'],['Tempo di riparazione','repairMinutes']])for(const [die,time]of table(header))assert.equal(C.tiers[die][field],number(time)*(time.includes('or')?60:1));
 for(const [die,value]of table('Danno da sovraccarico'))assert.equal('1'+C.tiers[die].overloadDie,value);
 for(const die of C.DICE){assert.equal(C.tiers[die].scudoDP,2);assert.equal(C.tiers[die].flight,['d10','d12','d20'].includes(die));}
});

test('The ready catalogue contains exactly the ten manual devices, never silently granting their described combat results',()=>{
 const {C,pg}=setup(),source=JSON.parse(fs.readFileSync(path.join(root,'regole/cyborg-fonti.json'),'utf8'));
 const rows=source.find(b=>b.type==='table'&&b.rows[0][0]==='Nome'&&b.rows[0][1]==='Fascia').rows.slice(1);
 assert.equal(C.catalogue.length,10);
 for(const [name,tier,category,physical] of rows){
  const device=C.catalogue.find(m=>m.nome===name);assert.ok(device,name);assert.equal(device.req,tier);assert.equal(device.funzioneAttiva,physical);assert.deepEqual(plain(device.tipo),category.split(' · '));assert.equal(device.installato,false);
  const copy=plain(device);if(copy.arma)copy.attr='Tecnica';assert.equal(C.evaluate(pg,copy,{purpose:'project',catalogue}).valid,true,name);
 }
 const cannon=C.catalogue.find(m=>m.nome==='Cannone a Pressione');assert.equal(cannon.armaTipo,'A distanza');assert.equal(cannon.attr,'');assert.deepEqual(plain(C.evaluate(pg,cannon,{purpose:'project'}).unlocks),[]);
});

test('Normalization is additive and preserves every legacy field, selection, resource and acquisition without autoactivation',()=>{
 const {C,pg}=setup();pg.moduli=[{id:'legacy',nome:'Vecchio',req:'d8',tipo:['Utilità'],arma:false,grado:'d6',funzione:'Vano antico',eff:'Sconto narrativo',fuel:{on:true,max:4,cur:1,consumo:1},stato:'danneggiato',note:'Nota'}];pg.moduloAttivo='legacy';pg.cyborgCombat={fieldRepairUsed:true,inCombat:true,switched:true};
 const previous=plain(pg);C.normalize(pg);
 for(const [field,value]of Object.entries(previous.moduli[0]))assert.deepEqual(plain(pg.moduli[0][field]),value,field);
 assert.equal(pg.moduli[0].installato,true);assert.equal(pg.moduli[0].funzioneAttiva,'Vano antico');assert.equal(pg.moduli[0].funzioneInattiva,'');assert.equal(pg.moduloAttivo,'legacy');assert.deepEqual(plain(pg.cyborgCombat),previous.cyborgCombat);assert.equal(pg.pvCur,previous.pvCur);assert.equal(pg.stCur,previous.stCur);
 const once=JSON.stringify(pg);C.normalize(pg);assert.equal(JSON.stringify(pg),once);assert.equal(C.evaluate(pg,pg.moduli[0]).active,false);assert.equal(C.evaluate(pg,pg.moduli[0]).selected,true);
});

test('Only installed devices occupy ordinary racial slots; legacy Talents and unrelated dice do not add access or slots',()=>{
 const {C,pg,module}=setup();pg.moduli=[module('m1'),module('project',{installato:false})];
 for(const [die,n]of [['d6',1],['d8',2],['d10',3],['d12',4],['d20',5]]){pg.racialDie=die;assert.equal(C.slots(pg).n,n);assert.equal(C.slots(pg).used,1);assert.equal(C.slots(pg).free,n-1);}
 pg.race='umano';pg.role='Combattente';pg.style='Special';pg.talents=['Combattente · Special · Arsenale Modulare — Maestria'];assert.equal(C.slots(pg).n,0);assert.equal(C.evaluate(pg,pg.moduli[0]).valid,false);
 pg.race='cyborg';pg.racialDie='d20+d20';assert.equal(C.slots(pg).n,0);assert.equal(C.evaluate(pg,pg.moduli[0]).valid,false);
});

test('Every module tier enforces independent technology, weapon, attribute and function caps; d4 weapons remain legal',()=>{
 const {C,pg,module}=setup();
 for(const die of C.DICE){
  pg.racialDie=die;const m=module('m1',{req:die,arma:true,armaTipo:'Lama',attr:'Tecnica',grado:die,funzioneTipo:'Arma',parametri:{portata:C.tiers[die].portata}});pg.moduli=[m];assert.equal(C.evaluate(pg,m,{purpose:'build'}).valid,true,die);assert.ok(C.weapon(m));
  m.parametri.portata++;assert.equal(C.evaluate(pg,m).valid,false);delete m.parametri;
  m.grado='d4';assert.equal(C.evaluate(pg,m).valid,true);
  m.grado=die;pg.attr.Tecnica='d4';assert.equal(C.evaluate(pg,m).valid,false);assert.equal(C.evaluate(pg,m).weapon,null);pg.attr.Tecnica='d20';
 }
 pg.racialDie='d8';const m=module('m1',{req:'d10',arma:true,armaTipo:'Lama',attr:'Tecnica',grado:'d12'});pg.moduli=[m];assert.equal(C.evaluate(pg,m).valid,false);assert.equal(C.weapon(m),null);
 m.req='d12';m.installato=false;assert.equal(C.weapon(m),null);
 m.installato=true;m.stato='danneggiato';assert.equal(C.weapon(m),null);
});

test('Sconto budgets use 1/2/3/4/5 points, exact targets and numeric fields; arbitrary old text grants no discounts',()=>{
 const {C,pg,module}=setup();
 for(const die of C.DICE){
  const m=module('m1',{req:die,eff:{cat:'Sconto',tgt:'Schianto',scontoST:C.tiers[die].discountPoints,scontoSlot:0}});pg.moduli=[m];assert.equal(C.evaluate(pg,m).valid,true);m.eff.scontoST++;assert.equal(C.evaluate(pg,m).valid,false);
 }
 const old=module('m1',{eff:{cat:'Sconto',tgt:'Schianto',testo:'Gratis, −3 ST e nessuno slot.'}});pg.moduli=[old];const assessment=C.evaluate(pg,old);assert.equal(assessment.valid,false);assert.equal(assessment.legacyUnresolved,true);assert.equal(C.techModifiers(pg,{modulo:'m1',eff:['Schianto']},catalogue).discountST,0);
 old.req='d6';old.eff={cat:'Sconto',tgt:'Schianto',scontoST:0,scontoSlot:1};assert.equal(C.evaluate(pg,old).valid,false);
});

test('Technique discounts are targeted, bounded and remain projectable while inactive; whole named techniques consume one discount',()=>{
 const {C,pg,module}=setup();const m=module('m1',{req:'d12',eff:{cat:'Sconto',tgt:'Scatto',scontoST:3,scontoSlot:0}});pg.moduli=[m];pg.moduloAttivo='';
 const t={modulo:'m1',nome:'Mossa',eff:['Scatto','Schianto']};let modifiers=C.techModifiers(pg,t,catalogue);assert.equal(modifiers.discountST,0);assert.equal(modifiers.target,'Scatto');assert.equal(modifiers.targetKind,'effect');
 m.eff.tgt='Schianto';modifiers=C.techModifiers(pg,t,catalogue);assert.equal(modifiers.discountST,1,'Never reduce the other selected effect or the target below 1 ST');
 m.eff={cat:'Sconto',tgt:'Mossa',scontoST:2,scontoSlot:1};modifiers=C.techModifiers(pg,t,catalogue);assert.equal(modifiers.discountST,2);assert.equal(modifiers.discountSlots,1);assert.equal(modifiers.targetKind,'technique');
 m.eff.tgt='Un’altra mossa';modifiers=C.techModifiers(pg,t,catalogue);assert.equal(modifiers.discountST,0);assert.equal(modifiers.discountSlots,0);
 m.eff={cat:'Sconto',tgt:'Scatto',scontoST:0,scontoSlot:1};modifiers=C.techModifiers(pg,t,catalogue);assert.equal(modifiers.discountSlots,1);m.installato=false;assert.equal(C.techModifiers(pg,t,catalogue).discountSlots,0);
});

test('Sblocco has one exact effect, does not lower its grade and respects explicit physical technique restrictions',()=>{
 const {C,pg,module}=setup();const m=module('m1',{req:'d8',eff:{cat:'Sblocco',sblocchi:['Attrazione']}});pg.moduli=[m];pg.moduloAttivo='';
 const t={modulo:'m1',stile:'Striker',forma:'Spostamento',attr:'Forza',eff:['Attrazione']};assert.deepEqual(plain(C.techModifiers(pg,t,catalogue).unlocks),['Attrazione']);
 m.eff.sblocchi=['Attrazione','Scatto'];assert.equal(C.evaluate(pg,m,{catalogue}).valid,false);
 m.eff.sblocchi=['Paralisi'];assert.equal(C.evaluate(pg,m,{catalogue}).valid,false);
 m.eff.sblocchi=['Attrazione'];m.tecnicheCompatibili={forme:['Spostamento'],stili:['Striker'],attributi:['Forza']};assert.equal(C.techModifiers(pg,t,catalogue).errors.length,0);t.forma='Area';assert.ok(C.techModifiers(pg,t,catalogue).errors.some(e=>e.code==='module-technique-compatible'));
 m.stato='danneggiato';assert.deepEqual(plain(C.techModifiers(pg,t,catalogue).unlocks),[]);
});

test('Passive models and optimization use their own minimum tiers and improve only one specified function parameter',()=>{
 const {C,pg,module}=setup();
 for(const [model,die]of [['Ottimizzazione','d6'],['Stabilizzazione','d8'],['Compensazione','d10'],['Resistenza Specializzata','d12'],['Sistema Leggendario','d20']]){
  const m=module('m1',{req:die,eff:{cat:'Passiva',modello:model,parametro:model==='Ottimizzazione'?'sensori':'Interferenza termica specifica',aumento:25}});pg.moduli=[m];assert.equal(C.evaluate(pg,m).valid,true,model);if(die!=='d6'){m.req=C.DICE[C.DICE.indexOf(die)-1];assert.equal(C.evaluate(pg,m).valid,false,model+' lower tier');}
 }
 const m=module('m1',{req:'d10',parametri:{sensori:87.5,portata:10},eff:{cat:'Passiva',modello:'Ottimizzazione',parametro:'sensori',aumento:75}});pg.moduli=[m];let a=C.evaluate(pg,m);assert.equal(a.valid,true);assert.equal(a.limits.sensori,87.5);assert.equal(a.limits.portata,10);m.parametri.portata=11;assert.equal(C.evaluate(pg,m).valid,false);m.parametri.portata=10;m.eff.aumento=76;assert.equal(C.evaluate(pg,m).valid,false);
});

test('Reactions accept canonical and written manual frequencies while enforcing tier and emergency limits',()=>{
 const {C,pg,module}=setup();
 for(const [die,freq,uses]of [['d6','1 volta per scontro',1],['d8','2 volte per scontro',2],['d10','1 volta per round',1],['d12','round',1],['d20','round',1]]){
  const m=module('m1',{req:die,eff:{cat:'Reazione',trigger:'Un avversario attacca.',freq}});pg.moduli=[m];assert.equal(C.evaluate(pg,m).valid,true,die);
  m.eff.utilizzi=uses+1;assert.equal(C.evaluate(pg,m).valid,false,die+' too frequent');
 }
 const m=module('m1',{req:'d8',eff:{cat:'Reazione',trigger:'Attacco',freq:'round'}});pg.moduli=[m];assert.equal(C.evaluate(pg,m).valid,false);m.req='d10';m.eff.usaAzione=true;assert.equal(C.evaluate(pg,m).valid,false);m.req='d12';assert.equal(C.evaluate(pg,m).valid,true);m.eff.emergenza=true;assert.equal(C.evaluate(pg,m).valid,false);m.req='d20';assert.equal(C.evaluate(pg,m).valid,true);
});

test('Maledizione requires a real structured price; doubled energy is consumed and an unrelated narrative price gives no extra unlock',()=>{
 const {C,pg,module}=setup();const m=module('m1',{req:'d8',eff:{cat:'Maledizione',base:'Sblocco',sblocchi:['Attrazione','Scatto'],prezzo:'Consumo raddoppiato'},fuel:{on:true,max:4,cur:3,consumo:1}});pg.moduli=[m];assert.equal(C.evaluate(pg,m,{catalogue}).valid,true);
 C.use(pg,'m1');assert.equal(m.fuel.cur,1);assert.equal(pg.moduloAttivo,'','Less than the next use cost shuts the module down');
 m.eff.prezzo='Fa rumore ogni tanto';assert.equal(C.evaluate(pg,m,{catalogue}).valid,false);m.eff.prezzo='+1 ST per utilizzo';pg.moduloAttivo='m1';C.use(pg,'m1');assert.equal(pg.stCur,19);
 m.fuel.on=false;m.eff.prezzo='Consumo raddoppiato';assert.equal(C.evaluate(pg,m).valid,false);
});

test('All grades validate charge capacities, integer remaining charges and default consumption without normalization changing resources',()=>{
 const {C,pg,module}=setup();
 for(const die of C.DICE){const cap=C.tiers[die].charges,m=module('m1',{req:die,fuel:{on:true,max:cap,cur:cap,consumo:''}});pg.moduli=[m];assert.equal(C.evaluate(pg,m).energy.cost,1);assert.equal(C.evaluate(pg,m).valid,true);m.fuel.max=cap+1;assert.equal(C.evaluate(pg,m).valid,false);m.fuel.max=cap;m.fuel.cur=.5;assert.equal(C.evaluate(pg,m).valid,false);m.fuel.cur=cap;m.fuel.consumo='1 carica';assert.equal(C.evaluate(pg,m).valid,false);const before=plain(m.fuel);C.normalize(pg);assert.deepEqual(plain(m.fuel),before);}
});

test('A Surriscaldamento curse prevents immediate reactivation and lasts until the next own-turn start, without repeated starts clearing it',()=>{
 const {C,pg,module}=setup();const m=module('m1',{req:'d8',eff:{cat:'Maledizione',base:'Passiva',modello:'Stabilizzazione',parametro:'Rilevamento termico',prezzo:'Surriscaldamento'}});pg.moduli=[m];
 C.startCombat(pg);C.beginTurn(pg);C.use(pg,'m1');assert.equal(pg.moduloAttivo,'');assert.equal(C.evaluate(pg,m).operational,false);
 const before=JSON.stringify(pg);assert.throws(()=>C.activate(pg,'m1'),/surriscaldato/);assert.equal(JSON.stringify(pg),before);C.beginTurn(pg);assert.throws(()=>C.activate(pg,'m1'),/surriscaldato/);
 C.endTurn(pg);C.beginTurn(pg);C.activate(pg,'m1');assert.equal(C.evaluate(pg,m).operational,true);
});

test('Leaving combat ends temporary overheating without restoring activation, charges, health or Field Repair availability',()=>{
 const {C,pg,module}=setup();const m=module('m1',{req:'d8',eff:{cat:'Maledizione',base:'Passiva',modello:'Stabilizzazione',parametro:'Rilevamento termico',prezzo:'Surriscaldamento'},fuel:{on:true,max:4,cur:3,consumo:1}});pg.moduli=[m];pg.cyborgCombat={fieldRepairUsed:true};
 C.startCombat(pg);C.beginTurn(pg);C.use(pg,'m1');assert.equal(pg.moduloAttivo,'');assert.equal(m.fuel.cur,2);assert.ok(pg.cyborgCombat.overheatedModules.m1);
 C.endCombat(pg);assert.equal(pg.cyborgCombat.inCombat,false);assert.deepEqual(plain(pg.cyborgCombat.overheatedModules),{});assert.equal(pg.moduloAttivo,'');assert.equal(m.fuel.cur,2);assert.equal(pg.pvCur,12);assert.equal(pg.stCur,20);assert.equal(pg.cyborgCombat.fieldRepairUsed,true);
 C.activate(pg,'m1');assert.equal(pg.moduloAttivo,'m1');assert.equal(m.fuel.cur,2);
});

test('Installed, integral and active are distinct; inactive devices remain valid projects but cannot supply live capabilities or spend charges',()=>{
 const {C,pg,module}=setup();const m=module('m1',{fuel:{on:true,max:4,cur:2,consumo:1}});pg.moduli=[m];pg.moduloAttivo='';let a=C.evaluate(pg,m,{purpose:'build'});assert.equal(a.valid,true);assert.equal(a.active,false);assert.equal(a.operational,false);const before=JSON.stringify(pg);assert.throws(()=>C.use(pg,'m1'),/Inattivo/);assert.equal(JSON.stringify(pg),before);
 pg.moduloAttivo='m1';assert.equal(C.evaluate(pg,m).operational,true);m.fuel.cur=0;assert.equal(C.evaluate(pg,m).selected,true);assert.equal(C.evaluate(pg,m).active,false);assert.equal(C.evaluate(pg,m,{purpose:'build'}).valid,true);
 m.fuel.cur=2;m.stato='danneggiato';assert.equal(C.evaluate(pg,m,{purpose:'build'}).valid,false);assert.equal(C.evaluate(pg,m).active,false);
 m.stato='integro';m.installato=false;assert.equal(C.evaluate(pg,m,{purpose:'build'}).valid,false);assert.equal(C.evaluate(pg,m).operational,false);
});

test('Combat lifecycle preserves active modules, charges and repair use, permits exactly one own-turn switch and ignores repeated turn starts',()=>{
 const {C,pg,module}=setup();pg.moduli.push(module('m2'));pg.cyborgCombat={fieldRepairUsed:true};C.startCombat(pg);assert.equal(pg.moduloAttivo,'m1');assert.equal(pg.cyborgCombat.fieldRepairUsed,true);
 assert.throws(()=>C.activate(pg,'m2'),/proprio turno/);C.beginTurn(pg);C.activate(pg,'m2');assert.equal(pg.cyborgCombat.switched,true);C.beginTurn(pg);assert.throws(()=>C.activate(pg,'m1'),/già effettuato/);
 C.deactivate(pg);assert.throws(()=>C.activate(pg,'m1'),/già effettuato/);C.endTurn(pg);C.beginTurn(pg);C.activate(pg,'m1');C.endCombat(pg);assert.equal(pg.moduloAttivo,'m1');assert.equal(pg.cyborgCombat.fieldRepairUsed,true);assert.equal(pg.pvCur,12);assert.equal(pg.stCur,20);
 delete pg.cyborgCombat;const before=JSON.stringify(pg);assert.throws(()=>C.beginTurn(pg),/Avvia lo scontro/);assert.equal(JSON.stringify(pg),before);
});

test('An undeclared initial module may be selected freely at combat start, without granting another off-turn change',()=>{
 const {C,pg,module}=setup();pg.moduli.push(module('m2'));pg.moduloAttivo='';C.startCombat(pg);C.activate(pg,'m1');assert.equal(pg.cyborgCombat.switched,false);assert.throws(()=>C.activate(pg,'m2'),/proprio turno/);C.beginTurn(pg);C.activate(pg,'m2');assert.equal(pg.moduloAttivo,'m2');
});

test('A preserved invalid historical selection gives no active benefit and does not consume the free initial combat selection',()=>{
 for(const previous of ['damaged','empty','missing']){
  const {C,pg,module}=setup();const saved=pg.moduli[0];pg.moduli.push(module('m2'),module('m3'));pg.cyborgCombat={fieldRepairUsed:true};
  if(previous==='damaged')saved.stato='danneggiato';
  if(previous==='empty')saved.fuel={on:true,max:4,cur:0,consumo:1};
  if(previous==='missing')pg.moduloAttivo='historic-missing';
  const storedId=pg.moduloAttivo,resources=JSON.stringify([pg.pvCur,pg.stCur,pg.moduli.map(m=>m.fuel)]);
  C.startCombat(pg);assert.equal(pg.moduloAttivo,storedId,previous+' preserves the historical reference');assert.equal(pg.cyborgCombat.initialSelectionAvailable,true);assert.equal(pg.cyborgCombat.fieldRepairUsed,true);assert.equal(JSON.stringify([pg.pvCur,pg.stCur,pg.moduli.map(m=>m.fuel)]),resources);
  C.activate(pg,'m2');assert.equal(pg.moduloAttivo,'m2');assert.equal(pg.cyborgCombat.initialSelectionAvailable,false);assert.equal(pg.cyborgCombat.switched,false);assert.equal(pg.cyborgCombat.ownTurn,false);assert.throws(()=>C.activate(pg,'m3'),/proprio turno/);
 }
});

test('Emergency reaction activates and uses a d20 module atomically, paying once and rejecting a second reaction or failed activation without mutation',()=>{
 const {C,pg,module}=setup();const m=module('emergency',{req:'d20',eff:{cat:'Reazione',trigger:'Cado.',freq:'round',utilizzi:1,emergenza:true},fuel:{on:true,max:8,cur:8,consumo:1}});pg.moduli.push(m);C.startCombat(pg);
 const before=JSON.stringify(pg);assert.throws(()=>C.use(pg,'emergency',{reaction:true,reactionAvailable:false}),/non è disponibile/);assert.equal(JSON.stringify(pg),before);
 C.use(pg,'emergency',{reaction:true,reactionAvailable:true});assert.equal(pg.moduloAttivo,'emergency');assert.equal(m.fuel.cur,7);assert.equal(pg.cyborgCombat.roundUses.emergency,1);assert.throws(()=>C.use(pg,'emergency',{reaction:true}),/esauriti/);
 C.beginTurn(pg);C.activate(pg,'m1');C.activate(pg,'emergency',{emergency:true});assert.equal(m.fuel.cur,6);assert.equal(pg.cyborgCombat.roundUses.emergency,1);assert.equal(pg.cyborgCombat.switched,true);
});

test('Damage, repair and recharge never heal the Cyborg or reactivate a stopped historic module; maintenance and installation cannot happen in combat',()=>{
 const {C,pg,module}=setup();const m=pg.moduli[0];m.fuel={on:true,max:4,cur:2,consumo:1};C.damage(pg,'m1');assert.equal(m.stato,'danneggiato');assert.equal(pg.moduloAttivo,'');assert.equal(pg.pvCur,12);assert.equal(m.fuel.cur,2);
 pg.moduloAttivo='m1';C.repair(pg,'m1');assert.equal(m.stato,'integro');assert.equal(pg.moduloAttivo,'');assert.equal(pg.pvCur,12);
 m.fuel.cur=0;pg.moduloAttivo='m1';assert.throws(()=>C.recharge(pg,'m1'),/risorsa/);C.recharge(pg,'m1',{resourceAvailable:true});assert.equal(m.fuel.cur,4);assert.equal(pg.moduloAttivo,'');
 C.startCombat(pg);for(const action of [()=>C.repair(pg,'m1'),()=>C.recharge(pg,'m1',{resourceAvailable:true}),()=>C.install(pg,'m1',false)]){const before=JSON.stringify(pg);assert.throws(action,/combattimento/);assert.equal(JSON.stringify(pg),before);}
 C.endCombat(pg);pg.racialDie='d6';pg.moduli=[module('installed',{req:'d6'}),module('project',{req:'d6',installato:false})];assert.throws(()=>C.install(pg,'project'),/slot libero/);C.install(pg,'installed',false);C.install(pg,'project');assert.equal(C.slots(pg).used,1);assert.equal(pg.moduloAttivo,'');
});
