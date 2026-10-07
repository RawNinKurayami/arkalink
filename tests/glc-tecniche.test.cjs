const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const rules=require('../regole/tecniche.js');
const context=vm.createContext({});
for(const name of ['TEC_EFF','TEC_EFF_ARCHIVIATI','TEC_SLOT','TEC_DADI','TEC_DUR','STILE_WHITELIST']){
 const start=html.indexOf('const '+name+'='),end=html.indexOf(';',start)+1;
 // Catalogue descriptions can contain semicolons; their declarations end at ];.
 const text=['TEC_EFF','TEC_EFF_ARCHIVIATI'].includes(name)?html.slice(start,html.indexOf('\n];',start)+3):html.slice(start,end);
 vm.runInContext(text+'\nglobalThis.'+name+'='+name+';',context);
}
const catalogue=JSON.parse(JSON.stringify(context.TEC_EFF)),whitelist=JSON.parse(JSON.stringify(context.STILE_WHITELIST));
const opts={catalogue,whitelist};
const weapon=(tipo='Lama',other={})=>({id:'weapon-one',nome:'Arma',tipo,attr:'Forza',grado:'d8',portata:'5 m',...other});
function pirate(style='Striker'){
 const types={Swordsman:'Lama',Crusher:'Contundente',Sniper:'A distanza'};
 return {role:'Combattente',style,attr:{Forza:'d20',Tecnica:'d20',Astuzia:'d20',Spirito:'d20'},armi:types[style]?[weapon(types[style])]:[],moduli:[],talents:[],frutto:{has:false},race:'umano'};
}
function tech(style='Striker',other={}){return {id:'saved',nome:'Tecnica',fonte:'Stile',stile:style,attr:'Forza',die:'d8',forma:'Singolo',durata:'Un turno',arma:style==='Striker'?'':'weapon-one',eff:[],...other};}
const evaluate=(p,t,more={})=>rules.evaluate(p,t,{...opts,...more});
const errorCodes=r=>r.errors.map(e=>e.code);
function grant(p,t,names){t.sourcePermission={key:rules.sourceKey(p,t),basis:'Concessione esplicita della Scheda verificata con il GM',effects:names};return t;}

test('The selectable catalogue matches the 17 ordinary manual entries and each style',()=>{
 const expected={Striker:['Sbilancio','Presa','Sfondamento','Proiezione','Scatto','Balzo','Guardia','Furia','Schianto'],Swordsman:['Lacerazione','Scatto','Balzo','Guardia','Mira','Tutto o Niente','Area Ravvicinata','Catena'],Sniper:['Scatto','Lacerazione','Mira','Rimbalzo','Catena'],Crusher:['Sbilancio','Sfondamento','Proiezione','Guardia',"Scudo d'Alleato",'Furia','Schianto','Carica','Area Ravvicinata']};
 assert.deepEqual(whitelist,expected);assert.equal(new Set(Object.values(whitelist).flat()).size,17);
 const retired=['+1d6 Dado Danno','+1d8 Dado Danno','+1d10 Dado Danno','Contrattacco','Parata','Veleno','Slancio','Tempra','Oltre il Limite','Inseguire','Strattone','Scambio','Aggancio','Colpo Pesante','Sovraccarico','Colpo Annientante'];
 for(const name of retired){assert.ok(!catalogue.some(e=>e[1]===name),name);assert.ok(context.TEC_EFF_ARCHIVIATI.some(e=>e[1]===name),name);}
});

test('All four ordinary styles enforce their effect permissions even on forged saved profiles',()=>{
 for(const style of Object.keys(whitelist))for(const name of new Set(Object.values(whitelist).flat())){
  const effect=catalogue.find(e=>e[1]===name),forma=effect[0]==='Area'?'Area':['Difesa','Potenziamento'].includes(effect[0])?effect[0]:'Singolo';
  const p=pirate(style),t=tech(style,{die:'d20',forma,eff:[name]});
  const r=evaluate(p,t);
  assert.equal(r.valid,whitelist[style].includes(name),style+': '+name+' '+JSON.stringify(r.errors));
 }
});

