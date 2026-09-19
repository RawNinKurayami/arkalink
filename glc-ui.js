/* Grand Line Chronicles · UI condivisa: icone, dadi, foto, finestre modali. */
"use strict";
function mkEl(t,p,kids){const e=document.createElement(t);if(p)for(const k in p){if(k==="class")e.className=p[k];else if(k==="html")e.innerHTML=p[k];else if(k==="text")e.textContent=p[k];else if(k.slice(0,2)==="on")e[k.toLowerCase()]=p[k];else e.setAttribute(k,p[k]);}if(kids!=null)(Array.isArray(kids)?kids:[kids]).forEach(c=>{if(c==null)return;e.appendChild(typeof c==="string"?document.createTextNode(c):c);});return e;}
const DIE_COL={d4:["#e0483a","#7e1a12"],d6:["#3fae6e","#175233"],d8:["#4a8bf5","#173a86"],d10:["#7b5cf0","#33207c"],d12:["#b04ad6","#521a6b"],d20:["#f0c04a","#7d5408"]};
const DIE_SHAPE={d4:"12,3.2 21,19.8 3,19.8",d6:"4.5,4.5 19.5,4.5 19.5,19.5 4.5,19.5",d8:"12,2 22,12 12,22 2,12",d10:"12,2 20.5,9 12,22 3.5,9",d12:"12,2 21.5,9.2 18,21 6,21 2.5,9.2",d20:"12,2 21,7 21,17 12,22 3,17 3,7"};
let _dieSeq=0;
function dieIcon(die,size){var d=String(die||"").replace(/\+.*/,"");var big=/\+/.test(String(die||""));var c=DIE_COL[d]||["#6f6a60","#2e2b26"];var n=d?(d.replace("d","")+(big?"+":"")):"—";size=size||44;var id="dg"+(++_dieSeq);
 return '<svg class="dieic" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" aria-label="'+d+'"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient></defs><circle cx="12" cy="12" r="11.3" fill="#0e0b13" stroke="#f0a441" stroke-width="1"/><polygon points="'+(DIE_SHAPE[d]||DIE_SHAPE.d20)+'" fill="url(#'+id+')" stroke="#ffe2b0" stroke-width=".75" stroke-linejoin="round"/><text x="12" y="'+(d==="d4"?16.4:14.7)+'" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="'+(n.length>2?5.6:(n.length>1?7:8))+'" fill="#fff">'+n+'</text></svg>';}
