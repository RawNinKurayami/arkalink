# Notizie dai mari

La Home legge i riepiloghi del giornale; `/notizie/` contiene archivio, categorie e articoli. La redazione è `/notizie/?redazione=1`, accessibile anche dal collegamento mostrato agli amministratori.

## Uso

1. Accedi con l’account amministratore già autorizzato per il catalogo.
2. Crea un dispaccio: titolo, categoria, introduzione e testo sono obbligatori. La copertina è facoltativa.
3. Salva in bozza oppure controlla l’anteprima e pubblica. Una notizia pubblicata può essere aggiornata o ritirata in bozza.
4. “In evidenza nella Home” dà priorità alla notizia; tra più notizie in evidenza prevale la data di pubblicazione. La Home mostra al massimo tre dispacci.

Il testo è semplice: paragrafi e link HTTPS, senza HTML eseguibile. Il caricamento delle immagini usa `glc-images.js`: fino a 30 MB in ingresso, 3840 px sul lato lungo, nessun ingrandimento artificiale. Una miniatura separata evita di scaricare le copertine 4K nell’elenco.

## Database e permessi

La migrazione `supabase/migrations/20260927082854_home_news.sql` è stata applicata al progetto il 27 settembre 2026 tramite il connettore Supabase, con il nome `home_news`. Non rieseguirla sullo stesso database. Non è una migrazione dei personaggi e non modifica le tabelle di salvataggio.

- `public.glc_news`: RLS attivo. Visitatori e utenti ordinari leggono soltanto le notizie pubblicate.
- `glc_private.news_editors`: elenco amministratori, non modificabile dai client. L’amministratore iniziale viene ricavato dall’account esistente del catalogo. Nessuna autorizzazione dipende da `user_metadata`.
- `glc_news_can_edit()`: controllo server con privilegi del chiamante. Le policy proteggono le operazioni anche se qualcuno aggira l’interfaccia.
- Bozze, immagini e testo non vengono copiati nei salvataggi del personaggio o nel suo localStorage.
- La versione viene incrementata dal server. Gli aggiornamenti richiedono la versione letta dall’editor: una scheda vecchia non può sovrascrivere quella nuova.
- Niente eliminazione permanente dal client; il ritiro conserva il dispaccio come bozza.

Le migrazioni di questa cartella non costituiscono una baseline completa del database esistente. Non lanciare una sincronizzazione indiscriminata delle migrazioni CLI contro il progetto.

## Verifica

Test isolati con PostgreSQL/PGlite: lettura pubblica, bozze private, blocco scritture non autorizzate, versioni, ritiro e revoca dell’amministratore. Test DOM: ritorno al personaggio corretto, isolamento tra account, compilazione, salvataggio, conflitti e testo ostile. Controllo browser: Home, redazione e anteprima a diverse larghezze.

Gli advisor non segnalano problemi per gli oggetti aggiunti. Restano gli avvisi precedenti: tabelle di sincronizzazione private senza policy intenzionalmente accessibili solo dalle funzioni autorizzate, e [protezione password compromesse](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) disattivata sul piano Free, come già concordato.

Nessun articolo è stato pubblicato durante l’implementazione. Le notizie dell’anteprima locale sono dati dimostrativi esterni al repository.
