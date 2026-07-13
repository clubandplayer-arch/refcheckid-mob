# ARCH-1 — Milestone G — Referee Mobile Official Photo Migration

## Summary

Milestone G migrates the Referee Mobile recognition workflow to the ARCH-1 Official Photo Workflow, aligning it with the Referee Web source of truth. The mobile referee experience now reads recognition subjects from the backend Match Photo Manifest, preserves frozen snapshot semantics, displays backend photo state metadata, and uses temporary pinned query/image cache only as an offline aid.

## Audit iniziale

Source of truth audited:

- `refcheckid-docs/ARCHITECTURE/ARCH-1_Shared_Official_Photo_Storage.md`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-api-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/referee-types.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/features/referee/referee-match-workflow.tsx`
- `source-of-truth/refcheckid/refcheckid-web/tests/unit/referee-manifest-cache.test.ts`
- `source-of-truth/refcheckid/refcheckid-web/tests/unit/referee-api-client.test.ts`

Differenze residue individuate prima della migrazione:

1. Referee Mobile non esponeva il contratto `ApiMatchPhotoManifest`.
2. Referee Mobile non chiamava `/matches/:matchId/photo-manifest` per il riconoscimento.
3. Referee Mobile costruiva ancora i soggetti da distinte/snapshot locali quando non vincolato al manifest.
4. Referee Mobile non manteneva gli stati backend `photoStatus`, `photoEtag`, `manifestSource`, `isFrozenSnapshot` sui soggetti di riconoscimento.
5. Referee Mobile non applicava la cache policy del Referee Web per il manifest durante la sessione di riconoscimento.
6. Referee Mobile mostrava una foto quando era presente un URL, senza verificare lo stato backend `active`.
7. Referee Mobile non visualizzava la provenienza della foto: manifest live vs snapshot congelato.
8. Referee Mobile non prefetchava le foto attive del manifest per l'uso temporaneo offline.

## Componenti aggiornati

- `src/lib/api-client.ts`
  - Aggiunti tipi del Match Photo Manifest.
  - Aggiunto client `fetchMatchPhotoManifest(matchId)`.
- `src/lib/referee-types.ts`
  - Aggiunti stati e metadati manifest sui soggetti di riconoscimento.
- `src/lib/referee-api-client.ts`
  - `fetchRecognitionSubjects(matchId)` ora usa il Match Photo Manifest quando il feature flag esistente `photos.refereeManifest` è attivo.
  - Se il manifest non è `available`, il client restituisce una lista vuota e non ricostruisce soggetti localmente.
  - Il fallback legacy resta disponibile solo dietro feature flag esistente `photos.legacyLocalFallback`.
- `src/features/referee/referee-match-workflow.tsx`
  - Query di riconoscimento e referto collegate al manifest del match corrente.
  - Cache query pinnata per la sessione di riconoscimento.
  - Prefetch temporaneo delle sole foto manifest con stato backend `active`.
  - Rendering foto vincolato a `photoStatus === "active"`.
  - UI metadata per stato foto, fonte manifest/snapshot e `photoEtag`.
- `__tests__/referee-mobile-official-photo.test.ts`
  - Aggiunte regression guard per manifest, snapshot, cache, prefetch, offline e feature flag.

## Flusso migrato

1. L'arbitro apre la gara assegnata.
2. La fase distinte blocca le distinte inviate e avvia il riconoscimento come prima.
3. La fase riconoscimento chiama `fetchRecognitionSubjects(matchId)`.
4. Con `photos.refereeManifest=true`, il client legge esclusivamente il Match Photo Manifest backend.
5. I soggetti visualizzati sono quelli forniti dal manifest; il client aggiunge solo la decisione UI iniziale `pending`.
6. Le foto sono renderizzate solo quando il backend dichiara `photoStatus: "active"`.
7. La fonte mostrata all'arbitro è `Snapshot congelato` quando `isFrozenSnapshot=true`; altrimenti `Manifest backend`.
8. Il referto riusa lo stesso manifest come roster di confronto per goal, ammonizioni, espulsioni e sostituzioni.

## Cache

La cache implementata è temporanea e invalidabile:

- `staleTime: Number.POSITIVE_INFINITY`
- `refetchOnWindowFocus: false`
- `refetchOnReconnect: false`
- `refetchOnMount: false`
- `refetchInterval: false`
- `retry: false`

Questa policy replica il comportamento del Referee Web: il manifest resta stabile durante la sessione di riconoscimento e non segue automaticamente modifiche successive alle foto.

## Offline

Il supporto offline mobile è limitato alla cache temporanea prevista da ARCH-1:

- Query cache del manifest già caricato.
- Image cache tramite `Image.prefetch(photoUrl)` per le foto backend attive.

La cache non diventa mai Source of Truth e non ricostruisce dati in autonomia.

## Feature Flag

Non sono stati introdotti nuovi feature flag.

Feature flag esistenti riusati:

- `photos.refereeManifest`
- `photos.legacyLocalFallback`

## Test eseguiti

- `npm test -- --runTestsByPath __tests__/referee-mobile-official-photo.test.ts`
  - Non eseguito: dipendenze non installate (`jest: not found`).
- `npm install`
  - Non completato: registry ha risposto `403 Forbidden` su `expo-image-picker`.

## Eventuali limitazioni residue

- La verifica automatica completa non è stata eseguita a causa del blocco ambiente sulle dipendenze npm.
- Il fallback legacy resta presente solo perché controllato da feature flag esistente; con `photos.refereeManifest=true` e manifest non disponibile non viene usato per ricostruire soggetti.