test('Swordsman, Crusher and Sniper require a compatible weapon, including both polearm modes',()=>{
 for(const [style,wrong] of [['Swordsman','Contundente'],['Crusher','Lama'],['Sniper','Lama']]){
  const p=pirate(style),t=tech(style);assert.equal(evaluate(p,t).valid,true);
  p.armi=[];assert.ok(errorCodes(evaluate(p,t)).includes('weapon-required'));
  p.armi=[weapon(wrong)];assert.ok(errorCodes(evaluate(p,t)).includes('weapon-required'));
 }
 assert.equal(rules.compatibleWeapon(weapon('Ad asta',{asta:'Tagliente'}),'Swordsman'),true);
 assert.equal(rules.compatibleWeapon(weapon('Ad asta',{asta:'Contundente'}),'Crusher'),true);
 assert.equal(rules.compatibleWeapon(weapon('Ad asta',{asta:'Contundente'}),'Swordsman'),false);
 assert.equal(rules.compatibleWeapon(weapon('Da lancio'),'Sniper'),true);
});

test('Owning another compatible style or a Cyborg module never substitutes for the required weapon',()=>{
 const p=pirate('Crusher');p.role2='Combattente';p.style2='Swordsman';p.armi=[weapon('Lama')];p.race='cyborg';p.moduli=[{id:'module-one'}];
 assert.ok(errorCodes(evaluate(p,tech('Crusher',{arma:'',modulo:'module-one'}))).includes('weapon-required'));
 const q=pirate();q.armi=[weapon()];assert.ok(errorCodes(evaluate(q,tech('Striker',{arma:'weapon-one'}))).includes('unarmed'));
});

test('Removing or changing the linked weapon invalidates the profile without clearing it',()=>{
 const p=pirate('Swordsman'),t=tech('Swordsman'),before=JSON.stringify(t);
 p.armi[0].tipo='Contundente';assert.equal(evaluate(p,t).valid,false);assert.equal(JSON.stringify(t),before);
 p.armi=[];assert.ok(errorCodes(evaluate(p,t)).includes('weapon-missing'));assert.equal(JSON.stringify(t),before);
 p.armi=[weapon(),weapon('Contundente',{id:'other'})];t.arma='other';assert.ok(errorCodes(evaluate(p,t)).includes('weapon-style'));
});

test('A linked weapon requires its own Forza/Tecnica and actual grade, without capping the Technique to weapon grade',()=>{
 const p=pirate('Swordsman'),t=tech('Swordsman',{attr:'Tecnica',die:'d12'});p.attr.Forza='d6';p.attr.Tecnica='d20';p.armi[0].grado='d12';
 let r=evaluate(p,t);assert.ok(errorCodes(r).includes('weapon-requirements'));assert.match(r.errors.find(e=>e.code==='weapon-requirements').text,/Forza almeno d12/);
 p.attr.Forza='d12';assert.equal(evaluate(p,t).valid,true);
 p.armi[0].attr='';assert.ok(errorCodes(evaluate(p,t)).includes('weapon-requirements'));
 p.armi[0].attr='Spirito';assert.ok(errorCodes(evaluate(p,t)).includes('weapon-requirements'));
 p.armi[0].attr='Tecnica';p.armi[0].grado='d20+d4';assert.ok(errorCodes(evaluate(p,t)).includes('weapon-requirements'));
 p.armi[0].grado='d4';assert.equal(evaluate(p,t).valid,true);assert.equal(t.die,'d12');
 p.armi[0].grado='d20';p.attr.Tecnica='d20+d4';assert.equal(evaluate(p,t).valid,true);
});