/* ===== ICONE SVG (monolinea, colore corrente) ===== */
const ICONS={
 sword:'<path d="M3 21l3-3M5 19l9-9M13 11l-3-3 8-6 2 2-6 8 3 3-2 2z"/><path d="M6 14l4 4"/>',
 shield:'<path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M12 8v8M9 12h6"/>',
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
 fist:'<path d="M7 12V8a2 2 0 014 0v4M11 11V7a2 2 0 014 0v4M15 11V9a2 2 0 014 0v5a6 6 0 01-6 6h-1a6 6 0 01-6-6v-2a2 2 0 014 0v1"/>',
 wind:'<path d="M3 8h9a2.5 2.5 0 10-2.5-2.5M3 12h13a2.5 2.5 0 11-2.5 2.5M3 16h7a2 2 0 11-2 2"/>',
 medkit:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M12 10v6M9 13h6"/>',
 poison:'<path d="M12 3a7 7 0 00-7 7c0 3 2 5 3 6v3h8v-3c1-1 3-3 3-6a7 7 0 00-7-7z"/><circle cx="9.5" cy="10.5" r="1.2"/><circle cx="14.5" cy="10.5" r="1.2"/><path d="M10.5 16v2M13.5 16v2"/>',
 flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7.5 15h9"/>',
 pot:'<path d="M4 10h16M6 10v6a4 4 0 004 4h4a4 4 0 004-4v-6M2 12h2M20 12h2"/><path d="M9 7c0-2 2-2 2 0s2 2 2 0M13 5c0-1.5 1.5-1.5 1.5 0"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2.2 5.2-4.8 1.8 2.2-5.2z"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
 anchor:'<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0014 0M3 13h4M17 13h4"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
 wrench:'<path d="M14 4a5 5 0 016 6l-9 9-3-3 9-9M4 20l3-3"/>',
 scroll:'<path d="M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7M7 4a3 3 0 00-3 3v10a3 3 0 003 3M9 9h7M9 13h7"/>',
 music:'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
 crown:'<path d="M3 18h18l-1-9-5 4-3-7-3 7-5-4zM4 21h16"/>',
 burst:'<circle cx="12" cy="12" r="3"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5L19 19M19 5l-3.5 3.5M8.5 15.5L5 19"/>',
 flame:'<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
 paw:'<circle cx="7" cy="9" r="1.8"/><circle cx="11" cy="6" r="1.8"/><circle cx="16" cy="7" r="1.8"/><circle cx="19" cy="11" r="1.8"/><path d="M8 17c0-3 2-5 5-5s5 2 5 5-2 3-5 3-5 0-5-3z"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
 orb:'<circle cx="12" cy="12" r="8"/><path d="M8 9a5 5 0 016-2M6 13a6 6 0 007 5"/>',
 helm:'<circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4.5 4.5M14.5 14.5L19 19M19 5l-4.5 4.5M9.5 14.5L5 19"/>',
 eye:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 fruit:'<path d="M12 4a8 8 0 108 8"/><path d="M12 4c3 0 5 2 5 5M12 4c-2-2-4-2-6-1 1 2 3 3 6 1"/><path d="M9 12a3 3 0 106 0"/>',
 heart:'<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 box:'<path d="M3 8l9-4 9 4v9l-9 4-9-4zM3 8l9 4 9-4M12 12v9"/>',
 coin:'<circle cx="12" cy="12" r="8"/><path d="M12 8v8M10 9h3a1.5 1.5 0 010 3h-3M10 12h3.5a1.5 1.5 0 010 3H10"/>',
 key:'<circle cx="15" cy="8" r="4"/><path d="M12 11l-8 8v2h3l1-1v-2h2v-2h2l1-1"/>',
 bag:'<path d="M6 8h12l1 12H5zM9 8V6a3 3 0 016 0v2"/>',
 map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>',
 potion:'<path d="M10 3h4M11 3v5l-4 5v5a2 2 0 002 2h6a2 2 0 002-2v-5l-4-5V3"/><path d="M8 15h8"/>',
 food:'<path d="M15 3a6 6 0 00-6 6c0 2 1 3 2 4l-6 6 2 2 6-6c1 1 2 2 4 2a6 6 0 000-12z"/>',
 bandage:'<path d="M4 13l7 7 9-9-7-7zM8 12l4 4"/><circle cx="11" cy="11" r=".6"/><circle cx="13" cy="13" r=".6"/>',
 bomb:'<circle cx="11" cy="14" r="7"/><path d="M14 7l2-2M16 5l2-1 1 1-1 2"/>',
 rope:'<path d="M6 6h12a4 4 0 010 8H6a4 4 0 000 8h12"/>',
 candle:'<path d="M9 21h6M12 21v-9M10 12h4M12 3c-1 2-2 3-2 4a2 2 0 004 0c0-1-1-2-2-4z"/>',
 shell:'<path d="M12 20a8 8 0 110-16 6 6 0 010 12 4 4 0 010-8 2 2 0 010 4"/>',
 hammer:'<path d="M14 4l6 6-2 2-6-6zM12 6L3 15l4 4 9-9"/>',
 bottle:'<path d="M10 2h4v4l2 3v11a2 2 0 01-2 2h-4a2 2 0 01-2-2V9l2-3z"/><path d="M8 13h8"/>',
 book:'<path d="M4 4h9a3 3 0 013 3v13a2 2 0 00-2-2H4zM20 4h-4v14h4z"/>',
 gem:'<path d="M6 3h12l3 6-9 12L3 9zM3 9h18M9 3l3 6 3-6"/>',
 arrow:'<path d="M4 20L20 4M13 4h7v7"/>',
 boat:'<path d="M3 15h18l-2 4H5zM12 3v12M12 4c4 1 6 4 6 8M12 4c-4 1-6 4-6 8"/>'
};
function svgIcon(key,size){const d=ICONS[key];if(!d)return "";size=size||22;return '<svg class="ic" width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';}
const IMG_ICON={"Haki dell'Armamento":"haki-armamento","Haki dell'Osservazione":"haki-osservazione","Haki del Re":"haki-re",frutto:"frutto",legame:"legame",zaino:"zaino"};
const BOND_DICE=["d4","d6","d8","d10","d12","d20"];
/* I PIP dell'Haki seguono il dado: d6 = 1 … d20 = 5. */
function hakiPip(die){return ({d4:0,d6:1,d8:2,d10:3,d12:4,d20:5})[String(die||"").replace(/\+.*/,"")]||(String(die||"").indexOf("d20")===0?5:0);}
function bondStep(d,dir){let i=BOND_DICE.indexOf(d);if(i<0)i=0;return BOND_DICE[Math.max(0,Math.min(BOND_DICE.length-1,i+dir))];}
function imgIcon(name,size){size=size||24;return '<img class="icimg" src="/img/icons/'+name+'.png" width="'+size+'" height="'+size+'" alt="" draggable="false">';}
/* Emblemi illustrati di Razze, Ruoli e Stili (originali in img/icone-originali).
   Dove non c'è un disegno proprio — l'Infermeria, per ora — vale quello del Ruolo. */
