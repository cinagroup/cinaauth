# AuthFramework Deprecation and Consolidation Plan

Last updated: March 16, 2026

This document tracks public API names that have been consolidated, renamed, or
planned for removal, along with the canonical replacements to use instead.

---

## Already Consolidated (rc18)

These duplications have been resolved. The canonical form is now the only public path.

### `UserInfo` — two identical structs merged into one

In rc17 and earlier, two independent struct definitions with identical fields existed:
`auth_framework::UserInfo` (from `crate::auth`) and `auth_framework::auth_modular::UserInfo`.

In rc18, `auth_framework::UserInfo` is the single canonical definition. `auth_modular::UserInfo`
is now a type alias for `crate::auth::UserInfo`. Both names refer to the exact same type with
no behavior change.

### `AuthResult` — two identical enums merged into one

In rc17 and earlier, two independent enum definitions with identical variants existed:
`auth_framework::AuthResult` (from `crate::auth`) and `auth_framework::auth_modular::AuthResult`,
both with three variants: `Success`, `MfaRequired`, `Failure`.

In rc18, `auth_framework::AuthResult` is the single canonical definition. `auth_modular::AuthResult`
is now a `pub use` re-export of `crate::auth::AuthResult`, so `auth_modular::AuthFramework::authenticate()`
returns the same `AuthResult` type as the rest of the crate.

### `ConfigBuilder` — confusing triple export removed

In rc17 and earlier, three public names existed for two different types:

- `auth_framework::ConfigBuilder` was a raw re-export of `config::app_config::ConfigBuilder`
- `auth_framework::AppConfigBuilder` was an alias for the same `config::app_config::ConfigBuilder`
- `auth_framework::LayeredConfigBuilder` pointed to the different `config::config_manager::ConfigBuilder`

In rc18, the ambiguous raw `ConfigBuilder` name has been removed from the public surface.
The two intentionally-named aliases remain:

- `auth_framework::AppConfigBuilder` — simple in-process configuration builder
- `auth_framework::LayeredConfigBuilder` — layered file and environment variable configuration

Internally, `crate::config::ConfigManager` routing is unchanged.

### `LegacySessionManager` — confusing alias removed

In rc17 and earlier, `auth_framework::prelude::LegacySessionManager` was exported as a second
name for the same `session::manager::SessionManager` type.

In rc18, only `auth_framework::prelude::SessionManager` (the canonical name) is exported.

---

## Planned Consolidation (Future Releases)

The following issues are tracked but not yet resolved.

### `AuthFramework` vs `ModularAuthFramework` — overlapping entry points

Two independently maintained structs for similar purposes currently exist:

- `auth_framework::AuthFramework` (`crate::auth::AuthFramework`) — the primary batteries-included entry point
- `auth_framework::ModularAuthFramework` (`crate::auth_modular::AuthFramework`) — a composition-oriented
  alternative entry point

Long term, the functionality in `auth_modular` should either be absorbed into `AuthFramework` or
`ModularAuthFramework` should be clearly scoped as an advanced lower-level alternative with a
documented use case.

**Timeline:** No removal timeline set. Will be addressed in Phase 3 (API Maturity).

### Five `UserInfo`-named types — naming clarity

There are five types named `UserInfo` in the codebase, only some of which are publicly exposed:

| Module | Public Name | Purpose |
| ------ | ----------- | ------- |
| `crate::auth` | `UserInfo`, also `CoreUserInfo` | Core user model |
| `crate::server::oidc` | `OidcUserInfo` | OIDC claims response (different fields) |
| `crate::api::auth` | *(internal)* | Login response embedded type |
| `crate::integrations::axum` | *(internal)* | Axum middleware embedded type |
| `crate::api::users` | `UserProfile` | Full profile with permissions |

New code should use the publicly re-exported forms:

- `auth_framework::UserInfo` / `CoreUserInfo` for the core user model
- `auth_framework::OidcUserInfo` for OIDC claims
- `auth_framework::api::users::UserProfile` for full user profiles from the REST API

The two internal forms (`api::auth` and `integrations::axum`) are implementation details and
not part of the public API contract.

**Timeline:** Naming alignment deferred to Phase 3.

---

## Guidance for New Code

- Prefer `auth_framework::AuthFramework` as the primary entry point.
- Import types via `use auth_framework::prelude::*` for application code.
- Use `AppConfigBuilder` for simple in-process config, `LayeredConfigBuilder` for file/env layering.
- Avoid directly referencing `auth_modular::` internals unless you specifically need the modular
  composition API.
