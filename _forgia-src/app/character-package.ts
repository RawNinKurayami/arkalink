import {fetchAsset, isForgeAsset, saveVersionAsset} from './cloud-assets';
import type {Board} from './design-types';
const enc=new TextEncoder();
export function tarHeader(name:string,size:number){
 const data=new Uint8Array(512);const write=(s:string,o:number,n:number)=>data.set(enc.encode(s).slice(0,n),o);
 write(name,0,100);write('0000644\0',100,8);write('0000000\0',108,8);write('0000000\0',116,8);
 write(size.toString(8).padStart(11,'0')+'\0',124,12);write('00000000000\0',136,12);write('        ',148,8);write('0',156,1);write('ustar\0',257,6);write('00',263,2);
 const sum=data.reduce((a,b)=>a+b,0);write(sum.toString(8).padStart(6,'0')+'\0 ',148,8);return data;
}
function ownedAsset(url:string){return isForgeAsset(url);}
export async function exportCharacterPackage(board:Board,onProgress:(s:string)=>void,signal:AbortSignal,handle?:any){
 const source=structuredClone(board), assets=new Map<string,string>(),versions=new Map<string,Board>();
 const add=(url?:string)=>{if(url&&ownedAsset(url)&&!assets.has(url)){const ext=(decodeURIComponent(url).match(/\.([a-z0-9]+)(?:$|[?&])/i)?.[1]||'bin').slice(0,8);assets.set(url,'files/'+String(assets.size+1).padStart(4,'0')+'.'+ext);}};
 const scan=(b:Board)=>{for(const n of [...b.nodes,...(b.trash||[]).flatMap(t=>t.nodes)]){add(n.data.url);for(const c of n.data.colors||[])add(c.texture);}};
 scan(source);
 for(const v of source.versions||[]){signal.throwIfAborted();if(!ownedAsset(v.url))throw Error('Indirizzo versione non valido');onProgress('Lettura versione '+v.name);const r=await fetchAsset(v.url,{signal});if(!r.ok)throw Error('Versione non disponibile: '+v.name);const b=await r.json() as Board;if(!Array.isArray(b.nodes))throw Error('Versione non valida');versions.set(v.url,b);scan(b);}
 const stream=handle?await handle.createWritable():null;const pieces:BlobPart[]=[];let total=0;
 const write=async(part:Blob|Uint8Array)=>{signal.throwIfAborted();const length=part instanceof Blob?part.size:part.byteLength;total+=length;if(!stream&&total>1024*1024*1024)throw Error('Pacchetto oltre 1 GB: usa Chrome o Edge su computer per salvarlo direttamente su disco.');if(stream)await stream.write(part);else pieces.push(part as BlobPart);};
 const entry=async(name:string,blob:Blob)=>{await write(tarHeader(name,blob.size));await write(blob);const pad=(512-blob.size%512)%512;if(pad)await write(new Uint8Array(pad));};
 const json=async(name:string,data:unknown)=>entry(name,new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
 const localize=(b:Board):Board=>JSON.parse(JSON.stringify(b,(key,value)=>typeof value==='string'&&assets.has(value)?assets.get(value):value));
 try{
 let index=0;for(const [url,path] of assets){onProgress('File '+(++index)+' di '+assets.size);const r=await fetchAsset(url,{signal});if(!r.ok)throw Error('File non disponibile: '+path);await entry(path,await r.blob());}
 await json('progetto.json',{version:2,boards:[source]});
 const local=localize(source);local.versions=(source.versions||[]).map((v,i)=>({...v,url:'versions/'+(i+1)+'.json'}));
 let vi=0;for(const [,b] of versions)await json('versions/'+(++vi)+'.json',localize(b));
 await json('progetto-locale.json',{version:2,boards:[local]});
 await json('manifest.json',{name:source.name,files:Array.from(assets,([original,path])=>({original,path})),portals:source.nodes.filter(n=>n.data.kind==='portal').map(n=>({title:n.data.title,target:n.data.portalBoardId}))});
 await entry('LEGGIMI.txt',new Blob(['ARKALINK FORGE\n\nprogetto.json: struttura reimportabile nello studio originale.\nprogetto-locale.json: struttura con percorsi relativi ai file del pacchetto.\nfiles/: immagini, modelli e texture originali (anche del cestino e delle versioni).\nversions/: revisioni salvate.\nmanifest.json: corrispondenza tra indirizzi e file.\n\nI link web e i nodi portale sono riferimenti: non includono siti esterni o altri personaggi. Il pacchetto non è un visualizzatore offline e non si importa direttamente come archivio.\n']));
 await write(new Uint8Array(1024));if(stream)await stream.close();else{const blob=new Blob(pieces,{type:'application/x-tar'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=packageName(source);a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 }catch(e){if(stream)await stream.abort().catch(()=>{});throw e;}
}
export function packageName(board:Board){return (board.name.replace(/[^a-z0-9_-]/gi,'-').slice(0,65)||'personaggio')+'.tar';}
