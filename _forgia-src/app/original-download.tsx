import {useState} from 'react';
import {Download} from 'lucide-react';
import {toast} from 'sonner';
import {fetchAsset,isForgeAsset} from './cloud-assets';
export default function OriginalDownload({url,filename,label='Scarica originale'}:{url?:string;filename?:string;label?:string}){
 const [busy,setBusy]=useState(false);if(!url||!isForgeAsset(url))return null;
 return <button type="button" className="original-download nodrag nopan" disabled={busy} onClick={async e=>{e.stopPropagation();setBusy(true);try{const response=await fetchAsset(url);const blob=await response.blob();const link=document.createElement('a');const temp=URL.createObjectURL(blob);link.href=temp;link.download=filename||'originale';link.click();setTimeout(()=>URL.revokeObjectURL(temp),60000);}catch(e){toast.error(e instanceof Error?e.message:'Download non riuscito');}finally{setBusy(false);}}} title={filename?label+': '+filename:label}><Download size={16}/><span>{busy?'Preparazione…':label}</span></button>;
}
