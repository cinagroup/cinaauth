# CinaAuth Privacy Erasure Worker deployment

This Worker is the fail-closed controller between the authoritative CinaAuth
account-deletion flow and external systems that store subject data. Target
credentials are configured after deployment through the authenticated Auth
control plane; they are not required in a build or deployment environment.

## Readiness model

Deployment and operation are intentionally separate states:

- **Structural readiness** requires the active webhook HMAC binding, the
  SQLite configuration Durable Object, its Secrets Store encryption key, and
  the stable storage-digest key.
- **Operational readiness** additionally requires a validated ACTIVE target
  configuration. Without it, `/ready` returns HTTP 503 and every erasure request
  fails closed. No account is reported erased.

This allows a safe first deployment before Resend/Twilio/downstream erasure
adapters exist without misrepresenting that privacy erasure is operational.

## Deployment-owned bindings

`wrangler.json` fixes the following resources:

- SQLite `ERASURE_COORDINATOR` Durable Object, one object per operation ID.
- SQLite `ERASURE_CONFIG` Durable Object, one singleton encrypted registry.
- Secrets Store binding
  `CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2` ->
  `346e2b4b86334bc29083c064116e91cf/CINAAUTH_ERASURE_WEBHOOK_SECRET_V2`.
- Secrets Store binding `CINAAUTH_ERASURE_CONFIG_KEK_STORE` ->
  `346e2b4b86334bc29083c064116e91cf/CINAAUTH_ERASURE_CONFIG_KEK_V1`.
- Static `CINAAUTH_ERASURE_ALLOWED_HOSTS` deployment policy. It is an exact,
  comma/space-separated hostname list and defaults to empty (fail closed).

Set allowed hosts in reviewed deployment configuration before staging a target.
The post-deploy Admin page cannot broaden this allow-list. Targets must use
credential-free HTTPS on port 443; IP literals, localhost/private-style names,
fragments, and hosts outside the exact allow-list are rejected.

## Secrets and encrypted target state

Provision `CINAAUTH_ERASURE_STORAGE_SECRET` as a Worker secret through
environment-variable-to-stdin:

```powershell
pnpm --dir workers/privacy-erasure run provision:secrets --deployment-target=production
```

It must be a stable, independent value of at least 32 characters. It keys the
subject/evidence digests persisted by operation coordinators.

Create the two Secrets Store values with independent cryptographically random
material (at least 32 bytes of entropy):

- `CINAAUTH_ERASURE_WEBHOOK_SECRET_V2` is the active HMAC key shared with the
  Auth Worker. Erase ingress, authorized readiness, and every configuration
  action resolve it asynchronously from Secrets Store.
- `CINAAUTH_ERASURE_CONFIG_KEK_V1` encrypts target URLs and per-target HMAC
  secrets with HKDF-SHA-256-derived AES-256-GCM keys. Each config version uses
  a random 32-byte salt, random 12-byte IV, and purpose/version-bound AAD. A
  separately domain-separated HKDF/HMAC key also protects persisted idempotency
  digests, so the plaintext digest table cannot validate guesses of target
  signing secrets without the KEK.

If the V2 webhook binding exists but `get()` fails or returns a weak value, the
Worker fails closed; it never falls back to V1. The legacy Worker secret
`CINAAUTH_ERASURE_WEBHOOK_SECRET` is used only by an older deployment that has
no V2 binding. `CINAAUTH_ERASURE_TARGETS` is likewise only an optional migration
fallback when no dynamic ACTIVE version exists.

Secrets Store replaces a value in place for every bound deployment. Do not
replace `CINAAUTH_ERASURE_CONFIG_KEK_V1` while encrypted versions exist: that
would make ACTIVE/NEXT/PREVIOUS unreadable. KEK rotation requires a separately
named V2 key plus an explicit decrypt/re-encrypt migration and rollback window.

Never put Store values in tracked files, CLI arguments, logs, readiness
responses, or the browser. The Admin application sends write-only fields to the
authoritative Auth Worker; only Auth signs Service Binding requests to this
Worker.

## Post-deploy configuration API

All management endpoints accept only `POST application/json`, set
`Cache-Control: no-store`, and require these headers:

```http
X-CinaAuth-Timestamp: <canonical Unix seconds>
X-CinaAuth-Nonce: <16-128 character request nonce>
X-CinaAuth-Signature: v1=<base64-HMAC-SHA256(timestamp.nonce.exact-body)>
```

The timestamp and nonce are literal strings from the headers and the two dots
are literal separators. The timestamp must be within 300 seconds of Worker
time. The nonce must start with an ASCII letter or digit and then contain only
ASCII letters, digits, `.`, `_`, `:`, or `-`. The HMAC key is the active Store
V2 webhook key. Missing, malformed, invalid, or stale authentication fails
closed without logging the key, signature, nonce, or body.

```text
/internal/config/erasure/status
/internal/config/erasure/stage
/internal/config/erasure/test
/internal/config/erasure/activate
/internal/config/erasure/rollback
```

