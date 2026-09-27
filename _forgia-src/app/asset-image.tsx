import {useEffect,useState,type ImgHTMLAttributes} from 'react';
import {fetchAsset} from './cloud-assets';
/** Private bytes stay in this component and are released on unmount/account change. */
export default function AssetImage({src,alt,...props}:ImgHTMLAttributes<HTMLImageElement>){
 const [resolved,setResolved]=useState('');const [failed,setFailed]=useState(false);
 useEffect(()=>{let objectUrl='';const controller=new AbortController();setResolved('');setFailed(false);
  if(src)fetchAsset(src,{signal:controller.signal}).then(r=>r.blob()).then(blob=>{if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setResolved(objectUrl);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
  return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
 },[src]);
 if(!resolved)return <span className={props.className} role="img" aria-label={failed?'Immagine non disponibile: '+alt:'Caricamento: '+alt}>{failed?'Immagine non disponibile':'…'}</span>;
 return <img {...props} src={resolved} alt={alt}/>;
}
