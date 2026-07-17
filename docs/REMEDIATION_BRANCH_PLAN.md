# Cloudflare Deployment — Tested-Branch Remediation Plan

Items that could **not** be landed safely from a working session because they touch
the core framework / CI and need the full package test suite (and ideally a staging
deploy) to validate. Each is scoped with exact files, the change, the test strategy,
and the risk. Do these on a branch, not against `main` directly.

Companion to the applied fixes (F-01, F-02, B-01, B-02, B-07/08, B-09, D-03, D-09,
S-01/02, S-03), which are already in the working tree and verified.

**Suggested order:** D-11 → D-04 → D-05 → D-02 + D-10 → B-03 → D-01.

---

## B-03 — Move rate limiting off D1  ⚠️ corrected approach: native binding, NOT KV

**Why not KV (the audit's first suggestion):** two blockers.
1. `secondaryStorage.increment` (used by the rate limiter at
   `packages/cinaauth/src/api/rate-limiter/index.ts:302-310`) has **no atomic
   equivalent in Workers KV** — a get-then-put races under exactly the burst
   traffic rate limiting defends against, silently under-counting.
2. Setting `secondaryStorage` also reroutes **sessions** to KV
   (`packages/cinaauth/src/db/internal-adapter.ts:288,342`) unless
   `session.storeSessionInDatabase: true` is also set — a much bigger, riskier
   change than intended.

**Recommended:** Cloudflare's native **Rate Limiting binding** (per-PoP, atomic,
purpose-built) via a Hono middleware, keeping sessions in D1.

- [ ] `demo/cloudflare-worker/wrangler.json`: add a rate-limit binding, e.g.
      `"ratelimits": [{ "name": "AUTH_RL", "namespace_id": "1001", "simple": { "limit": 300, "period": 60 } }]`
      (confirm the exact schema for your wrangler version).
- [ ] `demo/cloudflare-worker/src/worker-configuration.d.ts` / `env.d.ts`: add the
      `AUTH_RL: RateLimit` binding type.
- [ ] `src/index.ts`: add a middleware on `/api/auth/*` that derives the client IP
      (`cf-connecting-ip`) and calls `await c.env.AUTH_RL.limit({ key: \`${ip}:${path}\` })`,
      returning 429 on `!success`. Add a tighter limiter for `/sign-in*`,
      `/sign-up*`, `/change-password*` (the scrypt-heavy paths).
- [ ] `src/auth.ts`: disable cinaauth's `rateLimit` (or narrow it to non-hot paths)
      so requests stop writing the `rateLimit` D1 row on every call.
- **Tradeoff:** native RL is per-PoP (not globally exact) — standard and fine for
  abuse control. Use a Durable Object counter only if you need globally-exact limits.
- **Test:** unit-test the middleware with a mocked `AUTH_RL.limit`; validate under
  `wrangler dev`.

---

## D-01 — Atomic D1 transactions

**Scope:** `packages/kysely-adapter` + the `packages/core` adapter contract.
**Blast radius:** every `runWithTransaction` call site in the framework. **High risk.**

- [ ] Implement a D1-specific `transaction` that **collects** compiled write
      statements and flushes them with `db.batch(statements)` (documented atomic).
      Works only for **write-only, read-free** callbacks — cinaauth pre-generates
      ids in `transformInput`, so `create` can return input data synchronously.
- [ ] Enable it **only** for write-only cascades: `deleteUser`, org create/delete,
      team delete, sign-up (create user + account).
- [ ] For read-then-write flows, **do not batch.** In particular **leave OAuth
      refresh rotation as-is** — `packages/oauth-provider/src/token.ts:385-395` uses
      an atomic compare-and-swap that is correct; the reorder the audit suggested is
      a **security regression** (concurrent requests could each mint a token).
- [ ] Make the batching adapter **throw on any read** inside the callback, so misuse
      is caught rather than silently returning stale data.
