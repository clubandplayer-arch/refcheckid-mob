# Audit workflow Mobile vs Source of Truth Web

Data: 2026-07-09  
Scope richiesto: Dashboard Dirigente, Workflow Distinta, Dashboard Arbitro, Workflow Gara Arbitro, Riconoscimento, Referto.  
Metodo: per ogni area sono stati prima letti i file Web in `source-of-truth/refcheckid/refcheckid-web`, poi i file Mobile equivalenti in `app/` e `src/`, e infine i servizi backend quando lo stato funzionale dipende da transizioni server-side.

## Regola operativa vincolante

Da questo audit in poi, ogni modifica Mobile deve seguire questa sequenza:

1. individuare il file Web equivalente nella Source of Truth;
2. leggere componenti, hook, API client, validazioni e stati UX;
3. leggere il backend quando il workflow dipende da transizioni di stato o vincoli server-side;
4. confrontare Web e Mobile;
5. definire l'adattamento UX Mobile senza cambiare logica, dati, validazioni, API o stati;
6. implementare solo dopo il confronto.

## Matrice file analizzati

| Area | File Web Source of Truth | File Mobile | Backend/API/validazioni correlate |
| --- | --- | --- | --- |
| Dashboard Dirigente | `source-of-truth/refcheckid/refcheckid-web/src/app/manager/page.tsx` | `app/manager/index.tsx` | `src/lib/api-client.ts`, `source-of-truth/refcheckid/refcheckid-backend/src/services/match-sheet-service.ts` |
| Workflow Distinta | `source-of-truth/refcheckid/refcheckid-web/src/app/manager/match-sheet/page.tsx`, `source-of-truth/refcheckid/refcheckid-web/src/features/manager/match-sheet-workflow.tsx` | `app/manager/match-sheet.tsx`, `src/features/manager/match-sheet-workflow.tsx` | `src/lib/match-sheet-validation.ts`, `src/lib/manager-photo-store.ts`, `source-of-truth/refcheckid/refcheckid-backend/src/services/match-sheet-service.ts` |
| Dashboard Arbitro | `source-of-truth/refcheckid/refcheckid-web/src/app/referee/page.tsx` | `app/referee/index.tsx` | `src/lib/referee-api-client.ts` |
| Workflow Gara Arbitro | `source-of-truth/refcheckid/refcheckid-web/src/app/referee/match/page.tsx`, `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx` | `app/referee/match.tsx`, `src/features/referee/referee-match-workflow.tsx` | `source-of-truth/refcheckid/refcheckid-backend/src/services/recognition-service.ts`, `source-of-truth/refcheckid/refcheckid-backend/src/services/match-report-service.ts` |
| Riconoscimento | `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx` (`RecognitionStep`) | `src/features/referee/referee-match-workflow.tsx` (`RecognitionStep`) | `src/lib/referee-api-client.ts`, backend `RecognitionService` |
| Referto | `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx` (`MatchReportStep`) | `src/features/referee/referee-match-workflow.tsx` (`MatchReportStep`) | `src/lib/referee-report-validation.ts`, backend `MatchReportService` |

## Executive summary

La parità funzionale è buona sulle API principali e sulle validazioni condivise, ma la UX Mobile è ancora un adattamento minimale. Il rischio maggiore non è nei dati, bensì nell'usabilità su dispositivo reale: assenza sistematica di contenitori scroll/safe area, stepper non sticky, liste lunghe renderizzate senza virtualizzazione, controlli foto non nativi, tab referto troppo densi e alcune divergenze nel riconoscimento.

Priorità consigliate:

- **P0**: scroll/safe area e navigazione di workflow, perché alcune schermate possono diventare non fruibili su schermi piccoli.
- **P0**: riallineamento riconoscimento Mobile al Web, perché attualmente Mobile introduce il rifiuto tesserato e visualizza la scadenza documento mentre il Web non lo fa.
- **P1**: foto distinta con picker/camera Mobile reale mantenendo stesse validazioni Web.
- **P1**: referto con input Mobile dedicati e riepilogo sempre raggiungibile.
- **P2**: accessibilità, touch target, annunci di stato e performance liste.

