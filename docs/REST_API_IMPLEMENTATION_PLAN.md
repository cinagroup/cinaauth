# REST API Implementation Plan

**Date**: October 1, 2025  
**Status**: 📋 Planning Phase

## Overview

We have created **comprehensive OpenAPI 3.1.0 documentation** for 10 new REST API endpoints, but the actual **Rust implementation** doesn't exist yet. This document outlines the implementation plan including code structure, test strategy, and estimated effort.

---

## Current Status Analysis

### ✅ What EXISTS

1. **Internal Library Components** (fully implemented):
   - `TokenIntrospectionService` (`src/server/token_exchange/token_introspection.rs`)
   - `PARManager` (`src/server/oauth/par.rs`)
   - `DpopManager` (`src/server/security/dpop.rs`)
   - `ClientRegistrationManager` (`src/server/core/client_registration.rs`)
   - Device flow support (via `oauth-device-flows` crate)
   - `ThreatFeedManager` (`src/threat_intelligence.rs`)

2. **Partial REST API Implementation**:
   - ✅ `introspect_token()` exists in `src/api/oauth.rs` (lines 327-370) **BUT it's a placeholder**
   - ❌ All other endpoints missing

3. **Complete OpenAPI Documentation**:
   - ✅ All endpoint schemas defined
   - ✅ Request/response examples
   - ✅ Security requirements documented
   - ✅ Validated and bundled

### ❌ What's MISSING

#### Missing REST API Endpoint Handlers

1. ❌ `POST /api/v1/oauth/introspect` - Needs real implementation (currently placeholder)
2. ❌ `POST /api/v1/oauth/par` - Completely missing
3. ❌ `POST /api/v1/oauth/device/code` - Completely missing
4. ❌ `POST /api/v1/oauth/device/token` - Completely missing
5. ❌ `GET /api/v1/oauth/logout` - Completely missing
6. ❌ `POST /api/v1/oauth/backchannel-logout` - Completely missing
7. ❌ `POST /api/v1/oauth/register` - Completely missing
8. ❌ `GET /api/v1/oauth/register/{client_id}` - Completely missing
9. ❌ `PUT /api/v1/oauth/register/{client_id}` - Completely missing
10. ❌ `DELETE /api/v1/oauth/register/{client_id}` - Completely missing
11. ❌ `GET /api/v1/health/dependencies` - Completely missing
12. ❌ `POST /api/v1/security/check-ip` - Completely missing

#### Missing Tests

- ❌ No integration tests for any new endpoints
- ❌ No unit tests for new endpoint handlers
- ❌ No edge case tests
- ❌ No security validation tests

#### Missing Router Configuration

- ❌ New endpoints not added to Axum router
- ❌ Middleware not configured for new endpoints
- ❌ Rate limiting not configured

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Estimated: 4 hours)

1. **Create `src/api/oauth_advanced.rs`** - New module for advanced OAuth endpoints
2. **Create `src/api/security.rs`** - New module for security endpoints
3. **Update `src/api/mod.rs`** - Export new modules
4. **Update `src/api/server.rs`** - Register new routes
5. **Add middleware configuration** - Auth, rate limiting, CORS

### Phase 2: OAuth Advanced Endpoints (Estimated: 16 hours)

#### 2.1 Token Introspection (2 hours)

**File**: `src/api/oauth_advanced.rs`
**Function**: `introspect_token()`

- Replace placeholder in `oauth.rs` or move to `oauth_advanced.rs`
- Wire up to `TokenIntrospectionService`
- Handle client authentication (Basic Auth or POST body)
- Return RFC 7662 compliant response
- **Tests**: 8 test cases
  - ✅ Valid token introspection
  - ✅ Expired token
  - ✅ Revoked token
  - ✅ Invalid token
  - ✅ Missing client credentials
  - ✅ Invalid client credentials
  - ✅ Rate limit exceeded
  - ✅ Token type hint handling

#### 2.2 Pushed Authorization Requests (3 hours)

**File**: `src/api/oauth_advanced.rs`
**Function**: `pushed_authorization_request()`

- Wire up to `PARManager`
- Validate authorization parameters
- Generate request_uri
- Store authorization request with 90s TTL
- Return RFC 9126 compliant response
- **Tests**: 10 test cases
  - ✅ Valid PAR request
  - ✅ Missing client_id
  - ✅ Missing redirect_uri
  - ✅ Invalid redirect_uri
  - ✅ PKCE validation
  - ✅ Duplicate request_uri prevention
  - ✅ Request URI expiration (90s)
  - ✅ Request URI one-time use
  - ✅ Parameter validation
  - ✅ Rate limit exceeded

#### 2.3 Device Authorization Grant (4 hours)

**File**: `src/api/oauth_advanced.rs`
**Functions**: `device_authorization()`, `device_token()`

