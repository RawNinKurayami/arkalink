/* Run with node --test tests/glc-special-moves.test.cjs. Uses the live rule tables,
 * no network, no real character storage and no automatic resource consumption. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=process.env.GLC_TEST_ROOT||path.join(__dirname,'..');
const html=fs.readFileSync(process.env.GLC_MOVES_HTML||path.join(root,'gestisci-pirata/index.html'),'utf8');
const source=fs.readFileSync(process.env.GLC_MOVES_SOURCE||path.join(root,'gestisci-pirata/special-moves.js'),'utf8');
const {setup,errorText,hasBonusError}=require('./helpers/glc-fixture.cjs');

test('Ordinary Raffica charges 1, 3 or 6 ST cumulatively while extras remain basic attacks',()=>{
 const chain=['Raffica — Base','Raffica — Migliorato','Raffica — Maestria'];
 for(let tier=0;tier<chain.length;tier++){
  const h=setup();h.context.pg.talents.push(...chain.slice(1,tier+1).map(n=>'Combattente · Striker · '+n));
  const id=h.moves.sources().find(s=>s.name===chain[tier]).id;
  for(let count=1;count<=tier+1;count++){
   const r=h.resolve({activeTalentId:id,talentUses:{[id]:count}}),cost=[1,3,6][count-1];
   assert.equal(r.status,'ready',errorText(r));assert.equal(r.rows.find(row=>row.id===id).st,cost);
   assert.equal(r.totals.st,cost);assert.equal(r.economy.used,1);
   assert.ok(r.conditions.some(c=>/extra sono sempre attacchi base/.test(c.text)&&/mancato consuma ST ma non interrompe/.test(c.text)));
  }
  h.context.pg.extraTech[0].eff=['Scatto','Sfondamento'];
  const r=h.resolve({activeTalentId:id,talentUses:{[id]:tier+1}});
  assert.equal(r.totals.st,3+[1,3,6][tier]);
  for(const count of [0,1.5,tier+2])assert.equal(h.resolve({activeTalentId:id,talentUses:{[id]:count}}).totals,null);
 }
});
test('A technique and passive talents leave the Bonus free, including old 0 ST active slots',()=>{
 const h=setup(),r=h.resolve({activeTalentId:h.talent('Pressione Costante')});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.economy.normal,1);assert.equal(r.economy.used,0);
 assert.equal(r.move.activeTalentId,'');assert.ok(r.move.passiveTalentIds.includes(h.talent('Pressione Costante')));
});
test('The first Haki activation costs one Bonus and one PIP',()=>{
 const h=setup(),r=h.resolve({hakiSelections:[h.h()]});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,1);
});
test('An active talent cannot share a turn with the first Haki activation',()=>{
 const h=setup(),r=h.resolve({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h()]});
 assert.ok(hasBonusError(r));assert.equal(r.economy.used,2);assert.equal(r.totals,null);
});
test('The requested combo uses previously activated Haki and one active talent, without repaying PIP',()=>{
 const h=setup();h.context.pg.haki[0].die='d10';h.state(0,{pipRemaining:0});
 const r=h.resolve({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h(0,{activation:'prepared'})]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,0);
 assert.equal(r.totals.st,1);assert.equal(r.totals.maintenanceST,1);
 assert.ok(r.conditions.some(c=>/turno precedente/.test(c.text)&&/1 PIP già pagato/.test(c.text)));
 assert.ok(r.formulas.some(f=>/d10 Armamento/.test(f.text)));
});
test('A preparation recipe is saveable but unavailable until Haki is actually recorded active',()=>{
 const h=setup(),r=h.resolve({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h(0,{activation:'prepared'})]});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.status,'unavailable');assert.equal(r.totals.pip,0);
 assert.ok(r.unavailable.some(t=>/preparazione richiesta/.test(t)));
 assert.equal(h.context.pg.specialMoveSession,undefined);
});
test('Armamento d12+ retains free upkeep; other colors keep their maintenance',()=>{
 const h=setup();h.context.pg.haki[0].die='d12';h.state(0);h.state(1);
 const r=h.resolve({hakiSelections:[h.h(0),h.h(1)]});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.totals.maintenanceST,1);assert.equal(r.economy.used,0);
 assert.equal(r.rows.find(row=>row.id===h.colors[0]).maintenanceST,0);
});
test('An Haki lightning effect alone consumes the available Bonus and its PIP',()=>{
 const h=setup();h.state();const r=h.resolve({hakiSelections:[h.h(0,{effects:['act:d20']})]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,3);
});
test('An active talent and Haki lightning are mutually exclusive even with a maintained color',()=>{
 const h=setup();h.state();const r=h.resolve({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h(0,{effects:['act:d20']})]});
 assert.ok(hasBonusError(r));assert.equal(r.economy.used,2);assert.equal(r.totals,null);
});
test('Two Haki lightning effects cannot consume the same Bonus, within or across colors',()=>{
 const h=setup();h.state();h.state(2);
 assert.ok(hasBonusError(h.resolve({hakiSelections:[h.h(0,{effects:['act:d10','act:d20']})]})));
 assert.ok(hasBonusError(h.resolve({hakiSelections:[h.h(0,{effects:['act:d20']}),h.h(2,{effects:['act:3']})]})));
});
test('Multiple inactive colors each need their own activation Bonus',()=>{
 const h=setup();assert.ok(hasBonusError(h.resolve({hakiSelections:[h.h(),h.h(1)]})));
});
test('Persistent Haki effects prepared previously can accompany a talent while they still have duration',()=>{
 const h=setup();h.state(1,{pipRemaining:0,effects:{'act:d20':1}});
 const r=h.resolve({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h(1,{activation:'prepared',effects:['act:d20'],preparedEffects:['act:d20']})]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,0);
 assert.equal(r.totals.maintenanceST,1);assert.ok(r.conditions.some(c=>/Non rinnova la durata/.test(c.text)));
});
test('A prepared persistent effect without remaining turns is unavailable, including expired effects',()=>{
 const h=setup();h.state(1,{effects:{'act:d20':0}});
 const r=h.resolve({hakiSelections:[h.h(1,{activation:'prepared',effects:['act:d20'],preparedEffects:['act:d20']})]});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.status,'unavailable');
 assert.ok(r.unavailable.some(t=>/assente o scaduto/.test(t)));
});
test('Corazza prepared on a previous turn keeps its defense bonus alongside a voluntary zero-ST talent using its Bonus, without new PIP',()=>{
 const h=setup();h.state(0,{effects:{'act:d12':1}});
 const r=h.resolve({baseTechId:'tech:guard',activeTalentId:h.talent('Guardia del Combattente'),hakiSelections:[h.h(0,{use:'defense',activation:'prepared',effects:['act:d12'],preparedEffects:['act:d12']})]});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,0);
 assert.ok(r.formulas.some(f=>f.label==='Difesa Passiva'&&/4 Corazza/.test(f.text)));
});
test('Instant effects cannot be banked through imported or old recipes',()=>{
 for(const [i,id] of [[0,'act:d20'],[2,'act:3']]){
  const h=setup();h.state(i,{effects:{[id]:99}});
  const r=h.resolve({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h(i,{activation:'prepared',effects:[id],preparedEffects:[id]})]});
  assert.match(errorText(r),/non può essere conservato/);assert.ok(hasBonusError(r));
 }
});
test('A one-turn effect cannot be carried forward as if it lasted two turns',()=>{
 const h=setup();h.state(1,{effects:{'act:d10':1}});
 const r=h.resolve({hakiSelections:[h.h(1,{effects:['act:d10'],preparedEffects:['act:d10']})]});
 assert.match(errorText(r),/non può essere conservato/);
});
test('An Haki downgrade invalidates a previously unlocked persistent effect',()=>{
 const h=setup();h.context.pg.haki[1].die='d8';h.state(1,{effects:{'act:d20':1}});
 const r=h.resolve({hakiSelections:[h.h(1,{effects:['act:d20'],preparedEffects:['act:d20']})]});
 assert.match(errorText(r),/non più sbloccato o compatibile/);
});
test('Prepared fields survive normalization, duplication and JSON export without mutating input',()=>{
 const h=setup(),m=h.card({hakiSelections:[h.h(1,{activation:'prepared',effects:['act:d20'],preparedEffects:['act:d20']})]});
 const before=JSON.stringify(m),roundtrip=h.moves.normalizeMove(JSON.parse(JSON.stringify(h.moves.normalizeMove(m))));
 assert.equal(JSON.stringify(m),before);assert.equal(roundtrip.hakiSelections[0].activation,'prepared');
 assert.deepEqual(Array.from(roundtrip.hakiSelections[0].preparedEffects),['act:d20']);
});
test('Resource limits still apply to a legal lightning effect and resolving never consumes resources',()=>{
 const h=setup();h.state(0,{pipRemaining:2});const before=JSON.stringify(h.context.pg);
 const r=h.resolve({hakiSelections:[h.h(0,{effects:['act:d20']})]});
 assert.equal(r.status,'unavailable');assert.ok(r.unavailable.some(t=>/servono 3 PIP, disponibili 2/.test(t)));
 assert.equal(JSON.stringify(h.context.pg),before);
});
test('Stored duration is clamped to the original rule and never supplied to instant effects',()=>{
 const h=setup();h.state(0,{effects:{'act:d12':99,'act:d20':99}});
 const state=h.moves.hakiState(h.moves.sources().find(s=>s.id===h.colors[0]));
 assert.equal(state.effects['act:d12'],2);assert.equal(state.effects['act:d20'],undefined);
});

test('Activating a color and its lightning effect needs separate Bonus Actions',()=>{
 const h=setup(),r=h.resolve({hakiSelections:[h.h(0,{effects:['act:d10']})]});
 assert.ok(hasBonusError(r));assert.equal(r.economy.used,2);
 assert.match(errorText(r),/Attivazione/);
});

test('Fruit active talents share the same Bonus with Haki',()=>{
 const h=setup();h.context.pg.frutto={has:true,tipo:'Paramecia',nome:'Frutto di prova',die:'d20'};
 h.context.pg.talents.push('Frutto · Paramecia · Doppio Uso');
 Object.assign(h.context.pg.extraTech[0],{fonte:'Frutto',fruitType:'Paramecia',stile:''});
 h.state(1);const fruit=h.moves.sources().find(s=>s.kind==='talent'&&s.name==='Doppio Uso');
 assert.ok(fruit);assert.equal(fruit.meta.mode,'active');
 const r=h.resolve({activeTalentId:fruit.id,hakiSelections:[h.h(1,{effects:['act:d20']})]});
 assert.ok(hasBonusError(r));assert.equal(r.economy.used,2);
});
test('Print snapshots use the new rule version and propagate action limits and preparation',()=>{
 const h=setup();h.state();h.context.window.addEventListener=()=>{};
 const printFile=process.env.GLC_MOVES_PRINT||path.join(root,'scheda-stampabile/special-moves-print.js');
 vm.runInContext(fs.readFileSync(printFile,'utf8'),h.context);
 h.context.pg.specialMoves=[h.card({activeTalentId:h.talent('Raffica — Base'),hakiSelections:[h.h(0,{activation:'prepared'})]})];
 const pack=h.context.window.GLCPrintMoves.snapshot(h.context.pg,'qa');
 assert.equal(pack.v,7);assert.equal(pack.cards[0].totals.pip,0);
 assert.ok(pack.cards[0].conditions.some(c=>/Economia del turno/.test(c.text)));
 assert.ok(pack.cards[0].conditions.some(c=>/turno precedente/.test(c.text)));
 h.context.pg.specialMoves[0].hakiSelections[0].effects=['act:d20'];
 const invalid=h.context.window.GLCPrintMoves.snapshot(h.context.pg,'qa').cards[0];
 assert.equal(invalid.totals,null);assert.ok(invalid.warnings.some(w=>/Una sola Azione Bonus/.test(w)));
});

function liveTechniqueFixture(){
 const h=setup();
 if(!vm.runInContext('typeof STILE_WHITELIST!=="undefined"',h.context))vm.runInContext(html.match(/^const STILE_WHITELIST=[^\n]+/m)[0],h.context);
 vm.runInContext(fs.readFileSync(path.join(root,'regole/tecniche.js'),'utf8'),h.context);
 h.context.pg.attr.Forza='d20';
 h.context.weaponStyleReq=w=>w.tipo==='Lama'?'Swordsman':w.tipo==='Contundente'?'Crusher':'Sniper';
 return h;
}

test('Saved removed effects and excessive grades stay intact but cannot produce a ready card or numeric totals',()=>{
 for(const patch of [{eff:['+1d6 Dado Danno']},{eff:['Contrattacco'],forma:'Difesa'},{die:'d20+'},{die:'d6',eff:['Sbilancio']}]){
  const h=liveTechniqueFixture();Object.assign(h.context.pg.extraTech[0],patch);
  const before=JSON.stringify(h.context.pg),r=h.resolve({});
  assert.equal(r.status,'repair');assert.equal(r.totals,null);assert.ok(r.errors.length);
  assert.equal(JSON.stringify(h.context.pg),before);
 }
 const h=liveTechniqueFixture();h.context.pg.t1={nome:'Tecnica importata',attr:'Forza',die:'d20+',smcId:'legacy'};
 const before=JSON.stringify(h.context.pg),r=h.resolve({baseTechId:'tech:legacy'});
 assert.equal(r.status,'repair');assert.match(errorText(r),/non possono superare d20/);assert.equal(JSON.stringify(h.context.pg),before);
});

test('Weapon styles require a real compatible executor and a recipe may repair the link without changing the Technique',()=>{
 for(const [style,type] of [['Swordsman','Lama'],['Crusher','Contundente'],['Sniper','A distanza']]){
  const h=liveTechniqueFixture(),c=h.context.pg;Object.assign(c,{style});Object.assign(c.extraTech[0],{stile:style});
  assert.equal(h.resolve({}).status,'repair');
  c.armi=[{id:'executor',nome:'Arma',tipo:type,grado:'d8',attr:'Forza'}];
  assert.equal(h.resolve({}).status,'repair');
  const before=JSON.stringify(c),r=h.resolve({weaponId:'weapon:executor'});
  assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,0);assert.equal(JSON.stringify(c),before);
 }
});

test('Guardia versions keep their separate cost and DP bonus until the start of the next turn',()=>{
 for(const [die,effect,cost,bonus] of [['d8','Guardia',1,2],['d10','Guardia Migliorata',2,3],['d12','Guardia Maestria',3,4],['d20','Guardia Suprema',4,5]]){
  const h=liveTechniqueFixture();Object.assign(h.context.pg.extraTech[1],{die,eff:[effect]});
  const r=h.resolve({baseTechId:'tech:guard'});
  assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,cost);assert.equal(r.economy.normal,1);assert.equal(r.economy.reactions,0);
  assert.ok(r.formulas.some(f=>f.label==='Difesa Passiva'&&f.text.includes('+ '+bonus+' '+effect)&&/inizio del prossimo turno/.test(f.text)));
 }
});

test('Technique State saves derive their threshold from the Technique instead of the strongest Attribute or Role Skill',()=>{
 for(const [die,threshold] of [['d8',5],['d10',6],['d12',7],['d20',11]])for(const [effect,attr] of [['Sbilancio','Tecnica'],['Sfondamento','Forza']]){
  const h=liveTechniqueFixture();h.context.pg.attr.Forza='d20+d20';h.context.pg.roleSkillDie='d20+d20';
  Object.assign(h.context.pg.extraTech[0],{die,eff:[effect]});const r=h.resolve({});
  assert.equal(r.status,'ready',errorText(r));
  assert.ok(r.formulas.some(f=>f.label==='Salvezza · '+effect&&f.text.includes('soltanto '+attr+' contro Soglia '+threshold)&&f.text.includes('Grado '+die)));
 }
});

test('Presa retains its opposition and upkeep; Lacerazione never invents a graduated Save',()=>{
 const h=liveTechniqueFixture();h.context.pg.extraTech[0].eff=['Presa'];let r=h.resolve({});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,1);assert.equal(r.totals.maintenanceST,1);
 assert.ok(r.conditions.some(c=>/contesa di Forza/.test(c.text)&&/inizio di ogni tuo turno/.test(c.text)));
 assert.ok(r.formulas.every(f=>!f.label.startsWith('Salvezza · '))); // The Striker Signature is a separate conditional source.
 Object.assign(h.context.pg,{style:'Swordsman',armi:[{id:'sword',tipo:'Lama',grado:'d10',attr:'Forza'}]});
 Object.assign(h.context.pg.extraTech[0],{stile:'Swordsman',eff:['Lacerazione'],arma:'sword'});
 r=h.resolve({weaponId:'weapon:sword'});assert.equal(r.status,'ready',errorText(r));
 assert.ok(r.formulas.every(f=>!f.label.startsWith('Salvezza')));assert.ok(r.conditions.some(c=>/non concede Salvezza automatica/.test(c.text)));
});

test('Using an offensive Technique as Active Defense spends one Reaction, pays effects up front and gives counter-damage only on strict success',()=>{
 const h=liveTechniqueFixture();h.context.pg.talents.push('Combattente · Striker · Contraccolpo');
 h.context.pg.extraTech[0].eff=['Sfondamento'];const id=h.moves.sources().find(s=>s.name==='Contraccolpo').id,before=JSON.stringify(h.context.pg);
 const r=h.resolve({techniqueUse:'defense',passiveTalentIds:[id]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.normal,0);assert.equal(r.economy.reactions,1);assert.equal(r.totals.st,2);
 assert.ok(r.formulas.some(f=>f.label==='Difesa Attiva'&&/d20 Forza \+ d10 Tecnica/.test(f.text)));
 assert.ok(r.formulas.some(f=>f.label==='Contraccolpo'&&/supera strettamente/.test(f.text)&&/pareggio evita/.test(f.text)));
 assert.ok(r.formulas.every(f=>!f.label.startsWith('Salvezza')));
 assert.ok(r.conditions.some(c=>/prima del tiro nemico/.test(c.text)&&/pareggio non infligge/.test(c.text)));
 assert.equal(JSON.stringify(h.context.pg),before);
 assert.equal(h.resolve({passiveTalentIds:[id]}).status,'repair');
 assert.equal(h.resolve({techniqueUse:'defense',activeTalentId:h.talent('Raffica — Base')}).status,'repair');
});

test('Normal Parry uses the weapon and does not execute or charge the context Technique effects',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{style:'Swordsman',armi:[{id:'sword',tipo:'Lama',grado:'d8',attr:'Forza'}]});
 Object.assign(c.extraTech[0],{stile:'Swordsman',eff:['Lacerazione'],arma:'sword'});
 const r=h.resolve({techniqueUse:'parry',weaponId:'weapon:sword'});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,0);assert.equal(r.economy.normal,0);assert.equal(r.economy.reactions,1);
 assert.ok(r.formulas.some(f=>f.label==='Parata con arma'&&/d20 Forza \+ d8 arma/.test(f.text)));
 assert.ok(r.formulas.every(f=>!f.label.startsWith('Salvezza')&&!f.label.startsWith('Danno')));
 assert.ok(r.conditions.every(c=>!c.text.startsWith('Lacerazione:')));
 assert.equal(h.resolve({techniqueUse:'parry'}).status,'repair');
});

test('Riposta remains a separate basic attack after successful Technique Defense, including ties, and does not broaden to normal Parry',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{style:'Swordsman',armi:[{id:'sword',tipo:'Lama',grado:'d8',attr:'Forza'}]});
 c.talents=['Combattente · Swordsman · Contraccolpo','Combattente · Swordsman · Riposta'];Object.assign(c.extraTech[0],{stile:'Swordsman',eff:[],arma:'sword'});
 const id=h.moves.sources().find(s=>s.name==='Riposta').id;
 {
  const r=h.resolve({techniqueUse:'defense',weaponId:'weapon:sword',passiveTalentIds:[id]});
  assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,1);assert.equal(r.economy.reactions,1);
  assert.ok(r.formulas.some(f=>f.label==='Riposta · attacco separato'&&/anche in pareggio/.test(f.text)&&/attacco base separato/.test(f.text)));
 }
 assert.equal(h.resolve({techniqueUse:'parry',weaponId:'weapon:sword',passiveTalentIds:[id]}).status,'repair');
});

test('Area Ravvicinata uses the weapon reach, zero shape slots and half damage without granting distant placement',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{style:'Crusher',armi:[{id:'hammer',nome:'Martello',tipo:'Contundente',grado:'d10',attr:'Forza',portata:5}]});
 Object.assign(c.extraTech[0],{stile:'Crusher',forma:'Area',eff:['Area Ravvicinata'],arma:'hammer'});
 const r=h.resolve({weaponId:'weapon:hammer'});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,2);
 assert.ok(r.formulas.some(f=>f.label==='Danno · fonti'&&/\/ 2/.test(f.text)));
 assert.ok(r.conditions.some(c=>/Portata effettiva/.test(c.text)&&/Non riceve Gittata/.test(c.text)));
});

test('Canzone saves use the actual chosen instrument limited by Arte, with voice as d4, and instrument changes never mutate the character',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{role:'Musicista',style:'Musicista',roleSkillDie:'d8',talents:[],strumenti:[{smcId:'violin',nome:'Violino',die:'d12'}]});
 Object.assign(c.extraTech[0],{fonte:'Stile',stile:'Musicista',forma:'Canzone',die:'d8',eff:['Requiem Beffardo']});
 h.context.isMusicista=()=>true;h.context.roleObj=()=>({skill:'Arte'});
 for(const name of ['arteDie','instrEff'])vm.runInContext(html.match(new RegExp('^function '+name+'\\([^\\n]+','m'))[0],h.context);
 const before=JSON.stringify(c);let r=h.resolve({instrumentId:'instrument:violin'});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,1);
 assert.ok(r.formulas.some(f=>f.label==='Salvezza · Canzone'&&/Soglia 5/.test(f.text)&&/effettivo d8/.test(f.text)));
 r=h.resolve({instrumentId:'instrument:voice'});assert.equal(r.status,'ready',errorText(r));
 assert.ok(r.formulas.some(f=>f.label==='Salvezza · Canzone'&&/Soglia 3/.test(f.text)&&/effettivo d4/.test(f.text)));
 assert.ok(r.formulas.every(f=>f.label!=='Per colpire'));
 assert.equal(h.resolve({instrumentId:'instrument:removed'}).status,'repair');assert.equal(JSON.stringify(c),before);
});

test('Ricarica Rapida retains its zero ST cost but spends the same Bonus as Haki',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{style:'Sniper',armi:[{id:'gun',tipo:'A distanza',grado:'d8',attr:'Forza'}],talents:['Combattente · Sniper · Ricarica Rapida']});
 Object.assign(c.extraTech[0],{stile:'Sniper',arma:'gun'});
 const id=h.moves.sources().find(s=>s.name==='Ricarica Rapida').id,r=h.resolve({activeTalentId:id,weaponId:'weapon:gun'});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,0);assert.equal(r.economy.used,1);
 assert.ok(hasBonusError(h.resolve({activeTalentId:id,weaponId:'weapon:gun',hakiSelections:[h.h()]})));
});

test('A voluntary zero-ST talent is active and cannot hide its Bonus behind a passive slot or a first Haki activation',()=>{
 const h=liveTechniqueFixture();h.context.pg.talents.push('Combattente · Striker · Passo Fulmineo');
 const source=h.moves.sources().find(s=>s.name==='Passo Fulmineo'),r=h.resolve({activeTalentId:source.id});
 assert.equal(source.meta.mode,'active');assert.equal(h.moves.sourceCost(source).st,0);
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);
 assert.equal(h.resolve({passiveTalentIds:[source.id]}).status,'repair');
 assert.ok(hasBonusError(h.resolve({activeTalentId:source.id,hakiSelections:[h.h()]})));
});

test('An imported passive Fruit talent loses applicability on a Fruit downgrade without losing its saved ownership',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.frutto={has:true,tipo:'Paramecia',nome:'Potere di prova',die:'d20'};
 c.talents=['Frutto · Paramecia · Potere Versatile','Frutto · Paramecia · Dono Passivo','Frutto · Paramecia · Seconda Natura'];
 Object.assign(c.extraTech[0],{fonte:'Frutto',fruitType:'Paramecia',stile:'',eff:[]});
 const id=h.moves.sources().find(s=>s.name==='Seconda Natura').id;
 assert.equal(h.resolve({passiveTalentIds:[id]}).status,'ready');
 c.frutto.die='d8';c.extraTech[0].die='d8';const before=JSON.stringify(c),r=h.resolve({passiveTalentIds:[id]});
 assert.equal(r.status,'repair');assert.match(errorText(r),/Seconda Natura/);assert.equal(JSON.stringify(c),before);
 assert.ok(c.talents.includes('Frutto · Paramecia · Seconda Natura'));
});

test('Free-text historical Techniques cannot bypass Source, effects, slots or costs, and conversion keeps the recipe identity',()=>{
 for(const legacyId of ['t1','existing-signature-id']){
  const h=liveTechniqueFixture(),c=h.context.pg;
  c.t1={nome:'Tecnica storica',attr:'Forza',die:'d10',desc:'Danno moltiplicato e tutti gli Stati senza costo.',...(legacyId==='t1'?{}:{smcId:legacyId})};
  const sourceId='tech:'+legacyId,m=h.card({baseTechId:sourceId}),old=h.moves.sources().find(s=>s.id===sourceId);
  c.specialMoves=[m];c.specialMoveSourceCosts={[sourceId]:{st:0,pip:0,maintenanceST:0,maintenancePIP:0,resource:0,basis:h.moves.costBasis(old)}};
  const before=JSON.stringify(c),invalid=h.moves.resolve(m);
  assert.equal(invalid.status,'repair');assert.equal(invalid.totals,null);assert.match(errorText(invalid),/conversione nel Costruttore/);
  assert.equal(JSON.stringify(c),before);
  const recipeBefore=JSON.stringify(m);
  c.legacyTechArchive={t1:JSON.parse(JSON.stringify(c.t1))};
  c.extraTech.push({id:legacyId,nome:c.t1.nome,fonte:'Stile',stile:'Striker',forma:'Singolo',attr:'Forza',die:'d10',eff:['Sfondamento'],durata:'Un turno'});c.t1={nome:'',desc:'',attr:'',die:'d4'};
  const repaired=h.moves.resolve(m);
  assert.equal(repaired.status,'ready',errorText(repaired));assert.equal(repaired.totals.st,2);
  assert.equal(repaired.tech.id,sourceId);assert.equal(repaired.tech.techKind,'built');assert.equal(JSON.stringify(m),recipeBefore);
  assert.match(c.legacyTechArchive.t1.desc,/tutti gli Stati senza costo/);
 }
});

test('Assigning legacy references preserves the historical tech:t1 identity instead of generating a different source ID',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.t1={nome:'Tecnica senza ID',attr:'Forza',die:'d10',desc:'Descrizione originale.'};
 c.specialMoves=[h.card({baseTechId:'tech:t1'})];
 h.context.KEY='fixture-key';h.context.CT={activeId:'pirate',chars:{pirate:c}};
 let written=null;h.context.window.GLCStore={setItem:(key,value)=>{written=JSON.parse(value);}};
 h.moves.ensureReferences();
 assert.equal(written.chars.pirate.t1.smcId,'t1');assert.equal(h.context.pg.t1.smcId,'t1');
 assert.equal(h.context.pg.specialMoves[0].baseTechId,'tech:t1');assert.ok(h.moves.sources().some(s=>s.id==='tech:t1'));
});

test('All active Unique Traits are explicit passive reminders with complete rules, and attaching them never changes Technique formulas, costs or action economy',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg,T=h.context.window.GLCTratti;
 c.attr={Forza:'d20',Tecnica:'d20',Astuzia:'d20',Spirito:'d20'};
 c.skills=Object.fromEntries(T.data.skills.map(skill=>[skill,'d20']));
 const beforeUnlock=h.moves.sources();assert.equal(beforeUnlock.filter(s=>s.subtype==='uniqueTrait').length,0);
 const baseline=h.resolve({});c.uniqueTraits={acquired:T.data.traits.map(t=>t.id)};
 const active=T.active(c),sources=h.moves.sources().filter(s=>s.subtype==='uniqueTrait');
 assert.equal(sources.length,active.length);assert.equal(sources.length,30); // Fortezza replaces acquired Corpo.
 for(const trait of active){
  const source=sources.find(s=>s.id==='trait:'+trait.id);assert.ok(source,trait.name);
  assert.equal(source.kind,'talent');assert.equal(source.meta.mode,'passive');assert.equal(source.meta.action,'passive');
  assert.ok(source.desc.includes(trait.requirementsText.replaceAll(' · ', ', '))||source.desc.includes(trait.metadata));
  for(const effect of trait.effects)assert.ok(source.desc.includes(effect),trait.name);
  if(trait.limit)assert.ok(source.desc.includes(trait.limit),trait.name);
  assert.equal(h.moves.sourceCost(source).st,0);assert.equal(h.moves.requiresGM(source),false);
 }
 const before=JSON.stringify(c),r=h.resolve({passiveTalentIds:sources.map(s=>s.id)});
 assert.equal(r.status,'ready',errorText(r));assert.equal(JSON.stringify(r.formulas),JSON.stringify(baseline.formulas));
 assert.equal(JSON.stringify(r.totals),JSON.stringify(baseline.totals));
 assert.equal(r.economy.normal,baseline.economy.normal);assert.equal(r.economy.reactions,baseline.economy.reactions);assert.equal(r.economy.used,baseline.economy.used);
 assert.ok(r.conditions.some(c=>/promemoria condizionali/.test(c.text)&&/non si sommano una seconda volta/.test(c.text)));
 assert.equal(T.derivedDP(c),4);assert.equal(JSON.stringify(c),before);
});

test('A Unique Trait downgrade or Evolution invalidates a saved card without removing its source ID; restoring requirements reactivates the same reference',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg,T=h.context.window.GLCTratti;
 c.attr.Forza='d12';c.uniqueTraits={acquired:['corpo-mostruoso']};
 const m=h.card({passiveTalentIds:['trait:corpo-mostruoso']}),before=JSON.stringify(m);
 assert.equal(h.moves.resolve(m).status,'ready');assert.equal(T.derivedDP(c),2);
 c.attr.Forza='d10';let r=h.moves.resolve(m);
 assert.equal(r.status,'repair');assert.equal(r.totals,null);assert.match(errorText(r),/Corpo Mostruoso: inattivo.*Forza d12/);
 assert.equal(h.moves.sources().some(s=>s.id==='trait:corpo-mostruoso'),false);assert.equal(JSON.stringify(m),before);
 c.attr.Forza='d20';assert.equal(h.moves.resolve(m).status,'ready');
 c.uniqueTraits.acquired.push('fortezza-vivente');r=h.moves.resolve(m);
 assert.equal(r.status,'repair');assert.match(errorText(r),/Corpo Mostruoso: Sostituito da Fortezza Vivente/);assert.equal(T.derivedDP(c),4);
 assert.equal(JSON.stringify(m),before);assert.ok(c.uniqueTraits.acquired.includes('corpo-mostruoso'));
 const evolved=h.moves.resolve({...m,passiveTalentIds:['trait:fortezza-vivente']});
 assert.equal(evolved.status,'ready',errorText(evolved));assert.equal(evolved.rows.filter(s=>s.id.startsWith('trait:')).length,1);
 c.uniqueTraits.acquired=[];r=h.moves.resolve({...m,passiveTalentIds:['trait:fortezza-vivente']});
 assert.equal(r.status,'repair');assert.match(errorText(r),/Fortezza Vivente: non più acquisito/);
});

test('Print snapshots include Unique Trait identity, requirements and limits with no additional numeric benefits, and cached rule version is bumped',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.skills={Sopravvivenza:'d12'};c.uniqueTraits={acquired:['non-ancora']};
 const base=h.resolve({});c.specialMoves=[h.card({passiveTalentIds:['trait:non-ancora']})];
 h.context.window.addEventListener=()=>{};vm.runInContext(fs.readFileSync(path.join(root,'scheda-stampabile/special-moves-print.js'),'utf8'),h.context);
 const pack=h.context.window.GLCPrintMoves.snapshot(c,'trait-owner'),card=pack.cards[0],trait=card.sources.find(s=>s.id==='trait:non-ancora');
 assert.equal(pack.v,7);assert.equal(trait.subtype,'uniqueTrait');assert.equal(trait.mode,'passive');
 assert.match(trait.description,/Spirito d20, Sopravvivenza d12/);assert.match(trait.description,/1 volta per scontro/);assert.match(trait.description,/Salvezza di Forza o Spirito/);
 assert.equal(JSON.stringify(card.totals),JSON.stringify(base.totals));assert.equal(JSON.stringify(card.formulas),JSON.stringify(base.formulas));
 delete h.context.window.GLCTratti;const before=JSON.stringify(c),missing=h.moves.resolve(c.specialMoves[0]);
 assert.equal(missing.status,'repair');assert.match(errorText(missing),/Catalogo dei Tratti Unici non disponibile/);assert.equal(JSON.stringify(c),before);
});

test('A normal Parry and Riposta use the weapon Attribute while Technique Defense keeps the Technique Attribute',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.style='Swordsman';c.attr.Tecnica='d12';
 c.armi=[{id:'sword',nome:'Lama tecnica',tipo:'Lama',grado:'d8',attr:'Tecnica'}];
 c.talents=['Combattente · Swordsman · Contraccolpo','Combattente · Swordsman · Riposta'];
 Object.assign(c.extraTech[0],{stile:'Swordsman',attr:'Forza',arma:'sword'});
 const parry=h.resolve({techniqueUse:'parry',weaponId:'weapon:sword'});
 assert.equal(parry.status,'ready',errorText(parry));assert.ok(parry.formulas.some(f=>f.label==='Parata con arma'&&/d12 Tecnica \+ d8 arma/.test(f.text)));
 const id=h.moves.sources().find(s=>s.name==='Riposta').id,defense=h.resolve({techniqueUse:'defense',weaponId:'weapon:sword',passiveTalentIds:[id]});
 assert.equal(defense.status,'ready',errorText(defense));assert.ok(defense.formulas.some(f=>f.label==='Difesa Attiva'&&/d20 Forza \+ d10 Tecnica/.test(f.text)));
 assert.ok(defense.formulas.some(f=>f.label==='Riposta · attacco separato'&&/d12 Tecnica \+ d8 arma/.test(f.text)));
});

test('An authorized Fruit Technique is available to a non-Combattente Role and retains the Fruit effect profile and costs',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{role:'Capitano',style:'',roleSkillDie:'d12',talents:[],frutto:{has:true,tipo:'Paramecia',nome:'Potere narrativo',die:'d10',desc:'Il potere consente una spinta sbilanciante.'}});
 const t=c.extraTech[0];Object.assign(t,{fonte:'Frutto',stile:'',fruitType:'Paramecia',die:'d10',eff:['Sbilancio']});
 t.sourcePermission={key:h.context.window.GLCTechniques.sourceKey(c,t),basis:'Applicazione compatibile nella Scheda del Frutto.',effects:['Sbilancio']};
 const before=JSON.stringify(c),r=h.resolve({});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,1);
 assert.ok(r.formulas.some(f=>f.label==='Salvezza · Sbilancio'&&/Soglia 6/.test(f.text)));
 assert.equal(JSON.stringify(c),before);
});

test('Direct Striker Talents use the chosen Role Skill while Il Colpo Sfonda follows its triggering Technique',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{roleSkillChoice:'Acrobazia',roleSkillDie:'d12',skills:{Atletica:'d20'}});
 c.talents.push('Combattente · Striker · Presa di Ferro','Combattente · Striker · Proiezione');
 Object.assign(c.extraTech[0],{die:'d20',eff:['Presa']});
 const id=h.moves.sources().find(s=>s.name==='Proiezione').id,before=JSON.stringify(c),r=h.resolve({activeTalentId:id});
 assert.equal(r.status,'ready',errorText(r));
 assert.ok(r.formulas.every(f=>!f.label.startsWith('Salvezza · ')));
 const direct=r.directSaves.find(p=>p.id===id);
 assert.equal(direct.source,'Acrobazia');assert.equal(direct.die,'d12');assert.equal(direct.threshold,7);assert.equal(direct.attribute,'Tecnica');
 assert.match(direct.when,/già Trattenuta/);assert.match(direct.when,/secondo nemico/);
 assert.equal(r.directSaves.filter(p=>p.name.startsWith('Firma')).length,2);
 assert.ok(r.directSaves.filter(p=>p.name.startsWith('Firma')).every(p=>p.source==='Grado della Tecnica'&&p.threshold===11&&/margine \+4/.test(p.when)&&/una volta per turno/.test(p.when)));
 assert.ok(r.formulas.filter(f=>f.label.startsWith('Salvezza condizionale')).every(f=>/Quando /.test(f.text)&&/non applica automaticamente/.test(f.text)&&/pari o superiore/.test(f.text)));
 assert.equal(JSON.stringify(c),before);
 c.extraTech[0].eff=['Sbilancio'];
 const stateOnly=h.resolve({});assert.equal(stateOnly.status,'ready',errorText(stateOnly));
 assert.ok(stateOnly.formulas.some(f=>f.label==='Salvezza · Sbilancio'&&/Soglia 11/.test(f.text)));
 assert.ok(stateOnly.directSaves.every(p=>p.threshold===11));
});

test('Colpo Pesante and medical Talent saves use Atletica or Medicina rather than a higher Technique or Attribute',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.style='Crusher';c.roleSkillDie='d12';c.armi=[{id:'club',tipo:'Contundente',grado:'d8',attr:'Forza'}];
 c.talents=['Colpo Pesante — Base','Colpo Pesante — Migliorato','Colpo Pesante — Maestria'].map(n=>'Combattente · Crusher · '+n);
 Object.assign(c.extraTech[0],{stile:'Crusher',die:'d20',eff:['Sbilancio'],arma:'club'});
 const heavy=h.moves.sources().find(s=>s.id==='glc-talent-023'),r=h.resolve({weaponId:'weapon:club',activeTalentId:heavy.id});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.directSaves[0].source,'Atletica');assert.equal(r.directSaves[0].threshold,7);
 assert.match(r.directSaves[0].when,/colpo riuscito/);assert.ok(r.formulas.some(f=>f.label==='Salvezza · Sbilancio'&&/Soglia 11/.test(f.text)));
 for(const [branch,prerequisite,name,id,slot] of [['Infermeria','Diagnosi','Punti di Pressione','glc-talent-080','activeTalentId'],['Tossicologo','Lama Intinta','Colpo di Grazia','glc-talent-095','passiveTalentIds']]){
  const x=liveTechniqueFixture(),p=x.context.pg;
  Object.assign(p,{role2:'Dottore',style2:branch,roleSkillDie:'d20',skills:{Medicina:'d12'}});
  p.talents.push('Dottore · '+branch+' · '+prerequisite,'Dottore · '+branch+' · '+name);
  Object.assign(p.extraTech[0],{die:'d20',eff:['Sbilancio']});
  const before=JSON.stringify(p),res=x.resolve({[slot]:slot==='passiveTalentIds'?[id]:id}),save=res.directSaves.find(s=>s.id===id);
  assert.equal(res.status,'ready',errorText(res));assert.equal(save.source,'Medicina');assert.equal(save.die,'d12');assert.equal(save.threshold,7);
  assert.match(save.when,id==='glc-talent-080'?/creatura vivente.*una volta per scontro/:/già Avvelenat[ao].*sotto metà PV/);
  if(id==='glc-talent-095')assert.ok(x.resolve({techniqueUse:'defense',passiveTalentIds:[id]}).directSaves.every(p=>p.id!==id));
  assert.equal(JSON.stringify(p),before);
 }
});

test('Smash Hit uses the chosen Striker Role Skill for its four rolls, single damage roll and Save, excluding normal combos',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{roleSkillChoice:'Acrobazia',roleSkillDie:'d20',skills:{Atletica:'d6'}});
 c.talents.push('Combattente · Striker · Smash Hit');
 const s=h.moves.sources().find(s=>s.id==='glc-talent-014'),before=JSON.stringify(c),profile=h.moves.directTalentSaves(s)[0];
 assert.equal(profile.source,'Acrobazia');assert.equal(profile.die,'d20');assert.equal(profile.threshold,11);assert.equal(profile.attribute,'Forza');assert.equal(profile.state,'Stordito');
 assert.match(profile.when,/almeno tre colpi riusciti/);
 assert.equal(s.resolution.skill,'Acrobazia');assert.equal(s.resolution.rolls,4);assert.equal(s.resolution.advantage,true);assert.equal(s.resolution.singleCombination,true);
 assert.equal(s.resolution.costST,5);assert.equal(s.resolution.frequency,'scontro');assert.equal(s.resolution.requiresGM,true);
 assert.deepEqual(Array.from(s.resolution.damage,d=>d.dice),[0,1,2,4,6]);
 assert.ok(s.resolution.damage.every(d=>d.pool==='d20'&&(d.hits<3?!d.state:d.state==='Stordito')));
 assert.match(s.resolution.attackFormula,/d20.*Acrobazia/);assert.equal(s.resolution.excluded.length,4);
 const r=h.resolve({activeTalentId:s.id});assert.equal(r.status,'repair');assert.equal(r.totals,null);assert.ok(r.directSaves.every(p=>p.id!==s.id));
 assert.equal(JSON.stringify(c),before);
});

test('Zoan Stazza and Signature saves use the Fruit die and remain conditional without applying extra damage',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{role:'Capitano',style:'',roleSkillDie:'d20',talents:['Frutto · Zoan · Stazza'],frutto:{has:true,tipo:'Zoan',die:'d8',nome:'Creatura'}});
 Object.assign(c.extraTech[0],{fonte:'Frutto',stile:'',fruitType:'Zoan',die:'d8',eff:[]});
 const before=JSON.stringify(c),baseline=h.resolve({}),r=h.resolve({passiveTalentIds:['glc-talent-258']});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.directSaves.length,2);
 assert.ok(r.directSaves.every(p=>p.source==='Dado del Frutto'&&p.die==='d8'&&p.threshold===5));
 const stazza=r.directSaves.find(p=>p.id==='glc-talent-258'),firma=r.directSaves.find(p=>p.name==='Firma · Zoan');
 assert.equal(stazza.attribute,'Tecnica');assert.match(stazza.when,/Stazza inferiore.*Forma Bestiale/);
 assert.equal(firma.attribute,'Forza');assert.match(firma.when,/margine \+4.*Forma Ibrida.*al posto del Dado Danno/);
 assert.deepEqual(r.totals,baseline.totals);assert.equal(r.economy.normal,baseline.economy.normal);assert.equal(r.economy.used,baseline.economy.used);
 assert.equal(r.formulas.find(f=>f.label==='Danno · fonti').text,baseline.formulas.find(f=>f.label==='Danno · fonti').text);
 assert.equal(JSON.stringify(c),before);
});

test('Explicit racial Save annotations use the racial grade and print the original conditional source without character writes',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.race='mink';c.racialDie='d10';h.context.race=()=>({id:'mink',tech:'Electro + Sulong',techDesc:'Electro e Sulong seguono le proprie regole.'});
 c.specialMoves=[h.card({baseTechId:'racial:mink'})];
 const before=JSON.stringify(c),r=h.moves.resolve(c.specialMoves[0]);
 assert.equal(r.directSaves.length,1);assert.equal(r.directSaves[0].name,'Electro');assert.equal(r.directSaves[0].threshold,6);assert.equal(r.directSaves[0].attribute,'Forza');
 assert.ok(r.directSaves.every(p=>!p.name.includes('Sulong')));
 h.context.window.addEventListener=()=>{};
 vm.runInContext(fs.readFileSync(path.join(root,'scheda-stampabile/special-moves-print.js'),'utf8'),h.context);
 const pack=h.context.window.GLCPrintMoves.snapshot(c,'qa');
 assert.equal(pack.v,7);assert.equal(pack.cards[0].directSaves[0].threshold,6);
 assert.ok(pack.cards[0].formulas.some(f=>f.label==='Salvezza condizionale · Electro · Paralizzato'&&/non applica automaticamente/.test(f.text)));
 assert.equal(JSON.stringify(c),before);
 for(const [race,name] of [['longbraccio','Portata Estesa'],['lungagamba','Calcio Colossale']]){
  c.race=race;h.context.race=()=>({id:race,tech:name,historical:true});c.racialDie='d8';
  const recipe=h.card({baseTechId:'racial:'+race}),saved=JSON.stringify(c),result=h.moves.resolve(recipe);
  assert.equal(result.status,'repair');assert.equal(result.totals,null);assert.equal(result.directSaves.length,0);
  assert.match(errorText(result),/Razza storica rimossa/);assert.equal(result.move.baseTechId,recipe.baseTechId);assert.equal(JSON.stringify(c),saved);
 }
});

test('Opposed grips, bleeding and prepared doses do not inherit a graduated Talent Save',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 const definitions=Object.values(h.context.rules.TALENTS).flatMap(role=>Object.values(role.styles).flatMap(style=>style.talenti));
 for(const name of ['Presa di Ferro','Taglio Netto','Lama Intinta','Dardo Soporifero','Nube Tossica','Marea Nera','Reazioni Violente — Maestria','Trappola Meccanica']){
  const definition=definitions.find(t=>t.n===name);assert.ok(definition,name+' is a live rule');
  assert.equal(h.moves.directTalentSaves({id:definition.smcId,kind:'talent',name,raw:definition}).length,0,name+' retains its own procedure');
 }
 const before=JSON.stringify(c);h.state(2);
 const r=h.resolve({hakiSelections:[h.h(2,{effects:['act:3']})]});
 assert.ok(r.directSaves.every(p=>!p.name.includes('Re')));assert.ok(r.formulas.filter(f=>f.label.startsWith('Salvezza condizionale')).every(f=>f.id==='tech:punch'));
 const afterState=JSON.stringify(c);h.resolve({hakiSelections:[h.h(2,{effects:['act:3']})]});assert.equal(JSON.stringify(c),afterState);assert.notEqual(afterState,before);
});

test('Il Colpo Sfonda keeps distinct Technique and basic-attack thresholds in an ordinary Raffica with one shared activation',()=>{
 for(const secondary of [false,true]){
  const h=liveTechniqueFixture(),c=h.context.pg;
  Object.assign(c,{roleSkillChoice:'Acrobazia',roleSkillDie:'d20',skills:{Atletica:'d20+d20'}});
  if(secondary)Object.assign(c,{role:'Capitano',style:'',role2:'Combattente',style2:'Striker',roleSkillChoice2:'Acrobazia',roleSkillDie:'d20+d20',skills:{Acrobazia:'d20',Atletica:'d20+d20'}});
  Object.assign(c.extraTech[0],{die:'d8',eff:[]});
  const before=JSON.stringify(c),r=h.resolve({activeTalentId:'glc-talent-001'});
  assert.equal(r.status,'ready',errorText(r));assert.equal(r.directSaves.length,4);
  const initial=r.directSaves.filter(s=>s.id==='tech:punch'),basic=r.directSaves.filter(s=>s.id==='glc-talent-001');
  assert.ok(initial.every(s=>s.source==='Grado della Tecnica'&&s.die==='d8'&&s.threshold===5));
  assert.ok(basic.every(s=>s.source==='Acrobazia'&&s.die==='d20'&&s.threshold===11));
  assert.ok(r.directSaves.every(s=>/al massimo una volta per turno fra tutti i colpi/.test(s.when)));
  assert.equal(r.totals.st,1);assert.equal(r.economy.normal,1);assert.equal(r.economy.used,1);assert.equal(JSON.stringify(c),before);
  c.extraTech[0].die='d10';assert.ok(h.resolve({activeTalentId:'glc-talent-001'}).directSaves.filter(s=>s.id==='tech:punch').every(s=>s.threshold===6));
 }
});

function postAuditPrestigeFixture(){
 const h=liveTechniqueFixture(),c=h.context.pg,p=h.context.GLCPrestige;
 Object.assign(c,{roleSkillChoice:'Acrobazia',roleSkillDie:'d20+d12',attr:{Forza:'d20+d12',Tecnica:'d20+d12',Spirito:'d20+d12'},skills:{Atletica:'d20+d20'},stCur:200});
 c.talents=h.context.rules.TALENTS.Combattente.styles.Striker.talenti.map(t=>'Combattente · Striker · '+t.n);
 c.haki[0].die='d20+d12';
 const take=id=>p.choose(c,'striker-acrobazia',id,true);
 return {...h,c,p,take};
}

test('A mixed Prestige Raffica and Punto di Rottura retain Sfonda for their basic extras without propagating the Technique effect',()=>{
 const h=postAuditPrestigeFixture(),{c}=h;h.take('raffica-senza-fine');h.take('precisione-assoluta');
 Object.assign(c.extraTech[0],{attr:'Tecnica',eff:['Punto di Rottura']});
 const id='prestige:raffica-senza-fine',r=h.resolve({activeTalentId:id,talentUses:{[id]:3},talentTechniqueUses:{[id]:2}});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.directSaves.length,2);
 assert.ok(r.directSaves.every(s=>s.id===id&&s.source==='Acrobazia'&&s.die==='d20+d12'&&s.threshold===17));
 assert.ok(r.directSaves.every(s=>/attacco base a mani nude/.test(s.when)&&/fra tutti i colpi/.test(s.when)));
 assert.ok(r.conditions.some(s=>/1 attacchi base a mani nude extra e 2 usi extra/.test(s.text)));
 assert.equal(h.resolve({activeTalentId:id,talentUses:{[id]:2},talentTechniqueUses:{[id]:2}}).directSaves.length,0);
 c.extraTech[0].eff=[];
 const normal=h.resolve({activeTalentId:id,talentUses:{[id]:3},talentTechniqueUses:{[id]:2}});
 assert.equal(normal.directSaves.length,4);assert.ok(normal.directSaves.filter(s=>s.id==='tech:punch').every(s=>s.threshold===6));
});

test('Smash Hit follows an actual secondary Striker and complete Skill pool, never a stronger unrelated Skill',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 Object.assign(c,{role:'Capitano',style:'',roleSkillDie:'d20+d20',role2:'Combattente',style2:'Striker',roleSkillChoice2:'Atletica',skills:{Atletica:'d20+d4',Acrobazia:'d20+d20'}});
 c.talents.push('Combattente · Striker · Smash Hit');
 const before=JSON.stringify(c),s=h.moves.sources().find(s=>s.id==='glc-talent-014'),r=h.moves.smashHitProfile(s);
 assert.equal(r.skill,'Atletica');assert.equal(r.die,'d20+d4');assert.equal(r.save.threshold,13);
 assert.ok(r.damage.every(d=>d.pool==='d20+d4'));assert.equal(JSON.stringify(c),before);
 c.roleSkillChoice2='Acrobazia';const alternate=h.moves.sources().find(s=>s.id==='glc-talent-014').resolution;
 assert.equal(alternate.skill,'Acrobazia');assert.equal(alternate.die,'d20+d20');assert.equal(alternate.save.threshold,21);
});

test('Ryou doubles the complete attack once, preserving costs, conditions and normal defenses without a numeric internal component',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;h.state();
 Object.assign(c,{style:'Crusher',roleSkillDie:'d20',role2:'Dottore',style2:'Tossicologo',skills:{Medicina:'d12'},armi:[{id:'maul',nome:'Maglio',tipo:'Contundente',attr:'Forza',grado:'d8'}],talents:['Colpo Pesante — Base','Colpo Pesante — Migliorato','Colpo Pesante — Maestria'].map(n=>'Combattente · Crusher · '+n)});
 c.talents.push('Dottore · Tossicologo · Lama Intinta','Dottore · Tossicologo · Colpo di Grazia');
 Object.assign(c.extraTech[0],{stile:'Crusher',arma:'maul',die:'d20',eff:[]});
 // Colpo Pesante is prepared separately: its active Bonus cannot coincide with fresh Ryou.
 const id='glc-talent-023',r=h.resolve({weaponId:'weapon:maul',passiveTalentIds:['glc-talent-095'],hakiSelections:[h.h(0,{effects:['act:d20']})]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,0);assert.equal(r.totals.pip,3);assert.equal(r.economy.used,1);
 const damage=r.formulas.find(f=>f.label==='Danno · fonti').text;
 assert.match(damage,/^2 × \(d20 Tecnica \+ d20 Armamento \+ bonus condizionali/);assert.match(damage,/una sola volta, solo se è l’attacco fisico compatibile scelto/);
 assert.ok(r.formulas.some(f=>f.label==='Colpo di Grazia · Avvelenato'&&/solo contro/.test(f.text)));
 const rule=r.formulas.find(f=>f.label==='Ryou · Armamento').text;
 assert.match(rule,/Difesa Passiva, Difesa Attiva e Riduzione del Danno/);assert.match(rule,/narrativo, senza una componente numerica separata/);
 assert.ok(hasBonusError(h.resolve({weaponId:'weapon:maul',activeTalentId:id,hakiSelections:[h.h(0,{effects:['act:d20']})]})));
 c.attr.Spirito='d20+d12';c.haki[0].die='d20+d12';const effect='act:prestige-ryou-persistente';h.state(0,{effects:{[effect]:1}});
 const heavy=h.resolve({weaponId:'weapon:maul',activeTalentId:id,hakiSelections:[h.h(0,{activation:'prepared',effects:[effect],preparedEffects:[effect]})]});
 assert.equal(heavy.status,'ready',errorText(heavy));assert.equal(heavy.totals.st,2);assert.equal(heavy.totals.pip,0);
 assert.match(heavy.formulas.find(f=>f.label==='Danno · fonti').text,/^2 × \(d20 Tecnica \+ d20\+d12 Armamento \+ 2 × d20 Colpo Pesante/);
});

test('Prepared Ryou Persistente doubles one selected Raffica attack and keeps the shared Bonus, duration, costs and miss limit',()=>{
 const h=postAuditPrestigeFixture(),{c}=h;c.roleSkillChoice='Atletica';['raffica-senza-fine','potenza-del-titano'].forEach(id=>h.p.choose(c,'striker-atletica',id,true));
 const effect='act:prestige-ryou-persistente';h.state(0,{pipRemaining:0,effects:{[effect]:1}});
 const before=JSON.stringify(c),r=h.resolve({activeTalentId:'prestige:raffica-senza-fine',passiveTalentIds:['prestige:potenza-del-titano'],talentUses:{'prestige:raffica-senza-fine':3},talentTechniqueUses:{'prestige:raffica-senza-fine':1},hakiSelections:[h.h(0,{activation:'prepared',effects:[effect],preparedEffects:[effect]})]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,6);assert.equal(r.totals.pip,0);assert.equal(r.economy.used,1);assert.equal(r.economy.normal,1);
 assert.ok(r.formulas.some(f=>f.label==='Danno · fonti'&&/^2 × \(d10 Tecnica \+ d20\+d12 Armamento/.test(f.text)));
 assert.match(r.formulas.find(f=>f.label==='Danno · fonti').text,/Potenza del Titano\)/);
 const limit=r.formulas.find(f=>f.label==='Ryou Persistente · limite del turno').text;
 assert.match(limit,/Un solo attacco fisico compatibile per tuo turno/);assert.match(limit,/prima del tiro.*mancato consuma/);assert.match(limit,/non potenzia automaticamente tutti i colpi della Raffica/);assert.match(limit,/Termina se Armamento viene interrotto/);
 assert.equal(JSON.stringify(c),before);
 c.specialMoveSession.haki[h.colors[0]].effects[effect]=0;assert.equal(h.resolve(r.move).status,'unavailable');
});

test('Esplosione Haki Superiore retains its own secondary-target damage and never copies Projection, collision or the main target damage',()=>{
 const h=postAuditPrestigeFixture(),effect='act:prestige-ryou-persistente';h.state(0,{pipRemaining:5,effects:{[effect]:1}});
 Object.assign(h.c.extraTech[0],{eff:['Proiezione','Schianto']});
 const r=h.resolve({hakiSelections:[h.h(0,{activation:'prepared',effects:[effect,'act:prestige-esplosione-haki-superiore'],preparedEffects:[effect]})]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);
 const rule=r.formulas.find(f=>f.label==='Esplosione Haki Superiore · bersagli secondari').text;
 assert.match(rule,/⌊D pertinente \/ 2⌋/);assert.match(rule,/Ryou determina il danno totale.*×2/);assert.match(rule,/Nessuna seconda copia sul bersaglio principale/);assert.match(rule,/Proiezione, Schianto.*non si propagano automaticamente/);
 assert.ok(r.formulas.some(f=>f.label==='Schianto · collisione'));
});

test('Ryou base and Persistent use the same conditional physical-attack rule for Fruit sources without declaring every Fruit attack physical',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg;
 c.attr.Spirito='d20+d12';c.haki[0].die='d20+d12';c.frutto={has:true,tipo:'Paramecia',nome:'Manifestazione',die:'d10'};
 const t=c.extraTech[0];Object.assign(t,{fonte:'Frutto',fruitType:'Paramecia',stile:'',eff:[]});
 t.sourcePermission={key:h.context.GLCTechniques.sourceKey(c,t),basis:'Applicazione concordata del potere, senza classificazione fisica automatica.',effects:[]};
 h.state();
 for(const effect of ['act:d20','act:prestige-ryou-persistente']){
  const before=JSON.stringify(c),r=h.resolve({hakiSelections:[h.h(0,{effects:[effect]})]});
  assert.equal(r.status,'ready',errorText(r));
  const damage=r.formulas.find(f=>f.label==='Danno · fonti').text;
  assert.match(damage,/solo se è l’attacco fisico compatibile scelto/);
  assert.ok(r.conditions.some(s=>/verifica con il GM.*attacco fisico compatibile/.test(s.text)&&/senza la condizione.*senza ×2/.test(s.text)));
  assert.match(r.formulas.find(f=>f.label==='Ryou · Armamento').text,/Non potenzia emissioni elementali o attacchi non fisici/);
  assert.equal(JSON.stringify(c),before);assert.equal(t.physical,undefined);
 }
});

test('Riformarsi Altrove unlocks at Logia d10 and uses a separate flexible Reaction without changing Technique timing or applying avoidance',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg,id='glc-talent-245';
 c.frutto={has:true,tipo:'Logia',nome:'Elemento',die:'d8'};c.talents.push('Frutto · Logia · Riformarsi Altrove');
 assert.equal(h.moves.sources().find(s=>s.id===id).unlocked,false);assert.equal(h.resolve({passiveTalentIds:[id]}).status,'repair');
 c.frutto.die='d10';assert.equal(h.moves.sources().find(s=>s.id===id).unlocked,true);
 const before=JSON.stringify(c),r=h.resolve({passiveTalentIds:[id]});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.normal,1);assert.equal(r.economy.reactions,1);assert.equal(r.economy.used,0);assert.equal(r.rows.find(s=>s.id===id).st,0);
 const rule=r.formulas.find(f=>f.label==='Riformarsi Altrove · Reazione').text;
 assert.match(rule,/Sequenza distinta/);assert.match(rule,/evento immediato e percepibile valutato dal GM/);assert.match(rule,/15 m.*visibile e raggiungibile/);assert.match(rule,/Non autorizza questa Tecnica fuori dal tuo turno e non annulla automaticamente un attacco/);
 assert.equal(JSON.stringify(c),before);
 Object.assign(c.extraTech[0],{forma:'Spostamento',eff:['Scatto']});const move=h.resolve({passiveTalentIds:[id]});
 assert.equal(move.status,'ready',errorText(move));assert.equal(move.economy.normal,1);assert.equal(move.economy.reactions,1);assert.equal(move.economy.used,0);
});

test('Forma di Combattimento is the official custom GM state with a Bonus and registered maintenance, without granting Technique effects',()=>{
 const h=liveTechniqueFixture(),c=h.context.pg,id='glc-talent-233';
 c.frutto={has:true,tipo:'Paramecia',nome:'Potere',die:'d12'};c.talents.push('Frutto · Paramecia · Forma di Combattimento');
 const s=h.moves.sources().find(s=>s.id===id),baseline=h.resolve({});
 assert.match(s.desc,/Linea guida ufficiale del Capitolo 5/);assert.match(s.desc,/stato mantenuto.*non una Tecnica/);assert.doesNotMatch(s.desc,/incomplet|futura tabella|CHIARIMENTO NECESSARIO/);
 assert.equal(h.resolve({activeTalentId:id}).status,'costs');
 c.specialMoveSourceCosts={[id]:{st:0,pip:0,maintenanceST:2,maintenancePIP:0,resource:0,basis:h.moves.costBasis(s)}};
 const before=JSON.stringify(c),r=h.resolve({activeTalentId:id});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.normal,1);assert.equal(r.economy.used,1);assert.equal(r.totals.maintenanceST,2);
 assert.equal(r.formulas.find(f=>f.label==='Danno · fonti').text,baseline.formulas.find(f=>f.label==='Danno · fonti').text);assert.equal(JSON.stringify(c),before);
 const guard=h.context.rules.TALENTS.Combattente.styles.Striker.talenti.find(t=>t.smcId==='glc-talent-004');
 assert.match(guard.d,/danno viene comunque subito normalmente/);assert.match(guard.d,/non annulla l’attacco e non riduce automaticamente i PV/);
});
