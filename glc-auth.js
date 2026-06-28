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

  var currentUser = null, syncedReveal = false, saveTimers = {};

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
    ".glc-slot .glc-who,.glc-bar-in .glc-who{display:inline-flex;align-items:center;gap:8px}"+
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

  /* ---------------- salvataggio nel cloud ---------------- */
  var _setItem = localStorage.setItem.bind(localStorage);
  if(SAVE_KEYS.length){
    localStorage.setItem = function(k,v){
      _setItem(k,v);
      if(currentUser && SAVE_KEYS.indexOf(k) >= 0){
        clearTimeout(saveTimers[k]);
        saveTimers[k] = setTimeout(function(){ cloudSaveKey(k); }, 900);
      }
    };
  }
  async function cloudSaveKey(k){
    if(!currentUser) return;
    var raw = localStorage.getItem(k); if(raw == null) return;
    var data; try{ data = JSON.parse(raw); }catch(e){ return; }
    try{
      var res = await sb.from("saves").upsert({ user_id: currentUser.id, key: k, data: data }, { onConflict: "user_id,key" });
      if(res.error) throw res.error;
      flash("Salvato nel cloud \u2713");
    }catch(e){ console.error("[GLC] cloudSave", e); flash("Salvataggio cloud non riuscito", true); }
  }
  async function cloudSaveAll(){ for(var i=0;i<SAVE_KEYS.length;i++){ await cloudSaveKey(SAVE_KEYS[i]); } }
  async function cloudPull(){
    try{
      var res = await sb.from("saves").select("key,data").in("key", SAVE_KEYS);
      if(res.error) throw res.error;
      var byKey = {}; (res.data||[]).forEach(function(r){ byKey[r.key] = r.data; });
      var reload = false;
      for(var i=0;i<SAVE_KEYS.length;i++){
        var k = SAVE_KEYS[i];
        var flag = "glc_synced_" + currentUser.id + "_" + k;
        var synced = sessionStorage.getItem(flag) === "1";
        if(byKey[k] != null){
          if(!synced){ _setItem(k, JSON.stringify(byKey[k])); reload = true; }
        } else if(localStorage.getItem(k) != null){
          await cloudSaveKey(k);
        }
        sessionStorage.setItem(flag, "1");
      }
      if(reload){ location.reload(); return true; }
    }catch(e){ console.error("[GLC] cloudPull", e); flash("Sync non riuscita: uso i dati locali", true); }
    return false;
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
    if(nm) nm.textContent = uname ? ("@" + uname) : (currentUser.email || "\u2014");
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
      host.innerHTML = '<span class="glc-who">' + avatarHTML(prof0.avatar) + '<b class="glc-name">' + escapeHtml(nameStr) + '</b></span>' + (PROFILE_URL ? '<a class="glc-prof" href="' + PROFILE_URL + '">Profilo</a>' : '') + '<button class="glc-out" id="glc-out">Esci</button>';
      document.getElementById("glc-out").onclick = logout;
      enrichControl();
    } else {
      if(!slot){ var b = document.getElementById("glc-bar"); if(b) b.innerHTML = ""; return; } // strumenti: niente barra (copre l'overlay)
      host.className = "glc-slot out";
      host.innerHTML = '<button class="glc-accedi" id="glc-accedi">Accedi</button>';
      document.getElementById("glc-accedi").onclick = openOverlay;
    }
  }
  async function logout(){
    try{ await cloudSaveAll(); }catch(e){}
    var uid = currentUser ? currentUser.id : "";
    try{ await sb.auth.signOut(); }catch(e){}
    SAVE_KEYS.forEach(function(k){ sessionStorage.removeItem("glc_synced_" + uid + "_" + k); });
    SAVE_KEYS.forEach(function(k){ localStorage.removeItem(k); });
    location.reload();
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
    currentUser = user;
    renderControl();
    if(SAVE_KEYS.length && !syncedReveal){
      syncedReveal = true;
      cloudPull().then(function(reloaded){ if(!reloaded) closeOverlay(); });
    } else {
      closeOverlay();
    }
  }
  function onSignedOut(){
    currentUser = null;
    renderControl();
    if(GATE) openOverlay();
  }

  function start(){
    buildOverlay();
    if(GATE) openOverlay();
    renderControl();
    sb.auth.getSession().then(function(res){
      if(res.data && res.data.session){ onSignedIn(res.data.session.user); }
      else { onSignedOut(); }
    });
    sb.auth.onAuthStateChange(function(event, session){
      if(session && session.user){ onSignedIn(session.user); }
      else { onSignedOut(); }
    });
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

/* ---------- sfondo animato condiviso: bollicine che salgono ---------- */
(function(){
  function injectBG(){
    if(!document.body || document.querySelector(".glc-bg")) return;
    if(!document.getElementById("glc-bg-css")){
      var css=".glc-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;"
        +"background-image:radial-gradient(circle, rgba(201,162,74,.07) 0 2px, transparent 3px),radial-gradient(circle, rgba(168,198,189,.055) 0 1.5px, transparent 2.5px);"
        +"background-size:150px 150px,96px 96px}"
        +"@media (prefers-reduced-motion: no-preference){.glc-bg{animation:glcRise 32s linear infinite}}"
        +"@keyframes glcRise{from{background-position:0 0,0 0}to{background-position:0 -600px,0 -480px}}";
      var st=document.createElement("style");st.id="glc-bg-css";st.textContent=css;document.head.appendChild(st);
    }
    var d=document.createElement("div");d.className="glc-bg";d.setAttribute("aria-hidden","true");
    document.body.insertBefore(d, document.body.firstChild);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",injectBG); else injectBG();
})();
