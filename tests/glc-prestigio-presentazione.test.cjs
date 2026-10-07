const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {setup}=require('./helpers/glc-fixture.cjs');
const root=process.env.GLC_TEST_ROOT||path.join(__dirname,'..');

function fixture(id='striker-atletica',die='d20+d4'){
 const h=setup(),P=h.context.GLCPrestige,V=h.context.GLCPrestigeView,c=h.context.pg,p=P.data.paths.find(x=>x.id===id);
 Object.assign(c,{role:p.role,style:p.style,roleSkillChoice:p.skill,roleSkillDie:die,attr:{Forza:die,Tecnica:die,Spirito:die,Astuzia:die},skills:{},prestige:{}});
 c.talents=h.context.rules.TALENTS[p.role].styles[p.style].talenti.map(t=>p.role+' · '+p.style+' · '+t.n);
 c.haki.forEach(x=>{if(x.name!=='Haki del Re')x.die=die;});
 return {...h,P,V,c,p,take:t=>P.choose(c,p.id,t,true)};
}

test('Raffica summaries show progressive costs, full extra technique costs and one Firma per turn',()=>{
 for(const die of ['d20+d12','d20+d20']){
  const h=fixture('striker-atletica',die);h.take('raffica-senza-fine');const t=h.P.acquired(h.c).find(t=>t.id==='raffica-senza-fine'),text=h.V.talentText(h.c,t);
  assert.match(h.V.cost(t),/1 \/ 2 \/ 3 \/ 4/);assert.match(text,/il primo extra costa 1 ST, il secondo 2 ST, il terzo 3 ST/);
  assert.match(text,/tutti i costi della Tecnica e dei suoi effetti/);assert.match(text,/mancato consuma ST ma non interrompe/);
  assert.match(text,/Il Colpo Sfonda può attivarsi una sola volta per turno/);assert.doesNotMatch(text,/2 ST per ogni attacco extra/);
 }
});

// Small document adapter: exercises real UI callbacks and text, without a browser,
// layout simulation, network, localStorage or real characters.
class Node {
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs={...attrs};this.children=[];this.classList={add:n=>this.attrs.class=(this.attrs.class||'')+' '+n};this.onclick=attrs.onclick;this.value=attrs.value||'';this.append(...children);}
 appendChild(n){this.children.push(n);return n;}
 append(...nodes){nodes.forEach(n=>this.appendChild(n));}
 prepend(n){this.children.unshift(n);}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelector(){return null;}
 addEventListener(){}
}
const walk=n=>[n,...n.children.flatMap(walk)];
const text=n=>walk(n).map(x=>x.attrs.text||'').join('\n');
function ui(h){
 const ctx=h.context,calls={};let body,build;
 Object.assign(ctx,{el:(t,a,ch)=>new Node(t,a,ch),dieIcon:d=>d,document:{activeElement:null},
  GLCMoves:{...h.moves,ensureReferences(){},transaction:fn=>fn(h.c)},
  renderManage(){},render(){},closeModal(){},closeTalentTree(){},renderTalentTree(){},ttSources:()=>[],
  openTalentTree:id=>calls.tree=id,hakiModal:i=>calls.haki=i,
  openModal(title,fn){build=fn;body=fn();return new Node('dialog');},refreshModal(){body=build();}
 });
 vm.runInContext(fs.readFileSync(path.join(root,'gestisci-pirata/prestigio-ui.js'),'utf8'),ctx);
 const api=ctx.window.GLCPrestigeUI;
 return {api,calls,open(kind,key){api.open(kind,key);return body;},body:()=>body,
  tree(){const n=new Node('main');api.renderRoleTree({id:'prestige:'+h.p.id,pathId:h.p.id},n);return n;}};
}

