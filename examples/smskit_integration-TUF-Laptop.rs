//! SMSKit Integration Example
//!
//! This example demonstrates how to use the new SMSKit integration for SMS-based MFA
//! instead of the deprecated SMS manager.
//!
//! NOTE: Currently disabled - SmsKitManager was removed along with auth_modular.
//! TODO: Implement proper SMS MFA using the authentication::mfa module.

use auth_framework::errors::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    println!("🚀 SMSKit Integration Example");
    println!("=============================");
    println!();
    println!("⚠️  This example is currently disabled.");
    println!("SMSKitManager was removed along with the auth_modular module.");
    println!();
    println!("TODO: Reimplement SMS MFA using the authentication::mfa module.");
    println!();

    Ok(())
}
