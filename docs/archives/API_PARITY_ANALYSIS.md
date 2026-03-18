# API Parity Analysis: Internal Rust API vs REST API

**Date**: October 1, 2025  
**Framework Version**: 0.4.2

## Executive Summary

This document analyzes the functional parity between AuthFramework's **internal Rust library API** (used by applications that directly integrate the crate) and the **REST API** (used by applications that communicate over HTTP).

### Key Findings

1. **Core Authentication & Authorization**: ✅ **Full Parity** - Both APIs provide equivalent functionality
2. **Session Management**: ✅ **Full Parity** - Complete session lifecycle exposed
3. **MFA Operations**: ✅ **Full Parity** - Setup, verification, backup codes available
4. **OAuth 2.0/OIDC**: ⚠️ **Partial Parity** - REST API missing advanced server-side features
5. **Administration & Monitoring**: ⚠️ **Partial Parity** - Stats exposed, but limited internal controls
6. **Storage Backend Control**: ❌ **Library-Only** - Cannot be exposed safely via REST
7. **Configuration Management**: ❌ **Library-Only** - Server-side concern, not client-facing
8. **Advanced Security Features**: ⚠️ **Partial Parity** - Some features library-only by design

---

## 1. Core Authentication & Authorization

### Internal Rust API

```rust
// Framework initialization
let mut auth = AuthFramework::new(config);
auth.register_method("jwt", AuthMethodEnum::Jwt(jwt_method));
auth.initialize().await?;

// Authentication
let credential = Credential::password("user@example.com", "password");
let result = auth.authenticate("jwt", credential).await?;

// Token operations
let is_valid = auth.validate_token(&token).await?;
let user_info = auth.get_user_info(&token).await?;
let new_token = auth.refresh_token(&token).await?;
auth.revoke_token(&token).await?;

// Permission checking
let has_permission = auth.check_permission(&token, "read", "documents").await?;
```

**Capabilities**:

- ✅ Programmatic method registration
- ✅ Multiple authentication methods simultaneously
- ✅ Direct credential object manipulation
- ✅ Fine-grained error handling
- ✅ Type-safe API with compile-time guarantees

### REST API

```http
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/validate
POST /api/v1/auth/logout
```

**Capabilities**:

- ✅ Login/logout/refresh lifecycle
- ✅ Token validation
- ✅ Permission checking via middleware
- ✅ Standard HTTP semantics

### Parity Assessment: ✅ **FULL PARITY**

The REST API provides all essential authentication operations. The internal API's ability to register methods at runtime is a configuration concern, not a client operation.

**Recommendation**: ✅ No changes needed - APIs serve different use cases appropriately.

---

## 2. Session Management

### Internal Rust API

```rust
// Session creation
let session_id = auth.create_session(
    "user123",
    Duration::from_secs(3600),
    Some("192.168.1.1".to_string()),
    Some("Mozilla/5.0...".to_string())
).await?;

// Session operations
let session = auth.get_session(&session_id).await?;
auth.delete_session(&session_id).await?;
let sessions = auth.list_user_sessions("user123").await?;
```

### REST API

```http
GET    /api/v1/users/sessions
DELETE /api/v1/users/sessions/{session_id}
GET    /api/v1/users/sessions/current
```

**Capabilities**:

- ✅ List all sessions
- ✅ Terminate specific session
- ✅ Get current session info
- ✅ Automatic session tracking via tokens

### Parity Assessment: ✅ **FULL PARITY**

REST API provides complete session management. Session creation happens implicitly on login (better security model for REST).

**Recommendation**: ✅ No changes needed - REST model is actually more secure by not allowing arbitrary session creation.

---

## 3. Multi-Factor Authentication (MFA)

### Internal Rust API

```rust
// Complete MFA challenge (internal flow)
let token = auth.complete_mfa(challenge, "123456").await?;

// MFA method management (via MfaManager)
let manager = auth.mfa_manager();
let secret = manager.setup_totp("user123").await?;
manager.verify_totp("user123", "123456").await?;
manager.disable_mfa("user123").await?;
```

### REST API

```http
POST   /api/v1/mfa/setup
POST   /api/v1/mfa/verify
POST   /api/v1/mfa/verify-login
DELETE /api/v1/mfa/disable
POST   /api/v1/mfa/backup-codes
```

