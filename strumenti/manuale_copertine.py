"""Presentazione delle quattro copertine approvate, fuori dal testo delle regole.

I generatori richiamano applica_copertina prima di scrivere la pagina.
È possibile aggiornare soltanto la presentazione degli HTML già pubblicati:
    python3 strumenti/manuale_copertine.py
"""
from pathlib import Path
import re

MANUALI = {
    'base': ('manuale', 'manuale-di-gioco', 'Manuale di gioco'),
    'prestigio': ('manuale-prestigio', 'manuale-del-prestigio', 'Manuale del Prestigio'),
    'cyborg': ('manuale-cyborg', 'manuale-del-cyborg', 'Manuale del Cyborg'),
    'frutti': ('manuale-frutti', 'manuale-dei-frutti-del-diavolo', 'Manuale dei Frutti del Diavolo'),
}
CSS = '<link rel="stylesheet" href="/manuali/copertine.css?v=1">'


def applica_copertina(pagina, manuale):
    """Inserisce solo immagini, decorazione e download; mantiene il corpo intatto."""
    cartella, immagine, titolo = MANUALI[manuale]
    if 'data-manuale-copertina=' in pagina:
        assert f'data-manuale-copertina="{manuale}"' in pagina
        return pagina
    if CSS not in pagina:
        assert pagina.count('</head>') == 1
        pagina = pagina.replace('</head>', CSS + '\n</head>', 1)
    assert len(re.findall(r'<body(?:\s[^>]*)?>', pagina)) == 1
    pagina = re.sub(r'<body(\s[^>]*)?>',
                    lambda m: '<body' + (m.group(1) or '') +
                    f' data-manuale-copertina="{manuale}">', pagina, count=1)
    decorazione = (
        f'\n<div class="man-cover-bg" aria-hidden="true">'
        f'<img src="/img/copertine/{immagine}.webp" alt="" '
        'width="1024" height="1536" decoding="async"></div>')
    pagina = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + decorazione, pagina, count=1)
    segno = '<div class="man-frontespizio">'
    assert pagina.count(segno) == 1
    copertina = (
        '\n      <figure class="man-copertina">\n'
        '        <picture>\n'
        f'          <source media="screen" type="image/webp" srcset="/img/copertine/{immagine}.webp">\n'
        f'          <img src="/img/copertine/{immagine}.jpg" '
        f'alt="Copertina del {titolo}" width="1024" height="1536" fetchpriority="high">\n'
        '        </picture>\n'
        '      </figure>')
    pagina = pagina.replace(segno, segno + copertina, 1)
    # Anche il frontespizio resta quello del manuale: è un punto stabile
    # esterno a capitoli, sommario e blocchi tracciati dalle fonti ufficiali.
    sottotitolo = re.search(r'<p class="sotto">.*?</p>', pagina, re.S)
    assert sottotitolo is not None
    fine = sottotitolo.end()
    link = (
        f'\n      <a class="man-pdf-download" href="/{cartella}/manuale.pdf" download '
        f'aria-label="Scarica {titolo} con copertina in PDF">'
        'Scarica il manuale · PDF <span aria-hidden="true">↓</span></a>')
    pagina = pagina[:fine] + link + pagina[fine:]
    return pagina


if __name__ == '__main__':
    radice = Path(__file__).resolve().parents[1]
    for chiave, (cartella, _, _) in MANUALI.items():
        file = radice / cartella / 'index.html'
        prima = file.read_text(encoding='utf8')
        dopo = applica_copertina(prima, chiave)
        if dopo != prima:
            file.write_text(dopo, encoding='utf8')
        print(f'{cartella}: copertina pronta; nessuna modifica alle regole.')