test('Ordinary d4/d6 have zero slots; d8/d10 two, d12 three, d20 four and Prestige does not extend Techniques',()=>{
 const p=pirate();
 for(const [die,slot] of [['d4',0],['d6',0],['d8',2],['d10',2],['d12',3],['d20',4]]){
  assert.equal(evaluate(p,tech('Striker',{die})).slot,slot);
  if(slot===0)assert.ok(errorCodes(evaluate(p,tech('Striker',{die,eff:['Scatto']}))).includes('slots'));
 }
 p.attr.Forza='d20+d20';assert.equal(evaluate(p,tech('Striker',{die:'d20'})).valid,true);
 assert.ok(errorCodes(evaluate(p,tech('Striker',{die:'d20+d4'}))).includes('grade'));
 p.attr.Forza='d8';const t=tech('Striker',{die:'d20',eff:['Scatto']}),before=JSON.stringify([p,t]);
 assert.ok(errorCodes(evaluate(p,t)).includes('grade-cap'));assert.equal(JSON.stringify([p,t]),before);
});

test('Projection plus collision costs 3 ST, uses two slots and Presa maintains for 1 ST per turn',()=>{
 assert.deepEqual(evaluate(pirate(),tech('Striker',{eff:['Proiezione','Schianto']})).cost,{st:3,pt:0});
 const r=evaluate(pirate(),tech('Striker',{eff:['Proiezione','Schianto']}));assert.equal(r.used,2);assert.equal(r.valid,true);
 assert.deepEqual(evaluate(pirate(),tech('Striker',{eff:['Presa']})).cost,{st:1,pt:1});
 assert.deepEqual(evaluate(pirate(),tech()).cost,{st:0,pt:0});
});

test('Guardia versions enforce their grades, use one slot and replace rather than add',()=>{
 const p=pirate();
 for(const [name,die,st,dp] of [['Guardia','d8',1,2],['Guardia Migliorata','d10',2,3],['Guardia Maestria','d12',3,4],['Guardia Suprema','d20',4,5]]){
  const r=evaluate(p,tech('Striker',{die,forma:'Difesa',eff:[name]}));assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.used,1);assert.equal(r.cost.st,st);
  assert.match(catalogue.find(e=>e[1]===name)[2],new RegExp('\\+'+dp+' DP'));assert.match(catalogue.find(e=>e[1]===name)[2],/inizio del tuo prossimo turno/);
  if(die!=='d8')assert.ok(errorCodes(evaluate(p,tech('Striker',{forma:'Difesa',eff:[name]}))).includes('effect'));
 }
 assert.ok(errorCodes(evaluate(p,tech('Striker',{die:'d20',forma:'Difesa',eff:['Guardia','Guardia Suprema']}))).includes('family'));
});

test('Furia and Mira keep 3 ST, a main Action and the corrected damage/advantage effects',()=>{
 assert.deepEqual(evaluate(pirate(),tech('Striker',{forma:'Potenziamento',eff:['Furia']})).cost,{st:3,pt:0});
 assert.match(catalogue.find(e=>e[1]==='Furia')[2],/DP −1/);assert.match(catalogue.find(e=>e[1]==='Furia')[2],/massimo d20/);
 assert.match(catalogue.find(e=>e[1]==='Mira')[2],/Vantaggio ai tiri per colpire/);
 assert.ok(errorCodes(evaluate(pirate(),tech('Striker',{eff:['Furia']}))).includes('effect'));
});

test('Area Ravvicinata is a zero-slot, d8, 2 ST self-centered shape with weapon reach and no Gittata',()=>{
 for(const style of ['Swordsman','Crusher']){
  const p=pirate(style),t=tech(style,{forma:'Area',eff:['Area Ravvicinata']});const r=evaluate(p,t);
  assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.used,0);assert.equal(r.cost.st,2);assert.equal(r.weapon.portata,'5 m');
  grant(p,t,['Gittata Corta']);t.eff.push('Gittata Corta');assert.ok(evaluate(p,t).errors.some(e=>e.effect==='Gittata Corta'));
 }
 for(const style of ['Striker','Sniper'])assert.ok(!evaluate(pirate(style),tech(style)).forms.includes('Area'));
 assert.ok(errorCodes(evaluate(pirate('Crusher'),tech('Crusher',{die:'d6',forma:'Area',eff:['Area Ravvicinata']}))).includes('effect'));
});

