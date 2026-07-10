# ARCH-1 — Milestone F — Manager Mobile Subject Workflow Migration

## Stato

Milestone F completata per il Manager Mobile: Player e Staff Member usano lo stesso Official Photo Workflow subject-based già adottato dal Manager Web.

## Audit iniziale

Source of Truth analizzata:

- `source-of-truth/refcheckid/refcheckid-docs/ARCHITECTURE/ARCH-1_Shared_Official_Photo_Storage.md`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/manager-photo-backend.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/photo-feature-flags.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/api-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/features/manager/match-sheet-workflow.tsx`

Differenze residue individuate prima della migrazione:

- Mobile usava ancora `saveManagerSubjectPhoto` come percorso primario per Player e Staff.
- Mobile non leggeva lo stato ufficiale backend subject-based per `athlete` e `staff_member`.
- Mobile non richiedeva registrazioni stagionali per collegare upload, approval state e subject.
- Mobile non esponeva lo stato backend `Missing`, `Pending`, `Active`, `Rejected`, `Suspended`.
- Mobile non mostrava la proposta pending accanto alla foto ufficiale corrente.
- Staff seguiva ancora il percorso legacy locale come primario.

## Componenti aggiornati

- Aggiunto servizio mobile `manager-photo-backend` allineato al Web per:
  - lettura foto ufficiale subject-based;
  - lettura approvazione più recente;
  - URL della versione proposta;
  - Upload Intent;
  - Upload Complete;
  - fallback locale solo quando consentito dai feature flag esistenti.
- Aggiunti feature flag mobile compatibili con i flag Web esistenti, senza introdurre nuovi flag.
- Aggiornato `api-client` per arricchire Player e Staff con registrazioni e backend photo state.
- Aggiornato workflow Manager Mobile per usare Upload Intent / Upload Complete come percorso primario per Player e Staff.
- Aggiornata UI mobile con badge stato backend e confronto foto ufficiale corrente / proposta pending.
- Aggiornati dati pilot per mantenere campi subject workflow null-safe quando il backend non espone registrazioni.

## Player

Player usa ora:

- `subjectKind: athlete`;
- `registrationId`;
- `seasonId`;
- `clubId`;
- `federationId`;
- Upload Intent;
- Upload Complete;
- stato ufficiale backend.

## Staff

Staff Member usa ora lo stesso workflow dei Player:

- `subjectKind: staff_member`;
- nessun servizio Staff-specific;
- nessuna semantica dedicata;
- stesso stato backend;
- stessa pending proposal;
- stesso fallback feature-flagged.

## Cache e offline

La cache mobile resta temporanea e derivata dal backend. Il client non genera stati ufficiali autonomi: in assenza di backend viene usato solo il fallback legacy già protetto dai feature flag esistenti.

## Test e verifiche

- `npm run typecheck` non completato per limitazione ambiente: TypeScript 6 richiede `ignoreDeprecations` per `baseUrl` e manca `expo/tsconfig.base`.
- `npm test -- --watch=false` non completato perché `jest` non è installato.
- `npm install` non completato perché il registry ha risposto `403 Forbidden` su `expo-image-picker`.

## Limitazioni residue

Nessuna limitazione funzionale intenzionale introdotta nella milestone. Le uniche limitazioni osservate riguardano l’ambiente di verifica locale e non il workflow implementato.
