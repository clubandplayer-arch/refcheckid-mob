# RefCheckID — Wave 2 Report

## Wave 2 — Sessione, autenticazione, autorizzazione e routing protetto

### Stato review

- **Review finale:** APPROVATA
- **Feature Parity stimata:** 98–99%
- **Esito:** Wave 2 completata, verificata e approvata.

## Riepilogo della Wave 2

La Wave 2 ha introdotto nel client Mobile il layer di sessione, autenticazione, autorizzazione e routing protetto equivalente alla Source of Truth Web, mantenendo l'architettura Mobile e senza anticipare funzionalità di dominio appartenenti alle Wave successive.

Funzionalità approvate:

- modello `AppRole` / `AppSession` equivalente al Web;
- persistenza sessione con semantica `refcheckid.session`;
- lettura sessione all'avvio;
- validazione minima della sessione;
- login tramite `POST /auth/login`;
- refresh tramite `POST /auth/refresh`;
- logout remoto tramite `POST /auth/logout` e logout locale sicuro;
- redirect per ruolo:
  - `manager` -> `/manager`;
  - `referee` -> `/referee`;
  - `federation` -> `/federation`;
- guardia delle aree protette equivalente ad `AuthGate`;
- stato di verifica sessione `Verifica sessione…`;
- barra utente e azione logout nelle aree protette;
- entrypoint pubblico session-aware con redirect automatico per utenti già autenticati.

## File Web analizzati

Source of Truth Web consultata in sola lettura:

- `source-of-truth/refcheckid/refcheckid-web/src/lib/session.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/lib/auth-client.ts`
- `source-of-truth/refcheckid/refcheckid-web/src/components/auth/auth-gate.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/features/manager/login-form.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/app/page.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/app/manager/page.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/app/referee/page.tsx`
- `source-of-truth/refcheckid/refcheckid-web/src/app/federation/page.tsx`

## File Mobile modificati

- `src/lib/session.tsx`
- `src/lib/auth-client.ts`
- `src/components/auth/auth-gate.tsx`
- `src/features/auth/login-form.tsx`
- `src/providers.tsx`
- `src/types/shims.d.ts`
- `app/index.tsx`
- `app/manager/index.tsx`
- `app/referee/index.tsx`
- `app/federation/index.tsx`

## Annotazioni tecniche approvate durante la review

1. **Storage adapter con fallback in memoria**  
   La persistenza sessione Mobile usa un adapter compatibile con l'ambiente corrente e fallback in memoria. Miglioramento futuro approvato: sostituzione/integrazione con `AsyncStorage` o `SecureStore` quando previsto dall'architettura e dalle dipendenze.

2. **Logging diagnostico non replicato sul Mobile**  
   Il logging diagnostico presente nel Web non è stato replicato perché non influisce sulla Feature Parity funzionale della Wave 2.

3. **Redirect adattati a Expo Router**  
   I redirect Web basati su router Next.js sono stati adattati al Mobile tramite `Redirect` di Expo Router, mantenendo la stessa semantica di protezione e instradamento per ruolo.

4. **Validazione LoginForm senza react-hook-form/zod**  
   La validazione del `LoginForm` è stata implementata senza `react-hook-form` e `zod`, mantenendo comportamento equivalente e senza introdurre nuove dipendenze.

5. **Ordine dei provider differente ma equivalente**  
   L'ordine dei provider Mobile differisce dal Web per adattamento architetturale, ma il comportamento risultante è funzionalmente equivalente per la Wave 2.

## Differenze residue approvate

- Persistenza Mobile con fallback in memoria in assenza di storage nativo dedicato.
- Assenza di logging diagnostico Web-only sul Mobile.
- Validazione form implementata con stato React locale anziché stack Web `react-hook-form` / `zod`.
- Route protette di ruolo presenti come contenitori protetti, senza implementare dashboard o workflow delle Wave successive.

## Rischi e follow-up

- Valutare `AsyncStorage` o `SecureStore` in una Wave futura o fase di hardening per persistenza sessione nativa e più robusta.
- Aggiungere test automatici dedicati ad auth/session/routing quando l'ambiente test sarà completo.
- Mantenere le route protette come baseline per le Wave successive senza introdurre logiche di dominio fuori roadmap.

## Conclusione

La Wave 2 è **APPROVATA**. La Feature Parity rispetto alla Source of Truth Web è stimata al **98–99%**; le differenze residue sono state valutate e approvate come adattamenti Mobile non bloccanti.
