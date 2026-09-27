import {requireCloud,assertOwner} from './forge-client';
import {WorkspaceSync,WorkspaceConflict} from './workspace-sync';
import type {Board} from './design-types';
export function workspaceFor(owner:string){return new WorkspaceSync<Board>({
 async read(){await assertOwner(owner);const {data,error}=await requireCloud().from('forge_workspaces').select('revision,content').eq('user_id',owner).maybeSingle();if(error)throw error;await assertOwner(owner);return {revision:data?.revision||0,boards:data?.content?.boards||null};},
 async write(revision,boards){await assertOwner(owner);const {data,error}=await requireCloud().rpc('save_forge_workspace',{expected_revision:revision,payload:{boards}});if(error){if(error.code==='PT409')throw new WorkspaceConflict();throw error;}await assertOwner(owner);if(!Number.isSafeInteger(data))throw Error('Risposta di salvataggio non valida.');return data;}
});}
