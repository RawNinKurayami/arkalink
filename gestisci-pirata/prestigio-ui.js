(function(){
'use strict';
const P=window.GLCPrestige,D=P.data;
let focus=null,view={kind:'overview',key:'',tier:0},error='';
const e=(tag,cls,text)=>el(tag,{class:cls||'',text:text==null?'':String(text)});
const button=(text,fn,cls='prg-button')=>el('button',{type:'button',class:cls,text,onclick:fn});
const meter=(value,max)=>el('div',{class:'prg-meter','aria-hidden':'true'},[el('i',{style:'width:'+Math.max(0,Math.min(100,max?value/max*100:0))+'%'})]);
function commit(change){try{GLCMoves.transaction(change);error='';renderManage();render();return true;}catch(err){error=err.message||'Salvataggio non riuscito.';return false;}}
function blocks(items){const box=e('div','prg-prose');items.forEach(b=>{
 if(b.type==='table'){const wrap=el('div',{class:'prg-table-scroll',tabindex:'0','aria-label':'Tabella delle regole'}),table=el('table');b.rows.forEach((r,i)=>{const tr=el('tr');r.forEach(t=>tr.appendChild(e(i?'td':'th','',t)));table.appendChild(tr);});wrap.appendChild(table);box.appendChild(wrap);}
 else box.appendChild(e(b.style?.startsWith('Heading')?'h4':'p',b.style==='List Bullet'?'prg-bullet':'',b.text));
});return box;}
const manual=t=>el('a',{class:'prg-manual',href:'/manuale-prestigio/#'+t.anchor,target:'_blank',rel:'noopener',text:'Leggi nel Manuale del Prestigio ↗'});
function timeline(die,click){const lv=P.level(die),nav=el('div',{class:'prg-timeline','aria-label':'I sei stadi del Prestigio'});D.stages.forEach((s,i)=>{
 const b=button((i===5?'✦ ':'')+s,()=>click?.(i+1),'prg-tier'+(i<lv?' reached':'')+(i===lv-1?' current':''));
 b.appendChild(e('small','',D.dice[i+6]));b.setAttribute('aria-label',(i===5?'Saikyō':'Prestigio '+s)+' · '+D.dice[i+6]+(i<lv?' · raggiunto':' · da raggiungere'));
 if(!click)b.disabled=true;nav.appendChild(b);
});return nav;}
function chooseCard(st,refresh){
 const card=e('article','prg-choice'+(st.active?' acquired':'')+(st.reason?' locked':''));
 card.appendChild(e('span','prg-overline',st.active?'✦ Acquisito':st.owned?'◇ Conservato · inattivo':st.available?'◇ Disponibile':'○ Da sbloccare'));
 card.appendChild(e('h3','',st.name));
 card.appendChild(e('p','prg-cost',actionLabel(st.action)+(st.costST?' · '+st.costST+' ST':' · 0 ST')+(st.limit?' · '+st.limit+' '+({turn:'per turno',combat:'per combattimento',naval:'per battaglia navale',scene:'per scena',plan:'ridadi per piano'}[st.frequency]||'utilizzi'):'')));
 if(st.replaces.length)card.appendChild(e('p','prg-replaces','Evolve '+st.replaces.filter(n=>!/(Base|Migliorato)$/.test(n)).join(', ')));
 const first=st.blocks.filter(b=>b.type==='p'&&!b.style.startsWith('Heading')).slice(1,3);first.forEach(b=>card.appendChild(e('p','prg-summary',b.text)));
 if(st.level===6)card.appendChild(e('strong','prg-saikyo','Saikyō · forma finale'));
 const details=el('details',{class:'prg-rules'});details.appendChild(e('summary','','Regole complete e Saikyō'));details.appendChild(blocks(st.blocks));details.appendChild(manual(st));card.appendChild(details);
 if(st.reason)card.appendChild(e('p','prg-reason',st.reason));
 if(st.available)card.appendChild(button('✦ Acquisisci talento',()=>{if(commit(c=>P.choose(c,st.path.id,st.id,true)))refresh();},'prg-button primary'));
 if(st.owned)card.appendChild(button('Rimuovi scelta',()=>{if(commit(c=>P.choose(c,st.path.id,st.id,false)))refresh();},'prg-button subtle'));
 if(st.active&&st.limit){const used=Math.max(0,Number(pg.prestige?.session?.uses?.[st.id])||0),counter=e('div','prg-counter');counter.appendChild(e('span','',(st.id==='il-piano-perfetto'?'Ridadi spesi: ':'Utilizzi segnati: ')+used+' / '+st.limit));
  const set=delta=>{if(commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.uses??={};c.prestige.session.uses[st.id]=Math.max(0,Math.min(st.limit,used+delta));}))refresh();};
  const less=button('−',()=>set(-1)),more=button('+',()=>set(1));less.setAttribute('aria-label','Togli un utilizzo di '+st.name);more.setAttribute('aria-label','Segna un utilizzo di '+st.name);less.disabled=!used;more.disabled=used>=st.limit;counter.append(less,more);card.appendChild(counter);card.appendChild(e('small','prg-muted','Registro degli usi già risolti al tavolo; non spende automaticamente ST o azioni.'));
 }
 return card;
}
function actionLabel(a){return ({bonus:'Azione Bonus',reaction:'Reazione',action:'Azione',passive:'Passivo',modifier:'Modificatore · nessuna Bonus',preparation:'Preparazione'})[a]||a;}
function roleBody(pathId,refresh){const p=P.paths(pg).find(p=>p.id===pathId),wrap=e('div','prg-role-body');if(!p)return e('p','','Percorso non disponibile per questo personaggio.');
 const states=P.states(pg,p.id),held=states.filter(t=>t.active).length,limit=P.slots(p.die);
 wrap.appendChild(el('header',{class:'prg-role-intro'},[e('p','prg-overline','Skill di Ruolo · '+p.skill),e('h2','',p.style+' / Prestigio'),e('p','prg-lead','Scegli il tuo percorso oltre il d20. Le scelte si aprono ai Prestigi I, III e V; a Saikyō evolvono i talenti posseduti.')]));
 wrap.appendChild(timeline(p.die));
 const slots=e('div','prg-choice-count');slots.appendChild(e('strong','',held+' / '+limit));slots.appendChild(e('span','','scelte acquisite · '+(p.die||'Skill non allenata')));wrap.appendChild(slots);
 const grid=e('div','prg-choices');states.forEach(st=>grid.appendChild(chooseCard(st,refresh)));wrap.appendChild(grid);
 if(error)wrap.prepend(el('p',{class:'prg-error',role:'alert',text:error}));return wrap;
}
function renderRoleTree(S,v){
 v.classList.add('tt-prestige');const header=e('header','prg-tree-head');header.appendChild(button('‹ Torna al pirata',closeTalentTree));
 const tabs=el('div',{class:'tt-tabs',role:'tablist'});ttSources().forEach(s=>{const b=button(s.label,()=>{TT.src=s.id;TT.sel='';error='';renderTalentTree(true);},'tt-tab'+(s.id===S.id?' on':'')+(s.prestige?' prg-lit-tab':''));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(s.id===S.id));tabs.appendChild(b);});header.appendChild(tabs);v.appendChild(header);
 const scroll=e('div','prg-tree-scroll');scroll.appendChild(roleBody(S.pathId,()=>renderTalentTree(false)));v.appendChild(scroll);
}
function attribute(attr){const w=e('div','prg-attribute'),actual=P.level(pg.attr?.[attr]),preview=view.tier||actual,die=D.dice[Math.max(6,preview+5)];
 w.appendChild(e('p','prg-overline','Attributo · '+(P.label(pg.attr?.[attr])||'Prestigio da raggiungere')));w.appendChild(e('h2','',attr));
 w.appendChild(el('div',{class:'prg-hero-die',html:dieIcon(pg.attr?.[attr],78)}));
 w.appendChild(timeline(pg.attr?.[attr],n=>{view.tier=n;refreshModal();}));
 if(!actual)w.appendChild(e('p','prg-reason','I potenziamenti si aprono a '+attr+' d20+d4.'));
 if(preview!==actual)w.appendChild(e('p','prg-reason','Anteprima '+(preview===6?'Saikyō':'Prestigio '+D.stages[preview-1])+'. Il tuo dado attuale resta '+(pg.attr?.[attr]||'—')+'.'));
 if(attr==='Spirito'){
  w.appendChild(e('p','prg-lead','Armamento e Osservazione possono crescere fino a '+(pg.attr?.Spirito||'d4')+'. Il Re segue la decisione del GM. Le tre scelte di Spirito sono indipendenti dai Talenti di Ruolo.'));
  const grid=e('div','prg-choices');P.states(pg,'spirito').forEach(st=>grid.appendChild(chooseCard(st,()=>refreshModal())));w.appendChild(grid);
  if(P.has(pg,'riscossa-della-volonta'))w.appendChild(recovery());
 }else{
  const clone={...pg,attr:{...pg.attr,[attr]:die}},benefits=P.benefits(clone,attr),grid=e('div','prg-benefits');
  benefits.forEach(b=>{const card=e('article','prg-benefit');card.appendChild(e('span','prg-overline',preview<=actual?'Potenziamento raggiunto':'Prossima evoluzione'));card.appendChild(e('h3','',b.name));card.appendChild(e('strong','prg-value',b.value.toLocaleString('it-IT')));card.appendChild(e('span','prg-unit',b.unit));card.appendChild(e('p','',b.detail));grid.appendChild(card);});w.appendChild(grid);
  if(!benefits.length)w.appendChild(e('p','prg-lead','Il dado completo migliora i normali tiri di '+attr+'. Il catalogo attuale non assegna ulteriori capacità automatiche compatibili con i tuoi Ruoli e talenti.'));
  if(attr==='Tecnica'&&P.benefits(pg,attr).some(b=>b.id==='movement'))w.appendChild(movement());
 }
 const detail=el('details',{class:'prg-rules'});detail.appendChild(e('summary','','Scale complete, requisiti ed esempi'));detail.appendChild(blocks(D.attributes[attr].blocks));detail.appendChild(manual(D.attributes[attr]));w.appendChild(detail);
 if(['Forza','Tecnica'].includes(attr)&&P.paths(pg).some(p=>p.style==='Swordsman')){const blade=el('details',{class:'prg-rules'});blade.appendChild(e('summary','','Le scale dello Swordsman'));blade.appendChild(blocks(D.attributes.Lama.blocks));w.appendChild(blade);}
 return w;
}
function movement(){const max=P.benefits(pg,'Tecnica').find(b=>b.id==='movement').value,used=Math.max(0,Number(pg.prestige?.session?.movementUsed)||0),w=e('section','prg-session');w.appendChild(e('h3','','Spostamento speciale nel turno'));w.appendChild(e('p','prg-value',Math.max(0,max-used)+' / '+max+' m'));w.appendChild(meter(used,max));const lab=e('label','','Metri già percorsi'),input=el('input',{type:'number',min:'0',max:String(max),step:'1','aria-label':'Metri speciali già percorsi'});input.value=used;lab.appendChild(input);w.appendChild(lab);w.appendChild(button('Registra metri',()=>{const n=Number(input.value);if(!Number.isFinite(n)||n<0||n>max){error='Indica da 0 a '+max+' metri.';refreshModal();return;}commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.movementUsed=n;});refreshModal();}));w.appendChild(e('p','prg-muted','Scatto, Inseguire e Balzo consumano lo stesso budget. Il Movimento ordinario è separato.'));return w;}
function recovery(){
 const w=e('section','prg-session'),amount=P.level(pg.attr?.Spirito),used=pg.prestige?.session?.riscossaUsed;
 w.appendChild(e('h3','','Riscossa della Volontà'));w.appendChild(e('p','','Recupera fino a '+amount+' PIP complessivi · 1 Azione Bonus · 0 ST · un uso fra due riposi.'));
 if(used){w.appendChild(e('p','prg-reason','Già utilizzata: serve un riposo breve o lungo.'));return w;}
 const inputs={};GLCMoves.sources().filter(s=>s.kind==='haki').forEach(s=>{const state=GLCMoves.hakiState(s),label=e('label','',s.name+' · '+state.pipRemaining+'/'+state.max),input=el('input',{type:'number',min:'0',max:String(Math.min(amount,state.max-state.pipRemaining)),value:'0','aria-label':'PIP da recuperare '+s.name});inputs[s.id]=input;label.appendChild(input);w.appendChild(label);});
 w.appendChild(button('Usa Riscossa e recupera PIP',()=>{commit(c=>P.recover(c,Object.fromEntries(Object.entries(inputs).map(([id,input])=>[id,Number(input.value)]))));refreshModal();},'prg-button primary'));return w;
}
function overview(){const w=e('div','prg-overview');w.appendChild(e('p','prg-overline','Grand Line Chronicles'));w.appendChild(e('h2','','La via del Prestigio'));w.appendChild(e('p','prg-lead','Ogni percorso custodisce la propria crescita. Apri un sigillo per vedere ciò che hai raggiunto e ciò che ti attende.'));
 const grid=e('div','prg-portals');['Forza','Tecnica','Spirito','Astuzia'].forEach(a=>{const lv=P.level(pg.attr?.[a]),b=button('',()=>{view={kind:'attr',key:a,tier:lv};refreshModal();},'prg-portal'+(lv?' unlocked':''));b.appendChild(el('span',{html:dieIcon(pg.attr?.[a],50)}));b.appendChild(e('strong','',a));b.appendChild(e('small','',P.label(pg.attr?.[a])||'Dal d20+d4'));grid.appendChild(b);});w.appendChild(grid);
 const roles=e('div','prg-portals');P.paths(pg).forEach(p=>{const b=button('',()=>{closeModal();openTalentTree('prestige:'+p.id);},'prg-portal'+(P.level(p.die)?' unlocked':''));b.appendChild(e('strong','',p.style));b.appendChild(e('small','',p.skill+' · '+(P.label(p.die)||p.die||'non allenata')));b.appendChild(e('span','',P.states(pg,p.id).filter(t=>t.active).length+'/'+P.slots(p.die)+' talenti'));roles.appendChild(b);});w.appendChild(e('h3','','Skill di Ruolo'));w.appendChild(roles);
 const session=e('section','prg-session');session.appendChild(e('h3','','Il registro della sessione'));session.appendChild(e('p','prg-muted','Aggiorna i contatori quando avviene il corrispondente evento al tavolo. Non vengono consumate automaticamente ST o azioni.'));
 session.appendChild(button('Inizio del mio turno',()=>{commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.movementUsed=0;for(const t of D.talents.filter(t=>t.frequency==='turn'))if(c.prestige.session.uses)delete c.prestige.session.uses[t.id];Object.values(c.specialMoveSession?.haki||{}).forEach(h=>{Object.keys(h.effects||{}).forEach(k=>h.effects[k]=Math.max(0,(Number(h.effects[k])||0)-1));});});refreshModal();}));
 const resetUses=(freq,label)=>session.appendChild(button(label,()=>{commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.uses??={};for(const t of D.talents.filter(t=>t.frequency===freq))delete c.prestige.session.uses[t.id];if(freq==='combat')c.prestige.session.emperorUsed=false;});refreshModal();}));
 resetUses('combat','Nuovo combattimento');resetUses('naval','Nuova battaglia navale');resetUses('scene','Nuova scena');
 if(P.has(pg,'il-piano-perfetto'))resetUses('plan','Nuovo Piano preparato');
 session.appendChild(button('Riposo breve o lungo · recupera PIP',()=>{const sources=GLCMoves.sources().filter(s=>s.kind==='haki'),maxima=sources.map(s=>[s.id,GLCMoves.hakiState(s).max]);commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.riscossaUsed=false;c.specialMoveSession??={};c.specialMoveSession.haki??={};maxima.forEach(([id,max])=>{c.specialMoveSession.haki[id]={...(c.specialMoveSession.haki[id]||{}),pipRemaining:max};});});refreshModal();}));w.appendChild(session);
 return w;
}
function open(kind='overview',key=''){
 GLCMoves.ensureReferences();focus=document.activeElement;view={kind,key,tier:0};error='';
 const modal=openModal('✦ Prestigio',()=>{const w=e('div','prg-shell');if(view.kind!=='overview')w.appendChild(button('‹ Tutti i percorsi',()=>{view={kind:'overview',key:'',tier:0};refreshModal();},'prg-button subtle'));if(error)w.appendChild(el('p',{class:'prg-error',role:'alert',text:error}));w.appendChild(view.kind==='attr'?attribute(view.key):overview());return w;},{xwide:true});modal.classList.add('prg-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Prestigio del pirata');modal._onClose=()=>focus?.focus?.();modal.querySelector('.gmclose')?.focus();
 modal.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const nodes=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),summary,[tabindex="0"]')].filter(n=>n.getClientRects().length);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
}
function banner(){const levels=['Forza','Tecnica','Spirito','Astuzia'].filter(a=>P.level(pg.attr?.[a])),roles=P.paths(pg).filter(p=>P.level(p.die)),haki=(pg.haki||[]).filter(h=>P.hakiLevel(pg,h));if(!levels.length&&!roles.length&&!haki.length)return null;
 const b=button('',()=>open(),'prg-banner');b.appendChild(e('span','prg-banner-seal','✦'));b.appendChild(e('span','prg-banner-copy','Prestigio'));const names=[...levels.map(a=>a+' '+P.label(pg.attr[a])),...roles.map(p=>p.style+' '+P.label(p.die)),...haki.map(h=>h.name.replace('Haki ','')+' '+(h.name==='Haki del Re'?(P.hakiLevel(pg,h)===3?'Saikyō':'Prestigio '+D.stages[P.hakiLevel(pg,h)-1]):P.label(h.die)))];b.appendChild(e('small','',names.join(' · ')));b.appendChild(e('span','prg-banner-arrow','Esplora ↗'));return b;}
