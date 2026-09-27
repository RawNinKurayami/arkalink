'use client';
import {Menu,Minimize2,Home,Undo2,Redo2,Pencil,Scan,Download,Upload,BookOpen,Plus,FileText} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator,DropdownMenuLabel} from '@/components/ui/dropdown-menu';
type Props={account:()=>void;search:()=>void;packageDownload:()=>void;exit:()=>void;home:()=>void;edit:()=>void;fit:()=>void;undo:()=>void;redo:()=>void;feature:(key:string)=>void;pdf:()=>void;exportBoard:()=>void;importBoard:()=>void;help:()=>void;create:()=>void;save:()=>void;saveState:string;busy:boolean;progress:number;cancel:()=>void};
export default function FocusControls(p:Props){return <div className="focus-controls">
 <DropdownMenu><DropdownMenuTrigger asChild><button className="soft-button" aria-label="Operazioni della lavagna"><Menu size={18}/>Menu</button></DropdownMenuTrigger><DropdownMenuContent align="start" className="focus-menu">
 <DropdownMenuLabel>Lavagna</DropdownMenuLabel><DropdownMenuItem onSelect={p.search}>Cerca nodo · Ctrl/Cmd K</DropdownMenuItem><DropdownMenuItem onSelect={p.packageDownload}>Scarica pacchetto completo</DropdownMenuItem>
 <DropdownMenuItem onSelect={p.edit}><Pencil size={16}/>Proprietà del nodo / progetto</DropdownMenuItem>
 <DropdownMenuItem onSelect={p.fit}><Scan size={16}/>Inquadra tutti i nodi</DropdownMenuItem>
 <DropdownMenuItem onSelect={p.undo}><Undo2 size={16}/>Annulla</DropdownMenuItem><DropdownMenuItem onSelect={p.redo}><Redo2 size={16}/>Ripristina</DropdownMenuItem>
 <DropdownMenuSeparator/>
 {Object.entries({views:'Viste',compare:'Confronto 2D–3D',versions:'Versioni',materials:'Materiali',groups:'Gruppi',trash:'Cestino nodi'}).map(([key,label])=><DropdownMenuItem key={key} onSelect={()=>p.feature(key)}>{label}</DropdownMenuItem>)}
 <DropdownMenuItem onSelect={p.pdf}><FileText size={16}/>Dossier PDF</DropdownMenuItem>
 <DropdownMenuSeparator/>
 <DropdownMenuItem onSelect={p.exportBoard}><Download size={16}/>Esporta personaggio</DropdownMenuItem><DropdownMenuItem onSelect={p.importBoard}><Upload size={16}/>Importa progetto</DropdownMenuItem>
 <DropdownMenuItem onSelect={p.save}>{p.saveState}</DropdownMenuItem>
 <DropdownMenuItem onSelect={p.create}><Plus size={16}/>Nuovo personaggio</DropdownMenuItem><DropdownMenuItem onSelect={p.home}><Home size={16}/>Home · Gestisci personaggi</DropdownMenuItem>
 <DropdownMenuItem onSelect={p.account}>Il tuo account</DropdownMenuItem><DropdownMenuItem onSelect={p.help}><BookOpen size={16}/>Guida</DropdownMenuItem><DropdownMenuItem onSelect={p.exit}><Minimize2 size={16}/>Vista normale</DropdownMenuItem>
 </DropdownMenuContent></DropdownMenu>
 <button className="soft-button" onClick={p.exit} aria-label="Torna alla vista normale (Esc)" title="Vista normale · Esc"><Minimize2 size={18}/><span>Vista normale</span></button>
 {p.busy&&<div className="focus-upload" role="status">Caricamento {p.progress}% <button onClick={p.cancel}>Annulla</button></div>}
 </div>}
