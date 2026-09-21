#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rifà manuale/index.html partendo dal .docx del Manuale.

    python3 strumenti/manuale-da-docx.py "~/Downloads/GLC_Manuale_X.docx"

Il testo non viene toccato: cambiano solo struttura (capitoli, sezioni,
elenchi, tabelle), indice e stile. Alla fine lo script ricontrolla che i
caratteri del documento e quelli della pagina coincidano.
"""
import sys, os, zipfile, re, json, html, unicodedata
from xml.etree import ElementTree as ET

DOCX = os.path.expanduser(sys.argv[1]) if len(sys.argv) > 1 else None
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if not DOCX or not os.path.exists(DOCX):
    sys.exit("Passa il percorso del .docx del Manuale.")


W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
def t(tag): return W+tag

def testo_run(r):
    out=''
    for n in r:
        if n.tag==t('t'): out+=n.text or ''
        elif n.tag==t('tab'): out+='\t'
        elif n.tag==t('br'): out+='\n'
    return out

def stile_run(r):
    pr=r.find(t('rPr'))
    if pr is None: return set()
    s=set()
    if pr.find(t('b')) is not None: s.add('b')
    if pr.find(t('i')) is not None: s.add('i')
    if pr.find(t('u')) is not None: s.add('u')
    return s

def paragrafo(p):
    pr=p.find(t('pPr'))
    stile=None; lista=None; livello=0
    if pr is not None:
        ps=pr.find(t('pStyle'))
        if ps is not None: stile=ps.get(W+'val')
        num=pr.find(t('numPr'))
        if num is not None:
            lista='num'
            il=num.find(t('ilvl'))
            if il is not None: livello=int(il.get(W+'val') or 0)
    pezzi=[]
    for r in p.findall(t('r')):
        txt=testo_run(r)
        if txt: pezzi.append({'t':txt,'s':sorted(stile_run(r))})
    testo=''.join(x['t'] for x in pezzi)
    return {'stile':stile,'lista':lista,'liv':livello,'pezzi':pezzi,'testo':testo}

def tabella(tb):
    righe=[]
    for tr in tb.findall(t('tr')):
        celle=[]
        for tc in tr.findall(t('tc')):
            ps=[paragrafo(p) for p in tc.findall(t('p'))]
            celle.append(ps)
        righe.append(celle)
    return righe


z = zipfile.ZipFile(DOCX)
root = ET.fromstring(z.read('word/document.xml'))
body = root.find(t('body'))
b = []
for el in body:
    if el.tag == t('p'):
        pr = paragrafo(el)
        if pr['testo'].strip() or pr['stile']: b.append({'tipo': 'p', **pr})
    elif el.tag == t('tbl'):
        b.append({'tipo': 'tbl', 'righe': tabella(el)})



RE_CAP = re.compile(r'^Capitolo\s+(\d+)\s*[·\-–]\s*(.+)$')
RE_SEZ = re.compile(r'^(\d+)\.(\d+)\s*[·\-–]\s*(.+)$')

def esc(s): return html.escape(s, quote=False)

def run_html(pezzi):
    out = []
    for p in pezzi:
        t = esc(p['t']).replace('\n', '<br>')
        s = set(p.get('s') or [])
        if 'b' in s: t = '<b>' + t + '</b>'
        if 'i' in s: t = '<i>' + t + '</i>'
        if 'u' in s: t = '<u>' + t + '</u>'
        out.append(t)
    return ''.join(out).strip()

def e_voce(x):
    """Riga che fa parte di un elenco: corta, senza punto finale."""
    if x['tipo'] != 'p' or x.get('stile') or x.get('lista'): return False
    t = x['testo'].strip()
    return 0 < len(t) <= 72 and not t.endswith(('.', ':', '?', '!', '”'))

def tabella_html(righe):
    if not righe: return ''
    def cella(c): return ' '.join(run_html(p['pezzi']) for p in c if p['pezzi']).strip()
    testa = [cella(c) for c in righe[0]]
    corpo = righe[1:]
    intestata = all(t and len(t) < 40 for t in testa) and len(corpo) > 0
    out = ['<div class="man-tab-wrap"><table class="man-tab">']
    if intestata:
        out.append('<thead><tr>' + ''.join('<th>' + t + '</th>' for t in testa) + '</tr></thead>')
    else:
        corpo = righe
    out.append('<tbody>')
    for r in corpo:
        out.append('<tr>' + ''.join('<td>' + cella(c) + '</td>' for c in r) + '</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)

corpo, indice = [], []
cap_n = 0
aperto = False
i = 0
while i < len(b):
    x = b[i]
    if x['tipo'] == 'tbl':
        corpo.append(tabella_html(x['righe'])); i += 1; continue

    t = x['testo'].strip()
    stile = x.get('stile')

    m = RE_CAP.match(t) if stile == 'Heading1' else None
    if m:
        if aperto: corpo.append('</div></section>')
        cap_n = int(m.group(1))
        idc = 'cap-%d' % cap_n
        indice.append({'liv': 1, 'id': idc, 'n': m.group(1), 'testo': m.group(2)})
        corpo.append(
            '<section class="man-cap" id="%s" data-cap="%s">'
            '<header class="man-cap-h"><span class="man-cap-n">Capitolo %s \u00b7</span> '
            '<h1>%s</h1></header><div class="man-cap-corpo">' % (idc, m.group(1), m.group(1), esc(m.group(2))))
        aperto = True; i += 1; continue

    m = RE_SEZ.match(t) if stile in ('Heading1', 'Heading2') else None
    if m:
        ids = 'sez-%s-%s' % (m.group(1), m.group(2))
        indice.append({'liv': 2, 'id': ids, 'n': '%s.%s' % (m.group(1), m.group(2)), 'testo': m.group(3)})
        corpo.append('<h2 id="%s" class="man-sez"><span class="man-sez-n">%s.%s ·</span> %s</h2>'
                     % (ids, m.group(1), m.group(2), esc(m.group(3))))
        i += 1; continue

    if stile in ('Heading1', 'Heading2'):
        corpo.append('<h3 class="man-sub">%s</h3>' % run_html(x['pezzi'])); i += 1; continue
    if stile == 'Heading3':
        corpo.append('<h4 class="man-lab">%s</h4>' % run_html(x['pezzi'])); i += 1; continue

    if x.get('lista'):
        voci = []
        while i < len(b) and b[i]['tipo'] == 'p' and b[i].get('lista'):
            voci.append('<li>' + run_html(b[i]['pezzi']) + '</li>'); i += 1
        corpo.append('<ul class="man-punti">' + ''.join(voci) + '</ul>'); continue

    if e_voce(x):
        gruppo = []
        while i < len(b) and e_voce(b[i]):
            gruppo.append(b[i]); i += 1
        if len(gruppo) == 1:
            corpo.append('<p>' + run_html(gruppo[0]['pezzi']) + '</p>')
        elif all('→' in g['testo'] for g in gruppo):
            righe = []
            for g in gruppo:
                a, _, c = g['testo'].partition('→')
                righe.append('<div class="man-riga"><span>%s</span> <i class="man-freccia">\u2192</i> <b>%s</b></div>'
                             % (esc(a.strip()), esc(c.strip())))
            corpo.append('<div class="man-mappa">' + ''.join(righe) + '</div>')
        else:
            corpo.append('<ul class="man-elenco">' + ''.join('<li>' + run_html(g['pezzi']) + '</li>' for g in gruppo) + '</ul>')
        continue

    if x['pezzi']:
        corpo.append('<p>' + run_html(x['pezzi']) + '</p>')
    i += 1

if aperto: corpo.append('</div></section>')

corpo_html = '\n'.join(corpo)

print('capitoli:', sum(1 for v in indice if v['liv'] == 1), '· sezioni:', sum(1 for v in indice if v['liv'] == 2))

corpo = corpo_html

# nei titoli il grassetto è ridondante
corpo = re.sub(r'(<h[34][^>]*>)<b>(.*?)</b>(</h[34]>)', r'\1\2\3', corpo)


# --- indice di navigazione ---
nav, somm = [], []
i = 0
while i < len(indice):
    v = indice[i]
    if v['liv'] != 1:
        i += 1; continue
    sezioni = []
    j = i + 1
    while j < len(indice) and indice[j]['liv'] == 2:
        sezioni.append(indice[j]); j += 1
    nav.append('<li class="man-i-cap"><a href="#%s" data-id="%s"><span class="n">%s</span>%s</a>' %
               (v['id'], v['id'], v['n'], html.escape(v['testo'])))
    somm.append('<li class="s-cap">%s · %s</li>' % (v['n'], html.escape(v['testo'])))
    if sezioni:
        nav.append('<ol class="man-i-sez">' + ''.join(
            '<li><a href="#%s" data-id="%s">%s · %s</a></li>' % (s['id'], s['id'], s['n'], html.escape(s['testo']))
            for s in sezioni) + '</ol>')
        somm += ['<li class="s-sez"><b>%s</b>%s</li>' % (s['n'], html.escape(s['testo'])) for s in sezioni]
    nav.append('</li>')
    i = j

# --- il gate del Manuale bloccato, ripreso dalla pagina precedente ---
vecchia = open(os.path.join(REPO, 'manuale/index.html'), encoding='utf8').read()
gate = vecchia[vecchia.index('<div id="manlock" hidden>'):vecchia.index('</div>\n</div>', vecchia.index('<div id="manlock" hidden>')) + len('</div>\n</div>')]
stile_gate = ''
m = re.search(r'(#manlock\{.*?)\n/\*', vecchia, re.S)

PAGINA = '''<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manuale · Grand Line Chronicles</title>
<meta name="description" content="Il manuale completo di Grand Line Chronicles: creazione del pirata, combattimento, Tecniche, Haki, Frutti del Diavolo, nave, officina e avanzamento.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/glc-theme.css">
<link rel="stylesheet" href="manuale.css?v=2">
<style>
/* Il gate del Manuale bloccato resta com'era. */
#manlock[hidden]{display:none !important;}
#manlock{position:fixed;inset:0;z-index:99998;display:grid;place-items:center;padding:24px;background:radial-gradient(120% 90% at 50% -10%,#14323d 0%,#0a1920 55%,#060f14 100%);}
body.manlocked{overflow:hidden;}
body.manlocked .man-top,body.manlocked .man-wrap{filter:blur(6px);pointer-events:none;}
#manlock .mlbox{width:min(520px,100%);text-align:center;background:linear-gradient(168deg,#15121a,#1a1622);border:1px solid rgba(240,164,65,.3);border-radius:16px;padding:34px 30px;box-shadow:0 30px 70px rgba(0,0,0,.6);font-family:'Manrope',sans-serif;}
#manlock .mlico{color:#f0a441;margin-bottom:6px;}
#manlock .mlk{font:600 10px 'Manrope',sans-serif;letter-spacing:.22em;text-transform:uppercase;color:rgba(241,236,224,.6);}
#manlock h2{font-family:'Barlow Condensed',sans-serif;font-size:30px;text-transform:uppercase;letter-spacing:.04em;margin:8px 0 12px;color:#f1ece0;}
#manlock p{font-family:'Cormorant Garamond',serif;font-size:17px;color:rgba(241,236,224,.8);margin:0 0 10px;}
#manlock .mlrow{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:18px;}
#manlock .mlb{font:600 11px 'Manrope',sans-serif;letter-spacing:.1em;text-transform:uppercase;border:1px solid rgba(240,164,65,.4);background:transparent;color:#ffd394;border-radius:999px;padding:10px 16px;cursor:pointer;text-decoration:none;}
#manlock .mlb.gold{background:linear-gradient(180deg,#ffd394,#f0a441);color:#1b1206;border-color:transparent;}
</style>
</head>
<body>
<div class="glc-bg" aria-hidden="true"></div>
GATE

<header class="man-top">
  <a class="man-marchio" href="/"><span class="anc">⚓</span><span>Grand Line Chronicles</span></a>
  <div class="man-strumenti">
    <button class="man-btn solo-telefono" id="man-apri-indice" type="button" aria-expanded="false">☰ Indice</button>
    <button class="man-btn" id="man-stampa" type="button">⎙ Stampa · PDF</button>
    <a class="man-btn" href="/">‹ Torna al porto</a>
  </div>
</header>

<div class="man-velo" id="man-velo" hidden></div>

<div class="man-wrap">
  <nav class="man-indice" id="man-indice" aria-label="Indice del manuale">
    <h2>Indice</h2>
    <input class="man-cerca" id="man-cerca" type="search" placeholder="Cerca un capitolo o una sezione" aria-label="Cerca nell'indice" autocomplete="off">
    <ol id="man-nav">
NAV
    </ol>
    <p class="man-vuoto" id="man-nessuno" hidden>Nessuna voce con questo nome.</p>
  </nav>

  <main class="man-testo">
    <div class="man-frontespizio">
      <p class="occhiello">Grand Line Chronicles</p>
      <h1>Manuale<br>del gioco</h1>
      <p class="sotto">Edizione 2.0 · dalla creazione del pirata alla rotta della ciurma.</p>
    </div>

    <nav class="man-somm" aria-label="Sommario">
      <h2>Sommario</h2>
      <ol>
SOMM
      </ol>
    </nav>

CORPO
  </main>
</div>

<script>
/* Indice: evidenzia dove sei, filtra per nome, e su telefono si apre a lato.
   Nessuna regola di gioco qui dentro: solo lettura. */
(function(){
 "use strict";
 var indice=document.getElementById("man-indice");
 var velo=document.getElementById("man-velo");
 var apri=document.getElementById("man-apri-indice");
 var cerca=document.getElementById("man-cerca");
 var nav=document.getElementById("man-nav");
 var nessuno=document.getElementById("man-nessuno");
 var voci=[].slice.call(nav.querySelectorAll("a[data-id]"));
 var perId={};voci.forEach(function(a){perId[a.dataset.id]=a;});

 function chiudiPannello(){document.body.classList.remove("man-indice-aperto");if(apri)apri.setAttribute("aria-expanded","false");if(velo)velo.hidden=true;}
 if(apri)apri.onclick=function(){
  var aperto=document.body.classList.toggle("man-indice-aperto");
  apri.setAttribute("aria-expanded",String(aperto));
  if(velo)velo.hidden=!aperto;
 };
 if(velo)velo.onclick=chiudiPannello;
 nav.addEventListener("click",function(e){ if(e.target.closest("a")) chiudiPannello(); });
 document.addEventListener("keydown",function(e){ if(e.key==="Escape") chiudiPannello(); });

 /* dove sono: si illumina l'ultima intestazione superata */
 var bersagli=[].slice.call(document.querySelectorAll(".man-cap[id], h2.man-sez[id]"));
 var attiva=null;
 function segna(){
  var y=window.scrollY+120, scelto=null;
  for(var i=0;i<bersagli.length;i++){ if(bersagli[i].offsetTop<=y) scelto=bersagli[i]; else break; }
  var a=scelto?perId[scelto.id]:null;
  if(a===attiva) return;
  if(attiva)attiva.classList.remove("qui");
  attiva=a;
  if(a){a.classList.add("qui");
   var cap=a.closest(".man-i-cap");
   if(cap&&indice.scrollHeight>indice.clientHeight){
    var r=a.getBoundingClientRect(), ri=indice.getBoundingClientRect();
    if(r.top<ri.top+40||r.bottom>ri.bottom-40) indice.scrollTop+=r.top-ri.top-100;
   }
  }
 }
 var atteso=false;
 window.addEventListener("scroll",function(){
  if(atteso)return; atteso=true;
  requestAnimationFrame(function(){atteso=false;segna();});
 },{passive:true});
 segna();

 /* filtro dell'indice */
 if(cerca) cerca.addEventListener("input",function(){
  var q=cerca.value.trim().toLowerCase();
  var visibili=0;
  nav.querySelectorAll(".man-i-cap").forEach(function(cap){
   var titolo=cap.querySelector("a").textContent.toLowerCase();
   var sezioni=[].slice.call(cap.querySelectorAll(".man-i-sez li"));
   var capOk=!q||titolo.indexOf(q)>=0;
   var qualcuna=false;
   sezioni.forEach(function(li){
    var ok=capOk||!q||li.textContent.toLowerCase().indexOf(q)>=0;
    li.hidden=!ok; if(ok)qualcuna=true;
   });
   var mostra=capOk||qualcuna;
   cap.hidden=!mostra; if(mostra)visibili++;
  });
  if(nessuno)nessuno.hidden=visibili>0;
 });

 var stampa=document.getElementById("man-stampa");
 if(stampa)stampa.onclick=function(){window.print();};
})();
</script>

<script>
/* Manuale bloccato: gate mostrato finché la revisione delle regole non è approvata.
   Il GM può aprirlo comunque; la scelta resta in questa scheda del browser. */
(function(){
 var MAN_LOCKED=BLOCCATO, K="glc_manuale_sbloccato";
 var box=document.getElementById("manlock");
 if(!MAN_LOCKED||!box)return;
 var open=false;try{open=sessionStorage.getItem(K)==="1";}catch(e){}
 if(location.search.indexOf("sbloccato")>=0){open=true;try{sessionStorage.setItem(K,"1");}catch(e){}}
 if(open)return;
 box.hidden=false;document.body.classList.add("manlocked");
 var b=document.getElementById("mlgm");
 if(b)b.onclick=function(){try{sessionStorage.setItem(K,"1");}catch(e){}box.hidden=true;document.body.classList.remove("manlocked");};
})();
</script>
</body>
</html>
'''

pagina = (PAGINA
          .replace('GATE', gate)
          .replace('NAV', '\n'.join(nav))
          .replace('SOMM', '\n'.join(somm))
          .replace('CORPO', corpo)
          .replace('BLOCCATO', 'false'))
open(os.path.join(REPO, 'manuale/index.html'), 'w', encoding='utf8').write(pagina)
print('scritta la pagina:', len(pagina), 'caratteri')


# --- controllo: il testo deve essere rimasto identico ---
def norm(s):
    s = unicodedata.normalize('NFC', s).replace('\u00a0', ' ')
    return re.sub(r'\s+', ' ', s).strip()
doc = []
for x in b:
    if x['tipo'] == 'p':
        if x['testo'].strip(): doc.append(x['testo'])
    else:
        for r in x['righe']:
            for c in r: doc.append(' '.join(p['testo'] for p in c))
docT = norm(' '.join(doc))
letto = open(os.path.join(REPO, 'manuale/index.html'), encoding='utf8').read()
dentro = letto[letto.index('<main class="man-testo">'):letto.index('</main>')]
dentro = dentro[dentro.index('</nav>') + 6:]
dentro = re.sub(r'<br\s*/?>', ' ', dentro)
dentro = re.sub(r'</?(b|i|u|span)[^>]*>', '', dentro)
pagT = norm(html.unescape(re.sub(r'<[^>]+>', ' ', dentro)))
print('testo identico al documento:', docT == pagT, '·', len(docT), 'caratteri')
