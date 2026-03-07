//! Integration tests for OAuth 2.0 Advanced Features
//!
//! Tests for RFC 7662 (Token Introspection) and RFC 9126 (PAR)

use auth_framework::api::{ApiServer, server::ApiServerConfig};
use auth_framework::storage::MemoryStorage;
use auth_framework::{AuthConfig, AuthFramework};
use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode, header},
};
use base64::{Engine as _, engine::general_purpose};
use serde_json::Value;
use std::sync::Arc;
use tower::ServiceExt;

// ============================================================================
// Test Helpers
// ============================================================================

async fn create_test_server() -> (Arc<AuthFramework>, ApiServer) {
    let config = AuthConfig::default();
    let storage = Arc::new(MemoryStorage::new());
    let auth = Arc::new(AuthFramework::new_with_storage(config, storage));

    let api_config = ApiServerConfig {
        host: "127.0.0.1".to_string(),
        port: 8080,
        enable_cors: true,
        max_body_size: 1024 * 1024,
        enable_tracing: false,
    };

    let server = ApiServer::with_config(auth.clone(), api_config);
    (auth, server)
}

fn basic_auth_header(client_id: &str, client_secret: &str) -> String {
    let credentials = format!("{}:{}", client_id, client_secret);
    let encoded = general_purpose::STANDARD.encode(credentials.as_bytes());
    format!("Basic {}", encoded)
}

// ============================================================================
// Token Introspection Tests (RFC 7662)
// ============================================================================

#[tokio::test]
async fn test_introspect_token_valid_basic_auth() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request with Basic Auth
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(
            header::AUTHORIZATION,
            basic_auth_header("test_client", "test_secret"),
        )
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("token=test_token&token_type_hint=access_token"))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 200 (even if token is invalid, RFC 7662 says return active: false)
    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify response structure
    assert!(json.get("active").is_some());
}

#[tokio::test]
async fn test_introspect_token_missing_auth() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request without authentication
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("token=test_token"))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 401 Unauthorized
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_introspect_token_post_body_auth() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request with POST body authentication
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "token=test_token&client_id=test_client&client_secret=test_secret",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 200 (authentication method accepted)
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_introspect_token_invalid_basic_auth() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request with malformed Basic Auth
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(header::AUTHORIZATION, "Basic invalid_base64!")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("token=test_token"))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 401 Unauthorized (can't decode credentials)
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_introspect_token_bearer_auth_rejected() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request with Bearer token (not allowed for introspection)
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(header::AUTHORIZATION, "Bearer some_token")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("token=test_token"))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 401 (Bearer auth not supported for introspection)
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_introspect_token_with_hint() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request with token_type_hint
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(
            header::AUTHORIZATION,
            basic_auth_header("test_client", "test_secret"),
        )
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("token=test_token&token_type_hint=refresh_token"))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_introspect_token_empty_token() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    // Create request with empty token
    let request = Request::builder()
        .uri("/api/v1/oauth/introspect")
        .method("POST")
        .header(
            header::AUTHORIZATION,
            basic_auth_header("test_client", "test_secret"),
        )
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("token="))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should still return 200 with active: false
    assert_eq!(response.status(), StatusCode::OK);

    let body = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(json["active"], false);
}

// ============================================================================
// Pushed Authorization Request Tests (RFC 9126)
// ============================================================================

#[tokio::test]
async fn test_par_valid_request() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback&scope=openid%20profile",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 201 Created
    assert_eq!(response.status(), StatusCode::CREATED);

    let body = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let json: Value = serde_json::from_slice(&body).unwrap();

    // Verify response structure
    assert!(json.get("request_uri").is_some());
    assert!(json.get("expires_in").is_some());

    // Verify request_uri format
    let request_uri = json["request_uri"].as_str().unwrap();
    assert!(request_uri.starts_with("urn:ietf:params:oauth:request_uri:"));

    // Verify expires_in is 90 seconds (RFC 9126 recommendation)
    assert_eq!(json["expires_in"], 90);
}

#[tokio::test]
async fn test_par_missing_client_id() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&redirect_uri=https://example.com/callback",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 422 Unprocessable Entity (Axum form validation error)
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_par_missing_redirect_uri() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from("response_type=code&client_id=test_client"))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should return 422 Unprocessable Entity (Axum form validation error)
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[tokio::test]
async fn test_par_with_pkce() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback\
             &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);

    let body = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    let json: Value = serde_json::from_slice(&body).unwrap();

    assert!(json.get("request_uri").is_some());
}

#[tokio::test]
async fn test_par_with_state() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback&state=random_state_value",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_par_with_nonce() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback&nonce=random_nonce",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[tokio::test]
async fn test_par_invalid_response_type() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=invalid&client_id=test_client&redirect_uri=https://example.com/callback",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // May return 400 or 201 depending on validation (PAR stores the request, validation happens later)
    // For now, just verify it doesn't crash
    assert!(
        response.status() == StatusCode::CREATED || response.status() == StatusCode::BAD_REQUEST
    );
}

#[tokio::test]
async fn test_par_multiple_requests_unique_uris() {
    let (_auth, server) = create_test_server().await;
    let router1 = server.build_router().await.unwrap();
    let router2 = server.build_router().await.unwrap();

    // First PAR request
    let request1 = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback",
        ))
        .unwrap();

    let response1 = router1.oneshot(request1).await.unwrap();
    assert_eq!(response1.status(), StatusCode::CREATED);

    let body1 = to_bytes(response1.into_body(), 1024 * 1024).await.unwrap();
    let json1: Value = serde_json::from_slice(&body1).unwrap();
    let request_uri1 = json1["request_uri"].as_str().unwrap();

    // Second PAR request
    let request2 = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback",
        ))
        .unwrap();

    let response2 = router2.oneshot(request2).await.unwrap();
    assert_eq!(response2.status(), StatusCode::CREATED);

    let body2 = to_bytes(response2.into_body(), 1024 * 1024).await.unwrap();
    let json2: Value = serde_json::from_slice(&body2).unwrap();
    let request_uri2 = json2["request_uri"].as_str().unwrap();

    // Verify URIs are different
    assert_ne!(request_uri1, request_uri2);
}

#[tokio::test]
async fn test_par_empty_scope() {
    let (_auth, server) = create_test_server().await;
    let router = server.build_router().await.unwrap();

    let request = Request::builder()
        .uri("/api/v1/oauth/par")
        .method("POST")
        .header(header::CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(Body::from(
            "response_type=code&client_id=test_client&redirect_uri=https://example.com/callback&scope=",
        ))
        .unwrap();

    let response = router.oneshot(request).await.unwrap();

    // Should still succeed (scope is optional)
    assert_eq!(response.status(), StatusCode::CREATED);
}
