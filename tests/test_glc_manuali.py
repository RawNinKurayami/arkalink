"""Cross-check published GLC rules and the editorial sources using only Python stdlib.

Run: python3 -m unittest discover -s tests -p 'test_glc_manuali.py' -v
"""
import ast
import contextlib
import io
import json
import re
import unittest
import unicodedata
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class Node:
    def __init__(self, tag='', attrs=(), parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.children = []

    def text(self):
        return ''.join(c.text() if isinstance(c, Node) else c for c in self.children)

    def find(self, tag=None):
        for c in self.children:
            if isinstance(c, Node):
                if tag is None or c.tag == tag:
                    yield c
                yield from c.find(tag)


class Document(HTMLParser):
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed((ROOT / path).read_text())
        self.nodes = list(self.root.find())

    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(n)
        if tag == 'br':
            n.children.append('\n')
        if tag not in self.VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)

    def section(self, identifier):
        h = next(n for n in self.nodes if n.attrs.get('id') == identifier)
        siblings = h.parent.children
        out = []
        for n in siblings[siblings.index(h) + 1:]:
            if isinstance(n, Node):
                if n.tag == 'h2' and n.attrs.get('class') == 'man-sez':
                    break
                out.append(n)
        return out


def text(nodes):
    return ' '.join(n.text() for n in nodes)


def norm(s):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', s).replace('’', "'")).strip()


def chars(s):
    return re.sub(r'\s+', '', norm(s))


def tables(nodes):
    for n in nodes:
        for table in ([n] if n.tag == 'table' else n.find('table')):
            rows = [[norm(c.text()) for c in row.children if isinstance(c, Node) and c.tag in {'th', 'td'}] for row in table.find('tr')]
            yield rows


def subsection(nodes, title):
    start = next(i for i, n in enumerate(nodes) if n.tag in {'h3', 'h4'} and norm(n.text()) == title)
    end = next((i for i in range(start + 1, len(nodes)) if nodes[i].tag in {'h3', 'h4'}), len(nodes))
    return nodes[start + 1:end]


def block_text(blocks):
    return ''.join(b['testo'] if b['tipo'] == 'p' else ''.join(p['testo'] for row in b['righe'] for cell in row for p in cell) for b in blocks)