test('The attribute screen uses the current governing die, with no higher-level preview or rules table',()=>{
 const h=fixture('striker-atletica','d20+d20');h.c.attr.Forza='d20+d4';const u=ui(h),node=u.open('attr','Forza'),content=text(node);
 const values=walk(node).filter(n=>n.attrs.class==='prg-value').map(n=>n.attrs.text);
 assert.deepEqual(values,['5','10']);assert.match(content,/1,25 m/);assert.match(content,/2,5 m/);assert.match(content,/3,75 m/);
 assert.doesNotMatch(content,/Saikyō|1\.000|Anteprima|Scale complete|Prossima evoluzione/);
 assert.equal(walk(node).filter(n=>n.attrs.class?.includes('prg-tier')).length,0);
 assert.deepEqual(Array.from(h.V.bands(h.c),x=>x.to),[1.25,2.5,3.75,5]);
});
test('Mobility only mentions air jumps and suspension once their attribute levels are reached',()=>{
 const h=fixture(),u=ui(h);
 let content=text(u.open('attr','Tecnica'));assert.match(content,/pareti e funi/);assert.doesNotMatch(content,/nell’aria|sospeso|dal III|dal V/);
 h.c.attr.Tecnica='d20+d8';content=text(u.open('attr','Tecnica'));assert.match(content,/nell’aria/);assert.doesNotMatch(content,/sospeso/);
 h.c.attr.Tecnica='d20+d12';content=text(u.open('attr','Tecnica'));assert.match(content,/sospeso/);
 h.c.attr.Tecnica='d20';content=text(u.open('attr','Tecnica'));assert.doesNotMatch(content,/Agilità Sovrumana|Scatto|sospeso/);
});
test('Talents are separated into acquired, currently eligible choices and preserved inactive selections',()=>{
 const h=fixture('swordsman');h.c.talents=[];
 assert.deepEqual(Array.from(h.V.choices(h.c,h.p.id).available,x=>x.id),['taglio-colossale','maestria-assoluta-della-lama']);
 const u=ui(h);let content=text(u.tree());assert.doesNotMatch(content,/Fendente Sovrano|Guardia Invalicabile|Saikyō/);
 h.take('taglio-colossale');let data=h.V.choices(h.c,h.p.id);assert.equal(data.active.length,1);assert.equal(data.available.length,0);
 content=text(u.tree());assert.match(content,/Il tuo repertorio/);assert.doesNotMatch(content,/Maestria Assoluta della Lama/);
 h.c.roleSkillDie='d20+d8';assert.equal(h.V.choices(h.c,h.p.id).remaining,1);assert.match(text(u.tree()),/Maestria Assoluta della Lama/);
 h.c.roleSkillDie='d20';data=h.V.choices(h.c,h.p.id);assert.equal(data.active.length,0);assert.equal(data.inactive[0].id,'taglio-colossale');
 content=text(u.tree());assert.match(content,/conservata, ora inattiva/);assert.doesNotMatch(content,/Recidi un elemento|Aggiungi un tiro/);
});
test('Choosing and removing talents in the actual view preserves the existing rule commands',()=>{
 const h=fixture(),u=ui(h);let node=u.tree();
 const first=walk(node).find(n=>n.tag==='button'&&n.attrs.text==='✦ Acquisisci talento');first.onclick();assert.equal(h.P.acquired(h.c).length,1);
 node=u.tree();walk(node).find(n=>n.tag==='button'&&n.attrs.text==='Rimuovi scelta').onclick();assert.equal(h.P.acquired(h.c).length,0);
});
test('Role-level descriptions use that role skill, not another attribute or secondary role',()=>{
 const h=fixture('tossicologo');h.c.attr.Spirito='d20+d20';h.c.role2='Navigatore';h.c.style2='Navigatore';h.c.skills.Navigazione='d20+d20';
 let st=h.P.states(h.c,h.p.id).find(t=>t.id==='nebbia-pestilenziale');assert.match(h.V.talent(h.c,st).effect,/10 m di raggio, centro entro 20 m, durata 3 turni/);
 h.c.roleSkillDie='d20+d8';st=h.P.states(h.c,h.p.id).find(t=>t.id==='nebbia-pestilenziale');assert.match(h.V.talent(h.c,st).effect,/20 m di raggio/);
 h.c.roleSkillDie='d20+d20';st=h.P.states(h.c,h.p.id).find(t=>t.id==='nebbia-pestilenziale');assert.match(h.V.talent(h.c,st).effect,/100 m di raggio, centro entro 100 m, durata 5 turni/);assert.equal(st.costST,5);
});
test('All 52 current talent descriptions exist at every stage and are read-only',()=>{
 const visited=new Set();
 for(const p of setup().context.GLCPrestige.data.paths){
  const h=fixture(p.id);for(const die of h.P.data.dice.slice(6)){
   h.c.roleSkillDie=die;Object.keys(h.c.attr).forEach(k=>h.c.attr[k]=die);const before=JSON.stringify(h.c);
   for(const t of [...h.P.states(h.c,p.id),...h.P.states(h.c,'spirito')]){
    const description=h.V.talentText(h.c,t);visited.add(t.id);
    assert.doesNotMatch(description,/undefined|NaN|Consulta le condizioni|A Saikyō|a Saikyō|Prestigio [IV]/,t.id+' '+die);
    assert.ok(description.length<1600,t.id);assert.ok(h.V.talent(h.c,t).effect.length<300,t.id);
   }
   h.V.choices(h.c,p.id);h.V.bands(h.c);assert.equal(JSON.stringify(h.c),before);
  }
 }assert.equal(visited.size,52);
});
test('Spirito shows only its current resistance, Color activation capacity and recovery budget',()=>{
 const h=fixture(),describe=id=>h.V.talentText(h.c,h.P.states(h.c,'spirito').find(t=>t.id===id));
 assert.match(describe('volonta-indomabile'),/20\+d4/);assert.doesNotMatch(describe('volonta-indomabile'),/40/);
 assert.match(describe('sintonia-dei-colori'),/Attiva 2 Colori/);assert.match(describe('riscossa-della-volonta'),/fino a 1 PIP/);
 h.c.attr.Spirito='d20+d20';assert.match(describe('volonta-indomabile'),/vale 40/);assert.match(describe('sintonia-dei-colori'),/Attiva 3 Colori/);assert.match(describe('riscossa-della-volonta'),/fino a 6 PIP/);
});
test('Haki view only contains acquired stages and uses the capped Color die for distances',()=>{
 const h=fixture(),u=ui(h),arm=h.c.haki[0];let content=text(u.api.hakiPanel(arm));
 assert.match(content,/Armatura Totale Superiore/);assert.doesNotMatch(content,/Esplosione Haki Superiore|Ryou Persistente|Saikyō|2 turni/);
 arm.die='d20+d20';content=text(u.api.hakiPanel(arm));assert.doesNotMatch(content,/Esplosione Haki Superiore|Ryou Persistente/);
 h.c.attr.Spirito='d20+d8';content=text(u.api.hakiPanel(arm));assert.match(content,/Esplosione di 20 m/);assert.doesNotMatch(content,/Ryou Persistente|Esplosione di 100 m/);
 h.c.attr.Spirito='d20+d20';const rows=h.P.hakiRows(h.c,arm);assert.equal(rows.length,5);
 const armour=rows.filter(r=>r.id==='armatura-totale-superiore');assert.deepEqual(Array.from(armour,r=>[r.cost,r.durationTurns]),[[2,1],[3,2]]);
 assert.match(h.V.hakiText(h.c,arm,armour[0]),/^Armatura Totale Superiore · standard:/);
 assert.match(h.V.hakiText(h.c,arm,armour[1]),/^Armatura Totale Superiore · potenziata:/);
});
test('Re shows its current range and replaces Impatto with the combined final effect',()=>{
 const h=fixture(),re=h.c.haki[2],u=ui(h);
 for(const [lv,range,count]of [[1,'100',1],[2,'500',2],[3,'1.000',2]]){
  re.prestigeGM=lv;const node=u.api.hakiPanel(re),effects=walk(node).filter(n=>n.attrs.class==='prg-haki-effect unlocked');assert.equal(effects.length,count);
  const content=effects.map(text).join('\n');assert.match(content,new RegExp('entro '+range.replace('.','\\.')+' m'));
  if(lv<3)assert.doesNotMatch(content,/Volontà Illeggibile|1\.000 m/);else {assert.match(content,/Volontà Illeggibile/);assert.doesNotMatch(content,/Impatto Sovrano/);}
 }
});
test('Current sheet and Composer descriptions omit future effects while preserving their short names',()=>{
 const h=fixture('capitano');h.take('ordine-sovrano');const s=h.moves.sources().find(s=>s.id==='prestige:ordine-sovrano');
 assert.match(s.desc,/Un alleato/);assert.doesNotMatch(s.desc,/Due alleati|Saikyō|4 ST/);
 const effects=h.moves.hakiEffects(h.moves.sources().find(s=>s.id===h.colors[0]),h.moves.sources().find(s=>s.id==='tech:guard'));const active=effects.find(e=>e.id==='act:prestige-armatura-totale-superiore');
 assert.equal(active.name,'Armatura Totale Superiore');assert.doesNotMatch(active.desc,/Saikyō|3 PIP|2 turni/);
});
test('Overview offers only reached paths and opens the existing Haki dialog',()=>{
 const h=fixture('striker-atletica','d20');h.c.attr.Forza='d20+d4';h.c.attr.Spirito='d20+d4';h.c.haki[0].die='d20+d4';const u=ui(h),body=u.open();
 const portals=walk(body).filter(n=>n.tag==='button'&&n.attrs.class?.startsWith('prg-portal'));
 assert.equal(portals.length,3);assert.ok(!portals.some(n=>text(n).includes('Tecnica')));
 portals.find(n=>text(n).includes("dell'Armamento")).onclick();assert.equal(u.calls.haki,0);
});
test('Current use counters and movement registration keep their existing updates without spending ST',()=>{
 const h=fixture(),u=ui(h);h.take('raffica-senza-fine');const stamina=h.c.stCur;
 let node=u.tree();walk(node).find(n=>n.attrs['aria-label']==='Segna un utilizzo di Raffica Senza Fine').onclick();
 assert.equal(h.c.prestige.session.uses['raffica-senza-fine'],1);assert.match(text(u.tree()),/Utilizzi rimasti: 0 \/ 1/);
 node=u.open('attr','Tecnica');walk(node).find(n=>n.attrs['aria-label']==='Metri speciali già percorsi').value=4;walk(node).find(n=>n.attrs.text==='Registra metri').onclick();
 assert.equal(h.c.prestige.session.movementUsed,4);assert.match(text(u.body()),/6 \/ 10 m rimasti/);assert.equal(h.c.stCur,stamina);
 node=u.open();walk(node).find(n=>n.attrs.text==='Inizio del mio turno').onclick();assert.equal(h.c.prestige.session.movementUsed,0);assert.equal(h.c.prestige.session.uses['raffica-senza-fine'],undefined);
});
