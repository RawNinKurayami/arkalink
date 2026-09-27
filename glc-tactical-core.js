/* Tactical scene model. The public projection is an allowlist, never a private object minus fields. */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)), uid=()=>crypto.randomUUID();
 const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
 const text=(v,max=100)=>typeof v==='string'?v.slice(0,max):'';
 const image=v=>typeof v==='string'&&v.length<=3500000&&(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)||/^asset:[a-f0-9-]{36}$/.test(v))?v:'';
 function scene(name='Nuova scena'){return{id:uid(),name,cols:30,rows:20,background:'',backgroundScale:1,backgroundX:0,backgroundY:0,gridOpacity:.25,tokens:[]};}
 function empty(){const s=scene();return {v:1,revision:0,roomId:uid(),campaignId:'',activeId:s.id,presentedId:'',scenes:[s]};}
 function token(opts={}){return {id:uid(),name:'Nuova pedina',label:opts.side==='enemy'?'Avversario':'Alleato',side:'enemy',x:1,y:1,size:1,visible:false,image:'',note:'',...opts};}
 function normalize(s){const out={id:text(s.id),name:text(s.name)||'Scena',cols:Math.round(number(s.cols,6,100,30)),rows:Math.round(number(s.rows,6,100,20)),background:image(s.background),backgroundScale:number(s.backgroundScale,.1,5,1),backgroundX:number(s.backgroundX,-100,100,0),backgroundY:number(s.backgroundY,-100,100,0),gridOpacity:number(s.gridOpacity,0,.7,.25),tokens:[]};
  out.tokens=(Array.isArray(s.tokens)?s.tokens:[]).slice(0,100).map(t=>({...t,id:text(t.id),name:text(t.name),label:text(t.label,60),side:['pc','ally','enemy'].includes(t.side)?t.side:'enemy',size:Math.round(number(t.size,1,6,1)),x:Math.round(number(t.x,0,out.cols-1,0)),y:Math.round(number(t.y,0,out.rows-1,0)),image:image(t.image),visible:t.visible===true,note:text(t.note,2000)}));
  out.tokens.forEach(t=>{t.x=Math.min(t.x,out.cols-t.size);t.y=Math.min(t.y,out.rows-t.size);});return out;
 }
 function project(s){if(!s)return null;s=normalize(s);return {v:1,name:s.name,cols:s.cols,rows:s.rows,background:s.background,backgroundScale:s.backgroundScale,backgroundX:s.backgroundX,backgroundY:s.backgroundY,gridOpacity:s.gridOpacity,tokens:s.tokens.filter(t=>t.visible).map(t=>({id:t.id,label:t.label|| (t.side==='enemy'?'Avversario':'Alleato'),side:t.side,x:t.x,y:t.y,size:t.size,image:t.image}))};}
 function cleanPublic(p){if(!p||p.v!==1)return null;return project({...p,tokens:(p.tokens||[]).map(t=>({id:t.id,label:t.label,side:t.side,x:t.x,y:t.y,size:t.size,image:t.image,visible:true}))});}
 function readSession(sid){const st=JSON.parse(localStorage.getItem('glc_sessioni_v1')||'{}');const s=st.sessions?.[sid];if(!s)throw Error('Sessione non trovata. Aprila dal Profilo.');return clone(s);}
 function saveSession(sid,expected,value){const st=JSON.parse(localStorage.getItem('glc_sessioni_v1')||'{}'),s=st.sessions?.[sid];if(!s)throw Error('La sessione non esiste più.');if(JSON.stringify(s.tactical||null)!==JSON.stringify(expected||null))throw Error('Il tavolo è cambiato in un’altra pagina. Ricarica prima di continuare: nessuna modifica è stata sovrascritta.');const next=clone(value);next.revision=(expected?.revision||0)+1;s.tactical=next;(root.GLCStore||localStorage).setItem('glc_sessioni_v1',JSON.stringify(st));return clone(next);}
 root.GLCTactical={clone,uid,scene,empty,token,normalize,project,cleanPublic,image,readSession,saveSession};
})(typeof window!=='undefined'?window:globalThis);
