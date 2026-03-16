# Package: distributed
> `src/distributed/`

> [← 18-token-exchange](18-token-exchange.md) · [index](23-cross-package.md) · [20-api-layer →](20-api-layer.md)

```mermaid
classDiagram
    class DistributedSessionStore {
        <<interface>>
        +sync_session(session) Result
    }
    class LocalOnlySessionStore {
        +sync_session(session) Result
    }
    class DistributedRateLimiter {
        -RateLimitStrategy strategy
        +check(key) Result~RateLimitResult~
        +record_request(key) Result
        +reset(key) Result
        +get_remaining(key) Result~u32~
        +get_reset_time(key) Result~DateTime~
    }
    class RateLimitStrategy {
        <<enumeration>>
        FixedWindow
        SlidingWindow
        TokenBucket
        LeakyBucket
    }
    class RateLimitResult {
        <<enumeration>>
        Allowed
        Throttled
        Blocked
    }
    LocalOnlySessionStore ..|> DistributedSessionStore
    DistributedRateLimiter ..> RateLimitStrategy
    DistributedRateLimiter ..> RateLimitResult
```

---

**Related:** [11-session](11-session.md) · [22-core](22-core.md)
