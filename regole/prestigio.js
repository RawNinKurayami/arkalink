/* Prestige rules shared by the sheet, builders, cards and print payload.
 * Unlocks are derived from current dice; choices are preserved if prerequisites
 * temporarily disappear. No migration deletes a character's acquired talents. */
(function(root){
'use strict';
const D=root.GLCPrestigeData, list=x=>Array.isArray(x)?x:[], unique=x=>[...new Set(x)];
let ordinary={};
const rank=die=>D.dice.indexOf(die),level=die=>Math.max(0,rank(die)-5),slots=die=>Math.min(3,Math.ceil(level(die)/2));
const label=die=>level(die)===6?'Saikyō':level(die)?'Prestigio '+D.stages[level(die)-1]:'';
const talent=id=>D.talents.find(t=>t.id===id);
const skillFor=(c,role,style,slot)=>{
 const tree=ordinary[role],s=tree?.styles?.[style]||Object.values(tree?.styles||{})[0];
 const choice=slot===2?c.roleSkillChoice2:c.roleSkillChoice;
 return s?.skill||(Array.isArray(s?.skillChoice)?(s.skillChoice.includes(choice)?choice:s.skillChoice[0]):s?.skillChoice==='any'?choice:'')||tree?.skill||D.paths.find(p=>p.role===role&&p.style===style)?.skill||'';
};
function paths(c){
 const mainSkill=skillFor(c,c.role,c.style,1),out=[];
 [[c.role,c.style,1],[c.role2,c.style2,2]].forEach(([role,style,slot])=>{
  const skill=skillFor(c,role,style,slot);
  const p=D.paths.find(p=>p.role===role&&p.style===(style||role)&&p.skill===skill);
  if(p&&!out.some(x=>x.role===p.role&&x.style===p.style))out.push({...p,slot,die:skill===mainSkill?(c.roleSkillDie||'d8'):(c.skills?.[skill]||'')});
 });return out;
}
function prefix(p){return p.role+' · '+p.style+' · ';}
function ownsOrdinary(c,p,name,visited=[]){
 if(visited.includes(name))return false;
 const def=ordinary[p.role]?.styles?.[p.style]?.talenti?.find(t=>t.n===name);
 if(!def||!list(c.talents).includes(prefix(p)+name)||rank(p.die)<rank(def.tier||'d8'))return false;
 return !def.req||ownsOrdinary(c,p,def.req,[...visited,name]);
}
function choices(c,key){return unique(list(key==='spirito'?c.prestige?.spirit:c.prestige?.choices?.[key]).filter(x=>typeof x==='string'));}
function states(c,key){
 const p=key==='spirito'?{id:key,die:c.attr?.Spirito,skill:'Spirito',talents:D.talents.filter(t=>t.paths.includes(key)).map(t=>t.id)}:paths(c).find(p=>p.id===key);
 if(!p)return [];
 const chosen=choices(c,key),limit=slots(p.die),eligible=chosen.filter(id=>p.talents.includes(id)&&talent(id).requires.every(n=>ownsOrdinary(c,p,n))).slice(0,limit);
 return p.talents.map(id=>{
  const t=talent(id),owned=chosen.includes(id),missing=t.requires.filter(n=>!ownsOrdinary(c,p,n)),active=owned&&eligible.includes(id),full=eligible.length>=limit;
  let reason='';
  if(!level(p.die))reason='Richiede '+p.skill+' d20+d4.';
  else if(missing.length)reason='Richiede '+missing.join(' e ')+', con la relativa catena di prerequisiti.';
  else if(!active&&full)reason='Scelte esaurite: '+limit+'. Una scelta ai Prestigi I, III e V; nessuna quarta a Saikyō.';
  const max=level(p.die)===6;
  return {...t,path:p,owned,active,available:!owned&&!reason,reason,level:level(p.die),costST:max?t.saikyoST:t.costST,limit:max?t.saikyoUses:t.uses};
 });
}
function acquired(c){return [...paths(c).flatMap(p=>states(c,p.id)),...states(c,'spirito')].filter(s=>s.active);}
const has=(c,id)=>acquired(c).some(s=>s.id===id);
function choose(c,key,id,take){
 const st=states(c,key).find(t=>t.id===id);if(!st)throw Error('Percorso o talento non disponibile.');
 if(take&&!st.available)throw Error(st.reason||'Talento già acquisito.');
 c.prestige??={};c.prestige.choices??={};
 const next=take?unique([...choices(c,key),id]):choices(c,key).filter(x=>x!==id);
 if(key==='spirito')c.prestige.spirit=next;else c.prestige.choices[key]=next;
}
function superseded(c,key){
 const parts=String(key).split(' · '),name=parts.slice(2).join(' · '),p=paths(c).find(p=>p.role===parts[0]&&p.style===parts[1]);
 if(!p)return '';
 const evolved=states(c,p.id).find(s=>s.active&&s.replaces.includes(name));if(evolved)return evolved.name;
 const rootName=name.replace(/\s*—\s*(Base|Migliorato|Maestria)$/,'');
 if(rootName===name)return '';
 const defs=ordinary[p.role]?.styles?.[p.style]?.talenti||[];
 const upgrades=defs.filter(t=>t.n!==name&&t.n.replace(/\s*—\s*(Base|Migliorato|Maestria)$/,'')===rootName&&rank(t.tier)>rank(defs.find(t=>t.n===name)?.tier)&&ownsOrdinary(c,p,t.n));
 return upgrades.sort((a,b)=>rank(b.tier)-rank(a.tier))[0]?.n||'';
}
function inherited(c,key){
 const parts=String(key).split(' · '),p=paths(c).find(p=>p.role===parts[0]&&p.style===parts[1]),name=parts.slice(2).join(' · ');
 if(!p)return [];
 const defs=ordinary[p.role]?.styles?.[p.style]?.talenti||[],rootName=name.replace(/\s*—\s*(Base|Migliorato|Maestria)$/,'');
 return defs.filter(t=>t.n!==name&&t.n.replace(/\s*—\s*(Base|Migliorato|Maestria)$/,'')===rootName&&superseded(c,prefix(p)+t.n)===name);
}
function normalize(c){
 if(!c||typeof c!=='object')return c;
 if(c.prestige&&(typeof c.prestige!=='object'||Array.isArray(c.prestige)))c.prestige={};
 const spirit=rank(c.attr?.Spirito)>=0?c.attr.Spirito:'d4';
 list(c.haki).forEach(h=>{
  if(!h||typeof h!=='object')return;
  if(h.name==='Haki del Re'){h.prestigeGM=Math.max(0,Math.min(3,Math.floor(Number(h.prestigeGM)||0)));return;}
  if(!["Haki dell'Armamento","Haki dell'Osservazione"].includes(h.name))return;
  if(rank(h.die)>rank(spirit)){
   h.prestigePreviousDice=unique([...list(h.prestigePreviousDice),h.die]);h.die=spirit;
  }
  h.pip=Math.max(0,Math.min(5,rank(h.die)));
  const i=["Haki dell'Armamento","Haki dell'Osservazione"].indexOf(h.name),state=c.specialMoveSession?.haki?.[hakiId(h,i)];
  if(state){if(Number.isFinite(state.pipRemaining))state.pipRemaining=Math.max(0,Math.min(h.pip,state.pipRemaining));if(!h.pip){state.active=false;state.effects={};state.pipRemaining=0;}}
 });return c;
}
const effectiveHakiDie=(c,h)=>h.name==='Haki del Re'?'':D.dice[Math.max(0,Math.min(rank(h.die),rank(c.attr?.Spirito)))];
const hakiLevel=(c,h)=>h.name==='Haki del Re'?Math.max(0,Math.min(3,Math.floor(Number(h.prestigeGM)||0))):level(effectiveHakiDie(c,h));
function text(blocks){return blocks.map(b=>b.type==='table'?b.rows.map(row=>row.join(' · ')).join('\n'):b.text).join('\n\n');}
function hakiRows(c,h,includeLocked=false){
 const color=["Haki dell'Armamento","Haki dell'Osservazione",'Haki del Re'].indexOf(h.name),lv=hakiLevel(c,h),max=lv===(color===2?3:6);
 const rows=D.haki.filter(t=>t.color===color&&(includeLocked||t.level<=lv)).filter(t=>includeLocked||!(color===2&&lv===3&&t.id==='impatto-sovrano')).map(t=>{
  const durationTurns=max?t.saikyoDuration:t.duration;
  return {...t,k:'prestige-'+t.id,liv:color===2?(t.level===3?'Saikyō':'Prestigio '+D.stages[t.level-1]):'Prestigio '+D.stages[t.level-1],prestige:true,unlocked:t.level<=lv,pass:'',act:t.name+': '+text(t.blocks),cost:max?t.saikyoCost:t.cost,durationTurns,variantGroup:t.group,saikyo:max};
 });
 // The explicitly optional Saikyō payment never removes the shorter 2/4 PIP option.
 if(max&&!includeLocked&&color!==2){
  const optional=['armatura-totale-superiore','ryou-persistente','previsione-breve-prolungata','anticipo-offensivo'];
  return rows.flatMap(row=>{
   if(!optional.includes(row.id))return [row];
   const base=D.haki.find(t=>t.id===row.id),standard={...row,k:row.k+'-standard',cost:base.cost,durationTurns:base.duration,saikyo:false};
   standard.act=row.name+' · effetto standard: '+text(base.blocks);
   return [standard,{...row,act:row.name+' · potenziamento Saikyō: '+text(base.blocks)}];
  });
 }
 return rows;
}
function benefits(c,attr){
 const lv=level(c.attr?.[attr]);if(!lv)return [];
 const styles=paths(c).map(p=>p.style),n=lv-1,out=[],add=(id,name,value,unit,detail)=>out.push({id,name,value,unit,detail});
 if(attr==='Forza'&&styles.some(s=>['Striker','Crusher'].includes(s))){
  add('destruction','Distruzione dello scenario',D.scales.destruction[n],'m di raggio','Solo impatti di Forza validi sullo scenario. Le creature richiedono un Talento o una Tecnica ad area. Fasce: D / D÷2 / D÷4 / D÷8.');
  add('projection','Proiezione Colossale',D.scales.projection[n],'m','Richiede Proiezione in una Tecnica offensiva in mischia. Con Schianto: un tiro completo di Forza al primo urto, al posto di d8.');
 }
 if(attr==='Tecnica'&&styles.some(s=>['Striker','Swordsman'].includes(s))){
  add('movement','Spostamento Fulmineo',D.scales.movement[n],'m per turno','Budget condiviso per turno: Scatto 1 ST, Inseguire 2 ST, Balzo 1 ST. Servono gli effetti e i relativi slot nella Tecnica. Il Movimento ordinario è separato.');
  add('jump','Agilità Sovrumana',D.scales.jump[n],'m di altezza','Puoi usare appoggi normalmente impossibili, come pareti e funi.'+(lv>=3?' Puoi eseguire Balzo anche nell’aria.':'')+(lv>=5?' Puoi restare sospeso fino all’inizio del tuo prossimo turno.':'')+' Balzo richiede 1 ST e il suo slot nella Tecnica; ogni metro percorso consuma il budget condiviso.');
 }
 if(['Forza','Tecnica'].includes(attr)&&styles.includes('Swordsman')){
  if(has(c,'fendente-sovrano'))add('slash','Fendente Sovrano',D.scales.slash[n],'m','Tecnica con lama: danno pieno e +1 ST. Usa la scala dell’Attributo previsto dal colpo.');
  if(has(c,'taglio-colossale'))add('cut','Taglio Colossale',D.scales.cut[n],'m di sezione','Un elemento dello scenario; +un tiro completo dell’Attributo al danno strutturale, 2 ST e una Bonus.');
 }
 if(attr==='Astuzia'&&styles.includes('Sniper')){
  add('range','Calcolo Balistico Sovrumano',D.scales.range[n],'m di gittata minima','Arma compatibile e bersaglio individuato; conserva eventuali portate superiori. Difese, traiettoria e limiti della Tecnica restano validi.');
  add('deviations','Geometria del Tiro',D.scales.deviations[n],'deviazioni','Richiede Colpo Impossibile e i suoi 2 ST. Non aggiunge bersagli o distanze a Rimbalzo e Catena.');
 }
 return out;
}
// Attribute packages use their own governing die, not necessarily the attack die.
function techniqueBenefits(c,t){
 if(!t||t.fonte!=='Stile'||!paths(c).some(p=>p.style===t.stile))return [];
 const eff=list(t.eff),out=[];
 if(['Striker','Crusher'].includes(t.stile)&&t.forma==='Singolo'&&eff.includes('Proiezione'))out.push(...benefits(c,'Forza').filter(b=>b.id==='projection'));
 if(['Striker','Swordsman'].includes(t.stile)&&eff.some(n=>['Scatto','Inseguire','Balzo'].includes(n)))out.push(...benefits(c,'Tecnica').filter(b=>b.id==='movement'||b.id==='jump'&&eff.includes('Balzo')));
 if(t.stile==='Sniper')out.push(...benefits(c,'Astuzia').filter(b=>b.id==='range'));
 if(t.stile==='Swordsman')out.push(...benefits(c,t.attr).filter(b=>['slash','cut'].includes(b.id)));
 return out;
}
const hakiId=(h,i)=>'haki:'+(h.smcId||h.name)+':'+i;
function recover(c,distribution){
 if(!has(c,'riscossa-della-volonta'))throw Error('Riscossa della Volontà non è acquisita o sbloccata.');
 if(c.prestige?.session?.riscossaUsed)throw Error('Riscossa già usata: serve un riposo breve o lungo.');
 const amount=level(c.attr?.Spirito),names=["Haki dell'Armamento","Haki dell'Osservazione",'Haki del Re'];let total=0,updates=[];
 for(const [id,v]of Object.entries(distribution||{})){
  if(!Number.isInteger(v)||v<0)throw Error('Indica un numero intero di PIP.');
  const h=list(c.haki).find(h=>hakiId(h,names.indexOf(h.name))===id);if(!h)throw Error('Colore non posseduto.');
  const max=h.name==='Haki del Re'?Math.max(0,Math.min(3,Number(h.pip)||0)):Math.max(0,Math.min(5,rank(effectiveHakiDie(c,h))));
  const state=c.specialMoveSession?.haki?.[id]||{},cur=Math.max(0,Math.min(max,Number.isFinite(state.pipRemaining)?state.pipRemaining:max));
  if(cur+v>max)throw Error('Il recupero supera il massimo di '+h.name+'.');
  total+=v;updates.push([id,{...state,pipRemaining:cur+v}]);
 }
 if(total>amount)throw Error('Riscossa recupera al massimo '+amount+' PIP complessivi.');
 if(!total)throw Error('Assegna almeno un PIP a una riserva.');
 c.specialMoveSession??={};c.specialMoveSession.haki??={};updates.forEach(([id,state])=>c.specialMoveSession.haki[id]=state);
 c.prestige??={};c.prestige.session??={};c.prestige.session.riscossaUsed=true;return total;
}
root.GLCPrestige={data:D,configure:v=>ordinary=v,rank,level,slots,label,paths,states,choices,acquired,has,choose,superseded,inherited,normalize,effectiveHakiDie,hakiLevel,hakiRows,benefits,techniqueBenefits,text,recover,hakiId};
})(typeof window!=='undefined'?window:globalThis);
