# Enhancements found in: src\api\auth-TUF-Laptop.rs
# Size difference: +362 bytes
# Analysis date: 10/04/2025 08:03:16

## Line 83 difference:
Working:             crate::auth_modular::AuthResult::Success(token) => {
TUF-Laptop:             crate::auth::AuthResult::Success(token) => {

## Line 136 difference:
Working:             crate::auth_modular::AuthResult::MfaRequired(_challenge) => {
TUF-Laptop:             crate::auth::AuthResult::MfaRequired(_challenge) => {

## Line 140 difference:
Working:             crate::auth_modular::AuthResult::Failure(reason) => {
TUF-Laptop:             crate::auth::AuthResult::Failure(reason) => {

## Line 259 difference:
Working:                         Ok(profile) => profile.username,
TUF-Laptop:                         Ok(profile) => profile

## Line 260 difference:
Working:                         Err(_) => format!("user_{}", auth_token.user_id), // Fallback if profile fetch fails
TUF-Laptop:                             .username

## Line 261 difference:
Working:                     };
TUF-Laptop:                             .unwrap_or_else(|| format!("user_{}", auth_token.user_id)),

## Line 262 difference:
Working: 
TUF-Laptop:                         Err(_) => format!("user_{}", auth_token.user_id), // Fallback if profile fetch fails

## Line 263 difference:
Working:                     let user_info = UserInfo {
TUF-Laptop:                     };

## Line 264 difference:
Working:                         id: auth_token.user_id,
TUF-Laptop: 

## Line 265 difference:
Working:                         username,
TUF-Laptop:                     let user_info = UserInfo {

## Line 266 difference:
Working:                         roles: auth_token.roles,
TUF-Laptop:                         id: auth_token.user_id,

## Line 267 difference:
Working:                         permissions: auth_token.permissions,
TUF-Laptop:                         username,

## Line 268 difference:
Working:                     };
TUF-Laptop:                         roles: auth_token.roles,

## Line 269 difference:
Working:                     ApiResponse::success(user_info)
TUF-Laptop:                         permissions: auth_token.permissions,

## Line 270 difference:
Working:                 }
TUF-Laptop:                     };

## Line 271 difference:
Working:                 Err(_e) => ApiResponse::error_typed("AUTH_ERROR", "Token validation failed"),
TUF-Laptop:                     ApiResponse::success(user_info)

## Line 272 difference:
Working:             }
TUF-Laptop:                 }

## Line 273 difference:
Working:         }
TUF-Laptop:                 Err(_e) => ApiResponse::error_typed("AUTH_ERROR", "Token validation failed"),

## Line 274 difference:
Working:         None => ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),
TUF-Laptop:             }

## Line 275 difference:
Working:     }
TUF-Laptop:         }

## Line 276 difference:
Working: }
TUF-Laptop:         None => ApiResponse::unauthorized_typed("UNAUTHORIZED", "Authentication required"),

## Line 277 difference:
Working: 
TUF-Laptop:     }

## Line 278 difference:
Working: /// GET /auth/providers
TUF-Laptop: }

## Line 279 difference:
Working: /// List available OAuth providers
TUF-Laptop: 

## Line 280 difference:
Working: pub async fn list_providers(State(_state): State<ApiState>) -> ApiResponse<Vec<ProviderInfo>> {
TUF-Laptop: /// GET /auth/providers

... (truncated - too many differences)
