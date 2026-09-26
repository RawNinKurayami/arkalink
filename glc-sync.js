/* GLC sync v2 — versioned writes, durable drafts and per-character conflict detection. */
(function(root){
 'use strict';
 const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const maps=['chars','ships','sessions'];
 function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(object(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';return JSON.stringify(v);}
 const equal=(a,b)=>stable(a)===stable(b);
 function canonical(v){const c=clone(v);if(object(c)&&maps.some(k=>object(c[k])))delete c.activeId;return c;}
 function merge(base,local,remote){
  base=canonical(base);local=canonical(local);remote=canonical(remote);
  if(equal(local,base))return {data:clone(remote),conflicts:[]};
  if(equal(remote,base)||equal(local,remote))return {data:clone(local),conflicts:[]};
  const map=maps.find(k=>object(base?.[k])&&object(local?.[k])&&object(remote?.[k]));
  if(!map)return {data:null,conflicts:['document']};
  const data=clone(remote), conflicts=[];data[map]={};
  for(const id of new Set([...Object.keys(base[map]),...Object.keys(local[map]),...Object.keys(remote[map])])){
   const b=base[map][id],l=local[map][id],r=remote[map][id];let value;
   if(equal(l,b))value=r;else if(equal(r,b)||equal(l,r))value=l;else{conflicts.push(id);continue;}
   if(value!==undefined)Object.defineProperty(data[map],id,{value:clone(value),enumerable:true,writable:true,configurable:true});
  }
  // Container metadata must not silently overwrite concurrent changes either.
  for(const k of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
   if(k===map||k==='order')continue;
   if(equal(local[k],base[k]))continue;
   if(equal(remote[k],base[k])||equal(local[k],remote[k])){if(local[k]===undefined)delete data[k];else data[k]=clone(local[k]);}
   else conflicts.push('metadata:'+k);
  }
  data.order=[...new Set([...(remote.order||[]),...(local.order||[]),...Object.keys(data[map])])].filter(id=>Object.hasOwn(data[map],id));
  return {data,conflicts};
 }
 function display(data,current){const d=clone(data);const map=maps.find(k=>object(d?.[k]));if(map)d.activeId=d[map][current?.activeId]?current.activeId:(d.order||[]).find(id=>d[map][id])||'';return d;}
 class IndexedStore {
  constructor(idb){this.db=new Promise((resolve,reject)=>{if(!idb)return reject(Error('Archivio locale non disponibile'));const q=idb.open('glc_sync_v2',1);q.onupgradeneeded=()=>q.result.createObjectStore('records',{keyPath:'id'});q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);});}
  async get(id){const db=await this.db;return new Promise((yes,no)=>{const tx=db.transaction('records'),q=tx.objectStore('records').get(id);q.onsuccess=()=>yes(q.result);q.onerror=()=>no(q.error);});}
  async list(user){const db=await this.db;return new Promise((yes,no)=>{const q=db.transaction('records').objectStore('records').getAll();q.onsuccess=()=>yes(q.result.filter(r=>r.user===user));q.onerror=()=>no(q.error);});}
  async put(value){const db=await this.db;return new Promise((yes,no)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(clone(value));tx.oncomplete=yes;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||Error('Archivio locale non disponibile'));});}
  async clear(user){const records=await this.list(user),db=await this.db;return new Promise((yes,no)=>{const tx=db.transaction('records','readwrite');records.forEach(r=>tx.objectStore('records').delete(r.id));tx.oncomplete=yes;tx.onerror=()=>no(tx.error);});}
 }
 class Sync {
  constructor(options){
   this.o=options;this.storage=options.storage;this.store=options.store||new IndexedStore(root.indexedDB);this.keys=[...new Set(options.keys)];this.records={};this.initial={};this.live={};this.user=null;this.ready=false;this.applying=false;this.running=null;this.persisting=Promise.resolve();this.failure='';this.offline=false;this.generation=0;this.stopped=false;
   this.tab=options.tab||'tab';this.keys.forEach(k=>{this.initial[k]=this.read(k);this.live[k]=this.read(k);});
  }
  read(key){const raw=this.storage.getItem(key);return raw==null?null:JSON.parse(raw);}
  id(key){return this.user+':'+this.tab+':'+key;}
  state(){const rs=Object.values(this.records);return {ready:this.ready,online:!this.offline,pending:rs.filter(r=>r.pending).length,conflicts:rs.filter(r=>r.conflict).map(r=>({key:r.key,ids:r.conflict.conflicts})),error:this.failure,when:rs.reduce((a,r)=>r.updated_at>a?r.updated_at:a,'')};}
  notify(){this.o.onStatus?.(this.state());}
  persist(r){const value=clone(r);this.persisting=this.persisting.catch(()=>{}).then(()=>this.store.put(value));this.persisting.catch(e=>{this.failure='Impossibile proteggere la bozza locale: '+e.message;this.notify();});return this.persisting;}
  async rpc(name,args){if(this.stopped)throw Error('Sessione terminata');const res=await this.o.rpc(name,args);if(this.stopped)throw Error('Sessione terminata');if(res.error)throw Error(res.error.message||'Cloud non raggiungibile');return res.data;}
  async start(user){
   this.user=user;this.ready=false;let reload=false;
   try{
    const prior=await this.store.list(user);
    // A closed tab may leave a durable draft. Archive it before replacing anything.
    for(const old of prior)if(old.pending&&!this.keys.includes(old.key)){this.keys.push(old.key);this.initial[old.key]=this.read(old.key);}
    for(const key of this.keys){
     let r=await this.store.get(this.id(key));
     const pending=prior.filter(x=>x.key===key&&x.pending&&equal(canonical(x.draft),canonical(this.initial[key]))).sort((a,b)=>(b.edited||0)-(a.edited||0))[0];
     if(pending&&(!r||!r.pending))r={...clone(pending),id:this.id(key),tab:this.tab};
     if(!r){const known=prior.filter(x=>x.key===key&&!x.pending).sort((a,b)=>b.revision-a.revision)[0];r={id:this.id(key),user,tab:this.tab,key,revision:known?.revision??null,base:clone(known?.base??null),view:clone(known?.view??this.initial[key]),pending:false,draft:null,conflict:null,updated_at:''};}
     if(!Object.hasOwn(r,"applyTarget")&&r.revision!==null&&!r.pending&&!equal(canonical(this.initial[key]),canonical(r.view))){const m=merge(r.view,this.initial[key],r.base);r.pending=true;r.draft=m.conflicts.length?canonical(this.initial[key]):m.data;}
     this.records[key]=r;this.live[key]=this.read(key);
    }
    for(const old of prior)if(old.tab!==this.tab&&old.pending&&!old.archived){await this.archive(old.key,old.draft);old.archived=true;await this.store.put(old);}
    for(const key of this.keys){
     const r=this.records[key],result=Object.hasOwn(r,"applyTarget")?await this.apply(r,r.applyTarget):await this.syncKey(key,true);reload=reload||result;
     if(!result&&!r.pending&&!r.conflict){r.view=this.read(key);await this.persist(r);}
    }
    this.offline=false;this.failure='';
   }catch(e){this.offline=true;this.failure=e.message;}
   this.ready=true;this.notify();return {reload,offline:this.offline};
  }
  write(key,raw){
   if(!this.keys.includes(key)){this.storage.setItem(key,raw);return;}
   if(this.stopped)throw Error('Sessione terminata');
   if(this.applying)throw Error('Aggiornamento in corso: riprova tra un istante');
   const value=JSON.parse(raw);
   // Startup normalization is local only; the bootstrap snapshot is immutable.
   if(!this.ready){this.storage.setItem(key,raw);this.live[key]=value;return;}
   const r=this.records[key];if(r&&Object.hasOwn(r,'applyTarget'))throw Error('Aggiornamento locale non riuscito: libera spazio e ricarica la pagina');
   if(!r||r.revision===null)throw Error('Attendi il primo allineamento al cloud prima di modificare questi dati');
   let local=value,latest=this.read(key),reloadLocal=false;
   if(!equal(canonical(latest),canonical(this.live[key]))){
    const m=merge(this.live[key],value,latest);
    if(m.conflicts.length){r.pending=true;r.draft=canonical(value);r.conflict={conflicts:m.conflicts,local:canonical(value),remote:canonical(latest),revision:r.revision};this.persist(r);this.notify();throw Error('Una seconda scheda ha modificato lo stesso personaggio: apri il Profilo per confrontare le copie');}
    local=display(m.data,value);reloadLocal=!equal(canonical(value),canonical(local));
   }
   this.storage.setItem(key,JSON.stringify(local));this.live[key]=clone(local);
   if(!reloadLocal&&!r.pending&&equal(canonical(local),canonical(r.view)))return;
   const m=merge(r.view,local,r.base);r.draft=m.conflicts.length?canonical(local):m.data;r.pending=!equal(r.draft,r.base);r.generation=++this.generation;r.edited=Date.now();r.archived=false;
   // Keep a conflict explicit until the user resolves it, even while editing.
   if(r.conflict)r.conflict.local=clone(r.draft);
   const durable=this.persist(r);this.notify();
   if(reloadLocal){this.applying=true;durable.then(()=>this.o.onApply?.()).catch(()=>{this.applying=false;});}
   else this.o.schedule?.(()=>this.sync());
  }
  async archive(key,data){if(data!==null)await this.rpc('glc_sync_archive',{p_key:key,p_data:data});}
  async apply(r,data){
   if(this.stopped)throw Error("Sessione terminata");
   const shown=display(data,this.read(r.key));r.applyTarget=clone(data);await this.persist(r);
   if(this.stopped)throw Error("Sessione terminata");
   this.storage.setItem(r.key,JSON.stringify(shown));this.live[r.key]=clone(shown);r.view=clone(shown);delete r.applyTarget;await this.persist(r);
   this.applying=true;return true;
  }
  async syncKey(key,start=false){
   const r=this.records[key];let remote=await this.rpc('glc_sync_read',{p_key:key});
   if(r.revision===null){
    const local=this.initial[key];
    if(remote.data!==null){
     if(local!==null&&!equal(canonical(local),canonical(remote.data)))await this.archive(key,local);
     r.base=canonical(remote.data);r.revision=remote.revision;r.updated_at=remote.updated_at;r.pending=false;
     if(!equal(canonical(local),r.base)){r.view=display(remote.data,local);return this.apply(r,remote.data);}
     r.view=this.read(key);await this.persist(r);return false;
    }
    r.base=null;r.revision=0;r.view=clone(local);r.pending=local!==null;r.draft=canonical(local);
   }
   if(r.conflict){r.conflict.remote=remote.data;r.conflict.revision=remote.revision;await this.persist(r);return false;}
   for(let attempt=0;attempt<4;attempt++){
    if(!r.pending){
     const changed=!equal(r.base,canonical(remote.data));r.base=canonical(remote.data);r.revision=remote.revision;r.updated_at=remote.updated_at;
     if(changed){r.view=display(remote.data,this.read(key));return this.apply(r,remote.data);}
     await this.persist(r);return false;
    }
    const merged=merge(r.base,r.draft,remote.data);
    if(merged.conflicts.length){r.conflict={...merged,local:clone(r.draft),remote:clone(remote.data),revision:remote.revision};await this.persist(r);return false;}
    const sent=merged.data,gen=r.generation||0,viewSent=clone(this.live[key]),remoteChanged=!equal(r.base,canonical(remote.data));
    const ack=await this.rpc('glc_sync_save',{p_key:key,p_expected:remote.revision,p_data:sent});
    if(!ack.ok){remote=ack;continue;}
    r.base=canonical(ack.data);r.revision=ack.revision;r.updated_at=ack.updated_at;
    if((r.generation||0)!==gen){
     const again=merge(viewSent,this.live[key],r.base);r.view=viewSent;r.draft=again.conflicts.length?canonical(this.live[key]):again.data;r.pending=!equal(r.draft,r.base);
     if(again.conflicts.length)r.conflict={...again,local:canonical(this.live[key]),remote:clone(ack.data),revision:ack.revision};
    }else{r.pending=false;r.draft=null;r.view=clone(viewSent);}
    await this.persist(r);
    if(remoteChanged&&!r.conflict)return this.apply(r,r.pending?r.draft:ack.data);
    if(!r.pending||start)return false;
    remote=ack;
   }
   throw Error('Dati aggiornati altrove durante il salvataggio. La bozza è conservata: riprova.');
  }
  async sync(){
   if(this.stopped||!this.user||!this.ready||this.applying)return false;
   if(this.running)return this.running;
   this.running=(async()=>{
    let reload=false;
    try{await this.persisting;const heads=await this.rpc('glc_sync_heads',{});for(const key of this.keys){const r=this.records[key];if(r.pending||r.conflict||r.revision===null||r.revision!==(heads[key]||0))reload=(await this.syncKey(key))||reload;}this.offline=false;this.failure='';}
    catch(e){this.offline=true;this.failure=e.message;}
    this.notify();if(reload)this.o.onApply?.();
    return !this.offline&&!this.state().pending&&!this.state().conflicts.length;
   })();try{return await this.running;}finally{this.running=null;}
  }
  async flush(){const ok=await this.sync();if(!ok)return false;const all=await this.store.list(this.user);for(const r of all)if(r.pending&&r.tab!==this.tab&&!r.archived){await this.archive(r.key,r.draft);r.archived=true;await this.store.put(r);}return true;}
  stop(){this.stopped=true;this.ready=false;}
  async history(){return this.rpc('glc_sync_history',{});}
  async version(id){return this.rpc('glc_sync_version',{p_id:id});}
  async exclusive(run){
   while(this.running)await this.running;
   const task=run();this.running=task;try{return await task;}finally{this.running=null;}
  }
  restore(version,expected){return this.exclusive(()=>this.restoreVersion(version,expected));}
  async restoreVersion(version,expected){
   const key=version.key,r=this.records[key];if(!r)throw Error('Apri la pagina di questi dati prima del ripristino');
   if(r.pending||r.conflict)throw Error('Risolvi prima le modifiche in attesa');
   const remote=await this.rpc('glc_sync_read',{p_key:key});
   if(remote.revision!==expected)throw Error('I dati sono cambiati: riapri il confronto prima di ripristinare');
   await this.archive(key,this.read(key));
   const ack=await this.rpc('glc_sync_save',{p_key:key,p_expected:expected,p_data:canonical(version.data)});
   if(!ack.ok)throw Error('Il salvataggio è cambiato: nessun ripristino effettuato');
   r.base=canonical(ack.data);r.revision=ack.revision;r.updated_at=ack.updated_at;r.pending=false;r.conflict=null;await this.apply(r,ack.data);this.o.onApply?.();
  }
  resolve(key,choice,expected){return this.exclusive(()=>this.resolveConflict(key,choice,expected));}
  async resolveConflict(key,choice,expected){
   const r=this.records[key],c=r?.conflict;if(!c)return;
   const remote=await this.rpc('glc_sync_read',{p_key:key});
   if(remote.revision!==(expected??c.revision)){c.remote=clone(remote.data);c.revision=remote.revision;await this.persist(r);this.notify();throw Error('La versione cloud è cambiata: controlla di nuovo le due copie');}
   await this.archive(key,c.local);let selected=canonical(remote.data);
   if(choice==='both'){
    const map=maps.find(k=>object(selected?.[k])&&object(c.local?.[k]));if(!map||c.conflicts.some(id=>id==='document'||id.startsWith('metadata:')))throw Error('Per questi dati scegli una copia dopo averle scaricate');
    // Preserve all nonconflicting edits; duplicate only conflicting local entities.
    const m=merge(r.base,c.local,remote.data);selected=clone(m.data);for(const id of m.conflicts)if(remote.data[map][id]!==undefined)selected[map][id]=clone(remote.data[map][id]);
    for(const id of new Set([...Object.keys(r.base?.[map]||{}),...Object.keys(c.local[map])])){
     const b=r.base?.[map]?.[id],l=c.local[map][id];if(equal(l,b))continue;
     if(!m.conflicts.includes(id)){if(l===undefined)delete selected[map][id];else selected[map][id]=clone(l);}
     else if(l!==undefined){const newid=({chars:'c_',ships:'n_',sessions:'s_'})[map]+(root.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));selected[map][newid]=clone(l);selected[map][newid].nome=(l.nome||'Senza nome')+' · copia locale';}
    }
    selected.order=[...new Set([...(selected.order||[]),...(c.local.order||[]),...Object.keys(selected[map])])].filter(id=>Object.hasOwn(selected[map],id));
   }else if(choice==='local')selected=clone(c.local);else if(choice!=='cloud')throw Error('Scelta non valida');
   const ack=await this.rpc('glc_sync_save',{p_key:key,p_expected:remote.revision,p_data:canonical(selected)});
   if(!ack.ok){c.remote=ack.data;c.revision=ack.revision;await this.persist(r);throw Error('Dati cambiati: ripeti il confronto');}
   r.base=canonical(ack.data);r.revision=ack.revision;r.updated_at=ack.updated_at;r.pending=false;r.conflict=null;r.draft=null;await this.apply(r,ack.data);this.notify();this.o.onApply?.();
  }
 }
 root.GLCCloudSync={Sync,IndexedStore,merge,canonical,equal};
 if(typeof module!=='undefined')module.exports=root.GLCCloudSync;
})(typeof window!=='undefined'?window:globalThis);
