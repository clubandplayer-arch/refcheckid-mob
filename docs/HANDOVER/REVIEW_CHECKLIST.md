# RefCheckID — Review Checklist

> Wave 1, Wave 2, Wave 3, Wave 4 e Wave 5 approvate dopo review tecnica. Tutti i punti verificati risultano completati.

## Wave 1 — Fondazioni applicative, configurazione e design system minimo

### Checklist Feature Parity Wave 1

- [x] Root bootstrap implementato.
- [x] Provider root implementati.
- [x] API base URL configurabile.
- [x] Button equivalente.
- [x] Card equivalente.
- [x] Input equivalente.
- [x] Skeleton/loading equivalente.
- [x] Empty state equivalente.
- [x] Error state con retry equivalente.
- [x] Toast success/error equivalente.
- [x] Error boundary equivalente.
- [x] Utility comuni disponibili.

## Wave 2 — Sessione, autenticazione, autorizzazione e routing protetto

### Stato review

- [x] Wave 2 completata.
- [x] Wave 2 verificata.
- [x] Wave 2 approvata.
- [x] Feature Parity stimata al 98–99%.

### File Web verificati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/session.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/auth-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/auth/auth-gate.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/features/manager/login-form.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/manager/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/referee/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/federation/page.tsx`

### File Mobile verificati e approvati

- [x] `src/lib/session.tsx`
- [x] `src/lib/auth-client.ts`
- [x] `src/components/auth/auth-gate.tsx`
- [x] `src/features/auth/login-form.tsx`
- [x] `src/providers.tsx`
- [x] `src/types/shims.d.ts`
- [x] `app/index.tsx`
- [x] `app/manager/index.tsx`
- [x] `app/referee/index.tsx`
- [x] `app/federation/index.tsx`

### Checklist Feature Parity Wave 2

- [x] Modello `AppRole` equivalente.
- [x] Modello `AppSession` equivalente.
- [x] Login API equivalente.
- [x] Persistenza sessione equivalente.
- [x] Validazione sessione equivalente.
- [x] Refresh sessione equivalente.
- [x] Logout API e locale equivalente.
- [x] Redirect per ruolo equivalente.
- [x] Guard pagine protette equivalente.
- [x] Stato verifica sessione equivalente.
- [x] Protezione ruolo errato equivalente.

### Annotazioni tecniche approvate

- [x] Storage adapter con fallback in memoria; miglioramento futuro: `AsyncStorage` / `SecureStore`.
- [x] Logging diagnostico Web non replicato sul Mobile perché non influisce sulla Feature Parity.
- [x] Redirect adattati a Expo Router tramite `Redirect`.
- [x] Validazione del `LoginForm` implementata senza `react-hook-form` / `zod` mantenendo comportamento equivalente.
- [x] Ordine dei provider differente ma funzionalmente equivalente.


## Wave 3 — API client, cache, error/loading/empty framework e contratti dati

### Stato review

- [x] Wave 3 completata.
- [x] Wave 3 verificata.
- [x] Wave 3 approvata.
- [x] Feature Parity validata senza differenze funzionali non architetturali rispetto alla Source of Truth Web.

### File Web verificati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/federation-api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/federation-types.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-photo-store.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-team.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/pilot-data.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-types.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-match-sheet.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-report.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/types.ts`

### File Mobile verificati e approvati

- [x] `src/lib/api-client.ts`
- [x] `src/lib/federation-api-client.ts`
- [x] `src/lib/federation-types.ts`
- [x] `src/lib/local-storage.ts`
- [x] `src/lib/manager-photo-store.ts`
- [x] `src/lib/manager-team.ts`
- [x] `src/lib/pilot-data.ts`
- [x] `src/lib/query.ts`
- [x] `src/lib/referee-api-client.ts`
- [x] `src/lib/referee-types.ts`
- [x] `src/lib/submitted-match-sheet.ts`
- [x] `src/lib/submitted-report.ts`
- [x] `src/lib/types.ts`
- [x] `src/types/shims.d.ts`

### Checklist Feature Parity Wave 3

- [x] Request wrapper equivalente.
- [x] Authorization header equivalente.
- [x] Refresh sessione integrato nelle request.
- [x] Errore su response non OK equivalente.
- [x] Gestione 204 equivalente.
- [x] Query keys equivalenti.
- [x] Query loading/error/refetch equivalente.
- [x] Mutation success/error/invalidation equivalente.
- [x] Client matches equivalente.
- [x] Client match-sheets equivalente.
- [x] Client match-reports equivalente.
- [x] Client players equivalente.
- [x] Client staff equivalente.
- [x] Client photos equivalente.
- [x] Client recognitions equivalente.
- [x] Client audit equivalente.
- [x] Tipi manager equivalenti.
- [x] Tipi referee equivalenti.
- [x] Tipi federation equivalenti.
- [x] Store snapshot distinta equivalente.
- [x] Store report inviato equivalente.
- [x] Store foto manager equivalente.
- [x] Fallback pilot data equivalente.

