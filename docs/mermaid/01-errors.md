# Package: errors
> `src/error.rs` — top-level error types used throughout the framework

> [index](23-cross-package.md) · [02-config →](02-config.md)

```mermaid
classDiagram
    class AuthError {
        <<enumeration>>
        Configuration
        AuthMethod
        Token
        Permission
        Storage
        RateLimit
        Mfa
        DeviceFlow
        OAuthProvider
        UserNotFound
        InvalidCredential
        Timeout
        Crypto
        Validation
        Internal
        StepUpRequired
        Unauthorized
        InvalidToken
        SessionError
    }
    class TokenError {
        <<enumeration>>
        Expired
        Invalid
        NotFound
        Missing
        CreationFailed
        RefreshFailed
        RevocationFailed
    }
    class StorageError {
        <<enumeration>>
        ConnectionFailed
        OperationFailed
        Serialization
        BackendUnavailable
    }
    class MfaError {
        <<enumeration>>
        ChallengeExpired
        InvalidCode
        MethodNotSupported
        SetupRequired
        VerificationFailed
    }

    AuthError ..> TokenError : wraps
    AuthError ..> StorageError : wraps
    AuthError ..> MfaError : wraps
```

---

**Related:** [02-config](02-config.md) · [03-tokens](03-tokens.md) · [04-storage](04-storage.md) · [22-core](22-core.md)
