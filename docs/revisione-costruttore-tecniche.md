# Revisione del Costruttore di Tecniche GLC

Applicazione del 07/10/2026 del documento **GLC_Revisione_Costruttore_Tecniche_Patch_Editoriale.docx**, edizione di lavoro del 06/10/2026, ai quattro manuali correnti di `arkalink`.

## Decisioni recepite

Il creatore ha approvato la progressione di Guardia proposta nel documento e ha scelto **0 slot Effetto per d4 e d6**.

Nel controllo finale ha ribadito che le Tecniche personalizzate non superano d20. Il requisito «d20+» della durata per la scena è quindi riallineato a **d20**, senza introdurre una progressione di Prestigio delle Tecniche.

| Grado della Tecnica | Guardia | Costo | Bonus DP |
| --- | --- | --- | --- |
| d8 | Base | 1 ST | +2 |
| d10 | Migliorata | 2 ST | +3 |
| d12 | Maestria | 3 ST | +4 |
| d20 | Suprema | 4 ST | +5 |

Guardia dura fino all’inizio del prossimo turno. Le versioni superiori sostituiscono le precedenti; bonus e costi non si sommano.

Gli effetti che mantengono un requisito minimo d6 richiedono comunque uno slot disponibile. Nel catalogo ordinario diventano quindi utilizzabili normalmente dal d8. Le sagome non occupano slot, ma conservano il proprio Grado, costo e permesso della Fonte. Le eccezioni dei Talenti devono essere espresse.

## Manuali aggiornati

| Manuale | Interventi |
| --- | --- |
| Base | Difesa Attiva e tre Contraccolpi; schede dei quattro Stili; Fonti, Forme, slot, catalogo, Aree, Zone e durata; Urto del Porto; Anticipo; accesso speciale dei Frutti. |
| Prestigio | Proiezione Colossale, Scatto/Balzo, Onda Titanica, Fendente Sovrano, Onda Sismica, combinazioni, riepilogo dei costi e Anticipo Superiore. |
| Frutti del Diavolo | Regole generali importate dal base; Portata, permanenza, Occhio del Ciclone/Nessuno dei Miei e Portata Naturale. La sezione sulla permanenza è attualmente §2.6. |
| Cyborg | Limiti delle Fasce e Controllo: capacità materiale, effetti della Tecnica e Funzioni/Effetti Speciali restano distinti. |

Il catalogo ordinario contiene **17 voci**. Le schede degli Stili e le tabelle concordano: Striker 9, Swordsman 8, Sniper 5, Crusher 9, contando Area Ravvicinata per Swordsman e Crusher.

Proiezione costa 1 ST, Schianto 2 ST: Urto del Porto costa 3 ST e occupa 2 slot. Presa richiede 1 ST all’applicazione e all’inizio di ogni turno successivo in cui viene mantenuta. Furia applica DP −1; Mira concede Vantaggio al tiro per colpire.

La Difesa Attiva con Tecnica viene dichiarata prima del tiro avversario, consuma Reazione e costi immediati, difende con un pareggio e non rimborsa ST dopo un fallimento. Contraccolpo infligge il normale Dado Danno soltanto superando il tiro avversario. Riposta conserva il proprio attacco separato dopo una Difesa Attiva riuscita: anche un pareggio può attivarla, ma non produce il danno di Contraccolpo.

Area Ravvicinata è d8/2 ST, senza slot per la sagoma, centrata sul personaggio e con raggio pari alla Portata effettiva dell’arma. Non riceve Gittata e Fendente Sovrano non la proietta a distanza. Aree speciali e onde di Prestigio mantengono i propri profili; non moltiplicano le origini degli impatti. Accecante, Terrore, Paralisi, Sopore, Attrazione e Barriera restano soltanto profili per Fonti che li autorizzano.

Parata con arma, Colpo Pesante del Crusher, Slancio dello Striker, Tossicologo, tossine e sovraccarichi dei Moduli sono conservati. Raffica e sistema delle Salvezze non ricevono le modifiche ipotetiche escluse dal documento.

## Controlli

- `python3 -m unittest discover -s tests -p 'test_glc_manuali.py' -v`: **9/9 controlli editoriali superati**, comprese corrispondenza tra cataloghi e Stili, costi/esempi, importazione del Frutto, Contraccolpo, Aree, durata entro d20, conservazione delle capacità omonime, riproduzione delle sezioni dalle correzioni e ancore degli indici.
- I tre generatori di Prestigio, Frutti e Cyborg completano i controlli di copertura e di testo delle fonti corrette.
- `node --test tests/glc-*.test.cjs`: **90/92**, identico risultato prima e dopo la revisione. I due errori preesistenti sono in `glc-prestigio-presentazione.test.cjs:78` e `glc-prestigio.test.cjs:14`: il percorso Inventore è ancora nei metadati di Prestigio ma è stato rimosso dai Ruoli, e il test delle descrizioni attende 52 voci mentre ne raggiunge 49. Nessun nuovo errore nella suite.
- I quattro manuali si aprono nel browser a 1440 e 390 px senza errori JavaScript o overflow della pagina. Le tabelle del catalogo hanno colonne leggibili e scorrimento orizzontale, anche da tastiera. La verifica locale usa i font di fallback, con le richieste esterne disabilitate.
- Sono state esportate copie PDF per revisione: Base 243 pagine, Prestigio 59, Frutti 41, Cyborg 25. Le tabelle del catalogo e di Guardia occupano la larghezza della pagina in stampa; sono stati verificati il testo estratto e una pagina del catalogo renderizzata dal PDF.

Questo controllo verifica coerenza editoriale e rimandi. Il bilanciamento della progressione di Guardia richiede utilizzo al tavolo.

## Fonti e rigenerazione

Le modifiche sono conservate in `strumenti/manuale-correzioni.json` e nei tre file `regole/*-revisioni.json`; gli snapshot originali `*-fonti.json` sono conservati. `prestigio-data.js` viene rigenerato e i riepiloghi di Prestigio coinvolti sono aggiornati.

Il DOCX originale del manuale base non è disponibile nel checkout. Le 15 sezioni consolidate dalla revisione sono confrontate automaticamente con il testo HTML; le sostituzioni minori sono registrate e verificate. Una rigenerazione completa del base dal vecchio DOCX richiede prima il recupero delle altre revisioni già presenti soltanto nell’HTML, come documentato nella nota `attenzione` delle correzioni.

Il Costruttore interattivo dell’app conserva il precedente catalogo: il suo adeguamento funzionale è un intervento separato da questa revisione dei manuali.

## Esito del controllo

La contraddizione preesistente di §7.13 è risolta: la durata «Tutta la scena» delle Aree autorizzate richiede d20, e le Tecniche personalizzate restano entro d20. Il testo chiarisce che questa opzione non sostituisce le durate specifiche di Guardia, Furia e Mira né il mantenimento per turno di Presa. Non sono emerse altre contraddizioni nelle regole e nei rimandi coinvolti dalla revisione.