### Annotazioni tecniche approvate

- [x] Adapter storage Mobile con fallback in memoria considerato differenza architetturale React Native, non differenza funzionale.
- [x] Helper React Query Mobile approvati per query, mutation e invalidation coerenti con la semantica Web.
- [x] Nessuna UI o workflow di Wave successive anticipata.

## Wave 4 — Dashboard Manager e contesto squadra

### Stato review

- [x] Wave 4 completata.
- [x] Wave 4 verificata.
- [x] Wave 4 approvata.
- [x] Feature Parity validata per Dashboard Manager e contesto squadra rispetto alla Source of Truth Web.

### File Web verificati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/manager/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-team.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/auth/auth-gate.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/card.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/state.tsx`

### File Mobile verificati e approvati

- [x] `app/manager/index.tsx`
- [x] `__tests__/manager-dashboard-source.test.ts`

### Checklist Feature Parity Wave 4

- [x] Config team manager equivalente.
- [x] ClubId manager usato per API.
- [x] Fetch matches club.
- [x] Fetch match sheets club.
- [x] Ordinamento prossima gara.
- [x] Venue fallback “Da definire”.
- [x] Stato distinta formattato.
- [x] Notifiche stato distinta.
- [x] Card prossima gara.
- [x] Card stato distinta.
- [x] Card notifiche.
- [x] Empty nessuna gara.
- [x] Error retry.
- [x] CTA Apri distinta.

### Annotazioni tecniche approvate

- [x] Dashboard Manager implementata con `AuthGate`, `useApiQuery`, `fetchManagerDashboard` e `queryKeys.manager` mantenendo l'architettura Mobile esistente.
- [x] Stati loading, error con retry, empty e data-driven approvati come equivalenti alla Source of Truth Web.
- [x] CTA `Apri distinta` mantenuta nel layout ma resa temporaneamente non interattiva perché la route `/manager/match-sheet` appartiene alle Wave successive.
- [x] Test sorgente approvati per clubId manager, ordinamento `scheduledAt`, fallback venue, stato distinta e notifiche.
- [x] Review finale Wave 4 completata e approvata dopo verifica tecnica.

## Wave 5 — Distinta Manager: roster, selezione, ruoli e validazioni core

### Stato review

- [x] Wave 5 completata.
- [x] Wave 5 verificata.
- [x] Wave 5 approvata.
- [x] Feature Parity validata per roster, selezione, ruoli e validazioni core della distinta Manager rispetto alla Source of Truth Web.

### File Web analizzati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/manager/match-sheet/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/features/manager/match-sheet-workflow.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/match-sheet-validation.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-team.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/pilot-data.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-photo-store.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/tests/unit/match-sheet-validation.test.ts`

### File Mobile modificati e approvati

- [x] `app/manager/index.tsx`
- [x] `app/manager/match-sheet.tsx`
- [x] `src/features/manager/match-sheet-workflow.tsx`
- [x] `src/lib/match-sheet-validation.ts`
- [x] `__tests__/match-sheet-validation.test.ts`

### Checklist Feature Parity Wave 5

- [x] Page guard manager.
- [x] Fetch players.
- [x] Fetch staff.
- [x] Fetch sheet club.
- [x] Fallback pilot roster.
- [x] Override foto approvate applicati.
- [x] Ricerca nome/cognome.
- [x] Ordinamento per cognome.
- [x] Select/deselect player.
- [x] Sospesi bloccati/non validi.
- [x] Reset capitano/vice su deselezione.
- [x] Select/deselect staff.
- [x] Numero maglia.
- [x] Ruolo starter/reserve.
- [x] Flag goalkeeper.
- [x] Flag captain.
- [x] Flag vice captain.
- [x] Reorder convocati equivalente.
- [x] Read-only non draft per editing.
- [x] Validazione almeno un giocatore.
- [x] Validazione almeno uno staff.
- [x] Validazione numeri mancanti.
- [x] Validazione numeri duplicati.
- [x] Validazione sospesi.
- [x] Validazione 11 titolari.
- [x] Validazione 1 portiere titolare.
- [x] Validazione massimo 20 riserve.
- [x] Validazione massimo 5 staff.
- [x] Validazione massimo 1 capitano.
- [x] Validazione capitano titolare.
- [x] Validazione massimo 1 vice.
- [x] Validazione vice titolare.
- [x] Validazione capitano/vice diversi.

