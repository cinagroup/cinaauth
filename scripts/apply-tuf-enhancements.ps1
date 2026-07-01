#!/usr/bin/env pwsh
# Apply targeted TUF-Laptop enhancements without breaking compatibility

Write-Host '=== Applying Targeted TUF-Laptop Enhancements ===' -ForegroundColor Cyan

# Create backup first
$backupName = "backup-before-enhancements-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "Creating backup: $backupName" -ForegroundColor Yellow
Copy-Item 'src' $backupName -Recurse -Force

# Enhancement 1: Apply enhanced password validation to auth.rs
Write-Host "`n1. Applying enhanced password validation to auth.rs" -ForegroundColor Green

# Find the change_password function and add enhanced validation
$authContent = Get-Content 'src\api\auth.rs' -Raw

# Look for where password validation should be added
if ($authContent -match '// TODO: Add password validation') {
    Write-Host '   Adding enhanced password validation logic...' -ForegroundColor Yellow
    
    # The enhanced validation code from TUF-Laptop
    $enhancedValidation = @'
    // Enhanced password validation with security requirements
    let security_config = &state.cinaauth.config().security;
    
    if let Err(e) = crate::utils::validation::validate_password_enhanced(
        &req.password,
        security_config.min_password_length,
        security_config.require_uppercase,
        security_config.require_lowercase,
        security_config.require_digit,
        security_config.require_special,
    ) {
        return ApiResponse::validation_error_typed(&format!("Invalid password: {}", e));
    }
'@
    
    # Replace the TODO comment with actual validation
    $updatedAuth = $authContent -replace '    // TODO: Add password validation', $enhancedValidation
    $updatedAuth | Out-File 'src\api\auth.rs' -Encoding UTF8 -NoNewline
    Write-Host '   ✓ Enhanced password validation added' -ForegroundColor Green
}
else {
    Write-Host '   Password validation TODO not found - may already be implemented' -ForegroundColor Yellow
}

# Enhancement 2: Enable OAuth advanced features in server.rs
Write-Host "`n2. Enabling OAuth advanced features in server.rs" -ForegroundColor Green

$serverContent = Get-Content 'src\api\server.rs' -Raw

# Add oauth_advanced to imports if not present
if ($serverContent -notmatch 'oauth_advanced') {
    Write-Host '   Adding oauth_advanced import...' -ForegroundColor Yellow
    $updatedServer = $serverContent -replace 'use crate::api::\{ApiState, admin, auth, health, mfa, middleware, oauth, users\};', 'use crate::api::{ApiState, admin, auth, health, mfa, middleware, oauth, oauth_advanced, users};'
    
    # Enable the introspect endpoint
    $updatedServer = $updatedServer -replace "// \.route\(`"/api/v1/oauth/introspect`", post\(oauth_advanced::introspect_token\)\)", ".route(`"/api/v1/oauth/introspect`", post(oauth_advanced::introspect_token))"
    
    $updatedServer | Out-File 'src\api\server.rs' -Encoding UTF8 -NoNewline
    Write-Host '   ✓ OAuth advanced features enabled' -ForegroundColor Green
}
else {
    Write-Host '   OAuth advanced features already enabled' -ForegroundColor Yellow
}

# Enhancement 3: Add dead_code allow to SAML if needed
Write-Host "`n3. Checking SAML module improvements" -ForegroundColor Green

if (Test-Path 'src\methods\saml\mod.rs') {
    $samlContent = Get-Content 'src\methods\saml\mod.rs' -Raw
    
    if ($samlContent -notmatch '#\[allow\(dead_code\)\]' -and $samlContent -match 'struct SamlResponse') {
        Write-Host '   Adding dead_code allowance for SamlResponse...' -ForegroundColor Yellow
        $updatedSaml = $samlContent -replace 'struct SamlResponse \{', "#[allow(dead_code)]`nstruct SamlResponse {"
        $updatedSaml | Out-File 'src\methods\saml\mod.rs' -Encoding UTF8 -NoNewline
        Write-Host '   ✓ SAML improvements added' -ForegroundColor Green
    }
    else {
        Write-Host '   SAML module already optimized' -ForegroundColor Yellow
    }
}
else {
    Write-Host '   SAML module not found - skipping' -ForegroundColor Yellow
}

# Test the build
Write-Host "`n=== Testing Build After Enhancements ===" -ForegroundColor Cyan
$buildResult = & cargo build --lib 2>&1
$buildExitCode = $LASTEXITCODE

if ($buildExitCode -eq 0) {
    Write-Host '✓ Build successful! All enhancements applied cleanly.' -ForegroundColor Green
    Write-Host "Backup saved as: $backupName" -ForegroundColor Green
    
    # Clean up TUF-Laptop files now that enhancements are applied
    Write-Host "`nCleaning up TUF-Laptop files..." -ForegroundColor Yellow
    $tufFiles = Get-ChildItem -Recurse -Filter '*TUF-Laptop*'
    foreach ($file in $tufFiles) {
        Write-Host "  Removing: $($file.FullName)" -ForegroundColor Gray
        Remove-Item $file.FullName -Force
    }
    Write-Host '✓ TUF-Laptop files cleaned up' -ForegroundColor Green
    
}
else {
    Write-Host '✗ Build failed! Rolling back...' -ForegroundColor Red
    Write-Host 'Build output:' -ForegroundColor Red
    $buildResult | Out-String | Write-Host -ForegroundColor Red
    
    # Rollback
    Remove-Item 'src' -Recurse -Force
    Move-Item $backupName 'src'
    Write-Host '✓ Rolled back to working state' -ForegroundColor Yellow
}

Write-Host "`n=== Enhancement Application Complete ===" -ForegroundColor Cyan