'use client';
import {storyText} from './story-data';
import type {Board} from './design-types';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Command,CommandInput,CommandList,CommandItem,CommandEmpty} from '@/components/ui/command';
export default function BoardSearch({board,close,jump}:{board:Board;close:()=>void;jump:(id:string)=>void}){return <Dialog open onOpenChange={v=>!v&&close()}><DialogContent><DialogTitle>Cerca nella lavagna</DialogTitle><DialogDescription>Trova un nodo per nome, categoria, note o indirizzo.</DialogDescription><Command><CommandInput placeholder="Mani, katana, palette…" autoFocus/><CommandList><CommandEmpty>Nessun nodo trovato.</CommandEmpty>{board.nodes.map(n=><CommandItem key={n.id} value={[n.id,n.data.title,n.data.category,n.data.text,n.data.referenceUrl,storyText(n.data.story)].filter(Boolean).join(' ')} onSelect={()=>{jump(n.id);close();}}><span>{n.data.title}<small style={{display:'block',color:'#a8bad0'}}>{n.data.category||n.data.kind}</small></span></CommandItem>)}</CommandList></Command></DialogContent></Dialog>}
