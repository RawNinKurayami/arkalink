/* GLC language is presentation only. Italian identifiers and saves stay intact. */
(function(root){
'use strict';
const pages=['grand-line-chronicles','crea-il-tuo-pirata','gestisci-pirata','profilo','sessioni','campagne','plancia-master','portale-officina-cambusa','nave-portale','isola','notizie','scheda-stampabile','manuali','manuale','manuale-prestigio','manuale-cyborg','manuale-frutti'];
const manuals=new Set(['manuale','manuale-prestigio','manuale-cyborg','manuale-frutti']);
const preference='arkalink.glc.language'; // Outside all synced game namespaces.
const here=new URL(root.location.href), parts=here.pathname.split('/').filter(Boolean);
const englishPath=parts[0]==='en', folder=parts[englishPath?1:0];
if(!pages.includes(folder))return;
let stored='it';try{stored=root.localStorage.getItem(preference)||'it';}catch(_){}
const query=here.searchParams.get('lang');
const language=(query==='en'||query==='it')?query:(englishPath?'en':stored==='en'?'en':'it');
if(query==='en'||query==='it')try{root.localStorage.setItem(preference,language);}catch(_){}
document.documentElement.lang=language;
document.documentElement.dataset.glcLanguage=language;

function url(value,lang=language){
 let u;try{u=new URL(value,root.location.href);}catch(_){return value;}
 if(u.origin!==here.origin)return value;
 const bits=u.pathname.split('/').filter(Boolean), wasEnglish=bits[0]==='en', page=bits[wasEnglish?1:0];
 if(!pages.includes(page))return value;
 if(manuals.has(page)){
  if(lang==='en'&&!wasEnglish)u.pathname='/en'+u.pathname;
  if(lang==='it'&&wasEnglish)u.pathname=u.pathname.slice(3);
  u.searchParams.delete('lang');
 }else if(lang==='en')u.searchParams.set('lang','en');
 else u.searchParams.set('lang','it');
 return u.pathname+u.search+u.hash;
}
if(manuals.has(folder)&&englishPath!==(language==='en')){
 root.location.replace(url(here.href));return;
}

const original=new WeakMap(), protectedText=new Set(), protectedFolded=new Set(), editedFields=new Set(), savedText=new Map();
const ignored='[data-glc-user-text],[translate="no"],textarea,[contenteditable],script,style,svg,noscript,.glc-language,.glc-name,.article-body,.news-card-copy h3,.news-card-copy>p';
const personalSelectors='#profile-bio,#pname,#dossier-name,#dossier-ambition,#s-nome,#s-amb,#s-frutto>b,#who,#resume-name,#resume-session,#resume-ship,.gh-name,.gh-amb,.lamb,.ch-name,.pc-nome,.deck-name,.deck-title,.campaign-name,.evtit,.logtit,.et,.tt-captain-name>span,.smb-core-name,.eq-core-name,.eq-n,.cvw-title,.cvw-sub,.cvw-name,.cvw-quote,.cvw-eyebrow,.cvw-desc,.ds-name,.ds-effect-name,.ds-weapon-effect>p,.ds-linked-item strong,.gc-n,.slot-n,.sc-n,.invn,.ps-name,.ps-amb,.ps-bg,.glcmap-lbl,.glcmap-place>span,.glcmap-read,.glcmap-card>h4';
let dictionary=new Map(), htmlDictionary=new Map(), templates=[], observer, loaded=false;
const normal=s=>String(s).replace(/\s+/g,' ').trim();
const htmlNormal=s=>{const t=document.createElement('template');t.innerHTML=s;return t.innerHTML.trim();};
const escape=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function protect(value,parent=''){
 if(!value||typeof value!=='object')return;
 if(Array.isArray(value)){value.forEach(x=>protect(x,parent));return;}
 for(const [key,item] of Object.entries(value)){
  if(typeof item==='string'&&['nome','name','desc','description','descrizione','note','notes','amb','bg','bio','username','titolo','ambition','ambizione','background','quote','subtitle','title','body'].includes(key)&&parent!=='haki'&&!value.fixed&&!/^Haki (?:dell|del)/.test(item)){protectedText.add(normal(item));protectedFolded.add(normal(item).toLocaleLowerCase());}
  else if(item&&typeof item==='object')protect(item,key);
 }
}
function collectUserText(){
 try{['glc_pirata_v4','glc_profile_v1','glc_sessioni_v1','glc_campagne_v1','glc_officina_v1','glc_cambusa_v1','glc_nave_v1','glc_bestiario_v1','glc_scontro_v1','glc_atlante_v1'].forEach(key=>{const s=(root.GLCStore||root.localStorage).getItem(key);if(s&&s!==savedText.get(key))try{protect(JSON.parse(s));savedText.set(key,s);}catch(_){}});}catch(_){}
}
function isPersonal(value){const s=normal(value);return protectedText.has(s)||protectedFolded.has(s.replace(/^[“«"]|[”»"]$/g,'').toLocaleLowerCase());}
function personalNode(node){
 const element=node.nodeType===Node.ELEMENT_NODE?node:node.parentElement;
 if(element?.closest('.slot.add'))return false;
 if(element?.closest(personalSelectors))return true;
 const option=element?.closest('option');
 return !!option&&option.value.toLocaleLowerCase()!==normal(option.textContent).toLocaleLowerCase()&&isPersonal(option.textContent);
}
function text(value,preservePersonal=false){
 const raw=String(value??'');if(language!=='en'||!loaded)return raw;
 const clean=normal(raw);if(preservePersonal&&isPersonal(clean))return raw;
 let result=dictionary.get(clean);
 if(result===undefined){
  const folded=dictionary.get(clean.toLocaleLowerCase('it'));
  if(folded!==undefined)result=clean===clean.toUpperCase()?folded.toUpperCase():folded;
 }
 if(result===undefined){
  for(const item of templates){const match=clean.match(item.re);if(match){result=item.en.replace(/\{\{(\d+)\}\}/g,(_,n)=>text(match[+n]??'',preservePersonal));if(clean===clean.toUpperCase())result=result.toUpperCase();break;}}
 }
 if(result===undefined){
  // Common dynamic counters and combinations keep their values and names.
  const bits=clean.split(/(\s*[·→|&]\s*|\s*[\(\)\[\]]\s*|\s*:\s*|\s*\/\s*|\s*\bd\d+(?:\+d\d+)*\s*|\s*\d+(?:[.,]\d+)?\s*)/);
  if(bits.length>1){let changed=false;result=bits.map((bit,i)=>{if(i%2)return bit;const key=normal(bit),out=dictionary.get(key)??dictionary.get(key.toLocaleLowerCase('it'));if(out!==undefined){changed=true;return key===key.toUpperCase()?out.toUpperCase():out;}return bit;}).join('');if(!changed)result=undefined;}
 }
 if(result===undefined)return raw;
 return raw.slice(0,raw.length-raw.trimStart().length)+result+raw.slice(raw.trimEnd().length);
}
function setText(n,value){
 const current=n.nodeValue,previous=original.get(n);
 const before=previous&&previous.en===current?previous.it:current;
 if(current!==value){original.set(n,{it:before,en:value});n.nodeValue=value;}
}
function originalText(n){
 if(!n)return '';
 if(n.nodeType===Node.TEXT_NODE){const saved=original.get(n);return saved&&saved.en===n.nodeValue?saved.it:n.nodeValue;}
 return Array.from(n.childNodes).map(originalText).join('');
}
function inlineText(node,translated){
 // Update existing text nodes, retaining listeners, focus and game bindings.
 const target=document.createElement('template');target.innerHTML=translated;
 const sourceWalker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),targetWalker=document.createTreeWalker(target.content,NodeFilter.SHOW_TEXT);
 const a=[],b=[];let n;while((n=sourceWalker.nextNode()))a.push(n);while((n=targetWalker.nextNode()))b.push(n);
 if(a.length!==b.length)return;
 a.forEach((n,i)=>{if(!n.parentElement?.closest(ignored)&&!(personalNode(n)&&isPersonal(n.nodeValue)))setText(n,b[i].nodeValue);});
}
function searchText(value){const s=String(value??'');return s+' '+text(s);}
function apply(node=document.body){
 if(language!=='en'||!loaded||!node)return;
 if(node.nodeType===Node.TEXT_NODE){
  if(node.parentElement?.closest(ignored))return;
  const before=node.nodeValue;if(original.get(node)?.en===before)return;
  if(normal(before)==='a'&&/^d\d/.test(node.previousSibling?.textContent.trim()||'')&&/^d\d/.test(node.nextSibling?.textContent.trim()||'')){setText(node,before.replace('a','to'));return;}
  const after=text(before,personalNode(node));if(after!==before)setText(node,after);
  return;
 }
 if(node.nodeType!==Node.ELEMENT_NODE||node.matches(ignored)||node.closest('[data-glc-user-text],[translate="no"]'))return;
 const personalContent=personalNode(node)&&isPersonal(node.textContent);
 // Without a value attribute, changing an option's label changes its value.
 if(node.tagName==='OPTION'&&!node.hasAttribute('value'))node.value=node.textContent;
 for(const name of ['title','aria-label','placeholder','alt'])if(node.hasAttribute(name)){
  const old=node.getAttribute(name),next=text(old,personalNode(node)||node.matches(".pirata-carta,.pc-open,.pc-x"));if(old!==next)node.setAttribute(name,next);
 }
 if(node.matches('input[type="button"],input[type="submit"]')){const old=node.value,next=text(old);if(old!==next)node.value=next;}
 if(node.matches('link[rel="manifest"]')&&language==='en')node.setAttribute('href','/en/manifest.webmanifest');
 if(node.matches('a[href]')){const next=url(node.getAttribute('href'));if(next!==node.getAttribute('href'))node.setAttribute('href',next);}
 if(personalContent)return;
 const inner=node.innerHTML.trim(),translated=htmlDictionary.get(inner);
 if(translated!==undefined&&translated!==inner&&!node.querySelector('input,select,textarea,button,[data-glc-user-text],[translate="no"]')&&!Array.from(node.querySelectorAll('a,span')).some(n=>n.onclick||n.onchange)){
  inlineText(node,translated);
 }
 Array.from(node.childNodes).forEach(apply);
}
function select(lang){
 if(lang!=='it'&&lang!=='en')return;
 // Reloading must not discard an unfinished form or trigger a cloud write.
 const unsaved=Array.from(editedFields).some(n=>n.isConnected&&!n.readOnly&&!n.disabled&&n.closest('form,[role="dialog"],#modal,.modal,.sb-scene,.eq-scene,.smb-scene,.glc-auth-panel,#mbody')&&!n.matches('[type="search"]'));
 if(unsaved&&!root.confirm(language==='en'?'Change language? Save any unfinished form first; its draft will be lost.':'Cambiare lingua? Salva prima il modulo in corso: la bozza non salvata verrà persa.'))return;
 try{root.localStorage.setItem(preference,lang);}catch(_){}
 root.location.assign(url(root.location.href,lang));
}
function decorateCovers(){
 if(language!=='en')return;
 const titles={'manuale-di-gioco':'Game Manual','manuale-del-prestigio':'Prestige Manual','manuale-del-cyborg':'Cyborg Manual','manuale-dei-frutti':'Devil Fruit Manual'};
 for(const cover of document.querySelectorAll('.man-copertina,.pr-book-art')){
  if(cover.querySelector('.glc-cover-en'))continue;
  const image=cover.querySelector('img');if(!image)continue;
  const key=Object.keys(titles).find(k=>image.src.includes(k));if(!key)continue;
  const caption=document.createElement('span');caption.className='glc-cover-en';caption.setAttribute('translate','no');caption.setAttribute('aria-hidden','true');
  const title=document.createElement('strong');title.textContent=titles[key];const mark=document.createElement('small');mark.textContent='ARKALINK';caption.append(title,mark);cover.appendChild(caption);
 }
}
function mount(){
 if(document.querySelector('.glc-language'))return;
 const box=document.createElement('div');box.className='glc-language';box.setAttribute('role','group');box.setAttribute('aria-label',language==='en'?'Language':'Lingua');
 for(const code of ['it','en']){
  const b=document.createElement('button');b.type='button';b.textContent=code.toUpperCase();b.lang=code;b.setAttribute('aria-label',code==='it'?'Italiano':'English');b.setAttribute('aria-pressed',String(code===language));b.addEventListener('click',()=>select(code));box.appendChild(b);
 }
 const host=document.querySelector('.man-strumenti,.home-nav,.pr-top nav,.noprint-bar')||document.querySelector('header.topbar,header.pf-top,.topbar,.topbar-scena,header');
 if(host){host.classList.add('glc-language-host');host.appendChild(box);}else{box.classList.add('glc-language-floating');document.body.appendChild(box);}
}
function catalog(entries){
 const decoder=document.createElement('textarea');
 const visible=value=>{decoder.innerHTML=value.replace(/<[^>]+>/g,'');return normal(decoder.value);};
 for(const [it,en] of Object.entries(entries)){
  if(!en||it===en)continue;
  const source=normal(it),target=normal(en);
  if(/<[^>]+>/.test(it))htmlDictionary.set(htmlNormal(it),en);
  const plainIt=visible(it),plainEn=visible(en);
  dictionary.set(source,target);dictionary.set(source.toLocaleLowerCase('it'),target);
  dictionary.set(plainIt,plainEn);dictionary.set(plainIt.toLocaleLowerCase('it'),plainEn);
  if(source.includes('{{')){
   const numbers=[];const re=escape(source).replace(/\\\{\\\{(\d+)\\\}\\\}/g,(_,n)=>{numbers.push(+n);return '(.+?)';});
   if(numbers.every((n,i)=>n===i+1))templates.push({re:new RegExp('^'+re+'$','i'),en:target,specificity:source.replace(/\{\{\d+\}\}/g,'').length});
  }
 }
 // Complete phrases must precede generic counters such as “{{1}} available”.
 templates.sort((a,b)=>b.specificity-a.specificity);
 loaded=true;collectUserText();apply();decorateCovers();document.documentElement.removeAttribute('data-glc-language-pending');
 document.dispatchEvent(new CustomEvent('glc-language-ready',{detail:{language}}));
}
root.GLCI18n={language,locale:language==='en'?'en-GB':'it-IT',text,url,apply,catalog,originalText,searchText,protect,ready:()=>loaded||language==='it'};
if(language==='en'){
 document.documentElement.setAttribute('data-glc-language-pending','');
 const script=document.createElement('script');script.src='/locales/en/catalog.js?v=1';script.async=false;
 script.onerror=()=>{document.documentElement.removeAttribute('data-glc-language-pending');console.error('[GLC] English catalogue unavailable');};document.head.appendChild(script);
 // Never lock a page indefinitely if a connection stalls.
 root.setTimeout(()=>document.documentElement.removeAttribute('data-glc-language-pending'),4000);
 for(const method of ['alert','confirm','prompt']){
  const native=root[method].bind(root);root[method]=function(message,...args){return native(text(message,true),...args);};
 }
}
function start(){
 mount();collectUserText();apply();decorateCovers();
 if(language==='en')document.querySelector('link[rel="manifest"]')?.setAttribute('href','/en/manifest.webmanifest');
 document.addEventListener('input',event=>{if(event.isTrusted&&event.target.matches('input,textarea,select'))editedFields.add(event.target);},true);
 document.addEventListener('submit',event=>{for(const field of editedFields)if(event.target.contains(field))editedFields.delete(field);},true);
 observer=new MutationObserver(records=>{collectUserText();const roots=new Set();for(const r of records){if(r.type==='characterData')roots.add(r.target);else if(r.type==='attributes')roots.add(r.target);else r.addedNodes.forEach(n=>roots.add(n));}for(const n of roots)if(n.isConnected)apply(n);});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt','href']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
root.addEventListener('storage',event=>{if(event.key===preference&&['it','en'].includes(event.newValue))return;collectUserText();});
})(window);
