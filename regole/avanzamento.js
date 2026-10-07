/* One ordinary Upgrade choice is shared by role/fruit Talents and Unique Traits.
 * Historical acquisitions survive migration; Prestige has its own I/III/V choices. */
(function (root) {
  'use strict';
  const list = value => Array.isArray(value) ? value : [];
  const integer = value => {const text=String(value ?? '').trim(),n=Number(text);return /^\d+$/.test(text)&&Number.isSafeInteger(n)?n:null;};
  function used(c) {
    return new Set(list(c?.talents).filter(k => typeof k === 'string')).size
      + new Set(list(c?.uniqueTraits?.acquired).filter(k => typeof k === 'string')).size;
  }
  function talentChoices(c) {
    const spent = used(c), stored = integer(c?.talentChoices?.granted);
    const granted = stored === null ? Math.max(spent, integer(c?.upgrade) ?? 0) : stored;
    return {granted, used: spent, remaining: Math.max(0, granted - spent), overdrawn: Math.max(0, spent - granted)};
  }
  function normalize(c) {
    if (!c || typeof c !== 'object') return c;
    if (!c.talentChoices || typeof c.talentChoices !== 'object' || Array.isArray(c.talentChoices)) {
      c.talentChoices = {version: 1, granted: talentChoices(c).granted};
    } else if (integer(c.talentChoices.granted) === null) {
      c.talentChoices.granted = Math.max(used(c), integer(c.upgrade) ?? 0);
    }
    return c;
  }
  function setGranted(c, value) {
    const total = integer(value);
    if (total === null || !Number.isSafeInteger(total)) throw Error('Indica un numero intero di scelte concesse dagli Upgrade.');
    if (total < used(c)) throw Error('Le scelte concesse non possono essere meno delle acquisizioni registrate.');
    normalize(c); c.talentChoices.granted = total;
    return talentChoices(c);
  }
  function grant(c) {
    return setGranted(c, talentChoices(c).granted + 1);
  }
  function canAcquire(c) {
    const state = talentChoices(c);
    return {allowed: state.remaining > 0, remaining: state.remaining,
      reason: state.remaining > 0 ? '' : 'Nessuna scelta di Talento disponibile: registra prima una scelta concessa da un Upgrade.'};
  }
  function chooseTalent(c, key, take = true, eligible = true) {
    if (typeof key !== 'string' || !key) throw Error('Talento non valido.');
    const owned = list(c.talents).includes(key);
    if (take) {
      if (owned) throw Error('Talento già acquisito.');
      if (root.GLCTalents) eligible = eligible && !!root.GLCTalents.states(c).find(t => t.key === key && t.available);
      if (!eligible) throw Error('I requisiti del Talento non sono soddisfatti.');
      const budget = canAcquire(c); if (!budget.allowed) throw Error(budget.reason);
    }
    normalize(c);
    c.talents = take ? [...list(c.talents), key] : list(c.talents).filter(k => k !== key);
    return talentChoices(c);
  }
  root.GLCAdvancement = {talentChoices, normalize, setGranted, grant, canAcquire, chooseTalent};
})(typeof window !== 'undefined' ? window : globalThis);
