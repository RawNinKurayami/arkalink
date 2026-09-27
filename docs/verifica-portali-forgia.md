# Verifica Arkalink / Forgia — 27 settembre 2026

- Build TypeScript e produzione completate.
- 5 test della sincronizzazione: revisione vecchia, rete assente, scritture concorrenti, salvataggio prima del caricamento, risoluzione esplicita del conflitto.
- 15 controlli sul servizio reale con due account temporanei: login, separazione archivi, accesso anonimo negato, controllo revisione e accesso privato ai file.
- Caricamento e rilettura dell’immagine e di un file maggiore di 8 MiB: byte identici agli originali; provato il trasferimento a blocchi.
- Nel browser: creazione di un personaggio, persistenza dopo ricarica, riferimento privato visualizzato; selezione del portale con mouse e tastiera; creazione e rilettura di una versione privata. Il portale è stato controllato anche a 390 px senza scorrimento orizzontale.
- La prova del selettore file automatico in Chrome è limitata dal permesso dell’estensione per i file locali; il trasferimento e la visualizzazione sono stati verificati separatamente.
- Nessuna formula o regola GLC modificata. I collegamenti Home puntano alla nuova destinazione GLC; il service worker esclude il portale e la Forgia.
- Email pubbliche da completare: propagazione Resend, chiave SMTP e verifica finale di conferma/recupero. Nessuna credenziale privata inclusa.
