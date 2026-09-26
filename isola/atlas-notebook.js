/* A place notebook, shared presentation with separate private/session/GM persistence. */
(function(){
 'use strict';
 const qs=new URLSearchParams(location.search),SID=qs.get('s')||'',CID=qs.get('c')||'',AID=qs.get('a')||'',IID=qs.get('i')||'';
 const store=window.GLCAtlasStore,$=id=>document.getElementById(id);
 let base=null,island=null,pages=[''],pi=0,readOnly=false,timer=null,dirty=false,pending=null,running=null;
 const back=CID||AID?'/campagne/?c='+encodeURIComponent(CID||AID)+'&atlas='+(AID?'personal':'gm')+'&loc='+encodeURIComponent(IID):SID?'/sessioni/?s='+encodeURIComponent(SID)+'&loc='+encodeURIComponent(IID):'/profilo/';
 $('back').href=$('nf-back').href=back;
 function status(text,kind){$('status').textContent=text;$('status').className='status '+(kind||'');}
 function show(found){$('notfound').style.display=found?'none':'block';$('content').style.display=found?'block':'none';}
 function capture(){pages[pi]=$('idossier').value;return Object.assign({},island,{nome:$('iname').value.trim(),type:$('itype').value,note:$('inote').value,pages:pages.slice(),dossier:pages[0]||''});}
 function patch(value){const map=(base.map||[]).map(i=>i.id===IID?value:i);if(!map.some(i=>i.id===IID))throw Error('Il luogo è stato eliminato: questi appunti non possono sostituirlo.');return {map};}
 function saveLocal(value){base=AID?store.privateWrite(AID,base,patch(value)):store.sessionWrite(SID,base,patch(value));island=store.copy(value);dirty=false;status('Appunti salvati','ok');return true;}
 async function flush(){clearTimeout(timer);if(readOnly||!island)return true;if(dirty)pending=capture();if(!CID){if(!pending)return true;const v=pending;try{saveLocal(v);pending=null;return true;}catch(e){status(e.message||'Salvataggio non riuscito','err');return false;}}
  if(running)return running;if(!pending)return true;
  running=(async()=>{while(pending){const value=pending;pending=null;try{base=await store.campaignWrite(CID,base,patch(value));island=store.copy(value);if(!pending)dirty=false;}catch(e){if(!pending)pending=value;status(e.message||'Salvataggio non riuscito','err');return false;}}status('Appunti salvati','ok');return true;})().finally(()=>{running=null;});return running;
 }
 function schedule(){if(readOnly)return;dirty=true;pending=capture();status('Salvataggio…');clearTimeout(timer);timer=setTimeout(flush,CID?650:200);}
 function renderPage(){ $('idossier').value=pages[pi]||'';$('pg-lab').textContent='Pagina '+(pi+1)+' di '+pages.length;$('pg-prev').disabled=pi===0;$('pg-next').disabled=pi>=pages.length-1;$('pg-del').disabled=pages.length<=1;}
 function bind(){
  $('iname').value=island.nome||'';$('itype').value=island.type||'isola';$('inote').value=island.note||'';pages=Array.isArray(island.pages)&&island.pages.length?island.pages.slice():[island.dossier||''];renderPage();
  $('pg-prev').onclick=()=>{if(pi>0){pages[pi]=$('idossier').value;pi--;renderPage();}};
  $('pg-next').onclick=()=>{if(pi<pages.length-1){pages[pi]=$('idossier').value;pi++;renderPage();}};
  $('pg-add').onclick=()=>{if(readOnly)return;pages[pi]=$('idossier').value;pages.push('');pi=pages.length-1;renderPage();schedule();$('idossier').focus();};
  $('pg-del').onclick=()=>{if(readOnly||pages.length<2)return;if($('idossier').value.trim()&&!confirm('Eliminare questa pagina del taccuino?'))return;pages.splice(pi,1);pi=Math.min(pi,pages.length-1);renderPage();schedule();};
  if(readOnly){['iname','inote','idossier'].forEach(id=>$(id).readOnly=true);$('itype').disabled=true;['pg-add','pg-del','save-notebook'].forEach(id=>$(id).hidden=true);status('Carta del GM · taccuino in sola lettura');}
  else {['iname','inote','idossier'].forEach(id=>$(id).addEventListener('input',schedule));$('itype').onchange=schedule;$('save-notebook').onclick=flush;}
  show(true);
 }
 async function boot(){
  if(!IID||!SID&&!CID&&!AID){show(false);return;}
  try{
   if(CID){let tries=0;while(!window.__glcSB&&tries++<40)await new Promise(r=>setTimeout(r,150));const sb=window.__glcSB;if(!sb)throw Error('Accesso non disponibile');const auth=await sb.auth.getUser();const me=auth.data&&auth.data.user;if(!me)throw Error('Accedi per aprire la carta del GM.');const res=await sb.from('campaigns').select('id,gm,name').eq('id',CID).maybeSingle();if(res.error||!res.data)throw Error('Campagna non disponibile');readOnly=res.data.gm!==me.id;$('ctx').textContent='Carta del GM · '+(res.data.name||'Campagna');const row=await store.campaign(CID);base=row&&row.data||{};}
   else if(AID){base=store.privateAtlas(AID);$('ctx').textContent='Atlante personale · Appunti privati';}
   else{base=store.session(SID);$('ctx').textContent='Diario di viaggio · Taccuino del luogo';}
   island=base&&(base.map||[]).find(i=>i.id===IID);if(island){island=store.copy(island);bind();}else show(false);
  }catch(e){show(false);$('notfound').prepend(document.createTextNode(e.message+' '));}
 }
 $('back').onclick=async e=>{e.preventDefault();if(await flush())location.assign(back);};
 window.addEventListener('beforeunload',e=>{if(!CID&&dirty)flush();if(dirty||pending||running){e.preventDefault();e.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)flush();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
