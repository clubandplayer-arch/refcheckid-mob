# RefCheckID Mobile – baseline e collaudo su dispositivo

Il tag annotato locale `mobile-baseline-2026-11-23` punta a `1942b239cab679daff5110b6a96fdece7bf9e360`, lo stato del checkout prima delle correzioni. Il riferimento funzionale esaminato è [RefCheckID main a 2685da9](https://github.com/clubandplayer-arch/refcheckid/tree/2685da9214854e29a8ff4a3a2f339c5d9322c2b7). Per il collaudo usare il backend RefCheckID di staging condiviso con il portale web e il relativo dataset.

## Verifica locale

Con Node 24.22.3 e npm 11.19.1, dalla radice di `refcheckid-mob`:

```sh
npm ci
npm run typecheck
npm test
npm ls --depth=0
EXPO_OFFLINE=1 npx expo install --check
EXPO_OFFLINE=1 npx expo export --platform android --max-workers 2
```

Il lockfile include ora `expo-image-picker` e `expo-image-loader`. TypeScript usa le dichiarazioni dei pacchetti installati, con tipi espliciti per Node e Jest, e controlla anche i test. Il controllo TypeScript è passato e l'export Android ha prodotto un bundle Hermes. Jest ha superato 42 test in 12 suite con codice 0 e ha segnalato in uscita il timer del toast.

| Pacchetti | Versioni installate |
| --- | --- |
| Expo, React Native, React e React DOM | 57.0.4, 0.86.0, 19.2.3, 19.2.3 |
| Expo Router, Dev Client, Image Picker, Image Loader | 57.0.4, 57.0.5, 57.0.21, 57.0.1 |
| Expo Constants, Linking, screens, safe-area-context | 57.0.3, 57.0.2, 4.25.2, 5.7.0 |
| TanStack Query, TypeScript, Jest, Jest Expo, Testing Library RN | 5.101.2, 6.0.3, 29.7.0, 57.0.1, 13.3.3 |

Le versioni Expo e React Native, incluse quelle dei moduli nativi della tabella elencati nel manifesto SDK, rispettano i vincoli locali di Expo 57. La verifica Expo online ha ricevuto un rifiuto dal proxy cloud. L'export verifica il bundle JavaScript/Hermes. La compilazione nativa e l'installazione richiedono la prova su dispositivo.

## Inventario del client e confronto con le API

| Area | Decisione per il seguito |
| --- | --- |
| Login, protezione delle schermate, UI e React Query | Conservare il client REST, il routing per ruolo e gli stati di caricamento, vuoto ed errore. Verificare `POST /auth/login`, `GET /auth/me`, refresh e logout sullo staging. Aggiornare persistenza sicura su dispositivo e isolamento delle cache per account prima di trattare dati reali offline. |
| Dashboard gare | Conservare `GET /matches`. A monte il middleware applica gli ambiti della sessione e aggiunge i nomi dei club. Sostituire i club dedotti dall'email, gli avversari fissi e la scelta della prima gara cronologica con contesto autenticato, dati della risposta e selezione coerente con il portale. |
| Distinta dirigente | Conservare UI e validatori. Aprire la distinta della gara visualizzata tramite gli identificativi restituiti da `GET /match-sheets`, oggi la schermata prende la prima distinta del club. Allineare tesseramenti e contenuti al backend. Per la compilazione successiva allineare bozza e invio ai payload del web, che usa `POST /match-sheets/:id/draft` e `POST /match-sheets/:id/submit`. Togliere dai percorsi ordinari dati pilota e ripristino smoke. |
| Distinta arbitro e foto | Conservare l'apertura per gara con `GET /match-sheets?matchId=…` e il manifesto `GET /matches/:id/photo-manifest`. Gestire esplicitamente manifesto non disponibile, foto mancanti, scadenza e URL di contenuto. Verificare su Android e iOS la risposta corrente delle foto ufficiali di tesserati e staff, l'anteprima e il download effettivo. Le foto locali e i roster pilota vanno limitati alle demo esplicite. |
| Riconoscimento, taccuino e referto | Conservare i validatori riutilizzabili. Allineare le decisioni a `/recognitions/workflow` e `/recognitions/decision` e il referto a `/matches/:id/report-draft` e `/matches/:id/final-report`. Il referto e le note restano riservati ai ruoli abilitati. Eventi e risultati pubblicabili richiedono dati e regole di pubblicazione distinti. |
| Federazioni e organizzazioni arbitrali | Il portale web è il canale principale. L'attuale rotta federazione mobile è fuori dal primo collaudo. |
| Offline | La memoria di sessione e gli snapshot locali esistenti non costituiscono una coda persistente. Concordare con il backend un identificativo stabile per operazione, deduplicazione lato server, esito recuperabile dopo timeout e gestione dei conflitti. Verificare riavvio, cambio account e doppio invio dopo riconnessione prima di abilitare la sincronizzazione. |

Le rotte sopra sono relative a `/api/v1`. Il codice a monte e i suoi test sono verificabili in un checkout del repository web/backend:

```sh
pnpm --filter refcheckid-backend exec vitest run tests/e2e/happy-path.test.ts tests/security/auth-flow.test.ts tests/security/access-control.test.ts tests/rest-api.test.ts
```

Sono passati 18 test a monte in quattro file. I test esercitano il router con le fixture ufficiali. Il collaudo dello staging deve verificare anche i permessi effettivi del deploy. Per un account fuori ambito, controllare l'esclusione dalla lista e il rifiuto dell'accesso diretto a gara, distinta e manifesto. Per il referto verificare il rifiuto per i ruoli estranei prima di ogni uso con dati riservati.

## Installazione e prova su telefono

1. Ottenere l'URL HTTPS dello staging RefCheckID effettivamente raggiungibile dal telefono. Impostarlo in `.env.local` come `EXPO_PUBLIC_API_BASE_URL=https://HOST-STAGING/api/v1`.
2. Con accesso al progetto Expo già indicato in `app.json`, eseguire `npx eas-cli build --profile development --platform android` e installare l'APK distribuito da EAS su Android. Per iOS registrare il dispositivo con `npx eas-cli device:create`, eseguire `npx eas-cli build --profile development --platform ios` e installare la build firmata tramite il link EAS. Servono i permessi Expo e, per iOS, la firma Apple del progetto. Su una workstation con SDK nativi configurati, `npm run android -- --device` o `npm run ios -- --device` installano direttamente su un dispositivo connesso.
3. Dalla workstation raggiungibile dal telefono sulla stessa rete, eseguire `npm start -- --dev-client --lan` e aprire il progetto nel development client. Impostare l'URL API sulla macchina che esegue Metro. Il fallback `localhost` su telefono punta al dispositivo stesso.
4. Accedere come dirigente. Confrontare ruolo e gare con il web, quindi aprire la distinta della stessa gara e una foto ufficiale già approvata. Ripetere come arbitro su una gara assegnata. Usare una gara pronta per il riconoscimento secondo le regole del backend e verificare il rendering di almeno una foto dal manifesto. Registrare versione del deploy, sistema operativo, esiti e ID gara/distinta senza allegare foto personali, token o URL firmati.
5. Ripetere con un account fuori ambito per verificare che gara, distinta e fotografie non siano accessibili. Eseguire le prove in lettura in questa fase.

Servono almeno un dirigente con profilo attivo e autorizzato al proprio club e un arbitro con profilo attivo e assegnato alla stessa gara. Un dirigente della squadra avversaria e un arbitro senza quell'assegnazione permettono di verificare i limiti di accesso. Preparare le distinte e foto ufficiali dal portale, con un operatore web abilitato se serve l'approvazione. Usare gli account di test effettivamente abilitati sullo staging e consegnare le credenziali tramite il canale del team.
