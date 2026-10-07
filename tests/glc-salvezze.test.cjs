const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setup}=require('./helpers/glc-fixture.cjs');
const root=process.env.GLC_TEST_ROOT||path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const ordinary=[['d4',3],['d6',4],['d8',5],['d10',6],['d12',7],['d20',11]];
const prestige=[['d20+d4',13],['d20+d6',14],['d20+d8',15],['d20+d10',16],['d20+d12',17],['d20+d20',21]];

test('Ordinary graduated saves use the approved thresholds and succeed on exactly half the die faces',()=>{
 const P=setup().context.GLCPrestige;
 for(const [die,threshold] of ordinary){
  assert.equal(P.saveThreshold(die),threshold);
  const sides=Number(die.slice(1));let successes=0;
  for(let result=1;result<=sides;result++)if(result>=P.saveThreshold(die))successes++;
  assert.equal(successes/sides,0.5,die);
 }
});

test('Prestige graduated saves use the full source pool and the approved inclusive success boundary',()=>{
 const P=setup().context.GLCPrestige;
 for(const [die,threshold] of prestige){
  assert.equal(P.saveThreshold(die),threshold);
  const extra=Number(die.split('+d')[1]);let successes=0;
  for(let base=1;base<=20;base++)for(let result=1;result<=extra;result++)if(base+result>=P.saveThreshold(die))successes++;
  assert.equal(successes/(20*extra),0.525,die);
 }
 for(const value of ['Stordito','d20+',12,'',undefined])assert.equal(P.saveThreshold(value),null);
});

test('Instrument thresholds use the actual Arte limit and update without changing the instrument or character',()=>{
 const h=setup(),c=h.context.pg;
 h.context.roleObj=()=>({skill:'Arte'});
 for(const name of ['arteDie','instrEff','instrMeta']){
  const line=html.match(new RegExp('^function '+name+'\\([^\\n]+','m'));
  assert.ok(line,name);vm.runInContext(line[0],h.context);
 }
 vm.runInContext(html.match(/^const INSTR_GRADI=[^\n]+/m)[0],h.context);
 for(const [die,threshold] of ordinary){
  c.roleSkillDie=die;
  const instrument={die},before=JSON.stringify([c,instrument]),x=h.context.instrEff(instrument);
  assert.equal(x.eff,die);assert.equal(x.soglia,threshold);assert.equal(x.over,false);
  assert.equal(JSON.stringify([c,instrument]),before);
 }
 c.roleSkillDie='d6';let x=h.context.instrEff({die:'d20'});
 assert.equal(x.over,true);assert.equal(x.eff,'d6');assert.equal(x.soglia,4);
 c.roleSkillDie='d8';x=h.context.instrEff({die:'d12'});
 assert.equal(x.over,true);assert.equal(x.eff,'d8');assert.equal(x.soglia,5);
 assert.match(h.context.instrMeta({die:'d12'}),/usato come d8 \(Arte d8\).*Salvezza 5/);
 for(const [die] of prestige){
  c.roleSkillDie=die;
  const instrument={die:'d20'},before=JSON.stringify([c,instrument]);x=h.context.instrEff(instrument);
  assert.equal(x.eff,'d20');assert.equal(x.soglia,11);assert.equal(x.over,false);
  assert.equal(JSON.stringify([c,instrument]),before);
 }
 h.context.roleObj=()=>({skill:'Comunicazione'});c.roleSkillDie='d20+d20';c.skills={Arte:'d8'};
 x=h.context.instrEff({die:'d8'});assert.equal(x.soglia,5);
 const instrument={die:'d10'},before=JSON.stringify([c,instrument]);x=h.context.instrEff(instrument);
 assert.equal(x.over,true);assert.equal(x.eff,'d8');assert.equal(x.soglia,5);
 assert.equal(JSON.stringify([c,instrument]),before);
});