- [ ] Wire `config.transaction` for D1 in `packages/kysely-adapter/src/dialect.ts`
      (currently `transaction: false`).
- **Test (required):** a D1 integration test (miniflare/wrangler) asserting
  all-or-nothing — kill mid-batch, confirm no partial state (e.g. no `user` row
  without its `account`). Run the **entire** `kysely-adapter` + `cinaauth` suites;
  unit tests use in-memory SQLite and will NOT exercise the D1 batch path, so the
  integration test is the real gate.

---

## D-04 — SQLite required-column migrations

**File:** `packages/cinaauth/src/db/get-migration.ts` (addColumn path ~447-471).

- [ ] For `dbType === "sqlite"`, when adding a **required** column: emit
      `defaultTo(field.defaultValue)` if a literal default exists; otherwise add the
      column **nullable** and log a "backfill required" warning. Never emit
      `notNull()` without a default on sqlite (SQLite rejects it outright).
- **Why it matters:** today the first plugin upgrade that adds a required field to an
  existing table makes `POST /api/migrate` fail **deterministically** on D1.
- **Test:** add a case to `get-migration-schema.test.ts` — required-field addition on
  sqlite must produce valid SQL.

---

## D-05 — Migration drift detection

**Files:** `get-migration.ts` (matchType warn ~262-268) + `demo/.../src/index.ts` `/api/migrate`.

- [ ] Collect column type mismatches into a `driftWarnings[]` array returned from
      `getMigrations`.
- [ ] Surface it in the `GET/POST /api/migrate` JSON.
- [ ] Make the CI "Preview Worker migrations" step fail when `driftWarnings` is
      non-empty (forces a deliberate manual rebuild migration).
- **Test:** unit test that a column type change yields a `driftWarning`.

---

## D-11 — Idempotent, atomic migration runner

**File:** `get-migration.ts` `runMigrations` (~558-562) + createTable/createIndex builders.

- [ ] Add `.ifNotExists()` to `createTable` / `createIndex`.
- [ ] When the database is a `D1Database`, execute compiled statements via
      `db.batch()` chunks (atomic per chunk) instead of a sequential loop.
- [ ] Only after this: add `--retry 5 --retry-all-errors` to the `POST /api/migrate`
      curl in `deploy-cloudflare.yml` (retry is unsafe while migrations aren't
      idempotent — a retry after partial success hits "table already exists").
- **Test:** run migrate twice — the second run is a no-op; a mid-run failure leaves
  no half-applied schema.

---

## D-02 + D-10 — Gradual deployments, staging, rollback (CI)

**File:** `.github/workflows/deploy-cloudflare.yml`, `demo/cloudflare-worker/wrangler.json`.

- [ ] `wrangler.json`: add an `env.staging` block (separate worker name, D1
      `database_id`, and route e.g. `auth-staging.cinagroup.com/*`).
- [ ] Split CI into a **staging** job (deploy + migrate + ready + smoke) that gates
      the **production** job via `needs:`.
- [ ] Production job: replace `wrangler deploy` with
      `wrangler versions upload` (no traffic) → run `POST /api/migrate` + `GET
      /api/ready` against the **preview version URL** → `wrangler versions deploy` to
      shift 100% only after readiness passes.
- [ ] Add a `wrangler rollback` step on failure.
- **Why it matters:** today `wrangler deploy` cuts over 100% instantly, then migrates
  — new code serves against the old schema for the whole window, with no rollback.
- **Test:** validate on the new staging environment before enabling for prod. Not
  unit-testable — this is a deploy-flow change.

---

### Not in scope here (already handled or needs only your input)
- **S-03** (trusted-origin allowlist) — applied; confirm the subdomain list is complete.
- **D-06** (OAuth/device pages coupled to the demo app) — architectural; host the
  login/consent/device UI on the auth origin, or accept + monitor the coupling.
- **S-05** (delivery Bearer == HMAC secret), **S-07** (DLQ consumer/alerting) — small,
  can be done in a normal session when you want them.
