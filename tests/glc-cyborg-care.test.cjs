const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../gestisci-pirata/cyborg-care.js'),'utf8');
function fixture(){
 const context=vm.createContext({window:{},console}),html=fs.readFileSync(path.join(__dirname,'../gestisci-pirata/index.html'),'utf8'),start=html.indexOf('const TALENTS='),end=html.indexOf('\n};',start)+3;
 assert.ok(start>=0&&end>start);vm.runInContext(html.slice(start,end),context);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../regole/talenti.js'),'utf8'),context);context.GLCTalents=context.window.GLCTalents;vm.runInContext('GLCTalents.configure({roles:TALENTS});',context);
 const c=context.pg={race:'cyborg',role:'Ingegnere',style:'Meccanico',roleSkillDie:'d12',attr:{Astuzia:'d10',Forza:'d8',Tecnica:'d8',Spirito:'d8'},skills:{},talents:[],pvCur:3,pvMax:16,
  moduli:[{id:'a',nome:'Braccio',stato:'danneggiato',fuel:{on:true,cur:1,max:5}},{id:'b',nome:'Jet',stato:'danneggiato',fuel:{on:true,cur:0,max:8}}],moduloAttivo:'',cyborgCombat:{inCombat:false,fieldRepairUsed:false,turn:3},specialMoveSession:{haki:{keep:{pipRemaining:2}}},uniqueTraits:{acquired:['inventore']}};
 vm.runInContext(source,context);return {context,c,care:context.window.GLCCyborgCare};
}
const field=extra=>({kind:'field-repair',performer:'self',tools:true,spares:true,outsideCombat:true,rollTotal:8,healingTotal:5,...extra});
const external=extra=>({performer:'external',mechanicsDie:'d12',astuziaDie:'d8',reachable:true,...extra});
const plain=x=>JSON.parse(JSON.stringify(x));

test('Self interventions require an actual primary or secondary Meccanico and use its own current Skill',()=>{
 const h=fixture();assert.equal(h.care.profile(h.c,{performer:'self'}).die,'d12');
 Object.assign(h.c,{role:'Capitano',style:'Capitano',roleSkillDie:'d20+d20',role2:'Ingegnere',style2:'Meccanico',skills:{Meccanica:'d10'}});
 assert.equal(h.care.profile(h.c,{performer:'self'}).die,'d10');assert.equal(h.care.evaluate(h.c,field()).valid,true);
 h.context.GLCTalents.swapRoles(h.c);assert.equal(h.care.profile(h.c,{performer:'self'}).die,'d10');
 h.c.style='Inventore';assert.equal(h.care.profile(h.c,{performer:'self'}).eligible,false);assert.throws(()=>h.care.apply(h.c,field()),/Serve un Meccanico/);
 h.c.role='Dottore';h.c.style='Infermeria';h.c.role2='';h.c.skills.Meccanica='d20';assert.equal(h.care.profile(h.c,{performer:'self'}).eligible,false);
});

test('Stored Carne e Metallo only applies while its genuine Meccanico prerequisites remain active',()=>{
 const h=fixture();h.c.talents=['Ingegnere · Meccanico · Carne e Metallo'];const owned=JSON.stringify(h.c.talents);
 assert.equal(h.care.profile(h.c,{performer:'self'}).healingDice,2);
 h.c.roleSkillDie='d10';assert.equal(h.care.profile(h.c,{performer:'self'}).healingDice,1);assert.equal(JSON.stringify(h.c.talents),owned);
 h.c.roleSkillDie='d12';assert.equal(h.care.profile(h.c,{performer:'self'}).healingDice,2);
 h.c.style='Carpentiere';h.c.skills.Meccanica='d20';assert.equal(h.care.profile(h.c,{performer:'self'}).carneMetallo,false);
});

test('Field repair is a read-only validated plan followed by the entered healing result, capped at maximum HP',()=>{
 const h=fixture(),before=JSON.stringify(h.c),request=field({healingTotal:12});
 const plan=h.care.evaluate(h.c,request);assert.equal(plan.valid,true);assert.equal(plan.action,'10 minuti fuori combattimento');assert.equal(plan.threshold,8);assert.equal(JSON.stringify(h.c),before);
 const unrelated=JSON.stringify([h.c.moduli,h.c.specialMoveSession,h.c.uniqueTraits,h.c.talents]);
 const result=h.care.apply(h.c,request);assert.equal(result.recovered,12);assert.equal(h.c.pvCur,15);assert.equal(h.c.cyborgCombat.fieldRepairUsed,true);assert.equal(JSON.stringify([h.c.moduli,h.c.specialMoveSession,h.c.uniqueTraits,h.c.talents]),unrelated);
 h.care.resetRepair(h.c);h.care.apply(h.c,field({healingTotal:10}));assert.equal(h.c.pvCur,16);
});

