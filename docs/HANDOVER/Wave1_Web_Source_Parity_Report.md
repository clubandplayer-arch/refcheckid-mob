# Wave 1 — Web Source Feature-Parity Report

## Requested Source of Truth

The requested Source of Truth for this pass is the local Web project at:

```text
web-reference/refcheckid/refcheckid-web
```

## Source availability check

I attempted to inspect the local Web Source of Truth with:

```sh
find web-reference/refcheckid/refcheckid-web -maxdepth 3 -type f
```

Result: the path does not exist in the current workspace.

I also checked the submodule state and attempted initialization:

```sh
git submodule status
git submodule update --init --recursive
```

Result: the submodule is not checked out and cannot be cloned in this environment because the remote access fails with `CONNECT tunnel failed, response 403`.

## Constraint

Because the Web Source of Truth is not present locally and cannot be fetched by this environment, I cannot truthfully mark the Wave 1 mobile implementation as fully verified against direct Web source code.

No Web files were modified.

## Feature parity matrix

The statuses below are intentionally conservative: each item is marked as a gap in **verification**, not necessarily a confirmed implementation gap, because direct Web comparison is blocked.

| Wave 1 area | Status | Reason |
|---|---:|---|
| Bootstrap | ✗ Gap funzionale | Direct comparison with Web bootstrap files is blocked because `web-reference/refcheckid/refcheckid-web` is absent. |
| Navigation | ✗ Gap funzionale | Direct comparison with Web routing/navigation source is blocked. |
| Query client | ✗ Gap funzionale | Direct comparison with Web provider/query configuration is blocked. |
| Auth provider | ✗ Gap funzionale | Direct comparison with Web auth provider/source is blocked. |
| Session provider | ✗ Gap funzionale | Direct comparison with Web session provider/source is blocked. |
| API client | ✗ Gap funzionale | Direct comparison with Web `api-client.ts` is blocked, including exact `401`/refresh behavior. |
| Refresh token | ✗ Gap funzionale | Direct comparison with Web refresh flow is blocked. |
| Login | ✗ Gap funzionale | Direct comparison with Web login page/form behavior is blocked. |
| Logout | ✗ Gap funzionale | Direct comparison with Web logout behavior is blocked. |
| Auth guard | ✗ Gap funzionale | Direct comparison with Web `AuthGate` behavior is blocked. |
| Error boundary | ✗ Gap funzionale | Direct comparison with Web error boundary behavior is blocked. |
| Toast | ✗ Gap funzionale | Direct comparison with Web toast behavior is blocked. |
| Loading | ✗ Gap funzionale | Direct comparison with Web loading/skeleton behavior is blocked. |
| Empty state | ✗ Gap funzionale | Direct comparison with Web empty state behavior is blocked. |

## Feature parity percentage

**0% verified against the direct Web Source of Truth.**

This is not a statement that the mobile implementation is entirely wrong; it is a statement that none of the requested Wave 1 areas can be certified against the direct Web source while the required local project path is missing.

## Required next step

Provide or checkout the Web Source of Truth at:

```text
web-reference/refcheckid/refcheckid-web
```

Once that path exists locally, the Wave 1 comparison must be re-run against the actual Web files. Only then can individual items be marked as `✓ Identico`, `⚠ Differenze minori`, or `✗ Gap funzionale` based on source-level evidence.
