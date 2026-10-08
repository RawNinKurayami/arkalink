/* Exercise the live manager boundary with synthetic pirates and a rejected
 * storage write. These checks protect persisted data, not markup snapshots. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {setup,installRealBuilder}=require('./helpers/glc-fixture.cjs');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'gestisci-pirata/index.html'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
function oneLine(name){const source=html.match(new RegExp('^function '+name+'\\([^\\n]+','m'));assert.ok(source,name);return source[0];}
function manager({reject=false}={}){
 const h=setup(),context=h.context;
 if(!context.window.GLCMelodies)vm.runInContext(fs.readFileSync(path.join(root,'regole/melodie.js'),'utf8'),context);
 context.GLCMelodies=context.window.GLCMelodies;
 context.pg={role:'Musicista',style:'Musicista',role2:'Combattente',style2:'Swordsman',roleSkillDie:'d20',skills:{},attr:{Forza:'d4',Spirito:'d20',Tecnica:'d8',Astuzia:'d8'},talents:[],frutto:{has:false},moduli:[],armi:[{id:'sword',nome:'Spada',tipo:'Lama',grado:'d20',attr:'Forza'}],strumenti:[{smcId:'lute',nome:'Liuto',tipo:'Corde',die:'d8',note:'Nota GM',future:{keep:true}}],extraTech:[{id:'song',nome:'Canto salvato',fonte:'Stile',stile:'Swordsman',attr:'Spirito',die:'d8',forma:'Canzone',eff:['Requiem Beffardo'],instrumentId:'instrument:lute',durata:'Un turno',arma:'sword',modulo:'old-module',weapon:'Spada',custom:{history:['conserva']}},{id:'other',nome:'Altra tecnica',custom:42}],pa:{'tec:song':7},photo:'data:image/png;base64,synthetic'};
 context.CT={v:2,activeId:'a',order:['a','b'],extra:{crew:'retain'},chars:{a:context.pg,b:{nome:'Altro pirata',notes:'untouched'}}};context.KEY='glc_pirata_v4';
 let saved=JSON.stringify(context.CT),closes=0;
 context.window.GLCStore={setItem:(key,value)=>{assert.equal(key,'glc_pirata_v4');if(reject)throw Error('QuotaExceededError');saved=value;}};
 context.closeBuilder=()=>{closes++;};context.flyIn=()=>{};context.dieIcon=()=>'';context.newId=()=> 'new-stable-id';context.alert=()=>{};
 installRealBuilder(context);
 vm.runInContext(['songProfile','tecCostLabel','songDetails','techniqueSourceLabel','tbEffectStateLabel','escp','psTecEff','tbReset','musicistaTransaction','instrumentChange','instrEff'].map(oneLine).join('\n'),context);
 vm.runInContext(html.slice(html.indexOf('function smbSave(){'),html.indexOf('function builderModal(){')),context);
 const old=copy(context.pg.extraTech[0]);context.tbEdit(old);context.tbCompute();
 return {context,old,save:()=>context.smbSave(),saved:()=>JSON.parse(saved),closes:()=>closes};
}
test('A new song does not acquire its secondary combat Style weapon, including a draft switched from combat',()=>{
 const h=manager(),c=h.context;
 c.TBUILD={nome:'Nuova Canzone',fonte:'Stile',stile:'Swordsman',attr:'Spirito',die:'d8',forma:'Canzone',eff:['Requiem Beffardo'],arma:'',modulo:'',_id:null};
 c.tbCompute();assert.equal(c.TBUILD.arma,'');assert.equal(c.TBUILD.modulo,'');
 c.TBUILD.forma='Singolo';c.tbCompute();assert.equal(c.TBUILD.arma,'sword');
 c.tbSetForma('Canzone');assert.equal(c.TBUILD.arma,'');assert.equal(c.TBUILD.modulo,'');assert.equal(c.TBUILD.stile,'');
 c.tbCompute();assert.equal(c.TBUILD.arma,'');
});
test('Resaving a song retains historical links, stored duration, future fields, all other records and crew metadata',()=>{
 const h=manager(),before=copy(h.context.CT);h.context.TBUILD.nome='Canto aggiornato';
 assert.equal(h.save(),null);assert.equal(h.closes(),1);
 const saved=h.saved(),song=saved.chars.a.extraTech[0];
 assert.equal(song.id,'song');assert.equal(song.nome,'Canto aggiornato');
 for(const key of ['arma','modulo','weapon','durata','custom','instrumentId'])assert.deepEqual(song[key],h.old[key],key);
 assert.deepEqual(saved.chars.a.extraTech[1],before.chars.a.extraTech[1]);assert.deepEqual(saved.chars.a.strumenti,before.chars.a.strumenti);assert.deepEqual(saved.chars.a.pa,before.chars.a.pa);assert.deepEqual(saved.chars.b,before.chars.b);assert.deepEqual(saved.extra,before.extra);assert.equal(saved.chars.a.photo,before.chars.a.photo);
});
test('Rejected song write leaves pirate, crew, storage and editable draft intact',()=>{
 const h=manager({reject:true}),before=copy(h.context.CT),pgBefore=copy(h.context.pg);h.context.TBUILD.nome='Ancora nel draft';const draft=copy(h.context.TBUILD);
 const result=h.save();assert.match(result.msg,/QuotaExceededError/);assert.equal(result.step,4);assert.equal(h.closes(),0);
 assert.deepEqual(copy(h.context.CT),before);assert.deepEqual(copy(h.context.pg),pgBefore);assert.deepEqual(h.saved(),before);assert.deepEqual(copy(h.context.TBUILD),draft);
});
test('Rejected instrument grade change keeps the full stored instrument and crew',()=>{
 const h=manager({reject:true}),before=copy(h.context.CT);
 assert.equal(h.context.instrumentChange(0,a=>{a.die='d20';}),false);assert.deepEqual(copy(h.context.CT),before);assert.deepEqual(h.saved(),before);
});
test('Selecting an unreferenced historical instrument creates a stable reference without dropping metadata',()=>{
 const h=manager(),c=h.context;delete c.pg.strumenti[0].smcId;c.TBUILD.instrumentId='instrument:index:0';
 assert.equal(h.save(),null);const saved=h.saved().chars.a;
 assert.equal(saved.strumenti[0].smcId,'new-stable-id');assert.equal(saved.extraTech[0].instrumentId,'instrument:new-stable-id');assert.deepEqual(saved.strumenti[0].future,{keep:true});assert.equal(saved.strumenti[0].note,'Nota GM');
});
test('Main song details use current effective profile and specific duration without mutating legacy data',()=>{
 const h=manager(),c=h.context,before=copy(c.pg),t={...h.old,die:'d12',eff:['Inno della Ciurma']};
 const details=c.songDetails(t).join(' | ');assert.match(details,/Tutta la scena/);assert.doesNotMatch(details,/Un turno/);assert.match(details,/Grado effettivo d8/);assert.match(details,/Soglia ordinaria 5/);assert.equal(c.techniqueSourceLabel(t),'Musicista');assert.deepEqual(copy(c.pg),before);
});
test('Main instrument profile accepts an imported id, and never gives ordinary benefits to a historical Prestige grade',()=>{
 const h=manager(),c=h.context;
 const current=c.instrEff({id:'flute',nome:'Flauto',tipo:'Fiati',die:'d8'});assert.equal(current.id,'instrument:flute');assert.equal(current.eff,'d8');assert.equal(current.soglia,5);
 const old=c.instrEff({id:'flute',tipo:'Fiati',die:'d20+d4'});assert.equal(old.grado,'d20+d4');assert.equal(old.legacy,true);assert.equal(old.valid,false);assert.equal(old.soglia,null);
});

test('The main Melody state label uses the current voice save rather than the Technique grade',()=>{
 const h=manager(),c=h.context;c.TBUILD.die='d20';c.TBUILD.instrumentId='instrument:voice';
 const label=c.tbEffectStateLabel('Requiem Beffardo');assert.match(label,/Soglia 3/);assert.match(label,/d4/);assert.doesNotMatch(label,/d20/);
});

test('Simple printing retains unknown and excess historical Melody names alongside the invalid profile',()=>{
 const h=manager(),c=h.context,t={...h.old,eff:['Inno della Ciurma','Melodia futura']};
 const before=copy(t),markup=c.psTecEff(t);assert.match(markup,/Inno della Ciurma/);assert.match(markup,/Melodia futura/);assert.match(markup,/Effetto storico da verificare/);assert.deepEqual(t,before);
});

test('The actual manager load preserves primitive and array instrument records without preventing startup',()=>{
 const h=manager(),c=h.context,records=[null,7,'historic',false,[],{nome:'Strumento valido senza ID',tipo:'Fiati',die:'d8',future:{keep:true}}];
 const stored=copy(c.CT);stored.chars.a.strumenti=copy(records);const raw=JSON.stringify(stored);let reads=0;
 c.localStorage={getItem:key=>{assert.equal(key,'glc_pirata_v4');reads++;return raw;}};c.location={search:''};c.URLSearchParams=URLSearchParams;
 vm.runInContext(html.slice(html.indexOf('const blank=()=>('),html.indexOf('let pg=blank();')),c);
 vm.runInContext(html.slice(html.indexOf('function migrateChar(c){'),html.indexOf('function save(){')),c);
 vm.runInContext(oneLine('load'),c);assert.doesNotThrow(()=>c.load());assert.equal(reads,1);
 assert.deepEqual(copy(c.pg.strumenti),records);assert.deepEqual(copy(c.CT.chars.a.strumenti),records);assert.equal(c.CT.chars.b.notes,'untouched');assert.deepEqual(copy(c.CT.extra),stored.extra);
 assert.equal(c.pg.extraTech[0].arma,'sword');assert.equal(c.pg.extraTech[0].modulo,'old-module');assert.equal(raw,JSON.stringify(stored));
});
