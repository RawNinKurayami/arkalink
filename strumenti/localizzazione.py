#!/usr/bin/env python3
"""Extract and rebuild English GLC pages without changing the Italian rules.

Translations are complete inline HTML units (not word substitutions). Source
hashes prevent silently rebuilding an English edition against changed rules.
The original game identifiers and JavaScript are never translated by this tool.
"""
from __future__ import annotations
from html.parser import HTMLParser
from pathlib import Path
import argparse, hashlib, html, json, re

ROOT = Path(__file__).resolve().parents[1]
MANUALS = ['manuale', 'manuale-frutti', 'manuale-cyborg', 'manuale-prestigio']
INLINE = {'b','br','i','em','strong','small','sup','sub','span','a','code','abbr','u','s','mark','wbr'}
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
EXCLUDE = {'script','style','svg','noscript'}
UNITS = {'p','li','a','span','b','i','em','strong','small','sup','sub','h1','h2','h3','h4','h5','h6','td','th','dt','dd','label','legend','option','button','figcaption','title','summary','div'}
ATTRS = {'title','aria-label','placeholder','alt'}
PAGES = ['grand-line-chronicles','crea-il-tuo-pirata','gestisci-pirata','profilo','sessioni','campagne','plancia-master','portale-officina-cambusa','nave-portale','isola','notizie','scheda-stampabile','manuali']
LANGUAGE_MARKER = re.compile(r'<!-- GLC LANGUAGE START -->.*?<!-- GLC LANGUAGE END -->\n?', re.S)

def clean_source(source):
    return LANGUAGE_MARKER.sub('', source)

def install_language(source, folder, english=False):
    source = clean_source(source)
    suffix = '/en' if english else ''
    alternate = ''
    if folder in MANUALS:
        alternate = f'<link rel="alternate" hreflang="it" href="https://arkalink.com/{folder}/">\n<link rel="alternate" hreflang="en" href="https://arkalink.com/en/{folder}/">\n<link rel="canonical" href="https://arkalink.com{suffix}/{folder}/">\n'
    block = '<!-- GLC LANGUAGE START -->\n<link rel="stylesheet" href="/glc-i18n.css?v=1">\n<script src="/glc-i18n.js?v=1"></script>\n' + alternate + '<!-- GLC LANGUAGE END -->\n'
    # Early enough to choose the manual edition before any page script runs.
    return source.replace('</head>', block + '</head>', 1)

def key(value):
    return hashlib.sha256(value.encode()).hexdigest()[:20]

def words(value):
    return len(re.findall(r'\S+', html.unescape(re.sub(r'<[^>]+>', ' ', value))))

def is_language(value):
    plain = html.unescape(re.sub(r'<[^>]+>', '', value)).strip()
    return bool(re.search(r'[A-Za-zÀ-ÿ]{2}', plain)) and not re.fullmatch(r'(?:d\d+|[\d\s+×/·→−.,:%฿–—()]+)', plain)

