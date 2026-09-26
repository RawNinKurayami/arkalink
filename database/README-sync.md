# Sincronizzazione protetta e recupero dei salvataggi

## Stato del rilascio (26 settembre 2026)

La migrazione `guarded_save_sync_and_recovery` è applicata al progetto Supabase di Grand Line Chronicles. `sync-protocol.sql` ne conserva il testo per revisione: non rieseguirlo manualmente. La migrazione ha conservato 24 copie iniziali; numero e impronta dei dati correnti sono identici prima e dopo. Nessun account è stato convertito durante i test.

Il nuovo frontend è preparato localmente, non pubblicato e non committato. Pubblicare insieme tutti i file modificati e i nuovi `glc-sync.js` e `glc-sync-panel.js`. Le inclusioni degli script hanno `?v=2`, per non mescolare codice di sincronizzazione vecchio e nuovo nelle cache. Conservare anche il service worker aggiornato per il funzionamento offline.

## Come protegge i dati

- Il server assegna una revisione e l’ora effettiva a ogni modifica. Una scrittura deve specificare la revisione letta: una copia obsoleta non può sostituire dati nuovi.
- Le modifiche a pirati diversi vengono unite. Le modifiche concorrenti allo stesso pirata, o a documenti non separabili, richiedono una scelta nel Profilo. L’orologio del telefono non decide quale copia vinca.
- Le selezioni del personaggio attivo restano locali. I salvataggi iniziali delle pagine e le normalizzazioni non contano come modifiche del giocatore.
- Le bozze conservano separatamente la versione di partenza in IndexedDB, per utente e scheda. Durante il passaggio al nuovo protocollo, una copia locale diversa e priva di provenienza verificabile viene archiviata prima di usare quella cloud.
- Il Profilo offre confronto, copie JSON e ripristino controllato. Non ci sono comandi di sovrascrittura incondizionata.
- L’uscita conserva i dati locali se il cloud non conferma il salvataggio. Le bozze residue di altre schede vengono archiviate prima della pulizia.
- Lo spazio locale esaurito non provoca più la rimozione automatica dei ritratti. Gli errori di salvataggio vengono comunicati e non avviano un salvataggio ridotto senza immagini.

## Compatibilità durante il passaggio

Finché un account non apre il nuovo frontend, il sito attuale continua a funzionare con il percorso precedente; il server registra già le versioni e corregge gli orari. Alla prima lettura tramite il nuovo protocollo, l’account viene protetto e le scritture dirette dei vecchi client vengono rifiutate. Gli altri dispositivi di quell’account devono ricaricare il sito aggiornato. Non retrocedere al vecchio frontend dopo l’attivazione senza una procedura specifica: il rifiuto dei vecchi salvataggi è intenzionale.

Non aprire anticipatamente una build locale con un account reale se deve ancora continuare a usare il frontend ufficiale vecchio: anche quella prima lettura attiverebbe la protezione dell’account.

## Recupero e limiti

Sono conservate cinque copie precedenti per archivio, entro un totale di 32 MiB per account, oltre alla copia iniziale di questa migrazione. Sono copie complete, incluse le immagini presenti nel documento. Le versioni più vecchie vengono eliminate per rispettare il limite. Non è un backup illimitato: i file JSON esportati restano utili per conservazioni permanenti. La migrazione non può ricostruire modifiche che erano già state perse prima della copia iniziale.

Le tabelle private hanno RLS attivo, nessuna policy di accesso diretto e nessun privilegio ai client: l’avviso informativo [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) è coerente con questo blocco intenzionale. Le funzioni verificano l’utente autenticato e i wrapper pubblici sono invoker. Sono revocati anche TRUNCATE e gli altri privilegi non necessari su `saves`.

Resta la precedente scelta di mantenere il piano Free e non attivare la [protezione dalle password compromesse](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Non sono stati cambiati piano o configurazione di accesso.

## Verifica

Test con dati sintetici: PostgreSQL via PGlite, browser DOM isolato e IndexedDB simulato. Coprono cliente precedente, rifiuto di revisioni obsolete, isolamento degli utenti, PC/telefono, stesso pirata in conflitto, modifiche a pirati diversi, offline, chiusura e riapertura delle schede, modifica durante un invio, risposta persa, eliminazioni, ripristino concorrente, esaurimento dello spazio e mancata uscita dal cloud.

Non sono stati creati o modificati personaggi reali per i test. Resta da effettuare una prova su due dispositivi reali dopo la pubblicazione coordinata del frontend, con un personaggio di prova.