Requests are exact-schema JSON:

```json
{ "schemaVersion": 1, "action": "status" }
```

```json
{
  "schemaVersion": 1,
  "action": "stage",
  "expectedVersion": 0,
  "idempotencyKey": "unique-request-id",
  "targets": [
    {
      "id": "commerce",
      "url": "https://privacy.example.com/cinaauth/erase",
      "secret": "write-only-target-hmac-secret"
    }
  ]
}
```

`test` uses `schemaVersion`, `action`, `expectedVersion`, and
`idempotencyKey`. `activate` and `rollback` add the exact human-confirmation
field `confirmation: "ACTIVATE"` or `confirmation: "ROLLBACK"`.

Every mutation uses an optimistic `expectedVersion` (the returned `revision`)
and an idempotency key. Its signed `X-CinaAuth-Nonce` must exactly equal the
body `idempotencyKey`. An exact replay returns the previously stored result;
reuse of a key with different input returns HTTP 409, and callers may re-sign
the same body and key with a fresh timestamp after the five-minute window.
The internal schema v2 upgrade clears legacy unkeyed idempotency cache rows;
`expectedVersion` still prevents a pre-upgrade mutation from being repeated.
`status` is read-only and uses a unique nonce that is not persisted, so an
in-window replay is harmless. A stale revision also returns HTTP 409. Status
and mutation responses expose only:

- `revision`, structural/operational readiness, and source;
- ACTIVE/NEXT/PREVIOUS version numbers;
- public target IDs/counts and configured/validated flags;
- lifecycle timestamps.

They never return a target URL (including query parameters), target secret,
Authorization header, ciphertext, salt, or IV.

## Safe target validation handshake

`test` never sends `erase-subject`. It decrypts the NEXT version and sends each
allowed target a short-lived signed challenge:

```json
{
  "schemaVersion": 1,
  "action": "verify-erasure-target",
  "challengeId": "uuid",
  "targetId": "commerce",
  "issuedAt": "2026-08-11T00:00:00.000Z",
  "expiresAt": "2026-08-11T00:01:00.000Z"
}
```

The target must return HTTP 2xx JSON with `Content-Type: application/json`, an
`X-CinaAuth-Signature` over the exact response body using that target's HMAC
key, and this exact payload shape:

```json
{
  "schemaVersion": 1,
  "action": "erasure-target-ready",
  "challengeId": "same-uuid",
  "targetId": "commerce",
  "ready": true,
  "respondedAt": "2026-08-11T00:00:01.000Z"
}
```

All targets must pass in the same test before NEXT becomes validated. An
unvalidated NEXT cannot activate. Activation retains the former ACTIVE as
PREVIOUS; rollback swaps the validated ACTIVE and PREVIOUS versions. Rollback
refuses to discard a separate NEXT version.

## Erasure operation contract

CinaAuth sends:

```http
POST /cinaauth/privacy/erase
Content-Type: application/json
X-CinaAuth-Operation-Id: <stable operation id>
X-CinaAuth-Signature: v1=<base64 HMAC-SHA256 of the exact body>
```

The configuration controller chooses ACTIVE dynamic targets first. Legacy
`CINAAUTH_ERASURE_TARGETS` is considered only when ACTIVE is absent and still
must pass the static host policy. An absent, corrupt, disallowed, or empty
configuration returns HTTP 503.

Each downstream adapter receives `erase-subject` with its own target HMAC.
Return HTTP 202 with optional `Retry-After`, or HTTP 2xx with `pending`,
`completed`, or `not-applicable` evidence. Malformed evidence, redirects,
timeouts, oversized bodies, and non-2xx responses fail closed.

One operation-specific SQLite Durable Object persists only the operation ID,
keyed subject/evidence digests, public target IDs, status, and timestamps. Raw
user IDs, emails, target URLs/secrets, and provider evidence IDs are never
persisted there. Completed targets are not replayed.

## Build, bootstrap, and verification

```powershell
pnpm --dir workers/privacy-erasure run check
pnpm --dir workers/privacy-erasure run build
pnpm --dir workers/privacy-erasure run deploy
pnpm --dir workers/privacy-erasure run provision:secrets --deployment-target=production
pnpm --dir workers/privacy-erasure run check:cloudflare -- --allow-not-ready
```

After the Admin control plane stages, validates, and activates targets, require
full operational readiness:

```powershell
pnpm --dir workers/privacy-erasure run check:cloudflare
```

Auth must use its Service Binding and the same active Store V2 HMAC value. The
fixed public erasure URL remains:

```text
https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase
```

Target membership and endpoint identity are part of deletion policy. When
membership or a target URL changes, also bump the privacy-center policy
version. Existing v2 operation records bind an HMAC digest of target IDs and
URLs, so they stay blocked instead of silently changing scope. Legacy v1
operation rows remain compatible with their original ID-only digest.
