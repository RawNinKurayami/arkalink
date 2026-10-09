#!/usr/bin/env python3
"""Costruisce il Manuale dei Frutti del Diavolo (Biblioteca · Volume 04).

Come il Manuale del Cyborg, riusa l'interfaccia del manuale base (testata,
indice, sommario di stampa, lettore) senza toccarlo.

Il testo viene da due fonti:
  1. il documento «GLC Manuale dei Frutti del Diavolo» (regole/frutti-fonti.json),
     che è il riferimento per Talenti, Tratti, Firme, Scheda di Identità e linee
     guida di Forma di Combattimento e Risveglio;
  2. il capitolo 9 del manuale base, da cui si importano soltanto le parti che il
     documento non contiene: le regole generali (9 · introduzione, 9.1–9.6),
     introduzione, Tratto e Firma di Paramecia e Logia. Si leggono ogni volta da
     manuale/index.html, così restano allineate al base.

Il documento usa i titoli in modo irregolare (Heading1 anche per i sottotitoli):
la struttura a capitoli e sezioni è stabilita qui sotto, in STRUTTURA.

    python3 strumenti/frutti-manuale.py                  # rigenera dalle fonti
    python3 strumenti/frutti-manuale.py /percorso/al.docx  # rilegge il documento
"""
import argparse, sys, os, re, json, html, zipfile, ast, unicodedata
from xml.etree import ElementTree as ET
from html.parser import HTMLParser

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTI = os.path.join(RADICE, 'regole/frutti-fonti.json')
REVISIONI = os.path.join(RADICE, 'regole/frutti-revisioni.json')
USCITA = os.path.join(RADICE, 'manuale-frutti')
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


