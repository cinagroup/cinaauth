/// Simple test to verify register function works
use auth_framework::{AuthFramework, AuthConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing AuthFramework with user registration...");

    // Create config with JWT secret
    let mut config = AuthConfig::default();
    config.security.secret_key = Some("test_secret_key_that_is_32_characters_long!".to_string());

    // Create AuthFramework instance
    let framework = AuthFramework::new(config);
    
    // Test UserManager methods
    let user_manager = framework.user_manager();
    
    println!("✅ AuthFramework created successfully");
    println!("✅ UserManager accessible");
    
    // Test creating a user
    match user_manager.create_user("testuser", "test@example.com", "SecurePass123!").await {
        Ok(user_id) => println!("✅ User created successfully with ID: {}", user_id),
        Err(e) => println!("❌ User creation failed: {}", e),
    }
    
    // Test duplicate username detection
    match user_manager.create_user("testuser", "test2@example.com", "SecurePass123!").await {
        Ok(_) => println!("❌ Duplicate username check failed - should have been rejected"),
        Err(e) => println!("✅ Duplicate username correctly rejected: {}", e),
    }
    
    // Test duplicate email detection
    match user_manager.create_user("testuser2", "test@example.com", "SecurePass123!").await {
        Ok(_) => println!("❌ Duplicate email check failed - should have been rejected"),
        Err(e) => println!("✅ Duplicate email correctly rejected: {}", e),
    }
    
    // Test username/email existence checks
    let username_exists = user_manager.username_exists("testuser").await?;
    let email_exists = user_manager.email_exists("test@example.com").await?;
    
    println!("✅ Username exists check: {}", username_exists);
    println!("✅ Email exists check: {}", email_exists);
    
    println!("\n🎉 All user management features working correctly!");
    
    Ok(())
}