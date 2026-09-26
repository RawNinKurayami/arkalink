/* Profile recovery controls. No unconditional upload/download actions. */
(function(){
 'use strict';
 const labels={glc_pirata_v4:'Pirati',glc_media_v1:'Illustrazioni delle carte',glc_profile_v1:'Profilo',glc_nave_v1:'Navi',glc_sessioni_v1:'Sessioni',glc_bestiario_v1:'Bestiario',glc_scontro_v1:'Scontro',glc_officina_v1:'Officina',glc_cambusa_v1:'Cambusa',glc_campagne_v1:'Campagne'};
 const title=k=>labels[k]||'Archivio';
 const date=s=>s?new Date(s).toLocaleString('it-IT'):'data non disponibile';
 function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
 function action(text,fn){const b=el('button',text,'btn-gold');b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){document.getElementById('sync-feedback').textContent=e.message;}finally{b.disabled=false;}};return b;}
 function summary(data){
  if(!data)return 'Nessun dato';
  const map=['chars','ships','sessions'].find(k=>data[k]&&typeof data[k]==='object');
  if(map){const items=Object.values(data[map]);return items.length+' '+({chars:'pirati',ships:'navi',sessions:'sessioni'})[map]+(items.length?' · '+items.slice(0,12).map(x=>x.nome||x.name||x.title||'Senza nome').join(', '):'')+(items.length>12?'…':'');}
  if(data.username)return '@'+data.username;
  return 'Copia completa di questo archivio';
 }
 function download(key,data,suffix){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download='GLC-'+title(key)+'-'+suffix+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function preview(name,data){const p=el('div',null,'sync-copy');p.append(el('strong',name),el('p',summary(data)));return p;}
 let mounted=false,busy=false,lastConflict='';
 function render(){
  const api=window.GLCSync,box=document.getElementById('sync-stato');if(!box)return;
  box.textContent=api?api.messaggio():'Sincronizzazione non disponibile: ricarica la pagina';
  const st=api&&api.stato(),when=document.getElementById('sync-righe');when.textContent=st&&st.when?'Ultima modifica confermata dal cloud: '+date(st.when):'';
  document.getElementById('sync-now').disabled=busy||!api||!api.collegato()||!st?.ready;
  document.getElementById('sync-history-button').disabled=!api||!api.collegato()||!st?.ready;
  const conflicts=api?api.conflitti():[],signature=JSON.stringify(conflicts.map(c=>[c.key,c.revision,c.ids]));
  if(signature===lastConflict)return;lastConflict=signature;
  const host=document.getElementById('sync-conflicts');host.replaceChildren();
  for(const c of conflicts){
   const card=el('section',null,'sync-conflict');card.append(el('h3',title(c.key)+' · scegli come conservare le copie'),el('p','Questi dati sono stati modificati in più posti. Le copie vengono archiviate prima di applicare la tua scelta.'));
   card.append(preview('Su questo dispositivo',c.local),preview('Nel cloud',c.remote));
   const row=el('div',null,'uname');
   row.append(action('Scarica copia locale',()=>download(c.key,c.local,'locale')),action('Scarica copia cloud',()=>download(c.key,c.remote,'cloud')));
   const resolve=async choice=>{const msg=choice==='both'?'Conservare entrambe le versioni dei personaggi in conflitto, creando una copia locale separata?':choice==='local'?'Usare la copia completa di questo dispositivo per '+title(c.key)+'? La versione cloud resterà nelle versioni precedenti.':'Usare la copia completa del cloud per '+title(c.key)+'? La copia locale resterà nelle versioni precedenti.';if(confirm(msg)){busy=true;render();try{await api.risolvi(c.key,choice,c.revision);}finally{busy=false;lastConflict='';render();}}};
   if(c.local?.chars&&c.remote?.chars&&!c.ids.some(id=>id==='document'||id.startsWith('metadata:')))row.append(action('Conserva entrambi i pirati',()=>resolve('both')));
   row.append(action('Usa la copia cloud',()=>resolve('cloud')),action('Usa la copia locale',()=>resolve('local')));card.append(row);host.append(card);
  }
 }
 async function history(){
  const api=window.GLCSync,host=document.getElementById('sync-history');host.hidden=false;host.textContent='Lettura delle versioni…';
  const rows=await api.versioni();host.replaceChildren(el('p','Sono disponibili le ultime cinque copie per archivio, entro 32 MB per account, e una copia di sicurezza iniziale. Un ripristino conserva anche la versione che sostituisce.'));
  if(!rows.length){host.append(el('p','Le versioni precedenti compariranno dopo le prossime modifiche.'));return;}
  const list=el('div',null,'sync-version-list');host.append(list);
  for(const row of rows){
   const source=({'initial-backup':'Copia di sicurezza iniziale','device-copy':'Copia conservata da un dispositivo','previous-version':'Versione precedente'})[row.source]||'Versione precedente';
   list.append(action(title(row.key)+' · '+date(row.saved_at)+' · '+source,async()=>{
    const version=await api.versione(row.id),expected=api.revisione(row.key),detail=document.getElementById('sync-version-preview');detail.hidden=false;
    detail.replaceChildren(el('h3',title(row.key)+' · '+date(row.saved_at)),preview(source,version.data));
    const buttons=el('div',null,'uname');buttons.append(action('Scarica questa copia',()=>download(row.key,version.data,'recupero')),action('Ripristina questa versione',async()=>{
     if(confirm('Ripristinare tutto l’archivio «'+title(row.key)+'» a questa versione? La versione attuale verrà conservata.'))await api.ripristina(version,expected);
    }));detail.append(buttons);detail.scrollIntoView({block:'nearest'});
   }));
  }
 }
 window.GLCSyncPanel={mount:function(){if(mounted)return;mounted=true;document.getElementById('sync-now').onclick=async()=>{busy=true;render();try{await GLCSync.adesso();}finally{busy=false;render();}};document.getElementById('sync-history-button').onclick=()=>history().catch(e=>document.getElementById('sync-feedback').textContent=e.message);window.addEventListener('glc:sync-status',render);render();}};
})();
