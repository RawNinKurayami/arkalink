# Verifica Arkalink / Forgia — 27 settembre 2026

- Build TypeScript e produzione completate.
- 3 test aggiuntivi per distinguere errori SMTP, rete e credenziali senza esporre dettagli riservati.
- 5 test della sincronizzazione: revisione vecchia, rete assente, scritture concorrenti, salvataggio prima del caricamento, risoluzione esplicita del conflitto.
- 15 controlli sul servizio reale con due account temporanei: login, separazione archivi, accesso anonimo negato, controllo revisione e accesso privato ai file.
- Caricamento e rilettura dell’immagine e di un file maggiore di 8 MiB: byte identici agli originali; provato il trasferimento a blocchi.
- Nel browser: creazione di un personaggio, persistenza dopo ricarica, riferimento privato visualizzato; selezione del portale con mouse e tastiera; creazione e rilettura di una versione privata. Il portale è stato controllato anche a 390 px senza scorrimento orizzontale.
- La prova del selettore file automatico in Chrome è limitata dal permesso dell’estensione per i file locali; il trasferimento e la visualizzazione sono stati verificati separatamente.
- Nessuna formula o regola GLC modificata. I collegamenti Home puntano alla nuova destinazione GLC; il service worker esclude il portale e la Forgia.
- Resend: dominio Verified; tre record DNS applicati. SMTP attivato dal proprietario e verificato persistente dopo il ricaricamento della dashboard. Nessuna credenziale privata inclusa.
- Email di conferma ricevuta dal proprietario dopo la correzione della credenziale SMTP. Da completare: utilizzo del link di conferma e percorso di recupero password. L’apertura della versione pubblica nel browser è stata fermata da un limite di utilizzo della verifica automatica; non viene dichiarata collaudata.
- Account, sessioni e file usati per le prove sono stati rimossi.

## Errore di registrazione segnalato

I log Auth hanno identificato un rifiuto SMTP `535 Authentication credentials invalid` nelle richieste di registrazione. Il proprietario ha reinserito la chiave e ha confermato la ricezione dell’email al successivo tentativo: invio ripristinato. Il modulo ora distingue problemi del servizio email e problemi di rete, con messaggi comprensibili e senza esporre risposte riservate del provider.