## 1. Dashboard Dirigente

### Differenze rispetto al Web

- Web usa un layout desktop responsive con `max-w-6xl`, header su due colonne da `md`, tre card in grid e link primario “Apri distinta”.
- Mobile mantiene gli stessi dati, testi, empty/error/loading e formattazione stato, ma usa un `View` semplice senza `ScrollView`, senza `SafeAreaView` e senza gestione esplicita di overflow.
- Il pulsante è corretto come navigazione Mobile via `router.push`, ma non esiste una barra azioni sticky o una gerarchia pensata per una mano.

### Problemi

| Priorità | Tipo | Problema |
| --- | --- | --- |
| P0 | Scroll/layout | Nessun `ScrollView`: notifiche lunghe o testo grande possono uscire dallo schermo. |
| P0 | Safe area | Padding statico; rischio sovrapposizione con notch/status bar/navigation bar. |
| P1 | Responsive | Card sempre verticali: corretto per mobile, ma manca adattamento tablet. |
| P1 | Accessibilità | Stato distinta è solo testo stilizzato, senza ruolo/label semantico. |
| P2 | UX | CTA “Apri distinta” solo in header; con contenuti lunghi può sparire. |

### Strategia di hardening

- Wrappare la schermata in `SafeAreaView` + `ScrollView` con `contentContainerStyle`.
- Rendere la CTA principale raggiungibile anche a fondo pagina o sticky su workflow critici.
- Aggiungere label accessibili per stato distinta e notifiche.

### Stima

S / 0.5 giornata.

### File Mobile coinvolti

- `app/manager/index.tsx`
- eventualmente `src/components/ui/card.tsx`, `src/components/ui/button.tsx`

## 2. Workflow Distinta

### Parità funzionale rilevata

Mobile conserva molte regole Web: query giocatori/staff/distinte, filtro per nome, status read-only se distinta non `draft`, submit con snapshot locale, reset smoke, validazioni finali, vincolo foto immagine e massimo 5 MB, approvazione foto tramite store, capitano/vice esclusivi, limite panchina/staff da validazione.

### Differenze rispetto al Web

- Web usa drag & drop (`@dnd-kit`) per l'ordine; Mobile lo sostituisce con pulsanti Su/Giù. L'adattamento è accettabile, ma la lista non è virtualizzata.
- Web usa file input reale e crop asincrono; Mobile richiede URI/base64, MIME type e dimensione in campi testuali. Questo non è UX Mobile reale.
- Web mostra uno stepper tabellare semplice; Mobile replica bottoni ma senza scroll orizzontale/sticky e senza indicazione compatta di progresso/validità step.
- La pagina Mobile `app/manager/match-sheet.tsx` non aggiunge contenitore scroll: tutto il workflow è in `View` interni.

### Problemi

| Priorità | Tipo | Problema |
| --- | --- | --- |
| P0 | Scroll | Workflow composto da liste lunghe senza `ScrollView`/`FlatList`: rischio contenuto irraggiungibile. |
| P0 | Tastiera | Campi numero maglia, URI foto e note non sono protetti da `KeyboardAvoidingView`. |
| P1 | UX foto | Inserimento foto tramite testo non è accettabile su Mobile; serve camera/gallery mantenendo stesse regole Web. |
| P1 | Performance | Mapping completo di giocatori/staff in JSX; con roster ampi serve `FlatList` o sezioni virtualizzate. |
| P1 | Navigazione | Stepper non sticky; in fondo lista l'utente non vede più dove si trova né come cambiare step. |
| P1 | Accessibilità | Pulsanti ruolo/capitano/vice non espongono stato selezionato. |
| P1 | Layout | Foto, controlli crop e azioni stanno nello stesso card verticale: alto rischio card enormi e poco scansionabili. |
| P2 | Responsive | Nessun layout tablet a due colonne per preview/riepilogo. |

### Funzionalità mancanti o deboli

