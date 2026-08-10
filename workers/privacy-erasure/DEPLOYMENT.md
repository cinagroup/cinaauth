# CinaAuth Privacy Erasure Worker

This Worker is the fail-closed controller between the authoritative CinaAuth
account deletion flow and every external system that stores subject data.

## Security and persistence contract

- CinaAuth signs the exact request body with `CINAAUTH_ERASURE_WEBHOOK_SECRET`.
- One SQLite Durable Object is selected by the stable keyed `operationId`.
- SQLite stores only the operation ID, keyed subject/evidence digests,
  public-safe target IDs, status, and timestamps. Raw user IDs, email addresses,
  target URLs, target secrets, and provider evidence IDs are never persisted.
- Completed targets are not called again. Pending or failed targets are retried
  with the same operation ID.
- An empty/invalid target list returns HTTP 503. It never returns
  `not-applicable`, so CinaAuth preserves the local account.

## Required secrets

Provision these through environment variables to Wrangler stdin:

```powershell
pnpm --dir workers/privacy-erasure run provision:secrets
```

- `CINAAUTH_ERASURE_WEBHOOK_SECRET`: shared inbound HMAC key; at least 32 chars.
- `CINAAUTH_ERASURE_STORAGE_SECRET`: stable storage HMAC key; at least 32 chars.
- `CINAAUTH_ERASURE_TARGETS`: JSON array of `{ "id", "url", "secret" }`.

Each target URL must be credential-free HTTPS and each per-target secret must
be at least 32 characters. Do not reuse the inbound or storage key for a target.

For a one-time bootstrap before downstream adapters exist, explicitly set
`CINAAUTH_ERASURE_TARGETS=[]` and run:

```powershell
pnpm --dir workers/privacy-erasure run provision:secrets -- --allow-empty-targets
```

That state is intentionally not production-ready: `/ready` returns 503 and all
CinaAuth account deletion attempts remain blocked. The normal provisioning
command and CI reject an empty target list.

## Downstream target contract

The Worker sends:

```http
POST <target-url>
Content-Type: application/json
X-CinaAuth-Operation-Id: <stable operation id>
X-CinaAuth-Target-Id: <configured public id>
X-CinaAuth-Signature: v1=<base64 HMAC-SHA256 of the exact body>
```

The JSON body keeps the controller contract:

```json
{
  "schemaVersion": 1,
  "action": "erase-subject",
  "operationId": "...",
  "subject": { "id": "...", "email": "..." }
}
```

Return HTTP 202 with optional `Retry-After`, or HTTP 2xx with one of:

```json
{ "status": "pending", "retryAfterSeconds": 30 }
```

```json
{
  "status": "completed",
  "completedAt": "2026-08-10T00:00:00.000Z",
  "evidenceId": "provider-receipt-reference"
}
```

`not-applicable` uses the same evidence fields as `completed`. Non-2xx,
timeouts, oversized bodies, and malformed evidence fail closed.

## Deploy and verify

```powershell
pnpm --dir workers/privacy-erasure run check
pnpm --dir workers/privacy-erasure run build
pnpm --dir workers/privacy-erasure run deploy
pnpm --dir workers/privacy-erasure run provision:secrets
pnpm --dir workers/privacy-erasure run check:cloudflare
```

Then provision the same inbound HMAC key and this fixed URL on the Auth Worker:

```text
CINAAUTH_ERASURE_WEBHOOK_URL=https://cinaauth-erasure.cinagroup.com/cinaauth/privacy/erase
```

Target membership is part of the deletion policy. When adding or removing a
target, also bump the privacy-center `policyVersion`; existing operation IDs
with a different target set remain blocked instead of silently changing scope.

Public `/ready` is redacted. An `Authorization: Bearer <inbound-secret>` request
adds only issue names and target IDs; it never returns URLs or secrets.
