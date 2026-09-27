/** Revision is assigned by the database, never by a device clock. */
export class WorkspaceConflict extends Error {constructor(){super('Il cloud contiene modifiche più recenti.');this.name='WorkspaceConflict';}}
export type WorkspaceSnapshot<T>={revision:number;boards:T[]|null};
export type WorkspaceTransport<T>={read:()=>Promise<WorkspaceSnapshot<T>>;write:(revision:number,boards:T[])=>Promise<number>};
export class WorkspaceSync<T>{
 private revision:number|null=null; private acknowledged='';private pending:Promise<boolean>|null=null;private conflict=false;
 constructor(private transport:WorkspaceTransport<T>){}
 async load(){const value=await this.transport.read();this.revision=value.revision;this.acknowledged=JSON.stringify(value.boards||[]);this.conflict=false;return value;}
 get conflicted(){return this.conflict;}
 dirty(boards:T[]){return JSON.stringify(boards)!==this.acknowledged;}
 async save(boards:T[]):Promise<boolean>{
  if(this.revision===null)throw Error('Archivio non ancora caricato.');
  if(this.conflict)throw new WorkspaceConflict();
  if(this.pending){await this.pending;return this.save(boards);}
  const serialized=JSON.stringify(boards);if(serialized===this.acknowledged)return true;
  const snapshot=JSON.parse(serialized) as T[];
  this.pending=(async()=>{try{const revision=await this.transport.write(this.revision!,snapshot);this.revision=revision;this.acknowledged=serialized;return true;}catch(e){if(e instanceof WorkspaceConflict)this.conflict=true;throw e;}finally{this.pending=null;}})();
  return this.pending;
 }
}
