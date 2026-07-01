# Package: core (Cinaauth root)

> `src/lib.rs` — the root public API type
> [← 21-admin](21-admin.md) · [index](23-cross-package.md) · [23-cross-package →](23-cross-package.md)

```mermaid
classDiagram
    class AuthResult {
        <<enumeration>>
        Authenticated
        MfaRequired
        Unauthorized
    }
    class Cinaauth {
        -Arc~AuthStorage~ storage
        -Arc~TokenManager~ token_manager
        -Arc~AuthConfig~ config
        -Option~Arc~OAuth2Server~~ oauth2_server
        -Option~Arc~AuthorizationService~~ authz_service
        -Option~Arc~SessionManager~~ session_manager
        -Option~Arc~SecureSessionManager~~ secure_session_manager
        -Option~Arc~AuditLogger~~ audit_logger
        -Option~Arc~SecurityManager~~ security_manager
        -Option~Arc~PermissionChecker~~ permission_checker
        -Option~Arc~DistributedRateLimiter~~ rate_limiter
        -Option~Arc~ServerOAuth2Server~~ server_oauth2
        +new(config) Result~Self~
        +authenticate(credentials) Result~AuthResult~
        +validate_token(token) Result~TokenInfo~
        +refresh_token(token) Result~AuthToken~
        +revoke_token(token) Result
        +check_permission(user_id, resource, action) Result~bool~
        +authorize(user_id, resource, action) Result
        +create_session(user_id, auth_method, scopes) Result~Session~
        +get_session(id) Result~Option_Session~
        +invalidate_session(id) Result
        +oauth2_authorize(req) Result~String~
        +oauth2_token(req) Result~TokenResponse~
        +get_token_manager() Arc~TokenManager~
        +get_storage() Arc~AuthStorage~
    }
    class ClientModule {
        +ClientType client_type
        +ClientConfig client_config
    }
    class ClientType {
        <<enumeration>>
        Confidential
        Public
    }
    class ClientConfig {
        +String client_id
        +Option~String~ client_secret_hash
        +Vec~String~ redirect_uris
        +Vec~String~ allowed_scopes
        +Vec~GrantType~ allowed_grant_types
        +ClientType client_type
        +bool require_pkce
        +bool active
    }
    Cinaauth ..> AuthResult
    Cinaauth ..> AuthConfig
    Cinaauth ..> TokenManager
    Cinaauth ..> AuthStorage
    Cinaauth ..> OAuth2Server
    Cinaauth ..> AuthorizationService
    Cinaauth ..> SessionManager
    Cinaauth ..> SecureSessionManager
    Cinaauth ..> AuditLogger
    Cinaauth ..> SecurityManager
    Cinaauth ..> PermissionChecker
    Cinaauth ..> DistributedRateLimiter
    Cinaauth ..> ServerOAuth2Server
    ClientModule *-- ClientType
    ClientModule *-- ClientConfig
    ClientConfig ..> ClientType
    note for ClientModule "src/client.rs — canonical home for ClientType and ClientConfig. Re-exported by server::mod, server::core::client_registry, and lib.rs public API."
```

---

**Related:** [02-config](02-config.md) · [03-tokens](03-tokens.md) · [04-storage](04-storage.md) · [11-session](11-session.md) · [13-audit](13-audit.md) · [14-oauth2-domain](14-oauth2-domain.md) · [15-server-layer](15-server-layer.md) · [23-cross-package](23-cross-package.md)
