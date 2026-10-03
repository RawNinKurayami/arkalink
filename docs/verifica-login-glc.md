# Login GLC — verifica del 3 ottobre 2026

Il pannello condiviso di accesso a Grand Line Chronicles ora offre Google, email e password, registrazione con conferma email, recupero password e il precedente accesso tramite link. L’account della Forgia resta separato.

## Modifiche

- `glc-auth.js`: pannello nativo dialog, flussi di accesso e recupero, errori leggibili, stato di attesa, conferma password, reinvio della conferma email e protezione dai doppi invii. Il focus resta nel pannello e torna al controllo iniziale alla chiusura.
- `glc-login.css`: nuovo pannello con immagine GLC, stile scuro e oro, disposizione desktop e mobile, variante per portatili e rispetto di `prefers-reduced-motion`.
- `glc-theme.css`: rimossi esclusivamente gli stili del vecchio pannello che si sovrapponevano al nuovo.
- Nelle 12 pagine GLC che includono il login è cambiata soltanto la versione dello script, da `v=2` a `v=3`; il service worker usa una nuova cache coerente con questa versione.
- Gli URL delle immagini degli avatar vengono inseriti come testo escapato negli attributi, per impedire l’inserimento di markup tramite i dati del profilo.

Il progetto Supabase, il client, le chiavi di salvataggio, le strutture dei personaggi, `glc-sync.js`, le procedure di uscita e le regole del gioco restano invariati. Nessuna modifica alla Forgia o ai portali Arkalink.

## Recupero e account esistenti

Il callback di recupero viene riconosciuto prima che il client consumi il link. La sessione viene verificata sul server; la sincronizzazione si avvia dopo la scelta della nuova password o l’uscita dal recupero. Un link scaduto non può riutilizzare silenziosamente una sessione salvata in precedenza.

Per riprendere il recupero dopo una ricarica, viene conservato in `sessionStorage` soltanto un indicatore con ID dell’utente e scadenza di dieci minuti. Non contiene password o token. Alla conclusione viene rimosso.

Chi usava Google o un link email può continuare con lo stesso metodo. Per aggiungere una password deve usare il recupero con la stessa email; non serve creare un nuovo account.

## Verifiche eseguite

`node --test tests/glc-auth.test.cjs`: 17 test superati, senza rete o credenziali reali. Coprono accesso, registrazione, conferma email, link, Google, recupero, callback scaduti, sessioni preesistenti, reinvii, richieste simultanee, refresh, uscita dal pannello e rendering degli avatar.

Verifica sul browser locale:

- Home e Profilo caricano lo stesso pannello; nel Profilo resta possibile proseguire sul dispositivo.
- Sul portatile il pannello di accesso entra nella finestra senza richiedere scorrimento interno.
- A 390 × 844 e 320 × 700 non compare scorrimento orizzontale; i moduli lunghi scorrono verticalmente.
- Registrazione mostra conferma password e requisito di dodici caratteri. Le password esistenti continuano a essere accettate senza applicare questo nuovo minimo al login.
- Tab e Shift+Tab mantengono il focus nel pannello; Escape chiude il pannello e ripristina il focus e lo scorrimento della pagina.
- I blocchi di sincronizzazione e uscita sono stati confrontati con la versione precedente.

## Configurazione email

Google ed email risultano abilitati sul progetto GLC; la conferma email resta obbligatoria. L’amministratore ha completato e salvato SMTP Resend dal dashboard Supabase. La credenziale non è stata acquisita dall’agente e non è presente nel repository.

La consegna reale di conferme e recupero e un accesso completo con l’account del proprietario richiedono ancora una prova del proprietario sul sito aggiornato. I test automatici usano risposte simulate del client e non dimostrano la consegna delle email.

## Riferimenti

- [Accesso con password](https://supabase.com/docs/guides/auth/passwords)
- [Recupero password](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Identità e aggiunta della password agli account Google](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [SMTP personalizzato](https://supabase.com/docs/guides/auth/auth-smtp)