**Capabilities**:

- ✅ TOTP setup
- ✅ Verification
- ✅ Backup code generation
- ✅ MFA disable
- ✅ Login-time MFA challenge/response

### Parity Assessment: ✅ **FULL PARITY**

REST API provides all MFA operations needed by clients.

**Recommendation**: ✅ No changes needed - Complete feature parity.

---

## 4. OAuth 2.0 / OpenID Connect

### Internal Rust API

```rust
// Full OAuth 2.0 Server implementation
use auth_framework::server::{OAuth2Server, OidcProvider};

let oauth_server = OAuth2Server::new(storage).await?;
let client = oauth_server.register_client(client_config).await?;

// Authorization request processing
let auth_request = AuthorizationRequest { /* ... */ };
let code = oauth_server.handle_authorization(auth_request).await?;

// Token issuance
let tokens = oauth_server.exchange_code_for_tokens(code, client_id).await?;

// Advanced features
let par_manager = PARManager::new(storage);
let dpop_manager = DpopManager::new(storage);
let introspection = TokenIntrospectionService::new(storage);

// OIDC Provider
let oidc = OidcProvider::new(oidc_config, storage);
let id_token = oidc.create_id_token(user_id, client_id, nonce).await?;
let userinfo = oidc.get_userinfo(access_token).await?;
```

**Advanced Capabilities**:

- ✅ Complete OAuth 2.0/2.1 server implementation
- ✅ OpenID Connect Provider
- ✅ Pushed Authorization Requests (PAR) - RFC 9126
- ✅ DPoP (Demonstrating Proof of Possession) - RFC 9449
- ✅ Token Introspection - RFC 7662
- ✅ Rich Authorization Requests (RAR) - RFC 9396
- ✅ JWT Authorization Request (JAR) - RFC 9101
- ✅ Dynamic Client Registration - RFC 7591
- ✅ Device Authorization Grant - RFC 8628
- ✅ Backchannel Logout - OIDC Backchannel Logout 1.0
- ✅ Frontchannel Logout - OIDC Frontchannel Logout 1.0
- ✅ Stepped-up Authentication
- ✅ Client authentication methods (client_secret_basic, client_secret_post, private_key_jwt)

### REST API

```http
# Standard OAuth endpoints
GET  /api/v1/oauth/authorize
POST /api/v1/oauth/token
POST /api/v1/oauth/revoke

# OIDC discovery
GET  /.well-known/openid-configuration
GET  /.well-known/jwks.json

# OIDC UserInfo
GET  /api/v1/oauth/userinfo
```

**Current Capabilities**:

- ✅ Authorization Code flow
- ✅ Token exchange
- ✅ Token revocation
- ✅ OIDC discovery
- ✅ UserInfo endpoint
- ✅ JWKS endpoint

**Missing Advanced Features**:

- ❌ Pushed Authorization Requests (PAR)
- ❌ DPoP token binding
- ❌ Token introspection endpoint
- ❌ Rich Authorization Requests
- ❌ Device Authorization Grant
- ❌ Dynamic Client Registration endpoint
- ❌ Backchannel/Frontchannel Logout endpoints

### Parity Assessment: ⚠️ **PARTIAL PARITY** (70% coverage)

The REST API covers standard OAuth/OIDC flows but lacks advanced RFC implementations that the internal API provides.

**Recommendations**:

### Priority 1: Essential OAuth/OIDC Endpoints (High Security Value)

1. **Token Introspection Endpoint** - RFC 7662

   ```http
   POST /api/v1/oauth/introspect
   ```

   - Allows resource servers to validate opaque tokens
   - Critical for distributed architectures
   - **Security**: Requires client authentication
   - **Implementation**: Straightforward wrapper around `TokenIntrospectionService`

2. **Dynamic Client Registration** - RFC 7591

   ```http
   POST /api/v1/oauth/register
   GET  /api/v1/oauth/register/{client_id}
   PUT  /api/v1/oauth/register/{client_id}
   DELETE /api/v1/oauth/register/{client_id}
   ```

   - Enables programmatic client registration
   - Essential for SaaS/multi-tenant scenarios
   - **Security**: Requires initial registration token
   - **Implementation**: Expose `ClientRegistrationManager` methods

