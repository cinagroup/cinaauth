# Package: user_context

> `src/user_context.rs` — in-memory session store and user context

> [← 04-storage](04-storage.md) · [index](23-cross-package.md) · [06-providers →](06-providers.md)

```mermaid
classDiagram
    class UserContext {
        +String user_id
        +String username
        +Option~String~ email
        +Vec~String~ scopes
        +SystemTime authenticated_at
        +String session_id
        +HashMap~String, String~ attributes
        +has_scope(scope) bool
        +add_attribute(key, value) void
    }
    class SessionStore {
        -HashMap~String, UserContext~ sessions
        +new() Self
        +create_session(ctx) String
        +get_session(id) Option~UserContext~
        +invalidate_session(id) bool
        +validate_session(id) bool
    }

    SessionStore o-- UserContext
```

---

**Related:** [11-session](11-session.md) · [22-core](22-core.md)
