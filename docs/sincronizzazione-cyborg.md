# Cyborg nella Gestione del pirata

La fonte normativa è il [Manuale del Cyborg](../manuale-cyborg/index.html),
comprese le integrazioni pubblicate, insieme ai limiti di Stile del manuale
base. `regole/cyborg.js` condivide la validazione fra Officina, Moduli,
Costruttore, Special Moves e stampe.

Corpo Meccanico termina a d20: slot 1/2/3/4/5 e Fascia massima pari al dado
razziale. Progetti non installati, installazione, integrità e attivazione
sono distinti. I dispositivi storici, i loro ID, i collegamenti alle Tecniche
e le risorse restano conservati; eventuali incompatibilità richiedono una
correzione esplicita. Un Grado razziale storico non ordinario può essere
corretto dalla sua scheda senza perdere P.A. o Moduli.

Il catalogo comprende i dieci esempi del §13. Funzioni attive e inattive,
parametri di Fascia, tipo e Attributo dei Moduli-Arma, un unico Effetto
Speciale e risorse hanno campi separati. Grado d’Arma e Attributo devono
permettere l’utilizzo; il Grado d’Arma non supera la Fascia. Una vera arma
integrata compatibile soddisfa lo Stile armato, mantenendo Dado Tecnica e
Dado Danno della Tecnica. Lo Striker conserva le proprie Tecniche a mani nude.

Sblocco registra effetti nominati, con Grado e prerequisiti invariati.
Sconto segue il budget della Fascia e il bersaglio preciso, conservando
il minimo di 1 ST per un costo positivo e di 0 per gli Slot.
La descrizione del Modulo non concede effetti. Il riferimento «+1 Dado
Danno» del Cannone a Pressione resta conservato come bersaglio dello
Sconto: richiede una capacità specifica che lo conceda e non reintroduce
gli effetti Dado Danno ritirati dal Costruttore.

Lo stato dello scontro registra un cambio gratuito nel proprio turno,
scelta iniziale ed eventuale Attivazione d’emergenza. Danneggiamento,
esaurimento della risorsa e surriscaldamento interrompono il funzionamento.
Cariche massime 3/4/5/6/8; consumo e ST restano separati. Ricarica e
manutenzione registrano interventi completati con tempi e materiali,
senza recuperi automatici all’apertura della pagina o durante un Riposo.

Il pannello delle cure registra Riparazione di Campo, Carne e Metallo e
Stabilizzazione, usando i dadi effettivi del Meccanico e risultati già
tirati al tavolo. Recuperare PV e riparare un Modulo sono interventi distinti.
Riposi, cibo e recuperi diretti compatibili funzionano; la normale cura
biologica con Medicina non recupera PV. Le capacità speciali conservano
le proprie condizioni. Le stampe riportano i tre stati, funzioni,
Effetti, risorse e avvisi; le Special Moves non consumano risorse
automaticamente e i vecchi snapshot richiedono una nuova valutazione.

Verifiche: suite `node --test tests/glc-*.test.cjs`, controlli Python dei
manuali, catalogo Tratti e Chromium desktop/telefono con schede artificiali
e autenticazione simulata. Nessun personaggio cloud reale viene modificato.
Esito finale: 249/249 test Node, 16/16 controlli dei manuali e 314 controlli
browser (134 Cyborg, 32 Composer e 148 gestione generale), senza errori JavaScript.

Backup precedente all’aggiornamento: commit
`a3f4b8e5e0b99481e7a27abef952225242da1570`, ramo
`backup/glc-prima-cyborg-20261007t160940z`; archivio ZIP verificato con SHA-256
`2060ef4c013cc02dfe19be769822879471339a44ce85bea12c34900d15f8d14f`.
