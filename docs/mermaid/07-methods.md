# Package: methods
> `src/methods/`

> [← 06-providers](06-providers.md) · [index](23-cross-package.md) · [08-permissions →](08-permissions.md)

```mermaid
classDiagram
    class AuthMethod {
        <<interface>>
        +name() String
        +authenticate(credentials, storage) Result~AuthToken~
        +validate_config() Result
        +supports_refresh() bool
        +refresh_token(token, storage) Result~AuthToken~
    }
    class MethodResult {
        <<enumeration>>
        Success
        MfaRequired
        Failure
    }
    class MfaType {
        <<enumeration>>
        Totp
        Sms
        Email
        Push
        SecurityKey
        BackupCode
        MultiMethod
    }
    class MfaChallenge {
        +String id
        +MfaType mfa_type
        +String user_id
        +DateTime expires_at
        +DateTime created_at
        +u32 attempts
        +u32 max_attempts
        +Option~String~ code_hash
        +Option~String~ message
        +HashMap~String, Value~ data
    }
    class AuthMethodEnum {
        <<enumeration>>
        Password
        Jwt
        ApiKey
        OAuth2
        Saml
        Ldap
        ClientCert
        OpenIdConnect
        AdvancedMfa
        Passkey
    }
    note for MfaChallenge "Canonical MfaChallenge in methods::mod. security::secure_mfa imports from here."
    MfaChallenge ..> MfaType
    MethodResult ..> MfaChallenge
    AuthMethodEnum ..> AuthMethod : implements
```

---

**Related:** [04-storage](04-storage.md) · [03-tokens](03-tokens.md) · [12-security](12-security.md) · [08-permissions](08-permissions.md)