### Priority 2: Modern Security Standards (Medium Priority)

3. **Pushed Authorization Requests (PAR)** - RFC 9126

   ```http
   POST /api/v1/oauth/par
   ```

   - Enhances security by moving parameters from URL to POST body
   - Prevents parameter tampering and injection
   - **Security**: Prevents authorization request manipulation
   - **Implementation**: Expose `PARManager`

4. **DPoP Support** - RFC 9449

   ```http
   # Requires DPoP header on token requests
   POST /api/v1/oauth/token
   Headers: DPoP: <jwt>
   ```

   - Binds tokens to client keys (prevents token theft)
   - Strong security enhancement
   - **Security**: Makes stolen tokens useless
   - **Implementation**: Integrate `DpopManager` into token endpoints

### Priority 3: Special Use Cases (Lower Priority)

5. **Device Authorization Grant** - RFC 8628

   ```http
   POST /api/v1/oauth/device/code
   POST /api/v1/oauth/device/token
   ```

   - For input-constrained devices (smart TVs, IoT)
   - Niche but important use case
   - **Security**: Polling-based flow, rate-limited
   - **Implementation**: Expose device flow methods

6. **Rich Authorization Requests (RAR)** - RFC 9396

   ```http
   POST /api/v1/oauth/authorize
   Body: authorization_details=[...]
   ```

   - Fine-grained authorization beyond scopes
   - Complex authorization scenarios
   - **Security**: Enables detailed permission requests
   - **Implementation**: Expose `RarManager`

### Priority 4: Session Management (Optional)

7. **OIDC Logout Endpoints**

   ```http
   # Frontchannel
   GET  /api/v1/oauth/logout
   
   # Backchannel
   POST /api/v1/oauth/backchannel-logout
   ```

   - Coordinated logout across multiple clients
   - Important for enterprise SSO
   - **Security**: Ensures complete session termination
   - **Implementation**: Expose logout managers

---

## 5. Administration & Monitoring

### Internal Rust API

```rust
// Statistics and monitoring
let stats = auth.get_stats().await?;
println!("Active sessions: {}", stats.active_sessions);
println!("Total logins: {}", stats.total_authentications);

// User management
let users = auth.list_users().await?;
auth.delete_user("user123").await?;
auth.update_user_status("user123", UserStatus::Suspended).await?;

// Configuration inspection (read-only access)
let config = auth.config();
let rate_limit_config = &config.rate_limit;

// Audit log access
let audit_logger = auth.audit_logger();
let events = audit_logger.get_events(filter).await?;
```

### REST API

```http
# Admin endpoints
GET    /api/v1/admin/users
POST   /api/v1/admin/users
GET    /api/v1/admin/users/{user_id}
PUT    /api/v1/admin/users/{user_id}
DELETE /api/v1/admin/users/{user_id}
POST   /api/v1/admin/users/{user_id}/reset-password

# Statistics
GET    /api/v1/admin/stats

# Configuration (read-only)
GET    /api/v1/admin/config

# System operations
POST   /api/v1/admin/backup
POST   /api/v1/admin/restore
```

**Capabilities**:

- ✅ User CRUD operations
- ✅ Statistics retrieval
- ✅ Configuration viewing
- ✅ Backup/restore operations
- ✅ Password reset

**Missing Capabilities**:

- ❌ Audit log querying via REST (security-sensitive)
- ❌ Live configuration updates (by design - requires restart)
- ❌ Method registration at runtime (architecture-level concern)

### Parity Assessment: ⚠️ **APPROPRIATE PARTIAL PARITY** (85% coverage)

Most admin operations are exposed. Missing items are intentionally library-only for security or architectural reasons.

**Recommendations**:

1. **Add Audit Log Query Endpoint** (Optional - High Security Risk)

   ```http
   GET /api/v1/admin/audit-logs?start_time=&end_time=&user_id=&event_type=&limit=100
   ```

   - **Security Concerns**:
     - Audit logs contain sensitive security information
     - Must require highest admin privileges
     - Consider rate limiting aggressively
     - May want separate auth service for audit access
   - **Decision**: Only add if absolutely necessary; prefer separate audit service

