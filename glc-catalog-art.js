/* Grand Line Chronicles · artwork for the public workshop, galley and market.
   Presentation only: uploaded pictures, catalogue records and personal saves
   retain their original values. The manifest is loaded separately. */
(function (root) {
  'use strict';

  const types = new Set(['oggetto', 'piatto', 'ingrediente']);
  let indexedEntries = null, indexedLength = -1;
  let byId = new Map(), byName = new Map();

  function normalName(value) {
    return String(value || '').normalize('NFKC').trim().toLowerCase()
      .replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ');
  }
  function kindOf(row, options) {
    const kind = String(options.kind || row.tipo || '').trim();
    return types.has(kind) ? kind : '';
  }
  function key(kind, value) { return kind + '\u0000' + value; }
  function index() {
    const entries = Array.isArray(root.GLCCatalogArtEntries) ? root.GLCCatalogArtEntries : [];
    if (entries === indexedEntries && entries.length === indexedLength) return;
    indexedEntries = entries; indexedLength = entries.length;
    byId = new Map(); byName = new Map();
    entries.forEach(function (entry) {
      if (!entry || !types.has(entry.tipo) || typeof entry.src !== 'string' ||
          !/^\/img\/catalogo\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/.test(entry.src) ||
          entry.src.includes('..')) return;
      const picture = Object.freeze({
        src: entry.src,
        width: Number.isFinite(entry.width) && entry.width > 0 ? entry.width : 512,
        height: Number.isFinite(entry.height) && entry.height > 0 ? entry.height : 512,
        source: 'official'
      });
      if (entry.id) byId.set(key(entry.tipo, String(entry.id)), picture);
      if (entry.nome) byName.set(key(entry.tipo, normalName(entry.nome)), picture);
    });
  }

  function resolve(value, options) {
    const row = value && typeof value === 'object' ? value : {};
    options = options || {};
    if (typeof row.img === 'string' && row.img.trim()) {
      return Object.freeze({src: row.img, width: 512, height: 512, source: 'upload'});
    }
    // A player's recipe or object may share a public name without being it.
    if (options.personal || /^(?:mo_|mp_)/.test(String(row.id || ''))) return null;
    const kind = kindOf(row, options);
    if (!kind) return null;
    index();
    return byId.get(key(kind, String(row.id || ''))) ||
      byName.get(key(kind, normalName(row.nome))) || null;
  }

  function createPicture(value, options) {
    const row = value && typeof value === 'object' ? value : {};
    options = options || {};
    const frame = root.document.createElement('div');
    frame.className = options.compact ? 'catalog-art catalog-art--compact' : 'pic catalog-art';
    frame.setAttribute('aria-hidden', 'true');

    function fallback() {
      frame.classList.add('empty-art');
      frame.classList.remove('catalog-art--illustrated');
      frame.textContent = '';
      if (root.GLCArt) {
        const category = options.food ? 'provviste' : root.GLCArt.categoryKey(
          Object.assign({}, row, {tipo: kindOf(row, options) || row.tipo})
        );
        frame.innerHTML = root.GLCArt.html(category, options.compact ? 64 : 88);
      }
    }

    const art = resolve(row, options);
    if (!art) { fallback(); return frame; }
    frame.classList.add('catalog-art--illustrated');
    const picture = root.document.createElement('img');
    picture.className = 'catalog-art-image';
    picture.alt = '';
    picture.setAttribute('aria-hidden', 'true');
    picture.loading = 'lazy';
    picture.decoding = 'async';
    picture.draggable = false;
    picture.width = art.width;
    picture.height = art.height;
    picture.onerror = function () { picture.onerror = null; fallback(); };
    picture.src = art.src;
    frame.appendChild(picture);
    return frame;
  }

  root.GLCCatalogArt = Object.freeze({resolve, createPicture});
})(typeof window === 'undefined' ? globalThis : window);