- Integrate with `oauth-device-flows` crate
- Generate device code and user code
- Implement polling endpoint with backoff
- Handle authorization_pending/slow_down/expired_token errors
- **Tests**: 12 test cases
  - ✅ Valid device authorization request
  - ✅ Device code generation
  - ✅ User code format validation
  - ✅ Token polling - authorization_pending
  - ✅ Token polling - user approved
  - ✅ Token polling - user denied
  - ✅ Token polling - too frequent (slow_down)
  - ✅ Device code expiration
  - ✅ Invalid device code
  - ✅ Invalid client_id
  - ✅ Rate limit on authorization endpoint
  - ✅ Rate limit on token endpoint

#### 2.4 Dynamic Client Registration (5 hours)

**File**: `src/api/oauth_advanced.rs`
**Functions**: `register_client()`, `get_client()`, `update_client()`, `delete_client()`

- Wire up to `ClientRegistrationManager`
- Generate client_id and client_secret
- Validate registration token (if required)
- Handle registration access tokens
- Validate redirect URIs
- **Tests**: 15 test cases
  - ✅ Valid client registration
  - ✅ Client registration with all optional fields
  - ✅ Get client configuration
  - ✅ Update client configuration
  - ✅ Delete client
  - ✅ Invalid redirect_uri format
  - ✅ Duplicate client_name
  - ✅ Missing registration token (when required)
  - ✅ Invalid registration token
  - ✅ Invalid registration access token
  - ✅ Update non-existent client
  - ✅ Delete non-existent client
  - ✅ Unauthorized access to client config
  - ✅ Client secret not re-displayed on GET
  - ✅ Rate limit exceeded

#### 2.5 OIDC Logout Endpoints (2 hours)

**File**: `src/api/oauth_advanced.rs`
**Functions**: `front_channel_logout()`, `back_channel_logout()`

- Terminate user sessions
- Validate id_token_hint
- Redirect to post_logout_redirect_uri
- Validate logout_token JWT
- **Tests**: 8 test cases
  - ✅ Front-channel logout with id_token_hint
  - ✅ Front-channel logout without id_token_hint
  - ✅ Post logout redirect
  - ✅ Back-channel logout with valid token
  - ✅ Back-channel logout with invalid token
  - ✅ Back-channel logout missing token
  - ✅ Session termination verification
  - ✅ Multiple session termination

### Phase 3: Health & Security Endpoints (Estimated: 6 hours)

#### 3.1 Dependency Health Check (3 hours)

**File**: `src/api/health.rs` (extend existing file)
**Function**: `check_dependencies()`

- Check storage backend health
- Check rate limiter health
- Check token manager health
- Check MFA service health
- Check OAuth provider health
- Check threat intelligence health
- Check cache health (if configured)
- Require authentication
- **Tests**: 10 test cases
  - ✅ All dependencies healthy
  - ✅ Storage unhealthy
  - ✅ Rate limiter unhealthy
  - ✅ Multiple dependencies degraded
  - ✅ Response time measurement
  - ✅ Unauthenticated request
  - ✅ Insufficient permissions
  - ✅ Sanitized output (no secrets)
  - ✅ Caching of health checks
  - ✅ Timeout handling

#### 3.2 IP Reputation Check (3 hours)

**File**: `src/api/security.rs` (new file)
**Function**: `check_ip_reputation()`

- Wire up to `ThreatFeedManager`
- Validate IP address format
- Check permissions (`security:check_ip`)
- Query threat intelligence feeds
- Return risk assessment and recommendations
- Audit log all checks
- **Tests**: 12 test cases
  - ✅ Safe residential IP
  - ✅ VPN/proxy detection
  - ✅ Tor exit node detection
  - ✅ Known malicious IP
  - ✅ Invalid IP address format
  - ✅ IPv6 support
  - ✅ Unauthenticated request
  - ✅ Insufficient permissions
  - ✅ Rate limit exceeded
  - ✅ Cache hit vs miss
  - ✅ Threat feed unavailable fallback
  - ✅ Audit logging verification

### Phase 4: Router & Middleware Configuration (Estimated: 2 hours)

#### File: `src/api/server.rs`

- Add routes for all new endpoints
- Configure authentication middleware
- Configure rate limiting per endpoint
- Configure CORS for OAuth endpoints
- Configure audit logging middleware

**Implementation**:

```rust
// OAuth Advanced routes
.route("/api/v1/oauth/introspect", post(oauth_advanced::introspect_token))
.route("/api/v1/oauth/par", post(oauth_advanced::pushed_authorization_request))
.route("/api/v1/oauth/device/code", post(oauth_advanced::device_authorization))
.route("/api/v1/oauth/device/token", post(oauth_advanced::device_token))
.route("/api/v1/oauth/logout", get(oauth_advanced::front_channel_logout))
.route("/api/v1/oauth/backchannel-logout", post(oauth_advanced::back_channel_logout))
.route("/api/v1/oauth/register", post(oauth_advanced::register_client))
.route("/api/v1/oauth/register/:client_id", 
    get(oauth_advanced::get_client)
    .put(oauth_advanced::update_client)
    .delete(oauth_advanced::delete_client)
)

// Health & Security routes
.route("/api/v1/health/dependencies", get(health::check_dependencies))
.route("/api/v1/security/check-ip", post(security::check_ip_reputation))
```

