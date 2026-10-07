const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./helpers/glc-fixture.cjs');
function fixture(){const h=setup();return {T:h.context.GLCTalents,A:h.context.GLCAdvancement,c:h.context.pg};}
const key=n=>'Combattente · Striker · '+n;

test('An acquired chain preserves history but requires every current prerequisite; higher versions replace lower ones',()=>{
 const {T,c}=fixture();c.talents=[key('Raffica — Base'),key('Raffica — Migliorato'),key('Raffica — Maestria')];
 const before=JSON.stringify(c);let states=T.states(c);
 assert.equal(states.find(s=>s.name==='Raffica — Base').replacedBy,'Raffica — Maestria');
 assert.equal(states.find(s=>s.name==='Raffica — Maestria').active,true);
 assert.equal(JSON.stringify(c),before);
 c.roleSkillDie='d8';states=T.states(c);
 assert.equal(states.find(s=>s.name==='Raffica — Base').active,true);
 assert.equal(states.find(s=>s.name==='Raffica — Maestria').owned,true);
 assert.equal(states.find(s=>s.name==='Raffica — Maestria').active,false);
 c.roleSkillDie='d20';c.talents=c.talents.filter(k=>!k.includes('Migliorato'));
 assert.equal(T.has(c,'Raffica — Maestria'),false);
});

test('Fruit talents use the Fruit die and explicit Zoan nature, including for acquired records',()=>{
 const {T,c}=fixture();c.frutto={has:true,tipo:'Zoan',die:'d20',nome:'Uno Zoan che non è Mitologico',desc:'Parla anche di Zoan Ancestrali'};
 let s=T.states(c).find(s=>s.name==='Retaggio Mitologico');assert.ok(s);assert.equal(s.available,false);
 c.frutto.zoanType='Mitologico';s=T.states(c).find(s=>s.name==='Retaggio Mitologico');assert.equal(s.available,true);
 c.talents.push(s.key);assert.equal(T.has(c,s.name),true);
 c.frutto.die='d4';assert.equal(T.has(c,s.name),false);assert.ok(c.talents.includes(s.key));
 c.frutto.die='d20';c.frutto.zoanType='Ordinario';assert.equal(T.has(c,s.name),false);
});

test('A duplicate style cannot multiply its talent branch and retired styles have no active catalogue',()=>{
 const {T,c}=fixture();c.role2=c.role;c.style2=c.style;c.roleSkillChoice2=c.roleSkillChoice;
 assert.equal(T.branches(c).filter(b=>b.src==='role').length,1);
 assert.equal(new Set(T.states(c).map(s=>s.key)).size,T.states(c).length);
 c.role='Ingegnere';c.style='Inventore';c.role2='Combattente';c.style2='Special';assert.equal(T.branches(c).length,0);
});

test('The current primary Skill register prevails over a stale duplicate and secondary choices use their real Skill',()=>{
 const {T,c}=fixture();c.roleSkillChoice='Atletica';c.roleSkillDie='d8';c.skills={Atletica:'d20',Comunicazione:'d10'};
 c.role2='Capitano';c.style2='Capitano';
 assert.equal(T.skillDie(c,'Atletica'),'d8');assert.equal(T.skillDie(c,'Comunicazione'),'d10');
 assert.equal(T.has(c,'Pressione Costante'),false);
});

test('Swapping classes conserves each Skill choice and die without moving the primary training to another Skill',()=>{
 const {T,c}=fixture();c.roleSkillChoice='Acrobazia';c.roleSkillDie='d12';c.role2='Capitano';c.style2='Capitano';c.roleSkillChoice2='';c.skills={Comunicazione:'d10'};
 T.swapRoles(c);assert.equal(c.role,'Capitano');assert.equal(c.roleSkillDie,'d10');assert.equal(c.skills.Acrobazia,'d12');assert.equal(c.roleSkillChoice2,'Acrobazia');
 T.swapRoles(c);assert.equal(c.roleSkillChoice,'Acrobazia');assert.equal(c.roleSkillDie,'d12');assert.equal(c.skills.Comunicazione,'d10');
});

test('Changing the primary class or chosen Skill conserves earned training instead of granting it to the new Skill',()=>{
 const {T,c}=fixture();c.roleSkillChoice='Acrobazia';c.roleSkillDie='d20';c.skills={Atletica:'d6',Comunicazione:'d10'};
 T.changeRole(c,{roleSkillChoice:'Atletica'});assert.equal(c.roleSkillDie,'d6');assert.equal(c.skills.Acrobazia,'d20');
 T.changeRole(c,{role:'Capitano',style:'Capitano',roleSkillChoice:''});assert.equal(c.roleSkillDie,'d10');assert.equal(c.skills.Atletica,'d6');
 T.changeRole(c,{role:'Dottore',style:'Dottore',roleSkillChoice:''});assert.equal(c.roleSkillDie,'d4');assert.equal(c.skills.Comunicazione,'d10');
});

test('Initial creation keeps its single primary d8 while changing a choice; it cannot erase advanced training',()=>{
 const {T,c}=fixture();c.roleSkillChoice='Atletica';c.roleSkillDie='d8';c.skills={};c.talents=[];c.upgrade='';
 T.changeRole(c,{roleSkillChoice:'Acrobazia'},1,{creation:true});assert.equal(c.roleSkillDie,'d8');assert.equal(c.skills.Atletica,undefined);
 c.roleSkillDie='d20';T.changeRole(c,{roleSkillChoice:'Atletica'},1,{creation:true});assert.equal(c.roleSkillDie,'d4');assert.equal(c.skills.Acrobazia,'d20');
 c.roleSkillDie='d8';T.changeRole(c,{roleSkillChoice:'Acrobazia'},1,{creation:true});assert.equal(c.roleSkillDie,'d20');assert.equal(c.skills.Atletica,'d8');
});

test('Actual talent acquisition guards both current eligibility and the shared Upgrade budget',()=>{
 const {T,A,c}=fixture();c.talents=[];c.upgrade='';A.normalize(c);
 const choose=name=>{const s=T.states(c).find(s=>s.name===name);return A.chooseTalent(c,s.key,true,s.available);};
 const before=JSON.stringify(c);assert.throws(()=>choose('Raffica — Base'),/scelta/);assert.equal(JSON.stringify(c),before);
 A.grant(c);assert.throws(()=>choose('Raffica — Maestria'),/requisiti/);assert.equal(A.talentChoices(c).remaining,1);
 assert.throws(()=>A.chooseTalent(c,key('Raffica — Maestria'),true,true),/requisiti/);assert.equal(A.talentChoices(c).remaining,1);
 choose('Raffica — Base');assert.equal(A.talentChoices(c).remaining,0);assert.equal(T.has(c,'Raffica — Base'),true);
});
