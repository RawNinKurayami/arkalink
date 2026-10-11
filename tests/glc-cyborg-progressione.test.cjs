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
test('Racial techniques never offer PA controls or consume historical PA, even under custom thresholds',()=>{
 const c=setup('d20'),row=c.paRow('tec:racial',()=>c.pg.racialDie,nd=>c.setTechDie({k:'racial'},nd));
 assert.equal(row.kids.length,0);assert.match(row.text,/non ricevono né spendono P.A./);
 c.setTechDie({k:'racial'},'d20+d4');assert.equal(c.pg.racialDie,'d20');assert.equal(c.pg.pa['tec:racial'],99);
});
test('A GM-granted racial grade can still be recorded without spending PA or changing modules',()=>{
 const c=setup('d8');c.pg.moduli=[{id:'kept',req:'d8'}];const old=JSON.stringify(c.pg.moduli);
 c.setTechDie({k:'racial'},'d10');assert.equal(c.pg.racialDie,'d10');assert.equal(c.pg.pa['tec:racial'],99);assert.equal(JSON.stringify(c.pg.moduli),old);
});
test('A historical Prestige racial value is preserved for review with advancement disabled',()=>{
 const c=setup('d20+d4'),before=JSON.stringify(c.pg),row=c.paRow('tec:racial',()=>c.pg.racialDie,nd=>c.setTechDie({k:'racial'},nd));
 assert.equal(row.kids.length,0);assert.equal(JSON.stringify(c.pg),before);
 c.setTechDie({k:'racial'},'d20');assert.equal(c.pg.racialDie,'d20');assert.equal(c.pg.pa['tec:racial'],99);
});
