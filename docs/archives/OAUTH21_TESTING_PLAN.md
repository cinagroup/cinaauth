# OAuth 2.1 Compliance Testing Plan

## Testing Phases

### Phase 1: Quick Verification (CURRENT)

Run existing test suites to establish baseline:

1. **Rust Unit Tests** (15-20 minutes)
   ```powershell
   cargo test --lib oauth
   ```
   - Expected: 49+ tests passing
   - Verifies: All implemented features work in isolation

2. **Python Security Tests** (Requires server running)
   ```powershell
   # Terminal 1: Start server
   cargo run --bin api_server
   
   # Terminal 2: Run tests
   python oauth2_security_validation.py
   ```
   - Tests revocation enforcement
   - Tests PKCE verifier enforcement
   - Tests scope validation

3. **Python Integration Tests** (Requires server running)
   ```powershell
   python oauth2_integration_tests.py
   ```
   - Tests complete OAuth flows
   - Tests token refresh
   - Tests discovery endpoints

### Phase 2: Manual PKCE Verification (CRITICAL)

Create test to reproduce PKCE bypass issue:

```rust
#[tokio::test]
async fn test_pkce_verifier_enforcement() {
    // Setup
    let storage = Arc::new(InMemoryStorage::new());
    let token_manager = Arc::new(TokenManager::new());
    let config = OAuth2Config::default();
    let server = OAuth2Server::new(config, token_manager).await.unwrap();
    
    // Register client
    server.register_public_client(
        "test_client".to_string(),
        vec!["https://example.com/callback".to_string()],
        vec!["read".to_string()],
        vec!["authorization_code".to_string()],
    ).await.unwrap();
    
    // Create user context
    let user_context = UserContext::new(
        "user123".to_string(),
        "testuser".to_string(),
        Some("test@example.com".to_string()),
    ).with_scopes(vec!["read".to_string()]);
    
    // Create authorization code WITH PKCE challenge
    let auth_request = AuthorizationRequest {
        client_id: "test_client".to_string(),
        response_type: "code".to_string(),
        redirect_uri: "https://example.com/callback".to_string(),
        scope: Some("read".to_string()),
        state: Some("test_state".to_string()),
        code_challenge: Some("test_challenge".to_string()),
        code_challenge_method: Some("S256".to_string()),
        nonce: None,
    };
    
    let auth_code = server
        .create_authorization_code(auth_request, user_context)
        .await
        .unwrap();
    
    // Try to exchange WITHOUT code_verifier
    let token_request = TokenRequest {
        grant_type: "authorization_code".to_string(),
        client_id: "test_client".to_string(),
        client_secret: None,
        code: Some(auth_code.code.clone()),
        redirect_uri: Some("https://example.com/callback".to_string()),
        code_verifier: None, // <<<< CRITICAL: Missing verifier
        ..Default::default()
    };
    
    let result = server.token_exchange(token_request).await;
    
    // MUST fail with error
    assert!(
        result.is_err(),
        "SECURITY FAILURE: Missing code_verifier should be rejected when code_challenge was provided"
    );
    
    if let Err(e) = result {
        assert!(
            e.to_string().contains("PKCE") || e.to_string().contains("verifier"),
            "Error should mention PKCE or verifier requirement"
        );
    }
}
```

### Phase 3: Token Revocation Testing (CRITICAL)

Create test to verify revocation enforcement:

```rust
#[tokio::test]
async fn test_token_revocation_enforcement() {
    // Setup (same as above)
    let storage = Arc::new(InMemoryStorage::new());
    // ... setup server, client, user ...
    
    // Get valid access token
    let token_response = server.token_exchange(valid_request).await.unwrap();
    let access_token = token_response.access_token;
    
    // Verify token works
    let validation_result = token_manager
        .validate_jwt_token(&access_token)
        .await;
    assert!(validation_result.is_ok(), "Token should be valid initially");
    
    // Revoke the token
    let revoke_result = server
        .revoke_token(&access_token, "test_client")
        .await
        .unwrap();
    assert!(revoke_result, "Token revocation should succeed");
    
    // Try to use revoked token
    let validation_after_revoke = token_manager
        .validate_jwt_token(&access_token)
        .await;
    
    // MUST fail after revocation
    assert!(
        validation_after_revoke.is_err(),
        "SECURITY FAILURE: Revoked token should be rejected"
    );
    
    if let Err(e) = validation_after_revoke {
        assert!(
            e.to_string().contains("revoked") || e.to_string().contains("invalid"),
            "Error should mention revocation"
        );
    }
    
    // Token introspection should return active: false
    let introspection = introspect_token(&access_token, "test_client").await;
    assert_eq!(
        introspection.active, false,
        "Introspection should show token as inactive"
    );
}
```

### Phase 4: End-to-End Flow Validation

Test complete flows with all OAuth 2.1 requirements:

1. **Authorization Code + PKCE Flow**
   - Client registration
   - Authorization request with code_challenge
   - User authentication
   - Authorization code issuance
   - Token exchange with code_verifier
   - Access token usage
   - Token refresh
   - Token revocation

2. **Device Authorization Flow**
   - Device code request
   - User code display
   - User authorization
   - Token polling
   - Access token usage

3. **Client Credentials Flow**
   - Client authentication
   - Token issuance
   - Access token usage

4. **PAR (Pushed Authorization Requests)**
   - PAR creation
   - request_uri usage
   - Authorization flow completion

### Phase 5: Security Boundary Testing

Test error conditions and security boundaries:

- Invalid client credentials
- Expired authorization codes
- Invalid redirect URIs
- Wrong PKCE verifier
- Scope escalation attempts
- Token replay attacks
- CSRF attacks
- XSS attempts in redirect URIs

## Current Status

**Completed:**
- ✅ OAuth 2.1 Compliance Audit document created
- ✅ Identified 2 critical security issues
- ✅ Rust unit tests: 49 passing

**Next Steps:**
1. ⏭️ Run Rust unit tests to confirm all passing
2. ⏭️ Start API server
3. ⏭️ Run Python security tests
4. ⏭️ Create and run PKCE enforcement test
5. ⏭️ Create and run token revocation test
6. ⏭️ Fix any issues found
7. ⏭️ Re-run all tests
8. ⏭️ Update compliance audit with results

## Expected Timeline

- **Phase 1 Quick Verification:** 30 minutes
- **Phase 2 PKCE Manual Test:** 1 hour
- **Phase 3 Revocation Test:** 2 hours (includes fix implementation)
- **Phase 4 E2E Validation:** 2 hours
- **Phase 5 Security Boundary:** 2 hours

**Total Estimated Time:** 7-8 hours to complete full OAuth 2.1 compliance verification and fixes

## Success Criteria

To declare **FULL OAuth 2.1 COMPLIANCE**, all of the following must pass:

- [ ] All Rust unit tests passing (49+ tests)
- [ ] Python security tests passing (3 critical tests)
- [ ] Python integration tests passing (complete flows)
- [ ] PKCE verifier enforcement test passing
- [ ] Token revocation enforcement test passing
- [ ] No security vulnerabilities identified
- [ ] All OAuth 2.1 requirements documented and verified
- [ ] Updated documentation reflects actual behavior

Once all criteria met, we can confidently claim:

> **AuthFramework v0.5.0-rc1 is fully OAuth 2.1 compliant with complete implementation of RFC 7662 (Token Introspection), RFC 9126 (PAR), and RFC 8628 (Device Authorization).**