2. **Health Check Enhancements** (Low Risk)

   ```http
   GET /api/v1/health/detailed  # Existing
   
   # Add:
   GET /api/v1/health/dependencies  # Check storage, external services
   ```

   - Shows status of dependencies (storage, rate limiters, etc.)
   - Useful for monitoring systems
   - Low security risk with proper auth

---

## 6. Storage Backend Control

### Internal Rust API

```rust
// Storage backend selection and configuration
use auth_framework::storage::{MemoryStorage, PostgresStorage, RedisStorage};

let storage = Arc::new(PostgresStorage::new(db_config).await?);
let mut auth = AuthFramework::new_with_storage(config, storage);

// Or swap storage after creation
auth.replace_storage(new_storage);

// Direct storage access (library implementations can query storage)
let token = storage.get_token("token_id").await?;
let sessions = storage.list_user_sessions("user123").await?;
```

### REST API

**Not exposed** - Storage backend is a server-side configuration concern.

### Parity Assessment: ❌ **LIBRARY-ONLY BY DESIGN**

**Recommendation**: ✅ **Do NOT expose** - Storage backend selection is a deployment-time decision, not a runtime client concern. This is correct architecture.

---

## 7. Configuration Management

### Internal Rust API

```rust
// Configuration construction
let config = AuthConfig::default()
    .with_secret("my-secret-key")
    .with_token_expiration(Duration::from_secs(3600))
    .with_rate_limit(RateLimitConfig {
        max_attempts: 5,
        window: Duration::from_secs(900),
    });

let auth = AuthFramework::new(config);
```

### REST API

```http
GET /api/v1/admin/config  # Read-only view
```

**Exposed Configuration** (read-only):

- ✅ Token expiration settings
- ✅ Rate limit settings (obfuscated)
- ✅ Enabled features
- ✅ Security settings (sanitized - no secrets)

**Not Exposed**:

- ❌ Secret keys
- ❌ Private keys
- ❌ Database credentials
- ❌ Internal implementation details

### Parity Assessment: ❌ **LIBRARY-ONLY BY DESIGN**

**Recommendation**: ✅ **Correct As-Is** - Configuration is set at application startup, not changed dynamically via API. REST API provides read-only view for monitoring purposes, which is appropriate.

---

## 8. Advanced Security Features

### Internal Rust API

```rust
// Rate limiting (automatic, but accessible)
let rate_limiter = &auth.rate_limiter();
rate_limiter.check_rate_limit("user123", "login").await?;

// CSRF protection
let csrf_token = auth.generate_csrf_token("user123").await?;
auth.validate_csrf_token("user123", &csrf_token).await?;

// Threat intelligence
let threat_manager = auth.threat_intelligence_manager();
let is_malicious = threat_manager.check_ip("1.2.3.4").await?;

// Secure session management
let secure_session_manager = SecureSessionManager::new(config);
let session = secure_session_manager.create_session(user_id, fingerprint).await?;

// Custom authentication methods
impl AuthMethod for MyCustomMethod {
    async fn authenticate(&self, credential: Credential) -> Result<MethodResult> {
        // Custom logic
    }
}
auth.register_method("custom", AuthMethodEnum::Custom(my_method));
```

### REST API

**Automatic Security Features**:

- ✅ Rate limiting (automatic on all endpoints)
- ✅ CSRF protection (for cookie-based sessions)
- ✅ Secure headers (HSTS, CSP, etc.)
- ✅ Input validation

**Not Exposed Programmatically**:

- ❌ Direct rate limiter access
- ❌ Manual CSRF token generation (automatic via cookies)
- ❌ Threat intelligence queries (automatic blocking)
- ❌ Custom authentication method registration

### Parity Assessment: ⚠️ **INTENTIONAL DIFFERENCE**

Security features work automatically in REST API but are not controllable by clients (by design).

**Recommendations**:

1. **Add CSRF Token Endpoint** (If using cookie-based sessions)

   ```http
   GET /api/v1/auth/csrf-token
   ```

   - For SPA applications that need explicit CSRF tokens
   - Only needed if using cookie-based auth (not JWT)
   - **Security**: Tied to session, changes on refresh

2. **Add IP Reputation Check Endpoint** (Optional - for advanced clients)

   ```http
   POST /api/v1/security/check-ip
   Body: { "ip_address": "1.2.3.4" }
   Response: { "is_malicious": false, "risk_level": "low", "categories": [] }
   ```

   - Allows applications to check IP reputation before allowing actions
   - Useful for fraud prevention
   - **Security**: Rate-limited, admin-only or authenticated users

