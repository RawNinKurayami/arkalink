const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const main=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const sheet=fs.readFileSync(path.join(root,'scheda-stampabile/index.html'),'utf8');

function declaration(source,startMarker,endMarker){
 const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
 assert.ok(start>=0&&end>start,'Declaration boundaries: '+startMarker);
 return source.slice(start,end+endMarker.length);
}
function races(){
 const context=vm.createContext({});
 vm.runInContext(declaration(main,'const RACES=','\n];')+'\nglobalThis.mainRaces=RACES;',context);
 vm.runInContext('(function(){'+declaration(sheet,'var RACES=','\n  };')+'\nglobalThis.printRaces=RACES;})();',context);
 return JSON.parse(JSON.stringify({main:context.mainRaces,print:context.printRaces}));
}
function fill(race,payload=false,overrides={},payloadOverrides={}){
 const character={race,nome:'Stampa di prova',role:'Combattente',style:'Striker',roleSkillDie:'d8',roleSkillChoice:'Atletica',attr:{Forza:'d8',Tecnica:'d8',Spirito:'d8',Astuzia:'d8'},skills:{},talents:[],extraTech:[],armi:[],strumeni:[],moduli:[],haki:[],bonds:[],frutto:{has:false},...overrides};
 const nodes={},listeners={},cells={},appendix=[],storage={glc_pirata_v4:JSON.stringify({activeId:'test',chars:{test:character}})};
 if(payload)storage.glc_print_v1=JSON.stringify({charId:'test',difesa:9,talenti:[],tratti:[],tecniche:[],moduli:[],strumenti:[],armi:[],haki:[],...payloadOverrides});
 const basePage={style:{}},wrap={querySelector:()=>basePage,appendChild:n=>appendix.push(n)};basePage.parentNode=wrap;
 const document={getElementById:id=>nodes[id]??={textContent:'',style:{}},querySelector:selector=>selector==='.page'?basePage:selector.startsWith('.tcell')?(cells[selector]??={textContent:''}):null,
  createElement:()=>({style:{},setAttribute(){},innerHTML:''}),addEventListener:(event,callback)=>{listeners[event]=callback;}};
 const context=vm.createContext({window:{},document,location:{search:'?c=test'},localStorage:{getItem:key=>storage[key]||null},URLSearchParams});
 const inline=sheet.match(/<script>\s*([\s\S]+?)<\/script>/);
 assert.ok(inline,'Live illustrated print renderer');vm.runInContext(inline[1],context);listeners.DOMContentLoaded();
 nodes._appendix=appendix;nodes._cells=cells;return nodes;
}

test('The illustrated print sheet shares every racial description and base resource with the live manager',()=>{
 const data=races();assert.equal(data.main.length,9);assert.deepEqual(Object.keys(data.print).sort(),data.main.map(r=>r.id).sort());
 for(const race of data.main)for(const field of ['name','hp','pv','tech','techDesc'])assert.equal(data.print[race.id][field],race[field],race.id+' '+field);
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
 const longarm=fill('longbraccio')['f-rtech-eff'].textContent;assert.match(longarm,/contro Trascinamento o Proiezione/);assert.doesNotMatch(longarm,/\+2 alla soglia/);
 const longleg=fill('lungagamba')['f-rtech-eff'].textContent;assert.match(longleg,/contro Schiantato/);assert.doesNotMatch(longleg,/Bonus su calci e salti|senza tiro/);
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
