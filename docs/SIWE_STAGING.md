# SIWE staging isolation and acceptance

This document defines the staging boundary required before enabling the
production SIWE/Reown rollout. A staging deployment is an independent identity
environment, not a second route to production data.

## Current status

- Phase A prepares fail-closed runtime configuration and transport boundaries.
- Phase B is blocked until every external staging resource below has a real,
  reviewed identifier.
- Do not add a partial `env.staging` section or placeholder resource IDs.
- Do not use the production OIDC demo, Reown project, database, storage,
  queues, Secrets Store, or service bindings for staging acceptance.

The repository currently exposes only a non-deployable foundation gate:

```powershell
pnpm --dir workers/auth-api run check:siwe-staging-foundation
pnpm --dir workers/auth-api run test:siwe-staging-inventory
```

The gate fails if any participating Wrangler configuration contains an
`env.staging` block or if a `deploy-siwe-staging` workflow exists. This is
intentional: the complete environment profiles and reviewed deployment
workflow must arrive together after all real external resource identifiers are
available. There is no checked-in staging inventory instance or placeholder
configuration.

`scripts/verify-siwe-staging.mjs --inventory <repo-relative-path>` can validate
a future public-only inventory contract, but it does not authorize deployment
or validate remote state. The inventory is strict and must include canonical
unique origins, distinct staging Worker/resource names and IDs, an isolated
Secrets Store record map, OIDC identity metadata, a SHA-256 digest of the Reown
project ID, and the fixed SIWE/Passkey safety contract. Validation errors emit
only issue codes and field paths, never rejected values.

Inventory validation also requires
`SIWE_PRODUCTION_REOWN_PROJECT_ID_SHA256` and
`SIWE_STAGING_REOWN_PROJECT_ID_SHA256` in the process environment. Compute
these digests inside the protected environment from the corresponding Project
IDs; do not pass either raw Project ID on the command line. The staging digest
must match the inventory and must differ from production. The inventory state
name is `inventory-complete`; it never means that remote resources are ready.

Wrangler environment bindings and variables are non-inheritable. Every
staging binding must therefore be repeated explicitly, and every staging
Wrangler command must include `--env staging`.

## Phase A runtime contract

### Auth Worker

The Worker must derive all browser-facing authentication locations from one
validated environment profile:

- `CINAAUTH_URL`
- `CINAAUTH_ACCOUNT_ORIGIN`
- `CINAAUTH_ADMIN_ORIGIN`
- `CINAAUTH_PASSKEY_RP_ID`
- optional `CINAAUTH_LEGACY_ACCOUNT_ORIGIN`
- optional all-or-nothing OIDC acceptance profile:
  `CINAAUTH_OIDC_DEMO_ENVIRONMENT`, `CINAAUTH_OIDC_DEMO_ORIGIN`, and
  `CINAAUTH_OIDC_DEMO_CLIENT_ID`

Every configured origin must be a canonical HTTPS origin without credentials,
an explicit port, path, query, fragment, wildcard, or trailing slash. Missing
required values and malformed optional values fail closed. Omitting an optional
origin disables that trust relationship; an empty string does not. The three
OIDC acceptance values must be configured together. Its issuer and Accounts
origin are taken from the same validated Auth profile, and any production value
retained in a staging OIDC profile is rejected.

The same validated profile must control:

- CinaAuth trusted origins and exact CORS origin matching;
- social and Generic OAuth callbacks;
- OAuth login, signup, consent, and account-selection pages;
- device verification URI and valid audiences;
- Passkey RP ID and browser origin;
- Turnstile allowed hostnames;
- Admin and OIDC demo client reconciliation;
- audit-site and generated email-domain metadata.

When SIWE is enabled, its RP URI must equal the configured Accounts origin and
its RP domain must equal the Accounts hostname. The Passkey RP ID must equal
the Accounts hostname or a parent domain. Production continues to use
`cinaseek.ai`; changing it would invalidate existing Passkeys.

### Account Portal

`CINAAUTH_REQUIRE_AUTH_WORKER_BINDING` uses a secure default:

- exact `false`: local development may use the explicitly configured public
  Auth URL;
- `true`, missing, or malformed: `AUTH_WORKER` is mandatory;
- a missing mandatory binding returns a generic `503` JSON response with
  `Cache-Control: no-store` and never calls the public Auth origin;
- an existing binding is always used, and binding errors never trigger a
  public fallback.

Server-side Auth URLs are required in binding-required mode. Missing or invalid
configuration must not fall back to `https://auth.cinaseek.ai`.

## Phase B external resources

Create and review these resources before adding deployable `env.staging`
configuration:

- exact HTTPS custom domains for Auth, Accounts, Admin, Delivery, Privacy
  Erasure, and the OIDC acceptance client;
- an isolated PlanetScale staging database or branch containing synthetic data
  only;
- an isolated Hyperdrive binding to that database;
- an empty staging `LEGACY_D1` database for the current cutover contract;
- an isolated privacy-export R2 bucket;
- delivery, delivery DLQ, privacy-export, and privacy-export DLQ queues;
- a delivery replay KV namespace;
- isolated Delivery and Privacy Erasure Workers;
- an isolated Secrets Store containing staging-only Delivery HMAC, Erasure
  HMAC, Admin OIDC client, Admin OIDC bridge, Delivery configuration KEK, and
  Erasure configuration KEK records;
