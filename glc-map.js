/* GLCMap — mappa interattiva delle isole (riutilizzabile)
   Uso:
     var ctrl = GLCMap.mount(containerEl, {
       islands: [...],                // array {id,x,y,type,nome,note}
       readOnly: false,               // true => sola lettura
       onChange: function(islands){}  // chiamata a ogni modifica
     });
     ctrl.update(islands, readOnly);   // per aggiornare dopo un load async
*/
(function(){
  if (window.GLCMap) return;

  var CSS = ""
  + ".glcmap-wrap{--c-paper:#f4ead0;--c-ink:#33261a;--c-soft:#5e4c34;--c-gold:#c9a24a;--c-line:#cdb487;--c-seal:#9a241a;font-family:'Cormorant Garamond',Georgia,serif;}"
  + ".glcmap-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:10px;}"
  + ".glcmap-chip{font-family:'Marcellus SC',serif;font-size:11.5px;letter-spacing:.03em;border:1px solid #b9a06f;background:#fffaf0;color:#5a3f1c;border-radius:999px;padding:6px 11px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}"
  + ".glcmap-chip.on{background:linear-gradient(180deg,#e7be63,#c9a24a);border-color:var(--c-gold);color:#2b1f0d;}"
  + ".glcmap-chip svg{width:14px;height:14px;}"
  + ".glcmap-add{font-family:'Marcellus SC',serif;font-size:12px;letter-spacing:.04em;border:1px solid var(--c-gold);background:linear-gradient(180deg,#e7be63,#c9a24a);color:#2b1f0d;border-radius:9px;padding:7px 13px;cursor:pointer;}"
  + ".glcmap-add.arm{background:#fffaf0;color:#8c1c13;border-color:#d9a99f;}"
  + ".glcmap-hint{font-size:.92rem;color:#a8c6bd;font-style:italic;margin-left:auto;}"
  + ".glcmap-canvas{position:relative;width:100%;aspect-ratio:25/16;border-radius:12px;overflow:hidden;border:1px solid var(--c-line);box-shadow:0 12px 28px rgba(0,0,0,.3);user-select:none;}"
  + ".glcmap-canvas.arm{cursor:crosshair;}"
  + ".glcmap-bg{position:absolute;inset:0;width:100%;height:100%;}"
  + ".glcmap-overlay{position:absolute;inset:0;}"
  + ".glcmap-marker{position:absolute;transform:translate(-50%,-100%);cursor:pointer;display:flex;flex-direction:column;align-items:center;touch-action:none;}"
  + ".glcmap-pin{width:30px;height:30px;border-radius:50% 50% 50% 0;background:var(--mc,#c9a24a);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 8px rgba(0,0,0,.4);border:2px solid #fffaf0;}"
  + ".glcmap-pin svg{width:15px;height:15px;transform:rotate(45deg);color:#2b1f0d;}"
  + ".glcmap-lbl{margin-top:3px;font-family:'Marcellus SC',serif;font-size:11px;letter-spacing:.02em;color:#2b1f0d;background:rgba(244,234,208,.92);border:1px solid var(--c-line);border-radius:6px;padding:1px 7px;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 5px rgba(0,0,0,.3);}"
  + ".glcmap-empty{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:rgba(236,220,182,.7);font-style:italic;text-align:center;font-size:.95rem;pointer-events:none;padding:0 20px;}"
  + ".glcmap-modal{position:fixed;inset:0;background:rgba(6,14,18,.6);display:flex;align-items:center;justify-content:center;z-index:9000;padding:18px;}"
  + ".glcmap-card{background:linear-gradient(180deg,#f4ead0,#efe2c4);color:var(--c-ink);border:1px solid var(--c-line);border-radius:14px;padding:18px;width:100%;max-width:380px;box-shadow:0 18px 50px rgba(0,0,0,.5);}"
  + ".glcmap-card h4{font-family:'Cinzel Decorative',serif;font-size:1.2rem;color:#4a371d;margin:0 0 10px;}"
  + ".glcmap-card label{font-family:'Marcellus SC',serif;letter-spacing:.06em;text-transform:uppercase;font-size:10px;color:var(--c-soft);display:block;margin:10px 0 4px;}"
  + ".glcmap-in{width:100%;font-family:'Cormorant Garamond',serif;font-size:1.05rem;color:var(--c-ink);background:#fffaf0;border:1px solid #b9a06f;border-radius:8px;padding:9px 11px;}"
  + "textarea.glcmap-in{resize:vertical;min-height:70px;}"
  + ".glcmap-in:focus{outline:2px solid var(--c-gold);outline-offset:1px;}"
  + ".glcmap-read{white-space:pre-wrap;background:#fffaf0;border:1px solid var(--c-line);border-radius:8px;padding:9px 11px;color:var(--c-soft);}"
  + ".glcmap-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}"
  + ".glcmap-btn{font-family:'Marcellus SC',serif;font-size:12px;letter-spacing:.04em;border-radius:9px;padding:9px 14px;cursor:pointer;border:1px solid var(--c-gold);background:linear-gradient(180deg,#e7be63,#c9a24a);color:#2b1f0d;}"
  + ".glcmap-btn.ghost{background:transparent;color:#5a3f1c;}"
  + ".glcmap-btn.danger{background:#f1d9d4;border-color:#d9a99f;color:#8c1c13;}"
  + ".glcmap-btn.spacer{margin-left:auto;}"
  + ".glcmap-typetag{font-family:'Marcellus SC',serif;font-size:10px;letter-spacing:.05em;text-transform:uppercase;color:var(--c-soft);margin-bottom:8px;}";

  function injectCSS(){
    if (document.getElementById("glcmap-css")) return;
    var st = document.createElement("style");
    st.id = "glcmap-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }

  var IC = {
    isola:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c3 0 5 2 6 6 3 1 4 3 4 3H2s1-2 4-3c1-4 3-6 6-6z"/><path d="M2 16h20v2H2zM4 20h16v1.5H4z" opacity=".7"/></svg>',
    citta:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 21V9l5-3 5 3v2h6v10H4zm12-8v8h4v-8h-4z"/></svg>',
    pericolo:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 6l6.5 11h-13L12 8zm-1 4h2v3h-2zm0 4h2v2h-2z"/></svg>',
    tesoro: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8h18v11H3zM3 8l2-3h14l2 3M11 12h2v2h-2z"/></svg>',
    ancora: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2.2 2.2 0 100 4.4A2.2 2.2 0 0012 2zm-1 6h2v9.2c2-.4 3.5-1.7 4-3.6l1.8.5C18 17.4 15.5 19.4 12 19.7V8zm1 11.7C8.5 19.4 6 17.4 5.2 14.6L7 14.1c.5 1.9 2 3.2 4 3.6V8h1v11.7z"/></svg>'
  };
  var TYPES = [
    { key:"isola",    label:"Isola",         color:"#5e8d6e", icon:IC.isola },
    { key:"citta",    label:"Porto/Citt\u00e0", color:"#c9a24a", icon:IC.citta },
    { key:"pericolo", label:"Pericolo",      color:"#b0432f", icon:IC.pericolo },
    { key:"tesoro",   label:"Tesoro",        color:"#d8a72e", icon:IC.tesoro },
    { key:"ancora",   label:"Ancoraggio",    color:"#5f86a0", icon:IC.ancora }
  ];
  function typeOf(k){ for (var i=0;i<TYPES.length;i++) if (TYPES[i].key===k) return TYPES[i]; return TYPES[0]; }
  function uid(){ return "isl"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36); }
  function clamp(v){ return Math.max(1, Math.min(99, v)); }
  function esc(t){ return (t||"").replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function el(tag, cls){ var e=document.createElement(tag); if (cls) e.className=cls; return e; }

  function bgSVG(){
    var grid="";
    for (var x=50;x<1000;x+=50) grid+='<line x1="'+x+'" y1="0" x2="'+x+'" y2="640"/>';
    for (var y=50;y<640;y+=50) grid+='<line x1="0" y1="'+y+'" x2="1000" y2="'+y+'"/>';
    var rose='<g transform="translate(892,548)">'
      + '<circle r="42" fill="none" stroke="rgba(201,162,74,.35)" stroke-width="1.5"/>'
      + '<circle r="30" fill="none" stroke="rgba(201,162,74,.25)" stroke-width="1"/>'
      + '<path d="M0,-40 L7,0 L0,40 L-7,0 Z" fill="rgba(201,162,74,.45)"/>'
      + '<path d="M-40,0 L0,7 L40,0 L0,-7 Z" fill="rgba(201,162,74,.30)"/>'
      + '<path d="M0,-40 L4,-4 L0,0 L-4,-4 Z" fill="rgba(236,202,119,.8)"/>'
      + '<text x="0" y="-46" text-anchor="middle" font-family="Marcellus SC,serif" font-size="13" fill="rgba(236,202,119,.85)">N</text>'
      + '</g>';
    return '<svg class="glcmap-bg" viewBox="0 0 1000 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><radialGradient id="glcsea" cx="48%" cy="38%" r="85%">'
      + '<stop offset="0%" stop-color="#17404b"/><stop offset="58%" stop-color="#0f2c35"/><stop offset="100%" stop-color="#0a2027"/>'
      + '</radialGradient></defs>'
      + '<rect width="1000" height="640" fill="url(#glcsea)"/>'
      + '<g stroke="rgba(201,162,74,.10)" stroke-width="1">'+grid+'</g>'
      + '<path d="M120,150 Q300,120 360,240 T620,300" fill="none" stroke="rgba(201,162,74,.20)" stroke-width="2" stroke-dasharray="5 9"/>'
      + '<path d="M40,40 q12,-6 24,0 M40,40 q-12,6 -24,0" fill="none" stroke="rgba(168,198,189,.18)" stroke-width="2"/>'
      + rose
      + '<rect x="5" y="5" width="990" height="630" fill="none" stroke="rgba(201,162,74,.4)" stroke-width="3"/>'
      + '</svg>';
  }

  function mount(container, opts){
    injectCSS();
    opts = opts || {};
    var st = {
      islands: (opts.islands || []).slice(),
      readOnly: !!opts.readOnly,
      addType: "isola",
      armed: false
    };
    function emit(){ if (opts.onChange) opts.onChange(st.islands.slice()); }

    container.innerHTML = "";
    var wrap = el("div", "glcmap-wrap");
    var toolbar = el("div", "glcmap-toolbar");
    var canvas = el("div", "glcmap-canvas");
    canvas.innerHTML = bgSVG();
    var overlay = el("div", "glcmap-overlay");
    canvas.appendChild(overlay);
    wrap.appendChild(toolbar);
    wrap.appendChild(canvas);
    container.appendChild(wrap);

    var addBtn = el("button", "glcmap-add");
    var hint = el("span", "glcmap-hint");

    function renderToolbar(){
      toolbar.innerHTML = "";
      if (st.readOnly){
        var note = el("span", "glcmap-hint");
        note.style.marginLeft = "0";
        note.textContent = "Mappa della campagna \u2014 la aggiorna il Game Master.";
        toolbar.appendChild(note);
        return;
      }
      TYPES.forEach(function(t){
        var c = el("button", "glcmap-chip" + (st.addType===t.key ? " on" : ""));
        c.type = "button";
        c.innerHTML = '<span style="color:'+t.color+'">'+t.icon+'</span>' + t.label;
        c.onclick = function(){ st.addType = t.key; renderToolbar(); };
        toolbar.appendChild(c);
      });
      addBtn.type = "button";
      addBtn.className = "glcmap-add" + (st.armed ? " arm" : "");
      addBtn.textContent = st.armed ? "\u2715 Annulla" : "+ Aggiungi isola";
      addBtn.onclick = function(){ st.armed = !st.armed; canvas.classList.toggle("arm", st.armed); renderToolbar(); };
      toolbar.appendChild(addBtn);
      hint.textContent = st.armed ? "Tocca un punto della mappa\u2026" : "";
      toolbar.appendChild(hint);
    }

    function renderMarkers(){
      overlay.innerHTML = "";
      if (!st.islands.length){
        var em = el("div", "glcmap-empty");
        em.textContent = st.readOnly ? "Nessuna isola segnata." : "Scegli un tipo, premi \u00ab+ Aggiungi isola\u00bb e tocca la mappa per segnare un luogo.";
        overlay.appendChild(em);
      }
      st.islands.forEach(function(isl){ overlay.appendChild(markerEl(isl)); });
    }

    function markerEl(isl){
      var t = typeOf(isl.type);
      var m = el("div", "glcmap-marker");
      m.style.left = isl.x + "%"; m.style.top = isl.y + "%";
      m.innerHTML = '<div class="glcmap-pin" style="--mc:'+t.color+'">'+t.icon+'</div>'
                  + (isl.nome ? '<div class="glcmap-lbl">'+esc(isl.nome)+'</div>' : '');
      if (st.readOnly){
        m.addEventListener("click", function(){ openView(isl); });
        return m;
      }
      m.addEventListener("pointerdown", function(e){
        e.preventDefault();
        var r = canvas.getBoundingClientRect();
        var sx = e.clientX, sy = e.clientY, startX = isl.x, startY = isl.y, moved = false;
        try { m.setPointerCapture(e.pointerId); } catch(_){}
        function move(ev){
          var dx = ev.clientX - sx, dy = ev.clientY - sy;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
          isl.x = clamp(startX + dx / r.width * 100);
          isl.y = clamp(startY + dy / r.height * 100);
          m.style.left = isl.x + "%"; m.style.top = isl.y + "%";
        }
        function up(){
          m.removeEventListener("pointermove", move);
          m.removeEventListener("pointerup", up);
          if (moved) emit(); else openEditor(isl, false);
        }
        m.addEventListener("pointermove", move);
        m.addEventListener("pointerup", up);
      });
      return m;
    }

    canvas.addEventListener("click", function(e){
      if (st.readOnly || !st.armed) return;
      if (e.target.closest(".glcmap-marker")) return;
      var r = canvas.getBoundingClientRect();
      var x = clamp((e.clientX - r.left) / r.width * 100);
      var y = clamp((e.clientY - r.top) / r.height * 100);
      var isl = { id: uid(), x: x, y: y, type: st.addType, nome: "", note: "" };
      st.islands.push(isl);
      st.armed = false; canvas.classList.remove("arm"); renderToolbar();
      renderMarkers(); emit();
      openEditor(isl, true);
    });

    var modal = null;
    function closeModal(){ if (modal){ modal.remove(); modal = null; } }
    function openModal(buildCard){
      closeModal();
      modal = el("div", "glcmap-modal");
      var card = el("div", "glcmap-card");
      buildCard(card);
      modal.appendChild(card);
      modal.addEventListener("click", function(e){ if (e.target === modal) closeModal(); });
      document.body.appendChild(modal);
      return card;
    }

    function openEditor(isl, isNew){
      openModal(function(card){
        var h = el("h4"); h.textContent = isNew ? "Nuova isola" : "Modifica isola"; card.appendChild(h);

        var lN = el("label"); lN.textContent = "Nome"; card.appendChild(lN);
        var nm = el("input", "glcmap-in"); nm.type = "text"; nm.placeholder = "es. Isola di\u2026"; nm.value = isl.nome || ""; card.appendChild(nm);

        var lT = el("label"); lT.textContent = "Tipo"; card.appendChild(lT);
        var sel = el("select", "glcmap-in");
        TYPES.forEach(function(t){ var o = document.createElement("option"); o.value = t.key; o.textContent = t.label; sel.appendChild(o); });
        sel.value = isl.type; card.appendChild(sel);

        var lD = el("label"); lD.textContent = "Note"; card.appendChild(lD);
        var ta = el("textarea", "glcmap-in"); ta.placeholder = "Cosa c'\u00e8 qui, cosa \u00e8 successo, chi avete incontrato\u2026"; ta.value = isl.note || ""; card.appendChild(ta);

        var acts = el("div", "glcmap-acts");
        var del = el("button", "glcmap-btn danger"); del.type = "button"; del.textContent = "Elimina";
        del.onclick = function(){ st.islands = st.islands.filter(function(x){ return x !== isl; }); renderMarkers(); emit(); closeModal(); };
        var cancel = el("button", "glcmap-btn ghost spacer"); cancel.type = "button"; cancel.textContent = "Chiudi";
        cancel.onclick = function(){ if (isNew && !isl.nome && !ta.value.trim()) { /* lascia comunque il segnaposto */ } closeModal(); };
        var save = el("button", "glcmap-btn"); save.type = "button"; save.textContent = "Salva";
        save.onclick = function(){ isl.nome = nm.value.trim(); isl.type = sel.value; isl.note = ta.value; renderMarkers(); emit(); closeModal(); };
        acts.appendChild(del); acts.appendChild(cancel); acts.appendChild(save);
        card.appendChild(acts);
        setTimeout(function(){ nm.focus(); }, 30);
      });
    }

    function openView(isl){
      var t = typeOf(isl.type);
      openModal(function(card){
        var tag = el("div", "glcmap-typetag"); tag.textContent = t.label; card.appendChild(tag);
        var h = el("h4"); h.textContent = isl.nome || "Isola senza nome"; card.appendChild(h);
        if (isl.note){ var r = el("div", "glcmap-read"); r.textContent = isl.note; card.appendChild(r); }
        else { var p = el("div", "glcmap-read"); p.textContent = "Nessuna nota."; card.appendChild(p); }
        var acts = el("div", "glcmap-acts");
        var close = el("button", "glcmap-btn spacer"); close.type = "button"; close.textContent = "Chiudi"; close.onclick = closeModal;
        acts.appendChild(close); card.appendChild(acts);
      });
    }

    renderToolbar();
    renderMarkers();

    return {
      update: function(islands, readOnly){
        if (islands) st.islands = islands.slice();
        if (readOnly != null) st.readOnly = !!readOnly;
        st.armed = false; canvas.classList.remove("arm");
        renderToolbar(); renderMarkers();
      },
      getIslands: function(){ return st.islands.slice(); }
    };
  }

  window.GLCMap = { mount: mount };
})();
