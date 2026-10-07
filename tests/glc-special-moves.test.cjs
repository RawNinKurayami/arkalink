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
   assert.equal(r.totals.st,1+cost);assert.equal(r.economy.used,1);
   assert.ok(r.conditions.some(c=>/extra sono sempre attacchi base/.test(c.text)&&/mancato consuma ST ma non interrompe/.test(c.text)));
  }
  h.context.pg.extraTech[0].eff=['Scatto','Balzo'];
  const r=h.resolve({activeTalentId:id,talentUses:{[id]:tier+1}});
  assert.equal(r.totals.st,2+[1,3,6][tier]);
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
 assert.equal(r.totals.st,2);assert.equal(r.totals.maintenanceST,1);
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
test('Corazza prepared on a previous turn keeps its defense bonus alongside a passive talent without new PIP',()=>{
 const h=setup();h.state(0,{effects:{'act:d12':1}});
 const r=h.resolve({baseTechId:'tech:guard',activeTalentId:h.talent('Guardia del Combattente'),hakiSelections:[h.h(0,{use:'defense',activation:'prepared',effects:['act:d12'],preparedEffects:['act:d12']})]});
 assert.equal(r.errors.length,0,errorText(r));assert.equal(r.economy.used,0);assert.equal(r.totals.pip,0);
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
 assert.equal(pack.v,3);assert.equal(pack.cards[0].totals.pip,0);
 assert.ok(pack.cards[0].conditions.some(c=>/Economia del turno/.test(c.text)));
 assert.ok(pack.cards[0].conditions.some(c=>/turno precedente/.test(c.text)));
 h.context.pg.specialMoves[0].hakiSelections[0].effects=['act:d20'];
 const invalid=h.context.window.GLCPrintMoves.snapshot(h.context.pg,'qa').cards[0];
 assert.equal(invalid.totals,null);assert.ok(invalid.warnings.some(w=>/Una sola Azione Bonus/.test(w)));
});
