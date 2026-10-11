#!/usr/bin/env python3
"""Aggiorna soltanto il seed alimentare del Mercante, senza toccare ricette o materiali."""
from pathlib import Path
import argparse, json, re

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--check', action='store_true')
args=parser.parse_args()
food=json.loads((root/'regole/ingredienti-cambusa.json').read_text())['ingredienti']
file=root/'portale-officina-cambusa/index.html'
before=file.read_text()
match=re.search(r'(var SEED_INGREDIENTI\s*=\s*)(\[.*?\]);',before,re.S)
assert match, 'Seed Mercante non trovato'
rows=json.loads(match[2])
by_id={row['id']:row for row in rows}
for row in food:
    previous=by_id.get(row['id'],{})
    by_id[row['id']]={**previous,**row,'img':previous.get('img') or row.get('img','')}
after=before[:match.start(2)]+json.dumps(list(by_id.values()),ensure_ascii=False)+before[match.end(2):]
if args.check:
    assert after==before, 'Il seed alimentare deve essere aggiornato'
else:
    file.write_text(after)
print(f"Mercante: {len(food)} ingredienti alimentari, {len(by_id)} voci totali; seed allineato.")
