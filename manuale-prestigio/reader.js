(function(){
'use strict';const index=document.getElementById('pr-index'),toggle=document.getElementById('pr-toc-toggle'),search=document.getElementById('pr-search');
const mobile=matchMedia('(max-width:760px)');
function open(on){document.body.classList.toggle('toc-open',on);toggle.setAttribute('aria-expanded',String(on));index.hidden=mobile.matches&&!on;}
mobile.addEventListener('change',()=>open(false));open(false);
toggle.addEventListener('click',()=>{const on=!document.body.classList.contains('toc-open');open(on);if(on)search.focus();});
index.addEventListener('click',e=>{if(e.target.closest('a'))open(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains('toc-open')){open(false);toggle.focus();}});
const plain=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
search.addEventListener('input',()=>{let count=0;const q=plain(search.value.trim());index.querySelectorAll('details').forEach(d=>{d.hidden=q&&!plain(d.textContent).includes(q);if(!d.hidden)count++;d.open=!!q&&!d.hidden;});document.getElementById('pr-empty').hidden=!!count;});
let queued=false;function progress(){const total=document.documentElement.scrollHeight-innerHeight;document.querySelector('.pr-progress i').style.width=(total>0?Math.min(100,scrollY/total*100):0)+'%';queued=false;}
addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(progress);}},{passive:true});addEventListener('resize',progress);progress();
document.getElementById('pr-print').onclick=()=>window.print();
})();
