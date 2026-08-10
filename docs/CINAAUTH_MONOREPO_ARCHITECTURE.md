# CinaAuth monorepo deployment architecture

## Objective

CinaAuth owns authentication policy, identity data, and session issuance. The
account and admin experiences share contracts and design primitives, but remain
separate Cloudflare Workers so a frontend incident does not automatically gain
the other frontend's routing or deployment authority.

## Workspace layout

```text
cinaauth/
  apps/
    account-portal/       # accounts.cinaseek.ai
    admin-console/        # admin.cinaseek.ai
  workers/
    auth-api/             # auth.cinaseek.ai
    delivery/             # queued email/SMS delivery
    privacy-erasure/      # fail-closed downstream data erasure orchestration
  packages/
    auth-web-contract/    # DTOs, endpoint constants, roles and permissions
    auth-proxy/           # Service Binding request and cookie forwarding
    design-tokens/        # shared brand tokens, not a coupled application shell
```

The former standalone `C:\cinagroup\cinaadmin` repository is retained as a
recovery source. Its application source is integrated under
`apps/admin-console`; its Git history and working tree are not modified by this
migration.

## Deployment boundaries

| Deployment | Audience | Authority | Cloudflare dependency |
| --- | --- | --- | --- |
| `accounts.cinaseek.ai` | normal users | login, recovery, account and organization self-service | `AUTH_WORKER -> cinaauth-api` |
| `admin.cinaseek.ai` | `super_admin`, `security_admin` | privileged operational workflows | `AUTH_WORKER -> cinaauth-api` |
| `auth.cinaseek.ai` | applications and internal frontends | session issuance, policy enforcement, OAuth/OIDC and identity data | Hyperdrive, Durable Objects, Queues, `CINAAUTH_DELIVERY_SERVICE -> cinaauth-delivery` |
| `cinaauth-delivery.cinagroup.com` | Auth Worker and provider acceptance only | signed email/SMS dispatch and per-channel readiness | Resend, Twilio, replay-prevention KV |
| `cinaauth-erasure.cinagroup.com` | Auth Worker only | idempotent downstream privacy erasure coordination | SQLite Durable Objects, signed HTTPS targets |

Browser authentication stays same-origin on each frontend. Server route
handlers rebuild the upstream request and call the Auth Worker through Service
Binding. Public `auth.cinaseek.ai` fetch is only the local-development fallback.
Every proxy response preserves separate `Set-Cookie` headers and disables
caching for authentication responses.

## Authorization model

`packages/auth-web-contract` is the source of truth for the admin role names and
permission matrix:

- `super_admin`: user lifecycle, role changes, bans, session revocation,
  impersonation, and statistics.
- `security_admin`: user/security reads, bans, session revocation, and
  statistics; no user creation/deletion, role changes, password changes, or
  impersonation.
- `user`: no admin permissions.

The Auth Worker enforces these permissions. Frontend checks only hide or disable
controls and are never treated as the security boundary. The admin console
forwards the acting user's session cookie; no service key bypass is required.

The same contract package also owns the versioned public authentication
capability DTO. Auth derives delivery-backed methods from the Delivery Worker's
authorized readiness response. Account surfaces treat missing, malformed, or
unavailable readiness as disabled, while Auth independently returns a fail-closed
503 before any delivery-producing endpoint reaches the authentication handler.

## Entry-point policy

- `/admin` on the account portal permanently redirects to
  `https://admin.cinaseek.ai`.
- `demo-auth.cinagroup.com` remains temporarily attached to the account Worker
  only to issue a permanent redirect to `accounts.cinaseek.ai`.
- The legacy hostname remains in the explicit Auth/Turnstile allow-list during
  the redirect window. It can be removed after traffic and OAuth callback logs
  show no remaining clients.

## Independent delivery

- `.github/workflows/deploy-account-portal.yml` deploys only the account portal.
- `.github/workflows/deploy-admin-console.yml` deploys only the admin console.
- `.github/workflows/deploy-cloudflare.yml` deploys Delivery, Privacy Erasure,
  and the authoritative Auth Worker. Auth deploy waits for both supporting
  workers to pass their remote gates.

Changes to a shared package trigger only its consumer workflows. Each frontend
has its own concurrency group, test/build gate, Cloudflare deployment, and smoke
test.

## Data and rate limiting

The Auth Worker is the only deployment that owns database access. It connects to
PostgreSQL through Hyperdrive binding `374f6da17aff4c968cadd8d6aa454c22`.
Authentication limits are coordinated by `RateLimitDurableObject`, so limits do
not reset independently per Worker isolate. Query caching stays disabled for
session and authorization data to avoid serving revoked or role-stale identity
state.

Account deletion calls the separate Privacy Erasure Worker before local identity
deletion. One SQLite Durable Object owns each stable operation ID and persists
only keyed subject, target-set, and evidence digests. Missing targets, pending
targets, invalid evidence, or downstream failures return a non-success result and
leave the local account intact. An empty target list is therefore a deliberate
bootstrap state, not a successful erasure configuration.
