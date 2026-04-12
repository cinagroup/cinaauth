# Migration Guide: v0.4.x → v0.5.x

This guide covers breaking changes and migration steps for upgrading from AuthFramework v0.4.x to v0.5.x.

## Minimum Supported Rust Version

**MSRV changed from 1.70 to 1.88.** Ensure your toolchain is updated:

```bash
rustup update stable
```

## Rust Edition

AuthFramework v0.5.x uses **Rust Edition 2024**. This does not affect downstream crates directly, but some re-exported types may require Edition 2021+ in your code.

## Breaking Changes

### 1. JWT Secret Configuration

**Before (v0.4.x)**:

```rust
// Default used a static well-known sentinel value
let config = SecureJwtConfig::default();
```

**After (v0.5.x)**:

```rust
// Default generates a cryptographically random secret per call.
// For multi-node deployments, you MUST set jwt_secret explicitly.
let config = SecureJwtConfig {
    jwt_secret: std::env::var("JWT_SECRET").expect("JWT_SECRET required"),
    ..Default::default()
};
```

> **Warning**: `SecureJwtValidator::new()` panics in non-test builds if the old sentinel value is detected.

### 2. CORS Configuration

**Before (v0.4.x)**:

```rust
let config = ApiServerConfig {
    // CORS was implicitly allowed
    ..Default::default()
};
```

**After (v0.5.x)**:

```rust
use auth_framework::config::CorsConfig;

let config = ApiServerConfig {
    cors: CorsConfig::for_origins(["https://app.example.com"]),
    ..Default::default()
};
```

- `cors.enabled` defaults to `false`
- Empty `cors.allowed_origins` blocks all CORS requests even when `cors.enabled` is `true`

### 3. Storage Trait Changes

The `AuthStorage` trait requires the following methods in v0.5.x:

```rust
async fn count_active_sessions(&self) -> Result<u64>;
async fn list_kv_keys(&self, prefix: &str) -> Result<Vec<String>>;
```

If you have custom storage implementations, add these methods.

### 4. Default Features

**Before (v0.4.x)**: Minimal default feature set.

**After (v0.5.x)**: Default features include `enhanced-rbac` and `postgres-storage`.

If you were relying on a minimal build, explicitly disable defaults:

```toml
auth-framework = { version = "0.5", default-features = false, features = ["..."] }
```

### 5. Role System API

`AsyncRoleSystem::get_role(name)` looks up by `Role.name()`, not by ID. When creating roles, use `Role::new(role_id)` (where name equals ID) to enable `get_role(role_id)` lookups.

```rust
// Correct pattern:
let role = Role::new("admin"); // Role.name() == "admin"
role_system.register_role(role).await;
let found = role_system.get_role("admin").await; // Works
```

### 6. Token Revocation

Revoked tokens now use a KV-based scheme:

```text
Key:   revoked_token:{jti}
Value: b"revoked"
TTL:   7 days
```

`validate_api_token` automatically checks revocation status. No migration action required unless you had custom revocation logic.

### 7. MFA Key Changes

MFA state is now stored with explicit KV key patterns:

| Key                          | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `mfa_secret:{user_id}`       | TOTP secret                              |
| `mfa_enabled:{user_id}`      | MFA enabled flag (`b"true"`)             |
| `mfa_backup_codes:{user_id}` | SHA-256 hashed backup codes (JSON array) |

If upgrading an existing deployment with MFA data, existing TOTP secrets will need to be migrated to the new key format.

## New Protocol Modules

v0.5.x adds several new protocol implementations. No migration is needed — these are additive:

| Module                  | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `protocols::acme`       | ACME certificate management (RFC 8555)                    |
| `protocols::spiffe`     | SPIFFE ID and SVID validation                             |
| `protocols::caep`       | Continuous Access Evaluation Protocol                     |
| `protocols::openid4vci` | OpenID for Verifiable Credential Issuance                 |
| `protocols::openid4vp`  | OpenID for Verifiable Presentations (with DID resolution) |
| `protocols::gnap`       | Grant Negotiation and Authorization Protocol              |
| `protocols::kerberos`   | Kerberos V5 authentication                                |

## Dependency Changes

Key dependency updates in v0.5.x:

| Crate       | v0.4.x | v0.5.x    |
| ----------- | ------ | --------- |
| `rand`      | 0.8    | 0.10      |
| `base32`    | 0.4    | 0.5       |
| `totp-lite` | 1.x    | 2.x       |
| `bs58`      | —      | 0.5 (new) |

### `rand` Migration

```rust
// Before (0.8):
use rand::RngCore;
rng.fill_bytes(&mut buf);

// After (0.10):
use rand::Rng;
rng.fill_bytes(&mut buf);
```

### `base32` Migration

```rust
// Before (0.4):
base32::encode(base32::Alphabet::RFC4648 { padding: true }, &data);

// After (0.5):
base32::encode(base32::Alphabet::Rfc4648 { padding: true }, &data);
```

### `totp-lite` Migration

```rust
// Before (1.x):
totp_custom::<Sha1>(step, digits, &secret, time);

// After (2.x):
totp_custom::<Sha1>(step, digits, secret, time);
```

## Database Migration

No schema changes are required when upgrading storage backends. The KV-based storage keys are backward compatible.

If you are using PostgreSQL, ensure the database user has permissions for new tables that may be created on first run if using auto-migration.

## Step-by-Step Upgrade

1. **Update Rust toolchain** to 1.88+
2. **Update Cargo.toml**: `auth-framework = "0.5"`
3. **Set `JWT_SECRET`** environment variable (critical for production)
4. **Update CORS config** — set `cors.enabled` and `cors.allowed_origins`
5. **Update custom storage implementations** — add new trait methods
6. **Test**: `cargo test` to verify compilation
7. **Review feature flags** — defaults changed; adjust if needed
