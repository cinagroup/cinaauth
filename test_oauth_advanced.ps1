# OAuth Advanced Endpoints Manual Test Script
# Tests Token Introspection (RFC 7662) and PAR (RFC 9126)

$ErrorActionPreference = 'Continue'
$baseUrl = 'http://127.0.0.1:8088'

Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host 'OAuth 2.0 Advanced Endpoints Test' -ForegroundColor Cyan
Write-Host '=====================================' -ForegroundColor Cyan

# Function to print test header
function Test-Header {
    param($title)
    Write-Host "`n----- $title -----" -ForegroundColor Yellow
}

# Function to print response
function Print-Response {
    param($response, $body)
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor $(if ($response.StatusCode -lt 400) { 'Green' } else { 'Red' })
    if ($body) {
        Write-Host 'Response Body:' -ForegroundColor Gray
        $body | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    }
}

# Wait for server to be ready
Write-Host "`nWaiting for server to start..." -ForegroundColor Gray
Start-Sleep -Seconds 2

# Test server is running
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host '✅ Server is running!' -ForegroundColor Green
}
catch {
    Write-Host '❌ Server is not responding. Please start with: cargo run --example debug_server' -ForegroundColor Red
    exit 1
}

# ==============================================================================
# Step 1: Create a test user and get a valid JWT token
# ==============================================================================
Test-Header 'Step 1: Register Test User & Login'

