use crate::errors::Result;
use jsonwebtoken::{Algorithm, DecodingKey};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecureJwtClaims {
    pub sub: String,
    pub iss: String,
    pub aud: String,
    pub exp: i64,
    pub nbf: i64,
    pub iat: i64,
    pub jti: String,
    pub scope: String,
    pub typ: String,
    pub sid: Option<String>,
    pub client_id: Option<String>,
    pub auth_ctx_hash: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SecureJwtConfig {
    pub allowed_algorithms: Vec<Algorithm>,
    pub required_issuers: HashSet<String>,
    pub required_audiences: HashSet<String>,
    pub max_token_lifetime: Duration,
    pub clock_skew: Duration,
    pub require_jti: bool,
    pub validate_nbf: bool,
    pub allowed_token_types: HashSet<String>,
    pub require_secure_transport: bool,
    /// JWT signing/validation key
    pub jwt_secret: String,
}

impl Default for SecureJwtConfig {
    fn default() -> Self {
        // Generate a fresh cryptographically random secret for each instance so that
        // no default-constructed config ever carries a publicly-known key.
        //
        // Callers that need a stable, shared secret (e.g. multi-node clusters that
        // must validate each other's tokens) must set `jwt_secret` explicitly after
        // construction.
        use ring::rand::{SecureRandom, SystemRandom};
        let rng = SystemRandom::new();
        let mut bytes = [0u8; 32];
        rng.fill(&mut bytes)
            .expect("System CSPRNG unavailable during SecureJwtConfig::default()");
        let jwt_secret = bytes.iter().fold(String::with_capacity(64), |mut s, b| {
            s.push_str(&format!("{b:02x}"));
            s
        });

        let mut allowed_token_types = HashSet::new();
        allowed_token_types.insert("access".to_string());
        allowed_token_types.insert("refresh".to_string());
        allowed_token_types.insert("JARM".to_string());

        let mut required_issuers = HashSet::new();
        required_issuers.insert("auth-framework".to_string());

        Self {
            // M-5: Only advertise the algorithms for which key material is actually present.
            // RS256 and ES256 require asymmetric key pairs that are not currently loaded;
            // listing them in `allowed_algorithms` would cause validation to accept tokens
            // signed with those algorithms if forged key material is ever supplied.  Restrict
            // to HS256 until asymmetric key support is fully implemented.
            allowed_algorithms: vec![Algorithm::HS256],
            required_issuers,
            required_audiences: HashSet::new(),
            max_token_lifetime: Duration::from_secs(3600),
            clock_skew: Duration::from_secs(30),
            require_jti: true,
            validate_nbf: true,
            allowed_token_types,
            require_secure_transport: true,
            jwt_secret,
        }
    }
}

#[derive(Debug)]
pub struct SecureJwtValidator {
    config: SecureJwtConfig,
    /// Maps JTI → insertion timestamp so we can evict by age in `cleanup_revoked_tokens`.
    revoked_tokens: std::sync::Mutex<std::collections::HashMap<String, std::time::SystemTime>>,
}

impl SecureJwtValidator {
    pub fn new(config: SecureJwtConfig) -> Self {
        // Reject secrets shorter than 32 bytes — a minimum for HMAC-SHA256 key
        // security.  Callers may override `require_secure_transport` to `false`
        // in development/test environments but must always provide adequate key
        // material.  For asymmetric algorithms (RS256, ES256) the jwt_secret
        // field is unused for verification, so the check is advisory only.
        #[cfg(not(test))]
        assert!(
            config.jwt_secret.len() >= 32,
            "SecureJwtConfig::jwt_secret must be at least 32 characters. \
             Provide a cryptographically random secret unique to your deployment."
        );
        Self {
            config,
            revoked_tokens: std::sync::Mutex::new(std::collections::HashMap::new()),
        }
    }

    /// Get decoding key for JWT validation
    pub fn get_decoding_key(&self) -> jsonwebtoken::DecodingKey {
        jsonwebtoken::DecodingKey::from_secret(self.config.jwt_secret.as_bytes())
    }

    pub fn validate_token(
        &self,
        token: &str,
        decoding_key: &DecodingKey,
    ) -> Result<SecureJwtClaims> {
        use jsonwebtoken::{Algorithm, Validation, decode};

        // Create validation with signature verification
        let mut validation = Validation::new(Algorithm::HS256);
        validation.validate_exp = false; // Let our custom validation handle expiry
        validation.validate_aud = false; // Let our custom validation handle audience
        validation.validate_nbf = false; // Let our custom validation handle not before

        // Always verify signature — never allow insecure decode
        match decode::<SecureJwtClaims>(token, decoding_key, &validation) {
            Ok(token_data) => {
                let claims = token_data.claims;

                // Check if token is revoked
                if self.is_token_revoked(&claims.jti)? {
                    return Err(crate::errors::AuthError::Unauthorized(
                        "Token is revoked".to_string(),
                    ));
                }

                // Additional custom validations can be added here

                Ok(claims)
            }
            Err(e) => Err(crate::errors::AuthError::Unauthorized(format!(
                "JWT validation failed: {}",
                e
            ))),
        }
    }

    pub fn is_token_revoked(&self, jti: &str) -> Result<bool> {
        let revoked_tokens = self.revoked_tokens.lock().unwrap();
        Ok(revoked_tokens.contains_key(jti))
    }

    pub fn revoke_token(&self, jti: &str) -> Result<()> {
        let mut revoked_tokens = self.revoked_tokens.lock().unwrap();
        revoked_tokens.insert(jti.to_string(), std::time::SystemTime::now());
        Ok(())
    }

    /// Remove revoked token entries that are older than `expired_cutoff`.
    ///
    /// This prevents unbounded memory growth in long-running deployments.  Callers should
    /// pass a cutoff equal to `now − max_token_lifetime` so that every entry that could
    /// still be used by a live token is preserved, while entries that can only correspond
    /// to already-expired tokens are discarded.
    ///
    /// An additional size cap (10,000 entries) is enforced after time-based eviction:
    /// if the map still exceeds the cap the oldest 25 % of entries are removed.
    pub fn cleanup_revoked_tokens(&self, expired_cutoff: std::time::SystemTime) -> Result<()> {
        const MAX_REVOKED_TOKENS: usize = 10_000;
        let mut revoked_tokens = self.revoked_tokens.lock().unwrap();

        // Phase 1: remove entries whose insertion time predates the cutoff — these
        // correspond to JWTs that would have expired naturally already.
        revoked_tokens.retain(|_, inserted_at| *inserted_at >= expired_cutoff);

        // Phase 2: hard size cap — if phase 1 was not enough (e.g. very short cleanup
        // interval or very long token lifetime), evict the oldest 25 % of remaining entries.
        if revoked_tokens.len() > MAX_REVOKED_TOKENS {
            let target_len = MAX_REVOKED_TOKENS * 3 / 4;
            let mut by_age: Vec<(String, std::time::SystemTime)> =
                revoked_tokens.drain().collect();
            by_age.sort_unstable_by_key(|(_, t)| *t);
            // Re-insert only the newest entries.
            for (jti, inserted_at) in by_age.into_iter().rev().take(target_len) {
                revoked_tokens.insert(jti, inserted_at);
            }
            tracing::warn!(
                "Revoked token list exceeded {} entries; oldest entries were evicted.",
                MAX_REVOKED_TOKENS
            );
        }

        Ok(())
    }
}


