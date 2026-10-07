const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setup}=require('./helpers/glc-fixture.cjs');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const line=marker=>{const found=html.split('\n').find(l=>l.startsWith(marker));assert.ok(found,marker);return found;};
function block(start,end){const a=html.indexOf(start),b=html.indexOf(end,a);assert.ok(a>=0&&b>a,start);return html.slice(a,b);}
function node(){return {children:[],innerHTML:'',textContent:'',appendChild(c){this.children.push(c);},setAttribute(){},classList:{add(){},toggle(){}}};}
function context(){
 const {context:c}=setup(),nodes={};c.$=id=>nodes[id]??=node();c.el=(tag,props={},children=[])=>Object.assign(node(),props,{tag,children});c.render=()=>{};
 vm.runInContext(block('const RACES=','const TALENTS=')+block('const RACE_MOVE=','/* Inquadratura della foto:')+line('const ATTRS=')+'\n'+line('const race=')+'\n'+line('const racialAttr=')+'\n'+['racialEffect','difesaPassiva','computeAttr','renderRaces','renderRaceInfo','renderAttr','renderRaceTech','allTech','setTechDie'].map(f=>line('function '+f+'(')).join('\n'),c);
 c.GLCTratti.configure({resolveSkill:(p,name)=>name==='Atletica'?p.roleSkillDie:p.skills?.[name]});
 c.pg={race:'umano',umanoAttr:'Forza',attr:{Forza:'d20+d8',Tecnica:'d8',Astuzia:'d8',Spirito:'d8'},role:'Combattente',style:'Striker',roleSkillChoice:'Atletica',roleSkillDie:'d12',skills:{},talents:[],racialDie:'d10',extraTech:[],t1:{nome:''},t2:{nome:''},pa:{'tec:racial':180},uniqueTraits:{acquired:[]}};
 return {c,nodes};
}

test('Fixed DP follows the complete approved ordinary and Prestige table, without a roll',()=>{
 const {c}=context(),expected=[5,7,9,11,13,21,25,27,29,31,33,41];
 c.GLCPrestige.data.dice.forEach((die,i)=>{assert.equal(c.GLCPrestige.passiveDefense(die),expected[i]);c.pg.attr.Forza=die;assert.equal(c.difesaPassiva(),expected[i]);});
 for(const invalid of ['',null,'d20+d3','d20+d20+d4','d100'])assert.equal(c.GLCPrestige.passiveDefense(invalid),null);
});

test('A Trait bonus applies after full Prestige DP; Fortezza replaces Corpo and follows current eligibility',()=>{
 const {c}=context();c.pg.uniqueTraits.acquired=['corpo-mostruoso'];assert.equal(c.difesaPassiva(),31);
 c.pg.uniqueTraits.acquired.push('fortezza-vivente');assert.equal(c.difesaPassiva(),33);
 c.pg.roleSkillDie='d10';assert.equal(c.difesaPassiva(),31,'Ineligible Fortezza leaves Corpo active');
 c.pg.roleSkillDie='d8';assert.equal(c.difesaPassiva(),29,'Neither Trait applies without its requirements');
 assert.deepEqual(Array.from(c.pg.uniqueTraits.acquired),['corpo-mostruoso','fortezza-vivente']);
 c.pg.attr.Forza='d20+d20';assert.equal(c.difesaPassiva(),41);
 c.pg.roleSkillDie='d12';assert.equal(c.difesaPassiva(),45);
});

test('DP follows the actual racial Attribute, including choices for Humans and Tontatta',()=>{
 const {c}=context();c.pg.attr={Forza:'d20+d8',Tecnica:'d20+d20',Spirito:'d20+d4',Astuzia:'d20+d12'};
 for(const [race,choice,expected]of [['umano','Astuzia',33],['tontatta','Tecnica',41],['tontatta','Forza',29],['mink','Forza',41],['lunarian','Forza',25],['cyborg','Tecnica',29]]){
  c.pg.race=race;c.pg.umanoAttr=choice;assert.equal(c.difesaPassiva(),expected,race+' '+choice);
 }
 c.window.GLCPrestige=null;c.pg.race='umano';c.pg.umanoAttr='Astuzia';assert.equal(c.difesaPassiva(),33,'Full-pool fallback remains consistent');
});

test('Creation presents seven current races while saved retired races and their attributes remain untouched',()=>{
 const {c,nodes}=context();
 for(const race of ['longbraccio','longbraccia','lungagamba']){
  c.pg.race=race;c.pg.d6attr='Forza';const before=JSON.stringify(c.pg);
  c.renderRaces();assert.equal(nodes['#race-cards'].children.length,7);
  const labels=nodes['#race-cards'].children.map(n=>n.html).join('');assert.doesNotMatch(labels,/Longbraccio|Longbraccia|Lungagamba/);
  assert.match(nodes['#race-info'].innerHTML,/Razza storica rimossa/);
  c.computeAttr();c.renderAttr();c.renderRaceTech();c.setTechDie({k:'racial'},'d20');
  assert.equal(JSON.stringify(c.pg),before,'Opening creator and attempted progression preserve '+race);
  assert.equal(c.allTech()[0].historical,true);assert.match(c.racialEffect(race,'d10'),/Archivio/);
  assert.equal(c.raceById(race).historical,true);assert.equal(c.raceMove(race).m,race==='lungagamba'?16:10);
  nodes['#race-cards'].children=[];
 }
});

test('Real migration preserves retired race identifiers, PA, advanced dice and Technique records',()=>{
 const {c}=context();
 vm.runInContext(block('const blank=','let pg=blank()')+['TAL_RITIRATI','TAL_RENAME','STILI_NASCOSTI','INV_MIGRATE'].map(n=>line('const '+n+'=')).join('\n')+'\n'+line('function firstStyle(')+'\n'+block('function migrateChar(','function save('),c);
 for(const race of ['longbraccio','longbraccia','lungagamba']){
  const original={...c.pg,race,nome:'Archivio',bg:'Storia',note:'Nota',racialDie:'d12',attr:{Forza:'d20+d20',Tecnica:'d20+d12',Spirito:'d20',Astuzia:'d8'},pvMax:33,pvCur:19,pa:{'tec:racial':275,'attr:Tecnica':42},t1:{nome:'Colpo storico',die:'d10',attr:'Tecnica',desc:'Nota originaria',eff:['Lacerazione']},extraTech:[{id:'same-id',nome:'Tecnica costruita',fonte:'Stile',stile:'Striker',die:'d12',attr:'Tecnica',eff:[]}]};
  const migrated=c.migrateChar(JSON.parse(JSON.stringify(original)));
  for(const key of ['race','nome','bg','note','racialDie','attr','pa','pvMax','pvCur','t1','extraTech'])assert.deepEqual(JSON.parse(JSON.stringify(migrated[key])),original[key],race+' '+key);
 }
});

test('Tontatta +3 belongs exclusively to the opponent’s escape contest, with the initial grip unchanged',()=>{
 const {c}=context();const rule=c.racialEffect('tontatta','d10');
 assert.match(rule,/aggiungi \+3 al risultato della prova di Forza dell’avversario/);assert.match(rule,/solo alla contesa per liberarti/);assert.match(rule,/non alla Presa iniziale o ad altre prove/);assert.doesNotMatch(rule,/\+3 difficoltà/);
});
