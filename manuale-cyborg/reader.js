/* Generato dall'interfaccia del manuale base da strumenti/cyborg-manuale.py. */
/* Il Manuale si legge scorrendo, come un documento: l'indice si apre e si
   chiude dal tasto in alto e segna dove sei. Qui non ci sono regole di gioco:
   solo lettura. */
(function(){
 "use strict";
 var indice=document.getElementById("man-indice");
 var velo=document.getElementById("man-velo");
 var apri=document.getElementById("man-apri-indice");
 var cerca=document.getElementById("man-cerca");
 var nav=document.getElementById("man-nav");
 var nessuno=document.getElementById("man-nessuno");
 var voci=[].slice.call(nav.querySelectorAll("a[data-id]"));
 var perId={};voci.forEach(function(a){perId[a.dataset.id]=a;});
 var bersagli=[].slice.call(document.querySelectorAll(".man-cap[id], h2.man-sez[id]"));

 /* ---------- indice ---------- */
 function mostraIndice(si){
  document.body.classList.toggle("man-indice-aperto", si);
  if(apri)apri.setAttribute("aria-expanded", String(si));
  if(velo)velo.hidden=!si;
 }
 if(apri)apri.onclick=function(){ mostraIndice(!document.body.classList.contains("man-indice-aperto")); };
 var gancio=document.getElementById("man-gancio");
 if(gancio)gancio.onclick=function(){ document.body.classList.remove("man-top-via"); mostraIndice(true); };
 if(velo)velo.onclick=function(){ mostraIndice(false); };
 document.addEventListener("keydown",function(e){ if(e.key==="Escape") mostraIndice(false); });
 nav.addEventListener("click",function(e){ if(e.target.closest("a[data-id]")) mostraIndice(false); });

 if(cerca) cerca.addEventListener("input",function(){
  var q=cerca.value.trim().toLowerCase(), visibili=0;
  nav.querySelectorAll(".man-i-cap").forEach(function(cap){
   var titolo=cap.querySelector("a").textContent.toLowerCase();
   var capOk=!q||titolo.indexOf(q)>=0, qualcuna=false;
   cap.querySelectorAll(".man-i-sez li").forEach(function(li){
    var ok=capOk||!q||li.textContent.toLowerCase().indexOf(q)>=0;
    li.hidden=!ok; if(ok)qualcuna=true;
   });
   var mostra=capOk||qualcuna;
   cap.hidden=!mostra; if(mostra)visibili++;
  });
  if(nessuno)nessuno.hidden=visibili>0;
 });

 /* ---------- dove sei ----------
    Le altezze si misurano una volta sola: durante lo scorrimento si confronta
    solo un numero, così la pagina resta scattante anche con tutto il manuale
    in una sola colonna. */
 var posti=[], attiva=null;
 function misura(){
  posti=bersagli.map(function(b){ return {el:b, y:b.getBoundingClientRect().top + window.scrollY}; });
 }
 function segnaDove(){
  var y=window.scrollY + 220, scelto=null;
  for(var i=0;i<posti.length;i++){ if(posti[i].y<=y) scelto=posti[i].el; else break; }
  var a=scelto?perId[scelto.id]:null;
  if(a===attiva) return;
  if(attiva)attiva.classList.remove("qui");
  attiva=a;
  if(a){
   a.classList.add("qui");
   if(indice.scrollHeight>indice.clientHeight){
    var r=a.getBoundingClientRect(), ri=indice.getBoundingClientRect();
    if(r.top<ri.top+40||r.bottom>ri.bottom-40) indice.scrollTop += r.top-ri.top-110;
   }
  }
 }
 /* Scendendo la testata si ritrae e al suo posto compare la pastiglia
    dell'indice: resta raggiungibile senza risalire in cima, ma non ruba
    spazio alla lettura. Basta risalire un poco per rivedere la testata. */
 var ultimaY=window.scrollY;
 function guardaAltezza(){
  var y=window.scrollY, corpo=document.body;
  if(y<240){ corpo.classList.remove("man-top-via"); }
  else if(y-ultimaY>4){ corpo.classList.add("man-top-via"); }
  else if(ultimaY-y>6){ corpo.classList.remove("man-top-via"); }
  ultimaY=y;
 }
 var atteso=false;
 window.addEventListener("scroll",function(){
  if(atteso) return; atteso=true;
  requestAnimationFrame(function(){ atteso=false; segnaDove(); guardaAltezza(); });
 },{passive:true});
 guardaAltezza();
 var ridisegno;
 window.addEventListener("resize",function(){ clearTimeout(ridisegno); ridisegno=setTimeout(function(){ misura(); segnaDove(); },200); });

 misura(); segnaDove();
 if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ misura(); segnaDove(); });
 window.addEventListener("load",function(){ misura(); segnaDove(); });

 var stampa=document.getElementById("man-stampa");
 if(stampa)stampa.onclick=function(){window.print();};
})();
