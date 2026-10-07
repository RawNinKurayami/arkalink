"""Approved post-audit manual decisions §§7–10 and reproducible sources."""
import hashlib
import html
import json
import re
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def text(markup):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', markup))).strip()


def section(markup, anchor):
    found = re.search(r'<h([234])\b[^>]*\bid="' + re.escape(anchor) + r'"[^>]*>', markup)
    if not found:
        raise AssertionError('Missing heading ' + anchor)
    level = int(found.group(1))
    following = re.search(r'<h[1-' + str(level) + r']\b', markup[found.end():])
    end = found.end() + following.start() if following else len(markup)
    return markup[found.start():end]


class PrestigeFruitPostAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.prestige = (ROOT / 'manuale-prestigio/index.html').read_text()
        cls.fruit = (ROOT / 'manuale-frutti/index.html').read_text()
        generated = (ROOT / 'regole/prestigio-data.js').read_text()
        cls.data = json.loads(generated.split('root.GLCPrestigeData=', 1)[1].split(';})(typeof window', 1)[0])

    def test_prestige_dp_uses_full_racial_grade_and_precedes_saving_throws(self):
        body = section(self.prestige, 'introduzione-la-crescita-oltre-il-d20')
        self.assertLess(body.index('Difesa Passiva e Prestigio'), body.index('Salvezze e Prestigio'))
        prose = text(body)
        self.assertIn('somma i valori massimi dei dadi che lo compongono e aggiungi +1', prose)
        self.assertIn('Non si effettua un tiro', prose)
        self.assertIn('dopo il calcolo del valore base', prose)
        table = next(table for table in re.findall(r'<table\b.*?</table>', body, re.S) if 'Difesa Passiva' in table)
        rows = re.findall(r'<tr>(.*?)</tr>', table, re.S)[1:]
        self.assertEqual(len(rows), 6)
        for row, extra in zip(rows, [4, 6, 8, 10, 12, 20]):
            cells = [text(cell) for cell in re.findall(r'<td>(.*?)</td>', row, re.S)]
            self.assertTrue(cells[0].startswith('d20+d' + str(extra)))
            self.assertEqual(int(cells[1]), 20 + extra + 1)

    def test_ryou_persistente_doubles_total_once_and_retains_all_limits(self):
        body = text(section(self.prestige, 'haki-ryou-persistente'))
        for phrase in ['danno totale dell’attacco scelto', '×2 una sola volta', 'tutti i dadi e i bonus',
                       'Non raddoppiare separatamente', 'rimane descrittivo', 'non crea una categoria meccanica',
                       '4 PIP', '2 turni', '5 PIP', '3 turni', 'un solo attacco fisico',
                       'prima di effettuare il tiro per colpire', 'attacco mancato consuma',
                       'non concede un secondo tentativo', 'non si applica automaticamente a ogni colpo di una Raffica',
                       'non aggiunge attacchi', 'termina se Armamento viene interrotto',
                       'Difesa Passiva', 'Difesa Attiva', 'Riduzione del Danno', '3 PIP']:
            self.assertIn(phrase, body)
        self.assertNotIn('raddoppia la componente di danno interno', body)

    def test_explosion_does_not_restore_a_separate_internal_damage_component(self):
        body = text(section(self.prestige, 'haki-esplosione-haki-superiore'))
        self.assertIn('Ryou modifica invece il danno totale dell’attacco', body)
        self.assertIn('Proiezione, Schianto e condizioni della Tecnica', body)
        self.assertIn('non vengono copiati sui bersagli secondari', body)
        self.assertNotIn('componente interna potenziata dal Ryou', body)
        self.assertIn('non riceve una seconda copia del danno', body)
        self.assertIn('metà del danno', body)

    def test_generated_runtime_and_catalogue_share_the_current_ryou_blocks(self):
        catalogue = json.loads((ROOT / 'regole/prestigio-catalogo.json').read_text())
        for key in ['esplosione-haki-superiore', 'ryou-persistente']:
            current = next(t for t in self.data['haki'] if t['id'] == key)
            registered = next(t for t in catalogue['haki'] if t['id'] == key)
            self.assertEqual(current['blocks'], registered['blocks'])
            normative = json.dumps(current['blocks'], ensure_ascii=False)
            self.assertIn('danno totale dell’attacco', normative)
            self.assertNotIn('raddoppia la componente di danno interno', normative)
            self.assertNotIn('componente interna potenziata dal Ryou', normative)
        ryou = next(t for t in self.data['haki'] if t['id'] == 'ryou-persistente')
        self.assertEqual([ryou[k] for k in ['level', 'cost', 'saikyoCost', 'duration', 'saikyoDuration']], [5, 4, 5, 2, 3])

    def test_combat_form_is_complete_and_does_not_inherit_natural_range_fragments(self):
        body = text(section(self.fruit, 'paramecia-forma-di-combattimento'))
        for phrase in ['Talento attivo · Azione Bonus', 'beneficio costante', 'richiede Stamina',
                       'Linea guida · Forma di Combattimento del Capitolo 5', 'non è una Tecnica',
                       'stato di combattimento mantenuto']:
            self.assertIn(phrase, body)
        for obsolete in ['Chiarimento necessario', 'GM dovrebbe inventare', 'tabella standard',
                         'completamente chiuso', 'Gittata costa 0 ST', 'non occupa Slot']:
            self.assertNotIn(obsolete, body)
        natural_range = text(section(self.fruit, 'paramecia-portata-naturale'))
        self.assertIn('la Gittata costa 0 ST', natural_range)
        self.assertIn('non occupa Slot', natural_range)

    def test_chapter_five_is_byte_for_byte_unchanged_by_the_approved_cleanup(self):
        body = re.search(r'<section class="man-cap" id="cap-5".*?</section>', self.fruit, re.S).group(0)
        self.assertEqual(hashlib.sha256(body.encode()).hexdigest(),
                         '83fb12c01f8d76ede2b12023f45e389c577233372b891b72b1906f77a19b7183')

    def test_reform_elsewhere_is_a_flexible_visible_reachable_reaction_with_no_extra_action(self):
        body = text(section(self.fruit, 'logia-riformarsi-altrove'))
        for phrase in ['Reazione', '1 volta per scontro', '15 metri', 'Grado d10', 'evento immediato e percepibile',
                       'ragionevolmente reagire', 'non possiede un singolo trigger universale',
                       'attacco dichiarato', 'pericolo improvviso', 'crollo', 'esplosione', 'movimento ostile',
                       'Game Master determina caso per caso', 'non richiede l’Azione principale',
                       'non provoca Reazioni dovute allo spostamento', 'visibile e realmente raggiungibile',
                       'natura dell’elemento']:
            self.assertIn(phrase, body)
        for obsolete in ['Chiarimento necessario', 'Rimane però da stabilire', 'trigger chiaro', 'prima di considerare definitivo']:
            self.assertNotIn(obsolete, body)

    def test_revisions_preserve_provenance_while_removing_both_entire_obsolete_note_blocks(self):
        included = {int(k) for k in re.findall(r'data-frutti-source="(\d+)"', self.fruit)}
        for removed in list(range(274, 284)) + list(range(730, 739)):
            self.assertNotIn(removed, included)
        for retained in [269, 271, 273, 284, 723, 725, 726, 727, 729, 739]:
            self.assertIn(retained, included)
        self.assertEqual(len(included), 1293)

    def test_full_prestige_and_fruit_regeneration_is_repeatable_without_writes(self):
        tracked = ['manuale-prestigio/index.html', 'manuale-prestigio/reader.js', 'regole/prestigio-data.js',
                   'manuale-frutti/index.html', 'manuale-frutti/reader.js']
        before = {name: (ROOT / name).read_bytes() for name in tracked}
        for generator in ['prestigio-manuale.py', 'frutti-manuale.py']:
            result = subprocess.run(['python3', 'strumenti/' + generator, '--check'], cwd=ROOT,
                                    text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        self.assertEqual(before, {name: (ROOT / name).read_bytes() for name in tracked})


if __name__ == '__main__':
    unittest.main()
