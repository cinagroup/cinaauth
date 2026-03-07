//! OAuth 2.0 API Endpoints
//!
//! Handles OAuth 2.0 authorization, token exchange, and related operations

use crate::api::{ApiResponse, ApiState};
use axum::{
    Json,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Redirect},
};
use serde::{Deserialize, Serialize};

/// OAuth authorization request parameters
#[derive(Debug, Deserialize)]
pub struct AuthorizeRequest {
    pub response_type: String,
    pub client_id: String,
    pub redirect_uri: String,
    pub scope: Option<String>,
    pub state: Option<String>,
    pub code_challenge: Option<String>,
    pub code_challenge_method: Option<String>,
}

/// OAuth token request
#[derive(Debug, Deserialize)]
pub struct TokenRequest {
    pub grant_type: String,
    pub code: Option<String>,
    pub client_id: String,
    pub client_secret: Option<String>,
    pub redirect_uri: Option<String>,
    pub refresh_token: Option<String>,
    pub code_verifier: Option<String>,
}

/// OAuth token response
#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id_token: Option<String>,
}

/// OAuth error response
#[derive(Debug, Serialize)]
pub struct OAuthError {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_uri: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}

/// Client information
#[derive(Debug, Serialize)]
pub struct ClientInfo {
    pub client_id: String,
    pub name: String,
    pub description: String,
    pub redirect_uris: Vec<String>,
    pub scopes: Vec<String>,
}

