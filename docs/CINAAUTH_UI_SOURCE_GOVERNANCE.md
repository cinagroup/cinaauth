# CinaAuth UI Source Governance

## Decision

The `cinaauth-ui` repository is an upstream design and behavioral reference.
It is not a CinaAuth runtime dependency, authentication server, route owner,
or source of security policy. CinaAuth may selectively reimplement useful UI
patterns after review, but it does not install, bundle, or deploy the upstream
packages or example applications.

The reviewed source is pinned in
`third_party/better-auth-ui/UPSTREAM.lock.json`. The corresponding MIT license
is retained beside that lock. `IMPORTS.json` distinguishes behavioral review
from direct source imports. An empty `directCodeImports` array means that no
upstream module is imported at runtime; `copied: false` means that the listed
behavior was reviewed and independently reimplemented rather than copied
verbatim. The recorded source paths still provide provenance for those
adaptations.

## Ownership and Layers

Authentication UI has three separate layers:

1. Presentational primitives and patterns are owned by CinaAuth. They use
   CinaAuth design tokens, required brand slots, controlled state, and host
   callbacks.
2. An application adapter maps UI intents to the typed CinaAuth client and to
   host-owned navigation. Accounts and Admin may have separate adapters where
   their authorization boundaries differ.
3. Auth Worker, proxy, cookie, database, authorization, and protocol behavior
   remain outside the UI layer and remain authoritative.

A future shared package should be private, use explicit subpath exports, and
avoid framework-wide providers or a global query client. It should depend only
on the minimum rendering primitives required by its consumers.

## Adapter Contract

Shared UI must receive display state through props and emit typed user intents.
It must not call an authentication client, fetch an authentication endpoint,
read a route query, or choose a redirect target by itself.

Adapters must preserve distinct outcomes instead of converting them into a
generic success result. At minimum, authenticated, two-factor-required,
email-verification-required, server-redirect, session-not-fresh,
impersonation-blocked, and error outcomes remain distinguishable.

Signed OAuth and OIDC state is opaque to presentational components. The host
adapter owns `callbackURL` validation and the preservation of signed fields,
including `ba_param`, `sig`, `prompt`, `client_id`, and `redirect_uri`. The UI
must not parse, sort, reconstruct, remove, or overwrite those values.

## Component Adoption Matrix

| Source capability | Decision | CinaAuth boundary |
| --- | --- | --- |
| Password sign-in, forgot password, reset password | Adopt interaction patterns | Accounts owns AuthShell, CAPTCHA, absolute reset URL, callback validation, and client calls. |
| Email OTP and email verification | Adopt field and resend patterns | Accounts keeps type-specific OTP intent, Turnstile headers, cooldown cleanup, and strict response handling. |
| TOTP, email second factor, backup codes | Adopt the three-step and recovery UX | Accounts uses CinaAuth `twoFactor` methods and preserves Device and signed OIDC continuation state. Backup codes remain memory-only until acknowledged. |
| OAuth consent and account chooser | Adopt pure metadata and presentation patterns | Accounts renders every requested scope, keeps unknown scopes visible, never loads an untrusted remote client logo, and leaves consent requests to the CinaAuth adapter. |
| Passkey, linked accounts, sessions, and API keys | Candidate for selective presentational reuse | WebAuthn RP/origin, provider routing, recent-session step-up, impersonation, and mutation policy stay in the host and Worker. |
| Organization member and invitation basics | Candidate only after a domain adapter exists | Dynamic roles, teams, entitlements, audit, SSO, and SCIM are CinaAuth product features and cannot be flattened to the source UI model. |
| Device authorization | Candidate for state and field presentation only | The Worker owns the atomic pending-to-approved/denied transition; Accounts owns `user_code` and callback preservation. |
| Source AuthProvider, hooks, mutations, route registry, example auth server | Reject | These would create a second identity runtime or bypass CinaAuth protocol and authorization controls. |
| HeroUI implementation and theme | Reject for Accounts | Accounts remains on its existing Radix/shadcn primitives and CinaAuth design tokens. |

The current implementation is intentionally an application-level adapter, not
a general-purpose package. Extract a private `@cinaauth/auth-ui` package only
after at least two production consumers need the same presentational component
and its props can remain free of routing, client, storage, and policy logic.

## Host Adapter Result Model

Adapters must model authentication outcomes explicitly. A reusable form may
emit an intent such as `submitPassword`, `verifyOtp`, or `approveConsent`, but
the host maps its result to one of these categories:

- authenticated session;
- server-owned redirect;
- two-factor challenge;
- email verification challenge;
- recent-session step-up required;
- impersonation blocked;
- validation or transport error.

Only the host may navigate. A server-owned redirect is not interchangeable with
a session response, and an HTTP response without an error is not sufficient to
claim a successful authentication mutation.

