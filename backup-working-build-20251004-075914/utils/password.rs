//! Password utility functions for the AuthFramework.

use crate::errors::{AuthError, Result};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};

/// Password strength levels
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PasswordStrengthLevel {
    Weak,
    Medium,
    Strong,
    VeryStrong,
}

/// Password strength result with level and feedback
#[derive(Debug, Clone)]
pub struct PasswordStrength {
    pub level: PasswordStrengthLevel,
    pub feedback: Vec<String>,
}

/// Hash a password using Argon2
pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AuthError::internal(format!("Failed to hash password: {}", e)))?;

    Ok(password_hash.to_string())
}

/// Verify a password against its hash
pub fn verify_password(password: &str, hash: &str) -> Result<bool> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| AuthError::internal(format!("Invalid password hash: {}", e)))?;

    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Check password strength based on various criteria
pub fn check_password_strength(password: &str) -> PasswordStrength {
    let length = password.len();
    let has_lowercase = password.chars().any(|c| c.is_lowercase());
    let has_uppercase = password.chars().any(|c| c.is_uppercase());
    let has_digit = password.chars().any(|c| c.is_numeric());
    let has_special = password.chars().any(|c| !c.is_alphanumeric());

    let criteria_met = [has_lowercase, has_uppercase, has_digit, has_special]
        .iter()
        .map(|&b| if b { 1 } else { 0 })
        .sum::<i32>();

    let mut feedback = Vec::new();

    if length < 8 {
        feedback.push("Password should be at least 8 characters long".to_string());
    }
    if !has_lowercase {
        feedback.push("Add lowercase letters".to_string());
    }
    if !has_uppercase {
        feedback.push("Add uppercase letters".to_string());
    }
    if !has_digit {
        feedback.push("Add numbers".to_string());
    }
    if !has_special {
        feedback.push("Add special characters".to_string());
    }

    let level = match (length, criteria_met) {
        (0..=6, _) => PasswordStrengthLevel::Weak,
        (7..=10, 0..=2) => PasswordStrengthLevel::Weak,
        (7..=10, 3) => PasswordStrengthLevel::Medium,
        (7..=10, 4) => PasswordStrengthLevel::Medium,
        (11..=14, 0..=2) => PasswordStrengthLevel::Medium,
        (11..=14, 3..=4) => PasswordStrengthLevel::Strong,
        (15.., 0..=2) => PasswordStrengthLevel::Strong,
        (15.., 3..=4) => PasswordStrengthLevel::VeryStrong,
        _ => PasswordStrengthLevel::VeryStrong,
    };

    PasswordStrength { level, feedback }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "testpassword123";
        let hash = hash_password(password).unwrap();

        assert!(verify_password(password, &hash).unwrap());
        assert!(!verify_password("wrongpassword", &hash).unwrap());
    }

    #[test]
    fn test_password_strength() {
        assert_eq!(check_password_strength("weak"), PasswordStrengthLevel::Weak);
        assert_eq!(
            check_password_strength("Medium123"),
            PasswordStrengthLevel::Medium
        );
        assert_eq!(
            check_password_strength("Strong123!"),
            PasswordStrengthLevel::Strong
        );
        assert_eq!(
            check_password_strength("VeryStrong123!@#"),
            PasswordStrengthLevel::VeryStrong
        );
    }
}
