# ARCH-1 Milestone F — Manager Mobile Official Photo

## Summary

Milestone F migrates Manager Mobile toward ARCH-1 official photo consumption for player photos. The mobile client now reads the official player photo state from the backend, uploads through Upload Intent and Upload Complete, shows backend states, and keeps only a temporary invalidable offline cache.

## Audit iniziale effettuato

- ARCH-1 was reviewed as the architectural source of truth.
- Manager Web was reviewed as the functional reference, especially `manager-photo-backend`, feature flags, player registration enrichment, Upload Intent, Upload Complete, approval lookup, and read-side signed URL resolution.
- Manager Mobile still used legacy `manager-photo-store` as the primary write path in the match sheet workflow.
- Manager Mobile player/staff loading still merged legacy `/photos` metadata and local overrides before this milestone.
- Existing Mobile UI already had camera/library capture, crop controls, and photo preview components that could be reused without introducing a new UX architecture.

## File modificati

- `src/lib/photo-feature-flags.ts`
- `src/lib/manager-photo-backend.ts`
- `src/lib/api-client.ts`
- `src/lib/types.ts`
- `src/lib/manager-team.ts`
- `src/lib/pilot-data.ts`
- `src/features/manager/match-sheet-workflow.tsx`
- `__tests__/manager-mobile-official-photo.test.ts`
- `docs/HANDOVER/ARCH-1_Milestone_F_Manager_Mobile_Official_Photo.md`

## Flusso migrato

1. Manager Mobile loads players and seasonal registrations.
2. For each player, the client requests `/players/{id}/photo?rendition=normalized&ttlSeconds=300`.
3. If a registration is available, the client reads `/photo-approvals?registrationId={id}` and, when needed, the proposed version URL.
4. The UI renders only the backend state: Missing, Pending, Active, Rejected, or Suspended.
5. Upload uses `/photos/upload-intent`, writes to the signed upload URL when provided, and finalizes through `/photos/uploads/{uploadId}/complete`.
6. After completion, the client rereads backend state and invalidates player/photo queries.
7. Offline behavior uses a temporary TTL cache only; cached data is marked offline and is not promoted to source of truth.

## Componenti aggiornati

- Manager match sheet workflow now uses Official Photo Service upload for players.
- Player roster mapping now carries `registrationId` and `season` metadata needed by ARCH-1 upload contracts.
- Photo capture controls now display backend photo state labels and offline-cache warnings.
- Staff entries expose backend-compatible photo state for read UI parity, while staff upload remains blocked because the currently mirrored Manager Web workflow implements official upload for players.

## Feature Flag utilizzati

No new feature flags were introduced. The mobile code uses the ARCH-1 flags already used by the Web reference:

- `photos.officialBackendRead`
- `photos.officialBackendUpload`
- `photos.refereeManifest`
- `photos.frozenMatchSnapshot`
- `photos.legacyLocalFallback`
- `photos.dualWriteLegacy`

## Eventuali bug backend individuati

No backend bug was fixed in this repository. A mobile limitation remains if `/player-registrations` does not return a seasonal registration for a player: upload is blocked because ARCH-1 requires `registrationId`.

## Test eseguiti

- `npm test -- --runTestsByPath __tests__/manager-mobile-official-photo.test.ts` — not executable in this container because `node_modules/.bin/jest` is missing.
- `npx tsc --noEmit --ignoreDeprecations 6.0 --skipLibCheck` — reached project environment limitations: missing `expo/tsconfig.base` and missing `@testing-library/react-native/matchers` type declarations; code-level type issue found during the run was fixed.

## Limitazioni note

- The offline cache is local temporary metadata/read URL cache with a short TTL. It does not create client-side official states.
- Staff upload is not enabled from Manager Mobile in this milestone because the source-of-truth Manager Web implementation exposes the official upload command for players.
- Legacy fallback remains available only behind existing ARCH-1 feature flags.

## Milestone successiva

Do not start Milestone G automatically. The expected next milestone is Referee Mobile migration after explicit approval.
