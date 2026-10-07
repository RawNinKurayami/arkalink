(function(){
'use strict';
const P=window.GLCPrestige,D=P.data,V=window.GLCPrestigeView;
let focus=null,view={kind:'overview',key:''},error='';
const e=(tag,cls,text)=>el(tag,{class:cls||'',text:text==null?'':String(text)});
const button=(text,fn,cls='prg-button')=>el('button',{type:'button',class:cls,text,onclick:fn});
const meter=(value,max)=>el('div',{class:'prg-meter','aria-hidden':'true'},[el('i',{style:'width:'+Math.max(0,Math.min(100,max?value/max*100:0))+'%'})]);
function commit(change){try{GLCMoves.transaction(change);error='';renderManage();render();return true;}catch(err){error=err.message||'Salvataggio non riuscito.';return false;}}
const manual=t=>el('a',{class:'prg-manual',href:'/manuale-prestigio/#'+t.anchor,target:'_blank',rel:'noopener',text:'Regole complete nel manuale ↗'});
function disclosure(title,paragraphs){const d=el('details',{class:'prg-rules'});d.appendChild(e('summary','',title));const body=e('div','prg-prose');paragraphs.forEach(text=>body.appendChild(e('p','',text)));d.appendChild(body);return d;}
function current(title,die,label){const h=e('header','prg-current');h.appendChild(el('div',{class:'prg-current-die',html:dieIcon(die,72)}));h.appendChild(el('div',{},[e('p','prg-overline',label),e('h2','',title),e('p','prg-current-level',(P.label(die)||'Prestigio non raggiunto')+' · '+(die||'—'))]));return h;}
function chooseCard(st,refresh){
 const info=V.talent(pg,st),card=e('article','prg-choice'+(st.active?' acquired':''));
 card.appendChild(e('span','prg-overline',st.active?'✦ Acquisito':'◇ Puoi acquisirlo ora'));
 card.appendChild(e('h3','',st.name));
 const costs=e('div','prg-facts');[V.action(st.action),V.cost(st),st.limit?st.limit+' '+V.frequency(st.frequency):''].filter(Boolean).forEach(t=>costs.appendChild(e('span','',t)));card.appendChild(costs);
 card.appendChild(e('p','prg-effect',info.effect));
 const details=disclosure('Condizioni di utilizzo',info.details);
 if(st.replaces.length)details.appendChild(e('p','prg-replaces','Sostituisce: '+st.replaces.filter(n=>!/(Base|Migliorato)$/.test(n)).join(', ')+'. I benefici incorporati non si sommano alla vecchia versione.'));
 details.appendChild(manual(st));
 if(st.owned)details.appendChild(button('Rimuovi scelta',()=>{if(commit(c=>P.choose(c,st.path.id,st.id,false)))refresh();},'prg-button subtle'));
 card.appendChild(details);
 if(st.available)card.appendChild(button('✦ Acquisisci talento',()=>{if(commit(c=>P.choose(c,st.path.id,st.id,true)))refresh();},'prg-button primary'));
 if(st.active&&st.limit){const used=Math.max(0,Number(pg.prestige?.session?.uses?.[st.id])||0),counter=e('div','prg-counter');counter.appendChild(e('span','',(st.id==='il-piano-perfetto'?'Ridadi rimasti: ':'Utilizzi rimasti: ')+Math.max(0,st.limit-used)+' / '+st.limit));
  const set=delta=>{if(commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.uses??={};c.prestige.session.uses[st.id]=Math.max(0,Math.min(st.limit,used+delta));}))refresh();};
  const less=button('−',()=>set(-1)),more=button('+',()=>set(1));less.setAttribute('aria-label','Togli un utilizzo segnato di '+st.name);more.setAttribute('aria-label','Segna un utilizzo di '+st.name);less.disabled=!used;more.disabled=used>=st.limit;counter.append(less,more);card.appendChild(counter);card.appendChild(e('small','prg-muted','− annulla un uso · + segna un uso. ST e azioni si risolvono al tavolo.'));
 }
 return card;
}
function choiceSections(key,refresh){
 const data=V.choices(pg,key),wrap=e('div','prg-choice-sections');
 const count=e('div','prg-choice-count');count.appendChild(e('strong','',data.active.length+' / '+data.slots));count.appendChild(e('span','','talenti acquisiti'+(data.remaining?' · '+data.remaining+' '+(data.remaining===1?'scelta da assegnare':'scelte da assegnare'):' · tutte le scelte assegnate')));wrap.appendChild(count);
 if(data.active.length){wrap.appendChild(e('h3','prg-section-title','Il tuo repertorio'));const grid=e('div','prg-choices');data.active.forEach(st=>grid.appendChild(chooseCard(st,refresh)));wrap.appendChild(grid);}
 else wrap.appendChild(e('p','prg-empty',data.slots?'Non hai ancora scelto un talento per questo percorso.':'Questo percorso non ha ancora talenti di Prestigio utilizzabili.'));
 if(data.available.length){
  const pick=el('details',{class:'prg-pick'});if(!data.active.length)pick.open=true;
  pick.appendChild(e('summary','',data.remaining+' '+(data.remaining===1?'scelta disponibile':'scelte disponibili')+' · Scegli il tuo talento'));
  pick.appendChild(e('p','prg-muted','Puoi acquisire ora uno di questi talenti: livello e prerequisiti sono soddisfatti.'));
  const grid=e('div','prg-choices');data.available.forEach(st=>grid.appendChild(chooseCard(st,refresh)));pick.appendChild(grid);wrap.appendChild(pick);
 }else if(data.remaining)wrap.appendChild(e('p','prg-muted','Non ci sono altre scelte acquisibili ora. Le scelte non assegnate restano disponibili quando soddisfi i prerequisiti.'));
 if(data.inactive.length){
  const saved=el('details',{class:'prg-rules prg-inactive'});saved.appendChild(e('summary','',data.inactive.length+' '+(data.inactive.length===1?'scelta conservata, ora inattiva':'scelte conservate, ora inattive')));
  data.inactive.forEach(st=>{const item=e('div','prg-inactive-choice');item.appendChild(e('h4','',st.name));item.appendChild(e('p','prg-muted',st.reason.startsWith('Scelte esaurite')?'Il livello attuale non dispone di una scelta libera per questo talento.':st.reason));item.appendChild(button('Rimuovi scelta',()=>{if(commit(c=>P.choose(c,st.path.id,st.id,false)))refresh();},'prg-button subtle'));saved.appendChild(item);});wrap.appendChild(saved);
 }
 return wrap;
}
function roleBody(pathId,refresh){const p=P.paths(pg).find(p=>p.id===pathId),wrap=e('div','prg-role-body');if(!p)return e('p','','Percorso non disponibile per questo personaggio.');
 wrap.appendChild(current(p.style,p.die,'Skill di Ruolo · '+p.skill));
 wrap.appendChild(e('p','prg-lead','Le tue capacità al livello attuale. I talenti acquisiti mostrano già i potenziamenti raggiunti.'));
 wrap.appendChild(choiceSections(p.id,refresh));
 wrap.appendChild(el('a',{class:'prg-manual',href:'/manuale-prestigio/',target:'_blank',rel:'noopener',text:'Esplora tutte le evoluzioni nel manuale ↗'}));
 if(error)wrap.prepend(el('p',{class:'prg-error',role:'alert',text:error}));return wrap;
}
function renderRoleTree(S,v){
 v.classList.add('tt-prestige');const header=e('header','prg-tree-head');header.appendChild(button('‹ Torna al pirata',closeTalentTree));
 const tabs=el('div',{class:'tt-tabs',role:'tablist'});ttSources().forEach(s=>{const b=button(s.label,()=>{TT.src=s.id;TT.sel='';error='';renderTalentTree(true);},'tt-tab'+(s.id===S.id?' on':'')+(s.prestige?' prg-lit-tab':''));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(s.id===S.id));tabs.appendChild(b);});header.appendChild(tabs);v.appendChild(header);
 const scroll=e('div','prg-tree-scroll');scroll.appendChild(roleBody(S.pathId,()=>renderTalentTree(false)));v.appendChild(scroll);
}
function attribute(attr){const w=e('div','prg-attribute'),actual=P.level(pg.attr?.[attr]);
 w.appendChild(current(attr,pg.attr?.[attr],'Potenziamenti attuali'));
 if(!actual){w.appendChild(e('p','prg-empty','Questo Attributo non ha ancora raggiunto il Prestigio.'));
  if(attr==='Spirito'&&V.choices(pg,'spirito').inactive.length)w.appendChild(choiceSections('spirito',refreshModal));
 }else if(attr==='Spirito'){
  w.appendChild(e('p','prg-lead','Il tuo limite per Armamento e Osservazione è '+pg.attr.Spirito+'. Ciascun Colore mantiene il proprio livello; il Re segue l’assegnazione del GM.'));
  w.appendChild(choiceSections('spirito',refreshModal));
  if(P.has(pg,'riscossa-della-volonta'))w.appendChild(recovery());
 }else{
  const benefits=P.benefits(pg,attr),grid=e('div','prg-benefits');
  benefits.forEach(b=>{const card=e('article','prg-benefit');card.appendChild(e('h3','',b.name));card.appendChild(e('strong','prg-value',V.number(b.value)));card.appendChild(e('span','prg-unit',b.unit));card.appendChild(e('p','',b.detail));
   if(b.id==='destruction'){
    const d=el('details',{class:'prg-rules'});d.appendChild(e('summary','','Fasce di danno · raggio attuale'));
    const table=el('table',{class:'prg-bands'});table.appendChild(e('caption','','D = danno del singolo impatto. Distanze dal punto colpito.'));
    const head=el('thead',{},[el('tr',{},[el('th',{scope:'col',text:'Distanza'}),el('th',{scope:'col',text:'Danno'})])]),body=el('tbody');
    V.bands(pg).forEach((band,i)=>body.appendChild(el('tr',{},[e('td','',(i?'oltre '+V.number(band.from)+' → ':'0 → ')+V.number(band.to)+' m'),e('td','',band.damage)])));table.append(head,body);d.appendChild(table);d.appendChild(e('p','prg-muted','Arrotonda le frazioni per difetto. Le fasce usano il raggio massimo anche se scegli un’area più piccola.'));card.appendChild(d);
   }
   grid.appendChild(card);
  });w.appendChild(grid);
  if(!benefits.length)w.appendChild(e('p','prg-lead','Usi il dado completo '+pg.attr[attr]+' nei tiri di '+attr+'. Non ci sono altre capacità automatiche compatibili con i Ruoli e i talenti attualmente posseduti.'));
  if(attr==='Tecnica'&&benefits.some(b=>b.id==='movement'))w.appendChild(movement());
 }
 w.appendChild(manual(D.attributes[attr]));return w;
}
function movement(){const max=P.benefits(pg,'Tecnica').find(b=>b.id==='movement').value,used=Math.max(0,Number(pg.prestige?.session?.movementUsed)||0),w=e('section','prg-session');w.appendChild(e('h3','','Spostamento speciale nel turno'));w.appendChild(e('p','prg-value',Math.max(0,max-used)+' / '+max+' m rimasti'));w.appendChild(meter(Math.max(0,max-used),max));const lab=e('label','','Metri già percorsi'),input=el('input',{type:'number',min:'0',max:String(max),step:'1','aria-label':'Metri speciali già percorsi'});input.value=used;lab.appendChild(input);w.appendChild(lab);w.appendChild(button('Registra metri',()=>{const n=Number(input.value);if(!Number.isFinite(n)||n<0||n>max){error='Indica da 0 a '+max+' metri.';refreshModal();return;}commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.movementUsed=n;});refreshModal();}));w.appendChild(e('p','prg-muted','Scatto e Balzo consumano lo stesso budget. Il Movimento ordinario è separato.'));return w;}
function recovery(){
 const w=e('section','prg-session'),amount=P.level(pg.attr?.Spirito),used=pg.prestige?.session?.riscossaUsed;
 w.appendChild(e('h3','','Riscossa della Volontà'));w.appendChild(e('p','','Recupera fino a '+amount+' PIP complessivi · 1 Azione Bonus · 0 ST · un uso fra due riposi.'));
 if(used){w.appendChild(e('p','prg-reason','Già utilizzata: serve un riposo breve o lungo.'));return w;}
 const inputs={};GLCMoves.sources().filter(s=>s.kind==='haki').forEach(s=>{const state=GLCMoves.hakiState(s),label=e('label','',s.name+' · '+state.pipRemaining+'/'+state.max),input=el('input',{type:'number',min:'0',max:String(Math.min(amount,state.max-state.pipRemaining)),value:'0','aria-label':'PIP da recuperare '+s.name});inputs[s.id]=input;label.appendChild(input);w.appendChild(label);});
 w.appendChild(button('Usa Riscossa e recupera PIP',()=>{commit(c=>P.recover(c,Object.fromEntries(Object.entries(inputs).map(([id,input])=>[id,Number(input.value)]))));refreshModal();},'prg-button primary'));return w;
}
function overview(){const w=e('div','prg-overview');w.appendChild(e('p','prg-overline','Grand Line Chronicles'));w.appendChild(e('h2','','Il tuo Prestigio'));w.appendChild(e('p','prg-lead','Le capacità che hai raggiunto, pronte da usare in sessione.'));
 const attrs=['Forza','Tecnica','Spirito','Astuzia'].filter(a=>P.level(pg.attr?.[a]));
 if(attrs.length){w.appendChild(e('h3','prg-section-title','Attributi'));const grid=e('div','prg-portals');attrs.forEach(a=>{const b=button('',()=>{view={kind:'attr',key:a};refreshModal();},'prg-portal unlocked');b.appendChild(el('span',{html:dieIcon(pg.attr[a],50)}));b.appendChild(e('strong','',a));b.appendChild(e('small','',P.label(pg.attr[a])));
  const summary=a==='Spirito'?V.choices(pg,'spirito').active.length+' talenti acquisiti':P.benefits(pg,a).map(x=>x.name+': '+V.number(x.value)+' '+x.unit).join(' · ');
  b.appendChild(e('span','prg-portal-summary',summary||'Tiri con '+pg.attr[a]));grid.appendChild(b);});w.appendChild(grid);}
 const paths=P.paths(pg).filter(p=>P.level(p.die)||P.choices(pg,p.id).length);
 if(paths.length){w.appendChild(e('h3','prg-section-title','Talenti di Ruolo'));const roles=e('div','prg-portals');paths.forEach(p=>{const data=V.choices(pg,p.id),b=button('',()=>{closeModal();openTalentTree('prestige:'+p.id);},'prg-portal'+(P.level(p.die)?' unlocked':''));b.appendChild(e('strong','',p.style));b.appendChild(e('small','',p.skill+' · '+(P.label(p.die)||'Scelte inattive')));b.appendChild(e('span','',data.active.length+' talenti acquisiti'+(data.available.length?' · '+data.remaining+' scelte disponibili':'')));roles.appendChild(b);});w.appendChild(roles);}
 const colors=(pg.haki||[]).filter(h=>P.hakiLevel(pg,h));
 if(colors.length){w.appendChild(e('h3','prg-section-title','Haki'));const grid=e('div','prg-portals');colors.forEach(h=>{const lv=P.hakiLevel(pg,h),rows=P.hakiRows(pg,h),names=[...new Set(rows.map(r=>r.name))],b=button('',()=>{closeModal();hakiModal(pg.haki.indexOf(h));},'prg-portal unlocked');b.appendChild(e('strong','',h.name.replace('Haki ','')));b.appendChild(e('small','',h.name==='Haki del Re'?(lv===3?'Saikyō':'Prestigio '+D.stages[lv-1]):P.label(P.effectiveHakiDie(pg,h))));b.appendChild(e('span','prg-portal-summary',names.join(' · ')));grid.appendChild(b);});w.appendChild(grid);}
 if(!attrs.length&&!paths.length&&!colors.length)w.appendChild(e('p','prg-empty','Non hai ancora capacità di Prestigio sbloccate.'));
 const session=e('section','prg-session');session.appendChild(e('h3','','Il registro della sessione'));session.appendChild(e('p','prg-muted','Aggiorna i contatori quando avviene il corrispondente evento al tavolo. Non vengono consumate automaticamente ST o azioni.'));
 session.appendChild(button('Inizio del mio turno',()=>{commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.movementUsed=0;for(const t of D.talents.filter(t=>t.frequency==='turn'))if(c.prestige.session.uses)delete c.prestige.session.uses[t.id];Object.values(c.specialMoveSession?.haki||{}).forEach(h=>{Object.keys(h.effects||{}).forEach(k=>h.effects[k]=Math.max(0,(Number(h.effects[k])||0)-1));});});refreshModal();}));
 const resetUses=(freq,label)=>session.appendChild(button(label,()=>{commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.uses??={};for(const t of D.talents.filter(t=>t.frequency===freq))delete c.prestige.session.uses[t.id];if(freq==='combat')c.prestige.session.emperorUsed=false;});refreshModal();}));
 resetUses('combat','Nuovo combattimento');resetUses('naval','Nuova battaglia navale');resetUses('scene','Nuova scena');
 if(P.has(pg,'il-piano-perfetto'))resetUses('plan','Nuovo Piano preparato');
 session.appendChild(button('Riposo breve o lungo · recupera PIP',()=>{const sources=GLCMoves.sources().filter(s=>s.kind==='haki'),maxima=sources.map(s=>[s.id,GLCMoves.hakiState(s).max]);commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.riscossaUsed=false;c.specialMoveSession??={};c.specialMoveSession.haki??={};maxima.forEach(([id,max])=>{c.specialMoveSession.haki[id]={...(c.specialMoveSession.haki[id]||{}),pipRemaining:max};});});refreshModal();}));w.appendChild(session);
 return w;
}
function open(kind='overview',key=''){
 GLCMoves.ensureReferences();focus=document.activeElement;view={kind,key};error='';
 const modal=openModal('✦ Prestigio',()=>{const w=e('div','prg-shell');if(view.kind!=='overview')w.appendChild(button('‹ Tutti i percorsi',()=>{view={kind:'overview',key:''};refreshModal();},'prg-button subtle'));if(error)w.appendChild(el('p',{class:'prg-error',role:'alert',text:error}));w.appendChild(view.kind==='attr'?attribute(view.key):overview());return w;},{xwide:true});modal.classList.add('prg-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Prestigio del pirata');modal._onClose=()=>focus?.focus?.();modal.querySelector('.gmclose')?.focus();
 modal.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const nodes=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex="0"]')].filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
}
function banner(){const levels=['Forza','Tecnica','Spirito','Astuzia'].filter(a=>P.level(pg.attr?.[a])),roles=P.paths(pg).filter(p=>P.level(p.die)),haki=(pg.haki||[]).filter(h=>P.hakiLevel(pg,h));if(!levels.length&&!roles.length&&!haki.length)return null;
 const b=button('',()=>open(),'prg-banner');b.appendChild(e('span','prg-banner-seal','✦'));b.appendChild(e('span','prg-banner-copy','Prestigio'));const names=[...levels.map(a=>a+' '+P.label(pg.attr[a])),...roles.map(p=>p.style+' '+P.label(p.die)),...haki.map(h=>h.name.replace('Haki ','')+' '+(h.name==='Haki del Re'?(P.hakiLevel(pg,h)===3?'Saikyō':'Prestigio '+D.stages[P.hakiLevel(pg,h)-1]):P.label(h.die)))];b.appendChild(e('small','',names.join(' · ')));b.appendChild(e('span','prg-banner-arrow','Capacità attuali ↗'));return b;}
