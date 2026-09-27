/* Public reading and server-authorized editorial API. No character saves are written. */
(function(root){
  'use strict';
  const TABLE='glc_news', SUMMARY='id,title,category,excerpt,thumbnail,published_at,featured', CATEGORIES=['Aggiornamenti','Regolamento','Community'];
  function client(){if(!root.__glcSB)throw Error('Connessione non disponibile. Riprova tra poco.');return root.__glcSB;}
  async function request(query){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{const result=await query.abortSignal(controller.signal);if(result.error)throw result.error;return result.data;}
    finally{clearTimeout(timer);}
  }
  function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=String(text);return n;}
  function imageURL(value){
    if(typeof value!=='string')return '';
    if(/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value))return value;
    try{const u=new URL(value,location.origin);if(u.origin===location.origin&&u.pathname.startsWith('/img/'))return u.href;if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch(_){}
    return '';
  }
  function date(value){const d=new Date(value);return Number.isNaN(d.getTime())?'Bozza':d.toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'});}
  function cover(item){const src=imageURL(item.thumbnail||item.cover);if(!src)return node('div','news-cover news-fallback','✧');const img=node('img','news-cover');img.src=src;img.alt='';img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>img.replaceWith(node('div','news-cover news-fallback','✧')),{once:true});return img;}
  function card(item){
    const a=node('a','news-card');a.href='/notizie/?id='+encodeURIComponent(item.id);a.append(cover(item));
    const body=node('div','news-card-copy'),meta=node('div','news-meta');meta.append(node('span','',item.category));const time=node('time','',date(item.published_at));if(item.published_at)time.dateTime=item.published_at;meta.append(time);
    body.append(meta,node('h3','',item.title),node('p','',item.excerpt));const more=node('span','text-link','Leggi il dispaccio ');more.append(node('span','','↗'));body.append(more);a.append(body);return a;
  }
  function article(item){
    const article=node('article','article');article.append(node('p','article-meta',item.category+' · '+date(item.published_at)),node('h2','',item.title),node('p','article-lead',item.excerpt));
    const src=imageURL(item.cover);if(src){const img=node('img');img.src=src;img.alt='';img.decoding='async';article.append(img);}
    const body=node('div','article-body');
    String(item.body||'').split(/\n\s*\n/).forEach(text=>{const p=node('p');let end=0;const re=/https:\/\/[^\s<>]+/g;for(const match of text.matchAll(re)){p.append(document.createTextNode(text.slice(end,match.index)));const url=match[0].replace(/[.,;!?)]+$/,'');let ok=false;try{const u=new URL(url);ok=u.protocol==='https:'&&!u.username&&!u.password;}catch(_){}if(ok){const a=node('a','',url);a.href=url;a.target='_blank';a.rel='noopener noreferrer';p.append(a,document.createTextNode(match[0].slice(url.length)));}else p.append(document.createTextNode(match[0]));end=match.index+match[0].length;}p.append(document.createTextNode(text.slice(end)));body.append(p);});article.append(body);return article;
  }
  async function canEdit(){try{const session=await client().auth.getSession();if(session.error||!session.data?.session)return false;return await request(client().rpc('glc_news_can_edit'))===true;}catch(_){return false;}}
  async function list({offset=0,limit=9,category='',home=false,editor=false}={}){
    let q=client().from(TABLE).select(SUMMARY+(editor?',status,version,updated_at':''));
    if(!editor)q=q.eq('status','published');if(category)q=q.eq('category',category);
    if(home)q=q.order('featured',{ascending:false});
    q=q.order(editor?'updated_at':'published_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+limit-1);
    return await request(q)||[];
  }
  async function get(id,editor=false){let q=client().from(TABLE).select('*').eq('id',id);if(!editor)q=q.eq('status','published');return request(q.maybeSingle());}
  function validate(draft){
    if(!draft.title.trim()||draft.title.length>160)throw Error('Inserisci un titolo, fino a 160 caratteri.');
    if(!draft.excerpt.trim()||draft.excerpt.length>320)throw Error('Inserisci un’introduzione, fino a 320 caratteri.');
    if(!draft.body.trim()||draft.body.length>40000)throw Error('Inserisci il testo, fino a 40.000 caratteri.');
    if(!CATEGORIES.includes(draft.category))throw Error('Scegli una categoria valida.');
    if(draft.cover&&(!/^data:image\/(png|jpeg|webp);base64,/i.test(draft.cover)||draft.cover.length>3600000))throw Error('Ricarica una copertina JPG, PNG o WebP.');
  }
  async function save(draft,version){
    validate(draft);const payload={title:draft.title.trim(),excerpt:draft.excerpt.trim(),body:draft.body.trim(),category:draft.category,cover:draft.cover||'',thumbnail:draft.thumbnail||'',featured:!!draft.featured,status:draft.status};
    const q=version?client().from(TABLE).update(payload).eq('id',draft.id).eq('version',version):client().from(TABLE).insert({...payload,id:draft.id});
    const row=await request(q.select().maybeSingle());if(!row)throw Error('Il dispaccio è cambiato oppure non hai più accesso. Il testo nell’editor è intatto: copialo prima di ricaricare la versione salvata.');return row;
  }
  root.GLCNews={node,imageURL,date,card,article,canEdit,list,get,save,validate};
})(window);
