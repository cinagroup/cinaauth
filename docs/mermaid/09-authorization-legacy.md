# Package: authorization (legacy)
> `src/authorization.rs` — original RBAC layer

> [← 08-permissions](08-permissions.md) · [index](23-cross-package.md) · [10-authorization-enhanced →](10-authorization-enhanced.md)

```mermaid
classDiagram
    class AbacPermission {
        +String resource
        +String action
        +Option~AccessCondition~ conditions
        +Vec~String~ attributes
        +matches(resource, action) bool
    }
    class AbacRole {
        +String id
        +String name
        +HashSet~AbacPermission~ permissions
        +Vec~String~ parent_roles
        +HashMap~String, Value~ metadata
        +add_permission(AbacPermission)
        +remove_permission(permission_id)
        +has_permission(permission, context) bool
    }
    class AccessContext {
        +String user_id
        +Vec~String~ roles
        +Vec~String~ permissions
        +Option~String~ resource
        +Option~String~ action
        +HashMap~String, Value~ attributes
    }
    class UserRole {
        +String user_id
        +String role_id
        +String role_name
        +Vec~String~ permissions
        +Option~DateTime~ expires_at
    }
    AbacRole *-- AbacPermission
```

> **Note:** ABAC-capable RBAC layer used by `MemoryStorage` via the `AuthorizationStorage` trait.
> The enhanced RBAC service is in `authorization_enhanced/`.
> `AbacPermission` and `AbacRole` are distinct from `permissions::Permission` and `permissions::Role` (simpler runtime RBAC).

---

**Related:** [08-permissions](08-permissions.md) · [04-storage](04-storage.md) · [10-authorization-enhanced](10-authorization-enhanced.md)