# ---------------------------------------------------------------- il documento
def leggi_docx(percorso):
    """Paragrafi e tabelle nell'ordine del file; gli a capo interni restano «\\n»."""
    radice = ET.fromstring(zipfile.ZipFile(percorso).read('word/document.xml'))
    blocchi = []
    for el in radice.find(W + 'body'):
        tag = el.tag.replace(W, '')
        if tag == 'p':
            pr = el.find(W + 'pPr/' + W + 'pStyle')
            stile = pr.get(W + 'val') if pr is not None else 'Normal'
            pezzi = []
            for x in el.iter():
                if x.tag == W + 't': pezzi.append(x.text or '')
                elif x.tag == W + 'br': pezzi.append('\n')
                elif x.tag == W + 'tab': pezzi.append(' ')
            righe = [' '.join(r.split()) for r in ''.join(pezzi).split('\n')]
            righe = [r for r in righe if r]
            if righe:
                b = {'type': 'p', 'style': stile, 'text': '\n'.join(righe)}
                if el.find(W + 'pPr/' + W + 'numPr') is not None:
                    b['lista'] = True
                blocchi.append(b)
        elif tag == 'tbl':
            righe = [[' '.join(''.join(t.text or '' for t in c.iter(W + 't')).split()) for c in r.findall(W + 'tc')]
                     for r in el.findall(W + 'tr')]
            if righe:
                blocchi.append({'type': 'table', 'rows': righe})
    return blocchi

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('docx', nargs='?')
parser.add_argument('--manual-only', action='store_true', help='Preserve the reader asset.')
parser.add_argument('--check', action='store_true', help='Verify generated output without writing.')
args = parser.parse_args()
if args.docx:
    assert not args.check, '--check cannot replace the source document'
    blocchi = leggi_docx(os.path.expanduser(args.docx))
    json.dump(blocchi, open(FONTI, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print('fonti aggiornate dal documento:', len(blocchi), 'blocchi')
blocchi = json.load(open(FONTI, encoding='utf8'))

# Revisioni editoriali arrivate dopo il documento: {blocco, da, a, perche}.
revisioni = json.load(open(REVISIONI, encoding='utf8')) if os.path.exists(REVISIONI) else []
esclusi = set()
for e in revisioni:
    if 'escludi_blocchi' in e:
        start, end = e['escludi_blocchi']
        assert 0 <= start < end <= len(blocchi), e
        assert blocchi[start].get('text') == e['inizio'], e
        assert blocchi[end - 1].get('text') == e['fine'], e
        esclusi.update(range(start, end))
        continue
    t = blocchi[e['blocco']]
    if t['type'] == 'table':
        assert any(e['da'] in c for r in t['rows'] for c in r), e
        t['rows'] = [[c.replace(e['da'], e['a']) for c in r] for r in t['rows']]
    else:
        assert e['da'] in t['text'], e
        t['text'] = t['text'].replace(e['da'], e['a'])


# ------------------------------------------------------------ il manuale base
BASE = open(os.path.join(RADICE, 'manuale/index.html'), encoding='utf8').read()
NOTA_BASE = re.compile(r'<p class="man-guida">(<b>Manuale dei Frutti del Diavolo\.</b>|Ogni Talento del Frutto è spiegato)[^\n]*</p>\n?')

def base_sezione(num):
    """Il corpo di una sezione N.M del base, senza il titolo h2."""
    a = BASE.index('<h2 id="sez-%s"' % num.replace('.', '-'))
    a = BASE.index('</h2>', a) + 5
    b = BASE.index('<h2', a)
    corpo = NOTA_BASE.sub('', BASE[a:b]).strip()
    return re.sub(r'(<h4 class="man-lab">)9\.(\d)', r'\g<1>%s.\2' % '1', corpo)

def base_blocco(titolo_h4, fine_h4):
    """Da un titoletto h4 del base (escluso) al successivo indicato (escluso)."""
    a = BASE.index('<h4 class="man-lab">%s</h4>' % titolo_h4)
    a += len('<h4 class="man-lab">%s</h4>' % titolo_h4)
    b = BASE.index('<h4 class="man-lab">%s' % fine_h4, a)
    return BASE[a:b].strip()

def base_intro(sez, fino_h4):
    """L'introduzione di Paramecia o Logia: il sottotitolo h4 e i paragrafi, senza l'h3 ripetuto."""
    a = BASE.index('<h2 id="sez-%s"' % sez.replace('.', '-'))
    a = BASE.index('</h3>', a) + 5
    b = BASE.index('<h4 class="man-lab">%s' % fino_h4, a)
    return BASE[a:b].strip()

cap9 = BASE.index('<section class="man-cap" id="cap-9"')
_a = BASE.index('<div class="man-cap-corpo">', cap9) + len('<div class="man-cap-corpo">')
INTRO_CAP = NOTA_BASE.sub('', BASE[_a:BASE.index('<h2 id="sez-9-1"', _a)]).strip()
IMPORTI = {
    'generali': [('Ottenere un Frutto del Diavolo', base_sezione('9.1')),
                 ('I tre tipi di Frutto', base_sezione('9.2')),
                 ('Le tre debolezze', base_sezione('9.3')),
                 ('Il Dado del Frutto', base_sezione('9.4')),
                 ('Costruire le Tecniche del Frutto', base_sezione('9.5')),
                 ('I Talenti del Frutto', base_sezione('9.6'))],
    'paramecia': (base_intro('9.7', '9.7.1'),
                  [('Tratto · Il Potere Unico', base_blocco('9.7.1 · Tratto: Il Potere Unico', '9.7.2')),
                   ('Firma · L’impronta del potere', base_blocco("9.7.2 · Firma: L'impronta del potere", '9.7.3'))]),
    'logia': (base_intro('9.8', '9.8.1'),
              [('Tratto · L’Elemento', base_blocco("9.8.1 · Tratto: L'Elemento", '9.8.2')),
               ('Firma · L’elemento dilaga', base_blocco("9.8.2 · Firma: L'elemento dilaga", '9.8.3'))]),
}


# ------------------------------------------------------------- la struttura
# Ogni titolo del documento riceve un livello: cap (capitolo), sez (sezione
# numerata), sub (sottotitolo h3), tal (Talento, h3), lab (etichetta h4).
CAPITOLI = {
    '9.X · Definire un Frutto del Diavolo': ('Definire un Frutto del Diavolo', 'definire'),
    'Guida ai Talenti dei Frutti del Diavolo': ('Guida ai Talenti dei Frutti del Diavolo', 'guida'),
    'PARAMECIA': ('Paramecia', 'paramecia'),
    'Linea guida · Forma di Combattimento': ('Linea guida · Forma di Combattimento', 'forma'),
    'Linea guida · Risveglio Paramecia': ('Linea guida · Risveglio Paramecia', 'risveglio'),
    'LOGIA · Guida ai Talenti': ('Logia', 'logia'),
    'ZOAN': ('Zoan', 'zoan'),
}
FASCIA = re.compile(r'^d(4|8|12|20)\b')
ETICHETTE = {'Testo del Manuale', 'A cosa serve', 'Chiarimento definitivo', 'Chiarimento necessario', 'Compatibilità'}
TALENTI_ZOAN_H1 = {'Corsa Bestiale', 'Stazza', 'Ferocia Crescente', 'Retaggio Ancestrale', 'Retaggio Mitologico',
                   'Istinto di Sopravvivenza', 'Trasformazione Istintiva', 'Richiamo del Sangue'}
RISVEGLIO_ZOAN_H1 = {'Forma Definitiva', 'Rigenerazione Risvegliata', 'Armi Naturali Risvegliate', 'Istinto Assoluto',
                     'Caratteristica Dominante', 'Identità del Risveglio Zoan', 'Prezzo del Risveglio'}
SEZ_ZOAN = {'Scheda della Creatura', 'Anatomia e vantaggi meccanici', 'Tratto · Le Tre Forme', 'Firma · Il Colpo Travolge'}

def livello(stile, testo, capitolo, in_risveglio):
    if testo in CAPITOLI:
        return 'cap'
    if capitolo == 'definire':
        return 'sub' if testo in ('Limitazione strutturale', 'Contraccolpo naturale') else 'sez'
    if capitolo == 'paramecia':
        return 'sez' if FASCIA.match(testo) else 'tal'
    if capitolo == 'forma':
        return 'sub' if testo == 'Valutare il beneficio' else 'sez'
    if capitolo == 'risveglio':
        return 'sub' if stile == 'Heading2' else 'sez'
    if capitolo == 'logia':
        if FASCIA.match(testo): return 'sez'
        if stile == 'Heading3': return 'lab'
        if in_risveglio:
            return 'tal' if testo == 'Risveglio · Logia' else ('lab' if stile == 'Heading2' else 'sub')
        return 'tal'
    if capitolo == 'zoan':
        if FASCIA.match(testo) or testo in SEZ_ZOAN: return 'sez'
        if stile == 'Heading3' or testo == 'Economia delle trasformazioni': return 'lab'
        if in_risveglio and testo in RISVEGLIO_ZOAN_H1: return 'lab'
        if stile == 'Heading2' or testo in TALENTI_ZOAN_H1: return 'tal'
    raise SystemExit('titolo senza livello nel capitolo %s: %r' % (capitolo, testo))


# ------------------------------------------------------------------ rendering
esc = html.escape

def ancora(t):
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')

def src(i): return ' data-frutti-source="%d"' % i

def breve(riga):
    parole = riga.split()
    return 3 <= len(riga) <= 45 and len(parole) <= 6 and riga[-1] not in '.:;,!?' and not riga[0].islower()

def testo_html(t):
    """Un paragrafo del documento: righe spezzate, etichetta in grassetto, frecce."""
    righe = t.split('\n')
    if len(righe) > 1 and all('→' in r for r in righe):
        return None, ('<div class="man-mappa">' + ''.join(
            '<div class="man-riga"><span>%s</span> <i class="man-freccia">→</i> <b>%s</b></div>'
            % tuple(esc(x.strip()) for x in r.split('→', 1)) for r in righe) + '</div>')
    if len(righe) > 1 and breve(righe[0]):
        return '<b>%s</b><br>%s' % (esc(righe[0]), '<br>'.join(esc(r) for r in righe[1:])), None
    if len(righe) == 1 and breve(righe[0]):
        return '<b>%s</b>' % esc(righe[0]), None
    return '<br>'.join(esc(r) for r in righe), None

def tabella_html(righe, attr=''):
    out = ['<div class="man-tab-wrap" tabindex="0" role="region" aria-label="Tabella"%s>'
           '<table class="man-tab"><thead><tr>' % attr]
    out += ['<th scope="col"><b>%s</b></th>' % esc(c) for c in righe[0]]
    out.append('</tr></thead><tbody>')
    for r in righe[1:]:
        out.append('<tr>' + ''.join('<td>%s</td>' % esc(c) for c in r) + '</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)

def e_voce(b):
    return b['type'] == 'p' and b['style'] == 'Normal' and '\n' not in b['text'] and b['text'][-1:] in ';.'

capitoli = []          # {'titolo', 'chiave', 'corpo': [...], 'sezioni': [(id, n, titolo)]}
cap = None
sez_n = 0
in_risveglio = False
citazione = False
TITOLI_ATTESI = {}     # blocco -> testo atteso nel controllo (titoli riscritti)

def apri_cap(titolo, chiave):
    global cap, sez_n
    cap = {'titolo': titolo, 'chiave': chiave, 'corpo': [], 'sezioni': []}
    capitoli.append(cap)
    sez_n = 0

def sezione(titolo, attr=''):
    global sez_n
    sez_n += 1
    n = '%d.%d' % (len(capitoli), sez_n)
    ids = 'sez-' + n.replace('.', '-')
    cap['sezioni'].append((ids, n, titolo))
    cap['corpo'].append('<h2 id="%s" class="man-sez"><span class="man-sez-n">%s ·</span> <span%s>%s</span></h2>'
                        % (ids, n, attr, esc(titolo)))

def chiudi_citazione():
    global citazione
    if citazione:
        cap['corpo'].append('</div>')
        citazione = False

# capitolo 1: le regole generali, dal manuale base
apri_cap('I Frutti del Diavolo', 'generali')
cap['corpo'].append('<div data-frutti-base="cap-9">' + INTRO_CAP + '</div>')
for titolo, corpo in IMPORTI['generali']:
    sezione(titolo, ' data-frutti-base="%s"' % ancora(titolo))
    cap['corpo'].append(corpo)

i = 0
while i < len(blocchi):
    if i in esclusi:
        chiudi_citazione()
        i += 1
        continue
    b = blocchi[i]
    if b['type'] == 'table':
        cap['corpo'].append(tabella_html(b['rows'], src(i))); i += 1; continue
    stile, t = b['style'], b['text']

    if stile.startswith('Heading'):
        liv = livello(stile, t, cap['chiave'] if cap else None, in_risveglio)
        chiudi_citazione()
        if liv == 'cap':
            titolo, chiave = CAPITOLI[t]
            apri_cap(titolo, chiave)
            in_risveglio = False
            TITOLI_ATTESI[i] = titolo
            cap['corpo'].append('<span class="man-cap-fonte"%s hidden>%s</span>' % (src(i), esc(titolo)))
            if chiave in ('paramecia', 'logia'):
                intro, parti = IMPORTI[chiave]
                cap['corpo'].append('<div data-frutti-base="intro-%s">%s</div>' % (chiave, intro))
                cap['import_dopo'] = parti
        elif liv == 'sez':
            if cap.get('import_dopo'):
                for titolo, corpo in cap.pop('import_dopo'):
                    sezione(titolo, ' data-frutti-base="%s"' % ancora(titolo))
                    cap['corpo'].append(corpo)
            in_risveglio = t.startswith('d20')
            sezione(t, src(i))
        elif liv in ('sub', 'tal'):
            cls = 'man-sub man-talento' if liv == 'tal' else 'man-sub'
            cap['corpo'].append('<h3 class="%s" id="%s"%s>%s</h3>' % (cls, ancora(cap['chiave'] + '-' + t), src(i), esc(t)))
        else:
            cap['corpo'].append('<h4 class="man-lab"%s>%s</h4>' % (src(i), esc(t)))
            if t == 'Testo del Manuale':
                cap['corpo'].append('<div class="man-citazione">'); citazione = True
        i += 1; continue

    if t in ETICHETTE:
        chiudi_citazione()
        cap['corpo'].append('<h4 class="man-lab"%s>%s</h4>' % (src(i), esc(t)))
        if t == 'Testo del Manuale':
            cap['corpo'].append('<div class="man-citazione">'); citazione = True
        i += 1; continue

    # elenco puntato del documento, oppure una serie di voci che finiscono con «;»
    if b.get('lista') or (e_voce(b) and t.endswith(';') and i > 0 and blocchi[i - 1].get('text', '').endswith(':')
                          and i + 1 < len(blocchi) and e_voce(blocchi[i + 1])):
        voci, j = [], i
        if b.get('lista'):
            while j < len(blocchi) and j not in esclusi and blocchi[j].get('lista'):
                voci.append('<li%s>%s</li>' % (src(j), '<br>'.join(esc(r) for r in blocchi[j]['text'].split('\n')))); j += 1
        else:
            while j < len(blocchi) and j not in esclusi and e_voce(blocchi[j]):
                voci.append('<li%s>%s</li>' % (src(j), esc(blocchi[j]['text']))); j += 1
                if blocchi[j - 1]['text'].endswith('.'):
                    break
        cap['corpo'].append('<ul class="man-punti">%s</ul>' % ''.join(voci))
        i = j; continue

    interno, intero = testo_html(t)
    if intero:
        cap['corpo'].append(intero.replace('<div class="man-mappa">', '<div class="man-mappa"%s>' % src(i), 1))
    else:
        cap['corpo'].append('<p class="man-guida"%s>%s</p>' % (src(i), interno))
    i += 1
chiudi_citazione()


# ------------------------------------------------------ pagina, indice, sommario
corpo_html, nav, somm = [], [], []
for n, c in enumerate(capitoli, 1):
    idc = 'cap-%d' % n
    corpo_html.append('<section class="man-cap" id="%s" data-cap="%d"><header class="man-cap-h">'
                      '<span class="man-cap-n">Capitolo %d ·</span> <h1>%s</h1></header>'
                      '<div class="man-cap-corpo">' % (idc, n, n, esc(c['titolo'])))
    corpo_html.append('\n'.join(c['corpo']))
    corpo_html.append('</div></section>')
    nav.append('<li class="man-i-cap"><a href="#%s" data-id="%s"><span class="n">%d</span>%s</a><ol class="man-i-sez">'
               % (idc, idc, n, esc(c['titolo'])))
    nav += ['<li><a href="#%s" data-id="%s">%s · %s</a></li>' % (ids, ids, num, esc(t)) for ids, num, t in c['sezioni']]
    nav.append('</ol></li>')
    somm.append('<li class="s-cap">%d · %s</li>' % (n, esc(c['titolo'])))
    somm += ['<li class="s-sez"><b>%s</b>%s</li>' % (num, esc(t)) for _, num, t in c['sezioni']]

base = open(os.path.join(RADICE, 'strumenti/manuale-da-docx.py'), encoding='utf8').read()
modello = next(ast.literal_eval(n.value) for n in ast.parse(base).body
               if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'PAGINA' for t in n.targets))
inizio = modello.index('<header class="man-top">')
fine = modello.index('\n<script>', inizio)
guscio = modello[inizio:fine]
lettore = modello[modello.index('<script>', fine) + len('<script>'):modello.index('</script>', fine)].strip()
assert 'var indice=document.getElementById("man-indice")' in lettore

pagina = guscio.replace('\nNAV\n', '\n' + '\n'.join(nav) + '\n') \
               .replace('\nSOMM\n', '\n' + '\n'.join(somm) + '\n') \
               .replace('\nCORPO\n', '\n' + '\n'.join(corpo_html) + '\n')
assert 'Manuale<br>del gioco' in pagina
pagina = pagina.replace('Manuale<br>del gioco', 'Manuale<br>dei Frutti del Diavolo') \
               .replace('Edizione 2.0 · dalla creazione del pirata alla rotta della ciurma.',
                        'Linee guida ufficiali · Scheda di Identità, Talenti, Forma di Combattimento e Risveglio.')

# Collegamenti alle schede vuote: soltanto interfaccia, fuori dai blocchi normativi.
strumenti_marker = '  <div class="man-strumenti">\n'
assert pagina.count(strumenti_marker) == 1, 'Testata del manuale non univoca'
pagina = pagina.replace(strumenti_marker, strumenti_marker +
    '    <a class="man-btn frutti-schede-trigger" href="#schede-frutto" '
    'title="Scheda Frutto · PDF" aria-label="Scheda Frutto · PDF">'
    '<span aria-hidden="true">▤</span><span class="man-etichetta"> Scheda Frutto · PDF</span></a>\n', 1)
frontespizio_marker = ('      <p class="sotto">Linee guida ufficiali · Scheda di Identità, Talenti, '
                      'Forma di Combattimento e Risveglio.</p>\n    </div>')
assert pagina.count(frontespizio_marker) == 1, 'Frontespizio del manuale non univoco'
schede = '''
      <section class="frutti-schede" id="schede-frutto" aria-labelledby="schede-frutto-titolo">
        <h2 id="schede-frutto-titolo">La scheda del tuo Frutto</h2>
        <p>Schede A4 vuote da compilare a mano. Scegli il tipo, apri il PDF e stampa soltanto le pagine che ti servono.</p>
        <div class="frutti-schede-lista">
          <a class="frutti-scheda" href="/manuale-frutti/schede/frutto-paramecia.pdf" target="_blank" rel="noopener" aria-label="Apri la scheda Paramecia, PDF A4 di 5 pagine, in una nuova scheda">
            <span class="frutti-scheda-tipo">Paramecia</span><span class="frutti-scheda-formato">A4 · 5 pagine</span><span class="frutti-scheda-apri">Apri PDF <span aria-hidden="true">↗</span></span>
          </a>
          <a class="frutti-scheda" href="/manuale-frutti/schede/frutto-logia.pdf" target="_blank" rel="noopener" aria-label="Apri la scheda Logia, PDF A4 di 5 pagine, in una nuova scheda">
            <span class="frutti-scheda-tipo">Logia</span><span class="frutti-scheda-formato">A4 · 5 pagine</span><span class="frutti-scheda-apri">Apri PDF <span aria-hidden="true">↗</span></span>
          </a>
          <a class="frutti-scheda" href="/manuale-frutti/schede/frutto-zoan.pdf" target="_blank" rel="noopener" aria-label="Apri la scheda Zoan, PDF A4 di 5 pagine, in una nuova scheda">
            <span class="frutti-scheda-tipo">Zoan</span><span class="frutti-scheda-formato">A4 · 5 pagine</span><span class="frutti-scheda-apri">Apri PDF <span aria-hidden="true">↗</span></span>
          </a>
        </div>
      </section>'''
pagina = pagina.replace(frontespizio_marker,
                        frontespizio_marker[:-len('\n    </div>')] + schede + '\n    </div>', 1)

testa = modello[:modello.index('<style>')]
testa = testa.replace('<title>Manuale · Grand Line Chronicles</title>',
                      '<title>Manuale dei Frutti del Diavolo · Grand Line Chronicles</title>')
testa = re.sub(r'<meta name="description"[^>]+>',
               '<meta name="description" content="Il manuale dei Frutti del Diavolo: Scheda di Identità, '
               'Talenti di Paramecia, Logia e Zoan, Forma di Combattimento e Risveglio.">', testa)
testa = re.sub(r'href="manuale\.css\?v=\d+"', 'href="/manuale/manuale.css?v=20"', testa)
testa += ('<link rel="stylesheet" href="frutti.css?v=3">\n'
          '<script src="reader.js?v=1" defer></script>\n</head>\n'
          '<body class="manuale-frutti">\n<div class="glc-bg" aria-hidden="true"></div>\n')
uscita = testa + pagina + '\n</body>\n</html>\n'


# ------------------------------------------- controllo: il documento c'è tutto
class Testi(HTMLParser):
    def __init__(self):
        super().__init__(); self.liv = 0; self.attivo = None; self.testi = {}
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('br', 'img', 'input', 'link', 'meta', 'hr', 'source', 'wbr'):
            if self.attivo: self.testi[self.attivo[0]].append(' ')
            return
        self.liv += 1
        if 'data-frutti-source' in a:
            k = a['data-frutti-source']
            assert k not in self.testi, k
            self.attivo = (k, self.liv); self.testi[k] = []
    def handle_endtag(self, tag):
        if self.attivo:
            if self.liv == self.attivo[1]: self.attivo = None
            else: self.testi[self.attivo[0]].append(' ')
        self.liv -= 1
    def handle_data(self, t):
        if self.attivo: self.testi[self.attivo[0]].append(t)

def norm(s): return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', s)).strip()

letti = Testi(); letti.feed(uscita)
attesi = {str(k) for k in range(len(blocchi)) if k not in esclusi}
assert set(letti.testi) == attesi, (sorted(attesi - set(letti.testi), key=int)[:20], set(letti.testi) - attesi)
for k in attesi:
    b = blocchi[int(k)]
    originale = b['text'] if b['type'] == 'p' else ' '.join(c for r in b['rows'] for c in r)
    atteso = norm(TITOLI_ATTESI.get(int(k), originale.replace('→', ' → ')))
    letto = norm(''.join(letti.testi[k]).replace('→', ' → '))
    assert letto == atteso, 'testo diverso nel blocco %s: %r / %r' % (k, atteso[:80], letto[:80])

outputs = {os.path.join(USCITA, 'index.html'): uscita}
if not args.manual_only:
    outputs[os.path.join(USCITA, 'reader.js')] = '/* Generato dall\'interfaccia del manuale base da strumenti/frutti-manuale.py. */\n' + lettore + '\n'
for file, content in outputs.items():
    if args.check:
        assert open(file, encoding='utf8').read() == content, 'Generated output differs: ' + os.path.relpath(file, RADICE)
    else:
        os.makedirs(os.path.dirname(file), exist_ok=True)
        open(file, 'w', encoding='utf8').write(content)
IMPORTATE = len(IMPORTI['generali']) + len(IMPORTI['paramecia'][1]) + len(IMPORTI['logia'][1])
print('Manuale dei Frutti del Diavolo: %d capitoli, %d sezioni, %d blocchi correnti, %d esclusi dalle revisioni. '
      'Copertura del testo corrente: True. Sezioni importate dal manuale base: %d. UI: manuale base.'
      % (len(capitoli), sum(len(c['sezioni']) for c in capitoli), len(attesi), len(esclusi), IMPORTATE))
