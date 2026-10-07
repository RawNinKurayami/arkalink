/* Unique Trait tree: derived availability and explicit Upgrade acquisitions.
 * The host commits character changes and persists the shared Talent ledger. */
(function(root){
'use strict';
const T=root.GLCTratti;
const labels={locked:'Bloccato',available:'Disponibile',acquired:'Acquisito',inactive:'Acquisito · inattivo',evolved:'Evoluto'};
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!=null)n.textContent=String(text);return n;}
function button(label,action,className){const n=node('button',className||'ut-button',label);n.type='button';n.addEventListener('click',action);return n;}
function link(label,href,className){const n=node('a',className,label);n.href=href;n.target='_blank';n.rel='noopener';return n;}
function mount(host,opts={}){
 const shell=node('section','ut-tree');shell.setAttribute('aria-label','Albero dei Tratti Unici e delle Sinergie');host.appendChild(shell);
 let view={skill:'',status:'all',search:''},error='',destroyed=false;
 const openSkills=new Set();
 const character=()=>typeof opts.getCharacter==='function'?opts.getCharacter():opts.character||{};
 function rememberBranches(){shell.querySelectorAll('.ut-skill-branch').forEach(d=>{if(d.open)openSkills.add(d.dataset.skill);else openSkills.delete(d.dataset.skill);});}
 async function choose(id,take){
  rememberBranches();error='';
  try{
   if(typeof opts.onChoose==='function')await opts.onChoose(id,take);
   else{
    const next=JSON.parse(JSON.stringify(character()));T.choose(next,id,take);
    if(typeof opts.onChange!=='function')throw Error('Il salvataggio del personaggio non è disponibile.');
    await opts.onChange(next,{id,take});
   }
  }catch(problem){error=problem?.message||'Non è stato possibile registrare la scelta.';}
  if(!destroyed)refresh();
 }
 function card(st){
  const article=node('article','ut-node '+st.status);article.dataset.traitId=st.id;
  article.id='unique-trait-'+st.id;
  const top=node('div','ut-node-top');top.appendChild(node('span','ut-status',labels[st.status]));
  if(st.limit)top.appendChild(node('span','ut-limit',st.limit));article.appendChild(top);
  article.appendChild(node('h4','ut-name',st.name));
  if(st.replaces.length){
   const evolution=node('p','ut-evolution','Evoluzione di ');
   const previous=T.trait(st.replaces[0]);const anchor=node('a','',previous.name);anchor.href='#unique-trait-'+previous.id;
   evolution.append(anchor,document.createTextNode(' · sostituisce il beneficio precedente.'));article.appendChild(evolution);
  }
  article.appendChild(node('p','ut-effect',st.effects[0]));
  const requirements=node('ul','ut-requirements');requirements.setAttribute('aria-label','Requisiti di '+st.name);
  st.requirements.forEach(r=>{
   const item=node('li',r.met?'met':'missing');item.appendChild(node('span','ut-requirement-mark',r.met?'✓':'○'));
   const text=node('span','');text.appendChild(node('strong','',r.name+' '+r.required));
   if(r.kind!=='trait')text.appendChild(node('small','','Attuale: '+(r.current||'non allenata')));
   else text.appendChild(node('small','',r.met?'Scelta registrata':'Da acquisire prima'));
   item.appendChild(text);requirements.appendChild(item);
  });article.appendChild(requirements);
  if(st.superseded)article.appendChild(node('p','ut-note',st.reason+' Il bonus precedente non si somma.'));
  else if(st.acquired&&!st.active)article.appendChild(node('p','ut-note','La scelta è conservata. Il beneficio torna attivo quando i requisiti sono di nuovo soddisfatti.'));
  const details=node('details','ut-details');details.appendChild(node('summary','','Regola completa'));
  const prose=node('div','ut-prose');st.effects.forEach(p=>prose.appendChild(node('p','',p)));prose.appendChild(link('Manuale · Tratti Unici ↗',st.manual,'ut-manual'));details.appendChild(prose);article.appendChild(details);
  if(st.acquired){
   const remove=button('Rimuovi scelta',()=>choose(st.id,false),'ut-button ut-remove');remove.disabled=!st.canRemove;
   if(!st.canRemove)remove.title='Rimuovi prima '+st.dependentTraits.map(id=>T.trait(id).name).join(' e ')+'.';
   article.appendChild(remove);
  }else if(st.available){
   const acquire=button('Acquisisci · 1 scelta di Talento',()=>choose(st.id,true),'ut-button ut-acquire');acquire.disabled=!st.canAcquire;article.appendChild(acquire);
   if(!st.canAcquire)article.appendChild(node('p','ut-note ut-budget-reason',st.budget.reason||'Serve una scelta di Talento concessa da un Upgrade.'));
  }
  return article;
 }
 function accepts(st){
  if(view.skill&&st.skill!==view.skill)return false;
  if(view.status==='available'&&!st.available)return false;
  if(view.status==='acquired'&&!st.acquired)return false;
  if(view.status==='locked'&&st.status!=='locked')return false;
  const text=[st.name,st.skill,st.attribute,...st.effects].join(' ').toLocaleLowerCase('it');
  return !view.search||text.includes(view.search.toLocaleLowerCase('it'));
 }
 function toolbar(){
  const form=node('div','ut-filters');
  const searchLabel=node('label','','Cerca un Tratto');const search=node('input','ut-search');search.type='search';search.placeholder='Nome, Skill o beneficio';search.value=view.search;
  search.addEventListener('input',()=>{rememberBranches();view.search=search.value;renderBranches();});searchLabel.appendChild(search);form.appendChild(searchLabel);
  const skillLabel=node('label','','Skill');const skill=node('select','ut-skill-filter');
  [['','Tutte le 16 Skill'],...T.data.skills.map(s=>[s,s])].forEach(([value,text])=>{const o=node('option','',text);o.value=value;skill.appendChild(o);});skill.value=view.skill;
  skill.addEventListener('change',()=>{rememberBranches();view.skill=skill.value;renderBranches();});skillLabel.appendChild(skill);form.appendChild(skillLabel);
  const statusLabel=node('label','','Mostra');const status=node('select','ut-state-filter');
  [['all','Tutti i Tratti'],['available','Disponibili'],['acquired','Acquisiti'],['locked','Bloccati']].forEach(([value,text])=>{const o=node('option','',text);o.value=value;status.appendChild(o);});status.value=view.status;
  status.addEventListener('change',()=>{rememberBranches();view.status=status.value;renderBranches();});statusLabel.appendChild(status);form.appendChild(statusLabel);return form;
 }
 function renderBranches(){
  const area=shell.querySelector('.ut-branches');if(!area)return;
  area.replaceChildren();const c=character(),groups=T.tree(c);let visible=0;
  for(const group of groups){
   const matches=group.traits.filter(accepts);if(!matches.length)continue;visible+=matches.length;
   const branch=node('details','ut-skill-branch');branch.dataset.skill=group.skill;
   branch.open=openSkills.has(group.skill)||!!view.search||!!view.skill||view.status!=='all'||group.traits.some(t=>t.available||t.acquired);
   branch.addEventListener('toggle',()=>{if(branch.open)openSkills.add(group.skill);else openSkills.delete(group.skill);});
   const title=node('summary','ut-branch-title');title.appendChild(node('span','ut-skill-name',group.skill));title.appendChild(node('span','ut-die',group.die||'Non allenata'));
   const available=group.traits.filter(t=>t.available).length, acquired=group.traits.filter(t=>t.acquired).length;
   title.appendChild(node('small','ut-branch-count',available+' disponibili · '+acquired+' acquisiti'));branch.appendChild(title);
   const synergies=node('div','ut-synergies');
   group.synergies.forEach(pair=>{
    const shown=pair.traits.filter(accepts);if(!shown.length)return;
    const track=node('section','ut-synergy');track.setAttribute('aria-label',pair.attribute+' più '+pair.skill);
    const origin=node('div','ut-origin');origin.appendChild(node('strong','',pair.attribute+' + '+pair.skill));origin.appendChild(node('span','',(pair.attributeDie||'—')+' + '+(pair.skillDie||'—')));track.appendChild(origin);
    const nodes=node('div','ut-nodes'+(shown.some(t=>t.replaces.length)?' ut-evolution-chain':''));shown.forEach(st=>nodes.appendChild(card(st)));track.appendChild(nodes);synergies.appendChild(track);
   });branch.appendChild(synergies);area.appendChild(branch);
  }
  if(!visible)area.appendChild(node('p','ut-empty','Nessun Tratto corrisponde ai filtri selezionati.'));
  const count=shell.querySelector('.ut-results');if(count)count.textContent=visible+' / '+T.data.traits.length+' Tratti mostrati';
 }
 function refresh(){
  if(destroyed)return;
  const c=character(),states=T.states(c),available=states.filter(t=>t.available).length,acquired=states.filter(t=>t.acquired).length;
  shell.replaceChildren();
  const header=node('header','ut-header');const copy=node('div','ut-heading');copy.appendChild(node('p','ut-overline','Crescita · Sinergie'));copy.appendChild(node('h2','','Tratti Unici'));
  copy.appendChild(node('p','ut-lead','Attributo e Skill sbloccano i Tratti. Acquisirne uno richiede una scelta di Talento concessa da un Upgrade. Le Skill possono appartenere a qualsiasi Ruolo.'));header.appendChild(copy);
  const stats=node('div','ut-summary');stats.appendChild(node('strong','',available+' disponibili'));stats.appendChild(node('span','',acquired+' acquisiti · '+states.filter(t=>t.active).length+' attivi'));header.appendChild(stats);shell.appendChild(header);
  const info=typeof opts.choicesInfo==='function'?opts.choicesInfo(c):opts.choicesInfo;
  if(info){const budget=node('div','ut-budget');budget.appendChild(node('strong','',Math.max(0,Number(info.remaining)||0)+' scelte di Talento disponibili'));budget.appendChild(node('span','','Condivise con i Talenti ordinari · ogni Tratto acquisito usa una scelta.'));if(typeof opts.onManageChoices==='function')budget.appendChild(button('Registra un Upgrade',opts.onManageChoices,'ut-button'));shell.appendChild(budget);}
  if(error){const alert=node('p','ut-error',error);alert.setAttribute('role','alert');shell.appendChild(alert);}
  const rules=node('details','ut-general-rules');rules.appendChild(node('summary','','Sblocco, acquisizione ed Evoluzioni'));const prose=node('div','ut-prose');[
   'Sblocco automatico: entrambi i Gradi devono soddisfare i requisiti. Un Grado superiore soddisfa un requisito inferiore; più sblocchi simultanei restano scelte separate.',
   'I Tratti cumulano fra loro. Un’Evoluzione sostituisce il proprio beneficio precedente. Fortezza Vivente richiede Corpo Mostruoso già acquisito: il bonus DP diventa +4, senza sommare il +2.',
   'Vantaggio e Svantaggio seguono i limiti ordinari. Azioni, Bonus e Reazioni aggiuntive vengono concesse soltanto quando il testo lo prevede.',
   'Il Prestigio soddisfa i requisiti ordinari senza assegnare nuovi Tratti intermedi. Il catalogo dei Tratti di Prestigio deve ancora essere definito; Saikyō non aggiunge automaticamente un beneficio.'
  ].forEach(text=>prose.appendChild(node('p','',text)));prose.appendChild(link('Regole complete nel manuale ↗',T.data.manual,'ut-manual'));rules.appendChild(prose);shell.appendChild(rules);
  shell.appendChild(toolbar());const results=node('p','ut-results');results.setAttribute('aria-live','polite');shell.appendChild(results);shell.appendChild(node('div','ut-branches'));renderBranches();
 }
 refresh();return {element:shell,refresh,destroy(){destroyed=true;shell.remove();}};
}
function render(c,opts={}){const holder=document.createElement('div');return mount(holder,{...opts,character:c}).element;}
root.GLCTrattiUI={mount,render};
})(typeof window!=='undefined'?window:globalThis);
