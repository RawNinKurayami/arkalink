const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');

function setup({budget=true,realRoles=false}={}){
 const context=vm.createContext({window:{},console});
 const run=file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 if(realRoles){
  const html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
  const start=html.indexOf('const TALENTS='),end=html.indexOf('\n};',start)+3;
  assert.ok(start>=0&&end>start,'Live ordinary talent table');
  vm.runInContext(html.slice(start,end),context);
  run('regole/prestigio-data.js');run('regole/prestigio.js');
  vm.runInContext('window.GLCPrestige.configure(TALENTS)',context);
 }
 run('regole/tratti-data.js');run('regole/tratti.js');
 const T=context.window.GLCTratti;
 if(budget)T.configure({talentBudget:(c,{take})=>({remaining:Math.max(0,(c.grantedChoices||0)-new Set([...(c.talents||[]),...T.stored(c)]).size),allowed:!take||(c.grantedChoices||0)>new Set([...(c.talents||[]),...T.stored(c)]).size})});
 const c={attr:{Forza:'d4',Tecnica:'d4',Astuzia:'d4',Spirito:'d4'},skills:{},talents:[],grantedChoices:0};
 const state=id=>T.states(c).find(t=>t.id===id);
 return {T,c,state};
}
const plain=x=>JSON.parse(JSON.stringify(x));

