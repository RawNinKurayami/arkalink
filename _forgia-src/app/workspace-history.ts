'use client';
import {useState,useRef,useCallback} from 'react';
import type {Board} from './design-types';
const significant=(bs:Board[])=>JSON.stringify(bs.map(b=>({...b,nodes:b.nodes.map(({selected,measured,dragging,...n})=>n),edges:b.edges.map(({selected,...e})=>e)})));
export class WorkspaceTimeline {
 value:Board[];past:Board[][]=[];future:Board[][]=[];lastEdit=0;
 constructor(value:Board[]){this.value=value;}
 set(next:Board[]|((b:Board[])=>Board[]),now=Date.now()){
  const value=typeof next==='function'?next(this.value):next;
  if(significant(this.value)!==significant(value)){
   if(now-this.lastEdit>500||!this.past.length){this.past.push(structuredClone(this.value));this.past=this.past.slice(-60);}
   this.lastEdit=now;this.future=[];
  }
  this.value=value;
 }
 hydrate(value:Board[]){this.value=value;this.past=[];this.future=[];this.lastEdit=0;}
 undo(){const value=this.past.pop();if(!value)return;this.future.push(structuredClone(this.value));this.value=value;this.lastEdit=0;}
 redo(){const value=this.future.pop();if(!value)return;this.past.push(structuredClone(this.value));this.value=value;this.lastEdit=0;}
}
export function useWorkspaceHistory(initial:Board[]){
 const timeline=useRef(new WorkspaceTimeline(initial));const [,render]=useState(0);const refresh=()=>render(n=>n+1);
 const setBoards=useCallback((next:Board[]|((b:Board[])=>Board[]))=>{timeline.current.set(next);refresh();},[]);
 const hydrate=useCallback((value:Board[])=>{timeline.current.hydrate(value);refresh();},[]);
 const undo=useCallback(()=>{timeline.current.undo();refresh();},[]);const redo=useCallback(()=>{timeline.current.redo();refresh();},[]);
 return {boards:timeline.current.value,setBoards,hydrate,undo,redo,counts:{undo:timeline.current.past.length,redo:timeline.current.future.length}};
}