### Phase 5: Integration Tests (Estimated: 8 hours)

#### Test Organization

```
tests/
├── api/
│   ├── oauth_advanced_tests.rs
│   │   ├── test_token_introspection/
│   │   ├── test_par/
│   │   ├── test_device_flow/
│   │   ├── test_client_registration/
│   │   └── test_oidc_logout/
│   ├── health_extended_tests.rs
│   └── security_tests.rs
```

#### Test Coverage Requirements

- **Golden Path**: Every endpoint must have happy path test
- **Edge Cases**: All documented error scenarios
- **Security**: Authentication, authorization, rate limiting
- **Validation**: Input validation, output format
- **Integration**: End-to-end flows (e.g., full device flow)

**Minimum Coverage**: 90% for new code

---

## Implementation Checklist

### ✅ Completed

- [x] OpenAPI 3.1.0 documentation
- [x] Schema definitions
- [x] Endpoint specifications
- [x] Validation and bundling

### 📋 TODO - Phase 1: Core Infrastructure

- [ ] Create `src/api/oauth_advanced.rs`
- [ ] Create `src/api/security.rs`
- [ ] Update `src/api/mod.rs` exports
- [ ] Update router in `src/api/server.rs`
- [ ] Configure middleware

### 📋 TODO - Phase 2: OAuth Advanced Endpoints

- [ ] Implement `introspect_token()` (replace placeholder)
- [ ] Implement `pushed_authorization_request()`
- [ ] Implement `device_authorization()`
- [ ] Implement `device_token()`
- [ ] Implement `register_client()`
- [ ] Implement `get_client()`
- [ ] Implement `update_client()`
- [ ] Implement `delete_client()`
- [ ] Implement `front_channel_logout()`
- [ ] Implement `back_channel_logout()`

### 📋 TODO - Phase 3: Health & Security

- [ ] Implement `check_dependencies()`
- [ ] Implement `check_ip_reputation()`

### 📋 TODO - Phase 4: Tests

- [ ] Token introspection tests (8 cases)
- [ ] PAR tests (10 cases)
- [ ] Device flow tests (12 cases)
- [ ] Client registration tests (15 cases)
- [ ] OIDC logout tests (8 cases)
- [ ] Dependency health tests (10 cases)
- [ ] IP reputation tests (12 cases)
- [ ] Integration tests (end-to-end flows)

### 📋 TODO - Phase 5: Documentation

- [ ] Update CHANGELOG.md
- [ ] Update README.md with new endpoints
- [ ] Create migration guide
- [ ] Update Rust API documentation comments

---

## Estimated Timeline

| Phase     | Description                 | Estimated Time |
| --------- | --------------------------- | -------------- |
| Phase 1   | Core Infrastructure         | 4 hours        |
| Phase 2   | OAuth Advanced Endpoints    | 16 hours       |
| Phase 3   | Health & Security           | 6 hours        |
| Phase 4   | Router & Middleware         | 2 hours        |
| Phase 5   | Integration Tests           | 8 hours        |
| **Total** | **Complete Implementation** | **36 hours**   |

**Note**: Original estimate was 34 hours (documentation only). Full implementation with tests adds ~36 hours.

---

## Risk Assessment

### High Risk

- ⚠️ **Device Flow Integration**: Dependency on `oauth-device-flows` crate behavior
- ⚠️ **Client Registration Security**: Token management, secret storage

### Medium Risk

- ⚠️ **Rate Limiting**: Need per-endpoint configuration
- ⚠️ **PAR Storage**: Redis/memory storage for 90s TTL
- ⚠️ **Threat Intelligence**: External feed availability

### Low Risk

- ✅ Token introspection (well-defined RFC)
- ✅ Health checks (no external dependencies)
- ✅ OIDC logout (standard flow)

---

## Success Criteria

### Functional Requirements

- ✅ All 12 endpoints implemented and working
- ✅ RFC compliance for all OAuth/OIDC endpoints
- ✅ Proper error handling and responses
- ✅ Audit logging for security-sensitive operations

### Quality Requirements

- ✅ 90%+ test coverage for new code
- ✅ All golden paths tested
- ✅ All documented error scenarios tested
- ✅ Integration tests for complete flows

### Security Requirements

- ✅ Authentication enforced where required
- ✅ Authorization checks (permissions/roles)
- ✅ Rate limiting configured
- ✅ Input validation on all endpoints
- ✅ No sensitive data in error responses

### Performance Requirements

- ✅ < 100ms response time (p95) for most endpoints
- ✅ < 500ms for IP reputation checks
- ✅ < 200ms for dependency health checks
- ✅ Caching where appropriate (PAR, IP reputation)

---

## Next Steps

1. **Review this plan** with the team
2. **Start with Phase 1** (infrastructure setup)
3. **Implement incrementally** (one endpoint at a time with tests)
4. **Code review** after each phase
5. **Integration testing** after Phase 4
6. **Documentation update** after Phase 5

---

**Document Version**: 1.0  
**Last Updated**: October 1, 2025  
**Status**: Ready for implementation
