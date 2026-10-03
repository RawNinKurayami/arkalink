/* Run with node --test tests/glc-auth.test.cjs. No network or real credentials. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(process.env.GLC_AUTH_SOURCE || path.join(__dirname,'..','glc-auth.js'),'utf8');

function storage(seed={}){
  const data=new Map(Object.entries(seed));
  return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]||null,get length(){return data.size;}};
}
function documentStub(){
  const doc={nodes:new Map(),readyState:'complete',listeners:{},activeElement:null};
  class Element {
    constructor(tag){this.tagName=tag.toUpperCase();this.attrs={};this.style={};this.hidden=false;this.disabled=false;this.value='';this.type='';this.open=false;this.listeners={};this.children=[];this.isConnected=true;this.className='';this.textContent='';this._html='';
      this.classList={add:c=>{this.className=[...new Set((this.className+' '+c).trim().split(/\s+/))].join(' ');},remove:c=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ');},contains:c=>this.className.split(/\s+/).includes(c)};
    }
    set id(v){this._id=v;doc.nodes.set(v,this);} get id(){return this._id;}
    set innerHTML(html){this._html=html;this.children=[];
      for(const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
        const a=m[2],id=/\bid="([^"]+)"/.exec(a);if(!id && !/data-glc-mode=/.test(a))continue;
        const e=new Element(m[1]);
        for(const attr of a.matchAll(/([\w-]+)="([^"]*)"/g))e.setAttribute(attr[1],attr[2]);
        e.hidden=/\bhidden(?:\s|$)/.test(a);e.required=/\brequired(?:\s|$)/.test(a);
        this.children.push(e);
      }
    } get innerHTML(){return this._html;}
    setAttribute(k,v){this.attrs[k]=String(v);if(k==='id')this.id=v;if(k==='class')this.className=v;if(k==='type')this.type=v;}
    getAttribute(k){return this.attrs[k]??null;} removeAttribute(k){delete this.attrs[k];}
    appendChild(e){this.children.push(e);if(e.id)doc.nodes.set(e.id,e);return e;}
    insertBefore(e){return this.appendChild(e);} replaceChildren(...items){this.children=items;}
    addEventListener(name,cb){(this.listeners[name]??=[]).push(cb);}
    querySelectorAll(q){if(q==='[data-glc-mode]')return this.children.filter(e=>e.attrs['data-glc-mode']);return this.children.filter(e=>e.tagName==='INPUT'||e.tagName==='BUTTON'&&!e.classList.contains('glc-x')&&!e.classList.contains('glc-later'));}
    checkValidity(){return this.type==='email'?/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value):true;}
    focus(){doc.activeElement=this;} showModal(){this.open=true;this.showCount=(this.showCount||0)+1;} close(){this.open=false;}
    remove(){if(this.id)doc.nodes.delete(this.id);}
  }
  doc.createElement=tag=>new Element(tag);doc.createTextNode=text=>({textContent:text});doc.getElementById=id=>doc.nodes.get(id)||null;
  doc.querySelectorAll=()=>[];
  doc.querySelector=q=>q.startsWith('#')?doc.getElementById(q.slice(1)):null;
  doc.addEventListener=(name,cb)=>{(doc.listeners[name]??=[]).push(cb);};
  doc.head=new Element('head');doc.body=new Element('body');doc.documentElement=new Element('html');doc.activeElement=doc.body;
  doc.getElementsByTagName=()=>[doc.head];doc.body.style.overflow='auto';
  return doc;
}
async function setup(options={}){
  const doc=documentStub(),local=storage(options.local),sessionStore=storage(options.sessionStore),calls=[],timers=[],handlers=[],events={};
  let session=options.session||null,clock=Date.now(),engine;
  const replies=options.replies||{},user={id:'glc-user',email:'pirate@example.test',user_metadata:{}};
  const record=(name,args)=>calls.push({name,args});
  const sb={auth:{getSession:async()=>{record('getSession');return options.sessionPromise?options.sessionPromise:{data:{session}};},getUser:async()=>{record('getUser');return replies.getUser||{data:{user:session?.user||user}};},
    onAuthStateChange:cb=>{handlers.push(cb);return {data:{subscription:{unsubscribe(){}}}};},
    signInWithPassword:async args=>{record('signInWithPassword',args);const r=await (replies.login||{data:{user,session:{user}}});if(r.data?.user){session=r.data.session||{user:r.data.user};handlers.forEach(cb=>cb('SIGNED_IN',session));}return r;},
    signUp:async args=>{record('signUp',args);return replies.register||{data:{user,session:null}};},
    signInWithOtp:async args=>{record('signInWithOtp',args);return replies.magic||{};},
    resetPasswordForEmail:async(email,args)=>{record('resetPasswordForEmail',{email,...args});return replies.forgot||{};},
    signInWithOAuth:async args=>{record('signInWithOAuth',args);return replies.google||{};},
    updateUser:async args=>{record('updateUser',args);handlers.forEach(cb=>cb('USER_UPDATED',session));return replies.update||{data:{user}};},
    resend:async args=>{record('resend',args);return replies.resend||{};},signOut:async()=>({})},
    from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:null})})})}),removeChannel(){}};
  class Sync {
    constructor(cfg){engine=this;this.cfg=cfg;this.ready=false;this.initial={};this.records={};for(const k of cfg.keys)this.initial[k]=JSON.parse(local.getItem(k)||'null');}
    async start(id){record('cloudStart',id);const result=await (options.startPromise||{reload:false});this.ready=true;return result;}state(){return {ready:this.ready,conflicts:[],pending:!!options.pending,error:null};}
    stop(){this.stopped=true;this.ready=false;}async sync(){record('cloudSync');return true;}async flush(){return true;}write(k,v){record('storeWrite',k);local.setItem(k,v);}
  }
  const url=new URL(options.url||'https://arkalink.com/grand-line-chronicles/');
  const location={origin:url.origin,pathname:url.pathname,search:url.search,hash:url.hash,reload:()=>record('reload')};
  const win={GLC:{gate:!!options.gate,profileUrl:'/profilo/'},supabase:{createClient:(...args)=>{record('createClient',args);return sb;}},GLCCloudSync:{Sync},addEventListener(name,cb){(events[name]??=[]).push(cb);},dispatchEvent(){},alert:()=>{throw Error('Unexpected alert');}};
  vm.runInNewContext(source,{window:win,document:doc,localStorage:local,sessionStorage:sessionStore,location,history:{state:null,replaceState:(...args)=>record('replaceState',args)},supabase:win.supabase,GLCCloudSync:win.GLCCloudSync,navigator:{},crypto:{randomUUID:()=> 'test-tab'},URLSearchParams,AbortController,Event,console,Date:class extends Date{static now(){return clock;}},setTimeout:(fn,ms)=>{const id=timers.length+1;timers.push({fn,ms,id});return id;},clearTimeout:id=>{const t=timers.find(t=>t.id===id);if(t)t.ms=-1;},setInterval(){}});
  const flush=async()=>{for(let i=0;i<8;i++){await new Promise(resolve=>setImmediate(resolve));const list=timers.filter(t=>t.ms===0);list.forEach(t=>{t.ms=-1;t.fn();});}};
  const el=id=>doc.getElementById(id),click=async id=>{await el(id).onclick?.call(el(id));await flush();};
  const mode=async name=>{const btn=el('glc-auth').children.find(e=>e.getAttribute('data-glc-mode')===name);assert.ok(btn,name);await btn.onclick.call(btn);await flush();};
  const submit=async()=>{for(const cb of el('glc-form').listeners.submit)cb({preventDefault(){}});await flush();};
  const fill=(email='pirate@example.test',password='Long.test.password',confirmation=password)=>{el('glc-email').value=email;el('glc-password').value=password;el('glc-confirm').value=confirmation;};
  await flush();return {doc,el,click,mode,submit,fill,calls,local,sessionStore,win,flush,engine,events,advance:ms=>{clock+=ms;},emit:(event,value)=>{session=value;handlers.forEach(cb=>cb(event,value));}};
}
const named=(h,name)=>h.calls.filter(c=>c.name===name);
const modeOf=h=>h.el('glc-auth').getAttribute('data-mode');
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};

test('Existing sessions never open the login, including refresh and background synchronization',async()=>{
 const h=await setup({gate:true,session:{user:{id:'glc-user'}}});
 assert.equal(h.el('glc-auth').showCount||0,0);assert.equal(h.win.GLCSync.pronto(),true);
 for(const event of ['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED']){h.emit(event,{user:{id:'glc-user'}});await h.flush();}
 await h.win.GLCSync.adesso();
 assert.equal(h.el('glc-auth').showCount||0,0);assert.equal(named(h,'cloudStart').length,1);
 h.emit('TOKEN_REFRESHED',null);await h.flush();assert.equal(h.el('glc-auth').showCount||0,0);
 h.emit('SIGNED_OUT',null);await h.flush();assert.equal(h.el('glc-auth').open,true);
});
test('Slow session lookup shows a neutral wait and opens login only when signed out is confirmed',async()=>{
 const lookup=deferred(),h=await setup({gate:true,sessionPromise:lookup.promise});
 assert.equal(h.el('glc-auth').open,false);assert.equal(h.el('glc-loading-status').hidden,false);
 let started=false;h.win.GLCSync.whenReady().then(()=>{started=true;});await h.flush();assert.equal(started,false);
 lookup.resolve({data:{session:null}});await h.flush();
 assert.equal(h.el('glc-auth').open,true);assert.equal(h.el('glc-loading-status').hidden,true);assert.equal(started,false);
 await h.click('glc-later');assert.equal(started,true);assert.equal(h.win.GLCSync.pronto(),true);
});
test('Page initialization waits for cloud alignment, so its initial saves cannot race the download',async()=>{
 const start=deferred(),h=await setup({gate:true,session:{user:{id:'glc-user'}},startPromise:start.promise,local:{glc_pirata_v4:'{"version":"old"}'}});
 h.win.GLCSync.whenReady().then(()=>{const value=JSON.parse(h.local.getItem('glc_pirata_v4'));value.normalized=true;h.win.GLCStore.setItem('glc_pirata_v4',JSON.stringify(value));});
 await h.flush();assert.equal(named(h,'storeWrite').length,0);assert.equal(h.el('glc-auth').showCount||0,0);assert.equal(h.el('glc-loading-status').hidden,false);
 h.local.setItem('glc_pirata_v4','{"version":"latest"}');start.resolve({reload:false});await h.flush();
 assert.deepEqual(JSON.parse(h.local.getItem('glc_pirata_v4')),{version:'latest',normalized:true});assert.equal(h.el('glc-loading-status').hidden,true);
});
test('A protected write during alignment still fails safely, without a browser alert or silent success',async()=>{
 const start=deferred(),h=await setup({gate:true,session:{user:{id:'glc-user'}},startPromise:start.promise,local:{glc_pirata_v4:'{"keep":true}'}});
 assert.throws(()=>h.win.GLCStore.setItem('glc_pirata_v4','{"keep":false}'),/Attendi il completamento/);
 assert.equal(h.local.getItem('glc_pirata_v4'),'{"keep":true}');assert.equal(named(h,'storeWrite').length,0);
 assert.equal(h.el('glc-sync-notice').getAttribute('role'),'alert');assert.match(h.el('glc-sync-notice').children[0].textContent,/Modifica non salvata/);
 start.resolve({reload:false});await h.flush();h.win.GLCStore.setItem('glc_pirata_v4','{"keep":true,"new":true}');
 assert.equal(h.el('glc-sync-notice').hidden,true);
});
test('A required cloud reload keeps initialization waiting and bypasses the leave-page prompt',async()=>{
 const h=await setup({gate:true,session:{user:{id:'glc-user'}},pending:true});
 let prevented=false;const leaving={preventDefault(){prevented=true;}};
 h.events.beforeunload[0](leaving);assert.equal(prevented,true);
 h.engine.cfg.onApply();prevented=false;h.events.beforeunload[0](leaving);
 assert.equal(prevented,false);assert.equal(named(h,'reload').length,1);assert.equal(h.el('glc-auth').showCount||0,0);
 const boot=await setup({gate:true,session:{user:{id:'glc-user'}},startPromise:Promise.resolve({reload:true})});
 let initialized=false;boot.win.GLCSync.whenReady().then(()=>{initialized=true;});await boot.flush();
 assert.equal(initialized,false);assert.equal(named(boot,'reload').length,1);assert.equal(boot.el('glc-auth').showCount||0,0);
});
test('Signing out during a slow initial sync cannot dismiss the login when the old request finishes',async()=>{
 const start=deferred(),h=await setup({gate:true,session:{user:{id:'glc-user'}},startPromise:start.promise});
 h.emit('SIGNED_OUT',null);await h.flush();start.resolve({reload:false});await h.flush();
 assert.equal(h.el('glc-auth').open,true);assert.equal(h.win.GLCSync.collegato(),false);
});
test('A stale session lookup cannot reopen login after a newer sign-in event',async()=>{
 const lookup=deferred(),h=await setup({gate:true,sessionPromise:lookup.promise});
 h.emit('SIGNED_IN',{user:{id:'glc-user'}});await h.flush();lookup.resolve({data:{session:null}});await h.flush();
 assert.equal(h.el('glc-auth').showCount||0,0);assert.equal(h.win.GLCSync.collegato(),true);assert.equal(named(h,'cloudStart').length,1);
});
test('A stale session lookup cannot sign the user back in after a newer sign-out',async()=>{
 const lookup=deferred(),h=await setup({gate:true,sessionPromise:lookup.promise});
 h.emit('SIGNED_OUT',null);await h.flush();lookup.resolve({data:{session:{user:{id:'glc-user'}}}});await h.flush();
 assert.equal(h.el('glc-auth').open,true);assert.equal(h.win.GLCSync.collegato(),false);assert.equal(named(h,'cloudStart').length,0);
});

test('Shared client and protected keys stay on GLC; guest mode remains available',async()=>{
 const h=await setup({gate:true,local:{glc_pirata_v4:'{"crew":"keep"}'}});
 assert.equal(h.el('glc-auth').tagName,'DIALOG');assert.equal(h.el('glc-auth').open,true);assert.equal(named(h,'cloudStart').length,0);
 assert.match(named(h,'createClient')[0].args[0],/anzxglqwmqbsthpqnxhc/);assert.equal(named(h,'createClient')[0].args.length,2);
 assert.equal(h.engine.cfg.keys.length,10);assert.equal(h.local.getItem('glc_pirata_v4'),'{"crew":"keep"}');
 await h.click('glc-later');assert.equal(h.el('glc-auth').open,false);assert.equal(h.doc.body.style.overflow,'auto');
});
test('Password access starts sync once and preserves existing character data',async()=>{
 const h=await setup({gate:true,local:{glc_pirata_v4:'{"crew":"keep"}'}});h.fill(' pirate@example.test ','old-pass');await h.submit();
 assert.equal(named(h,'signInWithPassword').length,1);assert.equal(named(h,'signInWithPassword')[0].args.email,'pirate@example.test');
 assert.equal(named(h,'cloudStart').length,1);assert.equal(h.local.getItem('glc_pirata_v4'),'{"crew":"keep"}');assert.equal(h.el('glc-password').value,'');assert.equal(h.el('glc-auth').open,false);
 h.emit('TOKEN_REFRESHED',{user:{id:'glc-user'}});await h.flush();assert.equal(named(h,'cloudStart').length,1);
});
test('Incorrect credentials give useful errors without exposing provider responses',async()=>{
 const h=await setup({gate:true,replies:{login:{error:{code:'invalid_credentials',message:'Secret diagnostic'}}}});h.fill();await h.submit();
 assert.match(h.el('glc-msg').textContent,/Email o password non corrette/);assert.doesNotMatch(h.el('glc-msg').textContent,/Secret diagnostic/);assert.equal(named(h,'cloudStart').length,0);assert.equal(h.el('glc-send').disabled,false);
});
test('Registration waits for confirmation, clears passwords and can return to sign in',async()=>{
 const h=await setup({gate:true});await h.mode('register');h.fill();await h.submit();
 assert.equal(named(h,'signUp').length,1);assert.equal(named(h,'signUp')[0].args.options.emailRedirectTo,'https://arkalink.com/grand-line-chronicles/');
 assert.equal(modeOf(h),'confirmation');assert.equal(h.el('glc-confirm').value,'');assert.equal(named(h,'cloudStart').length,0);
 h.advance(61000);await h.click('glc-resend');assert.equal(named(h,'resend')[0].args.type,'signup');
 await h.submit();assert.equal(modeOf(h),'login');
});
test('New passwords must match and contain at least twelve characters',async()=>{
 const h=await setup({gate:true});await h.mode('register');h.fill(undefined,'short');await h.submit();assert.equal(named(h,'signUp').length,0);
 h.fill(undefined,'Long.test.password','Different.password');await h.submit();assert.equal(named(h,'signUp').length,0);assert.match(h.el('glc-msg').textContent,/non coincidono/);
});
test('Reset requests avoid account enumeration and repeated email requests',async()=>{
 const h=await setup({gate:true});await h.mode('forgot');h.fill();await h.submit();await h.submit();
 assert.equal(named(h,'resetPasswordForEmail').length,1);assert.equal(named(h,'resetPasswordForEmail')[0].args.redirectTo,'https://arkalink.com/grand-line-chronicles/');
 assert.match(h.el('glc-msg').textContent,/Attendi un minuto/);h.advance(61000);await h.submit();assert.match(h.el('glc-msg').textContent,/Se esiste un account/);
});
test('Magic links and Google still use the existing callback destination',async()=>{
 const h=await setup({gate:true});await h.mode('magic');h.fill();await h.submit();assert.equal(named(h,'signInWithOtp')[0].args.options.emailRedirectTo,'https://arkalink.com/grand-line-chronicles/');
 await h.click('glc-back');await h.click('glc-google');assert.equal(named(h,'signInWithOAuth')[0].args.provider,'google');assert.equal(named(h,'signInWithOAuth')[0].args.options.redirectTo,'https://arkalink.com/grand-line-chronicles/');
});
test('Recovery verifies the session and finishes password entry before cloud reloads',async()=>{
 const h=await setup({url:'https://arkalink.com/grand-line-chronicles/#access_token=valid-test-token&type=recovery',session:{access_token:'valid-test-token',user:{id:'glc-user'}}});
 assert.equal(modeOf(h),'recovery');assert.equal(named(h,'cloudStart').length,0);assert.equal(named(h,'getUser').length,1);
 assert.doesNotMatch(h.sessionStore.getItem('glc_auth_recovery'),/token|password/);
 h.fill();await h.submit();assert.equal(named(h,'updateUser').length,1);assert.equal(modeOf(h),'complete');assert.equal(named(h,'cloudStart').length,0);assert.equal(h.el('glc-auth').open,true);assert.equal(h.sessionStore.getItem('glc_auth_recovery'),null);
 await h.submit();assert.equal(named(h,'cloudStart').length,1);assert.equal(h.el('glc-auth').open,false);
});
test('A recovery event arriving after initialization opens recovery without starting sync',async()=>{
 const h=await setup();h.emit('PASSWORD_RECOVERY',{user:{id:'glc-user'}});await h.flush();assert.equal(modeOf(h),'recovery');assert.equal(h.el('glc-auth').open,true);assert.equal(named(h,'cloudStart').length,0);
});
test('An expired reset link cannot silently reuse an existing cached sign-in',async()=>{
 const h=await setup({url:'https://arkalink.com/grand-line-chronicles/#access_token=expired-test-token&type=recovery',session:{access_token:'cached-test-token',user:{id:'glc-user'}}});
 assert.equal(modeOf(h),'forgot');assert.match(h.el('glc-msg').textContent,/scaduto/);assert.equal(named(h,'getUser').length,0);assert.equal(named(h,'cloudStart').length,0);
 h.fill();await h.submit();assert.equal(named(h,'updateUser').length,0);assert.equal(named(h,'resetPasswordForEmail').length,1);
});
test('A rejected recovery session never exposes the new-password form',async()=>{
 const h=await setup({url:'https://arkalink.com/grand-line-chronicles/#access_token=valid-test-token&type=recovery',session:{access_token:'valid-test-token',user:{id:'glc-user'}},replies:{getUser:{error:{code:'session_not_found'}}}});
 assert.equal(modeOf(h),'forgot');assert.equal(h.sessionStore.getItem('glc_auth_recovery'),null);assert.equal(named(h,'cloudStart').length,0);
});
test('Refresh resumes recovery only for the same user and within its short lifetime',async()=>{
 const marker=JSON.stringify({user:'glc-user',until:Date.now()+600000});
 const valid=await setup({session:{user:{id:'glc-user'}},sessionStore:{glc_auth_recovery:marker}});assert.equal(modeOf(valid),'recovery');assert.equal(named(valid,'cloudStart').length,0);
 const other=await setup({session:{user:{id:'another-user'}},sessionStore:{glc_auth_recovery:marker}});assert.equal(modeOf(other),'forgot');assert.equal(named(other,'getUser').length,0);
 const expired=await setup({session:{user:{id:'glc-user'}},sessionStore:{glc_auth_recovery:JSON.stringify({user:'glc-user',until:Date.now()-1000})}});assert.equal(modeOf(expired),'login');assert.equal(named(expired,'cloudStart').length,1);
});
test('Double submit and changing mode during a request cannot duplicate login',async()=>{
 let resolve;const pending=new Promise(r=>{resolve=r;});const h=await setup({gate:true,replies:{login:pending}});h.fill();await h.submit();await h.submit();await h.mode('register');
 assert.equal(modeOf(h),'login');assert.equal(named(h,'signInWithPassword').length,1);assert.equal(h.el('glc-send').disabled,true);
 resolve({data:{user:{id:'glc-user'}}});await h.flush();assert.equal(named(h,'cloudStart').length,1);
});
test('Escape clears entered passwords and restores the page scroll state',async()=>{
 const h=await setup({gate:true});h.fill();let prevented=false;h.el('glc-auth').listeners.cancel.forEach(cb=>cb({preventDefault(){prevented=true;}}));
 assert.equal(prevented,true);assert.equal(h.el('glc-auth').open,false);assert.equal(h.el('glc-password').value,'');assert.equal(h.doc.body.style.overflow,'auto');
});
test('Callback errors stay visible until dismissed and never start password update',async()=>{
 const h=await setup({url:'https://arkalink.com/grand-line-chronicles/#error=access_denied&error_code=otp_expired&error_description=Secret',session:{user:{id:'glc-user'}}});
 assert.equal(modeOf(h),'forgot');assert.equal(h.el('glc-auth').open,true);assert.equal(named(h,'cloudStart').length,0);assert.doesNotMatch(h.el('glc-msg').textContent,/Secret/);
 await h.click('glc-x');assert.equal(named(h,'cloudStart').length,1);assert.equal(named(h,'updateUser').length,0);
});
test('Server email errors and offline failures are distinguished from credentials errors',async()=>{
 for(const error of [{code:'email_address_not_authorized',status:400},{status:500},{name:'AuthRetryableFetchError'}]){
   const h=await setup({gate:true,replies:{forgot:{error}}});await h.mode('forgot');h.fill();await h.submit();
   assert.equal(h.el('glc-send').disabled,false);assert.match(h.el('glc-msg').textContent,error.name?/connessione/:/servizio/);
 }
});

test('Account avatars cannot introduce HTML handlers into the login controls',async()=>{
 const avatar='image.png" onerror="malicious-handler';
 const h=await setup({session:{user:{id:'glc-user'}},local:{glc_profile_v1:JSON.stringify({username:'Pirate',avatar})}});
 assert.match(h.el('glc-bar').innerHTML,/image.png&amp;quot;|image.png&quot;/);
 assert.doesNotMatch(h.el('glc-bar').innerHTML,/image.png" onerror=/);
});
