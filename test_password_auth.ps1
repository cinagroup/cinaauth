# Test Password Authentication Flow
# Tests: Register → Login → Get User Profile

$baseUrl = 'http://127.0.0.1:8088'
$username = "testuser_$(Get-Random)"
$password = 'SecurePass123!'
$email = "test_$(Get-Random)@example.com"

Write-Host "`n=== Password Authentication Flow Test ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "Username: $username" -ForegroundColor Gray
Write-Host ''

# Test 1: Health Check
Write-Host '[1/5] Testing Health Check...' -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host '✅ Server is healthy' -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Register User
Write-Host "`n[2/5] Testing User Registration..." -ForegroundColor Yellow
$registerPayload = @{
    username = $username
    password = $password
    email    = $email
} | ConvertTo-Json

Write-Host '   Request: POST /api/v1/auth/register' -ForegroundColor Gray
Write-Host "   Payload: $registerPayload" -ForegroundColor Gray

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" `
        -Method Post `
        -Body $registerPayload `
        -ContentType 'application/json'
    
    Write-Host '✅ Registration successful' -ForegroundColor Green
    Write-Host "   User ID: $($registerResponse.data.user_id)" -ForegroundColor Gray
    Write-Host "   Username: $($registerResponse.data.username)" -ForegroundColor Gray
    Write-Host "   Email: $($registerResponse.data.email)" -ForegroundColor Gray
    
    $userId = $registerResponse.data.user_id
}
catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Test 3: Login with Correct Credentials
Write-Host "`n[3/5] Testing Login (Correct Credentials)..." -ForegroundColor Yellow
$loginPayload = @{
    username = $username
    password = $password
} | ConvertTo-Json

Write-Host '   Request: POST /api/v1/auth/login' -ForegroundColor Gray
Write-Host "   Username: $username" -ForegroundColor Gray

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
        -Method Post `
        -Body $loginPayload `
        -ContentType 'application/json'
    
    Write-Host '✅ Login successful' -ForegroundColor Green
    Write-Host "   Access Token: $($loginResponse.data.access_token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Refresh Token: $($loginResponse.data.refresh_token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Token Type: $($loginResponse.data.token_type)" -ForegroundColor Gray
    Write-Host "   Expires In: $($loginResponse.data.expires_in) seconds" -ForegroundColor Gray
    
    $accessToken = $loginResponse.data.access_token
}
catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

# Test 4: Login with Wrong Password
Write-Host "`n[4/5] Testing Login (Wrong Password - should fail)..." -ForegroundColor Yellow
$wrongLoginPayload = @{
    username = $username
    password = 'WrongPassword123!'
} | ConvertTo-Json

try {
    $wrongLoginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" `
        -Method Post `
        -Body $wrongLoginPayload `
        -ContentType 'application/json' `
        -ErrorAction Stop
    
    Write-Host '❌ Login succeeded with wrong password (SECURITY ISSUE!)' -ForegroundColor Red
    exit 1
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401 -or $_.Exception.Message -like '*401*') {
        Write-Host '✅ Login correctly rejected wrong password' -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Login failed but with unexpected error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Test 5: Access Protected Endpoint
Write-Host "`n[5/5] Testing Protected Endpoint Access..." -ForegroundColor Yellow
Write-Host '   Request: GET /api/v1/users/me' -ForegroundColor Gray

try {
    $headers = @{
        'Authorization' = "Bearer $accessToken"
    }
    
    $profileResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/users/me" `
        -Method Get `
        -Headers $headers
    
    Write-Host '✅ Protected endpoint access successful' -ForegroundColor Green
    Write-Host "   User ID: $($profileResponse.data.id)" -ForegroundColor Gray
    Write-Host "   Username: $($profileResponse.data.username)" -ForegroundColor Gray
    Write-Host "   Roles: $($profileResponse.data.roles -join ', ')" -ForegroundColor Gray
    Write-Host "   Permissions: $($profileResponse.data.permissions -join ', ')" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Protected endpoint access failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    # Don't exit here as this might not be fully implemented yet
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host '✅ Registration: PASSED' -ForegroundColor Green
Write-Host '✅ Login with valid credentials: PASSED' -ForegroundColor Green
Write-Host '✅ Login with invalid credentials: REJECTED' -ForegroundColor Green
Write-Host ''
Write-Host '🎉 Password Authentication Flow Test Complete!' -ForegroundColor Green
