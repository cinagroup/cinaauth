# Web Framework Integration Plan

*Implementation plan for web-server-abstraction integration*

## Overview

This document outlines the integration of the [`web-server-abstraction`](https://github.com/ciresnave/web-server-abstraction) crate into AuthFramework to provide unified authentication middleware across multiple web frameworks.

## Current State Analysis

### Existing Integrations

We currently have framework-specific integrations:

- **Axum** (`src/integrations/axum.rs`) - 508 lines, comprehensive middleware and extractors
- **Actix-web** (`src/integrations/actix_web.rs`) - 497 lines, performance-optimized middleware
- **Warp** (`src/integrations/warp.rs`) - Basic integration, less maintained

### Web-Server-Abstraction Crate

From [`web-server-abstraction`](https://docs.rs/web-server-abstraction):
- Provides unified interface across web frameworks
- Already developed and maintained by project owner
- Customizable for our specific needs
- Supports Axum, Actix-web, and other frameworks

## Integration Strategy

### Phase 1: Evaluation and Planning

**Goals:**
- Analyze current web-server-abstraction capabilities
- Identify gaps for authentication middleware needs
- Plan integration without breaking existing APIs

**Tasks:**
- [x] Audit web-server-abstraction crate features
- [x] Identify authentication-specific requirements
- [x] Design integration layer architecture
- [x] Plan migration path for existing integrations

### Phase 2: Core Integration ✅ COMPLETED

**Goals:**
- Implement AuthFramework layer over web-server-abstraction
- Maintain existing API compatibility
- Provide unified authentication middleware

**Implementation Plan:**

```rust
// New module: src/integrations/unified.rs
use web_server_abstraction::{WebServer, Middleware, Request, Response};
use crate::{AuthFramework, AuthError, tokens::AuthToken};

pub struct AuthMiddleware<S> {
    auth_framework: Arc<AuthFramework>,
    server_type: PhantomData<S>,
    config: AuthMiddlewareConfig,
}

pub struct AuthMiddlewareConfig {
    pub skip_paths: Vec<String>,
    pub required_roles: Vec<String>,
    pub required_permissions: Vec<String>,
    pub cookie_name: String,
    pub header_name: String,
}

impl<S: WebServer> Middleware<S> for AuthMiddleware<S> {
    async fn handle(&self, req: Request, next: Next) -> Result<Response, S::Error> {
        // Unified authentication logic
        // Extract token from request (header, cookie, query param)
        // Validate token with AuthFramework
        // Add user context to request
        // Continue or reject based on auth result
    }
}
```

### Phase 3: Framework-Specific Optimizations

**Goals:**
- Leverage framework-specific optimizations
- Maintain unified API while optimizing performance
- Preserve existing integration ergonomics

**Approach:**
- Keep existing integrations for framework-specific features
- Use web-server-abstraction for common functionality
- Provide migration utilities for existing code

## Implementation Details

### Unified Authentication Flow

```rust
// Proposed unified interface
pub struct UnifiedAuthBuilder {
    auth_framework: Arc<AuthFramework>,
    config: AuthMiddlewareConfig,
}

impl UnifiedAuthBuilder {
    pub fn new(auth: Arc<AuthFramework>) -> Self {
        Self {
            auth_framework: auth,
            config: AuthMiddlewareConfig::default(),
        }
    }
    
    pub fn skip_paths(mut self, paths: &[&str]) -> Self {
        self.config.skip_paths = paths.iter().map(|s| s.to_string()).collect();
        self
    }
    
    pub fn require_roles(mut self, roles: &[&str]) -> Self {
        self.config.required_roles = roles.iter().map(|s| s.to_string()).collect();
        self
    }
    
    // Framework-specific builders
    pub fn for_axum(self) -> AxumAuthMiddleware {
        AxumAuthMiddleware::from_unified(self)
    }
    
    pub fn for_actix(self) -> ActixAuthMiddleware {
        ActixAuthMiddleware::from_unified(self)
    }
    
    // Generic builder using web-server-abstraction
    pub fn for_framework<S: WebServer>(self) -> AuthMiddleware<S> {
        AuthMiddleware::from_unified(self)
    }
}
```

### Migration Strategy

**Existing Code Compatibility:**
```rust
// Current Axum usage (still works)
use auth_framework::integrations::axum::RequireAuth;
let middleware = RequireAuth::new().with_roles(&["user"]);

// New unified usage (optional migration)
use auth_framework::integrations::unified::UnifiedAuthBuilder;
let middleware = UnifiedAuthBuilder::new(auth)
    .require_roles(&["user"])
    .for_axum();
```

### Performance Considerations

**Framework-Specific Optimizations:**
- **Axum**: Leverage extractors and tower middleware
- **Actix-web**: Use actor system and zero-copy optimizations
- **Generic**: Provide good default performance via web-server-abstraction

**Benchmarking Plan:**
- Measure current integration performance
- Compare unified vs framework-specific performance
- Optimize hot paths in unified implementation

## Benefits of Integration

### For AuthFramework

1. **Unified API**: Single authentication interface across frameworks
2. **Reduced Maintenance**: Less framework-specific code to maintain
3. **Easier Testing**: Common test suite for all frameworks
4. **Future-Proof**: Easy to add new framework support

### For Developers

1. **Consistent API**: Same authentication setup across different projects
2. **Framework Flexibility**: Easy to switch frameworks without changing auth code
3. **Better Documentation**: Single integration guide for all frameworks
4. **Reduced Learning Curve**: Learn once, use everywhere

### For Ecosystem

1. **Standardization**: Common authentication patterns across Rust web ecosystem
2. **Interoperability**: Easier to integrate with other web-server-abstraction tools
3. **Community Growth**: Lower barrier to adoption

## Implementation Timeline

### Week 1-2: Research and Design
- [ ] Deep dive into web-server-abstraction capabilities
- [ ] Design unified authentication interface
- [ ] Plan integration architecture
- [ ] Create proof-of-concept implementation

### Week 3-4: Core Implementation
- [ ] Implement unified authentication middleware
- [ ] Create framework-specific adapters
- [ ] Maintain backward compatibility
- [ ] Write comprehensive tests

### Week 5-6: Optimization and Polish
- [ ] Performance benchmarking and optimization
- [ ] Documentation and examples
- [ ] Migration guides
- [ ] Community feedback integration

## Risk Assessment

### Technical Risks

**Abstraction Overhead:**
- *Risk*: Performance degradation from additional abstraction layer
- *Mitigation*: Benchmarking, framework-specific optimizations, compile-time optimizations

**API Complexity:**
- *Risk*: More complex API surface
- *Mitigation*: Maintain existing simple APIs, provide migration path

**Dependency Management:**
- *Risk*: Additional dependency could cause conflicts
- *Mitigation*: Optional feature flags, minimal dependency requirements

### Timeline Risks

**Integration Complexity:**
- *Risk*: More complex than anticipated
- *Mitigation*: Start with MVP, iterative development, fallback to current approach

## Success Metrics

### Technical Metrics
- Performance within 5% of current framework-specific implementations
- API compatibility maintained for existing integrations
- Test coverage >= 90% for unified implementation

### Adoption Metrics
- Developer feedback on unified API
- Migration rate from framework-specific to unified API
- Community contributions to web-server-abstraction integration

## Usage Examples

### Basic Usage

```rust
use auth_framework::{AuthFramework, integrations::unified::create_auth_validator};
use std::sync::Arc;

// Setup AuthFramework
let config = auth_framework::AuthConfig::default();
let auth_framework = Arc::new(AuthFramework::new(config));

// Create unified validator (provides shared logic across web frameworks)
let auth_validator = create_auth_validator(auth_framework);

// Use in your web framework's middleware
// Example validation logic:
async fn validate_request_token(token: &str, validator: &UnifiedAuthValidator) -> Result<UserProfile, AuthError> {
    validator.validate_token(token).await
}
```

### Advanced Configuration

```rust
use auth_framework::{AuthFramework, integrations::unified::auth_validator_builder};
use std::sync::Arc;

let config = auth_framework::AuthConfig::default();
let auth_framework = Arc::new(AuthFramework::new(config));

let auth_validator = auth_validator_builder(auth_framework)
    .skip_paths(vec![
        "/health".to_string(),
        "/api/public".to_string(),
    ])
    .require_roles(vec!["admin".to_string()])
    .require_permissions(vec!["read:users".to_string()])
    .cookie_name("session_token".to_string())
    .header_name("X-Auth-Token".to_string())
    .allow_query_param("token".to_string())
    .build();

// Use in your web framework middleware
if auth_validator.should_skip_path("/health") {
    // Skip authentication
} else {
    // Extract token from request headers/cookies/query params
    let token = auth_validator.extract_token_from_header(Some("Bearer jwt_token_here"));
    if let Some(token) = token {
        let user_profile = auth_validator.validate_token(&token).await?;
        // Continue with authenticated request
    }
}
```

### Migration from Framework-Specific Integrations

```rust
// Before: Framework-specific
#[cfg(feature = "axum-integration")]
use auth_framework::integrations::axum::AuthMiddleware as AxumAuth;

// After: Unified
#[cfg(feature = "unified-integration")]
use auth_framework::integrations::unified::AuthMiddleware;

// Same API, works across frameworks
```

## Implementation Status

- ✅ **Phase 1: Evaluation and Planning** - Complete
- ✅ **Phase 2: Core Integration** - Complete
- ✅ **Unified middleware implementation** - Complete
- ✅ **Builder pattern for configuration** - Complete
- ✅ **Comprehensive error handling** - Complete
- ✅ **Path-based authentication skipping** - Complete
- ✅ **Role and permission validation** - Complete
- ✅ **Multi-token source support** (header, cookie, query param) - Complete
- 🔄 **Phase 3: Framework-Specific Optimizations** - In progress
- 🔄 **Performance benchmarking** - Pending
- 🔄 **Migration documentation** - Pending

## Benefits Achieved

### Developer Benefits

1. **Single Learning Curve**: Same API across all web frameworks
2. **Easy Migration**: Switch frameworks without changing auth code
3. **Consistent Behavior**: Same authentication logic everywhere
4. **Reduced Maintenance**: Single implementation to maintain

### AuthFramework Benefits

1. **Broader Adoption**: Works with any web framework
2. **Reduced Code Duplication**: Unified implementation
3. **Easier Testing**: Single middleware to test thoroughly
4. **Future-Proof**: New web frameworks automatically supported

---

This unified integration successfully leverages the web-server-abstraction crate to provide consistent authentication middleware across the entire Rust web ecosystem.