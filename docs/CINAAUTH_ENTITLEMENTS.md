# CinaAuth Entitlement contract

This document defines the provider-independent commercial access contract used
by the Auth Worker and both independently deployed frontends. Stripe supplies
checkout and webhook-synchronized subscription state; it is not the source of
feature-policy truth.

## Runtime model

`GET /api/auth/entitlements` authenticates against the authoritative database
session and returns a versioned `EntitlementSnapshot`. An optional exact
`organizationId` selects an organization subject, after the Worker verifies
that the caller is a current member. Responses are private, `no-store`, and are
computed from local PostgreSQL state rather than an inline Stripe request.

There are two modes:

* `unmetered`: the Stripe group is absent or incomplete. Existing product
  access is preserved explicitly and checkout stays disabled.
* `subscription`: the complete Stripe group and policy are valid. An active or
  trialing webhook-synchronized subscription selects its mapped plan; otherwise
  the configured default plan applies.

Unknown plans, duplicate active subscriptions, storage failures, and invalid
policies fail closed. They never silently fall back to a more permissive plan.

## Atomic Billing configuration

Billing is advertised only when all of these inputs agree:

* `STRIPE_SECRET_KEY`
* `STRIPE_WEBHOOK_SECRET`
* `STRIPE_DEFAULT_PRICE_ID`
* `CINAAUTH_ENTITLEMENT_CONFIG`
* optional `STRIPE_DEFAULT_PLAN_NAME` (defaults to `default`)

The selected Stripe plan name must exist in the entitlement policy. Provision
the values together through environment variables and Wrangler stdin; do not
put them in tracked files or CLI arguments.

The JSON policy is strict: every feature and limit is required, unknown keys
are rejected, limits are non-negative integers or `null`, and a plan ID must
start with a lowercase letter and contain only lowercase letters, numbers,
underscores, or hyphens.

This is a schema example, not an approved production catalog:

```json
{
  "version": 1,
  "defaultPlan": "pro",
  "plans": {
    "pro": {
      "features": {
        "sso": true,
        "scim": true,
        "organizationAudit": true,
        "teams": true,
        "dynamicRoles": true,
        "oauthClients": true,
        "apiKeys": true
      },
      "limits": {
        "organizationMembers": null,
        "teams": null,
        "teamMembers": null,
        "dynamicRoles": null,
        "oauthClients": null,
        "apiKeys": null,
        "auditRetentionDays": null
      }
    }
  }
}
```

`null` means unbounded. A numeric value, including `0`, is an explicit limit.

Without an active Billing configuration, resource counts remain unbounded but
`auditRetentionDays` is explicitly `90`, matching the deployed scheduled
retention job. It is not reported as unlimited.

## Authorization and freshness

User subscriptions use the authenticated user ID as their reference.
Organization subscriptions use the organization ID, and only a current
organization `owner` or `admin` may manage checkout, cancellation, restoration,
or the Customer Portal. The Worker queries current membership rather than
trusting client input. Billing mutations also require a fresh authoritative
session under the same recent-authentication policy as other sensitive writes.

## Server enforcement

The Auth Worker applies the same snapshot before these protected operations:

* API Key and OAuth Client creation, including finite count limits;
* team creation, team updates, and team-member addition;
* dynamic-role creation and updates;
* SSO registration, provider updates, and domain verification;
* SCIM token generation;
* organization audit reads.

Feature denial returns `ENTITLEMENT_FEATURE_DISABLED` with HTTP 403. A reached
finite limit returns `ENTITLEMENT_LIMIT_REACHED` with HTTP 409. Ambiguous
subscriptions, unmapped plans, storage failures, and unavailable authoritative
usage fail closed with HTTP 503. Delete, remove, and revoke operations remain
available so a downgraded customer can clean up resources.

Runtime feature gates also cover SSO sign-in and callbacks, SCIM bearer
provisioning, API Key verification, and OAuth authorization/token flows.
Organization invitation acceptance, direct member addition, SSO provisioning,
domain assignment, and SCIM provisioning share one PostgreSQL advisory-lock key
for finite `organizationMembers` limits. The SSO membership write and complete
SCIM user/account/member transaction remain inside that lock; existing members
are idempotent and do not consume another slot. UI state is never treated as an
authorization boundary.

## Database freshness and retention

The production Hyperdrive configuration deliberately disables query caching
for session, membership, subscription, and entitlement reads. Hyperdrive still
provides connection pooling; disabling query caching prevents a write from
being followed by stale authorization or billing state.

The `subscription.referenceId` field is indexed for entitlement and retention
lookups. Before Billing is activated, preview and apply the generated
subscription migration and verify the index exists in PostgreSQL.

Audit retention uses the same plan policy. Non-organization events retain the
deployment default of 90 days. Organization events use the effective plan's
`auditRetentionDays`; `null` preserves them, while an unknown plan or multiple
active/trialing subscriptions preserves data instead of deleting under an
ambiguous policy. The entitlement endpoint still surfaces that ambiguity as
HTTP 503 for operator investigation.

## Frontend behavior

The Account Portal enables subscription queries and actions only when both are
true:

1. live capabilities advertise `billing=true`;
2. the entitlement snapshot is available in `subscription` mode.

The capability or entitlement request failing leaves checkout disabled. The
Admin Console may display entitlement state, but must not bypass the Auth
Worker or implement a second plan matrix.

## Production rollout

1. Approve the product catalog, migration behavior, Price IDs, seat policy,
   trial behavior, refund/cancellation policy, and support runbook.
2. Create Stripe Products and Prices and verify the webhook destination.
3. Provision the complete configuration group atomically.
4. Deploy the Auth Worker, verify capabilities and entitlement snapshots, then
   deploy the Account Portal.
5. Run real Checkout, webhook, subscription update, cancellation, restoration,
   Customer Portal, owner/admin authorization, and non-admin denial E2E.
6. Complete and verify the remaining usage-time and transaction-level gates
   listed above before selling a limited plan.

Do not turn on production Billing until all rollout checks above are evidenced.
