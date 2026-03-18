# Distributed and Large-Scale Deployment Guide

This guide covers the architectural decisions and configuration adjustments required when
running AuthFramework across multiple nodes — for example, in a Kubernetes cluster, across
multiple data-centre regions, or behind a load balancer.

---

## Overview

AuthFramework is designed to work correctly in single-node deployments with minimal
configuration. When you scale out to multiple nodes you must ensure that:

1. **Shared secrets are consistent** — all nodes must use the same JWT signing secret.
2. **Session and token state is shared** — per-node in-memory stores are not sufficient.
3. **Token revocation propagates** — a token blacklisted on one node must be invalid on all others.
4. **Rate-limit state is shared** — per-node counters allow attackers to exceed limits by
   spreading requests across multiple nodes.

Each section below addresses one of these concerns.

---

## 1. JWT Signing Secret

By default, `SecureJwtConfig::default()` generates a fresh cryptographically-random secret on
every call. In a single-process deployment this is fine — the secret is generated once at
startup. In a multi-node deployment every node would generate a *different* secret, so tokens
issued on Node A would be rejected on Node B.

**Solution — set the secret explicitly from a shared source:**

```rust
use auth_framework::security::SecureJwtConfig;

// Read from an environment variable set the same on all nodes.
// In production, prefer a secrets manager (Vault, AWS Secrets Manager, etc.).
let jwt_secret = std::env::var("AUTH_JWT_SECRET")
    .expect("AUTH_JWT_SECRET must be set for multi-node deployments");

let jwt_config = SecureJwtConfig {
    jwt_secret: jwt_secret.into(),
    ..SecureJwtConfig::default()
};
```

For highest security, rotate the secret periodically via your secrets manager and trigger a
coordinated rolling restart so nodes transition to the new secret simultaneously. During the
rotation window tokens signed with the old secret will temporarily be invalid; if graceful
rotation is required, implement key-set rotation and validate against both the current and
previous key for a short overlap window.

### HSM / KMS Integration

