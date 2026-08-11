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

## Staged Secrets Store V2 binding

Secrets Store V2 is **staged only**. Erasure readiness authorization, inbound
signature verification, and downstream coordination still use the active V1
Worker secret `CINAAUTH_ERASURE_WEBHOOK_SECRET`. Keep the same V1 value on Auth
and Privacy Erasure; do not remove it while the V2 probe is still staged.

The only allowed staged entry is this exact triple. The Auth production gate
rejects duplicates, additional entries, a different store, or an incorrect
binding-to-secret mapping:

```json
{
  "binding": "CINAAUTH_ERASURE_WEBHOOK_SECRET_STORE_V2",
  "store_id": "346e2b4b86334bc29083c064116e91cf",
  "secret_name": "CINAAUTH_ERASURE_WEBHOOK_SECRET_V2"
}
```

Public `/ready` stays redacted and does not resolve V2. When the request carries
the valid V1 bearer, authorized readiness calls `get()` on the staged binding
and returns only `staged`, `ok`, and issue names after checking that the value
can be retrieved and meets the minimum length. It never returns or logs the
value and does not prove V1/V2
parity. A failed V2 probe blocks authorized readiness but does not activate V2
for an erasure request.

The staged secret must have the `workers` scope. The least-privilege
`CLOUDFLARE_API_TOKEN` used for deployment needs the existing Worker/route
permissions plus account-level `Account Secrets Store Edit`; Read alone cannot
attach the binding. Restrict the token to the production account and required
zone. See Cloudflare's
[Secrets Store access-control guide](https://developers.cloudflare.com/secrets-store/access-control/).
Never place the value in a tracked file, CLI argument, command history, log, or
readiness response; use an approved secure prompt or stdin-based provisioning
flow.

For the coordinated cutover, change Auth and Privacy Erasure together only
after both authorized V2 probes pass while V1 remains active. The governed
release must update both runtime consumers, preserve a rollback plan, and verify
signed erasure acceptance for configured downstream targets. Retire V1 only
after that evidence is complete; a one-sided HMAC cutover must fail closed.

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
