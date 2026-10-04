/* Run with node --test tests/glc-special-moves.test.cjs. Uses the live rule tables,
 * no network, no real character storage and no automatic resource consumption. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=process.env.GLC_TEST_ROOT||path.join(__dirname,'../..');
const html=fs.readFileSync(process.env.GLC_MOVES_HTML||path.join(root,'gestisci-pirata/index.html'),'utf8');
const source=fs.readFileSync(process.env.GLC_MOVES_SOURCE||path.join(root,'gestisci-pirata/special-moves.js'),'utf8');
function declaration(name){
 const start=html.indexOf('const '+name+'=');assert.ok(start>=0,name);
 const text=html.slice(start),first=text.indexOf('\n');
 const end=text.slice(0,first).includes(';')?text.indexOf(';')+1:text.search(/\n[}\]];/)+3;
 assert.ok(end>2,name+' end');return text.slice(0,end);
}
function oneLine(name){const found=html.match(new RegExp('^function '+name+'\\([^\\n]+','m'));assert.ok(found,name);return found[0];}
function setup(){
 const context=vm.createContext({window:{crypto:{randomUUID:()=> 'new-move'}},console,
  race:()=>null,styleVisible:()=>true,roleSkillDieOf:()=> 'd20',talentGlyph:()=> 'star',
  FORMA_ICO:{},STYLE_IMG:{},STYLE_ICON:{},ROLE_IMG:{},WEAPON_ICO:{},
  tbCompute:()=>({stato:{s:'ok',m:''}}),TBUILD:null,SMBD:null,
  weaponCompat:()=>({s:'ok'}),weaponStyleReq:()=> 'Striker',moduliVisibili:()=>true,
  modStateLabel:()=>({t:'Attivo'}),
 });
 vm.runInContext(['DICE','HAKI_NAMES','HAKI_PROG','TALENTS','FRUIT_TALENTS','TEC_DUR','TEC_EFF','TEC_EFF_ARCHIVIATI'].map(declaration).join('\n'),context);
 vm.runInContext(['hakiPip','hakiPipAxis','hakiMaxPip','hakiPipOf','hakiUnlocked','hakiGrade','dieRank','tecEffObj','tecCost'].map(oneLine).join('\n'),context);
 vm.runInContext(`globalThis.rules={TALENTS,FRUIT_TALENTS,HAKI_PROG,HAKI_NAMES};`,context);
 context.pg={role:'Combattente',style:'Striker',roleSkillDie:'d20',attr:{Forza:'d10',Spirito:'d20'},stCur:30,
  talents:['Combattente · Striker · Raffica — Base','Combattente · Striker · Pressione Costante','Combattente · Striker · Guardia del Combattente'],
  extraTech:[{id:'punch',nome:'Pugno di prova',fonte:'Stile',stile:'Striker',forma:'Singolo',attr:'Forza',die:'d10',eff:[],durata:'Un turno'},
   {id:'guard',nome:'Guardia di prova',fonte:'Stile',stile:'Striker',forma:'Difesa',attr:'Forza',die:'d10',eff:['Contrattacco'],durata:'Un turno'}],
  haki:context.rules.HAKI_NAMES.map((name,i)=>({name,die:'d20',pip:3,smcId:'color-'+i})),armi:[],moduli:[],frutto:{has:false},specialMoves:[]};
 for(const f of ['regole/prestigio-data.js','regole/prestigio.js','regole/prestigio-presentazione.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context);
 context.GLCPrestige=context.window.GLCPrestige;
 context.GLCPrestigeView=context.window.GLCPrestigeView;
 context.window.GLCPrestige.configure(context.rules.TALENTS);
 vm.runInContext(source,context);
 const moves=context.window.GLCMoves,ss=moves.sources();
 const talent=name=>ss.find(s=>s.kind==='talent'&&s.name===name).id;
 const colors=ss.filter(s=>s.kind==='haki').map(s=>s.id);
 const h=(i=0,extra={})=>({id:colors[i],use:'offense',effects:[],...extra});
 const card=extra=>({id:'fixture-move',name:'Special Move di prova',baseTechId:'tech:punch',...extra});
 const state=(i=0,extra={})=>{context.pg.specialMoveSession??={haki:{}};context.pg.specialMoveSession.haki[colors[i]]={active:true,pipRemaining:i===2?3:5,effects:{},...extra};};
 const resolve=extra=>moves.resolve(card(extra));
 return {context,moves,colors,h,card,state,resolve,talent};
}
const errorText=r=>r.errors.map(e=>e.text).join(' | ');
const hasBonusError=r=>r.errors.some(e=>e.code==='bonus');


function installRealBuilder(context){
 vm.runInContext(['TEC_FONTI','STILE_WHITELIST','TEC_FORME','TEC_DADI','TEC_RANK','TEC_SLOT','TEC_FAMS','STILI_NASCOSTI'].map(declaration).join('\n'),context);
 vm.runInContext(['isMusicista','isCombSpecial','styleVisible','combStyles','grpOf','isSagoma','slotUsed','fruitDieCap'].map(oneLine).join('\n'),context);
 vm.runInContext(html.slice(html.indexOf('function effVeto('),html.indexOf('function tecCost(')),context);
 vm.runInContext(html.slice(html.indexOf('function tbCompute('),html.indexOf('/* ---- 01 · Identità ---- */')),context);
 context.styleReady=()=>true;context.stileBlock=()=>'';context.fruttoBlock=()=>'';
 return tech=>{context.TBUILD=JSON.parse(JSON.stringify(tech));return context.tbCompute();};
}
module.exports={setup,errorText,hasBonusError,installRealBuilder};
