#!/usr/bin/env python3
"""Rimuove solo pagine finali senza testo o immagini dalla stampa Chromium.
Mantiene la copertina, segnalibri e contenuti. Richiede pypdf.
"""
from pathlib import Path
import sys
from pypdf import PdfReader, PdfWriter

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
if count < len(reader.pages):
    writer = PdfWriter(clone_from=reader)
    for index in range(len(reader.pages) - 1, count - 1, -1):
        writer.remove_page(index, clean=True)
    temporary = file.with_suffix('.complete.pdf')
    writer.write(temporary)
    check = PdfReader(temporary)
    assert len(check.pages) == count
    assert check.pages[-1].extract_text() == reader.pages[count - 1].extract_text()
    temporary.replace(file)
    print(f'{len(reader.pages) - count} pagina finale vuota rimossa')
