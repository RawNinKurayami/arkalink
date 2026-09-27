'use client';
import {useState} from 'react';
import {LogOut,ShieldCheck} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {ForgeUser} from './forge-client';
export default function AccountPanel({open,close,user,saveState,busy,save,onSignOut,portalUrl}:{open:boolean;close:()=>void;user:ForgeUser;saveState:string;busy:boolean;save:()=>Promise<boolean>;onSignOut:()=>Promise<void>;portalUrl?:string}){
 const [leaving,setLeaving]=useState(false);const [error,setError]=useState('');
 return <Dialog open={open} onOpenChange={v=>!v&&!leaving&&close()}><DialogContent className="account-panel"><DialogTitle>Il tuo account</DialogTitle><DialogDescription>Account Arkalink Forge</DialogDescription><div className="account-identity"><span className="avatar">{user.displayName.slice(0,1).toUpperCase()}</span><div><strong>{user.fullName||'Il tuo studio'}</strong><span>{user.email}</span></div></div><p><ShieldCheck size={18}/> Personaggi, lavagne e file sono custoditi nel tuo archivio privato.</p><p className="account-save" role="status">{saveState}</p>{error&&<p role="alert">{error}</p>}<button className="soft-button" disabled={busy||leaving} onClick={async()=>{setLeaving(true);setError('');if(await save()){try{await onSignOut();}catch{setError('Uscita non riuscita. Riprova.');setLeaving(false);}}else{setError('Uscita sospesa: le modifiche non sono ancora salvate. Riprova tra qualche istante.');setLeaving(false);}}}><LogOut size={16}/>{leaving?'Salvataggio e uscita…':'Salva ed esci'}</button>{portalUrl&&<a className="soft-button forge-account-return" href={portalUrl+'#forge'}>← Torna alla Convergenza</a>}{busy&&<small>Attendi il completamento del caricamento o del download.</small>}</DialogContent></Dialog>;
}
