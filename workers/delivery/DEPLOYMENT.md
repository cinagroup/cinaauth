# CinaAuth Delivery Worker Deployment

This Worker receives signed delivery jobs from `cinaauth-api`, deduplicates
successful IDs with KV, and sends email through Resend or SMS through Twilio.
Provider credentials can be configured after the Worker is deployed; they are
not build inputs and are never returned by the management API.

## Bootstrap resources

The checked-in configuration binds:

- replay KV `CINAAUTH_DELIVERY_REPLAY_KV`;
- SQLite Durable Object `DELIVERY_CONFIG` (`DeliveryProviderConfig`);
- active shared webhook secret `CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2`;
- provider-configuration KEK `CINAAUTH_DELIVERY_CONFIG_KEK_STORE`.

Both Secrets Store entries must have the `workers` scope in store
`346e2b4b86334bc29083c064116e91cf`:

| Binding | Secret name | Purpose |
| --- | --- | --- |
| `CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2` | `CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2` | Authorize and sign Delivery and management traffic |
| `CINAAUTH_DELIVERY_CONFIG_KEK_STORE` | `CINAAUTH_DELIVERY_CONFIG_KEK_V1` | HKDF input for per-version AES-256-GCM keys |

The KEK must be an independently generated high-entropy value of at least 32
characters. Never put either value in a tracked file, command argument, log, or
browser response. The browser and Admin Worker must not receive a Cloudflare
Secrets Store write token. Do not replace the KEK in place: existing dynamic
versions would become undecryptable. A future KEK rotation must stage a new
binding/version, re-encrypt all retained slots, verify them, and only then
retire V1.

Run the local release gates and deploy the bootstrap Worker:

```sh
pnpm --dir workers/delivery run test
pnpm --dir workers/delivery run cf-typegen:check
pnpm --dir workers/delivery exec tsc --noEmit
pnpm --dir workers/delivery run build
pnpm --dir workers/delivery run deploy
```

The Worker can be structurally healthy while `/ready` returns `503` with
operational state `disabled` or `degraded`. That is the expected bootstrap
state until both channels are configured, tested, and activated.

## Active webhook secret and rollback

Delivery verification, management authorization, and readiness authorization
resolve `CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2` on every request. If its
`get()` fails or the value is weak, the request fails closed. The legacy Worker
secret `CINAAUTH_DELIVERY_WEBHOOK_SECRET` is used only when the Store binding is
absent, allowing a deliberate code/config rollback; it is never used to bypass
a present but unhealthy Store binding.

Authorized `/ready` reports `secretsStore.active`, `ok`, and public-safe issue
names. It never returns or logs the value.

## Post-deploy provider configuration

The Auth Worker calls these private management endpoints through its Delivery
Service Binding:

```text
POST /cinaauth/delivery/config/status
POST /cinaauth/delivery/config/stage
POST /cinaauth/delivery/config/test
POST /cinaauth/delivery/config/activate
POST /cinaauth/delivery/config/rollback
```

Every request uses the same Bearer token, timestamp, request ID, and HMAC
signature as normal delivery. Mutation `idempotencyKey` must equal
`X-CinaAuth-Delivery-Id`. All request bodies are exact-parsed; unknown fields
are rejected. Every response includes `Cache-Control: no-store`,
`Pragma: no-cache`, and `X-Content-Type-Options: nosniff`.

The lifecycle is:

1. `stage` validates and encrypts a new channel `NEXT` version.
2. `test` sends a real provider message to the explicit recipient and marks
   that exact `NEXT` tested only after a successful provider response.
3. `activate` atomically moves `ACTIVE` to `PREVIOUS` and `NEXT` to `ACTIVE`.
4. `rollback` atomically swaps `ACTIVE` and `PREVIOUS`.

All mutations require `expectedVersion` (the global repository revision) and
an idempotency key. A stale revision or reuse of a key with another payload is
rejected with `409`. Successful mutation responses contain only:

```json
{
  "operation": "stage",
  "revision": 1,
  "version": 1,
  "validated": false,
  "updatedAt": "2026-08-11T00:00:00.000Z"
}
```

The SQLite Durable Object persists ciphertext, random HKDF salt, random GCM IV,
version slots, timestamps, and keyed idempotency digests. It does not persist
plaintext credentials or test recipients. The management API is write-only:
status exposes only provider names, configured/validated booleans, revisions,
version slots, and timestamps.

At runtime, each channel resolves configuration in this order:

1. decrypted dynamic `ACTIVE`;
2. a complete legacy environment group;
3. disabled.

If a dynamic `ACTIVE` exists but cannot be decrypted or read, delivery fails
closed and does not silently fall back to legacy values.

## Legacy migration only

`provision:secrets` is retained for rollback or migration. It provisions only
legacy values that are actually present in the invoking process and requires
each provider group to be complete. A normal bootstrap does not require
Resend/Twilio values in CI:

```sh
pnpm --dir workers/delivery run provision:secrets --deployment-target=production --dry-run
```

## Readiness and verification

```sh
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
  pnpm --dir workers/delivery run check:cloudflare
```

`GET /` is structural health and reports `structuralReady` without resolving or
returning provider credentials. `GET /ready` is operational readiness and is
`200` only when both email and SMS are usable; bootstrap `503` is valid. The
remote preflight accepts that bootstrap state, verifies both Store bindings,
the Durable Object binding, replay KV, route ownership, and response shape, and
warns that provider activation is still required.

## Delivery webhook contract

The Auth Worker sends:

- `Authorization: Bearer <active shared webhook secret>`
- `X-CinaAuth-Delivery-Id`
- `X-CinaAuth-Delivery-Timestamp`
- `X-CinaAuth-Delivery-Signature`

The signature is `v1=` plus hex HMAC-SHA256 over
`{timestamp}.{deliveryId}.{rawRequestBody}`. Requests older than
`DELIVERY_ALLOWED_SKEW_SECONDS` are rejected. Delivery IDs are recorded in KV
only after the provider succeeds, so failed sends remain retryable while
successful duplicates become idempotent no-ops.
