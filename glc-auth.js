/* Grand Line Chronicles — modulo di accesso condiviso
   Configurazione per pagina (prima di includere questo file):
     window.GLC = { saveKey: "glc_pirata_v4", gate: true }   // strumenti (login obbligatorio + sync)
     window.GLC = { gate: false }                            // home (login facoltativo, solo pulsante)
   saveKey può essere una stringa o un array di stringhe (più salvataggi). */
(function(){
  "use strict";
  var CFG = window.GLC || {};
  var SUPABASE_URL  = "https://anzxglqwmqbsthpqnxhc.supabase.co";
  var SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenhnbHF3bXFic3RocHFueGhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDU2MDAsImV4cCI6MjA5NzcyMTYwMH0.aCPTlWmNapvU17ZwedkkhNztMG4PuskpZx3D9EfunIU";
  var SAVE_KEYS = CFG.saveKey ? (Array.isArray(CFG.saveKey) ? CFG.saveKey.slice() : [CFG.saveKey]) : [];
  var GATE = !!CFG.gate;
  var PROFILE_URL = CFG.profileUrl || "";
  var REDIRECT = location.origin + location.pathname;

  if(!window.supabase){ console.error("[GLC] supabase-js non caricato"); return; }
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  window.__glcSB = sb;

  var currentUser = null, canale = null, syncTimer = null;
  var startup = null, loggingOut = false, reloading = false, authResolved = false;
  var ALL_KEYS = ["glc_pirata_v4","glc_media_v1","glc_profile_v1","glc_nave_v1","glc_sessioni_v1","glc_bestiario_v1","glc_scontro_v1","glc_officina_v1","glc_cambusa_v1","glc_campagne_v1"];
  // Every page protects the complete account, including drafts from another tool.
  SAVE_KEYS = ALL_KEYS;

  /* ---------------- stile ---------------- */
  injectCSS();
  if(GATE) document.documentElement.classList.add("glc-loading");

  function injectCSS(){
    if(document.getElementById("glc-auth-css")) return;
    var st = document.createElement("style"); st.id = "glc-auth-css";
    st.textContent =
    "html.glc-loading > body{visibility:hidden}html.glc-loading #glc-auth{visibility:visible}"+
    "#glc-auth{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:radial-gradient(120% 90% at 50% -10%,#14323d 0%,#0a1920 55%,#060f14 100%);font-family:'Cormorant Garamond',Georgia,serif;transition:opacity .35s ease}"+
    "#glc-auth.glc-hidden{opacity:0;pointer-events:none}"+
    "#glc-auth .glc-card{position:relative;width:min(420px,100%);background:linear-gradient(168deg,#ecdcb6,#e3d0a4);color:#34271a;border:1px solid #cdb487;border-radius:8px;padding:30px 28px 26px;box-shadow:0 24px 60px rgba(0,0,0,.5);text-align:center}"+
    "#glc-auth .glc-x{position:absolute;top:10px;right:12px;border:none;background:transparent;font-size:24px;line-height:1;color:#8a6a3a;cursor:pointer}"+
    "#glc-auth .glc-mark{width:50px;height:50px;color:#9a241a;margin-bottom:2px}"+
    "#glc-auth .glc-k{font-family:'Marcellus SC',serif;letter-spacing:.24em;text-transform:uppercase;font-size:11px;color:#9a7a2a}"+
    "#glc-auth h2.glc-h{font-family:'Cinzel Decorative',serif;font-weight:700;font-size:1.5rem;color:#2a1f12;margin:4px 0}"+
    "#glc-auth .glc-sub{font-size:1.02rem;color:#5e4c34;margin:6px 0 18px}"+
    "#glc-auth .glc-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;border:1px solid #b9a06f;border-radius:5px;background:#fffaf0;color:#2a1f12;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:1.05rem;cursor:pointer;transition:background .15s}"+
    "#glc-auth .glc-google:hover{background:#fff}"+
    "#glc-auth .glc-or{display:flex;align-items:center;gap:10px;margin:16px 0 12px;color:#8a6a3a;font-size:.9rem}"+
    "#glc-auth .glc-or::before,#glc-auth .glc-or::after{content:'';flex:1;height:1px;background:#cbb488}"+
    "#glc-auth input{width:100%;padding:12px 14px;border:1px solid #b9a06f;border-radius:5px;background:#fffaf0;font-family:inherit;font-size:1.05rem;color:#2a1f12;margin-bottom:12px}"+
    "#glc-auth input:focus{outline:2px solid #c9a24a;outline-offset:1px}"+
    "#glc-auth .glc-go{width:100%;padding:13px;border:none;border-radius:5px;background:linear-gradient(180deg,#ecca77,#c9a24a);color:#23170a;font-family:'Marcellus SC',serif;letter-spacing:.1em;text-transform:uppercase;font-size:13px;cursor:pointer;transition:transform .15s}"+
    "#glc-auth .glc-go:hover{transform:translateY(-1px)}#glc-auth .glc-go:disabled{opacity:.6;cursor:default;transform:none}"+
    "#glc-auth .glc-msg{min-height:20px;margin-top:12px;font-size:.98rem;color:#7a1410;line-height:1.35}#glc-auth .glc-msg.ok{color:#2f6d4a}"+
    "#glc-auth .glc-later{display:inline-block;margin-top:15px;font-size:.92rem;color:#8a6a3a;text-decoration:underline;cursor:pointer}"+
    /* controllo nello slot (barra in alto della home) */
    ".glc-slot{display:inline-flex;align-items:center;gap:9px}"+
    ".glc-slot .glc-accedi,.glc-bar-out .glc-accedi{font-family:'Marcellus SC',serif;letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#23170a;background:linear-gradient(180deg,#ecca77,#c9a24a);border:none;border-radius:999px;padding:9px 18px;cursor:pointer}"+
    ".glc-slot .glc-who,.glc-bar-in .glc-who{font-family:'Cormorant Garamond',serif;font-size:.96rem;color:#a8c6bd}.glc-slot .glc-who b,.glc-bar-in .glc-who b{color:#ecca77;font-weight:600}"+
    ".glc-slot .glc-prof,.glc-bar-in .glc-prof{font-family:'Marcellus SC',serif;letter-spacing:.1em;text-transform:uppercase;font-size:10px;color:#ecca77;text-decoration:none;border:1px solid rgba(201,162,74,.55);border-radius:999px;padding:6px 12px}.glc-slot .glc-prof:hover,.glc-bar-in .glc-prof:hover{background:rgba(201,162,74,.15)}"+
    ".glc-slot .glc-out,.glc-bar-in .glc-out{border:1px solid rgba(201,162,74,.55);background:transparent;color:#ecca77;border-radius:999px;padding:6px 13px;font-family:'Marcellus SC',serif;letter-spacing:.1em;text-transform:uppercase;font-size:10px;cursor:pointer}"+
    ".glc-slot .glc-who,.glc-bar-in .glc-who{display:inline-flex;align-items:center;gap:8px;min-width:0}"+
    /* il nome non deve mai allargare la pagina: si tronca, e sul telefono resta
       solo l'avatar (il nome completo è nel tooltip) */
    ".glc-slot{min-width:0;max-width:100%}.glc-slot .glc-name,.glc-bar-in .glc-name{display:inline-block;max-width:16em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle}"+
    "@media(max-width:640px){.glc-slot .glc-name,.glc-bar-in .glc-name{display:none}.glc-slot,.glc-bar-in{gap:6px}"+
    ".glc-slot .glc-prof,.glc-bar-in .glc-prof,.glc-slot .glc-out,.glc-bar-in .glc-out{padding:5px 9px}#glc-bar{right:8px;top:8px;gap:6px;padding:5px 6px 5px 8px}}"+
    ".glc-ava{width:26px;height:26px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%,#fff8ec,#efdcb4);border:1.5px solid rgba(201,162,74,.7);flex:none}"+
    ".glc-ava img{width:100%;height:100%;object-fit:cover;display:block}"+
    ".glc-ava svg{width:15px;height:15px;color:#9a7a3e}"+
    /* barra fissa (strumenti, quando loggato) */
    "#glc-bar{position:fixed;top:10px;right:12px;z-index:9000;display:flex;align-items:center;gap:10px;background:rgba(10,25,32,.85);border:1px solid rgba(201,162,74,.4);border-radius:999px;padding:6px 8px 6px 14px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}"+
    "#glc-flash{position:fixed;bottom:16px;left:50%;transform:translateX(-50%) translateY(20px);z-index:9500;background:rgba(10,25,32,.93);color:#ecdcb6;border:1px solid rgba(201,162,74,.45);border-radius:6px;padding:9px 16px;font-family:'Cormorant Garamond',serif;font-size:.96rem;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}"+
    "#glc-flash.show{opacity:1;transform:translateX(-50%) translateY(0)}#glc-flash.err{border-color:#9a241a;color:#f0c9b0}"+
    "@media(prefers-reduced-motion:reduce){#glc-auth,#glc-flash{transition:none}}";
    (document.head||document.documentElement).appendChild(st);
  }

  /* ---------------- versioned cloud synchronization ---------------- */
  var _setItem = localStorage.setItem.bind(localStorage);
  var tabId = sessionStorage.getItem("glc_sync_tab");
  if(!tabId){ tabId = crypto.randomUUID(); sessionStorage.setItem("glc_sync_tab",tabId); }
  var engine = window.GLCCloudSync ? new GLCCloudSync.Sync({
    keys:SAVE_KEYS, tab:tabId,
    storage:{getItem:function(k){return localStorage.getItem(k);},setItem:_setItem},
    rpc:async function(name,args){
      var controller=new AbortController(),timer;
      var request=sb.rpc(name,args);if(request.abortSignal)request=request.abortSignal(controller.signal);
      try{return await Promise.race([request,new Promise(function(_,reject){timer=setTimeout(function(){controller.abort();reject(Error("Cloud non raggiungibile: la bozza resta sul dispositivo"));},12000);})]);}
      finally{clearTimeout(timer);}
    },
    schedule:function(run){clearTimeout(syncTimer);syncTimer=setTimeout(run,500);},
    onStatus:function(){renderSyncNotice();window.dispatchEvent(new Event("glc:sync-status"));},
    onApply:function(){reloading=true;document.documentElement.classList.add("glc-loading");location.reload();}
  }) : null;
  window.GLCStore = {setItem:function(key,value){
    try{
      if(!engine) throw Error("Salvataggio protetto non caricato: ricarica la pagina prima di modificare");
      var owner=localStorage.getItem("glc_utente");
      var lock=JSON.parse(localStorage.getItem("glc_logout_lock")||"null");
      if(lock&&lock.user===owner&&lock.until>Date.now())throw Error("Uscita dall’account in corso: attendi");
      if(authResolved && owner && (!currentUser || currentUser.id!==owner)) throw Error("Accedi di nuovo per modificare i tuoi dati");
      if(currentUser && !engine.ready) throw Error("Attendi il completamento della sincronizzazione");
      engine.write(key,value);
      if(authResolved&&!currentUser&&!owner&&SAVE_KEYS.indexOf(key)>=0)engine.initial[key]=JSON.parse(value);
    }catch(e){
      var message=e.name==="QuotaExceededError"?"Spazio sul dispositivo esaurito. Il salvataggio precedente e le immagini sono conservati; esporta la scheda prima di chiudere.":e.message;
      window.alert("Modifica non salvata: "+message);throw e;
    }
  }};
  function syncMessage(){
    if(!currentUser)return "Accedi per sincronizzare i tuoi dati";
    if(!engine)return "Salvataggio protetto non disponibile: ricarica la pagina";
    var st=engine.state();
    if(!st.ready)return "Controllo dei salvataggi in corso…";
    if(st.conflicts.length)return "Ci sono copie da confrontare nel Profilo. Nessuna è stata sovrascritta.";
    if(st.error)return "Sincronizzazione in attesa · "+st.error;
    if(st.pending)return "Modifiche salvate sul dispositivo · invio al cloud in corso…";
    return "Salvataggi allineati al cloud";
  }
  function renderSyncNotice(){
    if(!document.body)return;
    var st=engine&&engine.state(), show=currentUser&&(!st||st.error||st.pending||st.conflicts.length);
    var box=document.getElementById("glc-sync-notice");
    if(!box){box=document.createElement("div");box.id="glc-sync-notice";box.setAttribute("role","status");box.style.cssText="position:fixed;bottom:14px;left:14px;right:14px;z-index:9900;margin:auto;max-width:740px;padding:12px 18px;background:#10171c;color:#f7ead2;border:1px solid #b59760;border-radius:8px;font:14px/1.4 sans-serif;box-shadow:0 8px 30px #0008";document.body.appendChild(box);}
    box.hidden=!show;box.replaceChildren(document.createTextNode(syncMessage()+" "));
    if(show){var link=document.createElement("a");link.href="/profilo/#sync-panel";link.textContent="Apri il Profilo";link.style.color="#ffd391";box.appendChild(link);}
  }
  function ascolta(){
    document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible"&&engine)engine.sync();});
    window.addEventListener("online",function(){if(engine)engine.sync();});
    setInterval(function(){if(document.visibilityState!=="hidden"&&engine)engine.sync();},12000);
    window.addEventListener("beforeunload",function(e){if(!loggingOut&&!reloading&&currentUser&&engine&&(engine.state().pending||engine.state().conflicts.length)){e.preventDefault();e.returnValue="";}});
    window.addEventListener("storage",function(e){
      if(e.key==="glc_utente"&&currentUser&&e.newValue!==currentUser.id){engine.stop();document.documentElement.classList.add("glc-loading");location.reload();}
      else if(SAVE_KEYS.indexOf(e.key)>=0&&engine&&engine.ready)engine.sync();
    });
    try{if(sb.channel)canale=sb.channel("glc-saves-"+currentUser.id)
      .on("postgres_changes",{event:"*",schema:"public",table:"saves",filter:"user_id=eq."+currentUser.id},function(){if(engine)engine.sync();}).subscribe();}catch(e){}
  }

  /* ---------------- overlay di accesso ---------------- */
  function buildOverlay(){
    if(document.getElementById("glc-auth")) return;
    var o = document.createElement("div"); o.id = "glc-auth"; o.className = "glc-hidden";
    o.innerHTML =
      '<div class="glc-card">'+
        '<button class="glc-x" id="glc-x" aria-label="Chiudi">\u00d7</button>'+
        '<svg class="glc-mark" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2"><circle cx="24" cy="24" r="21"/><path d="M24 6 L27 24 L24 42 L21 24 Z" fill="currentColor" stroke="none"/><path d="M6 24h36" opacity=".4"/></svg>'+
        '<div class="glc-k">Grand Line Chronicles</div>'+
        '<h2 class="glc-h">Il tuo registro</h2>'+
        '<p class="glc-sub">Accedi per ritrovare la tua ciurma su ogni dispositivo.</p>'+
        '<button class="glc-google" id="glc-google">'+
          '<svg viewBox="0 0 18 18" width="18" height="18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/></svg>'+
          'Continua con Google</button>'+
        '<div class="glc-or">oppure con email</div>'+
        '<input id="glc-email" type="email" placeholder="la-tua@email.com" autocomplete="email">'+
        '<button class="glc-go" id="glc-send">Invia il link d\'accesso</button>'+
        '<div class="glc-msg" id="glc-msg"></div>'+
        (GATE ? '<span class="glc-later" id="glc-later">Entra pi\u00f9 tardi \u00b7 usa solo su questo dispositivo</span>' : '')+
      '</div>';
    document.body.appendChild(o);
    document.getElementById("glc-x").onclick = closeOverlay;
    document.getElementById("glc-google").onclick = googleLogin;
    document.getElementById("glc-send").onclick = sendLink;
    var later = document.getElementById("glc-later"); if(later) later.onclick = closeOverlay;
    document.getElementById("glc-email").addEventListener("keydown", function(e){ if(e.key === "Enter") sendLink(); });
  }
  function openOverlay(){ buildOverlay(); var o = document.getElementById("glc-auth"); if(o) o.classList.remove("glc-hidden"); if(GATE) document.documentElement.classList.add("glc-loading"); }
  function closeOverlay(){ var o = document.getElementById("glc-auth"); if(o) o.classList.add("glc-hidden"); document.documentElement.classList.remove("glc-loading"); }

  async function googleLogin(){
    var msg = document.getElementById("glc-msg"); if(msg){ msg.className = "glc-msg"; msg.textContent = "Apertura di Google\u2026"; }
    try{
      var r = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: REDIRECT } });
      if(r.error) throw r.error;
    }catch(e){ if(msg){ msg.className = "glc-msg"; msg.textContent = "Google non disponibile: " + (e.message || e); } }
  }
  async function sendLink(){
    var email = (document.getElementById("glc-email").value || "").trim();
    var msg = document.getElementById("glc-msg"); msg.className = "glc-msg";
    if(!/.+@.+\..+/.test(email)){ msg.textContent = "Inserisci un indirizzo email valido."; return; }
    var btn = document.getElementById("glc-send"); btn.disabled = true; btn.textContent = "Invio in corso\u2026";
    try{
      var r = await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: REDIRECT } });
      if(r.error) throw r.error;
      msg.className = "glc-msg ok"; msg.textContent = "Link inviato a " + email + ". Aprilo per entrare (controlla lo spam).";
      btn.textContent = "Link inviato \u2713";
    }catch(e){ msg.textContent = "Non riuscito: " + (e.message || e); btn.disabled = false; btn.textContent = "Invia il link d'accesso"; }
  }

  /* ---------------- avatar + username nella barra ---------------- */
  function avatarHTML(av){
    if(av){ return '<span class="glc-ava"><img src="' + av + '" alt=""></span>'; }
    return '<span class="glc-ava"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5z"/></svg></span>';
  }
  async function enrichControl(){
    if(!currentUser) return;
    var uname = "", avatar = "";
    try{ var lp = JSON.parse(localStorage.getItem("glc_profile_v1") || "{}") || {}; avatar = lp.avatar || ""; uname = (lp.username || "").trim(); }catch(e){}
    try{ var pr = await sb.from("profiles").select("username").eq("user_id", currentUser.id).maybeSingle(); if(pr && pr.data && pr.data.username) uname = pr.data.username; }catch(e){}
    if(!avatar || !uname){
      try{
        var sv = await sb.from("saves").select("data").eq("user_id", currentUser.id).eq("key", "glc_profile_v1").maybeSingle();
        if(sv && sv.data && sv.data.data){
          if(!avatar && sv.data.data.avatar) avatar = sv.data.data.avatar;
          if(!uname && sv.data.data.username) uname = (sv.data.data.username || "").trim();
        }
      }catch(e){}
    }
    var nm = document.querySelector("#glc-login-slot .glc-name") || document.querySelector("#glc-bar .glc-name");
    if(nm){ nm.textContent = uname ? ("@" + uname) : (currentUser.email || "\u2014"); if(nm.parentNode) nm.parentNode.title = nm.textContent; }
    var av = document.querySelector("#glc-login-slot .glc-ava") || document.querySelector("#glc-bar .glc-ava");
    if(av && avatar){ av.innerHTML = '<img src="' + avatar + '" alt="">'; }
  }

  /* ---------------- controllo accesso (slot home o barra fissa) ---------------- */
  function renderControl(){
    var slot = document.getElementById("glc-login-slot");
    var host = slot || document.getElementById("glc-bar");
    if(currentUser){
      if(!host){ host = document.createElement("div"); host.id = "glc-bar"; document.body.appendChild(host); }
      host.className = slot ? "glc-slot in" : "glc-bar-in";
      var prof0 = {}; try{ prof0 = JSON.parse(localStorage.getItem("glc_profile_v1") || "{}") || {}; }catch(e){}
      var uname0 = (prof0.username || "").trim();
      var nameStr = uname0 ? ("@" + uname0) : (currentUser.email || "\u2014");
      host.innerHTML = '<span class="glc-who" title="' + escapeHtml(nameStr) + '">' + avatarHTML(prof0.avatar) + '<b class="glc-name">' + escapeHtml(nameStr) + '</b></span>' + (PROFILE_URL ? '<a class="glc-prof" href="' + PROFILE_URL + '">Profilo</a>' : '') + '<button class="glc-out" id="glc-out">Esci</button>';
      document.getElementById("glc-out").onclick = logout;
      enrichControl();
    } else {
      if(!slot){ var b = document.getElementById("glc-bar"); if(b) b.innerHTML = ""; return; } // strumenti: niente barra (copre l'overlay)
      host.className = "glc-slot out";
      host.innerHTML = '<button class="glc-accedi" id="glc-accedi">Accedi</button>';
      document.getElementById("glc-accedi").onclick = openOverlay;
    }
  }
  /* Uscendo non deve restare niente di personale su questo dispositivo: non
     bastano le chiavi della pagina, perché ogni pagina ne sincronizza solo
     alcune e il resto (ritratto, navi, sessioni) rimarrebbe a chi entra dopo.
     Si tengono solo le preferenze dello strumento, che non dicono chi sei. */
  var PREFERENZE = ["glc_vista_equipaggio"];
  function puliziaLocale(){
    try{
      Object.keys(localStorage).forEach(function(k){
        if(/^glc_/.test(k) && PREFERENZE.indexOf(k) < 0) localStorage.removeItem(k);
      });
    }catch(e){}
    try{
      Object.keys(sessionStorage).forEach(function(k){ if(/^glc_/.test(k)) sessionStorage.removeItem(k); });
    }catch(e){}
    /* Le illustrazioni delle carte stanno fuori da localStorage. */
    try{ if(window.indexedDB) indexedDB.deleteDatabase("glc_special_move_media_v1"); }catch(e){}
    clearTimeout(syncTimer);
    if(engine)engine.stop();
    if(canale)sb.removeChannel(canale);
  }
  async function logout(){
    if(loggingOut)return;
    try{
      _setItem("glc_logout_lock",JSON.stringify({user:currentUser.id,until:Date.now()+60000}));
      if(!engine || !await engine.flush()){
        localStorage.removeItem("glc_logout_lock");
        alert("Non posso uscire in sicurezza: ci sono modifiche non sincronizzate o copie da confrontare. Apri il Profilo e completa il salvataggio; i dati locali sono conservati.");return;
      }
      loggingOut=true;
      var userId=currentUser.id;
      var result=await sb.auth.signOut();if(result.error)throw result.error;
      engine.stop();await engine.store.clear(userId);
      currentUser=null;puliziaLocale();location.reload();
    }catch(e){localStorage.removeItem("glc_logout_lock");loggingOut=false;alert("Uscita non completata. I dati locali sono conservati. "+e.message);}
  }

  function flash(text, err){
    var f = document.getElementById("glc-flash");
    if(!f){ f = document.createElement("div"); f.id = "glc-flash"; document.body.appendChild(f); }
    f.textContent = text; f.className = err ? "show err" : "show";
    clearTimeout(f._t); f._t = setTimeout(function(){ f.className = err ? "err" : ""; }, 1800);
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, function(c){ return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]; }); }

  /* ---------------- stato di autenticazione ---------------- */
  function onSignedIn(user){
    if(loggingOut)return;
    if(engine&&engine.stopped){reloading=true;location.reload();return;}
    if(startup&&currentUser&&currentUser.id===user.id)return startup;
    var previous=localStorage.getItem("glc_utente");
    if(previous&&previous!==user.id){
      if(engine)engine.stop();puliziaLocale();_setItem("glc_utente",user.id);location.reload();return;
    }
    authResolved=true;_setItem("glc_utente",user.id);currentUser=user;renderControl();
    startup=(async function(){
      if(!engine){flash("Sincronizzazione non caricata: ricarica la pagina",true);closeOverlay();return;}
      var result=await engine.start(user.id);
      if(result.reload){location.reload();return;}
      ascolta();closeOverlay();renderSyncNotice();
    })();return startup;
  }
  function onSignedOut(){
    if(loggingOut)return;
    authResolved=true;
    if(currentUser&&engine){engine.stop();startup=null;}
    currentUser=null;renderControl();renderSyncNotice();if(GATE)openOverlay();
  }
  window.GLCSync = {
    chiavi:SAVE_KEYS.slice(),
    stato:function(){return engine?engine.state():null;},
    messaggio:syncMessage,
    collegato:function(){return !!currentUser;},
    adesso:function(){return currentUser&&engine?engine.sync():Promise.resolve(false);},
    conflitti:function(){return engine?Object.values(engine.records).filter(function(r){return r.conflict;}).map(function(r){return {key:r.key,revision:r.conflict.revision,ids:r.conflict.conflicts,local:r.conflict.local,remote:r.conflict.remote};}):[];},
    risolvi:function(key,choice,expected){return engine.resolve(key,choice,expected);},
    versioni:function(){return engine.history();},
    versione:function(id){return engine.version(id);},
    revisione:function(key){return engine.records[key]&&engine.records[key].revision;},
    ripristina:function(version,expected){return engine.restore(version,expected);}
  };

  function start(){
    buildOverlay();
    if(GATE) openOverlay();
    renderControl();
    sb.auth.getSession().then(function(res){
      if(res.data && res.data.session){ onSignedIn(res.data.session.user); }
      else { onSignedOut(); }
    }).catch(function(){onSignedOut();flash("Accesso non verificabile: controlla la connessione",true);});
    sb.auth.onAuthStateChange(function(event, session){
      setTimeout(function(){if(session && session.user){onSignedIn(session.user);}else{onSignedOut();}},0);
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

/* ---------- sfondo animato condiviso: bollicine che salgono ---------- */
(function(){
  var CSS=".glc-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;background-image:radial-gradient(circle, transparent 0 1.9px, rgba(201,162,74,.15) 2.2px 2.8px, transparent 3.2px),radial-gradient(circle, rgba(168,198,189,.10) 0 1.1px, transparent 1.8px);background-size:150px 150px,100px 100px;background-position:0 0,40px 30px}@media (prefers-reduced-motion: no-preference){.glc-bg{animation:glcRise 34s linear infinite}}@keyframes glcRise{from{background-position:0 0,40px 30px}to{background-position:0 -900px,40px -870px}}";
  function injectBG(){
    if(!document.body || document.querySelector(".glc-bg")) return;
    if(!document.getElementById("glc-bg-css")){ var st=document.createElement("style");st.id="glc-bg-css";st.textContent=CSS;document.head.appendChild(st); }
    var d=document.createElement("div");d.className="glc-bg";d.setAttribute("aria-hidden","true");
    document.body.insertBefore(d, document.body.firstChild);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",injectBG); else injectBG();
})();


/* ---------- PWA: manifest, icone e service worker (pagine con login) ---------- */
(function(){
  function injectPWA(){
    try{
      var head=document.head||document.getElementsByTagName("head")[0];
      if(head && !document.querySelector('link[rel="manifest"]')){
        function add(tag,attrs){ var e=document.createElement(tag); for(var k in attrs){ e.setAttribute(k,attrs[k]); } head.appendChild(e); }
        add("link",{rel:"manifest",href:"/manifest.webmanifest"});
        add("meta",{name:"theme-color",content:"#0a1920"});
        add("link",{rel:"apple-touch-icon",href:"/icons/apple-touch-icon-180.png"});
        add("meta",{name:"apple-mobile-web-app-capable",content:"yes"});
        add("meta",{name:"apple-mobile-web-app-status-bar-style",content:"black-translucent"});
        add("meta",{name:"apple-mobile-web-app-title",content:"GLC"});
      }
      if("serviceWorker" in navigator){ navigator.serviceWorker.register("/sw.js").catch(function(){}); }
    }catch(e){}
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",injectPWA); else injectPWA();
})();
