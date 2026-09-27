import {storeFile} from './cloud-assets';
export async function uploadAsset(file:File,onProgress:(n:number)=>void=()=>{},signal?:AbortSignal):Promise<{url:string}>{
 const extension=file.name.split('.').pop()?.toLowerCase()||'';const model=/^(glb|obj|stl)$/.test(extension);const limit=(model?500:40)*1024*1024;
 if(!/^(png|jpg|jpeg|webp|gif|glb|obj|stl)$/.test(extension))throw Error('Formato non supportato.');
 if(file.size>limit||file.size===0)throw Error(model?'Il modello deve essere fra 1 byte e 500 MB.':'Limite immagini: 40 MB.');
 return storeFile(file,extension,onProgress,signal);
}
