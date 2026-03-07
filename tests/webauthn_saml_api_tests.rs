//! Integration tests for WebAuthn and SAML API endpoints

use auth_framework::api::ApiState;
use auth_framework::{AuthConfig, AuthFramework};
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use serde_json::json;
use std::sync::Arc;
use tower::ServiceExt;

async fn create_test_app() -> axum::Router {
    let auth_framework = Arc::new(AuthFramework::new(AuthConfig::default()));
    let state = ApiState::new(auth_framework)
        .await
        .expect("Failed to create API state");

    // Build router manually since create_router doesn't exist
    axum::Router::new().with_state(state)
}

#[tokio::test]
async fn test_webauthn_registration_init() {
    let app = create_test_app().await;

    let request = Request::builder()
        .method("POST")
        .uri("/api/webauthn/registration/init")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "username": "testuser",
                "display_name": "Test User",
                "authenticator_attachment": "platform",
                "user_verification": "preferred"
            })
            .to_string(),
        ))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8(body.to_vec()).unwrap();
    println!("WebAuthn registration init response: {}", body_str);

    // Parse response as JSON to verify structure
    let response_json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
    assert_eq!(response_json["success"], true);
    assert!(response_json["data"].is_object());
}

#[tokio::test]
async fn test_saml_metadata() {
    let app = create_test_app().await;

    let request = Request::builder()
        .method("GET")
        .uri("/api/saml/metadata")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8(body.to_vec()).unwrap();
    println!("SAML metadata response: {}", body_str);

    // Verify it's XML content
    assert!(body_str.contains("<?xml"));
    assert!(body_str.contains("EntityDescriptor"));
    assert!(body_str.contains("SPSSODescriptor"));
}

#[tokio::test]
async fn test_saml_sso_initiation() {
    let auth_framework = Arc::new(AuthFramework::new(AuthConfig::default()));
    let state = ApiState {
        auth_framework,
        #[cfg(feature = "enhanced-rbac")]
        authorization_service: Arc::new(
            auth_framework::authorization_enhanced::AuthorizationService::new()
                .await
                .unwrap(),
        ),
    };

    let app = axum::Router::new().with_state(state);

    let request = Request::builder()
        .method("POST")
        .uri("/api/saml/sso")
        .header("content-type", "application/json")
        .body(Body::from(
            json!({
                "idp_entity_id": "https://idp.example.com",
                "relay_state": "test_state",
                "force_authn": false
            })
            .to_string(),
        ))
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8(body.to_vec()).unwrap();
    println!("SAML SSO init response: {}", body_str);

    // Parse response as JSON to verify structure
    let response_json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
    assert_eq!(response_json["success"], true);
    assert!(response_json["data"]["redirect_url"].is_string());
    assert!(response_json["data"]["saml_request"].is_string());
}

#[tokio::test]
async fn test_webauthn_credential_list() {
    let auth_framework = Arc::new(AuthFramework::new(AuthConfig::default()));
    let state = ApiState {
        auth_framework,
        #[cfg(feature = "enhanced-rbac")]
        authorization_service: Arc::new(
            auth_framework::authorization_enhanced::AuthorizationService::new()
                .await
                .unwrap(),
        ),
    };

    let app = axum::Router::new().with_state(state);

    let request = Request::builder()
        .method("GET")
        .uri("/api/webauthn/credentials/testuser")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8(body.to_vec()).unwrap();
    println!("WebAuthn credentials list response: {}", body_str);

    // Parse response as JSON to verify structure
    let response_json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
    assert_eq!(response_json["success"], true);
    assert!(response_json["data"].is_array());
}

#[tokio::test]
async fn test_saml_idp_list() {
    let auth_framework = Arc::new(AuthFramework::new(AuthConfig::default()));
    let state = ApiState {
        auth_framework,
        #[cfg(feature = "enhanced-rbac")]
        authorization_service: Arc::new(
            auth_framework::authorization_enhanced::AuthorizationService::new()
                .await
                .unwrap(),
        ),
    };

    let app = axum::Router::new().with_state(state);

    let request = Request::builder()
        .method("GET")
        .uri("/api/saml/idps")
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let body = axum::body::to_bytes(response.into_body(), usize::MAX)
        .await
        .unwrap();
    let body_str = String::from_utf8(body.to_vec()).unwrap();
    println!("SAML IdPs list response: {}", body_str);

    // Parse response as JSON to verify structure
    let response_json: serde_json::Value = serde_json::from_str(&body_str).unwrap();
    assert_eq!(response_json["success"], true);
    assert!(response_json["data"].is_array());
}
