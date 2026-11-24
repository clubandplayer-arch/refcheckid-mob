# Collaudo Android interno su staging

## Rete e versione distribuita

Nelle impostazioni dell'ambiente cloud, aprire **Accesso a Internet** e mantenere la modalità con domini autorizzati. La bozza aggiunge `refcheckid-staging-git-codex-org-92c386-clubandplayers-projects.vercel.app` e `api.expo.dev`. Rivedere e salvare la bozza, quindi pubblicare la configurazione se richiesto. Inserire solo i nomi host, senza schema o percorso.

```sh
curl -i --max-time 15 https://refcheckid-staging-git-codex-org-92c386-clubandplayers-projects.vercel.app/api/health
```

- `CONNECT 403` da Envoy indica che il proxy ha rifiutato il tunnel. La richiesta non raggiunge Vercel.
- Una pagina o un redirect di autenticazione Vercel dopo l'apertura del tunnel indica Deployment Protection. Il responsabile Vercel può predisporre un dominio staging raggiungibile dal telefono e mantenere l'autenticazione del backend. Un cookie della sessione browser non autentica le richieste native. Credenziali di bypass Vercel restano fuori dall'APK.
- Un errore JSON dal backend, ad esempio `UNAUTHENTICATED` o `STORAGE_UNAVAILABLE`, va gestito a livello applicativo. Un health 200 da solo non certifica applicazione, database o Storage.

Da **Vercel → Deployments** verificare repository `clubandplayer-arch/refcheckid`, ramo `codex/organization-platform-audit` e commit `a81807a65fb46e0032f1a508fcc38c81670599a4`. Con un profilo federale o amministratore aprire **Profilo e loghi → Verifica configurazione del sito**. La chiamata autenticata `GET /api/v1/platform/readiness` deve rispondere con lo stesso commit, `environment=staging` e `resultArchiveIndex=true`. Verificare nell'ambiente del deployment `REFCHECKID_RUNTIME=supabase`, `REFCHECKID_DATA_ENV=staging`, bootstrap demo disattivato e connessioni al solo Supabase staging. Verificare login, profilo, una lettura autenticata di gara e il download di un URL foto temporaneo.