test('Fruit and explicit equipment concessions grant named profiles while the real source identity stays bound',()=>{
 const p=pirate(),t=tech('Striker',{fonte:'Frutto',fruitType:'Paramecia',eff:['Accecante']});p.frutto={has:true,tipo:'Paramecia',nome:'Luce',desc:'Emette luce',die:'d12'};
 assert.equal(evaluate(p,t).valid,false);grant(p,t,['Accecante']);assert.equal(evaluate(p,t).valid,true);
 t.eff=['Paralisi'];t.die='d12';assert.equal(evaluate(p,t).valid,false);
 t.eff=['Accecante'];p.frutto.nome='Altro Frutto';assert.equal(evaluate(p,t).valid,false);
 const q=pirate('Swordsman'),u=tech('Swordsman',{eff:['Barriera'],forma:'Difesa'});assert.equal(evaluate(q,u).valid,false);grant(q,u,['Barriera']);assert.equal(evaluate(q,u).valid,true);
 q.armi[0].eff={nome:'Nuovo effetto'};assert.equal(evaluate(q,u).valid,false);
});

test('Every Role can construct a real Fruit Technique; only Style Techniques require a Combattente Role',()=>{
 const p=pirate();p.role='Cuoco';p.style='Cuoco';p.armi=[];p.frutto={has:true,tipo:'Paramecia',nome:'Cera',desc:'Produce cera solida',die:'d10'};
 const t=tech('',{fonte:'Frutto',fruitType:'Paramecia',arma:'',die:'d10',forma:'Difesa',eff:['Barriera']});grant(p,t,['Barriera']);
 const result=evaluate(p,t);assert.equal(result.valid,true,JSON.stringify(result.errors));assert.equal(result.slot,2);assert.equal(result.cap,4);
 t.die='d12';assert.ok(errorCodes(evaluate(p,t)).includes('grade-cap'));
 t.die='d10';p.attr.Forza='d8';assert.ok(errorCodes(evaluate(p,t)).includes('grade-cap'));
 assert.ok(errorCodes(evaluate(p,tech())).includes('combat-role'));
 p.role='Musicista';p.style='Musicista';p.attr.Forza='d20';assert.equal(evaluate(p,t).valid,true);
 const c=builderFixture();c.pg=p;c.tbEdit(t);assert.ok(c.tbCompute().forme.includes('Difesa'));assert.ok(c.tbCompute().forme.includes('Singolo'));assert.equal(c.tbCompute().soloCanzone,false);
});

test('A special Zoan may use only its expressly granted Area, and its grade still respects the Fruit',()=>{
 const p=pirate(),t=tech('Striker',{fonte:'Frutto',fruitType:'Zoan',forma:'Area',die:'d6',eff:['Soffio']});p.frutto={has:true,tipo:'Zoan',nome:'Drago mitologico',desc:'Retaggio del fuoco',die:'d8'};
 assert.equal(evaluate(p,t).valid,false);grant(p,t,['Soffio']);const r=evaluate(p,t);assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.used,0);assert.equal(r.cost.st,0);
 t.die='d10';assert.ok(errorCodes(evaluate(p,t)).includes('grade-cap'));
 t.fruitType='Logia';assert.ok(errorCodes(evaluate(p,t)).includes('fruit-type'));
});

