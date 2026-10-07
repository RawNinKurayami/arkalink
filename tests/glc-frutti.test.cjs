/* Official Fruit rules exercised through the live shared engines and Composer. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {setup,errorText,installRealBuilder}=require('./helpers/glc-fixture.cjs');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
function fruit(h,tipo='Zoan',die='d8'){
 h.context.pg.frutto={has:true,nome:'Frutto di prova',tipo,die,desc:'Descrizione storica',zoanType:'Ordinario',forma:'Ibrida',identita:{nucleo:'Creatura',limitazioni:'Nessuno',contraccolpi:'Fatica naturale'},creatura:{specie:'Felino',stazza:'Grande'},armiNaturali:[{id:'claw',nome:'Artigli',anatomia:'Artigli delle mani',forme:['Ibrida','Bestiale'],tipo:'Lama',attr:'Forza',portata:'1 m',note:'Scelta fissa',extra:{preserve:true}}],unknown:{version:31}};
 h.context.pg.attr.Forza='d20';h.context.pg.attr.Tecnica='d20';return h.context.pg.frutto;
}
function own(h,n){h.context.pg.talents.push('Frutto · '+h.context.pg.frutto.tipo+' · '+n);}
function draft(h,changes={}){return {id:'fruit-tech',nome:'Tecnica Frutto',fonte:'Frutto',fruitType:h.context.pg.frutto.tipo,attr:'Forza',die:'d8',forma:'Singolo',durata:'Un turno',eff:[],arma:'',modulo:'',...changes};}
function authorize(h,t,effects,requiresTalent=''){t.sourcePermission={key:h.context.GLCTechniques.sourceKey(h.context.pg,t),basis:'Applicazione concordata con il GM',effects,requiresTalent};return t;}
function evaluate(h,t){return h.context.GLCTechniques.evaluate(h.context.pg,t,h.context.tbRules());}
function install(h,t){h.context.pg.extraTech=[t];return {baseTechId:'tech:'+t.id,activeTalentId:'',passiveTalentIds:[],weaponId:'',moduleId:'',hakiSelections:[],fruitSelections:[]};}

test('Fruit dossiers and virtual weapons are pure reads of frozen historical data and preserve identity/unknown records',()=>{
 const h=setup(),f=fruit(h);own(h,'Artigli e Zanne');f.identita.future={key:'preserved'};f.scelteTalenti={'glc-talent-256':'Olfatto'};f.creatura.future='Storico';
 const before=JSON.stringify(h.context.pg);freeze(h.context.pg);
 const d=h.context.GLCFruits.dossier(h.context.pg),w=h.context.GLCFruits.naturalWeapons(h.context.pg,{purpose:'use'})[0];
 assert.equal(w.id,'natural:claw');assert.equal(w.grado,'d8');assert.equal(w.extra.preserve,true);assert.equal(w.raw.id,'claw');assert.ok(d.sections.some(s=>s.title==='Scheda di Identità'));assert.equal(JSON.stringify(h.context.pg),before);
});

test('Natural base attacks work without Combattente or Style, keep the full Fruit grade and require their own Attribute',()=>{
 const h=setup();fruit(h);own(h,'Artigli e Zanne');h.context.pg.role='Navigatore';h.context.pg.style='';h.context.pg.armi=[];
 const r=h.context.GLCFruits.naturalAttack(h.context.pg,'claw');assert.equal(r.valid,true);assert.match(r.attack,/d20 Forza \+ d8 Arma Naturale/);assert.match(r.damage,/d8/);assert.equal(h.context.pg.armi.length,0);assert.match(r.note,/Non richiede Ruolo Combattente/);
 h.context.pg.attr.Forza='d6';const blocked=h.context.GLCFruits.naturalAttack(h.context.pg,'claw');assert.equal(blocked.valid,false);assert.equal(blocked.weapon.grado,'d8');assert.match(blocked.errors.join(' '),/almeno d8/);
});

test('Artigli registration never grants Style Techniques to a non-Combattente or to a Striker',()=>{
 const h=setup();fruit(h);own(h,'Artigli e Zanne');const t=draft(h,{fonte:'Stile',stile:'Swordsman',fruitType:'',arma:'natural:claw'});
 h.context.pg.role='Navigatore';assert.ok(evaluate(h,t).errors.some(e=>e.code==='combat-role'));h.context.pg.role='Combattente';h.context.pg.style='Striker';assert.ok(evaluate(h,t).errors.some(e=>e.code==='style'));t.stile='Striker';assert.ok(evaluate(h,t).errors.some(e=>e.code==='unarmed'));
});

test('The real Builder can link a natural weapon before changing form, with no Arsenal duplication or free effects',()=>{
 const h=setup();fruit(h);own(h,'Artigli e Zanne');h.context.pg.style='Swordsman';h.context.pg.frutto.forma='Umana';h.context.pg.armi=[];
 const build=installRealBuilder(h.context),t=draft(h,{id:undefined,fonte:'Stile',stile:'Swordsman',fruitType:'',arma:''}),r=build(t);
 assert.equal(h.context.TBUILD.arma,'natural:claw');assert.equal(r.valid,true);assert.equal(r.armi.length,1);assert.equal(h.context.pg.armi.length,0);assert.ok(!r.available.includes('Sfondamento'));
});

test('Natural executors are operationally checked both through the saved Technique and an explicit recipe weapon, without mutating frozen data',()=>{
 for(const explicit of [false,true]){const h=setup();fruit(h);own(h,'Artigli e Zanne');h.context.pg.style='Swordsman';const t=draft(h,{fonte:'Stile',stile:'Swordsman',fruitType:'',arma:'natural:claw'}),card=install(h,t);
 if(explicit)card.weaponId='weapon:natural:claw';h.context.pg.frutto.forma='Umana';assert.equal(evaluate(h,t).valid,true);const before=JSON.stringify(h.context.pg);freeze(h.context.pg);
 const r=h.moves.resolve(card);assert.equal(r.status,'unavailable',errorText(r));assert.match(r.unavailable.join(' '),/forma attuale/);assert.equal(r.move.weaponId,'weapon:natural:claw');assert.equal(JSON.stringify(h.context.pg),before);
 const restored=clone(h.context.pg);restored.frutto.forma='Ibrida';h.context.pg=freeze(restored);assert.equal(h.moves.resolve(card).status,'ready');}
});

test('Loss of Artigli, fruit exhaustion, deletion or Attribute requirements keeps the saved natural reference with a visible block',()=>{
 const h=setup();fruit(h);own(h,'Artigli e Zanne');h.context.pg.style='Swordsman';const t=draft(h,{fonte:'Stile',stile:'Swordsman',fruitType:'',arma:'natural:claw'}),card=install(h,t);
 h.context.pg.frutto.esaurito=true;assert.equal(h.moves.resolve(card).status,'unavailable');h.context.pg.frutto.esaurito=false;h.context.pg.attr.Forza='d6';assert.equal(h.moves.resolve(card).status,'repair');h.context.pg.attr.Forza='d20';h.context.pg.talents=h.context.pg.talents.filter(k=>!k.endsWith('Artigli e Zanne'));assert.equal(h.moves.resolve(card).status,'repair');assert.equal(t.arma,'natural:claw');assert.equal(h.context.pg.frutto.armiNaturali[0].id,'claw');
});

test('A normal Parata with an equipped natural blade uses its Fruit weapon die and does not execute Technique effects',()=>{
 const h=setup();fruit(h);own(h,'Artigli e Zanne');h.context.pg.style='Swordsman';const t=draft(h,{fonte:'Stile',stile:'Swordsman',fruitType:'',die:'d10',arma:'natural:claw',eff:['Lacerazione']}),card=install(h,t);
 const r=h.moves.resolve({...card,techniqueUse:'parry'});assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,0);assert.equal(r.economy.reactions,1);assert.match(r.formulas.find(f=>f.label==='Parata con arma').text,/d8 arma/);assert.ok(!r.formulas.some(f=>/Sanguinante/.test(f.text)));
});

test('Stazza is a precise reach condition in Bestiale only; natural base signature in Ibrida chooses either State or one actual weapon die',()=>{
 const h=setup();fruit(h);own(h,'Artigli e Zanne');own(h,'Stazza');let p=h.context.GLCFruits.naturalAttack(h.context.pg,'claw');assert.equal(p.reach,'');assert.match(p.signature,/Soglia 5 dal Dado del Frutto d8/);assert.match(p.signature,/oppure \+1 Dado Danno d8/);assert.match(p.signature,/mai entrambi/);assert.doesNotMatch(p.signature,/una volta per turno/);
 h.context.pg.frutto.forma='Bestiale';p=h.context.GLCFruits.naturalAttack(h.context.pg,'claw');assert.match(p.reach,/maggiore fra 1 m e 2 m/);assert.equal(p.signature,'');
});

test('Portata Naturale gives the selected range zero slots/ST, upgrades the exact shape once, and never grants Area itself',()=>{
 const h=setup();fruit(h,'Paramecia','d12');own(h,'Portata Naturale');const t=authorize(h,draft(h,{forma:'Area',eff:['Soffio','Gittata Media','Lacerazione','Terreno Alterato']}),['Soffio','Gittata Media','Lacerazione','Terreno Alterato']);
 const r=evaluate(h,t);assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.used,2);assert.equal(r.cost.st,3);assert.equal(r.areaUpgrade.name,'Onda');assert.match(r.areaUpgrade.description,/10 m/);assert.equal(t.eff[0],'Soffio');
 const card=install(h,t),move=h.moves.resolve(card);assert.equal(move.status,'ready',errorText(move));assert.equal(move.totals.st,3);assert.ok(move.conditions.some(c=>/Soffio → Onda/.test(c.text)));
 const noPermission=draft(h,{forma:'Area',eff:['Soffio']});assert.equal(evaluate(h,noPermission).valid,false);
});

test('Portata shape progressions stop at their registered maximum and Catena alone receives its targeted discount',()=>{
 const h=setup();fruit(h,'Paramecia','d20');own(h,'Portata Naturale');
 for(const [base,next]of [['Solco','Lancia'],['Scoppio','Esplosione'],['Deflagrazione','Cataclisma'],['Cataclisma','Cataclisma'],['Marea','Marea'],['Squarcio','Squarcio']]){
 const t=authorize(h,draft(h,{die:'d20',forma:'Area',eff:[base]}),[base]);assert.equal(evaluate(h,t).areaUpgrade.name,next);}
 const t=authorize(h,draft(h,{die:'d12',eff:['Catena','Sbilancio']}),['Catena','Sbilancio']);const r=evaluate(h,t);assert.equal(r.valid,true,JSON.stringify(r.errors));const costs=vm.runInContext('TEC_EFF',h.context);const base=costs.find(e=>e[1]==='Catena')[4]+costs.find(e=>e[1]==='Sbilancio')[4];assert.equal(r.cost.st,base-1);
});

test('Senza Contraccolpo is applied once by the shared engine, respects structural limits, and never raises a zero cost',()=>{
 const h=setup();fruit(h,'Paramecia','d12');own(h,'Senza Contraccolpo');const zero=draft(h,{die:'d6'});assert.equal(evaluate(h,zero).cost.st,0);
 const t=authorize(h,draft(h,{eff:['Sbilancio','Scatto']}),['Sbilancio','Scatto']),r=evaluate(h,t);assert.equal(r.cost.st,1);const card=install(h,t);assert.equal(h.moves.resolve(card).totals.st,1);assert.equal(h.moves.resolve({...card,passiveTalentIds:['glc-talent-234']}).totals.st,1);
 h.context.pg.frutto.die='d8';assert.equal(evaluate(h,t).cost.st,2);assert.equal(h.context.pg.frutto.identita.limitazioni,'Nessuno');assert.equal(h.context.pg.frutto.identita.contraccolpi,'Fatica naturale');
});

test('Changing category, Identity or a required Talent invalidates an explicit Fruit concession, while temporary state does not change its identity',()=>{
 const h=setup();fruit(h,'Zoan','d12');h.context.pg.frutto.zoanType='Mitologico';own(h,'Retaggio Mitologico');const t=authorize(h,draft(h,{forma:'Area',eff:['Soffio']}),['Soffio'],'Retaggio Mitologico');assert.equal(evaluate(h,t).valid,true);
 const key=t.sourcePermission.key;h.context.pg.frutto.forma='Bestiale';h.context.pg.frutto.esaurito=true;assert.equal(h.context.GLCTechniques.sourceKey(h.context.pg,t),key);h.context.pg.frutto.esaurito=false;h.context.pg.talents=[];assert.equal(evaluate(h,t).permissionValid,false);h.context.pg.talents=['Frutto · Zoan · Retaggio Mitologico'];h.context.pg.frutto.zoanType='Ordinario';assert.equal(evaluate(h,t).permissionValid,false);assert.equal(t.sourcePermission.key,key);h.context.pg.frutto.zoanType='Mitologico';h.context.pg.frutto.identita.nucleo='Nuovo Nucleo';assert.equal(evaluate(h,t).permissionValid,false);
});

test('Awakening projects require actual Ambition, GM permission and a complete defined project, while historical ownership stays recorded',()=>{
 const h=setup();fruit(h,'Zoan','d20');own(h,'Risveglio');let state=h.context.GLCTalents.states(h.context.pg).find(t=>t.name==='Risveglio');assert.equal(state.owned,true);assert.equal(state.active,false);assert.ok(state.missing.some(x=>/Ambizione/.test(x)));assert.ok(state.missing.some(x=>/Permesso del GM/.test(x)));
 h.context.pg.amb='Proteggere la ciurma';const project={approvatoGM:true,famiglie:['Dominio'],dominante:'Anatomia flessibile'};h.context.GLCFruits.awakening.forEach(([key])=>project[key]='Definito col GM: '+key);h.context.pg.frutto.risveglio=project;state=h.context.GLCTalents.states(h.context.pg).find(t=>t.name==='Risveglio');assert.equal(state.active,true);h.context.pg.frutto.die='d12';assert.equal(h.context.GLCTalents.has(h.context.pg,'Risveglio'),false);assert.ok(h.context.pg.talents.includes('Frutto · Zoan · Risveglio'));assert.equal(h.context.pg.frutto.risveglio.nome,project.nome);
});

test('A Prestige Fruit die is preserved as historical data but does not unlock Fruit Techniques or Talents',()=>{
 const h=setup();fruit(h,'Zoan','d20+d4');own(h,'Artigli e Zanne');const t=draft(h,{die:'d20'});const before=JSON.stringify(h.context.pg);assert.ok(evaluate(h,t).errors.some(e=>e.code==='fruit-grade'));assert.equal(h.context.GLCTalents.has(h.context.pg,'Artigli e Zanne'),false);assert.ok(h.context.GLCFruits.missing(h.context.pg).includes('Dado del Frutto'));assert.equal(JSON.stringify(h.context.pg),before);
});

test('Potere Istintivo spends no Main, Bonus or Reaction, while keeping Technique costs and limiting a single capacity',()=>{
 const h=setup();fruit(h,'Paramecia','d12');own(h,'Potere Istintivo');const t=authorize(h,draft(h,{eff:['Sbilancio']}),['Sbilancio']),card=install(h,t),r=h.moves.resolve({...card,passiveTalentIds:['glc-talent-235']});assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.normal,0);assert.equal(r.economy.used,0);assert.equal(r.economy.reactions,0);assert.equal(r.totals.st,1);assert.ok(r.conditions.some(c=>/una singola mossa.*1 volta per scena/.test(c.text)));
});

test('Trasformazione Istintiva and Riflesso consume their one Reaction independently of the Technique; survival consumes no Bonus',()=>{
 const h=setup();fruit(h,'Zoan','d12');own(h,'Trasformazione Istintiva');own(h,'Istinto di Sopravvivenza');const t=draft(h),card=install(h,t);let r=h.moves.resolve({...card,passiveTalentIds:['glc-talent-263','glc-talent-262']});assert.equal(r.status,'ready',errorText(r));assert.equal(r.economy.normal,1);assert.equal(r.economy.used,0);assert.equal(r.economy.reactions,1);assert.equal(r.totals.st,0);assert.ok(r.conditions.some(c=>/solo il cambio di forma|soltanto la trasformazione/.test(c.text)));assert.ok(r.conditions.some(c=>/Istinto di Sopravvivenza.*Nessuna Bonus/.test(c.text)));
 const p=setup();fruit(p,'Paramecia','d8');own(p,'Riflesso del Potere');const r2=p.moves.resolve({...install(p,draft(p)),passiveTalentIds:['glc-talent-227']});assert.equal(r2.status,'ready',errorText(r2));assert.equal(r2.economy.reactions,1);assert.equal(r2.economy.used,0);assert.equal(r2.totals.st,0);assert.ok(r2.conditions.some(c=>/Riflesso del Potere.*entro 5 m/.test(c.text)));
});

test('Ciò che Resta improves actual persistent zones but never turns the default instantaneous attack into three turns',()=>{
 const h=setup();fruit(h,'Paramecia','d8');own(h,'Ciò che Resta');let t=draft(h),card=install(h,t),r=h.moves.resolve(card);assert.equal(r.status,'ready');assert.ok(!r.conditions.some(c=>/Ciò che Resta: durata/.test(c.text)));
 t=authorize(h,draft(h,{forma:'Area',eff:['Soffio','Terreno Alterato']}),['Soffio','Terreno Alterato']);r=h.moves.resolve(install(h,t));assert.equal(r.status,'ready',errorText(r));assert.ok(r.conditions.some(c=>/Ciò che Resta: durata 3 turni/.test(c.text)));
 t.durata='3 turni';const expected=evaluate(h,t).cost.st;assert.equal(expected,2);h.context.pg.talents=h.context.pg.talents.filter(k=>!k.endsWith('Ciò che Resta'));assert.equal(evaluate(h,t).cost.st,expected+2);
});

test('Already active Forma Perduta blocks Style attacks as well as Fruit attacks, but does not block merely recording its later activation',()=>{
 const h=setup();fruit(h,'Logia','d12');const t=draft(h,{fonte:'Stile',stile:'Striker',fruitType:''}),card=install(h,t);h.context.pg.frutto.formaPerduta=true;let r=h.moves.resolve(card);assert.equal(r.status,'unavailable');assert.match(r.unavailable.join(' '),/Forma Perduta già attiva/);h.context.pg.frutto.formaPerduta=false;assert.equal(h.moves.resolve(card).status,'ready');
});

test('Malformed and duplicate natural records remain readable without granting virtual weapons or mutating the raw imports',()=>{
 for(const value of [{old:'record'},[null],['raw'],[{id:'same'},{id:'same'}]]){const h=setup();fruit(h);own(h,'Artigli e Zanne');h.context.pg.frutto.armiNaturali=value;const before=JSON.stringify(h.context.pg);freeze(h.context.pg);assert.doesNotThrow(()=>h.context.GLCFruits.dossier(h.context.pg));assert.equal(h.context.GLCFruits.arsenal(h.context.pg).length,0);assert.equal(JSON.stringify(h.context.pg),before);}
});

test('Fruit write-first updates preserve unknown container fields and aborted storage never mutates character, selects or refresh flow',()=>{
 const h=setup(),c=h.context;fruit(h);c.CT={activeId:'test',chars:{test:c.pg},future:{keep:12}};c.KEY='glc_pirata_v4';let data='',alerts=[],renders=0,refreshes=0;c.document={querySelector:()=>null};c.alert=m=>alerts.push(m);c.localStorage={setItem:(key,value)=>{data=value;}};c.renderManage=()=>renders++;c.render=()=>renders++;c.refreshModal=()=>refreshes++;
 const block=html.slice(html.indexOf('function fruitChange('),html.indexOf('function fruitText('));vm.runInContext(block,c);assert.equal(c.fruitWrite('identita.nucleo','Nucleo registrato'),true);assert.equal(JSON.parse(data).future.keep,12);assert.equal(c.pg.frutto.unknown.version,31);
 const before=JSON.stringify(c.pg),oldCT=JSON.stringify(c.CT);c.localStorage.setItem=()=>{throw Error('Quota exceeded');};assert.equal(c.fruitRefresh(()=>c.fruitWrite('die','d12')),false);assert.equal(c.fruitRefresh(()=>c.fruitWrite('esaurito',true)),false);assert.equal(c.fruitRefresh(()=>c.fruitChange(f=>f.armiNaturali.push({id:'extra'}))),false);assert.equal(JSON.stringify(c.pg),before);assert.equal(JSON.stringify(c.CT),oldCT);assert.equal(renders,0);assert.equal(refreshes,3);assert.equal(alerts.length,3);
});

test('Combined historical Retaggio migration follows only the recorded category and retains unresolved ownership',()=>{
 const block=html.slice(html.indexOf('function migrateChar('),html.indexOf('function ',html.indexOf('function migrateChar(')+20));assert.ok(block.includes('zoanType||f.subtipo||f.tipoZoan'));assert.ok(!/mitolog\/i\.test\(f\)/.test(block));
 const map=block.match(/\.map\(function\(k\)\{var p=String\(k\)\.split\(" · "\);if\(p\[p.length-1\]!=="Retaggio Ancestrale \/ Mitologico"\)[\s\S]+?\}\)/);assert.ok(map);const key='Frutto · Zoan · Retaggio Ancestrale / Mitologico';const context=vm.createContext({c:{frutto:{nome:'Fenice',zoanType:'Mitologico'}}});assert.equal(vm.runInContext(JSON.stringify([key])+map[0],context)[0],'Frutto · Zoan · Retaggio Mitologico');context.c.frutto={nome:'Mitologico ma categoria non registrata'};assert.equal(vm.runInContext(JSON.stringify([key])+map[0],context)[0],key);
});

test('Changing the recorded Forma di Combattimento project invalidates old GM cost metadata, preserves the card ID and never parses a free-form cost',()=>{
 const h=setup();fruit(h,'Paramecia','d12');own(h,'Forma di Combattimento');h.context.pg.frutto.formaCombattimento={nome:'Corpo di Cera',manifestazione:'Corpo compatto',beneficio:'Protezione concordata',costoAttivazione:'2 ST',mantenimento:'1 ST/turno',durata:'Scena',limitazioni:'Niente emissione',future:{keep:true}};
 const t=draft(h),card={...install(h,t),id:'forma-card',activeTalentId:'glc-talent-233'},source=h.moves.sources().find(s=>s.id===card.activeTalentId);
 h.context.pg.specialMoveSourceCosts={[source.id]:{st:2,pip:0,maintenanceST:1,maintenancePIP:0,resource:0,basis:h.moves.costBasis(source),gmNote:'Approvazione precedente'}};h.context.pg.specialMoves=[clone(card)];
 let r=h.moves.resolve(card);assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,2);assert.match(source.desc,/Costo di attivazione: 2 ST/);assert.match(source.desc,/Costo di mantenimento: 1 ST\/turno/);
 const previousMetadata=JSON.stringify(h.context.pg.specialMoveSourceCosts),previousCard=JSON.stringify(h.context.pg.specialMoves);h.context.pg.frutto.formaCombattimento.costoAttivazione='5 ST dopo verifica del GM';r=h.moves.resolve(card);
 assert.equal(r.status,'costs');assert.equal(r.totals,null);assert.equal(r.move.id,'forma-card');assert.equal(r.move.activeTalentId,source.id);assert.equal(JSON.stringify(h.context.pg.specialMoveSourceCosts),previousMetadata);assert.equal(JSON.stringify(h.context.pg.specialMoves),previousCard);assert.equal(h.context.pg.frutto.formaCombattimento.future.keep,true);
 const current=h.moves.sources().find(s=>s.id===source.id);assert.match(current.desc,/5 ST dopo verifica del GM/);assert.notEqual(h.moves.costBasis(current),sourceCostBasis(source));
 // Even after the explicit metadata is recorded again, its numeric cost is the
 // value supplied there, rather than a number parsed from the project text.
 h.context.pg.specialMoveSourceCosts[source.id]={...h.context.pg.specialMoveSourceCosts[source.id],st:4,basis:h.moves.costBasis(current)};r=h.moves.resolve(card);assert.equal(r.status,'ready',errorText(r));assert.equal(r.totals.st,4);
 function sourceCostBasis(s){return h.moves.costBasis(s);}
});
