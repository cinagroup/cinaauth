//! Simple OAuth 2.0 Server Example
//!
//! This example demonstrates basic OAuth 2.0 server functionality
//! using working components of the Auth Framework.

use auth_framework::{
    AuthConfig, AuthFramework, OAuth2Server,
    methods::{AuthMethodEnum, JwtMethod},
    storage::memory::InMemoryStorage,
};
use std::sync::Arc;
use std::time::Duration;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🚀 Starting Simple OAuth 2.0 Server...");

    // Initialize logging
    tracing_subscriber::fmt::init();

    // Create basic auth framework configuration
    let config = AuthConfig::new()
        .secret("oauth-server-secret".to_string())
        .issuer("https://auth.localhost:8080".to_string())
        .audience("oauth-clients".to_string())
        .token_lifetime(Duration::from_secs(3600))
        .refresh_token_lifetime(Duration::from_secs(86400 * 7));

    // Create auth framework
    let mut auth_framework = AuthFramework::new(config);

    // Register JWT method for OAuth tokens
    let jwt_method = JwtMethod::new()
        .secret_key("oauth-server-secret")
        .issuer("https://auth.localhost:8080");

    auth_framework.register_method("oauth", AuthMethodEnum::Jwt(jwt_method));

    // Initialize framework
    auth_framework.initialize().await?;
    println!("✅ Auth framework initialized successfully!");

    // Create in-memory storage for development
    let storage = Arc::new(InMemoryStorage::new());
    println!("✅ In-memory storage created");

    // Create OAuth 2.0 configuration with just the issuer (use defaults for rest)
    let oauth_config = auth_framework::OAuth2Config {
        issuer: "https://auth.localhost:8080".to_string(),
        ..Default::default()
    };

    // Get token manager from framework and wrap in Arc
    // Note: We clone the token manager to create an Arc for the OAuth2Server
    let token_manager = Arc::new(auth_framework.token_manager().clone());

    // Create OAuth 2.0 server with config and token manager
    let oauth_server = OAuth2Server::new(oauth_config.clone(), token_manager).await?;
    println!("✅ OAuth 2.0 server created successfully!");

    // Display server configuration for informational purposes
    println!("📋 Server Configuration:");
    println!("   Issuer: {}", oauth_config.issuer);
    println!(
        "   Authorization Code Lifetime: {:?}",
        oauth_config.authorization_code_lifetime
    );
    println!(
        "   Access Token Lifetime: {:?}",
        oauth_config.access_token_lifetime
    );

    // Demo: Create a sample token using the auth framework
    let demo_token = auth_framework
        .create_auth_token(
            "demo_client",
            vec!["read".to_string(), "write".to_string()],
            "oauth",
            None,
        )
        .await?;

    println!("🔑 Demo OAuth Token Created:");
    println!("   Token: {}", demo_token.access_token);
    println!("   User ID: {}", demo_token.user_id);
    println!("   Scopes: {:?}", demo_token.scopes);

    // Validate the demo token
    if auth_framework.validate_token(&demo_token).await? {
        println!("✅ Token validation successful!");

        // Check permissions
        if auth_framework
            .check_permission(&demo_token, "read", "api")
            .await?
        {
            println!("✅ Permission check passed for 'read' on 'api'!");
        }
    }

    println!("\n🎉 OAuth 2.0 server is running and functional!");
    println!("💡 This is a basic example showing working components.");
    println!("💡 For production use, implement proper OAuth flows and client management.");

    Ok(())
}