When `cryptoki` (PKCS#11) support is enabled the JWT signing key can be stored in an HSM or
cloud KMS:

```rust
// Refer to docs/guides/hsm-integration.md for the full setup guide.
// At minimum, configure the PKCS#11 library path and token PIN:
std::env::set_var("CRYPTOKI_LIB", "/usr/lib/softhsm/libsofthsm2.so");
std::env::set_var("PKCS11_PIN", "<token-pin>");
```

---

## 2. Shared Storage Backend

The in-memory storage backend is not shared between processes. Enable PostgreSQL
(`postgres-storage` feature) or Redis (`redis-storage` feature) so that all nodes read and
write the same state.

### PostgreSQL (recommended for persistent state)

```rust
use auth_framework::{AuthFramework, AppConfig};

let config = AppConfig::builder()
    .storage(StorageConfig::Postgres {
        url: std::env::var("DATABASE_URL").unwrap(),
        max_connections: 20,
        ..Default::default()
    })
    .build();

let auth = AuthFramework::new(config).await?;
```

**Connection pooling considerations:**

- Each node maintains its own `sqlx` connection pool.
- Set `max_connections` conservatively — the database accepts at most
  `max_connections_per_node × number_of_nodes` connections.
- A safe starting point is `max_connections = 10` per node for a 4-node cluster, staying well
  below a typical PostgreSQL `max_connections = 200` server limit.
- Use `PgBouncer` in transaction-pooling mode when node count is high or connections are
  expensive.

### Redis (recommended for ephemeral session and rate-limit state)

```rust
let config = AppConfig::builder()
    .storage(StorageConfig::Redis {
        url: std::env::var("REDIS_URL").unwrap(),
        ..Default::default()
    })
    .build();
```

Redis is the preferred backend for:

- Active session records (short-lived, high-read-frequency)
- Revoked token records (see Section 3)
- Distributed rate-limit counters (see Section 4)
- Pending MFA state (`mfa_pending_secret:{uid}`, `mfa_pending_backup_codes:{uid}`)

### Tiered Storage (Redis + PostgreSQL)

Enable the `tiered-storage` feature to use Redis as a hot read cache in front of a PostgreSQL
persistence layer:

```toml
[dependencies]
auth-framework = { version = "0.5", features = ["tiered-storage"] }
```

This is the recommended configuration for high-throughput deployments where session lookups are
on the critical path.

---

## 3. Token Revocation Propagation

Revoked JWTs are stored in the key-value store as `revoked_token:{jti}` → `b"revoked"` with a
7-day TTL (matching the maximum token lifetime). Every call to `validate_api_token` checks this
key after verifying the JWT signature.

In a multi-node deployment this check works correctly only if all nodes share the same KV
store. Ensure:

- Redis or PostgreSQL is configured on every node (see Section 2).
- The in-memory backend is **not** used in production multi-node clusters.
- TTL on revocation records is at least as long as the maximum token expiry configured in
  `SecureJwtConfig::token_expiry`.

### Logout and Revocation Flow

```text
Client → POST /auth/logout
       → Node A writes revoked_token:{jti} to shared Redis
       → Node B reads revoked_token:{jti} on next request
       → Token rejected on all nodes within one Redis round-trip
```

---

## 4. Distributed Rate Limiting

By default, rate-limit state is held in memory per node. An attacker who distributes login
attempts across multiple nodes can exceed the per-node limit while staying below the threshold
that triggers a lockout.

Enable `distributed-rate-limiting` to use Redis as the shared counter store:

```toml
[dependencies]
auth-framework = { version = "0.5", features = ["distributed-rate-limiting"] }
```

This feature requires `redis-storage` or a Redis connection in the storage configuration. Once
enabled, the rate-limit window for each IP address and user account is shared across all nodes.

---

## 5. Session Management in Clustered Deployments

Sessions carry a `session_id` that clients present on every request. In a multi-node setup the
session must be looked up from the shared store on every request. There is no in-process session
cache; all session reads go to the configured storage backend.

**Recommendations:**

- Use Redis for sessions when latency is a concern; a Redis `GET` typically completes in < 1 ms
  on the same network.
- Set an explicit `session_ttl` that matches your security policy; the default is 24 hours.
- Enable `tiered-storage` if you need both sub-millisecond read latency and durable persistence.

---

## 6. Admin Web UI in Clustered Deployments

The admin web UI (`web-gui` feature) serves stateless HTML pages generated from shared
AuthFramework state. Any node can serve the admin UI as long as it connects to the shared
storage backend. There is no admin-UI-specific state that needs to be synchronized.

The admin UI login reads credentials from the `ADMIN_GUI_USERNAME` and `ADMIN_GUI_PASSWORD`
environment variables. Set these identically on every node. If `ADMIN_GUI_PASSWORD` is unset,
the login endpoint returns `403 Forbidden`.

---

## 7. Kubernetes Deployment

The `k8s/` directory contains baseline Kubernetes manifests. Key points for multi-replica
deployments:

```yaml
# k8s/auth-framework-deployment.yaml (excerpt)
spec:
  replicas: 3   # horizontal scale — all pods connect to the same DB
  template:
    spec:
      containers:
        - name: auth-framework
          env:
            - name: AUTH_JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: auth-framework-secrets
                  key: jwt_secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: auth-framework-secrets
                  key: database_url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: auth-framework-secrets
                  key: redis_url
```

**Readiness and liveness probes** should target the `/health` endpoint exposed by the
`api-server` feature. The health check returns a `200 OK` when all storage backends are
reachable.

---

## 8. Configuration Checklist for Multi-Node Deployments

| Concern                   | Required action                                                |
| ------------------------- | -------------------------------------------------------------- |
| JWT secret consistency    | Set `AUTH_JWT_SECRET` env var from a shared secrets store      |
| Shared session storage    | Configure `postgres-storage` or `redis-storage`                |
| Token revocation          | Shared KV store (Redis or Postgres) — do not use in-memory     |
| Distributed rate limiting | Enable `distributed-rate-limiting` feature + Redis             |
| Admin credentials         | Set `ADMIN_GUI_USERNAME` and `ADMIN_GUI_PASSWORD` consistently |
| Connection pool sizing    | `max_connections × node_count < DB server max_connections`     |
| Health checks             | Point load balancer probes at `/health`                        |

---

## 9. Performance Tuning

- **Connection pool size**: Default `max_connections = 10`; tune based on query latency and
  database capacity. Increase gradually and watch `pg_stat_activity` for idle connections.
- **Redis pipeline mode**: AuthFramework uses single-command Redis calls. For very high
  throughput (> 50 000 req/s per node) consider enabling Redis cluster mode and partitioning
  session keys by user ID prefix.
- **Tokio worker threads**: AuthFramework is `async`/`await` throughout. Set
  `TOKIO_WORKER_THREADS` to the number of available CPU cores. The default (`num_cpus`) is
  usually optimal.
- **Memory pools**: For latency-sensitive deployments enable the `performance-optimization`
  feature to activate `bumpalo` arena allocation on hot allocation paths.

---

## See Also

- [Production Deployment Guide](production-guide.md) — single-node production setup
- [Storage Backends](../storage-backends.md) — backend comparison and configuration reference
- [COMPATIBILITY.md](../../COMPATIBILITY.md) — feature stability tiers and support matrix
- [Kubernetes manifests](../../k8s/) — ready-to-use K8s deployment templates
