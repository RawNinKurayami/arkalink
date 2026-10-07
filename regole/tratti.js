/* Ordinary Unique Traits. Unlocks are derived, acquisitions are explicit.
 * The host owns the shared Upgrade/Talent budget: no historic free-text Upgrade
 * value is interpreted as an award, and no Trait is acquired during rendering. */
(function(root){
'use strict';
const D=root.GLCTrattiData;
if(!D)throw Error('Carica il catalogo Tratti prima del motore delle Sinergie.');
const list=v=>Array.isArray(v)?v:[], unique=v=>[...new Set(v)], options={};
const rank=die=>D.dice.indexOf(die), trait=id=>D.traits.find(t=>t.id===id);
function configure(next){Object.assign(options,next||{});return root.GLCTratti;}
function skillDie(c,name){
 if(typeof options.resolveSkill==='function')return options.resolveSkill(c,name)||'';
 // The primary Role Skill has a separate register; every other Skill, including
 // a distinct second Role Skill, lives in skills. Never grant a second free d8.
 const primary=root.GLCPrestige?.paths(c).find(p=>p.slot===1);
 if(primary?.skill===name)return primary.die||'';
 if(!primary&&c.roleSkillChoice===name&&D.skills.includes(name))return c.roleSkillDie||'d8';
 return c.skills?.[name]||'';
}
function stored(c){return unique(list(c?.uniqueTraits?.acquired).filter(id=>typeof id==='string'&&id));}
function normalize(c){
 if(!c||typeof c!=='object')return c;
 if(c.uniqueTraits==null)return c;
 if(typeof c.uniqueTraits!=='object'||Array.isArray(c.uniqueTraits))c.uniqueTraits={};
 c.uniqueTraits.acquired=stored(c);return c;
}
function acquisitionBudget(c,id,take=true,phase='preview'){
 if(typeof options.talentBudget!=='function')return {allowed:!take,remaining:null,reason:take?'Registra una scelta di Talento concessa da un Upgrade per acquisire il Tratto.':''};
 const answer=options.talentBudget(c,{id,take,phase,acquired:stored(c)});
 let result;
 if(typeof answer==='number')result={remaining:Math.max(0,Math.floor(answer)),allowed:!take||answer>0};
 else if(typeof answer==='boolean')result={allowed:answer,remaining:null};
 else if(answer&&typeof answer==='object'){
  result={...answer};
  if(result.remaining!=null)result.remaining=Math.max(0,Math.floor(Number(result.remaining)||0));
  if(typeof result.allowed!=='boolean')result.allowed=!take||Number(result.remaining)>0;
 }else result={allowed:!take,remaining:null};
 if(!result.allowed&&!result.reason)result.reason='Non hai una scelta di Talento da Upgrade disponibile.';
 return result;
}
function states(c){
 c=c||{};const chosen=stored(c), owned=new Set(chosen);
 const evaluated=D.traits.map(t=>{
  const currentAttribute=c.attr?.[t.attribute]||'',currentSkill=skillDie(c,t.skill);
  const requirements=[
   {kind:'attribute',name:t.attribute,required:t.attributeDie,current:currentAttribute,met:rank(currentAttribute)>=rank(t.attributeDie)},
   {kind:'skill',name:t.skill,required:t.skillDie,current:currentSkill,met:rank(currentSkill)>=rank(t.skillDie)},
   ...t.requires.map(id=>({kind:'trait',id,name:trait(id)?.name||id,required:'acquisito',current:owned.has(id)?'acquisito':'non acquisito',met:owned.has(id)}))
  ];
  const unlocked=requirements.every(r=>r.met), acquired=owned.has(t.id);
  return {...t,requirements,currentAttribute,currentSkill,unlocked,owned:acquired,acquired,eligible:acquired&&unlocked};
 });
 return evaluated.map(st=>{
  const replacing=evaluated.find(t=>t.eligible&&t.replaces.includes(st.id)),superseded=!!replacing;
  const active=st.eligible&&!superseded, available=st.unlocked&&!st.acquired&&!superseded;
  const budget=available?acquisitionBudget(c,st.id):{allowed:false,remaining:null};
  const missing=st.requirements.filter(r=>!r.met);
  const unlockReason=missing.length?'Richiede '+missing.map(r=>r.name+' '+r.required).join(' e ')+'.':'';
  const reason=superseded?'Sostituito da '+replacing.name+'.':unlockReason||(!st.acquired&&!budget.allowed?budget.reason||'':'');
  const dependents=evaluated.filter(t=>t.acquired&&t.requires.includes(st.id));
  return {...st,active,available,canAcquire:available&&budget.allowed,budget,superseded,replacedBy:replacing?.id||'',reason,unlockReason,
   canRemove:st.acquired&&!dependents.length,dependentTraits:dependents.map(t=>t.id),
   status:superseded?'evolved':st.acquired?(active?'acquired':'inactive'):st.unlocked?'available':'locked'};
 });
}
const acquired=c=>states(c).filter(t=>t.acquired),active=c=>states(c).filter(t=>t.active);
const has=(c,id)=>active(c).some(t=>t.id===id);
function choose(c,id,take=true){
 if(!c||typeof c!=='object')throw Error('Personaggio non disponibile.');
 const st=states(c).find(t=>t.id===id);
 if(!st)throw Error('Tratto Unico non presente nel catalogo.');
 if(take&&!st.canAcquire)throw Error(st.reason||(st.acquired?'Tratto già acquisito.':'Tratto non disponibile.'));
 if(!take&&!st.acquired)return false;
 if(!take&&!st.canRemove)throw Error('Rimuovi prima '+st.dependentTraits.map(id=>trait(id).name).join(' e ')+': richiede questo Tratto acquisito.');
 const permission=acquisitionBudget(c,id,take,'commit');
 if(!permission.allowed)throw Error(permission.reason||'Scelta di Talento non disponibile.');
 const next=take?unique([...stored(c),id]):stored(c).filter(v=>v!==id);
 c.uniqueTraits??={};c.uniqueTraits.acquired=next;return true;
}
function derivedDP(c){return active(c).reduce((sum,t)=>sum+(Number(t.passiveDefense)||0),0);}
function tree(c){
 const all=states(c);
 return D.skills.map(skill=>({skill,die:skillDie(c,skill),traits:all.filter(t=>t.skill===skill),
  synergies:unique(all.filter(t=>t.skill===skill).map(t=>t.attribute)).map(attribute=>({attribute,skill,
   attributeDie:c.attr?.[attribute]||'',skillDie:skillDie(c,skill),traits:all.filter(t=>t.skill===skill&&t.attribute===attribute)}))}));
}
root.GLCTratti={data:D,configure,rank,trait,skillDie,stored,normalize,states,acquired,active,has,choose,derivedDP,tree,acquisitionBudget};
})(typeof window!=='undefined'?window:globalThis);
