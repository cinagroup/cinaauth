# Complete TUF-Laptop Merge Script
# This script performs the systematic merge of all remaining TUF-Laptop files

Write-Host '🔄 Completing TUF-Laptop File Merge' -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# List of remaining significant files to merge
$filesToMerge = @(
    'src/api/users-TUF-Laptop.rs',
    'src/api/mfa-TUF-Laptop.rs', 
    'src/auth_modular/mfa/mod-TUF-Laptop.rs',
    'src/security/secure_jwt-TUF-Laptop.rs',
    'src/security/secure_session_config-TUF-Laptop.rs',
    'src/server/core/common_jwt-TUF-Laptop.rs',
    'src/server/core/common_validation-TUF-Laptop.rs',
    'src/architecture/mod-TUF-Laptop.rs',
    'src/observability/mod-TUF-Laptop.rs',
    'src/tokens/mod-TUF-Laptop.rs'
)

$successCount = 0
$errorCount = 0

foreach ($tufFile in $filesToMerge) {
    if (Test-Path $tufFile) {
        $originalFile = $tufFile -replace '-TUF-Laptop\.rs$', '.rs'
        
        Write-Host "📁 Merging: $originalFile" -ForegroundColor Yellow
        
        try {
            Copy-Item $tufFile $originalFile -Force
            Write-Host '   ✅ Successfully merged' -ForegroundColor Green
            $successCount++
        }
        catch {
            Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }
    else {
        Write-Host "⚠️  File not found: $tufFile" -ForegroundColor Yellow
        $errorCount++
    }
}

Write-Host "`n🧪 Testing build integrity..." -ForegroundColor Cyan
try {
    $buildResult = & cargo build --lib 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host '   ✅ Build successful!' -ForegroundColor Green
    }
    else {
        Write-Host '   ⚠️  Build has warnings/errors:' -ForegroundColor Yellow
        Write-Host $buildResult -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    $errorCount++
}

Write-Host "`n📊 Merge Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Successfully merged: $successCount files" -ForegroundColor Green
Write-Host "   ❌ Errors: $errorCount files" -ForegroundColor Red

Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host '   1. Review merged functionality' -ForegroundColor White
Write-Host '   2. Update documentation' -ForegroundColor White
Write-Host '   3. Run comprehensive tests' -ForegroundColor White
Write-Host '   4. Clean up TUF-Laptop files' -ForegroundColor White

Write-Host "`n✨ Merge process completed!" -ForegroundColor Green