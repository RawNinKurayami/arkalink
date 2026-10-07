# Revisione di Raffica

Applicazione del 07/10/2026 del documento **GLC_Revisione_Raffica_Patch_Editoriale.docx**, edizione di lavoro del 06/10/2026. Le decisioni sono indicate come approvate nel documento. La precedente revisione del Costruttore rimane incorporata.

## Regole recepite

| Versione | Extra massimi | Costi dei singoli extra | Costo completo |
| --- | --- | --- | --- |
| Base | 1 | 1 ST | 1 ST |
| Migliorato | 2 | 1, 2 ST | 3 ST |
| Maestria | 3 | 1, 2, 3 ST | 6 ST |
| Senza Fine | Determinati dalla ST disponibile | 1, 2, 3, 4… ST | n(n+1)/2 ST per n extra |

L’attacco iniziale si risolve prima di attivare Raffica con l’unica Azione Bonus del turno. Gli extra ordinari sono sempre attacchi base a mani nude; Senza Fine ammette anche Tecniche offensive Striker in mischia. Ogni Tecnica extra paga integralmente i propri costi, oltre al costo progressivo di Raffica. Un mancato consuma la ST pagata e non interrompe la sequenza; il giocatore può fermarsi dopo qualsiasi extra. Le versioni non si sommano.

Il Colpo Sfonda si attiva al massimo una volta per turno. Pressione Costante, Guardia Rotta, Smash Hit e Potenza del Titano conservano le proprie regole.

Punto di Rottura conserva il legame già scritto con la Firma: sostituisce il suo stato e quindi condivide l’unica attivazione per turno. Il chiarimento esplicita la lettura conservativa del testo vigente; non costituisce un’ulteriore decisione approvata dall’autore e non introduce un effetto autonomo ripetibile. I 2 ST e lo slot dell’effetto restano dovuti secondo le regole della Tecnica, anche se l’attacco non soddisfa la condizione del colpo pulito. Una variante autonoma richiede una revisione esplicita.

## Manuali e riepiloghi

Aggiornati §4.2 del manuale base e Raffica Senza Fine, combinazioni e tabella costi del Prestigio. Corretto anche l’esempio Burning Combo di §6.4: prima l’attacco iniziale, poi Raffica, con costi 1 + 2 + 3 ST. Gli extra ordinari non ripetono la Tecnica.

Frutti e Cyborg non richiedono modifiche normative. I richiami nominali a Senza Fine nel Cyborg sono conservati.

Nel gestionale sono allineati le descrizioni di Raffica, la Firma, il selettore degli extra, i costi delle Special Move e i riepiloghi di Prestigio. Le repliche della Firma negli esempi Brick e Sett della Plancia seguono lo stesso limite. Le Tecniche extra conservano i filtri di compatibilità già presenti. Non viene aggiunto un potenziamento Saikyō specifico per Raffica Senza Fine.

Il costo della carta comprende l’attacco iniziale e gli extra: due extra con Tecnica da 2 ST costano 7 ST per la sequenza aggiuntiva, oppure 9 ST includendo l’attacco iniziale con la stessa Tecnica. Il gestionale non registra l’esito dei tiri: i mancati si risolvono al tavolo e non producono un azzeramento automatico della progressione.

Questo intervento adegua Raffica; il restante catalogo interattivo del Costruttore conserva la limitazione documentata nella precedente revisione.

## Verifiche e fonti

- **12/12 controlli editoriali superati**, compresi i controlli della precedente revisione, costi, Firma, Burning Combo, esempi del Prestigio e corrispondenza fra HTML e correzioni salvate.
- **6 controlli CJS pertinenti a Raffica superati**. Le tre suite coinvolte completano 65 test: 63 superati e gli stessi 2 fallimenti preesistenti sul catalogo Inventore, già documentati nella revisione precedente.
- La revisione indipendente verifica anche 540 combinazioni di costi con extra base/Tecnica, a Prestigio e Saikyō, senza nuove discrepanze.
- Il generatore di Prestigio completa copertura e confronto integrale del testo corretto. Le modifiche al base sono conservate nelle sezioni consolidate di `strumenti/manuale-correzioni.json`; le fonti originali restano intatte.
- Verificati i quattro manuali nel browser a 1440 e 390 px: nessun errore JavaScript o overflow della pagina. La progressione di Raffica scorre sullo schermo piccolo ed è accessibile da tastiera; in stampa usa la larghezza della pagina.

Il backup completo precedente alla pubblicazione corrisponde al commit `8d1ff003e5a6d8dd8eea22aa4e35b138634cbb72`, distribuito con successo dal run GitHub Pages #147. È conservato come ZIP nell’ambiente e sul ramo `backup/glc-prima-revisione-raffica-20261007t134334z`.
