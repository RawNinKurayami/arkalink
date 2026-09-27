import {useState,type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
import {cloud,requireCloud} from './forge-client';
import {authErrorMessage} from './auth-errors';
export default function AuthForm({recovery=false,onRecovered}:{recovery?:boolean;onRecovered?:()=>void}){
 const [mode,setMode]=useState<'login'|'register'|'forgot'>( 'login');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
 function switchMode(next:typeof mode){setMode(next);setError('');setMessage('');setPassword('');}
 async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError('');setMessage('');try{
  const auth=requireCloud().auth;const redirect=location.origin+'/forgia/';
  if(recovery){const result=await auth.updateUser({password});if(result.error)throw result.error;setPassword('');onRecovered?.();return;}
  if(mode==='login'){const result=await auth.signInWithPassword({email:email.trim(),password});if(result.error)throw result.error;}
  if(mode==='register'){const result=await auth.signUp({email:email.trim(),password,options:{data:{display_name:name.trim()},emailRedirectTo:redirect}});if(result.error)throw result.error;setPassword('');setMessage('Controlla la posta: se la registrazione è disponibile riceverai un link per confermare l’email.');}
  if(mode==='forgot'){const result=await auth.resetPasswordForEmail(email.trim(),{redirectTo:redirect+'?recovery=1'});if(result.error)throw result.error;setMessage('Se l’indirizzo è registrato, riceverai un link per scegliere una nuova password.');}
 }catch(e:unknown){setError(authErrorMessage(e,recovery?'recovery':mode));}finally{setBusy(false);}}
 return <><h2>{recovery?'Una nuova chiave.':mode==='register'?'Varca la soglia.':mode==='forgot'?'Ritrova l’accesso.':'La tua Forgia.'}</h2><p>{recovery?'Scegli una nuova password per il tuo archivio.':mode==='register'?'Crea il tuo account e custodisci qui le tue creazioni.':mode==='forgot'?'Ti invieremo un link per recuperare il tuo account.':'Accedi al tuo archivio di personaggi, riferimenti e forme.'}</p>{!cloud&&<p className="auth-notice" role="status">L’accesso è in preparazione. Il cloud dedicato deve ancora essere collegato.</p>}<form className="forge-auth" onSubmit={submit}>
 {mode==='register'&&!recovery&&<label>Nome da mostrare<input autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} maxLength={60} required/></label>}
 {!recovery&&<label>Email<input type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} maxLength={254} required/></label>}
 {(recovery||mode!=='forgot')&&<label>{recovery?'Nuova password':'Password'}<input type="password" autoComplete={recovery||mode==='register'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={recovery||mode==='register'?12:1} maxLength={128} required/>{(recovery||mode==='register')&&<small>Almeno 12 caratteri.</small>}</label>}
 {error&&<p role="alert" className="auth-error">{error}</p>}{message&&<p role="status" className="auth-notice">{message}</p>}
 <button type="submit" className="threshold-enter" disabled={busy||!cloud}><span>{busy?'Attendi…':recovery?'Salva la password':mode==='register'?'Crea account':mode==='forgot'?'Invia il link':'Entra nella Forgia'}</span><ArrowRight size={20}/></button>
 </form>{!recovery&&<div className="auth-options">{mode==='login'?<><button disabled={busy} onClick={()=>switchMode('register')}>Crea un account</button><button disabled={busy} onClick={()=>switchMode('forgot')}>Password dimenticata?</button></>:<button disabled={busy} onClick={()=>switchMode('login')}>← Torna all’accesso</button>}</div>}</>;
}
