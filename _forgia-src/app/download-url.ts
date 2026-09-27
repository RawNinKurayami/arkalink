export function originalDownloadUrl(url?:string,filename?:string):string|null{
 if(!url)return null;
 if(url==='/forgia/warrior.png')return url;
 if(!url.startsWith('/api/assets?'))return null;
 const parsed=new URL(url,'https://studio.invalid');
 if(parsed.pathname!=='/api/assets'||!parsed.searchParams.get('key'))return null;
 const key=parsed.searchParams.get('key')!;
 parsed.searchParams.set('download','1');
 parsed.searchParams.set('filename',filename||key.split('/').at(-1)||'originale');
 return parsed.pathname+parsed.search;
}
export function downloadDisposition(name:string){
 const safe=Array.from(name).filter(c=>{const n=c.charCodeAt(0);return n>=32&&n!==127&&!['/','\\'].includes(c)&&!(n>=0xD800&&n<=0xDFFF);}).join('').slice(0,180)||'originale';
 const ascii=safe.replace(/[^a-zA-Z0-9._ -]/g,'_');
 return 'attachment; filename="'+ascii+'"; filename*=UTF-8\'\''+encodeURIComponent(safe).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
}
