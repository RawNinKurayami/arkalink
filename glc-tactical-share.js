/* A sharing transport receives ONLY public-scene projections. No private save reads. */
(function(root){
 'use strict';const T=root.GLCTactical;
 function error(r){if(r.error)throw Error(r.error.message||'Condivisione non disponibile');return r.data;}
 async function assetId(room,data){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(room+data)));const hex=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);}
 function publisher(sb,room,campaign,user){let revision=null,assets=new Map(),queue=Promise.resolve(),stopped=false;
  async function ensure(){if(revision!==null)return;let r=await sb.from('tactical_rooms').select('revision,owner_id,campaign_id').eq('id',room).maybeSingle();const found=error(r);if(found){if(found.owner_id!==user||found.campaign_id!==campaign)throw Error('Il collegamento appartiene a un altro tavolo.');revision=found.revision;return;}r=await sb.from('tactical_rooms').insert({id:room,owner_id:user,campaign_id:campaign,active:false,revision:1,payload:null}).select('revision').single();revision=error(r).revision;}
  async function media(value){if(!value)return '';if(assets.has(value))return 'asset:'+assets.get(value);const id=await assetId(room,value);const check=await sb.from('tactical_assets').select('id').eq('id',id).maybeSingle();if(!error(check)){const r=await sb.from('tactical_assets').insert({id,room_id:room,data_uri:value});if(r.error&&r.error.code!=='23505')error(r);}assets.set(value,id);return 'asset:'+id;}
  async function send(p){await ensure();const snapshot=T.cleanPublic(p);if(snapshot){snapshot.background=await media(snapshot.background);for(const t of snapshot.tokens)t.image=await media(t.image);}
   const r=await sb.from('tactical_rooms').update({active:!!snapshot,payload:snapshot,revision:revision+1}).eq('id',room).eq('revision',revision).select('revision');const rows=error(r);if(!rows?.length){stopped=true;throw Error('Il tavolo condiviso è stato aggiornato da un altro dispositivo. Riapri la condivisione per riprenderne il controllo.');}revision=rows[0].revision;
   // Cache assets are rebuildable from the private scene. RLS prevents deletion of anything currently in use.
   try{const used=new Set(snapshot?[snapshot.background,...snapshot.tokens.map(t=>t.image)].filter(Boolean).map(v=>v.slice(6)):[]);const list=error(await sb.from('tactical_assets').select('id').eq('room_id',room));for(const a of list||[])if(!used.has(a.id)){const del=await sb.from('tactical_assets').delete().eq('room_id',room).eq('id',a.id);if(!del.error)for(const [value,id]of assets)if(id===a.id)assets.delete(value);}}catch(e){/* A later publication can retry cache cleanup. */}
   return revision;}
  return{publish(p){if(stopped)return Promise.reject(Error('Condivisione sospesa: riaprila per continuare.'));const clean=T.cleanPublic(p);const job=queue.then(()=>send(clean));queue=job.catch(()=>{});return job;},close(){stopped=true;const job=queue.then(()=>send(null));queue=job.catch(()=>{});return job;}};
 }
 function reader(sb,room,onScene,onStatus){let stopped=false,revision=null,timer=null,images=new Map(),generation=0;
  async function poll(){if(stopped)return;const gen=++generation;try{const rows=error(await sb.from('tactical_rooms').select('revision,active,expires_at').eq('id',room).maybeSingle());if(!rows||!rows.active||Date.parse(rows.expires_at)<=Date.now()){revision=null;images.clear();onScene(null);onStatus('Il GM non sta mostrando una scena.');}
   else if(rows.revision!==revision){const row=error(await sb.from('tactical_rooms').select('payload,revision').eq('id',room).maybeSingle());if(!row){onScene(null);revision=null;}else{const p=T.cleanPublic(row.payload);if(!p)throw Error('Scena non disponibile');const ids=[p.background,...p.tokens.map(t=>t.image)].filter(v=>v.startsWith('asset:')).map(v=>v.slice(6));for(const id of new Set(ids)){if(!images.has(id)){const asset=error(await sb.from('tactical_assets').select('data_uri').eq('id',id).eq('room_id',room).maybeSingle());if(!asset)throw Error('La scena sta cambiando.');images.set(id,T.image(asset.data_uri));}}
    const resolve=v=>v.startsWith('asset:')?images.get(v.slice(6))||'':v;p.background=resolve(p.background);p.tokens.forEach(t=>t.image=resolve(t.image));if(!stopped&&gen===generation){revision=row.revision;onScene(p);onStatus('Vista giocatori · collegata');}}
   }else onStatus('Vista giocatori · collegata');
  }catch(e){revision=null;onScene(null);onStatus('Collegamento interrotto. Riprovo automaticamente.');}finally{if(!stopped)timer=setTimeout(poll,1500);}}
  poll();return{close(){stopped=true;generation++;clearTimeout(timer);images.clear();onScene(null);}};
 }
 root.GLCTacticalShare={publisher,reader,assetId};
})(window);
