const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup,errorText,hasBonusError}=require('./helpers/glc-fixture.cjs');
function fixture(path='striker-atletica',die='d20+d12'){
 const h=setup(),p=h.context.window.GLCPrestige,c=h.context.pg,x=p.data.paths.find(x=>x.id===path);
 Object.assign(c,{role:x.role,style:x.style,roleSkillChoice:x.skill,roleSkillDie:die,attr:{Forza:die,Tecnica:die,Spirito:die,Astuzia:die},skills:{},stCur:200});
 c.talents=h.context.rules.TALENTS[x.role].styles[x.style].talenti.map(t=>x.role+' · '+x.style+' · '+t.n);
 Object.assign(c.extraTech[0],{stile:x.style,attr:x.style==='Sniper'?'Astuzia':'Forza'});
 c.haki.forEach(h=>{if(h.name!=='Haki del Re')h.die=die;});
 h.context.weaponStyleReq=()=>x.style;h.context.roleSkillDieOf=()=>c.roleSkillDie;
 const take=id=>{const s=p.states(c,path).find(t=>t.id===id);assert.ok(s?.available,s?.reason||id);p.choose(c,path,id,true);};
 return {...h,p,c,path,take};
}
test('All 15 active catalogues resolve their real skills and all 46 active role talents have valid ordinary prerequisites',()=>{
 const base=setup(),P=base.context.window.GLCPrestige;
 // Inventore remains historical manual metadata, while its retired Role path
 // cannot become a playable path merely because its Meccanica reaches d20.
 assert.equal(P.data.talents.filter(t=>!t.paths.includes('spirito')).length,49);
 const active=P.data.paths.filter(path=>path.style!=='Inventore');
 assert.equal(active.length,15);
 assert.equal(new Set(active.flatMap(path=>path.talents)).size,46);
 for(const path of active){const h=fixture(path.id,'d20+d4');assert.equal(h.p.paths(h.c)[0].skill,path.skill);for(const id of path.talents){const state=h.p.states(h.c,path.id).find(t=>t.id===id);assert.equal(state.available,true,path.id+' '+id+': '+state.reason);h.take(id);assert.equal(h.p.has(h.c,id),true);h.p.choose(h.c,path.id,id,false);}}
});
test('Retired Inventore Role choices remain historical and cannot provide an active Role or consume new Prestige choices',()=>{
 const h=fixture('inventore','d20+d20'),historical=h.p.data.paths.find(path=>path.id==='inventore');
 h.c.prestige={choices:{inventore:historical.talents.slice(0,2)}};
 const stored=JSON.stringify(h.c.prestige);
 assert.equal(h.p.paths(h.c).length,0);
 assert.equal(h.p.states(h.c,'inventore').length,0);
 assert.ok(h.p.acquired(h.c).every(t=>!historical.talents.includes(t.id)));
 assert.throws(()=>h.p.choose(h.c,'inventore',historical.talents[2],true),/non disponibile/);
 h.p.normalize(h.c);
 assert.equal(JSON.stringify(h.c.prestige),stored);
});
test('Role choices open only at I, III and V; Saikyo never adds a fourth',()=>{
 const h=fixture('swordsman','d20');for(const [die,count]of [['d20',0],['d20+d4',1],['d20+d6',1],['d20+d8',2],['d20+d10',2],['d20+d12',3],['d20+d20',3]]){h.c.roleSkillDie=die;assert.equal(h.p.slots(die),count);}
 h.c.roleSkillDie='d20+d20';['fendente-sovrano','taglio-colossale','guardia-invalicabile'].forEach(h.take);assert.throws(()=>h.take('maestria-assoluta-della-lama'),/Scelte esaurite/);
});
test('Attribute, role skill, secondary skill and Haki progression stay independent',()=>{
 const h=fixture('striker-atletica','d20');h.c.attr.Forza='d20+d20';assert.equal(h.p.slots(h.p.paths(h.c)[0].die),0);assert.equal(h.p.benefits(h.c,'Forza')[0].value,1000);
 h.c.roleSkillDie='d20+d4';h.c.role2='Navigatore';h.c.style2='Navigatore';h.c.skills.Navigazione='d20+d8';assert.equal(h.p.paths(h.c)[1].die,'d20+d8');assert.equal(h.p.slots(h.p.paths(h.c)[1].die),2);
 h.c.attr.Spirito='d20+d20';h.c.haki[0].die='d6';h.p.normalize(h.c);assert.equal(h.c.haki[0].die,'d6');
});
test('Double Striker and its two possible role skills cannot multiply talent choices',()=>{
 const h=fixture();h.c.role2='Combattente';h.c.style2='Striker';h.c.roleSkillChoice2='Acrobazia';h.c.skills.Acrobazia='d20+d20';assert.equal(h.p.paths(h.c).length,1);
 assert.equal(h.p.data.paths.find(p=>p.id==='striker-acrobazia').talents.length,2);
});
test('Stored choices survive a downgrade but cannot grant locked benefits; restoring prerequisites reactivates them',()=>{
 const h=fixture();h.take('potenza-del-titano');h.take('raffica-senza-fine');h.c.roleSkillDie='d20+d4';assert.equal(h.p.acquired(h.c).length,1);assert.equal(h.p.choices(h.c,h.path).length,2);
 h.c.roleSkillDie='d20+d12';assert.equal(h.p.acquired(h.c).length,2);
 h.c.talents=h.c.talents.filter(t=>!t.endsWith('Raffica — Base'));assert.equal(h.p.has(h.c,'raffica-senza-fine'),false);assert.match(h.p.states(h.c,h.path).find(t=>t.id==='raffica-senza-fine').reason,/catena/);
});
test('Ordinary and Prestige talent upgrades retain prerequisites while making old versions unavailable',()=>{
 const h=fixture();assert.equal(h.p.superseded(h.c,'Combattente · Striker · Raffica — Base'),'Raffica — Maestria');h.take('raffica-senza-fine');assert.equal(h.p.superseded(h.c,'Combattente · Striker · Raffica — Maestria'),'Raffica Senza Fine');
 const old=h.moves.sources().find(t=>t.name==='Raffica — Base');assert.equal(old.unlocked,false);assert.match(errorText(h.resolve({activeTalentId:old.id})),/evoluto in/);assert.ok(h.c.talents.includes('Combattente · Striker · Raffica — Base'));
 h.p.choose(h.c,h.path,'raffica-senza-fine',false);assert.equal(h.moves.sources().find(t=>t.name==='Raffica — Maestria').unlocked,true);
});
test('Haki is capped by full Spirito die on import and downgrade, preserving historical dice and other data',()=>{
 const h=fixture();h.c.attr.Spirito='d10';h.c.haki[0].die='d20+d20';h.c.haki[1].die='d12';h.c.haki[2].prestigeGM=3;h.c.haki[2].pip=3;h.c.photo='portrait';const oldtal=[...h.c.talents];
 h.p.normalize(h.c);assert.equal(h.c.haki[0].die,'d10');assert.equal(h.c.haki[1].die,'d10');assert.equal(h.c.haki[0].pip,3);assert.ok(h.c.haki[0].prestigePreviousDice.includes('d20+d20'));assert.equal(h.p.hakiLevel(h.c,h.c.haki[2]),3);assert.equal(h.c.photo,'portrait');assert.deepEqual(Array.from(h.c.talents),oldtal);
 h.c.attr.Spirito='d20+d8';h.c.haki[0].die='d20+d10';h.p.normalize(h.c);assert.equal(h.c.haki[0].die,'d20+d8');assert.equal(h.c.haki[0].pip,5);
});
test('A stale Haki source cannot bypass the Spirito cap in formulas or resource reserves',()=>{
 const h=fixture();h.c.attr.Spirito='d8';h.c.haki[0].die='d20+d20';h.state();const r=h.resolve({hakiSelections:[h.h()]});assert.equal(r.totals.maintenanceST,1);assert.ok(r.formulas.some(f=>f.text.includes('d8 Armamento')));assert.equal(h.moves.hakiState(h.moves.sources().find(s=>s.id===h.colors[0])).max,2);
 const invalid=h.resolve({hakiSelections:[h.h(0,{effects:['act:prestige-ryou-persistente']})]});assert.match(errorText(invalid),/non più sbloccato/);
});
test('Attribute scales respect class compatibility and use all six stages',()=>{
 const h=fixture('striker-atletica');for(let i=0;i<6;i++){h.c.attr.Forza=h.p.data.dice[i+6];assert.equal(h.p.benefits(h.c,'Forza').find(b=>b.id==='destruction').value,[5,10,30,100,300,1000][i]);h.c.attr.Tecnica=h.p.data.dice[i+6];assert.equal(h.p.benefits(h.c,'Tecnica').find(b=>b.id==='movement').value,[10,15,20,30,100,1000][i]);}
 const medic=fixture('infermeria','d20+d20');assert.equal(medic.p.benefits(medic.c,'Forza').length,0);
 const sniper=fixture('sniper','d20+d20');assert.equal(sniper.p.benefits(sniper.c,'Astuzia').find(b=>b.id==='range').value,5000);
 const sword=fixture('swordsman','d20+d20');assert.equal(sword.p.benefits(sword.c,'Forza').length,0);sword.take('fendente-sovrano');assert.equal(sword.p.benefits(sword.c,'Forza')[0].value,1000);
});
test('Raffica Senza Fine supports mixed base attacks and techniques, exact ST, no three-attack limit, one Bonus',()=>{
 const h=fixture();h.take('raffica-senza-fine');h.take('potenza-del-titano');const id='prestige:raffica-senza-fine';
 const r=h.resolve({activeTalentId:id,passiveTalentIds:['prestige:potenza-del-titano'],talentUses:{[id]:4},talentTechniqueUses:{[id]:2}});assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,10);assert.equal(r.rows.find(row=>row.id===id).st,10);assert.equal(r.economy.used,1);assert.ok(r.formulas.some(f=>f.text.includes('d20+d12')&&f.text.includes('Potenza del Titano')));
 const bad=h.resolve({activeTalentId:id,talentUses:{[id]:3},talentTechniqueUses:{[id]:4}});assert.equal(bad.totals,null);
 h.c.stCur=5;assert.equal(h.resolve({activeTalentId:id,talentUses:{[id]:4}}).status,'unavailable');
});
test('Raffica Senza Fine charges increasing extra costs and every complete technique cost, including Saikyo',()=>{
 for(const die of ['d20+d12','d20+d20']){
  const h=fixture('striker-atletica',die);h.take('raffica-senza-fine');const id='prestige:raffica-senza-fine';
  let r=h.resolve({activeTalentId:id,talentUses:{[id]:4}});
  assert.equal(r.status,'ready',errorText(r));assert.equal(r.rows.find(row=>row.id===id).st,10);assert.equal(r.totals.st,10);assert.equal(r.economy.used,1);
  h.c.extraTech[0].eff=['Scatto','Sbilancio'];
  r=h.resolve({activeTalentId:id,talentUses:{[id]:2},talentTechniqueUses:{[id]:2}});
  assert.equal(r.status,'ready',errorText(r));assert.equal(r.rows.find(row=>row.id==='tech:punch').st,2);
  assert.equal(r.rows.find(row=>row.id===id).st,7);assert.equal(r.totals.st,9);assert.equal(r.economy.used,1);
  assert.ok(r.conditions.some(c=>/mancato consuma ST ma non interrompe/.test(c.text)));
 }
});
test('Raffica Senza Fine has no fixed extra cap and cannot add support, Area or another Style techniques',()=>{
 const h=fixture();h.take('raffica-senza-fine');const id='prestige:raffica-senza-fine';
 const r=h.resolve({activeTalentId:id,talentUses:{[id]:7}});assert.equal(r.status,'ready',errorText(r));assert.equal(r.rows.find(row=>row.id===id).st,28);
 for(const count of [0,-1,1.5,Number.MAX_SAFE_INTEGER])assert.equal(h.resolve({activeTalentId:id,talentUses:{[id]:count}}).totals,null);
 for(const [forma,stile]of [['Supporto','Striker'],['Area','Striker'],['Singolo','Swordsman']]){
  Object.assign(h.c.extraTech[0],{forma,stile});const invalid=h.resolve({activeTalentId:id,talentUses:{[id]:2},talentTechniqueUses:{[id]:1}});assert.equal(invalid.totals,null);
 }
});
test('Maglio pays 3 ST without spending the Bonus, adds two DD and full Forza, and retains parry restrictions',()=>{
 const h=fixture('crusher');h.take('maglio-inarrestabile');h.take('onda-sismica');
 h.c.armi=[{id:'maul',nome:'Maglio',tipo:'Contundente',grado:'d10',attr:'Forza'}];h.c.extraTech[0].arma='maul';
 const r=h.resolve({activeTalentId:'prestige:onda-sismica',passiveTalentIds:['prestige:maglio-inarrestabile'],weaponId:'weapon:maul'});assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.st,6);assert.ok(r.formulas.some(f=>f.text.includes('2 × d10 Maglio')&&f.text.includes('d20+d12')));assert.ok(r.formulas.some(f=>f.label.includes('Parata riuscita')));
});
test('Guardia Invalicabile uses full Atletica plus an effective d20 blade, without increasing the physical weapon grade',()=>{
 const h=fixture('swordsman');h.take('guardia-invalicabile');h.take('maestria-assoluta-della-lama');h.c.armi=[{id:'sword',nome:'Lama',tipo:'Lama',grado:'d4',attr:'Forza'}];Object.assign(h.c.extraTech[1],{stile:'Swordsman',forma:'Singolo',eff:[],arma:'sword'});
 const r=h.resolve({baseTechId:'tech:guard',techniqueUse:'parry',passiveTalentIds:['prestige:guardia-invalicabile','prestige:maestria-assoluta-della-lama'],weaponId:'weapon:sword'});assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,0);assert.ok(r.formulas.some(f=>/d20 arma/.test(f.text)&&/d20\+d12\) Atletica/.test(f.text)));assert.equal(h.c.armi[0].grado,'d4');
});
test('Fendente Sovrano keeps full damage and cannot stack the old half-damage version',()=>{
 const h=fixture('swordsman');h.take('fendente-sovrano');
 h.c.armi=[{id:'blade',nome:'Lama',tipo:'Lama',grado:'d10',attr:'Forza'}];h.c.extraTech[0].arma='blade';
 const r=h.resolve({passiveTalentIds:['prestige:fendente-sovrano'],weaponId:'weapon:blade'});assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,1);assert.ok(r.formulas.filter(f=>f.label==='Danno · fonti').every(f=>!f.text.includes('/ 2')));assert.ok(r.conditions.some(c=>c.text.startsWith('Fendente Sovrano: 300 m')));
});
test('Schianto replaces only its d8 with full Forza after a compatible Projection',()=>{
 const h=fixture();h.c.extraTech[0].eff=['Proiezione','Schianto'];let r=h.resolve({});assert.ok(r.formulas.some(f=>f.label.startsWith('Schianto')&&/sostituisce d8/.test(f.text)));h.c.extraTech[0].eff=['Schianto'];r=h.resolve({});assert.ok(r.formulas.some(f=>f.label.startsWith('Schianto')&&f.text.startsWith('+ d8')));
});
test('Sintonia allows two color activations, three at Saikyo, still pays each PIP and cannot include lightning',()=>{
 const h=fixture();h.p.choose(h.c,'spirito','sintonia-dei-colori',true);
 let r=h.resolve({hakiSelections:[h.h(),h.h(1)]});assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,2);
 assert.ok(hasBonusError(h.resolve({hakiSelections:[h.h(),h.h(1),h.h(2)]})));
 h.c.attr.Spirito='d20+d20';r=h.resolve({hakiSelections:[h.h(),h.h(1),h.h(2)]});assert.equal(r.totals.pip,3);assert.equal(r.economy.used,1);
 assert.ok(hasBonusError(h.resolve({hakiSelections:[h.h(0,{effects:['act:d10']}),h.h(1)]})));
});
test('Riscossa distributes one shared PIP budget, never activates colors, is atomic and cannot repeat before rest',()=>{
 const h=fixture();h.p.choose(h.c,'spirito','riscossa-della-volonta',true);h.state(0,{active:false,pipRemaining:1});h.state(1,{pipRemaining:3});h.state(2,{pipRemaining:2});const [a,b,c]=h.colors;
 assert.equal(h.p.recover(h.c,{[a]:3,[b]:1,[c]:1}),5);assert.equal(h.c.specialMoveSession.haki[a].pipRemaining,4);assert.equal(h.c.specialMoveSession.haki[a].active,false);assert.throws(()=>h.p.recover(h.c,{[a]:1}),/riposo/);
 h.c.prestige.session.riscossaUsed=false;let before=JSON.stringify(h.c);assert.throws(()=>h.p.recover(h.c,{[a]:1,[c]:1}),/massimo/);assert.equal(JSON.stringify(h.c),before);
 assert.throws(()=>h.p.recover(h.c,{[a]:-1}),/intero/);assert.throws(()=>h.p.recover(h.c,{'fake':1}),/non posseduto/);
});
test('Prestige lightning costs and durations grow only at their own Haki stage, reserve remains 5',()=>{
 const h=fixture();h.c.attr.Spirito='d20+d20';h.c.haki[0].die='d20+d12';let rows=h.p.hakiRows(h.c,h.c.haki[0]);let r=rows.find(x=>x.id==='ryou-persistente');assert.equal(r.cost,4);assert.equal(r.durationTurns,2);
 h.c.haki[0].die='d20+d20';r=h.p.hakiRows(h.c,h.c.haki[0]).find(x=>x.k==='prestige-ryou-persistente');assert.equal(r.cost,5);assert.equal(r.durationTurns,3);assert.equal(h.moves.hakiState(h.moves.sources().find(s=>s.id===h.colors[0])).max,5);
});
test('Prepared Prestige Haki can coexist with one role Bonus but cannot stack its base version',()=>{
 const h=fixture();h.take('raffica-senza-fine');h.state(0,{effects:{'act:prestige-ryou-persistente':1},pipRemaining:1});
 const r=h.resolve({activeTalentId:'prestige:raffica-senza-fine',hakiSelections:[h.h(0,{activation:'prepared',effects:['act:prestige-ryou-persistente'],preparedEffects:['act:prestige-ryou-persistente']})]});assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.used,1);assert.equal(r.totals.pip,0);
 const invalid=h.resolve({hakiSelections:[h.h(0,{effects:['act:d20','act:prestige-ryou-persistente'],preparedEffects:['act:prestige-ryou-persistente']})]});assert.match(errorText(invalid),/una sola versione/);
});
test('Anticipo Offensivo adds complete Observation rolls only to accuracy, never damage or the whole Raffica',()=>{
 const h=fixture();h.state(1);const r=h.resolve({hakiSelections:[h.h(1,{effects:['act:prestige-anticipo-offensivo']})]});assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.pip,2);assert.ok(r.formulas.some(f=>f.label==='Per colpire'&&f.text.includes('2 × (d20+d12)')));assert.ok(r.formulas.filter(f=>f.label==='Danno · fonti').every(f=>!f.text.includes('Osservazione')));
});
test('Prestige Re maximizes and doubles DD only, without multiplying Haki or the extra attribute',()=>{
 const h=fixture();h.take('potenza-del-titano');h.c.haki[2].prestigeGM=3;h.state(0);h.state(2);
 const r=h.resolve({passiveTalentIds:['prestige:potenza-del-titano'],hakiSelections:[h.h(),h.h(2,{effects:['act:prestige-volonta-illeggibile']})]});assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.pip,3);const d=r.formulas.find(f=>f.label==='Danno · fonti').text;assert.match(d,/2 × massimo\(d10 Tecnica\) \+ d20\+d12 Armamento \+ \(d20\+d12\) Potenza/);
});