function roleFixture(id,die,secondary=false){
 const h=setup(),P=h.context.GLCPrestige,V=h.context.GLCPrestigeView,c=h.context.pg,p=P.data.paths.find(p=>p.id===id);
 if(secondary)Object.assign(c,{role:'Capitano',style:'Capitano',roleSkillDie:'d20+d20',role2:p.role,style2:p.style,skills:{[p.skill]:die}});
 else Object.assign(c,{role:p.role,style:p.style,roleSkillDie:die,skills:{}});
 c.attr={Forza:'d20+d20',Tecnica:'d20+d20',Spirito:'d20+d20',Astuzia:'d20+d20'};
 c.talents=h.context.rules.TALENTS[p.role].styles[p.style].talenti.map(t=>p.role+' · '+p.style+' · '+t.n);
 return {...h,P,V,c,p,description:id=>V.talentText(c,P.states(c,p.id).find(t=>t.id===id))};
}

test('Requiem uses current Arte for all stages, including a secondary Musicista with higher unrelated dice',()=>{
 for(const secondary of [false,true])for(const [die,threshold] of prestige){
  const h=roleFixture('musicista',die,secondary),text=h.description('requiem-sovrano');
  assert.match(text,new RegExp('Soglia '+threshold+' da Arte'));
  assert.match(text,/non si somma la Soglia dello strumento/);
  assert.match(text,/pool completo di Spirito/);
  assert.doesNotMatch(text,/Soglia ordinaria dello strumento \+/);
 }
});

test('Tossine Sovrane keeps the higher poison threshold, substitutes the ordinary +2 and preserves attribute reduction',()=>{
 for(const secondary of [false,true])for(const [die,threshold] of prestige){
  const h=roleFixture('tossicologo',die,secondary),text=h.description('tossine-sovrane');
  assert.match(text,new RegExp('la più alta tra la Soglia propria e '+threshold+' da Medicina'));
  assert.match(text,/sostituisce il \+2 di Tossine Raffinate — Base e non si somma/);
  assert.match(text,die==='d20+d20'?/ridotto di 3 gradini/:/ridotto di 2 gradini/);
  assert.match(text,/non scende sotto d4/);assert.doesNotMatch(text,/Veleni: Soglia \+/);
  assert.match(h.description('nebbia-pestilenziale'),/normale Salvezza della dose/);
 }
});

test('Prestige Crusher states derive their threshold from Atletica while range still derives from Forza',()=>{
 const h=roleFixture('crusher','d20+d4');
 for(const id of ['maglio-inarrestabile','onda-sismica']){
  const text=h.description(id);assert.match(text,/Soglia 13 dalla Skill di Ruolo \(d20\+d4\)/);assert.match(text,/Tecnica/);
 }
 assert.match(h.description('onda-sismica'),/fino a 1\.000 m/);
});

test('Electro thresholds change without changing its costs, paralysis duration, damage or Sulong',()=>{
 const h=setup(),start=html.indexOf('const RACE_EFF='),end=html.indexOf('\n};',start);
 assert.ok(start>=0&&end>start);vm.runInContext(html.slice(start,end+3)+'\nglobalThis.raceEffects=RACE_EFF;',h.context);
 for(const [die,threshold,cost,turns,damage] of [
  ['d6',4,1,1,null],['d8',5,1,2,null],['d10',6,2,3,null],['d12',7,2,3,'1d6'],['d20',11,3,3,'1d8']
 ]){
  const text=h.context.raceEffects.mink(die);
  assert.match(text,new RegExp('Soglia '+threshold+' ogni turno · '+cost+' ST'));
  assert.match(text,new RegExp('paralisi '+turns+' turn'));
  if(damage)assert.match(text,new RegExp(damage+' danni/turno'));
  assert.match(text,/Sulong/);assert.match(text,/dopo il Sulong resti a 0 Stamina/);
  assert.doesNotMatch(text,/Forza vs Electro/);
 }
});
