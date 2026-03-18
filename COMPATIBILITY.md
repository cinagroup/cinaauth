# Compatibility and Support

This document describes the supported Rust versions, feature stability tiers, storage backend
support matrix, web framework integration matrix, and the project's versioning and migration
policies.

---

## Rust Version Support

| Property                              | Value    |
| ------------------------------------- | -------- |
| Minimum Supported Rust Version (MSRV) | **1.85** |
| Rust Edition                          | 2024     |
| Recommended toolchain                 | `stable` |

The MSRV is enforced by the `rust-version` field in `Cargo.toml`. A Rust version bump is
treated as a **minor** breaking change and will be announced in the changelog with at least one
release cycle of advance notice.

---

## Versioning Policy

AuthFramework follows [Semantic Versioning 2.0](https://semver.org/):

| Change type                                                      | Version bump                        |
| ---------------------------------------------------------------- | ----------------------------------- |
| Backwards-compatible additions, new features, new optional flags | Minor (`0.x.0`)                     |
| Bug fixes with no public API change                              | Patch (`0.0.x`)                     |
| Breaking public API change, MSRV bump, removed item              | Major or explicit pre-release label |

During the `0.x` series:

- **Release candidates** (`0.5.0-rc*`) are production-grade candidates. The public API is
  stabilising but may change between RCs.
- The first stable `0.5.0` release will freeze the public API for the `0.5.x` line.
- Breaking changes in the `0.x` series will still be announced via deprecation warnings in at
  least one prior minor release where possible.

---

## Feature Stability Tiers

### Stable (included in all `0.5.x` releases)

These capabilities are covered by the SemVer guarantee and are part of the batteries-included
default build:

| Feature / Capability                     | Default build | Feature flag                   |
| ---------------------------------------- | :-----------: | ------------------------------ |
| Core authentication (`AuthFramework`)    |       ✅       | *(always on)*                  |
| Password authentication (Argon2, bcrypt) |       ✅       | *(always on)*                  |
| JWT issuance and validation              |       ✅       | *(always on)*                  |
| Session management                       |       ✅       | *(always on)*                  |
| API key management                       |       ✅       | *(always on)*                  |
| MFA / TOTP                               |       ✅       | *(always on)*                  |
| Role-based access control (RBAC)         |       ✅       | `enhanced-rbac`                |
| Axum REST API server                     |       ✅       | `api-server` / `enhanced-rbac` |
| Axum middleware and extractors           |       ✅       | `axum-integration`             |
| PostgreSQL storage backend               |       ✅       | `postgres-storage`             |
| OpenID Connect provider                  |       ✅       | `openid-connect`               |
| OAuth 2.0 / OAuth 2.1 server             |       ✅       | *(always on)*                  |
| Audit logging                            |       ✅       | *(always on)*                  |
| Threat intelligence and geo-IP           |       ✅       | *(always on)*                  |
| Admin web UI                             |   ⬜ opt-in    | `web-gui`                      |
| Admin CLI and TUI                        |   ⬜ opt-in    | `cli` / `tui` / `admin-binary` |

### Experimental (available, API may change)

These features are functional but their public API may change in minor releases. File an issue
before building stable integrations on top of them.

| Feature / Capability                     | Feature flag                          |
| ---------------------------------------- | ------------------------------------- |
| SAML service-provider support            | `saml`                                |
| WebAuthn / Passkeys                      | `passkeys`                            |
| LDAP authentication                      | `ldap-auth`                           |
| SMS / OTP delivery (SMSKit)              | `smskit` / `smskit-web-axum`          |
| OpenTelemetry and Prometheus integration | `enhanced-observability`              |
| Performance memory pools                 | `performance-optimization`            |
| ChaCha20-Poly1305 / Ed25519 crypto       | `enhanced-crypto`                     |
| FIPS 140-3 algorithms via AWS-LC         | `fips-compliance`                     |
| OAuth 2.0 enhanced device flow           | `enhanced-device-flow`                |
| Event sourcing                           | `event-sourcing`                      |
| Configuration hot-reload                 | `config-hot-reload`                   |
| Distributed rate limiting (Redis)        | `distributed-rate-limiting`           |
| Unicode username normalization           | `unicode-support`                     |
| MySQL storage backend                    | `mysql-storage`                       |
| Redis storage backend                    | `redis-storage`                       |
| Tiered storage (Redis + Postgres)        | `tiered-storage`                      |
| HSM / PKCS#11 integration (cryptoki)     | *(always compiled, API experimental)* |

### Deprecated

| Capability                                       | Replacement                                               | Removal target |
| ------------------------------------------------ | --------------------------------------------------------- | -------------- |
| `AppConfigBuilder` (legacy)                      | `LayeredConfigBuilder`                                    | `0.6.0`        |
| `ModularAuthFramework` (legacy alias)            | `AuthFramework`                                           | `0.6.0`        |
| Direct monolithic `AuthFramework` method surface | Grouped accessors (`auth.users()`, `auth.tokens()`, etc.) | `0.7.0`        |

Deprecated items emit a `#[deprecated]` warning at compile time and will be removed in the
target release. Migration guidance is published in the [changelog](CHANGELOG.md).

---

## Storage Backend Support Matrix

| Backend               | Feature flag       | Default | Status       | Notes                                                   |
| --------------------- | ------------------ | :-----: | ------------ | ------------------------------------------------------- |
| **In-memory**         | *(none)*           |    ✅    | Stable       | Suitable for development and testing only               |
| **PostgreSQL**        | `postgres-storage` |    ✅    | Stable       | Recommended for production                              |
| **MySQL / MariaDB**   | `mysql-storage`    |    ⬜    | Experimental | Functional; fewer CI test cycles than Postgres          |
| **Redis**             | `redis-storage`    |    ⬜    | Stable       | For distributed session storage and caching             |
| **Tiered (Redis+PG)** | `tiered-storage`   |    ⬜    | Experimental | Hot-path Redis cache with Postgres persistence          |
| **SQLite**            | *(planned)*        |    ⬜    | Roadmap      | Planned in a separate crate for lightweight deployments |
| **SurrealDB**         | *(planned)*        |    ⬜    | Roadmap      | Planned as an optional community-maintained integration |

**Choosing a storage backend for production:**

- Use `postgres-storage` (the default) for any multi-user or multi-node deployment.
- Add `redis-storage` (or `distributed-rate-limiting`) when you need distributed session
  consistency, token revocation propagation, or cross-node rate limiting.
- Use `tiered-storage` to combine Redis read performance with Postgres durability.
- The in-memory backend is available without any feature flag; it is appropriate only for local
  development and automated tests.

---

## Web Framework Integration Support Matrix

| Framework            | Feature flag                   | Default | Status | Notes                                             |
| -------------------- | ------------------------------ | :-----: | ------ | ------------------------------------------------- |
| **Axum**             | `axum-integration`             |    ✅    | Stable | Primary recommended framework                     |
| **Axum REST server** | `api-server` / `enhanced-rbac` |    ✅    | Stable | Built-in HTTP server for auth endpoints           |
| **Actix Web**        | `actix-integration`            |    ⬜    | Stable | Fully functional; not the primary documented path |
| **Warp**             | `warp-integration`             |    ⬜    | Stable | Fully functional; not the primary documented path |

All three integrations are maintained and tested on every release path. Axum is the primary
documented path; Actix Web and Warp are maintained alternatives.

---

## Platform Support

| Platform              | Tier | Notes                                                                |
| --------------------- | ---- | -------------------------------------------------------------------- |
| Linux x86-64          | 1    | Primary development and CI target                                    |
| Linux aarch64         | 1    | Tested; primary target for ARM servers                               |
| macOS (Apple Silicon) | 1    | Tested in CI                                                         |
| macOS (Intel)         | 2    | Compiled and spot-tested                                             |
| Windows x86-64        | 2    | Compiled and tested; some optional dependencies may need extra setup |
| musl libc (Linux)     | 2    | Supported for Alpine-based containers                                |
| Tier 3 (other)        | 3    | Builds attempted where dependencies allow; not actively tested       |

**Tier definitions:**

- **Tier 1**: Actively tested in CI on every PR; breakage blocks release.
- **Tier 2**: Compiled and spot-tested; breakage is treated as a high-priority bug.
- **Tier 3**: Best-effort; bugs accepted but may not be fixed immediately.

---

## Dependency Policy

- `tokio` (async runtime) and `axum` (default web layer) are pinned to the latest stable minor
  version and updated regularly.
- Cryptographic dependencies (`ring`, `rsa`, `argon2`, `jsonwebtoken`) are updated on every
  security advisory; the project monitors RustSec advisories continuously.
- The `sqlx` version is aligned with the minimum version that resolves known security advisories.
- Optional and community-maintained integrations (SMSKit, SurrealDB) may track their own
  dependency schedules.

---

## Migration Guide Summary

### `0.4.x` → `0.5.x`

- The default feature set changed: `enhanced-rbac`, `postgres-storage`, `openid-connect`, and
  `axum-integration` are now included by default. If you previously specified these explicitly,
  you can drop them.
- `AppConfigBuilder` is deprecated in favour of `LayeredConfigBuilder`.
- Grouped accessor methods (`auth.users()`, `auth.tokens()`, `auth.authorization()`, etc.) are
  now the preferred API surface; the flat `AuthFramework` methods remain available but are
  soft-deprecated.
- SAML tests require the `saml` feature flag and a working IdP; the feature is no longer
  compiled by default.

Full migration notes are in [CHANGELOG.md](CHANGELOG.md).

---

## Support Lifetime

| Track              | Supported fixes           |
| ------------------ | ------------------------- |
| Current stable     | Security fixes, bug fixes |
| Previous minor     | Security fixes only       |
| Release candidates | No patch backports        |
| Older versions     | No support                |

If you discover a security issue, please follow the process described in [SECURITY.md](SECURITY.md).
