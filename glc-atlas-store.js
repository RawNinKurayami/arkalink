/* Atlas persistence adapters. Private campaign atlases use the existing per-user sync key.
   Campaign writes preserve unrelated fields and refuse stale edits with an optimistic check. */
(function(root){
 'use strict';
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 const stable=v=>Array.isArray(v)?'['+v.map(stable).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}':JSON.stringify(v);
 const equal=(a,b)=>stable(a)===stable(b);
 function read(key){const raw=localStorage.getItem(key);const data=raw?JSON.parse(raw):{};if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Archivio non valido: nessun dato è stato sostituito.');return data;}
 function write(key,data){(root.GLCStore||localStorage).setItem(key,JSON.stringify(data));}
 function privateAtlas(cid){const data=read('glc_campagne_v1');return copy(data.atlases&&data.atlases[cid]||{map:[],mapLand:[]});}
 function privateWrite(cid,expected,patch){const data=read('glc_campagne_v1'),atlases=data.atlases||{},current=atlases[cid]||{map:[],mapLand:[]};guard(current,expected,patch);data.atlases=atlases;Object.defineProperty(atlases,cid,{value:Object.assign({},current,copy(patch)),enumerable:true,configurable:true,writable:true});write('glc_campagne_v1',data);return copy(atlases[cid]);}
 function session(sid){const data=read('glc_sessioni_v1');return copy(data.sessions&&data.sessions[sid]||null);}
 function sessionWrite(sid,expected,patch){const data=read('glc_sessioni_v1'),current=data.sessions&&data.sessions[sid];if(!current)throw Error('La sessione non esiste più.');guard(current,expected,patch);Object.assign(current,copy(patch));write('glc_sessioni_v1',data);return copy(current);}
 function guard(current,expected,patch){for(const k of Object.keys(patch)){const a=current[k],b=expected&&expected[k];if(!equal(a,b)&&!equal(a,patch[k])&&!(a==null&&b==null))throw Error('Questo atlante è cambiato in un’altra pagina. Ricarica prima di continuare; la tua modifica non ha sovrascritto la versione più recente.');}}
 async function campaign(cid){const sb=root.__glcSB;if(!sb)throw Error('Servizio non disponibile.');const r=await sb.from('campaign_info').select('data,updated_at').eq('campaign_id',cid).maybeSingle();if(r.error)throw Error(r.error.message||'Impossibile leggere la mappa.');return r.data||null;}
 async function campaignWrite(cid,expected,patch){const sb=root.__glcSB,row=await campaign(cid),current=row&&row.data||{};guard(current,expected,patch);const data=Object.assign({},current,copy(patch));const stamp=new Date(Math.max(Date.now(),(Date.parse(row&&row.updated_at)||0)+1)).toISOString();let r;
  if(row){let q=sb.from('campaign_info').update({data,updated_at:stamp}).eq('campaign_id',cid);q=row.updated_at==null?q.is('updated_at',null):q.eq('updated_at',row.updated_at);r=await q.select('data,updated_at');if(!r.error&&(!r.data||!r.data.length))throw Error('Un’altra pagina ha aggiornato la campagna. Ricarica prima di riprovare.');}
  else r=await sb.from('campaign_info').insert({campaign_id:cid,data,updated_at:stamp}).select('data,updated_at');
  if(r.error)throw Error(r.error.message||'Impossibile salvare la mappa.');if(!r.data||!r.data.length)throw Error('Salvataggio non confermato.');return copy(r.data[0].data);
 }
 function mapSession(sid){let base=session(sid);return {data:copy(base||{}),save:async function(s){base=sessionWrite(sid,base,{map:s.islands,mapLand:s.land});return true;}};}
 function mapPrivate(cid){let base=privateAtlas(cid);return {data:copy(base),save:async function(s){base=privateWrite(cid,base,{map:s.islands,mapLand:s.land});return true;}};}
 root.GLCAtlasStore={copy,equal,privateAtlas,privateWrite,session,sessionWrite,campaign,campaignWrite,mapSession,mapPrivate};
})(window);
