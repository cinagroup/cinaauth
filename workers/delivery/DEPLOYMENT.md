# CinaAuth Delivery Worker Deployment

This Worker receives signed delivery jobs from `cinaauth-api`, verifies the
HMAC headers, deduplicates successful delivery IDs with KV, and sends email via
Resend plus SMS via Twilio.

## Cloudflare Setup

The replay KV namespace has already been created in Cloudflare:

```json
{
  "binding": "CINAAUTH_DELIVERY_REPLAY_KV",
  "id": "d5a6d9a4e8b7469ab2de82c53bf6b7f8"
}
```

Deploy the Worker once after local checks so the script and route exist. It will
return `503` from `/ready` until provider secrets are set, but the hostname is
not used by `cinaauth-api` until you later set `CINAAUTH_DELIVERY_WEBHOOK_URL`.

```sh
pnpm --dir workers/delivery run test
pnpm --dir workers/delivery run cf-typegen:check
pnpm --dir workers/delivery exec tsc --noEmit
pnpm --dir workers/delivery run build
pnpm --dir workers/delivery run deploy
```

Then set runtime secrets. Use the same `CINAAUTH_DELIVERY_WEBHOOK_SECRET`
value on this Worker and on the main `cinaauth-api` Worker. The provisioning
script reads values from environment variables and sends them to Wrangler over
stdin, so secret values do not appear in command-line arguments.

```sh
pnpm --dir workers/delivery run provision:secrets
```

Point the main Worker at this endpoint:

```sh
pnpm --dir workers/auth-api exec wrangler secret put CINAAUTH_DELIVERY_WEBHOOK_URL
# value: https://cinaauth-delivery.cinagroup.com/cinaauth/delivery
```

## Staged Secrets Store V2 binding

Secrets Store V2 is **staged only**. Delivery verification, signing, and
readiness authorization still use the active V1 Worker secret
`CINAAUTH_DELIVERY_WEBHOOK_SECRET`. Keep that V1 secret synchronized with Auth
and do not delete it until the coordinated cutover is complete.

The only allowed staged entry is this exact triple; the Auth production gate
rejects duplicates, additional entries, a different store, or a changed
binding-to-secret mapping:

```json
{
  "binding": "CINAAUTH_DELIVERY_WEBHOOK_SECRET_STORE_V2",
  "store_id": "346e2b4b86334bc29083c064116e91cf",
  "secret_name": "CINAAUTH_DELIVERY_WEBHOOK_SECRET_V2"
}
```

The public `/ready` response remains redacted and does not resolve the staged
secret. Only an authorized `/ready` request calls `get()` on the V2 binding; it
reports `staged`, `ok`, and issue names after checking that the value can be
retrieved and meets the minimum length. It never returns or logs the value and
does not prove that V1 and V2 are
equal. This probe may fail readiness to block an unsafe future cutover, but the
delivery request path continues to use V1.

The V2 secret must have the `workers` scope. The least-privilege
`CLOUDFLARE_API_TOKEN` used for deployment needs the existing Worker/route
permissions plus account-level `Account Secrets Store Edit`; Read alone cannot
attach the secret binding. Restrict the token to the production account and
required zone. Cloudflare documents this in its
[Secrets Store access-control guide](https://developers.cloudflare.com/secrets-store/access-control/).
Do not put the secret value in a tracked file, CLI argument, command history, or
log; use an approved secure prompt or stdin-based provisioning flow.

For the later coordinated cutover, keep V1 active while Auth and Delivery both
pass their authorized V2 readiness checks. Change both runtime consumers in the
same governed release, verify signed webhook and provider acceptance with a
rollback plan, and retire V1 only after that evidence is complete. Never cut one
side of the shared HMAC secret independently.

## Verify And Deploy

```sh
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm --dir workers/delivery run check:cloudflare
curl https://cinaauth-delivery.cinagroup.com/ready \
  -H "Authorization: Bearer $CINAAUTH_DELIVERY_WEBHOOK_SECRET"
```

`check:cloudflare` verifies the replay KV namespace, zone/route ownership,
required Worker secrets, and public endpoint state. It never prints secret
values.

`GET /ready` returns HTTP 200 only when the shared delivery secret, replay KV,
Resend, Twilio, and Worker version metadata are present. Without authorization
it returns only a compact status. With `Authorization: Bearer
$CINAAUTH_DELIVERY_WEBHOOK_SECRET`, it reports missing input names but not
values.

## Webhook Contract

The main Worker sends:

- `Authorization: Bearer $CINAAUTH_DELIVERY_WEBHOOK_SECRET`
- `X-CinaAuth-Delivery-Id`
- `X-CinaAuth-Delivery-Timestamp`
- `X-CinaAuth-Delivery-Signature`

The signature is `v1=` + hex HMAC-SHA256 over
`{timestamp}.{deliveryId}.{rawRequestBody}`. Requests older than
`DELIVERY_ALLOWED_SKEW_SECONDS` are rejected. Delivery IDs are recorded in KV
only after the provider succeeds, so failed sends can still retry through the
main Worker queue while successful duplicates become idempotent no-ops.
