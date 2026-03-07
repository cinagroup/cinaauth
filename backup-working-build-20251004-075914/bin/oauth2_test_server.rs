//! OAuth2 Authorization Server Test Binary
//!
//! This binary demonstrates and tests the complete OAuth2 authorization server functionality
//! including authorization code flow, PKCE support, and token exchange.

use auth_framework::{AuthFramework, AuthConfig, api::ApiServer};
use std::sync::Arc;
use tokio;
use tracing::{info, error};
use tracing_subscriber;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::fmt::init();
    
    info!("🚀 Starting OAuth2 Authorization Server Test");
    
    // Create AuthFramework instance
    // Create auth framework configuration
    let config = AuthConfig::new()
        .secret("test_oauth2_secret_key_that_is_long_enough_for_secure_operation".to_string());

    // Create and initialize auth framework
    let mut auth_framework = AuthFramework::new(config);
    auth_framework.initialize().await?;
    
    let auth_framework = Arc::new(auth_framework);
    
    // Create API server
    let server = ApiServer::new(auth_framework.clone());
    
    info!("📖 OAuth2 Endpoints Available:");
    info!("  Authorization: GET  http://127.0.0.1:8080/api/v1/oauth2/authorize");
    info!("  Token:         POST http://127.0.0.1:8080/api/v1/oauth2/token");
    info!("  Revoke:        POST http://127.0.0.1:8080/api/v1/oauth2/revoke");
    info!("  UserInfo:      GET  http://127.0.0.1:8080/api/v1/oauth2/userinfo");
    info!("");
    info!("🔍 Testing OAuth2 Authorization Code Flow:");
    info!("1. GET /api/v1/oauth2/authorize?response_type=code&client_id=test_client&redirect_uri=http://localhost:3000/callback&scope=openid%20profile&state=xyz");
    info!("2. Use returned authorization_url to get code");
    info!("3. POST /api/v1/oauth2/token with authorization_code grant");
    info!("4. Use access_token for authenticated requests");
    info!("");
    info!("🔐 PKCE Support:");
    info!("  Add code_challenge and code_challenge_method=S256 to authorization request");
    info!("  Include code_verifier in token request");
    info!("");
    
    // Start the server
    info!("🌐 Starting server on http://127.0.0.1:8080");
    server.start().await?;
    
    Ok(())
}