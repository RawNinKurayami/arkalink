# Prestigio di Grand Line Chronicles

Il catalogo applica l'aggiornamento ufficiale e le quattro fonti fornite dal creatore:
Introduzione al Prestigio, Prestigio Combattente, Prestigio Ruoli e Prestigio Haki.

## Fonti e manuale

- `regole/prestigio-fonti.json` conserva i blocchi delle quattro fonti in ordine.
- `regole/prestigio-revisioni.json` registra le sole correzioni necessarie alla regola ufficiale più recente: un Talento di Ruolo evoluto rende indisponibile la precedente versione separata.
- `regole/prestigio-catalogo.json` contiene requisiti, scelte, costi e riferimenti alle fonti.
- `python3 strumenti/prestigio-manuale.py` rigenera il manuale web e `prestigio-data.js`, verificando la copertura integrale dei blocchi.
- Il manuale base mantiene il proprio generatore e le correzioni esplicite in `manuale-correzioni.json`.

## Progressione e compatibilità

Le soglie P.A. oltre d20 non sono definite nelle fonti: i passaggi vengono assegnati dal GM tramite i controlli del dado esistenti. Non sono introdotti costi automatici.
Attributi, Skill di Ruolo e Colori Haki avanzano separatamente. Le scelte si aprono ai Prestigi I, III e V; Saikyō non dà una quarta scelta.

La proprietà facoltativa `prestige` conserva scelte dei percorsi, scelte di Spirito e contatori di sessione. Le normali chiavi di salvataggio, il cloud e gli identificativi dei personaggi restano quelli esistenti. Scelte temporaneamente non valide vengono conservate ma rese inattive.
I talenti ordinari sostituiti rimangono acquisiti come prerequisiti. Non si possono usare separatamente dall'evoluzione; i benefici incorporati vengono mostrati nella descrizione della versione corrente.

Armamento e Osservazione vengono limitati al dado completo di Spirito durante la lettura/importazione e dopo una modifica. I dadi precedenti restano in `prestigePreviousDice`. L'aumento di Spirito non rialza automaticamente il Colore né restituisce PIP già consumati. Il Re non ha dado: i suoi tre Prestigi sono assegnati dal GM con `prestigeGM`, mantenendo il massimo di 3 PIP.

## Uso al tavolo

Il sigillo Prestigio mostra i percorsi già raggiunti, i valori attuali degli Attributi e il registro della sessione. Le schede operative non contengono anteprime dei livelli successivi: le scale complete restano nel manuale. Gli alberi separano i talenti acquisiti dalle scelte acquisibili con livello, prerequisiti e posti attuali; le scelte conservate ma inattive restano accessibili senza mostrarne benefici come utilizzabili. Il riquadro Haki elenca soltanto gli effetti sbloccati, con costi e durate attuali.

`regole/prestigio-presentazione.js` contiene i riepiloghi operativi dei 52 talenti e dei 9 effetti Haki, derivati dal livello del rispettivo percorso. Vengono usati anche nelle descrizioni delle Special Moves e nei dati della scheda stampabile. Non modifica costi, sblocchi, formule o salvataggi: quando cambia una regola ufficiale occorre aggiornare anche il relativo riepilogo. I documenti e il catalogo conservano le regole integrali.

I contatori registrano utilizzi risolti al tavolo e non consumano automaticamente azioni o ST. Riscossa della Volontà recupera soltanto i PIP assegnati e consentiti. La Special Move mostra costi, incompatibilità, requisiti di preparazione ed effetti senza spendere risorse.

## Verifica

`node --test tests/glc-*.test.cjs`

La suite copre regole, conservazione delle scelte, sostituzioni, limite di Spirito, formule del Composer, filtri reali del Signature Builder, login e sincronizzazione. I test di presentazione verificano anche selezione delle capacità attuali, valori delle scale, passaggi di livello, varianti Haki, descrizioni nel Composer e comandi della UI tramite un adattatore del documento senza browser. Le prove non usano account né personaggi reali.
La verifica visiva nel browser non è stata eseguita: l'accesso locale è rimasto bloccato da un permesso salvato e il creatore ha autorizzato il completamento senza tale verifica.