### Esito review

- [x] Wave 5 approvata dopo review tecnica.
- [x] Nessuna regressione evidente rilevata rispetto alle Wave precedenti.
- [x] Nessuna funzionalità appartenente alla Wave 6 anticipata.

### Annotazioni tecniche approvate

- [x] Drag&drop Web adattato a pulsanti `Su` / `Giù` su Mobile mantenendo l'ordine finale dei convocati equivalente.
- [x] Validazioni core allineate alla Source of Truth Web e ai messaggi business principali.
- [x] Nessuna funzionalità della Wave 6 implementata: upload foto, crop, richieste approvazione e submit lifecycle restano esclusi.
- [x] Documentazione aggiornata dopo approvazione.

## Wave 6 – Referee Workflow

### Stato review

- [x] Completed / Reviewed / Approved

### File Web analizzati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/manager/match-sheet/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/features/manager/match-sheet-workflow.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-photo-store.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-match-sheet.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/match-sheet-validation.ts`

### File Mobile modificati

- [x] `src/features/manager/match-sheet-workflow.tsx`
- [x] `src/types/shims.d.ts`

### Checklist Feature Parity

- [x] Workflow Referee replicato
- [x] Upload foto Player
- [x] Upload foto Staff
- [x] Preview immagini
- [x] Validazione MIME
- [x] Validazione dimensione file (5 MB)
- [x] Conferma preview
- [x] Crop mobile adattato
- [x] Snapshot locale distinta
- [x] Submit distinta
- [x] Reset Smoke
- [x] Toast success/error
- [x] Stato read-only dopo submit
- [x] Nessuna funzionalità di Wave successive introdotta

### Esito review

- [x] Approved

### Annotazioni tecniche

- [x] Crop adattato all'architettura React Native senza utilizzo di Canvas.
- [x] Gestione upload conforme all'architettura Mobile mediante URI/base64.
- [x] Feature Parity mantenuta con la Source of Truth Web.
- [x] Nessuna modifica architetturale fuori dallo scope della Wave.
- [x] Nessuna regressione rilevata durante la review.

## Wave 7 – Match Lifecycle

### Stato review

- [x] Approved

### File Web analizzati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/referee/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/referee/match/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-types.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-match-sheet.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/auth/auth-gate.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/button.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/card.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/state.tsx`

### File Mobile approvati

- [x] `app/referee/index.tsx`
- [x] `app/referee/match.tsx`
- [x] `src/features/referee/referee-match-workflow.tsx`
- [x] `src/lib/theme.ts`

### Checklist Feature Parity

- [x] Dashboard arbitro conforme
- [x] Navigazione al workflow match
- [x] AuthGate referee verificato
- [x] Workflow Distinte conforme
- [x] Visualizzazione distinte conforme
- [x] Verifica invio distinte conforme
- [x] Lock distinte conforme
- [x] Start Recognition conforme
- [x] Nessuna funzionalità Wave 8 implementata
- [x] Feature Parity raggiunta

### Esito review

- [x] Approved

### Annotazioni tecniche

- [x] Wave limitata esclusivamente al Match Lifecycle.
- [x] Step Riconoscimento e Referto mantenuti come placeholder per rispettare il perimetro della roadmap.
- [x] Nessuna modifica alla Source of Truth.
- [x] Nessun documento aggiuntivo creato.

## Wave 8 – Recognition Workflow

### Review Status

- [x] Approved

### File Web analizzati

- [x] `source-of-truth/refcheckid/refcheckid-web/src/app/referee/match/page.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-types.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-match-sheet.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-photo-store.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/pilot-data.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/button.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/card.tsx`
- [x] `source-of-truth/refcheckid/refcheckid-web/src/components/ui/state.tsx`

### File Mobile approvati

- [x] `src/features/referee/referee-match-workflow.tsx`
- [x] `src/lib/theme.ts`

### Checklist Feature Parity

- [x] Comportamento coerente con la Source of Truth Web.
- [x] Fetch dei soggetti di riconoscimento.
- [x] Visualizzazione foto o placeholder.
- [x] Visualizzazione dati documento.
- [x] Decisioni Approved / Rejected.
- [x] Gestione Pending.
- [x] Completamento del riconoscimento.
- [x] Invalidazione query dopo completamento.
- [x] Blocco degli step precedenti dopo la chiusura.
- [x] Placeholder Referto mantenuto senza implementare Wave 9.
- [x] Nessuna regressione rilevata.

### Esito review

- [x] Feature Parity verificata.
- [x] Wave 8 approvata.
- [x] Nessuna funzionalità appartenente alla Wave 9 implementata.
- [x] Workflow di riconoscimento conforme alla Source of Truth.

