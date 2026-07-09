# Audit differenziale login Mobile dopo P0

Data: 2026-07-09

## Commit confrontati

- Ultimo commit pre-P0 individuato: `2c97b16 fix: align React dependency tree`.
- Commit attuale analizzato: `f069996 Introduce MobileScreen shell and apply to manager/referee pages; add steppers and harden recognition/flow logic`.

Comando usato:

```bash
git diff --stat 2c97b16..HEAD
git diff --name-only 2c97b16..HEAD
```

## Risultato del diff

Tra il commit pre-P0 e il commit P0 sono cambiati solo questi file:

- `app/manager/index.tsx`
- `app/manager/match-sheet.tsx`
- `app/referee/index.tsx`
- `app/referee/match.tsx`
- `docs/audits/mobile-web-workflow-audit-2026-07-09.md`
- `src/components/ui/mobile-screen.tsx`
- `src/features/manager/match-sheet-workflow.tsx`
- `src/features/referee/referee-match-workflow.tsx`
- `src/types/shims.d.ts`

## File login/provider controllati

Il diff pre-P0 -> P0 non contiene modifiche in:

- `src/lib/api-base-url.ts`
- `src/lib/auth-client.ts`
- `src/features/auth/login-form.tsx`
- `app/_layout.tsx`
- `app/index.tsx`
- `src/providers.tsx`
- `src/lib/session.tsx`

Quindi la P0 non ha cambiato direttamente:

- costruzione dell'URL API;
- endpoint `/auth/login`;
- payload di login;
- gestione della sessione;
- provider globali;
- schermata login;
- layout root;
- variabili ambiente.

## Verifica indiretta su MobileScreen

`MobileScreen` è stato applicato a dashboard e workflow manager/referee, ma non a `app/index.tsx`, che continua a renderizzare il `LoginForm` nel proprio `View` root.

Conclusione: la nuova shell P0 non avvolge il login e non dovrebbe avere effetti collaterali sul submit del form di login.

## Verifica credenziali backend

La Source of Truth backend contiene l'account:

- email: `dirigente@refcheckid.local`
- password: `Password123!`
- ruolo: `manager`
- enabled: `true`

Il backend normalizza l'email a lowercase e confronta la password esatta. Se utente, password e stato enabled sono validi, ritorna una sessione `200`.

## Diagnostica aggiunta temporaneamente

È stata aggiunta diagnostica temporanea in `src/lib/auth-client.ts`, senza cambiare la logica, per stampare:

- URL completo della POST `/auth/login`;
- payload sicuro: email e lunghezza password, senza stampare la password;
- status HTTP della risposta;
- body della risposta;
- eccezione fetch in caso di errore rete/CORS.

Log attesi:

```text
[RefCheckID][auth] login request { url, payload: { email, passwordLength } }
[RefCheckID][auth] login response { url, status, body }
[RefCheckID][auth] login fetch exception { url, error }
```

## Ipotesi da confermare con i log

Dato che la P0 non modifica i file del login, la causa più probabile va confermata dal log runtime:

1. URL errato/non raggiungibile, per esempio fallback Mobile a `http://localhost:4000/api/v1` su dispositivo fisico.
2. Backend non in ascolto sull'host/porta chiamati dall'app.
3. Risposta HTTP non-200 dal backend con body diagnostico (`USER_NOT_FOUND`, `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`).
4. Eccezione fetch/network invece di risposta HTTP.

## Evidenza attesa per distinguere Mobile vs backend

- Se compare `login fetch exception`, il backend non è stato raggiunto dal Mobile.
- Se compare `login response` con `status: 401`, il backend è stato raggiunto e il body indica il motivo applicativo.
- Se compare `login response` con `status: 200`, il login backend riesce e l'errore è dopo la sessione/navigazione.
