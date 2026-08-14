# CinaAuth Cloudflare production deployment

This Worker serves `https://auth.cinaseek.ai` with three production primitives:

- Cloudflare Hyperdrive connects CinaAuth to PostgreSQL.
- `RateLimitDurableObject` provides 256 deterministic SQLite-backed shards.
- CinaAuth `rateLimit.customStorage.consume()` applies the atomic limiter to
  every client request, with `/sign-in/*` fixed at 5 attempts per 60 seconds.
- A Worker queue lock plus a transaction-local PostgreSQL trigger protects
  every route that can remove a `super_admin` role.
- A dedicated Queue generates large privacy exports into a private R2 bucket;
  every manifest and data object uses a derived 32-byte SSE-C key and expires.

The Worker also retains the delivery Queue/DLQ, signed HTTPS delivery webhook,
protected database migration endpoints, version metadata, structured logs, and
scheduled session/audit retention. The existing `cinaauth-db` D1 database stays
bound as `LEGACY_D1` for read-only rollback and the one-time PostgreSQL cutover.

## Impersonated-session mutation boundary

The Auth Worker treats an authoritative session with a non-empty
`session.impersonatedBy` as read-only before dispatching any `/api/auth/*`
plugin route. `POST`, `PUT`, `PATCH`, and `DELETE` are denied by default, as are
the explicit GET/HEAD callbacks that consume verification state, create login
sessions, issue credentials, or delete an account. The response is a no-store
`403` with code `IMPERSONATION_NOT_ALLOWED`.

Exact recovery routes remain available: `admin/stop-impersonating`, `sign-out`,
OIDC `oauth2/end-session`, and SAML single logout. Session introspection and a
small reviewed set of read-only POST queries also remain available. A new POST
endpoint is therefore fail-closed for impersonated sessions until its read-only
contract is added to the explicit exception set. Anonymous traffic and ordinary
sessions continue to the existing CinaAuth endpoint contract unchanged.

Every denial emits a secret-free structured Worker warning containing the
original administrator ID, target user ID, method, and canonical path. When
`CINAUTH_ADMIN_SERVICE_KEY` is configured, the Worker also attempts a durable
`admin.impersonation_mutation_rejected` failure audit through the audit plugin.
An audit-write failure is logged but never permits the rejected mutation.

## Prerequisites

- Node.js 22+ and pnpm 11+
- Wrangler 4.x authenticated to the target Cloudflare account
- an active `cinaseek.ai` zone
- a PostgreSQL database reachable by Cloudflare Hyperdrive
- `cinaauth-delivery` and `cinaauth-delivery-dlq` Queues
- permission to manage R2 and Queues for privacy-export provisioning

Never put a PostgreSQL URI, password, API token, or Worker secret in
`wrangler.json`, a tracked file, or a CLI argument.

## SIWE rollout controls

Production and staging are separate identity environments. Before creating any
named staging environment or enabling SIWE, follow the complete isolation and
real-wallet acceptance contract in
[`docs/SIWE_STAGING.md`](../../docs/SIWE_STAGING.md). A partial `env.staging`,
placeholder binding, or fallback to a production origin/resource is invalid.

The Worker derives browser trust from the tracked, canonical origin profile:
`CINAAUTH_URL`, `CINAAUTH_ACCOUNT_ORIGIN`, `CINAAUTH_ADMIN_ORIGIN`, and
`CINAAUTH_PASSKEY_RP_ID`, plus optional `CINAAUTH_LEGACY_ACCOUNT_ORIGIN`. The
optional OIDC acceptance profile consists of all three values
`CINAAUTH_OIDC_DEMO_ENVIRONMENT`, `CINAAUTH_OIDC_DEMO_ORIGIN`, and
`CINAAUTH_OIDC_DEMO_CLIENT_ID`; provide all three or omit all three to disable
that client. Its issuer and Accounts origin come from the same validated Auth
profile, and production/staging mixtures fail closed. Every configured origin
is an exact HTTPS origin without credentials, port, path, query, fragment,
wildcard, or trailing slash. Missing required values and malformed optional
values fail closed. Omitting an optional origin disables that trust
relationship. The production Passkey RP ID remains `cinaseek.ai`; changing it
would invalidate existing credentials.

SIWE is a non-secret, fail-closed rollout in `wrangler.json`.
`CINAAUTH_SIWE_ENABLED=true` is the planned Stage Two activation configuration.
This tracked state is a planned release artifact, not evidence that production
is already enabled; do not merge or deploy it until the Accounts Reown flow and
real-wallet staging suite pass. When the switch is false, the Worker does not
register the SIWE plugin and the public capability is `methods.siwe=false`;
this is a server-side kill switch, not merely a UI flag.

An enabled configuration requires all of the following exact inputs:

- a valid 32-character Reown Project ID stored as the repository GitHub
  Actions Secret `REOWN_PROJECT_ID` (the reusable Accounts workflow
  passes it to the public build as `NEXT_PUBLIC_REOWN_PROJECT_ID`);
- `CINAAUTH_SIWE_ENABLED=true`;
- a canonical comma-separated `CINAAUTH_SIWE_ALLOWED_CHAIN_IDS` allowlist;
- `CINAAUTH_SIWE_RP_DOMAIN=accounts.cinaseek.ai`;
- `CINAAUTH_SIWE_RP_URI=https://accounts.cinaseek.ai`;
- `CINAAUTH_SIWE_ALLOW_LEGACY=false`;
- `CINAAUTH_SIWE_AUTO_SIGNUP=false`.

Missing, malformed, duplicated, non-HTTPS, cross-host, legacy, or auto-signup
values keep SIWE disabled. The enabled production rollout is EOA-only, accepts
only a 65-byte EIP-191 personal-sign signature, and uses the Worker-side chain
allowlist.
Unknown wallets cannot create users. The v2 challenge path binds the RP,
wallet, chain, purpose, and expiry; legacy nonce issuance remains disabled.
Change the enable switch only through a reviewed deployment after running the
local production gate, the remote capability parity check, and browser tests
against the Accounts origin.

