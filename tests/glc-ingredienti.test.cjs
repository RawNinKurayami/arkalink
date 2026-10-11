/* Keep every recipe link backed by a priced food entry and preserve the
 * official Extra effects. No cloud or personal data is used by these checks. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'portale-officina-cambusa/index.html'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'regole/ingredienti-cambusa.json'),'utf8')).ingredienti;
const seed=name=>JSON.parse(html.match(new RegExp('var '+name+'\\s*=\\s*(\\[.*?\\]);','s'))[1]);
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'regole/cambusa.js'),'utf8'),context);
const C=context.GLCCambusa;
const lookup=new Map();
for(const row of catalog)for(const name of [row.nome,...row.dati.alias])lookup.set(name.toLowerCase(),row);

test('Every required ingredient in all 25 dishes resolves, including the singular/plural aliases',()=>{
 const dishes=seed('SEED_PIATTI');assert.equal(dishes.length,25);
 const names=new Set();
 for(const dish of dishes)for(const ingredient of C.ingredients(dish)){
  names.add(ingredient.toLowerCase());const row=lookup.get(ingredient.toLowerCase());
  assert.ok(row,`${dish.nome}: ${ingredient}`);
  assert.ok(row.dati.usato_in.includes(dish.nome));
  assert.ok(`${row.nome} ${row.descrizione}`.toLowerCase().includes(ingredient.toLowerCase()),`Il filtro non trova ${ingredient}`);
 }
 assert.equal(names.size,69);
 assert.equal(lookup.get('cipolle'),lookup.get('cipolla'));
 assert.equal(lookup.get('sale'),lookup.get('sale marino'));
});

test('All foods have quantities, positive Berry prices, sources and applicable collection checks',()=>{
 assert.equal(catalog.length,73);assert.equal(new Set(catalog.map(r=>r.id)).size,catalog.length);
 for(const row of catalog){
  const d=row.dati;assert.equal(row.tipo,'ingrediente');assert.equal(d.categoria,'Ingredienti');
  assert.ok(Number.isSafeInteger(d.prezzo)&&d.prezzo>0,row.nome);
  for(const key of ['unita','dove','famiglia','rarita'])assert.ok(d[key],`${row.nome}: ${key}`);
  const r=d.reperimento;assert.ok(r&&r.metodo&&r.nota,row.nome);
  if(r.prova)assert.ok(Number.isSafeInteger(r.soglia)&&r.soglia>0,row.nome);
  else {assert.equal(r.soglia,null);assert.match(r.nota,/nessuna Prova/);}
  if(d.acquistabile){const tier=d.prezzo<=1000?'Comune':d.prezzo<=5000?'Corrente':d.prezzo<=15000?'Buono':d.prezzo<=50000?'Pregiato':'Raro';assert.equal(d.fascia,tier,row.nome);}
  else assert.equal(d.fascia,'Non acquistabile');
  if(!d.extra)assert.equal(d.bonus,undefined,'Nessun nuovo bonus implicito per ingredienti ordinari');
 }
});

test('All 8 special foods retain their exact original bonus and one-Extra limit',()=>{
 const specials=seed('INGR_NOTE');assert.equal(specials.length,8);
 assert.equal(catalog.filter(r=>r.dati.extra).length,8);
 for(const extra of specials){const row=lookup.get(extra.nome.toLowerCase());assert.ok(row);assert.equal(row.dati.bonus,extra.bonus);assert.equal(row.dati.rarita,extra.rarita);assert.match(row.descrizione,/Un solo Ingrediente Extra/);}
});

test('Seed data matches the source; shared oil/honey keep IDs, prices and workshop usages',()=>{
 const rows=seed('SEED_INGREDIENTI');assert.equal(rows.length,346);
 assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
 for(const row of catalog)assert.deepEqual(rows.find(r=>r.id===row.id),row);
 const oil=rows.find(r=>r.id==='seedi_olio'),honey=rows.find(r=>r.id==='seedi_miele');
 assert.equal(oil.dati.prezzo,400);assert.equal(honey.dati.prezzo,700);
 assert.ok(oil.dati.usato_in.includes('Lanterna segnaletica'));
 assert.ok(honey.dati.usato_in.includes('Tonico del chirurgo'));
 assert.ok(oil.dati.categorie_secondarie.includes('Corde, tessuti e cuoio'));
 assert.ok(honey.dati.categorie_secondarie.includes('Erboristeria e medicina'));
});
