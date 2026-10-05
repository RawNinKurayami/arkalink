/* Operational descriptions, derived from the current character. This layer never
 * changes unlocks, costs, choices or resources. Full rules live in the manual. */
(function(root){
'use strict';
const P=root.GLCPrestige,D=P.data;
const number=n=>Number(n).toLocaleString('it-IT',{maximumFractionDigits:2,useGrouping:true});
const action=a=>({bonus:'Azione Bonus',reaction:'Reazione',action:'Azione',passive:'Passivo',modifier:'Modificatore · nessuna Bonus',preparation:'Preparazione'})[a]||a;
const frequency=f=>({turn:'per turno',combat:'per combattimento',naval:'per battaglia navale',scene:'per scena',plan:'ridadi per piano'})[f]||'utilizzi';
const sheet=(effect,...details)=>({effect,details});
function choices(c,key){
 const states=P.states(c,key),active=states.filter(t=>t.active),available=states.filter(t=>t.available),inactive=states.filter(t=>t.owned&&!t.active);
 const slots=states.length?P.slots(states[0].path.die):0;
 return {active,available,inactive,slots,remaining:Math.max(0,slots-active.length),blocked:states.filter(t=>!t.owned&&!t.available).length};
}
function talent(c,t){
 const s=t.level===6,die=t.path.die,extra=Number(String(die).split('+d')[1])||0;
 const force=c.attr?.Forza||'—',mind=c.attr?.Astuzia||'—',spirit=c.attr?.Spirito||'—';
 const scale=(attr,key,fallback)=>D.scales[key][P.level(c.attr?.[attr])-1]??fallback;
 const forceArea=scale('Forza','destruction',null),area=[10,10,20,20,50,100][t.level-1];
 const blade=key=>['Forza','Tecnica'].map(a=>{const value=scale(a,key,key==='slash'?10:null);return a+': '+(value==null?'richiede Prestigio':number(value)+' m');}).join(' · ');
 const descriptions={
  'potenza-del-titano':()=>sheet('Aggiungi un tiro di Forza ('+force+') al danno di ogni colpo a mani nude riuscito.',
   'Vale per attacchi base, Tecniche offensive Striker, attacchi extra e Reazioni compatibili. Tira Forza separatamente dal tiro per colpire.',
   'Non aggiungerlo nuovamente a Schianto: quello richiede soltanto il proprio tiro di Forza.'),
  'impatto-devastante':()=>sheet(forceArea?'Propaga il colpo alle creature entro '+number(forceArea)+' m di raggio.':'Per propagare il colpo serve Forza in Prestigio.',
   'Dopo un colpo a mani nude o di una Tecnica Striker in mischia riuscito nel tuo turno, scegli un raggio entro il tuo massimo. Gli alleati nell’area devono difendersi; tu sei escluso.',
   'Stesso tiro per colpire e danno iniziale, attenuato con la distanza. Niente secondo danno al bersaglio iniziale, Schianto o copia automatica degli effetti. Conservi il danno pieno agli oggetti di Pugni che Rompono.'),
  'precisione-assoluta':()=>sheet('Puoi inserire Punto di Rottura nelle Tecniche Striker in mischia basate su Tecnica.',
   'L’effetto costa 2 ST e 1 slot. Dichiara una parte raggiungibile prima del tiro: con un colpo pulito (+4), sostituisce lo stato della Firma e conserva il danno.',
   'Mano inutilizzabile oppure Movimento volontario bloccato: fino a un’Azione di recupero o alla fine dello scontro. In alternativa interrompi una presa o danneggi un componente secondo i suoi PS. Una sola funzione neutralizzata per bersaglio.'),
  'raffica-senza-fine':()=>sheet('Dopo un attacco a mani nude, esegui attacchi extra finché puoi pagarne il costo.',
   'Una sola Bonus avvia la sequenza: 2 ST per ogni attacco extra, più tutti i costi della Tecnica se ne usi una. Decidi se proseguire dopo ciascun colpo; anche un attacco mancato paga il costo.',
   'Ogni colpo ha tiro, portata e difese propri. Non concede altre Bonus, Movimento o attivazioni Haki. Le versioni precedenti di Raffica non si sommano.'),
  'fendente-sovrano':()=>sheet('Fendente a distanza con danno pieno. '+blade('slash')+'.',
   'Usa la portata dell’Attributo della Tecnica Swordsman in mischia, eseguita con una lama. Il costo è +1 ST, senza Bonus.',
   'Restano Forma, bersagli, slot, effetti, ostacoli e difese normali. Gli effetti a contatto richiedono ancora il contatto.'),
  'taglio-colossale':()=>sheet('Recidi un elemento dello scenario: sezione massima '+blade('cut')+'.',
   'Prima del prossimo attacco con lama nel tuo turno, dichiara l’elemento. Se colpisci, aggiungi un tiro completo dell’Attributo del colpo al danno strutturale.',
   'Servono portata valida e danno sufficiente ad azzerare i PS dell’elemento, dopo le resistenze. Il bonus non colpisce automaticamente creature nella sezione; l’Attributo deve essere in Prestigio per questa scala.'),
  'guardia-invalicabile':()=>sheet('Alla Parata con lama aggiungi un tiro completo di Atletica ('+die+').',
   'Formula: Attributo della Parata + Dado Arma + Atletica. Una riuscita protegge anche gli alleati entro 5 m dietro di te, se la lama intercetta realmente la traiettoria.',
   'Solo attacchi fisicamente intercettabili. Una volta per scontro puoi ripetere la Parata fallita accettando il secondo risultato, senza ripagare ST o Reazione. Restano eventuali costi della difesa.'),
  'maestria-assoluta-della-lama':()=>sheet('Ogni lama compatibile che impugni usa d20 come Dado Arma.',
   'Attacco base e Parata: Attributo + d20. Danno base: 1d20, più i benefici compatibili.',
   'Il Grado reale, i requisiti e le proprietà dell’arma restano gli stessi. Le Tecniche conservano i propri dadi; il Prestigio non aggiunge un secondo dado al Dado Arma.'),
  'maglio-inarrestabile':()=>sheet('Vantaggio al colpo, +2 Dadi Danno, +Forza ('+force+') ai danni e Sbilanciamento se colpisci.',
   'Dichiara prima di un attacco contundente compatibile nel tuo turno. DP −5 fino all’inizio del tuo prossimo turno, anche se manchi. Le 3 ST sostituiscono il costo di Maestria.',
   'Se il tiro supera la difesa per colpire ma una Parata riesce: metà del danno, arrotondata per difetto, poi le riduzioni; nessun altro effetto del colpo. Una Schivata riuscita evita tutto.'),
  'onda-sismica':()=>sheet(forceArea?'Cono di 90° fino a '+number(forceArea)+' m: danno attenuato, spinta di 3 m e Sbilanciamento.':'Per generare l’onda serve Forza in Prestigio.',
   'Dopo un colpo contundente di Forza riuscito nel tuo turno: deve trasmettersi a una superficie. Colpisce solo le creature appoggiate alla superficie collegata, compresi gli alleati; tu sei escluso.',
   'Stesso tiro per colpire e danno iniziale, con fasce calcolate sul raggio massimo. Niente duplicazione sul bersaglio iniziale, Schianto o propagazione degli altri effetti. Le 3 ST sostituiscono il costo dell’onda precedente.'),
  'guardia-frantumata':()=>sheet('Con un colpo contundente pulito, impedisci Parate e blocchi fisici fino alla fine del prossimo turno del bersaglio.',
   'Con un colpo riuscito ma non pulito: la sua prossima Parata o Difesa Attiva entro quella scadenza ha Svantaggio.',
   'Schivata, DP e riduzioni restano valide. Solo il bersaglio diretto; niente attivazione dal danno residuo di un colpo parato o dai bersagli dell’onda.'),
  'arresto-del-colosso':()=>sheet('Intercetta con un attacco base contundente: aggiungi Atletica ('+die+') al tiro per colpire.',
   'Una volta per turno, quando un nemico entra nella portata dell’arma. Devi rispettare Baricentro Assoluto: cosciente, a terra, senza Movimento volontario.',
   'Se colpisci e infliggi danno effettivo, il suo Movimento termina per quel turno. Conserva le altre azioni. Non è una Tecnica e Atletica non si somma al danno.'),
  'tiro-risolutivo':()=>sheet('Al prossimo attacco a distanza Singolo riuscito aggiungi Astuzia ('+mind+') al danno e lo consideri pulito.',
   'Attiva prima del tiro, una volta nel tuo turno. Il beneficio scade con il prossimo attacco valido, anche mancato, o alla fine del turno.',
   'Non modifica il tiro per colpire e non si distribuisce tramite Area, Rimbalzo o Catena. Restano i costi e le difese normali.'),
  'precisione-chirurgica':()=>sheet('Un colpo a distanza pulito infligge il normale danno e neutralizza il punto dichiarato.',
   'Mano inutilizzabile o Movimento volontario bloccato fino alla fine del prossimo turno del bersaglio. Un oggetto viene interrotto solo se il danno azzera i suoi PS.',
   'Un solo arto neutralizzato per bersaglio; serve una traiettoria valida. Con un colpo non pulito infliggi solo il danno. Il costo si paga anche se manchi.'),
  'interdizione-sovrana':()=>sheet('Attacca a distanza prima che un nemico osservato completi l’Azione dichiarata.',
   'Se colpisci, infliggi danno e la sua Azione ha Svantaggio. Con un colpo pulito puoi impedirla se interrompi concretamente ciò che serve a eseguirla, dichiarato prima del tiro.',
   'Il nemico consuma l’Azione ma conserva le altre possibilità. Restano portata, difese e PS dei componenti; non puoi fermare un proiettile già partito.'),
  'danza-dei-proiettili':()=>sheet('I bersagli di Rimbalzo o Catena ricevono il danno pieno della Tecnica.',
   'Rimbalzo: fino a 2 bersagli, entro 5 m fra loro. Catena: fino a 3 in fila. Tiro per colpire separato, un solo tiro di danno; ogni bersaglio mantiene le difese.',
   'Servono gli effetti e gli slot nella Tecnica. +1 ST per utilizzo; nessuna Bonus. Traiettorie anomale richiedono anche Colpo Impossibile e i suoi 2 ST.'),
  'ordine-sovrano':()=>sheet((s?'Due alleati':'Un alleato')+' che '+(s?'ti vedono o sentono eseguono':'ti vede o sente esegue')+' subito Movimento e Azione con Vantaggio.',
   'L’intervento non consuma il turno normale degli alleati e non concede una Bonus. Ciascuno paga i propri costi.',
   'Il limite è condiviso con gli ordini ordinari.'+(s?' L’ordine ai due alleati conta come un solo utilizzo.':'')),
  'grido-leggendario':()=>sheet('Gli alleati che ti sentono rimuovono uno Stato negativo rimovibile e aggiungono Comunicazione ('+die+')'+(s?' ai prossimi due tiri.':' al prossimo tiro.'),
   'Tira Comunicazione una sola volta, senza Spirito: tutti ricevono quel risultato. Si applica alle prove pertinenti, non direttamente ai danni.',
   'L’utilizzo è condiviso con Grido di Guerra.'),
  'il-piano-perfetto':()=>sheet('Prepara '+t.limit+' ridadi condivisi per la ciurma.',
   'Contromossa: prima del tiro di un attacco nemico percepito, spendi Reazione e 2 ridadi per muovere '+(s?'3':'2')+' alleati raggiunti dai comandi, incluso te, fino alla loro Velocità senza Reazioni da disimpegno.',
   'Solo chi esce davvero dalla portata o area evita l’attacco. Restano le condizioni di preparazione de Il Piano.'),
  'orchestra-vivente':()=>sheet('Mantieni '+(s?'4':'3')+' Canzoni insieme, senza ST di mantenimento.',
   'Una sola Azione può intonare due Canzoni distinte: paghi entrambe le attivazioni; Fiato Lungo si applica a ciascuna.',
   'Stessa Melodia sullo stesso bersaglio non somma benefici. Ogni Canzone conserva portata, durata e destinatari.'),
  'risonanza-leggendaria':()=>sheet('Benefici delle Canzoni ×'+(s?'3':'2')+': dadi di recupero ST, dadi bonus alle prove e sconti ST.',
   'Motivetto: '+(s?'3d6':'2d6')+' ST. Marcia: +'+(s?'3d4':'2d4')+' al tiro previsto. Crescendo: −'+(s?'6':'4')+' ST alla Tecnica, minimo 1 ST quando previsto.',
   'Restano invariati Vantaggio, ridadi, portata, bersagli, costi, sconti PIP e Canzone dell’Anima.'),
  'requiem-sovrano':()=>sheet('Raggio '+(s?'500':'50')+' m · Soglia ordinaria dello strumento +'+extra+'.',
   'I nemici che ti sentono effettuano la Salvezza: chi fallisce ha Svantaggio a tutti i tiri fino all’inizio del tuo prossimo turno. Nessun danno diretto o tiro per colpire.',
   s?'Con Coro della Ciurma e due compagni realmente partecipanti al canto, il raggio diventa 1.000 m.':'Restano le normali condizioni di Requiem.'),
  'tossine-sovrane':()=>sheet('Veleni: Soglia +'+extra+' e, su Salvezza fallita, un Attributo ridotto di '+(s?'3':'2')+' gradini.',
   'Il bonus sostituisce il +2 ordinario e si applica alla Soglia registrata nella scheda del veleno. La riduzione dura fino a un antidoto efficace, segue anche i dadi di Prestigio e non scende sotto d4.',
   'Sullo stesso Attributo si applica solo la penalità maggiore: applicazioni ripetute e Firma non sommano riduzioni.'),
  'nebbia-pestilenziale':()=>sheet('Nube di '+area+' m di raggio, centro entro '+(s?'100':'20')+' m, durata '+(s?'5':'3')+' turni.',
   'Consuma una dose di Veleno inalabile, senza tiro per colpire; il centro dev’essere visibile e raggiungibile, mai oltre ostacoli solidi. Chi è nella nube quando compare, chi vi entra o vi inizia il turno effettua la Salvezza: se fallisce è Avvelenato e Accecato.',
   'Tossine Sovrane si applica se acquisito. Anche gli alleati sono esposti; Profilassi protegge solo chi è stato trattato per quella tossina. Valgono pareti, ventilazione, acqua e maschere.'),
  'antidoto-perfetto':()=>sheet('Entro '+(s?'10':'5')+' m, neutralizzi tutti i veleni di un alleato e ripristini gli Attributi ridotti dalle tossine.',
   'Consuma una dose di antidoto preparata da te: la portata è quanto raggiungi con la Reazione, su un percorso praticabile. Rimuove gli stati delle sostanze, ma non restituisce i PV persi. Gli utilizzi sono condivisi con Antidoto Istantaneo.',
   ...(s?['Il bersaglio è immune alle tossine appena neutralizzate per il resto del combattimento.']:[])),
  'chirurgia-leggendaria':()=>sheet('Cure da Campo riuscite: PV recuperati ×'+(s?'3':'2')+' e fino a '+(s?'3':'2')+' Stati negativi rimovibili rimossi.',
   'Calcola prima il recupero ordinario con i bonus. Restano Prova di Cura da Campo, materiali, accesso fisico al paziente, limite sul paziente e numero di pazienti consentito da Mani da Chirurgo — Migliorato.',
   'Il moltiplicatore non si applica alla ST o alla rianimazione di Intervento Prodigioso.'),
  'intervento-prodigioso':()=>sheet('Raggiungi un alleato a 0 PV entro '+(s?'20':'10')+' m: stabilizzi e restituisci un tiro di Medicina ('+die+') in PV.',
   'Deve essere ancora in vita: lo spostamento fa parte della Reazione, su un percorso praticabile e con accesso fisico al paziente. Non superi i PV massimi; il tiro misura il recupero e non è una seconda prova. Sostituisce l’1d4 di Specialista in Rianimazione.',
   'Non consuma il limite delle Cure da Campo e non riceve il moltiplicatore di Chirurgia Leggendaria. Usi condivisi con Intervento Immediato.'),
  'diagnosi-assoluta':()=>sheet('Gli attacchi che sfruttano la debolezza '+(s?'ignorano la Riduzione del Danno fissa.':'considerano metà della Riduzione del Danno fissa, per difetto.'),
   'Prova di Medicina contro DP su un nemico vivente visibile. Se riesci, il beneficio dura fino all’inizio del tuo secondo turno successivo. Una sola Diagnosi attiva.',
   'DP e Difese Attive restano valide. Il primo alleato che sfrutta la debolezza conserva il Vantaggio ordinario.'),
  'reazioni-catastrofiche':()=>sheet('Il danno iniziale dei preparati offensivi diventa ×'+(s?'3':'2')+'.',
   'Il danno iniziale è il Dado Danno della scheda del preparato, compreso il dado di Reazioni Violente — Base; applica poi difese e riduzioni. Non moltiplica bruciature o altri danni successivi, né modifica gli stati.'),
  'sintesi-perfetta':()=>sheet('Combina '+(s?'3':'2')+' famiglie differenti di reagenti in una dose.',
   'Ogni componente deve avere una scheda completa ed essere preparabile da te; servono gli ingredienti di tutte. Si sommano gli effetti distinti, non i danni completi: usa una volta il danno iniziale della componente più potente.',
   'Raggio minore fra le componenti, durate proprie, nessun cumulo dello stesso stato. Una sola Azione usa e consuma la dose.'),
  'dispersione-sovrana':()=>sheet('Preparato ad area: raggio massimo '+area+' m, lancio entro '+(s?'100':'30')+' m.',
   'La Bonus prepara la diffusione: serve ancora l’Azione per lanciare e consumare la dose. L’origine dev’essere visibile e raggiungibile, mai oltre pareti o ostacoli solidi.',
   'Il raggio comprende già il raddoppio ordinario. Lancio Preciso determina chi puoi escludere; danni, Stati e Salvezze restano quelli del preparato: cambiano solo diffusione e Portata di lancio.'),
  'progettazione-perfetta':()=>sheet('Costruisci con '+(s?'1/10':'1/4')+' del tempo e '+(s?'1/4':'metà')+' dei materiali di lavorazione.',
   'Sostituisce le riduzioni del Capolavoro. Componenti indispensabili, strumenti, prova e requisiti restano necessari.',
   'Il progetto conserva i propri effetti e il normale effetto unico della Maestria.'),
  'arsenale-da-campo':()=>sheet('Usa subito un prototipo già preparato, fino al Grado '+(s?'d20':'d12')+'.',
   'Devi averne definito la funzione e possedere i componenti. Tiri e Salvezze si risolvono normalmente; dopo un uso il prototipo va ricostruito.',
   'Gli utilizzi sono condivisi con Prototipo da Campo.'),
  'sovraccarico-controllato':()=>sheet('Moltiplica ×'+(s?'3':'2')+' un valore della tua invenzione: danno proprio, portata o danno assorbito.',
   'Vale per il prossimo uso entro fine turno. Poi il congegno è inutilizzabile fino all’inizio del tuo prossimo turno.',
   'Per un’arma moltiplica solo i suoi dadi, non Attributi, Tecniche o Haki. Non modifica Azioni, precisione o Soglie; restano i consumi normali.'),
  'regia-meccanica':()=>sheet('Con una sola Azione gestisci '+(s?'8':'4')+' macchinari.',
   'Servono comandi raggiungibili o una postazione realmente collegata. Ogni macchina paga tiri, energia e munizioni propri.',
   'I benefici che concedono una seconda attivazione non si moltiplicano fra loro. Non assegna Azioni ai personaggi né manovre complete della nave.'),
  'ricostruzione-prodigiosa':()=>sheet('Ripristina un macchinario; oppure cura un Cyborg con '+(s?'3':'2')+' tiri di Meccanica ('+die+') e ripara '+(s?'2 Moduli.':'1 Modulo.'),
   'Servono prova di riparazione riuscita, attrezzi, ricambi e componenti. Il Cyborg deve essere vivo; non superi i PV massimi.',
   'Puoi ripristinare Moduli danneggiati o distrutti. Un Cyborg a 0 PV torna cosciente se recupera PV.'),
  'dominio-delle-macchine':()=>sheet('Sabota o controlla '+(s?'tutti i macchinari':'fino a 3 macchinari')+' dello stesso sistema collegato.',
   'Raggiungi un comando o collegamento e supera la prova di Meccanica. Fuori uso per la battaglia oppure controllo per la scena: usarli richiede comunque Azioni e consumi.',
   'Un avversario può riprendere il controllo raggiungendo il sistema, spendendo un’Azione ed eguagliando o superando il tuo tiro di Meccanica.'),
  'ricostruzione-leggendaria':()=>sheet('Riparazione d’emergenza riuscita: PS recuperati ×'+(s?'3':'2')+' e '+(s?'2 Moduli distrutti ripristinati.':'1 Modulo distrutto ripristinato.'),
   'Calcola prima il recupero ordinario con i bonus. Servono materiali; non superi i PS massimi. Restano gli interventi della versione Migliorata.',
   'Gli utilizzi sono condivisi con il ripristino ordinario della Maestria.'),
  'nave-leggendaria':()=>sheet('A fine costruzione o ristrutturazione completa: +'+(s?'100':'50')+'% PS massimi e '+(s?'3':'2')+' slot Modulo aggiuntivi totali.',
   'Una sola applicazione per nave, con PS arrotondati per eccesso. Gli slot includono quello di Maestro dei Moduli; i Moduli vanno costruiti e installati.',
   'Richiede vero lavoro in cantiere, materiali e tempi del progetto. Non trasforma Barricata in una costruzione istantanea.'),
  'scafo-inespugnabile':()=>sheet('Lo Scafo rinforzato subisce '+(s?'un quarto':'metà')+' dei danni da impatti fisici, arrotondati per eccesso.',
   'Vale dopo i lavori di rinforzo, per cannonate, speronamenti e altri impatti. Sostituisce la riduzione di un dado di Scafo Rinforzato.'),
  'timoniere-leggendario':()=>sheet('Con una manovra evasiva annulli tutti i colpi di una salva in arrivo.',
   'Devi essere al timone e la nave deve poter manovrare. Attacchi separati richiedono usi separati; il limite è condiviso con Timoniere Nato — Migliorato.',
   ...(s?['Con la stessa Reazione puoi anche guadagnare o perdere una fascia di distanza, secondo il Movimento della nave.']:[])),
  'rotta-sovrana':()=>sheet('Verso una destinazione già raggiunta, la traversata richiede '+(s?'un quarto':'metà')+' del tempo ordinario.',
   'Prepara la rotta con correnti, venti e passaggi. Restano le prove di traversata e i pericoli: il viaggio va comunque svolto.'),
  'cartografia-leggendaria':()=>sheet('Una carta completata o aggiornata da te concede +'+die+' alle prove che la utilizzano.',
   'Il dado di Navigazione si registra al completamento: la carta conserva quel valore e può essere usata da un altro navigatore.',
   'Le carte già realizzate non cambiano automaticamente: per migliorarle serve nuovo lavoro cartografico.'),
  'lettura-assoluta':()=>sheet('Traduzione riuscita: testo completo e dettaglio della Firma, anche senza margine +4.',
   'Una singola iscrizione o stele leggibile, incluso un Poneglyph, richiede al massimo '+(s?'10 minuti':'1 ora')+'. Mantieni un tempo inferiore se già previsto; archivi e molte iscrizioni richiedono studio delle singole parti.'),
  'archivio-vivente':()=>sheet('In 5 minuti ottieni '+(s?'3 risposte':'2 risposte a scelta')+' da tracce e testimonianze di un soggetto antico.',
   'Domande: funzione originaria; pericolo o difesa documentati; modo corretto di accedere, usare o disattivare.',
   'Le risposte dipendono da storia, iscrizioni, materiali e conoscenze effettivamente disponibili.'),
  'maestro-dei-meccanismi-antichi':()=>sheet('Intervieni su '+(s?'2 meccanismi collegati':'un meccanismo antico')+' mentre sta per scattare: attiva, blocca o inverti, se possibile.',
   'Devi aver identificato il dispositivo e raggiungere un comando o collegamento utile. Restano i suoi danni, effetti e Salvezze.',
   ...(s?['I due interventi consumano una sola Reazione, un solo costo e un utilizzo.']:[])),
  'nutrimento-leggendario':()=>sheet('Piatti ordinari: recupero PV e ST ×'+(s?'3':'2')+' e fino a '+(s?'3':'2')+' Stati negativi rimovibili rimossi.',
   'Calcola prima ricetta, ingredienti e bonus. Ogni piatto conserva le risorse che può recuperare e il normale numero di destinatari.'),
  'servizio-sovrano':()=>sheet('Servi subito fino a '+(s?'5':'3')+' personaggi coscienti entro '+(s?'20':'10')+' m, incluso te.',
   'Consumano porzioni già preparate senza spendere un’Azione. Devi avere e consumare cibo sufficiente.',
   'Restano i destinatari per preparazione di Mano del Cuoco. Nutrimento Leggendario si applica solo se acquisito.'),
  'secondo-fuoco-leggendario':()=>sheet('Servi un compagno entro '+(s?'20':'10')+' m quando '+(s?'subisce danni.':'scende sotto metà PV.'),
   'Deve essere cosciente e poter consumare una porzione già pronta. Riceve tutti gli effetti del piatto; consumi la porzione.',
   'Nutrimento Leggendario si applica se acquisito. Gli utilizzi sono condivisi con Secondo Fuoco.'),
  'volonta-indomabile':()=>sheet('Contro paura, intimidazione e coercizione, Spirito vale '+(s?'40':'20+'+String(spirit).split('+')[1])+', prima di Skill e modificatori.',
   'Solo quando la regola prevede davvero un tiro di Spirito: confronta comunque il risultato con la difficoltà. Non modifica attacchi o danni e non crea prove contro effetti automatici.'),
  'sintonia-dei-colori':()=>sheet('Attiva '+(s?'3':'2')+' Colori Haki posseduti con una sola Bonus: 1 PIP da ciascuna riserva.',
   'Attiva i Colori, non gli effetti ⚡. Restano i mantenimenti ordinari e servono i PIP in ogni riserva.'),
  'riscossa-della-volonta':()=>sheet('Recupera fino a '+t.level+' PIP complessivi da distribuire fra i tuoi Colori.',
   'Una volta fra due riposi brevi o lunghi. Nessuna riserva supera il massimo; gli eventuali PIP in eccesso sono persi.',
   'Funziona anche a riserve vuote o Colori spenti. Non accende Haki e non ripristina gli usi per combattimento.')
 };
 return descriptions[t.id]?.()||sheet('Consulta le condizioni di utilizzo nel manuale.');
}
function cost(t){
 if(t.id==='sintonia-dei-colori')return '1 PIP per Colore';
 if(t.id==='raffica-senza-fine')return t.costST+' ST per attacco extra';
 return t.costST+' ST'+(t.action==='modifier'?' aggiuntivi':'');
}
function talentText(c,t){const v=talent(c,t);return [action(t.action)+' · '+cost(t)+(t.limit?' · '+t.limit+' '+frequency(t.frequency):''),v.effect,...v.details].join('\n');}
function haki(c,h,r){
 const lv=P.hakiLevel(c,h),die=P.effectiveHakiDie(c,h),turns=r.durationTurns;
 const until=turns===1?'fino all’inizio del tuo prossimo turno':'fino all’inizio del tuo '+(turns===2?'secondo':'terzo')+' turno successivo';
 switch(r.id){
  case 'armatura-totale-superiore':return sheet('Dimezzi i danni di tutti gli attacchi ricevuti '+until+'.','Arrotonda per eccesso, poi applica le riduzioni. Include attacchi con Haki, non automaticamente cadute o pericoli ambientali. Non si somma ad Armatura Totale sullo stesso attacco.');
  case 'esplosione-haki-superiore':return sheet('Esplosione di '+[0,0,20,30,50,100][lv-1]+' m di raggio dal punto raggiunto dal tuo attacco fisico.','I nemici secondari si difendono dallo stesso tiro: se colpiti ricevono metà del danno pertinente, per difetto, poi le riduzioni. Niente seconda copia sul bersaglio principale, Schianto o effetti riservati al singolo bersaglio.');
  case 'ryou-persistente':return sheet('Ryou per '+turns+' turni: raddoppi la componente di danno interno di un attacco fisico per tuo turno.','Scegli l’attacco prima del tiro: anche se manca consuma l’applicazione del turno. Non raddoppia tutto il danno. Dura '+until+' e termina se interrompi Armamento.');
  case 'anticipo-superiore':return sheet('+3 tiri completi di Osservazione ('+die+') a una Schivata o un Contrattacco.','Dichiara prima del tiro scelto, '+until+'. Paga la Reazione o le risorse normali della difesa. Nessun dado al danno o Reazione aggiuntiva; non si somma ad Anticipo base.');
  case 'previsione-breve-prolungata':return sheet('Gli attacchi fisici normali non ti colpiscono per '+turns+' turni.','Dura '+until+'. Haki e Area restano efficaci. Non protegge automaticamente da cadute, crolli o altri pericoli; termina interrompendo Osservazione.');
  case 'anticipo-offensivo':return sheet('+'+(r.saikyo?3:2)+' tiri completi di Osservazione ('+die+') al tiro per colpire di un solo attacco fisico.','Dichiara prima del tiro. Non aggiunge danni e non garantisce il colpo: le difese restano valide. L’attacco paga le proprie Azioni e Tecniche; non si somma ad Anticipo difensivo sullo stesso tiro.');
  case 'pressione-imperiale':return sheet('Un nemico percepito entro '+number([100,500,1000][lv-1])+' m perde la prossima Azione e interrompe Haki e Tecniche mantenute.','Non può riattivare i Colori fino alla fine del suo secondo turno successivo. Non cancella tutto il turno né i poteri non mantenuti.','Un utilizzo per combattimento, condiviso con Grido dell’Imperatore. Nessuna prova di Spirito aggiunta.');
  case 'impatto-sovrano':return sheet('Massimizzi e raddoppi i Dadi Danno di un solo attacco fisico.','Dichiara prima del tiro per colpire, che resta necessario. Attributi, Skill, Haki e bonus fissi non vengono massimizzati o raddoppiati. Restano difese e costi dell’attacco.');
  case 'volonta-illeggibile':return sheet('Dadi Danno massimizzati e raddoppiati; il bersaglio non può usare la difesa attiva di Osservazione contro questo attacco.','Un solo attacco fisico, una sola Bonus e 3 PIP totali. Non massimizza Attributi, Skill o Haki. Schivata, Parata e altre difese fisiche restano valide: il colpo non è automatico.','Non spegne Osservazione e non toglie i suoi passivi; i suoi effetti possono ancora valere contro altri attacchi.');
  default:return sheet('Consulta le condizioni nel manuale.');
 }
}
function hakiText(c,h,r){const v=haki(c,h,r),variant=P.hakiRows(c,h).filter(x=>x.id===r.id).length>1?(r.saikyo?' · potenziata':' · standard'):'';return [r.name+variant+': Azione Bonus · '+r.cost+' PIP',v.effect,...v.details,'Richiede il Colore già attivo. Attivarlo e usare un effetto ⚡ richiedono Bonus separate, in turni diversi.'].join('\n');}
function bands(c){const radius=D.scales.destruction[P.level(c.attr?.Forza)-1];if(!radius)return [];return [1,2,3,4].map((step,i)=>({from:radius*i/4,to:radius*step/4,damage:['D','⌊D / 2⌋','⌊D / 4⌋','⌊D / 8⌋'][i]}));}
root.GLCPrestigeView={choices,talent,talentText,haki,hakiText,bands,action,cost,frequency,number};
})(typeof window!=='undefined'?window:globalThis);
