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
  var callbackParams = new URLSearchParams(location.hash.slice(1));
  var callbackError = callbackParams.get("error_code") || callbackParams.get("error");
  var callbackUser = null, recoveryDismissed = false, recoveryVerified = false;
  var recoveryRequested = !callbackError && callbackParams.get("type") === "recovery";
  try{
    var rememberedRecovery = JSON.parse(sessionStorage.getItem("glc_auth_recovery") || "null");
    if(!callbackError && rememberedRecovery && rememberedRecovery.until > Date.now())recoveryRequested=true;
  }catch(e){}

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
    "#glc-auth{position:fixed;inset:0;z-index:99999;width:100%;height:100%;max-width:none;max-height:none;margin:0;border:0;color:#f2e9d8;background:#060607;padding:24px}"+
    "#glc-auth[open]{display:flex;align-items:center;justify-content:center}#glc-auth:not([open]){display:none}"+
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
    // Refresh the shared theme too: cached legacy rules used !important on the old login.
    document.querySelectorAll('link[href="/glc-theme.css"]').forEach(function(theme){theme.href="/glc-theme.css?v=login-1";});
    var link=document.createElement("link");link.id="glc-login-css";link.rel="stylesheet";link.href="/glc-login.css?v=2";
    (document.head||document.documentElement).appendChild(link);
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
  var authMode = "login", authBusy = false, emailCooldown = 0;
  var returnFocus = null, savedOverflow = null, resendAvailable = false;
  var recoveryUser = null, recoveryCheck = null, recoveryComplete = false;
  var RECOVERY_KEY = "glc_auth_recovery";

  function el(id){ return document.getElementById(id); }
  function savedRecovery(){
    try{
      var value = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || "null");
      return value && value.user && value.until > Date.now() ? value : null;
    }catch(e){ return null; }
  }
  function clearRecovery(){
    recoveryRequested = false; recoveryUser = null; recoveryCheck = null; recoveryComplete = false;
    try{ sessionStorage.removeItem(RECOVERY_KEY); }catch(e){}
  }
  function setMessage(text, ok){
    var msg = el("glc-msg");
    if(msg){ msg.className = "glc-msg" + (ok ? " ok" : ""); msg.textContent = text || ""; }
  }
  function clearPasswords(){
    ["glc-password","glc-confirm"].forEach(function(id){ var field=el(id); if(field){field.value="";field.type="password";} });
    var reveal=el("glc-reveal"); if(reveal){reveal.textContent="Mostra";reveal.setAttribute("aria-pressed","false");}
  }
  function setBusy(busy){
    authBusy = busy;
    var o = el("glc-auth"); if(!o)return;
    el("glc-form").setAttribute("aria-busy",String(busy));
    o.querySelectorAll("input,button:not(.glc-x):not(.glc-later)").forEach(function(item){item.disabled=busy;});
    var waiting = authMode === "checking";
    el("glc-send").disabled = busy || waiting;
    el("glc-send").textContent = busy ? "Attendi…" : submitLabel();
  }
  function submitLabel(){
    return {login:"Accedi al registro",register:"Crea account GLC",magic:"Invia il link d’accesso",forgot:"Invia il link di recupero",recovery:"Salva la nuova password",checking:"Verifica del link…",confirmation:"Vai all’accesso",complete:"Continua nel registro"}[authMode];
  }
  function showMode(mode, keepMessage){
    if(authBusy)return;
    authMode=mode; clearPasswords();
    if(!keepMessage){setMessage("");resendAvailable=false;}
    var entry=mode==="login" || mode==="register";
    var password=entry || mode==="recovery", confirmation=mode==="register" || mode==="recovery";
    el("glc-auth").setAttribute("data-mode",mode);
    el("glc-title").textContent={login:"Riprendi il viaggio",register:"Il viaggio inizia qui",magic:"Entra con un link",forgot:"Ritrova la tua rotta",recovery:"Una nuova password",checking:"Verifico il tuo link",confirmation:"Controlla la posta",complete:"Password aggiornata"}[mode];
    el("glc-subtitle").textContent={
      login:"Accedi al tuo account GLC e ritrova personaggi, ciurma e campagne.",
      register:"Crea il tuo registro personale. Confermerai l’email prima di entrare.",
      magic:"Ricevi un link sicuro via email e accedi senza inserire una password.",
      forgot:"Hai dimenticato la password o non l’hai ancora impostata? Ricevi il link via email.",
      recovery:"Scegli la password per il tuo account GLC. I tuoi personaggi restano nello stesso account.",
      checking:"Attendi mentre verifico che il link sia ancora valido.",
      confirmation:"Apri l’email di conferma per attivare il registro, poi torna qui per accedere.",
      complete:"La nuova password è pronta. Puoi tornare al tuo registro."
    }[mode];
    el("glc-tabs").hidden=!entry;
    el("glc-tab-login").setAttribute("aria-pressed",String(mode==="login"));
    el("glc-tab-register").setAttribute("aria-pressed",String(mode==="register"));
    el("glc-google").hidden=!entry; el("glc-or").hidden=!entry;
    el("glc-email-field").hidden=mode==="recovery" || mode==="checking" || mode==="complete" || mode==="confirmation";
    el("glc-email").required=!el("glc-email-field").hidden;
    el("glc-password-field").hidden=!password; el("glc-confirm-field").hidden=!confirmation;
    el("glc-password").required=password; el("glc-confirm").required=confirmation;
    el("glc-password").autocomplete=mode==="login"?"current-password":"new-password";
    el("glc-password").minLength=mode==="login"?1:12;
    el("glc-password-label").textContent=mode==="recovery"?"Nuova password":"Password";
    el("glc-password-hint").hidden=mode==="login" || !password;
    el("glc-forgot-row").hidden=mode!=="login";
    el("glc-magic").hidden=mode!=="login";
    el("glc-back").hidden=entry || mode==="complete" || mode==="checking";
    el("glc-resend").hidden=!resendAvailable;
    ["glc-email","glc-password","glc-confirm"].forEach(function(id){el(id).removeAttribute("aria-invalid");});
    setBusy(false);
    if(el("glc-auth").open)el("glc-title").focus();
  }
  function buildOverlay(){
    if(el("glc-auth"))return;
    var o=document.createElement("dialog"); o.id="glc-auth"; o.className="glc-hidden";
    o.setAttribute("aria-labelledby","glc-title"); o.setAttribute("aria-describedby","glc-subtitle");
    o.innerHTML=
      '<div class="glc-card">'+
        '<button type="button" class="glc-x" id="glc-x" aria-label="Chiudi accesso">×</button>'+
        '<aside class="glc-voyage" aria-label="Registro di bordo">'+
          '<div class="glc-k">Il registro di bordo</div>'+
          '<div><svg class="glc-seal" aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor"><circle cx="24" cy="24" r="19"/><circle cx="24" cy="24" r="14" opacity=".35"/><path d="M24 1v7m0 32v7M1 24h7m32 0h7"/><path d="m24 10 5 14-5 14-5-14Z" fill="currentColor" stroke="none"/></svg>'+
          '<h3>La tua rotta.<br> Sempre con te.</h3><p>Personaggi, ciurma e campagne. Ritrova il tuo viaggio, su ogni dispositivo.</p></div>'+
          '<div class="glc-voyage-footer"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="4" r="2"/><path d="M12 6v15M8 10h8M3 14c0 7 18 7 18 0M1 16l2-2 2 2m14 0 2-2 2 2"/></svg>Grand Line Chronicles · Will of D.</div>'+
        '</aside>'+
        '<section class="glc-access">'+
          '<div class="glc-k">Grand Line Chronicles</div><h2 class="glc-h" id="glc-title"></h2><p class="glc-sub" id="glc-subtitle"></p>'+
          '<div class="glc-tabs" id="glc-tabs" role="group" aria-label="Accedi o crea account"><button type="button" id="glc-tab-login" data-glc-mode="login">Accedi</button><button type="button" id="glc-tab-register" data-glc-mode="register">Crea account</button></div>'+
          '<button type="button" class="glc-google" id="glc-google"><svg aria-hidden="true" viewBox="0 0 18 18" width="18" height="18"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95L3.97 7.28C4.68 5.16 6.66 3.58 9 3.58z"/></svg>Continua con Google</button>'+
          '<div class="glc-or" id="glc-or">oppure con la tua email</div>'+
          '<form id="glc-form">'+
            '<div class="glc-field" id="glc-email-field"><label for="glc-email">Email</label><input id="glc-email" name="email" type="email" placeholder="la-tua@email.com" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>'+
            '<div class="glc-field" id="glc-password-field"><label id="glc-password-label" for="glc-password">Password</label><div class="glc-password-wrap"><input id="glc-password" name="password" type="password" autocomplete="current-password" required><button type="button" class="glc-reveal" id="glc-reveal" aria-controls="glc-password" aria-pressed="false">Mostra</button></div><small class="glc-password-hint" id="glc-password-hint">Almeno 12 caratteri. Usa una password lunga e diversa da quelle di altri siti.</small></div>'+
            '<div class="glc-field" id="glc-confirm-field"><label for="glc-confirm">Conferma password</label><input id="glc-confirm" name="password-confirm" type="password" autocomplete="new-password"></div>'+
            '<div class="glc-forgot-row" id="glc-forgot-row"><button type="button" class="glc-text-button" data-glc-mode="forgot">Password dimenticata?</button></div>'+
            '<button type="submit" class="glc-go" id="glc-send"></button>'+
          '</form>'+
          '<div class="glc-msg" id="glc-msg" role="status" aria-live="polite" aria-atomic="true"></div>'+
          '<button type="button" class="glc-text-button glc-resend" id="glc-resend" hidden>Invia di nuovo la conferma email</button>'+
          '<div class="glc-alternatives"><button type="button" class="glc-text-button" id="glc-magic" data-glc-mode="magic">Preferisci ricevere un link via email?</button><button type="button" class="glc-text-button" id="glc-back">← Torna all’accesso</button></div>'+
          '<button type="button" class="glc-later" id="glc-later">'+(GATE?'Continua solo su questo dispositivo':'Continua a esplorare')+'</button>'+
          '<p class="glc-account-note">Il tuo account GLC è indipendente dalla Forgia.</p>'+
        '</section>'+
      '</div>';
    document.body.appendChild(o);
    el("glc-x").onclick=closeOverlay; el("glc-later").onclick=closeOverlay;
    el("glc-google").onclick=googleLogin;
    el("glc-form").addEventListener("submit",function(e){e.preventDefault();submitAuth();});
    o.querySelectorAll("[data-glc-mode]").forEach(function(button){button.onclick=function(){showMode(button.getAttribute("data-glc-mode"));};});
    el("glc-back").onclick=function(){
      if(authBusy)return;
      if(recoveryRequested){closeOverlay();return;}
      showMode("login");
    };
    el("glc-reveal").onclick=function(){var field=el("glc-password"),visible=field.type==="password";field.type=visible?"text":"password";this.textContent=visible?"Nascondi":"Mostra";this.setAttribute("aria-pressed",String(visible));};
    el("glc-resend").onclick=resendConfirmation;
    o.addEventListener("cancel",function(e){e.preventDefault();closeOverlay();});
    o.addEventListener("keydown",function(e){
      if(e.key!=="Tab")return;
      var controls=Array.from(o.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')).filter(function(item){return item.getClientRects().length && !item.closest('[hidden]');});
      if(!controls.length)return;
      var first=controls[0],last=controls[controls.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    });
    showMode("login");
  }
  function openOverlay(){
    buildOverlay(); var o=el("glc-auth");
    if(o.open)return;
    returnFocus=document.activeElement; savedOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden"; o.classList.remove("glc-hidden"); o.showModal();
    if(GATE)document.documentElement.classList.add("glc-loading");
    // Focus an entry control, without opening the mobile keyboard automatically.
    (el("glc-tabs").hidden?el("glc-title"):el("glc-tab-login")).focus();
  }
  function closeOverlay(){
    var o=el("glc-auth");
    if(o && o.open){o.close();o.classList.add("glc-hidden");document.body.style.overflow=savedOverflow||"";savedOverflow=null;}
    document.documentElement.classList.remove("glc-loading"); clearPasswords();
    if(returnFocus && returnFocus.isConnected)returnFocus.focus(); returnFocus=null;
    if(recoveryRequested || callbackError){
      var user=recoveryUser || callbackUser;recoveryDismissed=true;callbackError=null;callbackUser=null;clearRecovery();setBusy(false);showMode("login");
      if(user)onSignedIn(user);else sb.auth.getSession().then(function(r){if(r.data&&r.data.session)onSignedIn(r.data.session.user);});
    }
  }
  function authErrorMessage(e){
    var code=e&&e.code||"",status=e&&e.status||0;
    if(code==="invalid_credentials")return "Email o password non corrette. Se usavi Google o un link via email, usa lo stesso metodo oppure imposta una password con il recupero.";
    if(code==="email_not_confirmed")return "Conferma l’email dal link ricevuto. Puoi richiedere una nuova email di conferma qui sotto.";
    if(code==="weak_password")return "Scegli una password più sicura, di almeno 12 caratteri.";
    if(code==="same_password")return "Scegli una password diversa da quella attuale.";
    if(code==="email_address_invalid" || code==="validation_failed")return "Controlla che l’indirizzo email sia completo e valido.";
    if(code.indexOf("rate_limit")>=0 || status===429)return "Troppe richieste. Attendi qualche minuto prima di riprovare.";
    if(code==="signup_disabled")return "Le nuove registrazioni sono temporaneamente sospese. Puoi accedere a un account esistente.";
    if(code==="otp_expired" || code==="flow_state_expired" || code==="session_not_found" || code==="refresh_token_not_found")return "Il link è scaduto o non è più valido. Richiedine uno nuovo.";
    if(code==="email_address_not_authorized" || status>=500)return "Il servizio di accesso o invio email è temporaneamente indisponibile. Riprova più tardi.";
    if(e && (e.name==="AuthRetryableFetchError" || e.name==="TypeError"))return "Non riesco a raggiungere il servizio di accesso. Controlla la connessione e riprova.";
    return "La richiesta non è stata completata. Riprova; se il problema continua, contatta Arkalink.";
  }
  function validEmail(){
    var field=el("glc-email"),email=field.value.trim();field.value=email;
    if(!email || !field.checkValidity()){field.setAttribute("aria-invalid","true");setMessage("Inserisci un indirizzo email valido.");field.focus();return null;}
    return email;
  }
  function checkEmailCooldown(){
    if(Date.now()<emailCooldown){setMessage("Email già richiesta. Attendi un minuto prima di inviarne un’altra.",true);return false;}
    return true;
  }
  async function googleLogin(){
    if(authBusy)return;callbackError=null;callbackUser=null;setBusy(true);setMessage("Apertura di Google…",true);
    try{
      var r=await sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:REDIRECT}});if(r.error)throw r.error;
    }catch(e){setMessage(authErrorMessage(e));setBusy(false);}
  }
  async function submitAuth(){
    if(authBusy || authMode==="checking")return;
    if(authMode==="complete"){closeOverlay();return;}
    if(authMode==="confirmation"){showMode("login");return;}
    var mode=authMode,email=null,password=el("glc-password").value;
    if(mode!=="recovery"){email=validEmail();if(!email)return;}
    if(mode==="login" && !password){setMessage("Inserisci la password.");el("glc-password").focus();return;}
    if(mode==="register" || mode==="recovery"){
      if(password.length<12){el("glc-password").setAttribute("aria-invalid","true");setMessage("Scegli una password di almeno 12 caratteri.");el("glc-password").focus();return;}
      if(password!==el("glc-confirm").value){el("glc-confirm").setAttribute("aria-invalid","true");setMessage("Le due password non coincidono.");el("glc-confirm").focus();return;}
    }
    if((mode==="register" || mode==="forgot" || mode==="magic")&&!checkEmailCooldown())return;
    setBusy(true);setMessage("");resendAvailable=false;
    try{
      var r;
      if(mode==="login"){
        callbackError=null;callbackUser=null;
        r=await sb.auth.signInWithPassword({email:email,password:password});if(r.error)throw r.error;
        if(!r.data||!r.data.user)throw Error("Missing user");
        clearPasswords();setMessage("Accesso riuscito. Controllo dei salvataggi in corso…",true);
        await onSignedIn(r.data.user);
      }else if(mode==="register"){
        callbackError=null;callbackUser=null;
        r=await sb.auth.signUp({email:email,password:password,options:{emailRedirectTo:REDIRECT}});if(r.error)throw r.error;
        clearPasswords();
        if(r.data&&r.data.session){await onSignedIn(r.data.session.user);}
        else{emailCooldown=Date.now()+60000;resendAvailable=true;setMessage("Controlla la posta e lo spam per confermare il tuo account. Se usavi già Google o un link via email, torna ad Accedi e usa il recupero per impostare la password sullo stesso account.",true);}
      }else if(mode==="magic"){
        r=await sb.auth.signInWithOtp({email:email,options:{emailRedirectTo:REDIRECT}});if(r.error)throw r.error;
        emailCooldown=Date.now()+60000;setMessage("Link richiesto. Controlla la posta e lo spam, poi apri l’email per entrare nel registro.",true);
      }else if(mode==="forgot"){
        r=await sb.auth.resetPasswordForEmail(email,{redirectTo:REDIRECT});if(r.error)throw r.error;
        emailCooldown=Date.now()+60000;setMessage("Se esiste un account con questo indirizzo, riceverai il link per impostare la password. Controlla anche lo spam.",true);
      }else if(mode==="recovery"){
        if(!recoveryUser)throw {code:"otp_expired"};
        r=await sb.auth.updateUser({password:password});if(r.error)throw r.error;
        clearPasswords();recoveryComplete=true;
        try{sessionStorage.removeItem(RECOVERY_KEY);}catch(e){}
      }
    }catch(e){
      resendAvailable=e.code==="email_not_confirmed";
      setMessage(authErrorMessage(e));
    }finally{
      setBusy(false);el("glc-resend").hidden=!resendAvailable;
      if(recoveryComplete && authMode==="recovery")showMode("complete");
      else if(mode==="register" && resendAvailable)showMode("confirmation",true);
    }
  }
  async function resendConfirmation(){
    if(authBusy)return;var email=validEmail();if(!email || !checkEmailCooldown())return;
    setBusy(true);setMessage("");
    try{
      var r=await sb.auth.resend({type:"signup",email:email,options:{emailRedirectTo:REDIRECT}});if(r.error)throw r.error;
      emailCooldown=Date.now()+60000;setMessage("Conferma richiesta. Se l’account attende una conferma, riceverai una nuova email.",true);
    }catch(e){setMessage(authErrorMessage(e));}finally{setBusy(false);}
  }
  function holdRecovery(user){
    if(recoveryCheck)return recoveryCheck;
    showMode("checking");openOverlay();
    recoveryCheck=(async function(){
      try{
        var remembered=savedRecovery();
        if(remembered && remembered.user!==user.id)throw {code:"otp_expired"};
        var r=await sb.auth.getUser();if(r.error)throw r.error;
        if(!r.data||!r.data.user||r.data.user.id!==user.id)throw {code:"otp_expired"};
        if(!recoveryRequested)return;
        recoveryUser=r.data.user;
        try{sessionStorage.setItem(RECOVERY_KEY,JSON.stringify({user:user.id,until:remembered?remembered.until:Date.now()+600000}));}catch(e){}
        showMode("recovery");
      }catch(e){
        clearRecovery();showMode("forgot");setMessage(authErrorMessage(e));
      }
    })();return recoveryCheck;
  }

  /* ---------------- avatar + username nella barra ---------------- */
  function avatarHTML(av){
    if(av){ return '<span class="glc-ava"><img src="' + escapeHtml(av) + '" alt=""></span>'; }
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
    if(av && avatar){ av.innerHTML = '<img src="' + escapeHtml(avatar) + '" alt="">'; }
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
    if(recoveryRequested)return holdRecovery(user);
    if(callbackError){callbackUser=user;return;}
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
    if(recoveryRequested){clearRecovery();showMode("forgot");setMessage("Il link di recupero è scaduto o non è più valido. Richiedine uno nuovo.");openOverlay();}
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
    el("glc-title").tabIndex=-1;
    if(GATE || recoveryRequested || callbackError)openOverlay();
    if(callbackError){
      showMode(callbackError==="otp_expired"?"forgot":"login");
      setMessage(callbackError==="otp_expired"?"Il link è scaduto o è già stato usato. Richiedine uno nuovo.":"Il link di accesso non è valido oppure l’accesso è stato annullato. Riprova con Google, email o un nuovo link.");
      history.replaceState(history.state,"",location.pathname+location.search);
    }
    renderControl();
    // Defer SDK work out of the auth callback to avoid an auth lock deadlock.
    sb.auth.onAuthStateChange(function(event,session){
      setTimeout(function(){
        if(event==="PASSWORD_RECOVERY" && session && session.user && !recoveryDismissed){recoveryVerified=true;recoveryRequested=true;holdRecovery(session.user);return;}
        if(session && session.user){onSignedIn(session.user);}else{onSignedOut();}
      },0);
    });
    sb.auth.getSession().then(function(res){
      if(res.error)throw res.error;
      var session=res.data&&res.data.session;
      // An expired callback must never reuse an unrelated cached session as a reset link.
      if(recoveryRequested && callbackParams.get("type")==="recovery" && !recoveryVerified && (!session || session.access_token!==callbackParams.get("access_token"))){
        clearRecovery();callbackError="otp_expired";callbackUser=session&&session.user;
        showMode("forgot");setMessage("Il link di recupero è scaduto o non è più valido. Richiedine uno nuovo.");openOverlay();
        callbackParams=new URLSearchParams();return;
      }
      callbackParams=new URLSearchParams();
      if(session){onSignedIn(session.user);}
      else{onSignedOut();}
    }).catch(function(){onSignedOut();flash("Accesso non verificabile: controlla la connessione",true);});
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
