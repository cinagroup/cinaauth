# WebAuthn and SAML Implementation Guide

## Overview

AuthFramework now includes comprehensive WebAuthn (passwordless authentication) and SAML 2.0 (Security Assertion Markup Language) implementations, providing enterprise-grade authentication and single sign-on capabilities.

## WebAuthn Implementation

### What is WebAuthn?

WebAuthn (Web Authentication API) is a W3C standard for passwordless authentication using public key cryptography. It enables:

- **Passwordless Login**: Users authenticate with biometrics, security keys, or platform authenticators
- **Phishing Resistant**: Based on public key cryptography with origin binding
- **Multi-Factor Authentication**: Can be used as a second factor or standalone authentication
- **Cross-Platform**: Works with FIDO2 security keys, Windows Hello, Touch ID, Face ID, etc.

### WebAuthn Endpoints

#### 1. Registration Flow

**Initialize Registration**

```http
POST /api/v1/webauthn/register/init
Content-Type: application/json
Authorization: Bearer {token}

{
  "username": "user@example.com",
  "display_name": "John Doe"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "challenge": "base64-encoded-challenge",
    "rp": {
      "name": "AuthFramework",
      "id": "example.com"
    },
    "user": {
      "id": "user-id-base64",
      "name": "user@example.com",
      "displayName": "John Doe"
    },
    "pubKeyCredParams": [
      {"type": "public-key", "alg": -7},
      {"type": "public-key", "alg": -257}
    ],
    "authenticatorSelection": {
      "authenticatorAttachment": "cross-platform",
      "requireResidentKey": false,
      "userVerification": "preferred"
    },
    "timeout": 60000,
    "attestation": "none"
  }
}
```

**Complete Registration**

```http
POST /api/v1/webauthn/register/complete
Content-Type: application/json
Authorization: Bearer {token}

{
  "username": "user@example.com",
  "credential": {
    "id": "credential-id-base64",
    "rawId": "credential-raw-id-base64",
    "response": {
      "clientDataJSON": "base64-encoded-client-data",
      "attestationObject": "base64-encoded-attestation"
    },
    "type": "public-key"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "credential_id": "credential-id",
    "message": "WebAuthn credential registered successfully"
  }
}
```

#### 2. Authentication Flow

**Initialize Authentication**

```http
POST /api/v1/webauthn/authenticate/init
Content-Type: application/json

{
  "username": "user@example.com"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "challenge": "base64-encoded-challenge",
    "rpId": "example.com",
    "allowCredentials": [
      {
        "type": "public-key",
        "id": "credential-id-base64",
        "transports": ["usb", "nfc", "ble"]
      }
    ],
    "timeout": 60000,
    "userVerification": "preferred"
  }
}
```

**Complete Authentication**

```http
POST /api/v1/webauthn/authenticate/complete
Content-Type: application/json

{
  "username": "user@example.com",
  "credential": {
    "id": "credential-id-base64",
    "rawId": "credential-raw-id-base64",
    "response": {
      "clientDataJSON": "base64-encoded-client-data",
      "authenticatorData": "base64-encoded-auth-data",
      "signature": "base64-encoded-signature",
      "userHandle": "base64-encoded-user-handle"
    },
    "type": "public-key"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

#### 3. Credential Management

**List Credentials**

```http
GET /api/v1/webauthn/credentials/{username}
Authorization: Bearer {token}
```

Response:

```json
{
  "success": true,
  "data": {
    "credentials": [
      {
        "credential_id": "cred-id-1",
        "name": "YubiKey 5",
        "created_at": "2025-10-05T10:00:00Z",
        "last_used": "2025-10-05T15:30:00Z"
      },
      {
        "credential_id": "cred-id-2",
        "name": "Touch ID",
        "created_at": "2025-10-01T08:00:00Z",
        "last_used": "2025-10-05T09:00:00Z"
      }
    ]
  }
}
```

**Delete Credential**

```http
DELETE /api/v1/webauthn/credentials/{username}/{credential_id}
Authorization: Bearer {token}
```

### WebAuthn Client Example

```javascript
// Initialize registration
async function registerWebAuthn(username, displayName) {
  // 1. Get challenge from server
  const initResponse = await fetch('/api/v1/webauthn/register/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ username, display_name: displayName })
  });
  
  const options = await initResponse.json();
  
  // 2. Create credential using WebAuthn API
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options.data,
      challenge: base64ToArrayBuffer(options.data.challenge),
      user: {
        ...options.data.user,
        id: base64ToArrayBuffer(options.data.user.id)
      }
    }
  });
  
  // 3. Send credential to server
  const completeResponse = await fetch('/api/v1/webauthn/register/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      username,
      credential: credentialToJSON(credential)
    })
  });
  
  return completeResponse.json();
}

