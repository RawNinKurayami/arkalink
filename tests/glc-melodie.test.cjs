const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setup}=require('./helpers/glc-fixture.cjs');
const root=path.join(__dirname,'..');
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(name='Marcia di Guerra',type='Voce',names=[],extra={}){
 const h=setup(),c=h.context.pg;
 Object.assign(c,{role:'Musicista',style:'Musicista',role2:'',style2:'',roleSkillDie:'d20',skills:{},race:'umano',attr:{Forza:'d20',Tecnica:'d20',Astuzia:'d20',Spirito:'d20'},talents:names.map(n=>'Musicista · Musicista · '+n),haki:[],armi:[],moduli:[],strumenti:[{smcId:'music',nome:'Strumento di prova',tipo:type,die:'d12'}],...extra});
 c.extraTech=[{id:'punch',nome:'Canzone',fonte:'Stile',stile:'',forma:'Canzone',attr:'Spirito',die:'d20',eff:[name],instrumentId:'instrument:music',durata:'Un turno'}];
 h.context.isMusicista=()=>true;
 return {...h,c,M:h.context.window.GLCMelodies,t:c.extraTech[0],song:options=>h.context.window.GLCMelodies.evaluate(c,c.extraTech[0],options)};
}
const contrappunto=['Contrappunto — Base','Contrappunto — Migliorato','Contrappunto — Maestria'];
function grantPrestige(h,ids,die='d20+d20'){h.c.roleSkillDie=die;h.c.prestige={choices:{musicista:ids},session:{}};}

