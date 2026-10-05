# -*- coding: utf-8 -*-
"""Affianca, per ogni Talento dell'albero (gestisci-pirata), la descrizione dell'app
al testo del manuale base, così si controlla che dicano la stessa cosa.

    python3 strumenti/confronto-albero-manuale.py Capitano Musicista
    FRUTTI=1 python3 strumenti/confronto-albero-manuale.py Paramecia Logia Zoan

Senza argomenti confronta tutti gli Stili dei Ruoli. «NON TROVATO» vuol dire che
il nome nell'app non compare nel manuale: va controllato a mano."""
import re, sys, html, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
man = open(R + 'manuale/index.html', encoding='utf8').read()
app = open(R + 'gestisci-pirata/index.html', encoding='utf8').read()

SEZ = {'Striker': '4-2', 'Swordsman': '4-3', 'Sniper': '4-4', 'Crusher': '4-5', 'Infermeria': '4-6', 'Tossicologo': '4-6',
       'Chimico': '4-6', 'Cuoco': '4-7', 'Navigatore': '4-8', 'Carpentiere': '4-9', 'Meccanico': '4-9', 'Archeologo': '4-10',
       'Musicista': '4-11', 'Capitano': '4-12', 'Paramecia': '9-7', 'Logia': '9-8', 'Zoan': '9-9'}
SOTTO = {'Infermeria': ('4.6.1', '4.6.2'), 'Tossicologo': ('4.6.2', '4.6.3'), 'Chimico': ('4.6.3', None),
         'Carpentiere': ('4.9.1', '4.9.2'), 'Meccanico': ('4.9.2', None)}

def testo_sezione(num):
    a = man.index('<h2 id="sez-%s"' % num)
    b = man.index('<h2', a + 10)
    t = man[a:b]
    t = re.sub(r'</(p|h\d|li|tr|div)>', '\n', t)
    t = re.sub(r'</t[dh]>', ' | ', t)
    t = html.unescape(re.sub(r'<[^>]+>', '', t))
    return [x.strip(' |') for x in t.split('\n') if x.strip(' |')]

def norm(n): return n.replace(' — ', ' · ').replace("'", '’')

# --- app: stili, tratto, firma, talenti
stili = {}
cur = None
INIZIO = 'FRUIT_TALENTS' if os.environ.get('FRUTTI') else 'const TALENTS'
for riga in app[app.index(INIZIO):app.index(INIZIO) + 200000].split('\n'):
    riga = riga.lstrip()
    m = re.match(r'^(?:"[^"]+":\{(?:multi:true,)?skill:"[^"]*",styles:\{)?"([^"]+)":\{ico:"[^"]*",(?:[a-zA-Z]+:(?:"[^"]*"|\[[^\]]*\]),)*tratto:"([^"]*)",firma:"([^"]*)"', riga)
    if m:
        cur = m.group(1); stili[cur] = {'tratto': m.group(2), 'firma': m.group(3), 'tal': []}
        continue
    m = re.match(r'\s*\{smcId:"[^"]+",smcAlias:"[^"]+",n:"([^"]+)",tier:"([^"]+)",(?:t:"[^"]*",)?(?:req:"([^"]*)",)?(?:t:"[^"]*",)?d:"([^"]*)"', riga)
    if m and cur:
        stili[cur]['tal'].append(m.groups())
    if (riga.startswith('const ') or riga.startswith('};')) and cur and 'TALENTS' not in riga:
        break

scelti = sys.argv[1:] or list(SEZ)
for st in scelti:
    if st not in stili: print('?? stile', st); continue
    righe = testo_sezione(SEZ[st])
    if st in SOTTO:
        a, b = SOTTO[st]
        ia = next(i for i, x in enumerate(righe) if x.startswith(a + ' ·'))
        ib = next((i for i, x in enumerate(righe) if b and x.startswith(b + ' ·')), len(righe))
        righe = righe[ia:ib]
    nomi = [norm(t[0]) for t in stili[st]['tal']]
    def blocco(nome):
        alt = nome.replace('’', "'")
        idx = [i for i, x in enumerate(righe) if x in (nome, alt) or x.startswith(nome + ' | ') or x.startswith(alt + ' | ') or x == 'Talento Supremo · ' + nome]
        if not idx: return '!!! NON TROVATO NEL MANUALE'
        i = idx[-1] if len(idx) > 1 and righe[idx[0]].startswith('Talento Supremo') else idx[0]
        out = [righe[i]]
        for x in righe[i + 1:i + 25]:
            if any(x == n or x.startswith(n + ' | ') for n in nomi if n != nome): break
            if re.match(r'^(Talenti )?d(8|10|12|20) ·|^Talento Supremo', x): break
            out.append(x)
        return '\n      '.join(out)
    print('=' * 100)
    print('STILE', st)
    print('  APP TRATTO :', stili[st]['tratto'])
    for i,x in enumerate(righe):
        if x.startswith('Tratto') : print('  MAN TRATTO :', ' / '.join(righe[i:i+6]))
    print('  APP FIRMA  :', stili[st]['firma'])
    for i,x in enumerate(righe):
        if x.startswith('Firma') : print('  MAN FIRMA  :', ' / '.join(righe[i:i+7]))
    for n, tier, req, d in stili[st]['tal']:
        print('-' * 100)
        print('  [%s] %s%s' % (tier, n, ('  (req ' + req + ')') if req else ''))
        print('  APP :', d)
        print('  MAN :', blocco(norm(n)))
