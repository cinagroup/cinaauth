//! OAuth2 Integration Test
//!
//! This test demonstrates the complete OAuth2 authorization server flow
//! including authorization code generation, PKCE validation, token exchange,
//! and UserInfo retrieval.

#[cfg(all(test, feature = "api-server"))]
mod oauth2_integration_tests {
    use auth_framework::api::ApiState;
    use auth_framework::api::oauth2::{self, AuthorizeRequest, RevokeRequest, TokenRequest};
    use auth_framework::{AuthConfig, AuthFramework};
    use axum::Json;
    use axum::extract::{Query, State};
    use axum::http::{HeaderMap, HeaderValue};
    use std::sync::Arc;
    use tokio;

    async fn setup_auth_framework() -> Arc<AuthFramework> {
        let config = AuthConfig::new()
            .secret("test_oauth2_secret_key_that_is_long_enough_for_secure_operation".to_string());

        let mut auth_framework = AuthFramework::new(config);
        auth_framework.initialize().await.unwrap();
        Arc::new(auth_framework)
    }

    async fn setup_api_state() -> ApiState {
        let auth_framework = setup_auth_framework().await;
        ApiState::new(auth_framework).await.unwrap()
    }

    #[tokio::test]
    async fn test_oauth2_authorization_endpoint() {
        let state = setup_api_state().await;

        // Test valid authorization request
        let auth_request = AuthorizeRequest {
            response_type: "code".to_string(),
            client_id: "test_client".to_string(),
            redirect_uri: "http://localhost:3000/callback".to_string(),
            scope: Some("openid profile email".to_string()),
            state: Some("xyz123".to_string()),
            code_challenge: Some("test_challenge".to_string()),
            code_challenge_method: Some("S256".to_string()),
        };

        let response = oauth2::authorize(State(state.clone()), Query(auth_request)).await;

        // Should be successful
        assert!(response.success);

        if let Some(data) = response.data {
            assert!(data.authorization_url.contains("code="));
            assert!(data.authorization_url.contains("state=xyz123"));
            assert_eq!(data.state, Some("xyz123".to_string()));
        }
    }

    #[tokio::test]
    async fn test_oauth2_authorization_invalid_response_type() {
        let state = setup_api_state().await;

        // Test invalid response_type
        let auth_request = AuthorizeRequest {
            response_type: "token".to_string(), // Invalid
            client_id: "test_client".to_string(),
            redirect_uri: "http://localhost:3000/callback".to_string(),
            scope: None,
            state: None,
            code_challenge: None,
            code_challenge_method: None,
        };

        let response = oauth2::authorize(State(state), Query(auth_request)).await;

        // Should fail with validation error
        assert!(!response.success);
    }

    #[tokio::test]
    async fn test_oauth2_token_endpoint_authorization_code() {
        let state = setup_api_state().await;

        // First, create an authorization code by calling authorize endpoint
        let auth_request = AuthorizeRequest {
            response_type: "code".to_string(),
            client_id: "test_client".to_string(),
            redirect_uri: "http://localhost:3000/callback".to_string(),
            scope: Some("openid profile".to_string()),
            state: Some("test_state".to_string()),
            code_challenge: Some("test_challenge".to_string()),
            code_challenge_method: Some("plain".to_string()),
        };

        let auth_response = oauth2::authorize(State(state.clone()), Query(auth_request)).await;

        assert!(auth_response.success);

        // Extract authorization code from the response URL
        let auth_url = auth_response.data.unwrap().authorization_url;
        let code = auth_url
            .split("code=")
            .nth(1)
            .unwrap()
            .split("&")
            .next()
            .unwrap();

        // Now test token exchange
        let token_request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code: Some(code.to_string()),
            redirect_uri: Some("http://localhost:3000/callback".to_string()),
            client_id: Some("test_client".to_string()),
            client_secret: None,
            code_verifier: Some("test_challenge".to_string()), // For PKCE
            refresh_token: None,
        };

        let token_response = oauth2::token(State(state), Json(token_request)).await;

        // Should be successful
        assert!(token_response.success);

