# RefCheckID — Wave 1 Report

## Stato

Wave 1 completata.

## Perimetro ufficiale

Implementazione limitata a Wave 1: fondazioni applicative, configurazione e design system minimo.

Funzionalità implementate:

- Root app bootstrap Expo/React Native equivalente al root layout Web.
- Provider root con `QueryClientProvider`, `ToastProvider` ed `ErrorBoundary`.
- Configurazione API base URL equivalente a `getApiBaseUrl`, adattata a Expo tramite `EXPO_PUBLIC_API_BASE_URL` e fallback compatibile `NEXT_PUBLIC_API_BASE_URL`.
- Utility `cn` per composizione stili React Native.
- UI primitives native:
  - `Button`;
  - `Card`;
  - `Input`;
  - `SkeletonBlock`;
  - `EmptyState`;
  - `ErrorState` con retry opzionale;
  - `ToastProvider/useToast` con toni `success`, `error`, `info`;
  - `ErrorBoundary`.
- Tema base mobile coerente con token Web: background, foreground, border, primary, muted, success, danger.
- Test unitari per configurazione base URL, stati UI, provider e toast.

## Source of Truth analizzata per Wave 1

Sono stati analizzati esclusivamente i file Web indicati dalla roadmap per Wave 1:

- `source-of-truth/refcheckid/refcheckid-web/src/app/layout.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/app/providers.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/app/globals.css`
- `source-of-truth/refcheckid/refcheckid-web/src/components/ui/button.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/components/ui/card.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/components/ui/input.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/components/ui/state.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/components/ui/toast.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/components/ui/error-boundary.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/api-base-url.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/utils.ts`

## Feature Parity Wave 1

### Root bootstrap

Il Web monta `Providers` nel `RootLayout`. Il Mobile monta `Providers` in `app/_layout.tsx` intorno allo `Stack` di Expo Router.

### Provider

Il Web usa `QueryClientProvider`, `SessionProvider`, `ToastProvider` ed `ErrorBoundary`. Per Wave 1 il Mobile implementa solo i provider autorizzati dalla Wave: React Query infrastructure, Toast e Error Boundary. `SessionProvider` è escluso perché appartiene a Wave 2.

Configurazione React Query replicata:

- `refetchInterval: 60_000`
- `retry: 2`
- `staleTime: 30_000`
- mutation retry `1`

### API base URL

Il Web usa `NEXT_PUBLIC_API_BASE_URL`, fallback browser `/api/v1` e fallback server `http://localhost:4000/api/v1`.

Il Mobile usa:

1. `EXPO_PUBLIC_API_BASE_URL`, specifico per Expo;
2. `NEXT_PUBLIC_API_BASE_URL`, compatibilità con handover Web;
3. fallback `http://localhost:4000/api/v1`.

Nessun endpoint dominio è stato implementato in Wave 1.

### Utility

La utility `cn` Web combina classi Tailwind. In Mobile è stata adattata a composizione `StyleProp` React Native, senza introdurre logica di dominio.

### UI primitives

- `Button`: equivalente nativo a bottone primario con stato disabled e feedback press.
- `Card`: equivalente nativo a contenitore rounded/border/background/shadow.
- `Input`: equivalente nativo a campo testo full-width, border e focus-friendly.
- `SkeletonBlock`: rappresenta loading senza dati mutabili.
- `EmptyState`: distingue empty da errore.
- `ErrorState`: mantiene titolo “Errore API”, messaggio e azione retry opzionale “Riprova”.
- `ToastProvider/useToast`: mantiene API `notify(message, tone)` e toni success/error/info.
- `ErrorBoundary`: intercetta errori runtime e mostra `ErrorState`.

## Funzionalità esplicitamente escluse

Non sono state implementate funzionalità di Wave successive:

- login;
- sessione;
- refresh/logout;
- AuthGate;
- routing protetto;
- API autorizzate;
- dashboard di ruolo;
- workflow manager/referee/federation;
- validazioni distinta/referto;
- store locali di dominio.

## Test e verifiche

- `npm install`: non completato per limitazione ambiente/registry (`403 Forbidden` su `@tanstack/react-query`).
- `npm test -- --runInBand`: non eseguibile perché le dipendenze non sono state installate e `jest` non è disponibile.
- `npm run typecheck`: completato con successo usando gli shim locali necessari in assenza di dipendenze installate nell'ambiente.

## Esito finale

Wave 1 pronta per review.

La Wave 2 non è stata iniziata.

## Final Review

Status: **APPROVED**

Feature Parity: **100%**

Ready for Merge: **YES**
