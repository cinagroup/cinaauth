# Rust SDK Implementation Strategy

## Overview

Create a Rust SDK (`authframework-rust-sdk`) that provides a consistent HTTP client experience while maintaining the existing direct integration option for maximum flexibility.

## Architecture Decision

### Two-Tier Approach

**Tier 1: Direct Integration (Existing)**
- Library crate: `auth-framework`
- Use case: Embedded authentication, maximum performance, deep customization
- Integration: Compile-time dependency

**Tier 2: Client SDK (New)**
- Client crate: `authframework-rust-sdk`
- Use case: Microservices, distributed auth, consistent multi-language teams
- Integration: HTTP client talking to AuthFramework server

## Benefits of Hybrid Approach

### For AuthFramework Project
1. **Market Coverage**: Satisfy both performance-focused and consistency-focused developers
2. **Architecture Flexibility**: Support both monolithic and microservice architectures
3. **Migration Path**: Easy transition between approaches as needs change
4. **Ecosystem Consistency**: Rust SDK aligns with Python/JS SDK experience

### For Rust Developers
1. **Choice**: Pick the right tool for the specific use case
2. **Performance**: Direct integration for high-performance scenarios
3. **Consistency**: SDK for teams using multiple languages
4. **Simplicity**: SDK reduces configuration complexity for simple use cases

### For Multi-Language Teams
1. **Unified Experience**: Same API patterns across all languages
2. **Consistent Documentation**: Same endpoint documentation applies to all SDKs
3. **Easier Onboarding**: Developers familiar with Python/JS SDK can immediately use Rust SDK

## Implementation Plan

### Phase 1: Core Rust SDK (Week 1-2)

#### Repository Structure
```
authframework-rust-sdk/
├── Cargo.toml
├── src/
│   ├── lib.rs
│   ├── client.rs          # Main client implementation
│   ├── auth/              # Authentication endpoints
│   │   ├── mod.rs
│   │   ├── login.rs
│   │   ├── logout.rs
│   │   ├── refresh.rs
│   │   └── validate.rs
│   ├── users/             # User management endpoints
│   │   ├── mod.rs
│   │   ├── create.rs
│   │   ├── profile.rs
│   │   └── update.rs
│   ├── roles/             # Role management endpoints
│   ├── permissions/       # Permission endpoints
│   ├── sessions/          # Session management
│   ├── audit/            # Audit log access
│   ├── health/           # Health and metrics
│   ├── types/            # Shared types and models
│   └── error.rs          # Error handling
├── examples/
├── tests/
└── README.md
```

#### Core Client Implementation
```rust
// src/client.rs
use reqwest::{Client, ClientBuilder};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use url::Url;

pub struct AuthFrameworkClient {
    client: Client,
    base_url: Url,
    api_key: Option<String>,
    access_token: Option<String>,
}

impl AuthFrameworkClient {
    pub fn new(base_url: impl AsRef<str>) -> Result<Self, AuthSdkError> {
        let client = ClientBuilder::new()
            .timeout(Duration::from_secs(30))
            .user_agent("authframework-rust-sdk/0.1.0")
            .build()?;

        Ok(Self {
            client,
            base_url: Url::parse(base_url.as_ref())?,
            api_key: None,
            access_token: None,
        })
    }

    pub fn with_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn set_access_token(&mut self, token: impl Into<String>) {
        self.access_token = Some(token.into());
    }

    // Endpoint accessors
    pub fn auth(&self) -> AuthEndpoints {
        AuthEndpoints::new(self)
    }

    pub fn users(&self) -> UserEndpoints {
        UserEndpoints::new(self)
    }

    pub fn roles(&self) -> RoleEndpoints {
        RoleEndpoints::new(self)
    }

    pub fn permissions(&self) -> PermissionEndpoints {
        PermissionEndpoints::new(self)
    }

    pub fn health(&self) -> HealthEndpoints {
        HealthEndpoints::new(self)
    }
}
```

