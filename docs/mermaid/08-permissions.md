# Package: permissions
> `src/permissions.rs`

> [← 07-methods](07-methods.md) · [index](23-cross-package.md) · [09-authorization-legacy →](09-authorization-legacy.md)

```mermaid
classDiagram
    class Permission {
        <<dup>>
        +String id
        +String action
        +String resource
    }
    class Role {
        +Option~String~ id
        +String name
        +Option~String~ description
        +Vec~Permission~ permissions
        +HashSet~String~ parent_roles
        +HashMap~String, String~ metadata
        +Option~SystemTime~ created_at
        +Option~SystemTime~ updated_at
    }
    class UserPermissions {
        +String user_id
        +Vec~Role~ roles
        +Vec~Permission~ direct_permissions
        +HashMap~String, Value~ attributes
    }
    class PermissionChecker {
        -Arc~AuthStorage~ storage
        -Vec~AbacPolicy~ policies
        -Option~Arc~DelegationStore~~ delegation_store
        +check(user_id, permission) Result~bool~
        +check_with_context(user_id, perm, ctx) Result~bool~
        +get_effective_permissions(user_id) Result~Vec_Permission~
    }
    class AbacPolicy {
        +String id
        +Vec~AbacRule~ rules
    }
    class AbacRule {
        +String attribute
        +String operator
        +Value value
    }
    class Delegation {
        +String id
        +String delegator_id
        +String delegatee_id
        +Vec~Permission~ permissions
    }
    note for Permission "DUP (retained): authorization.rs AbacPermission has ABAC conditions; permissions.rs Permission is for RBAC runtime checks — different APIs"
    note for Role "Enriched with id, metadata, timestamps to align with authorization.rs AbacRole. Distinct from authorization::AbacRole (ABAC)"
    PermissionChecker ..> Permission
    PermissionChecker ..> AbacPolicy
    AbacPolicy *-- AbacRule
    UserPermissions *-- Role
    UserPermissions *-- Permission
    Role *-- Permission
    Delegation ..> Permission
```

---

**Related:** [04-storage](04-storage.md) · [09-authorization-legacy](09-authorization-legacy.md) · [10-authorization-enhanced](10-authorization-enhanced.md) · [22-core](22-core.md)
