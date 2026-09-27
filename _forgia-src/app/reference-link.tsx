'use client';
import {ArrowUpRight,Link2} from 'lucide-react';
export function safeReferenceUrl(value?:string):string|null{
 if(!value||typeof value!=='string')return null;
 const raw=value.trim();
 if(!raw||/[\u0000-\u0020]/.test(raw))return null;
 try{const url=new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw)?raw:'https://'+raw);return ['https:','http:'].includes(url.protocol)&&!!url.hostname&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function ReferenceLink({value}:{value?:string}){
 const url=safeReferenceUrl(value);
 return url?<a className="reference-link nodrag nopan" href={url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()}><Link2 size={18}/><span>Apri riferimento<small>{new URL(url).hostname}</small></span><ArrowUpRight size={18}/></a>:<p className="reference-link-empty">{value?'Indirizzo non valido: usa un link http o https.':'Inserisci un indirizzo web nelle proprietà.'}</p>;
}
export function ReferenceLinkEditor({value,onChange}:{value?:string;onChange:(v:string)=>void}){
 const invalid=!!value&&!safeReferenceUrl(value);
 return <div className="reference-link-editor"><label className="field">Indirizzo del riferimento<input type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="https://…" value={value||''} onChange={e=>onChange(e.target.value)} aria-invalid={invalid}/></label><ReferenceLink value={value}/></div>;
}
