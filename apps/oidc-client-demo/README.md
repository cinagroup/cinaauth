# CinaSeek OIDC Lab

Production acceptance client for the CinaSeek OpenID Connect provider. It is a browser-based public client deployed independently at `https://oidc-demo.cinaseek.ai`.

## Protocol profile

- OIDC Discovery from `https://auth.cinaseek.ai/.well-known/openid-configuration`
- Authorization Code flow with mandatory PKCE S256
- Public client authentication (`token_endpoint_auth_method=none`)
- Per-request cryptographic `state`, `nonce`, and code verifier
- ID token issuer, audience, signature, expiry, and nonce validation through `oauth4webapi`
- UserInfo `sub` binding to the validated ID token
- RP-initiated logout with an exact post-logout URI
- Token state isolated to `sessionStorage`; token values are never rendered or logged

The production client identifier and exact redirect URI are shared through `@cinaauth/auth-web-contract`. The acceptance Worker resolves one explicit deployment profile from its tracked non-secret Wrangler variables. The same validated profile produces `/config.json`, the CSP allow-list, and the browser client configuration; no browser-side production fallback exists. The Auth Worker reconciles this one fixed first-party client before its authorize request, so deployment does not expose unauthenticated dynamic registration.

## Local development

The production client does not accept localhost redirects. A complete local or staging authentication run therefore needs its own registered client and canonical HTTPS origins. A plain Vite session intentionally shows the fail-closed configuration screen because the browser only accepts the same-origin `/config.json` published by the Worker.

## Verification and deployment

```bash
pnpm --dir apps/oidc-client-demo typecheck
pnpm --dir apps/oidc-client-demo test
pnpm --dir apps/oidc-client-demo build
pnpm --dir apps/oidc-client-demo deploy
CINAAUTH_OIDC_DEMO_TARGET_ORIGIN=https://oidc-demo.cinaseek.ai pnpm --dir apps/oidc-client-demo check:production
```

Deploy the Auth Worker before the SPA when the client contract or CORS allow-list changes.
