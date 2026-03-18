# Critical Security Audit Report — AuthFramework

**Project:** auth-framework  
**Version audited:** 0.5.0-rc1  
**Audit completed:** 2025  
**Status:** All listed issues SECURED or acknowledged

---

## Summary

This report documents the critical security findings identified during the pre-release security audit of auth-framework v0.5.0-rc1 and the resolutions applied.

---

## JWT VALIDATION SECURITY VULNERABILITIES

### Finding 1 — Algorithm Confusion Attack Surface
**Severity:** Critical  
**Status:** SECURED

Token validation enforces an explicit algorithm allow-list configured at framework construction time. The `tokenvalidator` rejects any token whose `alg` header does not match the configured algorithm, preventing `alg: none` and confusion attacks (e.g., RS256→HS256 substitution).

### Finding 2 — Signature Verification Bypass
**Severity:** Critical  
**Status:** SECURED

All JWT tokens are verified using `jsonwebtoken 10.x` with `DecodingKey` types that enforce the correct key material for each algorithm family. No code path allows skipping signature verification.

### Finding 3 — Secret Entropy Requirements
**Severity:** High  
**Status:** SECURED

`AuthConfig::validate()` rejects JWT secrets shorter than 32 characters in non-test environments and warns when secrets contain dictionary words or common patterns. `SecureJwtValidator::new()` enforces a minimum length of 32 characters at construction time via `assert!(config.jwt_secret.len() >= 32)`. `force_production_mode()` allows tests to exercise production validation paths without polluting the global environment.

---

## DPoP Module

**Status:** SECURED

Demonstration of Proof-of-Possession (DPoP) token binding is implemented per RFC 9449. Key checks:

- Nonce freshness is enforced — replayed nonces are rejected.
- `jti` (JWT ID) uniqueness is tracked per-client to prevent replay attacks.
- `htm` and `htu` claims are validated against the actual HTTP method and URI.
- DPoP public key is bound to the access token at issuance and re-verified on each use.

---

## Token Exchange Module

**Status:** SECURED

Token exchange (RFC 8693) is implemented with the following security controls:

- Subject token type validation prevents exchange of arbitrary opaque strings.
- Audience restriction is enforced — exchanged tokens are scoped to the declared target service.
- Scope downscoping is supported; scope escalation is rejected.
- Impersonation flows require explicit administrative authorisation.

---

## Additional Findings

### Dependency Vulnerabilities

| Advisory          | Dependency                    | Resolution                                                                                                           |
| ----------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| RUSTSEC-2023-0071 | rsa (via sqlx, openidconnect) | Acknowledged; no fix available upstream. Low practical risk — raw RSA operations are not exposed by this library.    |
| RUSTSEC-2025-0067 | libyml (via serde_yml)        | Fixed — switched YAML parsing to `serde_yaml 0.9.x` which uses `unsafe-libyaml` (no advisory).                       |
| RUSTSEC-2025-0068 | serde_yml 0.0.12              | Fixed — removed `serde_yml`; replaced with `serde_yaml 0.9`.                                                         |
| RUSTSEC-2025-0123 | opentelemetry-jaeger 0.22.0   | Fixed — removed unmaintained dependency; users should use `opentelemetry-otlp` which Jaeger 1.35+ supports natively. |

### Test Environment Race Condition

**Finding:** `test_secret_missing_returns_error` set the global `ENVIRONMENT=production` environment variable without serialisation, causing 4–6 `tenant::registry` tests to fail non-deterministically in parallel runs.

**Fix:** Added `force_production_mode: bool` to `AuthConfig` with a `force_production_mode()` builder. The test now calls `AuthConfig::default().force_production_mode()` instead of writing to the process environment, eliminating the race condition entirely.

---

## Audit Cycle 2 Findings — v0.5.0-rc1 (Pre-release)

A second manual audit pass identified and resolved the following issues:

| #   | Severity | Finding                                                                  | Status |
| --- | -------- | ------------------------------------------------------------------------ | ------ |
| 1   | Critical | Passkey RSA DER construction broken — all RSA WebAuthn assertions failed | FIXED  |
| 2   | Critical | Counter fallback returned current timestamp — replay protection bypassed | FIXED  |
| 3   | Critical | Counter=0 rejected valid passkeys contrary to WebAuthn spec §6.1         | FIXED  |
| 4   | Critical | `complete_authentication` issued tokens with no signature verification   | FIXED  |
| 5   | High     | Dead `INSECURE_DEFAULT_JWT_SECRET` guard was unreachable                 | FIXED  |
| 6   | High     | `SecureJwtConfig::default()` set `require_secure_transport: false`       | FIXED  |
| 7   | High     | Config edit handler silently discarded all submitted changes             | FIXED  |
| 8   | Medium   | Admin users handler returned hardcoded fake data                         | FIXED  |
| 9   | Medium   | bzip2/xz extractors wrote raw compressed bytes, returned `Ok(())`        | FIXED  |
| 10  | Medium   | A256KW advertised in JWE allowlist but had no implementation             | FIXED  |
| 11  | Medium   | ConsentManager/DeviceFlowManager lost all data on process restart        | FIXED  |
| 12  | Low      | 15 clippy warnings across 8 files                                        | FIXED  |
| 13  | Low      | Dead GeoIP risk indicator patterns that could never match                | FIXED  |

---

## Audit Methodology

- `cargo clippy -- -D warnings` — clean (zero warnings/errors)
- `cargo audit` — 1 pre-acknowledged vulnerability (RUSTSEC-2023-0071, no fix available), zero new advisories after dependency fixes
- `cargo test --lib` — 509/509 passing
- `cargo test` — all integration tests passing
- Manual review of JWT validation, session management, OAuth 2.1 flows, MFA implementation, rate limiting, and DDoS protection

---

*This report is maintained as living documentation. Update after each security review cycle.*
