# Arkalink

Portale del multiverso, con destinazioni indipendenti:

- `/`: La Convergenza, selezione dei portali.
- `/grand-line-chronicles/`: homepage originale di Grand Line Chronicles. Il video, le regole, i gestionali, gli URL delle altre pagine e i dati dei personaggi restano invariati.
- `/forgia/`: La Forgia, character design con account e cloud autonomi.

I sorgenti della Forgia, le istruzioni di build e lo stato della configurazione email sono in [_forgia-src/README.md](_forgia-src/README.md). Il sito compilato è incluso nella repository: GitHub Pages non richiede Node a runtime.

Anteprima locale dalla radice: `python3 -m http.server 8934 --bind 127.0.0.1`.

Il dominio Resend è verificato e la configurazione SMTP della Forgia è attiva e salvata. Resta da completare il test di ricezione delle email con conferma account e recupero password.