- Picker/camera nativi per foto.
- Bottom sheet o modale dedicata al crop foto.
- Lista convocati con header sticky e contatore.
- Conferma finale più robusta prima dell'invio distinta.

### Strategia di hardening

1. Introdurre shell comune `MobileWorkflowScreen` con safe area, scroll, keyboard avoiding e footer opzionale.
2. Convertire liste giocatori/staff/ordine in `FlatList` o sezioni virtualizzate.
3. Sostituire campi URI/MIME/dimensione con picker nativo, derivando MIME e size dal file selezionato.
4. Spostare crop foto in bottom sheet/modale full-screen con zoom/pan touch.
5. Rendere stepper orizzontale scrollabile e sticky.
6. Non cambiare validazioni, stati e API: riusare `validateMatchSheet`, `saveManagerSubjectPhoto`, `submitMatchSheet`, `resetSmokeMatchSheet`.

### Stima

M-L / 2-3 giornate.

### File Mobile coinvolti

- `app/manager/match-sheet.tsx`
- `src/features/manager/match-sheet-workflow.tsx`
- eventuali nuovi componenti in `src/components/ui/`
- eventuale integrazione picker in `package.json`/config Expo se necessaria

## 3. Dashboard Arbitro

### Differenze rispetto al Web

- La logica è allineata: fetch dashboard, stati loading/error/empty, prossima gara, stato gara, notifiche, CTA “Apri gara”.
- Come per Dashboard Dirigente, Mobile usa un `View` statico senza scroll/safe area.

### Problemi

| Priorità | Tipo | Problema |
| --- | --- | --- |
| P0 | Scroll/safe area | Contenuto non scrollabile e padding statico. |
| P1 | UX | CTA non persistente; in caso notifiche lunghe può uscire dalla vista. |
| P1 | Accessibilità | Stato gara come solo testo stilizzato. |
| P2 | Responsive | Nessun layout tablet. |

### Strategia di hardening

- Stessa shell delle dashboard Mobile.
- CTA primaria duplicata/sticky quando contenuti lunghi.
- Accessibilità per stato e lista notifiche.

### Stima

S / 0.5 giornata.

### File Mobile coinvolti

- `app/referee/index.tsx`

## 4. Workflow Gara Arbitro

### Parità funzionale rilevata

Mobile copre i tre step Web: Distinte, Riconoscimento, Referto. Usa le stesse API principali: dashboard arbitro, distinte gara, lock/start recognition, recognition subjects, complete recognition, fetch/submit report.

### Differenze rispetto al Web

- Web posiziona lo stepper in `aside` su desktop; Mobile lo rende verticale sopra il contenuto. È sensato, ma non sticky e non scrollabile orizzontalmente.
- Mobile passa `isLocked={recognitionClosed}` a `RecognitionStep`, mentre Web passa `isLocked={false}` e gestisce la chiusura con disabilitazione degli step precedenti. La UX risultante è diversa dopo la chiusura.
- Mobile fa `setStep(2)` automaticamente on complete; Web resta più esplicito con step disabilitati e passaggio a referto.
- In `SheetVerificationStep` Mobile aggiunge toast e invalidazione, positivo ma da considerare comportamento UX aggiuntivo non presente nel Web.

### Problemi

| Priorità | Tipo | Problema |
| --- | --- | --- |
| P0 | Scroll | `app/referee/match.tsx` usa `View`, workflow lungo non scrollabile. |
| P0 | Navigazione | Dopo chiusura riconoscimento il comportamento di step lock differisce dal Web. |
| P1 | Layout | Stepper verticale consuma spazio in alto; su telefoni piccoli riduce area utile. |
| P1 | Stato | Mancano indicatori persistenti per stato gara/riconoscimento/referto durante lo scroll. |
| P1 | Accessibilità | Stepper `Pressable` non espone stato selected/disabled in modo completo. |

### Strategia di hardening

- Shell scroll/safe area dedicata a workflow arbitro.
- Stepper orizzontale sticky con stato selected/disabled accessibile.
- Riallineare il comportamento post-chiusura al Web: step precedenti disabilitati, referto accessibile, senza introdurre stati divergenti.
- Conservare chiamate backend e transizioni: match sheet `draft -> submitted -> locked`, recognition `not_started -> in_progress -> locked`, report `draft/in_compilation -> submitted`.

