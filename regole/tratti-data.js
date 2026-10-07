/* Generated from Manuale GLC §16.9; regenerate with strumenti/tratti-catalogo.py. */
(function(root){'use strict';root.GLCTrattiData={
  "version": 1,
  "source": "Manuale GLC §16.9",
  "sourceHash": "58dd993a5087100aac92a52a8f7e264f0600031f7964b91ce78df84543aaa0a7",
  "manual": "/manuale/#sez-16-9",
  "dice": [
    "d4",
    "d6",
    "d8",
    "d10",
    "d12",
    "d20",
    "d20+d4",
    "d20+d6",
    "d20+d8",
    "d20+d10",
    "d20+d12",
    "d20+d20"
  ],
  "skills": [
    "Atletica",
    "Acrobazia",
    "Osservazione",
    "Furtività",
    "Sopravvivenza",
    "Comunicazione",
    "Medicina",
    "Meccanica",
    "Navigazione",
    "Esplorazione",
    "Natura",
    "Artigianato",
    "Carpenteria",
    "Cucina",
    "Arte",
    "Archeologia"
  ],
  "traits": [
    {
      "id": "corpo-mostruoso",
      "name": "Corpo Mostruoso",
      "skill": "Atletica",
      "attribute": "Forza",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "La tua Difesa Passiva aumenta di +2.",
        "Il bonus si somma agli altri modificatori alla Difesa Passiva applicabili."
      ],
      "requirementsText": "Forza d12 · Atletica d10",
      "metadata": "Tipo: Passivo · Requisiti: Forza d12, Atletica d10",
      "manual": "/manuale/#sez-16-9",
      "passiveDefense": 2
    },
    {
      "id": "fortezza-vivente",
      "name": "Fortezza Vivente",
      "skill": "Atletica",
      "attribute": "Forza",
      "attributeDie": "d20",
      "skillDie": "d12",
      "requires": [
        "corpo-mostruoso"
      ],
      "replaces": [
        "corpo-mostruoso"
      ],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Il bonus alla Difesa Passiva concesso da Corpo Mostruoso diventa +4.",
        "Il +4 sostituisce il precedente +2 e non si somma ad esso."
      ],
      "requirementsText": "Forza d20 · Atletica d12 · Corpo Mostruoso acquisito",
      "metadata": "Tipo: Passivo · Evoluzione di Corpo Mostruoso · Requisiti: Forza d20, Atletica d12, Corpo Mostruoso acquisito",
      "manual": "/manuale/#sez-16-9",
      "passiveDefense": 4
    },
    {
      "id": "riflessi-sovrumani",
      "name": "Riflessi Sovrumani",
      "skill": "Acrobazia",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per round",
      "frequency": "round",
      "effects": [
        "Quando un attacco contro di te manca la tua Difesa Passiva, puoi spostarti immediatamente di 2 m.",
        "Lo spostamento fa parte del Tratto, non utilizza la Reazione e non provoca attacchi di Reazione dovuti all’allontanamento."
      ],
      "requirementsText": "Tecnica d12 · Acrobazia d10",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Acrobazia d10 · Limite: 1 volta per round",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "passo-fantasma",
      "name": "Passo Fantasma",
      "skill": "Acrobazia",
      "attribute": "Tecnica",
      "attributeDie": "d20",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando una tua Difesa Attiva riesce, puoi spostarti immediatamente fino a metà del tuo Movimento.",
        "Lo spostamento fa parte del Tratto e non provoca attacchi di Reazione dovuti all’allontanamento."
      ],
      "requirementsText": "Tecnica d20 · Acrobazia d12",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d20, Acrobazia d12",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "occhio-dell-avversario",
      "name": "Occhio dell’Avversario",
      "skill": "Osservazione",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per round",
      "frequency": "round",
      "effects": [
        "Dopo che una creatura che puoi vedere effettua un attacco, ottieni +2 alla prossima Difesa Attiva effettuata contro quella creatura prima dell’inizio del tuo prossimo turno.",
        "Il bonus si applica al risultato della Difesa Attiva, non alla Difesa Passiva."
      ],
      "requirementsText": "Astuzia d12 · Osservazione d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Osservazione d10 · Limite: 1 volta per round",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "predatore-di-aperture",
      "name": "Predatore di Aperture",
      "skill": "Osservazione",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per turno",
      "frequency": "turn",
      "effects": [
        "Quando un nemico consuma la propria Reazione, il tuo prossimo attacco contro di lui prima della fine del turno ottiene Vantaggio."
      ],
      "requirementsText": "Astuzia d12 · Osservazione d12",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Osservazione d12 · Limite: 1 volta per turno",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "mente-inespugnabile",
      "name": "Mente Inespugnabile",
      "skill": "Osservazione",
      "attribute": "Spirito",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Ottieni Vantaggio alle Salvezze di Spirito effettuate per resistere a paura, intimidazione o coercizione mentale.",
        "Il Tratto non crea una Salvezza contro effetti che non ne prevedono una."
      ],
      "requirementsText": "Spirito d12 · Osservazione d10",
      "metadata": "Tipo: Passivo · Requisiti: Spirito d12, Osservazione d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "passo-silenzioso",
      "name": "Passo Silenzioso",
      "skill": "Furtività",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando una Prova di Furtività viene richiesta mentre ti stai muovendo a non più di metà del tuo Movimento, effettui la Prova con Vantaggio."
      ],
      "requirementsText": "Tecnica d12 · Furtività d10",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Furtività d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "ombra-perfetta",
      "name": "Ombra Perfetta",
      "skill": "Furtività",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per turno",
      "frequency": "turn",
      "effects": [
        "Quando effettui un attacco contro una creatura che non ti ha individuato, quell’attacco ottiene Vantaggio.",
        "Limite: 1 volta per turno."
      ],
      "requirementsText": "Astuzia d12 · Furtività d12",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Furtività d12",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "tempra-selvaggia",
      "name": "Tempra Selvaggia",
      "skill": "Sopravvivenza",
      "attribute": "Forza",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Ottieni Vantaggio alle Salvezze richieste da caldo, freddo, esposizione e altri pericoli ambientali di natura fisica.",
        "Il Tratto non annulla automaticamente gli effetti ambientali che non prevedono una Salvezza."
      ],
      "requirementsText": "Forza d12 · Sopravvivenza d10",
      "metadata": "Tipo: Passivo · Requisiti: Forza d12, Sopravvivenza d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "non-ancora",
      "name": "Non Ancora",
      "skill": "Sopravvivenza",
      "attribute": "Spirito",
      "attributeDie": "d20",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per scontro",
      "frequency": "combat",
      "effects": [
        "Quando fallisci una Salvezza di Forza o Spirito contro uno Stato, puoi aumentare il risultato ottenuto di +2 dopo aver visto il tiro.",
        "Se il nuovo risultato raggiunge la Soglia, la Salvezza riesce."
      ],
      "requirementsText": "Spirito d20 · Sopravvivenza d12",
      "metadata": "Tipo: Passivo · Requisiti: Spirito d20, Sopravvivenza d12 · Limite: 1 volta per scontro",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "lingua-d-argento",
      "name": "Lingua d’Argento",
      "skill": "Comunicazione",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per scena",
      "frequency": "scene",
      "effects": [
        "Quando fallisci una Prova di Comunicazione effettuata per convincere, trattare o ingannare, puoi ripetere il tiro completo.",
        "Devi accettare il secondo risultato."
      ],
      "requirementsText": "Astuzia d12 · Comunicazione d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Comunicazione d10 · Limite: 1 volta per scena",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "presenza-schiacciante",
      "name": "Presenza Schiacciante",
      "skill": "Comunicazione",
      "attribute": "Spirito",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Comunicazione utilizzate per comandare o intimidire."
      ],
      "requirementsText": "Spirito d12 · Comunicazione d12",
      "metadata": "Tipo: Passivo · Requisiti: Spirito d12, Comunicazione d12",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "occhio-clinico",
      "name": "Occhio Clinico",
      "skill": "Medicina",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per scena",
      "frequency": "scene",
      "effects": [
        "Quando ottieni un successo con margine +4 in una Prova di Medicina effettuata su una creatura, la tua prossima Prova di Medicina sulla stessa creatura nella scena ottiene Vantaggio.",
        "Il beneficio termina dopo la Prova oppure alla fine della scena."
      ],
      "requirementsText": "Astuzia d12 · Medicina d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Medicina d10 · Limite: 1 volta per scena",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "mano-chirurgica",
      "name": "Mano Chirurgica",
      "skill": "Medicina",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per intervento",
      "frequency": "intervention",
      "effects": [
        "Quando un effetto medico che utilizzi richiede di tirare uno o più dadi per determinare PV recuperati, puoi ritirare uno di quei dadi.",
        "Devi accettare il nuovo risultato."
      ],
      "requirementsText": "Tecnica d12 · Medicina d12",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Medicina d12 · Limite: 1 volta per intervento",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "genio-meccanico",
      "name": "Genio Meccanico",
      "skill": "Meccanica",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Meccanica utilizzate per individuare un guasto o comprendere il funzionamento di un macchinario."
      ],
      "requirementsText": "Astuzia d12 · Meccanica d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Meccanica d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "mano-da-orologiaio",
      "name": "Mano da Orologiaio",
      "skill": "Meccanica",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando una Prova di Meccanica utilizza Tecnica come Attributo, aggiungi +2 al risultato della Prova.",
        "Il bonus si applica soltanto alle Prove di Meccanica realmente basate su Tecnica."
      ],
      "requirementsText": "Tecnica d12 · Meccanica d12",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Meccanica d12",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "senso-della-rotta",
      "name": "Senso della Rotta",
      "skill": "Navigazione",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per traversata",
      "frequency": "voyage",
      "effects": [
        "Quando fallisci una Prova di Navigazione, puoi ripetere il tiro completo.",
        "Devi accettare il secondo risultato."
      ],
      "requirementsText": "Astuzia d12 · Navigazione d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Navigazione d10 · Limite: 1 volta per traversata",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "nessun-mare-mi-ferma",
      "name": "Nessun Mare Mi Ferma",
      "skill": "Navigazione",
      "attribute": "Spirito",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per traversata",
      "frequency": "voyage",
      "effects": [
        "Quando fallisci una Prova di Navigazione con margine compreso tra -1 e -3, puoi considerare il margine pari a 0.",
        "La Prova viene quindi trattata come un successo al limite."
      ],
      "requirementsText": "Spirito d12 · Navigazione d12",
      "metadata": "Tipo: Passivo · Requisiti: Spirito d12, Navigazione d12 · Limite: 1 volta per traversata",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "orientamento-perfetto",
      "name": "Orientamento Perfetto",
      "skill": "Esplorazione",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Esplorazione utilizzate per orientarti, ritrovare un percorso oppure determinare una direzione."
      ],
      "requirementsText": "Astuzia d12 · Esplorazione d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Esplorazione d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "passo-dell-esploratore",
      "name": "Passo dell’Esploratore",
      "skill": "Esplorazione",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "1 volta per turno",
      "frequency": "turn",
      "effects": [
        "Puoi ignorare fino a 3 m di Terreno Difficile naturale ai fini del Movimento.",
        "Il tratto di terreno ignorato viene percorso come terreno normale. Il Terreno Difficile rimanente segue le regole ordinarie."
      ],
      "requirementsText": "Tecnica d12 · Esplorazione d12",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Esplorazione d12 · Limite: 1 volta per turno",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "istinto-naturalista",
      "name": "Istinto Naturalista",
      "skill": "Natura",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Natura utilizzate per riconoscere animali, piante, fenomeni climatici o pericoli naturali."
      ],
      "requirementsText": "Astuzia d12 · Natura d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Natura d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "maestro-artigiano",
      "name": "Maestro Artigiano",
      "skill": "Artigianato",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando ottieni un successo con margine +4 in una Prova di Artigianato effettuata per realizzare un oggetto, il tempo richiesto per quella realizzazione viene dimezzato.",
        "Il Tratto non riduce materiali, costi o requisiti dell’oggetto."
      ],
      "requirementsText": "Tecnica d12 · Artigianato d10",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Artigianato d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "inventore",
      "name": "Inventore",
      "skill": "Artigianato",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Artigianato utilizzate per progettare o modificare un oggetto."
      ],
      "requirementsText": "Astuzia d12 · Artigianato d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Artigianato d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "mano-pesante",
      "name": "Mano Pesante",
      "skill": "Carpenteria",
      "attribute": "Forza",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Carpenteria nelle quali spostare, mantenere in posizione o lavorare componenti pesanti costituisce la difficoltà principale dell’intervento."
      ],
      "requirementsText": "Forza d12 · Carpenteria d10",
      "metadata": "Tipo: Passivo · Requisiti: Forza d12, Carpenteria d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "occhio-strutturale",
      "name": "Occhio Strutturale",
      "skill": "Carpenteria",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Carpenteria utilizzate per individuare danni, cedimenti o punti deboli di una struttura."
      ],
      "requirementsText": "Astuzia d12 · Carpenteria d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Carpenteria d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "palato-assoluto",
      "name": "Palato Assoluto",
      "skill": "Cucina",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Cucina utilizzate per identificare ingredienti, alterazioni o errori di preparazione."
      ],
      "requirementsText": "Astuzia d12 · Cucina d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Cucina d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "cucina-dell-anima",
      "name": "Cucina dell’Anima",
      "skill": "Cucina",
      "attribute": "Spirito",
      "attributeDie": "d12",
      "skillDie": "d12",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando un piatto preparato da te recupera Stamina, ogni creatura che ne riceve il recupero ottiene +1 ST aggiuntiva.",
        "Una creatura può ricevere questo bonus una sola volta dallo stesso pasto."
      ],
      "requirementsText": "Spirito d12 · Cucina d12",
      "metadata": "Tipo: Passivo · Requisiti: Spirito d12, Cucina d12",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "mano-perfetta",
      "name": "Mano Perfetta",
      "skill": "Arte",
      "attribute": "Tecnica",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando una Prova di Arte utilizza Tecnica come Attributo, effettui la Prova con Vantaggio."
      ],
      "requirementsText": "Tecnica d12 · Arte d10",
      "metadata": "Tipo: Passivo · Requisiti: Tecnica d12, Arte d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "presenza-scenica",
      "name": "Presenza Scenica",
      "skill": "Arte",
      "attribute": "Spirito",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Quando ottieni un successo con margine +4 in una Prova di Arte davanti a un pubblico, la prima Prova di Comunicazione che effettui verso quello stesso pubblico nella scena ottiene Vantaggio.",
        "Il beneficio termina dopo la Prova oppure alla fine della scena."
      ],
      "requirementsText": "Spirito d12 · Arte d10",
      "metadata": "Tipo: Passivo · Requisiti: Spirito d12, Arte d10",
      "manual": "/manuale/#sez-16-9"
    },
    {
      "id": "memoria-del-mondo",
      "name": "Connessione Storica",
      "skill": "Archeologia",
      "attribute": "Astuzia",
      "attributeDie": "d12",
      "skillDie": "d10",
      "requires": [],
      "replaces": [],
      "type": "Passivo",
      "limit": "",
      "frequency": "",
      "effects": [
        "Effettui con Vantaggio le Prove di Archeologia utilizzate per collegare un reperto, un luogo o un’iscrizione a informazioni che il personaggio conosce già.",
        "Il Tratto non fornisce conoscenze che il personaggio non possiede."
      ],
      "requirementsText": "Astuzia d12 · Archeologia d10",
      "metadata": "Tipo: Passivo · Requisiti: Astuzia d12, Archeologia d10",
      "manual": "/manuale/#sez-16-9"
    }
  ]
};
})(typeof window!=='undefined'?window:globalThis);
