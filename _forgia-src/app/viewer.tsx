import {fetchAsset, isForgeAsset, saveVersionAsset} from './cloud-assets';
'use client';
import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Box } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function Viewer({ url, name, preset = 'perspective' }: { url?: string; name?: string; preset?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const controller = useRef<{ wire: (value: boolean) => void; reset: () => void } | null>(null);
  const presetRef=useRef(preset);presetRef.current=preset;
  useEffect(()=>{controller.current?.reset();},[preset]);
  const [error, setError] = useState('');
  const [wire, setWire] = useState(false);
  const wireRef = useRef(wire); wireRef.current = wire;
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(!!url);
  useEffect(() => {
    setError(''); setLoading(!!url);
    if (!url || !ref.current) return;
    const abort = new AbortController();
    const cleanup: (() => void)[] = [];
    let disposed = false;
    const dispose = () => { if (disposed) return; disposed = true; controller.current = null; cleanup.reverse().forEach(fn => fn()); };
    (async () => {
      try {
        const T = await import('three');
        const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
        const { modelFormat, parseSTL, fitCamera } = await import('./model-utils');
        if (abort.signal.aborted || !ref.current) return;
        const response = await fetchAsset(url, { signal: abort.signal });
        if (!response.ok) throw new Error(response.status === 404 ? 'File non trovato. Ricarica il modello nelle proprietà.' : 'Download del modello non riuscito. Riprova o accedi di nuovo allo studio.');
        if (response.headers.get('content-type')?.includes('text/html')) throw new Error('La sessione è scaduta. Ricarica la pagina e accedi di nuovo.');
        const bytes = await response.arrayBuffer();
        if (!bytes.byteLength) throw new Error('Il file è vuoto. Carica un altro modello.');
        if (abort.signal.aborted) return;
        const manager = new T.LoadingManager();
        manager.setURLModifier(u => {
          if (u.startsWith('blob:') || u.startsWith('data:')) return u;
          throw new Error('Il GLB richiede risorse esterne. Esportalo con le texture incorporate.');
        });
        let object: import('three').Object3D;
        const format = modelFormat(name, url);
        if (format === 'stl') object = parseSTL(bytes);
        else if (format === 'obj') {
          const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
          object = new OBJLoader(manager).parse(new TextDecoder().decode(bytes));
        } else if (format === 'glb') {
          const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
          object = (await new GLTFLoader(manager).parseAsync(bytes, '')).scene;
        } else throw new Error('Formato non riconosciuto. Usa STL, OBJ o GLB.');
        const disposeObject = () => object.traverse((item: any) => {
          item.geometry?.dispose();
          if (item.material) (Array.isArray(item.material) ? item.material : [item.material]).forEach((m: any) => {
            Object.values(m).forEach((v: any) => { if (v?.isTexture) v.dispose(); }); m.dispose();
          });
        });
        if (abort.signal.aborted) { disposeObject(); return; }
        cleanup.push(disposeObject);
        const el = ref.current!;
        let renderer: import('three').WebGLRenderer;
        try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
        catch { throw new Error('Il browser non riesce ad avviare il 3D. Abilita l’accelerazione grafica e riprova.'); }
        cleanup.push(() => { renderer.setAnimationLoop(null); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.domElement.setAttribute('aria-label', 'Modello 3D: trascina per ruotare, scorri per lo zoom');
        el.appendChild(renderer.domElement);
        const scene = new T.Scene(); scene.add(object);
        const box = new T.Box3().setFromObject(object);
        if (box.isEmpty()) throw new Error('Il file non contiene una geometria visibile.');
        const root = new T.Group(); scene.remove(object); root.add(object); scene.add(root);
        const center = box.getCenter(new T.Vector3());
        root.position.sub(center);
        const camera = new T.PerspectiveCamera(38, 1, 0.001, 10000);
        const controls = new OrbitControls(camera, renderer.domElement);
        cleanup.push(() => controls.dispose()); controls.enableDamping = true;
        scene.add(new T.HemisphereLight(0xffffff, 0x424957, 3));
        const light = new T.DirectionalLight(0xffffff, 4); light.position.set(4, 6, 5); scene.add(light);
        const setWire = (value: boolean) => object.traverse((item: any) => {
          if (item.isMesh) (Array.isArray(item.material) ? item.material : [item.material]).forEach((m: any) => { m.wireframe = value; });
        });
        const reset = () => { const sphere = fitCamera(camera, root); const distance=camera.position.distanceTo(sphere.center);const directions:Record<string,import('three').Vector3>={front:new T.Vector3(0,0,1),side:new T.Vector3(1,0,0),back:new T.Vector3(0,0,-1)};const direction=directions[presetRef.current];if(direction)camera.position.copy(sphere.center).add(direction.multiplyScalar(distance));controls.target.copy(sphere.center); controls.minDistance = sphere.radius * 0.02; controls.maxDistance = sphere.radius * 80; controls.update(); };
        const resize = () => {
          if (!el.clientWidth || !el.clientHeight) return;
          renderer.setSize(el.clientWidth, el.clientHeight);
          camera.aspect = el.clientWidth / el.clientHeight; reset();
        };
        resize(); const observer = new ResizeObserver(resize); observer.observe(el); cleanup.push(() => observer.disconnect());
        controller.current = { wire: setWire, reset }; setWire(wireRef.current);
        renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
        setLoading(false);
      } catch (e) {
        dispose();
        if (!abort.signal.aborted) { setError(e instanceof Error ? e.message : 'Impossibile aprire il modello. Verifica il file e riprova.'); setLoading(false); }
      }
    })();
    return () => { abort.abort(); dispose(); };
  }, [url, name, attempt]);
  return <div className="viewer nodrag nowheel nopan" onDoubleClick={e => e.stopPropagation()}>
    <div ref={ref} className="model-stage" />
    {!url && <div className="model-empty"><Box size={48} strokeWidth={1} /><strong>Il tuo modello, a 360°</strong><span>Carica GLB, OBJ o STL</span></div>}
    {loading && <div className="model-overlay" role="status">Caricamento modello…</div>}
    {error && <div className="model-overlay error" role="alert"><p>{error}</p><button className="soft-button" onClick={() => setAttempt(a => a + 1)}>Riprova</button></div>}
    {url && !error && !loading && <div className="model-bar"><label><Switch checked={wire} onCheckedChange={v => { setWire(v); controller.current?.wire(v); }} /> Wireframe</label><button title="Ripristina vista" onClick={() => controller.current?.reset()}><RotateCcw size={15} /></button></div>}
  </div>;
}
