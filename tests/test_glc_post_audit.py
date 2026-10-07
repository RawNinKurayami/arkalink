"""Approved post-audit rules, checked against the published manuals."""
import hashlib
import unittest

from test_glc_manuali import Document, ROOT, norm, tables, text


class PostAuditManuals(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = Document('manuale/index.html')
        cls.prestige = Document('manuale-prestigio/index.html')
        cls.fruit = Document('manuale-frutti/index.html')

    def test_seven_races_and_renumbered_navigation(self):
        content = self.base.root.text().lower()
        for removed in ['longbraccio', 'longbraccia', 'lungagamba', 'portata estesa', 'calcio colossale']:
            self.assertNotIn(removed, content)
        self.assertIn('le sette razze', content)
        for identifier, title in [('sez-3-7', 'cyborg'), ('sez-3-8', 'tontatta')]:
            heading = next(n for n in self.base.nodes if n.attrs.get('id') == identifier)
            self.assertIn(title, heading.text().lower())
        self.assertFalse(any(n.attrs.get('id') in {'sez-3-9', 'sez-3-10'} for n in self.base.nodes))

    def test_defense_uses_complete_prestige_attribute(self):
        expected = ['25', '27', '29', '31', '33', '41']
        for document, section in [(self.base, 'sez-6-8'), (self.prestige, 'introduzione-la-crescita-oltre-il-d20')]:
            candidates = list(tables(document.section(section)))
            self.assertTrue(any([r[-1] for r in rows[-6:]] == expected for rows in candidates), section)
            rule = norm(text(document.section(section))).lower()
            self.assertIn('valori massimi', rule)
            self.assertIn('non si effettua', rule)
        defense = norm(text(self.base.section('sez-6-8')))
        for phrase in ['Corpo Mostruoso', 'Fortezza Vivente', '29', '31', '33']:
            self.assertIn(phrase, defense)

    def test_striker_signature_distinguishes_basic_and_technique_source(self):
        signature = norm(text(self.base.section('sez-4-2'))).lower()
        for phrase in ['attacco base a mani nude', 'skill di ruolo', 'tecnica offensiva striker', 'grado della tecnica', '1 volta per turno']:
            self.assertIn(phrase, signature)
        general = norm(text(self.base.section('sez-1-4'))).lower()
        self.assertIn('prevale quella regola specifica', general)
        self.assertIn('il colpo sfonda', general)

    def test_tontatta_grapple_penalty_applies_to_holders_escape_contest(self):
        rule = norm(text(self.base.section('sez-3-8'))).lower()
        for phrase in ['+3 al risultato', "dell'avversario", 'liberarsi', 'non modifica il tiro iniziale', '9', '7', '10']:
            self.assertIn(phrase, rule)
        self.assertNotIn('soglia per liberarsi', rule)

    def test_smash_hit_uses_chosen_role_skill_and_remains_one_combo(self):
        rule = norm(text(self.base.section('sez-4-2'))).lower()
        for phrase in ['attributo + skill di ruolo dello striker', 'atletica oppure acrobazia', 'stessa skill', 'quattro tiri', 'una sola volta al termine', 'non può scegliere liberamente', '6d20', 'non attivano pressione costante, guardia rotta o il colpo sfonda']:
            self.assertIn(phrase, rule)

    def test_trait_is_renamed_without_renaming_archeologist_talent(self):
        trait = norm(text(self.base.section('sez-16-9')))
        self.assertIn('Connessione Storica', trait)
        self.assertNotIn('Memoria del Mondo', trait)
        self.assertIn('Memoria del Mondo', self.base.root.text())
        self.assertIn('informazioni che il personaggio conosce già', trait)

    def test_ryou_doubles_total_once_and_preserves_normal_defenses(self):
        rule = norm(text(self.base.section('sez-8-7'))).lower()
        for phrase in ['danno totale', '×2', 'una sola volta', 'difesa passiva', 'difesa attiva', 'riduzione del danno']:
            self.assertIn(phrase, rule)
        prestige = norm(self.prestige.root.text()).lower()
        self.assertNotIn('raddoppia la componente di danno interno', prestige)
        self.assertNotIn('componente interna potenziata dal ryou', prestige)
        for phrase in ['danno totale', 'un solo attacco fisico', 'prima di effettuare il tiro', 'mancato consuma', 'non si applica automaticamente a ogni colpo di una raffica']:
            self.assertIn(phrase, prestige)

    def test_fruit_form_is_defined_by_official_custom_guidelines(self):
        rule = norm(self.fruit.root.text()).lower()
        self.assertNotIn('non dovrebbe essere considerato chiuso', rule)
        self.assertNotIn('serve una tabella standard', rule)
        self.assertIn('definiti insieme al gm', rule)
        self.assertIn('forma di combattimento non è una tecnica', rule)

    def test_reforming_has_flexible_perceptible_event_trigger(self):
        for content in [self.fruit.root.text(), text(self.base.section('sez-9-8'))]:
            rule = norm(content).lower()
            for phrase in ['evento immediato e percepibile', 'non possiede un singolo trigger universale', '15 metri', 'grado d10', 'realmente raggiungibile', 'crollo', 'movimento ostile']:
                self.assertTrue(phrase in rule, 'Riformarsi Altrove: ' + phrase)

    def test_editorial_cleanup_preserves_single_enhancement_heading(self):
        self.assertNotIn('**', (ROOT / 'manuale/index.html').read_text())
        headings = [norm(n.text()).lower() for n in self.base.nodes if n.tag in {'h3', 'h4'}]
        self.assertEqual(sum(s == '7.8.5 · potenziamento' for s in headings), 1)
        striker = norm(text(self.base.section('sez-4-2'))).lower()
        self.assertIn('il danno viene comunque subito normalmente', striker)
        self.assertNotIn('scontrose', striker)
        self.assertNotIn('vantaggio.ogni', striker)

    def test_cyborg_manual_is_byte_identical_to_pre_patch_backup(self):
        self.assertEqual(hashlib.sha256((ROOT / 'manuale-cyborg/index.html').read_bytes()).hexdigest(),
                         '722f196ba4666ddc06a0990fcd3f0d158e52b9b25e0d368030840792fa7e4710')


if __name__ == '__main__':
    unittest.main()