test('Movement, projection and Sniper range follow their governing attribute even when the attack uses another one',()=>{
 const h=fixture();h.c.attr.Forza='d20+d8';h.c.attr.Tecnica='d20+d4';Object.assign(h.c.extraTech[0],{attr:'Tecnica',eff:['Proiezione','Schianto']});let r=h.resolve({});
 assert.ok(r.formulas.some(f=>f.label.startsWith('Schianto')&&f.text.includes('d20+d8')));assert.ok(r.conditions.some(c=>c.text.startsWith('Proiezione Colossale: 20 m')));
 Object.assign(h.c.extraTech[0],{attr:'Forza',forma:'Spostamento',eff:['Balzo']});r=h.resolve({});assert.ok(r.conditions.some(c=>c.text.startsWith('Spostamento Fulmineo: 10 m')));assert.ok(r.conditions.some(c=>c.text.startsWith('Agilità Sovrumana: 5 m')));
 const s=fixture('sniper');s.c.attr.Astuzia='d20+d6';s.c.extraTech[0].attr='Tecnica';r=s.resolve({});assert.ok(r.conditions.some(c=>c.text.startsWith('Calcolo Balistico Sovrumano: 150 m')));
 // Owning another style never lends its attribute package to an unrelated move.
 h.c.role2='Combattente';h.c.style2='Sniper';h.c.skills.Osservazione='d20';Object.assign(h.c.extraTech[0],{stile:'Sniper',forma:'Singolo',eff:['Proiezione','Scatto']});assert.ok(h.p.techniqueBenefits(h.c,h.c.extraTech[0]).every(b=>!['projection','movement'].includes(b.id)));
});
test('The shared Re usage limit blocks both ordinary Grido and Prestige Pressione',()=>{
 const h=fixture();h.c.haki[2].prestigeGM=1;h.state(2);h.c.prestige={session:{emperorUsed:true}};
 for(const effect of ['act:2','act:prestige-pressione-imperiale']){
  const found=h.moves.hakiEffects(h.moves.sources().find(s=>s.id===h.colors[2])).find(e=>e.id===effect);
  assert.ok(found,effect);
  assert.equal(h.resolve({hakiSelections:[h.h(2,{effects:[effect]})]}).status,'unavailable');
 }
});
test('Stored Prestige duration never survives an inactive Color in the Special Move Composer',()=>{
 const h=fixture();h.state(0,{active:false,effects:{'act:prestige-ryou-persistente':2}});const r=h.resolve({hakiSelections:[h.h(0,{activation:'prepared',effects:['act:prestige-ryou-persistente'],preparedEffects:['act:prestige-ryou-persistente']})]});assert.notEqual(r.status,'ready');
});
test('The real Signature Builder keeps legal damage dice under a Prestige attribute, with normal slots and ST',()=>{
 const h=fixture(),build=require('./helpers/glc-fixture.cjs').installRealBuilder(h.context);
 let result=build({...h.c.extraTech[0],die:'d20',eff:['Sbilancio']});assert.equal(result.stato.s,'ok');assert.equal(h.context.TBUILD.die,'d20');assert.equal(result.slot,4);
 assert.equal(h.context.tecCost(h.context.TBUILD).st,1);
 h.c.attr.Forza='d8';result=build({...h.c.extraTech[0],die:'d20'});assert.equal(h.context.TBUILD.die,'d20');assert.equal(result.valid,false);assert.equal(result.stato.s,'ko');assert.ok(result.errors.some(e=>e.code==='grade-cap'));
 result=build({...h.c.extraTech[0],die:'d8'});assert.equal(result.valid,true);assert.equal(result.stato.s,'ok');assert.equal(result.slot,2);
});
test('The real Builder offers Punto di Rottura only with Precisione Assoluta and the specified technique',()=>{
 const h=fixture('striker-acrobazia'),build=require('./helpers/glc-fixture.cjs').installRealBuilder(h.context),t={...h.c.extraTech[0],attr:'Tecnica',eff:['Punto di Rottura']};
 const assertUnavailable=result=>{assert.deepEqual(Array.from(h.context.TBUILD.eff),['Punto di Rottura']);assert.equal(result.valid,false);assert.equal(result.stato.s,'ko');assert.ok(result.errors.some(e=>e.code==='effect'&&e.effect==='Punto di Rottura'));assert.ok(!result.available.includes('Punto di Rottura'));};
 assertUnavailable(build(t));h.take('precisione-assoluta');let result=build(t);assert.equal(result.valid,true);assert.equal(result.stato.s,'ok');assert.deepEqual(Array.from(h.context.TBUILD.eff),['Punto di Rottura']);assert.ok(result.available.includes('Punto di Rottura'));assert.equal(h.context.tecCost(h.context.TBUILD).st,2);
 for(const patch of [{attr:'Forza'},{fonte:'Frutto'},{forma:'Area'}])assertUnavailable(build({...t,...patch}));
});
test('At Saikyo, optional higher PIP payments preserve the shorter Prestige effects and cannot stack versions',()=>{
 const h=fixture('striker-atletica','d20+d20');h.state(0);h.state(1);
 const r=h.p.hakiRows(h.c,h.c.haki[0]);const standard=r.find(x=>x.k==='prestige-ryou-persistente-standard'),enhanced=r.find(x=>x.k==='prestige-ryou-persistente');assert.equal(standard.cost,4);assert.equal(standard.durationTurns,2);assert.equal(enhanced.cost,5);assert.equal(enhanced.durationTurns,3);
 let result=h.resolve({hakiSelections:[h.h(1,{effects:['act:prestige-anticipo-offensivo-standard']})]});assert.equal(result.status,'ready',errorText(result));assert.equal(result.totals.pip,2);assert.ok(result.formulas.some(f=>f.label==='Per colpire'&&f.text.includes('2 × (d20+d20)')));
 result=h.resolve({hakiSelections:[h.h(1,{effects:['act:prestige-anticipo-offensivo']})]});assert.equal(result.totals.pip,3);assert.ok(result.formulas.some(f=>f.label==='Per colpire'&&f.text.includes('3 × (d20+d20)')));
 result=h.resolve({hakiSelections:[h.h(1,{effects:['act:prestige-anticipo-offensivo','act:prestige-anticipo-offensivo-standard']})]});assert.match(errorText(result),/una sola versione/);
});
test('A reduced Spirito also caps stored PIP, and raising Spirito again does not refund them',()=>{
 const h=fixture();h.state(0,{pipRemaining:5});h.c.attr.Spirito='d8';h.p.normalize(h.c);assert.equal(h.c.specialMoveSession.haki[h.colors[0]].pipRemaining,2);h.c.attr.Spirito='d20+d20';h.p.normalize(h.c);assert.equal(h.c.specialMoveSession.haki[h.colors[0]].pipRemaining,2);
});
