/* GLC · Musicista. Shared, read-only profiles for Builder, cards and print.
 * A profile never spends resources, advances a scene or edits an instrument. */
(function (root) {
  'use strict';
  const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const ALL_DICE = [...DICE, 'd20+d4', 'd20+d6', 'd20+d8', 'd20+d10', 'd20+d12', 'd20+d20'];
  const TYPES = Object.freeze({
    Corde: 'Le Melodie rivolte a un singolo bersaglio costano 1 ST in meno, minimo 1.',
    Fiati: 'La portata ordinaria delle Canzoni passa da 20 a 40 m; le portate specifiche restano proprie.',
    Percussioni: 'Le Melodie che coinvolgono l’intera ciurma costano 1 ST in meno.',
    Mantice: 'Il mantenimento delle Canzoni Sostenute è gratuito per i primi due turni.',
    Voce: 'Non puoi essere disarmato; nessuno riconosce la Tecnica prima che produca il proprio effetto.'
  });
  const definitions = Object.freeze([
    ['Motivetto di Vigore', 'd6', 2, 'single', 'Un alleato che ti sente, anche tu, recupera 1d6 ST, senza superare la ST Massima. Ogni personaggio ne beneficia 1×/scena, anche con più Musicisti; +1 ST per ogni diverso bersaglio già beneficiato dalle tue precedenti esecuzioni.', 'Immediata'],
    ['Richiamo', 'd6', 1, 'enemies', 'Ogni nemico entro la portata che ti sente deve attaccare te oppure attacca altri bersagli con Svantaggio (Salvezza).', ''],
    ['Marcia di Guerra', 'd6', 2, 'single', 'Canzone Sostenuta: un alleato scelto ha +1d4 agli attacchi finché continui a suonare.', 'Finché continui a suonare', true],
    ['Controcanto', 'd8', 1, 'allies', 'Annulli Terrore, Sopore o charme sugli alleati che ti sentono.', 'Immediata'],
    ['Requiem Beffardo', 'd8', 1, 'single', 'Un nemico che ti sente ha Svantaggio al suo prossimo tiro se fallisce la Salvezza.', 'Prossimo tiro del bersaglio'],
    ['Tempo', 'd8', 2, 'single', 'Un alleato sposta la propria Iniziativa subito dopo la tua per il resto dello scontro.', 'Resto dello scontro'],
    ['Crescendo', 'd10', 2, 'single', 'La prossima Tecnica di un alleato costa 2 ST in meno, minimo 1.', 'Prossima Tecnica dell’alleato'],
    ['Ninnananna', 'd10', 4, 'enemies', 'I nemici entro la portata che ti sentono diventano Addormentati se falliscono la Salvezza. Nessun danno.', 'Secondo lo Stato Addormentato'],
    ['Assolo Travolgente', 'd10', 5, 'allies', 'Gli alleati in ascolto recuperano 1d6 ST e hanno +1d6 al tiro per colpire. +1 ST per ogni utilizzo in più nella stessa scena.', ''],
    ['Inno della Ciurma', 'd12', 5, 'crew', 'Per la scena, ogni compagno sceglie un proprio dado e lo tira due volte tenendo il migliore.', 'Tutta la scena'],
    ['Canto di Bordo', 'd12', 4, 'crew', 'In battaglia navale, per la scena ogni compagno a una postazione aggiunge +1 dado al tiro della sua postazione.', 'Tutta la scena'],
    ['Marcia Funebre', 'd12', 3, 'enemies', 'Canzone Sostenuta: ogni nemico entro la portata che ti sente tira Spirito; chi fallisce è Atterrito finché resta in portata, ti sente e continui a suonare.', 'Finché resti in portata, senti la musica e il Musicista suona', true, 10, 'Marcia Funebre'],
    ["Canzone dell'Anima", 'd20', 6, 'crew', 'Ultimate, 1×/scena: chi della ciurma ti sente, tu compreso, riporta la ST al massimo. La stessa ciurma ne beneficia una sola volta per scena, anche con più Musicisti. Nessun recupero di PV o PIP; richiede Ambizione del Musicista e permesso del GM.', 'Immediata', false, 20, "Canzone dell'Anima"]
  ].map(([name,minGrade,st,target,description,duration,sustained=false,range=20,requiredTalent='']) => Object.freeze({name,minGrade,st,target,description,duration,sustained,range,requiredTalent})));
  const list = x => Array.isArray(x) ? x : [];
  const rank = die => ALL_DICE.indexOf(die);
  const hasRole = pg => pg?.role === 'Musicista' || pg?.role2 === 'Musicista';
  const isSong = t => t?.forma === 'Canzone';
  const get = name => definitions.find(m => m.name === name) || null;
  function arte(pg = {}) {
    return root.GLCTalents?.skillDie(pg,'Arte') || (pg.role === 'Musicista' ? pg.roleSkillDie || 'd8' : pg.skills?.Arte || 'd4');
  }
  function has(pg, name, inherited = false) {
    if (!hasRole(pg)) return false;
    if (root.GLCTalents) return root.GLCTalents.has(pg,name,{includeInherited:inherited});
    const tiers = {'Contrappunto — Base':'d8','Contrappunto — Migliorato':'d10','Contrappunto — Maestria':'d12','Fiato Lungo':'d10','Coro della Ciurma':'d12','Requiem':'d10','Marcia Funebre':'d12',"Canzone dell'Anima":'d20','Musica Incrollabile':'d8'};
    const req = {'Contrappunto — Migliorato':'Contrappunto — Base','Contrappunto — Maestria':'Contrappunto — Migliorato','Marcia Funebre':'Requiem'};
    return !!tiers[name] && rank(arte(pg)) >= rank(tiers[name]) && list(pg.talents).includes('Musicista · Musicista · '+name) && (!req[name] || has(pg,req[name],true));
  }
  function prestige(pg, id) {
    if (!hasRole(pg)) return null;
    if (root.GLCTalents && root.GLCPrestige) return root.GLCPrestige.acquired(pg).find(x => x.id === id) || null;
    // The illustrated sheet also works from a raw PG without the full Role UI.
    // Validate the same musical prerequisites, choice budget and Arte stage.
    const schema = {'orchestra-vivente':'Contrappunto — Maestria','risonanza-leggendaria':'','requiem-sovrano':'Requiem'};
    const level = Math.max(0,rank(arte(pg))-5), limit = Math.min(3,Math.ceil(level/2));
    if (!level) return null;
    const choices = [...new Set(list(pg.prestige?.choices?.musicista))].filter(key => Object.hasOwn(schema,key) && (!schema[key] || has(pg,schema[key],true))).slice(0,limit);
    return choices.includes(id) ? {id,level,costST:id==='requiem-sovrano'?(level===6?5:4):0} : null;
  }
  function instrumentProfile(pg = {}, record, index = -1) {
    if (!record || typeof record!=='object' || Array.isArray(record)) return {id:'instrument:index:'+index,index,raw:record,name:'Strumento storico da revisionare',type:'',grade:'',effective:'',arte:arte(pg),threshold:null,over:false,legacy:true,valid:false,errors:['La registrazione storica dello strumento non è un oggetto valido; resta conservata e non concede uno strumento utilizzabile.'],amplification:''};
    const voice = index === -1 && record.intrinsic === true;
    const grade = voice ? 'd4' : record.die || 'd4';
    const type = voice ? 'Voce' : record.tipo || 'Corde';
    const id = voice ? 'instrument:voice' : record.smcId || record.id ? 'instrument:'+(record.smcId || record.id) : 'instrument:index:'+index;
    const errors = [];
    if (!DICE.includes(grade)) errors.push('Il Grado storico dello strumento '+grade+' è conservato: gli strumenti ordinari vanno da d4 a d20. Scegli uno strumento valido o la voce.');
    if (!Object.hasOwn(TYPES,type)) errors.push('Il tipo storico dello strumento è conservato: scegli Corde, Fiati, Percussioni, Mantice o Voce.');
    const skill = arte(pg), skillRank = rank(skill);
    if (skillRank < 0) errors.push('Definisci il dado corrente di Arte per utilizzare lo strumento.');
    const effective = !errors.length ? DICE[Math.min(DICE.indexOf(grade),Math.min(5,skillRank))] : '';
    return {id,index,raw:record,name:voice?'La tua voce':record.nome||'Strumento senza nome',type,grade,effective,arte:skill,
      threshold:effective?Number(effective.slice(1))/2+1:null,over:!!effective&&effective!==grade,
      legacy:!DICE.includes(grade),valid:!errors.length,errors,amplification:TYPES[type]||''};
  }
  function instruments(pg = {}) {
    return [instrumentProfile(pg,{intrinsic:true,tipo:'Voce',die:'d4'},-1),...list(pg.strumenti).map((a,i) => instrumentProfile(pg,a,i))];
  }
  function instrument(pg, id) {
    const selected = id || 'instrument:voice';
    const found = instruments(pg).find(i => i.id === selected);
    return found || {id:selected,index:-1,raw:null,name:'Strumento non disponibile',type:'',grade:'',effective:'',arte:arte(pg),threshold:null,over:false,legacy:true,valid:false,errors:['Lo strumento collegato non è più disponibile. Il riferimento resta conservato: scegli uno strumento posseduto o la voce.'],amplification:''};
  }
  function evaluate(pg = {}, t = {}, options = {}) {
    const context = {...(t.songContext && typeof t.songContext==='object' ? t.songContext : {}),...(options.context && typeof options.context==='object' ? options.context : {})};
    const selected = instrument(pg,options.instrumentId || t.instrumentId);
    const errors = [], warnings = [], notes = [];
    const add = text => errors.push(text);
    if (!hasRole(pg)) add('La Forma Canzone è riservata al Musicista.');
    if (!isSong(t) || t.fonte !== 'Stile') add('Le Melodie richiedono Fonte Stile e Forma Canzone.');
    const chosen = list(t.eff), original = chosen.length === 1 ? get(chosen[0]) : null;
    if (!original) add('Una Canzone contiene esattamente una Melodia del catalogo.');
    const m = original || {name:'Melodia da scegliere',minGrade:'d4',st:0,target:'',description:'',duration:'',sustained:false,range:20,requiredTalent:''};
    if (!DICE.includes(t.die)) add('Le Canzoni personalizzate hanno Grado da d4 a d20; il Grado storico resta conservato.');
    if (!['Forza','Tecnica','Astuzia','Spirito'].includes(t.attr)) add('Scegli l’Attributo associato alla Canzone.');
    else if (DICE.includes(t.die) && rank(t.die)>Math.min(5,rank(pg.attr?.[t.attr]))) add('Il Grado della Canzone non può superare l’Attributo associato. Arte limita lo strumento, non sostituisce questo requisito.');
    if (rank(t.die) < rank(m.minGrade)) add('La Melodia '+m.name+' richiede una Tecnica almeno '+m.minGrade+'.');
    if (m.requiredTalent && !has(pg,m.requiredTalent)) add('Richiede il Talento acquisito e utilizzabile '+m.requiredTalent+'.');
    selected.errors.forEach(add);
    let st = m.st, description = m.description, duration = m.duration, range = m.range;
    let target = m.target, threshold = selected.threshold, source = 'Grado effettivo dello strumento', sourceDie = selected.effective;
    const sovereign = context.requiemSovrano === true;
    if (sovereign) {
      const state = prestige(pg,'requiem-sovrano');
      if (m.name !== 'Requiem Beffardo' || !state) add('Requiem Sovrano richiede Requiem Beffardo e il relativo Talento di Prestigio acquisito e utilizzabile.');
      else {
        st = state.costST; target = 'enemies'; range = state.level === 6 ? 500 : 50;
        sourceDie = arte(pg); threshold = root.GLCPrestige?.saveThreshold(sourceDie) ?? (ALL_DICE.includes(sourceDie)?sourceDie.split('+').reduce((sum,d)=>sum+Number(d.slice(1)),0)/2+1:null); source = 'Arte completa';
        duration = 'Fino all’inizio del tuo turno successivo';
        description = 'Requiem Sovrano: tutti i nemici nel raggio che ti sentono tirano Spirito contro la Soglia di Arte. Chi fallisce ha Svantaggio a tutti i tiri fino all’inizio del tuo turno successivo. Nessun danno; questa esecuzione sostituisce Requiem Beffardo e ne sostituisce il costo.';
        notes.push('Requiem Sovrano: una sola Azione; costo sostitutivo '+st+' ST, senza sommare il costo di Beffardo o la Soglia dello strumento.');
      }
    }
    const baseST = st;
    function counter(key,label) {
      const value = context[key];
      if (value == null || value === '') {warnings.push(label+': il costo mostrato è quello del primo utilizzo. Indica il conteggio precedente per calcolare l’esecuzione successiva; nessun registro di scena viene modificato.');return 0;}
      const n = Number(value);
      if (!Number.isSafeInteger(n) || n < 0 || n > 999) {add(label+': indica un numero intero da 0 a 999.');return 0;}
      notes.push(label+': '+n+' precedenti, +'+n+' ST.');return n;
    }
    if (m.name === 'Motivetto di Vigore') st += counter('motivettoPreviousTargets','Motivetto · bersagli diversi già beneficiati');
    if (m.name === 'Assolo Travolgente') st += counter('assoloPreviousUses','Assolo · utilizzi precedenti nella scena');
    if (selected.type === 'Corde' && target === 'single') {st = Math.max(1,st-1);notes.push('Corde: −1 ST, minimo 1, per questa Melodia a un bersaglio.');}
    if (selected.type === 'Percussioni') {
      if (target === 'crew' || target === 'allies' && context.entireCrew === true) {st = Math.max(0,st-1);notes.push('Percussioni: −1 ST, la Melodia coinvolge l’intera ciurma.');}
      else if (target === 'allies') warnings.push('Percussioni: lo sconto richiede che questa esecuzione coinvolga l’intera ciurma; dichiaralo nel contesto.');
    }
    if (has(pg,'Fiato Lungo') && st > 0) {st = Math.max(1,st-1);notes.push('Fiato Lungo: −1 ST, minimo 1.');}
    if (selected.type === 'Fiati' && range === 20) {range = 40;notes.push('Fiati: portata ordinaria 20 → 40 m; nessuna modifica alle portate specifiche.');}
    if (context.coroActive === true) {
      if (!has(pg,'Coro della Ciurma')) add('Coro della Ciurma richiede il Talento acquisito e utilizzabile.');
      else {range *= 2;notes.push('Coro della Ciurma: portata ×2; almeno due compagni coscienti partecipano realmente. A bordo il canto raggiunge gli ambienti collegati dove si sente, senza rendere la nave un bersaglio.');}
    } else if (has(pg,'Coro della Ciurma')) warnings.push('Coro della Ciurma: dichiara almeno due compagni coscienti che cantano o suonano realmente per raddoppiare la portata.');
    const orchestra = prestige(pg,'orchestra-vivente');
    const master = has(pg,'Contrappunto — Maestria',true) || !!orchestra;
    const base = has(pg,'Contrappunto — Base',true) || !!orchestra;
    const maxSustained = orchestra ? orchestra.level===6?4:3 : has(pg,'Contrappunto — Migliorato',true)?2:1;
    const pt = m.sustained && !master ? 1 : 0;
    const freeTurns = m.sustained && !master && selected.type==='Mantice' ? 2 : 0;
    const actionRequired = !!m.sustained && !base;
    const maintenanceText = !m.sustained ? 'Questa Melodia non richiede mantenimento.' :
      'Dal turno successivo mantenere richiede '+(master?'0 ST':'1 ST/turno')+(actionRequired?' e l’Azione del Musicista.':' senza impegnare l’Azione grazie a Contrappunto.')+(freeTurns?' Mantice: il mantenimento è gratuito per i primi due turni; poi 1 ST/turno.':'')+' Mantenere non intona di nuovo la Canzone e non ripete i suoi effetti iniziali.';
    if (master && m.sustained) notes.push('Contrappunto / Orchestra: mantenimento gratuito in ST.');
    const risonanza = prestige(pg,'risonanza-leggendaria'), multiplier = risonanza && m.name!=="Canzone dell'Anima" && !sovereign ? risonanza.level===6?3:2 : 1;
    const benefits = {};
    if (m.name==='Motivetto di Vigore' || m.name==='Assolo Travolgente') {benefits.recovery={count:multiplier,die:'d6'};if(multiplier>1)description=description.replace('1d6 ST',multiplier+'d6 ST');}
    if (m.name==='Marcia di Guerra') {benefits.attackBonus={count:multiplier,die:'d4'};if(multiplier>1)description=description.replace('+1d4','+'+multiplier+'d4');}
    if (m.name==='Assolo Travolgente') {benefits.attackBonus={count:multiplier,die:'d6'};if(multiplier>1)description=description.replace('+1d6','+'+multiplier+'d6');}
    if (m.name==='Crescendo') {benefits.techniqueDiscount=2*multiplier;if(multiplier>1)description=description.replace('2 ST',2*multiplier+' ST');}
    if (m.name==='Canto di Bordo') {benefits.stationBonusDice=multiplier;if(multiplier>1)description=description.replace('+1 dado','+'+multiplier+' dadi');}
    if (multiplier>1) notes.push('Risonanza Leggendaria: benefici numerici ordinari ×'+multiplier+'; costi, Vantaggio, ridadi, portata e bersagli restano propri.');
    if (m.name==='Requiem Beffardo' && has(pg,'Requiem',true)) notes.push('Requiem: se il nemico ha già perso almeno 1 PV nello scontro, tira questa Salvezza con Svantaggio. Nessuna seconda Melodia.');
    if (m.name==='Motivetto di Vigore') warnings.push('Ogni beneficiario, anche il Musicista, riceve Motivetto una sola volta per scena, indipendentemente dal numero di Musicisti. Recupero entro la ST Massima; non restituisce PV.');
    if (selected.raw?.note) notes.push('Effetto speciale dello strumento, concordato con il GM: '+selected.raw.note+' Non viene applicato automaticamente.');
    const saving = ['Richiamo','Requiem Beffardo','Ninnananna','Marcia Funebre'].includes(m.name) ? {attribute:'Spirito',threshold,source,die:sourceDie,state:m.name==='Ninnananna'?'Addormentato':m.name==='Marcia Funebre'?'Atterrito':m.name==='Requiem Beffardo'?sovereign?'Svantaggio a tutti i tiri':'Svantaggio al prossimo tiro':'Richiamo',text:'Il bersaglio tira soltanto Spirito contro '+(threshold==null?'la Soglia da definire':'Soglia '+threshold)+(sovereign?' da Arte completa ('+(sourceDie||'Grado da definire')+')':' dal Grado effettivo '+(sourceDie||'da definire')+' dello strumento '+selected.name)+'. Un risultato pari o superiore riesce.'} : null;
    const termination = m.sustained ? 'La Sostenuta termina se smetti, non paghi il mantenimento dovuto, perdi lo strumento usato, diventi Incosciente o non puoi più produrre la musica. Muoversi o essere a terra non la interrompe automaticamente. Musica Incrollabile, se acquisita, impedisce che Stordito o l’essere abbattuto interrompano da soli il canto; non rende immuni agli Stati.' : '';
    const label = st+' ST'+(pt?' +'+pt+' ST/turno':'')+(freeTurns?' · primi due turni gratuiti':'')+((m.name==='Motivetto di Vigore'&&context.motivettoPreviousTargets==null||m.name==='Assolo Travolgente'&&context.assoloPreviousUses==null)?' · primo utilizzo':'');
    return {valid:!errors.length,errors,warnings,notes,melody:{...m,description,target},instrument:selected,cost:{st,pt,baseST,label},duration,maintenance:{st:pt,freeTurns,actionRequired,text:maintenanceText},range,maxSustained,benefits,multiplier,saving,termination,
      actionText:'Intonare richiede l’Azione principale; nessun tiro per colpire, nessuna Firma da margine +4.'+(orchestra?' Orchestra Vivente permette due Canzoni distinte con una sola Azione, pagando ciascuna; ogni Tecnica continua a contenere una sola Melodia.':'')};
  }
  const api = Object.freeze({DICE:Object.freeze(DICE),TYPES,definitions,get,isSong,arte,has,instruments,instrument,instrumentProfile,evaluate});
  root.GLCMelodies = api;
  if (typeof module==='object' && module.exports) module.exports=api;
})(typeof window==='object'?window:globalThis);
