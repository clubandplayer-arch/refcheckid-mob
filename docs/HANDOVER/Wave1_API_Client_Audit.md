# Wave 1 — API Client Audit

## Scope

This audit covers `src/api/client.ts` for Wave 1 mobile foundation parity around authentication/bootstrap behavior:

- automatic token refresh;
- `401` responses;
- request retry after refresh;
- logout/session clear when refresh fails;
- API error messages;
- backend error-response parsing.

## Source of Truth availability

The expected Web files are referenced by `docs/HANDOVER/Mobile_Handover_Package.md`, especially `refcheckid-web/src/lib/api-client.ts` and `refcheckid-web/src/lib/auth-client.ts`.

Direct source inspection was attempted with:

```sh
git submodule update --init --recursive
```

The command failed because the environment cannot access the Web submodule remote (`CONNECT tunnel failed, response 403`). Because of that limitation, this audit uses the handover package as the available Source-of-Truth extract and does not modify the Web project.

## Handover rules used for parity

The handover states that every API call goes through `request`, which resolves a valid session, refreshes it if expired, and adds `Authorization: Bearer <accessToken>`.

The handover also states these common API exceptions:

- every non-OK response throws `API request failed with status <status>`;
- `204` returns `undefined`;
- UI surfaces query errors with retry where a `useQuery` exists.

## Mobile behavior verified

### Automatic refresh before request

`src/api/client.ts` calls `resolveSession()` before executing the fetch. If a session exists and `expiresAt` is expired, it calls `refreshSession(session.refreshToken)`, stores the refreshed session, and uses the refreshed access token for the request.

Status: **aligned with the handover**.

### `401` response handling

The available handover text does **not** describe refresh-on-`401` or retry-after-`401`. It says every non-OK response throws the generic status error. Therefore the mobile client intentionally treats `401` as a non-OK response and throws `API request failed with status 401` without retrying the original request.

Status: **aligned with the available handover extract**. If direct Web source later shows that Web retries after `401`, the mobile client must be updated to match Web.

### Retry after refresh

The available handover text describes refresh **before** the request when the stored session is expired. It does not describe retrying the same request after a `401` response. The current mobile behavior performs one request after resolving a valid session; it does not issue a second request on `401`.

Status: **aligned with the available handover extract**.

### Clear session when refresh fails

If pre-request refresh fails, `resolveSession()` calls `clearSession()` and rethrows the refresh error. This matches the handover rule that refresh failure removes the session and returns the user to login through the auth guard/session state.

Status: **aligned with the handover**.

### API error messages

For non-OK API responses, the mobile API client throws `API request failed with status <status>`. This mirrors the handover exception rule.

Status: **aligned with the handover**.

### Backend error-response parsing

The generic API client does not parse backend error bodies for normal API requests; it preserves the generic status message required by the handover. Auth requests are different: `src/auth/auth-client.ts` parses JSON so login/refresh can surface a backend `message` where present, while still falling back to the generic status error.

Status: **aligned with the handover**.

## Residual risk

Direct Web Source-of-Truth verification remains blocked until the submodule can be cloned. The only unresolved parity risk is whether the actual Web `api-client.ts` contains refresh-on-`401` behavior not represented in the handover package. No mobile code change was made for `401` retry because the available Source-of-Truth extract says every non-OK response throws the generic status error.
