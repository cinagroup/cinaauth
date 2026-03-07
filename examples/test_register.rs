/// Test user registration and management functionality
use auth_framework::{AuthFramework, AuthConfig};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("Testing AuthFramework user registration...\n");

    // Create config with JWT secret
    let mut config = AuthConfig::default();
    config.security.secret_key = Some("test_secret_key_that_is_32_characters_long!".to_string());

    // Create AuthFramework instance
    let framework = AuthFramework::new(config);
    println!("✅ AuthFramework created successfully\n");
    
    // Test 1: Create a new user
    println!("Test 1: Creating new user...");
    match framework.register_user("testuser", "test@example.com", "SecurePass123!").await {
        Ok(user_id) => println!("✅ User created successfully with ID: {}\n", user_id),
        Err(e) => {
            println!("❌ User creation failed: {}\n", e);
            return Err(e.into());
        }
    }
    
    // Test 2: Duplicate username detection
    println!("Test 2: Testing duplicate username detection...");
    match framework.register_user("testuser", "test2@example.com", "SecurePass123!").await {
        Ok(_) => {
            println!("❌ Duplicate username check failed - should have been rejected\n");
            return Err("Duplicate username should have been rejected".into());
        }
        Err(e) => println!("✅ Duplicate username correctly rejected: {}\n", e),
    }
    
    // Test 3: Duplicate email detection
    println!("Test 3: Testing duplicate email detection...");
    match framework.register_user("testuser2", "test@example.com", "SecurePass123!").await {
        Ok(_) => {
            println!("❌ Duplicate email check failed - should have been rejected\n");
            return Err("Duplicate email should have been rejected".into());
        }
        Err(e) => println!("✅ Duplicate email correctly rejected: {}\n", e),
    }
    
    // Test 4: Username existence check
    println!("Test 4: Checking if username exists...");
    let username_check = framework.username_exists("testuser").await?;
    println!("✅ Username exists check: {}\n", username_check);
    
    if !username_check {
        return Err("Username should exist but doesn not".into());
    }
    
    // Test 5: Email existence check
    println!("Test 5: Checking if email exists...");
    let email_check = framework.email_exists("test@example.com").await?;
    println!("✅ Email exists check: {}\n", email_check);
    
    if !email_check {
        return Err("Email should exist but doesn not".into());
    }

    // Test 6: Get user by username
    println!("Test 6: Retrieving user by username...");
    match framework.get_user_by_username("testuser").await {
        Ok(user_data) => {
            println!("✅ Retrieved user data for: {}\n", user_data.get("username").unwrap());
        }
        Err(e) => {
            println!("❌ Failed to retrieve user: {}\n", e);
            return Err(e.into());
        }
    }

    // Test 7: Update password
    println!("Test 7: Updating user password...");
    match framework.update_user_password("testuser", "NewSecurePass456!").await {
        Ok(_) => println!("✅ Password updated successfully\n"),
        Err(e) => {
            println!("❌ Password update failed: {}\n", e);
            return Err(e.into());
        }
    }

    // Test 8: Delete user
    println!("Test 8: Deleting user...");
    match framework.delete_user("testuser").await {
        Ok(_) => println!("✅ User deleted successfully\n"),
        Err(e) => {
            println!("❌ User deletion failed: {}\n", e);
            return Err(e.into());
        }
    }

    // Test 9: Verify user was deleted
    println!("Test 9: Verifying user deletion...");
    if framework.username_exists("testuser").await? {
        return Err("User should be deleted but still exists".into());
    }
    println!("✅ Verified user was deleted\n");
    
    println!("🎉 All user management features working correctly!\n");
    println!("Summary:");
    println!("  ✅ User registration");
    println!("  ✅ Duplicate detection (username and email)");
    println!("  ✅ User lookup methods");
    println!("  ✅ Password updates");
    println!("  ✅ User deletion");
    
    Ok(())
}
