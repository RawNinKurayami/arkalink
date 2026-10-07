/* Exercise the actual manager load/save boundary without a cloud account. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../gestisci-pirata/index.html'),'utf8');
const copy=value=>JSON.parse(JSON.stringify(value));
function manager(container,search=''){
 let saved=JSON.stringify(container);
 const context=vm.createContext({localStorage:{getItem:()=>saved},window:{GLCStore:{setItem:(key,value)=>{assert.equal(key,'glc_pirata_v4');saved=value;}}},location:{search},URLSearchParams,migrateChar:copy,newId:()=> 'new',blank:()=>({nome:'Nuovo'})});
 const functions=['load','save'].map(name=>html.match(new RegExp('^function '+name+'\\(\\).*$', 'm'))?.[0]);
 assert.ok(functions.every(Boolean),'Load/save must be taken from the live manager');
 vm.runInContext('const KEY="glc_pirata_v4";let CT,pg;'+functions.join('\n')+'\nload();',context);
 return {context,save:()=>{vm.runInContext('save();',context);return JSON.parse(saved);}};
}
test('Editing a Fruit retains crew metadata, other pirates and unknown dossier fields',()=>{
 const data={v:2,activeId:'a',order:['a','b'],gm:{campagna:'Blue Sea',versione:'custom'},extra:['future'],chars:{a:{nome:'A',frutto:{has:true,tipo:'Paramecia',die:'d8',desc:'Note storiche',custom:{origine:'GM'}}},b:{nome:'B',note:'Non modificare'}}};
 const h=manager(data);vm.runInContext('pg.frutto.identita={nucleo:"Cera"};',h.context);const result=h.save();
 assert.deepEqual(result.gm,data.gm);assert.deepEqual(result.extra,data.extra);assert.deepEqual(result.chars.b,data.chars.b);assert.deepEqual(result.chars.a.frutto.custom,data.chars.a.frutto.custom);assert.equal(result.chars.a.frutto.desc,'Note storiche');assert.equal(result.chars.a.frutto.identita.nucleo,'Cera');
});
test('A selected pirate URL and an inconsistent legacy order preserve every stored character',()=>{
 const data={v:2,activeId:'missing',order:['deleted','a'],cloudMetadata:{tag:'retain'},chars:{a:{nome:'A'},b:{nome:'B',frutto:{nome:'Zoan'}}}};
 const h=manager(data,'?c=b');vm.runInContext('pg.frutto.note="Aggiornata";',h.context);const result=h.save();
 assert.equal(result.activeId,'b');assert.deepEqual(result.order,['a','b']);assert.deepEqual(result.cloudMetadata,data.cloudMetadata);assert.deepEqual(result.chars.a,data.chars.a);assert.equal(result.chars.b.frutto.note,'Aggiornata');
});