# Register user
$registerBody = @{
    username = 'testuser_oauth'
    password = 'SecurePass123!'
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/users/register" `
        -Method POST `
        -ContentType 'application/json' `
        -Body $registerBody `
        -ErrorAction Stop
    
    Write-Host '✅ User registered successfully' -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host '⚠️  User already exists (continuing...)' -ForegroundColor Yellow
    }
    else {
        Write-Host "❌ Registration failed: $_" -ForegroundColor Red
    }
}

# Login to get token
$loginBody = @{
    username = 'testuser_oauth'
    password = 'SecurePass123!'
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/auth/login" `
        -Method POST `
        -ContentType 'application/json' `
        -Body $loginBody `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $accessToken = $loginData.access_token
    
    Write-Host '✅ Login successful!' -ForegroundColor Green
    Write-Host "Access Token (first 50 chars): $($accessToken.Substring(0, [Math]::Min(50, $accessToken.Length)))..." -ForegroundColor Gray
}
catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    exit 1
}

# ==============================================================================
# Step 2: Test Token Introspection Endpoint
# ==============================================================================
Test-Header 'Step 2: Token Introspection Tests'

# Test 2.1: Valid token with Basic Auth
Write-Host "`n📌 Test 2.1: Introspect valid token (Basic Auth)" -ForegroundColor Cyan

$clientId = 'test_client'
$clientSecret = 'test_secret'
$basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${clientId}:${clientSecret}"))

$introspectBody = "token=$accessToken&token_type_hint=access_token"

try {
    $introspectResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/oauth/introspect" `
        -Method POST `
        -Headers @{
        'Authorization' = "Basic $basicAuth"
        'Content-Type'  = 'application/x-www-form-urlencoded'
    } `
        -Body $introspectBody `
        -ErrorAction Stop
    
    $introspectData = $introspectResponse.Content | ConvertFrom-Json
    Print-Response $introspectResponse $introspectData
    
    if ($introspectData.active -eq $true) {
        Write-Host '✅ Token is active!' -ForegroundColor Green
    }
    else {
        Write-Host '⚠️  Token is inactive (this might be expected if validation failed)' -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Introspection failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2.2: Invalid token
Write-Host "`n📌 Test 2.2: Introspect invalid token" -ForegroundColor Cyan

$invalidToken = 'invalid.jwt.token.here'
$introspectInvalidBody = "token=$invalidToken&token_type_hint=access_token"

try {
    $introspectInvalidResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/oauth/introspect" `
        -Method POST `
        -Headers @{
        'Authorization' = "Basic $basicAuth"
        'Content-Type'  = 'application/x-www-form-urlencoded'
    } `
        -Body $introspectInvalidBody `
        -ErrorAction Stop
    
    $introspectInvalidData = $introspectInvalidResponse.Content | ConvertFrom-Json
    Print-Response $introspectInvalidResponse $introspectInvalidData
    
    if ($introspectInvalidData.active -eq $false) {
        Write-Host '✅ Correctly returned inactive for invalid token!' -ForegroundColor Green
    }
}
catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}

# Test 2.3: Missing authentication
Write-Host "`n📌 Test 2.3: Introspect without authentication" -ForegroundColor Cyan

try {
    $introspectNoAuthResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/oauth/introspect" `
        -Method POST `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body $introspectBody `
        -ErrorAction Stop
    
    Write-Host '⚠️  Request succeeded without auth (should have failed!)' -ForegroundColor Yellow
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host '✅ Correctly rejected request without authentication (401 Unauthorized)' -ForegroundColor Green
    }
    else {
        Write-Host "❌ Unexpected error: $_" -ForegroundColor Red
    }
}

# ==============================================================================
# Step 3: Test Pushed Authorization Request (PAR) Endpoint
# ==============================================================================
Test-Header 'Step 3: Pushed Authorization Request (PAR) Tests'

# Test 3.1: Valid PAR request
Write-Host "`n📌 Test 3.1: Valid PAR request" -ForegroundColor Cyan

$parBody = @(
    'response_type=code',
    'client_id=test_client_123',
    'redirect_uri=https://app.example.com/callback',
    'scope=openid profile email',
    'state=xyz123',
    'nonce=abc456',
    'code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    'code_challenge_method=S256'
) -join '&'

try {
    $parResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/oauth/par" `
        -Method POST `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body $parBody `
        -ErrorAction Stop
    
    $parData = $parResponse.Content | ConvertFrom-Json
    Print-Response $parResponse $parData
    
    if ($parData.request_uri -and $parData.expires_in) {
        Write-Host '✅ PAR request successful!' -ForegroundColor Green
        Write-Host "   Request URI: $($parData.request_uri)" -ForegroundColor Gray
        Write-Host "   Expires in: $($parData.expires_in) seconds" -ForegroundColor Gray
        
        # Save for later use
        $requestUri = $parData.request_uri
    }
}
catch {
    Write-Host "❌ PAR request failed: $_" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3.2: PAR request with missing client_id
Write-Host "`n📌 Test 3.2: PAR request with missing client_id" -ForegroundColor Cyan

$parInvalidBody = 'response_type=code&redirect_uri=https://app.example.com/callback'

try {
    $parInvalidResponse = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/oauth/par" `
        -Method POST `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body $parInvalidBody `
        -ErrorAction Stop
    
    Write-Host '⚠️  Request succeeded despite missing client_id (should have failed!)' -ForegroundColor Yellow
}
catch {
    if ($_.Exception.Response.StatusCode -eq 422 -or $_.Exception.Response.StatusCode -eq 400) {
        Write-Host '✅ Correctly rejected request with missing client_id (422/400)' -ForegroundColor Green
    }
    else {
        Write-Host "❌ Unexpected error: $_" -ForegroundColor Red
    }
}

# Test 3.3: Multiple PAR requests get unique URIs
Write-Host "`n📌 Test 3.3: Multiple PAR requests get unique URIs" -ForegroundColor Cyan

$parBody2 = 'response_type=code&client_id=test_client_456&redirect_uri=https://another.example.com/callback&scope=read&state=state2'

try {
    $parResponse2 = Invoke-WebRequest `
        -Uri "$baseUrl/api/v1/oauth/par" `
        -Method POST `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body $parBody2 `
        -ErrorAction Stop
    
    $parData2 = $parResponse2.Content | ConvertFrom-Json
    
    if ($requestUri -and $parData2.request_uri -and $requestUri -ne $parData2.request_uri) {
        Write-Host '✅ Each PAR request gets a unique request_uri!' -ForegroundColor Green
        Write-Host "   First URI:  $requestUri" -ForegroundColor Gray
        Write-Host "   Second URI: $($parData2.request_uri)" -ForegroundColor Gray
    }
    else {
        Write-Host '⚠️  URIs are identical (should be unique!)' -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Second PAR request failed: $_" -ForegroundColor Red
}

# ==============================================================================
# Summary
# ==============================================================================
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host 'Test Suite Complete!' -ForegroundColor Cyan
Write-Host '=====================================' -ForegroundColor Cyan
Write-Host "`n✅ All manual tests executed" -ForegroundColor Green
Write-Host '📊 Check the output above for detailed results' -ForegroundColor Gray
Write-Host "`nPress Ctrl+C in the server terminal to stop the debug server.`n" -ForegroundColor Yellow