class ManualConsistency(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = Document('manuale/index.html')
        cls.prestige = Document('manuale-prestigio/index.html')
        cls.fruit = Document('manuale-frutti/index.html')
        cls.cyborg = Document('manuale-cyborg/index.html')
        cls.catalogue = {}
        for rows in tables(cls.base.section('sez-7-8')):
            if rows[0] == ['Effetto', 'Grado min.', 'Costo', 'Stile', 'Funzionamento']:
                for row in rows[1:]:
                    if row[0] in cls.catalogue:
                        raise AssertionError('Duplicate ordinary effect: ' + row[0])
                    cls.catalogue[row[0]] = row

    def test_catalogue_and_style_sheets_agree(self):
        expected = {
            'Striker': {'Sbilancio', 'Presa', 'Sfondamento', 'Proiezione', 'Scatto', 'Balzo', 'Guardia', 'Furia', 'Schianto'},
            'Swordsman': {'Lacerazione', 'Scatto', 'Balzo', 'Guardia', 'Mira', 'Catena', 'Tutto o Niente', 'Area Ravvicinata'},
            'Sniper': {'Scatto', 'Lacerazione', 'Mira', 'Rimbalzo', 'Catena'},
            'Crusher': {'Sbilancio', 'Sfondamento', 'Proiezione', 'Guardia', "Scudo d'Alleato", 'Furia', 'Schianto', 'Carica', 'Area Ravvicinata'},
        }
        self.assertEqual(set(self.catalogue), set.union(*expected.values()))
        self.assertEqual(len(self.catalogue), 17)
        for number, (style, effects) in enumerate(expected.items(), 2):
            permitted = {name for name, row in self.catalogue.items() if style in row[3].split(', ')}
            self.assertEqual(permitted, effects, style)
            sheet = text(subsection(self.base.section(f'sez-4-{number}'), 'Effetti del Costruttore'))
            mentioned = {name for name in self.catalogue if name in norm(sheet)}
            self.assertEqual(mentioned, effects, style)
        # Special-source profiles remain available as references, outside ordinary styles.
        special = next(rows for rows in tables(self.base.section('sez-7-8')) if rows[0][0] == 'Profilo speciale')
        self.assertEqual({r[0] for r in special[1:]}, {'Accecante', 'Terrore', 'Paralisi', 'Sopore', 'Attrazione', 'Barriera'})

    def test_slots_and_fruit_import_agree(self):
        rows = next(tables(self.base.section('sez-7-6')))
        self.assertEqual(rows[1:], [['d4', '0'], ['d6', '0'], ['d8', '2'], ['d10', '2'], ['d12', '3'], ['d20', '4']])
        s = norm(text(self.base.section('sez-7-6')))
        self.assertIn('Il requisito d6 di un effetto non concede uno slot', s)
        self.assertIn('normalmente dal d8', s)
        # The fruit manual imports the whole general rule rather than a competing copy.
        self.assertEqual(chars(text(self.base.section('sez-9-5'))), chars(text(self.fruit.section('sez-1-5'))))
        self.assertNotIn('uno slot Effetto ciascuna', self.base.root.text())

    def test_costs_and_examples_agree(self):
        costs = {name: row[2] for name, row in self.catalogue.items()}
        for name, cost in {'Proiezione': '1 ST', 'Schianto': '2 ST', 'Presa': '1 ST/turno', 'Furia': '3 ST', 'Mira': '3 ST', 'Area Ravvicinata': '2 ST'}.items():
            self.assertEqual(costs[name], cost)
        chains = next(tables(self.base.section('sez-7-11')))
        for row in chains[1:]:
            self.assertEqual(row, self.catalogue[row[0]])
        example = norm(text(subsection(self.base.section('sez-7-11'), 'Urto del Porto')))
        self.assertIn('Proiezione (1 ST) + Schianto (2 ST)', example)
        self.assertIn('3 ST e 2 slot', example)
        prestige = norm(self.prestige.root.text())
        self.assertIn('Proiezione 1 ST, Schianto 2 ST, Scatto 1 ST e Balzo 1 ST', prestige)
        self.assertNotRegex(prestige, r'Proiezione (?:0 ST|.*?costo ordinario di 0 ST)|Schianto 1 ST')
        fury = self.catalogue['Furia'][4]
        self.assertIn('DP −1', fury)
        self.assertNotIn('−2', fury)
        self.assertIn('Vantaggio ai tiri per colpire', self.catalogue['Mira'][4])

    def test_active_defense_separates_ties_from_counter_damage(self):
        for number in [2, 3, 5]:
            talent = norm(text(subsection(self.base.section(f'sez-4-{number}'), 'Contraccolpo')))
            self.assertIn('difesa supera il tiro', talent)
            self.assertIn('Un pareggio neutralizza', talent)
            self.assertIn('non infligge danni', talent)
            self.assertIn('non concede una Reazione aggiuntiva', talent)
            self.assertNotIn('Tecnica con Contrattacco', talent)
        for section in ['sez-2-8', 'sez-6-10']:
            rule = norm(text(self.base.section(section)))
            self.assertIn('prima del tiro per colpire', rule)
            self.assertIn('paghi immediatamente', rule)
            self.assertIn('un fallimento non rimborsa', rule)
            self.assertIn('raggiungi o superi', rule)
            self.assertIn('Un pareggio difende ma non infligge danni', rule)
        self.assertNotIn('Tecnica con Contrattacco', self.base.root.text())
        anticipation = norm(self.prestige.root.text())
        self.assertIn('tre tiri completi', anticipation)
        self.assertIn('Difesa Attiva eseguita con una Tecnica', anticipation)
        self.assertIn('questa infligge il normale Dado Danno soltanto se la difesa supera', anticipation)

    def test_guard_progression_and_area_limits(self):
        guard = next(rows for rows in tables(self.base.section('sez-7-8')) if rows[0][-1] == 'Bonus DP')
        self.assertEqual([r[0::2] + [r[3]] for r in guard[1:]], [['d8', '1 ST', '+2'], ['d10', '2 ST', '+3'], ['d12', '3 ST', '+4'], ['d20', '4 ST', '+5']])
        self.assertIn('inizio del tuo prossimo turno', text(self.base.section('sez-7-8')))
        for section in ['sez-7-5', 'sez-7-9']:
            rule = text(self.base.section(section))
            self.assertIn('raggio pari alla Portata effettiva', rule)
            self.assertIn('non può ricevere Gittata', rule)
            self.assertIn('non occupa slot', rule)
            self.assertIn('Striker e Sniper non possiedono', rule)
        prestige = self.prestige.root.text()
        self.assertIn('non può essere proiettata a distanza tramite Fendente Sovrano', prestige)
        self.assertIn('non genera più coni', prestige)
        self.assertIn('non moltiplica i punti d’origine', prestige)

    def test_scene_duration_respects_the_custom_technique_cap(self):
        duration = self.base.section('sez-7-13')
        scene = next(row for rows in tables(duration) for row in rows[1:] if row[0] == 'Tutta la scena')
        self.assertIn('Grado d20', scene[2])
        self.assertNotIn('d20+', text(duration))
        self.assertIn('Le Tecniche personalizzate non superano d20', text(duration))
        self.assertIn('non sostituiscono le durate specifiche', text(duration))

    def test_external_sources_and_namesake_abilities_survive(self):
        fruit = self.fruit.root.text()
        self.assertIn('già un’Area valida', fruit)
        self.assertIn('Catena validamente autorizzata', fruit)
        self.assertIn('Le Zone sono opzioni di Fonte speciale', fruit)
        cyborg = self.cyborg.root.text()
        self.assertIn('Nessuna Fascia concede automaticamente', cyborg)
        self.assertIn('Aree e Zone Persistenti richiedono', cyborg)
        self.assertIn('compatibile con il proprio Stile', cyborg)
        headings = {norm(n.text()) for n in self.base.nodes if n.tag in {'h3', 'h4'}}
        for title in ['Colpo Pesante · Base', 'Colpo Pesante · Migliorato', 'Colpo Pesante · Maestria', 'Parata Perfetta', '4.6.2 · Tossicologo', 'Slancio']:
            self.assertTrue(title in headings, title)
        self.assertTrue('Danno da sovraccarico secondo la Fascia' in cyborg)
        self.assertIn('Raffica · Maestria', headings)

    def test_saved_sections_replay_to_the_published_text(self):
        # Load only pure generator helpers: no unavailable DOCX or writes are needed.
        module = ast.parse((ROOT / 'strumenti/manuale-da-docx.py').read_text())
        names = {'esc', 'run_html', 'tabella_html', 'blocco_p', 'blocco_tabella', 'blocchi_da_contenuto', 'ripulisci', 'limiti_sezione', 'applica_correzioni'}
        functions = [n for n in module.body if isinstance(n, ast.FunctionDef) and n.name in names]
        import sys
        import html
        env = {'re': re, 'sys': sys, 'html': html, 'unicodedata': unicodedata,
               'RE_CAP': re.compile(r'^Capitolo\s+(\d+)\s*[·\-–]\s*(.+)$'),
               'RE_SEZ': re.compile(r'^(\d+)\.(\d+)\s*[·\-–]\s*(.+)$')}
        exec(compile(ast.Module(body=functions, type_ignores=[]), '<manuale helpers>', 'exec'), env)
        corrections = json.loads((ROOT / 'strumenti/manuale-correzioni.json').read_text())
        revised = [v for v in corrections['sezioni'] if v.get('quando') == '2026-10-07']
        self.assertGreaterEqual(len(revised), 15)
        for edit in revised:
            seed = [env['blocco_p'](f"{edit['sezione']} · Prima", 'Heading2'), env['blocco_p']('Vecchio contenuto')]
            # Older substitutions in a replaced section must not undo the revision.
            scoped = {k: [v for v in corrections.get(k, []) if v['sezione'] == edit['sezione']] for k in ['blocchi', 'sostituzioni', 'tabelle']}
            scoped['sezioni'] = [edit]
            with contextlib.redirect_stdout(io.StringIO()):
                result = env['applica_correzioni'](seed, scoped)
            actual = self.base.section('sez-' + edit['sezione'].replace('.', '-'))
            self.assertEqual(chars(block_text(result[1:])), chars(text(actual)), edit['sezione'])
            saved_tables = [b for b in result if b['tipo'] == 'tbl' and b.get('classe') == 'man-tab-effetti']
            visible_tables = [n for container in actual for n in container.find('table') if 'man-tab-effetti' in n.attrs.get('class', '').split()]
            self.assertEqual(len(saved_tables), len(visible_tables), edit['sezione'])
            for table in saved_tables:
                rendered = env['tabella_html'](table['righe'], table['classe'])
                self.assertIn('man-tab man-tab-effetti', rendered)
                self.assertIn('tabindex="0"', rendered)
        for edit in corrections['sostituzioni']:
            if edit.get('quando') != '2026-10-07':
                continue
            actual = norm(text(self.base.section('sez-' + edit['sezione'].replace('.', '-'))))
            self.assertIn(norm(edit['a']), actual, edit['sezione'])
            if norm(edit['da']) not in norm(edit['a']):
                self.assertNotIn(norm(edit['da']), actual, edit['sezione'])

    def test_raffica_progression_and_attack_rules_agree(self):
        striker = self.base.section('sez-4-2')
        progress = next(tables(subsection(striker, 'Progressione della Raffica')))
        self.assertEqual(progress[1:], [
            ['Base', 'd8', '1', '1', '1 ST'],
            ['Migliorato', 'd10 + Base', '2', '1 + 2', '3 ST'],
            ['Maestria', 'd12 + Migliorato', '3', '1 + 2 + 3', '6 ST']
        ])
        for version, total in [('Base', 1), ('Migliorato', 3), ('Maestria', 6)]:
            rule = norm(text(subsection(striker, 'Raffica · ' + version)))
            self.assertIn('Azione Bonus · 1 volta per turno', rule)
            self.assertIn('attacco base' if version == 'Base' else 'attacchi base', rule)
            self.assertIn(f'{total} ST', rule)
        for version in ['Migliorato', 'Maestria']:
            rule = norm(text(subsection(striker, 'Raffica · ' + version)))
            self.assertIn('non interrompe', rule)
            self.assertNotIn('1 ST per colpo extra', rule)
        initial = norm(text(subsection(striker, 'Raffica · Base')))
        self.assertIn('Tecnica offensiva Striker compatibile eseguita a mani nude', initial)
        self.assertIn('pagata prima', initial)
        self.assertIn('la ST rimane spesa', initial)
        self.assertIn('non concede una seconda Azione', initial)

    def test_raffica_prestige_costs_examples_and_sources_agree(self):
        rule = norm(text(self.prestige.section('combattenti-talento-comune-ai-due-percorsi-dello-striker')))
        self.assertIn('il primo costa 1 ST, il secondo 2 ST, il terzo 3 ST, il quarto 4 ST, il quinto 5 ST', rule)
        self.assertIn('I due costi si sommano integralmente', rule)
        self.assertIn('non interrompe Raffica Senza Fine', rule)
        self.assertIn('Non esiste un numero massimo prestabilito', rule)
        self.assertIn('1 + 2 + 3 = 6 ST', rule)
        self.assertIn('per un totale di 7 ST', rule)
        self.assertIn('2° extra con Tecnica da 2 ST: Raffica 2 ST + Tecnica 2 ST = 4 ST', rule)
        self.assertNotIn('2 ST per attacco extra', rule)
        self.assertNotIn('quattro attacchi base aggiuntivi, a 2 ST ciascuno', rule)
        self.assertIn('Il Colpo Sfonda rimane soggetto al limite generale di una sola attivazione per turno', rule)
        precision = norm(self.prestige.root.text())
        self.assertIn('Punto di Rottura sostituisce soltanto lo stato della Firma per quel colpo e ne condivide il limite di una attivazione per turno', precision)
        self.assertIn('Applicare Punto di Rottura consuma l\'unica attivazione della Firma', precision)
        catalogue = json.loads((ROOT / 'regole/prestigio-catalogo.json').read_text())
        talent = next(t for t in catalogue['talents'] if t['id'] == 'raffica-senza-fine')
        self.assertEqual((talent['costST'], talent['saikyoST'], talent['costProgression']), (1, 1, 'extra-index'))
        self.assertEqual(talent['replaces'], ['Raffica — Base', 'Raffica — Migliorato', 'Raffica — Maestria'])
        costs = next(rows for rows in tables([self.prestige.root]) if rows[0] == ['Talento', 'Tipo', 'Bonus', 'Costo', 'Limite principale'])
        cost = next(row[3] for row in costs if row[0] == 'Raffica Senza Fine')
        self.assertIn('1 ST il primo attacco extra, 2 ST il secondo, 3 ST il terzo', cost)
        self.assertIn('normali costi', cost)

    def test_raffica_signature_and_burning_combo_remain_coherent(self):
        striker = self.base.section('sez-4-2')
        signature = norm(text(subsection(striker, 'Firma · Il colpo sfonda')))
        self.assertIn('1 volta per turno', signature)
        self.assertIn('non la attivano nuovamente', signature)
        pressure = norm(text(subsection(striker, 'Pressione Costante')))
        broken = norm(text(subsection(striker, 'Guardia Rotta')))
        self.assertIn('almeno due volte nel tuo turno', pressure)
        self.assertIn('almeno due volte nello stesso turno', broken)
        self.assertIn('Vantaggio', broken)
        self.assertIn('non riduce la Difesa Passiva di 2', broken)
        smash = norm(text(subsection(striker, 'Smash Hit · Regole particolari')))
        self.assertIn('non attivano Pressione Costante, Guardia Rotta o Il colpo sfonda', smash)
        combo = norm(text(self.base.section('sez-6-4')))
        self.assertLess(combo.index('Azione: esegui Burning Combo'), combo.index('Dopo l\'attacco iniziale, Azione Bonus'))
        self.assertIn('1 ST, 2 ST e 3 ST', combo)
        self.assertIn('non riutilizzano la Tecnica Burning Combo', combo)
        self.assertNotIn('pagando 1 ST per ciascuno', combo)
        for document in [self.fruit, self.cyborg]:
            self.assertNotIn('2 ST per attacco extra', document.root.text())

    def test_manual_navigation_targets_exist(self):
        for document in [self.base, self.prestige, self.fruit, self.cyborg]:
            ids = [n.attrs['id'] for n in document.nodes if n.attrs.get('id')]
            self.assertEqual(len(ids), len(set(ids)), 'Duplicate HTML anchors')
            for node in document.nodes:
                href = node.attrs.get('href', '')
                if href.startswith('#') and len(href) > 1:
                    self.assertIn(href[1:], ids)


if __name__ == '__main__':
    unittest.main()
