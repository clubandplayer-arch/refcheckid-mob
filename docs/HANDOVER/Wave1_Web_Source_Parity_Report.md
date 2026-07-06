# Wave 1 — Direct Web Source Feature-Parity Report

## Requested Source of Truth

The requested Source of Truth for this pass is the local Web project at:

```text
web-reference/refcheckid/refcheckid-web
```

The mobile handover package is not used as the Source of Truth for this report.

## Direct workspace verification

I attempted to inspect the requested local Web Source of Truth with:

```sh
find web-reference/refcheckid/refcheckid-web -maxdepth 3 -type f
```

Actual result in this execution environment:

```text
find: ‘web-reference/refcheckid/refcheckid-web’: No such file or directory
```

I also checked whether the Source of Truth existed elsewhere in the workspace:

```sh
find /workspace -path '*refcheckid-web*' -type d -print
```

Actual result: no matching directory was found.

Finally, I checked the submodule state and attempted initialization:

```sh
git submodule status
git submodule update --init --recursive
```

Actual result: the submodule is not checked out and cannot be cloned in this environment because the remote access fails with `CONNECT tunnel failed, response 403`.

## Constraint

Because `web-reference/refcheckid/refcheckid-web` is not present in this execution environment and cannot be fetched by the available network path, I cannot truthfully complete the requested direct code comparison against the Web Source of Truth.

No Web Source-of-Truth files were modified.

No functional mobile changes were made in this pass, because applying fixes without the direct Web source would risk changing the client based on assumptions rather than verified parity evidence.

## Required Web files for the next pass

Once the Web project is present locally, the comparison must inspect at least these Web areas/files:

| Wave 1 area | Web files to inspect once available |
|---|---|
| Bootstrap | `src/app/layout.tsx`, provider entry points under `src/app` / `src/components` |
| Navigation | App Router pages under `src/app`, role route pages |
| Theme | global styles/theme files and shared UI components |
| Query Client | Web providers mounting `QueryClientProvider` |
| Session Provider | Web session context/provider files |
| Auth Provider | Web auth context/provider files, if separate from session provider |
| API Client | `src/lib/api-client.ts` |
| Login | `src/app/page.tsx` and login form component(s) |
| Refresh Token | `src/lib/auth-client.ts`, `src/lib/api-client.ts` |
| Logout | auth client/logout handling and `AuthGate` logout action |
| Routing | role redirect mapping and App Router destinations |
| AuthGuard | Web `AuthGate` implementation |
| Error Boundary | shared `ErrorBoundary` component |
| Toast | shared `ToastProvider` / toast hook implementation |
| Loading State | skeleton/loading components and protected-route loading states |
| Empty State | shared `EmptyState` component and usage |

## Feature parity matrix

The statuses below are conservative and represent a **direct verification gap**. They are not confirmed implementation defects in the mobile client.

| Wave 1 area | Status | Reason |
|---|---:|---|
| Bootstrap | ✗ Gap funzionale | Direct comparison with Web source is blocked because the requested path is absent. |
| Navigation | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Theme | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Query Client | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Session Provider | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Auth Provider | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| API Client | ✗ Gap funzionale | Direct comparison with Web `api-client.ts` is blocked, including exact `401`/refresh behavior. |
| Login | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Refresh Token | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Logout | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Routing | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| AuthGuard | ✗ Gap funzionale | Direct comparison with Web `AuthGate` source is blocked. |
| Error Boundary | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Toast | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Loading State | ✗ Gap funzionale | Direct comparison with Web source is blocked. |
| Empty State | ✗ Gap funzionale | Direct comparison with Web source is blocked. |

## Feature parity percentage

**0% verified against direct Web Source-of-Truth code.**

This percentage reflects verification status only. It does not assert that every mobile implementation is wrong; it asserts that none of the requested Wave 1 items can be certified as `✓ Identico` or `⚠ Differenze minori` until the Web source files are actually readable in this workspace.

## Final status

Wave 1 cannot be declared completed in this pass because the required direct comparison with `web-reference/refcheckid/refcheckid-web` could not be executed.
