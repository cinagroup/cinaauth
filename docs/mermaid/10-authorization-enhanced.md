# Package: authorization_enhanced
> `src/authorization_enhanced/`

> [← 09-authorization-legacy](09-authorization-legacy.md) · [index](23-cross-package.md) · [11-session →](11-session.md)

```mermaid
classDiagram
    class AuthorizationService {
        -AuthorizationConfig config
        +check_permission(user_id, resource, action) Result~bool~
        +check_with_context(user_id, resource, action, ctx) Result~bool~
        +add_role(role) Result
        +remove_role(role_id) Result
        +assign_role_to_user(user_id, role_id) Result
        +revoke_role_from_user(user_id, role_id) Result
        +get_user_roles(user_id) Result~Vec_Role~
        +add_policy(policy) Result
        +evaluate_abac(user_id, resource, action, ctx) Result~bool~
        +create_context_builder() ContextBuilder
    }
    class AuthorizationConfig {
        +bool enable_abac
        +bool enable_rbac
        +bool cache_decisions
        +Duration cache_ttl
    }
    class AuthorizationContext {
        +Option~String~ resource_owner
        +Option~String~ resource_type
        +Option~String~ environment
        +TimeOfDay time_of_day
        +DayType day_type
        +DeviceType device_type
        +ConnectionType connection_type
        +SecurityLevel security_level
        +Option~String~ location
        +bool is_admin_action
        +Option~String~ delegated_by
        +HashMap~String, Value~ custom
    }
    class ContextBuilder {
        +AuthorizationContext context
        +new() Self
        +with_time_of_day(tod) Self
        +with_device_type(dt) Self
        +build() AuthorizationContext
    }
    class TimeOfDay {
        <<enumeration>>
        BusinessHours
        Evening
        Night
        Weekend
    }
    class DayType {
        <<enumeration>>
        Weekday
        Weekend
        Holiday
    }
    class DeviceType {
        <<enumeration>>
        Desktop
        Mobile
        Tablet
        Unknown
    }
    class ConnectionType {
        <<enumeration>>
        Direct
        Vpn
        Tor
        Cloud
        Residential
        Unknown
    }
    class SecurityLevel {
        <<enumeration>>
        Standard
        Elevated
        High
        Critical
    }
    AuthorizationService *-- AuthorizationConfig
    AuthorizationContext ..> TimeOfDay
    AuthorizationContext ..> DayType
    AuthorizationContext ..> DeviceType
    AuthorizationContext ..> ConnectionType
    AuthorizationContext ..> SecurityLevel
    ContextBuilder ..> AuthorizationContext
    AuthorizationService ..> AuthorizationContext
```

---

**Related:** [09-authorization-legacy](09-authorization-legacy.md) · [08-permissions](08-permissions.md) · [22-core](22-core.md)