test('The live catalogue exactly replays the manual source: all 31 Traits and all 16 Skills',()=>{
 const check=spawnSync('python3',['strumenti/tratti-catalogo.py','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(check.status,0,check.stderr||check.stdout);
 const {T}=setup(),source=JSON.parse(fs.readFileSync(path.join(root,'strumenti/manuale-correzioni.json'),'utf8'));
 const blocks=source.sezioni.find(s=>s.sezione==='16.9').contenuto;
 const table=blocks.find(b=>b.classe==='man-tab-tratti');
 assert.equal(T.data.traits.length,31);assert.equal(T.data.skills.length,16);assert.equal(new Set(T.data.traits.map(t=>t.id)).size,31);
 for(const row of table.righe){const t=T.data.traits.find(t=>t.name===row[2]);assert.equal(t.skill,row[0]);assert.equal(t.requirementsText,row[3]);assert.ok(t.effects.length>=1);assert.ok(t.effects.every(p=>typeof p==='string'&&p));}
 assert.equal(T.data.traits.filter(t=>t.name==='Inventore').length,1,'Inventore is a valid Trait, independent of the removed Role style');
});

test('Every Trait requires both exact components; a higher die, including Prestige, satisfies ordinary requirements',()=>{
 const {T,c}=setup();
 for(const t of T.data.traits){
  c.attr={Forza:'d4',Tecnica:'d4',Astuzia:'d4',Spirito:'d4'};c.skills={};c.uniqueTraits={acquired:plain(t.requires)};
  c.attr[t.attribute]=t.attributeDie;c.skills[t.skill]=t.skillDie;
  assert.equal(T.states(c).find(x=>x.id===t.id).unlocked,true,t.name);
  c.attr[t.attribute]=T.data.dice[T.rank(t.attributeDie)-1];
  assert.equal(T.states(c).find(x=>x.id===t.id).unlocked,false,t.name+' lower Attribute');
  c.attr[t.attribute]=t.attributeDie;c.skills[t.skill]=T.data.dice[T.rank(t.skillDie)-1];
  assert.equal(T.states(c).find(x=>x.id===t.id).unlocked,false,t.name+' lower Skill');
  c.attr[t.attribute]='d20+d20';c.skills[t.skill]='d20+d4';
  assert.equal(T.states(c).find(x=>x.id===t.id).unlocked,true,t.name+' higher grade');
 }
});

test('Unlocking any number of Traits does not acquire them, spend choices or alter the character',()=>{
 const {T,c}=setup();Object.keys(c.attr).forEach(a=>c.attr[a]='d20');T.data.skills.forEach(s=>c.skills[s]='d20');c.grantedChoices=20;
 const before=JSON.stringify(c);
 for(let i=0;i<3;i++){assert.equal(T.states(c).filter(t=>t.available).length,30);assert.equal(T.acquired(c).length,0);assert.equal(T.active(c).length,0);assert.equal(T.derivedDP(c),0);T.tree(c);}
 assert.equal(JSON.stringify(c),before);assert.equal(c.uniqueTraits,undefined);
});

test('A Trait uses an explicit normal Upgrade choice shared with ordinary talents; no free-text award is inferred',()=>{
 const {T,c,state}=setup();c.attr.Forza='d12';c.skills.Atletica='d10';c.upgrade='10';
 assert.equal(state('corpo-mostruoso').available,true);assert.equal(state('corpo-mostruoso').canAcquire,false);
 assert.throws(()=>T.choose(c,'corpo-mostruoso'),/scelta di Talento/);assert.equal(c.uniqueTraits,undefined);
 c.grantedChoices=2;c.talents=['Combattente · Striker · Guardia del Combattente'];
 assert.equal(state('corpo-mostruoso').canAcquire,true);T.choose(c,'corpo-mostruoso');
 assert.deepEqual(plain(T.stored(c)),['corpo-mostruoso']);assert.equal(T.acquisitionBudget(c,'corpo-mostruoso').remaining,0);
 assert.equal(T.derivedDP(c),2);assert.equal(T.active(c).length,1);
 assert.throws(()=>T.choose(c,'corpo-mostruoso'),/già acquisito/);
 T.choose(c,'corpo-mostruoso',false);assert.equal(T.acquisitionBudget(c,'corpo-mostruoso').remaining,1);assert.equal(T.derivedDP(c),0);
});

test('Without a host Upgrade budget, an unlocked Trait is visible but acquisition is rejected',()=>{
 const {T,c,state}=setup({budget:false});c.attr.Forza='d20';c.skills.Atletica='d20';
 assert.equal(state('corpo-mostruoso').available,true);assert.equal(state('corpo-mostruoso').canAcquire,false);
 assert.throws(()=>T.choose(c,'corpo-mostruoso'),/Registra una scelta/);
});

test('An authorization failure at commit leaves acquired Traits and character data untouched',()=>{
 const {T,c}=setup();c.attr.Forza='d12';c.skills.Atletica='d10';c.photo='preserved portrait';
 const phases=[];T.configure({talentBudget:(c,{phase})=>{phases.push(phase);return {allowed:phase==='preview',remaining:1,reason:'Scelta già utilizzata.'};}});
 const before=JSON.stringify(c);assert.throws(()=>T.choose(c,'corpo-mostruoso'),/già utilizzata/);
 assert.ok(phases.includes('preview'));assert.equal(phases.at(-1),'commit');assert.equal(JSON.stringify(c),before);
});

test('Fortezza Vivente requires acquired Corpo Mostruoso and replaces its +2 with +4; every acquisition is separate',()=>{
 const {T,c,state}=setup();c.attr.Forza='d20';c.skills.Atletica='d12';c.grantedChoices=2;
 assert.equal(state('corpo-mostruoso').unlocked,true);assert.equal(state('fortezza-vivente').unlocked,false);
 assert.match(state('fortezza-vivente').unlockReason,/Corpo Mostruoso acquisito/);
 assert.throws(()=>T.choose(c,'fortezza-vivente'),/Corpo Mostruoso/);
 T.choose(c,'corpo-mostruoso');assert.equal(T.derivedDP(c),2);assert.equal(state('fortezza-vivente').canAcquire,true);
 T.choose(c,'fortezza-vivente');assert.equal(T.derivedDP(c),4);assert.equal(T.acquired(c).length,2);assert.equal(T.active(c).length,1);
 assert.equal(state('corpo-mostruoso').status,'evolved');assert.equal(state('corpo-mostruoso').replacedBy,'fortezza-vivente');
 assert.equal(state('corpo-mostruoso').canRemove,false);assert.throws(()=>T.choose(c,'corpo-mostruoso',false),/Rimuovi prima Fortezza Vivente/);
 T.choose(c,'fortezza-vivente',false);assert.equal(T.derivedDP(c),2);assert.equal(state('corpo-mostruoso').status,'acquired');
});

test('Stored acquisitions survive a lower Attribute, Skill or prerequisite; restoring requirements reactivates them',()=>{
 const {T,c,state}=setup();c.attr.Forza='d20';c.skills.Atletica='d12';c.grantedChoices=2;T.choose(c,'corpo-mostruoso');T.choose(c,'fortezza-vivente');
 const acquired=JSON.stringify(c.uniqueTraits.acquired);
 c.attr.Forza='d12';assert.equal(T.derivedDP(c),2);assert.equal(state('fortezza-vivente').status,'inactive');
 c.attr.Forza='d10';assert.equal(T.derivedDP(c),0);assert.equal(T.acquired(c).length,2);assert.equal(T.active(c).length,0);
 c.attr.Forza='d20';c.skills.Atletica='d8';assert.equal(T.derivedDP(c),0);
 c.skills.Atletica='d12';assert.equal(T.derivedDP(c),4);assert.equal(JSON.stringify(c.uniqueTraits.acquired),acquired);
 c.uniqueTraits.acquired=['fortezza-vivente'];assert.equal(T.derivedDP(c),0);assert.equal(state('fortezza-vivente').acquired,true);assert.equal(state('fortezza-vivente').active,false);
});

test('The primary Role Skill, chosen Striker Skill and distinct secondary Role Skill use their real registers',()=>{
 const {T,c,state}=setup({realRoles:true});Object.assign(c,{role:'Combattente',style:'Striker',roleSkillChoice:'Acrobazia',roleSkillDie:'d12',role2:'Capitano',style2:'Capitano',roleSkillChoice2:'',skills:{Comunicazione:'d10'}});c.attr.Tecnica='d20';c.attr.Astuzia='d12';
 assert.equal(T.skillDie(c,'Acrobazia'),'d12');assert.equal(T.skillDie(c,'Atletica'),'');assert.equal(T.skillDie(c,'Comunicazione'),'d10');
 assert.equal(state('passo-fantasma').available,true);assert.equal(state('lingua-d-argento').available,true,'Skill of another Role still qualifies');
 delete c.skills.Comunicazione;assert.equal(T.skillDie(c,'Comunicazione'),'');assert.equal(state('lingua-d-argento').unlocked,false,'The secondary Role does not invent another free d8');
 c.style='Crusher';c.roleSkillChoice='';c.roleSkillDie='d10';c.attr.Forza='d12';assert.equal(T.skillDie(c,'Atletica'),'d10');assert.equal(state('corpo-mostruoso').available,true);
 c.role2='Combattente';c.style2='Striker';c.roleSkillChoice2='Acrobazia';c.skills.Acrobazia='d12';assert.equal(T.skillDie(c,'Acrobazia'),'d12');
});

test('A configured resolver supports all Skills outside either Role and acquisitions cumulatively remain distinct',()=>{
 const {T,c}=setup();T.configure({resolveSkill:(c,name)=>c.trained?.[name]||''});c.trained={Natura:'d12',Archeologia:'d12',Artigianato:'d12'};c.attr.Astuzia='d12';c.grantedChoices=3;
 for(const id of ['istinto-naturalista','memoria-del-mondo','inventore'])T.choose(c,id);
 assert.equal(T.active(c).length,3);assert.equal(T.derivedDP(c),0);assert.equal(T.acquisitionBudget(c,'inventore').remaining,0);
 assert.deepEqual(plain(T.tree(c).find(b=>b.skill==='Artigianato').traits.map(t=>t.id)),['maestro-artigiano','inventore']);
});

test('Saikyo has only the ordinary catalogue: no intermediate or implicit Prestige Trait is created',()=>{
 const {T,c}=setup();Object.keys(c.attr).forEach(a=>c.attr[a]='d20+d20');T.data.skills.forEach(s=>c.skills[s]='d20+d20');c.uniqueTraits={acquired:['corpo-mostruoso']};
 assert.equal(T.states(c).length,31);assert.equal(T.tree(c).length,16);assert.equal(T.acquired(c).length,1);assert.equal(T.derivedDP(c),2);
 assert.ok(T.data.traits.every(t=>!t.id.includes('saikyo')&&!t.id.includes('prestigio')));
 assert.throws(()=>T.choose(c,'tratto-saikyo'),/non presente nel catalogo/);
});

test('Normalization preserves acquisition order, unknown future Traits and session data without deleting inactive choices',()=>{
 const {T,c}=setup();c.uniqueTraits={acquired:['corpo-mostruoso','future-trait','corpo-mostruoso',null,14],session:{uses:{'non-ancora':1}}};c.photo='portrait';
 T.normalize(c);assert.deepEqual(plain(c.uniqueTraits.acquired),['corpo-mostruoso','future-trait']);assert.equal(c.uniqueTraits.session.uses['non-ancora'],1);assert.equal(c.photo,'portrait');
 assert.equal(T.acquired(c)[0].status,'inactive');assert.equal(T.derivedDP(c),0);
 const imported=JSON.parse(JSON.stringify(c));T.normalize(imported);assert.deepEqual(plain(imported),plain(c));
});

test('Connessione Storica preserves the acquired Trait ID and choice cost while the ordinary Archeologo Talent retains its separate name',()=>{
 const {T,c,state}=setup();
 c.attr.Astuzia='d12';c.skills.Archeologia='d10';c.grantedChoices=2;
 c.talents=['Archeologo · Archeologo · Memoria del Mondo'];
 c.uniqueTraits={acquired:['memoria-del-mondo']};
 const before=JSON.stringify(c);T.normalize(c);
 const renamed=state('memoria-del-mondo');assert.equal(renamed.name,'Connessione Storica');assert.equal(renamed.active,true);assert.equal(renamed.available,false);
 assert.equal(renamed.attributeDie,'d12');assert.equal(renamed.skillDie,'d10');
 assert.match(renamed.effects.join(' '),/collegare un reperto, un luogo o un’iscrizione a informazioni che il personaggio conosce già/);
 assert.match(renamed.effects.join(' '),/non fornisce conoscenze che il personaggio non possiede/);
 assert.equal(T.acquired(c).length,1);assert.equal(T.acquisitionBudget(c,'memoria-del-mondo').remaining,0);assert.throws(()=>T.choose(c,'memoria-del-mondo'),/già acquisito/);
 assert.equal(T.data.traits.filter(t=>t.name==='Memoria del Mondo').length,0);assert.equal(T.data.traits.filter(t=>t.name==='Connessione Storica').length,1);
 assert.deepEqual(c.talents,['Archeologo · Archeologo · Memoria del Mondo']);assert.equal(JSON.stringify(c),before);
 const main=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
 assert.ok(main.includes('n:"Memoria del Mondo"'),'The ordinary Archeologo Talent keeps its official name.');
});
