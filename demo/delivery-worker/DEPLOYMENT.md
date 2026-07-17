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
pnpm --dir demo/delivery-worker run test
pnpm --dir demo/delivery-worker run cf-typegen:check
pnpm --dir demo/delivery-worker exec tsc --noEmit
pnpm --dir demo/delivery-worker run build
pnpm --dir demo/delivery-worker run deploy
```

Then set runtime secrets. Use the same `CINAAUTH_DELIVERY_WEBHOOK_SECRET`
value on this Worker and on the main `cinaauth-api` Worker. The provisioning
script reads values from environment variables and sends them to Wrangler over
stdin, so secret values do not appear in command-line arguments.

```sh
pnpm --dir demo/delivery-worker run provision:secrets
```

Point the main Worker at this endpoint:

```sh
pnpm --dir demo/cloudflare-worker exec wrangler secret put CINAAUTH_DELIVERY_WEBHOOK_URL
# value: https://cinaauth-delivery.cinagroup.com/cinaauth/delivery
```

## Verify And Deploy

```sh
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm --dir demo/delivery-worker run check:cloudflare
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
