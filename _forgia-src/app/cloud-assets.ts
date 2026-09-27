import {requireCloud,ownerId,assertOwner} from './forge-client';
const BUCKET='forge-private';const CHUNK=8*1024*1024;const MAX=500*1024*1024;
const keyPattern=/^([a-f0-9-]{36})\/([a-f0-9-]{36})\/(file\.(?:png|jpg|jpeg|webp|gif|glb|obj|stl|json))$/;
export function assetKey(url:string){if(!url.startsWith('forge-asset:'))return null;const key=url.slice(12);return keyPattern.test(key)?key:null;}
export function isForgeAsset(url:string){return !!assetKey(url)||url==='/forgia/warrior.png'||url==='/warrior.png';}
type Manifest={version:1;size:number;type:string;parts:number;chunkSize:number};
export async function storeFile(file:Blob,extension:string,progress:(v:number)=>void=()=>{},signal?:AbortSignal){
 if(!/^(png|jpg|jpeg|webp|gif|glb|obj|stl|json)$/.test(extension)||file.size<1||file.size>MAX)throw Error('File non supportato o troppo grande.');
 const owner=await ownerId(),prefix=owner+'/'+crypto.randomUUID(),key=prefix+'/file.'+extension;const bucket=requireCloud().storage.from(BUCKET);const paths:string[]=[];
 const send=async(path:string,part:Blob)=>{signal?.throwIfAborted();await assertOwner(owner);paths.push(path);const {error}=await bucket.upload(path,part,{contentType:part.type||'application/octet-stream',upsert:false});if(error)throw Error('Caricamento non riuscito. Verifica connessione e spazio disponibile.');signal?.throwIfAborted();await assertOwner(owner);};
 try{
  if(file.size<=CHUNK)await send(key,file);
  else {let count=0;for(let offset=0;offset<file.size;offset+=CHUNK){await send(prefix+'/part-'+count,file.slice(offset,offset+CHUNK));count++;progress(Math.min(99,Math.round(Math.min(file.size,offset+CHUNK)/file.size*100)));}
   await send(key+'.manifest.json',new Blob([JSON.stringify({version:1,size:file.size,type:file.type,parts:count,chunkSize:CHUNK} satisfies Manifest)],{type:'application/json'}));
  }
  progress(100);return {url:'forge-asset:'+key};
 }catch(e){await bucket.remove(paths).catch(()=>{});throw e;}
}
export async function fetchAsset(url:string,options:{signal?:AbortSignal}={}):Promise<Response>{
 if(url==='/forgia/warrior.png'||url==='/warrior.png')return fetch('/forgia/warrior.png',options);
 const key=assetKey(url);if(!key)throw Error('Questo file appartiene a un altro archivio: ricarica l’originale nella Forgia.');
 const owner=await ownerId();if(key.split('/')[0]!==owner)throw Error('Questo file non appartiene al tuo account.');
 const bucket=requireCloud().storage.from(BUCKET);const download=async(path:string)=>{options.signal?.throwIfAborted();await assertOwner(owner);const result=await bucket.download(path);options.signal?.throwIfAborted();await assertOwner(owner);return result;};
 const single=await download(key);if(!single.error&&single.data)return new Response(single.data);
 const manifest=await download(key+'.manifest.json');if(manifest.error||!manifest.data)throw Error('File non disponibile. Controlla la connessione e riprova.');
 const m=JSON.parse(await manifest.data.text()) as Manifest;
 if(m.version!==1||m.chunkSize!==CHUNK||!Number.isSafeInteger(m.size)||m.size<=CHUNK||m.size>MAX||m.parts!==Math.ceil(m.size/CHUNK))throw Error('File danneggiato.');
 const parts:Blob[]=[];for(let i=0;i<m.parts;i++){const p=await download(key.slice(0,key.lastIndexOf('/'))+'/part-'+i);if(p.error||!p.data||p.data.size!==Math.min(CHUNK,m.size-i*CHUNK))throw Error('File incompleto.');parts.push(p.data);}
 return new Response(new Blob(parts,{type:m.type||'application/octet-stream'}));
}
export async function saveVersionAsset(board:unknown){const file=new Blob([JSON.stringify(board)],{type:'application/json'});if(file.size>10_000_000)throw Error('Versione troppo grande.');return storeFile(file,'json');}
