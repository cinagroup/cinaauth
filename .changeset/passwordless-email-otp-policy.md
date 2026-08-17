---
"cinaauth": patch
"@cinaauth/core": patch
"@cinaauth/oauth-provider": patch
---

Add existing-account-only Email OTP requests, a backward-compatible
`disableImplicitSignUp` policy, and opt-in two-factor enforcement for additional
static sign-in endpoints. This lets applications adopt passwordless email login
without silently registering unknown addresses or weakening 2FA for existing
users. Passwordless-only deployments can omit all Email OTP password-reset
routes. Passwordless 2FA management can additionally require a fresh session,
and prioritized authentication hooks plus request-scoped pending-gate state keep
signed OIDC continuation behind the independent 2FA challenge regardless of
plugin declaration order.
