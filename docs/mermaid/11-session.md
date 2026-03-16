# Package: session
> `src/session/`

> [← 10-authorization-enhanced](10-authorization-enhanced.md) · [index](23-cross-package.md) · [12-security →](12-security.md)

```mermaid
classDiagram
    class SessionStorage {
        <<interface>>
        +create_session(session) Result~String~
        +get_session(id) Result~Option_Session~
        +update_session(session) Result
        +delete_session(id) Result
        +list_user_sessions(user_id) Result~Vec_Session~
        +invalidate_user_sessions(user_id) Result
        +count_active_sessions() Result~u64~
        +cleanup_expired() Result
        +get_session_stats() Result~SessionStats~
    }
    class SessionState {
        <<enumeration>>
        Active
        Expired
        Revoked
        RequiresMfa
        RequiresReauth
        Suspended
        PendingMfa
        RequiresRotation
        HighRisk
    }
    class Session {
        +String id
        +String user_id
        +SessionState state
        +DeviceInfo device_info
        +SecurityMetadata security_metadata
        +ActivityInfo activity_info
        +Option~GeolocationInfo~ geolocation
        +HashMap~String, Value~ data
    }
    class DeviceInfo {
        +String fingerprint
        +String device_type
        +Option~String~ operating_system
        +Option~String~ browser
        +Option~String~ screen_resolution
        +Option~String~ timezone
        +Option~String~ language
        +bool is_trusted
        +Option~String~ device_name
        +bool is_mobile
        +Option~String~ ip_address
    }
    class SecurityMetadata {
        +u32 risk_score
        +Vec~SecurityFlag~ flags
        +Option~String~ mfa_method
        +bool mfa_verified
        +Option~DateTime~ mfa_verified_at
        +Option~DateTime~ last_password_change
        +bool requires_password_change
        +Option~String~ auth_method
        +Option~String~ access_token_hash
    }
    class ActivityInfo {
        +DateTime created_at
        +DateTime last_activity
        +u64 request_count
    }
    class GeolocationInfo {
        +Option~String~ country
        +Option~String~ region
        +Option~String~ city
        +Option~f64~ latitude
        +Option~f64~ longitude
    }
    class SessionConfig {
        +Duration session_lifetime
        +Duration idle_timeout
        +u32 max_concurrent_sessions
        +bool require_mfa
        +bool track_device_info
        +bool track_geolocation
        +bool enable_security_flags
    }
    class SessionSecurityPolicy {
        +bool require_mfa_for_sensitive
        +u32 max_risk_score
        +bool block_tor
        +bool block_known_bad_ips
        +Duration reauth_interval
        +Vec~String~ high_risk_countries
    }
    class SessionManager {
        -Arc~SessionStorage~ storage
        +create(user_id, device, token) Result~Session~
        +get(id) Result~Option_Session~
        +update_activity(id) Result
        +revoke(id) Result
        +revoke_all_for_user(user_id) Result
        +validate(id) Result~Session~
        +cleanup_expired() Result
    }
    class SecurityFlag {
        <<enumeration>>
        SuspiciousLocation
        NewDevice
        MultipleFailedAttempts
        UnusualTime
        VpnDetected
        TorDetected
        RapidLocationChange
        BotBehavior
    }
    note for SessionState "Canonical SessionState in session::manager. security::secure_session imports from here. RequiresRotation and HighRisk were merged from secure_session."
    note for DeviceInfo "Canonical session DeviceInfo. audit::DeviceInfo kept separate (different fields; avoids circular dependency)."
    Session *-- DeviceInfo
    Session *-- SecurityMetadata
    Session *-- ActivityInfo
    Session ..> SessionState
    Session ..> GeolocationInfo
    SecurityMetadata ..> SecurityFlag
    SessionManager ..> SessionStorage
    SessionManager ..> Session
    SessionManager ..> SessionConfig
```

---

**Related:** [04-storage](04-storage.md) · [12-security](12-security.md) · [22-core](22-core.md)
