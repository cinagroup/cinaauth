# Authentication UI Design QA

Date: 2026-08-13
Scope: CinaSeek Accounts sign-in/sign-up and CinaSeek Admin login

## Reference and implementation boundary

- Visual references: `C:\Users\cina\Desktop\zaidan-sign-in-dark.png` and `C:\Users\cina\Desktop\shadcn-sign-in-dark.png` (the supplied files are visually identical).
- Adopted: a centered, flat, card-first composition; clear field hierarchy; full-width primary and provider actions; quiet dividers; large rounded card; explicit light/dark switching.
- Preserved: CinaSeek branding, shadcn/Radix components, Accounts callback and signed OIDC behavior, capability-driven methods, Passkey, Turnstile, Admin OIDC-only authorization, and existing Service Binding/proxy architecture.
- Excluded: `@better-auth-ui/*`, HeroUI runtime dependencies, Better Auth routers/providers/storage keys, invented Magic Link capability, and direct credential handling in Admin.

## Automated verification

- Accounts targeted auth UI/capability tests: passed.
- Shared auth proxy Brotli/response-header regression tests: passed.
- Accounts, Admin, and auth-proxy TypeScript checks: passed.
- Scoped Biome checks and `git diff --check`: passed.
- Accounts production Cloudflare build: passed with `/sign-in` confirmed as dynamic SSR.
- Admin production Cloudflare build: passed.

## Rendered browser verification

Tested local production artifacts at `http://localhost:3111` and `http://localhost:3112`.

- Accounts sign-in: 768x1020 and 390x844, then dynamic resize from 768px to 320px.
- Accounts sign-up: 390x844.
- Admin login: 390x844 and 320x844.
- Both light and dark themes were toggled through the rendered controls.
- Accounts dynamic resize result: card changed from 496px to 272.7px; document `scrollWidth` remained equal to `clientWidth`; no overflowing element was found.
- Admin 320px result: document `scrollWidth` remained equal to `clientWidth`; no overflowing element was found.
- Logo assets loaded with non-zero natural dimensions.
- Accounts dark link colors and authentication control borders were inspected from computed styles after the accessibility token corrections.
- Admin retained exactly one OIDC login action with the sanitized dashboard callback.
- Sign-up correctly reflected live capabilities: social methods were shown without claiming unavailable email-code registration.

## Error and loading states

- Missing, failed, or malformed capability responses keep password submission fail-closed and expose an explicit retry state.
- Turnstile uses compact mode below 300px and flexible mode otherwise; a `ResizeObserver` re-renders only when the size class changes.
- On localhost, Cloudflare returned Turnstile error `110200` because the preview origin is not an allowed production hostname. The rendered UI hid the failed widget, displayed an accessible error, and kept sign-in disabled.
- Google One Tap uses a measured wrapper and keyed render host so stale asynchronous renders cannot overwrite the current responsive host.

## Accessibility checks

- Visible labels remain associated with email/password controls.
- Theme toggles have stable accessible names and titles.
- Informational states use polite status semantics; true failures use alerts.
- Long secondary actions wrap at narrow widths.
- Small authentication text uses body contrast rather than placeholder contrast.
- Dark links meet normal-text contrast and dark control outlines meet the 3:1 non-text contrast requirement.

## Explicit end-to-end limits

- No real credentials were entered.
- A successful production-domain Turnstile token, Google GIS response, Passkey ceremony, signed OIDC password continuation, and Admin role grant were not exercised locally. Their protocol and route contracts were covered by source tests and retained unchanged, but require authenticated production/staging E2E.

final result: passed