## Delivery Roadmap

1. Maintain the already adapted form, OTP, 2FA recovery, and consent patterns.
2. Consolidate repeated Accounts security mutations behind a typed adapter
   that handles recent-session and impersonation outcomes consistently.
3. Evaluate Passkey, session, linked-account, and API-key presentation one
   component at a time, with rendered accessibility tests before extraction.
4. Add capability-driven Magic Link, phone, username, SIWE, and enterprise
   entry points only when their Worker capability and continuation contracts
   are present; hiding or inventing unsupported methods is not acceptable.
5. Revisit a shared package after Admin or another application demonstrates a
   second concrete consumer. Do not extract speculative abstractions.

## Branding, Localization, and Accessibility

- CinaAuth or product-specific brand configuration is required. Better Auth UI
  names, logos, links, storage keys, and default messages are not inherited.
- User-facing messages use stable typed keys. UI localization remains separate
  from server error translation, with an explicit fallback locale.
- Interactive components must support keyboard operation, visible focus,
  accessible names, error announcement, reduced motion, and long localized
  text.
- Social provider marks and other third-party assets require a separate
  trademark and license review before use.

## Source Synchronization

Every source review uses an exact commit, never a mutable branch name or
`latest` package selector.

1. Hydrate enough upstream history to establish provenance and compare the old
   and proposed commits. A shallow snapshot alone is not release evidence.
2. Verify the repository URL, declared version, license text and hash, and the
   paths under review.
3. Generate a read-only three-way report for the old upstream source, new
   upstream source, and the CinaAuth-owned implementation.
4. Review only allowlisted components. Port behavior manually when appropriate;
   do not perform a repository-wide namespace replacement.
5. Update the source lock and reference manifest in the same pull request.
6. Require UI, Auth Platform, and Product Security review for changes that can
   affect an authentication outcome or navigation boundary.

Routine review is quarterly. Security, accessibility, or confirmed product
requirements may trigger an earlier review. Upstream changes never overwrite
CinaAuth-owned code automatically.

## Acceptance Gates

An imported or reimplemented pattern is accepted only after all applicable
checks pass:

- The Accounts package manifest and source scan show no direct Better Auth UI
  or HeroUI dependency/import, and no direct Better Auth compatibility import
  in Accounts application source. This gate does not claim that the entire
  monorepo transitive dependency graph contains no Better Auth compatibility
  package.
- Type checking, Biome, focused unit tests, and adapter contract tests pass.
- Browser tests cover keyboard and focus behavior, ARIA semantics, light and
  dark themes, responsive layouts, and supported locales.
- Authentication regressions cover signed OAuth/OIDC navigation, safe callback
  handling, device `user_code`, two-factor continuation, recent-session
  step-up, Passkey RP/origin, cookie propagation, `no-store`, and impersonation
  recovery.
- Accounts and Admin production builds pass, and new client-side code remains
  within the agreed bundle budget.
- Staging verification covers real email delivery, configured social providers,
  and hardware Passkeys when those paths change.
- The source lock, license, import manifest, and third-party notices remain
  accurate.

## Prohibited Changes

- Do not add Better Auth UI, HeroUI, or an upstream example auth runtime as a
  direct production dependency of Accounts. Existing Better Auth compatibility
  packages elsewhere in the monorepo remain governed by their own package
  boundaries and are not evidence that Better Auth UI is bundled into Accounts.
- Do not deploy an upstream example application or its authentication server,
  database, SMTP, route, or registry configuration.
- Do not copy the upstream `AuthProvider`, query and mutation layers, server
  queries, plugin runtime, base routes, or redirect defaults.
- Do not let shared UI read URL or browser storage state, own authentication
  state transitions, or bypass the host adapter.
- Do not move Service Binding, cookie, proxy, step-up, impersonation, Passkey,
  OAuth/OIDC signature, privacy, billing, SSO, SCIM, or authorization logic into
  a UI package.
- Do not remove the upstream copyright and MIT notice from copied or
  substantially derived material.
- Do not describe a behavioral reference as a direct code import, and do not
  claim source provenance that has not been verified.

## Current Review Record

The 2026-08-13 review covers Better Auth UI version `1.6.45` at commit
`d52ec3dc178cd861d8f658d92e4a0fc15472ce71`. This governance slice records
behavioral references only. It adds no shared runtime package and copies no
upstream component implementation verbatim. Adapted behavior remains recorded
with its exact source path in `IMPORTS.json`.

The review also identified version conflicts that reinforce the source-only
decision: the source UI requires newer React, Tailwind, and React Query ranges
than the current Accounts application and introduces a second component/theme
system. Those versions must not be upgraded merely to consume the source UI.
