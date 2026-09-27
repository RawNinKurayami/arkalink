/* An independent Arkalink concept: it does not read GLC accounts, data or storage. */
(() => {
  'use strict';
  const worlds = {
    glc: { title:'Grand Line Chronicles', state:'SOGLIA 01 · CONNESSIONE APERTA', description:'Oltre questo varco: mari sconfinati, ciurme e leggende ancora da scrivere.', type:'GIOCO DI RUOLO · UNIVERSO ONE PIECE', open:true, href:'/grand-line-chronicles/', target:'_self', caption:'ENTRA IN GRAND LINE CHRONICLES', image:'/img/hero_main.jpg', imageAlt:'Un pirata di spalle contempla il mare al tramonto.', detailType:'SOGLIA 01 / GIOCO DI RUOLO', detail:'Un universo di avventure ispirato a One Piece. Crea un pirata, raduna la ciurma e attraversa i mari, una sessione dopo l’altra.', features:['Personaggi e progressione','Campagne e sessioni','Navi, tecniche e strumenti di gioco'] },
    forge: { title:'La Forgia', state:'SOGLIA 02 · CONNESSIONE APERTA', description:'Tra memoria e materia, i personaggi prendono forma. La Forgia custodisce le creazioni di ogni viaggiatore.', type:'ARKALINK FORGE · CHARACTER DESIGN', open:true, href:'/forgia/', target:'_self', caption:'ENTRA NELLA FORGIA', image:'/arkalink-assets/forge-chamber.png', imageAlt:'La Forgia: una sala di cristalli, riferimenti e forme sospese.', detailType:'SOGLIA 02 / LUOGO DELLA CREAZIONE', detail:'Una sala affacciata sui mondi possibili. Raccogli riferimenti, definisci identità e lavora sulle forme: ogni personaggio ha la propria tela. Il tuo archivio personale ti segue attraverso i dispositivi.', features:['La tela · riferimenti, annotazioni e collegamenti','Le identità · storie e tratti dei personaggi','Le forme · palette, materiali e modelli 3D'] },
    'unknown-3': { title:'Soglia sconosciuta', state:'SOGLIA 03 · SIGILLATA', description:'Il varco custodisce un orizzonte ancora inesplorato. Questa soglia non è al momento attraversabile.', type:'DESTINAZIONE DA RIVELARE', open:false }
  };
  const nexus = document.getElementById('nexus');
  const chamber = document.querySelector('.portal-stage');
  const scene = document.getElementById('scene-art');
  const layers = [...scene.querySelectorAll('.scene-layer')];
  let sceneRequest = 0;
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const controls = [...document.querySelectorAll('[data-select]')];
  const mobile = matchMedia('(max-width:760px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const finePointer = matchMedia('(pointer:fine)');

  async function changeScene(id) {
    const request = ++sceneRequest;
    const layer = document.getElementById(id === 'forge' ? 'scene-forge' : id === 'unknown-3' ? 'scene-sealed' : 'scene-glc');
    if (!layer.getAttribute('src')) layer.src = layer.dataset.src;
    try { await layer.decode(); } catch { return; }
    // Rapid selections must not let a slower image replace the latest destination.
    if (request !== sceneRequest) return;
    layers.forEach(item => item.classList.toggle('is-visible', item === layer));
  }

  function selectWorld(id, announce = true) {
    if (!worlds[id]) return;
    const world = worlds[id];
    nexus.dataset.world = id;
    changeScene(id);
    document.getElementById('gate-coordinate').textContent = world.open ? (id === 'glc' ? '01' : '02') + ' / MONDO CONNESSO' : '03 / SEGNALE NON IDENTIFICATO';

    document.getElementById('world-title').textContent = world.title;
    const state = document.getElementById('world-state');
    const light = document.createElement('span'); light.className = 'state-light';
    state.replaceChildren(light, document.createTextNode(world.state));
    document.getElementById('world-description').textContent = world.description;
    document.getElementById('world-type').textContent = world.type;
    document.getElementById('enter-world').hidden = !world.open;
    document.getElementById('world-details').hidden = !world.open;
    document.getElementById('sealed-world').hidden = world.open;
    if (world.open) {
      for (const link of [document.getElementById('enter-world'), document.getElementById('world-dialog-enter')]) {
        link.href = world.href;
        link.target = world.target;
      }
      document.getElementById('enter-world-caption').textContent = world.caption;
      document.getElementById('world-dialog-title').textContent = world.title;
      document.getElementById('world-dialog-type').textContent = world.detailType;
      document.getElementById('world-dialog-description').textContent = world.detail;
      const cover = document.getElementById('world-dialog-image');
      cover.src = world.image; cover.alt = world.imageAlt;
      const features = world.features.map(text => { const item = document.createElement('li'); item.textContent = text; return item; });
      document.getElementById('world-dialog-features').replaceChildren(...features);
    }
    document.getElementById('destination-panel').setAttribute('aria-labelledby', `world-${id}`);
    for (const control of controls) {
      const chosen = control.dataset.select === id;
      if (control.getAttribute('role') === 'tab') {
        control.setAttribute('aria-selected', String(chosen));
        control.tabIndex = chosen ? 0 : -1;
      } else control.setAttribute('aria-pressed', String(chosen));
      control.classList.toggle('is-selected', chosen);
    }
    if (announce) {
      document.getElementById('selection-status').textContent = `${world.state}. ${world.title}. ${world.open ? 'Il portale è attraversabile.' : 'Destinazione non ancora disponibile.'}`;
      history.replaceState(null, '', `#${id}`);
    }
  }
  controls.forEach(control => control.addEventListener('click', () => selectWorld(control.dataset.select)));
  document.querySelector('.world-picker').addEventListener('keydown', event => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectWorld(tabs[next].dataset.select);
    tabs[next].focus({ preventScroll:true });
  });

  // Additional navigation stays inside the portal scene; the rest of Home scrolls normally.
  function moveWorld(direction) {
    const index = tabs.findIndex(tab => tab.dataset.select === nexus.dataset.world);
    const next = tabs[(index + direction + tabs.length) % tabs.length];
    const followFocus = tabs.includes(document.activeElement);
    selectWorld(next.dataset.select);
    if (followFocus) next.focus({ preventScroll:true });
  }
  function editingText(target) {
    return Boolean(target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="combobox"]'));
  }
  function navigationBlocked(event) {
    return event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
      document.querySelector('dialog[open]') || editingText(event.target);
  }
  document.addEventListener('keydown', event => {
    if (navigationBlocked(event) || event.shiftKey || event.repeat ||
      (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    const rect = chamber.getBoundingClientRect();
    // Do not change a portal while reading Segnali or the sections below it.
    if (rect.top > innerHeight / 2 || rect.bottom < innerHeight / 2) return;
    if (document.activeElement !== document.body && !chamber.contains(document.activeElement)) return;
    event.preventDefault();
    moveWorld(event.key === 'ArrowRight' ? 1 : -1);
  });

  let swipe = null;
  let suppressClickUntil = 0;
  chamber.addEventListener('pointerdown', event => {
    suppressClickUntil = 0;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
    if (!event.isPrimary || navigationBlocked(event) ||
      event.target.closest('a, button:not([role="tab"]), .nexus-header')) {
      swipe = null;
      return;
    }
    swipe = { id:event.pointerId, x:event.clientX, y:event.clientY, horizontal:false };
  }, { passive:true });
  chamber.addEventListener('pointermove', event => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const dx = Math.abs(event.clientX - swipe.x);
    const dy = Math.abs(event.clientY - swipe.y);
    if (!swipe.horizontal && Math.max(dx, dy) >= 12) {
      if (dx <= dy * 1.35) { swipe = null; return; }
      swipe.horizontal = true;
      chamber.setPointerCapture(event.pointerId);
    }
  }, { passive:true });
  chamber.addEventListener('pointerup', event => {
    if (!swipe || event.pointerId !== swipe.id) return;
    const gesture = swipe;
    swipe = null;
    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;
    if (gesture.horizontal && Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      suppressClickUntil = performance.now() + 500;
      moveWorld(dx < 0 ? 1 : -1);
    }
  }, { passive:true });
  chamber.addEventListener('pointercancel', () => { swipe = null; }, { passive:true });
  chamber.addEventListener('lostpointercapture', () => { swipe = null; }, { passive:true });
  chamber.addEventListener('click', event => {
    // A completed swipe on a thumbnail must not become a click on the old portal.
    if (event.detail > 0 && performance.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  let wheelTotal = 0;
  let wheelDirection = 0;
  let wheelLastAt = -Infinity;
  let wheelChanged = false;
  chamber.addEventListener('wheel', event => {
    if (navigationBlocked(event)) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.2;
    const overPicker = Boolean(event.target.closest('.world-picker'));
    // Trackpad / horizontal wheel works across the scene. A normal vertical wheel
    // changes worlds only over the thumbnails; elsewhere it scrolls the page.
    if (!horizontal && !event.shiftKey && !overPicker) return;
    const raw = horizontal ? event.deltaX : event.deltaY;
    if (!raw || !event.cancelable) return;
    const delta = raw * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? chamber.clientWidth : 1);
    const direction = Math.sign(delta);
    const now = performance.now();
    event.preventDefault();
    if (now - wheelLastAt > 180 || direction !== wheelDirection) {
      wheelTotal = 0;
      wheelChanged = false;
    }
    wheelLastAt = now;
    wheelDirection = direction;
    if (wheelChanged) return;
    wheelTotal += Math.abs(delta);
    if (wheelTotal >= 48) {
      wheelChanged = true;
      moveWorld(direction);
    }
  }, { passive:false });

  function connectDialog(openerId, dialogId) {
    const opener = document.getElementById(openerId);
    const dialog = document.getElementById(dialogId);
    opener.addEventListener('click', () => dialog.showModal());
    dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener.focus({ preventScroll:true }));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  }
  connectDialog('world-details', 'world-dialog');

  function resetParallax() {
    scene.style.removeProperty('--parallax-x');
    scene.style.removeProperty('--parallax-y');
  }
  chamber.addEventListener('pointermove', event => {
    if (mobile.matches || reduced.matches || !finePointer.matches) return;
    const rect = chamber.getBoundingClientRect();
    scene.style.setProperty('--parallax-x', `${((event.clientX - rect.left) / rect.width - .5) * 6}px`);
    scene.style.setProperty('--parallax-y', `${((event.clientY - rect.top) / rect.height - .5) * 3}px`);
  });
  chamber.addEventListener('pointerleave', resetParallax);
  reduced.addEventListener('change', resetParallax);
  mobile.addEventListener('change', resetParallax);

  const fullscreen = document.getElementById('fullscreen');
  if (!document.fullscreenEnabled) fullscreen.hidden = true;
  fullscreen.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      document.getElementById('selection-status').textContent = 'Lo schermo intero non è disponibile in questo browser.';
    }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fullscreen.setAttribute('aria-pressed', String(active));
    fullscreen.setAttribute('aria-label', active ? 'Esci dallo schermo intero' : 'Attiva schermo intero');
  });
  function readDestination() {
    const id = location.hash.slice(1);
    if (worlds[id]) selectWorld(id, false);
  }
  addEventListener('hashchange', readDestination);
  selectWorld(worlds[location.hash.slice(1)] ? location.hash.slice(1) : 'glc', false);
})();