The Worker also enforces a raw request-body boundary before dispatching SIWE
routes. `challenge` accepts at most 18 KiB so a maximum 16 KiB signed
`oauth_query` plus its JSON, wallet address, chain, and purpose envelope reaches
the endpoint parser. Legacy `nonce` and `get-nonce` requests remain capped at
2 KiB; `verify` and `link-wallet` remain capped at 20 KiB. The middleware counts
UTF-8 bytes from the actual request stream even when `Content-Length` is
missing, chunked, or forged. An oversized body receives a no-store `413` with
code `REQUEST_BODY_TOO_LARGE`; accepted bodies remain available to CinaAuth's
endpoint parser unchanged.

The central production workflow runs an Account Portal preflight after the
restore/backup authorization and before any Cloudflare deployment. The
preflight reads the planned `CINAAUTH_SIWE_ENABLED` value directly from the
tracked Auth Worker `wrangler.json`; an enabled rollout requires an exact
32-hex-character `REOWN_PROJECT_ID`, then must pass the Accounts typecheck,
contract tests, and full Cloudflare bundle build before the Auth Worker can be
published. A disabled rollout does not require a Project ID. The later reusable
Accounts job repeats the live capability parity check, performs the single
Accounts deployment after Auth readiness, and then verifies the deployed
no-store marker. That post-deploy check requires the marker schema, readiness,
protocol, wallet UI implementation, tracked wallet UI flag, and exact Project
ID to agree without printing the Project ID.

Enabling SIWE requires two separate production runs. First, keep the Worker
switch false, configure the production `REOWN_PROJECT_ID`, and deploy the
Account Portal. The build derives `NEXT_PUBLIC_SIWE_WALLET_UI_ENABLED` from the
tracked Worker switch, so this first-phase bundle contains the v2 integration
but keeps every wallet sign-in and linking entry point hidden even if an older
live Worker still advertises SIWE. Its public `GET /api/build-readiness`
response is no-store and identifies `cinaauth-siwe-v2`, `reown-appkit-v1`, the
disabled wallet UI state, and the exact Project ID compiled into the online
bundle. A false rollout may omit the Project ID, but that deployment is not
ready for the enable phase. In a later reviewed run, change only the tracked
Worker switch to true; the same derivation enables the rebuilt wallet UI.
Before any Cloudflare write, the
preflight requires the online marker, its no-store contract, and an exact match
with the current repository Actions secret. A missing marker, an unready
marker, an ID mismatch, or a first same-run enable attempt fails closed. This
prevents a new Worker from disabling legacy nonce behavior while an old Portal
is still online, even if the later Portal deployment would fail.

If Auth reaches the enabled version but the Accounts deployment or its marker
parity check fails, immediately roll Auth back to the recorded pre-enable
version and confirm that the public capability returns `methods.siwe=false`.
The phase-one Portal then remains fail-closed because its compiled wallet UI
flag is false. A Cloudflare Worker rollback does not restore PostgreSQL or
change connected resources, so do not substitute it for the attested database
restore procedure. The Stage Two change must remain switch-only; if unrelated
migrations are present, stop and review their recovery plan separately.

The Project ID is a public client identifier, not an authentication secret.
Configure `https://accounts.cinaseek.ai` as an allowed Reown origin. The
Accounts deployment gate refuses to build a production UI when the live Auth
Worker advertises SIWE without a valid Project ID.

## 1. Create or select Hyperdrive

Create the Hyperdrive resource in the Cloudflare dashboard under
**Storage & databases > Postgres & MySQL (Hyperdrive)**. Enter the PostgreSQL
origin credentials only in Cloudflare. Record the resulting 32-character
Hyperdrive ID; the ID is not a database credential.

Use a dedicated `cinaauth-pg` PostgreSQL database and role. Do not reuse the
`cinashop-pg` Hyperdrive binding or put auth tables in the CinaShop database.
Disable Hyperdrive query caching for this configuration: authentication,
sessions, revocations, permissions, and read-after-write flows require current
data. Connection pooling and accelerated connection setup remain enabled.

The Worker uses the same PostgreSQL origin as the coordination authority for
last-`super_admin` governance. A deployment queue transaction serializes
`admin/set-role`, `admin/update-user`, `admin/remove-user`, `delete-user`, the
actual `delete-user/callback` sink, `delete-anonymous-user`, and SCIM user
DELETE. A separate versioned trigger then takes a different advisory lock and
checks the final invariant in the same transaction and connection as the
actual `user` mutation. The distinct keys avoid an A/B-connection deadlock;
the trigger remains authoritative if the outer queue connection is lost.
Ordinary requests and `admin/stop-impersonating` do not wait on either lock.

The trigger is designed for the production single-user sinks above. Do not use
ad hoc multi-row `UPDATE`, `DELETE`, `TRUNCATE`, disabled triggers, or direct
role writes as an administrator-management API. Promote a replacement exact
`super_admin` in one committed request before demoting or deleting the old one.
Missing Hyperdrive, invariant readiness, lock acquisition, valid role-count
state, or database access returns `503 ADMIN_GOVERNANCE_UNAVAILABLE` before the
Worker invokes a protected handler. A database-trigger rejection rolls back
the actual mutation even if the outer connection failed after dispatch.

SCIM user DELETE first accepts only a plausible bounded bearer encoding, then
uses the `RATE_LIMITER` Durable Object's IP-and-route bucket (60 attempts per
minute) before opening Hyperdrive. Missing or malformed credentials continue
to the SCIM plugin's authoritative 401 path without opening the governance
database. A limiter denial returns no-store 429 with `Retry-After`; a missing
binding or RPC failure returns no-store 503. Never log the bearer value.

