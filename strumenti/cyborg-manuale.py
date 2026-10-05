#!/usr/bin/env python3
"""Costruisce il Manuale del Cyborg riusando l'interfaccia del manuale base.

Il manuale base non viene toccato: da lui si prendono soltanto il guscio della
pagina (testata, indice, sommario di stampa, foglio) e lo script del lettore,
esattamente come fa il Manuale del Prestigio.

Le fonti del documento stanno in regole/cyborg-fonti.json: una volta estratte,
la pagina si rigenera anche senza il .docx. Con un percorso sulla riga di
comando il .docx viene riletto e il file delle fonti aggiornato.

    python3 strumenti/cyborg-manuale.py                  # rigenera dalle fonti
    python3 strumenti/cyborg-manuale.py /percorso/al.docx  # rilegge il documento
"""
import sys, os, re, json, html, zipfile, ast, unicodedata
from xml.etree import ElementTree as ET
from html.parser import HTMLParser

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTI = os.path.join(RADICE, 'regole/cyborg-fonti.json')
USCITA = os.path.join(RADICE, 'manuale-cyborg')
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


# ---------------------------------------------------------------- il documento
def leggi_docx(percorso):
    """Ogni paragrafo e ogni tabella diventano un blocco, nell'ordine del file."""
    radice = ET.fromstring(zipfile.ZipFile(percorso).read('word/document.xml'))
    corpo = radice.find(W + 'body')
    def testo(nodo): return ''.join(t.text or '' for t in nodo.iter(W + 't'))
    blocchi = []
    for el in corpo:
        tag = el.tag.replace(W, '')
        if tag == 'p':
            pr = el.find(W + 'pPr/' + W + 'pStyle')
            stile = pr.get(W + 'val') if pr is not None else 'Normal'
            t = ' '.join(testo(el).split())
            if t:
                blocchi.append({'type': 'p', 'style': stile, 'text': t})
        elif tag == 'tbl':
            righe = [[' '.join(testo(c).split()) for c in r.findall(W + 'tc')]
                     for r in el.findall(W + 'tr')]
            if righe:
                blocchi.append({'type': 'table', 'rows': righe})
    return blocchi


