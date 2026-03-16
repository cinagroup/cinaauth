# Package: server OIDC
> `src/server/oidc/`

> [← 15-server-layer](15-server-layer.md) · [index](23-cross-package.md) · [17-server-security →](17-server-security.md)

```mermaid
classDiagram
    class OidcConfig {
        +String issuer
        +Duration id_token_lifetime
        +Vec~String~ supported_scopes
        +Vec~String~ supported_claims
        +bool enable_userinfo
        +bool enable_discovery
        +bool enable_backchannel_logout
        +Option~String~ jwks_uri
    }
    class OidcProvider {
        -OidcConfig config
        -Arc~TokenManager~ token_manager
        +create_id_token(user_id, client_id, nonce, claims) Result~String~
        +validate_id_token(token) Result~IdTokenClaims~
        +get_userinfo(access_token) Result~Value~
        +get_discovery_document() OidcDiscoveryDocument
        +get_jwks() JwkSet
    }
    class IdTokenClaims {
        +String sub
        +String iss
        +Vec~String~ aud
        +u64 exp
        +u64 iat
        +Option~u64~ auth_time
        +Option~String~ nonce
        +HashMap~String,Value~ additional_claims
    }
    note for IdTokenClaims "Canonical issued ID token (oidc/core.rs).\nSee also: IdTokenHintClaims (private, oidc_enhanced_ciba.rs)\nfor lenient parsing of id_token_hint JWTs."
    class OidcDiscoveryDocument {
        +String issuer
        +String authorization_endpoint
        +String token_endpoint
        +String userinfo_endpoint
        +String jwks_uri
        +Vec~String~ response_types_supported
        +Vec~String~ subject_types_supported
        +Vec~String~ id_token_signing_alg_values
        +Vec~String~ scopes_supported
    }
    class JwkSet {
        +Vec~Value~ keys
    }
    class OidcBackchannelLogout {
        +send_logout_token(client_id, sub, sid) Result
        +handle_logout_token(token) Result
    }
    OidcProvider *-- OidcConfig
    OidcProvider ..> IdTokenClaims
    OidcProvider ..> OidcDiscoveryDocument
    OidcProvider ..> JwkSet
    OidcProvider ..> OidcBackchannelLogout
```

---

**Related:** [15-server-layer](15-server-layer.md) · [03-tokens](03-tokens.md) · [06-providers](06-providers.md)