test('Persistent zones need an authorized shape, one family effect and d20 for the scene',()=>{
 const p=pirate(),t=tech('Striker',{fonte:'Frutto',fruitType:'Logia',forma:'Area',die:'d12',eff:['Scoppio','Terreno Alterato Lv2'],durata:'3 turni'});p.frutto={has:true,tipo:'Logia',nome:'Fiamme',desc:'Fiamme persistenti',die:'d20'};grant(p,t,['Scoppio','Terreno Alterato Lv2','Terreno Alterato Lv3']);
 assert.equal(evaluate(p,t).valid,true);assert.deepEqual(evaluate(p,t).cost,{st:6,pt:0});
 t.durata='Tutta la scena';assert.ok(errorCodes(evaluate(p,t)).includes('duration-grade'));t.die='d20';assert.equal(evaluate(p,t).valid,true);
 t.eff.push('Terreno Alterato Lv3');assert.ok(errorCodes(evaluate(p,t)).includes('family'));
 t.eff=['Scoppio'];assert.ok(errorCodes(evaluate(p,t)).includes('persistence'));
});

test('Nessuno dei Miei removes only Occhio del Ciclone grade/slot/ST, without granting an Area',()=>{
 const p=pirate(),t=tech('Striker',{fonte:'Frutto',fruitType:'Paramecia',forma:'Area',die:'d6',eff:['Soffio','Occhio del Ciclone']});p.frutto={has:true,tipo:'Paramecia',nome:'Suono',desc:'Cono sonoro',die:'d12'};grant(p,t,['Soffio']);
 assert.equal(evaluate(p,t).valid,false);const r=evaluate(p,t,{nessunoDeiMiei:true});assert.equal(r.valid,true,JSON.stringify(r.errors));assert.equal(r.used,0);assert.equal(r.cost.st,0);
 t.sourcePermission.effects=[];assert.equal(evaluate(p,t,{nessunoDeiMiei:true}).valid,false);
});

test('Punto di Rottura is a conditional Prestige exception and never invents a saving throw',()=>{
 const p=pirate(),t=tech('Striker',{attr:'Tecnica',eff:['Punto di Rottura']});assert.equal(evaluate(p,t).valid,false);assert.equal(evaluate(p,t,{precisioneAssoluta:true}).valid,true);
 for(const patch of [{attr:'Forza'},{forma:'Difesa'},{stile:'Crusher'}])assert.equal(evaluate(p,{...t,...patch},{precisioneAssoluta:true}).valid,false);
 assert.doesNotMatch(catalogue.find(e=>e[1]==='Punto di Rottura')[2],/Salvezza/);
});

test('Technique states derive numeric saves from the Technique while Presa and bleeding retain their exceptions',()=>{
 for(const [die,threshold] of [['d4',3],['d6',4],['d8',5],['d10',6],['d12',7],['d20',11]]){
  const states=rules.states(tech('Striker',{die,eff:['Sbilancio','Sfondamento','Terrore','Paralisi','Lacerazione','Presa']}));
  assert.deepEqual(states.slice(0,4).map(x=>[x.attribute,x.threshold]),[['Tecnica',threshold],['Forza',threshold],['Spirito',threshold],['Forza',threshold]]);
  assert.equal(states[4].threshold,null);assert.match(states[4].procedure,/Nessuna Salvezza/);
  assert.equal(states[5].threshold,null);assert.match(states[5].procedure,/Contesa di Forza/);
 }
 assert.equal(rules.states(tech('Striker',{eff:['Punto di Rottura']})).length,0);
 const t=tech('',{forma:'Canzone',die:'d20',eff:['Ninnananna']});
 assert.equal(rules.states(t)[0].threshold,null);assert.equal(rules.states(t,{songSaveDie:'d8'})[0].threshold,5);
});