```powershell
pnpm --dir workers/auth-api exec wrangler hyperdrive update `
  <32-character-hyperdrive-id> --caching-disabled
```

Set the ID in the deployment environment and materialize the binding:

```powershell
$env:CINAAUTH_HYPERDRIVE_ID = "<32-character-hyperdrive-id>"
pnpm --dir workers/auth-api run configure:hyperdrive
```

The production gate rejects the all-zero placeholder. The remote preflight also
checks that the ID exists, targets PostgreSQL, and has query caching disabled.

### PostgreSQL backup expiry evidence

The production deletion policy declares PlanetScale Postgres backups and WAL
as a two-day retention exception. Keep the included production schedule at 12
hours with two-day retention. Do not protect an individual backup, add a
longer-retained manual backup, or add a longer production schedule without
updating the public deletion policy.

The 2026-08-10 control-plane review checked every backup then visible on
<!-- cspell:ignore kctytg ctwhr zlzk zenb njund oxxj -->
`main` (`kctytg4ctwhr`, `zlzk8yfc106m`, `zenb9njund3t`, and
`9oxxj2gtq4ui`): all four had **Prevent backup deletion** disabled, under the
included 12-hour/two-day schedule. This is point-in-time UI evidence only; it
does not replace the automated audit below or prove later `deleted_at` state.

Create a PlanetScale service token with only `read_backups` access to the
`cinaauth` database, expose it to the operator process as
`PLANETSCALE_SERVICE_TOKEN_ID` and `PLANETSCALE_SERVICE_TOKEN`, then run:

```powershell
pnpm --dir workers/auth-api run check:planetscale-backups
```

The script reads the production policies and every successful `main` backup,
including deleted records. It fails if a policy exceeds two days, the included
12-hour policy is absent, a live backup is protected, or an expiry timestamp is
missing. It never prints the service token.

After a user's signed deletion-receipt deadline has passed, run the same check
with the downloaded JSON receipt:

```powershell
pnpm --dir workers/auth-api run check:planetscale-backups -- `
  --receipt C:\approved\cinaauth-deletion-receipt.json
```

The command then requires every backup started before the deletion receipt was
issued to have a PlanetScale `deleted_at` timestamp. Save the JSON output next
to the HMAC-signed CinaAuth receipt. The output is provider control-plane
evidence; it is not a provider-signed physical-media sanitization certificate.

## 2. Configure delivery queues

Authentication delivery payloads contain an email address or phone number and
a short-lived credential. Keep the primary Queue and DLQ at 24-hour retention;
Cloudflare otherwise defaults paid Queues to four days. The idempotent command
creates missing Queues and updates existing ones:

```powershell
pnpm --dir workers/auth-api run configure:delivery-queues
```

Reducing an existing Queue from four days to one day causes messages older than
the new limit to expire. Review or replay any required DLQ entries before the
first production run.

The Auth Worker reaches `cinaauth-delivery` through the
`CINAAUTH_DELIVERY_SERVICE` Service Binding. The public delivery custom domain
is retained for provider acceptance and local/legacy fallback, but production
Worker-to-Worker requests do not traverse public DNS. Auth resolves authorized
per-channel readiness before advertising Email OTP, Magic Link, or Phone OTP.
If the required provider is unavailable, the corresponding Auth endpoint
returns `503 DELIVERY_PROVIDER_UNAVAILABLE` before generating a credential or
enqueueing a message. The account portal consumes the same versioned capability
contract and does not render unavailable flows.

## 3. Create privacy export storage and queues

The idempotent command creates the APAC R2 bucket, export Queue, DLQ, 24-hour
Queue retention, and a one-day R2 lifecycle rule. The Worker also enforces the
exact `expiresAt` timestamp through status/download checks and its daily sweep.

```powershell
pnpm --dir workers/auth-api run configure:privacy-export
```

The bucket has no public domain. Object paths contain an HMAC of the subject ID,
not the raw ID or email. R2's platform encryption remains enabled and the
Worker additionally supplies a unique customer encryption key for every
manifest and data object.

## 4. Preserve stateful secrets and provision mutable inputs

Normal production deployments preserve these existing Cloudflare Worker
secrets and never source them from GitHub Actions:

- Auth Worker `CINAAUTH_SECRET`
- Auth Worker `CINAAUTH_PRIVACY_EXPORT_KEY`
- Privacy Erasure Worker `CINAAUTH_ERASURE_STORAGE_SECRET`

Before any Cloudflare write, `authorize-production` runs the metadata-only
`node scripts/check-cloudflare-preserved-secrets.mjs` gate. It uses Cloudflare's
secret inventory API to verify these names on their current Workers; it cannot
read, print, or rewrite their values. A missing name stops the rollout. Normal
`wrangler deploy` preserves secrets already attached to a Worker, as documented
in Cloudflare's [Workers secrets guide](https://developers.cloudflare.com/workers/configuration/secrets/).

Only mutable deployment-owned values are supplied to
`provision-secrets.mjs` through Wrangler bulk stdin:

- `CINAAUTH_MIGRATION_TOKEN` (at least 32 characters)
- `CINAAUTH_DELIVERY_WEBHOOK_URL`

The provisioner also writes `CINAAUTH_ERASURE_WEBHOOK_URL`, but never accepts
that endpoint from the operator environment. It is pinned in repository code to
`https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase`, preventing a
deployment-time override from redirecting signed deletion requests to another
HTTPS origin. Changing this endpoint requires a reviewed repository change.

The script validates only these mutable deployment-owned inputs and never probes the
Delivery or Privacy Erasure operational `/ready` endpoints. This is deliberate:
a structurally valid bootstrap deployment must not be blocked merely because
email/SMS providers or erasure targets have not yet been configured.
Configured optional plugin secrets are still updated only when their non-empty
environment values are explicitly supplied; omitted optional secrets are not
selected. The three preserved stateful secrets above are never selected, even
if they happen to exist in the invoking process environment.

