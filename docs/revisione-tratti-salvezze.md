# Tratti Unici e Salvezze

Integrazione del 07/10/2026 di **GLC_Tratti_Unici_e_Sinergie_Documento_Ufficiale_v1.2.docx** e **GLC_Revisione_Salvezze_Patch_Editoriale_v1.1.docx**. Le revisioni precedenti del Costruttore e di Raffica restano incorporate. Le mappe di integrazione, l’audit editoriale e le note di probabilità dei documenti non sono riversati nelle regole del gioco.

## Tratti Unici

Il nuovo §16.9 del Manuale del Gioco contiene regole, tabella rapida e tutti i 31 Tratti per le 16 Skill. Sono aggiunti i richiami in §2.4, §2.8, §16.6 e §16.8 e negli indici web/stampa. I requisiti sbloccano automaticamente un Tratto, anche con Skill fuori Ruolo; acquisirlo richiede una normale scelta di Talento dell’Upgrade. I Tratti possono cumularsi, ma le Evoluzioni sostituiscono il beneficio precedente.

Fortezza Vivente richiede Corpo Mostruoso acquisito e sostituisce +2 DP con +4 DP. La formula razziale della DP rimane il valore base; i modificatori espliciti si applicano al valore finale. L’eccezione Ombra Perfetta/Tiro dall’Ombra, approvata espressamente nel documento, è indicata come norma per evitare che il divieto generale di sovrapposizione invalidi il catalogo.

Il Prestigio non concede nuovi Tratti ai Gradi intermedi. Entrambe le componenti della stessa Sinergia a Saikyō possono rendere disponibile un solo Tratto Unico di Prestigio, distinto dal quarto Talento di Ruolo. Il relativo catalogo non è ancora definito: non vengono inventati nuovi effetti o assegnati benefici automatici.

## Salvezze

| Fonte ordinaria | Soglia | Fonte di Prestigio | Soglia |
| --- | --- | --- | --- |
| d4 | 3 | d20+d4 | 13 |
| d6 | 4 | d20+d6 | 14 |
| d8 | 5 | d20+d8 | 15 |
| d10 | 6 | d20+d10 | 16 |
| d12 | 7 | d20+d12 | 17 |
| d20 | 11 | d20+d20 | 21 |

Tira soltanto il bersaglio, con il proprio Attributo completo; raggiungere la Soglia basta. Lo Stato stabilisce l’Attributo, la fonte determina la difficoltà. La Soglia originale resta fissata finché quella causa persiste. Soglie proprie, contese e procedure specifiche prevalgono.

Nel Manuale del Gioco sono allineati §1.4, Electro, Il Colpo Sfonda, Tossicologo, Trappola Meccanica, Stati, Controllo, Area, Prigione e Canzoni. Presa conserva la contesa di Forza anche quando applica Immobilizzato; Sanguinante non riceve una Salvezza automatica. La Trappola usa Meccanica alla preparazione per resistenza e fuga; ricerca e disinnesco restano Prove a Soglia 10. Le durate, i costi e i danni di Electro rimangono invariati. Punto di Rottura conserva le proprie regole e non riceve una nuova Salvezza.

Nel Prestigio Requiem usa la Soglia attuale di Arte, senza sommare lo strumento. Tossine Sovrane usa il massimo fra la Soglia propria del veleno e quella di Medicina, sostituendo il +2 di Tossine Raffinate; Nebbia eredita la Soglia effettiva. Gli Stati dei Talenti diretti usano la Skill governante, compreso il Prestigio.

Nei Frutti un effetto della Tecnica usa il Grado della Tecnica; Firma Paramecia e Condizioni salvabili di Ambiente Ostile usano il Dado del Frutto (d20 → 11), salvo regole specifiche. I rinvii importati indicano espressamente il Manuale del Gioco. Cyborg non richiede modifiche normative; le Prove di crafting restano invariate. Longbraccio/Lungagamba sono esclusi dalla conversione come richiesto: la loro eventuale rimozione è una patch separata.

## Gestionale e limiti

Sono aggiornati la funzione condivisa delle Soglie, il calcolo degli strumenti e le descrizioni/repliche pertinenti nei riepiloghi, nella Plancia e nella stampa. Uno strumento superiore ad Arte usa il Grado di Arte, conservando il proprio Grado registrato: Arte d8 con strumento d12 produce d8 e Soglia 5. La voce d4 produce Soglia 3. Le copie personalizzate dei PNG già salvate non vengono sovrascritte.

Questa integrazione dei Tratti è editoriale: non introduce nel gestionale una nuova schermata di acquisizione né bonus automatici alla scheda. Il gestionale non risolve automaticamente Salvezze o Stati; la Soglia propria dei veleni e quella congelata delle trappole restano da registrare e applicare al tavolo. Il restante Costruttore interattivo conserva le discrepanze delle patch precedenti già documentate (catalogo, slot, durate e profili): l’adeguamento completo di quella funzionalità resta separato.

## Verifiche e conservazione

- 16 controlli editoriali Python superati: corrispondenza regole/tabelle/fonti, catalogo e acquisizione, eccezioni, importazioni, rimandi e conservazione delle precedenti revisioni.
- Verificata la riproducibilità delle sezioni consolidate; il generatore inserisce §16.9 dopo §16.8 anche se manca nel DOCX originale, senza consumare il capitolo successivo. Il documento completo originario non è disponibile, quindi il generatore del base non è eseguito integralmente.
- Prestigio e Frutti rigenerati con copertura integrale delle fonti corrette; le fonti originali restano intatte.
- Controllo indipendente dei 31 dettagli contro il DOCX e del testo delle sezioni migrate contro la versione precedente: nessuna perdita di regole, incluse le Prove di crafting.
- Quattro manuali controllati a 1440 e 390 px: nessun errore JavaScript o overflow della pagina. Le tabelle lunghe scorrono sul telefono e in stampa usano la larghezza della pagina, ripetendo le intestazioni.
- 7/7 test delle Salvezze e del limite degli strumenti superati; le quattro suite app completano 72 test, con 70 successi e i 2 fallimenti preesistenti.
- PDF verificati: Base 250 pagine, Prestigio 61, Frutti 42 e Cyborg 25. Controllati presenza dei 31 Tratti, leggibilità di Stati/catalogo e ripetizione delle intestazioni tra pagine.
- Le suite app mantengono i due fallimenti preesistenti del catalogo Inventore: metadati di un Ruolo ritirato e conteggio 49/52. Sono estranei a questa revisione; i test pertinenti alle Salvezze sono superati.

Il backup precedente alla pubblicazione corrisponde al commit `21fc07a7d6a011b40ff1c319b6311ad14aba3358`, distribuito dal run GitHub Pages #148. Il repository completo è salvato in uno ZIP verificato e nel ramo remoto `backup/glc-prima-tratti-salvezze-20261007t142637z`.
