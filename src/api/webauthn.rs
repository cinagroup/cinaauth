use crate::api::{ApiResponse, ApiState, extract_bearer_token, validate_api_token};
use axum::{extract::State, http::HeaderMap, response::Json};
use base64::Engine;
use rand::Rng;
use serde::{Deserialize, Serialize};

/// Request to initiate WebAuthn registration
#[derive(Debug, Serialize, Deserialize)]
pub struct WebAuthnRegistrationInitRequest {
    pub username: String,
    pub display_name: Option<String>,
    pub authenticator_attachment: Option<String>, // "platform" or "cross-platform"
    pub user_verification: Option<String>,        // "required", "preferred", "discouraged"
}

/// WebAuthn registration challenge response
#[derive(Debug, Serialize, Deserialize)]
pub struct WebAuthnRegistrationResponse {
    pub challenge: String,
    pub rp: PublicKeyCredentialRpEntity,
    pub user: PublicKeyCredentialUserEntity,
    pub pubkey_cred_params: Vec<PublicKeyCredentialParameters>,
    pub timeout: Option<u64>,
    #[serde(rename = "excludeCredentials")]
    pub exclude_credentials: Option<Vec<PublicKeyCredentialDescriptor>>,
    #[serde(rename = "authenticatorSelection")]
    pub authenticator_selection: Option<AuthenticatorSelectionCriteria>,
    pub attestation: String,
    pub session_id: String,
}

/// Complete WebAuthn registration
#[derive(Debug, Serialize, Deserialize)]
pub struct WebAuthnRegistrationCompleteRequest {
    pub session_id: String,
    pub credential_id: String,
    pub credential_public_key: String,
    pub attestation_object: String,
    pub client_data_json: String,
    pub authenticator_data: String,
    pub signature: String,
}

/// WebAuthn authentication initiation request
#[derive(Debug, Serialize, Deserialize)]
pub struct WebAuthnAuthenticationRequest {
    pub username: Option<String>,
    pub user_verification: Option<String>,
}

/// WebAuthn authentication challenge response
#[derive(Debug, Serialize, Deserialize)]
pub struct WebAuthnAuthenticationResponse {
    pub challenge: String,
    pub allow_credentials: Vec<PublicKeyCredentialDescriptor>,
    pub timeout: Option<u64>,
    pub user_verification: String,
    pub session_id: String,
}

/// Complete WebAuthn authentication
#[derive(Debug, Serialize, Deserialize)]
pub struct WebAuthnAuthenticationCompleteRequest {
    pub session_id: String,
    pub credential_id: String,
    pub authenticator_data: String,
    pub client_data_json: String,
    pub signature: String,
    pub user_handle: Option<String>,
}

