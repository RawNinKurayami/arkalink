# Arkalink

Portale del multiverso, con destinazioni indipendenti:

- `/`: La Convergenza, selezione dei portali.
- `/grand-line-chronicles/`: homepage originale di Grand Line Chronicles. Il video, le regole, i gestionali, gli URL delle altre pagine e i dati dei personaggi restano invariati.
- `/forgia/`: La Forgia, character design con account e cloud autonomi.

I sorgenti della Forgia, le istruzioni di build e lo stato della configurazione email sono in [_forgia-src/README.md](_forgia-src/README.md). Il sito compilato è incluso nella repository: GitHub Pages non richiede Node a runtime.

Anteprima locale dalla radice: `python3 -m http.server 8934 --bind 127.0.0.1`.

La configurazione SMTP della Forgia richiede ancora la chiave Resend; non considerare collaudate registrazione pubblica e recupero password prima del test email finale.
