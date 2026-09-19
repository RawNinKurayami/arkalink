/* Signature Move Builder · presentation only.
   Reuses the original controls, callbacks and TBUILD/SMBD. No game state,
   rule, filter, persistence or builder navigation is implemented here. */
(function () {
  'use strict';
  const nodes = [
    {icon: 'scroll', x: 50, y: 10, hint: 'Dai un nome alla Tecnica e scegli da dove nasce.'},
    {icon: 'compass', x: 86, y: 37, hint: 'Definisci l’Attributo, la Forma e come la esegui.'},
    {icon: 'bolt', x: 73, y: 83, hint: 'Scegli il dado: determina la potenza e gli slot disponibili.'},
    {icon: 'star', x: 27, y: 83, hint: 'Esplora una famiglia e componi gli effetti della Tecnica.'},
    {icon: 'book', x: 14, y: 37, hint: 'Rileggi la Tecnica, aggiungi il suo colore e salvala.'}
  ];
  const make = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const icon = (cls, html) => {
    const n = make('span', cls); n.innerHTML = html;
    n.setAttribute('aria-hidden', 'true'); return n;
  };
  function fullSummary(h) {
    const plaque = make('div', 'plaque'), pin = make('div', 'plaque-in');
    plaque.append(pin); smbPlaque(pin, false); h.append(plaque);
  }
  function sourceName() {
    return TBUILD.fonte === 'Frutto'
      ? ((pg.frutto && pg.frutto.nome) || ('Frutto ' + (TBUILD.fruitType || '')))
      : (TBUILD.stile || (SMBD.musica ? 'Musicista' : 'Stile'));
  }
  function sourceIcon(size) {
    const key = TBUILD.fonte === 'Frutto' ? TBUILD.fruitType : (TBUILD.stile || (SMBD.musica ? 'Musicista' : ''));
    return STYLE_IMG[key] ? emblem(STYLE_IMG[key], size) : svgIcon(STYLE_ICON[key] || FONTE_ICO[TBUILD.fonte] || 'star', Math.round(size * .6));
  }
  function metric(label, value) {
    const n = make('div', 'smb-core-metric');
    n.append(make('dt', '', label), make('dd', '', value)); return n;
  }
  function core(h) {
    h.classList.add('smb-core');
    const seal = make('div', 'smb-core-seal');
    seal.append(icon('smb-core-engraving', smbSigil()), icon('smb-core-emblem', sourceIcon(74)));
    h.append(seal, make('p', 'smb-eyebrow', 'La tua Tecnica'));
    const title = make('h3', 'smb-core-name', (TBUILD.nome || '').trim() || 'Una nuova firma');
    title.title = title.textContent;
    h.append(title, make('p', 'smb-core-source', sourceName()));
    const form = make('p', 'smb-core-form');
    form.append(icon('', svgIcon(FORMA_ICO[TBUILD.forma] || 'star', 15)), document.createTextNode(TBUILD.forma));
    h.append(form);
    const values = make('dl', 'smb-core-values');
    values.append(metric('Dado danno', TBUILD.attr ? TBUILD.die : '—'), metric('Costo', tecCostLabel(TBUILD)));
    h.append(values);
    const slots = make('div', 'smb-core-slots');
    slots.append(make('span', '', (TBUILD.forma === 'Canzone' ? 'Melodia' : 'Slot') + ' ' + slotUsed(TBUILD.eff) + ' / ' + (SMBD.slot || 1)));
    const pips = make('span', 'smb-slot-pips'); pips.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < (SMBD.slot || 1); i++) pips.append(make('i', i < slotUsed(TBUILD.eff) ? 'filled' : ''));
    slots.append(pips); h.append(slots);
    const gear = TBUILD.arma ? (pg.armi || []).find(a => a.id === TBUILD.arma) : TBUILD.modulo ? (pg.moduli || []).find(m => m.id === TBUILD.modulo) : null;
    if (gear) h.append(make('p', 'smb-core-gear', gear.nome || (TBUILD.arma ? 'Arma senza nome' : 'Modulo')));
  }
  function updateNodes(v) {
    const complete = [!!(TBUILD.nome || '').trim() && !SMBD.BLOCK, !!TBUILD.attr && !SMBD.BLOCK,
      !!TBUILD.attr && SMBD.dieOpts.includes(TBUILD.die), !!TBUILD.eff.length,
      SMBD.stato.s === 'ok' && BLD.step === 4];
    const sp = v.querySelector('.bl-steps');
    [...sp.children].forEach((li, i) => {
      const b = li.querySelector('.bl-stepb'), n = nodes[i];
      li.hidden = b.disabled; // Only states already disabled by the existing gate.
      li.style.setProperty('--node-x', n.x + '%'); li.style.setProperty('--node-y', n.y + '%');
      li.classList.toggle('smb-complete', complete[i]);
      if (!b.querySelector('.smb-node-glyph')) b.prepend(icon('smb-node-glyph', svgIcon(n.icon, 25)));
      let sub = b.querySelector('.smb-node-state');
      if (!sub) { sub = make('small', 'smb-node-state'); b.append(sub); }
      const status = i === BLD.step ? 'In corso' : complete[i] ? 'Definita' : 'Disponibile';
      sub.textContent = i === 3 && i !== BLD.step && complete[i] ? slotUsed(TBUILD.eff) + ' / ' + SMBD.slot + ' slot' : status;
      b.setAttribute('aria-label', (i + 1) + ' · ' + b.querySelector('.bl-sl').textContent + ' · ' + status);
      b.dataset.smbFocus = 'phase-' + i;
    });
    const svg = v.querySelector('.smb-map-lines');
    let paths = '<ellipse cx="50" cy="48" rx="36" ry="37" class="smb-orbit-line"/><ellipse cx="50" cy="48" rx="39" ry="40" class="smb-orbit-ticks"/>';
    nodes.forEach((n, i) => {
      if (sp.children[i].hidden) return;
      paths += '<path class="smb-ray' + (complete[i] ? ' complete' : '') + (i === BLD.step ? ' current' : '') + '" d="M50 48L' + n.x + ' ' + n.y + '"/>';
    });
    svg.innerHTML = paths;
    const state = v.querySelector('.smb-scene-state');
    const message = SMBD.stato.s === 'ok' ? '✓ Pronta da salvare' : SMBD.stato.m;
    if (state.textContent !== message) state.textContent = message;
    state.classList.toggle('ready', SMBD.stato.s === 'ok');
    v.querySelector('.smb-phase-count').textContent = String(BLD.step + 1).padStart(2, '0') + ' / 05';
    const mini = v.querySelector('.bl-mini');
    mini.setAttribute('aria-expanded', String(!!BLD.drawer));
    mini.setAttribute('aria-label', BLD.drawer ? 'Chiudi il riepilogo' : 'Mostra il riepilogo');
  }
  function satellites(v) {
    const host = v.querySelector('.smb-attached'); host.replaceChildren();
    if (!TBUILD.eff.length) {
      host.append(make('p', 'smb-attachment-empty', 'Gli effetti scelti si uniranno al nucleo.')); return;
    }
    host.setAttribute('aria-label', 'Effetti della Tecnica');
    TBUILD.eff.forEach(name => {
      const e = tecEffObj(name), b = make('button', 'smb-satellite'); b.type = 'button';
      b.append(icon('', effGlyph(name, e && e[0], 19)), make('span', '', name));
      b.title = 'Rivedi ' + name; b.dataset.smbFocus = 'satellite-' + name;
      // Navigate through the same gate. Selection/removal still belongs to the original effect card.
      b.onclick = () => { TBUILD._fam = e ? e[0] : TBUILD._fam; bldGo(3); };
      host.append(b);
    });
  }
  function decoratePanel(v) {
    const ws = v.querySelector('.bl-ws'), stage = ws.querySelector('.bl-stage');
    ws.setAttribute('aria-label', 'Scelte · ' + bldSteps()[BLD.step].label);
    if (!ws.querySelector('.smb-phase-hint')) {
      const hint = make('p', 'smb-phase-hint', nodes[BLD.step].hint);
      ws.querySelector('.bl-plate').after(hint);
    }
    stage.querySelectorAll('.smb-chips').forEach(group => {
      const label = group.getAttribute('aria-label') || '';
      group.classList.toggle('smb-source-picks', label === 'Fonte');
      group.classList.toggle('smb-attribute-picks', label === 'Attributo');
      group.classList.toggle('smb-form-picks', label === 'Forma');
      [...group.children].forEach((chip, i) => {
        chip.dataset.smbFocus = 'choice-' + label + '-' + i;
        // The engine already marks these options as unavailable and supplies no handler.
        chip.hidden = chip.getAttribute('aria-disabled') === 'true';
      });
    });
    const name = stage.querySelector('.smb-name');
    if (name) {
      name.dataset.smbFocus = 'name';
      if (!name.previousElementSibling) name.before(make('div', 'smb-name-label', 'Nome della Tecnica'));
    }
    stage.querySelectorAll('textarea').forEach(n => { n.dataset.smbFocus = 'description'; n.setAttribute('aria-label', 'Descrizione / colore (facoltativo)'); });
    if (BLD.step === 0 && !stage.querySelector('.smb-source-context')) {
      const source = stage.querySelector('.smb-source-picks');
      if (source) {
        const info = make('div', 'smb-source-context');
        info.append(icon('', sourceIcon(40)), make('span', '', sourceName()));
        source.parentElement.after(info);
      }
    }
    const tiers = stage.querySelector('.bl-tiers');
    if (tiers) {
      const picks = [...tiers.querySelectorAll('.bl-tier')];
      picks.forEach((b, i) => {
        b.dataset.smbFocus = 'die-' + b.querySelector('.bl-tl').textContent;
        const t = picks.length === 1 ? .5 : i / (picks.length - 1);
        b.style.setProperty('--tier-x', (10 + t * 80) + '%');
        b.style.setProperty('--tier-y', (72 - Math.sin(t * Math.PI) * 43) + '%');
      });
      if (!tiers.querySelector('.smb-power-caption')) tiers.append(make('span', 'smb-power-caption', 'La misura della tua forza'));
    }
    const rail = stage.querySelector('.smb-rail');
    if (rail && !rail.classList.contains('smb-family-orbit')) {
      rail.classList.add('smb-family-orbit');
      const families = [...rail.querySelectorAll('.crest')];
      const hub = make('div', 'smb-family-hub'); hub.setAttribute('aria-hidden', 'true');
      hub.append(icon('', glyph(TBUILD._fam, 28)), make('b', '', FAM_SHORT[TBUILD._fam] || TBUILD._fam), make('small', '', slotUsed(TBUILD.eff) + ' / ' + SMBD.slot + ' slot'));
      rail.prepend(hub);
      families.forEach((b, i) => {
        const a = (-90 + i * 360 / families.length) * Math.PI / 180;
        b.style.setProperty('--family-x', (50 + 37 * Math.cos(a)) + '%');
        b.style.setProperty('--family-y', (50 + 36 * Math.sin(a)) + '%');
        b.dataset.smbFocus = 'family-' + SMBD.fams[i];
      });
      const heading = make('div', 'smb-family-heading');
      heading.append(make('h3', '', TBUILD._fam), make('span', '', 'Scegli gli effetti'));
      stage.querySelector('.smb-grid').before(heading);
    }
    stage.querySelectorAll('.mcard').forEach(card => {
      card.dataset.smbFocus = 'effect-' + card.querySelector('.mc-n').textContent;
      const more = card.querySelector('.mc-more');
      if (more) more.dataset.smbFocus = 'detail-' + card.querySelector('.mc-n').textContent;
    });
    if (BLD.step === 4 && !stage.querySelector('.smb-edit-links')) {
      const edit = make('nav', 'smb-edit-links'); edit.setAttribute('aria-label', 'Rivedi la Tecnica');
      bldSteps().slice(0, 4).forEach((s, i) => {
        const b = make('button', '', 'Modifica ' + s.label.toLowerCase()); b.type = 'button'; b.onclick = () => bldGo(i); edit.append(b);
      });
      stage.append(edit);
    }
  }
  function mount(v, h) {
    if (v.classList.contains('smb-constellation')) return;
    v.classList.add('smb-constellation');
    // This root is unique to Signature. The shared Weapon/Module builder is untouched.
    v.addEventListener('focusin', e => {
      if (e.target.dataset && e.target.dataset.smbFocus) v._smbFocus = e.target.dataset.smbFocus;
    });
  }
  function buildScene(v, h) {
    const scene = h.closest('.bl-sum');
    if (scene.querySelector('.smb-map')) return;
    scene.parentElement.prepend(scene); // Reading order: navigation, then contextual choices.
    scene.classList.add('smb-scene'); scene.setAttribute('aria-label', 'Costellazione della Tecnica');
    const cap = make('div', 'smb-scene-caption');
    cap.append(make('span', 'smb-eyebrow', 'Costellazione della Tecnica'), make('span', 'smb-phase-count'));
    const map = make('div', 'smb-map');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'smb-map-lines'); svg.setAttribute('aria-hidden', 'true');
    map.append(svg, h, v.querySelector('.bl-steps'));
    const attached = make('div', 'smb-attached');
    const state = make('p', 'smb-scene-state'); state.setAttribute('role', 'status');
    scene.append(cap, map, attached, state);
  }
  function restoreFocus(v, phase) {
    const same = v._smbPhase === phase; v._smbPhase = phase;
    if (!same || !v._smbFocus || v.contains(document.activeElement)) return;
    const target = [...v.querySelectorAll('[data-smb-focus]')].find(n => n.dataset.smbFocus === v._smbFocus && !n.hidden);
    if (target) target.focus({preventScroll: true});
    else { const title = v.querySelector('.bl-plate .t'); if (title) title.focus({preventScroll: true}); }
  }
  function present(h) {
    if (!h.classList.contains('bl-sum-in')) { fullSummary(h); return; }
    const v = h.closest('#bld'); if (!v || !BLD) return;
    mount(v, h); buildScene(v, h); core(h); updateNodes(v); satellites(v); decoratePanel(v);
    restoreFocus(v, BLD.step);
  }
  window.GLCSignature = Object.freeze({present});
})();
