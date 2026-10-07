const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const main=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const sheet=fs.readFileSync(path.join(root,'scheda-stampabile/index.html'),'utf8');
const creator=fs.readFileSync(path.join(root,'crea-il-tuo-pirata/index.html'),'utf8');

function declaration(source,startMarker,endMarker){
 const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
 assert.ok(start>=0&&end>start,'Declaration boundaries: '+startMarker);
 return source.slice(start,end+endMarker.length);
}
function races(){
 const context=vm.createContext({});
 vm.runInContext(declaration(main,'const RACES=','\n];')+'\nglobalThis.mainRaces=RACES;',context);
 vm.runInContext('(function(){'+declaration(sheet,'var RACES=','\n  };')+'\nglobalThis.printRaces=RACES;})();',context);
 vm.runInContext('(function(){'+declaration(creator,'var RACES=','\n];')+'\nglobalThis.creatorRaces=RACES;})();',context);
 return JSON.parse(JSON.stringify({main:context.mainRaces,print:context.printRaces,creator:context.creatorRaces}));
}
function fill(race,payload=false,overrides={},payloadOverrides={}){
 const character={race,nome:'Stampa di prova',role:'Combattente',style:'Striker',roleSkillDie:'d8',roleSkillChoice:'Atletica',attr:{Forza:'d8',Tecnica:'d8',Spirito:'d8',Astuzia:'d8'},skills:{},talents:[],extraTech:[],armi:[],strumeni:[],moduli:[],haki:[],bonds:[],frutto:{has:false},...overrides};
 const nodes={},listeners={},cells={},appendix=[],storage={glc_pirata_v4:JSON.stringify({activeId:'test',chars:{test:character}})};
 if(payload)storage.glc_print_v1=JSON.stringify({charId:'test',difesa:9,talenti:[],tratti:[],tecniche:[],moduli:[],strumenti:[],armi:[],haki:[],...payloadOverrides});
 const basePage={style:{}},wrap={querySelector:()=>basePage,appendChild:n=>appendix.push(n)};basePage.parentNode=wrap;
 const document={getElementById:id=>nodes[id]??={textContent:'',style:{}},querySelector:selector=>selector==='.page'?basePage:selector.startsWith('.tcell')?(cells[selector]??={textContent:''}):null,
  createElement:()=>({style:{},setAttribute(){},innerHTML:''}),addEventListener:(event,callback)=>{listeners[event]=callback;}};
 const context=vm.createContext({window:{},document,location:{search:'?c=test'},localStorage:{getItem:key=>storage[key]||null},URLSearchParams});
 for(const file of ['tratti-data.js','tratti.js','frutti.js'])vm.runInContext(fs.readFileSync(path.join(root,'regole',file),'utf8'),context);
 context.GLCTratti=context.window.GLCTratti;context.GLCFruits=context.window.GLCFruits;
 const inline=sheet.match(/<script>\s*([\s\S]+?)<\/script>/);
 assert.ok(inline,'Live illustrated print renderer');vm.runInContext(inline[1],context);listeners.DOMContentLoaded();
 nodes._appendix=appendix;nodes._cells=cells;return nodes;
}

test('The illustrated print sheet shares every racial description and base resource with the live manager',()=>{
 const data=races();assert.equal(data.main.length,7);assert.deepEqual(Object.keys(data.print).sort(),data.main.map(r=>r.id).sort());
 for(const race of data.main)for(const field of ['name','hp','pv','tech','techDesc'])assert.equal(data.print[race.id][field],race[field],race.id+' '+field);
 assert.deepEqual(data.creator,data.main,'The separate creator uses the same seven current racial sheets');
});

test('Raw and payload-backed sheets actually render the updated racial summaries, without the obsolete invented effects',()=>{
 const data=races();
 for(const race of data.main)for(const payload of [false,true]){
  const nodes=fill(race.id,payload);assert.equal(nodes['f-rtech-nome'].textContent,race.tech);assert.equal(nodes['f-rtech-eff'].textContent,race.techDesc);assert.equal(nodes['f-dadovita'].textContent,race.hp);assert.equal(nodes['f-pvmax'].textContent,String(race.pv));
 }
 const mink=fill('mink')['f-rtech-eff'].textContent;
 assert.match(mink,/Salvezza di Forza ogni turno contro la Soglia fissata dal suo Grado/);assert.match(mink,/1 ST fino a d8, 2 ST a d10 e d12, 3 ST a d20/);assert.match(mink,/un combattimento/);assert.match(mink,/al termine ST 0/);assert.doesNotMatch(mink,/per una scena/);
 const lunarian=fill('lunarian')['f-rtech-eff'].textContent;
 assert.match(lunarian,/Fiamma ON: Svantaggio al tiro per colpire/);assert.match(lunarian,/riduci il primo danno fisico del round con il Dado Razziale/);assert.match(lunarian,/OFF: −2 Difesa Passiva/);assert.match(lunarian,/aggiungi il Dado Razziale al tiro per colpire/);assert.doesNotMatch(lunarian,/dado in resistenza|bonus evasione/);
 const tontatta=fill('tontatta')['f-rtech-eff'].textContent;
 assert.match(tontatta,/il primo attacco di ciascun nemico/);
});