#### Authentication Endpoints
```rust
// src/auth/mod.rs
use crate::{AuthFrameworkClient, AuthSdkError, types::*};

pub struct AuthEndpoints<'a> {
    client: &'a AuthFrameworkClient,
}

impl<'a> AuthEndpoints<'a> {
    pub(crate) fn new(client: &'a AuthFrameworkClient) -> Self {
        Self { client }
    }

    pub async fn login(
        &self,
        username: impl AsRef<str>,
        password: impl AsRef<str>,
    ) -> Result<LoginResponse, AuthSdkError> {
        let request = LoginRequest {
            username: username.as_ref().to_string(),
            password: password.as_ref().to_string(),
            remember_me: false,
        };

        let response = self.client
            .client
            .post(self.client.base_url.join("/auth/login")?)
            .json(&request)
            .send()
            .await?;

        handle_response(response).await
    }

    pub async fn logout(&self) -> Result<(), AuthSdkError> {
        let mut req = self.client
            .client
            .post(self.client.base_url.join("/auth/logout")?);

        if let Some(token) = &self.client.access_token {
            req = req.bearer_auth(token);
        }

        let response = req.send().await?;
        handle_empty_response(response).await
    }

    pub async fn refresh_token(
        &self,
        refresh_token: impl AsRef<str>,
    ) -> Result<RefreshResponse, AuthSdkError> {
        let request = RefreshRequest {
            refresh_token: refresh_token.as_ref().to_string(),
        };

        let response = self.client
            .client
            .post(self.client.base_url.join("/auth/refresh")?)
            .json(&request)
            .send()
            .await?;

        handle_response(response).await
    }

    pub async fn validate_token(
        &self,
        token: impl AsRef<str>,
    ) -> Result<ValidationResponse, AuthSdkError> {
        let request = ValidationRequest {
            token: token.as_ref().to_string(),
        };

        let response = self.client
            .client
            .post(self.client.base_url.join("/auth/validate")?)
            .json(&request)
            .send()
            .await?;

        handle_response(response).await
    }
}
```

### Phase 2: Advanced Features (Week 3-4)

#### Error Handling
```rust
// src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AuthSdkError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),

    #[error("URL parsing failed: {0}")]
    UrlParse(#[from] url::ParseError),

    #[error("JSON serialization failed: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Authentication failed: {message}")]
    Auth { message: String },

    #[error("Permission denied: {message}")]
    Permission { message: String },

    #[error("Rate limit exceeded: retry after {retry_after_seconds}s")]
    RateLimit { retry_after_seconds: u64 },

    #[error("Server error: {status} - {message}")]
    Server { status: u16, message: String },

    #[error("Invalid configuration: {message}")]
    Config { message: String },
}
```

#### Builder Pattern for Configuration
```rust
// src/client.rs - Extended builder
impl AuthFrameworkClient {
    pub fn builder(base_url: impl AsRef<str>) -> ClientBuilder {
        ClientBuilder::new(base_url.as_ref())
    }
}

pub struct ClientBuilder {
    base_url: String,
    timeout: Duration,
    api_key: Option<String>,
    user_agent: String,
    retry_config: RetryConfig,
}

impl ClientBuilder {
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn user_agent(mut self, user_agent: impl Into<String>) -> Self {
        self.user_agent = user_agent.into();
        self
    }

    pub fn retry_policy(mut self, policy: RetryConfig) -> Self {
        self.retry_config = policy;
        self
    }

    pub fn build(self) -> Result<AuthFrameworkClient, AuthSdkError> {
        // Build client with configuration
    }
}
```

### Phase 3: Advanced Integration Features (Week 5-6)

#### Async Stream Support
```rust
// src/streaming.rs
use futures_core::Stream;
use tokio_stream::StreamExt;

impl AuthFrameworkClient {
    pub fn audit_stream(&self) -> impl Stream<Item = Result<AuditEvent, AuthSdkError>> {
        // Server-Sent Events or WebSocket stream of audit events
    }

    pub fn session_events(&self) -> impl Stream<Item = Result<SessionEvent, AuthSdkError>> {
        // Real-time session events
    }
}
```