Dal progetto Supabase **staging** verificare la cronologia delle quattro migrazioni `202611100001_runtime`, `202611110002_photo_queue_indexes`, `202611110003_platform_indexes`, `202611120001_result_archive_index`. Se il progetto è collegato al CLI, usare `supabase migration list --linked` e controllare il progetto collegato prima di qualsiasi applicazione. Per le variabili server e le migrazioni usare la guida upstream fissata al commit. [Vercel e Supabase](https://github.com/clubandplayer-arch/refcheckid/blob/a81807a65fb46e0032f1a508fcc38c81670599a4/docs/VERCEL_SUPABASE.md)

## APK autonomo

Il progetto locale è `@clubandplayer.dev/refcheckid-mob`, ID EAS `3a04122a-0713-4e33-bdab-15ffd668b0dd`, package Android `com.refcheckid.app`. Il profilo `preview` usa distribuzione interna, APK e bundle incorporato, con l'URL pubblico dello staging dichiarato in `eas.json`.

```sh
npm ci
npx eas-cli login
npx eas-cli project:info
npx eas-cli build --platform android --profile preview
```

Accedere con un account autorizzato al progetto Expo e verificare proprietario, progetto e ID prima del build. Per una build in CI fornire la credenziale EAS nello store segreti del runner. Usare la chiave di firma Android del progetto già configurata. Se manca, farla configurare dal responsabile Expo/EAS. Al termine aprire il link di installazione EAS dal telefono e installare l'APK interno. L'app si avvia senza Metro. Se è presente un APK con lo stesso package firmato con una chiave diversa, usare un dispositivo di prova pulito o coordinare con il responsabile la gestione dell'app già installata. Disinstallare elimina anche i taccuini locali.

## Unica gara di collaudo

Usare una competizione privata sullo staging. Cercare prima il codice test `RCID-MOB-QA-001` e riutilizzare la stessa fixture se già presente. Creare una sola gara fra `TEST RefCheckID Mobile Casa` e `TEST RefCheckID Mobile Ospiti`, nella stagione e disciplina configurate per il test. Importare o creare tesseramenti attivi nelle due squadre, con un numero di titolari e staff compatibile con il regolamento. Usare nominativi di fantasia e immagini sintetiche segnalate come test, approvate dal profilo federale, per atleti e staff di entrambe le società. Il designatore del campionato invia un'unica designazione di principale.

| Accesso | Associazione |
| --- | --- |
| Dirigente test casa | Ruolo `manager`, solo UUID club casa in `clubIds` |
| Dirigente test ospiti | Ruolo `manager`, solo UUID club ospiti in `clubIds` |
| Arbitro principale test | Ruolo `referee`, proprio UUID arbitrale in `refereeIds`, anagrafica collegata e incarico `principal` sulla fixture; accettazione dall'area arbitro |
| Account negativo | Arbitro distinto, con proprio UUID in `refereeIds`, nessuna designazione e nessun grant per la fixture in `authorizedMatchIds` |
| Operatore web esistente | Ambito federale per creare il calendario, approvare le foto e verificare readiness. Per l'incarico usare un designatore autorizzato sul campionato |

Usare **Operatori e inviti** per collegare ciascun dirigente alla sua società e ciascun arbitro alla propria anagrafica. Per questo client scegliere account con email confermata. In alternativa usare Supabase Auth staging e il comando upstream `pnpm -C refcheckid-backend supabase:profile /percorso/privato/profilo.json` con gli UUID della tabella, `enabled=true` e la federazione competente dove necessaria. Consegnare inviti e accessi tramite il canale sicuro del team.

## Sequenza della prova fisica

1. Avviare l'APK senza Metro. Atteso: schermata login e accesso al backend staging.
2. Accedere separatamente come dirigente casa e ospiti. Atteso: ruolo corretto, stessa gara, propria distinta, foto ufficiali di atleti e staff. Salvare, chiudere e riaprire prima di inviare. Atteso: dati e ordine salvati.
3. Accedere con l'account negativo. Atteso: nessuna gara o designazione test; accesso diretto a gara, distinta, manifesto e taccuino negato dal server.
4. Accettare l'incarico principale, prendere in carico le due distinte e completare il riconoscimento. Atteso: riaprendo la gara si rivedono le decisioni già registrate.
5. Aprire il taccuino, registrare un evento, perdere la connessione durante l'invio e arrestare l'app. Atteso: operazione conservata sul dispositivo. A freddo serve un accesso online per ristabilire il contesto.
6. Dopo riavvio, far rifiutare il rinnovo della sessione test tramite il canale amministrativo previsto, quindi accedere con l'account negativo e tornare al principale. Atteso: richiesta di login dopo la scadenza, nessun passaggio della coda fra utenti e recupero dal solo account originale. Non occorre alterare l'orologio del dispositivo.
7. Ritentare l'operazione recuperata. Atteso: stesso `operationId` e payload, una sola revisione dell'archivio anche se il primo invio era arrivato. Confermare i periodi e inviare il referto. Atteso: note riservate assenti da archivio eventi e vista pubblica.

## Contratto backend – decisione foto

Da `a81807a`, `GET /api/v1/platform/club-photo-roster/:id?registrations=…` restituisce `lastFederationDecision` per ogni tesseramento. Il mobile mostra lo stato dell'ultima decisione definitiva e il solo `reasonText` pubblico fornito dal server. Un nuovo pendente mantiene questa informazione. Un tesseramento fuori club fa fallire l'intero blocco con 403.

Per gli esiti del confronto e la riproduzione dei sette flussi, vedi [Verifica parità mobile](MOBILE_PARITY_A81807A.md).

## Prova interattiva da Codespaces

Per usare il development client Android e ricaricare dal Codespace, aggiornare il ramo `work`, eseguire `npm ci` e avviare `npm run start:codespace -- --clear`. Il comando usa l'URL staging del profilo preview, salvo un override esplicito di `EXPO_PUBLIC_API_BASE_URL`, e avvia Metro in modalità headless con tunnel. Scansionare il QR nel development client. La modalità headless evita di avviare l'interfaccia desktop di React Native DevTools, che richiede librerie grafiche Linux come ATK. Dopo modifiche alle dipendenze native, reinstallare una build con profilo `development` prima di scansionare il QR.
