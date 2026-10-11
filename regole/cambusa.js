/* Personal recipes record the GM-approved sheet; they never invent recovery
 * formulas, multiply category bonuses or consume character resources. */
(function(root){
 'use strict';
 const categories=['Carne','Pesce','Verdura','Frutta','Dolci','Brodo'];
 function create(draft,reference){
  const errors=[],text=x=>String(x??'').trim(),d=reference?.dati||{};
  if(!reference?.id)errors.push('Scegli una ricetta ufficiale di riferimento.');
  const recipe={version:2,referenceId:reference?.id||'',referenceName:reference?.nome||'',categoria:text(draft.categoria),ingredienti:text(draft.ingredienti),soglia:Number(draft.soglia),tempo:text(draft.tempo),critico:text(draft.critico),successo:text(draft.successo),stentato:text(draft.stentato),fallimento:text(draft.fallimento),bonus:text(draft.bonus),extra:null,gmApproved:draft.gmApproved===true};
  if(!text(draft.nome))errors.push('Inserisci il nome del piatto.');
  if(!categories.includes(recipe.categoria))errors.push('Scegli una categoria.');
  if(!recipe.ingredienti)errors.push('Indica gli ingredienti richiesti dalla ricetta.');
  if(!Number.isSafeInteger(recipe.soglia)||recipe.soglia<1)errors.push('La Soglia deve essere un intero positivo.');
  for(const key of ['tempo','critico','successo','stentato','fallimento'])if(!recipe[key])errors.push('Completa '+key+'.');
  if(Array.isArray(draft.extra)&&draft.extra.length>1)errors.push('Una ricetta ammette un solo Ingrediente Extra.');
  const extra=Array.isArray(draft.extra)?draft.extra[0]:draft.extra;
  if(extra){recipe.extra={nome:text(extra.nome),bonus:text(extra.bonus)};if(!recipe.extra.nome||!recipe.extra.bonus)errors.push('Completa nome e beneficio dell’Ingrediente Extra.');}
  const description=['Ricetta di riferimento: '+recipe.referenceName,'Categoria: '+recipe.categoria,'Ingredienti richiesti: '+recipe.ingredienti,'Prova: Spirito + Cucina · Soglia '+recipe.soglia,'Tempo: '+recipe.tempo,'Critico: '+recipe.critico,'Successo: '+recipe.successo,'Stentato: '+recipe.stentato,'Fallimento: '+recipe.fallimento];
  if(recipe.bonus)description.push('Bonus della ricetta concordati: '+recipe.bonus);
  if(recipe.extra)description.push('Ingrediente Extra: '+recipe.extra.nome+' · '+recipe.extra.bonus);
  description.push(recipe.gmApproved?'Valori concordati con il GM.':'Bozza: valori da approvare con il GM prima della Prova.');
  return {valid:errors.length===0,errors,recipe,description:description.join('\n')};
 }
 function ingredients(item){
  const value=item?.dati?.ingredienti||item?.recipe?.ingredienti||String(item?.descrizione||item?.desc||'').match(/(?:^|\n)Ingredienti(?: richiesti)?:\s*([^\n]+)/i)?.[1]||'';
  return (Array.isArray(value)?value:String(value).split(/[,;\n]/)).map(x=>String(x).trim()).filter(Boolean);
 }
 root.GLCCambusa={categories,create,ingredients};
})(typeof window!=='undefined'?window:globalThis);
