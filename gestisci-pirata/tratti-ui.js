/* Presentation only. GLCTratti and GLCAdvancement remain the source of rules.
 * The host owns every acquisition, Upgrade count and save. */
(function(root){
'use strict';
const T=root.GLCTratti;
const attributes=['Forza','Tecnica','Spirito','Astuzia'];
const attributeArt={Forza:'tratti/attributo-forza',Tecnica:'tratti/attributo-tecnica',Spirito:'tratti/attributo-spirito',Astuzia:'tratti/attributo-astuzia'};
const traitArt={
 'corpo-mostruoso':'tratti/corpo-mostruoso',
 'fortezza-vivente':'tratti/fortezza-vivente',
 'riflessi-sovrumani':'tratti/riflessi-sovrumani',
 'passo-fantasma':'tratti/passo-fantasma',
 'occhio-dell-avversario':'tratti/occhio-dell-avversario',
 'predatore-di-aperture':'tratti/predatore-di-aperture',
 'mente-inespugnabile':'tratti/mente-inespugnabile',
 'passo-silenzioso':'tratti/passo-silenzioso',
 'ombra-perfetta':'tratti/ombra-perfetta',
 'tempra-selvaggia':'tratti/tempra-selvaggia',
 'non-ancora':'tratti/non-ancora',
 'lingua-d-argento':'tratti/lingua-d-argento',
 'presenza-schiacciante':'tratti/presenza-schiacciante',
 'occhio-clinico':'tratti/occhio-clinico',
 'mano-chirurgica':'tratti/mano-chirurgica',
 'genio-meccanico':'tratti/genio-meccanico',
 'mano-da-orologiaio':'tratti/mano-da-orologiaio',
 'senso-della-rotta':'tratti/senso-della-rotta',
 'nessun-mare-mi-ferma':'tratti/nessun-mare-mi-ferma',
 'orientamento-perfetto':'tratti/orientamento-perfetto',
 'passo-dell-esploratore':'tratti/passo-dell-esploratore',
 'istinto-naturalista':'tratti/istinto-naturalista',
 'maestro-artigiano':'tratti/maestro-artigiano',
 'inventore':'tratti/inventore',
 'mano-pesante':'tratti/mano-pesante',
 'occhio-strutturale':'tratti/occhio-strutturale',
 'palato-assoluto':'tratti/palato-assoluto',
 'cucina-dell-anima':'tratti/cucina-dell-anima',
 'mano-perfetta':'tratti/mano-perfetta',
 'presenza-scenica':'tratti/presenza-scenica',
 'memoria-del-mondo':'tratti/memoria-del-mondo'
};
const labels={locked:'Da sbloccare',available:'Sbloccato',acquired:'Acquisito',inactive:'Inattivo',evolved:'Evoluto'};
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;}
function button(label,action,cls='ut-button'){const n=node('button',cls,label);n.type='button';n.addEventListener('click',action);return n;}
function link(label,href,cls){const n=node('a',cls,label);n.href=href;n.target='_blank';n.rel='noopener';return n;}
function art(key,cls='ut-art'){const n=node('img',cls);n.src='/img/icons/'+key+'.png';n.alt='';n.setAttribute('aria-hidden','true');n.draggable=false;return n;}
function icon(st){return art(traitArt[st.id]||attributeArt[st.attribute]||attributeArt.Astuzia);}
function status(st){return st.canAcquire?'Disponibile':labels[st.status];}
function focusKey(n,key){n.dataset.utFocus=key;return n;}
function restoreFocus(shell,key){if(key)Array.from(shell.querySelectorAll('[data-ut-focus]')).find(n=>n.dataset.utFocus===key)?.focus({preventScroll:true});}

/* The correction is secondary and inline. Registration never opens a dialog. */
function upgradeControl(opts={}){
 const shell=node('div','ut-upgrade');shell.setAttribute('aria-label','Scelte degli Upgrade');
 const count=node('span','ut-upgrade-count');count.setAttribute('aria-live','polite');
 const feedback=node('span','ut-upgrade-feedback');feedback.setAttribute('role','status');
 const details=node('details','ut-upgrade-edit');
 const toggle=focusKey(node('summary','','Correggi'),'upgrade-correct');toggle.title='Correggi il totale delle scelte concesse dal GM';
 const form=node('form','ut-upgrade-form'),label=node('label','','Totale scelte concesse dal GM');
 const input=focusKey(node('input'),'upgrade-total');input.type='number';input.step='1';input.required=true;input.setAttribute('aria-label','Totale scelte concesse dal GM');label.appendChild(input);
 const help=node('p','ut-upgrade-help','Una scelta per Talenti ordinari o Tratti Unici. P.A., PV e ST si registrano separatamente; il Prestigio usa le proprie scelte.');
 const save=button('Salva conteggio',()=>{},'ut-button');save.type='submit';
 const cancel=button('Chiudi',()=>{details.open=false;toggle.focus();},'ut-text-button');
 let pending=false;
 const info=()=>opts.choicesInfo?.()||{granted:0,used:0,remaining:0};
 function refresh(){const b=info();count.replaceChildren(node('b','',b.remaining),document.createTextNode(b.remaining===1?' scelta disponibile':' scelte disponibili'));input.min=String(b.used);if(document.activeElement!==input)input.value=String(b.granted);help.dataset.granted=String(b.granted);}
 async function update(kind){
  if(pending)return;pending=true;grant.disabled=save.disabled=true;feedback.textContent='';
  try{await(kind==='grant'?opts.onGrant?.():opts.onSet?.(input.value));details.open=false;refresh();feedback.textContent=kind==='grant'?'Upgrade registrato · +1 scelta':'Conteggio aggiornato';if(kind==='set')toggle.focus();}
  catch(problem){feedback.textContent=problem?.message||'Registrazione non riuscita.';}
  finally{pending=false;grant.disabled=save.disabled=false;}
 }
 const grant=focusKey(button('+ Registra Upgrade',()=>update('grant'),'ut-button ut-upgrade-grant'),'upgrade-grant');grant.title='Registra una scelta di Talento già concessa dal GM';
 form.append(label,help,save,cancel);form.addEventListener('submit',e=>{e.preventDefault();update('set');});
 details.append(toggle,form);details.addEventListener('toggle',()=>{if(details.open){refresh();input.value=String(info().granted);}});
 shell.append(count,grant,details,feedback);refresh();shell.refresh=refresh;return shell;
}

function mount(host,opts={}){
 const shell=node('section','ut-tree');shell.setAttribute('aria-label','Tratti Unici e Sinergie');host.appendChild(shell);
 const character=()=>typeof opts.getCharacter==='function'?opts.getCharacter():opts.character||{};
 let destroyed=false,pending=false,error='',notice='',view={attribute:'',skill:'',status:'all',search:'',selected:opts.selected||''};
 const initial=T.states(character());
 const first=initial.find(t=>t.id===view.selected)||initial.find(t=>t.canAcquire)||initial.find(t=>t.active)||initial.find(t=>t.available)||initial[0];
 view.attribute=first?.attribute||attributes[0];view.selected=first?.id||'';
 function best(states){return states.find(t=>t.canAcquire)||states.find(t=>t.active)||states.find(t=>t.available)||states[0];}
 function accepts(st){
  if(!view.search&&!view.skill&&view.attribute&&st.attribute!==view.attribute)return false;
  if(view.skill&&st.skill!==view.skill)return false;
  if(view.status==='available'&&!st.available)return false;
  if(view.status==='acquired'&&!st.acquired)return false;
  if(view.status==='locked'&&st.status!=='locked')return false;
  return !view.search||[st.name,st.skill,st.attribute,...st.effects].map(v=>window.GLCI18n?GLCI18n.searchText(v):v).join(' ').toLocaleLowerCase('it').includes(view.search.trim().toLocaleLowerCase('it'));
 }
 function select(id,reset=false){
  const st=T.trait(id);if(!st)return;
  if(reset){view.attribute=st.attribute;view.skill='';view.search='';view.status='all';search.value='';skill.value='';}
  view.selected=id;renderContent();restoreFocus(shell,'trait-'+id);
  // On narrow screens the inspector follows the map; take the reader there.
  if(root.matchMedia?.('(max-width: 760px)').matches){detail.scrollIntoView({block:'start',behavior:'auto'});detail.querySelector('h2')?.focus({preventScroll:true});}
 }
 async function choose(id,take){
  if(pending)return;pending=true;error='';notice='';renderContent();
  try{
   if(typeof opts.onChoose==='function')await opts.onChoose(id,take);
   else{const next=JSON.parse(JSON.stringify(character()));T.choose(next,id,take);if(typeof opts.onChange!=='function')throw Error('Il salvataggio del personaggio non è disponibile.');await opts.onChange(next,{id,take});}
   notice=take?'Tratto acquisito.':'Scelta rimossa e nuovamente disponibile.';
  }catch(problem){error=problem?.message||'Non è stato possibile registrare la scelta.';}
  finally{pending=false;if(!destroyed){refresh();detail.querySelector('h2')?.focus({preventScroll:true});}}
 }
 const head=node('header','ut-head');
 if(opts.onClose)head.appendChild(button('‹ Torna al pirata',opts.onClose,'ut-back'));
 const title=node('div','ut-title');title.append(node('span','ut-overline','La tua crescita'),node('h1','','Tratti Unici'));head.appendChild(title);
 let upgrades;
 if(opts.choicesInfo){upgrades=upgradeControl({choicesInfo:()=>typeof opts.choicesInfo==='function'?opts.choicesInfo(character()):opts.choicesInfo,
  onGrant:async()=>{if(!opts.onGrantChoice)throw Error('Registra l’Upgrade dalla scheda del pirata.');await opts.onGrantChoice();refresh();},
  onSet:async value=>{if(!opts.onSetChoices)throw Error('Correggi le scelte dalla scheda del pirata.');await opts.onSetChoices(value);refresh();}});head.appendChild(upgrades);}
 shell.appendChild(head);
 const nav=node('nav','ut-paths');nav.setAttribute('aria-label','Sinergie per Attributo');shell.appendChild(nav);
 const workspace=node('main','ut-workspace');
 const watermark=art(attributeArt[view.attribute],'ut-watermark');workspace.appendChild(watermark);
 const toolbar=node('div','ut-toolbar'),searchLabel=node('label','ut-search-label');
 searchLabel.appendChild(node('span','ut-sr-only','Cerca in tutti i Tratti'));
 const search=focusKey(node('input','ut-search'),'search');search.type='search';search.placeholder='Cerca un Tratto, una Skill, un beneficio…';search.value=view.search;
 search.addEventListener('input',()=>{view.search=search.value;view.selected='';renderContent();});searchLabel.appendChild(search);toolbar.appendChild(searchLabel);
 const skillLabel=node('label','ut-skill-label');skillLabel.appendChild(node('span','ut-sr-only','Filtra per Skill'));
 const skill=focusKey(node('select','ut-skill-filter'),'skill');[['','Tutte le Skill'],...T.data.skills.map(s=>[s,s])].forEach(([value,text])=>{const o=node('option','',text);o.value=value;skill.appendChild(o);});
 skill.addEventListener('change',()=>{view.skill=skill.value;view.selected='';renderContent();});skillLabel.appendChild(skill);toolbar.appendChild(skillLabel);workspace.appendChild(toolbar);
 const filters=node('div','ut-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Stato dei Tratti');workspace.appendChild(filters);
 const overview=node('div','ut-overview');workspace.appendChild(overview);
 const map=node('div','ut-map');map.setAttribute('aria-label','Sigilli dei Tratti Unici');workspace.appendChild(map);shell.appendChild(workspace);
 const detail=node('aside','ut-inspector');detail.setAttribute('aria-label','Dettaglio del Tratto');shell.appendChild(detail);
 const footer=node('footer','ut-footer');footer.append(node('span','','✓ Acquisito'),node('span','','◇ Sbloccato'),node('span','','○ Da sbloccare'),node('span','ut-line-help','Le linee indicano solo le Evoluzioni.'));
 footer.appendChild(link('Manuale · §16.9 ↗',T.data.manual,'ut-manual'));shell.appendChild(footer);
 const announcement=node('div','ut-sr-only');announcement.setAttribute('role','status');shell.appendChild(announcement);

 function renderNavigation(states){
  nav.replaceChildren();const identity=node('div','ut-identity');identity.append(node('span','ut-overline','Sinergie'),node('strong','',character().nome||'Il tuo pirata'),node('small','',states.filter(t=>t.active).length+' attivi · '+states.filter(t=>t.acquired).length+' acquisiti'));nav.appendChild(identity);
  for(const attribute of attributes){
   const group=states.filter(t=>t.attribute===attribute),unlocked=group.filter(t=>t.available).length;
   const b=focusKey(button('',()=>{view.attribute=attribute;view.skill='';view.search='';view.selected='';search.value='';skill.value='';renderContent();},'ut-path'),'path-'+attribute);
   const active=view.attribute===attribute&&!view.search&&!view.skill;b.setAttribute('aria-pressed',String(active));
   b.appendChild(art(attributeArt[attribute],'ut-path-art'));
   const copy=node('span','ut-path-copy');copy.append(node('strong','',attribute),node('small','',group.filter(t=>t.active).length+' attivi'+(unlocked?' · '+unlocked+' sbloccati':'')));b.append(copy,node('b','ut-path-die',character().attr?.[attribute]||'—'));nav.appendChild(b);
  }
  const all=focusKey(button('Tutte le Sinergie',()=>{view.attribute='';view.skill='';view.search='';search.value='';skill.value='';view.selected='';renderContent();},'ut-all'),'path-all');all.setAttribute('aria-pressed',String(!view.attribute&&!view.search&&!view.skill));nav.appendChild(all);
  const rule=node('p','ut-path-hint','Attributo + Skill aprono un sigillo. Una scelta di Upgrade ti permette di acquisirlo.');nav.appendChild(rule);
 }
 function sigil(st){
  const b=focusKey(button('',()=>select(st.id),'ut-sigil '+st.status+(st.canAcquire?' can-acquire':'')+(view.selected===st.id?' selected':'')),'trait-'+st.id);
  b.dataset.traitId=st.id;b.id='unique-trait-'+st.id;b.setAttribute('aria-pressed',String(view.selected===st.id));b.setAttribute('aria-controls','ut-selected-detail');
  b.setAttribute('aria-label',st.name+' · '+status(st)+' · '+st.requirementsText);
  const seal=node('span','ut-seal');seal.appendChild(icon(st));seal.appendChild(node('span','ut-sigil-mark',st.active?'✓':st.superseded?'↗':st.acquired?'!':st.unlocked?'◇':'○'));
  b.append(seal,node('strong','ut-sigil-name',st.name),node('span','ut-sigil-state',status(st)),node('small','ut-sigil-needs',st.attribute+' '+st.attributeDie+' · '+st.skillDie));return b;
 }
 function renderMap(states){
  const shown=states.filter(accepts);if(!shown.some(t=>t.id===view.selected))view.selected=best(shown)?.id||'';
  watermark.src='/img/icons/'+(attributeArt[view.attribute]||attributeArt.Astuzia)+'.png';
  overview.replaceChildren();const scope=view.skill||((view.search||!view.attribute)?'Tutte le Sinergie':view.attribute);
  overview.append(node('span','ut-overline',view.search?'Ricerca in tutti i Tratti':'Costellazione delle Sinergie'),node('h2','',scope),node('p','',shown.length+' sigilli · '+shown.filter(t=>t.available).length+' sbloccati'));
  map.replaceChildren();
  // Grouping is visual. Independent Traits never acquire artificial links.
  for(const attribute of attributes){for(const skillName of T.data.skills){
   const group=shown.filter(t=>t.attribute===attribute&&t.skill===skillName);if(!group.length)continue;
   const branch=node('section','ut-constellation');branch.setAttribute('aria-label',attribute+' + '+skillName);
   const origin=node('header','ut-origin');origin.append(node('h3','',skillName),node('span','',attribute+' '+(character().attr?.[attribute]||'—')+' + '+(T.skillDie(character(),skillName)||'non allenata')));branch.appendChild(origin);
   const nodes=node('div','ut-sigils');
   group.forEach(st=>{if(st.replaces.some(id=>group.some(t=>t.id===id))){const edge=node('span','ut-evolution-edge','Evoluzione →');edge.setAttribute('aria-hidden','true');nodes.appendChild(edge);}nodes.appendChild(sigil(st));});branch.appendChild(nodes);map.appendChild(branch);
  }}
  if(!shown.length){const empty=node('div','ut-empty');empty.append(node('h3','','Nessun sigillo in questa vista'),node('p','',view.status==='available'?'Nessun Tratto con i requisiti raggiunti corrisponde ai filtri. Esplora tutti i sigilli per vedere cosa ti manca.':'Cambia Attributo o rimuovi i filtri per esplorare le altre Sinergie.'),button('Mostra tutti i Tratti',()=>{view={attribute:'',skill:'',status:'all',search:'',selected:''};search.value='';skill.value='';renderContent();}));map.appendChild(empty);}
  return states.find(t=>t.id===view.selected);
 }
 function renderDetail(st){
  detail.replaceChildren();detail.id='ut-selected-detail';
  detail.appendChild(button('↑ Torna ai sigilli',()=>{workspace.scrollIntoView({block:'start',behavior:'auto'});restoreFocus(shell,'trait-'+view.selected);},'ut-mobile-back'));
  if(!st){detail.append(node('div','ut-detail-empty','Seleziona un sigillo per vedere beneficio e requisiti.'));return;}
  const hero=node('div','ut-detail-hero '+st.status);hero.append(icon(st),node('span','ut-overline',st.attribute+' + '+st.skill),node('h2','',st.name),node('span','ut-status',status(st)));hero.querySelector('h2').tabIndex=-1;detail.appendChild(hero);
  const body=node('div','ut-detail-body');
  if(st.limit)body.appendChild(node('p','ut-limit',st.limit));
  st.effects.forEach((text,i)=>body.appendChild(node('p',i?'ut-effect-detail':'ut-effect',text)));
  if(st.replaces.length){const evolution=node('div','ut-evolution-note');evolution.appendChild(node('span','','Evoluzione di '));st.replaces.forEach(id=>evolution.appendChild(button(T.trait(id).name,()=>select(id,true),'ut-text-button')));evolution.appendChild(node('small','','Il nuovo beneficio sostituisce il precedente: non si sommano.'));body.appendChild(evolution);}
  const req=node('div','ut-requirements');req.appendChild(node('h3','','Requisiti'));
  st.requirements.forEach(r=>{const line=node('div',r.met?'met':'missing');line.append(node('span','ut-requirement-mark',r.met?'✓':'○'));const copy=node('div','');copy.appendChild(node('strong','',r.name+' '+r.required));if(r.kind==='trait'){copy.appendChild(button(r.met?'Vedi il Tratto acquisito':'Vai al prerequisito',()=>select(r.id,true),'ut-text-button'));}else copy.appendChild(node('small','','Attuale: '+(r.current||'non allenata')));line.appendChild(copy);req.appendChild(line);});body.appendChild(req);
  if(st.superseded)body.appendChild(node('p','ut-note',st.reason+' Il beneficio precedente non si somma.'));
  else if(st.acquired&&!st.active)body.appendChild(node('p','ut-note','La scelta resta acquisita. Il beneficio torna attivo quando soddisfi di nuovo i requisiti.'));
  body.appendChild(link('Leggi nel manuale ↗',st.manual,'ut-manual'));detail.appendChild(body);
  const actions=node('div','ut-detail-actions');
  if(error){const message=node('p','ut-error',error);message.setAttribute('role','alert');actions.appendChild(message);}
  if(!st.acquired){
   const acquire=focusKey(button(st.canAcquire?'Acquisisci · 1 scelta':st.available?'Serve una scelta di Upgrade':'Requisiti da raggiungere',()=>choose(st.id,true),'ut-button ut-acquire'),'acquire');acquire.disabled=pending||!st.canAcquire;actions.appendChild(acquire);
   actions.appendChild(node('p','ut-note',st.canAcquire?'Usa una scelta condivisa con i Talenti ordinari.':st.available?'Registra un Upgrade già concesso dal GM con il tasto in alto.':st.unlockReason));
  }else{
   actions.appendChild(node('p','ut-owned',st.active?'✓ Beneficio attivo sulla tua scheda':st.superseded?'↗ Beneficio evoluto':'Scelta conservata · beneficio inattivo'));
   const manage=node('details','ut-manage');manage.appendChild(node('summary','','Gestisci acquisizione'));
   const remove=focusKey(button('Rimuovi scelta',()=>choose(st.id,false),'ut-text-button'),'remove');remove.disabled=pending||!st.canRemove;manage.appendChild(remove);
   if(!st.canRemove)manage.appendChild(node('p','ut-note','Rimuovi prima '+st.dependentTraits.map(id=>T.trait(id).name).join(' e ')+': richiede questo Tratto.'));
   actions.appendChild(manage);
  }
  detail.appendChild(actions);
 }
 function renderContent(){
  if(destroyed)return;
  const focus=document.activeElement?.dataset?.utFocus,states=T.states(character()),scroll=workspace.scrollTop;
  renderNavigation(states);filters.replaceChildren();
  [['all','Tutti'],['available','Sbloccati'],['acquired','Acquisiti'],['locked','Da sbloccare']].forEach(([value,text])=>{const b=focusKey(button(text,()=>{view.status=value;view.selected='';renderContent();},'ut-filter'),'filter-'+value);b.setAttribute('aria-pressed',String(view.status===value));filters.appendChild(b);});
  const selected=renderMap(states);renderDetail(selected);workspace.scrollTop=scroll;restoreFocus(shell,focus);announcement.textContent=notice;
 }
 function refresh(){if(destroyed)return;upgrades?.refresh();renderContent();}
 function keydown(e){
  if(e.key==='Escape'&&opts.onClose){e.preventDefault();e.stopPropagation();opts.onClose();return;}
  if(e.key!=='Tab'||!opts.onClose)return;
  const focusable=Array.from(shell.querySelectorAll('button,input,select,summary,a[href]')).filter(n=>{
   if(n.disabled||n.classList.contains('ut-mobile-back')&&!root.matchMedia?.('(max-width: 760px)').matches)return false;
   for(let p=n.parentElement;p&&p!==shell;p=p.parentElement){if(p.tagName==='DETAILS'&&!p.open&&!(n.tagName==='SUMMARY'&&n.parentElement===p))return false;}
   return true;
  });
  const first=focusable[0],last=focusable.at(-1);if(!first)return;
  if(e.shiftKey&&(document.activeElement===first||!focusable.includes(document.activeElement))){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&(document.activeElement===last||!focusable.includes(document.activeElement))){e.preventDefault();first.focus();}
 }
 shell.addEventListener('keydown',keydown);
 refresh();return{element:shell,refresh,destroy(){destroyed=true;shell.remove();}};
}
function summary(c,opts={}){
 const states=T.states(c),section=node('section','talstrip unique-trait-summary'),header=node('div','slots-h','Tratti Unici · '+states.filter(t=>t.active).length+' attivi');section.appendChild(header);
 const action=node('div','talstrip-b');const open=button('✦ Esplora le Sinergie',()=>opts.onOpen?.(),'gbtn gold');open.id='unique-traits-open';action.appendChild(open);section.appendChild(action);
 const row=node('div','ut-acquired-strip');states.filter(t=>t.acquired).forEach(st=>{const b=button('',()=>opts.onOpen?.(st.id),'ut-owned-sigil '+st.status);b.append(icon(st),node('span','',st.name),node('small','',st.active?'Attivo':labels[st.status]));row.appendChild(b);});
 if(!row.children.length)row.appendChild(node('p','ut-summary-empty','Nessun Tratto acquisito. Esplora i sigilli per scoprire le tue Sinergie.'));
 section.appendChild(row);const available=states.filter(t=>t.available).length;section.appendChild(node('p','ut-summary-caption',available?available+' Tratti sbloccati dai tuoi Attributi e dalle tue Skill.':'Le Sinergie si aprono facendo crescere Attributi e Skill.'));return section;
}
function render(c,opts={}){const host=document.createElement('div');return mount(host,{...opts,character:c}).element;}
root.GLCTrattiUI={mount,render,upgradeControl,summary};
})(typeof window!=='undefined'?window:globalThis);
