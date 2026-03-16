# Package: providers

> `src/providers.rs` — OAuth2 external provider definitions and user profile mapping

> [← 05-user-context](05-user-context.md) · [index](23-cross-package.md) · [07-methods →](07-methods.md)

> **Canonical provider profile type.** Renamed from `UserProfile` to `ProviderProfile` to distinguish from `api::users::UserProfile`.

```mermaid
classDiagram
    class OAuthProvider {
        <<enumeration>>
        GitHub
        Google
        Microsoft
        Discord
        Twitter
        Facebook
        LinkedIn
        GitLab
        Custom
    }
    class OAuthProviderConfig {
        +String authorization_url
        +String token_url
        +Option~String~ device_authorization_url
        +Option~String~ userinfo_url
        +Option~String~ revocation_url
        +Vec~String~ default_scopes
        +bool supports_pkce
        +bool supports_refresh
        +bool supports_device_flow
        +HashMap~String, String~ additional_params
    }
    class ProviderProfile {
        +Option~String~ id
        +Option~String~ provider
        +Option~String~ username
        +Option~String~ name
        +Option~String~ email
        +Option~bool~ email_verified
        +Option~String~ picture
        +Option~String~ locale
        +HashMap~String, Value~ additional_data
        +new() Self
        +from_token_response(resp) Self
        +from_id_token(token) Result~Self~
        +to_auth_token(access_token) AuthToken
    }

    OAuthProvider o-- OAuthProviderConfig
```

---

**Related:** [07-methods](07-methods.md) · [16-server-oidc](16-server-oidc.md) · [22-core](22-core.md)
