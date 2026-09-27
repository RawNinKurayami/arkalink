import {cp,rm,access} from 'node:fs/promises';
const build=new URL('../dist/',import.meta.url);
const target=new URL('../../forgia/',import.meta.url);
await access(new URL('index.html',build));
await rm(target,{recursive:true,force:true});
await cp(build,target,{recursive:true});
console.log('Build della Forgia aggiornata in /forgia/.');
