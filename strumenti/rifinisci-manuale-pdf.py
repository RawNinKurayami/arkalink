#!/usr/bin/env python3
"""Rimuove solo pagine finali senza testo o immagini dalla stampa Chromium.
Mantiene la copertina, segnalibri e contenuti. Richiede pypdf.
"""
from pathlib import Path
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject

file = Path(sys.argv[1])
reader = PdfReader(file)
assert len(reader.pages) > 1, 'Il PDF deve contenere copertina e regole'
assert len(reader.pages[0].images) == 1, 'Copertina mancante'
count = len(reader.pages)
while count > 1:
    page = reader.pages[count - 1]
    if (page.extract_text() or '').strip() or page.images:
        break
    count -= 1
site_links=[]
for page in reader.pages:
    for ref in page.get('/Annots', []):
        action=ref.get_object().get('/A')
        if action and str(action.get('/URI','')).startswith('https://manuali.arkalink.test/'):
            site_links.append(action)
if count < len(reader.pages) or site_links:
    writer = PdfWriter(clone_from=reader)
    for index in range(len(reader.pages) - 1, count - 1, -1):
        writer.remove_page(index, clean=True)
    for page in writer.pages:
        for ref in page.get('/Annots', []):
            action=ref.get_object().get('/A')
            if action and str(action.get('/URI','')).startswith('https://manuali.arkalink.test/'):
                action[NameObject('/URI')]=TextStringObject(str(action['/URI']).replace('https://manuali.arkalink.test/','https://arkalink.com/',1))
    temporary = file.with_suffix('.complete.pdf')
    writer.write(temporary)
    check = PdfReader(temporary)
    assert len(check.pages) == count
    assert check.pages[-1].extract_text() == reader.pages[count - 1].extract_text()
    temporary.replace(file)
    if count < len(reader.pages):print(f'{len(reader.pages) - count} pagina finale vuota rimossa')
