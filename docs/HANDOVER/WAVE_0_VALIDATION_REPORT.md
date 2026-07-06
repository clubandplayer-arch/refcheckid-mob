# RefCheckID — Wave 0 Validation Report

## Stato

Wave 0 completata e approvata.

## 1. Verifica della struttura della Source of Truth

La Source of Truth analizzata è `source-of-truth/refcheckid`, confermata come area di sola lettura dalle regole ufficiali. La cartella è stata usata esclusivamente per lettura e analisi.

Struttura rilevata:

- `source-of-truth/refcheckid/refcheckid-web`: portale Web Next.js App Router, fonte funzionale primaria per il Mobile.
- `source-of-truth/refcheckid/refcheckid-backend`: backend REST e contratti consumati dal Web.
- `source-of-truth/refcheckid/refcheckid-docs`: documentazione di dominio, sicurezza, API, workflow e Master Bible.
- `source-of-truth/refcheckid/scripts`, package workspace e guide di test.

La struttura Web effettiva corrisponde all'ambito indicato dalla roadmap: App Router, componenti condivisi, feature modules, librerie client, test frontend e contratti backend usati dal Web.

Route Web effettivamente presenti e coperte dalla roadmap:

- `/`: login session-aware con redirect automatico per ruolo già autenticato.
- `/manager`: dashboard dirigente protetta da `AuthGate`, con query dashboard, stati loading/error/empty e CTA distinta.
- `/manager/match-sheet`: workflow distinta manager protetto.
- `/referee`: dashboard arbitro protetta, con query, stati loading/error/empty e CTA gara.
- `/referee/match`: workflow gara arbitro protetto.
- `/federation`: cruscotto federazione protetto.

Provider e bootstrap effettivi:

- `RootLayout` monta `Providers` nell'HTML root.
- `Providers` monta `ErrorBoundary`, `SessionProvider`, `QueryClientProvider` e `ToastProvider`, con retry/stale/refetch interval React Query configurati.

Auth e sessione effettivi:

- Ruoli validi: `manager`, `referee`, `federation`.
- Storage sessione: `refcheckid.session`.
- `AuthGate` gestisce redirect a login, redirect al ruolo corretto, stato “Verifica sessione…” e logout.

API client effettivo:

- Query keys Web: `audit`, `federation`, `manager`, `matches`, `matchReports`, `matchSheets`, `photos`, `players`, `recognitions`, `referees`, `staff`.
- Endpoint client Web rilevati: matches, match-sheets, submit/reset/lock distinta, reports, photos, recognitions start/complete, update/submit report.
- Wrapper `request`: aggiunge JSON content-type, authorization bearer se sessione valida, refresh se scaduta, errore su response non OK, ritorno `undefined` su 204.

Backend REST effettivamente disponibile e coerente con i contratti Web:

- Auth, players, staff, matches, match-sheets, recognitions, match-reports, audit e photos sono registrati nel router backend.

Test Web effettivamente presenti e coerenti con Wave 0 come acceptance source:

- Unit test su auth, API client, validazioni distinta, validazioni referto, federation/referee client, foto manager, source workflow.
- Integration/frontend contract e web integration.
- Backend test e2e/security/regression/service disponibili nella Source of Truth.

## 2. Verifica della FEATURE_PARITY_ROADMAP

La roadmap è coerente con il principio ufficiale di Feature Parity: stessi ruoli, gate autorizzativi, workflow, endpoint, validazioni, stati applicativi e semantica degli stati dominio.

La sequenza Wave dichiarata è coerente con il ciclo tecnico e funzionale del Web:

1. governance;
2. fondazioni;
3. auth/routing protetto;
4. API/cache/contratti;
5. dominio manager;
6. dominio arbitro;
7. dominio federazione;
8. hardening finale.

Le dipendenze principali sono corrette:

- Wave 1 prima di auth perché abilita shell/provider/UI.
- Wave 2 prima dei dati perché abilita sessione e autorizzazione.
- Wave 3 prima delle schermate dominio perché abilita API, cache, query keys e contratti.
- Wave 4-6 prima dell'arbitro perché l'arbitro consuma distinte/snapshot prodotti dal manager.
- Wave 7-9 prima della federazione completa perché la federazione consuma referti e storico post-gara.
- Wave 10-11 per il dominio federazione.
- Wave 12 per certificazione finale.

La matrice sintetica Web -> Wave copre tutte le funzionalità principali individuate nel codice:

- bootstrap/layout/provider/UI in Wave 1;
- sessione/login/AuthGate/routing protetto in Wave 2;
- API wrapper/query/cache/store locali/fallback in Wave 3;
- Manager dashboard, contesto team, distinta, validazioni, foto e submit/reset lifecycle in Wave 4-6;
- Dashboard arbitro, verifica distinte, riconoscimento, referto e submit in Wave 7-9;
- Dashboard federazione, calendario, referti, foto, storico/audit in Wave 10-11;
- regression/e2e/hardening in Wave 12.

## 3. Eventuali funzionalità Web non ancora coperte

Non risultano funzionalità Web primarie completamente escluse dalla roadmap.

La copertura è completa per:

