# AuthFramework REST API - Audit & Action Plan

## Executive Summary

This document outlines the comprehensive audit of the AuthFramework REST API and defines a prioritized action plan to address identified gaps, inconsistencies, and missing features.

**Current State**: REST API exists with core functionality, but has integration gaps and documentation drift.

**Goal**: Production-ready, fully documented, consistent REST API that can serve as the foundation for multi-language SDKs.

## Audit Methodology

1. ✅ **Code Review**: Analyzed actual implemented endpoints in `src/api/`
2. ✅ **Documentation Review**: Examined OpenAPI spec and markdown docs
3. ✅ **Gap Analysis**: Identified mismatches between docs and implementation
4. ✅ **Feature Coverage**: Assessed what library features lack REST API exposure
5. ✅ **Design Review**: Evaluated API structure against REST best practices

## Findings Summary

### ✅ What's Working Well

1. **Core Authentication Flow**
   - Login, refresh, logout fully implemented
   - Token validation working
   - Bearer token auth middleware functional

2. **User Management**
   - Profile operations implemented
   - Password change working
   - Session management functional

3. **OAuth 2.0 Basics**
   - Authorization flow implemented
   - Token endpoint working
   - Revocation and introspection present

4. **MFA Support**
   - Setup, verify, disable implemented
   - Backup codes working
   - Status checking functional

5. **Admin Operations**
   - User management present
   - System stats available
   - Audit log access implemented

6. **Infrastructure**
   - Health checks working
   - Metrics endpoint (Prometheus)
   - Middleware stack (CORS, rate limiting, logging)

### 🔴 Critical Issues Found

#### Issue #1: RBAC Endpoints Not Registered

**Problem**:

- RBAC endpoints defined in `src/api/rbac_endpoints.rs` (716 lines)
- Functions all implemented and documented
- **BUT**: Not registered in router (`src/api/server.rs`)
- Completely inaccessible via REST API

**Impact**:

- RBAC feature unusable via REST API
- SDK cannot implement RBAC operations
- Documentation references non-functional endpoints

**Evidence**:

```rust
// src/api/rbac_endpoints.rs - Exists with functions:
// - create_role, get_role, list_roles, update_role, delete_role
// - assign_role_to_user, revoke_role_from_user, get_user_roles
// - bulk_assign_roles, check_permission, elevate_role, get_audit_log

// src/api/server.rs - Router construction MISSING RBAC routes
// No .route("/api/v1/rbac/*", ...) calls found
```

**Fix Required**: Register RBAC routes in router

---

#### Issue #2: OpenID Connect Missing REST Endpoints

**Problem**:

- OIDC provider exists in `src/server/oidc/`
- No REST API endpoints for OIDC-specific operations
- Discovery endpoint missing
- UserInfo endpoint missing
- JWKS endpoint missing

**Impact**:

- OIDC clients cannot discover configuration
- OIDC flows incomplete
- Not compliant with OIDC spec

**Missing Endpoints**:

- `GET /.well-known/openid-configuration` - Discovery document
- `GET /userinfo` - OIDC UserInfo endpoint
- `GET /.well-known/jwks.json` - JSON Web Key Set

**Fix Required**: Add OIDC REST endpoints

---

#### Issue #3: Documentation Drift

**Problem**:

- OpenAPI spec (1347 lines) references endpoints
- Some endpoints in spec don't exist in code
- Some code endpoints not in spec
- Examples in docs may be outdated

**Impact**:

- Confusion for API users
- SDK generation from OpenAPI will fail
- Cannot trust documentation

**Fix Required**:

1. Audit every endpoint in OpenAPI spec against code
2. Add missing endpoints to spec
3. Remove non-existent endpoints from spec
4. Verify all examples work

---

#### Issue #4: Token Exchange Not Exposed

**Problem**:

- Token exchange implemented in `src/server/token_exchange/`
- RFC 8693 compliance built
- No REST API endpoint

**Impact**:

- Cannot use token exchange via REST API
- Feature exists but inaccessible

**Missing Endpoint**:

- `POST /oauth/token-exchange`

**Fix Required**: Add token exchange endpoint

---

### 🟡 Medium Priority Issues

#### Issue #5: Inconsistent Error Responses

**Observation**:

