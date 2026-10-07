"""Regressions for applying the race removal to the original DOCX blocks."""
import ast
import contextlib
import html
import io
import json
import re
import sys
import unittest
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


class BaseManualRenumbering(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        names = {'esc', 'run_html', 'tabella_html', 'blocco_p', 'blocco_tabella',
                 'blocchi_da_contenuto', 'ripulisci', 'limiti_sezione', 'applica_correzioni'}
        module = ast.parse((ROOT / 'strumenti/manuale-da-docx.py').read_text())
        cls.helpers = {'re': re, 'sys': sys, 'html': html, 'unicodedata': unicodedata,
                       'RE_CAP': re.compile(r'^Capitolo\s+(\d+)\s*[·\-–]\s*(.+)$'),
                       'RE_SEZ': re.compile(r'^(\d+)\.(\d+)\s*[·\-–]\s*(.+)$')}
        functions = [n for n in module.body if isinstance(n, ast.FunctionDef) and n.name in names]
        exec(compile(ast.Module(body=functions, type_ignores=[]), '<manuale helpers>', 'exec'), cls.helpers)
        cls.corrections = json.loads((ROOT / 'strumenti/manuale-correzioni.json').read_text())

    def apply(self, blocks, corrections):
        with contextlib.redirect_stdout(io.StringIO()):
            return self.helpers['applica_correzioni'](blocks, corrections)

    def test_removed_sections_are_deleted_before_their_numbers_are_reused(self):
        p = self.helpers['blocco_p']
        blocks = []
        for number in ['3.7', '3.8', '3.9', '3.10']:
            blocks.extend([p(number + ' · Originale', 'Heading2'), p('Contenuto originale ' + number)])
        blocks.extend([p('Capitolo 4 · Ruoli e Stili', 'Heading1'), p('Il capitolo successivo resta.')])
        corrections = {k: self.corrections[k] for k in ['rimuovi_sezioni', 'rinumerazioni_rinvii']}
        corrections['sezioni'] = [c for c in self.corrections['sezioni'] if c['sezione'] in ['3.7', '3.8']]
        actual = self.apply(blocks, corrections)
        headings = [b['testo'] for b in actual if b.get('stile') == 'Heading2' and self.helpers['RE_SEZ'].match(b['testo'])]
        self.assertEqual(headings, ['3.7 · Cyborg', '3.8 · Tontatta'])
        self.assertFalse(any('Contenuto originale' in b.get('testo', '') for b in actual))
        self.assertEqual(actual[-2]['testo'], 'Capitolo 4 · Ruoli e Stili')
        self.assertEqual(actual[-1]['testo'], 'Il capitolo successivo resta.')

    def test_reference_rewrite_crosses_runs_and_preserves_other_chapters(self):
        p = self.helpers['blocco_p']('Rinvii: §3.9, §3.10; §13.9 e §13.10 restano.')
        p['pezzi'] = [{'t': 'Rinvii: ', 's': ['b']}, {'t': '§', 's': []},
                      {'t': '3.9, §3.', 's': ['i']}, {'t': '10; §13.9 e §13.10 restano.', 's': []}]
        cell = self.helpers['blocco_p']('Vedi §3.10.')
        table = {'tipo': 'tbl', 'righe': [[[cell]]]}
        result = self.apply([p, table], {'rinumerazioni_rinvii': self.corrections['rinumerazioni_rinvii']})
        self.assertEqual(result[0]['testo'], 'Rinvii: §3.7, §3.8; §13.9 e §13.10 restano.')
        self.assertEqual(result[0]['pezzi'][0], {'t': 'Rinvii: ', 's': ['b']})
        self.assertEqual(''.join(x['t'] for x in result[0]['pezzi']), result[0]['testo'])
        self.assertEqual(result[1]['righe'][0][0][0]['testo'], 'Vedi §3.8.')


if __name__ == '__main__':
    unittest.main()
