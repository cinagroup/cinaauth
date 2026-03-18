# AuthFramework Refactoring Evaluation

## Current State Analysis

`src/auth.rs` is a large file (~4,700 lines) containing the primary God Object, `AuthFramework`. `AuthFramework` contains multiple fields such as configuration, registered methods, `TokenManager`, `AuthStorage`, permissions, MFA state, active sessions, monitoring, and auditing.

Currently, `AuthFramework` utilizes a pseudo-modular structure by exposing operations through wrapper types like `UserOperations<'_>`, `SessionOperations<'_>`, and `TokenOperations<'_>`. However, these are fundamentally tightly coupled because they hold a reference to `&'a AuthFramework` and access its inner state directly within the same massive file.

## De-coupling Strategy

To successfully decompose `AuthFramework` into the already existing `src/auth_modular/` scaffolding, the following steps should be executed:

1. **Inversion of Control for Managers:**
   Instead of `UserOperations<'_>` borrowing `AuthFramework`, we should create dedicated managers (`UserManager`, `SessionManager`, `AuthzManager`) that accept the primitive dependencies they need (e.g., `Arc<dyn AuthStorage>`, `Arc<AuditLogger>`) during instantiation or initialization.

2. **Migrating Domain Logic:**
   - **Users:** Move `UserOperations` implementations from `auth.rs` into `src/auth_modular/user_manager.rs`. Replace direct storage access with the new decoupled `UserManager`.
   - **Sessions:** Repurpose `SessionOperations` logic into `src/auth_modular/session_manager.rs`, ensuring `SessionManager` securely accesses the central Redis/SQLite `Storage` pool instead of the `AuthFramework` state lock.
   - **MFA:** Move `MfaOperations` into the `src/auth_modular/mfa/` module.
   - **Authorization:** Move `AuthorizationOperations` into `src/auth_modular/authorization_manager.rs` (or leverage `authorization_enhanced`).
   - **Admin/Monitoring/Audit:** These can be spun into their own root modules/structs: `AdminManager` in `src/admin.rs` or `src/monitoring.rs`.

3. **`AuthFramework` Structural Role:**
   `AuthFramework` should be reduced from implementing actual logic to being a lightweight **Facade** or **Service Provider**. It should initialize these managers and hold `Arc<UserManager>`, `Arc<SessionManager>`, etc., simply forwarding incoming calls:

   ```rust
   pub fn users(&self) -> Arc<UserManager> {
       Arc::clone(&self.user_manager)
   }
   ```

   This isolates unit tests for users, sessions, and MFA, dropping the necessity for a monolithic integration test environment whenever a single domain component is adjusted.

## Python SDK Metadata

The Python SDK metadata has been updated to reflect the `0.5.0-rc18` version semantics aligning perfectly with the latest Cargo crate specs for proper publishings and downstream integration tests in CI.