- Most endpoints use `ApiResponse` wrapper
- Some endpoints may return different formats
- Error codes not consistently applied

**Action Required**:

- Audit all error responses
- Ensure consistent use of error codes
- Document all error codes in one place

---

#### Issue #6: Missing Batch Operations

**Gap**:

- Bulk role assignment exists
- No bulk user creation
- No batch permission checks
- No batch session revocation

**Use Cases**:

- Onboarding multiple users
- Checking permissions for multiple resources
- Admin operations on multiple entities

**Suggested Additions**:

- `POST /admin/users/batch` - Create multiple users
- `POST /api/v1/rbac/check-permissions-batch` - Check multiple permissions
- `DELETE /users/sessions/batch` - Revoke multiple sessions

---

#### Issue #7: Limited Query Capabilities

**Current**: Basic pagination (`page`, `per_page`)

**Missing**:

- Filtering by multiple fields
- Sorting by arbitrary fields
- Full-text search
- Date range queries

**Example Desired**:

```
GET /admin/users?role=admin&created_after=2025-01-01&sort=created_at&order=desc
```

**Action**: Design and implement query DSL

---

#### Issue #8: No API Versioning for Core Endpoints

**Observation**:

- RBAC uses versioned path (`/api/v1/rbac`)
- Core endpoints unversioned (`/auth`, `/users`)
- No clear versioning strategy

**Risk**:

- Breaking changes require major version bump
- All clients break simultaneously
- No gradual migration path

**Consideration**:

- Document versioning policy clearly
- Consider versioning all endpoints in future
- Or commit to backward compatibility for unversioned

---

### 🟢 Enhancement Opportunities

#### Opportunity #1: WebAuthn/Passkeys REST API

**Status**: Feature flag exists (`passkeys`), implementation TBD

**Needed**:

- `POST /auth/webauthn/register-begin`
- `POST /auth/webauthn/register-complete`
- `POST /auth/webauthn/authenticate-begin`
- `POST /auth/webauthn/authenticate-complete`

---

#### Opportunity #2: API Key Management

**Current**: API keys supported for auth
**Missing**: REST API to manage keys

**Suggested**:

- `POST /api-keys` - Create API key
- `GET /api-keys` - List user's API keys
- `DELETE /api-keys/{key_id}` - Revoke key
- `PUT /api-keys/{key_id}/name` - Rename key

---

#### Opportunity #3: Advanced Session Management

**Current**: Basic session operations
**Enhancement**: Rich session management

**Suggested**:

- `GET /sessions` - List all sessions across devices
- `DELETE /sessions/all-except-current` - Kill all other sessions
- `POST /sessions/{id}/extend` - Extend session
- `GET /sessions/{id}/activity` - Session activity log

---

#### Opportunity #4: Webhooks

**Use Case**: Notify external systems of events

**Suggested**:

- `POST /webhooks` - Register webhook
- `GET /webhooks` - List webhooks
- `DELETE /webhooks/{id}` - Remove webhook
- `POST /webhooks/{id}/test` - Test webhook

**Events**:

- User created/deleted
- Role assigned/revoked
- Authentication failure
- Permission denied

---

#### Opportunity #5: Audit Log Query API

**Current**: `GET /admin/audit-logs` exists
**Enhancement**: Rich querying

**Suggested Parameters**:

```
GET /admin/audit-logs?
  user_id=123&
  action=login&
  status=failure&
  from=2025-01-01&
  to=2025-01-31&
  resource=documents/*
```

---

## Action Plan

### Phase 1: Critical Fixes (Week 1-2)

**Priority**: Must have for SDK development

#### Task 1.1: Register RBAC Endpoints ⚠️ BLOCKING

- **File**: `src/api/server.rs`
- **Action**: Add RBAC routes to router
- **Effort**: 1-2 hours
- **Blocker**: SDK cannot implement RBAC without this

**Implementation**:

```rust
// In build_router(), add:
#[cfg(feature = "enhanced-rbac")]
let router = router.nest("/api/v1/rbac", rbac_endpoints::rbac_router());
```

Create `rbac_router()` function in `rbac_endpoints.rs`:

```rust
pub fn rbac_router() -> Router<ApiState> {
    Router::new()
        .route("/roles", post(create_role))
        .route("/roles", get(list_roles))
        .route("/roles/:role_id", get(get_role))
        .route("/roles/:role_id", put(update_role))
        .route("/roles/:role_id", delete(delete_role))
        .route("/users/:user_id/roles", post(assign_role_to_user))
        .route("/users/:user_id/roles/:role_id", delete(revoke_role_from_user))
        .route("/users/:user_id/roles", get(get_user_roles))
        .route("/bulk/assign", post(bulk_assign_roles))
        .route("/check-permission", post(check_permission))
        .route("/elevate", post(elevate_role))
        .route("/audit", get(get_audit_log))
}
```

**Testing**:

- Manual test all RBAC endpoints
- Add integration tests
- Update OpenAPI spec

---

#### Task 1.2: Add OIDC Endpoints

- **Files**: New file `src/api/oidc.rs`
- **Action**: Create OIDC discovery and userinfo endpoints
- **Effort**: 4-6 hours

**Endpoints to Add**:

1. `GET /.well-known/openid-configuration`
2. `GET /userinfo`
3. `GET /.well-known/jwks.json`

**Implementation Notes**:

- Discovery document should be generated from server config
- UserInfo requires authenticated token
- JWKS exposes public keys for JWT validation

---

#### Task 1.3: Add Token Exchange Endpoint

- **File**: `src/api/oauth.rs`
- **Action**: Add `token_exchange` handler
- **Effort**: 2-3 hours

**Endpoint**: `POST /oauth/token-exchange`

**Request**:

```json
{
  "grant_type": "urn:ietf:params:oauth:grant-type:token-exchange",
  "subject_token": "...",
  "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
  "requested_token_type": "urn:ietf:params:oauth:token-type:jwt"
}
```

---

#### Task 1.4: Audit OpenAPI Spec

- **File**: `docs/api/openapi.yaml`
- **Action**: Verify every endpoint exists in code
- **Effort**: 4-6 hours

**Process**:

1. Extract all paths from OpenAPI spec
2. Extract all routes from `server.rs`
3. Compare and create diff
4. Update spec to match reality
5. Add missing endpoints to spec

**Deliverable**:

- Updated `openapi.yaml`
- Validation script (verify spec matches routes)

---

### Phase 2: Documentation & Consistency (Week 3)

#### Task 2.1: Standardize Error Responses

- **Files**: All `src/api/*.rs` handlers
- **Action**: Ensure all endpoints use consistent error format
- **Effort**: 6-8 hours

**Checklist**:

- All errors use `ApiResponse::error()`
- All errors have proper error codes
- HTTP status codes match error types
- Error details provided where appropriate

---

#### Task 2.2: Create Error Code Reference

- **File**: `docs/api/ERROR_CODES.md`
- **Action**: Document every error code
- **Effort**: 3-4 hours

**Format**:

```markdown
### INVALID_CREDENTIALS

**HTTP Status**: 401 Unauthorized
**Meaning**: The provided username/password combination is incorrect
**Resolution**: Verify credentials and try again
**Example**:
{...}
```

---

#### Task 2.3: Update API Documentation

- **Files**: `docs/api/*.md`
- **Action**: Ensure all docs match current implementation
- **Effort**: 6-8 hours

**Documents to Update**:

- `README.md` - Examples and getting started
- `complete-reference.md` - Full endpoint reference
- `integration-patterns.md` - Integration examples

---

#### Task 2.4: Create Integration Tests

- **File**: `tests/api_integration_tests.rs`
- **Action**: Comprehensive endpoint testing
- **Effort**: 8-12 hours

**Coverage**:

- Every endpoint
- Success and error cases
- Authentication/authorization
- Edge cases

---

### Phase 3: Enhancements (Week 4-5)

#### Task 3.1: Implement Batch Operations

- **Files**: `src/api/admin.rs`, `src/api/rbac_endpoints.rs`
- **Endpoints**:
  - `POST /admin/users/batch`
  - `POST /api/v1/rbac/check-permissions-batch`
- **Effort**: 8-10 hours

---

#### Task 3.2: Enhanced Query Capabilities

- **Files**: All list endpoints
- **Action**: Add filtering, sorting, search
- **Effort**: 12-16 hours

**Features**:

