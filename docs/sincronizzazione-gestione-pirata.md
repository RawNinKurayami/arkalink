# Gestione del pirata, Costruttore e Tratti Unici

Il gestionale applica i manuali pubblicati dopo le revisioni del Costruttore,
di Raffica, dei Tratti Unici e delle Salvezze. Il controllo comprende i
cataloghi dei Talenti, i prerequisiti, le Special Moves e le due stampe.

## Tecniche

`regole/tecniche.js` valida lo stesso profilo nel Costruttore e nelle Special
Moves. Gli effetti ordinari sono i 17 del manuale, con le liste per Striker,
Swordsman, Crusher e Sniper. Gli ultimi tre richiedono un'arma compatibile
presente in scheda e il collegamento all'arma effettivamente utilizzata.
Un Modulo-Arma integrato compatibile segue le stesse condizioni fisiche:
si veda [la sincronizzazione Cyborg](sincronizzazione-cyborg.md).
I due modi delle armi ad asta mantengono le rispettive compatibilità.
L'arma registra Forza oppure Tecnica e un Grado fisico da d4 a d20: il
pirata deve possedere quell'Attributo almeno al Grado dell'arma. Il Grado
fisico dell'arma non diventa un limite aggiuntivo al Grado della Tecnica.

Le Tecniche Custom hanno massimo d20, limite dell'Attributo e, per i Frutti,
del Dado del Frutto. Gli slot sono 0/0/2/2/3/4. Il costo deriva dagli effetti
e dalla durata; un profilo senza effetti non ha un costo ST inventato.
Guardia usa le quattro versioni approvate, che si sostituiscono. Presa
conserva la contesa di Forza e il mantenimento; Lacerazione non introduce
una Salvezza. Area Ravvicinata è centrata sull'utilizzatore e usa la portata
dell'arma, senza diventare un'Area a distanza.

Frutti, equipaggiamento e altre Fonti speciali richiedono concessioni
puntuali: il profilo registra quali effetti sono concessi e il riferimento
alla Scheda o all'accordo con il GM. Il nome della Fonte non concede da solo
tutto il catalogo. Sconti e Sblocchi scritti in testo libero restano regole
da applicare al tavolo: il software non inventa quantità o deroghe.
Una Fonte Frutto autorizzata è disponibile anche a Ruoli diversi dal
Combattente; la Fonte Stile segue invece lo Stile posseduto, con le Melodie
riservate al Musicista.

I profili precedenti restano salvati quando diventano incompatibili. Il
Costruttore mostra gli errori, permette la rimozione esplicita degli effetti
ritirati e impedisce il salvataggio invalido anche evitando la navigazione.
Le vecchie Tecniche t1/t2 passano dallo stesso Costruttore: una conversione
valida conserva l'identità delle Special Moves e archivia il testo e i P.A.
precedenti. Annullare o fallire la validazione conserva il profilo originale.
Le Tecniche Custom non avanzano tramite P.A.; la Tecnica razziale conserva
il proprio percorso.

## Tratti, Talenti e scelte

`tratti-data.js` viene generato dal §16.9 del manuale con
`python3 strumenti/tratti-catalogo.py`. L'albero contiene 31 Tratti per le
16 Skill, con requisiti, collegamenti, testo completo e limiti. Lo sblocco
dipende da entrambi i dadi, anche per Skill fuori Ruolo; l'acquisizione è
sempre una scelta esplicita.

`regole/avanzamento.js` tiene un conteggio condiviso fra Talenti ordinari e
Tratti: una scelta concessa per Upgrade. Il Prestigio mantiene le proprie
scelte separate ai livelli I, III e V. Il comando «Scelte degli Upgrade»
registra le scelte concesse al tavolo, senza assegnare risorse o avanzamenti.

Alla prima lettura di una scheda, un Upgrade numerico intero viene usato
come numero dichiarato di Upgrade. Il conteggio conserva almeno tutte le
acquisizioni storiche. Un livello vuoto o descrittivo non genera scelte
libere: il GM registra quelle ancora disponibili. Dopo l'inizializzazione,
il registro esplicito delle scelte è il riferimento. Le scelte inactive,
evolute e sconosciute restano conservate e continuano a contare come spese.