test('Musicista uses one Melody, requires acquired exclusive Talents, and does not become a combat style',()=>{
 const p=pirate();p.role='Musicista';p.style='Musicista';const t=tech('',{forma:'Canzone',die:'d6',arma:'',eff:['Richiamo']});
 assert.equal(evaluate(p,t).valid,true);assert.equal(evaluate(p,t).slot,1);
 assert.equal(evaluate(p,tech()).valid,false);t.eff.push('Marcia di Guerra');assert.equal(evaluate(p,t).valid,false);
 t.eff=['Marcia Funebre'];t.die='d12';assert.equal(evaluate(p,t).valid,false);p.talents=['Musicista · Musicista · Marcia Funebre'];assert.equal(evaluate(p,t).valid,true);
 assert.equal(evaluate(p,t,{hasTalent:()=>false}).valid,false);
 t.eff=["Canzone dell'Anima"];t.die='d20';assert.equal(evaluate(p,t).valid,false);
});

test('Read-only validation preserves legacy unknown and retired effects, bad dice and missing links',()=>{
 const p=pirate('Swordsman'),t=tech('Swordsman',{die:'d20+d20',arma:'deleted',eff:['+1d6 Dado Danno','Sconosciuto','Parata']}),before=JSON.stringify([p,t]);
 const r=evaluate(p,t);assert.equal(r.valid,false);assert.equal(r.errors.filter(e=>e.code==='effect').length,3);assert.equal(JSON.stringify([p,t]),before);
});

function builderFixture(){
 const c=vm.createContext({window:{GLCPrestige:{has:()=>false}},GLCPrestige:{has:()=>false},GLCTechniques:rules,pg:pirate(),console,
  styleReady:style=>style==='Striker'||c.pg.armi.some(a=>rules.compatibleWeapon(a,style)),stileBlock:()=>'',fruttoBlock:()=>'',
  DICE:['d4','d6','d8','d10','d12','d20'],isCombattente:()=>true,
  hasTalent:name=>(c.pg.talents||[]).some(k=>k.split(' · ').pop()===name)});
 vm.runInContext(html.slice(html.indexOf('const TEC_FONTI='),html.indexOf('/* ==========================================================================',html.indexOf('function tbReset'))),c);
 // Replace globals supplied by the normal character UI only where needed.
 vm.runInContext('let SMBD={};'+html.slice(html.indexOf('function tbRules(){'),html.indexOf('/* ---- 01 · Identità ---- */')),c);
 vm.runInContext(html.slice(html.indexOf('function smbSave(){'),html.indexOf('function builderModal(){')),c);
 return c;
}
test('The actual Builder neither discards stale effects nor lowers a saved die and blocks saving the forged profile',()=>{
 const c=builderFixture();c.pg.attr.Forza='d8';const t=tech('Striker',{die:'d20',eff:['+1d6 Dado Danno','Scatto']});
 c.tbEdit(t);const before=JSON.stringify(t);const result=c.tbCompute();
 assert.equal(result.stato.s,'ko');assert.equal(vm.runInContext('TBUILD.die',c),'d20');assert.deepEqual(Array.from(vm.runInContext('TBUILD.eff',c)),t.eff);assert.ok(c.smbSave());assert.equal(JSON.stringify(t),before);
});
test('The actual Builder enforces weapon requirements on Save even if navigation is bypassed',()=>{
 const c=builderFixture();c.pg=pirate('Crusher');c.pg.armi=[];c.tbEdit(tech('Crusher'));
 assert.equal(c.tbCompute().stato.s,'ko');assert.match(c.smbSave().msg,/arma compatibile/);
 c.pg=pirate('Sniper');c.tbEdit(tech('Sniper',{eff:['Sfondamento']}));assert.equal(c.tbCompute().stato.s,'ko');assert.ok(c.smbSave());
});