test('Removed races remain readable as historical characters in raw and payload-backed print, without conversion',()=>{
 for(const [race,grade,name,movement]of [['longbraccio','d12','Portata Estesa','10 m'],['longbraccia','d10','Portata Estesa','10 m'],['lungagamba','d20','Calcio Colossale','16 m']])for(const payload of [false,true]){
  const nodes=fill(race,payload,{racialDie:grade,pvMax:31,pvCur:17,note:'Nota conservata.'});
  assert.match(nodes['f-razza'].textContent,/Razza storica/);assert.equal(nodes['f-rtech-nome'].textContent,name);assert.equal(nodes['f-move'].textContent,movement);assert.equal(nodes['f-pvmax'].textContent,'31');assert.equal(nodes['f-pvcur'].textContent,'17');
  assert.equal(nodes._cells['.tcell[data-trow="0"][data-tcol="dado"]'].textContent,grade);
  assert.equal(nodes._cells['.tcell[data-trow="0"][data-tcol="tipo"]'].textContent,'Razziale storica · archivio');
  assert.match(nodes._appendix.map(n=>n.innerHTML).join(''),/Razza storica rimossa dal regolamento corrente/);
 }
});

test('Printed DP uses every ordinary and Prestige Attribute die, independent of stale print payloads',()=>{
 for(const [die,expected]of [['d4',5],['d6',7],['d8',9],['d10',11],['d12',13],['d20',21],['d20+d4',25],['d20+d6',27],['d20+d8',29],['d20+d10',31],['d20+d12',33],['d20+d20',41]])for(const payload of [false,true]){
  const nodes=fill('umano',payload,{umanoAttr:'Spirito',attr:{Forza:'d8',Tecnica:'d8',Astuzia:'d8',Spirito:die}},{difesa:21});
  assert.equal(nodes['f-difesa'].textContent,String(expected),die+' payload='+payload);
 }
});

test('Printed DP includes current Trait bonuses once and uses the selected Tontatta Attribute',()=>{
 const attrs={Forza:'d20+d8',Tecnica:'d20+d20',Astuzia:'d8',Spirito:'d8'};
 const body={attr:attrs,umanoAttr:'Forza',roleSkillDie:'d12',uniqueTraits:{acquired:['corpo-mostruoso']}};
 assert.equal(fill('umano',false,body)['f-difesa'].textContent,'31');
 assert.equal(fill('umano',true,{...body,uniqueTraits:{acquired:['corpo-mostruoso','fortezza-vivente']}},{difesa:27})['f-difesa'].textContent,'33');
 assert.equal(fill('tontatta',true,{...body,umanoAttr:'Tecnica',uniqueTraits:{acquired:[]}})['f-difesa'].textContent,'41');
 const rules=fill('tontatta')._appendix.map(n=>n.innerHTML).join('');
 assert.match(rules,/\+3 al risultato della prova di Forza dell’avversario/);assert.match(rules,/Solo nella contesa per liberarti/);assert.match(rules,/non modifica la presa iniziale né altre prove/);
});

test('An old Trait name in a print payload yields its current catalog name while the Archaeologist Talent keeps its own name',()=>{
 const nodes=fill('umano',true,{}, {tratti:[{id:'memoria-del-mondo',name:'Memoria del Mondo',active:true}],talenti:[{name:'Memoria del Mondo',branch:'Archeologo',desc:'Talento separato.'}]});
 const appendix=nodes._appendix.map(n=>n.innerHTML).join('');
 assert.match(appendix,/<b>Connessione Storica<\/b>/);assert.match(appendix,/<b>Memoria del Mondo<\/b>/);assert.match(appendix,/Talento separato\./);
});

test('Printed technique details preserve invalid historical choices with their explicit validation issues',()=>{
 const technique={nome:'Vecchia Tecnica',fonte:'Stile Sniper',forma:'Singolo',attr:'Astuzia',die:'d8',cost:'3 ST',eff:[{n:'Lacerazione',d:'Provoca Sanguinante.'}],desc:'Nota del giocatore.',valid:false,issues:['Lacerazione non autorizzata per Sniper.','Nessuna arma associata.']};
 const nodes=fill('umano',true,{}, {tecniche:[technique]});
 assert.equal(nodes._appendix.length,1);const appendix=nodes._appendix[0].innerHTML;
 assert.match(appendix,/Da aggiornare/);assert.match(appendix,/Tecnica da aggiornare: Lacerazione non autorizzata per Sniper\. · Nessuna arma associata\./);
 assert.match(appendix,/Nota del giocatore\./);assert.match(appendix,/Lacerazione: Provoca Sanguinante\./);
 const legacy={...technique};delete legacy.valid;delete legacy.issues;
 const oldPayload=fill('umano',true,{}, {tecniche:[legacy]})._appendix[0].innerHTML;
 assert.doesNotMatch(oldPayload,/Da aggiornare|Tecnica da aggiornare/);assert.match(oldPayload,/Nota del giocatore\./);
});