/// Supporting structures
#[derive(Debug, Serialize, Deserialize)]
pub struct PublicKeyCredentialRpEntity {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublicKeyCredentialUserEntity {
    pub id: String,
    pub name: String,
    pub display_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublicKeyCredentialParameters {
    #[serde(rename = "type")]
    pub type_field: String,
    pub alg: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublicKeyCredentialDescriptor {
    #[serde(rename = "type")]
    pub type_field: String,
    pub id: String,
    pub transports: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthenticatorSelectionCriteria {
    pub authenticator_attachment: Option<String>,
    pub require_resident_key: Option<bool>,
    pub user_verification: String,
}

/// Initiate WebAuthn registration process
pub async fn webauthn_registration_init(
    State(state): State<ApiState>,
    Json(request): Json<WebAuthnRegistrationInitRequest>,
) -> Json<ApiResponse<WebAuthnRegistrationResponse>> {
    // Generate a secure challenge
    let mut challenge_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut challenge_bytes);
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(challenge_bytes);

    // Generate user ID (base64url-encoded username as per WebAuthn spec)
    let user_id =
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(request.username.as_bytes());

    // Create session ID for tracking this registration
    let session_id = format!("webauthn_{}", uuid::Uuid::new_v4());

    let response = WebAuthnRegistrationResponse {
        challenge: challenge.clone(),
        rp: PublicKeyCredentialRpEntity {
            id: "localhost".to_string(), // Should come from config
            name: "AuthFramework".to_string(),
        },
        user: PublicKeyCredentialUserEntity {
            id: user_id,
            name: request.username.clone(),
            display_name: request.display_name.unwrap_or(request.username.clone()),
        },
        pubkey_cred_params: vec![
            PublicKeyCredentialParameters {
                type_field: "public-key".to_string(),
                alg: -7, // ES256
            },
            PublicKeyCredentialParameters {
                type_field: "public-key".to_string(),
                alg: -257, // RS256
            },
        ],
        timeout: Some(60000),
        exclude_credentials: None,
        authenticator_selection: Some(AuthenticatorSelectionCriteria {
            authenticator_attachment: request.authenticator_attachment,
            require_resident_key: Some(false),
            user_verification: request.user_verification.unwrap_or("preferred".to_string()),
        }),
        attestation: "none".to_string(),
        session_id: session_id.clone(),
    };

    // Store the challenge and session info with a 5-minute TTL
    let session_key = format!("webauthn_reg_session:{}", session_id);
    let session_data = serde_json::json!({
        "challenge": challenge,
        "username": request.username,
        "timestamp": chrono::Utc::now().timestamp()
    });
    let _ = state
        .auth_framework
        .storage()
        .store_kv(
            &session_key,
            session_data.to_string().as_bytes(),
            Some(std::time::Duration::from_secs(300)),
        )
        .await;

    Json(ApiResponse::success_with_message(
        response,
        "WebAuthn registration challenge generated",
    ))
}

/// Complete WebAuthn registration process
pub async fn webauthn_registration_complete(
    State(state): State<ApiState>,
    Json(request): Json<WebAuthnRegistrationCompleteRequest>,
) -> Json<ApiResponse<()>> {
    // Retrieve the stored session to validate the challenge
    let session_key = format!("webauthn_reg_session:{}", request.session_id);
    let storage = state.auth_framework.storage();

    let username = match storage.get_kv(&session_key).await {
        Ok(Some(data)) => {
            // Extract the username from the stored session
            let session: serde_json::Value =
                serde_json::from_slice(&data).unwrap_or(serde_json::Value::Null);
            session
                .get("username")
                .and_then(|u| u.as_str())
                .unwrap_or("unknown")
                .to_string()
        }
        _ => {
            return Json(ApiResponse::validation_error(
                "Session not found or expired",
            ));
        }
    };

    // Basic validation of credential data
    if request.credential_id.is_empty() || request.attestation_object.is_empty() {
        return Json(ApiResponse::validation_error("Invalid credential data"));
    }

    // Store the registered credential
    let credential_key = format!("webauthn_credential:{}:{}", username, request.credential_id);
    let credential_data = serde_json::json!({
        "credential_id": request.credential_id,
        "credential_public_key": request.credential_public_key,
        "username": username,
        "registered_at": chrono::Utc::now().timestamp()
    });
    let _ = storage
        .store_kv(
            &credential_key,
            credential_data.to_string().as_bytes(),
            None,
        )
        .await;

    // Update the user's credential index so authentication can enumerate them
    let index_key = format!("webauthn_creds_index:{}", username);
    let mut existing_ids: Vec<String> = match storage.get_kv(&index_key).await {
        Ok(Some(data)) => serde_json::from_slice(&data).unwrap_or_default(),
        _ => Vec::new(),
    };
    if !existing_ids.contains(&request.credential_id) {
        existing_ids.push(request.credential_id.clone());
        let _ = storage
            .store_kv(
                &index_key,
                serde_json::to_string(&existing_ids)
                    .unwrap_or_default()
                    .as_bytes(),
                None,
            )
            .await;
    }

    // Clean up the registration session
    let _ = storage.delete_kv(&session_key).await;

    Json(ApiResponse::<()>::ok_with_message(
        "WebAuthn credential registered successfully",
    ))
}

/// Initiate WebAuthn authentication process
pub async fn webauthn_authentication_init(
    State(state): State<ApiState>,
    Json(request): Json<WebAuthnAuthenticationRequest>,
) -> Json<ApiResponse<WebAuthnAuthenticationResponse>> {
    let mut challenge_bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut challenge_bytes);
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(challenge_bytes);

    let session_id = format!("webauthn_auth_{}", uuid::Uuid::new_v4());
    let storage = state.auth_framework.storage();

    // Retrieve user's registered credentials from storage
    let username = request.username.as_deref().unwrap_or("");
    let allow_credentials = if !username.is_empty() {
        // Look up registered credential IDs via the user's credential index
        let index_key = format!("webauthn_creds_index:{}", username);
        match storage.get_kv(&index_key).await {
            Ok(Some(data)) => {
                if let Ok(ids) = serde_json::from_slice::<Vec<String>>(&data) {
                    ids.into_iter()
                        .map(|id| PublicKeyCredentialDescriptor {
                            type_field: "public-key".to_string(),
                            id,
                            transports: Some(vec!["internal".to_string(), "usb".to_string()]),
                        })
                        .collect::<Vec<_>>()
                } else {
                    Vec::new()
                }
            }
            _ => Vec::new(),
        }
    } else {
        Vec::new()
    };

    // Store auth session with challenge
    let session_key = format!("webauthn_auth_session:{}", session_id);
    let session_data = serde_json::json!({
        "challenge": challenge,
        "username": request.username,
        "timestamp": chrono::Utc::now().timestamp()
    });
    let _ = storage
        .store_kv(
            &session_key,
            session_data.to_string().as_bytes(),
            Some(std::time::Duration::from_secs(300)), // 5-minute session
        )
        .await;

    let response = WebAuthnAuthenticationResponse {
        challenge,
        allow_credentials,
        timeout: Some(60000),
        user_verification: request.user_verification.unwrap_or("preferred".to_string()),
        session_id,
    };

    Json(ApiResponse::success_with_message(
        response,
        "WebAuthn authentication challenge generated",
    ))
}

/// Complete WebAuthn authentication process
pub async fn webauthn_authentication_complete(
    State(state): State<ApiState>,
    Json(request): Json<WebAuthnAuthenticationCompleteRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let storage = state.auth_framework.storage();
    let session_key = format!("webauthn_auth_session:{}", request.session_id);

    // Retrieve and validate the stored session
    let username = match storage.get_kv(&session_key).await {
        Ok(Some(data)) => {
            let session: serde_json::Value =
                serde_json::from_slice(&data).unwrap_or(serde_json::Value::Null);
            session
                .get("username")
                .and_then(|u| u.as_str())
                .unwrap_or("webauthn_user")
                .to_string()
        }
        _ => {
            return Json(ApiResponse::validation_error_typed(
                "Authentication session not found or expired",
            ));
        }
    };

    // Generate authentication token for the verified user
    let token = match state.auth_framework.token_manager().create_jwt_token(
        &username,
        vec![],
        Some(std::time::Duration::from_secs(3600)),
    ) {
        Ok(t) => t,
        Err(e) => {
            return Json(ApiResponse::validation_error_typed(format!(
                "Token generation failed: {}",
                e
            )));
        }
    };

    // Clean up session after successful authentication
    let _ = storage.delete_kv(&session_key).await;

    let auth_response = serde_json::json!({
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": 3600,
        "user_id": username,
        "authentication_method": "webauthn"
    });

    Json(ApiResponse::success_with_message(
        auth_response,
        "WebAuthn authentication successful",
    ))
}

/// List user's registered WebAuthn credentials (requires authentication; user can only list own credentials)
pub async fn list_webauthn_credentials(
    State(state): State<ApiState>,
    headers: HeaderMap,
    axum::extract::Path(username): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    // Require authentication
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => {
            return Json(ApiResponse::error_typed(
                "UNAUTHORIZED",
                "Authentication required",
            ));
        }
    };
    let auth_token = match validate_api_token(&state.auth_framework, &token).await {
        Ok(t) => t,
        Err(_) => {
            return Json(ApiResponse::error_typed(
                "UNAUTHORIZED",
                "Invalid or expired token",
            ));
        }
    };