if len(sys.argv) > 1:
    blocchi = leggi_docx(os.path.expanduser(sys.argv[1]))
    json.dump(blocchi, open(FONTI, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('fonti aggiornate dal documento:', len(blocchi), 'blocchi')
blocchi = json.load(open(FONTI, encoding='utf8'))


# ------------------------------------------- le revisioni arrivate dopo il .docx
# Le fonti restano lo specchio del documento; le modifiche editoriali stanno in
# regole/cyborg-revisioni.json. Ogni voce dice dove agisce (indice del blocco
# nelle fonti) e controlla di trovare il testo che si aspetta: se il .docx viene
# riletto e gli indici si spostano, il generatore si ferma invece di sbagliare.
REVISIONI = os.path.join(RADICE, 'regole/cyborg-revisioni.json')
revisioni = json.load(open(REVISIONI, encoding='utf8')) if os.path.exists(REVISIONI) else []
for e in revisioni:
    if 'togli_riga' in e:
        t = blocchi[e['blocco']]
        assert t['type'] == 'table', e
        prima = len(t['rows'])
        t['rows'] = [r for r in t['rows'] if r[0] != e['togli_riga']]
        assert len(t['rows']) == prima - 1, e
    elif 'da' in e:
        t = blocchi[e['blocco']]
        assert e['da'] in t['text'], e
        t['text'] = t['text'].replace(e['da'], e['a'])
for e in sorted([e for e in revisioni if 'sostituisci' in e], key=lambda e: -e['sostituisci'][0]):
    a, b = e['sostituisci']
    assert blocchi[a]['text'].startswith(e['inizia_con']), (e['inizia_con'], blocchi[a]['text'][:60])
    blocchi[a:b] = [{'type': 'p', 'style': x.get('style', 'Normal'), 'text': x['text']} for x in e['con']]


# ------------------------------------------------- il guscio del manuale base
base = open(os.path.join(RADICE, 'strumenti/manuale-da-docx.py'), encoding='utf8').read()
modello = next(ast.literal_eval(n.value) for n in ast.parse(base).body
               if isinstance(n, ast.Assign)
               and any(isinstance(t, ast.Name) and t.id == 'PAGINA' for t in n.targets))
inizio = modello.index('<header class="man-top">')
fine = modello.index('\n<script>', inizio)
guscio = modello[inizio:fine]
lettore = modello[modello.index('<script>', fine) + len('<script>'):modello.index('</script>', fine)].strip()
assert 'var indice=document.getElementById("man-indice")' in lettore
assert '<main class="man-foglio"' in guscio


# ------------------------------------------------------------------ rendering
esc = html.escape
RE_CAP = re.compile(r'^(\d+)\s*[·\-–]\s*(.+)$')
RE_SEZ = re.compile(r'^(\d+\.\d+)\s*[·\-–]\s*(.+)$')
RE_SUB = re.compile(r'^(\d+\.\d+\.\d+)\s*[·\-–]\s*(.+)$')

def ancora(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')

def provenienza(i): return ' data-cyborg-source="%d"' % i

def tabella_html(righe, i):
    testa, corpo = righe[0], righe[1:]
    out = ['<div class="man-tab-wrap" tabindex="0" role="region" aria-label="Tabella delle regole"%s>'
           '<table class="man-tab"><thead><tr>' % provenienza(i)]
    out += ['<th scope="col"><b>%s</b></th>' % esc(c) for c in testa]
    out.append('</tr></thead><tbody>')
    for r in corpo:
        out.append('<tr>' + ''.join('<td>%s</td>' % esc(c) for c in r) + '</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)


corpo_html, indice, sommario = [], [], []
ancore = set()
cap_n = 0
aperto = False
i = 0
while i < len(blocchi):
    b = blocchi[i]
    if b['type'] == 'table':
        corpo_html.append(tabella_html(b['rows'], i)); i += 1; continue

    stile, t = b['style'], b['text']

    if stile in ('Title', 'Subtitle'):
        i += 1; continue

    if stile == 'Heading1':
        m = RE_CAP.match(t)
        cap_n = int(m.group(1)) if m else cap_n + 1
        titolo = m.group(2) if m else t
        if aperto:
            corpo_html.append('</div></section>')
        idc = 'cap-%d' % cap_n
        indice.append({'liv': 1, 'id': idc, 'n': str(cap_n), 'testo': titolo})
        sommario.append(('cap', cap_n, str(cap_n), titolo))
        corpo_html.append(
            '<section class="man-cap" id="%s" data-cap="%d"><header class="man-cap-h">'
            '<span class="man-cap-n">Capitolo %d ·</span> <h1%s>%s</h1></header>'
            '<div class="man-cap-corpo">' % (idc, cap_n, cap_n, provenienza(i), esc(titolo)))
        aperto = True; i += 1; continue

    if stile == 'Heading2':
        m = RE_SEZ.match(t)
        numero, titolo = (m.group(1), m.group(2)) if m else ('', t)
        ids = 'sez-' + (numero.replace('.', '-') if numero else ancora(titolo))
        indice.append({'liv': 2, 'id': ids, 'n': numero, 'testo': titolo})
        sommario.append(('sez', cap_n, numero, titolo))
        n_html = '<span class="man-sez-n">%s ·</span> ' % esc(numero) if numero else ''
        corpo_html.append('<h2 id="%s" class="man-sez">%s<span%s>%s</span></h2>'
                          % (ids, n_html, provenienza(i), esc(titolo)))
        i += 1; continue

    if stile == 'Heading3':
        m = RE_SUB.match(t)
        etichetta = ('%s · %s' % (m.group(1), m.group(2))) if m else t
        a = ancora(etichetta)
        if a in ancore:
            a += '-%d' % i
        ancore.add(a)
        corpo_html.append('<h3 class="man-sub" id="%s"%s>%s</h3>' % (a, provenienza(i), esc(etichetta)))
        i += 1; continue

    if stile == 'Regola':
        corpo_html.append('<p class="man-regola"%s>%s</p>' % (provenienza(i), esc(t)))
        i += 1; continue

    if stile in ('ListBullet', 'ListNumber'):
        tag, cls = ('ul', 'man-punti') if stile == 'ListBullet' else ('ol', 'man-passi')
        voci = []
        while i < len(blocchi) and blocchi[i].get('style') == stile:
            voci.append('<li%s>%s</li>' % (provenienza(i), esc(blocchi[i]['text']))); i += 1
        corpo_html.append('<%s class="%s">%s</%s>' % (tag, cls, ''.join(voci), tag))
        continue

    corpo_html.append('<p class="man-guida"%s>%s</p>' % (provenienza(i), esc(t)))
    i += 1

if aperto:
    corpo_html.append('</div></section>')


# ------------------------------------------------------- indice e sommario
nav = []
for v in indice:
    if v['liv'] == 1:
        nav.append('<li class="man-i-cap"><a href="#%s" data-id="%s"><span class="n">%s</span>%s</a>'
                   '<ol class="man-i-sez">' % (v['id'], v['id'], v['n'], esc(v['testo'])))
        nav.append('__CHIUDI__')
    else:
        nav.insert(len(nav) - 1, '<li><a href="#%s" data-id="%s">%s%s</a></li>'
                   % (v['id'], v['id'], (v['n'] + ' · ') if v['n'] else '', esc(v['testo'])))
nav = '\n'.join(x if x != '__CHIUDI__' else '</ol></li>' for x in nav)

somm = []
for tipo, cap, numero, testo in sommario:
    if tipo == 'cap':
        somm.append('<li class="s-cap">%s · %s</li>' % (numero, esc(testo)))
    else:
        somm.append('<li class="s-sez"><b>%s</b>%s</li>' % (esc(numero), esc(testo)))


# -------------------------------------------------------------- la pagina
pagina = guscio.replace('\nNAV\n', '\n' + nav + '\n') \
               .replace('\nSOMM\n', '\n' + '\n'.join(somm) + '\n') \
               .replace('\nCORPO\n', '\n' + '\n'.join(corpo_html) + '\n')
pagina = pagina.replace('Manuale<br>del gioco', 'Manuale<br>del Cyborg') \
               .replace('Edizione 2.0 · dalla creazione del pirata alla rotta della ciurma.',
                        'Linee guida ufficiali · Corpo Meccanico, Moduli, Fasce Tecnologiche e build.')

testa = modello[:modello.index('<style>')]
testa = testa.replace('<title>Manuale · Grand Line Chronicles</title>',
                      '<title>Manuale del Cyborg · Grand Line Chronicles</title>')
testa = re.sub(r'<meta name="description"[^>]+>',
               '<meta name="description" content="Il manuale del Cyborg: Corpo Meccanico, Moduli, '
               'Fasce Tecnologiche, Cariche e guida alle build.">', testa)
testa = testa.replace('href="manuale.css?', 'href="/manuale/manuale.css?')
testa += ('<link rel="stylesheet" href="cyborg.css?v=1">\n'
          '<script src="reader.js?v=1" defer></script>\n</head>\n'
          '<body class="manuale-cyborg">\n<div class="glc-bg" aria-hidden="true"></div>\n')
uscita = testa + pagina + '\n</body>\n</html>\n'


# ------------------------------------------- controllo: il testo deve esserci tutto
class Testi(HTMLParser):
    def __init__(self):
        super().__init__(); self.liv = 0; self.attivo = None; self.testi = {}
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('br', 'img', 'input', 'link', 'meta', 'hr', 'source', 'wbr'):
            if self.attivo: self.testi[self.attivo[0]].append(' ')
            return
        self.liv += 1
        if 'data-cyborg-source' in a:
            chiave = a['data-cyborg-source']
            assert chiave not in self.testi, chiave
            self.attivo = (chiave, self.liv); self.testi[chiave] = []
    def handle_endtag(self, tag):
        if self.attivo:
            if self.liv == self.attivo[1]: self.attivo = None
            else: self.testi[self.attivo[0]].append(' ')
        self.liv -= 1
    def handle_data(self, t):
        if self.attivo: self.testi[self.attivo[0]].append(t)

def norm(s): return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', s)).strip()

letti = Testi(); letti.feed(uscita)
attesi = {str(k) for k, b in enumerate(blocchi) if b.get('style') not in ('Title', 'Subtitle')}
assert set(letti.testi) == attesi, (attesi - set(letti.testi), set(letti.testi) - attesi)
for k in attesi:
    b = blocchi[int(k)]
    originale = b['text'] if b['type'] == 'p' else ' '.join(c for r in b['rows'] for c in r)
    atteso = norm(originale)
    if b['type'] == 'p' and b['style'] == 'Heading1':
        m = RE_CAP.match(originale)
        atteso = norm(m.group(2)) if m else atteso
    elif b['type'] == 'p' and b['style'] == 'Heading2':
        m = RE_SEZ.match(originale)
        atteso = norm(m.group(2)) if m else atteso
    assert norm(''.join(letti.testi[k])) == atteso, 'testo diverso nel blocco %s: %r' % (k, originale[:70])

os.makedirs(USCITA, exist_ok=True)
open(os.path.join(USCITA, 'index.html'), 'w', encoding='utf8').write(uscita)
open(os.path.join(USCITA, 'reader.js'), 'w', encoding='utf8').write(
    '/* Generato dall\'interfaccia del manuale base da strumenti/cyborg-manuale.py. */\n' + lettore + '\n')
print('Manuale del Cyborg: %d capitoli, %d sezioni, %d blocchi. Testo integrale del documento: True. UI: manuale base.'
      % (sum(1 for v in indice if v['liv'] == 1), sum(1 for v in indice if v['liv'] == 2), len(blocchi)))
