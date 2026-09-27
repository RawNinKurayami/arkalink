import {createClient, type SupabaseClient} from '@supabase/supabase-js';
export type ForgeUser={userId:string;displayName:string;email:string;fullName:string|null};
declare global {interface Window {FORGE_CONFIG?:{url:string;publishableKey:string}}}
const config=window.FORGE_CONFIG;
export const cloud:SupabaseClient|null=config?.url&&config?.publishableKey?createClient(config.url,config.publishableKey,{auth:{storageKey:'arkalink-forge-auth-v1',flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export function requireCloud(){if(!cloud)throw Error('Il cloud della Forgia non è ancora configurato.');return cloud;}
export async function ownerId(){const {data,error}=await requireCloud().auth.getSession();if(error||!data.session?.user.id)throw Error('Accedi nuovamente alla Forgia.');return data.session.user.id;}
export async function assertOwner(expected:string){if(await ownerId()!==expected)throw Error('Account cambiato. Riapri la Forgia con l’account corretto.');}
