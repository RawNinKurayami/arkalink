# Scheda Frutto e Portale della Nave

La scheda del Frutto segue il Manuale dei Frutti del Diavolo; il portale della nave segue il Capitolo 13 del Manuale base e le capacità pertinenti dei Ruoli e del Prestigio. Le definizioni narrative, i progetti e le annotazioni non concedono automaticamente Talenti, effetti o risorse.

## Frutto

- Scheda di Identità (§2.1), con Limitazioni strutturali separate dai Contraccolpi (§2.8), scelte permanenti dei Talenti, Forma di Combattimento e progetto del Risveglio.
- Scheda della Creatura Zoan, Categoria e forme; Armi Naturali registrate separatamente dall'Arsenale. Il loro Grado segue il Dado del Frutto, il loro utilizzo segue Attributo e forma appropriati; costruire Tecniche di Stile richiede comunque lo Stile compatibile.
- Portata Naturale, Senza Contraccolpo, Potere Istintivo, Trasformazione Istintiva e Firma Zoan ricontrollati nel costruttore, nelle Special Moves e nella stampa.
- Dado del Frutto limitato alla scala d4–d20. Dadi storici fuori scala e acquisizioni non più utilizzabili restano leggibili; non concedono benefici ordinari. Il Risveglio richiede progetto, Ambizione, permesso del GM e acquisizione.
- La compilazione può essere progressiva. I dati mancanti sono segnalati; nomi, note, scelte, ID e campi aggiuntivi si conservano anche cambiando Tipo o Grado. Una concessione collegata a un Talento viene ricontrollata sui requisiti attuali.

## Nave

- Nuove navi con una statistica d8 e le altre d6; configurazione iniziale selezionabile. I salvataggi precedenti mantengono dadi e PS reali.
- PS, condizioni, slot e Unità di Stiva distinti. Compartimenti stagni modifica l'affondamento a −10 PS. Riparare un componente ripristina il suo funzionamento senza regalare PS.
- Speronamento usa Forza del Capitano; Spirito resta distinto. Postazioni collegabili ai pirati salvati o a una scheda manuale dell'operatore, con verifica dei Talenti pertinenti.
- Manovre, Azioni degli operatori e usi limitati vengono registrati separatamente. Danni, riparazioni e lavori permanenti non vengono applicati durante la sola apertura della scheda.
- Importazioni creano nuove navi conservando quelle esistenti. I campi aggiuntivi, le note e i riferimenti dei Moduli vengono mantenuti; record strutturalmente invalidi si conservano in archivio per la correzione.

## Decisioni del GM

Il §13.6 scrive «Vele/Artiglieria −1 dado» senza definirne la conversione numerica. La scheda registra esplicitamente l'interpretazione del GM: riduzione di un gradino, minimo d4, oppure rimozione del dado Nave dal tiro. Senza scelta, una formula interessata dal danno segnala il dato da chiarire. Le statistiche originali rimangono conservate.

I bonus generici dei Moduli devono essere completati con il dado, le Unità di Stiva o il valore previsto (§13.16.3). Le ricette storiche restano disponibili come schede del Portale cui il manuale rimanda; il GM conferma tempi, cumulo dei modificatori e conseguenze non definite. Le riparazioni che indicano soltanto una condizione richiedono PS finali coerenti, senza un recupero numerico inventato.

La Firma del Carpentiere segue la regola specifica di Riparazione d'Emergenza (§4.9.1 e §13.14.5). Il §11.13 contiene una formulazione generale più ampia: questa revisione dell'app non la estende automaticamente agli interventi ordinari. I manuali non vengono riscritti da questa sincronizzazione.

## Backup e verifiche

Backup precedente alle modifiche: commit `bec9c833bb2de10cfc19af0d42235fdb15091bb9`, ramo remoto `backup/glc-prima-frutto-nave-20261007t172558z`. Archivio completo con 402 file; SHA-256 `c5a977241dba8322a21c482d8cd086b91c0987d5d6d9307eabdc5b0b543ba7f4`.

Verifiche superate: 323 test Node, 38 test Python sui manuali e i tre controlli di generazione dei cataloghi. Le prove browser comprendono 1.004 controlli su Frutto, Nave, creazione, gestione del pirata, Tratti, Haki, cyborg e Special Moves, con desktop e telefoni da 375 e 390 pixel. Sono verificati anche rifiuti di salvataggio, importazioni, esportazioni, ricaricamento e le due modalità di stampa.

Una modifica del progetto di Forma di Combattimento invalida la precedente approvazione dei costi della carta, conservandone ID e scelte. I campi narrativi del progetto non vengono interpretati automaticamente come importi da spendere. Il costruttore restituisce errori di validazione anche per schede storiche prive del campo Frutto, senza interrompersi.

La pubblicazione viene verificata sul commit esatto tramite l'esito del deployment GitHub Pages e il confronto byte per byte degli asset pubblici del commit. L'ambiente cloud blocca la richiesta diretta al dominio del sito; quel controllo HTTP non è disponibile. Rapporti, screenshot, stampe e manifest della pubblicazione sono conservati in `/workspace/shared/glc-frutto-nave-sync/`.
