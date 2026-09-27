import AuthForm from './auth-form';
import {ArrowLeft,ArrowRight,Box,Layers,BookOpen,Lock,Orbit} from 'lucide-react';
import './threshold.css';

export default function ForgeThreshold({portalUrl,recovery,authError,onRecovered}:{portalUrl?:string;recovery?:boolean;authError?:string;onRecovered?:()=>void}) {
 return <main className="forge-threshold">
  <img className="threshold-scene" src="/forgia/forge-chamber.png" alt="La Forgia: una sala arcana in cui forme, riferimenti e materia orbitano intorno a un nucleo luminoso."/>
  <div className="threshold-shade" aria-hidden="true"/>
  <header className="threshold-header">
   {portalUrl?<a className="threshold-back" href={portalUrl+'#forge'}><ArrowLeft size={17}/>La Convergenza</a>:<span className="threshold-back">ARKALINK / SOGLIA 02</span>}
   <div className="threshold-brand"><Orbit size={30} aria-hidden="true"/><span>ARKALINK<small>FORGE</small></span></div>
   <span className="threshold-coordinate">SOGLIA 02 <span aria-hidden="true">/</span> LA FORGIA</span>
  </header>
  <section className="threshold-content" aria-labelledby="forge-title">
   <div className="threshold-story"><p className="threshold-eyebrow">IL LUOGO DELLE FORME POSSIBILI</p><h1 id="forge-title">La Forgia<span>Ogni forma,<br/>un mondo possibile.</span></h1><p>Tra memoria e materia, i personaggi prendono forma. Qui ogni tratto trova il proprio posto.</p></div>
   <div className="threshold-access"><div className="threshold-seal" aria-hidden="true"><Orbit size={29}/></div><p className="threshold-eyebrow">OLTRE LA SOGLIA</p><AuthForm recovery={recovery} onRecovered={onRecovered}/>{authError&&<p role="alert">{authError}</p>}<p className="threshold-private"><Lock size={14}/><span>Il tuo account Arkalink Forge. Un archivio privato, disponibile sui tuoi dispositivi.</span></p></div>
  </section>
  <footer className="threshold-places" aria-label="Gli strumenti della Forgia">
   <div><Layers aria-hidden="true"/><p><span>01 / FORMA</span><strong>La tela</strong><small>Riferimenti e collegamenti</small></p></div>
   <div><BookOpen aria-hidden="true"/><p><span>02 / MEMORIA</span><strong>Le identità</strong><small>Storie, tratti e relazioni</small></p></div>
   <div><Box aria-hidden="true"/><p><span>03 / MATERIA</span><strong>Le forme</strong><small>Palette e modelli 3D</small></p></div>
  </footer>
 </main>;
}