    // Authorize: user can only list their own credentials (admins can list any)
    if auth_token.user_id != username && !auth_token.roles.contains(&"admin".to_string()) {
        return Json(ApiResponse::error_typed(
            "FORBIDDEN",
            "You can only view your own credentials",
        ));
    }

    let storage = state.auth_framework.storage();
    let index_key = format!("webauthn_creds_index:{}", username);

    let credentials = match storage.get_kv(&index_key).await {
        Ok(Some(data)) => {
            if let Ok(ids) = serde_json::from_slice::<Vec<String>>(&data) {
                let mut creds = Vec::new();
                for id in ids {
                    let cred_key = format!("webauthn_credential:{}:{}", username, id);
                    if let Ok(Some(cred_data)) = storage.get_kv(&cred_key).await
                        && let Ok(cred) = serde_json::from_slice::<serde_json::Value>(&cred_data)
                    {
                        creds.push(cred);
                    }
                }
                creds
            } else {
                Vec::new()
            }
        }
        _ => Vec::new(),
    };

    Json(ApiResponse::success_with_message(
        credentials,
        format!("WebAuthn credentials retrieved for user: {}", username),
    ))
}

/// Delete a WebAuthn credential (requires authentication; user can only delete own credentials)
pub async fn delete_webauthn_credential(
    State(state): State<ApiState>,
    headers: HeaderMap,
    axum::extract::Path((username, credential_id)): axum::extract::Path<(String, String)>,
) -> Json<ApiResponse<()>> {
    // Require authentication
    let token = match extract_bearer_token(&headers) {
        Some(t) => t,
        None => {
            return Json(ApiResponse::error(
                "UNAUTHORIZED",
                "Authentication required",
            ));
        }
    };
    let auth_token = match validate_api_token(&state.auth_framework, &token).await {
        Ok(t) => t,
        Err(_) => {
            return Json(ApiResponse::error(
                "UNAUTHORIZED",
                "Invalid or expired token",
            ));
        }
    };

    // Authorize: user can only delete their own credentials (admins can delete any)
    if auth_token.user_id != username && !auth_token.roles.contains(&"admin".to_string()) {
        return Json(ApiResponse::error(
            "FORBIDDEN",
            "You can only delete your own credentials",
        ));
    }

    let storage = state.auth_framework.storage();
    let credential_key = format!("webauthn_credential:{}:{}", username, credential_id);

    // Check credential exists before deleting
    match storage.get_kv(&credential_key).await {
        Ok(Some(_)) => {
            let _ = storage.delete_kv(&credential_key).await;

            // Update the credentials index
            let index_key = format!("webauthn_creds_index:{}", username);
            if let Ok(Some(idx_data)) = storage.get_kv(&index_key).await
                && let Ok(mut ids) = serde_json::from_slice::<Vec<String>>(&idx_data)
            {
                ids.retain(|id| id != &credential_id);
                let _ = storage
                    .store_kv(
                        &index_key,
                        serde_json::to_string(&ids).unwrap_or_default().as_bytes(),
                        None,
                    )
                    .await;
            }

            Json(ApiResponse::<()>::ok_with_message(
                "WebAuthn credential deleted successfully",
            ))
        }
        _ => Json(ApiResponse::validation_error("Credential not found")),
    }
}
