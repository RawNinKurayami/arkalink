# La Forgia — sorgenti

Applicazione React/Vite autonoma, pubblicata in `/forgia/`. Account, archivio e file privati nel progetto Supabase `arkalink-forge` (`tyxjoudvmzhnzcotmjpd`), separato da GLC. Nessun login ChatGPT.

## Ricostruire

Richiede Node 22.13+ e pnpm 11.19.

```sh
cd _forgia-src
pnpm install --frozen-lockfile
pnpm test
pnpm build
node scripts/publish.mjs
```

Il comando finale aggiorna soltanto `../forgia/`. Il sito completo si prova dalla radice della repository con `python3 -m http.server 8934 --bind 127.0.0.1` e `http://127.0.0.1:8934/`.

## Configurazione

`public/forge-config.js` contiene URL e chiave **pubblica** del progetto; nessuna chiave segreta deve entrare nel codice. `supabase/schema.sql` documenta lo schema applicato: archivio per utente, controllo revisione atomico, bucket privato e politiche di accesso proprietario. Il file è una fotografia dello schema, non va rieseguito su un database già configurato.

Le immagini conservano i file originali (massimo 40 MiB); i modelli supportano fino a 500 MiB, con blocchi privati da 8 MiB. Questi limiti non aumentano lo spazio complessivo del piano Supabase. GLB incorpora materiali e texture; OBJ/STL trasferiscono la geometria. Le prestazioni dei modelli grandi dipendono dal dispositivo.

Il cloud rifiuta il salvataggio da una revisione vecchia. In caso di conflitto l’interfaccia permette di scaricare la copia locale prima di ricaricare il cloud. Le date dei dispositivi non decidono quale archivio prevale.

I progetti della bozza precedente possono essere importati come JSON; i file del vecchio servizio devono essere ricaricati. Il JSON contiene riferimenti a file privati dell’account: usare il pacchetto completo per conservare anche gli originali.

## Email: configurazione ancora da completare

Il dominio Resend `arkalink.com` è stato aggiunto e i tre record DNS salvati. Prima della pubblicazione delle registrazioni verificare lo stato **Verified**, creare una chiave con solo invio sul dominio e inserirla come password SMTP nel progetto Forgia. Host `smtp.resend.com`, porta 465, utente `resend`, mittente `noreply@arkalink.com`, nome `Arkalink · La Forgia`. Non salvare la chiave in Git.

Provare conferma email e recupero password con un account reale dopo l’attivazione SMTP. Le prove eseguite coprono invece login con account temporanei, separazione dati/file, conflitti e trasferimenti privati.
