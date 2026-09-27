'use client';
import {Plus,Trash2} from 'lucide-react';
import {storySections,storyText,type Story} from './story-data';
export function StorySummary({story}:{story?:Story}){const summary=story?.background||storyText(story);return <div className="story-summary"><p>{summary?summary.slice(0,240)+(summary.length>240?'…':''):'Origini, personalità, obiettivi e dettagli del personaggio.'}</p><small>Seleziona il nodo per leggere e modificare la scheda.</small></div>}
export function StoryEditor({story={},onChange}:{story?:Story;onChange:(value:Story)=>void}){return <section className="story-editor">
 {storySections.map(([key,label])=><label className="field" key={key}>{label}<textarea rows={key==='background'?8:4} placeholder={key==='background'?'Origini, passato ed eventi importanti…':'Scrivi qui…'} value={story[key]||''} onChange={e=>onChange({...story,[key]:e.target.value})}/></label>)}
 <h3>Informazioni aggiuntive</h3>
 {(story.fields||[]).map((f,i)=><div className="story-custom" key={f.id}><label className="field">Campo<input placeholder="Età, specie, fazione, universo…" value={f.name} onChange={e=>onChange({...story,fields:story.fields!.map((x,j)=>j===i?{...x,name:e.target.value}:x)})}/></label><label className="field">Valore<textarea rows={2} value={f.value} onChange={e=>onChange({...story,fields:story.fields!.map((x,j)=>j===i?{...x,value:e.target.value}:x)})}/></label><button className="soft-button" aria-label={'Rimuovi campo '+(f.name||i+1)} onClick={()=>onChange({...story,fields:story.fields!.filter((_,j)=>j!==i)})}><Trash2 size={15}/>Rimuovi campo</button></div>)}
 <button className="soft-button full" onClick={()=>onChange({...story,fields:[...(story.fields||[]),{id:crypto.randomUUID(),name:'',value:''}]})}><Plus size={16}/>Aggiungi informazione</button>
 </section>}
