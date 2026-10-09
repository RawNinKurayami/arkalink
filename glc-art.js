/* Grand Line Chronicles · illustrazioni di presentazione.
   Le chiavi degli oggetti salvati restano invariate: qui si sceglie solo l'immagine. */
(function (root) {
  'use strict';
  const weapons = Object.freeze({
    Lama: 'arma-lama', Contundente: 'arma-contundente', 'Ad asta': 'arma-asta',
    'A distanza': 'arma-distanza', Cannone: 'arma-distanza', 'Da lancio': 'arma-lancio', Speciale: 'arma-speciale'
  });
  const inventory = Object.freeze({
    box: 'materiali', bag: 'zaino', coin: 'tesoro', key: 'chiave',
    map: 'ruolo-navigatore', scroll: 'tecnica', book: 'ruolo-archeologo',
    potion: 'preparato', bottle: 'preparato', food: 'provviste',
    bandage: 'ruolo-dottore', medkit: 'ruolo-dottore', bomb: 'munizioni',
    arrow: 'frecce', sword: 'arma-lama', shield: 'scudo',
    rope: 'arma-speciale', hammer: 'stile-carpentiere', gear: 'modulo',
    candle: 'lanterna', shell: 'conchiglia', gem: 'tesoro',
    compass: 'ruolo-navigatore', boat: 'nave'
  });
  const categories = Object.freeze({
    archeologia: 'ruolo-archeologo', archeologo: 'ruolo-archeologo',
    'armi meccaniche': 'arma-distanza', chimico: 'stile-chimico',
    clima: 'ruolo-navigatore', comunicazione: 'tecnica',
    'gadget da campo': 'stile-inventore', ingegneria: 'ruolo-ingegnere',
    ingegnere: 'ruolo-ingegnere', medico: 'ruolo-dottore', dottore: 'ruolo-dottore',
    infermeria: 'ruolo-dottore', 'preparati del medico': 'preparato',
    'moduli sperimentali': 'modulo', moduli: 'modulo', munizioni: 'munizioni',
    musica: 'ruolo-musicista', musicista: 'ruolo-musicista',
    navigazione: 'ruolo-navigatore', navigatore: 'ruolo-navigatore',
    sopravvivenza: 'zaino', tossicologo: 'stile-tossicologo',
    vedetta: 'haki-osservazione', combattente: 'ruolo-combattente',
    capitano: 'ruolo-capitano', cuoco: 'ruolo-cuoco',
    striker: 'stile-striker', swordsman: 'stile-swordsman', crusher: 'stile-crusher',
    sniper: 'stile-sniper', special: 'stile-special', carpentiere: 'stile-carpentiere',
    meccanico: 'stile-meccanico', inventore: 'stile-inventore',
    brodo: 'provviste', carne: 'provviste', dolci: 'provviste', frutta: 'provviste',
    pesce: 'provviste', verdura: 'provviste', ricettario: 'provviste', provviste: 'provviste',
    'attrezzi e minuteria': 'stile-carpentiere',
    'chimica, polveri ed esplosivi': 'munizioni', 'corde, tessuti e cuoio': 'arma-speciale',
    'erboristeria e medicina': 'preparato', 'legname e costruzione': 'materiali',
    'meccanica e congegni': 'modulo', 'metalli e leghe': 'materiali',
    'nautica e attrezzatura di bordo': 'nave', 'non acquistabili': 'materiali',
    'scrittura e comunicazione': 'tecnica', 'vetro, ottica e strumenti': 'ruolo-navigatore'
  });
  const existing = [
    'zaino', 'legame', 'frutto', 'haki-re', 'haki-osservazione', 'haki-armamento',
    ...['umano','uomopesce','gigante','mink','lunarian','longbraccio','lungagamba','cyborg','tontatta'].map(k => 'razza-' + k),
    ...['combattente','dottore','ingegnere','musicista','navigatore','archeologo','cuoco','capitano'].map(k => 'ruolo-' + k),
    ...['striker','swordsman','crusher','sniper','special','chimico','tossicologo','carpentiere','meccanico','inventore'].map(k => 'stile-' + k),
    ...['striker','swordsman','crusher','sniper','medico','chimico','tossicologo','carpentiere','meccanico','inventore','navigatore','archeologo','cuoco','capitano','musicista'].map(k => 'ultimate-' + k)
  ];
  const allowed = new Set([...existing, ...Object.values(weapons),
    'modulo', 'provviste', 'materiali', 'tesoro', 'chiave', 'preparato', 'munizioni', 'lanterna', 'nave', 'tecnica', 'scudo', 'conchiglia', 'frecce']);
  const normal = value => String(value || '').trim().toLowerCase();
  const own = (map, key) => Object.prototype.hasOwnProperty.call(map, key) ? map[key] : '';

  function weaponKey(value) {
    const type = value && typeof value === 'object' ? value.armaTipo || value.tipo : value;
    return own(weapons, type) || 'arma-speciale';
  }
  function inventoryKey(key) { return own(inventory, key) || 'materiali'; }
  function moduleKey(value) {
    const m = value && typeof value === 'object' ? value : { nome: value };
    if (m.arma) return weaponKey(m);
    const category = normal(Array.isArray(m.tipo) ? m.tipo.join(' ') : m.tipo);
    const name = normal(m.nome);
    if (/cannon|artiglier|lanciarazz/.test(name)) return 'arma-distanza';
    if (/arpion/.test(name)) return 'arma-asta';
    if (/stiva|magazzino/.test(name)) return 'materiali';
    if (/cabina del navigatore|timone/.test(name)) return 'ruolo-navigatore';
    if (/chiglia|vela|scafo/.test(name)) return 'nave';
    if (/officina/.test(name)) return 'ruolo-ingegnere';
    if (/difensiv/.test(category)) return 'scudo';
    if (/mobilit/.test(category)) return 'stile-meccanico';
    if (/controllo/.test(category)) return 'arma-speciale';
    return 'modulo';
  }
  function categoryKey(value) {
    const item = value && typeof value === 'object' ? value : null;
    const category = normal(item ? (item.dati && item.dati.categoria) || item.cat || item.categoria : value);
    if (own(categories, category)) return categories[category];
    if (item && /piatto|ricetta/.test(normal(item.tipo))) return 'provviste';
    const name = normal(item && (item.nome || item.name));
    if (/lantern|candela/.test(name)) return 'lanterna';
    if (/chiave|serratura/.test(name)) return 'chiave';
    if (/pozione|antidoto|farmaco|fiala|unguento/.test(name + ' ' + category)) return 'preparato';
    if (/polver|esplosiv|munizion/.test(category)) return 'munizioni';
    if (/prezios|gemm|cristall/.test(category)) return 'tesoro';
    if (/erbe|vegetal|aliment|carni|pesci|frutti|spezie|cereal/.test(category)) return 'provviste';
    if (/meccanic|congegn|ingranagg/.test(category)) return 'modulo';
    if (/chimic|reagent/.test(category)) return 'preparato';
    return 'materiali';
  }
  function html(key, size) {
    key = allowed.has(key) ? key : 'materiali';
    size = Number(size);
    size = Number.isFinite(size) ? Math.max(16, Math.min(256, size || 32)) : 32;
    return '<img class="icimg glc-art" src="/img/icons/' + key + '.png" width="' + size + '" height="' + size + '" alt="" aria-hidden="true" draggable="false" decoding="async" style="object-fit:contain;flex-shrink:0;vertical-align:middle">';
  }
  root.GLCArt = Object.freeze({ html, weaponKey, moduleKey, inventoryKey, categoryKey });
})(typeof window === 'undefined' ? globalThis : window);
