#!/usr/bin/env node
/* Offline language QA. Synthetic characters only; no user account or cloud. */
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const qa=process.env.GLC_QA_DIR||'/private/tmp/glc-language-qa';
const origin='https://glc-localization.test';
const browser=await chromium.launch({headless:true,executablePath:process.env.GLC_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
const missing=new Set(),failures=[],report=[];
const fixture={v:2,activeId:'qa',order:['qa'],chars:{qa:{nome:'Forza',race:'umano',role:'Combattente',style:'Striker',roleSkillDie:'d20',roleSkillChoice:'Atletica',attr:{Forza:'d20+d4',Tecnica:'d10',Spirito:'d20',Astuzia:'d6'},skills:{Atletica:'d20',Acrobazia:'d8'},pvMax:30,pvCur:27,stMax:40,stCur:32,amb:'Il mio testo resta italiano',bg:'Nota personale: nessuna traduzione',talents:[],armi:[],moduli:[],extraTech:[],bonds:[],frutto:{has:false},haki:[],pa:{}}}};
const seedSource=await readFile(path.join(root,'portale-officina-cambusa/index.html'),'utf8');
function seed(name){
 const start=seedSource.indexOf('[',seedSource.indexOf('var '+name+'='));let depth=0,quote=false,escape=false;
 for(let i=start;i<seedSource.length;i++){
  const c=seedSource[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quote=false;continue;}
  if(c==='"')quote=true;else if(c==='[')depth++;else if(c===']'&&!--depth)return JSON.parse(seedSource.slice(start,i+1));
 }
 throw Error('Missing seed: '+name);
}
const catalogue={oggetto:seed('SEED_OGGETTI'),piatto:seed('SEED_PIATTI'),ingrediente:seed('SEED_INGREDIENTI')};
await context.addInitScript(({fixture,catalogue})=>{
 localStorage.setItem('glc_pirata_v4',JSON.stringify(fixture));
 localStorage.setItem('glc_profile_v1',JSON.stringify({username:'Capitana QA',bio:'Tecnica'}));
 localStorage.setItem('glc_print_v1',JSON.stringify({pa:{attr:['Forza','Tecnica','Spirito','Astuzia'].map(name=>({name}))}}));
 localStorage.setItem('glc_sessioni_v1',JSON.stringify({v:1,activeId:'qa-session',order:['qa-session'],sessions:{'qa-session':{nome:'Isola',persId:'qa',shipId:'',diary:[],mapIslands:[{id:'qa-island',nome:'Picco A',type:'montagna',x:.5,y:.5,pages:[]}]}}}));
 if(location.pathname.includes('portale-officina-cambusa'))window.__glcSB={auth:{getUser:async()=>({data:{user:null}})},from:table=>{let kind;const q={select:()=>q,eq:(key,value)=>{if(key==='tipo')kind=value;return q;},order:async()=>({data:table==='catalogo'?catalogue[kind]||[]:[],error:null}),maybeSingle:async()=>({data:null,error:null})};return q;}};
 window.__qaWrites=[];
}, {fixture,catalogue});
await context.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.origin!==origin){if(['fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();return route.abort();}
 if(u.pathname==='/glc-auth.js')return route.fulfill({contentType:'application/javascript',body:'window.GLCStore={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>{window.__qaWrites.push(k);localStorage.setItem(k,v);},removeItem:k=>localStorage.removeItem(k)};window.GLCSync={whenReady:()=>Promise.resolve(),pronto:()=>true,stato:()=>({ready:true,pending:false,conflicts:[]}),collegato:()=>false,adesso:()=>Promise.resolve(),chiavi:[],messaggio:()=>"",conflitti:()=>[],versioni:()=>Promise.resolve([])};'});
 let rel=decodeURIComponent(u.pathname).replace(/^\//,'');if(!rel||rel.endsWith('/'))rel+='index.html';
 const f=path.resolve(root,rel);if(!f.startsWith(root+path.sep))return route.abort();
 try{if(!(await stat(f)).isFile())throw 0;return route.fulfill({contentType:({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.pdf':'application/pdf'})[path.extname(f)]||'application/octet-stream',body:await readFile(f)});}catch{missing.add(rel);return route.fulfill({status:404,body:'Not found'});}
});
const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>failures.push(String(e)));page.on('dialog',d=>d.dismiss());
async function open(url){await page.goto(origin+url,{waitUntil:'load'});await page.waitForFunction(()=>window.GLCI18n?.ready());await page.evaluate(()=>document.fonts.ready);}
async function snapshot(name,width=1440){await page.setViewportSize({width,height:width<500?844:1000});await page.screenshot({path:path.join(qa,`${name}-${width}.png`),fullPage:width<500&&!name.startsWith('manuale'),timeout:30000});report.push({page:name,width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),language:await page.locator('html').getAttribute('lang'),selector:await page.locator('.glc-language button').count(),writes:await page.evaluate(()=>window.__qaWrites)});}
try{
 await mkdir(qa,{recursive:true});
 await open('/gestisci-pirata/?lang=en&c=qa');await page.waitForSelector('#manage .gh-name');
 await snapshot('pirate');await snapshot('pirate',390);
 assert.equal(await page.locator('#manage .gh-name').textContent(),fixture.chars.qa.nome);
 assert.match(await page.locator('#manage').innerText(),/Attributes/i);
 assert.match(await page.locator('#manage').innerText(),/Strength/);
 assert.ok(await page.evaluate(()=>[...document.querySelector('#t1-attr').options].some(o=>o.value==='Forza'&&o.textContent==='Strength')));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('glc_pirata_v4')).chars.qa.nome),fixture.chars.qa.nome);
 const dynamic=await page.evaluate(()=>{const n=document.createElement('select');n.innerHTML='<option>Forza</option><option>Tecnica</option>';document.body.appendChild(n);GLCI18n.apply(n);const t=document.createElement('div');t.innerHTML='<p>Attacco <b>Forza</b></p>';const b=t.querySelector('b');document.body.appendChild(t);GLCI18n.apply(t);return {optionValue:n.options[0].value,optionLabel:n.options[0].textContent,nodeRetained:b===t.querySelector('b'),template:GLCI18n.text('Dado del Frutto d20'),counter:GLCI18n.text('3 scelte disponibili'),urls:[GLCI18n.url('/manuale-frutti/#cap-1'),GLCI18n.url('/gestisci-pirata/?c=qa#manage'),GLCI18n.url('/forgia/'),GLCI18n.url('/')]};});
 assert.equal(dynamic.optionValue,'Forza');assert.equal(dynamic.optionLabel,'Strength');assert.ok(dynamic.nodeRetained);assert.equal(dynamic.template,'Fruit Die d20');assert.equal(dynamic.counter,'3 choices available');assert.equal(dynamic.urls[0],'/en/manuale-frutti/#cap-1');assert.equal(dynamic.urls[2],'/forgia/');assert.equal(dynamic.urls[3],'/');report.push({dynamic});
 // The actual interactive screens must retain their Italian game identifiers.
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>openTalentTree());await page.waitForSelector('.tt-node');
 assert.match(await page.locator('#ttree').innerText(),/Flurry|Iron Grip/);await snapshot('talent-tree');
 await page.locator('.tt-back').click();
 await page.evaluate(()=>uniqueTraitsModal());await page.waitForSelector('.ut-search');
 await page.locator('.ut-search').fill('Monstrous Body');await page.waitForSelector('.ut-map [data-ut-focus="trait-corpo-mostruoso"]');
 assert.match(await page.locator('.ut-tree').innerText(),/Monstrous Body/);await snapshot('unique-traits');await page.locator('.ut-back').click();
 await page.evaluate(()=>builderModal());await page.waitForSelector('.smb-name');
 await page.locator('.smb-name').fill('Forza');assert.equal(await page.locator('.smb-core-name').textContent(),'Forza');
 await page.locator('.smb-name').fill('Tecnica personale QA');await page.evaluate(()=>bldGo(1));
 await page.locator('#bld').getByRole('radio',{name:/Strength/}).first().click();assert.equal(await page.evaluate(()=>TBUILD.attr),'Forza');
 await snapshot('technique-builder');await page.evaluate(()=>closeBuilder());
 await page.evaluate(()=>{window.__qaPrint=null;window.print=()=>window.__qaPrint=document.getElementById('print-sheet').innerText;document.getElementById('printSheet').click();});
 const printed=await page.evaluate(()=>window.__qaPrint);assert.match(printed,/Strength/);assert.match(printed,/Hit Points/);assert.match(printed,/Forza/);
 report.push({classicPrintEnglish:true});
 for(const folder of ['crea-il-tuo-pirata','profilo','sessioni','campagne','plancia-master','portale-officina-cambusa','nave-portale','isola','notizie','manuali','grand-line-chronicles','scheda-stampabile']){
  await open(`/${folder}/?lang=en&c=qa`);await snapshot(folder);await snapshot(folder,390);assert.equal(await page.locator('.glc-language button[aria-pressed="true"]').innerText(),'EN');
  if(folder==='profilo'){
   assert.equal(await page.locator('#profile-bio').textContent(),'Tecnica');
   assert.equal(await page.locator('#dossier-name').textContent(),'Forza');
   assert.equal(await page.locator('#pstats').textContent(),'1 character in your crew');
  }
  if(folder==='sessioni'){
   await page.evaluate(()=>{const host=document.createElement('div');host.id='qa-map';host.style.cssText='width:700px;max-width:100%;height:500px';document.body.appendChild(host);window.__qaMap=GLCMap.mount(host,{islands:[{id:'qa-peak',nome:'Picco A',type:'montagna',x:50,y:50}],readOnly:false,onSave:()=>true});});
   await page.locator('#qa-map .glcmap-search').first().fill('Mountain');await page.waitForSelector('#qa-map .glcmap-place');
   assert.match(await page.locator('#qa-map .glcmap-place').innerText(),/Picco A/);assert.match(await page.locator('#qa-map .glcmap-place small').innerText(),/Mountain/);
   await page.evaluate(()=>{__qaMap.destroy();document.getElementById('qa-map').remove();});report.push({atlasEnglishTypeSearch:true});
  }
  if(folder==='portale-officina-cambusa'){
   await page.setViewportSize({width:1440,height:1000});await page.locator('[data-tab="mercante"]').first().click();await page.waitForSelector('#ing-search');
   await page.locator('#ing-search').fill('Fine red meat');await page.waitForFunction(()=>document.querySelectorAll('#inggrid .item').length===1);
   assert.equal((await page.locator('#inggrid .inm').textContent()).trim(),'Fine red meat');await snapshot('merchant');
   await page.locator('#inggrid').getByRole('button',{name:/Journal/}).click();await page.locator('#ov-ok').click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('glc_sessioni_v1')).sessions['qa-session'].diary[0].titolo),'Carne rossa pregiata');
   report.push({merchantEnglishSearch:true,diaryCanonicalIngredient:true});
  }
 }
 for(const folder of ['manuale','manuale-frutti','manuale-cyborg','manuale-prestigio']){
  await open(`/en/${folder}/`);assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('.glc-cover-en').count(),1);await snapshot(folder);await snapshot(folder,390);
 }
 await open('/gestisci-pirata/?lang=it&c=qa');assert.equal(await page.locator('html').getAttribute('lang'),'it');assert.match(await page.locator('#manage').innerText(),/Attributi/);assert.equal(await page.evaluate(()=>GLCI18n.text('Forza')),'Forza');await snapshot('pirate-italian',390);
 await writeFile(path.join(qa,'report.json'),JSON.stringify({report,failures,missing:[...missing]},null,2));
 assert.equal(failures.length,0,JSON.stringify(failures));assert.equal(missing.size,0,JSON.stringify([...missing]));
 // The printable A4 sheet intentionally stays at paper size and scrolls.
 assert.ok(!report.some(r=>r.overflow&&r.page!=='scheda-stampabile'),JSON.stringify(report.filter(r=>r.overflow)));console.log(JSON.stringify({pages:report.length,failures,missing:[...missing],dynamic},null,2));
}catch(error){
 await page.screenshot({path:path.join(qa,'failure.png')});
 await writeFile(path.join(qa,'failure.txt'),String(error)+'\n'+await page.locator('body').innerText());
 throw error;
}finally{await browser.close();}