function decorateRow(row,die,name){if(!P.level(die))return;row.classList.add('prg-row');(row.querySelector('.pgname')?.parentNode||row).appendChild(button('✦ '+P.label(die),()=>['Forza','Tecnica','Spirito','Astuzia'].includes(name)?open('attr',name):open(),'prg-row-link'));}
function hakiPanel(h){const w=e('section','prg-haki'),lv=P.hakiLevel(pg,h);w.appendChild(e('p','prg-overline','Evoluzione dell’Haki'));w.appendChild(e('h3','',lv?(h.name==='Haki del Re'?(lv===3?'Saikyō':'Prestigio '+D.stages[lv-1]):P.label(h.die)):'Il cammino del Prestigio'));
 if(h.name==='Haki del Re'){
  const label=e('label','','Prestigio assegnato dal GM'),select=el('select',{'aria-label':'Prestigio del Re assegnato dal GM'});['Nessun Prestigio','Prestigio I','Prestigio II','Saikyō'].forEach((s,i)=>select.appendChild(el('option',{value:String(i),text:s})));select.value=String(lv);select.onchange=()=>{const id=h.smcId,index=pg.haki.indexOf(h);commit(c=>{const target=id?c.haki.find(x=>x.smcId===id):c.haki[index];if(target)target.prestigeGM=Number(select.value);});refreshModal();};label.appendChild(select);w.appendChild(label);w.appendChild(e('p','prg-muted','Tre stadi narrativi, senza dado né soglia di Spirito. La riserva conserva il massimo ordinario di 3 PIP.'));
 }else w.appendChild(e('p','prg-muted','Limite: Spirito '+(pg.attr?.Spirito||'d4')+'. Il Prestigio mantiene il massimo di 5 PIP. La crescita del Colore resta distinta.'));
 P.hakiRows(pg,h,true).forEach(r=>{const d=el('details',{class:'prg-haki-effect'+(r.unlocked?' unlocked':'')});d.appendChild(e('summary','',(r.unlocked?'✦ ':'○ ')+r.name+' · '+r.cost+' PIP · '+r.liv));d.appendChild(blocks(r.blocks));d.appendChild(manual(r));w.appendChild(d);});
 if(h.name==='Haki del Re'&&lv){const used=!!pg.prestige?.session?.emperorUsed;w.appendChild(button(used?'Grido / Pressione Imperiale · uso segnato':'Segna Grido / Pressione Imperiale usato',()=>{commit(c=>{c.prestige??={};c.prestige.session??={};c.prestige.session.emperorUsed=!used;});refreshModal();}));w.appendChild(e('p','prg-muted','Un solo utilizzo per combattimento, condiviso con Grido dell’Imperatore. Il segno registra un uso già risolto al tavolo.'));}
 if(h.prestigePreviousDice?.length)w.appendChild(e('p','prg-muted','Adeguamento al limite di Spirito: il dado precedente ('+h.prestigePreviousDice.join(', ')+') è conservato nello storico. Aumentare Spirito non aumenta automaticamente questo Haki.'));
 return w;
}
window.GLCPrestigeUI={open,banner,decorateRow,hakiPanel,renderRoleTree,blocks};
})();