test('Legacy conversion preserves the original and PA history on cancel and failed validation',()=>{
 const c=builderFixture();c.pg.t1={nome:'Oni Giri storico',attr:'Forza',die:'d20+d4',desc:'Testo originale',smcId:'old-one'};c.pg.extraTech=[];c.pg.pa={'tec:t1':42};
 const before=JSON.stringify(c.pg);c.tbEditLegacy('t1');
 assert.equal(vm.runInContext('TBUILD._id',c),'old-one');assert.equal(vm.runInContext('TBUILD.fonte',c),'');assert.equal(vm.runInContext('TBUILD.stile',c),'');
 assert.ok(c.smbSave());assert.equal(JSON.stringify(c.pg),before);
 c.tbReset();assert.equal(JSON.stringify(c.pg),before);
});

test('A valid legacy conversion keeps Special Move identity, archives data and PA, and removes the duplicate only after Save',()=>{
 const c=builderFixture();Object.assign(c,{closeBuilder:()=>{},flyIn:()=>{},dieIcon:()=>'',byText:()=>{}});
 c.pg.t1={nome:'Pugno storico',attr:'Forza',die:'d4',desc:'Appunti storici',smcId:'old-one'};c.pg.extraTech=[];c.pg.pa={'tec:t1':42,'attr:Forza':3};
 const original=JSON.stringify(c.pg.t1);c.tbEditLegacy('t1');vm.runInContext('TBUILD.fonte="Stile";TBUILD.stile="Striker";',c);
 assert.equal(c.smbSave(),null);assert.equal(c.pg.t1.nome,'');assert.equal(c.pg.extraTech.length,1);assert.equal(c.pg.extraTech[0].id,'old-one');
 assert.equal(c.pg.extraTech[0].desc,'Appunti storici');assert.equal(c.pg.legacyTechArchive.t1.nome,JSON.parse(original).nome);
 assert.equal(c.pg.legacyTechArchive.t1.paHistory['tec:t1'],42);assert.equal(c.pg.pa['tec:t1'],42);assert.equal(c.pg.pa['attr:Forza'],3);
 // A repeated or imported conversion must not overwrite an existing built profile.
 c.pg.t2={nome:'Altro storico',attr:'Forza',die:'d4',desc:'Conserva',smcId:'old-one'};const before=JSON.stringify(c.pg);c.tbEditLegacy('t2');vm.runInContext('TBUILD.fonte="Stile";TBUILD.stile="Striker";',c);
 assert.match(c.smbSave().msg,/identificativo/);assert.equal(JSON.stringify(c.pg),before);
});

test('Legacy custom Technique progression cannot invoke the old PA or global-die setter',()=>{
 const c=builderFixture();c.pg.t1={nome:'T1',attr:'Forza',die:'d4'};c.pg.t2={nome:'T2',attr:'Forza',die:'d6'};c.pg.extraTech=[tech()];c.pg.racialDie='d6';
 vm.runInContext(html.match(/^function setTechDie[^\n]+/m)[0],c);const before=JSON.stringify([c.pg.t1,c.pg.t2,c.pg.extraTech]);
 c.setTechDie({k:'t1'},'d20+d20');c.setTechDie({k:'t2'},'d12');c.setTechDie({idx:0},'d20+d4');assert.equal(JSON.stringify([c.pg.t1,c.pg.t2,c.pg.extraTech]),before);
 c.setTechDie({k:'racial'},'d8');assert.equal(c.pg.racialDie,'d8');
 const modal=html.slice(html.indexOf('function techModal(t){'),html.indexOf('/* Collegamenti della Tecnica',html.indexOf('function techModal(t){')));
 let paCalls=0,dieCalls=0;
 c.el=(tag,props={},kids=[])=>({tag,props,kids,appendChild(child){this.kids.push(child);return child;}});
 c.field=(label,value)=>c.el('input',{label,value});c.openModal=(title,render)=>render();c.paRowM=()=>{paCalls++;return c.el('pa');};c.stepper=()=>{dieCalls++;return c.el('die');};
 vm.runInContext(modal,c);c.techModal({k:'t1',name:'T1',fixed:false});c.techModal({k:'t2',name:'T2',fixed:false});
 assert.equal(paCalls,0);assert.equal(dieCalls,0);
});