test('Missing tools, spares, outside-combat declaration, actual combat or malformed dice/results never mutate the character',()=>{
 for(const patch of [{tools:false},{spares:false},{outsideCombat:false},{rollTotal:''},{rollTotal:1.5},{rollTotal:Number.MAX_SAFE_INTEGER+1},{healingTotal:13},{healingTotal:0},external({reachable:false}),external({mechanicsDie:'d20+'})]){
  const h=fixture(),before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field(patch)));assert.equal(JSON.stringify(h.c),before);
 }
 const h=fixture();h.c.cyborgCombat.inCombat=true;const before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field()),/fuori dal combattimento/);assert.equal(JSON.stringify(h.c),before);
});

test('A failed field repair grants nothing and does not consume the once-between-rests benefit',()=>{
 const h=fixture(),before=JSON.stringify(h.c);const result=h.care.apply(h.c,field({rollTotal:7,healingTotal:''}));
 assert.equal(result.success,false);assert.equal(result.recovered,0);assert.equal(JSON.stringify(h.c),before);
 h.care.apply(h.c,field());const used=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field()),/già ricevuta/);assert.equal(JSON.stringify(h.c),used);
});

test('Recording a Short or Long Rest resets only field repair usage, preserving HP, modules, charges and other session data',()=>{
 const h=fixture();h.c.cyborgCombat.fieldRepairUsed=true;h.c.cyborgCombat.stabilized=true;const expected=plain(h.c);expected.cyborgCombat.fieldRepairUsed=false;
 h.care.resetRepair(h.c);assert.deepEqual(plain(h.c),expected);
});

test('Carne e Metallo uses two complete current Meccanica pools, including Prestige, without substituting another statistic',()=>{
 const h=fixture();h.c.talents=['Ingegnere · Meccanico · Carne e Metallo'];h.c.roleSkillDie='d20+d4';h.c.attr.Astuzia='d20+d20';h.c.pvMax=100;
 const plan=h.care.evaluate(h.c,field({healingTotal:48}));assert.equal(plan.valid,true);assert.equal(plan.die,'d20+d4');assert.equal(plan.healingDice,2);
 h.care.apply(h.c,field({healingTotal:48}));assert.equal(h.c.pvCur,51);
 const other=fixture();other.c.roleSkillDie='d20+d4';assert.throws(()=>other.care.apply(other.c,field({healingTotal:25})),/risultato effettivo/);
});

test('A successful Carne e Metallo intervention optionally repairs exactly one damaged Module, preserving fuel and activation',()=>{
 const h=fixture();h.c.talents=['Ingegnere · Meccanico · Carne e Metallo'];const fuel=JSON.stringify(h.c.moduli.map(m=>m.fuel));
 const result=h.care.apply(h.c,field({healingTotal:8,moduleId:'a',moduleMaterials:true,moduleRequirements:true}));
 assert.equal(result.repairedModuleId,'a');assert.equal(h.c.moduli[0].stato,'integro');assert.equal(h.c.moduli[1].stato,'danneggiato');assert.equal(JSON.stringify(h.c.moduli.map(m=>m.fuel)),fuel);assert.equal(h.c.moduloAttivo,'');
});

test('Absent Carne e Metallo, unavailable materials, unmet special requirements, multiple or destroyed Modules block the whole intervention',()=>{
 for(const patch of [{moduleMaterials:false},{moduleRequirements:false},{moduleId:['a','b']},{moduleId:'missing'}]){
  const h=fixture();h.c.talents=['Ingegnere · Meccanico · Carne e Metallo'];const before=JSON.stringify(h.c);
  assert.throws(()=>h.care.apply(h.c,field({moduleId:'a',moduleMaterials:true,moduleRequirements:true,...patch})));assert.equal(JSON.stringify(h.c),before);
 }
 const h=fixture();let before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field({moduleId:'a',moduleMaterials:true,moduleRequirements:true})),/Carne e Metallo/);assert.equal(JSON.stringify(h.c),before);
 h.c.talents=['Ingegnere · Meccanico · Carne e Metallo'];h.c.moduli[0].stato='distrutto';before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field({moduleId:'a',moduleMaterials:true,moduleRequirements:true})),/Distrutti/);assert.equal(JSON.stringify(h.c),before);
});