## Wave 9 – Match Report

### Stato Review

Approved

### File Web analizzati

- `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-report-validation.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-api-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-types.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-report.ts`
- `source-of-truth/refcheckid/refcheckid-web/tests/unit/referee-report-validation.test.ts`

### File Mobile approvati

- `src/features/referee/referee-match-workflow.tsx`
- `src/lib/referee-report-validation.ts`
- `__tests__/referee-report-validation.test.ts`

### Checklist Feature Parity

- [x] caricamento draft referto
- [x] gate sul riconoscimento completato
- [x] workflow Match Report
- [x] gestione risultato
- [x] gestione gol
- [x] gestione ammonizioni
- [x] gestione espulsioni
- [x] gestione sostituzioni
- [x] gestione note arbitro
- [x] riepilogo finale
- [x] validazioni Web-equivalenti
- [x] submit referto
- [x] persistenza locale prevista
- [x] test di regressione aggiunti

### Esito review

Feature Parity raggiunta.

Workflow arbitrale completato fino al Match Report.

Nessuna funzionalità appartenente alle Wave 10, 11 o 12 è stata anticipata.

Review approvata.

### Annotazioni tecniche

- validazioni estratte nel modulo condiviso referee-report-validation
- comportamento Mobile coerente con la Source of Truth Web
- adattamento UI Mobile (chip/pulsanti) senza modifiche funzionali
- TypeScript verificato
- test aggiunti
- lint non disponibile nel progetto
- test Jest non eseguibili nell'ambiente per limitazioni del registry

## Wave 10 – Federation Dashboard

### Stato Review

Approved

### File Web analizzati

- source-of-truth/refcheckid/refcheckid-web/src/features/federation/federation-workflow.tsx

### File Mobile approvati

- app/federation/index.tsx

### Checklist Feature Parity

- [x] accesso protetto ruolo Federation
- [x] dashboard federale
- [x] KPI operativi
- [x] notifiche operative
- [x] calendario gare
- [x] filtro per giornata
- [x] filtro per stato referto
- [x] combinazione filtri (AND)
- [x] elenco gare
- [x] badge stato gara
- [x] badge stato referto
- [x] loading state
- [x] error state
- [x] empty state
- [x] placeholder Referti
- [x] placeholder Foto
- [x] placeholder Storico

### Esito review

Feature Parity raggiunta.

Dashboard Federazione e Calendario implementati coerentemente con la Source of Truth Web.

Le sezioni Referti, Foto e Storico sono mantenute come placeholder senza anticipare funzionalità appartenenti alle Wave 11 e 12.

Review approvata.

### Annotazioni tecniche

- adattamento UI Mobile mediante chip di navigazione in sostituzione della sidebar Web
- architettura Mobile mantenuta
- utilizzo dei servizi federation-api-client esistenti
- TypeScript verificato
- lint non disponibile nel progetto
- test Jest non eseguibili nell'ambiente per limitazioni del registry


## Wave 11 – Federazione: referti, foto, storico e audit

### Stato review

Approved

### File Web analizzati

- `source-of-truth/refcheckid/refcheckid-web/src/features/federation/federation-workflow.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/federation-api-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/federation-types.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-photo-store.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/submitted-report.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`

### File Mobile modificati

- `app/federation/index.tsx`

### Feature verificate e approvate

- [x] Dashboard e Calendario Wave 10 mantenuti invariati.
- [x] Implementata la consultazione dei referti federali.
- [x] Lista referti con selezione e dettaglio in sola lettura.
- [x] Visualizzazione risultato, gol, ammonizioni, espulsioni, sostituzioni, note arbitro e note commissario.
- [x] Implementata la gestione delle richieste foto.
- [x] Visualizzazione foto attuale e foto proposta.
- [x] Gestione approvazione e rifiuto richieste pending.
- [x] Invalidazione coerente delle query photos, players e staff.
- [x] Implementato lo storico federale.
- [x] Ricerca per gara, società e arbitro.
- [x] Apertura referto.
- [x] Apertura audit sintetico.
- [x] Gestione completa degli stati loading, error, empty e read-only.
- [x] Feature Parity verificata con la Source of Truth Web.

### Esito review

Approved

### Annotazioni tecniche

- Nessuna regressione rilevata rispetto alla Wave 10.
- Architettura coerente con il resto dell'applicazione.
- Utilizzo corretto di React Query, useApiQuery e invalidazioni.
- Osservate esclusivamente note minori non bloccanti (timestamp audit sintetico, local state ridondante, colori hardcoded e verifica query key), non tali da impedire l'approvazione della Wave.
