# OpenAPI Spec Update Summary

## Changes Made to AuthFramework REST API

### API Versioning

**All functional endpoints now use `/api/v1` prefix except:**

- Health/monitoring endpoints (unversioned for infrastructure): `/health`, `/metrics`, `/readiness`, `/liveness`
- OIDC well-known endpoints (per spec): `/.well-known/openid-configuration`, `/.well-known/jwks.json`

### New Endpoints Added

#### OIDC Endpoints

1. `GET /.well-known/openid-configuration` - OIDC Discovery document
2. `GET /.well-known/jwks.json` - JSON Web Key Set  
3. `GET /api/v1/oidc/userinfo` - OIDC UserInfo endpoint (requires Bearer token)

#### Token Exchange

4. `POST /api/v1/oauth/token-exchange` - RFC 8693 Token Exchange

#### RBAC Endpoints (all under `/api/v1/rbac`)

5. `POST /api/v1/rbac/roles` - Create role
6. `GET /api/v1/rbac/roles` - List roles
7. `GET /api/v1/rbac/roles/{role_id}` - Get role
8. `PUT /api/v1/rbac/roles/{role_id}` - Update role
9. `DELETE /api/v1/rbac/roles/{role_id}` - Delete role
10. `POST /api/v1/rbac/users/{user_id}/roles` - Assign role to user
11. `DELETE /api/v1/rbac/users/{user_id}/roles/{role_id}` - Revoke role from user
12. `GET /api/v1/rbac/users/{user_id}/roles` - Get user roles
13. `POST /api/v1/rbac/bulk/assign` - Bulk role assignment
14. `POST /api/v1/rbac/check-permission` - Check permission
15. `POST /api/v1/rbac/elevate` - Elevate privileges
16. `GET /api/v1/rbac/audit` - RBAC audit log

### Response Format Changes

#### /readiness

**Old**: Plain text "Ready" or "Not Ready"
**New**: JSON with ApiResponse envelope:

```json
{
  "success": true,
  "data": {
    "ready": true,
    "message": "Service is ready"
  },
  "timestamp": "2025-09-30T12:00:00Z"
}
```

#### /liveness  

**Old**: Plain text "Alive" or "Dead"
**New**: JSON with ApiResponse envelope:

```json
{
  "success": true,
  "data": {
    "alive": true,
    "message": "Service is alive"
  },
  "timestamp": "2025-09-30T12:00:00Z"
}
```

#### /metrics

**Unchanged**: Still returns Prometheus plain text format (required for Prometheus compatibility)

### Path Changes (Versioning)

All these paths now have `/api/v1` prefix:

**Authentication**:

- `/auth/login` → `/api/v1/auth/login`
- `/auth/refresh` → `/api/v1/auth/refresh`
- `/auth/logout` → `/api/v1/auth/logout`
- `/auth/validate` → `/api/v1/auth/validate`
- `/auth/providers` → `/api/v1/auth/providers`

**OAuth**:

- `/oauth/authorize` → `/api/v1/oauth/authorize`
- `/oauth/token` → `/api/v1/oauth/token`
- `/oauth/revoke` → `/api/v1/oauth/revoke`
- `/oauth/introspect` → `/api/v1/oauth/introspect`
- `/oauth/clients/{client_id}` → `/api/v1/oauth/clients/{client_id}`

**Users**:

- `/users/profile` → `/api/v1/users/profile`
- `/users/change-password` → `/api/v1/users/change-password`
- `/users/sessions` → `/api/v1/users/sessions`
- `/users/sessions/{session_id}` → `/api/v1/users/sessions/{session_id}`
- `/users/{user_id}/profile` → `/api/v1/users/{user_id}/profile`

**MFA**:

- `/mfa/setup` → `/api/v1/mfa/setup`
- `/mfa/verify` → `/api/v1/mfa/verify`
- `/mfa/disable` → `/api/v1/mfa/disable`
- `/mfa/status` → `/api/v1/mfa/status`
- `/mfa/regenerate-backup-codes` → `/api/v1/mfa/regenerate-backup-codes`
- `/mfa/verify-backup-code` → `/api/v1/mfa/verify-backup-code`

**Admin**:

- `/admin/users` → `/api/v1/admin/users`
- `/admin/users/{user_id}` → `/api/v1/admin/users/{user_id}`
- `/admin/users/{user_id}/roles` → `/api/v1/admin/users/{user_id}/roles`
- `/admin/users/{user_id}/activate` → `/api/v1/admin/users/{user_id}/activate`
- `/admin/stats` → `/api/v1/admin/stats`
- `/admin/audit-logs` → `/api/v1/admin/audit-logs`

## OpenAPI Spec Updates Needed

The `docs/api/openapi.yaml` file needs these changes:

1. **Update version in info section** to reflect these are v1 endpoints
2. **Update all paths** to include `/api/v1` prefix (except health/well-known)
3. **Add OIDC endpoints** sections
4. **Add Token Exchange endpoint** section
5. **Add complete RBAC endpoints** section
6. **Update readiness/liveness** response schemas
7. **Add new response schemas** for:
   - ReadinessResponse
   - LivenessResponse
   - OidcDiscoveryDocument
   - JwkSet, Jwk
   - UserInfoResponse
   - TokenExchangeRequest
   - All RBAC request/response types

8. **Update server URLs** to show versioned paths in examples

## Implementation Status

✅ **Completed**:

- All routes versioned in code (`src/api/server.rs`)
- RBAC endpoints registered in router
- OIDC endpoints implemented (`src/api/oauth.rs`)
- Token exchange endpoint implemented
- Readiness/liveness responses converted to JSON
- Code compiles successfully with all features

⚠️ **Remaining**:

- Update `docs/api/openapi.yaml` to match code
- Update API documentation examples to use v1 paths
- Update integration tests to use v1 paths
- Update example code to use v1 paths

## Testing Checklist

After OpenAPI spec update, verify:

- [ ] All documented paths exist in code
- [ ] All code paths documented in spec
- [ ] Request/response schemas match code
- [ ] Examples use correct paths
- [ ] Authentication requirements correct
- [ ] Error responses documented

## Next Steps

1. **Update OpenAPI spec** - Manual edit required due to size (1412 lines)
2. **Validate spec** - Use OpenAPI validator tool
3. **Generate documentation** - Regenerate from updated spec
4. **Update examples** - All code examples in docs
5. **Update tests** - Integration test paths
6. **Announce breaking change** - Version bump to v0.5.0

## Breaking Change Notice

**This is a breaking change** requiring major version bump.

**Migration Path for Clients**:

```
Old: POST /auth/login
New: POST /api/v1/auth/login

Old: GET /users/profile  
New: GET /api/v1/users/profile
```

**Backward Compatibility**: None - all clients must update.

**Recommended Approach**:

- Release as v0.5.0 (or v1.0.0 if ready)
- Deprecation period: 6 months dual support (if needed)
- Clear migration guide in CHANGELOG
- Update all SDKs simultaneously

## Validation Commands

```bash
# Validate OpenAPI spec
npx @stoplight/spectral-cli lint docs/api/openapi.yaml

# Test server startup
cargo run --example complete_rest_api_server --features api-server,enhanced-rbac

# Test endpoint (example)
curl http://localhost:8080/api/v1/auth/providers
curl http://localhost:8080/.well-known/openid-configuration
curl http://localhost:8080/health
```

---

**Date**: 2025-09-30  
**Author**: GitHub Copilot + ciresnave  
**Status**: Code Complete, OpenAPI Update Pending