// Authenticate with WebAuthn
async function authenticateWebAuthn(username) {
  // 1. Get challenge from server
  const initResponse = await fetch('/api/v1/webauthn/authenticate/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  
  const options = await initResponse.json();
  
  // 2. Get assertion using WebAuthn API
  const credential = await navigator.credentials.get({
    publicKey: {
      ...options.data,
      challenge: base64ToArrayBuffer(options.data.challenge),
      allowCredentials: options.data.allowCredentials.map(cred => ({
        ...cred,
        id: base64ToArrayBuffer(cred.id)
      }))
    }
  });
  
  // 3. Send assertion to server
  const completeResponse = await fetch('/api/v1/webauthn/authenticate/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      credential: credentialToJSON(credential)
    })
  });
  
  return completeResponse.json();
}

// Helper functions
function base64ToArrayBuffer(base64) {
  const binary = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function credentialToJSON(credential) {
  return {
    id: credential.id,
    rawId: arrayBufferToBase64(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64(credential.response.clientDataJSON),
      attestationObject: credential.response.attestationObject 
        ? arrayBufferToBase64(credential.response.attestationObject)
        : undefined,
      authenticatorData: credential.response.authenticatorData
        ? arrayBufferToBase64(credential.response.authenticatorData)
        : undefined,
      signature: credential.response.signature
        ? arrayBufferToBase64(credential.response.signature)
        : undefined
    },
    type: credential.type
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

---

## SAML 2.0 Implementation

### What is SAML?

SAML (Security Assertion Markup Language) is an XML-based standard for exchanging authentication and authorization data between identity providers (IdP) and service providers (SP). It enables:

- **Single Sign-On (SSO)**: Users authenticate once and access multiple applications
- **Identity Federation**: Organizations can use external identity providers
- **Enterprise Integration**: Standard protocol used by major enterprise identity systems
- **Centralized Authentication**: IT departments maintain control over authentication

### SAML Endpoints

#### 1. Service Provider Endpoints

**Get SAML Metadata**

```http
GET /api/v1/saml/metadata
```

Response (XML):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor entityID="https://your-app.com/saml" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>MIICertificateData...</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <SingleLogoutService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
                        Location="https://your-app.com/api/v1/saml/slo/response"/>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                             Location="https://your-app.com/api/v1/saml/acs"
                             index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>
```

**Initiate SSO**

```http
POST /api/v1/saml/sso/init
Content-Type: application/json

{
  "idp_entity_id": "https://idp.example.com/saml",
  "relay_state": "optional-state-data"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "redirect_url": "https://idp.example.com/saml/sso?SAMLRequest=...",
    "request_id": "req-id-123"
  }
}
```

**Assertion Consumer Service (ACS)**

```http
POST /api/v1/saml/acs
Content-Type: application/x-www-form-urlencoded

SAMLResponse=base64-encoded-saml-response&RelayState=optional-state
```

Response:

```json
{
  "success": true,
  "data": {
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user_info": {
      "username": "user@example.com",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### 2. Single Logout (SLO)

**Initiate Logout**

```http
POST /api/v1/saml/slo/init
Content-Type: application/json
Authorization: Bearer {token}

{
  "idp_entity_id": "https://idp.example.com/saml"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "redirect_url": "https://idp.example.com/saml/slo?SAMLRequest=...",
    "request_id": "logout-req-123"
  }
}
```

**Handle SLO Response**

```http
GET /api/v1/saml/slo/response?SAMLResponse=...&RelayState=...
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Successfully logged out from all services"
  }
}
```

#### 3. Identity Provider Endpoints

**Create SAML Assertion (IdP functionality)**

```http
POST /api/v1/saml/assertion/create
Content-Type: application/json
Authorization: Bearer {admin-token}

{
  "username": "user@example.com",
  "sp_entity_id": "https://sp.example.com/saml",
  "acs_url": "https://sp.example.com/api/v1/saml/acs",
  "attributes": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["user", "developer"]
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "saml_response": "base64-encoded-saml-response",
    "assertion_id": "assertion-123",
    "expires_at": "2025-10-05T16:00:00Z"
  }
}
```

**List Configured Identity Providers**

```http
GET /api/v1/saml/idps
Authorization: Bearer {token}
```

Response:

```json
{
  "success": true,
  "data": {
    "idps": [
      {
        "entity_id": "https://idp1.example.com/saml",
        "name": "Corporate IdP",
        "sso_url": "https://idp1.example.com/saml/sso",
        "slo_url": "https://idp1.example.com/saml/slo",
        "enabled": true
      },
      {
        "entity_id": "https://idp2.example.com/saml",
        "name": "Partner IdP",
        "sso_url": "https://idp2.example.com/saml/sso",
        "enabled": false
      }
    ]
  }
}
```

### SAML Integration Example

#### Service Provider (Your Application)

```javascript
// Initiate SAML SSO
async function initiateSSO(idpEntityId) {
  const response = await fetch('/api/v1/saml/sso/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idp_entity_id: idpEntityId,
      relay_state: window.location.pathname // Return user to current page
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect user to IdP for authentication
    window.location.href = data.data.redirect_url;
  }
}

// Handle SAML response (in your ACS endpoint handler)
async function handleSAMLResponse(samlResponse, relayState) {
  const response = await fetch('/api/v1/saml/acs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      SAMLResponse: samlResponse,
      RelayState: relayState || ''
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store tokens
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
    
    // Redirect to original location or home
    window.location.href = relayState || '/dashboard';
  }
}

// Initiate logout
async function initiateLogout(idpEntityId, accessToken) {
  const response = await fetch('/api/v1/saml/slo/init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({ idp_entity_id: idpEntityId })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Clear local tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Redirect to IdP for logout
    window.location.href = data.data.redirect_url;
  }
}
```

#### Identity Provider Configuration

To configure an external IdP (like Okta, Azure AD, Auth0):

1. **Get your SP metadata**: `GET /api/v1/saml/metadata`
2. **Configure IdP with your metadata**:
   - Entity ID: Your application's SAML entity ID
   - ACS URL: `https://your-app.com/api/v1/saml/acs`
   - SLO URL: `https://your-app.com/api/v1/saml/slo/response`
3. **Configure IdP in AuthFramework** (via config or admin API)
4. **Map SAML attributes** to user fields

---

## Security Considerations

### WebAuthn Security

1. **Challenge Validation**: Challenges are cryptographically random and expire after 60 seconds
2. **Origin Binding**: Credentials are bound to your domain and cannot be used on phishing sites
3. **Attestation**: Optional attestation verification for security key validation
4. **Counter Verification**: Clone detection through signature counters
5. **User Verification**: Biometric or PIN verification on the authenticator

### SAML Security

1. **XML Signature Verification**: All SAML responses are cryptographically verified
2. **Assertion Encryption**: Sensitive assertions can be encrypted
3. **Replay Protection**: Assertion IDs are tracked to prevent replay attacks
4. **Time Validation**: Assertions have NotBefore and NotOnOrAfter timestamps
5. **Audience Restriction**: Assertions are bound to specific service providers

### Best Practices

1. **Use HTTPS**: All WebAuthn and SAML endpoints require HTTPS in production
2. **Store Challenges Securely**: Server-side challenge storage with expiration
3. **Validate All Inputs**: Strict validation of all SAML XML and WebAuthn JSON
4. **Audit Logging**: Log all authentication attempts and failures
5. **Rate Limiting**: Protect against brute force attacks
6. **Certificate Management**: Regular rotation of SAML signing certificates

---

## Configuration

### WebAuthn Configuration

```rust
// In your AuthFramework configuration
let config = AuthFrameworkConfig {
    // ... other config
    webauthn: WebAuthnConfig {
        rp_name: "AuthFramework".to_string(),
        rp_id: "example.com".to_string(),
        rp_origin: "https://example.com".to_string(),
        timeout_ms: 60000,
        attestation: AttestationConveyancePreference::None,
        user_verification: UserVerificationRequirement::Preferred,
    },
};
```

### SAML Configuration

```rust
// In your AuthFramework configuration
let config = AuthFrameworkConfig {
    // ... other config
    saml: SamlConfig {
        entity_id: "https://your-app.com/saml".to_string(),
        acs_url: "https://your-app.com/api/v1/saml/acs".to_string(),
        slo_url: "https://your-app.com/api/v1/saml/slo/response".to_string(),
        signing_cert_path: "/path/to/signing-cert.pem".to_string(),
        signing_key_path: "/path/to/signing-key.pem".to_string(),
        identity_providers: vec![
            IdPConfig {
                entity_id: "https://idp.example.com/saml".to_string(),
                sso_url: "https://idp.example.com/saml/sso".to_string(),
                slo_url: Some("https://idp.example.com/saml/slo".to_string()),
                cert_path: "/path/to/idp-cert.pem".to_string(),
            }
        ],
    },
};
```

---

## Testing

### WebAuthn Testing

Use virtual authenticators in Chrome DevTools or Firefox:

```javascript
// Chrome DevTools > Settings > Devices > Add Virtual Authenticator
// Or programmatically:
await navigator.credentials.create({
  publicKey: {
    // ... WebAuthn options
  }
});
```

### SAML Testing

Use SAML testing tools:

- **SAMLtest.id**: Free SAML IdP for testing
- **SAML Tracer**: Browser extension for debugging SAML flows
- **Okta Developer**: Free developer account with SAML support

---

## Troubleshooting

### WebAuthn Issues

**"NotAllowedError"**

- Check HTTPS is enabled
- Verify rpId matches your domain
- Ensure user gesture triggered the operation

**"InvalidStateError"**

- Credential already exists
- Check excludeCredentials list

### SAML Issues

**"Invalid Signature"**

- Verify certificate paths are correct
- Check certificate hasn't expired
- Ensure clock synchronization between servers

**"Assertion Expired"**

- Check NotBefore/NotOnOrAfter timestamps
- Verify clock synchronization
- Adjust assertion validity period

---

## Status

✅ **COMPLETE** - Comprehensive WebAuthn and SAML 2.0 implementations are now functional with:

- Full WebAuthn registration and authentication flows
- SAML 2.0 SP and IdP functionality
- Single Sign-On (SSO) and Single Logout (SLO)
- Credential management and IdP configuration
- Security best practices and validation
- Complete API endpoints and examples