Corpo Mostruoso aggiunge +2 DP. Fortezza Vivente richiede Corpo acquisito e
sostituisce il bonus con +4, senza sommarlo al precedente. La DP razziale
resta il valore base. Gli altri Tratti conservano le condizioni complete
del manuale; i benefici situazionali richiedono il contesto al tavolo.

`regole/talenti.js` ricontrolla dadi, prerequisiti e versioni sostituite
anche per i Talenti già memorizzati. Un calo dei requisiti sospende il
beneficio e conserva l'acquisizione. Il Retaggio Zoan richiede la natura
Ancestrale o Mitologica registrata, senza inferirla dalla descrizione.
Scambiare classi o cambiare Skill conserva il dado della Skill realmente
allenata. Uno Stile duplicato non moltiplica Talenti o posti nell'Arsenale.

## Special Moves e stampe

Difesa Attiva con una Tecnica d'attacco, Parata con arma e Guardia hanno
azioni e procedure distinte. Contraccolpo infligge danni soltanto con
successo stretto; Riposta conserva il proprio attacco base separato.
Le attivazioni volontarie a costo 0 ST rispettano l'Azione Bonus prevista
dal manuale. Le Canzoni usano lo strumento scelto, limitato da Arte, oppure
la Voce d4 per la Soglia di Salvezza.
Le Salvezze degli effetti diretti dei Talenti e delle Firme riportano la
Skill effettiva della capacità, oppure il Dado del Frutto quando previsto.
Smash Hit usa Atletica anche con Acrobazia come Skill di Ruolo. Le
annotazioni sono condizionali: non applicano automaticamente uno Stato e
non sostituiscono contese, dosi, preparati o altre procedure specifiche.

Le stampe ricevono Tratti acquisiti, stato attuale e regole integrali. La
scheda illustrata ricostruisce correttamente i Tratti anche da una scheda
senza un pacchetto di stampa recente. I Tratti attivi sono selezionabili anche nelle Special Moves come promemoria
condizionali, con testo completo e limiti. Questa scelta non aggiunge
automaticamente dadi, Vantaggi o bonus DP alla formula. Il calo dei requisiti
o un’Evoluzione segnala il riferimento da aggiornare, conservando la carta.
La valutazione delle Special Moves resta descrittiva e non consuma
automaticamente risorse.

## Verifica e backup

- `node --test tests/glc-*.test.cjs`: motori, Costruttore reale, Talenti,
  Upgrade, Tratti, Salvezze, Special Moves, Prestigio, login e sincronizzazione.
- `python3 -m unittest discover -s tests -p 'test*.py'`: coerenza dei manuali.
- `python3 strumenti/tratti-catalogo.py --check`: catalogo identico alla fonte.
- Chromium desktop 1440 × 1100 e telefono 390 × 844: acquisizione e
  Evoluzioni, budget condiviso, cambi di classe, armi, correzione e conversione
  delle Tecniche, persistenza, import/export, zaino, immagini e stampe reali.

I test usano personaggi artificiali e autenticazione simulata. Nessun
account o personaggio cloud reale viene letto o modificato durante i test.

La verifica finale supera 177 test Node, 16 controlli dei manuali e 214
controlli browser sul gestionale e sulle Fonti, oltre alle prove dedicate
del Composer con Tratti Unici e stampe. Nessun errore JavaScript è emerso
nei contesti desktop e telefono verificati.

Backup precedente alla modifica: commit
`6ce400300e37dc37b4a18ef9d9e817d59cdefba0`, conservato nel ramo remoto
`backup/glc-prima-builder-tratti-20261007t150319z` e in un archivio ZIP
verificato con SHA-256
`f10c3ed8684b33464fcbb3a094b8c27209bef0702de5d1c60ad222d6653711f5`.
