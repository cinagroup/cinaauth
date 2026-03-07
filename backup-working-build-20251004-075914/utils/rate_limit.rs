//! Rate limiting utilities for the AuthFramework.

use crate::errors::{AuthError, Result};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Rate limiter implementation
#[derive(Debug, Clone)]
pub struct RateLimiter {
    max_requests: u32,
    window: Duration,
    requests: Arc<Mutex<HashMap<String, Vec<Instant>>>>,
}

impl RateLimiter {
    /// Create a new rate limiter
    pub fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            max_requests,
            window,
            requests: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Check if a request is allowed for the given key
    pub fn check_rate_limit(&self, key: &str) -> Result<bool> {
        let mut requests = self.requests.lock().map_err(|_| {
            AuthError::internal("Failed to acquire rate limiter lock".to_string())
        })?;

        let now = Instant::now();
        let entry = requests.entry(key.to_string()).or_insert_with(Vec::new);

        // Remove expired requests
        entry.retain(|&request_time| now.duration_since(request_time) < self.window);

        if entry.len() >= self.max_requests as usize {
            return Ok(false); // Rate limit exceeded
        }

        // Add current request
        entry.push(now);
        Ok(true)
    }

    /// Alias for check_rate_limit for compatibility
    pub fn is_allowed(&self, key: &str) -> bool {
        self.check_rate_limit(key).unwrap_or(false)
    }

    /// Alias for get_remaining_requests for compatibility  
    pub fn remaining_requests(&self, key: &str) -> Result<u32> {
        self.get_remaining_requests(key)
    }

    /// Get the number of requests for a key
    pub fn get_request_count(&self, key: &str) -> Result<usize> {
        let requests = self.requests.lock().map_err(|_| {
            AuthError::internal("Failed to acquire rate limiter lock".to_string())
        })?;

        let now = Instant::now();
        if let Some(entry) = requests.get(key) {
            let valid_requests = entry
                .iter()
                .filter(|&&request_time| now.duration_since(request_time) < self.window)
                .count();
            Ok(valid_requests)
        } else {
            Ok(0)
        }
    }

    /// Clean up expired entries
    pub fn cleanup(&self) -> Result<usize> {
        let mut requests = self.requests.lock().map_err(|_| {
            AuthError::internal("Failed to acquire rate limiter lock".to_string())
        })?;

        let now = Instant::now();
        let mut removed_count = 0;

        requests.retain(|_, entry| {
            entry.retain(|&request_time| now.duration_since(request_time) < self.window);
            if entry.is_empty() {
                removed_count += 1;
                false
            } else {
                true
            }
        });

        Ok(removed_count)
    }

    /// Reset rate limit for a specific key
    pub fn reset(&self, key: &str) -> Result<()> {
        let mut requests = self.requests.lock().map_err(|_| {
            AuthError::internal("Failed to acquire rate limiter lock".to_string())
        })?;

        requests.remove(key);
        Ok(())
    }

    /// Get remaining requests for a key
    pub fn get_remaining_requests(&self, key: &str) -> Result<u32> {
        let count = self.get_request_count(key)?;
        Ok(self.max_requests.saturating_sub(count as u32))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;

    #[test]
    fn test_rate_limiter() {
        let limiter = RateLimiter::new(3, Duration::from_secs(1));
        let key = "test_key";

        // First 3 requests should be allowed
        assert!(limiter.check_rate_limit(key).unwrap());
        assert!(limiter.check_rate_limit(key).unwrap());
        assert!(limiter.check_rate_limit(key).unwrap());

        // 4th request should be denied
        assert!(!limiter.check_rate_limit(key).unwrap());

        // Wait for window to expire
        thread::sleep(Duration::from_millis(1100));

        // Should be allowed again
        assert!(limiter.check_rate_limit(key).unwrap());
    }

    #[test]
    fn test_cleanup() {
        let limiter = RateLimiter::new(10, Duration::from_millis(100));
        
        limiter.check_rate_limit("key1").unwrap();
        limiter.check_rate_limit("key2").unwrap();
        
        thread::sleep(Duration::from_millis(150));
        
        let removed = limiter.cleanup().unwrap();
        assert_eq!(removed, 2);
    }
}