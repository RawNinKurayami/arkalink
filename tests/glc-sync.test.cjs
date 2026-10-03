/* Data-loss regressions for the real sync engine, with an in-memory cloud only. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Sync}=require('../glc-sync.js');
const copy=x=>x==null?x:JSON.parse(JSON.stringify(x));
const key='glc_pirata_v4';
const crew=(a=10,b=10)=>({v:2,activeId:'a',order:['a','b'],chars:{a:{nome:'A',pv:a},b:{nome:'B',pv:b}}});
function cloud(data=crew()){
 let state={data:copy(data),revision:1,updated_at:'2026-10-03T12:00:00Z'};
 const c={offline:false,saves:0,archives:[],set(data){state={data:copy(data),revision:state.revision+1,updated_at:new Date().toISOString()};},get:()=>copy(state)};
 c.rpc=async(name,args)=>{
  if(c.offline)throw Error('Offline');
  if(name==='glc_sync_heads')return {data:{[key]:state.revision}};
  if(name==='glc_sync_read')return {data:c.get()};
  if(name==='glc_sync_archive'){c.archives.push(copy(args.p_data));return {data:true};}
  if(name==='glc_sync_save'){
   if(args.p_expected!==state.revision)return {data:{...c.get(),ok:false}};
   c.saves++;c.set(args.p_data);return {data:{...c.get(),ok:true}};
  }
  throw Error('Unexpected RPC '+name);
 };
 return c;
}
function device(c,data=crew()){
 let value=JSON.stringify(data),quota=false;const records=new Map();
 const storage={getItem:()=>value,setItem:(k,v)=>{if(quota)throw Object.assign(Error('Quota'),{name:'QuotaExceededError'});value=v;}};
 const store={get:async id=>copy(records.get(id)),list:async user=>[...records.values()].filter(r=>r.user===user).map(copy),put:async r=>records.set(r.id,copy(r))};
 const d={get:()=>JSON.parse(value),setQuota:v=>{quota=v;},engine:null,reloads:0};
 d.open=async()=>{d.engine=new Sync({keys:[key],tab:'test-tab',store,storage,rpc:c.rpc,onApply:()=>{d.reloads++;}});return d.engine.start('test-user');};
 d.write=data=>d.engine.write(key,JSON.stringify(data));
 return d;
}
test('An older local copy is archived before the newer cloud copy is applied, never uploaded over it',async()=>{
 const c=cloud(crew(9)),d=device(c,crew(4));const result=await d.open();
 assert.equal(result.reload,true);assert.equal(d.get().chars.a.pv,9);assert.equal(c.saves,0);assert.equal(c.archives[0].chars.a.pv,4);
 const again=await d.open();assert.equal(again.reload,false);assert.equal(c.saves,0);
});
test('Reopening a previously aligned phone downloads newer PC changes without resaving its stale copy',async()=>{
 const c=cloud(),phone=device(c);await phone.open();c.set(crew(3));
 const result=await phone.open();assert.equal(result.reload,true);assert.equal(phone.get().chars.a.pv,3);assert.equal(c.saves,0);
});
test('Offline edits stay durable and synchronize after reconnection',async()=>{
 const c=cloud(),d=device(c);await d.open();c.offline=true;d.write(crew(7));await d.engine.sync();
 assert.equal(d.engine.state().pending,1);assert.equal(d.get().chars.a.pv,7);assert.equal(c.get().data.chars.a.pv,10);
 assert.equal((await d.engine.store.list('test-user'))[0].draft.chars.a.pv,7);
 c.offline=false;assert.equal(await d.engine.sync(),true);assert.equal(c.get().data.chars.a.pv,7);assert.equal(d.engine.state().pending,0);
});
test('Changes on different pirates merge without overwriting either device',async()=>{
 const c=cloud(),d=device(c);await d.open();d.write(crew(7,10));c.set(crew(10,4));await d.engine.sync();
 assert.equal(c.get().data.chars.a.pv,7);assert.equal(c.get().data.chars.b.pv,4);assert.equal(d.engine.state().conflicts.length,0);
});
test('Concurrent changes to the same pirate remain an explicit conflict',async()=>{
 const c=cloud(),d=device(c);await d.open();d.write(crew(7));c.set(crew(2));await d.engine.sync();
 assert.equal(c.get().data.chars.a.pv,2);assert.equal(c.saves,0);assert.equal(d.get().chars.a.pv,7);assert.equal(d.engine.state().conflicts.length,1);
});
test('A full local disk fails before the previous save can be replaced',async()=>{
 const c=cloud(),d=device(c);await d.open();d.setQuota(true);
 assert.throws(()=>d.write(crew(1)),{name:'QuotaExceededError'});assert.equal(d.get().chars.a.pv,10);assert.equal(c.saves,0);
});