### Active Secrets Store V2 bindings

Secrets Store V2 is active. Every configured binding is binding-first: the
runtime asynchronously calls `get()` and uses that Store value as the only
authority. If a configured binding is unavailable, throws, or returns a weak
value, the request fails closed and does not fall back to a V1 Worker secret.
A V1 value is consulted only by a legacy/local deployment in which the
corresponding V2 binding is completely absent.

All active bindings use Secrets Store
`346e2b4b86334bc29083c064116e91cf`. The production gate requires the exact
binding-to-secret mappings below, rejects duplicate binding or secret names,
and rejects any additional or incorrectly mapped entry:

| Config | Binding | Secrets Store secret name |
| --- | --- | --- |
| Auth | `CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2` | `CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2` |
| Auth | `CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2` | `CINAAUTH_ERASURE_WEBHOOK_SECRET_V2` |
| Auth | `CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2` | `CINAADMIN_OIDC_CLIENT_SECRET_V2` |
| Auth | `CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2` | `CINAADMIN_OIDC_BRIDGE_SECRET_V2` |
| Delivery | `CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2` | `CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2` |
| Delivery | `CINAAUTH_DELIVERY_CONFIG_KEK_STORE` | `CINAAUTH_DELIVERY_CONFIG_KEK_V1` |
| Privacy Erasure | `CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2` | `CINAAUTH_ERASURE_WEBHOOK_SECRET_V2` |
| Privacy Erasure | `CINAAUTH_ERASURE_CONFIG_KEK_STORE` | `CINAAUTH_ERASURE_CONFIG_KEK_V1` |
| Admin | `CINAADMIN_OIDC_CLIENT_SECRET_STORE_V2` | `CINAADMIN_OIDC_CLIENT_SECRET_V2` |
| Admin | `CINAADMIN_OIDC_BRIDGE_SECRET_STORE_V2` | `CINAADMIN_OIDC_BRIDGE_SECRET_V2` |
| Admin | `CINAADMIN_OIDC_TRANSACTION_SECRET_STORE_V2` | `CINAADMIN_OIDC_TRANSACTION_SECRET_V2` |

The client and bridge OIDC values are shared by Auth and Admin; the transaction
value is Admin-only. All three must be distinct random values of at least 32
characters, and the client secret retains the `cina_cs_` prefix followed by at
least 32 random characters. The two webhook values are shared only with their
named child Worker. Each configuration KEK is independent and must have at
least 32 bytes of entropy. Never replace a KEK in place while encrypted
ACTIVE/NEXT/PREVIOUS versions exist; introduce a separately named key and an
explicit re-encryption migration.

The protected Auth `/api/ready` endpoint and the authorized child-Worker
readiness responses probe the active bindings without returning values. Auth
reports `active: true`, `source: "secrets-store-v2"`, `ok`, and public-safe
issue names. A successful probe proves retrieval and minimum format, not that
the shared copies were generated correctly; signed Delivery, Privacy Erasure,
and Admin OIDC acceptance remain required.

