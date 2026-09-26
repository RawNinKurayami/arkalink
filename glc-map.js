/* GLCMap — atlante della ciurma. Existing x/y markers and mapLand strokes remain compatible.
   Optional onSave({islands,land}) returns false/rejects on failure; legacy callbacks remain supported.
   New cartographic strokes use k: mountain|forest|river|label; all coordinates are geographic. */
(function(){
  'use strict';
  if(window.GLCMap)return;
  function injectCSS(){if(document.getElementById('glcmap-css'))return;var l=document.createElement('link');l.id='glcmap-css';l.rel='stylesheet';l.href='/glc-map.css?v=3';document.head.appendChild(l);}
  var IC = {
    isola:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c3 0 5 2 6 6 3 1 4 3 4 3H2s1-2 4-3c1-4 3-6 6-6z"/><path d="M2 16h20v2H2zM4 20h16v1.5H4z" opacity=".7"/></svg>',
    citta:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 21V9l5-3 5 3v2h6v10H4zm12-8v8h4v-8h-4z"/></svg>',
    pericolo:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 6l6.5 11h-13L12 8zm-1 4h2v3h-2zm0 4h2v2h-2z"/></svg>',
    tesoro: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8h18v11H3zM3 8l2-3h14l2 3M11 12h2v2h-2z"/></svg>',
    ancora: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2.2 2.2 0 100 4.4A2.2 2.2 0 0012 2zm-1 6h2v9.2c2-.4 3.5-1.7 4-3.6l1.8.5C18 17.4 15.5 19.4 12 19.7V8zm1 11.7C8.5 19.4 6 17.4 5.2 14.6L7 14.1c.5 1.9 2 3.2 4 3.6V8h1v11.7z"/></svg>',
    bosco:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l5 7h-3.2l4.2 6.5H14V20h-4v-4.5H6L10.2 9H7z"/></svg>',
    foresta:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 4l3.6 5.4H9.4L12.4 14H9v4H7v-4H3.6l3-4.6H4.4z"/><path d="M16.5 7l3 4.6h-1.8l2.5 4H17.5V19h-2v-3.4h-2.7l2.5-4h-1.8z" opacity=".85"/></svg>',
    lago:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c3.8 4.6 6.5 7.6 6.5 11a6.5 6.5 0 0 1-13 0C5.5 10.6 8.2 7.6 12 3z"/></svg>',
    montagna:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 20L9 7l3.2 5.4L14.5 9 22 20z"/></svg>'
  };
  var TYPES = [
    { key:"isola",    label:"Isola",         color:"#5e8d6e", icon:IC.isola },
    { key:"citta",    label:"Porto/Città", color:"#c9a24a", icon:IC.citta },
    { key:"pericolo", label:"Pericolo",      color:"#b0432f", icon:IC.pericolo },
    { key:"tesoro",   label:"Tesoro",        color:"#d8a72e", icon:IC.tesoro },
    { key:"ancora",   label:"Ancoraggio",    color:"#5f86a0", icon:IC.ancora },
    { key:"bosco",    label:"Bosco",         color:"#5e8d4e", icon:IC.bosco },
    { key:"foresta",  label:"Foresta",       color:"#3e6b40", icon:IC.foresta },
    { key:"lago",     label:"Lago",          color:"#4e7ca8", icon:IC.lago },
    { key:"montagna", label:"Montagna",      color:"#8a8578", icon:IC.montagna }
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

  var clone=function(v){return JSON.parse(JSON.stringify(v));};
  var TOOL_ICONS={nav:'✥',draw:'◇',mountain:'△',forest:'♧',river:'≈',route:'⌁',erase:'⌫',label:'Aa',add:'⊕'};
  function mount(container,opts){
    injectCSS();opts=opts||{};
    if(container._glcmap)container._glcmap.destroy();
    var st={islands:clone(opts.islands||[]),strokes:clone(opts.land||[]),readOnly:!!opts.readOnly,mode:'nav',addType:'isola',brush:22,view:{lon:20,lat:15,zoom:1},grid:false,placing:null};
    if(opts.focusId){var initial=st.islands.find(function(i){return i.id===opts.focusId;});if(initial){var ll=xyToLL(initial);st.view={lon:ll.lon,lat:clampLat(ll.lat),zoom:4};}}
    var destroyed=false,W=0,H=0,DPR=1,frame=0,ro,modal=null,oldFocus=null,expanded=false,priorOverflow='',resizeTimer;
    var undoStack=[],redoStack=[],pending=null,saving=null,saveFailed=false,saveSequence=0;
    var wrap=el('section','glcmap-wrap');wrap.setAttribute('aria-label','Atlante della ciurma');
    var head=el('div','glcmap-head'),heading=el('div');heading.innerHTML='<div class="glcmap-kicker">Il mondo che scoprite, insieme</div><h2 class="glcmap-title">Atlante della ciurma</h2>';head.appendChild(heading);
    var headActions=el('div','glcmap-head-actions');head.appendChild(headActions);wrap.appendChild(head);
    var layout=el('div','glcmap-layout'),stage=el('div','glcmap-stage');layout.appendChild(stage);wrap.appendChild(layout);
    var bar1=el('div','glcmap-tools'),bar2=el('div','glcmap-controls');bar1.setAttribute('aria-label','Strumenti cartografici');stage.appendChild(bar1);stage.appendChild(bar2);
    var box=el('div','glcmap-canvas nav');box.tabIndex=0;box.setAttribute('role','region');box.setAttribute('aria-label','Mappamondo: trascina per ruotare, usa più e meno per lo zoom');
    var cv=el('canvas','glcmap-cv');cv.setAttribute('aria-hidden','true');var overlay=el('div','glcmap-overlay');
    box.appendChild(cv);box.appendChild(overlay);stage.appendChild(box);
    var scale=el('span','glcmap-scale'),cursor=el('div','glcmap-cursor'),zoomBar=el('div','glcmap-zoom');box.appendChild(scale);box.appendChild(cursor);box.appendChild(zoomBar);
    var compass=el('div','glcmap-compass');compass.setAttribute('aria-hidden','true');compass.innerHTML='<svg viewBox="0 0 100 100" fill="none" stroke="currentColor"><circle cx="50" cy="50" r="28" opacity=".5"/><circle cx="50" cy="50" r="23" opacity=".4"/><path d="M50 12L56 44L86 50L56 56L50 88L44 56L14 50L44 44Z"/><path d="M50 12V88M14 50H86M30 30L70 70M70 30L30 70" opacity=".6"/><path d="M50 12L50 50L44 44Z" fill="currentColor"/><text x="50" y="8" text-anchor="middle" fill="currentColor" stroke="none" font-family="Georgia" font-size="11">N</text></svg>';box.appendChild(compass);
    var foot=el('div','glcmap-foot'),instructions=el('span');instructions.textContent='Trascina per esplorare · due dita o rotella per avvicinarti';var saveStatus=el('span','glcmap-status');saveStatus.setAttribute('role','status');var retry=button('Riprova',function(){saveFailed=false;flush();},'glcmap-retry');retry.hidden=true;foot.append(instructions,saveStatus,retry);stage.appendChild(foot);
    var index=el('aside','glcmap-index');index.innerHTML='<div class="glcmap-kicker">Le vostre scoperte</div><h3>Luoghi del viaggio</h3><p>Ritrova un luogo e apri il suo taccuino. Ogni scoperta ha una pagina tutta sua.</p>';
    var search=el('input','glcmap-search');search.type='search';search.placeholder='Cerca un luogo…';search.setAttribute('aria-label','Cerca un luogo');var places=el('div','glcmap-places');index.append(search,places);layout.appendChild(index);
    container.replaceChildren(wrap);
    var ctx=cv.getContext('2d'),layer=document.createElement('canvas'),lc=layer.getContext('2d');
    var paper=document.createElement('canvas');paper.width=paper.height=256;var pc=paper.getContext('2d'),rng=12345;
    function random(){rng=(rng*1664525+1013904223)>>>0;return rng/4294967296;}
    for(var i=0;i<5500;i++){pc.fillStyle=random()>.5?'rgba(90,61,26,.035)':'rgba(255,251,229,.08)';var n=random()*1.4;pc.fillRect(random()*256,random()*256,n,n);}
    var paperPattern=ctx.createPattern(paper,'repeat');
    function button(text,fn,cls){var b=el('button',cls||'glcmap-chip');b.type='button';b.textContent=text;b.onclick=fn;return b;}
    function snapshot(){return clone({islands:st.islands,land:st.strokes});}
    function remember(){undoStack.push(snapshot());if(undoStack.length>60)undoStack.shift();redoStack=[];}
    function changed(){queueSave();buildMarkers();renderIndex();renderToolbar();requestRender();}
    function queueSave(){pending={seq:++saveSequence,data:snapshot()};saveStatus.textContent='Salvataggio…';saveStatus.className='glcmap-status';retry.hidden=true;saveFailed=false;return flush();}
    function flush(){
      if(saving)return saving;if(!pending||saveFailed)return Promise.resolve(!saveFailed);
      saving=(async function(){while(pending&&!saveFailed){var job=pending;pending=null;try{
        var ok;
        if(opts.onSave)ok=await opts.onSave(clone(job.data));
        else {if(opts.onChange){ok=await opts.onChange(clone(job.data.islands));if(ok===false)throw Error('Salvataggio non riuscito');}if(opts.onLand)ok=await opts.onLand(clone(job.data.land));}
        if(ok===false)throw Error('Salvataggio non riuscito');
      }catch(e){if(!pending)pending=job;saveFailed=true;saveStatus.textContent='Non salvato: '+(e.message||'riprova');saveStatus.className='glcmap-status error';retry.hidden=false;return false;}}
      if(!destroyed){saveStatus.textContent=st.readOnly?'Sola lettura':'Atlante salvato';saveStatus.className='glcmap-status';}return true;})().finally(function(){saving=null;});return saving;
    }
    function historyMove(from,to){if(st.readOnly||!from.length)return;to.push(snapshot());var snap=from.pop();st.islands=snap.islands;st.strokes=snap.land;changed();}
    function radius(){return .42*Math.min(W,H)*st.view.zoom;}
    function project(lon,lat){var R=radius(),a=lat*D2R,b=(lon-st.view.lon)*D2R,c=st.view.lat*D2R;var z=Math.sin(c)*Math.sin(a)+Math.cos(c)*Math.cos(a)*Math.cos(b);return{x:W/2+R*Math.cos(a)*Math.sin(b),y:H/2-R*(Math.cos(c)*Math.sin(a)-Math.sin(c)*Math.cos(a)*Math.cos(b)),z:z,v:z>=0};}
    function invert(x,y){var R=radius();x=(x-W/2)/R;y=-(y-H/2)/R;var q=Math.hypot(x,y);if(q>1)return null;var c=Math.asin(Math.min(1,q)),f=st.view.lat*D2R;return{lon:wrapLon(st.view.lon+Math.atan2(x*Math.sin(c),q*Math.cos(c)*Math.cos(f)-y*Math.sin(c)*Math.sin(f))*R2D),lat:Math.asin(Math.cos(c)*Math.sin(f)+(q?y*Math.sin(c)*Math.cos(f)/q:0))*R2D};}
    function sphere(c){c.beginPath();c.arc(W/2,H/2,radius(),0,Math.PI*2);}
    function resize(){if(destroyed)return;W=box.clientWidth;H=box.clientHeight;if(!W||!H)return;DPR=Math.min(window.devicePixelRatio||1,2);cv.width=layer.width=Math.round(W*DPR);cv.height=layer.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);lc.setTransform(DPR,0,0,DPR,0,0);requestRender();}
    function requestRender(){if(!frame&&!destroyed)frame=requestAnimationFrame(function(){frame=0;render();});}
    function zoomBy(f,px,py){var before=invert(px==null?W/2:px,py==null?H/2:py);st.view.zoom=Math.max(.7,Math.min(60,st.view.zoom*f));if(before&&px!=null){for(var j=0;j<3;j++){var after=invert(px,py);if(!after)break;st.view.lon=wrapLon(st.view.lon+wrapLon(before.lon-after.lon));st.view.lat=clampLat(st.view.lat+before.lat-after.lat);}}requestRender();}
    // Subdivide in geographical space using the shortest longitude arc. No seam across the date line.
    function sampled(pts,closed){var out=[];if(!pts.length)return out;var count=closed?pts.length:pts.length-1;
      for(var i=0;i<count;i++){var a=pts[i],b=pts[(i+1)%pts.length],dl=wrapLon(b[0]-a[0]),dy=b[1]-a[1],steps=Math.max(1,Math.ceil(Math.max(Math.abs(dl),Math.abs(dy))/2));for(var j=0;j<steps;j++)out.push(project(a[0]+dl*j/steps,a[1]+dy*j/steps));}if(!closed)out.push(project(pts[pts.length-1][0],pts[pts.length-1][1]));return out;}
    function trace(c,pts,closed){var p=sampled(pts,closed);if(!p.some(function(x){return x.v;}))return false;c.beginPath();var start=p.findIndex(function(x){return x.v;}),pen=false,exit=null;
      if(closed){p=p.slice(start).concat(p.slice(0,start));p.push(p[0]);}
      for(var i=0;i<p.length;i++){var a=p[i],prev=p[i-1];if(a.v){if(!pen){if(closed&&exit){var aa=Math.atan2(exit.y-H/2,exit.x-W/2),bb=Math.atan2(a.y-H/2,a.x-W/2),delta=((bb-aa+Math.PI*3)%(Math.PI*2))-Math.PI;c.arc(W/2,H/2,radius(),aa,aa+delta,delta<0);c.lineTo(a.x,a.y);}else c.moveTo(a.x,a.y);pen=true;}else c.lineTo(a.x,a.y);}else if(pen){exit=prev;pen=false;}}
      if(closed)c.closePath();return true;}
    function graticule(){if(!st.grid)return;ctx.save();ctx.strokeStyle='#755a3920';ctx.lineWidth=.65;var step=st.view.zoom>7?5:15;for(var lo=-180;lo<180;lo+=step){var ps=[];for(var la=-90;la<=90;la+=2)ps.push([lo,la]);trace(ctx,ps,false);ctx.stroke();}for(var la=-75;la<=75;la+=step){var ps=[];for(var lo=-180;lo<=180;lo+=2)ps.push([lo,la]);trace(ctx,ps,false);ctx.stroke();}ctx.restore();}
    function drawSymbol(c,k,x,y,size,seed){c.save();c.translate(x,y);c.scale(size/18,size/18);c.lineCap='round';c.lineJoin='round';c.strokeStyle='#58462f';c.fillStyle='#e9d8b3';c.lineWidth=.9;
      if(k==='mountain'){var h=15+(seed%5);c.beginPath();c.moveTo(-15,8);c.lineTo(-4,-h);c.lineTo(3,-8);c.lineTo(7,-12);c.lineTo(18,8);c.lineTo(9,6);c.lineTo(2,9);c.lineTo(-7,6);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(-4,-h);c.lineTo(-3,-3);c.lineTo(4,5);c.moveTo(-4,-h);c.lineTo(-10,3);c.moveTo(-4,-h+9);c.lineTo(-.5,-5);c.moveTo(7,-12);c.lineTo(8,0);c.stroke();c.lineWidth=.5;for(var q=0;q<4;q++){c.beginPath();c.moveTo(-4+q,-5+q*3);c.lineTo(-2+q,-1+q*3);c.stroke();}}
      else{for(var q=0;q<3;q++){var xx=(q-1)*10,yy=q===1?-5:1;c.beginPath();c.moveTo(xx,yy-13);c.lineTo(xx-6,yy-3);c.lineTo(xx-3,yy-3);c.lineTo(xx-8,yy+4);c.quadraticCurveTo(xx,yy+7,xx+8,yy+4);c.lineTo(xx+3,yy-3);c.lineTo(xx+6,yy-3);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(xx,yy+5);c.lineTo(xx,yy+10);c.stroke();}}
      c.restore();}
    function drawStrokes(){lc.clearRect(0,0,W,H);lc.save();sphere(lc);lc.clip();lc.lineCap=lc.lineJoin='round';
      st.strokes.forEach(function(s,si){var pts=s.pts||[];if(!pts.length)return;lc.save();var size=(s.r||1)*D2R*radius();
        if(s.e){lc.globalCompositeOperation='destination-out';lc.fillStyle='#000';lc.strokeStyle='#000';lc.lineWidth=Math.max(4,size*2);if(pts.length===1){var p=project(pts[0][0],pts[0][1]);if(p.v){lc.beginPath();lc.arc(p.x,p.y,size,0,Math.PI*2);lc.fill();}}else if(trace(lc,pts,false))lc.stroke();}
        else if(s.k==='mountain'||s.k==='forest'){var sz=Math.min(110,size),stride=sz<5?3:1;if(sz>=2)pts.forEach(function(ll,j){if(j%stride)return;var p=project(ll[0],ll[1]);if(p.v&&p.x>-sz*2&&p.y>-sz*2&&p.x<W+sz*2&&p.y<H+sz*2){lc.globalAlpha=Math.min(1,p.z*6);drawSymbol(lc,s.k,p.x,p.y,sz,si+j);}});}
        else if(s.k==='label'){if(size<5){lc.restore();return;}var p=project(pts[0][0],pts[0][1]);if(p.v){lc.textAlign='center';lc.font='500 '+Math.max(11,Math.min(32,size))+'px Georgia';lc.fillStyle='#5b4932';lc.strokeStyle='#ebdab6aa';lc.lineWidth=3;lc.strokeText(String(s.text||'').slice(0,70),p.x,p.y);lc.fillText(String(s.text||'').slice(0,70),p.x,p.y);}}
        else if(s.t||s.k==='river'){if(trace(lc,pts,false)){lc.strokeStyle=s.t?'#985a3e':'#617783';lc.lineWidth=s.t?1.5:Math.max(1,Math.min(3,size/9));if(s.t)lc.setLineDash([5,6]);lc.stroke();}}
        else if(pts.length===1){var p=project(pts[0][0],pts[0][1]);if(p.v){lc.beginPath();lc.arc(p.x,p.y,Math.max(2,size/2),0,Math.PI*2);lc.fillStyle='#efdfbb';lc.fill();lc.strokeStyle='#685035';lc.lineWidth=1;lc.stroke();}}
        else if(trace(lc,pts,!!s.f)){lc.strokeStyle='#795a3833';lc.lineWidth=8;lc.stroke();if(s.f){lc.fillStyle='#f0e2c1';lc.fill();}lc.strokeStyle='#523d27';lc.lineWidth=1.25;lc.stroke();lc.strokeStyle='#f9edce';lc.lineWidth=.3;lc.stroke();}
        lc.restore();
      });lc.restore();ctx.drawImage(layer,0,0,W,H);}
    function render(){if(!W||!H||destroyed)return;ctx.clearRect(0,0,W,H);var R=radius();var backdrop=ctx.createRadialGradient(W*.5,H*.5,20,W*.5,H*.5,Math.max(W,H)*.7);backdrop.addColorStop(0,'#2c2822');backdrop.addColorStop(1,'#101115');ctx.fillStyle=backdrop;ctx.fillRect(0,0,W,H);
      if(st.view.zoom<1.7){ctx.save();ctx.translate(W/2,H/2);ctx.strokeStyle='#c3a77c25';ctx.lineWidth=1;[1.06,1.14].forEach(function(f){ctx.beginPath();ctx.arc(0,0,R*f,0,Math.PI*2);ctx.stroke();});for(var a=0;a<360;a+=5){ctx.save();ctx.rotate(a*D2R);ctx.beginPath();ctx.moveTo(0,-R*1.06);ctx.lineTo(0,-R*(a%30===0?1.105:1.08));ctx.stroke();ctx.restore();}ctx.restore();}
      ctx.save();sphere(ctx);ctx.clip();var sea=ctx.createRadialGradient(W/2-R*.2,H/2-R*.2,0,W/2,H/2,R);sea.addColorStop(0,'#e7d4af');sea.addColorStop(.7,'#deca9f');sea.addColorStop(1,'#c0a47a');ctx.fillStyle=sea;ctx.fillRect(0,0,W,H);graticule();drawStrokes();ctx.fillStyle=paperPattern;ctx.fillRect(0,0,W,H);var shade=ctx.createRadialGradient(W/2,H/2,R*.5,W/2,H/2,R);shade.addColorStop(0,'#3e2c1300');shade.addColorStop(1,'#3e2c1340');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);ctx.restore();ctx.strokeStyle='#b9a076';ctx.lineWidth=1;sphere(ctx);ctx.stroke();
      placeMarkers();scale.textContent=(st.view.zoom<2?'MAPPAMONDO':st.view.zoom<8?'CARTA REGIONALE':'CARTA LOCALE')+' · '+st.view.zoom.toFixed(1)+'×';compass.style.color=st.view.zoom<1.7?'#c1a373':'#624a2c';
    }
    var markerEls=new Map();
    function buildMarkers(){overlay.replaceChildren();markerEls.clear();st.islands.forEach(function(isl){var t=typeOf(isl.type),b=button('',null,'glcmap-marker');b.dataset.glcIsl=isl.id;b.setAttribute('aria-label',(isl.nome||t.label)+' · apri il luogo');b.innerHTML='<span class="glcmap-pin">'+t.icon+'</span>';if(isl.nome){var label=el('span','glcmap-lbl');label.textContent=isl.nome;b.appendChild(label);}b.addEventListener('click',function(e){if(e.detail===0)openPlace(isl,false);});overlay.appendChild(b);markerEls.set(isl.id,b);});}
    function placeMarkers(){var labels=[];st.islands.forEach(function(isl){var b=markerEls.get(isl.id);if(!b)return;var ll=xyToLL(isl),p=project(ll.lon,ll.lat);b.hidden=!(p.v&&p.x>0&&p.x<W&&p.y>0&&p.y<H);if(b.hidden)return;b.style.left=p.x+'px';b.style.top=p.y+'px';var compact=st.view.zoom<1.7||labels.some(function(q){return Math.abs(q.x-p.x)<110&&Math.abs(q.y-p.y)<43;});b.classList.toggle('compact',compact);if(!compact)labels.push(p);});}
    function focusPlace(isl){var ll=xyToLL(isl);st.view={lon:ll.lon,lat:clampLat(ll.lat),zoom:Math.max(st.view.zoom,4)};requestRender();openPlace(isl,false);}
    function renderIndex(){places.replaceChildren();var q=search.value.trim().toLocaleLowerCase(),list=st.islands.filter(function(i){return ((i.nome||'')+' '+typeOf(i.type).label).toLocaleLowerCase().includes(q);});if(!list.length){var p=el('p','glcmap-index-empty');p.textContent=q?'Nessun luogo con questo nome.':'Una carta ancora da scrivere. Segna la prima scoperta con «Luogo».';places.appendChild(p);}list.forEach(function(isl){var t=typeOf(isl.type),b=button('',function(){focusPlace(isl);},'glcmap-place');b.innerHTML=t.icon;var tx=el('span');tx.textContent=isl.nome||'Luogo senza nome';var small=el('small');small.textContent=t.label+((isl.pages||[]).some(function(p){return String(p).trim();})||isl.dossier?' · taccuino compilato':' · apri il taccuino');tx.appendChild(small);b.appendChild(tx);places.appendChild(b);});}
    search.oninput=renderIndex;
    function setMode(mode){st.mode=st.readOnly?'nav':mode;st.placing=null;box.className='glcmap-canvas '+st.mode;cursor.style.display='none';renderToolbar();requestRender();}
    function renderToolbar(){bar1.replaceChildren();bar2.replaceChildren();if(!st.readOnly){[['nav','Esplora'],['draw','Terra'],['mountain','Montagne'],['forest','Boschi'],['river','Fiume'],['route','Rotta'],['add','Luogo'],['label','Nome'],['erase','Gomma']].forEach(function(t){var b=button(TOOL_ICONS[t[0]]+' '+t[1],function(){setMode(t[0]);});b.dataset.tool=t[0];b.classList.toggle('on',st.mode===t[0]);b.setAttribute('aria-pressed',String(st.mode===t[0]));bar1.appendChild(b);});var u=button('↶',function(){historyMove(undoStack,redoStack);});u.title='Annulla';u.setAttribute('aria-label','Annulla ultima modifica');u.disabled=!undoStack.length;var r=button('↷',function(){historyMove(redoStack,undoStack);});r.title='Ripeti';r.setAttribute('aria-label','Ripeti modifica');r.disabled=!redoStack.length;bar1.append(u,r);}
      else{var view=el('span','glcmap-hint');view.textContent=opts.readOnlyLabel||'Carta condivisa · puoi esplorare i luoghi e leggere i taccuini.';bar1.appendChild(view);}
      var hints={nav:'Esplora il globo. Apri un segnalino per leggere o scrivere nel suo taccuino.',draw:'Disegna un contorno: al rilascio si chiude e diventa terra.',mountain:'Trascina per disegnare una catena montuosa.',forest:'Trascina per aggiungere boschi e foreste.',river:'Segui il corso del fiume con un tratto.',route:'Traccia la rotta della ciurma, sessione dopo sessione.',add:'Scegli il tipo e tocca la carta. Il luogo avrà subito un taccuino vuoto.',label:'Tocca la carta per dare un nome a un mare, una regione o una catena montuosa.',erase:'Cancella il disegno. I segnalini e i loro taccuini restano al sicuro.'};
      if(st.mode==='add'&&!st.readOnly){var select=el('select','glcmap-search');select.style.width='auto';select.setAttribute('aria-label','Tipo di luogo');TYPES.forEach(function(t){var o=el('option');o.value=t.key;o.textContent=t.label;select.appendChild(o);});select.value=st.addType;select.onchange=function(){st.addType=select.value;};bar2.appendChild(select);}
      if(['mountain','forest','erase','river'].includes(st.mode)){var lab=el('label','glcmap-range');lab.textContent=st.mode==='erase'?'Pennello':'Dimensione';var range=el('input');range.type='range';range.min=8;range.max=55;range.value=st.brush;range.setAttribute('aria-label',lab.textContent);range.oninput=function(){st.brush=+range.value;};lab.appendChild(range);bar2.appendChild(lab);}
      var hint=el('span','glcmap-hint');hint.textContent=st.placing?'Tocca la nuova posizione del luogo. Esc per annullare.':hints[st.mode];bar2.appendChild(hint);
    }
    function toggleExpanded(){expanded=!expanded;if(expanded){priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=priorOverflow;wrap.classList.toggle('expanded',expanded);expand.textContent=expanded?'↙ Riduci':'↗ Espandi';expand.setAttribute('aria-pressed',String(expanded));requestAnimationFrame(resize);}
    var grid=button('Reticolo',function(){st.grid=!st.grid;grid.classList.toggle('on',st.grid);grid.setAttribute('aria-pressed',String(st.grid));requestRender();});grid.setAttribute('aria-pressed','false');var expand=button('↗ Espandi',toggleExpanded);headActions.append(grid,expand);
    zoomBar.append(button('−',function(){zoomBy(1/1.5);}),button('+',function(){zoomBy(1.5);}),button('◉',function(){st.view={lon:20,lat:15,zoom:1};requestRender();}),button('Carta',function(){st.view.zoom=4;requestRender();}));['Riduci zoom','Aumenta zoom','Mostra il mondo intero','Avvicina alla carta regionale'].forEach(function(n,i){zoomBar.children[i].setAttribute('aria-label',n);zoomBar.children[i].title=n;});
    var drag=null,pointers=new Map(),pinch=null;
    function local(e){var r=box.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
    function point(ll){return[+ll.lon.toFixed(4),+ll.lat.toFixed(4)];}
    function cancelDraw(){if(!drag||drag.kind!=='draw')return;var previous=undoStack.pop();if(previous){st.strokes=previous.land;st.islands=previous.islands;}drag=null;renderToolbar();requestRender();}
    function finishDraw(){if(!drag||drag.kind!=='draw')return;var s=drag.stroke;if(s.pts.length>=3&&!s.e&&!s.k&&!s.t)s.f=1;drag=null;changed();}
    box.addEventListener('pointerdown',function(e){if(e.button&&e.button!==0||e.target.closest('.glcmap-zoom'))return;var p=local(e);pointers.set(e.pointerId,p);box.setPointerCapture(e.pointerId);
      if(pointers.size===2){cancelDraw();drag=null;var ps=Array.from(pointers.values());pinch={d:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2};return;}
      if(pointers.size>2)return;var ll=invert(p.x,p.y);if(!st.readOnly&&!st.placing&&['draw','mountain','forest','river','route','erase'].includes(st.mode)){
        if(!ll)return;remember();var s={r:+(st.brush/radius()*R2D).toFixed(5),pts:[point(ll)]};if(st.mode==='erase')s.e=1;else if(st.mode==='route')s.t=1;else if(st.mode!=='draw')s.k=st.mode;
        st.strokes.push(s);drag={kind:'draw',stroke:s,last:p};requestRender();return;
      }
      var m=e.target.closest('.glcmap-marker');drag={kind:'nav',last:p,start:p,moved:false,markerId:m&&m.dataset.glcIsl};box.classList.add('drag');
    });
    box.addEventListener('pointermove',function(e){var p=local(e);if(['mountain','forest','erase'].includes(st.mode)){cursor.style.display='block';cursor.style.left=p.x+'px';cursor.style.top=p.y+'px';cursor.style.width=cursor.style.height=(st.brush*2)+'px';}if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,p);
      if(pinch&&pointers.size>=2){var ps=Array.from(pointers.values()),d=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),x=(ps[0].x+ps[1].x)/2,y=(ps[0].y+ps[1].y)/2;if(pinch.d>4)zoomBy(d/pinch.d);st.view.lon=wrapLon(st.view.lon-(x-pinch.x)/radius()*R2D);st.view.lat=clampLat(st.view.lat+(y-pinch.y)/radius()*R2D);pinch={d:d,x:x,y:y};requestRender();return;}
      if(!drag)return;if(drag.kind==='draw'){var ll=invert(p.x,p.y);if(!ll)return;var min=drag.stroke.k==='mountain'||drag.stroke.k==='forest'?st.brush*1.15:2;if(Math.hypot(p.x-drag.last.x,p.y-drag.last.y)>=min){drag.stroke.pts.push(point(ll));drag.last=p;requestRender();}return;}
      if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>4)drag.moved=true;if(drag.moved){st.view.lon=wrapLon(st.view.lon-(p.x-drag.last.x)/radius()*R2D);st.view.lat=clampLat(st.view.lat+(p.y-drag.last.y)/radius()*R2D);requestRender();}drag.last=p;
    });
    box.addEventListener('pointerleave',function(){cursor.style.display='none';});
    function endPointer(e){pointers.delete(e.pointerId);try{box.releasePointerCapture(e.pointerId);}catch(_){}if(pinch){if(pointers.size<2){pinch=null;drag=null;pointers.clear();}return;}if(pointers.size||!drag)return;box.classList.remove('drag');if(drag.kind==='draw'){if(e.type==='pointercancel')cancelDraw();else finishDraw();return;}var d=drag;drag=null;if(d.moved||e.type==='pointercancel')return;var p=local(e),ll=invert(p.x,p.y);if(!ll)return;
      if(st.placing&&!st.readOnly){remember();Object.assign(st.placing,llToXY(ll.lon,ll.lat));st.placing=null;setMode('nav');changed();return;}
      if(d.markerId){var found=st.islands.find(function(i){return i.id===d.markerId;});if(found&&st.mode==='nav')openPlace(found,false);return;}
      if(st.readOnly)return;if(st.mode==='add'){var xy=llToXY(ll.lon,ll.lat),isl={id:uid(),x:xy.x,y:xy.y,type:st.addType,nome:'',note:'',pages:['']};openPlace(isl,true);}
      else if(st.mode==='label')openLabel(ll);
    }
    box.addEventListener('pointerup',endPointer);box.addEventListener('pointercancel',endPointer);
    box.addEventListener('wheel',function(e){if(e.target.closest('.glcmap-zoom'))return;e.preventDefault();var p=local(e);zoomBy(Math.exp(-e.deltaY*.0012),p.x,p.y);},{passive:false});
    box.addEventListener('keydown',function(e){if(e.target!==box)return;var step=12/st.view.zoom;if(e.key==='ArrowLeft')st.view.lon=wrapLon(st.view.lon-step);else if(e.key==='ArrowRight')st.view.lon=wrapLon(st.view.lon+step);else if(e.key==='ArrowUp')st.view.lat=clampLat(st.view.lat+step);else if(e.key==='ArrowDown')st.view.lat=clampLat(st.view.lat-step);else if(e.key==='+'||e.key==='=')zoomBy(1.5);else if(e.key==='-')zoomBy(1/1.5);else if(e.key==='Escape')setMode('nav');else return;e.preventDefault();requestRender();});
    function closeModal(){if(modal){modal.remove();modal=null;if(oldFocus&&oldFocus.isConnected)oldFocus.focus({preventScroll:true});}}
    function dialog(title,build){closeModal();oldFocus=document.activeElement;modal=el('div','glcmap-modal');var card=el('div','glcmap-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);var kicker=el('div','glcmap-typetag');kicker.textContent='Atlante · diario delle scoperte';var h=el('h4');h.textContent=title;card.append(kicker,h);build(card);modal.appendChild(card);modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});modal.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeModal();}if(e.key==='Tab'){var all=card.querySelectorAll('button:not(:disabled),a[href],input,select,textarea');if(!all.length)return;var first=all[0],last=all[all.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});document.body.appendChild(modal);var focus=card.querySelector('input,button,a');if(focus)focus.focus();}
    function input(card,title,kind,value){var label=el('label');label.textContent=title;var field=el(kind||'input','glcmap-in');field.setAttribute('aria-label',title);if(value!=null)field.value=value;label.appendChild(field);card.appendChild(label);return field;}
    function openLabel(ll){dialog('Dai un nome alla carta',function(card){var name=input(card,'Nome sulla carta','input','');name.maxLength=70;name.placeholder='Un mare, una regione, una montagna…';var acts=el('div','glcmap-acts');acts.append(button('Annulla',closeModal,'glcmap-btn ghost'),button('Aggiungi nome',function(){if(!name.value.trim()){name.focus();return;}remember();st.strokes.push({k:'label',text:name.value.trim(),r:15/radius()*R2D,pts:[point(ll)]});changed();setMode('nav');closeModal();},'glcmap-btn'));card.appendChild(acts);});}
    function openPlace(isl,isNew){dialog(isNew?'Una nuova scoperta':isl.nome||'Luogo senza nome',function(card){var nm,sel,note,status=el('p','glcmap-dialog-status');status.setAttribute('role','status');
      if(st.readOnly){var tag=el('p','glcmap-typetag');tag.textContent=typeOf(isl.type).label;var text=el('div','glcmap-read');text.textContent=isl.note||'Il taccuino raccoglie ciò che avete scoperto in questo luogo.';card.append(tag,text);}
      else{nm=input(card,'Nome del luogo','input',isl.nome||'');nm.maxLength=80;sel=input(card,'Tipo di luogo','select');TYPES.forEach(function(t){var o=el('option');o.value=t.key;o.textContent=t.label;sel.appendChild(o);});sel.value=isl.type||'isola';note=input(card,'Nota sulla mappa','textarea',isl.note||'');note.placeholder='Una breve descrizione. Gli appunti lunghi vanno nel taccuino.';}
      function storePlace(){if(st.readOnly)return flush();remember();if(isNew){st.islands.push(isl);isNew=false;}isl.nome=nm.value.trim();isl.type=sel.value;isl.note=note.value;setMode('nav');changed();return flush();}
      if(opts.islandUrl){var link=el('a','glcmap-btn glcmap-notes-link');link.textContent=st.readOnly?'Leggi il taccuino del luogo ↗':'Apri il taccuino del luogo ↗';var url=opts.islandUrl(isl);if(/^\/(?!\/)/.test(url)||/^https?:\/\//i.test(url))link.href=url;link.onclick=async function(e){e.preventDefault();link.setAttribute('aria-disabled','true');var ok=await storePlace();if(ok&&link.href)location.assign(link.href);else{status.textContent='Non ho potuto salvare il luogo. Riprova prima di aprire il taccuino.';link.removeAttribute('aria-disabled');}};card.appendChild(link);}
      var acts=el('div','glcmap-acts');if(!st.readOnly&&!isNew){acts.append(button('Elimina',async function(){if(!confirm('Eliminare questo luogo e il suo taccuino dalla mappa?'))return;remember();st.islands=st.islands.filter(function(x){return x.id!==isl.id;});changed();closeModal();},'glcmap-btn danger'),button('Sposta',async function(){if(!await storePlace()){status.textContent='Non salvato. Riprova.';return;}closeModal();st.placing=isl;renderToolbar();},'glcmap-btn ghost'));}
      acts.appendChild(button('Chiudi',closeModal,'glcmap-btn ghost'));if(!st.readOnly)acts.appendChild(button('Salva luogo',async function(){if(await storePlace())closeModal();else status.textContent='Le modifiche restano aperte. Riprova il salvataggio.';},'glcmap-btn'));card.append(acts,status);
    });}
    function onKey(e){if(e.key==='Escape'&&!modal){if(expanded)toggleExpanded();else setMode('nav');}}
    function beforeUnload(e){if(pending||saving){e.preventDefault();e.returnValue='';}}
    window.addEventListener('keydown',onKey);window.addEventListener('beforeunload',beforeUnload);window.addEventListener('resize',resize);
    if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(box);}
    renderToolbar();buildMarkers();renderIndex();saveStatus.textContent=st.readOnly?'Sola lettura':'Il tuo mondo, una scoperta alla volta';resize();
    (function waitSize(n){if(destroyed)return;if(box.clientWidth&&box.clientHeight){resize();return;}if(n<100)resizeTimer=setTimeout(function(){waitSize(n+1);},100);})(0);
    var controller={update:function(islands,readOnly,land){if(islands)st.islands=clone(islands);if(land)st.strokes=clone(land);if(readOnly!=null)st.readOnly=!!readOnly;undoStack=[];redoStack=[];setMode('nav');closeModal();buildMarkers();renderIndex();requestRender();},getIslands:function(){return clone(st.islands);},getLand:function(){return clone(st.strokes);},flush:flush,destroy:function(){if(destroyed)return;destroyed=true;cancelAnimationFrame(frame);clearTimeout(resizeTimer);if(ro)ro.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('keydown',onKey);window.removeEventListener('beforeunload',beforeUnload);closeModal();if(expanded)document.body.style.overflow=priorOverflow;container._glcmap=null;}};container._glcmap=controller;return controller;
  }
  window.GLCMap={mount:mount};
})();