- route pubblica e protette;
- ruoli e redirect;
- provider/root shell;
- UI primitives e stati base;
- query/cache;
- API client comuni;
- Manager dashboard e distinta;
- upload/crop foto e approvazione federale;
- dashboard arbitro;
- verifica distinte;
- riconoscimento;
- referto e validazioni;
- dashboard/calendario/referti/foto/storico federazione;
- localStorage snapshot/store;
- fallback demo/pilot data;
- test unitari, integrazione e hardening finale.

### Nota di precisione: endpoint backend non consumati direttamente dal Web

Il backend espone endpoint ulteriori rispetto a quelli consumati dal portale Web, per esempio federations, clubs, player-registrations, staff-registrations, referees, identity-documents, get by id e transizioni match.

Questi endpoint non risultano funzionalità Web dirette da replicare nel Mobile Binario B, perché la Source of Truth funzionale per il Mobile è il Web e i contratti backend usati dal Web, non l'intero backend. La roadmap è quindi corretta nel non assegnare una Wave autonoma a endpoint backend non usati dal Web.

## 4. Eventuali Wave da correggere

Non sono emerse correzioni bloccanti alla struttura delle Wave.

Sono però emerse due raccomandazioni documentali da considerare prima della Wave 1:

### 4.1 Chiarire in Wave 6 la dipendenza interna tra submit e snapshot locale

Nel codice Web, il submit distinta non è solo chiamata API: salva anche snapshot locale della distinta inviata, poi invia la distinta e invalida query. Questo snapshot è successivamente usato dal flusso arbitro per caricare soggetti di riconoscimento.

La roadmap già cita snapshot/store in Wave 3 e submit lifecycle in Wave 6, quindi non c'è gap funzionale. È stato richiesto di esplicitare che Wave 6 deve chiudere anche la persistenza snapshot necessaria alla Wave 8.

### 4.2 Chiarire in Wave 11 che la foto federale invalida anche player/staff

Nel codice federazione, la decisione foto locale invalida `photos`, `players` e `staff`, perché l'approvazione applica override usati dai roster.

La roadmap copre approvazione/rifiuto foto in Wave 11, ma il dettaglio dell'invalidation `players/staff` deve essere mantenuto come acceptance criterion operativo.

## 5. Eventuali dipendenze errate

Non risultano dipendenze errate.

Le dipendenze rilevate dal codice confermano l'ordine della roadmap:

- Wave 2 deve precedere Wave 3 perché `request` legge/refresh-a sessione e aggiunge bearer token.
- Wave 3 deve precedere le dashboard perché manager/referee/federation usano query keys e client API.
- Wave 4-6 devono precedere Wave 7-8 perché la verifica/riconoscimento arbitro dipende da distinte non draft e snapshot manager/fallback.
- Wave 8 deve precedere Wave 9 perché il referto non può essere completato finché il riconoscimento non è completo.
- Wave 9 deve precedere Wave 11 perché la federazione combina report locali salvati dal workflow arbitro e report backend submitted.
- Wave 11 dipende da Wave 6 per il ciclo foto manager -> richiesta pending -> decisione federazione -> override approvato.

## 6. Conferma readiness per Wave 1

La roadmap è pronta per iniziare la Wave 1.

Condizioni verificate:

- La Source of Truth è strutturalmente leggibile e coerente.
- Le route Web principali sono tutte inventariate.
- Componenti, provider, hook, servizi, API, store locali, modelli dati, business rules e test sono tracciabili alle Wave.
- Non sono state rilevate funzionalità Web primarie fuori roadmap.
- Non sono state rilevate duplicazioni funzionali bloccanti tra Wave.
- Non sono state rilevate dipendenze errate.
- Le uniche note emerse sono raccomandazioni di dettaglio per acceptance criteria, non blocchi.

## Controlli Wave 0 eseguiti

- `pwd && rg --files -g 'AGENTS.md' -g '!node_modules' -g '!source-of-truth/refcheckid/node_modules'`
- `find .. -name AGENTS.md -print`
- `sed -n '1,220p' docs/HANDOVER/CODING_RULES.md && sed -n '1,260p' docs/HANDOVER/FEATURE_PARITY_ROADMAP.md && sed -n '1,260p' docs/HANDOVER/Mobile_Handover_Package.md`
- `sed -n '261,999p' docs/HANDOVER/FEATURE_PARITY_ROADMAP.md && sed -n '261,999p' docs/HANDOVER/Mobile_Handover_Package.md`
- `find source-of-truth/refcheckid -maxdepth 3 -type d | sort`
- `rg --files source-of-truth/refcheckid`
- `rg -n "export default function|AuthGate|fetch|request\\(|queryKeys|localStorage|POST|GET|PATCH|router\\.(get|post|patch)|app\\.(get|post|patch)|validateMatchSheet|getMatchSheetSubmitError|validateMatchReport|function validate|const validate" source-of-truth/refcheckid/refcheckid-web/src source-of-truth/refcheckid/refcheckid-web/tests source-of-truth/refcheckid/refcheckid-backend/src/api`
- `git status --short && git rev-parse --show-toplevel`
