# Musicista: costruttore, carte e stampa

Questa revisione applica il Manuale base §§4.11 e 7.12 e le evoluzioni musicali del Manuale del Prestigio. Il catalogo mantiene le 13 Melodie ufficiali, i loro Gradi minimi e una sola Melodia per Canzone.

## Regole condivise

Il costruttore, le Special Moves e le stampe usano un profilo musicale comune. Le Canzoni spendono l'Azione prevista e non effettuano un tiro per colpire. Le Salvezze ordinarie usano il Grado effettivo dello strumento, limitato da Arte; la voce rimane d4. Il Grado della Tecnica resta limitato dall'Attributo associato.

Le amplificazioni di Corde, Percussioni, Fiati e Mantice sono distinte dai Talenti acquisiti e dalle loro condizioni. Fiati modifica la portata ordinaria da 20 a 40 metri, senza raddoppiare arbitrariamente portate diverse. Coro richiede compagni coscienti che partecipino realmente. I costi e i benefici non vengono applicati due volte passando dal costruttore alla carta.

Le Canzoni Sostenute indicano mantenimento, Azione e condizioni di interruzione. Contrappunto modifica i requisiti previsti dai suoi livelli. Per Mantice viene indicata la gratuità dei primi due turni, senza inventare un registro di round. Le durate generiche delle Tecniche ad Area non sostituiscono le durate proprie delle Melodie.

Motivetto e Assolo mantengono i propri aumenti di costo nella scena. Il conteggio riguarda il contesto dichiarato della ricetta; non viene creato un registro globale dei beneficiari e non vengono consumate risorse durante la costruzione, la lettura o la stampa.

## Strumenti e dati precedenti

Le Canzoni possono essere costruite anche da un Musicista con un secondo Ruolo da Combattente, senza richiedere un'arma o un Modulo. I collegamenti storici vengono conservati come dati, senza trasformare la Canzone in un attacco dell'arma.

Gli strumenti ordinari hanno Grado da d4 a d20. I Gradi storici fuori scala rimangono registrati e segnalati; non concedono una progressione ordinaria di Prestigio. Gli esempi di strumenti particolari sono proposte da concordare con il GM. Nomi e note libere non attivano automaticamente effetti speciali.

ID, note, campi aggiuntivi e dati delle altre schede vengono conservati. Le stampe ricalcolano i profili musicali dai dati correnti anche quando il pacchetto di stampa precedente è obsoleto.

## Backup e verifiche

Backup prima delle modifiche: commit `e0b9d502e80f8dc35ad7abed15c5e204923d26a6`, ramo remoto `backup/glc-prima-musicista-20261008t073319z`. Archivio completo di 411 file, CRC verificato; SHA-256 `dae97db58c00879eea60c78d4ff7ecb544c28d7609944af1568bef50521fa926`.

Verifiche locali completate: 358 test Node, 38 test Python e 73 scenari normativi indipendenti, tutti riusciti. Le prove browser musicali coprono desktop a 1440 px e telefono a 375 e 390 px: 330 controlli, inclusi salvataggio, esportazione, stampa semplice e illustrata, cambio strumento nelle carte, perdita e riacquisizione dei Talenti, caricamento degli strumenti storici malformati e aggiornamento dei pacchetti di stampa. Passano anche le 320 regressioni browser del gestionale, del Cyborg e delle Special Moves.

Durante le prove su telefono è stata corretta la crescita della colonna del dossier che rendeva irraggiungibili le Azioni. Le registrazioni storiche malformate degli strumenti non bloccano più l'apertura delle carte: restano conservate e inutilizzabili, mentre gli ID degli strumenti validi vengono salvati atomicamente.

Log, esportazioni sintetiche, PDF e manifest sono conservati in `/workspace/shared/glc-musicista-sync/`. La pubblicazione viene verificata sul commit esatto tramite GitHub Pages e il confronto degli asset pubblici; il proxy dell'ambiente non consente il controllo HTTP diretto del dominio del sito.
