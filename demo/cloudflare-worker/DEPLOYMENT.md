# CinaAuth Cloudflare Worker Deployment

This Worker is designed for `https://auth.cinagroup.com` and keeps slow
out-of-band delivery work off the request path with Cloudflare Queues.

## One-time Cloudflare setup

```sh
pnpm --dir demo/cloudflare-worker exec wrangler whoami
pnpm --dir demo/cloudflare-worker exec wrangler queues create cinaauth-delivery
pnpm --dir demo/cloudflare-worker exec wrangler queues create cinaauth-delivery-dlq
```

Set secrets with Wrangler; do not put secret values in `wrangler.json`.
`CINAAUTH_SECRET` must be at least 32 characters. The Worker returns `503`
with a structured `cinaauth.runtime_config_invalid` log if the auth secret,
D1 binding, migration token, Queue binding, HTTPS delivery webhook,
delivery webhook secret, or HTTPS auth URL is missing.
`CINAAUTH_MIGRATION_TOKEN` and `CINAAUTH_DELIVERY_WEBHOOK_SECRET` should also
be at least 32 characters. Do not reuse `CINAUTH_ADMIN_SERVICE_KEY` as the
migration token; migrations and readiness checks are operational privileges and
should be scoped separately from admin/audit access.

For local development, copy `.dev.vars.example` to `.dev.vars` and replace the
placeholder values. `.dev.vars` is ignored by Git; keep the example file as the
only tracked local-secret template.

```sh
pnpm --dir demo/cloudflare-worker run provision:secrets
```

If you deploy the included delivery Worker, set
`CINAAUTH_DELIVERY_WEBHOOK_URL` to
`https://cinaauth-delivery.cinagroup.com/cinaauth/delivery` and use the same
`CINAAUTH_DELIVERY_WEBHOOK_SECRET` value on both Workers. The provisioning
script checks `https://cinaauth-delivery.cinagroup.com/ready` before writing
auth Worker secrets, so the auth Worker is not pointed at an unready delivery
service. Set `CINAAUTH_SKIP_DELIVERY_READY_CHECK=1` only for emergency recovery.

Optional plugin secrets:

```sh
pnpm --dir demo/cloudflare-worker exec wrangler secret put OAUTH_PAIRWISE_SECRET
pnpm --dir demo/cloudflare-worker exec wrangler secret put GENERIC_OAUTH_CONFIG
pnpm --dir demo/cloudflare-worker exec wrangler secret put GOOGLE_CLIENT_ID
pnpm --dir demo/cloudflare-worker exec wrangler secret put CLOUDFLARE_TURNSTILE_SECRET_KEY
pnpm --dir demo/cloudflare-worker exec wrangler secret put STRIPE_SECRET_KEY
pnpm --dir demo/cloudflare-worker exec wrangler secret put STRIPE_WEBHOOK_SECRET
pnpm --dir demo/cloudflare-worker exec wrangler secret put STRIPE_DEFAULT_PRICE_ID
pnpm --dir demo/cloudflare-worker exec wrangler secret put STRIPE_DEFAULT_PLAN_NAME
pnpm --dir demo/cloudflare-worker exec wrangler secret put CINAUTH_ADMIN_SERVICE_KEY
```

## Deploy and migrate

```sh
pnpm install --filter @cinaauth/cloudflare-worker... --frozen-lockfile
pnpm --filter @cinaauth/cloudflare-worker^... build
pnpm --dir demo/cloudflare-worker run check:production
pnpm --dir demo/cloudflare-worker run provision:secrets
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... pnpm --dir demo/cloudflare-worker run check:cloudflare
pnpm --dir demo/cloudflare-worker run cf-typegen:check
pnpm --dir demo/cloudflare-worker exec wrangler deploy --dry-run --outdir=dist
pnpm --dir demo/cloudflare-worker exec wrangler deploy
```

`check:production` statically verifies the Worker route, D1 binding, Queue/DLQ
configuration, Worker version metadata binding, protected migration/readiness
endpoints, CI deploy gates, and local secret-template hygiene. It catches drift
before a real Cloudflare deploy.

`check:cloudflare` is the remote preflight. It reads `CLOUDFLARE_API_TOKEN`
or `CF_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID` from the current environment and
checks Cloudflare for the configured D1 database, Queue/DLQ resources, required
Worker secret names, zone, Worker route ownership, and public auth endpoint
state. It never prints secret values. A missing `/api/ready` endpoint is a
warning before the first hardened deploy; a public readiness endpoint that
returns success without a migration token is a hard failure.

By default, optional third-party plugin inputs are reported as warnings because
first deployments may not yet have Stripe, Google One Tap, Turnstile, or generic
OAuth credentials. For a full commercial rollout where every configured plugin
must be operational, run the same preflight with
`CINAAUTH_REQUIRE_ALL_PLUGIN_INPUTS=1`; missing optional plugin inputs then
become hard failures.

After the Worker is deployed, run plugin migrations through the protected
endpoint:

```sh
curl https://auth.cinagroup.com/api/migrate \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"

curl -X POST https://auth.cinagroup.com/api/migrate \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"
```

