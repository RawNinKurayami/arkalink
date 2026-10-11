const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'../regole/cambusa.js'),'utf8'),c);const C=c.GLCCambusa;
const reference={id:'official',nome:'Ricetta ufficiale',dati:{categoria:'Carne'}};
const draft={nome:'Stufato',categoria:'Carne',ingredienti:'Carne, erbe',soglia:10,tempo:'30 minuti',critico:'2d6 PV / 2 ST',successo:'d6 PV / 1 ST',stentato:'1 PV',fallimento:'Nessun recupero',bonus:''};
test('A personal recipe requires its reference, positive threshold, time and all four outcomes',()=>{
 assert.equal(C.create(draft,reference).valid,true);
 assert.equal(C.create(draft,null).valid,false);
 for(const key of ['nome','ingredienti','tempo','critico','successo','stentato','fallimento'])assert.equal(C.create({...draft,[key]:''},reference).valid,false,key);
 for(const soglia of [0,-1,2.5,''])assert.equal(C.create({...draft,soglia},reference).valid,false);
});
test('Only one Extra is accepted, conditions are preserved, and GM approval is never invented',()=>{
 const extra={nome:'Sea King',bonus:'+1d4 PV e +1 ST a qualsiasi esito'},r=C.create({...draft,extra:[extra]},reference);
 assert.equal(r.valid,true);assert.equal(r.recipe.extra.bonus,extra.bonus);assert.equal(r.recipe.gmApproved,false);assert.match(r.description,/Bozza/);
 assert.equal(C.create({...draft,extra:[extra,extra]},reference).valid,false);
 assert.match(C.create({...draft,gmApproved:true},reference).description,/Valori concordati/);
 assert.equal(C.create({...draft,extra:{nome:'custom',bonus:''}},reference).valid,false);
});
test('Crafting ingredient links accept structured and historical descriptions without modifying records',()=>{
 const item={desc:'Effetto\nIngredienti: ferro, vetro; cuoio',id:'historical'},before=JSON.stringify(item);
 assert.deepEqual(Array.from(C.ingredients(item)),['ferro','vetro','cuoio']);assert.equal(JSON.stringify(item),before);
 assert.deepEqual(Array.from(C.ingredients({dati:{ingredienti:'Ferro magnetico raffinato, ago sensibile'}})),['Ferro magnetico raffinato','ago sensibile']);
});
