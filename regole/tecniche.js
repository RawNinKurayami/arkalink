/* GLC · validation of constructed Techniques, shared by Builder and Special Moves.
   Reading a character or a saved Technique never repairs or removes its data. */
(function (root) {
  'use strict';
  const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];
  const SLOTS = {d4: 0, d6: 0, d8: 2, d10: 2, d12: 3, d20: 4};
  const ATTRIBUTES = ['Forza', 'Tecnica', 'Astuzia', 'Spirito'];
  const SHAPES = ['Soffio', 'Onda', 'Marea', 'Solco', 'Lancia', 'Squarcio', 'Scoppio', 'Esplosione', 'Deflagrazione', 'Cataclisma'];
  const rank = die => /^d20\+d(?:4|6|8|10|12|20)$/.test(String(die)) ? 6 : DICE.indexOf(die) + 1;
  const plainDie = die => DICE[Math.max(0, rank(die) - 1)];
  const styles = pg => [[pg.role, pg.style], [pg.role2, pg.style2]].filter(x => x[0] === 'Combattente').map(x => x[1]).filter(x => ['Striker', 'Swordsman', 'Crusher', 'Sniper'].includes(x));
  const hasRole = (pg, role) => pg.role === role || pg.role2 === role;
  const talent = (pg, name) => root.GLCTalents ? root.GLCTalents.has(pg, name, {includeInherited: true}) : (pg.talents || []).some(key => String(key).split(' · ').pop() === name);
  function compatibleWeapon(weapon, style) {
    if (!weapon || style === 'Striker') return false;
    if (style === 'Swordsman') return weapon.tipo === 'Lama' || (weapon.tipo === 'Ad asta' && weapon.asta === 'Tagliente');
    if (style === 'Crusher') return weapon.tipo === 'Contundente' || (weapon.tipo === 'Ad asta' && weapon.asta === 'Contundente');
    if (style === 'Sniper') return ['A distanza', 'Da lancio'].includes(weapon.tipo);
    return false;
  }
  function weaponUseError(pg, weapon) {
    if (!weapon) return 'Scegli un’arma registrata nell’Arsenale.';
    if (!['Forza', 'Tecnica'].includes(weapon.attr)) return 'Definisci nella scheda dell’arma il suo Attributo di riferimento: Forza oppure Tecnica, concordato con il GM.';
    if (!DICE.includes(weapon.grado)) return 'Il Grado dell’arma deve essere da d4 a d20.';
    const die = (pg.attr || {})[weapon.attr] || '';
    if (rank(die) < rank(weapon.grado)) return 'L’arma richiede ' + weapon.attr + ' almeno ' + weapon.grado + '; il pirata possiede ' + (die || 'un Attributo non definito') + '.';
    return '';
  }
  function sourceKey(pg, t) {
    if (t.fonte === 'Frutto') {
      const fruit = pg.frutto || {};
      return JSON.stringify(['Frutto', fruit.nome || '', fruit.tipo || '', fruit.desc || '']);
    }
    const weapon = (pg.armi || []).find(w => w.id === t.arma);
    const module = (pg.moduli || []).find(m => m.id === t.modulo);
    if (weapon) return JSON.stringify(['Arma', weapon.id, weapon.tipo, weapon.asta || '', weapon.eff || null]);
    if (module && pg.race === 'cyborg') return JSON.stringify(['Modulo', module.id, module.req, !!module.arma, module.armaTipo || '', module.armaSottotipo || '', module.asta || '', module.attr || '', module.gradoArma || module.grado || '', module.funzioneTipo || '', module.funzione || '', module.parametri || null, module.tecnicheCompatibili || '', module.eff || null]);
    return '';
  }
  function permissionValid(pg, t) {
    // Modules grant Builder profiles only through a structured Sblocco.
    if (t.modulo) return false;
    const permission = t.sourcePermission;
    return !!(permission && permission.key && permission.key === sourceKey(pg, t) && String(permission.basis || '').trim() && Array.isArray(permission.effects));
  }
  function granted(pg, t, name) {
    return permissionValid(pg, t) && t.sourcePermission.effects.includes(name);
  }
  const catalogue = options => (options && options.catalogue) || [];
  const find = (name, options) => catalogue(options).find(e => e[1] === name);
  const isShape = (name, options) => { const e = find(name, options); return !!e && e[6] === 'sagoma'; };
  function moduleModifiers(pg, t, options) {
    if (!t.modulo || !root.GLCCyborg) return {discountST: 0, discountSlots: 0, unlocks: [], errors: []};
    return root.GLCCyborg.techModifiers(pg, t, catalogue(options));
  }
  function modifiers(t, options) {
    return options && options.moduleModifiers || options && options.pg && moduleModifiers(options.pg, t, options) || {discountST: 0, discountSlots: 0, unlocks: [], errors: []};
  }
  function moduleGrants(pg, t, name, options) {
    const mod = modifiers(t, {...options, pg});
    return !mod.errors.length && (mod.unlocks || []).includes(name);
  }
  function states(t, options) {
    const profiles = {
      Sbilancio: ['Sbilanciato', 'Tecnica'], Sfondamento: ['Stordito', 'Forza'],
      Accecante: ['Accecato', 'Tecnica'], Terrore: ['Atterrito', 'Spirito'],
      Paralisi: ['Paralizzato', 'Forza'], Sopore: ['Addormentato', 'Spirito'],
      Prigione: ['Trattenuto nella Prigione', 'Attributo coerente con la Prigione'],
      Richiamo: ['Richiamo', 'Spirito'], 'Requiem Beffardo': ['Svantaggio al prossimo tiro', 'Spirito'],
      Ninnananna: ['Addormentato', 'Spirito'], 'Marcia Funebre': ['Atterrito', 'Spirito']
    };
    const song = t.forma === 'Canzone', die = song ? options && options.songSaveDie : t.die;
    const threshold = DICE.includes(die) ? Number(die.slice(1)) / 2 + 1 : null;
    return (Array.isArray(t.eff) ? t.eff : []).flatMap(name => {
      if (name === 'Presa') return [{effect: name, state: 'Immobilizzato', attribute: 'Forza', threshold: null, procedure: 'Contesa di Forza ogni turno; nessuna Salvezza graduata.'}];
      if (name === 'Lacerazione') return [{effect: name, state: 'Sanguinante', attribute: '', threshold: null, procedure: 'Nessuna Salvezza automatica; Medicina o cura appropriata.'}];
      const state = profiles[name];
      return state ? [{effect: name, state: state[0], attribute: state[1], threshold, source: song ? 'Grado effettivo dello strumento, entro Arte' : 'Grado della Tecnica', procedure: 'Tira soltanto il bersaglio; risultato pari o superiore alla Soglia riuscito. La Soglia originaria resta fissa finché persiste la stessa causa.'}] : [];
    });
  }
  function group(name, options) {
    const effect = find(name, options);
    if (!effect) return 'unknown/' + name;
    return effect[0] === 'Potenziamento' ? 'Potenziamento/' + name : effect[0] + (effect[6] ? '/' + effect[6] : '');
  }
  function effectSlots(t, name, options) {
    if (isShape(name, options)) return 0;
    if (name === 'Occhio del Ciclone' && t.fonte === 'Frutto' && options && options.nessunoDeiMiei) return 0;
    const mod = modifiers(t, options);
    return !mod.errors.length && mod.module && mod.module.eff && mod.module.eff.tgt === name ? Math.max(0, 1 - (mod.discountSlots || 0)) : 1;
  }
  function cost(t, list, options) {
    let st = 0, pt = 0;
    for (const name of Array.isArray(t.eff) ? t.eff : []) {
      const effect = (list || []).find(e => e[1] === name);
      if (!effect) continue;
      if (name === 'Occhio del Ciclone' && t.fonte === 'Frutto' && options && options.nessunoDeiMiei) continue;
      st += effect[4]; pt += effect[7] || 0;
    }
    if (t.forma === 'Area') {
      if (t.durata === '3 turni') st += 2;
      if (t.durata === 'Mantieni (+1/turno)') pt += 1;
    }
    const mod = modifiers(t, {...options, catalogue: list || []});
    if (!mod.errors.length && mod.discountST > 0 && st > 0) st = Math.max(1, st - mod.discountST);
    return {st, pt};
  }
  function effectError(pg, t, effect, options) {
    options = options || {};
    if (!effect) return 'Effetto non presente nel catalogo aggiornato.';
    const name = effect[1], family = effect[0];
    let minimum = rank(effect[3]);
    if (name === 'Occhio del Ciclone' && t.fonte === 'Frutto' && options.nessunoDeiMiei) minimum = 1;
    if (rank(t.die) < minimum) return 'Richiede una Tecnica almeno ' + effect[3] + '.';
    if (t.forma === 'Canzone') {
      if (family !== 'Melodie del Musicista' || !hasRole(pg, 'Musicista') || t.fonte !== 'Stile') return 'La Forma Canzone è riservata alle Melodie del Musicista.';
      const acquired = options.hasTalent || (name => talent(pg, name));
      if (name === 'Marcia Funebre' && !acquired('Marcia Funebre')) return 'Richiede il Talento Marcia Funebre.';
      if (name === "Canzone dell'Anima" && !acquired("Canzone dell'Anima")) return "Richiede il Talento Supremo Canzone dell'Anima.";
      return '';
    }
    if (family === 'Melodie del Musicista') return 'Una Melodia richiede la Forma Canzone.';
    if (t.forma === 'Difesa' && family !== 'Difesa') return 'La Forma Difesa utilizza soltanto effetti Difesa.';
    if (t.forma === 'Spostamento' && family !== 'Spostamento') return 'La Forma Spostamento utilizza soltanto effetti Spostamento.';
    if (family === 'Difesa' && t.forma !== 'Difesa') return 'Questo effetto richiede la Forma Difesa.';
    if (family === 'Potenziamento' && t.forma !== 'Potenziamento') return 'Questo effetto richiede la Forma Potenziamento.';
    if (['Area', 'Zona Persistente'].includes(family) && t.forma !== 'Area') return 'Questo effetto richiede la Forma Area.';
    if (name === 'Punto di Rottura') return options.precisioneAssoluta && t.fonte === 'Stile' && t.stile === 'Striker' && t.attr === 'Tecnica' && t.forma === 'Singolo' ? '' : 'Richiede Precisione Assoluta e una Tecnica Striker offensiva in mischia basata su Tecnica.';
    if (name === 'Area Ravvicinata') return t.fonte === 'Stile' && ['Swordsman', 'Crusher'].includes(t.stile) ? '' : 'Area Ravvicinata appartiene soltanto a Swordsman e Crusher.';
    if (effect[6] === 'gittata' && Array.isArray(t.eff) && t.eff.includes('Area Ravvicinata')) return 'Area Ravvicinata è centrata sul personaggio e non riceve Gittata.';
    if (t.fonte === 'Frutto') return granted(pg, t, name) || name === 'Occhio del Ciclone' && options.nessunoDeiMiei ? '' : 'La Scheda del Frutto deve autorizzare espressamente questo effetto.';
    const ordinary = (options.whitelist || {})[t.stile] || [];
    const ordinaryName = name.startsWith('Guardia ') ? 'Guardia' : name;
    return ordinary.includes(ordinaryName) || granted(pg, t, name) || moduleGrants(pg, t, name, options) ? '' : 'Questo effetto non appartiene al catalogo dello Stile e richiede una concessione specifica della Fonte.';
  }
  function evaluate(pg, t, options) {
    pg = pg || {}; t = t || {}; options = options || {};
    options = {...options, pg, nessunoDeiMiei: options.nessunoDeiMiei == null ? talent(pg, 'Nessuno dei Miei') : options.nessunoDeiMiei};
    const errors = [], add = (code, text, effect) => errors.push({code, text, ...(effect ? {effect} : {})});
    const song = t.forma === 'Canzone', mine = styles(pg), allowedWeapons = (pg.armi || []).filter(w => compatibleWeapon(w, t.stile));
    const module = (pg.moduli || []).find(m => m.id === t.modulo), linkedWeapon = (pg.armi || []).find(w => w.id === t.arma);
    const compatibleModules = root.GLCCyborg ? (pg.moduli || []).filter(m => root.GLCCyborg.evaluate(pg, m, {purpose: 'build'}).valid && compatibleWeapon(root.GLCCyborg.weapon(m), t.stile)) : [];
    const weapon = linkedWeapon || (module && root.GLCCyborg && root.GLCCyborg.weapon(module)) || null;
    const mod = moduleModifiers(pg, t, options); options.moduleModifiers = mod;
    if (!['Stile', 'Frutto'].includes(t.fonte)) add('source', 'Scegli una Fonte valida: Stile o Frutto.');
    if (song) {
      if (!hasRole(pg, 'Musicista') || t.fonte !== 'Stile') add('song-role', 'La Forma Canzone è riservata al Musicista e usa Fonte Stile.');
    } else {
      if (t.fonte === 'Stile') {
        if (!hasRole(pg, 'Combattente')) add('combat-role', 'Per costruire Tecniche di Stile serve un Ruolo da Combattente.');
        if (!mine.includes(t.stile)) add('style', 'Scegli uno Stile di Combattente posseduto.');
        if (t.stile === 'Striker' && (t.arma || module && module.arma)) add('unarmed', 'Lo Striker costruisce e utilizza Tecniche esclusivamente a mani nude.');
        if (['Swordsman', 'Crusher', 'Sniper'].includes(t.stile)) {
          if (!allowedWeapons.length && !compatibleModules.length) add('weapon-required', 'Lo Stile ' + t.stile + ' richiede un’arma compatibile: senza arma non puoi costruire Tecniche di questo Stile.');
          else if (!weapon) add('weapon-link', 'Scegli l’arma compatibile con cui eseguire la Tecnica.');
          else if (!compatibleWeapon(weapon, t.stile)) add('weapon-style', 'L’arma selezionata non è compatibile con lo Stile ' + t.stile + '.');
        }
      }
      if (t.fonte === 'Frutto') {
        if (!(pg.frutto && pg.frutto.has)) add('fruit-required', 'Il pirata non possiede un Frutto.');
        else if (!['Paramecia', 'Logia', 'Zoan'].includes(pg.frutto.tipo) || t.fruitType !== pg.frutto.tipo) add('fruit-type', 'La Tecnica deve usare il tipo del Frutto realmente posseduto.');
      }
    }
    if (t.arma && !linkedWeapon) add('weapon-missing', 'L’arma collegata non è più nell’Arsenale. Il collegamento è conservato finché non lo correggi.');
    if ((t.arma || module && module.arma) && weapon && t.fonte === 'Stile') {
      const problem = weaponUseError(pg, weapon);
      if (problem) add('weapon-requirements', problem);
    }
    if (t.modulo && (!module || pg.race !== 'cyborg')) add('module-missing', 'Il Modulo collegato non è disponibile sul Corpo Meccanico del pirata.');
    else if (t.modulo && !root.GLCCyborg) add('module-engine', 'Aggiorna la pagina per convalidare il Modulo collegato con le regole Cyborg.');
    else if (t.modulo && module) {
      const check = root.GLCCyborg.evaluate(pg, module, {purpose: options.purpose || 'build'});
      check.errors.forEach(e => add(e.code, e.text));
      if (options.purpose === 'use' && !check.operational) check.operationalErrors.forEach(e => add(e.code, e.text));
      (mod.errors || []).forEach(e => add(e.code, e.text));
    }
    if (t.arma && t.modulo) add('gear-conflict', 'Una Tecnica collega un’arma oppure un Modulo, non entrambi.');
    if (t.fonte === 'Frutto' && (t.arma || t.modulo)) add('fruit-gear', 'Le concessioni di un’arma o di un Modulo non sostituiscono la Scheda del Frutto.');
    if (!ATTRIBUTES.includes(t.attr)) add('attribute', 'Scegli l’Attributo di riferimento.');
    if (!DICE.includes(t.die)) add('grade', 'Le Tecniche personalizzate hanno Grado da d4 a d20, senza progressione di Prestigio.');
    const attrRank = rank((pg.attr || {})[t.attr]), fruitRank = t.fonte === 'Frutto' ? rank((pg.frutto || {}).die) : 6;
    const cap = Math.min(6, attrRank || 0, fruitRank || 0);
    if (DICE.includes(t.die) && rank(t.die) > cap) add('grade-cap', 'Il Grado della Tecnica supera l’Attributo associato' + (t.fonte === 'Frutto' ? ' o il Dado del Frutto' : '') + '.');
    const permission = permissionValid(pg, t), specialArea = SHAPES.some(name => granted(pg, t, name));
    const area = !song && (t.fonte === 'Stile' && ['Swordsman', 'Crusher'].includes(t.stile) || specialArea);
    const sourceAllows = e => {
      const name = e[1].startsWith('Guardia ') ? 'Guardia' : e[1];
      return t.fonte === 'Stile' && ((options.whitelist || {})[t.stile] || []).includes(name) || granted(pg, t, e[1]) || moduleGrants(pg, t, e[1], options);
    };
    const forms = ['Singolo', ...(area ? ['Area'] : []), ...['Spostamento', 'Difesa', 'Potenziamento'].filter(form => catalogue(options).some(e => e[0] === form && sourceAllows(e))), ...(hasRole(pg, 'Musicista') && t.fonte === 'Stile' ? ['Canzone'] : [])];
    if (!forms.includes(t.forma)) add('form', t.forma === 'Area' ? 'Questo Stile o questa Fonte non concede una Forma Area.' : 'Scegli una Forma valida per la Fonte.');
    if (t.eff != null && !Array.isArray(t.eff)) add('effects-data', 'La lista degli effetti salvata non è valida: riaprila e correggila nel Costruttore.');
    const effects = Array.isArray(t.eff) ? t.eff : [], rawUsed = effects.reduce((sum, name) => sum + effectSlots(t, name, options), 0), used = !mod.errors.length && mod.targetKind === 'technique' ? Math.max(0, rawUsed - (mod.discountSlots || 0)) : rawUsed, slot = song ? 1 : (SLOTS[t.die] ?? 0);
    if (used > slot) add('slots', 'Gli effetti occupano ' + used + ' slot; la Tecnica ne possiede ' + slot + '.');
    const groups = new Set(), names = new Set();
    for (const name of effects) {
      const effect = find(name, options), problem = effectError(pg, t, effect, options);
      if (problem) add('effect', name + ': ' + problem, name);
      const family = group(name, options);
      if (names.has(name)) add('duplicate', 'Un effetto non si applica più volte nella stessa Tecnica.', name);
      else if (groups.has(family)) add('family', 'Scegli un solo effetto per famiglia o gruppo; le versioni si sostituiscono.', name);
      names.add(name); groups.add(family);
    }
    if (t.forma === 'Area' && !effects.some(name => isShape(name, options))) add('shape', 'Una Tecnica ad Area richiede una sola sagoma autorizzata.');
    if (song && effects.length !== 1) add('melody', 'Una Canzone contiene esattamente una Melodia.');
    if (t.forma === 'Area') {
      const duration = t.durata || 'Un turno';
      if (!['Un turno', 'Mantieni (+1/turno)', '3 turni', 'Tutta la scena'].includes(duration)) add('duration', 'Scegli una durata prevista dal Costruttore.');
      if (duration === 'Tutta la scena' && t.die !== 'd20') add('duration-grade', 'La durata Tutta la scena richiede una Tecnica d20.');
      if (duration !== 'Un turno' && !effects.some(name => {const e = find(name, options); return e && e[0] === 'Zona Persistente';})) add('persistence', 'Una durata prolungata richiede una Zona Persistente espressamente autorizzata dalla Fonte.');
    }
    const available = catalogue(options).filter(e => !effectError(pg, t, e, options)).map(e => e[1]);
    return {valid: errors.length === 0, errors, slot, used, cost: cost(t, catalogue(options), options), states: states(t, options), cap, dieOpts: DICE.filter(d => rank(d) <= cap), available, forms, compatibleWeapons: allowedWeapons, compatibleModules, sourceKey: sourceKey(pg, t), permissionValid: permission, weapon, module, moduleModifiers: mod};
  }
  const api = Object.freeze({DICE: Object.freeze(DICE), SLOTS: Object.freeze(SLOTS), rank, plainDie, compatibleWeapon, weaponUseError, sourceKey, permissionValid, moduleModifiers, effectError, effectSlots, group, cost, states, evaluate});
  root.GLCTechniques = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window === 'object' ? window : globalThis);