`GET /api/migrate` previews the pending table/field changes and returns the
required table checklist. `POST /api/migrate` applies the same migration plan.
Both endpoints return `Cache-Control: no-store`.

Do not use `wrangler d1 migrations apply` for this demo. The Worker enables
many CinaAuth plugins dynamically, so the protected `/api/migrate` endpoint
uses CinaAuth's own migration planner with the same plugin list that production
uses at runtime.

The Worker stores rate-limit buckets in D1 (`storage: "database"`) so limits
are shared across Cloudflare isolates instead of resetting per process. Confirm
that the `rateLimit` table exists after migration before sending production
traffic. Unhandled request errors are logged as structured
`cinaauth.request.failed` events and return a generic no-store `500` response,
so stack traces are not exposed to clients.

## GitHub Actions gate

The repository workflow `.github/workflows/deploy-cloudflare.yml` expects these
GitHub secrets before production deployment:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CINAAUTH_SECRET`
- `CINAAUTH_MIGRATION_TOKEN`
- `CINAAUTH_DELIVERY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `RESEND_EMAIL_FROM`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

The delivery job runs first. It checks `demo/delivery-worker`, dry-run builds
it, deploys `cinaauth-delivery`, provisions Resend/Twilio/shared delivery
secrets through stdin, verifies `pnpm run check:cloudflare`, and requires
`https://cinaauth-delivery.cinagroup.com/ready` with the shared delivery secret
authorization header to return HTTP 200.

The Worker API job runs only after delivery is ready. It runs `pnpm run check`,
provisions core auth Worker secrets through stdin, verifies that the required
remote D1, Queue/DLQ, Worker secrets, zone, and route already exist in
Cloudflare with `pnpm run check:cloudflare`, runs `pnpm run build`, deploys the
Worker, then calls `GET /api/migrate`, records a pre-migration Time Travel
restore point with `wrangler d1 time-travel info cinaauth-db` (a bad migration
can be rolled back with `wrangler d1 time-travel restore cinaauth-db
--bookmark=<id>`), then calls `POST /api/migrate` and `GET /api/ready`. The
demo site deploy only starts after the Worker is deployed, backed up, migrated,
and ready. After the demo Worker deploys, CI smoke-tests the public homepage and
`/api/auth/get-session` proxy on `https://demo-auth.cinagroup.com`.

CI intentionally fails before deployment if any of these provisioned Worker
secrets are missing:

- `CINAAUTH_SECRET`
- `CINAAUTH_MIGRATION_TOKEN`
- `CINAAUTH_DELIVERY_WEBHOOK_URL`
- `CINAAUTH_DELIVERY_WEBHOOK_SECRET`

## Operational checks

Use the protected readiness endpoint first. It checks runtime configuration,
the required D1 tables, Queue binding, HTTPS delivery webhook configuration, and
database-backed rate limiting without exposing secret values. It also returns
the current `VERSION_METADATA` values (`id`, `tag`, and `timestamp`) so CI and
operators can correlate readiness, migration failures, logs, and rollbacks to
the exact Worker version Cloudflare is serving:

```sh
curl https://auth.cinagroup.com/api/ready \
  -H "Authorization: Bearer $CINAAUTH_MIGRATION_TOKEN"
```

The endpoint returns HTTP 200 only when the Worker is ready for traffic. It
returns HTTP 503 with a structured JSON body when required secrets, bindings, or
tables are missing. Like the migration endpoints, readiness responses are marked
`Cache-Control: no-store`.

```sh
pnpm --dir demo/cloudflare-worker exec wrangler queues list
pnpm --dir demo/cloudflare-worker exec wrangler d1 export cinaauth-db --remote --output cinaauth-db-backup.sql
pnpm --dir demo/cloudflare-worker exec wrangler tail cinaauth-api --format pretty
pnpm --dir demo/cloudflare-worker exec wrangler d1 execute cinaauth-db --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('user','session','account','verification','rateLimit') ORDER BY name;"
curl -i https://auth.cinagroup.com/
```

If the delivery webhook is down or returns non-2xx responses, auth requests
still enqueue delivery messages and the queue consumer retries them. Messages
that exceed the configured retry limit move to `cinaauth-delivery-dlq`.
The consumer is capped at 5 concurrent Worker invocations with up to 10
messages processed in parallel per batch, retries after at least 30 seconds,
and uses a 60-second visibility timeout to protect downstream email/SMS
providers during backlog spikes.

Delivery webhook requests include:

- `Authorization: Bearer $CINAAUTH_DELIVERY_WEBHOOK_SECRET`
- `X-CinaAuth-Delivery-Id`
- `X-CinaAuth-Delivery-Timestamp`
- `X-CinaAuth-Delivery-Signature`

Verify the signature as `v1=` + hex HMAC-SHA256 over
`{timestamp}.{deliveryId}.{rawRequestBody}` using
`CINAAUTH_DELIVERY_WEBHOOK_SECRET`. Reject stale timestamps to reduce replay
risk.
