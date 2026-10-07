/* Acquisition is historical; eligibility and usable versions follow current dice.
 * Shared by management, builders, cards and print. Never deletes acquired records. */
(function (root) {
  'use strict';
  let roles = {}, fruits = {}, dice = ['d4','d6','d8','d10','d12','d20','d20+d4','d20+d6','d20+d8','d20+d10','d20+d12','d20+d20'];
  const list = value => Array.isArray(value) ? value : [];
  const rank = die => dice.indexOf(die);
  function configure(options) {roles = options.roles || roles; fruits = options.fruits || fruits; dice = options.dice || dice;}
  function skillName(c, slot = 1) {
    const role = slot === 2 ? c.role2 : c.role, style = slot === 2 ? c.style2 : c.style;
    const tree = roles[role]; if (!tree) return '';
    const definition = tree.styles?.[style] || Object.values(tree.styles || {})[0];
    const choice = slot === 2 ? c.roleSkillChoice2 : c.roleSkillChoice;
    if (definition?.skill) return definition.skill;
    if (definition?.skillChoice === 'any') return choice || '';
    if (Array.isArray(definition?.skillChoice)) return definition.skillChoice.includes(choice) ? choice : definition.skillChoice[0];
    return tree.skill || '';
  }
  function skillDie(c, name) {
    if (!name) return '';
    const main = skillName(c);
    return main === name ? (c.roleSkillDie || 'd8') : (c.skills?.[name] || '');
  }
  function branches(c) {
    const result = [], seen = new Set();
    [[c.role, c.style, 1], [c.role2, c.style2, 2]].forEach(([role, style, slot]) => {
      const tree = roles[role]; if (!tree || ['Inventore','Special'].includes(style)) return;
      const keyStyle = tree.multi ? style || Object.keys(tree.styles || {})[0] : role;
      const definition = tree.styles?.[tree.multi ? keyStyle : Object.keys(tree.styles || {})[0]];
      const id = role + ' · ' + keyStyle; if (!definition || seen.has(id)) return; seen.add(id);
      const skill = skillName(c, slot);
      result.push({id, role, style: keyStyle, src: 'role', skill, die: skillDie(c, skill), definitions: list(definition.talenti)});
    });
    if (c.frutto?.has && fruits[c.frutto.tipo]) result.push({id:'Frutto · '+c.frutto.tipo, style:c.frutto.tipo, src:'fruit', skill:'Dado del Frutto', die:c.frutto.die || 'd4', definitions:list(fruits[c.frutto.tipo].talenti)});
    return result;
  }
  function states(c) {
    const records = new Set(list(c.talents)), output = [];
    branches(c).forEach(branch => {
      const definitions = new Map(branch.definitions.map(t => [t.n, t]));
      const owned = name => records.has(branch.id + ' · ' + name);
      function eligible(name, visited = []) {
        const t = definitions.get(name);
        if (!t || visited.includes(name) || rank(branch.die) < rank(t.tier || (branch.src === 'fruit' ? 'd4' : 'd8'))) return false;
        if (!t.req) return true;
        if (branch.src === 'fruit' && /^Zoan (Ancestrale|Mitologico)/i.test(t.req)) {
          const nature = c.frutto?.zoanType || c.frutto?.subtipo || c.frutto?.tipoZoan || '';
          return /mitologico/i.test(t.req) ? /mitolog/i.test(nature) : /ancestral/i.test(nature);
        }
        return owned(t.req) && eligible(t.req, [...visited, name]);
      }
      branch.definitions.forEach(definition => {
        const name = definition.n, key = branch.id+' · '+name, valid = eligible(name), taken = owned(name);
        const missing = definition.req && !valid ? [definition.req] : [];
        const ordinaryReplacement = branch.definitions.filter(t => t.n !== name && owned(t.n) && eligible(t.n)
          && t.n.replace(/\s*—\s*(Base|Migliorato|Maestria)$/, '') === name.replace(/\s*—\s*(Base|Migliorato|Maestria)$/, '')
          && /\s*—\s*(Base|Migliorato|Maestria)$/.test(name) && rank(t.tier) > rank(definition.tier))
          .sort((a,b) => rank(b.tier)-rank(a.tier))[0]?.n || '';
        const replacement = root.GLCPrestige?.superseded(c,key) || ordinaryReplacement;
        output.push({...branch, definitions:undefined, definition, name, key, cur:branch.die,
          tier:definition.tier || (branch.src === 'fruit' ? 'd4' : 'd8'), req:definition.req || '', missing,
          eligible:valid, owned:taken, acquired:taken, active:taken && valid && !replacement,
          available:!taken && valid && !replacement, replacedBy:replacement});
      });
    });
    return output;
  }
  function has(c, name, options = {}) {return states(c).some(t => t.name === name && (options.includeInherited ? t.owned && t.eligible : t.active));}
  function active(c) {return states(c).filter(t => t.active);}
  function swapRoles(c) {
    if (!c.role2) throw Error('Scegli prima una seconda classe.');
    const firstSkill = skillName(c,1), secondSkill = skillName(c,2);
    const firstDie = skillDie(c,firstSkill), secondDie = skillDie(c,secondSkill);
    c.skills ||= {};
    if (firstSkill && firstDie) c.skills[firstSkill] = firstDie;
    ['role','style','roleSkillChoice'].forEach(key => {[c[key],c[key+'2']] = [c[key+'2'],c[key]];});
    c.roleSkillDie = secondDie || 'd4';
    if (secondSkill) delete c.skills[secondSkill];
    return c;
  }
  function changeRole(c, changes, slot = 1, options = {}) {
    const oldSkill=skillName(c,slot),oldDie=skillDie(c,oldSkill),hadRole=!!c.role;
    const initial=slot===1&&options.creation&&rank(c.roleSkillDie||'d8')<=rank('d8')&&!Object.values(c.skills||{}).some(d=>rank(d)>rank('d8'))&&!list(c.talents).length&&!list(c.uniqueTraits?.acquired).length&&!c.upgrade&&!c.talentChoices?.granted;
    c.skills ||= {};
    if(slot===1&&!initial&&oldSkill&&oldDie)c.skills[oldSkill]=oldDie;
    const suffix=slot===2?'2':'';
    ['role','style','roleSkillChoice'].forEach(key=>{if(Object.hasOwn(changes,key))c[key+suffix]=changes[key];});
    const newSkill=skillName(c,slot);
    if(slot===1){
      c.roleSkillDie=initial||!hadRole?'d8':(newSkill===oldSkill?oldDie:c.skills[newSkill]||'d4');
      if(newSkill)delete c.skills[newSkill];
    }
    return c;
  }
  root.GLCTalents = {configure, skillName, skillDie, branches, states, active, has, swapRoles, changeRole};
})(typeof window !== 'undefined' ? window : globalThis);
