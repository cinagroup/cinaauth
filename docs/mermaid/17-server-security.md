# Package: server security (CAEP / mTLS / FAPI)
> `src/server/security/`

> [← 16-server-oidc](16-server-oidc.md) · [index](23-cross-package.md) · [18-token-exchange →](18-token-exchange.md)

```mermaid
classDiagram
    class CaepConfig {
        +Vec~String~ event_types
        +Duration delivery_timeout
        +bool require_ack
    }
    class CaepSessionState {
        +String subject
        +String session_id
        +Option~DateTime~ last_event
        +HashMap~String, Value~ metadata
    }
    class CaepAccessDecision {
        <<enumeration>>
        Allow
        Deny
        Terminate
        ReAuthenticate
    }
    class MtlsManager {
        +validate_certificate(cert_pem) Result~CertInfo~
        +bind_token_to_cert(token, cert_thumbprint) Result
        +verify_token_binding(token, cert_pem) Result~bool~
    }
    class FapiProfile {
        +bool require_par
        +bool require_dpop_or_mtls
        +bool require_signed_request_object
        +bool require_response_signing
    }
    CaepSessionState ..> CaepAccessDecision
```

---

**Related:** [15-server-layer](15-server-layer.md) · [16-server-oidc](16-server-oidc.md)
