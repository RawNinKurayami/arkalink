import {useEffect,useState,lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {cloud,type ForgeUser} from './app/forge-client';
import ForgeThreshold from './app/threshold';
import './app/globals.css';
import './app/forge.css';
const Studio=lazy(()=>import('./app/studio'));
function App(){
 const [user,setUser]=useState<ForgeUser|null>(null);const [loading,setLoading]=useState(!!cloud);const [authError,setAuthError]=useState('');const [recovery,setRecovery]=useState(new URLSearchParams(location.search).get('recovery')==='1');
 useEffect(()=>{if(!cloud)return;let alive=true;let generation=0;
  const apply=(u:any)=>{if(!alive)return;setUser(u?{userId:u.id,email:u.email||'',displayName:u.user_metadata?.display_name||u.email?.split('@')[0]||'Viaggiatore',fullName:u.user_metadata?.display_name||null}:null);setLoading(false);};
  const {data:{subscription}}=cloud.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION')return;generation++;if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT')apply(null);else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')apply(session?.user);});
  const current=generation;cloud.auth.getUser().then(({data,error})=>{if(!alive||current!==generation)return;if(error&&error.name!=='AuthSessionMissingError')setAuthError('Impossibile verificare l’accesso. Riprova.');apply(data.user);}).catch(()=>{if(alive){setAuthError('Connessione non disponibile. Riprova.');setLoading(false);}});
  return()=>{alive=false;subscription.unsubscribe();};
 },[]);
 if(loading)return <main className="forge-loading" role="status">Apertura della Forgia…</main>;
 if(recovery||!user)return <ForgeThreshold portalUrl="/" recovery={recovery} authError={authError} onRecovered={()=>{history.replaceState(null,'',location.pathname);setRecovery(false);}}/>;
 return <Suspense fallback={<main className="forge-loading" role="status">Apertura della Sala delle creazioni…</main>}><Studio key={user.userId} user={user} portalUrl="/" onSignOut={async()=>{const {error}=await cloud!.auth.signOut({scope:'local'});if(error)throw error;location.hash='';setUser(null);}}/></Suspense>;
}
createRoot(document.getElementById('root')!).render(<App/>);
