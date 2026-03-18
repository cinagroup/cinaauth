# AuthFramework Stable Public API Map

This document provides a reference for the canonical public API of `auth-framework`.
It maps legacy or ambiguous names to their canonical counterparts and explains
which entry points to use for common tasks.

## Canonical Entry Points

| Purpose | Canonical Type | Module / Path |
|---|---|---|
| Main framework | `AuthFramework` | `auth_framework::AuthFramework` |
| Component-level access | `ModularAuthFramework` | `auth_framework::ModularAuthFramework` |
| Framework configuration | `AuthConfig` | `auth_framework::AuthConfig` |
| Simple app config | `AppConfigBuilder` | `auth_framework::AppConfigBuilder` |
| Layered config from env/file | `LayeredConfigBuilder` | `auth_framework::LayeredConfigBuilder` |
| Core user data | `UserInfo` | `auth_framework::UserInfo` |
| Session manager | `SessionManager` | `auth_framework::SessionManager` |
| Secure sessions | `SecureSessionManager` | `auth_framework::SecureSessionManager` |
| OAuth2 server | `OAuth2Server` | `auth_framework::OAuth2Server` |
| OIDC provider | `OidcProvider` | `auth_framework::server::oidc::OidcProvider` |
| OIDC user info | `OidcUserInfo` | `auth_framework::OidcUserInfo` |
| Client registration | `ClientRegistrationRequest` | `auth_framework::ClientRegistrationRequest` |
| MFA operations | `AuthFramework::mfa()` | grouped accessor on `AuthFramework` |

## Grouped Accessors on `AuthFramework`

Use these to access scoped operations rather than calling methods directly on the
monolithic `AuthFramework` surface:

| Accessor | Returns | Use for |
|---|---|---|
| `auth.users()` | `UserOperations` | User CRUD, profile, password changes |
| `auth.sessions()` | `SessionOperations` | Session listing, revocation, activity |
| `auth.tokens()` | `TokenOperations` | Token creation, validation, revocation |
| `auth.authorization()` | `AuthorizationOperations` | RBAC, ABAC, permission checks |
| `auth.mfa()` | `MfaOperations` | MFA setup, challenge, verification |
| `auth.monitoring()` | `MonitoringOperations` | Metrics, health, performance |
| `auth.audit()` | `AuditOperations` | Audit log queries |
| `auth.admin()` | `AdminOperations` | Admin-level operations |

## Deprecated Names and Migration Guidance

The following names are deprecated. They still compile but will be removed in a future
release. Migrate to the canonical names listed.

| Deprecated Name | Canonical Replacement | Since |
|---|---|---|
| `LegacySessionManager` | `SessionManager` | 0.5.0 |
| `LegacyMfaManager` | `AuthFramework::mfa()` accessor | 0.5.0 |
| `ServerClientRegistrationRequest` | `ClientRegistrationRequest` | 0.5.0 |
| `CoreUserInfo` | `UserInfo` (same type, alias retained for disambiguation) | — |

## Type Disambiguation: Multiple `UserInfo` Types

There are multiple types related to user info. Use the right one for your context:

| Type | Path | When to Use |
|---|---|---|
| `UserInfo` | `auth_framework::UserInfo` | Core user data stored in the system |
| `OidcUserInfo` | `auth_framework::OidcUserInfo` | OpenID Connect `/userinfo` endpoint response |
| `AuthenticatedUser` | `auth_framework::integrations::axum::AuthenticatedUser` | Axum middleware token extractor |

The `CoreUserInfo` alias in the prelude points to the same type as `UserInfo` and
exists only for disambiguation in codebases that also use the OIDC types.

## Type Disambiguation: Multiple `SessionManager` Types

| Type | Path | When to Use |
|---|---|---|
| `SessionManager<S, A>` | `auth_framework::SessionManager` | Standard session management |
| `SecureSessionManager` | `auth_framework::SecureSessionManager` | Hardened sessions with device fingerprinting |
| `auth_modular::SessionManager` | `auth_framework::auth_modular::SessionManager` | Internal component manager (advanced use only) |

## Type Disambiguation: OAuth2 Server types

| Type | Path | When to Use |
|---|---|---|
| `OAuth2Server` | `auth_framework::OAuth2Server` (from `oauth2_server`) | Top-level OAuth2 server |
| `ServerOAuth2Server` | `auth_framework::ServerOAuth2Server` (from `server::oauth`) | Server-side OAuth 2.x protocol impl |

---

_This map is updated with each release candidate. Check CHANGELOG.md for migration notes._