test('The 13 Melodies preserve the manual grades, base costs and one Melody per Song',()=>{
 const h=fixture();assert.equal(h.M.definitions.length,13);
 for(const [name,grade,st] of [['Motivetto di Vigore','d6',2],['Richiamo','d6',1],['Marcia di Guerra','d6',2],['Controcanto','d8',1],['Requiem Beffardo','d8',1],['Tempo','d8',2],['Crescendo','d10',2],['Ninnananna','d10',4],['Assolo Travolgente','d10',5],['Inno della Ciurma','d12',5],['Canto di Bordo','d12',4],['Marcia Funebre','d12',3],["Canzone dell'Anima",'d20',6]]){
  const m=h.M.get(name);assert.equal(m.minGrade,grade);assert.equal(m.st,st);
 }
 h.t.eff=['Richiamo','Tempo'];assert.equal(h.song().valid,false);
});
test('Corde discount each single-target Melody without reducing below one ST',()=>{
 for(const [name,st] of [['Motivetto di Vigore',1],['Marcia di Guerra',1],['Requiem Beffardo',1],['Tempo',1],['Crescendo',1]]){
  const h=fixture(name,'Corde');assert.equal(h.song().cost.st,st,name);h.c.talents=['Musicista · Musicista · Fiato Lungo'];assert.equal(h.song().cost.st,1,name);
 }
 assert.equal(fixture('Richiamo','Corde').song().cost.st,1);
});
test('Percussioni follow whole-crew effects and explicit collective context, including a legitimate zero',()=>{
 for(const [name,names,st] of [['Inno della Ciurma',[],4],['Canto di Bordo',[],3],["Canzone dell'Anima",["Canzone dell'Anima"],5]])assert.equal(fixture(name,'Percussioni',names).song().cost.st,st);
 const a=fixture('Assolo Travolgente','Percussioni');assert.equal(a.song().cost.st,5);assert.equal(a.song({context:{entireCrew:true}}).cost.st,4);
 const c=fixture('Controcanto','Percussioni',['Fiato Lungo']);assert.equal(c.song({context:{entireCrew:true}}).cost.st,0);assert.ok(c.song({context:{entireCrew:true}}).notes.some(n=>n.startsWith('Percussioni')));
});
test('Fiati amplify ordinary 20m while retaining the specific 10m of Marcia Funebre',()=>{
 assert.equal(fixture('Richiamo','Fiati').song().range,40);
 const h=fixture('Marcia Funebre','Fiati',['Requiem','Marcia Funebre','Coro della Ciurma']);assert.equal(h.song().range,10);assert.equal(h.song({context:{coroActive:true}}).range,20);
 h.c.talents=h.c.talents.filter(k=>!k.endsWith('Coro della Ciurma'));assert.equal(h.song({context:{coroActive:true}}).valid,false);
});
test('Chosen instrument is limited by actual Arte including secondary Musicista; voice stays d4',()=>{
 const h=fixture('Requiem Beffardo','Corde',[],{role:'Capitano',style:'Capitano',roleSkillDie:'d20+d20',role2:'Musicista',style2:'Musicista',skills:{Arte:'d8'}});
 assert.equal(h.song().instrument.effective,'d8');assert.equal(h.song().saving.threshold,5);
 assert.equal(h.song({instrumentId:'instrument:voice'}).saving.threshold,3);
 h.c.skills.Arte='d20+d20';assert.equal(h.song().instrument.effective,'d12');assert.equal(h.song().saving.threshold,7);
});
test('Historical instrument grades and malformed records are preserved but grant no invented instrument',()=>{
 const h=fixture();h.c.strumenti=[null,7,'text',{smcId:'old',tipo:'Corde',die:'d20+d4'}];
 const before=JSON.stringify(h.c),profiles=h.M.instruments(h.c);
 assert.equal(profiles[0].valid,true);for(const p of profiles.slice(1)){assert.equal(p.valid,false);assert.equal(p.threshold,null);}
 assert.equal(h.song({instrumentId:'instrument:old'}).valid,false);assert.equal(h.song({instrumentId:'instrument:index:0'}).valid,false);
 assert.equal(JSON.stringify(h.c),before);
});
test('Composer reference setup preserves malformed instruments and writes valid IDs atomically once',()=>{
 const h=fixture('Marcia di Guerra'),malformed=[null,7,'historic',false,[]];
 h.c.strumenti=[...malformed,{smcId:'keep',nome:'Liuto',tipo:'Corde',die:'d8',future:{kept:true}},{nome:'Flauto',tipo:'Fiati',die:'d6',future:{kept:2}}];
 h.context.KEY='music-test';h.context.CT={activeId:'owner',order:['other','owner'],future:'container',chars:{owner:h.c,other:{nome:'Altro pirata',future:{kept:true}}}};
 const before=JSON.stringify([h.context.pg,h.context.CT]),writes=[];
 h.context.window.GLCStore={setItem:()=>{throw Error('quota piena')}};
 assert.throws(()=>h.moves.ensureReferences(),/quota piena/);assert.equal(JSON.stringify([h.context.pg,h.context.CT]),before);
 h.context.window.GLCStore={setItem:(key,value)=>writes.push({key,value})};
 h.moves.ensureReferences();assert.equal(writes.length,1);assert.equal(writes[0].key,'music-test');
 const saved=JSON.parse(writes[0].value);assert.deepEqual(saved.chars.owner.strumenti.slice(0,5),malformed);
 assert.equal(saved.chars.owner.strumenti[5].smcId,'keep');assert.ok(saved.chars.owner.strumenti[6].smcId);assert.deepEqual(saved.chars.owner.strumenti[6].future,{kept:2});
 assert.equal(saved.future,'container');assert.deepEqual(saved.order,['other','owner']);assert.deepEqual(saved.chars.other,{nome:'Altro pirata',future:{kept:true}});
 assert.deepEqual(plain(h.context.pg),saved.chars.owner);h.moves.ensureReferences();assert.equal(writes.length,1);
 const profiles=h.M.instruments(h.context.pg);assert.ok(profiles.slice(1,6).every(p=>!p.valid));assert.equal(profiles[6].valid,true);assert.equal(profiles[7].valid,true);
});
test('Mantice explains its two free turns and sustained action without creating a scene clock',()=>{
 const h=fixture('Marcia di Guerra','Mantice'),s=h.song();assert.equal(s.maintenance.st,1);assert.equal(s.maintenance.freeTurns,2);assert.equal(s.maintenance.actionRequired,true);assert.match(s.maintenance.text,/Dal turno successivo/);assert.match(s.maintenance.text,/primi due turni/);
 h.t.eff=['Inno della Ciurma'];assert.equal(h.song().maintenance.st,0);assert.equal(h.song().maintenance.freeTurns,0);
});
test('Current acquired Contrappunto applies its chain, free maintenance and capacity; lost Arte removes benefits',()=>{
 const h=fixture('Marcia di Guerra','Voce',contrappunto);let s=h.song();assert.equal(s.maintenance.st,0);assert.equal(s.maintenance.actionRequired,false);assert.equal(s.maxSustained,2);
 h.c.roleSkillDie='d8';s=h.song();assert.equal(s.maintenance.st,1);assert.equal(s.maxSustained,1);assert.equal(s.maintenance.actionRequired,false);
 h.c.talents=[];assert.equal(h.song().maintenance.actionRequired,true);
});
test('Fiato Lungo is automatic from actual eligible ownership and never double counts a card selection',()=>{
 const h=fixture('Marcia di Guerra','Voce',['Fiato Lungo']);let r=h.resolve({instrumentId:'instrument:music'});assert.equal(r.status,'ready');assert.equal(r.totals.st,1);
 r=h.resolve({instrumentId:'instrument:music',passiveTalentIds:['glc-talent-201']});assert.equal(r.totals.st,1);
 h.c.roleSkillDie='d8';assert.equal(h.song().cost.st,2);assert.equal(h.resolve({passiveTalentIds:['glc-talent-201']}).status,'repair');
});
test('Scene counters show first-use costs when absent and calculate only explicitly supplied valid context',()=>{
 const h=fixture('Motivetto di Vigore','Voce');assert.equal(h.song().cost.st,2);assert.match(h.song().cost.label,/primo utilizzo/);assert.ok(h.song().warnings.some(n=>n.includes('primo utilizzo')));
 const before=JSON.stringify(h.c);assert.equal(h.song({context:{motivettoPreviousTargets:2}}).cost.st,4);assert.equal(JSON.stringify(h.c),before);
 h.t.eff=['Assolo Travolgente'];assert.equal(h.song({context:{assoloPreviousUses:2}}).cost.st,7);
 for(const value of [-1,1.5,1000,'x'])assert.equal(h.song({context:{assoloPreviousUses:value}}).valid,false);
});
test('Risonanza updates actual benefits without changing activation, rerolls or Ultimate',()=>{
 const h=fixture('Assolo Travolgente');grantPrestige(h,['risonanza-leggendaria'],'d20+d4');let s=h.song();assert.equal(s.cost.st,5);assert.equal(s.benefits.recovery.count,2);assert.equal(s.benefits.attackBonus.count,2);
 grantPrestige(h,['risonanza-leggendaria']);h.t.eff=['Crescendo'];assert.equal(h.song().benefits.techniqueDiscount,6);
 h.t.eff=['Canto di Bordo'];assert.equal(h.song().benefits.stationBonusDice,3);
 h.t.eff=['Inno della Ciurma'];assert.equal(h.song().multiplier,3);assert.match(h.song().melody.description,/due volte/);
 h.t.eff=["Canzone dell'Anima"];h.c.talents=["Musicista · Musicista · Canzone dell'Anima"];assert.equal(h.song().multiplier,1);assert.equal(h.song().cost.st,6);
});
test('Orchestra derives current eligible Prestige and choice capacity without fusing two Melodies',()=>{
 const h=fixture('Marcia di Guerra','Voce',contrappunto);grantPrestige(h,['orchestra-vivente'],'d20+d4');assert.equal(h.song().maxSustained,3);assert.equal(h.song().maintenance.st,0);assert.match(h.song().actionText,/due Canzoni distinte/);
 grantPrestige(h,['orchestra-vivente']);assert.equal(h.song().maxSustained,4);h.c.talents=[];assert.equal(h.song().maxSustained,1);assert.equal(h.song().maintenance.st,1);
});
test('Requiem Sovrano replaces one execution and one cost, derives save from Arte and accepts a conditional Coro',()=>{
 const h=fixture('Requiem Beffardo','Corde',['Requiem','Coro della Ciurma']);grantPrestige(h,['requiem-sovrano'],'d20+d4');let s=h.song({context:{requiemSovrano:true}});assert.equal(s.cost.st,4);assert.equal(s.range,50);assert.equal(s.saving.threshold,13);assert.equal(s.saving.source,'Arte completa');assert.ok(s.notes.some(n=>n.includes('già perso almeno 1 PV')));
 grantPrestige(h,['requiem-sovrano']);s=h.song({context:{requiemSovrano:true,coroActive:true}});assert.equal(s.cost.st,5);assert.equal(s.range,1000);assert.equal(s.saving.threshold,21);
 const r=h.resolve({songContext:{requiemSovrano:true},instrumentId:'instrument:music'});assert.equal(r.status,'ready');assert.equal(r.totals.st,5);assert.equal(r.economy.normal,1);
 h.c.prestige.choices.musicista=[];assert.equal(h.song({context:{requiemSovrano:true}}).valid,false);
});
test('Instrument and ordinary discounts apply to Anima while Risonanza alone never modifies it',()=>{
 const h=fixture("Canzone dell'Anima",'Percussioni',["Canzone dell'Anima",'Fiato Lungo']);grantPrestige(h,['risonanza-leggendaria']);assert.equal(h.song().cost.st,4);assert.equal(h.song().multiplier,1);assert.match(h.song().melody.description,/stessa ciurma/);
});
test('Legacy physical links and explicit historical equipment overlays do not block Songs or consume module charges',()=>{
 const h=fixture('Marcia di Guerra','Voce',[],{race:'cyborg',role2:'Combattente',style2:'Swordsman',attr:{Spirito:'d20',Forza:'d4'},armi:[{id:'sword',tipo:'Lama',attr:'Forza',grado:'d20'}],moduli:[{id:'broken',stato:'danneggiato',req:'d20',fuel:{on:true,cur:0}}]});
 h.context.ROLE_IMG.Musicista='ruolo-musicista';h.context.STYLE_IMG.Swordsman='stile-swordsman';
 Object.assign(h.t,{stile:'Swordsman',arma:'sword',modulo:'broken',weapon:'Old sword'});const before=JSON.stringify(h.c);
 const evaluated=h.context.GLCTechniques.evaluate(h.c,h.t,h.context.tbRules());assert.equal(evaluated.valid,true,JSON.stringify(evaluated.errors));assert.equal(evaluated.cost.st,2);
 const r=h.resolve({instrumentId:'instrument:voice',weaponId:'weapon:deleted',moduleId:'module:broken'});assert.equal(r.status,'ready',JSON.stringify(r.errors));assert.equal(r.totals.st,2);assert.equal(r.resources.length,0);assert.equal(r.selected.some(s=>['weapon','module'].includes(s.kind)),false);
 assert.equal(r.tech.icon,'music');assert.equal(r.tech.emblem,'ruolo-musicista');assert.match(r.tech.subtitle,/Musicista · Canzone/);assert.doesNotMatch(r.tech.subtitle,/Swordsman/);assert.equal(r.tech.raw.stile,'Swordsman');
 assert.equal(r.move.weaponId,'weapon:deleted');assert.equal(r.move.moduleId,'module:broken');assert.equal(JSON.stringify(h.c),before);
});
test('Historical Area duration never overrides a Melody in resolver conditions or the source data',()=>{
 for(const name of ['Inno della Ciurma','Canto di Bordo','Marcia di Guerra']){
  const h=fixture(name),before=JSON.stringify(h.t),r=h.resolve({instrumentId:'instrument:voice'});assert.equal(r.status,'ready');assert.equal(r.conditions.some(c=>c.text==='Durata: Un turno'),false);assert.ok(r.conditions.some(c=>c.text.startsWith('Durata della Melodia:')));assert.equal(JSON.stringify(h.t),before);
 }
});
test('A card explicitly overrides the Technique instrument without changing either saved reference',()=>{
 const h=fixture('Requiem Beffardo','Corde'),before=JSON.stringify(h.c),r=h.resolve({instrumentId:'instrument:voice'});assert.equal(r.totals.st,1);assert.ok(r.formulas.some(f=>f.label==='Salvezza · Canzone'&&f.text.includes('Soglia 3')));assert.equal(JSON.stringify(h.c),before);
});
test('Shared standalone print resolver matches the configured app for current musical Talents and Prestige',()=>{
 const h=fixture('Marcia di Guerra','Mantice',[...contrappunto,'Fiato Lungo','Requiem','Coro della Ciurma']);grantPrestige(h,['orchestra-vivente','risonanza-leggendaria','requiem-sovrano']);
 const c=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'regole/melodie.js'),'utf8'),c);
 for(const [name,context] of [['Marcia di Guerra',{}],['Assolo Travolgente',{assoloPreviousUses:2}],['Canto di Bordo',{}],['Requiem Beffardo',{requiemSovrano:true,coroActive:true}]]){
  h.t.eff=[name];const expected=h.song({context}),actual=c.window.GLCMelodies.evaluate(plain(h.c),plain(h.t),{context});
  for(const key of ['cost','maintenance','range','maxSustained','benefits','saving','duration','melody'])assert.deepEqual(plain(actual[key]),plain(expected[key]),name+' '+key);
 }
});