def write_packs(directory, packs):
    # IDs depend on the complete Italian unit, not its pack position. Retain
    # reviewed translations when an edit moves unchanged units to another pack.
    reviewed={}
    for target in sorted(directory.glob('*.en.json')):
        reviewed.update(json.loads(target.read_text()))
    for obsolete in list(directory.glob('*.source.json'))+list(directory.glob('*.en.json')):
        obsolete.unlink()
    for i,pack in enumerate(packs,1):
        (directory/f'{i:02d}.source.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
        retained={rec['id']:reviewed[rec['id']] for rec in pack if rec['id'] in reviewed}
        if retained:
            (directory/f'{i:02d}.en.json').write_text(json.dumps(retained,ensure_ascii=False,indent=2)+'\n')

class Extractor(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source, self.stack, self.elements, self.texts, self.attributes = source, [], [], [], []
        self.lines = [0]
        self.lines += [m.end() for m in re.finditer('\n', source)]

    def pos_offset(self):
        line, col = self.getpos()
        return self.lines[line-1] + col

    def handle_starttag(self, tag, attrs):
        start, raw = self.pos_offset(), self.get_starttag_text()
        excluded = tag in EXCLUDE or any(n['excluded'] for n in self.stack)
        node = {'tag':tag,'start':start,'innerStart':start+len(raw),'end':start+len(raw),'innerEnd':start+len(raw),'children':[], 'excluded':excluded}
        if self.stack: self.stack[-1]['children'].append(node)
        if not excluded:
            for m in re.finditer(r'([\w-]+)\s*=\s*(["\x27])(.*?)\2', raw, re.S):
                name, value = m.group(1).lower(), m.group(3)
                if name in ATTRS or (tag == 'meta' and name == 'content' and dict(attrs).get('name') == 'description'):
                    if is_language(value): self.attributes.append((start+m.start(3),start+m.end(3),value,'attribute'))
        self.elements.append(node)
        if tag not in VOID: self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID and self.stack and self.stack[-1]['tag'] == tag: self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i]['tag'] == tag:
                end = self.pos_offset()
                for node in self.stack[i:]:
                    node['innerEnd'], node['end'] = end, end+len('</'+tag+'>')
                self.stack = self.stack[:i]
                break

    def handle_data(self, data):
        if not any(n['excluded'] for n in self.stack):
            start = self.pos_offset(); self.texts.append((start,start+len(data),data,'text'))

    def handle_entityref(self, name): self.handle_data('&'+name+';')
    def handle_charref(self, name): self.handle_data('&#'+name+';')

    def records(self):
        def inline(node): return all(c['tag'] in INLINE and inline(c) for c in node['children'])
        selected = []
        for node in self.elements:
            if node['excluded'] or node['tag'] not in UNITS or not inline(node): continue
            start, end = node['innerStart'], node['innerEnd']
            value = self.source[start:end]
            if is_language(value): selected.append((start,end,value,'html'))
        selected.sort(key=lambda r:(r[0],-r[1]))
        covered, last = [], -1
        for rec in selected:
            if rec[0] >= last: covered.append(rec); last = rec[1]
        for rec in self.texts:
            if not is_language(rec[2]) or any(a <= rec[0] and rec[1] <= b for a,b,*_ in covered): continue
            # Retain surrounding whitespace outside the translated span.
            left=len(rec[2])-len(rec[2].lstrip()); right=len(rec[2].rstrip())
            if right > left: covered.append((rec[0]+left,rec[0]+right,rec[2][left:right],rec[3]))
        return sorted(covered+self.attributes,key=lambda r:r[0])

def extract(folder):
    source_path = ROOT/folder/'index.html'
    source = clean_source(source_path.read_text())
    parser = Extractor(source); parser.feed(source)
    records = parser.records()
    unique={}; occurrences=[]
    for start,end,value,kind in records:
        ident=key(value)
        unique.setdefault(ident, {'id':ident,'it':value,'kind':kind})
        occurrences.append({'id':ident,'start':start,'end':end,'kind':kind})
    directory = ROOT/'locales/en/manuals'/folder
    directory.mkdir(parents=True,exist_ok=True)
    (directory/'manifest.json').write_text(json.dumps({'source':str(source_path.relative_to(ROOT)),'sha256':hashlib.sha256(source.encode()).hexdigest(),'records':occurrences},ensure_ascii=False,indent=2)+'\n')
    packs=[]; pack=[]; count=0
    for rec in unique.values():
        size=words(rec['it'])
        if pack and count+size > 4500: packs.append(pack); pack=[]; count=0
        pack.append(rec); count+=size
    if pack: packs.append(pack)
    write_packs(directory,packs)
    print(folder, len(unique), 'units', sum(words(r['it']) for r in unique.values()), 'words', len(packs), 'packs')

def literals(source):
    """Read string literals for presentation inventories; never rewrite JS.

    Template expressions are retained as numbered placeholders. This scanner
    deliberately inventories literals rather than executing game source.
    """
    i=0
    while i < len(source):
        if source.startswith('//',i):
            end=source.find('\n',i); i=len(source) if end<0 else end+1; continue
        if source.startswith('/*',i):
            end=source.find('*/',i+2); i=len(source) if end<0 else end+2; continue
        if source[i]=='/':
            before=source[:i].rstrip()
            if not before or before[-1] in '(=,:!?[{;&|>' or re.search(r'\b(?:return|case|throw)\s*$',before):
                j=i+1; in_class=False
                while j<len(source):
                    if source[j]=='\\':j+=2;continue
                    if source[j]=='[':in_class=True
                    elif source[j]==']':in_class=False
                    elif source[j]=='/' and not in_class:
                        j+=1
                        while j<len(source) and source[j].isalpha():j+=1
                        i=j;break
                    j+=1
                else:i+=1
                continue
        if source[i] not in '\"\x27`': i+=1; continue
        quote=source[i]; start=i; i+=1; value=''; place=0
        while i<len(source):
            if source[i]==quote: i+=1; break
            if quote=='`' and source.startswith('${',i):
                j=i+2; depth=1; inner_quote=None
                while j<len(source) and depth:
                    ch=source[j]
                    if inner_quote:
                        if ch=='\\': j+=2; continue
                        if ch==inner_quote: inner_quote=None
                    elif ch in '\"\x27`': inner_quote=ch
                    elif ch=='{': depth+=1
                    elif ch=='}': depth-=1
                    j+=1
                place+=1; value+='{{'+str(place)+'}}'; i=j; continue
            if source[i]=='\\' and i+1<len(source):
                ch=source[i+1]
                if ch in {'u','x'}:
                    count=4 if ch=='u' else 2
                    try:value+=chr(int(source[i+2:i+2+count],16)); i+=2+count; continue
                    except ValueError:pass
                value+= {'n':'\n','r':'\r','t':'\t','b':'\b','f':'\f'}.get(ch,ch); i+=2; continue
            value+=source[i]; i+=1
        yield value,start

def extract_ui():
    manual_values=set()
    for folder in MANUALS:
        for path in (ROOT/'locales/en/manuals'/folder).glob('*.source.json'):
            for rec in json.loads(path.read_text()):
                manual_values.add(rec['it'].strip())
                manual_values.add(html.unescape(re.sub(r'<[^>]+>','',rec['it'])).strip())
    values={}; references={}
    def add(value,context,kind='text'):
        value=value.strip()
        if not is_language(value):return
        if value in manual_values:
            references.setdefault(key(value),{'id':key(value),'it':value,'kind':kind,'context':context});return
        if re.fullmatch(r'[\w./:#@-]+',value) and (any(c in value for c in '/.#:@_-') or value.islower()): return
        if re.match(r'^(?:rgba?\(|linear-gradient|https?:|data:|[Mmd]\d|[A-Z_]{3,}=)',value): return
        ident=key(value); values.setdefault(ident,{'id':ident,'it':value,'kind':kind,'context':context})
    def fragment(value,context):
        if re.search(r'<[a-zA-Z][^>]*>',value):
            p=Extractor(value); p.feed(value)
            records=p.records()
            # Unclosed fragments still carry text for concatenated templates.
            for _,_,text,kind in records: add(text,context,kind)
        else: add(value,context)
    paths=[ROOT/f/'index.html' for f in PAGES]
    paths += list(ROOT.glob('glc-*.js'))+[ROOT/'home.js']
    for folder in ['regole','gestisci-pirata','scheda-stampabile','nave-portale','isola','notizie']:
        paths += list((ROOT/folder).glob('*.js'))
    for path in paths:
        if path.name=='glc-i18n.js': continue
        source=path.read_text(); context=str(path.relative_to(ROOT))
        if path.suffix=='.html':
            p=Extractor(source); p.feed(source)
            for _,_,value,kind in p.records(): add(value,context,kind)
            scripts=re.findall(r'<script\b[^>]*>(.*?)</script>',source,re.S)
        else: scripts=[source]
        for script in scripts:
            for value,_ in literals(script): fragment(value,context)
    # Ingredient catalogue labels are also rendered by the merchant.
    def strings(value):
        if isinstance(value,str): yield value
        elif isinstance(value,list):
            for item in value: yield from strings(item)
        elif isinstance(value,dict):
            for item in value.values(): yield from strings(item)
    for value in strings(json.loads((ROOT/'regole/ingredienti-cambusa.json').read_text())):
        fragment(value,'regole/ingredienti-cambusa.json')
    directory=ROOT/'locales/en/ui'; directory.mkdir(parents=True,exist_ok=True)
    (directory/'manual-references.json').write_text(json.dumps(list(references.values()),ensure_ascii=False,indent=2)+'\n')
    packs=[]; pack=[]; count=0
    for rec in values.values():
        size=words(rec['it'])
        if pack and count+size>4000: packs.append(pack); pack=[]; count=0
        pack.append(rec); count+=size
    if pack:packs.append(pack)
    write_packs(directory,packs)
    print('ui',len(values),'units',sum(words(v['it']) for v in values.values()),'words',len(packs),'packs')

def translations(directory, partial=False):
    values = {}; missing = []; sources = {}
    for path in sorted(directory.glob('*.source.json')):
        source = json.loads(path.read_text())
        target = path.with_name(path.name.replace('.source.', '.en.'))
        translated = json.loads(target.read_text()) if target.exists() else {}
        if not isinstance(translated, dict): raise ValueError(f'{target}: expected a JSON object')
        wanted = {r['id'] for r in source}
        if translated.keys() - wanted: raise ValueError(f'{target}: unknown translation IDs')
        for rec in source:
            ident = rec['id']; sources[ident] = rec
            if ident not in translated:
                missing.append(str(path.relative_to(ROOT)) + ':' + ident)
                if partial: values[ident] = rec['it']
                continue
            en = translated[ident]
            if not isinstance(en,str) or not en.strip(): raise ValueError(f'{target}:{ident}: empty translation')
            if sorted(re.findall(r'\{\{\d+\}\}', rec['it'])) != sorted(re.findall(r'\{\{\d+\}\}', en)):
                raise ValueError(f'{target}:{ident}: template values changed')
            # All links, identifiers, event handlers and inline tag order survive.
            if rec['kind'] == 'html' and re.findall(r'<[^>]+>',rec['it']) != re.findall(r'<[^>]+>',en):
                raise ValueError(f'{target}:{ident}: inline markup changed')
            values[ident] = en
    if missing and not partial: raise ValueError(f'{directory}: {len(missing)} untranslated units; first: {missing[0]}')
    return sources,values,missing

def plain(value):
    return html.unescape(re.sub(r'<[^>]+>','',value)).strip()

def english_numbers(value):
    """Format numeric-only Italian cells without changing their numeric value."""
    value=re.sub(r'(?<![\w.,])([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d+))?(?![\d.])',
                 lambda m:m[1].replace('.',',')+('.'+m[2] if m[2] else ''),value)
    return re.sub(r'(?<![\d.,])(\d+),(\d{1,2})(?![\d,])',r'\1.\2',value)

def align_english(value, alignments):
    """Use canonical game names only in translated text, never HTML attributes."""
    if not alignments: return value
    names = sorted(alignments, key=len, reverse=True)
    pattern = re.compile(r'(?<![\w])(?:' + '|'.join(re.escape(name) for name in names) + r')(?![\w])')
    pieces = re.split(r'(<[^>]+>)', value)
    for i in range(0, len(pieces), 2):
        pieces[i] = pattern.sub(lambda match: alignments[match.group()], pieces[i])
    return ''.join(pieces)

def rewrite_urls(source, folder):
    def replace(match):
        name,quote,value=match.groups()
        if value.startswith(('#','http:','https:','data:','mailto:','tel:','javascript:')):return match.group(0)
        if value.startswith('/'):
            first=value.split('/')[1]
            if first in MANUALS and not re.search(r'\.(css|js|png|jpg|webp)(?:\?|$)',value):value='/en'+value
            elif first in PAGES and not re.search(r'\.[a-z]+(?:\?|$)',value):
                base,mark,anchor=value.partition('#');value=base+('&' if '?' in base else '?')+'lang=en'+(mark+anchor if mark else '')
        else:
            # Asset URLs must still resolve from the original manual folder.
            value=f'/{folder}/'+value
            if '.pdf' in value:value='/en'+value
        return f'{name}={quote}{value}{quote}'
    return re.sub(r'\b(href|src)\s*=\s*(["\x27])(.*?)\2',replace,source)

def build(partial=False):
    all_values={}; report={'manuals':{},'ui':{}}
    alignment_path=ROOT/'locales/en/name-alignments.json'
    alignments=json.loads(alignment_path.read_text()) if alignment_path.exists() else {}
    for folder in MANUALS:
        directory=ROOT/'locales/en/manuals'/folder
        sources,values,missing=translations(directory,partial)
        values={ident:align_english(en,alignments) for ident,en in values.items()}
        manifest=json.loads((directory/'manifest.json').read_text())
        source=clean_source((ROOT/manifest['source']).read_text())
        if hashlib.sha256(source.encode()).hexdigest()!=manifest['sha256']:
            raise ValueError(f'{folder}: Italian source changed; review and re-extract before publishing')
        replacements=[dict(r,translated=values[r['id']]) for r in manifest['records'] if r['kind']!='attribute']
        parser=Extractor(source);parser.feed(source)
        numeric=[]
        for start,end,value,_ in parser.texts:
            if is_language(value) or any(r['start']<=start and end<=r['end'] for r in replacements):continue
            formatted=english_numbers(value)
            if formatted!=value:numeric.append({'start':start,'end':end,'translated':formatted})
        replacements+=numeric
        for r in sorted(replacements,key=lambda r:r['start'],reverse=True):
            source=source[:r['start']]+r['translated']+source[r['end']:]
        # Attributes can be inside the units just translated: use new offsets.
        attrs={sources[r['id']]['it']:values[r['id']] for r in manifest['records'] if r['kind']=='attribute'}
        parser=Extractor(source);parser.feed(source)
        for start,end,it,_ in sorted(parser.attributes,reverse=True):
            if it in attrs:source=source[:start]+html.escape(html.unescape(attrs[it]),quote=True)+source[end:]
        source=source.replace('<html lang="it">','<html lang="en">',1)
        # The manual is already translated in full. Runtime localisation only
        # serves the reader controls, never reinterprets English rules.
        source=source.replace('<main class="man-foglio"','<main translate="no" class="man-foglio"',1)
        source=rewrite_urls(source,folder)
        source=install_language(source,folder,True)
        target=ROOT/'en'/folder/'index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(source)
        for ident,rec in sources.items():
            all_values.setdefault(rec['it'],values[ident])
            all_values.setdefault(plain(rec['it']),plain(values[ident]))
        report['manuals'][folder]={'units':len(values),'missing':len(missing),'numericFormats':len(numeric),'source':manifest['sha256']}
    directory=ROOT/'locales/en/ui'
    sources,values,missing=translations(directory,partial)
    unresolved=[]
    for rec in json.loads((directory/'manual-references.json').read_text()):
        if rec['it'] not in all_values:unresolved.append(rec['it'])
    if unresolved:raise ValueError(f'Unresolved manual/UI references: {unresolved[:3]}')
    # Manuals contain their complete English text. Managers only need the
    # manual units actually reused by the UI, keeping the catalogue lightweight.
    reference_texts={rec['it'] for rec in json.loads((directory/'manual-references.json').read_text())}
    all_values={it:en for it,en in all_values.items() if it in reference_texts}
    # UI phrasing takes precedence in UI, never in the separately built manuals.
    for ident,rec in sources.items():all_values[rec['it']]=values[ident]
    supplemental=ROOT/'locales/en/ui/supplemental.json'
    if supplemental.exists():all_values.update(json.loads(supplemental.read_text()))
    for folder in MANUALS:
        for path in (ROOT/'locales/en/manuals'/folder).glob('terms*.json'):
            all_values.update(json.loads(path.read_text()))
    glossary=ROOT/'locales/en/glossary.json'
    if glossary.exists():all_values.update(json.loads(glossary.read_text()))
    all_values.update({'PV':'HP','P.A.':'AP','P.A':'AP','PA':'AP','DP':'PD','PS':'SP','CD':'DC','ST':'ST','PIP':'PIP','Lingua':'Language','Italiano':'Italian','Colpo Pesante':'Heavy Strike','Il Colpo Sfonda':'Breakthrough Strike'})
    all_values={it:align_english(en,alignments) for it,en in all_values.items()}
    # Full units AND their inline text leaves allow safe updates to bound nodes.
    pairs=list(all_values.items())
    for it,en in pairs:
        if '<' not in it:continue
        a=Extractor(it);a.feed(it);b=Extractor(en);b.feed(en)
        if len(a.texts)==len(b.texts):
            for left,right in zip(a.texts,b.texts):
                if is_language(left[2]):all_values.setdefault(left[2].strip(),right[2].strip())
    catalogue={it:en for it,en in all_values.items() if it!=en and it and en}
    (ROOT/'locales/en/catalog.js').write_text('/* Generated by strumenti/localizzazione.py. */\nwindow.GLCI18n.catalog('+json.dumps(catalogue,ensure_ascii=False,separators=(',',':'))+');\n')
    for folder in PAGES+MANUALS:
        path=ROOT/folder/'index.html';path.write_text(install_language(path.read_text(),folder))
    report['ui']={'units':len(values),'missing':len(missing),'catalogueEntries':len(catalogue)}
    (ROOT/'locales/en/build-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    manifest=json.loads((ROOT/'manifest.webmanifest').read_text())
    manifest.update({'lang':'en','description':'The Grand Line roleplaying game: character sheets, manuals and campaigns for your crew.','start_url':'/grand-line-chronicles/?lang=en'})
    (ROOT/'en/manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['extract','extract-ui','build','validate'])
    parser.add_argument('folders',nargs='*',default=MANUALS)
    parser.add_argument('--partial',action='store_true',help='Preview only: retain untranslated units. Never use for publication.')
    args=parser.parse_args()
    if args.command=='build':build(args.partial)
    elif args.command=='validate':
        for directory in [ROOT/'locales/en/manuals'/f for f in MANUALS]+[ROOT/'locales/en/ui']:
            sources,values,missing=translations(directory,args.partial);print(directory.relative_to(ROOT),len(values),'units',len(missing),'missing')
    elif args.command=='extract-ui': extract_ui()
    else:
        for folder in args.folders: extract(folder)

if __name__ == '__main__': main()