### Stima

M / 1-2 giornate.

### File Mobile coinvolti

- `app/referee/match.tsx`
- `src/features/referee/referee-match-workflow.tsx`

## 5. Riconoscimento

### Differenze critiche rispetto al Web

- Web permette solo “Conferma riconoscimento” e “Indietro”; Mobile aggiunge “Rifiuta”. Questo è una divergenza funzionale: il tipo supporta `rejected`, ma la UX Web Source of Truth non espone il rifiuto in questa schermata.
- Web mostra nel documento solo tipo e numero; Mobile mostra anche scadenza. È un dato in più non previsto dalla UX Web.
- Web conteggia completamento pieno richiedendo almeno un riconoscimento per casa e ospite (`hasHomeRecognition`/`hasAwayRecognition`); Mobile usa `pendingCount === 0`. Nei casi limite la chiusura potrebbe differire.
- Web mantiene `index` e `currentTeamDecisionOrder`; Mobile semplifica al primo non deciso del team. È mobile-friendly, ma deve preservare esattamente i casi di back per team.

### Problemi

| Priorità | Tipo | Problema |
| --- | --- | --- |
| P0 | Feature parity | Pulsante “Rifiuta” presente solo su Mobile. Va rimosso o introdotto prima nel Web Source of Truth. |
| P0 | Feature parity | Regola `fullRecognitionComplete` diversa dal Web nei casi limite. |
| P1 | Privacy/UX | Scadenza documento visibile solo su Mobile; verificare se ammessa dalla Source of Truth. |
| P1 | Layout | Foto e dettagli in card unica; manca modalità full-screen/zoom per verifica sul campo. |
| P1 | Navigazione | Cambio squadra e ritorno precedente non sono abbastanza evidenti su Mobile. |
| P1 | Accessibilità | Documento come `Pressable` senza `accessibilityState.expanded`. |

### Strategia di hardening

1. Rimuovere temporaneamente “Rifiuta” dal Mobile per aderire al Web, salvo aggiornamento esplicito della Source of Truth.
2. Copiare la logica Web di `fullRecognitionComplete`, `recognizedTeams`, `currentTeamDecisionOrder`.
3. Allineare campi documento a Web oppure aggiornare prima il Web se la scadenza è richiesta.
4. Aggiungere UX mobile: foto grande, azioni sticky bottom, team switch come bottom sheet/segmented control.

### Stima

M / 1-2 giornate.

### File Mobile coinvolti

- `src/features/referee/referee-match-workflow.tsx`

## 6. Referto

### Parità funzionale rilevata

Mobile conserva passi Web: Risultato, Gol, Ammonizioni, Espulsioni, Sostituzioni, Note, Riepilogo. Riusa `validateReportDraft`, `countGoalsByTeam`, motivi ammonizione/espulsione, tipi gol, team report, risoluzione nome giocatore e submit.

### Differenze rispetto al Web

- Web usa tab `flex-wrap`; Mobile usa chip `Pressable` ma senza scroll orizzontale o sticky.
- Web usa `textarea`; Mobile usa `Input multiline`, corretto ma senza keyboard avoiding.
- Web usa controlli form compatti; Mobile usa choice chips per maglie/dettagli. È adatto al touch, ma può esplodere in altezza per roster lunghi.
- Mobile non mostra in modo evidente blocchi di validazione finché l'utente non entra nel riepilogo, come Web; su Mobile sarebbe utile un badge di errori senza cambiare la logica.

### Problemi

| Priorità | Tipo | Problema |
| --- | --- | --- |
| P0 | Scroll/tastiera | Referto lungo senza `ScrollView` e keyboard avoiding. |
| P1 | Layout | Choice chips per maglie possono creare card molto alte. Serve picker/bottom sheet. |
| P1 | Navigazione | I 7 step non sono sticky; compilare eventi e tornare al riepilogo è scomodo. |
| P1 | Accessibilità | Choice chip non espone `selected`; tab non espongono stato corrente. |
| P1 | UX errori | Errori bloccanti solo nel riepilogo; serve indicatore non invasivo sul tab riepilogo. |
| P2 | Responsive | Nessun layout tablet per risultato/eventi. |

