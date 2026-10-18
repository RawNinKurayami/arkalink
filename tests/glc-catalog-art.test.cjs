const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'glc-catalog-art.js'), 'utf8');

function entry(tipo, id, nome, file) {
  return {tipo, id, nome, src:'/img/catalogo/' + file + '.webp', width:512, height:512};
}
function fixture(entries) {
  class Element {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.className = ''; }
    get classList() {
      const self = this;
      return {
        add(name) { self.className = [...new Set(self.className.split(' ').filter(Boolean).concat(name))].join(' '); },
        remove(name) { self.className = self.className.split(' ').filter(value => value !== name).join(' '); },
        contains(name) { return self.className.split(' ').includes(name); }
      };
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    appendChild(child) { this.children.push(child); return child; }
    set textContent(value) { this.text = value; this.children = []; this.html = ''; }
    get textContent() { return this.text || ''; }
    set innerHTML(value) { this.html = value; this.children = []; }
    get innerHTML() { return this.html || ''; }
  }
  const context = vm.createContext({
    GLCCatalogArtEntries: entries,
    document: {createElement:tag => new Element(tag)},
    GLCArt: {
      categoryKey:row => row.tipo === 'piatto' ? 'provviste' : 'materiali',
      html:key => '<img class="glc-art" src="/img/icons/' + key + '.png" alt="">'
    }
  });
  vm.runInContext(source, context);
  return {context, art:context.GLCCatalogArt};
}

test('Dish and ingredient with the same name keep their own artwork; stable IDs survive renaming', () => {
  const {art} = fixture([
    entry('piatto','seedp_marmellata_artigianale','Marmellata artigianale','jam-dish'),
    entry('ingrediente','seedc_marmellata_artigianale','Marmellata artigianale','jam-ingredient')
  ]);
  assert.equal(art.resolve({tipo:'piatto',nome:'Marmellata artigianale',id:'legacy-dish'}).src, '/img/catalogo/jam-dish.webp');
  assert.equal(art.resolve({tipo:'ingrediente',nome:'Marmellata artigianale',id:'legacy-food'}).src, '/img/catalogo/jam-ingredient.webp');
  assert.equal(art.resolve({tipo:'piatto',nome:'Nuovo nome ufficiale',id:'seedp_marmellata_artigianale'}).src, '/img/catalogo/jam-dish.webp');
  assert.equal(art.resolve({tipo:'oggetto',nome:'Marmellata artigianale'}), null);
});

test('Uploaded pictures win over the official illustration without changing a frozen catalogue record', () => {
  const {art} = fixture([entry('oggetto','seed_bussola','Bussola','compass')]);
  const row = Object.freeze({tipo:'oggetto',id:'seed_bussola',nome:'Bussola',img:'data:image/png;base64,cGVyc29uYWxl',dati:Object.freeze({categoria:'Navigazione'})});
  const before = JSON.stringify(row);
  assert.equal(art.resolve(row).src, row.img);
  assert.equal(art.resolve(row,{personal:true}).source, 'upload');
  assert.equal(JSON.stringify(row), before);
});

test('Personal objects and recipes never acquire stock artwork just because their names match', () => {
  const {art} = fixture([entry('piatto','seedp_arrosto','Arrosto del Capitano','roast')]);
  const row = Object.freeze({tipo:'piatto',id:'custom-1',nome:'Arrosto del Capitano',img:'',recipe:Object.freeze({referenceId:'seedp_arrosto'})});
  assert.equal(art.resolve(row,{personal:true}), null);
  assert.equal(art.resolve({...row,id:'mp_123'}), null);
  assert.equal(art.resolve({...row,id:'mo_123'}), null);
  assert.equal(row.img, '');
  assert.equal(row.nome, 'Arrosto del Capitano');
});

test('Legacy names handle case, whitespace and curly apostrophes; manifest may arrive after the resolver', () => {
  const {context, art} = fixture(undefined);
  assert.equal(art.resolve({tipo:'oggetto',nome:"Argano d'arrembaggio"}), null);
  context.GLCCatalogArtEntries = [entry('oggetto','seed_argano',"Argano d'arrembaggio",'winch')];
  assert.equal(art.resolve({nome:'  ARGANO   D’ARREMBAGGIO '},{kind:'oggetto'}).src, '/img/catalogo/winch.webp');
  context.GLCCatalogArtEntries = [entry('oggetto','seed_argano',"Argano d'arrembaggio",'winch-v2')];
  assert.equal(art.resolve({tipo:'oggetto',id:'seed_argano'}).src, '/img/catalogo/winch-v2.webp');
});

test('Unknown and unavailable illustrations show a category icon, including Extra ingredients', () => {
  const {art} = fixture([entry('ingrediente','seedc_extra','Fungo marino luminoso','mushroom')]);
  const unknown = art.createPicture({tipo:'oggetto',nome:'Oggetto nuovo'});
  assert.ok(unknown.classList.contains('empty-art'));
  assert.match(unknown.innerHTML, /\/img\/icons\/materiali\.png/);
  const extra = art.createPicture({nome:'Fungo marino luminoso'},{kind:'ingrediente',compact:true,food:true});
  assert.ok(extra.classList.contains('catalog-art--compact'));
  assert.equal(extra.children[0].src, '/img/catalogo/mushroom.webp');
  const failedImage = extra.children[0];
  failedImage.onerror();
  assert.equal(failedImage.onerror, null);
  assert.equal(extra.children.length, 0);
  assert.ok(extra.classList.contains('empty-art'));
  assert.ok(!extra.classList.contains('catalog-art--illustrated'));
  assert.match(extra.innerHTML, /\/img\/icons\/provviste\.png/);
});

test('Pictures reserve intrinsic dimensions, load lazily, and add no duplicate spoken label', () => {
  const {art} = fixture([{...entry('oggetto','seed_bussola','Bussola','compass'),width:640,height:480}]);
  const frame = art.createPicture({tipo:'oggetto',id:'seed_bussola',nome:'Bussola'});
  const picture = frame.children[0];
  assert.equal(frame.attrs['aria-hidden'], 'true');
  assert.equal(picture.tagName, 'IMG');
  assert.equal(picture.alt, '');
  assert.equal(picture.loading, 'lazy');
  assert.equal(picture.decoding, 'async');
  assert.equal(picture.width, 640);
  assert.equal(picture.height, 480);
  assert.equal(picture.draggable, false);
});

test('Invalid manifest paths cannot inject markup or load remote assets', () => {
  const invalid = ['https://example.test/art.webp','/img/catalogo/../private.png','/img/catalogo/art.svg','/img/catalogo/x.webp\" onerror=\"bad()'];
  for (const src of invalid) {
    const {art} = fixture([{...entry('oggetto','seed_bussola','Bussola','compass'),src}]);
    assert.equal(art.resolve({tipo:'oggetto',id:'seed_bussola'}), null);
  }
});

test('Catalogue UI loads the manifest before the resolver and images both stock cards and the Extra list', () => {
  const html = fs.readFileSync(path.join(root,'portale-officina-cambusa/index.html'),'utf8');
  assert.ok(html.indexOf('/img/catalogo/catalog.js') < html.indexOf('/glc-catalog-art.js'));
  assert.ok(html.indexOf('/glc-catalog-art.js') < html.indexOf('function itemCard('));
  assert.match(html, /GLCCatalogArt\.createPicture\(o,\{kind:o\.tipo\|\|opts\.diaryKind\|\|'oggetto',personal:!!opts\.mine/);
  assert.match(html, /GLCCatalogArt\.createPicture\(r,\{kind:'ingrediente',compact:true,food:true\}\)/);
});