- Field-based filtering
- Multi-field sorting
- Date range queries
- Full-text search (if storage supports)

---

#### Task 3.3: API Key Management Endpoints

- **File**: New `src/api/api_keys.rs`
- **Endpoints**: CRUD for API keys
- **Effort**: 6-8 hours

---

#### Task 3.4: WebAuthn/Passkeys Endpoints

- **File**: New `src/api/webauthn.rs`
- **Endpoints**: WebAuthn registration and authentication
- **Effort**: 12-16 hours
- **Dependency**: Requires `passkeys` feature completion

---

### Phase 4: Advanced Features (Week 6+)

#### Task 4.1: Webhooks System

- **Effort**: 20-30 hours
- **Complexity**: High (requires event system, delivery queue, retry logic)

#### Task 4.2: GraphQL Alternative

- **Effort**: 40-60 hours
- **Complexity**: Very High (entire parallel API)
- **Consideration**: May not be worth it

#### Task 4.3: WebSocket Support

- **Effort**: 16-24 hours
- **Use Cases**: Real-time notifications, live updates

---

## OpenAPI Spec Maintenance Strategy

### Automation

**Goal**: Keep OpenAPI spec in sync with code automatically

**Options**:

1. **Generate from Code** (Recommended)
   - Use Rust macros/attributes to annotate handlers
   - Generate OpenAPI spec from code
   - Tools: `utoipa`, `aide`

2. **Generate from Spec**
   - Write OpenAPI spec manually
   - Generate handler skeletons from spec
   - Tools: `openapi-generator`

3. **Manual Maintenance** (Current)
   - Update spec with every code change
   - Prone to drift
   - Requires discipline

**Recommendation**:

- Short term: Continue manual, but add validation
- Medium term: Adopt `utoipa` for automatic generation
- Add CI check: spec must match routes

### Validation Script

Create `scripts/validate_api.sh`:

```bash
#!/bin/bash
# Extract routes from code
# Extract paths from OpenAPI spec
# Compare and report differences
# Exit 1 if drift detected
```

Run in CI pipeline to prevent drift.

---

## Testing Strategy

### Unit Tests

- Test individual handler functions
- Mock dependencies
- Test error cases

### Integration Tests

- Full HTTP request/response cycle
- Real database (test containers)
- Authentication flow
- Authorization checks

### OpenAPI Validation

- Validate responses against spec
- Use `openapi-validator`
- Catch spec drift early

### Load Testing

- Performance benchmarks
- Rate limiting verification
- Concurrent request handling

---

## Documentation Deliverables

### For API Users

1. **Quick Start Guide** ✅ (exists, needs update)
   - Getting started in 5 minutes
   - Common use cases
   - Code examples

2. **Complete API Reference** ✅ (exists, needs update)
   - Every endpoint documented
   - Request/response examples
   - Error codes

3. **Integration Guide** ✅ (exists, needs update)
   - Language-specific examples
   - Best practices
   - Common patterns

4. **OpenAPI Spec** ✅ (exists, needs sync)
   - Machine-readable
   - Interactive UI (Swagger)

### For SDK Developers

5. **API Design Rationale** ✅ (just created)
   - Why decisions were made
   - Design patterns
   - Future evolution

6. **SDK Development Guide** ⚠️ (needs creation)
   - How to build SDK from spec
   - Required features
   - Testing requirements
   - Language-specific considerations

7. **Error Handling Guide** ⚠️ (needs creation)
   - All error codes
   - Recommended retry logic
   - Error recovery patterns

---

## Success Criteria

### Phase 1 Complete When

- ✅ All RBAC endpoints accessible via REST API
- ✅ OIDC discovery endpoints implemented
- ✅ Token exchange endpoint implemented
- ✅ OpenAPI spec matches implementation 100%
- ✅ No documentation drift
- ✅ All critical endpoints have integration tests

### Phase 2 Complete When

- ✅ Error responses consistent across all endpoints
- ✅ All error codes documented
- ✅ API documentation up-to-date and verified
- ✅ Integration test coverage >80%
- ✅ CI validates API spec on every PR

### SDK Development Ready When

- ✅ Phase 1 complete
- ✅ Phase 2 complete
- ✅ API stable (no breaking changes expected)
- ✅ OpenAPI spec validated and comprehensive
- ✅ Design rationale documented
- ✅ SDK development guide created