test('Legacy t1 and t2 profiles are labelled for conversion while retaining their names, effects and player descriptions',()=>{
 const nodes=fill('umano',false,{t1:{nome:'Vecchio Pugno',attr:'Forza',die:'d8',eff:['Lacerazione'],desc:'Ricordo del primo colpo.'},t2:{nome:'Vecchia Guardia',attr:'Tecnica',die:'d6',desc:'Dedicata al capitano.'}});
 const cell=(row,column)=>nodes._cells['.tcell[data-trow="'+row+'"][data-tcol="'+column+'"]'].textContent;
 for(const row of [1,2])assert.equal(cell(row,'tipo'),'Profilo storico · da convertire nel Costruttore');
 assert.equal(cell(1,'nome'),'Vecchio Pugno');assert.equal(cell(1,'eff'),'Lacerazione — Ricordo del primo colpo.');
 assert.equal(cell(2,'nome'),'Vecchia Guardia');assert.equal(cell(2,'eff'),'Dedicata al capitano.');
});

test('Fruit printing uses the complete current Identity and creature dossier even with an obsolete payload',()=>{
 const frutto={has:true,nome:'Felino corrente',tipo:'Zoan',die:'d8',subtipo:'Ancestrale',forma:'Ibrida',esaurito:true,desc:'Nota storica conservata',identita:{nucleo:'Nucleo corrente',applicazioni:'Artigli e arrampicata',limitazioni:'Solo contatto',contraccolpi:'Affaticamento'},creatura:{specie:'Felino',stazza:'Grande',anatomia:'Zampe e coda'},scelteTalenti:{'glc-talent-256':'Olfatto'},armiNaturali:[{id:'claw',nome:'Artigli naturali',anatomia:'Mani',tipo:'Lama',attr:'Forza',forme:['Ibrida','Bestiale'],portata:'1 m',note:'Mai nello zaino'}]};
 for(const payload of [false,true]){
  const nodes=fill('umano',payload,{attr:{Forza:'d8',Tecnica:'d8',Spirito:'d8',Astuzia:'d8'},frutto,talents:['Frutto · Zoan · Artigli e Zanne','Frutto · Zoan · Sensi Animali']},{fruitDossier:{nome:'Frutto precedente',sections:[{title:'Vecchio dossier',rows:[{label:'Nucleo',value:'Dato obsoleto'}]}]}});
  const print=nodes._appendix.map(n=>n.innerHTML).join('');
  for(const text of ['Nucleo corrente','Artigli e arrampicata','Solo contatto','Affaticamento','Felino','Mani','Artigli naturali','Armi Naturali · fuori Arsenale','Olfatto','Indisponibile fino al Riposo Lungo'])assert.ok(print.includes(text),text+' payload='+payload);
  assert.doesNotMatch(print,/Frutto precedente|Dato obsoleto|Vecchio dossier/);assert.match(print,/Descrizione|Nota storica conservata/);
 }
});

test('Raw Fruit print checks actual grade, subtype and recursive Talent prerequisites before declaring saved choices active',()=>{
 const frutto={has:true,nome:'Progetto',tipo:'Paramecia',die:'d12',scelteTalenti:{'glc-talent-236':'Nuova famiglia'},formaCombattimento:{nome:'Forma registrata'},risveglio:{nome:'Risveglio conservato',approvatoGM:true,famiglie:['Dominio']}};
 let print=fill('umano',false,{frutto,talents:['Frutto · Paramecia · Seconda Natura','Frutto · Paramecia · Forma di Combattimento','Frutto · Paramecia · Risveglio']})._appendix.map(n=>n.innerHTML).join('');
 assert.match(print,/Seconda Natura/);assert.match(print,/Scelta conservata \/ non utilizzabile/);assert.match(print,/Forma di Combattimento · Talento acquisito e sbloccato/);assert.match(print,/Risveglio · Progetto \/ scelta conservata, Talento non utilizzabile/);
 print=fill('umano',false,{frutto:{...frutto,tipo:'Zoan',die:'d8',zoanType:'Ordinario',scelteTalenti:{'glc-talent-256':'Vista','glc-talent-266':'Fuoco'}},talents:['Frutto · Zoan · Sensi Animali','Frutto · Zoan · Retaggio Mitologico']})._appendix.map(n=>n.innerHTML).join('');
 assert.match(print,/Sensi Animali/);assert.match(print,/Vista/);assert.match(print,/Retaggio Mitologico/);assert.match(print,/Scelta conservata \/ non utilizzabile/);
});
