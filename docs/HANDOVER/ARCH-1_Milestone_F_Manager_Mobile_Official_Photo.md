# ARCH-1 — Milestone F — Manager Mobile Official Photo

## Summary

Milestone F migra il Manager Mobile verso il flusso ARCH-1 per le fotografie ufficiali. Il client mobile legge lo stato foto dal manifest dell'Official Photo Service, usa Upload Intent e Upload Complete per l'upload, e mantiene una cache locale solo temporanea per supporto offline/bassa connettività.

## Audit iniziale effettuato

- Manager Web analizzato in `source-of-truth/refcheckid/refcheckid-web/src/features/manager/match-sheet-workflow.tsx` e `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts` come riferimento funzionale validato.
- Manager Mobile analizzato in `src/features/manager/match-sheet-workflow.tsx`, `src/lib/api-client.ts` e `src/lib/manager-photo-store.ts`.
- Compatibile: flusso UX di selezione/scatto foto, controlli immagine, validazione formato/dimensione, invalidazione query e stato distinta read-only.
- Da migrare: persistenza locale `manager-photo-store` come sorgente primaria, override locali su player/staff, stato foto dedotto localmente.
- Legacy individuato: `saveManagerSubjectPhoto` applicava direttamente foto mancanti in local storage e creava richieste locali in caso di sostituzione.
- Divergenze ARCH-1 risolte nel Manager Mobile: stato foto ora proviene dal manifest backend; upload passa da intent/complete; cache è temporanea e invalidabile.

## File modificati

- `src/lib/official-photo-service.ts`
- `src/lib/api-client.ts`
- `src/lib/types.ts`
- `src/features/manager/match-sheet-workflow.tsx`
- `__tests__/official-photo-service.test.ts`
- `docs/HANDOVER/ARCH-1_Milestone_F_Manager_Mobile_Official_Photo.md`

## Flusso migrato

1. Manager Mobile prefetcha il manifest ufficiale con scope manager.
2. Player e staff ricevono `photoUrl` e `officialPhotoState` esclusivamente dal manifest backend.
3. La UI mostra gli stati backend: Missing, Pending, Active, Rejected, Suspended.
4. La selezione foto mobile genera una preview locale solo transitoria.
5. Alla conferma, il client richiede Upload Intent.
6. Il binario viene inviato solo all'URL autorizzato dall'intent.
7. Il client chiama Upload Complete.
8. Le query `photos`, `players` e `staff` vengono invalidate per riallinearsi alla Source of Truth backend.

## Componenti aggiornati

- Match sheet Manager Mobile: caricamento, visualizzazione stato foto, upload e notifiche di esito backend.
- API client Manager Mobile: rimozione degli override locali come fonte primaria su player/staff.
- Official Photo Service mobile: manifest, cache temporanea, upload intent, upload complete e fallback legacy solo se flag esistente lato storage locale lo abilita.

## Feature Flag utilizzati

- `refcheckid.arch1.officialPhotoLegacyFallback`: fallback legacy già isolato nel client e disabilitato di default. Non introduce un nuovo comportamento primario; serve solo a mantenere compatibilità controllata in ambienti non ancora allineati al manifest.

## Eventuali bug backend individuati

- Nel backend locale incluso nella repository non risultano implementati endpoint documentati per `POST /official-photos/upload-intents`, `POST /official-photos/upload-complete` e `GET /official-photos/manifest?scope=manager`. Il Manager Mobile è stato allineato ai contratti ARCH-1 richiesti dalla milestone senza modificare il backend, come da vincolo.

## Test eseguiti

- `npm test -- --runTestsByPath __tests__/official-photo-service.test.ts`: non eseguibile perché `jest` non è installato in `node_modules`.
- `npm ci`: non eseguibile perché `package.json` e `package-lock.json` non sono sincronizzati (`expo-image-picker` manca nel lockfile).
- `npx tsc --noEmit`: non completa per configurazione ambiente/dipendenze (`expo/tsconfig.base` non trovato e deprecazione TypeScript 6 su `baseUrl`).

## Limitazioni note

- Il supporto offline usa esclusivamente la cache temporanea del manifest e non genera stati autonomi.
- In assenza di manifest e senza fallback esplicitamente abilitato, l'errore API viene propagato al layer query.
- La preview/crop resta locale e transitoria fino alla richiesta Upload Intent.

## Milestone successiva

Non avviare automaticamente la Milestone G. La migrazione Referee Mobile deve attendere approvazione esplicita dopo verifica della Milestone F.