        if let Some(data) = token_response.data {
            assert!(!data.access_token.is_empty());
            assert_eq!(data.token_type, "Bearer");
            assert_eq!(data.expires_in, 3600);
            // Refresh token may or may not be present depending on configuration
            assert!(data.scope.is_some());
        }
    }

    #[tokio::test]
    async fn test_oauth2_userinfo_endpoint() {
        let state = setup_api_state().await;

        // Create a test user first
        state
            .auth_framework
            .register_user(
                "oauth2_user_test_client",
                "test@example.com",
                "SecurePassword123!",
            )
            .await
            .unwrap();

        // Create a token for the user
        let token = state
            .auth_framework
            .token_manager()
            .create_auth_token(
                "oauth2_user_test_client",
                vec!["openid".to_string(), "profile".to_string()],
                "oauth2",
                None,
            )
            .unwrap();

        // Test UserInfo endpoint
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {}", token.access_token)).unwrap(),
        );

        let userinfo_response = oauth2::userinfo(State(state), headers).await;

        // Should be successful
        assert!(userinfo_response.success);

        if let Some(data) = userinfo_response.data {
            assert_eq!(data.sub, "oauth2_user_test_client");
            assert!(data.name.is_some());
            assert!(data.updated_at.is_some());
        }
    }

    #[tokio::test]
    async fn test_oauth2_revoke_endpoint() {
        let state = setup_api_state().await;

        let revoke_request = RevokeRequest {
            token: "test_token_to_revoke".to_string(),
            token_type_hint: Some("access_token".to_string()),
        };

        let revoke_response = oauth2::revoke(State(state), Json(revoke_request)).await;

        // Should be successful
        assert!(revoke_response.success);
    }

    #[tokio::test]
    async fn test_oauth2_pkce_s256_validation() {
        let state = setup_api_state().await;

        // Test S256 PKCE flow
        let code_verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        let expected_challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"; // S256 hash of verifier

        // First, create authorization code with S256 challenge
        let auth_request = AuthorizeRequest {
            response_type: "code".to_string(),
            client_id: "test_client_pkce".to_string(),
            redirect_uri: "http://localhost:3000/callback".to_string(),
            scope: Some("openid".to_string()),
            state: None,
            code_challenge: Some(expected_challenge.to_string()),
            code_challenge_method: Some("S256".to_string()),
        };

        let auth_response = oauth2::authorize(State(state.clone()), Query(auth_request)).await;

        assert!(auth_response.success);

        // Extract authorization code
        let auth_url = auth_response.data.unwrap().authorization_url;
        let code = auth_url
            .split("code=")
            .nth(1)
            .unwrap()
            .split("&")
            .next()
            .unwrap();

        // Test token exchange with correct code_verifier
        let token_request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code: Some(code.to_string()),
            redirect_uri: Some("http://localhost:3000/callback".to_string()),
            client_id: Some("test_client_pkce".to_string()),
            client_secret: None,
            code_verifier: Some(code_verifier.to_string()),
            refresh_token: None,
        };

        let token_response = oauth2::token(State(state), Json(token_request)).await;

        // Should be successful with correct PKCE verification
        assert!(token_response.success);
    }

    #[tokio::test]
    async fn test_oauth2_invalid_pkce_fails() {
        let state = setup_api_state().await;

        // First, create authorization code with challenge
        let auth_request = AuthorizeRequest {
            response_type: "code".to_string(),
            client_id: "test_client_invalid_pkce".to_string(),
            redirect_uri: "http://localhost:3000/callback".to_string(),
            scope: Some("openid".to_string()),
            state: None,
            code_challenge: Some("valid_challenge".to_string()),
            code_challenge_method: Some("plain".to_string()),
        };

        let auth_response = oauth2::authorize(State(state.clone()), Query(auth_request)).await;

        assert!(auth_response.success);

        // Extract authorization code
        let auth_url = auth_response.data.unwrap().authorization_url;
        let code = auth_url
            .split("code=")
            .nth(1)
            .unwrap()
            .split("&")
            .next()
            .unwrap();

        // Test token exchange with wrong code_verifier
        let token_request = TokenRequest {
            grant_type: "authorization_code".to_string(),
            code: Some(code.to_string()),
            redirect_uri: Some("http://localhost:3000/callback".to_string()),
            client_id: Some("test_client_invalid_pkce".to_string()),
            client_secret: None,
            code_verifier: Some("wrong_verifier".to_string()),
            refresh_token: None,
        };

        let token_response = oauth2::token(State(state), Json(token_request)).await;

        // Should fail due to PKCE mismatch
        assert!(!token_response.success);
    }
}
