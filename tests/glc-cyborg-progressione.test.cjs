const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const main=fs.readFileSync(path.join(__dirname,'../gestisci-pirata/index.html'),'utf8');
function setup(die){
 const context=vm.createContext({pg:{race:'cyborg',racialDie:die,pa:{'tec:racial':99},paThresh:{d20:1}},PA_THRESH:{d6:25,d8:60,d10:150,d12:400},
  el:(tag,props,kids)=>({tag,...props,kids:kids||[]}),mutate:fn=>fn()});
 const names=['stepDie','paSoglia','setTechDie','dieRank'];
 const declarations=names.map(name=>main.match(new RegExp('^function '+name+'\\([^\\n]+','m'))[0]).join('\n');
 vm.runInContext('const DICE=["d4","d6","d8","d10","d12","d20","d20+d4"];\n'+declarations+'\n'+main.slice(main.indexOf('function paRow('),main.indexOf('/* Riga di progressione:',main.indexOf('function paRow('))),context);
 return context;
}
test('Custom PA thresholds cannot advance Corpo Meccanico beyond d20 or spend its PA',()=>{
 const c=setup('d20'),row=c.paRow('tec:racial',()=>c.pg.racialDie,nd=>c.setTechDie({k:'racial'},nd)),advance=row.kids.at(-1);
 assert.equal(advance.disabled,true);assert.equal(advance.onclick,undefined);
 c.setTechDie({k:'racial'},'d20+d4');assert.equal(c.pg.racialDie,'d20');assert.equal(c.pg.pa['tec:racial'],99);
});
test('The actual ordinary racial advancement still increases Corpo Meccanico and spends only its threshold',()=>{
 const c=setup('d8'),row=c.paRow('tec:racial',()=>c.pg.racialDie,nd=>c.setTechDie({k:'racial'},nd)),advance=row.kids.at(-1);
 assert.equal(advance.disabled,false);advance.onclick();assert.equal(c.pg.racialDie,'d10');assert.equal(c.pg.pa['tec:racial'],39);
});
test('A historical Prestige racial value is preserved for review with advancement disabled',()=>{
 const c=setup('d20+d4'),before=JSON.stringify(c.pg),row=c.paRow('tec:racial',()=>c.pg.racialDie,nd=>c.setTechDie({k:'racial'},nd));
 assert.equal(row.kids.at(-1).disabled,true);assert.equal(JSON.stringify(c.pg),before);
 c.setTechDie({k:'racial'},'d20');assert.equal(c.pg.racialDie,'d20');assert.equal(c.pg.pa['tec:racial'],99);
});
