# Accesso e sincronizzazione senza finestre bloccanti

Verifica del 3 ottobre 2026.

## Problema e correzione

Le pagine protette aprivano il dialogo di accesso prima di leggere la sessione esistente. Un aggiornamento dal cloud, che ricarica la pagina per aggiornare anche lo stato dei vari strumenti, rendeva nuovamente visibile il login per un istante.

Ora il login appare solo dopo aver accertato l'assenza della sessione, oppure su richiesta esplicita e nei flussi di recupero. Durante il primo allineamento compare uno stato neutro. Gli eventi di rinnovo non riavviano l'accesso; una risposta iniziale in ritardo non annulla un evento di accesso o uscita più recente.

Le pagine che inizializzano o normalizzano dati aspettano `GLCSync.whenReady()`. Gli aggiornamenti al ritorno nella finestra di Sessioni e Plancia attendono a loro volta la disponibilità del registro. Il controllo sui salvataggi durante l'allineamento resta attivo.

Gli errori di `GLCStore.setItem` continuano a interrompere la scrittura: sono segnalati in pagina, senza `alert` del browser. La segnalazione resta visibile fino a un salvataggio riuscito sullo stesso archivio. Non si presenta come riuscita una modifica rifiutata.

I ricaricamenti richiesti dalla sincronizzazione sono riconosciuti come tali anche durante il primo caricamento. L'avviso di abbandono continua a proteggere l'uscita volontaria con modifiche pendenti o conflitti.

## Confini

- Il motore `glc-sync.js`, le revisioni, il confronto delle copie, l'archiviazione e le regole di fusione non sono modificati.
- Nessuna modifica a database, permessi, credenziali, account, regole di gioco o Forgia.
- Versione condivisa dello script di accesso: 4. Cache del service worker: 7. Gli script di avvio di Isola e Tavolo tattico passano alla versione 2.

## Verifiche

31 test automatici: sessione esistente e lenta, rinnovi, risposte in ritardo, attesa dell'allineamento, scrittura rifiutata senza popup, ricaricamento, uscita durante l'avvio, login Google/email, registrazione, recupero password e protezione dei dati. I test del motore reale coprono copie obsolete, telefono e PC, offline, conflitti, unione di pirati diversi e spazio locale esaurito.

I test sul login che riproducono il lampeggio falliscono con il codice precedente e passano con la correzione. Controllata anche la sintassi degli script modificati e degli script incorporati nelle pagine.

Prova in Chrome sulle pagine reali servite in locale, con un servizio di accesso e cloud simulato e rallentato: dati sintetici, IndexedDB reale e motore di sincronizzazione originale. Verificati modifica dei PV, arrivo di una versione cloud, navigazione tra gli strumenti e rinnovo della sessione. Nessun account reale viene usato per queste prove.

Riferimenti API: [eventi di autenticazione Supabase](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) e [gestione dei callback senza deadlock](https://supabase.com/docs/guides/troubleshooting/why-is-my-supabase-api-call-not-returning-PGzXw0).
