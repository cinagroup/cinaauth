# CinaSeek Admin confidential OIDC client

`admin.cinaseek.ai` is a separate, confidential OIDC relying party. It does not
collect a CinaSeek password and it does not persist OAuth tokens in browser
storage. Authentication remains owned by `accounts.cinaseek.ai`, issuance and
role policy remain owned by `auth.cinaseek.ai`, and the Admin Console keeps its
independent deployment and session boundary.

## Fixed client contract

| Field | Value |
| --- | --- |
| Client ID | `cinaseek-admin-console` |
| Issuer | `https://auth.cinaseek.ai` |
| Redirect URI | `https://admin.cinaseek.ai/api/auth/oidc/callback` |
| Post-logout URI | `https://admin.cinaseek.ai/login` |
| Grant | `authorization_code` |
| Client authentication | `client_secret_basic` |
| PKCE | required, `S256` |
| Scopes | `openid profile email` |
| Access-token resource | `https://admin.cinaseek.ai` |
| ID/access-token signing | `ES256` |

The Auth Worker reconciles this exact client immediately before resolving its
authorization request. Only a SHA-256 base64url hash of the client secret is
stored in PostgreSQL. Redirect URIs, grant types, authentication method, and
PKCE policy are not accepted from browser input.

## Runtime flow

1. `/login` links to the Admin BFF start route.
2. The BFF creates `state`, `nonce`, and a PKCE verifier. The signed transaction
   is held for ten minutes in a `Secure`, `HttpOnly`, `SameSite=Lax`, `__Host-`
   cookie.
3. The browser is redirected to the discovered authorization endpoint. If
   authentication is required, CinaAuth sends the user to
   `accounts.cinaseek.ai` with its signed authorization request intact.
4. The callback validates state, exchanges the code with
   `client_secret_basic` and PKCE, validates issuer/audience/expiry/nonce, then
   explicitly validates the ID-token ES256 signature and UserInfo `sub`.
5. The access token has `aud=https://admin.cinaseek.ai` and
   `azp=cinaseek-admin-console`. It is sent only over the `AUTH_WORKER` Service
   Binding to the private session bridge; it is never returned to browser code.
6. The Auth Worker verifies the JWT from its local PostgreSQL JWKS records,
   checks `openid`, re-reads the current user, rejects banned or non-admin users,
   and creates the normal CinaAuth session. The bridge is also protected by a
   separate shared secret and a Durable Object rate limit of 10 requests/minute.
7. The Admin BFF checks the bridge subject and allowed role, re-scopes the
   resulting session cookies to the Admin host, destroys the OIDC transaction,
   and redirects only to a validated relative path.

## Recent authentication and step-up

High-impact mutations require authentication within the last five minutes.
When an Admin BFF receives `403 SESSION_NOT_FRESH`, the browser starts a new
OIDC transaction with `mode=step-up`, preserving only the current same-origin
path and query string as the return destination.

The step-up authorization request includes `prompt=login` and `max_age=300`.
The callback requires a validated integer `auth_time` claim which is not older
than the step-up transaction, is not in the future, and is no more than five
minutes old. A successful callback creates a five-minute, subject-bound HMAC
proof in the `Secure`, `HttpOnly`, `SameSite=Strict`
`__Host-cinaadmin_recent_auth` cookie. Missing or invalid `auth_time` fails
closed and no recent-authentication proof is issued.

The callback also sends the validated `auth_time` over the private Service
Binding bridge. The Auth Worker uses it as the Admin session's security clock;
missing, malformed, epoch, or future values deliberately become stale. This
keeps direct Auth API calls subject to the same recent-authentication policy as
Admin BFF calls. Stopping an impersonation session is intentionally exempt so
an administrator always has an escape path.

Existing Admin APIs continue to verify the signed session through the Auth
Worker and enforce `super_admin` or `security_admin` on every privileged route.
The middleware cookie-presence check remains an optimization, not the role
authorization decision.

## Required secrets

Create three distinct random values of at least 32 characters:

- `CINAADMIN_OIDC_CLIENT_SECRET`: same value in Auth Worker and Admin Worker.
- `CINAADMIN_OIDC_BRIDGE_SECRET`: same value in Auth Worker and Admin Worker.
- `CINAADMIN_OIDC_TRANSACTION_SECRET`: Admin Worker only.

Secrets are read from environment variables and written with Wrangler stdin;
they must not be placed in `wrangler.jsonc`, Git, command arguments, or logs.
The Auth deployment uses `workers/auth-api/scripts/provision-secrets.mjs`; the
Admin deployment uses `apps/admin-console/scripts/provision-secrets.mjs`.

## Acceptance

After both Workers have the matching secrets and are deployed:

1. Open `https://admin.cinaseek.ai/login` and confirm there are no local email
   or password fields.
2. Continue with CinaSeek and verify the browser reaches
   `accounts.cinaseek.ai` when authentication is required.
3. Inspect the authorization request: client ID, exact redirect URI, state,
   nonce, and `code_challenge_method=S256` must be present.
4. Sign in as `super_admin` or `security_admin`; callback must land on the
   requested Admin path and `/api/admin/session` must return the same subject and
   role.
5. Sign in as a normal `user`; callback must return to `/login` with the generic
   unauthorized-admin message and must not set a session token.
6. Tamper with state or the transaction cookie; callback must fail closed and
   clear the transaction.
7. Confirm OAuth access/ID tokens do not appear in URLs, localStorage,
   sessionStorage, readable cookies, or browser responses.
8. Let the five-minute window expire, invoke a protected mutation, and verify
   `403 SESSION_NOT_FRESH` starts a step-up request containing
   `prompt=login&max_age=300`, then returns to the original Admin path after a
   fresh login.
9. Verify the step-up ID Token contains a current `auth_time`; remove, age, or
   move that claim into the future in an integration fixture and confirm the
   callback fails with `recent_auth_required` without setting the recent-auth
   cookie.
10. Call a protected Auth Worker Admin mutation with an ordinary session whose
    bridged ID Token omitted `auth_time`; it must fail with
    `403 SESSION_NOT_FRESH`, while read-only Admin APIs remain available.
