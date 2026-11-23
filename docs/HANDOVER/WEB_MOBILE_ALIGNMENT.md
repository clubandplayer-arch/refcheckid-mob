# Allineamento web → mobile

Riferimento [RefCheckID 3555792](https://github.com/clubandplayer-arch/refcheckid/tree/3555792f9d3e109c6917548cbb917caeaad0cbb2), ramo `codex/organization-platform-audit`. I percorsi API sono relativi ad `/api/v1`. Questa guida aggiorna il riferimento funzionale della precedente guida di baseline.

| Area | Web e backend | Intervento mobile |
| --- | --- | --- |
| Accesso | `auth/login`, `auth/me`, profilo con `clubIds`, `clubFederationIds` e ruoli | Verificare il profilo, usare solo gli ambiti del server e isolare la cache per sessione |
| Gare e distinte | `GET /matches` e `GET /match-sheets?matchId=…`, autorizzati sul server | Passare ID gara e club alla schermata. Ricontrollare ID e stato prima di leggere o modificare |
| Rosa e invio | Tesseramenti, `lineup-defaults`, distinta con righe e `POST /match-sheets/:id/draft` e `/submit` | Idratare dal server, inviare tesseramenti, ordine, numeri e incarichi espliciti |
| Foto ufficiali | `platform/club-photo-roster/:id`, intent e completamento, motivazione extra e blocco dei pendenti | Leggere stato e policy, inviare foto nativa con motivazione, mostrare l'esito server |
| Designazioni e riconoscimento | Incarichi della piattaforma, manifesto, `recognitions/workflow` e `recognitions/decision` | Separare designazioni e riconoscimento; usare le decisioni per tesseramento sul server |
| Taccuino, risultato e referto | `platform/games/:id`, `/access`, `/periods`, `/clock`, `/history`, `/report` e proiezione pubblica distinta | Portare le schermate native rispettando capacità dell'incarico, revisioni e deduplicazione tramite `operationId` |
| Profili e marchi | Identità della piattaforma, loghi club e federazione distinti | Intestazioni separate e profilo autenticato |

Guide upstream esaminate: `IDENTITY_PROFILES_AND_STAGING.md`, `PHOTO_UPLOAD_SINGLE_REQUEST.md`, `ORGANIZATION_PLATFORM_API.md`, `RESULTS_NOTEBOOK_OPERATIONS.md`, `RESULTS_PRIVACY_API.md`.

## Implementazione

- L'accesso mobile verifica `/auth/me` dopo il login. Dirigenti e arbitri vedono gli ambiti del profilo autenticato. I profili con più ruoli operativi possono cambiare area. Login e logout svuotano la cache delle richieste. Il refresh concorrente condivide una richiesta e verifica la sessione prima di applicare la risposta.
- L'area dirigente mostra le gare dei club autorizzati. La distinta richiede gara e club selezionati e usa le righe restituite dallo stesso backend. Il flusso gestisce convocazioni, ordine, numeri, ruoli, portiere, capitano, vice e staff. La bozza riaperta conserva tesseramenti, ordine e incarichi. Per le gare della piattaforma si usa la rosa della gara e si applicano i limiti restituiti per disciplina.
- Foto di atleti e staff: miniature e policy per tesseramento, distinzione tra caricamento, assenza ed errore, stato pendente, foto proposta e motivazione aggiuntiva. L'upload nativo segue intent e completamento. Il client blocca la conferma ripetuta e il backend impedisce doppioni pendenti. L'approvazione federale resta nel portale. L'API di rosa a questo commit non include il motivo dell'ultima decisione federale. Per mostrarlo al dirigente serve un campo con l'ultima decisione visibile per tesseramento, senza concedere accesso alla coda federale.
- L'area arbitro mostra gare e designazioni, con risposta agli inviti. Il riconoscimento apre le due distinte della gara selezionata, usa le foto ufficiali del manifesto e riprende le decisioni registrate sul server. Una nota è obbligatoria per le anomalie e quando si conferma senza una foto utilizzabile.
- Il taccuino della piattaforma verifica l'incarico con `/access`. Supporta orologio, eventi per disciplina, periodi, conferme ufficiali e archivio revisioni. Le operazioni di periodo e orologio sono salvate per account e gara prima dell'invio e riutilizzano lo stesso `operationId` e payload. Il referto riservato usa il proprio endpoint e non viene scritto nell'archivio locale degli eventi. Pubblicazione e omologazione restano nel portale. Le gare legacy conservano il flusso referto delle rispettive API.
- Profili club e arbitro: intestazioni e immagini ufficiali, fascia federale separata, aggiornamento dei campi di presentazione e dell'immagine nei limiti di `canEdit` e della revisione. Un logo di origine federale è protetto. I colori dell'ente sono letti dal server e gestiti sul web.

## Pulizia

Sono stati rimossi i roster pilota, le foto e i referti simulati, gli snapshot paralleli e il ripristino smoke dal client. La schermata federale indirizza al portale. La copia vendorizzata `source-of-truth` non aveva importazioni o script operativi nel mobile e rimane consultabile nel tag iniziale. I suoi riferimenti nei vecchi rapporti di handover sono storici. Le migrazioni operative rimangono nel repository RefCheckID a monte. Sono stati conservati asset, identificativi nativi, Expo/EAS e cronologia mobile. I file d'ambiente locali, le cache, le build e i materiali di firma sono ignorati. `.env.example` contiene il solo URL pubblico di staging.

## Verifiche e limiti

```sh
npm ci
npm run typecheck
npm test
EXPO_OFFLINE=1 npx expo install --check
EXPO_OFFLINE=1 npx expo export --platform android --max-workers 2
```

Le verifiche automatiche mobile includono profilo autenticato, accessi consentiti e negati, selezione della gara, payload della bozza, lettura delle righe al riaccesso, policy foto, decisioni salvate e riapertura del taccuino con lo stesso payload dopo una perdita di rete. Sul commit upstream sono passati 21 test in sei file per autenticazione, accessi, piattaforma, foto, richieste uniche e isolamento della pubblicazione.

Lo staging ha restituito al proxy cloud un errore CONNECT 403. Restano da verificare contro il deploy autenticazione, autorizzazioni effettive, foto, compilazione nativa e prova su telefono. L'export Android genera un bundle, non un APK installabile.

Il ritentativo del taccuino è esplicito. Il dispositivo distingue bozza locale, operazione in attesa e conferma del server. Dopo l'arresto completo dell'app è necessario autenticarsi e riaprire la gara con accesso al backend per recuperare il contesto. Il taccuino non si avvia a freddo senza rete. Le modifiche ad altri flussi richiedono rete; il client non ritenta automaticamente le loro scritture.

## Installazione e collaudo

1. Su una macchina raggiungibile dal telefono, eseguire `npm ci` e copiare `.env.example` in `.env.local`. Usare il backend HTTPS di staging indicato nell'esempio.
2. Creare un development client con `npx eas-cli build --profile development --platform android`, poi installare l'APK fornito da EAS. Per iOS registrare il dispositivo con `npx eas-cli device:create` e usare `npx eas-cli build --profile development --platform ios`. Servono l'accesso al progetto Expo e la firma prevista per la piattaforma.
3. Avviare Metro con `npm start -- --dev-client --lan` e aprire il progetto dal development client. La build deve includere i moduli nativi aggiunti da questo allineamento.
4. Preparare una gara di collaudo con due dirigenti autorizzati ai rispettivi club, un arbitro dal ruolo principale e almeno una foto ufficiale approvata. Usare anche un arbitro senza incarico o un dirigente di un altro club per la prova di diniego. Confrontare i dati con il portale e usare credenziali di staging consegnate tramite il canale del team.
5. Per ciascun dirigente aprire la gara corretta, verificare foto e convocati, salvare la bozza, chiudere e riaprire, quindi inviare la distinta. Verificare che un account fuori ambito non veda o apra la stessa risorsa.
6. Come arbitro accettare la designazione, aprire le due distinte e completare il riconoscimento. Riaprire la gara e controllare che le decisioni ci siano ancora. Nel taccuino registrare un evento, simulare una perdita di rete durante l'invio e ritentare la stessa operazione una volta riconnessi. Verificare una sola revisione. Confermare i periodi, il risultato finale e inviare il referto. Controllare che le note private restino fuori dall'archivio e dalla vista pubblica.
