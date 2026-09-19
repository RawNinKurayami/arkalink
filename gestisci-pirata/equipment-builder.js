/* Weapon / Module atelier: DOM presentation only.
   Original builders remain the sole owners of data, callbacks, filters,
   normalization, persistence and progression. UI state lives on #bld. */
(function () {
  'use strict';
  const positions = [[50,9],[86,29],[86,70],[50,91],[14,70],[14,29]];
  const weaponNodes = [
    {label:'Identità',icon:'sword',step:0,hint:'Dai un nome all’arma e scegli il suo Tipo.'},
    {label:'Grado',icon:'gem',step:1,part:'Grado',hint:'Definisci il Grado dell’arma e la sua eventuale modalità.'},
    {label:'Attributo',icon:'fist',step:1,part:'Attributo',hint:'Scegli l’Attributo associato all’arma.'},
    {label:'Portata',icon:'target',step:1,part:'Portata',hint:'Registra la portata concordata al tavolo.'},
    {label:'Effetto',icon:'star',step:2,hint:'Associa un solo effetto speciale, con le sue condizioni.'},
    {label:'Scheda',icon:'book',step:3,hint:'Rileggi l’arma e annota l’approvazione del GM.'}
  ];
  const moduleNodes = [
    {label:'Concetto',icon:'gear',step:0,hint:'Prima il dispositivo: nome, funzione fisica e ruoli.'},
    {label:'Struttura',icon:'wrench',step:1,hint:'Definisci l’hardware e il requisito di Corpo Meccanico.'},
    {label:'Effetto',icon:'star',step:2,hint:'Registra ciò che il modulo concede e le sue condizioni.'},
    {label:'Energia',icon:'bolt',step:3,hint:'Configura una risorsa separata, soltanto se il dispositivo la usa.'},
    {label:'Integrità',icon:'shield',step:4,hint:'Indica lo stato del dispositivo e gli accordi per ripararlo.'},
    {label:'Riepilogo',icon:'scroll',step:5,hint:'Rileggi il progetto e accedi alla sua scheda operativa.'}
  ];
  const roleIcons={Offensivo:'sword',Difensivo:'shield',Controllo:'target','Mobilità':'wind','Utilità':'wrench'};
  const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
  const symbol=(name,size,cls)=>{const n=make('span',cls||'');n.innerHTML=svgIcon(name,size);n.setAttribute('aria-hidden','true');return n;};
  const spec=kind=>kind==='weapon'?weaponNodes:moduleNodes;
  function activeIndex(v,kind){return kind==='weapon'?(BLD.step===1?Math.max(1,weaponNodes.findIndex(n=>n.part===v._eqPart)):[0,1,4,5][BLD.step]):BLD.step;}
  function go(v,kind,index){
    const n=spec(kind)[index];
    if(n.part)v._eqPart=n.part;
    bldGo(n.step);
  }
  function statusData(kind,o){
    if(kind==='weapon')return [
      {text:o.tipo||'Tipo da definire',done:!!(o.nome||'').trim()},
      {text:o.grado+' · '+gradeLabel(o.grado),done:!!o.grado},
      {text:o.attr||'Da definire',done:!!o.attr},
      {text:o.portata||'Da definire',done:!!o.portata},
      {text:o.eff?(o.eff.cat||'Da definire'):'Nessuno',done:!o.eff||!!o.eff.cat},
      {text:o.gmOk?'GM · Approvata':'Scheda arma',done:!!o.gmOk}
    ];
    const fuel=o.fuel||{},fuelText=fuel.on?String(fuel.cur||0)+' / '+(fuel.max||'—')+' '+(fuel.tipo||'cariche'):'Nessuna carica';
    return [
      {text:(o.tipo||[]).join(' · ')||'Funzione fisica',done:!!(o.nome&&o.funzione)},
      {text:o.req+(o.arma?' · Arma '+(o.grado||'—'): ' · Funzionale'),done:!o.arma||!!o.grado},
      {text:o.eff?(o.eff.cat||'Da definire'):'Nessuno',done:!o.eff||!!o.eff.cat},
      {text:fuelText,done:!fuel.on||!!fuel.max},
      {text:o.stato==='danneggiato'?'Danneggiato':'Integro',done:o.stato!=='danneggiato',warn:o.stato==='danneggiato'},
      {text:'Scheda progetto',done:BLD.step===5}
    ];
  }
  function prepareNavigation(v,kind){
    const list=v.querySelector('.bl-steps');
    if(list.dataset.eqPrepared)return;
    list.dataset.eqPrepared='true';
    if(kind==='weapon'){
      const original=[...list.children];
      const extra=(index)=>{
        const li=make('li','bl-step eq-substep'),b=make('button','bl-stepb');b.type='button';
        b.append(make('span','bl-sn'),make('span','bl-sl',weaponNodes[index].label));
        b.onclick=()=>go(v,kind,index);li.append(b);return li;
      };
      original[1].querySelector('.bl-sl').textContent='Grado';
      original[1].querySelector('button').addEventListener('click',()=>{v._eqPart='Grado';},true);
      list.replaceChildren(original[0],original[1],extra(2),extra(3),original[2],original[3]);
    }
    [...list.children].forEach((li,i)=>{
      const b=li.querySelector('button');
      b.prepend(symbol(spec(kind)[i].icon,25,'eq-node-icon'));
      b.append(make('small','eq-node-value'));b.dataset.eqFocus='node-'+i;
      li.style.setProperty('--eq-x',positions[i][0]+'%');li.style.setProperty('--eq-y',positions[i][1]+'%');
    });
  }
  function updateNavigation(v,kind,o){
    const current=activeIndex(v,kind),states=statusData(kind,o);
    const list=v.querySelector('.bl-steps');
    let lines='<circle cx="50" cy="50" r="39" class="eq-ring"/><circle cx="50" cy="50" r="42" class="eq-ticks"/>';
    [...list.children].forEach((li,i)=>{
      const b=li.querySelector('button'),s=states[i],on=i===current;
      li.classList.toggle('on',on);li.classList.toggle('eq-complete',s.done);li.classList.toggle('eq-warning',!!s.warn);
      li.hidden=!!b.disabled;
      b.querySelector('.bl-sn').textContent=String(i+1).padStart(2,'0');
      b.querySelector('.eq-node-value').textContent=s.text;
      b.querySelector('.eq-node-value').title=s.text;
      b.setAttribute('aria-label',spec(kind)[i].label+' · '+s.text+(on?' · In corso':''));
      if(on)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');
      lines+='<path class="eq-ray'+(s.done?' complete':'')+(on?' current':'')+'" d="M50 50L'+positions[i].join(' ')+'"/>';
    });
    v.querySelector('.eq-map-lines').innerHTML=lines;
    v.querySelector('.eq-phase-count').textContent=String(current+1).padStart(2,'0')+' / 06';
    v.querySelector('.bl-plate .n').textContent=String(current+1).padStart(2,'0');
    v.querySelector('.bl-plate .t').textContent=spec(kind)[current].label;
    v.querySelector('.eq-phase-hint').textContent=spec(kind)[current].hint;
    if(kind==='module'&&o.fuel&&o.fuel.on){
      const p=Math.max(0,Math.min(1,(Number(o.fuel.cur)||0)/(Number(o.fuel.max)||1)));
      const node=list.children[3];node.classList.add('eq-energy-node');node.style.setProperty('--eq-charge',(p*100)+'%');
    } else [...list.children].forEach(n=>n.classList.remove('eq-energy-node'));
    const mini=v.querySelector('.bl-mini');mini.setAttribute('aria-expanded',String(!!BLD.drawer));
    mini.setAttribute('aria-label',BLD.drawer?'Chiudi il riepilogo':'Mostra il riepilogo');
  }
  function scene(v,h,kind){
    const sum=h.closest('.bl-sum');
    if(sum.querySelector('.eq-map'))return;
    sum.parentElement.prepend(sum);sum.classList.add('eq-scene');
    sum.setAttribute('aria-label',kind==='weapon'?'Banco d’arsenale':'Progetto meccanico');
    const cap=make('div','eq-caption');cap.append(make('span','eq-eyebrow',kind==='weapon'?'Banco d’arsenale':'Officina del Corpo Meccanico'),make('span','eq-phase-count'));
    const map=make('div','eq-map');
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','eq-map-lines');svg.setAttribute('aria-hidden','true');
    map.append(svg,h,v.querySelector('.bl-steps'));
    sum.append(cap,map,make('div','eq-satellites'),make('div','eq-scene-status'));
    const hint=make('p','eq-phase-hint');v.querySelector('.bl-plate').after(hint);
  }
  function decorateCore(v,h,kind,o){
    h.classList.add('eq-core');
    const card=h.querySelector('.eqcard');if(!card)return;
    const state=v.querySelector('.eq-scene-status');state.replaceChildren();
    const oldStatus=card.querySelector('.bl-state');if(oldStatus)state.append(oldStatus);
    const attached=v.querySelector('.eq-satellites');attached.replaceChildren();
    const effect=card.querySelector('.eq-e');
    if(effect){
      const b=make('button','eq-effect-satellite');b.type='button';
      b.append(symbol(o.eff&&EFF_CAT_ICO[o.eff.cat]||'star',21),effect,make('span','eq-satellite-arrow','↗'));
      b.setAttribute('aria-label','Modifica effetto');b.dataset.eqFocus='effect-satellite';b.onclick=()=>go(v,kind,kind==='weapon'?4:2);
      attached.append(b);
    }
    if(kind==='module'&&(o.tipo||[]).length){
      const roles=make('div','eq-role-seals');roles.setAttribute('aria-label','Ruoli del modulo');
      o.tipo.forEach(role=>{const s=make('span','eq-role-seal');s.append(symbol(roleIcons[role]||'gear',14),make('span','',role));roles.append(s);});
      attached.append(roles);
    }
    const stamp=make('span','eq-core-label',kind==='weapon'?'Arma personale':'Progetto personale');card.querySelector('.eq-n').before(stamp);
    const fn=card.querySelector('.eq-f');if(fn)fn.title=fn.textContent;
    const name=card.querySelector('.eq-n');name.title=name.textContent;
    const meta=card.querySelector('.eq-m');meta.title=meta.textContent;
    if(kind==='module'){
      card.classList.toggle('eq-damaged',o.stato==='danneggiato');
      const active=make('span','eq-operation-state',modStateLabel(o).t);state.append(active);
    }
  }
  function section(v,name,children){
    const d=make('details','eq-section');d.dataset.eqSection=name;
    const title=make('summary','eq-section-title',name);d.append(title,...children);d.open=v._eqPart===name;
    d.addEventListener('toggle',()=>{
      if(!d.isConnected||!d.open)return;
      v._eqPart=name;
      v.querySelectorAll('.eq-section').forEach(other=>{if(other!==d)other.open=false;});
      updateNavigation(v,'weapon',v._eqObject);
    });
    return d;
  }
  function weaponStructure(v,stage){
    if(stage.querySelector('.eq-section'))return;
    const all=[...stage.children];
    const attr=all.find(n=>n.querySelector('.smb-chips[aria-label="Attributo"]'));
    const range=all.find(n=>n.querySelector('.fld')?.textContent==='Portata');
    if(!attr||!range)return;
    const ai=all.indexOf(attr),ri=all.indexOf(range);
    stage.replaceChildren(section(v,'Grado',all.slice(0,ai)),section(v,'Attributo',all.slice(ai,ri)),section(v,'Portata',all.slice(ri)));
  }
  function decorateChoices(v,kind,o){
    const stage=v.querySelector('.bl-stage');
    if(kind==='weapon'&&BLD.step===1)weaponStructure(v,stage);
    stage.querySelectorAll('.optgrid').forEach((grid,groupIndex)=>{
      const cards=[...grid.querySelectorAll('.optc')];
      const labels=cards.map(c=>c.querySelector('.od')?.textContent||'');
      const isCategory=labels.length===EFF_CATS.length&&labels.every(t=>EFF_CATS.includes(t));
      grid.classList.toggle('eq-category-orbit',isCategory);
      grid.classList.toggle('eq-type-grid',kind==='weapon'&&BLD.step===0);
      cards.forEach((c,i)=>{
        c.setAttribute('role','button');c.tabIndex=0;c.setAttribute('aria-pressed',String(c.classList.contains('sel')));
        c.dataset.eqFocus='option-'+groupIndex+'-'+labels[i];
        if(!c.onkeydown)c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();c.click();}};
        if(isCategory){const a=(-90+i*360/cards.length)*Math.PI/180;c.style.setProperty('--eq-cx',(50+37*Math.cos(a))+'%');c.style.setProperty('--eq-cy',(50+36*Math.sin(a))+'%');}
      });
      if(isCategory&&!grid.querySelector('.eq-category-center')){
        const center=make('div','eq-category-center');center.setAttribute('aria-hidden','true');
        center.append(symbol(o.eff&&EFF_CAT_ICO[o.eff.cat]||'star',25),make('b','',o.eff&&o.eff.cat||'Un effetto'),make('small','','Una categoria'));
        grid.append(center);
      }
    });
    stage.querySelectorAll('.bl-tiers').forEach((group,j)=>{
      const tiers=[...group.querySelectorAll('.bl-tier')];
      tiers.forEach((b,i)=>{b.dataset.eqFocus='tier-'+j+'-'+i;const t=tiers.length===1?.5:i/(tiers.length-1);b.style.setProperty('--eq-tx',(9+82*t)+'%');b.style.setProperty('--eq-ty',(71-43*Math.sin(Math.PI*t))+'%');});
    });
    stage.querySelectorAll('.smb-chips').forEach((group,j)=>{
      const attr=group.getAttribute('aria-label')==='Attributo';group.classList.toggle('eq-attributes',attr);
      const roles=kind==='module'&&BLD.step===0;group.classList.toggle('eq-role-picks',roles);
      [...group.children].forEach((b,i)=>{
        b.dataset.eqFocus='chip-'+j+'-'+i;
        if(roles&&!b.querySelector('.eq-choice-icon')){const role=b.textContent;b.prepend(symbol(roleIcons[role]||'gear',22,'eq-choice-icon'));}
        if(attr&&!b.querySelector('.eq-attr-die')){
          const attribute=b.textContent;
          if(pg.attr&&pg.attr[attribute])b.append(make('small','eq-attr-die',pg.attr[attribute]));
        }
      });
    });
    stage.querySelectorAll('input,textarea,select').forEach((input,i)=>{
      const label=input.parentElement.querySelector('.fld,.lab');
      if(label&&!input.hasAttribute('aria-label'))input.setAttribute('aria-label',label.textContent);
      input.dataset.eqFocus='field-'+(label?label.textContent:i);
      if(label&&(label.textContent==='Nome'||label.textContent==="Nome dell'arma"))input.classList.add('eq-name-input');
    });
    if(kind==='module'&&BLD.step===3&&o.fuel&&o.fuel.on&&!stage.querySelector('.eq-energy-preview')){
      const gauge=make('div','eq-energy-preview');gauge.setAttribute('role','status');stage.prepend(gauge);
    }
    const gauge=stage.querySelector('.eq-energy-preview');
    if(gauge){
      const f=o.fuel;gauge.replaceChildren(symbol('bolt',23),make('b','',String(f.cur||0)+' / '+(f.max||'—')),make('span','',f.tipo||'Cariche'));
    }
    const final=kind==='weapon'?3:5;
    if(BLD.step===final&&!stage.querySelector('.eq-edit-links')){
      const links=make('nav','eq-edit-links');links.setAttribute('aria-label','Modifica il progetto');
      spec(kind).slice(0,5).forEach((node,i)=>{const b=make('button','',node.label+' ↗');b.type='button';b.onclick=()=>go(v,kind,i);links.append(b);});stage.append(links);
    }
  }
  function focus(v,kind){
    const key=kind+'-'+BLD.step+'-'+(kind==='weapon'&&BLD.step===1?v._eqPart:'');
    const same=key===v._eqFocusPhase;v._eqFocusPhase=key;
    if(!same||!v._eqFocus||v.contains(document.activeElement))return;
    const target=[...v.querySelectorAll('[data-eq-focus]')].find(n=>n.dataset.eqFocus===v._eqFocus&&!n.hidden);
    if(target)target.focus({preventScroll:true});
  }
  function present(kind,o,h){
    if(!o||!h.classList.contains('bl-sum-in'))return; // Drawer keeps the complete original card.
    const v=h.closest('#bld');if(!v||!BLD)return;
    if(!v.classList.contains('eq-atelier')){
      v.classList.add('eq-atelier');
      v.addEventListener('focusin',e=>{if(e.target.dataset&&e.target.dataset.eqFocus)v._eqFocus=e.target.dataset.eqFocus;});
    }
    v.classList.toggle('eq-weapon',kind==='weapon');v.classList.toggle('eq-module',kind==='module');
    if(!v._eqPart)v._eqPart='Grado';
    v._eqObject=o; // Reference to the existing object, not a draft or model copy.
    scene(v,h,kind);prepareNavigation(v,kind);decorateCore(v,h,kind,o);decorateChoices(v,kind,o);updateNavigation(v,kind,o);focus(v,kind);
  }
  window.GLCEquipment=Object.freeze({present});
})();
