/* GLC dossier presentation. Existing controls own all game state and saves. */
(function(){
 'use strict';
 const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
 const icon=(name,size=24)=>{const n=make('span','ds-icon');n.innerHTML=svgIcon(name,size);n.setAttribute('aria-hidden','true');return n;};
 const text=(n)=>n?.textContent?.trim()||'';
 const titles={signature:'Signature Move',legacy:'Tecnica',module:'Modulo installato',weapon:'Arma personale'};
 function section(title,nodes=[],cls=''){
  const s=make('section','ds-section '+cls);
  if(title)s.append(make('h3','ds-section-title',title));
  s.append(...nodes);return s;
 }
 function disclosure(title,nodes=[],key=''){
  const d=make('details','ds-disclosure');d.dataset.dsDisclosure=key||title;
  d.append(make('summary','',title),...nodes);return d;
 }
 function metric(label,value){const d=make('div','ds-stat');d.append(make('span','ds-stat-label',label),make('strong','ds-stat-value',value||'—'));return d;}
 function seal(kind,item,legacy){
  const n=make('div','ds-seal');n.setAttribute('aria-hidden','true');
  let html='',glyph=kind==='module'?'gear':kind==='weapon'?(WEAPON_ICO[item.tipo]||'sword'):'star';
  if(kind==='signature'){
   const key=item.fonte==='Frutto'?'frutto':(STYLE_IMG[item.stile]||ROLE_IMG[item.stile]);
   html=key?emblem(key,100):svgIcon(STYLE_ICON[item.stile]||STYLE_ICON[item.fruitType]||'star',58);
  }else if(kind==='legacy'&&legacy?.fixed){const r=race();html=r&&RACE_IMG[r.id]?emblem(RACE_IMG[r.id],100):svgIcon('star',58);}
  else html=svgIcon(glyph,58);
  n.innerHTML=html;return n;
 }
 function shell(w,kind,item,legacy){
  const old=[...w.children];w.classList.add('ds-root','ds-sheet','ds-'+kind);w.dataset.dsKind=kind;
  const hero=make('aside','ds-hero'),main=make('div','ds-main'),foot=make('footer','ds-command');
  hero.append(make('div','ds-eyebrow',titles[kind]),seal(kind,item,legacy));
  w.replaceChildren(hero,main,foot);
  return{old,hero,main,foot};
 }
 function takeField(nodes,label){
  const i=nodes.findIndex(n=>n.matches('label.fld')&&text(n).startsWith(label));
  return i<0?[]:nodes.splice(i,2);
 }
 function technique(w,kind,t,legacy){
  const {old,hero,main,foot}=shell(w,kind,t,legacy);
  const actions=old.filter(n=>n.classList.contains('addrow'));actions.forEach(n=>{old.splice(old.indexOf(n),1);foot.append(n);});
  const name=old.find(n=>n.querySelector('input'));
  if(name){old.splice(old.indexOf(name),1);name.classList.add('ds-name-field');hero.append(name);}
  else hero.append(make('h2','ds-name',legacy?.name||t.name||t.nome||'Tecnica'));
  const stats=make('div','ds-stats');hero.append(stats);
  const summary=old.find(n=>n.classList.contains('tdsub'));
  if(summary){old.splice(old.indexOf(summary),1);hero.append(disclosure('Specifiche complete',[summary],'specs'));}
  const effect=old.find(n=>n.classList.contains('tddesc'));
  if(effect){
   old.splice(old.indexOf(effect),1);
   if(kind==='signature'){
    effect.classList.add('ds-effects');
    [...effect.children].forEach((n,i)=>{n.classList.add('ds-effect');n.prepend(icon('star',18),make('span','ds-effect-number',String(i+1).padStart(2,'0')));});
   }
   main.append(section(kind==='signature'?'Effetti della tecnica':'Capacità razziale',[effect],'ds-primary'));
  }else if(kind==='signature')main.append(section('Effetti della tecnica',[make('p','ds-empty','Nessun effetto selezionato.')],'ds-primary'));
  const links=old.filter(n=>n.querySelector('.compat'));
  if(links.length){links.forEach(n=>old.splice(old.indexOf(n),1));main.append(section('Condizioni e collegamenti',links,'ds-links'));}
  const attribute=takeField(old,'Attributo'),pa=takeField(old,'Progressione');
  if(attribute.length||pa.length)main.append(section('Padronanza',[...attribute,...pa],'ds-progression'));
  const description=takeField(old,'Descrizione');
  if(description.length)main.append(disclosure('Descrizione e colore',description,'description'));
  if(old.length)main.append(...old);
  w._dsUpdate=()=>{
   const die=legacy?.fixed?(pg.racialDie||legacy.die):(t.die||legacy?.die);
   const values=kind==='signature'?[['Dado Danno',die],['Costo',tecCostLabel(t)],['Forma',t.forma||'—'],['Attributo',t.attr||'Da definire']]:[['Dado',die],['Fonte',legacy?.fixed?'Razziale':t.attr||'Da definire']];
   stats.replaceChildren(...values.map(v=>metric(...v)));
   if(summary&&kind==='signature')summary.textContent=(tecSummary(t)||'tecnica libera')+' · '+tecCostLabel(t);
  };w._dsUpdate();
 }
 function moduleSheet(w,mo,i){
  const {old,hero,main,foot}=shell(w,'module',mo);
  const sc=old.find(n=>n.classList.contains('sheetcard'));
  if(sc){old.splice(old.indexOf(sc),1);hero.append(sc);}
  const stats=make('div','ds-stats');stats.append(metric('Requisito',mo.req),metric('Posto',String(i+1)));
  if(mo.arma)stats.append(metric('Grado',mo.grado||'Da assegnare'));
  if(mo.fuel?.on)stats.append(metric(mo.fuel.tipo||'Cariche',String(mo.fuel.cur||0)+' / '+(mo.fuel.max||'—')));
  hero.append(stats);
  if(mo.fuel?.on){const g=make('div','ds-energy');g.setAttribute('aria-hidden','true');g.style.setProperty('--ds-fill',Math.max(0,Math.min(100,(Number(mo.fuel.cur)||0)/(Number(mo.fuel.max)||1)*100))+'%');hero.append(g);}
  let current=null;
  old.forEach((n,k)=>{
   if(n.classList.contains('addrow')){foot.append(n);return;}
   if(k===old.length-1&&n.classList.contains('hintbox')){foot.append(n);return;}
   if(n.classList.contains('slots-h')){
    const heading=text(n),cls=heading==='Cariche'?'ds-charge-panel':heading==='Effetto speciale'?'ds-primary':'';
    current=section('',[],cls);n.classList.add('ds-section-title');current.append(n);main.append(current);return;
   }
   (current||main).append(n);
  });
 }
 function prepare(w,kind,item,extra){
  if(!w||!item)return;
  if(kind==='signature'||kind==='legacy')technique(w,kind,item,extra);
  else if(kind==='module')moduleSheet(w,item,extra);
 }
 function weapon(i){
  if(!pg.armi[i])return;
  openModal('Arma',()=>{
   const a=pg.armi[i],w=make('div');if(!a)return w;
   const {hero,main,foot}=shell(w,'weapon',a);
   hero.append(make('h2','ds-name',(a.nome||'').trim()||'Arma senza nome'),make('div','ds-source',a.tipo+(a.asta?' · '+a.asta:'')));
   const stats=make('div','ds-stats');stats.append(metric('Grado',a.grado+' · '+gradeLabel(a.grado)),metric('Attributo',a.attr||'Da definire'),metric('Portata',a.portata||'Da definire'),metric('Accordo GM',a.gmOk?'Approvata':'Da approvare'));hero.append(stats);
   const compat=weaponCompat(a),c=make('div','compat '+compat.s,compat.msg.replace(/<[^>]+>/g,''));
   main.append(section('Compatibilità',[c],'ds-links'));
   if(a.eff){
    const e=a.eff,body=make('div','ds-weapon-effect');body.append(make('div','ds-eyebrow',e.cat||'Categoria da scegliere'),make('h3','ds-effect-name',e.nome||'Effetto senza nome'),make('p','',e.desc||'Nessuna descrizione registrata.'));
    const conditions=make('div','ds-stats');conditions.append(metric('Quando',e.freq||'Da definire'),metric('Prezzo',e.prezzo||'Da definire'));
    if(e.prezzoDett)conditions.append(metric('Dettaglio',e.prezzoDett));body.append(conditions);
    main.append(section('Effetto speciale',[body],'ds-primary'));
   }else main.append(section('Effetto speciale',[make('p','ds-empty','Nessun effetto speciale registrato.')],'ds-primary'));
   if(a.note)main.append(section(a.rivedi?'Note · da rivedere':'Note',[make('p','ds-text',a.note)]));
   const linked=weaponTecniche(a),list=make('div','ds-linked');
   linked.forEach(t=>{const entry=make('div','ds-linked-item');entry.append(icon('star',18),make('strong','',t.nome||'Tecnica senza nome'),make('span','',t.die||'—'));list.append(entry);});
   if(!linked.length)list.append(make('p','ds-empty','Nessuna Tecnica collegata.'));
   main.append(section('Tecniche collegate',[list]));
   const row=make('div','addrow');const done=make('button','btn sm','Fatto'),edit=make('button','btn sm gold','Modifica arma');done.type=edit.type='button';done.onclick=closeModal;edit.onclick=()=>{closeModal();weaponModal(i);};row.append(done,edit);foot.append(row);
   return w;
  });
 }
 function infer(v){
  const title=text(v.querySelector('.gmtitle'));
  if(title.includes('Soglie P.A.'))return['thresholds','Rotta di crescita','Progressione'];
  if(title.includes('Identità'))return['identity','Dossier personale','Identità del pirata'];
  if(title.includes('Arsenale'))return['catalogue','Banco d’arsenale','Arsenale'];
  if(title.includes('Officina'))return['catalogue','Progetti del Corpo Meccanico','Officina'];
  if(title.includes('classe'))return['classes','Ruoli e Stili','Scegli la classe'];
  if(title.includes('Skill'))return['skills','Competenze del pirata','Aggiungi una Skill'];
  if(title.includes('Haki'))return['haki','Volontà e potere','Haki'];
  if(title.includes('Frutto'))return['fruit','Potere del mare','Frutto del Diavolo'];
  if(title.includes('Strumento'))return['instrument','Arsenale del musicista','Strumento'];
  if(title.includes('Zaino'))return['inventory','Equipaggiamento personale','Zaino'];
  if(title.includes('Oggetto'))return['item','Equipaggiamento personale','Oggetto'];
  if(title.includes('Stampa'))return['actions','Registro del pirata','Stampa, esporta, importa'];
  if(v.querySelector('.tdetail'))return['lore','Dossier del pirata',title];
  return['secondary','Registro del pirata',title];
 }
 function capture(v){
  if(!v||v.classList.contains('bare'))return;
  v._dsOpen=[...v.querySelectorAll('details[data-ds-disclosure][open]')].map(n=>n.dataset.dsDisclosure);
  const active=document.activeElement;if(v.contains(active))v._dsFocus=active.dataset.dsFocus||'';
 }
 function finish(v){
  if(!v||v.classList.contains('bare'))return;
  const root=v.querySelector('.gmbody').firstElementChild;if(!root)return;
  const kind=root.dataset.dsKind,[generic,kicker]=infer(v);
  v.classList.add('ds-dialog');v.dataset.dsView=kind||generic;
  v.setAttribute('role','dialog');v.setAttribute('aria-modal','true');v.setAttribute('aria-labelledby','ds-dialog-title');
  const title=v.querySelector('.gmtitle');title.id='ds-dialog-title';
  const head=v.querySelector('.gmhead');
  if(!head.querySelector('.ds-window-kicker')){const group=make('div','ds-window-heading');title.before(group);group.append(make('div','ds-window-kicker',kind?'Grand Line Chronicles · Dossier':kicker),title);}
  const borrowed=root.classList.contains('actions'); // This existing node returns to the dashboard on close.
  if(!borrowed&&!root.classList.contains('ds-root'))root.classList.add('ds-root','ds-secondary');
  root.querySelectorAll('details[data-ds-disclosure]').forEach(n=>{n.open=(v._dsOpen||[]).includes(n.dataset.dsDisclosure);});
  const controls=[...v.querySelectorAll('button,input,select,textarea,.classopt,.catcard,.invtile,.medal.click,.gcard.click')].filter(n=>!borrowed||!root.contains(n));
  controls.forEach((n,i)=>{
   if(!n.matches('button,input,select,textarea')&&n.onclick){
    n.tabIndex=0;n.setAttribute('role','button');
    if(!n.onkeydown)n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();n.click();}};
   }
   const prev=n.previousElementSibling,label=prev?.matches('.fld')?text(prev):text(n.parentElement.querySelector(':scope > .fld'));
   if(n.matches('input,select,textarea')&&!n.getAttribute('aria-label')){
    const fallback=n.closest('.mrow')?.previousElementSibling;
    n.setAttribute('aria-label',label||(fallback?.matches('.fld')?text(fallback):'Valore'));
   }
   n.dataset.dsFocus=n.tagName+':'+(n.getAttribute('aria-label')||n.title||text(n)||i)+':'+i;
  });
  if(!borrowed)root.querySelectorAll('.addrow button').forEach(n=>{
   const label=text(n);n.classList.toggle('ds-danger',/Elimina|Rimuovi|Reset|Segna danneggiato/.test(label));
   n.classList.toggle('ds-edit',/Modifica/.test(label));
  });
  // Original fields stay live; only derived display text is updated after input.
  if(!v._dsReady){
   v._dsReady=true;
   const update=()=>{const r=v.querySelector('.gmbody').firstElementChild;if(r?._dsUpdate)r._dsUpdate();};
   v.addEventListener('input',update);v.addEventListener('change',update);
   v.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const all=[...v.querySelectorAll('button,input,select,textarea,summary,[tabindex="0"]')].filter(n=>!n.disabled&&!n.hidden&&n.getClientRects().length);
    if(!all.length)return;
    if(e.shiftKey&&document.activeElement===all[0]){e.preventDefault();all.at(-1).focus();}
    else if(!e.shiftKey&&document.activeElement===all.at(-1)){e.preventDefault();all[0].focus();}
   });
   v.querySelector('.gmclose').focus({preventScroll:true});
  }else if(v._dsFocus&&!v.contains(document.activeElement)){
   const target=controls.find(n=>n.dataset.dsFocus===v._dsFocus);if(target)target.focus({preventScroll:true});
  }
 }
 window.GLCDetails=Object.freeze({prepare,finish,capture,weapon});
})();