---

## Summary of Recommendations

### ✅ SHOULD ADD (High Value, Low Risk)

1. **Token Introspection Endpoint** - Essential for resource servers
2. **Dynamic Client Registration** - Critical for SaaS/multi-tenant
3. **Health Check Enhancements** - Better observability

### ⚠️ CONSIDER ADDING (Medium Value, Medium Risk)

4. **PAR (Pushed Authorization Requests)** - Modern security standard
5. **DPoP Support** - Token theft prevention
6. **Device Authorization Grant** - IoT/Smart TV use cases

### 🔒 DO NOT ADD (Architecture/Security Reasons)

- ❌ Storage backend control - Deployment concern, not API concern
- ❌ Configuration mutation - Restart-required changes, not runtime
- ❌ Custom method registration - Application architecture, not client operation
- ❌ Direct audit log access - Too security-sensitive; needs separate service
- ❌ Direct rate limiter control - Should be automatic/invisible to clients

### 📋 OPTIONAL (Low Priority, Niche Use Cases)

7. **Rich Authorization Requests** - Complex authorization scenarios
8. **OIDC Logout Endpoints** - Enterprise SSO scenarios
9. **CSRF Token Endpoint** - Only if using cookie-based auth
10. **IP Reputation Check** - Advanced fraud prevention

---

## Implementation Priority Matrix

| Feature                     | Priority | Security Impact                        | Implementation Complexity | Estimated Effort |
| --------------------------- | -------- | -------------------------------------- | ------------------------- | ---------------- |
| Token Introspection         | **P0**   | High (enables secure resource servers) | Low                       | 4 hours          |
| Dynamic Client Registration | **P0**   | High (enables multi-tenancy)           | Medium                    | 8 hours          |
| Health Check Enhancements   | **P0**   | Low                                    | Low                       | 2 hours          |
| PAR Endpoint                | **P1**   | High (prevents parameter tampering)    | Low                       | 4 hours          |
| DPoP Support                | **P1**   | Very High (prevents token theft)       | Medium                    | 12 hours         |
| Device Authorization        | **P2**   | Medium                                 | Medium                    | 8 hours          |
| Rich Authorization          | **P2**   | Medium                                 | Medium                    | 8 hours          |
| OIDC Logout                 | **P2**   | Medium                                 | Low                       | 4 hours          |
| CSRF Token Endpoint         | **P3**   | Medium (context-dependent)             | Low                       | 2 hours          |
| IP Reputation Check         | **P3**   | Low (nice-to-have)                     | Low                       | 3 hours          |

**Total P0 Effort**: ~14 hours  
**Total P0+P1 Effort**: ~30 hours  
**Total All Features**: ~55 hours

---

## Conclusion

The REST API currently provides **excellent parity** (~85%) with the internal Rust API for all **client-facing operations**. The gaps that exist are primarily in:

1. **Advanced OAuth/OIDC RFCs** - Should be added for completeness and modern security
2. **Administrative/Monitoring Operations** - Some intentionally library-only
3. **Configuration/Architecture** - Correctly restricted to library API

### Philosophy on API Parity

**The REST API should expose**:

- ✅ All client-driven operations (auth, sessions, MFA, user profile)
- ✅ Standard OAuth/OIDC flows
- ✅ Administrative operations for user management
- ✅ Monitoring/observability endpoints

**The REST API should NOT expose**:

- ❌ Framework initialization/configuration (application startup concern)
- ❌ Storage backend selection (deployment concern)
- ❌ Internal implementation details (leaky abstraction)
- ❌ Operations that bypass security boundaries

### Next Steps

1. **Review and approve** Priority 0 recommendations (Token Introspection, Client Registration, Health Checks)
2. **Create OpenAPI specs** for new endpoints before implementation
3. **Implement in phases**: P0 → P1 → P2 → P3
4. **Add comprehensive tests** for each new endpoint
5. **Update client SDKs** (Python, JavaScript) with new capabilities
6. **Document security considerations** for each new endpoint

---

**Document Version**: 1.0  
**Last Updated**: October 1, 2025  
**Next Review**: When implementing new OAuth RFCs or adding major features
