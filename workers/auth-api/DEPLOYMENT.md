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

## Prerequisites

- Node.js 22+ and pnpm 11+
- Wrangler 4.x authenticated to the target Cloudflare account
- an active `cinaseek.ai` zone
- a PostgreSQL database reachable by Cloudflare Hyperdrive
- `cinaauth-delivery` and `cinaauth-delivery-dlq` Queues
- permission to manage R2 and Queues for privacy-export provisioning

Never put a PostgreSQL URI, password, API token, or Worker secret in
`wrangler.json`, a tracked file, or a CLI argument.

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

## 4. Provision Worker secrets

Required values are supplied through environment variables and written by
`provision-secrets.mjs` through Wrangler stdin:

- `CINAAUTH_SECRET`
- `CINAAUTH_MIGRATION_TOKEN`
- `CINAAUTH_DELIVERY_WEBHOOK_URL`
- `CINAAUTH_DELIVERY_WEBHOOK_SECRET`
- `CINAAUTH_PRIVACY_EXPORT_KEY` (dedicated, at least 32 random characters)
- `CINAADMIN_OIDC_CLIENT_SECRET` (shared only with the Admin Worker)
- `CINAADMIN_OIDC_BRIDGE_SECRET` (distinct Service Binding bridge secret)

The Admin Worker additionally owns `CINAADMIN_OIDC_TRANSACTION_SECRET`. All
three Admin OIDC values must be distinct random values of at least 32
characters. The client and bridge secrets must match across the Auth and Admin
Workers, while the transaction secret must never be provisioned to Auth.

Optional plugin inputs include Turnstile, Google One Tap, Google/GitHub social
OAuth, Generic OAuth, Stripe, pairwise OAuth identifiers, and the admin audit
service key. Production
account deletion always registers the external erasure processor, so configure
both `CINAAUTH_ERASURE_WEBHOOK_URL` and
`CINAAUTH_ERASURE_WEBHOOK_SECRET`. If the pair is missing, deletion fails
closed while other authentication features remain available. The fixed
production endpoint is
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
pnpm --dir workers/auth-api run provision:secrets
```

The delivery webhook must be HTTPS and ready before the provisioning script
accepts it. Delivery requests are signed with
`X-CinaAuth-Delivery-Signature`.
The Auth and Delivery Workers must share the same webhook secret; it authorizes
both the internal `/ready` probe and signed delivery requests. A `503` readiness
response may still report one ready channel and one unavailable channel. Auth
accepts that partial state, advertises only the ready channel, and fails closed
for the unavailable one.
The Privacy Erasure Worker must also pass its authorized readiness check. A
one-time fail-closed bootstrap may use
`provision:secrets -- --allow-erasure-not-ready`; this accepts only an explicit
503 response with `runtimeConfig.ok=false`, and account deletion remains
blocked until real targets are configured.

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
The remote gate also verifies the `cinaauth-delivery` Service Binding and, when
`CINAAUTH_DELIVERY_WEBHOOK_SECRET` is present in the current process, requires
public Auth capabilities to match the authorized Delivery provider readiness.
When `CINAAUTH_MIGRATION_TOKEN` is also available, the same command performs an
authorized `/api/ready` acceptance check and requires live cutover, database,
and runtime configuration readiness. Without that token it verifies that the
endpoint stays protected and reports the detailed check as skipped.

Real email/SMS provider acceptance is intentionally opt-in. Set an approved
`CINAAUTH_ACCEPTANCE_EMAIL`, `CINAAUTH_ACCEPTANCE_PHONE` (E.164), and
`CINAAUTH_DELIVERY_WEBHOOK_SECRET`, then run:

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

`/api/ready` returns 200 only when runtime secrets, Hyperdrive, PostgreSQL base
tables, the D1 cutover marker, every database invariant and its current data
coverage, Queue delivery, and the Durable Object limiter binding are ready.
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
- `CINAAUTH_HYPERDRIVE_ID`
- `CINAAUTH_SECRET` and `CINAAUTH_MIGRATION_TOKEN`
- `CINAAUTH_DELIVERY_WEBHOOK_SECRET`
- required `CINAAUTH_ERASURE_WEBHOOK_SECRET`, shared by the Auth Worker and
  Privacy Erasure Worker; the URL is fixed by CI to the production custom domain
- `CINAAUTH_ERASURE_STORAGE_SECRET` and a non-empty
  `CINAAUTH_ERASURE_TARGETS` JSON array for the Privacy Erasure Worker
- when Billing is enabled, the complete Stripe group:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_DEFAULT_PRICE_ID`, and
  `CINAAUTH_ENTITLEMENT_CONFIG`; optionally `STRIPE_DEFAULT_PLAN_NAME`
- delivery-provider and optional plugin credentials already listed above
- when social login is enabled, `GOOGLE_CLIENT_ID` plus
  `GOOGLE_CLIENT_SECRET`, and/or `GITHUB_CLIENT_ID` plus
  `GITHUB_CLIENT_SECRET`; Google One Tap may use `GOOGLE_CLIENT_ID` alone

CI configures the Hyperdrive ID, runs static and remote gates, deploys, previews
and applies migrations, then requires authenticated `/api/ready` before the
demo deployment proceeds.
