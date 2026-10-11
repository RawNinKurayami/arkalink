# Copertine e PDF dei manuali

Le quattro copertine approvate sono in `img/copertine/`: WebP per lo schermo,
JPEG a piena risoluzione per la stampa. L'artwork è identico, senza ritagli.
`manuali/copertine.css` gestisce sfondo attenuato, frontespizio e copertina A4.

Ogni generatore richiama `applica_copertina` da `manuale_copertine.py`, dopo
aver costruito il manuale e prima di salvarlo. Il testo delle regole, gli
ancoraggi e i controlli del lettore non sono riscritti da questo passaggio.

Per aggiungere la presentazione agli HTML correnti senza rigenerare le regole:

```sh
python3 strumenti/manuale_copertine.py
```

Dopo una revisione delle regole, rigenerare il rispettivo HTML come prima,
quindi aggiornare anche i PDF scaricabili. Richiede Python con pypdf e Node con Playwright e
Chromium installato; un Chrome locale può essere passato con `--chrome`.

```sh
node strumenti/manuali-pdf.mjs
```

Il comando produce `manuale.pdf` nella cartella di ciascun manuale, a partire
dalle pagine HTML attuali e dallo stesso CSS usato dal pulsante Stampa · PDF.
I file del sito vengono forniti al browser da una route interna: nessun login,
cloud o dato di personaggi è coinvolto. Le uniche risorse esterne ammesse sono
i font Google già utilizzati dai manuali. `--output` sceglie una cartella di
anteprima; `--python` sceglie l'interprete Python. `--qa-dir` salva schermate e controlla indice, ricerca, stampa,
immagini e responsive. `--root` e `--overlay` servono alle prove prima della
pubblicazione.

La rifinitura rimuove soltanto eventuali pagine finali prive di testo e immagini
prodotte dalla paginazione del browser; conserva copertina e segnalibri.

La prima pagina è A4, con la copertina intera su fondo scuro entro i margini
di stampa. L'immagine conserva le proporzioni originali e non viene tagliata.
Il corpo conserva carta bianca, indice, capitoli e margini della stampa
precedente. Le tre schede vuote dei Frutti restano PDF separati.
