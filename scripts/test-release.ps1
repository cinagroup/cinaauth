# Release Testing Script for AuthFramework
# This script validates that the release automation will work correctly

param(
    [switch]$SkipBuild,
    [switch]$Verbose
)

Write-Host '🚀 AuthFramework Release Testing Script' -ForegroundColor Green
Write-Host '=======================================' -ForegroundColor Green

# Test 1: Validate Cargo.toml version and dependencies
Write-Host "`n📋 Test 1: Validating Cargo.toml..." -ForegroundColor Yellow
try {
    $cargoToml = Get-Content 'Cargo.toml' -Raw
    if ($cargoToml -match 'version\s*=\s*"([^"]+)"') {
        $version = $matches[1]
        Write-Host "✅ Current version: $version" -ForegroundColor Green
    }
    else {
        Write-Host '❌ Could not parse version from Cargo.toml' -ForegroundColor Red
        exit 1
    }
    
    # Check required features exist
    $requiredFeatures = @('admin-binary', 'api-server', 'postgres-storage')
    foreach ($feature in $requiredFeatures) {
        if ($cargoToml -match $feature) {
            Write-Host "✅ Feature '$feature' found" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Required feature '$feature' not found" -ForegroundColor Red
            exit 1
        }
    }
}
catch {
    Write-Host "❌ Error reading Cargo.toml: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Validate binary builds with correct features
if (-not $SkipBuild) {
    Write-Host "`n🔨 Test 2: Testing release build..." -ForegroundColor Yellow
    try {
        Write-Host 'Building with admin-binary,api-server,postgres-storage features...'
        $buildOutput = cargo build --release --features admin-binary, api-server, postgres-storage --bin auth-framework 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host '✅ Release build successful' -ForegroundColor Green
            
            # Check if binary exists
            $binaryPath = 'target\release\auth-framework.exe'
            if (Test-Path $binaryPath) {
                $binaryInfo = Get-Item $binaryPath
                Write-Host "✅ Binary created: $($binaryInfo.Length) bytes" -ForegroundColor Green
            }
            else {
                Write-Host '❌ Binary not found at expected location' -ForegroundColor Red
                exit 1
            }
        }
        else {
            Write-Host '❌ Build failed:' -ForegroundColor Red
            Write-Host $buildOutput -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "❌ Build error: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host '⏭️  Skipping build test (--SkipBuild specified)' -ForegroundColor Cyan
}

# Test 3: Validate GitHub Actions workflow
Write-Host "`n⚙️  Test 3: Validating GitHub Actions workflow..." -ForegroundColor Yellow
try {
    $workflowPath = '.github\workflows\release.yml'
    if (Test-Path $workflowPath) {
        $workflow = Get-Content $workflowPath -Raw
        
        # Check for correct features in workflow
        if ($workflow -match 'admin-binary,api-server,postgres-storage') {
            Write-Host '✅ Workflow uses correct feature flags' -ForegroundColor Green
        }
        else {
            Write-Host '❌ Workflow missing required feature flags' -ForegroundColor Red
            exit 1
        }
        
        # Check for cross-platform targets
        $expectedTargets = @(
            'x86_64-unknown-linux-gnu',
            'x86_64-unknown-linux-musl', 
            'aarch64-unknown-linux-gnu',
            'x86_64-apple-darwin',
            'aarch64-apple-darwin',
            'x86_64-pc-windows-msvc'
        )
        
        foreach ($target in $expectedTargets) {
            if ($workflow -match $target) {
                Write-Host "✅ Target '$target' configured" -ForegroundColor Green
            }
            else {
                Write-Host "❌ Target '$target' missing from workflow" -ForegroundColor Red
                exit 1
            }
        }
    }
    else {
        Write-Host '❌ Release workflow not found' -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error validating workflow: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Validate Docker configuration
Write-Host "`n🐳 Test 4: Validating Docker configuration..." -ForegroundColor Yellow
try {
    $dockerfilePath = 'docker\Dockerfile'
    if (Test-Path $dockerfilePath) {
        $dockerfile = Get-Content $dockerfilePath -Raw
        
        if ($dockerfile -match 'FEATURES=admin-binary,api-server,postgres-storage') {
            Write-Host '✅ Dockerfile uses correct feature flags' -ForegroundColor Green
        }
        else {
            Write-Host '❌ Dockerfile missing required feature flags' -ForegroundColor Red
            exit 1
        }
        
        if ($dockerfile -match 'auth-framework') {
            Write-Host '✅ Dockerfile builds auth-framework binary' -ForegroundColor Green
        }
        else {
            Write-Host "❌ Dockerfile doesn't specify auth-framework binary" -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Host '❌ Dockerfile not found' -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error validating Dockerfile: $_" -ForegroundColor Red
    exit 1
}

# Test 5: Validate changelog configuration
Write-Host "`n📝 Test 5: Validating changelog configuration..." -ForegroundColor Yellow
try {
    if (Test-Path 'cliff.toml') {
        Write-Host '✅ Changelog configuration found' -ForegroundColor Green
    }
    else {
        Write-Host '⚠️  No cliff.toml found - changelog generation may not work' -ForegroundColor Yellow
    }
    
    if (Test-Path 'CHANGELOG.md') {
        Write-Host '✅ Existing changelog found' -ForegroundColor Green
    }
    else {
        Write-Host '⚠️  No existing CHANGELOG.md - first release will create it' -ForegroundColor Yellow
    }
}
catch {
    Write-Host "❌ Error checking changelog files: $_" -ForegroundColor Red
    exit 1
}

# Test 6: Check for required secrets documentation
Write-Host "`n🔐 Test 6: Checking secrets documentation..." -ForegroundColor Yellow
try {
    $releaseDoc = Get-Content 'docs\RELEASE_AUTOMATION_PLAN.md' -Raw
    
    $requiredSecrets = @('GITHUB_TOKEN', 'DOCKER_HUB')
    foreach ($secret in $requiredSecrets) {
        if ($releaseDoc -match $secret) {
            Write-Host "✅ Secret '$secret' documented" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  Secret '$secret' not documented" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "❌ Error checking documentation: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Release Testing Complete!" -ForegroundColor Green
Write-Host '============================================' -ForegroundColor Green
Write-Host '✅ All critical release automation components validated' -ForegroundColor Green
Write-Host '🚀 Ready for production release automation' -ForegroundColor Green

if ($Verbose) {
    Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Create a release tag: git tag v$version" -ForegroundColor White
    Write-Host "2. Push the tag: git push origin v$version" -ForegroundColor White
    Write-Host '3. GitHub Actions will automatically:' -ForegroundColor White
    Write-Host '   - Build binaries for all platforms' -ForegroundColor White
    Write-Host '   - Create Docker images' -ForegroundColor White
    Write-Host '   - Generate changelog' -ForegroundColor White
    Write-Host '   - Create GitHub release with artifacts' -ForegroundColor White
}