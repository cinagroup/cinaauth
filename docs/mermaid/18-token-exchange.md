# Package: token exchange
> `src/token_exchange/`

> [← 17-server-security](17-server-security.md) · [index](23-cross-package.md) · [19-distributed →](19-distributed.md)

```mermaid
classDiagram
    class TokenExchangeService {
        <<interface>>
        +exchange(req) Result~TokenResponse~
        +validate_request(req) Result
        +can_handle(scenario) bool
        +supported_scenarios() Vec~ExchangeScenario~
    }
    class TokenExchangeRequest {
        +String grant_type
        +String subject_token
        +String subject_token_type
        +Option~String~ actor_token
        +Option~String~ actor_token_type
        +Option~String~ requested_token_type
        +Option~String~ scope
        +Option~String~ audience
    }
    class TokenExchangeManager {
        -Vec~Arc_TokenExchangeService~~ handlers
        -TokenExchangePolicy policy
        +exchange(req) Result~TokenResponse~
        +register_handler(handler) void
    }
    class TokenExchangePolicy {
        +Vec~String~ allowed_subject_token_types
        +Vec~String~ allowed_requested_token_types
        +bool allow_impersonation
        +bool allow_delegation
        +Vec~String~ trusted_issuers
    }
    class TokenExchangeFactory {
        +create_saml_handler(config) Arc~TokenExchangeService~
        +create_jwt_handler(config) Arc~TokenExchangeService~
        +create_opaque_handler(config) Arc~TokenExchangeService~
    }
    class ExchangeScenario {
        <<enumeration>>
        JwtToJwt
        OpaqueToJwt
        JwtToOpaque
        SamlToJwt
        CrossDomain
    }
    TokenExchangeManager *-- TokenExchangePolicy
    TokenExchangeManager ..> TokenExchangeService
    TokenExchangeManager ..> TokenExchangeRequest
    TokenExchangeFactory ..> TokenExchangeService
    TokenExchangeService ..> ExchangeScenario
```

---

**Related:** [03-tokens](03-tokens.md) · [14-oauth2-domain](14-oauth2-domain.md) · [22-core](22-core.md)
