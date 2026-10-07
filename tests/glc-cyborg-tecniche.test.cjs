/* Cyborg executors are physical devices, not replacement Technique dice or
 * free narrative effect permissions. All checks read the live shared engines. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup,errorText}=require('./helpers/glc-fixture.cjs');
function fixture(style='Swordsman',patch={}){
 const h=setup(),c=h.context.pg;
 Object.assign(c,{race:'cyborg',racialDie:'d12',style,roleSkillDie:'d12',attr:{Forza:'d20',Tecnica:'d12',Astuzia:'d20',Spirito:'d20'},talents:[],armi:[],moduli:[],haki:[],moduloAttivo:'integrated'});
 const types={Swordsman:'Lama',Crusher:'Contundente',Sniper:'A distanza'};
 const m={id:'integrated',nome:'Dispositivo integrato',req:'d10',installato:true,stato:'integro',tipo:['Offensivo'],arma:style!=='Striker',armaTipo:types[style]||'',attr:style==='Striker'?'':'Tecnica',gradoArma:style==='Striker'?'':'d8',funzioneTipo:style==='Striker'?'Manipolatore':'Arma',funzione:'Dispositivo fisico registrato.',funzioneAttiva:'Esegue la sua funzione concreta.',funzioneInattiva:'Resta una parte fisica del corpo.',fuel:{on:false},...patch};
 c.moduli=[m];c.extraTech=[{id:'punch',nome:'Tecnica integrata',fonte:'Stile',stile:style,forma:'Singolo',attr:'Forza',die:'d20',eff:[],modulo:m.id,arma:'',durata:'Un turno'}];
 const options={pg:c,catalogue:h.context.TEC_EFF||require('node:vm').runInContext('TEC_EFF',h.context),whitelist:require('node:vm').runInContext('STILE_WHITELIST',h.context)};
 const evaluate=(patch={})=>h.context.window.GLCTechniques.evaluate(c,c.extraTech[0],{...options,...patch});
 return {...h,c,m,t:c.extraTech[0],options,evaluate};
}
const codes=r=>r.errors.map(e=>e.code);

test('A real installed integrated weapon fulfills Swordsman, Crusher and Sniper without an Arsenal duplicate or replacing the Technique die',()=>{
 for(const style of ['Swordsman','Crusher','Sniper']){
  const h=fixture(style),before=JSON.stringify(h.c),r=h.evaluate();
  assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(h.c.armi.length,0);assert.equal(r.compatibleModules.length,1);
  assert.equal(r.weapon.grado,'d8');assert.equal(h.t.die,'d20');assert.equal(r.cap,6);assert.equal(r.cost.st,0);assert.equal(JSON.stringify(h.c),before);
 }
});

test('Generic, incompatible, absent or invalid modules cannot satisfy weapon requirements, and Striker remains unarmed',()=>{
 for(const patch of [{arma:false,funzioneTipo:'Manipolatore'},{armaTipo:'Contundente'},{installato:false},{stato:'danneggiato'},{req:'d6',gradoArma:'d8'},{attr:'Spirito'},{gradoArma:'d20+d4'}]){
  const h=fixture('Swordsman',patch),before=JSON.stringify(h.c);assert.equal(h.evaluate().valid,false,JSON.stringify(patch));assert.equal(JSON.stringify(h.c),before);
 }
 const h=fixture();h.c.race='umano';assert.equal(h.evaluate().valid,false);h.c.race='cyborg';h.c.moduli=[];assert.ok(codes(h.evaluate()).includes('module-missing'));assert.equal(h.t.modulo,'integrated');
 const striker=fixture('Striker',{arma:true,armaTipo:'Lama',attr:'Forza',gradoArma:'d8',funzioneTipo:'Arma'});assert.ok(codes(striker.evaluate()).includes('unarmed'));
});

test('An inactive module can construct a Technique but cannot execute it, including its structured unlock and prospective costs',()=>{
 const h=fixture('Swordsman',{req:'d8',eff:{cat:'Sblocco',sblocchi:['Sbilancio']},fuel:{on:true,tipo:'Batteria',max:4,cur:0}});
 h.c.moduloAttivo='';h.t.eff=['Sbilancio'];const before=JSON.stringify(h.c),build=h.evaluate();
 assert.equal(build.valid,true,JSON.stringify(build.errors));assert.ok(build.available.includes('Sbilancio'));assert.equal(build.cost.st,1);
 assert.equal(h.evaluate({purpose:'use'}).valid,false);assert.ok(codes(h.evaluate({purpose:'use'})).includes('module-inactive'));
 const r=h.resolve({});assert.equal(r.status,'unavailable',errorText(r));assert.ok(r.unavailable.some(s=>/Inattivo/.test(s)));assert.ok(r.unavailable.some(s=>/Cariche/.test(s)));
 assert.equal(r.totals.st,1);assert.equal(JSON.stringify(h.c),before);
});

test('Sblocco names only one actual profile and retains Technique grades, forms, source restrictions and Prestige prerequisites',()=>{
 const h=fixture('Swordsman',{req:'d8',eff:{cat:'Sblocco',sblocchi:['Sbilancio']}});h.t.eff=['Sbilancio'];
 assert.equal(h.evaluate().valid,true);assert.equal(h.evaluate().cost.st,1);assert.equal(h.evaluate().used,1);
 h.t.die='d4';assert.ok(codes(h.evaluate()).includes('effect'));h.t.die='d20';
 h.m.eff.sblocchi=['Sbilancio','Accecante'];assert.ok(codes(h.evaluate()).includes('module-unlock-count'));
 h.m.eff.sblocchi=['Paralisi'];assert.ok(codes(h.evaluate()).includes('module-unlock-grade'));
 h.m.eff.sblocchi=['Punto di Rottura'];h.t.eff=['Punto di Rottura'];assert.ok(codes(h.evaluate()).includes('effect'));
 const sniper=fixture('Sniper',{req:'d8',eff:{cat:'Sblocco',sblocchi:['Soffio']}});Object.assign(sniper.t,{forma:'Area',eff:['Soffio']});
 assert.ok(codes(sniper.evaluate()).includes('form'));assert.ok(!sniper.evaluate().forms.includes('Area'));
 const noGrant=fixture();noGrant.t.eff=['Accecante'];noGrant.t.sourcePermission={key:noGrant.context.window.GLCTechniques.sourceKey(noGrant.c,noGrant.t),basis:'Il nome del dispositivo sembra adatto.',effects:['Accecante']};
 assert.equal(noGrant.evaluate().permissionValid,false);assert.ok(codes(noGrant.evaluate()).includes('effect'));
});

test('Sconto is bounded by its exact target and point budget, preserves minimum 1 ST and never discounts another effect or upkeep',()=>{
 const h=fixture('Striker',{req:'d6',eff:{cat:'Sconto',tgt:'Sfondamento',scontoST:1,scontoSlot:0}});h.t.eff=['Sfondamento','Proiezione'];
 let r=h.evaluate();assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.cost.st,2);assert.equal(r.used,2);
 Object.assign(h.m,{req:'d10',eff:{cat:'Sconto',tgt:'Scatto',scontoST:3,scontoSlot:0}});h.t.eff=['Scatto','Schianto'];
 r=h.evaluate();assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.cost.st,3);assert.equal(r.moduleModifiers.discountST,0);
 h.m.eff={cat:'Sconto',tgt:'Presa',scontoST:3,scontoSlot:0};h.t.eff=['Presa'];r=h.evaluate();assert.equal(r.cost.st,1);assert.equal(r.cost.pt,1);
 h.m.eff={cat:'Sconto',tgt:'Scatto',scontoST:3,scontoSlot:1};assert.ok(codes(h.evaluate()).includes('module-discount-budget'));
});

test('A paid targeted Slot discount permits a d6 movement profile without unlocking unrelated effects or lowering grades',()=>{
 const h=fixture('Striker',{req:'d8',funzioneTipo:'Propulsore',eff:{cat:'Sconto',tgt:'Scatto',scontoST:0,scontoSlot:1}});
 Object.assign(h.t,{die:'d6',forma:'Spostamento',eff:['Scatto']});const before=JSON.stringify(h.c),r=h.evaluate();
 assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.slot,0);assert.equal(r.used,0);assert.equal(r.cost.st,1);
 h.t.eff=['Balzo'];assert.ok(codes(h.evaluate()).includes('slots'));h.t.eff=['Scatto'];h.t.die='d4';assert.ok(codes(h.evaluate()).includes('effect'));
 h.t.die='d6';assert.equal(JSON.stringify(h.c),before);
});

test('Module source identity follows structural changes while activation, integrity and remaining charges keep the saved identity',()=>{
 const h=fixture(),api=h.context.window.GLCTechniques,key=api.sourceKey(h.c,h.t);
 h.c.moduloAttivo='';h.m.stato='danneggiato';h.m.fuel={on:true,tipo:'Batteria',max:5,cur:2};assert.equal(api.sourceKey(h.c,h.t),key);
 h.m.attr='Forza';assert.notEqual(api.sourceKey(h.c,h.t),key);
});

test('SMC derives structured module charges separately from ST and keeps Technique dice, formulas and resources unchanged when resolving',()=>{
 const h=fixture('Swordsman',{req:'d10',eff:{cat:'Sblocco',sblocchi:['Sbilancio'],testo:'Sblocca un singolo profilo compatibile.'},fuel:{on:true,tipo:'Batteria',max:5,cur:5}});h.t.eff=['Sbilancio'];
 const before=JSON.stringify(h.c),r=h.resolve({}),source=r.sources.find(s=>s.id==='module:integrated');
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.move.moduleId,'module:integrated');assert.equal(h.moves.requiresGM(source),false);assert.equal(r.unknown.length,0);
 assert.equal(r.totals.st,1);assert.equal(r.resources.length,1);assert.equal(r.resources[0].cost,1);assert.equal(r.resources[0].available,5);assert.equal(r.resources[0].max,5);
 assert.ok(r.formulas.some(f=>f.label==='Per colpire'&&/d20 Forza \+ d20 Tecnica/.test(f.text)));
 assert.ok(r.formulas.some(f=>f.label==='Salvezza · Sbilancio'&&/Soglia 11/.test(f.text)));assert.equal(r.economy.normal,1);assert.equal(r.economy.used,0);
 assert.equal(JSON.stringify(h.c),before);
});

test('Normal Parry through a real Modulo-Arma uses weapon Attribute and grade, one Reaction and no context Technique effects',()=>{
 const h=fixture('Swordsman',{fuel:{on:true,tipo:'Batteria',max:5,cur:5}});h.t.eff=['Lacerazione'];
 const before=JSON.stringify(h.c),r=h.resolve({techniqueUse:'parry'});
 assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,0);assert.equal(r.economy.normal,0);assert.equal(r.economy.reactions,1);assert.equal(r.resources[0].cost,1);
 assert.ok(r.formulas.some(f=>f.label==='Parata con arma'&&/d12 Tecnica \+ d8 arma/.test(f.text)));assert.ok(r.formulas.every(f=>!f.label.startsWith('Danno')&&!f.label.startsWith('Salvezza')));
 assert.ok(r.conditions.every(c=>!c.text.startsWith('Lacerazione:')));assert.equal(JSON.stringify(h.c),before);
});

test('Runtime changes keep recipe references while preventing execution, and a missing module is never silently dropped',()=>{
 const h=fixture('Swordsman',{fuel:{on:true,tipo:'Batteria',max:5,cur:5}}),card=h.card({moduleId:'module:integrated'});h.c.specialMoves=[card];
 h.c.moduloAttivo='';assert.equal(h.moves.resolve(card).status,'unavailable');h.c.moduloAttivo=h.m.id;h.m.fuel.cur=0;assert.equal(h.moves.resolve(card).status,'unavailable');
 h.m.fuel.cur=5;h.m.installato=false;assert.equal(h.moves.resolve(card).status,'repair');h.m.installato=true;h.m.stato='danneggiato';assert.equal(h.moves.resolve(card).status,'repair');
 h.m.stato='integro';h.c.racialDie='d6';assert.equal(h.moves.resolve(card).status,'repair');h.c.racialDie='d12';h.c.moduli=[];
 const before=JSON.stringify(h.c),r=h.moves.resolve(card);assert.equal(r.status,'repair');assert.equal(r.move.moduleId,'module:integrated');assert.ok(r.errors.some(e=>/non.*(?:presente|disponibile|registrato)/i.test(e.text)));assert.equal(JSON.stringify(h.c),before);
 assert.equal(h.c.specialMoves[0].moduleId,'module:integrated');
});

test('Historical module prose and GM cost records stay intact but cannot authorize a free effect, a discount or invalid physical weapon',()=>{
 const h=fixture('Swordsman',{eff:{cat:'Sconto',tgt:'Sbilancio',testo:'Fa tutto gratis e concede stati.'}});h.t.eff=['Sbilancio'];
 const s=h.moves.sources().find(s=>s.id==='module:integrated');h.c.specialMoveSourceCosts={[s.id]:{basis:h.moves.costBasis(s),st:0,pip:0,maintenanceST:0,maintenancePIP:0,resource:0,discountST:9,minimumST:0}};
 const before=JSON.stringify(h.c),r=h.resolve({});assert.equal(h.moves.requiresGM(s),true);assert.equal(r.status,'repair');assert.equal(r.totals,null);assert.equal(JSON.stringify(h.c),before);
});

test('A deliberate Arsenal executor repair clears only the derived module link and its discount, preserving the saved Technique and module data',()=>{
 const h=fixture('Swordsman',{req:'d6',gradoArma:'d4',eff:{cat:'Sconto',tgt:'Mira',scontoST:1,scontoSlot:0},fuel:{on:true,tipo:'Batteria',max:3,cur:3}});
 Object.assign(h.t,{forma:'Potenziamento',eff:['Mira']});h.c.armi=[{id:'external',nome:'Arma esterna',tipo:'Lama',attr:'Forza',grado:'d8'}];
 const before=JSON.stringify(h.c),module=h.resolve({}),repaired=h.resolve({weaponId:'weapon:external'});
 assert.equal(module.status,'ready',errorText(module));assert.equal(module.totals.st,2);assert.equal(module.resources.length,1);
 assert.equal(repaired.status,'ready',errorText(repaired));assert.equal(repaired.totals.st,3);assert.equal(repaired.resources.length,0);assert.equal(repaired.move.moduleId,'');assert.equal(JSON.stringify(h.c),before);
});

test('Più Spade recognizes one operational integrated blade and one external blade, while inactive, damaged or duplicate devices cannot supply the second sword',()=>{
 const h=fixture('Swordsman'),names=['Più Spade — Base','Più Spade — Migliorato'];
 h.c.talents=names.map(n=>'Combattente · Swordsman · '+n);h.t.eff=['Lacerazione'];
 h.c.armi=[{id:'external',nome:'Seconda lama',tipo:'Lama',attr:'Forza',grado:'d8'}];
 const talent=h.moves.sources().find(s=>s.id==='glc-talent-033'),tech=h.moves.sources().find(s=>s.id==='tech:punch'),before=JSON.stringify(h.c),r=h.resolve({activeTalentId:talent.id});
 assert.equal(h.moves.applicable(talent,tech,r.move),true);assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.normal,1);assert.equal(r.economy.used,1);assert.equal(r.totals.st,1);
 assert.ok(r.formulas.some(f=>f.label==='Per colpire'&&/d20 Forza \+ d20 Tecnica/.test(f.text)));assert.equal(JSON.stringify(h.c),before);
 h.c.moduloAttivo='';assert.equal(h.moves.applicable(talent,tech,r.move),false);h.c.moduloAttivo=h.m.id;h.m.stato='danneggiato';assert.equal(h.moves.applicable(talent,tech,r.move),false);
 h.m.stato='integro';h.c.armi[0].id=h.m.id;assert.equal(h.moves.applicable(talent,tech,r.move),false);
 h.c.armi=[];h.c.moduli.push({...h.m,id:'inactive-second',nome:'Lama inattiva'});assert.equal(h.moves.applicable(talent,tech,r.move),false);
});
