# Package: storage

> `src/storage/` — AuthStorage trait and concrete backends

> [← 03-tokens](03-tokens.md) · [index](23-cross-package.md) · [05-user-context →](05-user-context.md)

```mermaid
classDiagram
    class AuthStorage {
        <<interface>>
        +store_token(token) Result
        +get_token(id) Result~Option_AuthToken~
        +get_token_by_access_token(token) Result~Option_AuthToken~
        +update_token(token) Result
        +delete_token(id) Result
        +list_user_tokens(user_id) Result~Vec_AuthToken~
        +store_session(id, data) Result
        +get_session(id) Result~Option_SessionData~
        +delete_session(id) Result
        +list_user_sessions(user_id) Result~Vec_SessionData~
        +count_active_sessions() Result~u64~
        +store_kv(key, value, ttl) Result
        +get_kv(key) Result~Option_Bytes~
        +delete_kv(key) Result
        +cleanup_expired() Result
    }
    class AuthorizationStorage {
        <<interface>>
        +store_role(role) Result
        +get_role(id) Result~Option_Role~
        +update_role(role) Result
        +delete_role(id) Result
        +list_roles() Result~Vec_Role~
        +assign_role(user_id, role_id) Result
        +remove_role(user_id, role_id) Result
        +get_user_roles(user_id) Result~Vec_Role~
        +get_role_users(role_id) Result~Vec_String~
    }
    class SessionData {
        +String session_id
        +String user_id
        +DateTime created_at
        +DateTime expires_at
        +DateTime last_activity
        +Option~String~ ip_address
        +Option~String~ user_agent
        +HashMap~String, Value~ data
    }
    class MemoryStorage {
        -DashMap~String, AuthToken~ tokens
        -DashMap~String, SessionData~ sessions
        -DashMap~String, Bytes~ kv
        -DashMap~String, Role~ roles
    }
    class RedisStorage {
        <<feature: redis>>
        -redis_Client client
        -String key_prefix
        +new(url, prefix) Result~Self~
    }
    class PostgresStorage {
        <<feature: postgres>>
        -PgPool pool
        +new(connection_string) Result~Self~
    }

    MemoryStorage ..|> AuthStorage
    MemoryStorage ..|> AuthorizationStorage
    RedisStorage ..|> AuthStorage
    PostgresStorage ..|> AuthStorage
```

---

**Related:** [07-methods](07-methods.md) · [08-permissions](08-permissions.md) · [11-session](11-session.md) · [13-audit](13-audit.md) · [14-oauth2-domain](14-oauth2-domain.md) · [22-core](22-core.md)