---

## Timeline Estimate

| Phase                                | Duration | Dependencies       |
| ------------------------------------ | -------- | ------------------ |
| Phase 1: Critical Fixes              | 2 weeks  | None               |
| Phase 2: Documentation & Consistency | 1 week   | Phase 1            |
| Phase 3: Enhancements                | 2 weeks  | Phase 2 (optional) |
| Phase 4: Advanced Features           | 4+ weeks | Phase 3 (optional) |

**Total for SDK Readiness**: 3 weeks (Phase 1 + Phase 2)

---

## Risk Assessment

### High Risk

- **RBAC route registration**: Blocking for SDK, but simple fix
- **Documentation drift**: Can mislead users, requires manual audit

### Medium Risk

- **Integration test coverage**: Time-consuming but straightforward
- **Query enhancement**: May require storage layer changes

### Low Risk

- **Error standardization**: Tedious but low complexity
- **Batch operations**: Additive, doesn't break existing

---

## Next Steps

### Immediate (This Week)

1. **Review this document** - Get stakeholder buy-in
2. **Prioritize**: Confirm Phase 1 priorities
3. **Start Task 1.1**: Register RBAC endpoints (BLOCKING)

### Week 1

1. Complete Task 1.1 (RBAC registration)
2. Start Task 1.4 (OpenAPI audit)
3. Begin Task 1.2 (OIDC endpoints)

### Week 2

1. Complete Task 1.2 and 1.3
2. Complete Task 1.4
3. Start Phase 2 tasks

### Week 3

1. Complete Phase 2
2. Begin Rust SDK development in parallel
3. Use SDK development to validate API design

---

## Appendix A: Route Inventory

### Currently Registered Routes

```
GET    /health
GET    /health/detailed
GET    /metrics
GET    /readiness
GET    /liveness

POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/validate
GET    /auth/providers

GET    /oauth/authorize
POST   /oauth/token
POST   /oauth/revoke
POST   /oauth/introspect
GET    /oauth/clients/{client_id}

GET    /users/profile
PUT    /users/profile
POST   /users/change-password
GET    /users/sessions
DELETE /users/sessions/{session_id}
GET    /users/{user_id}/profile

POST   /mfa/setup
POST   /mfa/verify
POST   /mfa/disable
GET    /mfa/status
POST   /mfa/regenerate-backup-codes
POST   /mfa/verify-backup-code

GET    /admin/users
POST   /admin/users
PUT    /admin/users/{user_id}/roles
DELETE /admin/users/{user_id}
PUT    /admin/users/{user_id}/activate
GET    /admin/stats
GET    /admin/audit-logs
```

**Total**: 33 endpoints

### Missing But Implemented (RBAC)

```
POST   /api/v1/rbac/roles
GET    /api/v1/rbac/roles
GET    /api/v1/rbac/roles/{role_id}
PUT    /api/v1/rbac/roles/{role_id}
DELETE /api/v1/rbac/roles/{role_id}
POST   /api/v1/rbac/users/{user_id}/roles
DELETE /api/v1/rbac/users/{user_id}/roles/{role_id}
GET    /api/v1/rbac/users/{user_id}/roles
POST   /api/v1/rbac/bulk/assign
POST   /api/v1/rbac/check-permission
POST   /api/v1/rbac/elevate
GET    /api/v1/rbac/audit
```

**Total**: 12 endpoints (implemented but not registered)

### Planned Additions

```
GET    /.well-known/openid-configuration
GET    /.well-known/jwks.json
GET    /userinfo
POST   /oauth/token-exchange
POST   /admin/users/batch
POST   /api/v1/rbac/check-permissions-batch
... (more from Phase 3+)
```

---

## Appendix B: OpenAPI Spec Structure

Current `openapi.yaml` sections:

- Info & metadata
- Server definitions
- 33+ path definitions
- Component schemas (50+)
- Security schemes
- Example responses

**Size**: 1347 lines

**Status**: Needs audit against implementation

---

## Document Status

**Status**: Draft v1.0  
**Created**: 2025-09-30  
**Author**: GitHub Copilot + ciresnave  
**Next Review**: After Phase 1 completion  
**Living Document**: Update as work progresses