test('An external declared Meccanico uses selected dice and cannot claim Carne e Metallo below its d12 prerequisite',()=>{
 const h=fixture();h.c.role='Cuoco';h.c.style='Cuoco';h.c.roleSkillDie='d20';
 let plan=h.care.evaluate(h.c,field(external({mechanicsDie:'d10',carneMetallo:true})));assert.equal(plan.valid,true);assert.equal(plan.healingDice,1);assert.equal(plan.die,'d10');
 const result=h.care.apply(h.c,field(external({mechanicsDie:'d12',carneMetallo:true,healingTotal:8})));assert.equal(result.healingDice,2);assert.equal(h.c.pvCur,11);assert.equal(h.c.talents.length,0);
});

test('Mechanical Stabilization at 0 HP requires an external reachable operator and tools, succeeds at 8 and changes no HP or Module',()=>{
 const h=fixture();h.c.pvCur=0;h.c.cyborgCombat.inCombat=true;h.c.cyborgCombat.fieldRepairUsed=true;const before=plain(h.c);
 const request={kind:'stabilize',...external(),tools:true,rollTotal:8};const result=h.care.apply(h.c,request);
 assert.equal(result.success,true);assert.equal(result.recovered,0);assert.equal(result.action,'Azione');before.cyborgCombat.stabilized=true;assert.deepEqual(plain(h.c),before);
});

test('Stabilization failure, positive-HP targets and ordinary self interventions at 0 HP do not alter the tracker',()=>{
 const h=fixture();let before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,{kind:'stabilize',...external(),tools:true,rollTotal:8}),/0 PV/);assert.equal(JSON.stringify(h.c),before);
 h.c.pvCur=0;before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field()),/su te stesso/);assert.throws(()=>h.care.apply(h.c,{kind:'stabilize',performer:'self',tools:true,rollTotal:8}),/su te stesso/);
 assert.equal(h.care.apply(h.c,{kind:'stabilize',...external(),tools:true,rollTotal:7}).success,false);assert.equal(JSON.stringify(h.c),before);
});

test('Biological Medicine does not heal Cyborgs; rest, food and direct HP recovery remain valid without automatic Module or charge effects',()=>{
 const h=fixture();assert.equal(h.care.recoveryRule('biological-medicine').allowed,false);
 for(const source of ['short-rest','long-rest','food','direct-hp'])assert.deepEqual(plain(h.care.recoveryRule(source)),{allowed:true,repairsModules:false,reloadsCharges:false});
 h.c.race='umano';const before=JSON.stringify(h.c);assert.throws(()=>h.care.apply(h.c,field()),/riservata ai Cyborg/);assert.equal(JSON.stringify(h.c),before);
});

test('The actual panel presents manual-recorded interventions and keeps the HP tracker outside its control',()=>{
 const h=fixture();
 function element(tag,props={},kids=[]){const node={tag,children:[],...props,appendChild(child){this.children.push(child);return child;},replaceChildren(){this.children=[];}};for(const child of Array.isArray(kids)?kids:[kids])if(child)node.appendChild(child);return node;}
 h.context.el=element;h.context.mutateM=fn=>fn();const parent=element('div'),before=JSON.stringify(h.c),panel=h.care.render(parent);
 const flatten=node=>[node,...node.children.flatMap(flatten)],nodes=flatten(panel),text=nodes.map(n=>n.text||'').join(' ');
 assert.equal(JSON.stringify(h.c),before);assert.match(text,/Medicina non recuperano PV/);assert.match(text,/10 minuti fuori combattimento/);assert.match(text,/Cariche non si ricaricano/);assert.match(text,/§6\.12\.1/);
 assert.ok(nodes.some(n=>n.text==='Registra Riposo Breve/Lungo'));assert.ok(nodes.some(n=>n['aria-label']==='Totale della Prova Astuzia + Meccanica'));assert.ok(nodes.every(n=>n['aria-label']!=='Punti Vita'));
 h.c.role='Cuoco';h.c.style='Cuoco';const externalPanel=h.care.render(element('div'));assert.ok(!flatten(externalPanel).some(n=>n.text==='Intervengo su me stesso'));
 h.c.race='umano';assert.equal(h.care.render(element('div')),null);
});