### Strategia di hardening

- Shell con keyboard avoiding e footer invio sticky nel riepilogo.
- Tab referto come `ScrollView` orizzontale sticky.
- Picker/bottom sheet per scelta giocatore/maglia, mantenendo `resolveReportPlayerName` e dati riconoscimento.
- Badge errori calcolato dalle stesse `blockingErrors`, senza cambiare validazione.

### Stima

M-L / 2 giornate.

### File Mobile coinvolti

- `src/features/referee/referee-match-workflow.tsx`
- `src/lib/referee-report-validation.ts` solo se emergono differenze rispetto alla Source of Truth; per ora non va modificato.

## Piano di hardening Mobile proposto

### Fase 1 — Fondamenta UX Mobile (P0)

- Creare componenti/shell comuni: `SafeAreaView`, `ScrollView`, `KeyboardAvoidingView`, `contentContainerStyle` coerente.
- Applicare shell a dashboard e workflow.
- Rendere stepper principali sticky o sempre raggiungibili.
- Riallineare riconoscimento a Web rimuovendo divergenze funzionali.

Stima: 2 giornate.

### Fase 2 — Workflow Distinta robusto (P1)

- Virtualizzare liste giocatori/staff/ordine.
- Introdurre picker/camera per foto e modale crop.
- Migliorare accessibilità dei controlli ruolo/capitano/vice e degli stati.
- Aggiungere footer azioni per riepilogo/invio.

Stima: 2-3 giornate.

### Fase 3 — Workflow Arbitro/Riconoscimento sul campo (P1)

- Stepper orizzontale sticky e team switch touch-friendly.
- Foto riconoscimento full-screen/zoom.
- Azioni di riconoscimento sticky bottom.
- Conferma chiusura riconoscimento con stati identici al Web.

Stima: 2 giornate.

### Fase 4 — Referto Mobile-first (P1/P2)

- Tab referto sticky/scrollabile.
- Picker per giocatori/maglie e dettagli evento.
- Badge errori e riepilogo sempre raggiungibile.
- Ottimizzazione layout tablet.

Stima: 2 giornate.

### Fase 5 — QA parità e accessibilità (P2)

- Test di parità su funzioni di validazione e workflow state.
- Test componenti per selected/disabled/accessibility labels.
- Checklist manuale su telefono piccolo, telefono grande e tablet.

Stima: 1-2 giornate.

## Backlog prioritizzato

1. **P0**: introdurre scroll/safe area/keyboard avoiding in `app/manager/index.tsx`, `app/manager/match-sheet.tsx`, `app/referee/index.tsx`, `app/referee/match.tsx`.
2. **P0**: riallineare `RecognitionStep` Mobile al Web eliminando “Rifiuta” e uniformando `fullRecognitionComplete`.
3. **P1**: sostituire foto testuale distinta con picker/camera e crop modal.
4. **P1**: virtualizzare liste Distinta.
5. **P1**: rendere stepper Distinta/Gara/Referto sticky e accessibili.
6. **P1**: introdurre picker/bottom sheet per maglie e dettagli referto.
7. **P2**: layout tablet e rifiniture accessibilità/touch target.

## Note backend da rispettare

- Distinta: transizioni ammesse `draft -> submitted|locked`, `submitted -> locked`, `locked` terminale. Il reset smoke è solo dev/smoke.
- Riconoscimento: parte solo se tutte le distinte sono locked; transizioni `not_started -> in_progress -> locked`.
- Referto: submit consentito solo da `draft` o `in_compilation`; `submitted` è terminale/non modificabile.

Queste regole non devono essere reinterpretate nel Mobile: la UX può guidare meglio l'utente, ma deve lasciare invariati API, stati e validazioni.
