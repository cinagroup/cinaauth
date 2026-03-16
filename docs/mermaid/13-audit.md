# Package: audit
> `src/audit/`

> [← 12-security](12-security.md) · [index](23-cross-package.md) · [14-oauth2-domain →](14-oauth2-domain.md)

```mermaid
classDiagram
    class AuditStorageInterface {
        <<interface>>
        +store_event(event) Result
        +get_event(id) Result~Option_AuditEvent~
        +query_events(query) Result~Vec_AuditEvent~
        +count_events(query) Result~u64~
        +delete_old_events(before) Result~u64~
        +get_risk_summary(user_id) Result~RiskSummary~
    }
    class AuditEventType {
        <<enumeration>>
        Login
        Logout
        TokenIssued
        TokenRevoked
        TokenRefreshed
        TokenValidated
        PermissionChecked
        PermissionGranted
        PermissionDenied
        RoleAssigned
        RoleRevoked
        UserCreated
        UserUpdated
        UserDeleted
        PasswordChanged
        MfaEnrolled
        MfaVerified
        MfaFailed
        SessionCreated
        SessionRevoked
        SessionExpired
        ApiKeyCreated
        ApiKeyRevoked
        OAuthFlowStarted
        OAuthFlowCompleted
        DeviceFlowStarted
        SecurityAlert
        ConfigChanged
        AdminAction
        Custom
    }
    class RiskLevel {
        <<enumeration>>
        Low
        Medium
        High
        Critical
    }
    class EventOutcome {
        <<enumeration>>
        Success
        Failure
        PartialSuccess
        Blocked
    }
    class AuditEvent {
        +String event_id
        +AuditEventType event_type
        +DateTime timestamp
        +EventOutcome outcome
        +RiskLevel risk_level
        +ActorInfo actor
        +ResourceInfo resource
        +RequestMetadata request
        +Option~String~ error_message
        +HashMap~String, Value~ metadata
        +Option~String~ session_id
    }
    class RequestMetadata {
        +Option~String~ ip_address
        +Option~String~ user_agent
        +Option~String~ request_id
        +Option~String~ trace_id
        +Option~String~ correlation_id
    }
    class ActorInfo {
        +Option~String~ user_id
        +Option~String~ username
        +Option~String~ client_id
        +Option~String~ service_name
    }
    class ResourceInfo {
        +Option~String~ resource_type
        +Option~String~ resource_id
        +Option~String~ action
        +Option~String~ description
    }
    class AuditQuery {
        +Option~String~ user_id
        +Option~AuditEventType~ event_type
        +Option~DateTime~ from
        +Option~DateTime~ to
        +Option~RiskLevel~ min_risk_level
        +Option~u32~ limit
    }
    class AuditLogger {
        +log(event) Result
        +log_auth(user_id, outcome, meta) Result
        +log_permission(user_id, perm, outcome) Result
    }
    AuditEvent *-- ActorInfo
    AuditEvent *-- ResourceInfo
    AuditEvent *-- RequestMetadata
    AuditEvent ..> AuditEventType
    AuditEvent ..> RiskLevel
    AuditEvent ..> EventOutcome
    AuditLogger ..> AuditEvent
    AuditLogger ..> AuditStorageInterface
    AuditQuery ..> AuditEventType
    AuditQuery ..> RiskLevel
```

---

**Related:** [04-storage](04-storage.md) · [20-api-layer](20-api-layer.md) · [21-admin](21-admin.md) · [22-core](22-core.md)
