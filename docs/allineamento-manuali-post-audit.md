# Allineamento GLC dopo l’audit

Fonte: `GLC_Patch_Allineamento_Manuali_Post_Audit.docx`, versione 1.0 del
7 ottobre 2026. Le decisioni approvate diventano regole correnti nei manuali
web e nella Gestione del pirata, comprese le schede stampabili.

Il manuale base mantiene sette Razze: Umano, Uomo Pesce / Tritone,
Gigante, Mink, Lunarian, Cyborg e Tontatta. Cyborg diventa §3.7 e Tontatta
§3.8. Le due Razze rimosse non sono più selezionabili per nuovi personaggi;
i personaggi storici mantengono identità e dati, con un avviso dedicato.

La DP usa il Grado completo dell’Attributo Razziale: somma dei massimi
dei dadi +1. I valori di Prestigio sono 25/27/29/31/33/41, prima dei
modificatori. Corpo Mostruoso aggiunge +2; Fortezza Vivente lo sostituisce
con +4 totale. La contesa per liberare un Tontatta dalla Presa aggiunge
+3 al risultato di Forza dell’avversario che lo trattiene.

Il Colpo Sfonda usa la Skill di Ruolo sui colpi base e il Grado della
Tecnica sui colpi prodotti da una Tecnica Striker. Smash Hit usa la Skill
che governa effettivamente lo Striker, Atletica oppure Acrobazia, nei
quattro tiri, nel Dado Danno e nella fonte delle Salvezze. Conserva le
proprie esclusioni e resta un’unica combinazione.

Ryou moltiplica una sola volta per due il danno totale dell’attacco fisico
scelto, inclusi i contributi applicabili. Il colpo dall’interno è una
descrizione narrativa. Ryou Persistente mantiene un’applicazione per
turno, dichiarata prima del tiro, anche quando il colpo manca. Gli effetti
esclusivi del bersaglio principale di Esplosione Haki Superiore mantengono
i propri limiti. Per le Tecniche Frutto, la formula resta condizionata a
un attacco fisico compatibile, da verificare con il GM; la sola Fonte
Frutto non autorizza Ryou sulle emissioni non fisiche.

Il Tratto Unico si chiama Connessione Storica; conserva l’ID
`memoria-del-mondo` per mantenere acquisizioni, riferimenti e spese di
Upgrade esistenti. Il Talento Archeologo Memoria del Mondo conserva il
proprio nome e funzionamento.

Forma di Combattimento segue la personalizzazione ufficiale del capitolo
5 del manuale Frutti. Riformarsi Altrove si sblocca a d10 ed è una Reazione a un evento
immediato e percepibile, con valutazione del GM, destinazione visibile e
compatibile con la manifestazione del Logia entro 15 metri.

Le correzioni editoriali eliminano i residui Markdown, le frasi fuse e
il titolo Potenziamento duplicato. Le correzioni persistono nelle fonti
di rigenerazione. Restano invariati Guardia, slot d4/d6, acquisizione
esplicita dei Tratti e assenza di Area ordinaria Striker. Il Manuale del
Cyborg è identico alla versione precedente, verificata tramite SHA-256
`722f196ba4666ddc06a0990fcd3f0d158e52b9b25e0d368030840792fa7e4710`.

I nuovi snapshot delle Special Moves hanno versione 7; le stampe generate
con le regole precedenti richiedono un aggiornamento dalla Gestione del
pirata.

Verifiche automatiche: 269/269 test Node del gestionale e 38/38 controlli
Python dei manuali, senza casi saltati. I generatori Prestigio e Frutti
verificano gli output correnti con `--check`; il catalogo dei 31 Tratti
corrisponde alla fonte ufficiale. Le prove nel browser usano personaggi
artificiali e autenticazione simulata, su desktop e telefono.
Esito: 468/468 controlli browser, di cui 154 dedicati alla patch e 314
regressioni su Cyborg, Special Moves e gestione generale, senza eccezioni
JavaScript.

Backup precedente: commit `05e1859989e578889a227b6bd4c0cde72613fa23`, ramo
`backup/glc-prima-post-audit-20261007t164254z`. Archivio ZIP verificato,
445 file, SHA-256
`dd21657fd6e1d9b8c498f4ea6738046d8466a058770c0c0fc58d7b927e96cbe8`.