/// GET /oauth/authorize
/// OAuth 2.0 authorization endpoint
pub async fn authorize(
    State(_state): State<ApiState>,
    Query(params): Query<AuthorizeRequest>,
) -> impl IntoResponse {
    // Validate required parameters
    if params.response_type != "code" {
        let error = OAuthError {
            error: "unsupported_response_type".to_string(),
            error_description: Some("Only 'code' response type is supported".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::BAD_REQUEST, Json(error)).into_response();
    }

    if params.client_id.is_empty() {
        let error = OAuthError {
            error: "invalid_request".to_string(),
            error_description: Some("client_id is required".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::BAD_REQUEST, Json(error)).into_response();
    }

    if params.redirect_uri.is_empty() {
        let error = OAuthError {
            error: "invalid_request".to_string(),
            error_description: Some("redirect_uri is required".to_string()),
            error_uri: None,
            state: params.state,
        };
        return (StatusCode::BAD_REQUEST, Json(error)).into_response();
    }

    // In a real implementation:
    // 1. Validate client_id exists
    // 2. Validate redirect_uri is registered for client
    // 3. Check if user is authenticated
    // 4. Show consent screen if needed
    // 5. Generate authorization code
    // 6. Redirect with code

    // For now, simulate successful authorization
    let auth_code = format!("auth_code_{}", chrono::Utc::now().timestamp());
    let mut redirect_url = params.redirect_uri;

    redirect_url.push_str(&format!("?code={}", auth_code));
    if let Some(state) = params.state {
        redirect_url.push_str(&format!("&state={}", state));
    }

    tracing::info!("OAuth authorization for client: {}", params.client_id);
    Redirect::to(&redirect_url).into_response()
}

/// POST /oauth/token
/// OAuth 2.0 token endpoint
pub async fn token(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<TokenRequest>,
) -> ApiResponse<TokenResponse> {
    // Validate grant type
    match req.grant_type.as_str() {
        "authorization_code" => handle_authorization_code_grant(state, req).await,
        "refresh_token" => handle_refresh_token_grant(state, req).await,
        "client_credentials" => handle_client_credentials_grant(state, req).await,
        _ => ApiResponse::error_typed(
            "unsupported_grant_type",
            format!("Unsupported grant type: {}", req.grant_type),
        ),
    }
}

async fn handle_authorization_code_grant(
    _state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    // Validate required parameters
    if req.code.is_none() {
        return ApiResponse::error_typed("invalid_request", "authorization code is required");
    }

    if req.redirect_uri.is_none() {
        return ApiResponse::error_typed("invalid_request", "redirect_uri is required");
    }

    // In a real implementation:
    // 1. Validate authorization code
    // 2. Verify client credentials
    // 3. Validate redirect_uri matches
    // 4. Validate PKCE if used
    // 5. Generate access token and refresh token

    let response = TokenResponse {
        access_token: format!("access_token_{}", chrono::Utc::now().timestamp()),
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: Some(format!("refresh_token_{}", chrono::Utc::now().timestamp())),
        scope: Some("read write".to_string()),
        id_token: None,
    };

    tracing::info!("Authorization code exchanged for client: {}", req.client_id);
    ApiResponse::<TokenResponse>::success(response)
}

async fn handle_refresh_token_grant(
    _state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    if req.refresh_token.is_none() {
        return ApiResponse::error_typed("invalid_request", "refresh_token is required");
    }

    // In a real implementation:
    // 1. Validate refresh token
    // 2. Verify client credentials
    // 3. Generate new access token
    // 4. Optionally rotate refresh token

    let response = TokenResponse {
        access_token: format!("new_access_token_{}", chrono::Utc::now().timestamp()),
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: req.refresh_token, // Reuse existing refresh token
        scope: Some("read write".to_string()),
        id_token: None,
    };

    tracing::info!("Refresh token used for client: {}", req.client_id);
    ApiResponse::<TokenResponse>::success(response)
}

async fn handle_client_credentials_grant(
    _state: ApiState,
    req: TokenRequest,
) -> ApiResponse<TokenResponse> {
    // In a real implementation:
    // 1. Validate client credentials
    // 2. Check client is authorized for client_credentials grant
    // 3. Generate access token (no refresh token for client credentials)

    let response = TokenResponse {
        access_token: format!("client_access_token_{}", chrono::Utc::now().timestamp()),
        token_type: "Bearer".to_string(),
        expires_in: 7200,    // 2 hours for client credentials
        refresh_token: None, // No refresh token for client credentials
        scope: Some("api:read api:write".to_string()),
        id_token: None,
    };

    tracing::info!("Client credentials grant for client: {}", req.client_id);
    ApiResponse::<TokenResponse>::success(response)
}

/// POST /oauth/revoke
/// Token revocation endpoint
#[derive(Debug, Deserialize)]
pub struct RevokeRequest {
    pub token: String,
    pub token_type_hint: Option<String>,
}

pub async fn revoke_token(
    State(_state): State<ApiState>,
    Json(req): Json<RevokeRequest>,
) -> ApiResponse<()> {
    if req.token.is_empty() {
        return ApiResponse::validation_error_typed("token is required");
    }

    // In a real implementation:
    // 1. Validate client credentials
    // 2. Identify token type (access or refresh)
    // 3. Revoke the token
    // 4. If refresh token, revoke associated access tokens

    tracing::info!("Token revoked: {}", &req.token[..10]);
    ApiResponse::<()>::ok_with_message("Token revoked successfully")
}

/// POST /oauth/introspect
/// Token introspection endpoint (RFC 7662)
#[derive(Debug, Deserialize)]
pub struct IntrospectRequest {
    pub token: String,
    pub token_type_hint: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct IntrospectResponse {
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exp: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iat: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub: Option<String>,
}

pub async fn introspect_token(
    State(_state): State<ApiState>,
    Json(req): Json<IntrospectRequest>,
) -> ApiResponse<IntrospectResponse> {
    if req.token.is_empty() {
        return ApiResponse::validation_error_typed("token is required");
    }

    // In a real implementation:
    // 1. Validate client credentials
    // 2. Look up token in storage
    // 3. Check if token is active and not expired
    // 4. Return token metadata

    let response = IntrospectResponse {
        active: true, // Placeholder
        scope: Some("read write".to_string()),
        client_id: Some("example_client".to_string()),
        username: Some("user@example.com".to_string()),
        token_type: Some("Bearer".to_string()),
        exp: Some(chrono::Utc::now().timestamp() as u64 + 3600),
        iat: Some(chrono::Utc::now().timestamp() as u64),
        sub: Some("user_123".to_string()),
    };

    tracing::info!("Token introspected: {}", &req.token[..10]);
    ApiResponse::<IntrospectResponse>::success(response)
}

/// GET /oauth/clients/{client_id}
/// Get OAuth client information
pub async fn get_client_info(
    State(_state): State<ApiState>,
    axum::extract::Path(client_id): axum::extract::Path<String>,
) -> ApiResponse<ClientInfo> {
    // In a real implementation, fetch client from storage
    let client = ClientInfo {
        client_id: client_id.clone(),
        name: format!("Client {}", client_id),
        description: "OAuth 2.0 client application".to_string(),
        redirect_uris: vec![
            "https://example.com/callback".to_string(),
            "https://app.example.com/auth/callback".to_string(),
        ],
        scopes: vec![
            "read".to_string(),
            "write".to_string(),
            "profile".to_string(),
        ],
    };

    ApiResponse::<ClientInfo>::success(client)
}

// ================================================================================================
// Advanced OAuth2 Features
// ================================================================================================

/// Token Exchange Request (RFC 8693)
#[derive(Debug, Deserialize)]
pub struct TokenExchangeRequest {
    pub grant_type: String,
    pub subject_token: String,
    pub subject_token_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_token_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requested_token_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub audience: Option<String>,
}

/// POST /oauth/token-exchange
/// RFC 8693 Token Exchange endpoint
pub async fn token_exchange(
    State(state): State<ApiState>,
    Json(req): Json<TokenExchangeRequest>,
) -> ApiResponse<TokenResponse> {
    // Validate grant type
    if req.grant_type != "urn:ietf:params:oauth:grant-type:token-exchange" {
        return ApiResponse::error_typed(
            "unsupported_grant_type",
            "Must be 'urn:ietf:params:oauth:grant-type:token-exchange'",
        );
    }

    // Validate subject token
    if req.subject_token.is_empty() {
        return ApiResponse::error_typed("invalid_request", "subject_token is required");
    }

    // Validate the subject token
    let token_result = state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&req.subject_token);

    let claims = match token_result {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::error_typed("invalid_token", "Subject token is invalid");
        }
    };

    // Create a new token for the exchange
    let new_token = match state.auth_framework.token_manager().create_auth_token(
        &claims.sub,
        claims.roles.unwrap_or_default(),
        "jwt",
        None,
    ) {
        Ok(token) => token,
        Err(e) => {
            tracing::error!("Failed to create exchanged token: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to exchange token");
        }
    };

    let response = TokenResponse {
        access_token: new_token.access_token,
        token_type: "Bearer".to_string(),
        expires_in: 3600,
        refresh_token: new_token.refresh_token,
        scope: req.scope.clone(),
        id_token: None,
    };

    tracing::info!("Token exchanged for user: {}", claims.sub);
    ApiResponse::success(response)
}

/// OIDC Discovery Document
#[derive(Debug, Serialize)]
pub struct OidcDiscoveryDocument {
    pub issuer: String,
    pub authorization_endpoint: String,
    pub token_endpoint: String,
    pub userinfo_endpoint: String,
    pub jwks_uri: String,
    pub registration_endpoint: Option<String>,
    pub scopes_supported: Vec<String>,
    pub response_types_supported: Vec<String>,
    pub response_modes_supported: Vec<String>,
    pub grant_types_supported: Vec<String>,
    pub subject_types_supported: Vec<String>,
    pub id_token_signing_alg_values_supported: Vec<String>,
    pub token_endpoint_auth_methods_supported: Vec<String>,
    pub claims_supported: Vec<String>,
    pub code_challenge_methods_supported: Vec<String>,
}

/// GET /.well-known/openid-configuration
/// OIDC Discovery endpoint
pub async fn oidc_discovery(State(_state): State<ApiState>) -> Json<OidcDiscoveryDocument> {
    // TODO: Get base URL from configuration
    let base_url = "https://auth.example.com"; // Should come from config

    let discovery = OidcDiscoveryDocument {
        issuer: base_url.to_string(),
        authorization_endpoint: format!("{}/oauth/authorize", base_url),
        token_endpoint: format!("{}/oauth/token", base_url),
        userinfo_endpoint: format!("{}/oidc/userinfo", base_url),
        jwks_uri: format!("{}/.well-known/jwks.json", base_url),
        registration_endpoint: None,
        scopes_supported: vec![
            "openid".to_string(),
            "profile".to_string(),
            "email".to_string(),
            "address".to_string(),
            "phone".to_string(),
            "offline_access".to_string(),
        ],
        response_types_supported: vec![
            "code".to_string(),
            "id_token".to_string(),
            "id_token token".to_string(),
            "code id_token".to_string(),
            "code token".to_string(),
            "code id_token token".to_string(),
        ],
        response_modes_supported: vec![
            "query".to_string(),
            "fragment".to_string(),
            "form_post".to_string(),
        ],
        grant_types_supported: vec![
            "authorization_code".to_string(),
            "refresh_token".to_string(),
            "urn:ietf:params:oauth:grant-type:token-exchange".to_string(),
        ],
        subject_types_supported: vec!["public".to_string()],
        id_token_signing_alg_values_supported: vec!["RS256".to_string(), "HS256".to_string()],
        token_endpoint_auth_methods_supported: vec![
            "client_secret_basic".to_string(),
            "client_secret_post".to_string(),
            "none".to_string(),
        ],
        claims_supported: vec![
            "sub".to_string(),
            "iss".to_string(),
            "aud".to_string(),
            "exp".to_string(),
            "iat".to_string(),
            "name".to_string(),
            "given_name".to_string(),
            "family_name".to_string(),
            "email".to_string(),
            "email_verified".to_string(),
            "picture".to_string(),
            "phone_number".to_string(),
            "phone_number_verified".to_string(),
            "address".to_string(),
            "updated_at".to_string(),
        ],
        code_challenge_methods_supported: vec!["S256".to_string(), "plain".to_string()],
    };

    Json(discovery)
}

/// JSON Web Key Set
#[derive(Debug, Serialize)]
pub struct JwkSet {
    pub keys: Vec<Jwk>,
}

/// JSON Web Key
#[derive(Debug, Serialize)]
pub struct Jwk {
    pub kty: String, // Key type (RSA, EC, etc.)
    pub kid: String, // Key ID
    pub alg: String, // Algorithm
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<String>, // RSA modulus
    #[serde(skip_serializing_if = "Option::is_none")]
    pub e: Option<String>, // RSA exponent
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crv: Option<String>, // EC curve
    #[serde(skip_serializing_if = "Option::is_none")]
    pub x: Option<String>, // EC x coordinate
    #[serde(skip_serializing_if = "Option::is_none")]
    pub y: Option<String>, // EC y coordinate
    #[serde(rename = "use")]
    pub use_: String, // Key use (sig, enc)
}

/// GET /.well-known/jwks.json
/// JSON Web Key Set endpoint
pub async fn jwks(State(_state): State<ApiState>) -> Json<JwkSet> {
    // TODO: Integrate with actual key manager to get real public keys
    // This is a placeholder with example RSA key structure
    let jwks = JwkSet {
        keys: vec![Jwk {
            kty: "RSA".to_string(),
            kid: "rsa-key-1".to_string(),
            alg: "RS256".to_string(),
            n: Some("placeholder_modulus_base64url_encoded".to_string()),
            e: Some("AQAB".to_string()),
            crv: None,
            x: None,
            y: None,
            use_: "sig".to_string(),
        }],
    };

    Json(jwks)
}

/// UserInfo response
#[derive(Debug, Serialize)]
pub struct UserInfoResponse {
    pub sub: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub given_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub family_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email_verified: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub picture: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone_number: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone_number_verified: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<i64>,
}

/// GET /oidc/userinfo
/// OIDC UserInfo endpoint
pub async fn userinfo(
    State(state): State<ApiState>,
    headers: HeaderMap,
) -> ApiResponse<UserInfoResponse> {
    // Extract and validate access token from Authorization header
    let token = match crate::api::extract_bearer_token(&headers) {
        Some(t) => t,
        None => {
            return ApiResponse::error_typed("invalid_token", "Authorization header required");
        }
    };

    // Validate the access token
    let claims = match state
        .auth_framework
        .token_manager()
        .validate_jwt_token(&token)
    {
        Ok(c) => c,
        Err(_) => {
            return ApiResponse::error_typed("invalid_token", "Access token is invalid");
        }
    };

    // Get user info using UserManager
    let user_manager = state.auth_framework.user_manager();
    let user_info = match user_manager.get_user_info(&claims.sub).await {
        Ok(info) => info,
        Err(e) => {
            tracing::error!("Failed to get user info: {:?}", e);
            return ApiResponse::error_typed("server_error", "Failed to retrieve user information");
        }
    };

    // Extract user data from info
    let username = user_info.username.clone();
    let email = user_info.email.clone();

    // Build UserInfo response with available data
    let userinfo = UserInfoResponse {
        sub: claims.sub.clone(),
        name: Some(username.clone()),
        given_name: None,  // TODO: Parse from full name if available
        family_name: None, // TODO: Parse from full name if available
        email,
        email_verified: Some(true), // TODO: Get from user profile
        picture: None,              // TODO: Get from user profile
        phone_number: None,         // TODO: Get from user profile
        phone_number_verified: None,
        updated_at: Some(chrono::Utc::now().timestamp()),
    };

    tracing::info!("UserInfo requested for user: {}", claims.sub);
    ApiResponse::success(userinfo)
}