const RACE_IMG={umano:"razza-umano",uomopesce:"razza-uomopesce",gigante:"razza-gigante",mink:"razza-mink",lunarian:"razza-lunarian",longbraccio:"razza-longbraccio",lungagamba:"razza-lungagamba",cyborg:"razza-cyborg",tontatta:"razza-tontatta"};
const ROLE_IMG={Combattente:"ruolo-combattente",Dottore:"ruolo-dottore",Ingegnere:"ruolo-ingegnere",Musicista:"ruolo-musicista",Navigatore:"ruolo-navigatore",Archeologo:"ruolo-archeologo",Cuoco:"ruolo-cuoco",Capitano:"ruolo-capitano"};
const STYLE_IMG={Striker:"stile-striker",Crusher:"stile-crusher",Swordsman:"stile-swordsman",Sniper:"stile-sniper",Special:"stile-special",Tossicologo:"stile-tossicologo",Chimico:"stile-chimico",Carpentiere:"stile-carpentiere",Meccanico:"stile-meccanico",Inventore:"stile-inventore"};
function roleImgKey(rn,st){return (st&&STYLE_IMG[st])||ROLE_IMG[rn]||"";}
function emblem(key,size){return key?imgIcon(key,size).replace('class="icimg"','class="icimg emblem"'):"";}
function hakiIcon(h,size){return imgIcon(IMG_ICON[h&&h.name]||"haki-armamento",size);}
const STYLE_ICON={Striker:"fist",Crusher:"hammer",Swordsman:"sword",Sniper:"target",Special:"gear",Infermeria:"medkit",Tossicologo:"poison",Chimico:"flask",Cuoco:"pot",Navigatore:"compass",Carpentiere:"anchor",Meccanico:"gear",Inventore:"wrench",Archeologo:"scroll",Musicista:"music",Capitano:"crown",Paramecia:"orb",Logia:"flame",Zoan:"paw"};
const INV_ICONS=["box","bag","coin","key","map","scroll","book","potion","bottle","food","bandage","medkit","bomb","arrow","sword","shield","rope","hammer","gear","candle","shell","gem","compass","boat"];
const INV_MIGRATE={"📦":"box","⚔️":"sword","🛡":"shield","🧪":"potion","💊":"bandage","🍖":"food","🗺️":"map","📜":"scroll","💰":"coin","🔑":"key","🎒":"bag","🧭":"compass","🔮":"gem","💣":"bomb","🪙":"coin","🍶":"bottle","🔧":"gear","🪢":"rope","🕯️":"candle","🐚":"shell"};
function photoStyle(pos){pos=pos||{};var x=(pos.x!=null?pos.x:50),y=(pos.y!=null?pos.y:50),z=(pos.z!=null?pos.z:1);return "object-position:"+x+"% "+y+"%;transform:scale("+z+");transform-origin:"+x+"% "+y+"%;";}
let MODAL=null;
function closeModal(){if(MODAL){const h=MODAL._onClose;MODAL.remove();MODAL=null;document.body.classList.remove("has-modal");if(h)try{h();}catch(e){}}}
function openModal(title,build,opts){closeModal();opts=opts||{};const ov=mkEl("div",{class:"gmodal"+(opts.wide?" wide":"")});const box=mkEl("div",{class:"gmbox"});const head=mkEl("div",{class:"gmhead"},[mkEl("div",{class:"gmtitle",html:title}),mkEl("button",{class:"gmclose",text:"✕",title:"Chiudi",onclick:closeModal})]);const body=mkEl("div",{class:"gmbody"});box.appendChild(head);box.appendChild(body);ov.appendChild(box);ov.onclick=e=>{if(e.target===ov)closeModal();};document.body.appendChild(ov);document.body.classList.add("has-modal");MODAL=ov;MODAL._build=build;MODAL._body=body;refreshModal();return ov;}
function refreshModal(){if(!MODAL||!MODAL._build)return;const b=MODAL._body;const y=b.scrollTop;b.innerHTML="";const c=MODAL._build();if(c)b.appendChild(c);b.scrollTop=y;}
/* mutate dentro una modale: salva, ridisegna la pagina e la modale */
function mutateM(fn){if(fn)fn();if(typeof window.__glcRerender==="function")window.__glcRerender();refreshModal();}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});

