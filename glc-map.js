/* GLCMap — il mappamondo delle isole (riutilizzabile)
   Un globo vergine da ruotare col mouse; lo zoom lo "appiattisce" come una
   mappa. Si segnano isole ovunque e si disegnano le terre con un pennello.
   Uso:
     var ctrl = GLCMap.mount(containerEl, {
       islands: [...],                 // array {id,x,y,type,nome,note}  (x,y in % equirettangolari)
       land: [...],                    // tratti di terra {r,pts:[[lon,lat],...],e:0|1}
       readOnly: false,                // true => solo navigazione
       islandUrl: function(isl){...},  // link alla scheda isola (facoltativo)
       onChange: function(islands){},  // isole cambiate
       onLand: function(strokes){}     // disegno cambiato
     });
     ctrl.update(islands, readOnly, land);
*/
(function(){
  if (window.GLCMap) return;

  var CSS = ""
  + ".glcmap-wrap{--c-ink:#f1ece0;--c-soft:#a69a86;--c-gold:#f0a441;--c-line:rgba(240,164,65,.25);--c-seal:#e23131;font-family:'Inter',system-ui,sans-serif;}"
  + ".glcmap-toolbar{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:8px;}"
  + ".glcmap-chip{font-family:'Inter',sans-serif;font-weight:500;font-size:11.5px;letter-spacing:.03em;border:1px solid rgba(240,164,65,.3);background:rgba(242,233,216,.05);color:#e9d6ae;border-radius:999px;padding:6px 11px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}"
  + ".glcmap-chip.on{background:linear-gradient(180deg,#ffd394,#f0a441);border-color:var(--c-gold);color:#1b1206;}"
  + ".glcmap-chip svg{width:14px;height:14px;}"
  + ".glcmap-chip:disabled{opacity:.4;cursor:default;}"
  + ".glcmap-hint{font-size:.85rem;color:var(--c-soft);font-style:italic;margin-left:auto;}"
  + ".glcmap-range{display:inline-flex;align-items:center;gap:6px;color:var(--c-soft);font-size:11px;}"
  + ".glcmap-range input{accent-color:#f0a441;width:90px;}"
  + ".glcmap-canvas{position:relative;width:100%;aspect-ratio:25/16;min-height:260px;max-height:82vh;resize:vertical;border-radius:12px;overflow:hidden;border:1px solid var(--c-line);box-shadow:0 12px 28px rgba(0,0,0,.45);user-select:none;background:#05070c;touch-action:none;}"
  + ".glcmap-canvas::after{content:'\\2921';position:absolute;right:5px;bottom:2px;color:rgba(240,164,65,.6);font-size:13px;pointer-events:none;}"
  + ".glcmap-cv{position:absolute;inset:0;width:100%;height:100%;display:block;}"
  + ".glcmap-canvas.nav{cursor:grab;}.glcmap-canvas.nav.drag{cursor:grabbing;}"
  + ".glcmap-canvas.add{cursor:crosshair;}"
  + ".glcmap-canvas.draw,.glcmap-canvas.erase{cursor:cell;}"
  + ".glcmap-overlay{position:absolute;inset:0;pointer-events:none;}"
  + ".glcmap-marker{position:absolute;transform:translate(-50%,-100%);cursor:pointer;display:flex;flex-direction:column;align-items:center;touch-action:none;pointer-events:auto;}"
  + ".glcmap-pin{width:30px;height:30px;border-radius:50% 50% 50% 0;background:var(--mc,#f0a441);transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 8px rgba(0,0,0,.5);border:2px solid #0c0a10;}"
  + ".glcmap-pin svg{width:15px;height:15px;transform:rotate(45deg);color:#0c0a10;}"
  + ".glcmap-lbl{margin-top:3px;font-family:'Inter',sans-serif;font-weight:600;font-size:10.5px;letter-spacing:.02em;color:#f2e9d8;background:rgba(10,9,13,.85);border:1px solid var(--c-line);border-radius:6px;padding:1px 7px;white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 5px rgba(0,0,0,.4);}"
  + ".glcmap-empty{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);color:rgba(242,233,216,.55);font-style:italic;text-align:center;font-size:.85rem;pointer-events:none;padding:0 20px;white-space:nowrap;}"
  + ".glcmap-modal{position:fixed;inset:0;background:rgba(3,3,5,.72);display:flex;align-items:center;justify-content:center;z-index:9000;padding:18px;}"
  + ".glcmap-card{background:linear-gradient(180deg,#16131c,#0e0c12);color:var(--c-ink);border:1px solid var(--c-line);border-radius:16px;padding:18px;width:100%;max-width:380px;box-shadow:0 18px 50px rgba(0,0,0,.6);}"
  + ".glcmap-card h4{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:1.25rem;color:#f2e9d8;margin:0 0 10px;}"
  + ".glcmap-card label{font-family:'Inter',sans-serif;font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:10px;color:var(--c-soft);display:block;margin:10px 0 4px;}"
  + ".glcmap-in{width:100%;font-family:'Inter',sans-serif;font-size:.95rem;color:var(--c-ink);background:rgba(242,233,216,.06);border:1px solid rgba(240,164,65,.28);border-radius:8px;padding:9px 11px;}"
  + "textarea.glcmap-in{resize:vertical;min-height:70px;}"
  + ".glcmap-in:focus{outline:2px solid var(--c-gold);outline-offset:1px;}"
  + ".glcmap-read{white-space:pre-wrap;background:rgba(242,233,216,.05);border:1px solid var(--c-line);border-radius:8px;padding:9px 11px;color:#e9d6ae;}"
  + ".glcmap-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;}"
  + ".glcmap-btn{font-family:'Inter',sans-serif;font-weight:600;font-size:12px;letter-spacing:.04em;border-radius:9px;padding:9px 14px;cursor:pointer;border:1px solid var(--c-gold);background:linear-gradient(180deg,#ffd394,#f0a441);color:#1b1206;text-decoration:none;display:inline-flex;align-items:center;}"
  + ".glcmap-btn.ghost{background:transparent;color:#ffd394;border-color:rgba(240,164,65,.35);}"
  + ".glcmap-btn.danger{background:rgba(226,49,49,.1);border-color:rgba(226,49,49,.45);color:#ff8a7e;}"
  + ".glcmap-btn.spacer{margin-left:auto;}"
  + ".glcmap-typetag{font-family:'Inter',sans-serif;font-weight:500;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--c-gold);margin-bottom:8px;}";

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
    { key:"citta",    label:"Porto/Città", color:"#c9a24a", icon:IC.citta },
    { key:"pericolo", label:"Pericolo",      color:"#b0432f", icon:IC.pericolo },
    { key:"tesoro",   label:"Tesoro",        color:"#d8a72e", icon:IC.tesoro },
    { key:"ancora",   label:"Ancoraggio",    color:"#5f86a0", icon:IC.ancora }
  ];
  function typeOf(k){ for (var i=0;i<TYPES.length;i++) if (TYPES[i].key===k) return TYPES[i]; return TYPES[0]; }
  function uid(){ return "isl"+Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36); }
  function esc(t){ return (t||"").replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function el(tag, cls){ var e=document.createElement(tag); if (cls) e.className=cls; return e; }
  var D2R = Math.PI/180, R2D = 180/Math.PI;
  function clampLat(v){ return Math.max(-85, Math.min(85, v)); }
  function wrapLon(v){ v=((v+180)%360+360)%360-180; return v; }
  /* storage compatibile: x = (lon+180)/3.6 · y = (90−lat)/1.8 (percentuali equirettangolari) */
  function xyToLL(isl){ return { lon:(isl.x||0)*3.6-180, lat:90-(isl.y||0)*1.8 }; }
  function llToXY(lon,lat){ return { x:Math.max(.05,Math.min(99.95,(wrapLon(lon)+180)/3.6)), y:Math.max(.05,Math.min(99.95,(90-clampLat(lat))/1.8)) }; }

  function mount(container, opts){
    injectCSS();
    opts = opts || {};
    var st = {
      islands: (opts.islands || []).slice(),
      strokes: (opts.land || []).slice(),
      readOnly: !!opts.readOnly,
      mode: "nav",              // nav | add | draw | erase
      addType: "isola",
      brush: 22,                // pennello in px a schermo
      view: { lon: 20, lat: 15, zoom: 1 }
    };
    function emit(){ if (opts.onChange) opts.onChange(st.islands.slice()); }
    function emitLand(){ if (opts.onLand) opts.onLand(st.strokes.slice()); }

    container.innerHTML = "";
    var wrap = el("div", "glcmap-wrap");
    var bar1 = el("div", "glcmap-toolbar");
    var bar2 = el("div", "glcmap-toolbar");
    var box  = el("div", "glcmap-canvas nav");
    var cv   = el("canvas", "glcmap-cv");
    var land = document.createElement("canvas"); // layer terre (per la gomma)
    var overlay = el("div", "glcmap-overlay");
    var empty = el("div", "glcmap-empty");
    box.appendChild(cv); box.appendChild(overlay); box.appendChild(empty);
    wrap.appendChild(bar1); wrap.appendChild(bar2); wrap.appendChild(box);
    container.appendChild(wrap);

    var ctx = cv.getContext("2d"), lctx = land.getContext("2d");
    var W=0, H=0, DPR=1;

    /* ---------------- proiezione ortografica ---------------- */
    function radius(){ return 0.42*Math.min(W,H)*st.view.zoom; }
    function project(lon, lat){
      var R=radius(), la=lat*D2R, lo=(lon-st.view.lon)*D2R, f0=st.view.lat*D2R;
      var cosc = Math.sin(f0)*Math.sin(la)+Math.cos(f0)*Math.cos(la)*Math.cos(lo);
      return {
        x: W/2 + R*Math.cos(la)*Math.sin(lo),
        y: H/2 - R*(Math.cos(f0)*Math.sin(la)-Math.sin(f0)*Math.cos(la)*Math.cos(lo)),
        v: cosc > 0.0015
      };
    }
    function invert(px, py){
      var R=radius(), x=(px-W/2)/R, y=-(py-H/2)/R;
      var rho=Math.sqrt(x*x+y*y); if (rho>1) return null;
      var c=Math.asin(Math.min(1,rho)), f0=st.view.lat*D2R;
      var sinc=Math.sin(c), cosc=Math.cos(c);
      var lat=Math.asin(cosc*Math.sin(f0)+(rho? y*sinc*Math.cos(f0)/rho : 0));
      var lon=st.view.lon+Math.atan2(x*sinc, rho*cosc*Math.cos(f0)-y*sinc*Math.sin(f0))*R2D;
      return { lon:wrapLon(lon), lat:lat*R2D };
    }

    /* ---------------- rendering ---------------- */
    function resize(){
      DPR = window.devicePixelRatio||1;
      W = box.clientWidth; H = box.clientHeight;
      if (!W || !H) return;
      cv.width=Math.round(W*DPR); cv.height=Math.round(H*DPR); ctx.setTransform(DPR,0,0,DPR,0,0);
      land.width=cv.width; land.height=cv.height; lctx.setTransform(DPR,0,0,DPR,0,0);
      render();
    }
    function spherePath(c){ c.beginPath(); c.arc(W/2,H/2,radius(),0,2*Math.PI); }

    function polyline(c, pts){
      var pen=false;
      c.beginPath();
      for (var i=0;i<pts.length;i++){
        var p=project(pts[i][0],pts[i][1]);
        if (p.v){ if(pen) c.lineTo(p.x,p.y); else { c.moveTo(p.x,p.y); pen=true; } }
        else pen=false;
      }
      c.stroke();
    }

    function drawGraticule(){
      var step = st.view.zoom>8 ? 2 : (st.view.zoom>3 ? 5 : 15);
      var samp = step/3;
      ctx.strokeStyle="rgba(240,164,65,.13)"; ctx.lineWidth=1;
      var lon0=Math.round(st.view.lon/step)*step, lat0=Math.round(st.view.lat/step)*step;
      var span = st.view.zoom>3 ? Math.max(20, 200/st.view.zoom) : 180;
      var pts, lo, la;
      for (lo=lon0-span; lo<=lon0+span; lo+=step){
        pts=[]; for (la=-85; la<=85; la+=samp) pts.push([lo,la]); polyline(ctx,pts);
      }
      for (la=Math.max(-85,lat0-span); la<=Math.min(85,lat0+span); la+=step){
        pts=[]; for (lo=lon0-span; lo<=lon0+span; lo+=samp) pts.push([lo,la]); polyline(ctx,pts);
      }
      // equatore e "Linea Rossa" appena più marcati
      ctx.strokeStyle="rgba(240,164,65,.26)"; ctx.lineWidth=1.2;
      pts=[]; for (lo=lon0-span;lo<=lon0+span;lo+=samp) pts.push([lo,0]); polyline(ctx,pts);
      ctx.strokeStyle="rgba(226,49,49,.26)";
      pts=[]; for (la=-85;la<=85;la+=samp) pts.push([0,la]); polyline(ctx,pts);
    }

    function drawLand(){
      lctx.clearRect(0,0,W,H);
      for (var s=0;s<st.strokes.length;s++){
        var stk=st.strokes[s];
        var wpx=Math.max(2, (stk.r||1)*D2R*radius()*2);
        lctx.globalCompositeOperation = stk.e ? "destination-out" : "source-over";
        lctx.strokeStyle="#4c7a5d"; lctx.fillStyle="#4c7a5d";
        lctx.lineWidth=wpx; lctx.lineCap="round"; lctx.lineJoin="round";
        var pts=stk.pts||[];
        if (pts.length===1){
          var p1=project(pts[0][0],pts[0][1]);
          if (p1.v){ lctx.beginPath(); lctx.arc(p1.x,p1.y,wpx/2,0,2*Math.PI); lctx.fill(); }
          continue;
        }
        var pen=false;
        lctx.beginPath();
        for (var i=0;i<pts.length;i++){
          var p=project(pts[i][0],pts[i][1]);
          if (p.v){ if(pen) lctx.lineTo(p.x,p.y); else { lctx.moveTo(p.x,p.y); pen=true; } }
          else pen=false;
        }
        lctx.stroke();
      }
      // velo "battigia" sopra la terra disegnata
      lctx.globalCompositeOperation="source-atop";
      lctx.fillStyle="rgba(233,214,174,.14)"; lctx.fillRect(0,0,W,H);
      lctx.globalCompositeOperation="source-over";
    }

    function render(){
      if (!W || !H) return;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle="#05070c"; ctx.fillRect(0,0,W,H);      // cielo
      var R=radius();
      ctx.save(); spherePath(ctx); ctx.clip();
      var g=ctx.createRadialGradient(W/2-R*.25,H/2-R*.3,R*.1, W/2,H/2,R);
      g.addColorStop(0,"#13203a"); g.addColorStop(.6,"#0a0e1c"); g.addColorStop(1,"#060810");
      ctx.fillStyle=g; spherePath(ctx); ctx.fill();          // mare
      drawGraticule();
      drawLand();
      ctx.drawImage(land,0,0,W,H);                           // terre
      ctx.restore();
      ctx.strokeStyle="rgba(240,164,65,.4)"; ctx.lineWidth=1.5; spherePath(ctx); ctx.stroke(); // lembo
      placeMarkers();
      empty.textContent = st.islands.length ? "" :
        (st.readOnly ? "Nessuna isola segnata. Trascina per ruotare il mondo, rotella per lo zoom."
                     : "Trascina per ruotare · rotella per lo zoom · disegna le terre · segna le isole");
    }

    /* ---------------- marker HTML ---------------- */
    var markerEls = {};
    function buildMarkers(){
      overlay.innerHTML=""; markerEls={};
      st.islands.forEach(function(isl){ overlay.appendChild(markerEl(isl)); });
    }
    function placeMarkers(){
      st.islands.forEach(function(isl){
        var m=markerEls[isl.id]; if(!m) return;
        var ll=xyToLL(isl), p=project(ll.lon,ll.lat);
        if (p.v && p.x>-40 && p.x<W+40 && p.y>-10 && p.y<H+50){ m.style.display="flex"; m.style.left=p.x+"px"; m.style.top=p.y+"px"; }
        else m.style.display="none";
      });
    }
    function markerEl(isl){
      var t=typeOf(isl.type);
      var m=el("div","glcmap-marker"); markerEls[isl.id]=m;
      m.innerHTML='<div class="glcmap-pin" style="--mc:'+t.color+'">'+t.icon+'</div>'
                + (isl.nome ? '<div class="glcmap-lbl">'+esc(isl.nome)+'</div>' : '');
      if (st.readOnly){ m.addEventListener("click", function(){ openView(isl); }); return m; }
      m.addEventListener("pointerdown", function(e){
        e.preventDefault(); e.stopPropagation();
        var moved=false;
        try{ m.setPointerCapture(e.pointerId); }catch(_){ }
        function move(ev){
          moved=true;
          var r=box.getBoundingClientRect();
          var ll=invert(ev.clientX-r.left, ev.clientY-r.top);
          if(!ll) return;
          var xy=llToXY(ll.lon,ll.lat); isl.x=xy.x; isl.y=xy.y;
          placeMarkers();
        }
        function up(){
          m.removeEventListener("pointermove",move); m.removeEventListener("pointerup",up);
          if(moved) emit(); else openEditor(isl,false);
        }
        m.addEventListener("pointermove",move); m.addEventListener("pointerup",up);
      });
      return m;
    }

    /* ---------------- interazione: ruota, zoom, disegna ---------------- */
    var drag=null; // {kind:'nav'|'draw', last:{x,y}, moved, stroke}
    box.addEventListener("pointerdown", function(e){
      if (e.target.closest(".glcmap-marker")) return;
      var r=box.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
      if (!st.readOnly && (st.mode==="draw"||st.mode==="erase")){
        var ll=invert(px,py); if(!ll) return;
        var rdeg=(st.brush/radius())*R2D;
        drag={kind:"draw", stroke:{r:+rdeg.toFixed(3), e:(st.mode==="erase"?1:0), pts:[[+ll.lon.toFixed(2),+ll.lat.toFixed(2)]]}};
        st.strokes.push(drag.stroke);
        try{ box.setPointerCapture(e.pointerId); }catch(_){ }
        render();
        return;
      }
      drag={kind:"nav", last:{x:px,y:py}, moved:false};
      box.classList.add("drag");
      try{ box.setPointerCapture(e.pointerId); }catch(_){ }
    });
    box.addEventListener("pointermove", function(e){
      if(!drag) return;
      var r=box.getBoundingClientRect(), px=e.clientX-r.left, py=e.clientY-r.top;
      if (drag.kind==="draw"){
        var ll=invert(px,py); if(!ll) return;
        var pts=drag.stroke.pts, lastp=pts[pts.length-1];
        if (Math.abs(ll.lon-lastp[0])+Math.abs(ll.lat-lastp[1]) > (st.brush/radius())*R2D/4){
          pts.push([+ll.lon.toFixed(2),+ll.lat.toFixed(2)]); render();
        }
        return;
      }
      var dx=px-drag.last.x, dy=py-drag.last.y;
      if (Math.abs(dx)+Math.abs(dy)>3) drag.moved=true;
      var R=radius();
      st.view.lon = wrapLon(st.view.lon - dx/R*R2D);
      st.view.lat = clampLat(st.view.lat + dy/R*R2D);
      drag.last={x:px,y:py};
      render();
    });
    box.addEventListener("pointerup", function(e){
      if(!drag) return;
      var wasNav=(drag.kind==="nav"), moved=drag.moved, wasDraw=(drag.kind==="draw");
      box.classList.remove("drag");
      drag=null;
      if (wasDraw){ emitLand(); return; }
      if (wasNav && !moved && !st.readOnly && st.mode==="add"){
        var r=box.getBoundingClientRect();
        var ll=invert(e.clientX-r.left, e.clientY-r.top); if(!ll) return;
        var xy=llToXY(ll.lon,ll.lat);
        var isl={ id:uid(), x:xy.x, y:xy.y, type:st.addType, nome:"", note:"" };
        st.islands.push(isl);
        setMode("nav");
        buildMarkers(); render(); emit();
        openEditor(isl,true);
      }
    });
    box.addEventListener("wheel", function(e){
      e.preventDefault();
      var f=Math.exp(-e.deltaY*0.0012);
      st.view.zoom=Math.max(.6,Math.min(60,st.view.zoom*f));
      render();
    }, {passive:false});

    /* ---------------- toolbar ---------------- */
    var hint=el("span","glcmap-hint");
    function chip(txt, on, fn, title){
      var c=el("button","glcmap-chip"+(on?" on":"")); c.type="button"; c.innerHTML=txt; c.onclick=fn; if(title)c.title=title; return c;
    }
    function setMode(m){ st.mode=m; box.className="glcmap-canvas "+m; renderToolbar(); }
    function renderToolbar(){
      bar1.innerHTML=""; bar2.innerHTML="";
      var zOut=chip("−",false,function(){ st.view.zoom=Math.max(.6,st.view.zoom/1.5); render(); },"Riduci zoom");
      var zIn =chip("+",false,function(){ st.view.zoom=Math.min(60,st.view.zoom*1.5); render(); },"Aumenta zoom");
      var home=chip("⟲ Mondo",false,function(){ st.view={lon:20,lat:15,zoom:1}; render(); },"Vista intera");
      if (st.readOnly){
        bar1.appendChild(zOut); bar1.appendChild(zIn); bar1.appendChild(home);
        var note=el("span","glcmap-hint"); note.style.marginLeft="0";
        note.textContent="Mappa della campagna — la aggiorna il Game Master.";
        bar1.appendChild(note);
        return;
      }
      bar1.appendChild(chip("🖐 Naviga", st.mode==="nav", function(){ setMode("nav"); }));
      bar1.appendChild(chip("📍 Segna isola", st.mode==="add", function(){ setMode(st.mode==="add"?"nav":"add"); }));
      bar1.appendChild(chip("✏️ Disegna terra", st.mode==="draw", function(){ setMode(st.mode==="draw"?"nav":"draw"); }));
      bar1.appendChild(chip("⌫ Gomma", st.mode==="erase", function(){ setMode(st.mode==="erase"?"nav":"erase"); }));
      var undo=chip("↶",false,function(){ st.strokes.pop(); render(); emitLand(); renderToolbar(); },"Annulla ultimo tratto");
      undo.disabled=!st.strokes.length; bar1.appendChild(undo);
      bar1.appendChild(zOut); bar1.appendChild(zIn); bar1.appendChild(home);
      if (st.mode==="add"){
        TYPES.forEach(function(t){
          var c=chip('<span style="color:'+t.color+'">'+t.icon+"</span>"+t.label, st.addType===t.key, function(){ st.addType=t.key; renderToolbar(); });
          bar2.appendChild(c);
        });
        hint.textContent="Tocca il mondo per segnare un luogo…";
        bar2.appendChild(hint);
      } else if (st.mode==="draw"||st.mode==="erase"){
        var rng=el("span","glcmap-range");
        rng.appendChild(document.createTextNode("Pennello "));
        var inp=document.createElement("input"); inp.type="range"; inp.min="6"; inp.max="70"; inp.value=st.brush;
        inp.oninput=function(){ st.brush=+inp.value; };
        rng.appendChild(inp);
        bar2.appendChild(rng);
        hint.textContent = st.mode==="draw" ? "Trascina sul mondo per far emergere la terra…" : "Trascina per cancellare la terra…";
        bar2.appendChild(hint);
      }
    }

    /* ---------------- modali (scheda rapida isola) ---------------- */
    var modal=null;
    function closeModal(){ if(modal){ modal.remove(); modal=null; } }
    function openModal(buildCard){
      closeModal();
      modal=el("div","glcmap-modal");
      var card=el("div","glcmap-card");
      buildCard(card);
      modal.appendChild(card);
      modal.addEventListener("click",function(e){ if(e.target===modal) closeModal(); });
      document.body.appendChild(modal);
      return card;
    }
    function openEditor(isl,isNew){
      openModal(function(card){
        var h=el("h4"); h.textContent=isNew?"Nuova isola":"Modifica isola"; card.appendChild(h);
        var lN=el("label"); lN.textContent="Nome"; card.appendChild(lN);
        var nm=el("input","glcmap-in"); nm.type="text"; nm.placeholder="es. Isola di…"; nm.value=isl.nome||""; card.appendChild(nm);
        var lT=el("label"); lT.textContent="Tipo"; card.appendChild(lT);
        var sel=el("select","glcmap-in");
        TYPES.forEach(function(t){ var o=document.createElement("option"); o.value=t.key; o.textContent=t.label; sel.appendChild(o); });
        sel.value=isl.type; card.appendChild(sel);
        var lD=el("label"); lD.textContent="Note"; card.appendChild(lD);
        var ta=el("textarea","glcmap-in"); ta.placeholder="Cosa c'è qui, cosa è successo, chi avete incontrato…"; ta.value=isl.note||""; card.appendChild(ta);
        var acts=el("div","glcmap-acts");
        var del=el("button","glcmap-btn danger"); del.type="button"; del.textContent="Elimina";
        del.onclick=function(){ st.islands=st.islands.filter(function(x){ return x!==isl; }); buildMarkers(); render(); emit(); closeModal(); };
        acts.appendChild(del);
        if (opts.islandUrl){
          var open=el("a","glcmap-btn ghost"); open.textContent="Scheda isola ↗";
          open.href=opts.islandUrl(isl);
          open.onclick=function(){ isl.nome=nm.value.trim(); isl.type=sel.value; isl.note=ta.value; emit(); };
          acts.appendChild(open);
        }
        var cancel=el("button","glcmap-btn ghost spacer"); cancel.type="button"; cancel.textContent="Chiudi"; cancel.onclick=closeModal;
        var save=el("button","glcmap-btn"); save.type="button"; save.textContent="Salva";
        save.onclick=function(){ isl.nome=nm.value.trim(); isl.type=sel.value; isl.note=ta.value; buildMarkers(); render(); emit(); closeModal(); };
        acts.appendChild(cancel); acts.appendChild(save);
        card.appendChild(acts);
        setTimeout(function(){ nm.focus(); },30);
      });
    }
    function openView(isl){
      var t=typeOf(isl.type);
      openModal(function(card){
        var tag=el("div","glcmap-typetag"); tag.textContent=t.label; card.appendChild(tag);
        var h=el("h4"); h.textContent=isl.nome||"Isola senza nome"; card.appendChild(h);
        var r=el("div","glcmap-read"); r.textContent=isl.note||"Nessuna nota."; card.appendChild(r);
        var acts=el("div","glcmap-acts");
        if (opts.islandUrl){
          var open=el("a","glcmap-btn ghost"); open.textContent="Scheda isola ↗";
          open.href=opts.islandUrl(isl);
          acts.appendChild(open);
        }
        var close=el("button","glcmap-btn spacer"); close.type="button"; close.textContent="Chiudi"; close.onclick=closeModal;
        acts.appendChild(close); card.appendChild(acts);
      });
    }

    /* ---------------- avvio ---------------- */
    renderToolbar();
    buildMarkers();
    if (window.ResizeObserver){ new ResizeObserver(function(){ resize(); }).observe(box); }
    window.addEventListener("resize", resize);
    resize();
    // il contenitore può arrivare in pagina (o avere layout) dopo il mount: riprova finché non ha misure
    (function waitSize(tries){
      if ((box.clientWidth||0)>0 && (box.clientHeight||0)>0){ resize(); return; }
      setTimeout(function(){ waitSize(tries+1); }, tries<80 ? 100 : 1000);
    })(0);

    return {
      update: function(islands, readOnly, landStrokes){
        if (islands) st.islands=islands.slice();
        if (readOnly!=null) st.readOnly=!!readOnly;
        if (landStrokes) st.strokes=landStrokes.slice();
        st.mode="nav"; box.className="glcmap-canvas nav";
        renderToolbar(); buildMarkers(); render();
      },
      getIslands: function(){ return st.islands.slice(); },
      getLand: function(){ return st.strokes.slice(); }
    };
  }

  window.GLCMap = { mount: mount };
})();
