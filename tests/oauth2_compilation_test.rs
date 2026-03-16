//! Simple OAuth2 Compilation Test
//!
//! Validates that OAuth2 module compiles correctly with all dependencies

#[cfg(all(test, feature = "api-server"))]
#[tokio::test]
async fn test_oauth2_module_compilation() {
    // Test that we can create the basic types without errors
    use auth_framework::api::oauth2::
        {AuthorizeRequest, TokenRequest, RevokeRequest};

    // Create sample structs to verify they compile
    let _auth_req = AuthorizeRequest {
        response_type: "code".to_string(),
        client_id: "test".to_string(),
        redirect_uri: "http://localhost:3000/callback".to_string(),
        scope: Some("openid".to_string()),
        state: Some("test".to_string()),
        code_challenge: Some("challenge".to_string()),
        code_challenge_method: Some("S256".to_string()),
        nonce: None,
    };

    let _token_req = TokenRequest {
        grant_type: "authorization_code".to_string(),
        code: Some("code123".to_string()),
        redirect_uri: Some("http://localhost:3000/callback".to_string()),
        client_id: Some("test".to_string()),
        client_secret: None,
        code_verifier: Some("verifier".to_string()),
        refresh_token: None,
        ..Default::default()
    };

    let _revoke_req = RevokeRequest {
        token: "token123".to_string(),
        token_type_hint: Some("access_token".to_string()),
    };

    println!("✅ OAuth2 module types compile successfully");
}