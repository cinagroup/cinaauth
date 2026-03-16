# Package: tokens

> `src/tokens.rs` — JWT generation, validation, and token lifecycle

> [← 02-config](02-config.md) · [index](23-cross-package.md) · [04-storage →](04-storage.md)

```mermaid
classDiagram
    class TokenManager {
        -EncodingKey encoding_key
        -DecodingKey decoding_key
        -Algorithm algorithm
        -String issuer
        -String audience
        -Duration default_lifetime
        +new_hmac(secret, issuer, audience) Self
        +new_rsa(priv_key, pub_key, issuer, audience) Self
        +create_jwt_token(user_id, scopes, lifetime) Result~String~
        +validate_jwt_token(token) Result~JwtClaims~
        +create_auth_token(user_id, scopes, method, lifetime) Result~AuthToken~
        +validate_auth_token(token) Result
        +refresh_token(token) Result~AuthToken~
        +extract_token_info(token) Result~TokenInfo~
    }
    class AuthToken {
        +String token_id
        +String user_id
        +String access_token
        +Option~String~ token_type
        +Option~String~ refresh_token
        +DateTime issued_at
        +DateTime expires_at
        +Vec~String~ scopes
        +String auth_method
        +Option~String~ client_id
        +Vec~String~ permissions
        +Vec~String~ roles
        +is_expired() bool
        +is_valid() bool
        +has_scope(scope) bool
        +has_permission(perm) bool
        +has_role(role) bool
        +revoke(reason) void
        +mark_used() void
    }
    class TokenMetadata {
        +Option~String~ issued_ip
        +Option~String~ user_agent
        +Option~String~ device_id
        +Option~String~ session_id
        +bool revoked
        +Option~DateTime~ revoked_at
        +Option~String~ revoked_reason
        +Option~DateTime~ last_used
        +u64 use_count
        +HashMap~String, Value~ custom
    }
    class JwtClaims {
        +String sub
        +String iss
        +String aud
        +i64 exp
        +i64 iat
        +i64 nbf
        +String jti
        +String scope
        +Option~Vec_String~ permissions
        +Option~Vec_String~ roles
        +Option~String~ client_id
        +HashMap~String, Value~ custom
    }
    class TokenInfo {
        +String user_id
        +Option~String~ username
        +Option~String~ email
        +Option~String~ name
        +Vec~String~ roles
        +Vec~String~ permissions
        +HashMap~String, Value~ attributes
    }

    AuthToken *-- TokenMetadata
    TokenManager ..> AuthToken : creates
    TokenManager ..> JwtClaims : validates
    TokenManager ..> TokenInfo : extracts
```

---

**Related:** [02-config](02-config.md) · [12-security](12-security.md) · [14-oauth2-domain](14-oauth2-domain.md) · [22-core](22-core.md)