- staging-only Auth Worker secrets for `CINAAUTH_SECRET`,
  `CINAAUTH_MIGRATION_TOKEN`, Delivery/Erasure endpoint configuration, and
  `CINAAUTH_PRIVACY_EXPORT_KEY`;
- a staging-only `CINAAUTH_ERASURE_STORAGE_SECRET` for the Privacy Erasure
  Worker;
- a staging Reown project whose origin allowlist contains only the exact
  staging Accounts origin;
- an isolated OIDC acceptance client, client ID, redirect URI, and demo app;
- a GitHub `siwe-staging` environment with required reviewers, protected-branch
  policy, a staging-only Cloudflare token, and staging-only secrets.

Use staging-specific GitHub secret names, including
`SIWE_STAGING_CLOUDFLARE_API_TOKEN`,
`SIWE_STAGING_CLOUDFLARE_ACCOUNT_ID`, and
`SIWE_STAGING_REOWN_PROJECT_ID`. Do not reference the repository-level
production names from a staging workflow: a missing same-named environment
secret can otherwise resolve to its repository-level value.

Secret values are never tracked, written to command-line arguments, persisted
to artifacts, or printed. Provision them from the protected environment via
stdin, and include `--env staging` on every Wrangler secret operation.

## Complete Wrangler environment

Only after the real resources exist, add complete named environments for every
participating Worker. The Auth `env.staging` block must explicitly restate:

- all vars;
- Hyperdrive;
- Secrets Store bindings;
- Delivery and Erasure service bindings;
- D1 and R2 bindings;
- Durable Object bindings and exports;
- queues and DLQs;
- triggers;
- the staging custom domain.

The staging gate must additionally enforce these exact safety values:

- `CINAAUTH_CUTOVER_STATE=live`;
- `CINAAUTH_SIWE_ENABLED=true`;
- `CINAAUTH_SIWE_ALLOWED_CHAIN_IDS=1`;
- SIWE RP domain and URI equal the staging Accounts hostname and origin;
- `CINAAUTH_SIWE_ALLOW_LEGACY=false`;
- `CINAAUTH_SIWE_AUTO_SIGNUP=false`.

The Account Portal staging profile must explicitly declare its custom domain,
`AUTH_WORKER -> cinaauth-api-staging`, staging Auth/Accounts URLs, and
`CINAAUTH_REQUIRE_AUTH_WORKER_BINDING=true`. Its build-time wallet flag must
equal the tracked staging SIWE switch. The separate staging Reown Project ID is
injected as `NEXT_PUBLIC_REOWN_PROJECT_ID` by the protected GitHub
`siwe-staging` environment during the build; it is not a tracked Wrangler
runtime var. Never let a missing staging value resolve to a root production
value.

Static isolation checks must reject any staging profile containing a production
domain, Worker service name, database/storage ID, queue name, Secrets Store ID,
or Reown/OIDC identifier. In particular, `CINAAUTH_ADMIN_ORIGIN` must be an
exact staging origin and must not equal the production Admin origin. Phase B
may reserve this origin solely for the Auth/OIDC trust contract without
deploying the Admin Console; Admin UI acceptance is outside this staging phase
unless an isolated Admin deployment is explicitly added.

## Dedicated staging workflow

Use a separate `deploy-siwe-staging.yml`; do not parameterize the production
workflow.

Required controls:

1. manual dispatch with an exact staging attestation;
2. GitHub environment `siwe-staging` and a distinct concurrency group;
3. config/schema/isolation checks before all writes;
4. every Wrangler operation includes `--env staging`;
5. Delivery and Erasure deploy and readiness before Auth;
6. Auth dry-run, deploy, isolated migration, authorized readiness, and binding
   audit before Accounts;
7. Accounts build/deploy and wallet-readiness parity after Auth;
8. isolated OIDC demo deploy and protocol smoke;
9. record each deployed version ID for rollback.

Existing production provisioning/configuration scripts must not be used until
they accept an explicit environment and are covered by tests that reject an
omitted environment.

## Real-wallet acceptance

Use only a dedicated test wallet with no valuable assets. Never record its seed,
private key, raw signature, session cookie, WalletConnect URI, or full address.

The minimum manual/browser matrix is:

- wallet UI hidden while the build or capability gate is off;
- unknown wallet rejected while auto-signup is disabled;
- authenticated user links a wallet after fresh-session verification;
- after logout, the linked wallet creates the expected session;
- Ethereum mainnet is accepted and an unapproved chain is rejected;
- connection and signature rejection leave no session or link behind;
- signed OIDC authorization resumes after SIWE sign-in;
- injected-wallet and WalletConnect mobile paths both work;
- no transaction or typed-data signing request is emitted;
- challenge, proof, session, and OAuth continuation remain single-use.

Production activation remains blocked until this matrix passes against the
isolated environment and the independent production recovery/approval gates are
also satisfied.
