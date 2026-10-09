#!/usr/bin/env python3
"""Generate the blank A4 player sheets linked by the Devil Fruit manual.

Requires reportlab. No character data, network, browser or storage is read.
Run from any directory: python3 strumenti/scheda-frutto-pdf.py
The layout is vector-based and uses PDF standard fonts; no external assets.
"""
from pathlib import Path
import argparse
import math

from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = Path(__file__).resolve().parents[1]
W, H = A4
M = 39
CW = W - M * 2
GAP = 14
HALF = (CW - GAP) / 2
INK = HexColor('#22212a')
GOLD = HexColor('#80612e')
MUTED = HexColor('#5a5961')
RULE = HexColor('#c6c2b8')
PALE = HexColor('#f5f2eb')
WHITE = HexColor('#ffffff')


def wrap(text, width, font='Helvetica', size=8):
    lines = []
    for para in text.split('\n'):
        line = ''
        for word in para.split():
            assert stringWidth(word, font, size) <= width, ('word too wide', word)
            trial = (line + ' ' + word).strip()
            if line and stringWidth(trial, font, size) > width:
                lines.append(line)
                line = word
            else:
                line = trial
        lines.append(line)
    return lines


class Sheet:
    def __init__(self, path, kind):
        self.c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1, invariant=1)
        self.c.setTitle('Scheda del Frutto del Diavolo - ' + kind)
        self.c.setAuthor('Grand Line Chronicles')
        self.c.setSubject('Scheda A4 vuota per il giocatore. Manuale dei Frutti del Diavolo.')
        self.kind, self.page = kind, 0

    def text(self, x, y, value, font='Helvetica', size=9, color=INK):
        assert M - 1 <= x and x + stringWidth(value, font, size) <= W - M + 1, ('text outside margins', value)
        assert 20 <= y <= H - 25, ('text outside page', value, y)
        self.c.setFillColor(color)
        self.c.setFont(font, size)
        self.c.drawString(x, H - y, value)

    def para(self, x, y, value, width, size=8.2, color=MUTED, leading=11):
        for line in wrap(value, width, size=size):
            self.text(x, y, line, size=size, color=color)
            y += leading
        return y

    def line(self, x1, y1, x2, y2, color=RULE, width=.45):
        self.c.setStrokeColor(color)
        self.c.setLineWidth(width)
        self.c.line(x1, H - y1, x2, H - y2)

    def rect(self, x, y, w, h, fill=PALE, stroke=None):
        self.c.setFillColor(fill)
        self.c.setStrokeColor(stroke or fill)
        self.c.setLineWidth(.6)
        self.c.rect(x, H - y - h, w, h, stroke=bool(stroke), fill=1)

    def seal(self):
        # A small original spiral/leaf emblem: vector ornament, no bitmap ink slab.
        cx, cy = W - M - 25, H - 61
        self.c.setStrokeColor(GOLD)
        self.c.setLineWidth(.7)
        self.c.circle(cx, cy, 23, stroke=1, fill=0)
        self.c.circle(cx, cy, 19, stroke=1, fill=0)
        p = self.c.beginPath()
        for i in range(100):
            a = i * .115
            r = 1 + i * .125
            px, py = cx + math.cos(a) * r, cy + math.sin(a) * r
            if i == 0:
                p.moveTo(px, py)
            else:
                p.lineTo(px, py)
        self.c.drawPath(p)
        p = self.c.beginPath()
        p.moveTo(cx + 1, cy + 13)
        p.curveTo(cx + 3, cy + 20, cx + 11, cy + 18, cx + 10, cy + 13)
        p.curveTo(cx + 8, cy + 10, cx + 4, cy + 13, cx + 1, cy + 13)
        self.c.drawPath(p)

    def start(self, title, subtitle, ref):
        self.page += 1
        self.text(M, 34, 'GRAND LINE CHRONICLES', 'Helvetica-Bold', 9, GOLD)
        self.text(M, 53, 'FRUTTI DEL DIAVOLO  /  ' + self.kind.upper(), size=8, color=MUTED)
        self.text(M, 83, title, 'Times-Bold', 28)
        self.text(M, 101, subtitle, size=8.5, color=MUTED)
        self.seal()
        self.line(M, 113, W - M, 113, GOLD, 1)
        self.line(M, H - 43, W - M, H - 43, GOLD, .7)
        self.text(M, H - 29, 'MANUALE DEI FRUTTI  /  ' + ref, size=7.3, color=MUTED)
        page = f'{self.page:02d} / 05'
        self.text(W - M - stringWidth(page, 'Helvetica-Bold', 8), H - 29, page, 'Helvetica-Bold', 8, GOLD)

    def finish(self):
        self.c.showPage()

    def field(self, x, y, w, h, title, hint='', tint=False):
        assert y >= 121 and y + h <= H - 57, ('field outside body', title, y + h)
        if tint:
            self.rect(x, y, w, h)
        pad = 10 if tint else 0
        tx, tw = x + pad, w - pad * 2
        self.text(tx, y + 13, title.upper(), 'Helvetica-Bold', 8.2, GOLD)
        start = y + 24
        if hint:
            start = self.para(tx, start, hint, tw, size=7.5, leading=10) + 3
        last = y + h - 8
        # Rules spaced for handwriting; bottom line always leaves a safe margin.
        positions = []
        pos = start + 9 if hint else y + min(35, h - 8)
        while pos <= last + .1:
            positions.append(pos)
            pos += 20
        assert positions, ('no writing room', title, h, start)
        for pos in positions:
            self.line(tx, pos, tx + tw, pos)

    def pair(self, y, h, left, right):
        self.field(M, y, HALF, h, *left)
        self.field(M + HALF + GAP, y, HALF, h, *right)

    def note(self, y, text, h=42):
        assert y + h <= H - 56
        self.rect(M, y, CW, h)
        self.line(M, y, M, y + h, GOLD, 2)
        end = self.para(M + 11, y + 14, text, CW - 22, size=8, leading=11)
        assert end <= y + h + 2, ('note too long', text, end)

    def check(self, x, y, text, size=8):
        self.c.setStrokeColor(MUTED)
        self.c.setLineWidth(.6)
        self.c.rect(x, H - y - 1, 7, 7, stroke=1, fill=0)
        self.text(x + 12, y, text, size=size)

    def name(self):
        self.field(M, 126, CW, 39, 'Frutto / personaggio')

    def table(self, y, cols, rows, row_h):
        assert abs(sum(w for _, w in cols) - CW) < .1
        self.rect(M, y, CW, 25)
        x = M
        for label, w in cols:
            for j, line in enumerate(wrap(label, w - 12, 'Helvetica-Bold', 7.3)):
                self.text(x + 6, y + 12 + j * 8, line, 'Helvetica-Bold', 7.3, GOLD)
            x += w
        bottom = y + 25 + rows * row_h
        assert bottom <= H - 57
        for i in range(rows + 1):
            self.line(M, y + 25 + i * row_h, M + CW, y + 25 + i * row_h)
        x = M
        for _, w in cols[:-1]:
            x += w
            self.line(x, y + 25, x, bottom, color=RULE, width=.35)

    def identity(self):
        self.start('Identità del Frutto', 'Definisci il potere insieme al GM. Compila questa parte fin dall’acquisizione.', '§§ 1.1, 1.4, 2.1')
        self.pair(126, 43, ('Personaggio / giocatore',), ('Campagna / GM',))
        self.field(M, 178, 330, 45, 'Nome del Frutto')
        self.text(M + 344, 191, 'DADO DEL FRUTTO', 'Helvetica-Bold', 8.2, GOLD)
        for i, die in enumerate(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']):
            self.check(M + 344 + (i % 3) * 55, 209 + (i // 3) * 21, die)
        self.field(M, 242, CW, 87, 'Nucleo del Potere', 'Una frase precisa: che cosa permette di fare?', tint=True)
        self.field(M, 341, CW, 65, 'Materia / Fenomeno / Creatura')
        self.field(M, 417, CW, 103, 'Applicazioni iniziali', 'Gli utilizzi già possibili; non tutte le applicazioni teoriche del concetto.')
        self.pair(531, 97, ('Origine del potere', 'Da dove si manifesta?'), ('Bersagli validi', 'Sé stesso, creature, oggetti, ambiente…'))
        self.pair(640, 83, ('Tratto del Frutto', 'Nome e riferimento al manuale.'), ('Firma del Frutto', 'Condizione ed effetto.'))
        self.note(739, 'L’Identità definisce possibilità e limiti. Non assegna automaticamente bonus, danni, Stati o effetti delle Tecniche.', 41)
        self.finish()

    def boundaries(self):
        self.start('I confini del potere', 'Descrivi valori e condizioni reali. Durata e permanenza sono due cose diverse.', '§§ 2.1, 2.4-2.8')
        self.name()
        self.pair(180, 79, ('Portata ordinaria', 'Distanza di controllo normale.'), ('Quantità ordinaria', 'Materia, superficie o numero di elementi.'))
        self.pair(270, 79, ('Durata ordinaria', 'Quanto dura l’effetto naturale?'), ('Precisione del controllo', 'Quanto finemente puoi manipolarlo?'))
        self.pair(360, 99, ('Interazione con esseri viventi', 'Se e come puoi modificare un corpo vivente.'), ('Permanenza', 'Cosa resta quando termina il controllo?'))
        self.pair(470, 172, ('Limitazioni strutturali', 'Cosa non puoi fare; condizioni necessarie.'), ('Contraccolpi naturali', 'Conseguenze sul corpo dell’utilizzatore.'))
        self.field(M, 654, CW, 67, 'Accordi e revisioni', 'Data e cambiamenti concordati al tavolo.')
        self.note(735, 'Senza Contraccolpo riguarda i contraccolpi previsti: non cancella limitazioni, requisiti o debolezze del Frutto. Mare, Pietra di Mare e Haki conservano le rispettive regole.', 45)
        self.finish()

    def repertoire(self):
        self.start('Capacità acquisite', 'Registra ciò che possiedi davvero, con costi, condizioni e limiti d’uso.', '§§ 1.4-1.6; capp. 4, 7, 8')
        self.name()
        self.text(M, 187, '01  /  TALENTI ACQUISITI', 'Helvetica-Bold', 9, GOLD)
        self.table(199, [('Talento', 148), ('Grado\nrichiesto', 47), ('Attivazione', 69), ('Costo', 49), ('Effetto / limiti / riferimento', CW - 313)], 5, 40)
        self.text(M, 449, '02  /  TECNICHE DEL FRUTTO', 'Helvetica-Bold', 9, GOLD)
        self.table(461, [('Tecnica', 155), ('Attributo', 73), ('Grado', 44), ('Costo ST', 54), ('Effetti / riferimento alla Tecnica', CW - 326)], 4, 39)
        self.field(M, 656, CW, 65, 'Scelte permanenti dei Talenti', 'Per esempio potere scelto, applicazione, Retaggio o opzione concordata.')
        self.note(735, 'Il Dado del Frutto cresce per decisione del GM, senza P.A. Un Talento disponibile richiede acquisizione. Ogni Tecnica rispetta sia il Dado del Frutto sia l’Attributo utilizzato.', 45)
        self.finish()

    def combat_form(self):
        self.start('Forma di Combattimento', 'PARAMECIA  /  Progetto personale del Talento d12.', 'cap. 5')
        self.name()
        self.check(M, 188, 'Progetto concordato con il GM')
        self.check(M + 270, 188, 'Talento acquisito')
        self.field(M, 204, CW, 49, 'Nome della Forma')
        self.field(M, 265, CW, 101, 'Manifestazione', 'Che cosa cambia nel corpo o nell’aspetto?')
        self.field(M, 378, CW, 121, 'Beneficio', 'Vantaggio concreto e principalmente personale, definito prima dell’uso.', tint=True)
        third = (CW - GAP * 2) / 3
        self.field(M, 511, third, 78, 'Costo di attivazione', 'ST concordate.')
        self.field(M + third + GAP, 511, third, 78, 'Mantenimento', 'ST e periodicità.')
        self.field(M + (third + GAP) * 2, 511, third, 78, 'Durata', 'Condizioni di termine.')
        self.field(M, 601, CW, 110, 'Limitazioni', 'Requisiti, vincoli e conseguenze concordati.')
        self.note(727, 'Attivazione: Azione Bonus. Il beneficio è fisso; le Tecniche si pagano normalmente. Senza il mantenimento previsto, la Forma termina. Progettare la Forma non equivale ad acquisire il Talento.', 53)
        self.finish()

    def awakening(self):
        self.start('Il Risveglio', 'PROGETTO  /  Dado del Frutto d20, Ambizione e permesso del GM.', '§ 6.11; § 7.6; § 8.8')
        self.pair(126, 46, ('Nome del Risveglio',), ('Ambizione / accordo con il GM',))
        manifestation = 'Manifestazione / Forma Definitiva' if self.kind == 'Zoan' else 'Manifestazione'
        self.pair(182, 90, ('Principio Risvegliato', 'Come si sviluppa il nucleo del potere?'), (manifestation, 'Che cosa appare o si trasforma?'))
        self.text(M, 294, 'FAMIGLIE COINVOLTE', 'Helvetica-Bold', 8.2, GOLD)
        for i, label in enumerate(['Origine', 'Costi / Sconti', 'Espansione', 'Dominio', 'Difesa', 'Attacco', 'Controllo']):
            self.check(M + (i % 4) * 130, 313 + (i // 4) * 18, label, 7.6)
        self.text(M + 145, 294, 'Descrivono il progetto: non assegnano bonus.', size=7.2, color=MUTED)
        hint = 'Effetti concreti e fissi; nessun cambiamento libero a ogni attivazione.'
        title = 'Benefici concordati'
        if self.kind == 'Zoan':
            title = 'Caratteristica Dominante / beneficio concordato'
            hint = 'Base: 1d10 PV a inizio turno, fino ai PV massimi; +2 Dadi Danno con corpo/Armi Naturali; non Stordito né Sbilanciato.'
        self.field(M, 347, CW, 102, title, hint, tint=True)
        self.pair(460, 57, ('Area / Portata',), ('Bersagli validi',))
        self.pair(528, 57, ('Creature viventi',), ('Permanenza',))
        self.pair(596, 75, ('Limiti superati',), ('Limiti mantenuti',))
        self.field(M, 682, CW, 46, 'Prezzo / condizioni aggiuntive concordate')
        price = 'Durata normale: 1 scena. Al termine: ST 0 e Frutto inutilizzabile fino al Riposo Lungo.'
        if self.kind == 'Zoan':
            price = 'Durata normale: 1 scena. Al termine: ST 0 e trasformazioni Zoan indisponibili fino al Riposo Lungo.'
        self.note(740, price + ' Terminare prima non evita il prezzo. Il progetto deve essere definito prima dell’acquisizione.', 40)
        self.finish()

    def logia_environment(self):
        self.start('Il mondo diventa elemento', 'LOGIA RISVEGLIATO  /  Completa questa pagina insieme al progetto del Risveglio.', '§ 7.6')
        self.name()
        self.field(M, 181, CW, 100, 'Saturazione Elementale', 'Elemento, luogo, intensità, estensione e rapporto con l’ambiente.', tint=True)
        self.text(M, 305, 'AMBIENTE OSTILE', 'Helvetica-Bold', 10, GOLD)
        self.para(M, 322, 'Le condizioni sono stabilite nel progetto. Specifica sempre come si applicano e come si superano.', CW, size=8)
        for j, y in enumerate([347, 532], 1):
            self.text(M, y, f'CONDIZIONE {j:02d}', 'Helvetica-Bold', 8, GOLD)
            self.pair(y + 10, 74, ('Condizione / conseguenza',), ('Circostanze di applicazione',))
            self.pair(y + 87, 75, ('Quando viene verificata',), ('Come si rimuove o supera',))
        self.note(728, 'Le condizioni non producono danni universali automatici. Per gli Stati con Salvezza ordinaria, la Soglia deriva dal Dado del Frutto: d20 = 11. Le procedure specifiche prevalgono.', 52)
        self.finish()

    def creature(self):
        self.start('La creatura interiore', 'ZOAN  /  Anatomia, forme e capacità naturali: definiscile insieme al GM.', '§§ 8.1-8.5')
        self.name()
        self.field(M, 180, HALF, 49, 'Specie')
        self.text(M + HALF + GAP, 193, 'CATEGORIA', 'Helvetica-Bold', 8.2, GOLD)
        for i, label in enumerate(['Ordinario', 'Ancestrale', 'Mitologico']):
            self.check(M + HALF + GAP + i * 84, 214, label, 7.2)
        self.pair(240, 75, ('Stazza Bestiale',), ('Anatomia',))
        self.pair(326, 75, ('Modalità di movimento',), ('Sensi caratteristici',))
        self.pair(412, 91, ('Capacità naturali',), ('Retaggio', 'Per Zoan Ancestrali o Mitologici.'))
        self.field(M, 514, CW, 70, 'Forme: Umana / Ibrida / Bestiale', 'Descrizione e capacità effettivamente utilizzabili in ciascuna forma.')
        self.text(M, 608, 'ARMI NATURALI  /  RICHIEDONO ARTIGLI E ZANNE', 'Helvetica-Bold', 8.5, GOLD)
        self.table(620, [('Nome / parte anatomica', 130), ('Forma', 62), ('Tipo', 74), ('Grado', 47), ('Attributo', 80), ('Portata', CW - 393)], 2, 35)
        self.note(732, 'Grado dell’Arma Naturale = Dado del Frutto; non occupa l’Arsenale. Rispetta Attributo e forma appropriati. L’anatomia non concede da sola bonus, Tecniche o Talenti di Stile.', 48)
        self.finish()

    def save(self):
        assert self.page == 5
        self.c.save()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'manuale-frutti' / 'schede')
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for kind in ['Paramecia', 'Logia', 'Zoan']:
        path = args.output_dir / f'frutto-{kind.lower()}.pdf'
        s = Sheet(path, kind)
        s.identity()
        s.boundaries()
        s.repertoire()
        if kind == 'Paramecia':
            s.combat_form()
            s.awakening()
        elif kind == 'Logia':
            s.awakening()
            s.logia_environment()
        else:
            s.creature()
            s.awakening()
        s.save()
        print(f'{path.name}: 5 pagine A4, {path.stat().st_size:,} byte')


if __name__ == '__main__':
    main()
