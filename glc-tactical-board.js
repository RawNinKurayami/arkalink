/* Shared 2D battlefield. Viewer only receives a projected scene; no account or storage reads here. */
(function(root){
 'use strict';
 const T=root.GLCTactical;
 function board(host,options={}){
  const viewport=document.createElement('div');viewport.className='tb-viewport';viewport.setAttribute('aria-label','Campo di battaglia');
  const world=document.createElement('div');world.className='tb-world';const backdrop=document.createElement('img');backdrop.className='tb-background';backdrop.alt='';backdrop.draggable=false;
  const grid=document.createElement('div');grid.className='tb-grid';const pieces=document.createElement('div');pieces.className='tb-pieces';world.append(backdrop,grid,pieces);viewport.append(world);host.append(viewport);
  const controls=document.createElement('div');controls.className='tb-view-controls';const help=document.createElement('span');help.textContent=options.readOnly?'Trascina il campo per esplorare':'Trascina una pedina · Spazio + trascina per esplorare';
  function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b;}
  const zoomLabel=document.createElement('span');const out=button('−',()=>zoomAt(zoom/1.25)),inside=button('+',()=>zoomAt(zoom*1.25));out.setAttribute('aria-label','Riduci zoom');inside.setAttribute('aria-label','Aumenta zoom');controls.append(help,out,zoomLabel,inside,button('Inquadra',()=>fit()));host.append(controls);
  let s=null,zoom=1,pan={x:0,y:0},selected='',gesture=null,space=false,dead=false,measureStart=null,measureEnd=null;
  const ruler=document.createElement('div');ruler.className='tb-ruler';world.append(ruler);const measureInfo=document.createElement('output');measureInfo.className='tb-measure';viewport.append(measureInfo);
  function draw(){if(!s)return;world.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;zoomLabel.textContent=Math.round(zoom*100)+'%';}
  function fit(){if(!s)return;zoom=Math.max(.08,Math.min(1.4,(viewport.clientWidth-32)/(s.cols*48),(viewport.clientHeight-32)/(s.rows*48)));pan={x:(viewport.clientWidth-s.cols*48*zoom)/2,y:(viewport.clientHeight-s.rows*48*zoom)/2};draw();}
  function zoomAt(value,x=viewport.clientWidth/2,y=viewport.clientHeight/2){const next=Math.max(.08,Math.min(3,value)),ratio=next/zoom;pan={x:x-(x-pan.x)*ratio,y:y-(y-pan.y)*ratio};zoom=next;draw();}
  function point(e){const r=viewport.getBoundingClientRect();return{x:(e.clientX-r.left-pan.x)/zoom/48,y:(e.clientY-r.top-pan.y)/zoom/48};}
  function paintRuler(){if(!measureStart||!measureEnd){ruler.hidden=true;measureInfo.hidden=true;return;}const a=measureStart,b=measureEnd,dx=b.x-a.x,dy=b.y-a.y;ruler.hidden=false;measureInfo.hidden=false;ruler.style.cssText=`left:${a.x*48}px;top:${a.y*48}px;width:${Math.hypot(dx,dy)*48}px;transform:rotate(${Math.atan2(dy,dx)}rad)`;measureInfo.textContent=Math.hypot(dx,dy).toFixed(1)+' m · distanza geometrica';}
  function render(next,sel){if(s?.id!==next?.id){measureStart=null;measureEnd=null;}const was=!!s,sameSize=s&&next&&s.cols===next.cols&&s.rows===next.rows;s=next;selected=sel||'';pieces.replaceChildren();if(!s){world.hidden=true;return;}world.hidden=false;world.style.width=s.cols*48+'px';world.style.height=s.rows*48+'px';grid.style.opacity=s.gridOpacity;
   const safe=T.image(s.background);backdrop.hidden=!safe||safe.startsWith('asset:');if(safe&&!safe.startsWith('asset:'))backdrop.src=safe;else backdrop.removeAttribute('src');backdrop.style.width=s.cols*48*s.backgroundScale+'px';backdrop.style.height='auto';backdrop.style.left=s.backgroundX*48+'px';backdrop.style.top=s.backgroundY*48+'px';
   for(const t of s.tokens||[]){if(options.readOnly&&t.visible===false)continue;const b=document.createElement('button');b.type='button';b.className='tb-token '+t.side+(t.visible===false?' concealed':'')+(t.id===selected?' selected':'');b.dataset.token=t.id;b.style.cssText=`left:${t.x*48}px;top:${t.y*48}px;width:${t.size*48}px;height:${t.size*48}px`;const name=options.readOnly?t.label:t.name;b.setAttribute('aria-label',(name||'Pedina')+(t.visible===false?' · nascosta ai giocatori':''));b.title=name||'Pedina';const face=document.createElement('span');face.className='tb-face';if(T.image(t.image)&&!t.image.startsWith('asset:')){const im=document.createElement('img');im.src=t.image;im.alt='';im.draggable=false;face.append(im);}else face.textContent=(t.label||name||'?').trim().slice(0,2).toUpperCase();const label=document.createElement('span');label.className='tb-label';label.textContent=name||'Pedina';b.append(face,label);b.onclick=()=>{if(!options.readOnly&&!space)options.onSelect?.(t.id);};
    b.onkeydown=e=>{if(options.readOnly)return;const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();options.onMove?.(t.id,Math.max(0,Math.min(s.cols-t.size,t.x+delta[0])),Math.max(0,Math.min(s.rows-t.size,t.y+delta[1])));}};pieces.append(b);
   }paintRuler();if(!was||!sameSize)fit();else draw();
  }
  viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomAt(zoom*(e.deltaY<0?1.12:1/1.12),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  viewport.addEventListener('pointerdown',e=>{if(!s||e.button>0)return;const p=point(e),b=e.target.closest('[data-token]');if(options.mode?.()==='measure'){measureStart=p;measureEnd=p;gesture={kind:'measure'};paintRuler();}
   else if(b&&!options.readOnly&&!space){const t=s.tokens.find(t=>t.id===b.dataset.token);gesture={kind:'token',id:t.id,b,x:t.x,y:t.y,start:p,size:t.size};}
   else gesture={kind:'pan',startX:e.clientX,startY:e.clientY,x:pan.x,y:pan.y};viewport.setPointerCapture(e.pointerId);});
  viewport.addEventListener('pointermove',e=>{if(!gesture)return;if(gesture.kind==='pan'){pan={x:gesture.x+e.clientX-gesture.startX,y:gesture.y+e.clientY-gesture.startY};draw();}else if(gesture.kind==='measure'){measureEnd=point(e);paintRuler();}else{const p=point(e),g=gesture;g.nx=Math.max(0,Math.min(s.cols-g.size,Math.round(g.x+p.x-g.start.x)));g.ny=Math.max(0,Math.min(s.rows-g.size,Math.round(g.y+p.y-g.start.y)));g.b.style.left=g.nx*48+'px';g.b.style.top=g.ny*48+'px';}});
  function end(e,cancel){if(!gesture)return;const g=gesture;gesture=null;if(g.kind==='token'){if(!cancel&&g.nx!=null&&(g.nx!==g.x||g.ny!==g.y))options.onMove?.(g.id,g.nx,g.ny);else{g.b.style.left=g.x*48+'px';g.b.style.top=g.y*48+'px';if(!cancel)options.onSelect?.(g.id);}}if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);}
  viewport.addEventListener('pointerup',e=>end(e,false));viewport.addEventListener('pointercancel',e=>end(e,true));
  function key(e){if(e.code==='Space'&&!/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)){space=e.type==='keydown';if(space)e.preventDefault();}}
  window.addEventListener('keydown',key);window.addEventListener('keyup',key);const blur=()=>space=false;window.addEventListener('blur',blur);
  const resize=new ResizeObserver(()=>{if(!dead)fit();});resize.observe(viewport);paintRuler();
  return{render,fit,destroy(){dead=true;resize.disconnect();window.removeEventListener('keydown',key);window.removeEventListener('keyup',key);window.removeEventListener('blur',blur);host.replaceChildren();}};
 }
 root.GLCTacticalBoard={mount:board};
})(window);