function decorateRow(row,die,name){if(!P.level(die))return;row.classList.add('prg-row');(row.querySelector('.pgname')?.parentNode||row).appendChild(button('✦ '+P.label(die),()=>['Forza','Tecnica','Spirito','Astuzia'].includes(name)?open('attr',name):open(),'prg-row-link'));}
function hakiPanel(h){const w=e('section','prg-haki'),lv=P.hakiLevel(pg,h);w.appendChild(e('p','prg-overline','Prestigio · capacità attuali'));w.appendChild(e('h3','',lv?(h.name==='Haki del Re'?(lv===3?'Saikyō':'Prestigio '+D.stages[lv-1]):P.label(P.effectiveHakiDie(pg,h))):'Nessun effetto di Prestigio sbloccato'));
 if(h.name==='Haki del Re'){
  const settings=el('details',{class:'prg-rules'});settings.appendChild(e('summary','','Assegnazione del GM'));
  const label=e('label','','Prestigio assegnato dal GM'),select=el('select',{'aria-label':'Prestigio del Re assegnato dal GM'});['Nessun Prestigio','Prestigio I','Prestigio II','Saikyō'].forEach((s,i)=>select.appendChild(el('option',{value:String(i),text:s})));select.value=String(lv);select.onchange=()=>{const id=h.smcId,index=pg.haki.indexOf(h);commit(c=>{const target=id?c.haki.find(x=>x.smcId===id):c.haki[index];if(target)target.prestigeGM=Number(select.value);});refreshModal();};label.appendChild(select);settings.appendChild(label);settings.appendChild(e('p','prg-muted','Il GM assegna il livello. Non dipende dal dado Spirito; la riserva resta di 3 PIP.'));w.appendChild(settings);
 }else w.appendChild(e('p','prg-muted','Dado effettivo: '+P.effectiveHakiDie(pg,h)+' · limite: Spirito '+(pg.attr?.Spirito||'d4')+'.'));
 const rows=P.hakiRows(pg,h);
 if(rows.length)w.appendChild(e('p','prg-lead','Effetti ⚡: richiedono il Colore già attivo e la tua Azione Bonus. Attivare il Colore richiede una Bonus in un turno precedente.'));
 rows.forEach(r=>{const info=V.haki(pg,h,r),card=e('article','prg-haki-effect unlocked');card.appendChild(e('h4','',r.name));const variant=rows.filter(x=>x.id===r.id).length>1;
  const facts=e('div','prg-facts');['Azione Bonus',r.cost+' PIP',r.durationTurns?r.durationTurns+' '+(r.durationTurns===1?'turno':'turni'):'',variant?(r.saikyo?'Potenziata':'Standard'):''].filter(Boolean).forEach(t=>facts.appendChild(e('span','',t)));card.appendChild(facts);card.appendChild(e('p','prg-effect',info.effect));const d=disclosure('Condizioni di utilizzo',info.details);d.appendChild(manual(r));card.appendChild(d);w.appendChild(card);
 });
 if(h.name==='Haki del Re'&&lv){const used=!!pg.prestige?.session?.emperorUsed;w.appendChild(button(used?'Grido / Pressione Imperiale · uso segnato':'Segna Grido / Pressione Imperiale usato',()=>{commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.emperorUsed=!used;});refreshModal();}));w.appendChild(e('p','prg-muted','Un solo utilizzo per combattimento, condiviso con Grido dell’Imperatore. Il segno registra un uso già risolto al tavolo.'));}
 if(h.prestigePreviousDice?.length)w.appendChild(e('p','prg-muted','Adeguamento al limite di Spirito: il dado precedente ('+h.prestigePreviousDice.join(', ')+') è conservato nello storico. Aumentare Spirito non aumenta automaticamente questo Haki.'));
 return w;
}
window.GLCPrestigeUI={open,banner,decorateRow,hakiPanel,renderRoleTree};
})();
