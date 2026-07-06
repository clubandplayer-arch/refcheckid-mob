# RefCheckID — Review Checklist

> Wave 1 e Wave 2 approvate dopo review tecnica. Tutti i punti verificati risultano completati.

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