#### Middleware Support
```rust
// src/middleware.rs
pub trait Middleware: Send + Sync {
    async fn process_request(&self, request: &mut reqwest::Request) -> Result<(), AuthSdkError>;
    async fn process_response(&self, response: &reqwest::Response) -> Result<(), AuthSdkError>;
}

pub struct LoggingMiddleware;
pub struct RetryMiddleware;
pub struct MetricsMiddleware;

impl AuthFrameworkClient {
    pub fn with_middleware<M: Middleware + 'static>(mut self, middleware: M) -> Self {
        // Add middleware to client
        self
    }
}
```

## Usage Comparison

### Direct Integration Example
```rust
// High-performance, embedded authentication
use auth_framework::prelude::*;

#[tokio::main] 
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Direct library usage - compile-time optimization
    let auth = AuthFramework::quick_start()
        .jwt_auth_from_env()
        .postgres_storage(&std::env::var("DATABASE_URL")?)
        .build().await?;

    // Direct method calls - zero network overhead
    let token = auth.create_auth_token(
        "user123", 
        vec!["read".to_string()], 
        "jwt", 
        None
    ).await?;

    // Integrated validation - microsecond latency
    if auth.validate_token(&token).await? {
        println!("Token valid - proceeding with request");
    }

    Ok(())
}
```

### Rust SDK Example  
```rust
// Microservice, distributed authentication
use authframework_rust_sdk::AuthFrameworkClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // HTTP client - consistent with other language SDKs
    let mut client = AuthFrameworkClient::builder("http://auth.company.com")
        .api_key(&std::env::var("AUTH_API_KEY")?)
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    // HTTP-based authentication - consistent API
    let login_response = client.auth()
        .login("user@company.com", "password")
        .await?;

    client.set_access_token(&login_response.access_token);

    // HTTP-based profile access - same as Python/JS SDKs
    let profile = client.users().get_profile().await?;
    println!("User: {} {}", profile.first_name, profile.last_name);

    Ok(())
}
```

## Decision Matrix

| Factor               | Direct Integration | Rust SDK | Winner |
| -------------------- | ------------------ | -------- | ------ |
| **Performance**      | ⭐⭐⭐⭐⭐              | ⭐⭐⭐      | Direct |
| **Consistency**      | ⭐⭐                 | ⭐⭐⭐⭐⭐    | SDK    |
| **Simplicity**       | ⭐⭐⭐                | ⭐⭐⭐⭐⭐    | SDK    |
| **Flexibility**      | ⭐⭐⭐⭐⭐              | ⭐⭐⭐      | Direct |
| **Scalability**      | ⭐⭐⭐⭐               | ⭐⭐⭐⭐⭐    | SDK    |
| **Multi-lang Teams** | ⭐⭐                 | ⭐⭐⭐⭐⭐    | SDK    |
| **Deployment**       | ⭐⭐⭐                | ⭐⭐⭐⭐⭐    | SDK    |

## Recommendation

**Implement both approaches** with clear guidance on when to use each:

### Use Direct Integration When:
- Maximum performance is critical (< 1ms auth latency)
- Deep customization of authentication flows needed
- Monolithic application architecture
- Team is primarily Rust-focused
- Memory/resource constraints are tight

### Use Rust SDK When:
- Microservices architecture
- Multi-language development teams
- Consistent API experience across languages is important
- Centralized authentication server approach
- Easier configuration and setup preferred
- Network latency is acceptable (< 50ms auth latency)

## Marketing Message

**"AuthFramework gives Rust developers the choice: embedded library for maximum performance, or HTTP SDK for maximum consistency. Choose the right tool for your architecture."**

This positions AuthFramework as the only authentication solution that provides both approaches, making it suitable for any Rust use case while maintaining our multi-language ecosystem consistency.