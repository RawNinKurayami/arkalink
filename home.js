(function(){
  'use strict';
  const N=window.GLCNews,$=id=>document.getElementById(id);
  const initial=$('resume').innerHTML;
  let sessionKnown=false,userId=null,authGeneration=0;
  function stored(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}}
  function active(container,collection){if(!container||typeof container!=='object')return null;const items=container[collection];if(!items||typeof items!=='object')return null;const ids=[container.activeId,...(Array.isArray(container.order)?container.order:[]),...Object.keys(items)];const id=ids.find(id=>id&&Object.hasOwn(items,id)&&items[id]&&typeof items[id]==='object');return id?{id,item:items[id]}:null;}
  function name(value,fallback){return typeof value==='string'&&value.trim()?value.trim():fallback;}
  function link(id,text,href){const a=$(id);a.replaceChildren(document.createTextNode(text),N.node('span','','↗'));a.href=href;}
  function resume(){const focused=document.activeElement,focusId=focused?.closest?.('#resume')?focused.id:null;try{renderResume();}finally{if(focusId&&$(focusId))$(focusId).focus({preventScroll:true});}}
  function renderResume(){
    $('resume').innerHTML=initial;$('resume').classList.remove('has-pirate');
    if(!sessionKnown)return;
    let owner;try{owner=localStorage.getItem('glc_utente');}catch(_){return;}
    const state=window.GLCSync?.stato();
    if(userId&&(owner!==userId||!window.GLCSync?.collegato()||!state?.ready)){$('resume-status').textContent='Sto ritrovando il tuo registro di bordo…';return;}
    if(!userId&&owner){$('resume-status').textContent='Accedi per ritrovare il tuo registro di bordo.';return;}
    const ct=stored('glc_pirata_v4'),c=active(ct,'chars');
    // Legacy single-character saves can be opened by the existing management page.
    const legacy=ct&&!ct.chars&&typeof ct.nome==='string'?ct:null;
    const pirate=c?.item||legacy;
    if(pirate){
      $('resume').classList.add('has-pirate');$('resume-kicker').textContent='Il tuo pirata · Pronto a salpare';
      $('resume-name').textContent=name(pirate.nome,'Pirata senza nome');
      const role=[pirate.role,pirate.style].filter(v=>typeof v==='string'&&v.trim());
      $('resume-description').textContent=role.join(' · ')||'La tua scheda, pronta per la prossima avventura.';
      link('resume-link','Riprendi il viaggio',c?'/gestisci-pirata/?c='+encodeURIComponent(c.id):'/gestisci-pirata/');
      $('resume-secondary').textContent='Cambia pirata';$('resume-secondary').href='/profilo/';
      const src=N.imageURL(pirate.photo);if(src){const img=document.querySelector('.resume-art img');img.src=src;const p=pirate.photoPos||{},clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):fallback;const pos=clamp(p.x,0,100,50)+'% '+clamp(p.y,0,100,50)+'%';img.style.objectPosition=pos;img.style.transformOrigin=pos;img.style.transform='scale('+clamp(p.z,1,4,1)+')';}
    }
    const st=stored('glc_sessioni_v1');let s=active(st,'sessions');
    // A linked session is preferable; never label another pirate's session as theirs.
    if(c&&s?.item.persId!==c.id){const match=Object.entries(st?.sessions||{}).find(([,s])=>s&&s.persId===c.id);s=match?{id:match[0],item:match[1]}:null;}
    if(s)link('resume-session',name(s.item.nome,'La tua sessione'),'/sessioni/?s='+encodeURIComponent(s.id));
    const nt=stored('glc_nave_v1'),linked=s?.item.shipId;const sh=linked&&nt?.ships?.[linked]?{id:linked,item:nt.ships[linked]}:active(nt,'ships');
    if(sh)link('resume-ship',name(sh.item.nome,'La tua nave'),'/nave-portale/?n='+encodeURIComponent(sh.id));
    $('resume-status').textContent=userId?'Il tuo registro personale.':pirate||s||sh?'Registro salvato su questo dispositivo.':'Il viaggio si costruisce, una sessione alla volta.';
  }
  async function auth(session){const generation=++authGeneration;sessionKnown=true;userId=session?.user?.id||null;resume();$('news-editor-link').hidden=true;const allowed=await N.canEdit();if(generation===authGeneration)$('news-editor-link').hidden=!allowed;}
  if(window.__glcSB){window.__glcSB.auth.getSession().then(r=>auth(r.data?.session)).catch(()=>auth(null));window.__glcSB.auth.onAuthStateChange((_event,s)=>{sessionKnown=false;resume();setTimeout(()=>auth(s),0);});}else{sessionKnown=true;resume();}
  window.addEventListener('glc:sync-status',resume);window.addEventListener('storage',resume);window.addEventListener('pageshow',resume);
  async function news(){try{const rows=await N.list({limit:3,home:true});if(rows.length)$('home-news').replaceChildren(...rows.map(N.card));else $('news-status').textContent='Il primo dispaccio arriverà qui.';}catch(_){$('news-status').textContent='Le notizie non sono raggiungibili al momento. Riprova più tardi.';}}
  news();
  const needle=$('log-needle'),label=$('log-label');
  document.querySelectorAll('[data-bearing]').forEach(a=>{function point(){needle.style.setProperty('--bearing',a.dataset.bearing+'deg');label.textContent=a.dataset.destination;}a.addEventListener('pointerenter',point);a.addEventListener('focus',point);});
})();