Every V2 secret must have the `workers` scope. In addition to the existing
least-privilege Worker and route permissions, the `CLOUDFLARE_API_TOKEN` used by
Wrangler or CI to deploy any of these bindings needs account-level
`Account Secrets Store Edit`; `Account Secrets Store Read` can inspect metadata
but cannot attach a secret to a Worker. Restrict the token to the production
account and required zones. See Cloudflare's
[Secrets Store access-control guide](https://developers.cloudflare.com/secrets-store/access-control/)
and [Workers integration guide](https://developers.cloudflare.com/secrets-store/integrations/workers/).
Never pass a secret value with a CLI value flag, print it, store it in a tracked
file, or send a Secrets Store write token to either frontend. Create or rotate
Store values through an approved server-side control-plane flow.

### Two-phase bootstrap and post-deploy control plane

Phase 1 is structural deployment:

1. Create the two shared webhook values, three Admin OIDC values, and two
   independent configuration KEKs in Secrets Store.
2. Deploy Delivery and Privacy Erasure with their Store bindings and SQLite
   configuration Durable Objects. Their operational `/ready` endpoints may
   return HTTP 503 until provider/target configuration is ACTIVE; that is an
   expected fail-closed bootstrap state, not a structural deployment failure.
3. Provision the five Auth-owned Worker values above, deploy Auth with the exact
   `CINAAUTH_DELIVERY_SERVICE` and `CINAAUTH_ERASURE_SERVICE` bindings, then run
   the governed database migrations and Auth `/api/ready` gate.
4. Deploy Account and Admin only after governed Auth readiness succeeds.

Phase 2 is operational activation. A `super_admin` uses the protected Admin
console, whose server-side BFF calls the authoritative Auth routes below. The
browser never receives Store values, a Secrets Store API token, or a direct
child-Worker credential:

```text
POST /api/admin/configuration/delivery/status
POST /api/admin/configuration/delivery/stage
POST /api/admin/configuration/delivery/test
POST /api/admin/configuration/delivery/activate
POST /api/admin/configuration/delivery/rollback
POST /api/admin/configuration/erasure/status
POST /api/admin/configuration/erasure/stage
POST /api/admin/configuration/erasure/test
POST /api/admin/configuration/erasure/activate
POST /api/admin/configuration/erasure/rollback
```

Auth enforces role, recent authentication, no-impersonation, origin, rate-limit,
strict-schema, audit-before-mutation, revision, and idempotency checks, then
signs fixed Service Binding requests. Every dispatched mutation receives a
redacted authoritative terminal `completed` or `failed` audit outcome; terminal
audit persistence never causes an already-dispatched operation to be retried.
Privacy management signatures bind the exact body to `X-CinaAuth-Timestamp`
(Unix seconds) and `X-CinaAuth-Nonce`; the child accepts at most 300 seconds of
clock skew, and mutation nonces equal the body idempotency key. Stage writes
encrypted NEXT state; test must validate it before activate. Only after ACTIVE
configuration exists should the child operational readiness and real
provider/target acceptance gates be required. Rollback selects the retained
validated PREVIOUS version.

Optional plugin inputs include Turnstile, Google One Tap, Google/GitHub social
OAuth, Generic OAuth, Stripe, pairwise OAuth identifiers, and the admin audit
service key. Production
account deletion always registers the external erasure processor. The
provisioner pins `CINAAUTH_ERASURE_WEBHOOK_URL`; configure the active
`CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2` binding. If either is unavailable,
deletion fails closed while other authentication features remain available.
The fixed production endpoint is
`https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase`; its dedicated
deployment and downstream target contract are documented in
[`workers/privacy-erasure/DEPLOYMENT.md`](../privacy-erasure/DEPLOYMENT.md).
The HTTPS endpoint receives an HMAC
signed, idempotent erasure request. Local account deletion remains blocked
until it returns `completed` or `not-applicable`; `202 Accepted` or
`status: "pending"` instructs the user to retry with the same keyed operation
ID. CinaAuth stores only a digest of the provider evidence in the signed
deletion receipt, so the controller must retain the original provider record.
Turnstile requires both `CLOUDFLARE_TURNSTILE_SITE_KEY` and
`CLOUDFLARE_TURNSTILE_SECRET_KEY`. Provisioning either value without the other
fails closed; the public capabilities endpoint exposes only the site key after
the pair is complete. The Demo then renders the challenge and sends the
single-use token in `x-captcha-response`.

Google One Tap, Google/GitHub social OAuth, and Generic OAuth must follow the production callback/origin
matrix in [`docs/CINAAUTH_OAUTH_PRODUCTION.md`](../../docs/CINAAUTH_OAUTH_PRODUCTION.md).
In particular, Generic OAuth callbacks stay on `accounts.cinaseek.ai` so the
same-origin state and session cookies survive the Service Binding hop. The
account portal build and Auth Worker must receive the same Google Client ID;
an enabled backend plugin alone does not render a working One Tap client.
The account deployment runs `check:oauth-build` against the live capabilities
endpoint and fails if the backend advertises One Tap while the client build
input is absent.
Google Social OAuth is registered only when both `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` are present. GitHub is registered only when both
`GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are present. Their callbacks are
fixed to `https://accounts.cinaseek.ai/api/auth/callback/google` and
`https://accounts.cinaseek.ai/api/auth/callback/github`, preserving the
same-origin state Cookie across the Service Binding proxy.

Stripe billing is atomic and fail-closed. Configure all of
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DEFAULT_PRICE_ID`, and
`CINAAUTH_ENTITLEMENT_CONFIG` together. `STRIPE_DEFAULT_PLAN_NAME` is optional
and defaults to `default`, but that plan ID must exist in the entitlement
policy. A partial or invalid group keeps the Billing capability disabled and
preserves existing access through an explicit unmetered entitlement snapshot;
it never exposes checkout with an incomplete commercial contract. The policy
schema, organization authorization rules, and rollout order are documented in
[`docs/CINAAUTH_ENTITLEMENTS.md`](../../docs/CINAAUTH_ENTITLEMENTS.md).
The Worker enforces the configured feature and finite count policy on protected
management paths, and the organization console displays the same authoritative
snapshot. Cleanup operations remain available after downgrade. Do not sell a
limited plan until the remaining usage-time and concurrent member-acceptance
gates listed in that document are implemented and evidenced.

Billing activation adds the `subscription` table. Before provisioning the
complete Stripe group, preview the normal migration and verify it includes the
indexed `subscription.referenceId` lookup used by entitlement evaluation and
plan-aware audit retention. Apply it only after the approved database restore
point is available, then rerun the preview until `pendingCount` is zero.

Create or reconcile the production widget and provision both values with the
idempotent command below. The API token needs `Turnstile Sites Write` (or
`Account Settings Write`). It creates only the explicitly named
`CinaAuth Production` widget, keeps managed mode with no clearance, and binds
the CinaAuth production hostname allow-list. Secret values are passed to
Wrangler through stdin and are never printed.

```powershell
pnpm --dir workers/auth-api run configure:turnstile
```

Use `-- --dry-run` first to inspect whether the script will create, update, or
reuse the widget without mutating Cloudflare.

```powershell
pnpm --dir workers/auth-api run provision:secrets --deployment-target=production
```

The script requires an HTTPS Delivery URL and always provisions the
repository-reviewed Privacy Erasure endpoint
`https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase`; an operator
environment variable cannot redirect deletion payloads. It performs no
child-service readiness request and does not provision the shared V2 webhook or
Admin OIDC values. Delivery requests remain signed with
`X-CinaAuth-Delivery-Signature`. A child `/ready` HTTP 503 is valid during phase
1; user-facing delivery and account erasure remain fail closed until phase 2
has tested and activated the required configuration.

This command explicitly updates `CINAAUTH_MIGRATION_TOKEN`, the two canonical
service endpoint values, and any configured optional plugin inputs. It never
updates `CINAAUTH_SECRET` or `CINAAUTH_PRIVACY_EXPORT_KEY`.

## 5. Validate and deploy

```powershell
pnpm --dir workers/auth-api run check:production
pnpm --dir workers/auth-api run check:cloudflare
pnpm --dir workers/auth-api run build
pnpm --dir workers/auth-api run deploy
```

`check:cloudflare` requires `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`. Set `CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1` to make all
optional commercial plugin inputs mandatory.
The remote gate verifies both `cinaauth-delivery` and
`cinaauth-privacy-erasure` Service Bindings plus all four exact active Auth
Secrets Store bindings. When `CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2` (or an
explicit legacy fallback value) is present in the operator process, it also
requires public Auth capabilities to match authorized Delivery provider
readiness.
When `CINAAUTH_MIGRATION_TOKEN` is also available, the same command performs an
authorized `/api/ready` acceptance check and requires live cutover, database,
and runtime configuration readiness. Without that token it verifies that the
endpoint stays protected and reports the detailed check as skipped.

Real email/SMS provider acceptance is intentionally opt-in. Set an approved
`CINAAUTH_ACCEPTANCE_EMAIL`, `CINAAUTH_ACCEPTANCE_PHONE` (E.164), and the
active `CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2`, then run:

```powershell
pnpm --dir workers/delivery run acceptance:providers -- --send
```

The script sends all five commercial templates, verifies provider responses,
and replays one delivery ID to prove KV deduplication. It never prints target
addresses or secret values; receipt must still be confirmed by the operator.

An independent admin-assisted lifecycle acceptance proves that production can
create an intentionally synthetic user, issue an impersonation session, resolve
that session, delete the user, and observe session revocation. It requires an
operator-provided `super_admin` session in
`CINAAUTH_ACCEPTANCE_ADMIN_COOKIE` and is dry unless `--run` is explicit:

```powershell
pnpm --dir workers/auth-api run acceptance:production-lifecycle -- --run
```

The script generates its own `@acceptance.invalid` identity, never adds a
password or calls an external identity/delivery provider, and uses the existing
audited admin endpoints. Cleanup runs in `finally`; an unacknowledged deletion
fails the acceptance and reports only the non-sensitive run ID for operator
recovery. The cookie, synthetic email, user ID, and impersonation token are not
logged. Clear the cookie environment variable immediately afterward and never
store it in a tracked file or a long-lived CI secret. This acceptance verifies
the account/session lifecycle and cleanup mechanism; it does not replace real
password, OAuth, email, SMS, or privacy-erasure E2E acceptance.

`cinaauth-delivery.cinagroup.com` is a Worker Custom Domain. Cloudflare owns the
DNS target and certificate lifecycle; do not replace it with a route-only
hostname that has no proxied DNS record.

Wrangler creates the `auth.cinaseek.ai` Custom Domain and reconciles the
SQLite-backed `RateLimitDurableObject` declaration. It does not receive the
PostgreSQL password; the Worker sees only `env.HYPERDRIVE.connectionString`.

## 6. Apply CinaAuth PostgreSQL migrations

The first D1-to-PostgreSQL cutover is a manual maintenance operation. Do not run
the normal CI deploy against an empty PostgreSQL database. Keep the tracked
`CINAAUTH_CUTOVER_STATE=live`, but override the first deploy to maintenance:

```powershell
pnpm --dir workers/auth-api exec wrangler deploy `
  --var CINAAUTH_CUTOVER_STATE:maintenance
```

Generate a separate, one-time `CINAAUTH_D1_MIGRATION_TOKEN` in memory and write
it with `wrangler secret put` through stdin. Never place it in a tracked file or
CLI argument. The permanent `CINAAUTH_MIGRATION_TOKEN` cannot authorize the D1
copy endpoint.

Preview before applying:

```powershell
$headers = @{ Authorization = "Bearer $env:CINAAUTH_MIGRATION_TOKEN" }
Invoke-RestMethod https://auth.cinaseek.ai/api/migrate -Headers $headers
Invoke-RestMethod https://auth.cinaseek.ai/api/migrate -Method Post -Headers $headers
```

The POST applies the framework schema and then installs both deployment-owned
PostgreSQL invariants in one additional transaction: the final-super-admin
trigger and the persistent account/SSO/SCIM provider-namespace registry. It
verifies both before committing. Installation fails if there is no non-anonymous
exact `super_admin`, if an anonymous exact `super_admin` exists, or if current
provider rows/configuration collide. Repair those data conditions explicitly;
do not weaken or skip the invariant. Preview and apply responses list
`requiredInvariants`, and their `invariants` object reports installed/missing
IDs without exposing provider IDs or credentials.

Every new Worker version intentionally keeps all `/api/auth/*` routes at 503
until the POST migration has installed and verified the versioned invariants.
`/api/migrate` and `/api/ready` remain reachable with the migration token. This
short fail-closed rollout window prevents new or rotated Generic OAuth/social
configuration from racing an older database namespace policy. Run the preview,
apply, and readiness checks immediately after deployment.

When enabling organization teams and dynamic roles on an existing database,
deploy the migration-capable Worker while the runtime still uses the base
organization plugin. Then preview and apply the one intentionally exposed
feature schema through the Hyperdrive database role:

```powershell
$advancedMigration =
  "https://auth.cinaseek.ai/api/migrate?feature=organization-advanced"
Invoke-RestMethod $advancedMigration -Headers $headers
Invoke-RestMethod $advancedMigration -Method Post -Headers $headers
Invoke-RestMethod $advancedMigration -Headers $headers
```

The first preview must contain only the expected `organizationRole`, `team`,
and `teamMember` tables plus `session.activeTeamId` and `invitation.teamId`.
The final preview must report `pendingCount: 0`. Unknown or repeated `feature`
parameters fail with HTTP 400. Only after these checks pass may the normal Auth
runtime and both frontend clients enable teams and dynamic access control.

After the PostgreSQL schema is current, preview and apply the exact D1 snapshot
with the one-time token. Responses contain only per-table row counts:

```powershell
$cutoverHeaders = @{
  Authorization = "Bearer $env:CINAAUTH_D1_MIGRATION_TOKEN"
}
Invoke-RestMethod https://auth.cinaseek.ai/api/migrate/d1 `
  -Headers $cutoverHeaders
Invoke-RestMethod https://auth.cinaseek.ai/api/migrate/d1 `
  -Method Post -Headers $cutoverHeaders
```

The copy validates the exact legacy schema, converts D1 dates and booleans,
upserts by primary key inside one PostgreSQL transaction, and requires every
target table count to equal its source count before commit. Only after that
passes, it records `cinaauth_cutover_history` in the same transaction. Auth
requests and `/api/ready` remain fail-closed until that marker exists. Then run
a normal `wrangler deploy` to switch `CINAAUTH_CUTOVER_STATE` to `live`, verify
readiness, and delete the one-time Worker secret.

The migration tokens must be distinct from `CINAUTH_ADMIN_SERVICE_KEY` and at
least 32 characters. PostgreSQL backup and point-in-time recovery are owned by
the origin provider; verify a restore point before applying a production schema
change. D1 Time Travel protects only the retained rollback source, not the new
PostgreSQL database.

### Claim a legacy SCIM provider safely

When `providerOwnership.enabled` is enabled, a legacy `scimProvider` row whose
`organizationId` and `userId` are both null remains hidden from normal session
management. Do not temporarily disable ownership or edit those columns by hand.
The Auth Worker exposes one operations-only endpoint protected by
`CINAAUTH_MIGRATION_TOKEN`:

```powershell
$headers = @{ Authorization = "Bearer $env:CINAAUTH_MIGRATION_TOKEN" }
$claim = @{
  providerId = "verified-legacy-provider-id"
  organizationId = "destination-organization-id"
  ownerUserId = "verified-owner-user-id"
} | ConvertTo-Json

# Preview is the default and does not modify the provider.
$preview = Invoke-RestMethod `
  https://auth.cinaseek.ai/api/migrate/scim-provider-ownership `
  -Method Post -Headers $headers -ContentType "application/json" -Body $claim
$preview
```

Preview returns `status: ready` only when the exact provider exists, both owner
fields are null, no `account` row uses that provider id, the destination
organization and owner exist, and that user is an `owner` or `admin` member of
the organization. A provider with any existing owner field or any provisioned
account fails closed; the endpoint never moves accounts, memberships, or a
connection between tenants.

The provider id must also be absent from the shared account-provider namespace.
Built-in ids such as `credential` and `email-otp`, configured social or Generic
OAuth ids, and ids present in `ssoProvider` are rejected in both preview and
apply mode before an ownership update, token rotation, or migration audit. Do
not rename another identity provider as part of this claim workflow.

The database registry keeps provider-id claims after an SSO or SCIM provider is
deleted, so a later account provider cannot silently reuse that historical
namespace. Same-kind delete-and-recreate remains supported. Registration,
SCIM token creation, and ownership migration retain per-provider Worker
coordination and Durable Object throttling, while the PostgreSQL triggers are
the final transaction-local collision guard.

After independently checking the provider and destination, apply the same
request with the explicit switch:

```powershell
$apply = @{
  providerId = "verified-legacy-provider-id"
  organizationId = "destination-organization-id"
  ownerUserId = "verified-owner-user-id"
  apply = $true
} | ConvertTo-Json

$result = Invoke-RestMethod `
  https://auth.cinaseek.ai/api/migrate/scim-provider-ownership `
  -Method Post -Headers $headers -ContentType "application/json" -Body $apply
$newSCIMToken = $result.scimToken
```

Apply uses a serializable PostgreSQL transaction, row/statement timeouts, a
conditional null-owner update, and an audit row committed with the claim. It
rotates the bearer so the encoded token is bound to the destination
organization; only its SHA-256 is stored. The plaintext `scimToken` is returned
once in the successful apply response and is never written to logs or audit
metadata. Transfer it directly to the approved IdP secret store, then clear the
PowerShell variable. Repeating the exact claim is idempotent and returns
`already_migrated` without issuing another token. If the one-time value is lost,
rotate through the normal organization-authorized SCIM token flow; do not rerun
the ownership claim expecting the token to be revealed again.

## 7. Verify readiness and rate limiting

```powershell
$headers = @{ Authorization = "Bearer $env:CINAAUTH_MIGRATION_TOKEN" }
Invoke-RestMethod https://auth.cinaseek.ai/api/ready -Headers $headers
Invoke-WebRequest https://auth.cinaseek.ai/ -Headers @{ Accept = "application/json" }
Invoke-WebRequest https://auth.cinaseek.ai/.well-known/openid-configuration -Headers @{ Accept = "application/json" }
Invoke-WebRequest https://auth.cinaseek.ai/api/auth/.well-known/openid-configuration -Headers @{ Accept = "application/json" }
```

`/api/ready` returns 200 only when Auth runtime inputs, all four active Secrets
Store bindings, Hyperdrive, PostgreSQL base tables, the D1 cutover marker,
every database invariant and its current data coverage, Queue and Service
Bindings, and the Durable Object limiter binding are structurally ready. It
does not require Resend/Twilio providers or erasure targets to be operational;
those are phase-2 child readiness gates.
The `database.invariants` object lists required, installed, and missing IDs. It
returns `Cache-Control: no-store` and includes `VERSION_METADATA`, but never
returns provider IDs, secret values, or the PostgreSQL connection string.

OIDC Discovery is canonical at `/.well-known/openid-configuration`; the
`/api/auth/.well-known/openid-configuration` compatibility alias returns the
same issuer metadata. The advertised signing algorithm is ES256 and the JWKS
URI remains reachable through the Auth API. Keys rotate every 30 days. When
the configured algorithm changes, a new key is generated immediately on the
first JWKS read or token signature; the old public key remains for a 30-day
verification grace period but is no longer used for new signatures.

The JWT plugin encrypts stored JWKS private keys with `CINAAUTH_SECRET`.
Rotating that secret without a coordinated key transition makes existing JWKS
rows undecryptable and can turn authenticated `get-session` calls into HTTP
500 responses. Preserve the current secret during normal deploys. If recovery
is required on an explicitly disposable database, delete only the stale
`jwks` rows through an authenticated, one-time maintenance procedure and let
the Worker mint a new key under the current secret; do not disable private-key
encryption as a shortcut.

To exercise the login limit safely, use a non-production test account and send
six requests to the same `/api/auth/sign-in/*` endpoint from one client IP. The
sixth request in a 60-second window must return HTTP 429 and `X-Retry-After`.

## CI requirements

`.github/workflows/deploy-cloudflare.yml` expects these GitHub secrets:

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- `PLANETSCALE_SERVICE_TOKEN_ID` and `PLANETSCALE_SERVICE_TOKEN`, scoped to
  `cinagroup/cinaauth` with only `read_backups`
- `CINAAUTH_HYPERDRIVE_ID`
- `CINAAUTH_MIGRATION_TOKEN`; among the four core Worker secrets discussed in
  this section, this is the only value supplied by the GitHub `production`
  environment and the only one the central workflow explicitly updates
- when Billing is enabled, the complete Stripe group:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DEFAULT_PRICE_ID`, and
  `CINAAUTH_ENTITLEMENT_CONFIG`; optionally `STRIPE_DEFAULT_PLAN_NAME`
- optional plugin credentials already listed above
- when social login is enabled, `GOOGLE_CLIENT_ID` plus
  `GOOGLE_CLIENT_SECRET`, and/or `GITHUB_CLIENT_ID` plus
  `GITHUB_CLIENT_SECRET`; Google One Tap may use `GOOGLE_CLIENT_ID` alone

Put production credentials in the GitHub `production` environment. Create that
environment before the first run, restrict it to `main`, require an independent
reviewer, disable administrator bypass where repository policy permits it, and
prevent the initiating operator from approving their own deployment. Every job
that can write a production Cloudflare resource references this environment.
The Account and Admin reusable workflows set the environment on their actual
`deploy` jobs because GitHub does not allow `environment` on a caller job that
uses another workflow.

Production deployment has no `push` trigger. Start `Deploy to Cloudflare`
manually from the default branch and provide all four inputs:

- `restore_rehearsal_completed`: `true` only after an isolated restored branch,
  temporary Hyperdrive, and non-production Auth Worker have passed migration
  preview/readiness rehearsal
- `restore_rehearsal_reference`: a durable run, ticket, or evidence URL for
  that rehearsal; placeholders are rejected
- `backup_reference`: the exact active successful PlanetScale `main` backup ID
  selected for rollback
- `operator_attestation`: exactly `DEPLOY CINAAUTH PRODUCTION`, authorizing the
  Cloudflare writes and the production migration POST in this run

The `authorize-production` job runs before any Cloudflare write. It fails closed
unless the inputs are present, the production environment has released the job,
both PlanetScale credentials exist, the live read-only backup audit passes, and
`backup_reference` is present in the audit's active successful backups. The
restore reference is operator-attested evidence; the workflow does not create,
modify, or delete a PlanetScale branch.

The same read-only authorization job requires `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` and verifies the three preserved secret names against
the live Worker inventories. Do not create duplicate GitHub secrets named
`CINAAUTH_SECRET`, `CINAAUTH_PRIVACY_EXPORT_KEY`, or
`CINAAUTH_ERASURE_STORAGE_SECRET`; their unavailable values are intentionally
retained only in Cloudflare. If any inventory entry is missing, stop and follow
an approved recovery or coordinated rotation procedure instead of generating a
replacement during deployment.

The deliberate exception is the Account Portal-only first phase of the SIWE
rollout. It does not deploy a backend Worker or perform a database write, so it
can be started through `Deploy Account Portal` without claiming a restore
rehearsal. The manual job still requires the `production` environment, must run
from `main`, requires the exact attestation
`DEPLOY CINAAUTH ACCOUNT PORTAL PHASE ONE`, rejects the run unless the tracked
Auth Worker switch is exactly `CINAAUTH_SIWE_ENABLED=false`, and requires an
exact 32-hex-character repository `REOWN_PROJECT_ID`. After deployment it
verifies the no-store public readiness marker, disabled wallet UI state, and
exact compiled Project ID.
Every backend or migration write remains exclusive to the central recovery
gate.

The seven active Store values in the table above are created separately through
the Secrets Store control plane and are attached by the checked-in bindings;
they are not duplicated as V1 GitHub/Worker secrets. Resend, Twilio, and
`CINAAUTH_ERASURE_TARGETS` are also absent from the deployment environment and
are written after deployment through the audited configuration control plane.

After authorization, CI keeps the ordered rollout: Delivery and Privacy Erasure
Workers first, Auth Worker second, then Account and Admin frontends. It configures
the Hyperdrive ID, runs static and remote structural gates, deploys Auth, previews
and applies migrations, then requires authenticated Auth `/api/ready` before
either frontend deploys. Operational child readiness is a separate
post-activation acceptance gate.

The Admin deployment workflow remains reusable-only. The Account workflow is
reusable by the central rollout only when its `workflow_call` caller explicitly
passes `deployment_mode: central`; direct manual dispatch does not expose that
input and can enter only the constrained SIWE first-phase path described above.
This explicit mode is required because a called reusable workflow inherits the
central dispatch event name. Each central frontend deployment polls the
authenticated readiness endpoint before any frontend Worker write. They require
both
`super-admin-governance-v1` and `provider-namespace-registry-v1` to be installed
and the cutover state to be `live`. The central backend workflow invokes them
only after the Auth job succeeds, preventing either frontend from overtaking an
Auth migration. The Admin console consumes its three existing active Store
bindings and does not provision V1 OIDC secrets.
