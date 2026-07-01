# Package: admin / bin
> `src/bin/` — admin server binary types

> [← 20-api-layer](20-api-layer.md) · [index](23-cross-package.md) · [22-core →](22-core.md)

```mermaid
classDiagram
    class AppState {
        -Arc~Cinaauth~ framework
        -Arc~ApiServerConfig~ api_config
        -Arc~ServerStatus~ status
        -Arc~AuditLogger~ audit_logger
        -Instant start_time
        -Arc~TokenManager~ token_manager
        +get_framework() Arc~Cinaauth~
        +get_status() ServerStatus
        +get_uptime_seconds() u64
        +log_admin_action(user_id, action, resource, outcome) Result
    }
    class ServerStatus {
        +String version
        +HealthStatus health
        +DateTime started_at
        +u64 total_requests
        +u64 active_sessions
    }
    class HealthStatus {
        <<enumeration>>
        Healthy
        Degraded
        Unhealthy
    }
    AppState ..> ServerStatus
    ServerStatus ..> HealthStatus
```

---

**Related:** [20-api-layer](20-api-layer.md) · [22-core](22-core.md) · [13-audit](13-audit.md)
