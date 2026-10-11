/* Exercise the actual UI callbacks with the real Trait and Upgrade engines.
 * Small in-memory DOM; no browser, cloud, storage or personal characters. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=process.env.GLC_TEST_ROOT||path.join(__dirname,'..');
const uiRoot=process.env.GLC_UI_ROOT||root;
function makeDocument(){
 const doc={activeElement:null};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes={};this.dataset={};this.listeners={};this.className='';this.scrollTop=0;this.disabled=false;this.open=false;this.value='';}
  get parentElement(){return this.parentNode;}
  get classList(){const n=this;return{contains:c=>n.className.split(' ').includes(c),add(...cs){n.className=[...new Set([...n.className.split(' '),...cs])].join(' ');}};}
  set textContent(v){this.children=[];this._text=String(v);}
  get textContent(){return(this._text||'')+this.children.map(c=>c.textContent).join('');}
  appendChild(n){if(n.parentNode)n.remove();this.children.push(n);n.parentNode=this;return n;}
  append(...ns){ns.forEach(n=>this.appendChild(typeof n==='string'?doc.createTextNode(n):n));}
  replaceChildren(...ns){this.children.forEach(c=>c.parentNode=null);this.children=[];this._text='';this.append(...ns);}
  remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
  setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=String(v);if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=String(v);}
  getAttribute(k){if(k==='class')return this.className;if(k.startsWith('data-'))return this.dataset[k.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]??null;return this.attributes[k]??null;}
  matches(selector){return selector.split(',').some(sel=>{sel=sel.trim();if(sel.startsWith('.'))return sel.slice(1).split('.').every(c=>this.classList.contains(c));if(sel.startsWith('#'))return this.id===sel.slice(1);const m=sel.match(/^(\w+)?(?:\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\])?$/);return!!m&&(!m[1]||this.tagName===m[1].toUpperCase())&&(!m[2]||(this.getAttribute(m[2])!==null&&(!m[3]||this.getAttribute(m[2])===m[3])));});}
  querySelectorAll(sel){return this.children.flatMap(c=>[...(c.matches(sel)?[c]:[]),...c.querySelectorAll(sel)]);}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  dispatch(type,values={}){const e={target:this,key:'',shiftKey:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...values};(this.listeners[type]||[]).forEach(f=>f(e));return e;}
  click(){if(this.disabled)return;this.focus();this.dispatch('click');}
  focus(){doc.activeElement=this;}
  scrollIntoView(){this.scrolled=true;}
 }
 doc.createElement=tag=>new Element(tag);doc.createTextNode=text=>{const n=new Element('#text');n.textContent=text;return n;};doc.body=doc.createElement('body');doc.activeElement=doc.body;return doc;
}
function setup(extra={},options={}){
 const document=makeDocument(),context=vm.createContext({document,console});
 context.window=context;context.matchMedia=()=>({matches:!!options.mobile});
 for(const file of ['regole/avanzamento.js','regole/tratti-data.js','regole/tratti.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 vm.runInContext(fs.readFileSync(path.join(uiRoot,'gestisci-pirata/tratti-ui.js'),'utf8'),context);
 const T=context.GLCTratti,A=context.GLCAdvancement;
 let c={nome:'Pirata test',attr:{Forza:'d12',Tecnica:'d4',Spirito:'d4',Astuzia:'d4'},skills:{Atletica:'d10'},talents:[],talentChoices:{version:1,granted:1},photo:'preserve',...extra};
 T.configure({talentBudget:(c,{take})=>take?A.canAcquire(c):{allowed:true},resolveSkill:(c,skill)=>c.skills[skill]||''});
 let saves=0,closed=0;
 const host=document.createElement('div');document.body.appendChild(host);
 const screen=context.GLCTrattiUI.mount(host,{getCharacter:()=>c,choicesInfo:c=>A.talentChoices(c),selected:options.selected,onClose:()=>closed++,
  onGrantChoice:()=>{A.grant(c);saves++;},onSetChoices:v=>{A.setGranted(c,v);saves++;},
  onChoose:options.onChoose||((id,take)=>{const next=JSON.parse(JSON.stringify(c));T.choose(next,id,take);c=next;saves++;})});
 const find=key=>screen.element.querySelectorAll('[data-ut-focus]').find(n=>n.dataset.utFocus===key);
 return{document,context,T,A,screen,host,find,get c(){return c;},get saves(){return saves;},get closed(){return closed;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Opening, searching and navigating all 31 illustrated Traits never awards choices or mutates the character',()=>{
 const s=setup(),before=JSON.stringify(s.c);
 s.find('path-all').click();assert.equal(s.screen.element.querySelectorAll('.ut-sigil').length,31);
 for(const img of s.screen.element.querySelectorAll('img'))assert.ok(fs.existsSync(path.join(root,img.src)),img.src);
 const search=s.find('search');search.value='medicina';search.dispatch('input');assert.equal(s.screen.element.querySelectorAll('.ut-sigil').length,2);
 s.find('path-Tecnica').click();assert.equal(search.value,'');assert.ok(s.screen.element.querySelectorAll('.ut-sigil').every(n=>s.T.trait(n.dataset.traitId).attribute==='Tecnica'));
 assert.equal(JSON.stringify(s.c),before);assert.equal(s.saves,0);
});
test('Direct Upgrade registration grants exactly one shared choice, no P.A., PV, ST or Prestige; correction enforces the existing lower bound',async()=>{
 const s=setup({talents:['old-talent'],pvCur:8,stCur:3,pa:{Forza:9},upgrade:'veterano',prestige:{choices:['kept']}}),before=JSON.stringify(s.c);
 const grant=s.find('upgrade-grant');grant.click();grant.click();await flush();
 assert.equal(s.A.talentChoices(s.c).granted,2);assert.equal(s.A.talentChoices(s.c).remaining,1);assert.equal(s.saves,1);
 const changed=JSON.parse(before);changed.talentChoices.granted=2;assert.equal(JSON.stringify(s.c),JSON.stringify(changed));
 const input=s.find('upgrade-total');input.value='0';s.screen.element.querySelector('.ut-upgrade-form').dispatch('submit');await flush();
 assert.equal(s.A.talentChoices(s.c).granted,2);assert.match(s.screen.element.querySelector('.ut-upgrade-feedback').textContent,/acquisizioni/);
 input.value='3';s.screen.element.querySelector('.ut-upgrade-form').dispatch('submit');await flush();assert.equal(s.A.talentChoices(s.c).granted,3);
});
test('Acquisition updates budget and defense, survives JSON save/reload, and removal restores the shared choice',async()=>{
 const s=setup();assert.equal(s.find('acquire').disabled,false);s.find('acquire').click();await flush();
 assert.equal(s.T.derivedDP(s.c),2);assert.equal(s.A.talentChoices(s.c).remaining,0);assert.equal(s.saves,1);
 assert.equal(s.T.active(JSON.parse(JSON.stringify(s.c)))[0].id,'corpo-mostruoso');
 s.find('remove').click();await flush();assert.equal(s.T.derivedDP(s.c),0);assert.equal(s.A.talentChoices(s.c).remaining,1);assert.equal(s.saves,2);
});
test('Unlocked with no spare choice is distinct from missing requirements; only eligible acquisitions become enabled',async()=>{
 const s=setup({talentChoices:{granted:0}});assert.equal(s.find('acquire').disabled,true);assert.match(s.find('acquire').textContent,/Upgrade/);
 s.find('upgrade-grant').click();await flush();assert.equal(s.find('acquire').disabled,false);
 s.find('trait-fortezza-vivente').click();assert.equal(s.find('acquire').disabled,true);assert.match(s.screen.element.querySelector('.ut-requirements').textContent,/Forza d20/);
 assert.equal(s.c.uniqueTraits,undefined);
});
test('Only the actual evolution is connected; its acquired prerequisite cannot be removed while needed',async()=>{
 const s=setup({attr:{Forza:'d20'},skills:{Atletica:'d12'},talentChoices:{granted:2}});
 s.find('path-all').click();assert.equal(s.screen.element.querySelectorAll('.ut-evolution-edge').length,1);
 s.find('trait-corpo-mostruoso').click();s.find('acquire').click();await flush();
 s.find('trait-fortezza-vivente').click();s.find('acquire').click();await flush();assert.equal(s.T.derivedDP(s.c),4);
 s.find('trait-corpo-mostruoso').click();assert.equal(s.find('remove').disabled,true);assert.match(s.screen.element.querySelector('.ut-detail-hero').textContent,/Evoluto/);
 s.find('trait-fortezza-vivente').click();s.find('remove').click();await flush();assert.equal(s.T.derivedDP(s.c),2);assert.equal(s.A.talentChoices(s.c).remaining,1);
});
test('Inactive acquisitions remain visible and preserved; rejected writes show a contextual error without success',async()=>{
 const s=setup({attr:{Forza:'d4'},uniqueTraits:{acquired:['corpo-mostruoso']}},{selected:'corpo-mostruoso'});
 assert.match(s.screen.element.querySelector('.ut-detail-hero').textContent,/Inattivo/);assert.equal(s.T.active(s.c).length,0);assert.equal(s.c.uniqueTraits.acquired.length,1);
 const failed=setup({}, {onChoose:async()=>{throw Error('Scelta già utilizzata.');}}),before=JSON.stringify(failed.c);
 failed.find('acquire').click();await flush();assert.match(failed.screen.element.querySelector('.ut-error').textContent,/già utilizzata/);assert.equal(JSON.stringify(failed.c),before);
});
test('One selected Trait contains the full official rule and current requirements; filtered empty views remain navigable',()=>{
 const s=setup();s.find('path-all').click();
 for(const t of s.T.data.traits){s.find('trait-'+t.id).click();const detail=s.screen.element.querySelector('.ut-inspector').textContent;for(const effect of t.effects)assert.ok(detail.includes(effect),t.name);}
 s.find('filter-acquired').click();assert.ok(s.screen.element.querySelector('.ut-empty'));assert.equal(s.screen.element.querySelectorAll('.ut-sigil').length,0);
 s.find('filter-all').click();assert.equal(s.screen.element.querySelectorAll('.ut-sigil').length,31);
});
test('Keyboard focus stays in the screen and Escape closes it; mobile selection moves to detail and returns to its sigil',()=>{
 const s=setup({}, {mobile:true});s.find('trait-corpo-mostruoso').click();assert.equal(s.screen.element.querySelector('.ut-inspector').scrolled,true);
 s.screen.element.querySelector('.ut-mobile-back').click();assert.equal(s.document.activeElement.dataset.utFocus,'trait-corpo-mostruoso');
 const back=s.screen.element.querySelector('.ut-back');back.focus();let e=s.screen.element.dispatch('keydown',{key:'Tab',shiftKey:true});assert.equal(e.prevented,true);
 e=s.screen.element.dispatch('keydown',{key:'Tab'});assert.equal(e.prevented,true);assert.equal(s.document.activeElement,back);
 e=s.screen.element.dispatch('keydown',{key:'Escape'});assert.equal(s.closed,1);assert.equal(e.stopped,true);
});
test('Dashboard acquired sigils open their own details, including inactive and evolved traits',()=>{
 const s=setup({uniqueTraits:{acquired:['corpo-mostruoso']}});let selected='';
 const summary=s.context.GLCTrattiUI.summary(s.c,{onOpen:id=>selected=id});summary.querySelector('.ut-owned-sigil').click();assert.equal(selected,'corpo-mostruoso');
});
test('Host Upgrade handler saves through the existing render path without rebuilding or opening the dashboard modal',()=>{
 const html=fs.readFileSync(path.join(uiRoot,'gestisci-pirata/index.html'),'utf8');
 const code=html.slice(html.indexOf('function updateUpgradeChoices('),html.indexOf('\nfunction upgradeChoiceControl('));
 const s=setup();let saved=0,refresh=0;Object.assign(s.context,{pg:s.c,TT:{open:false},MODAL:null,render:()=>saved++});
 s.document.querySelectorAll=()=>[{refresh:()=>refresh++}];vm.runInContext(code,s.context);s.context.updateUpgradeChoices();
 assert.equal(saved,1);assert.equal(refresh,1);assert.equal(s.A.talentChoices(s.c).granted,2);
 assert.throws(()=>s.context.updateUpgradeChoices(-1),/intero/);assert.equal(saved,1);
});
