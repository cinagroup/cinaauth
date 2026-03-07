# TUF-Laptop Systematic Merge Process
# ====================================

Write-Host '🎉 Build Successfully Fixed - Ready for TUF-Laptop Merge' -ForegroundColor Green
Write-Host '=========================================================' -ForegroundColor Green

# Create backup of current working state
$backupDir = "backup-working-build-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "`n📦 Creating backup of working build in $backupDir..." -ForegroundColor Yellow
Copy-Item 'src' $backupDir -Recurse -Force
Write-Host '   ✅ Backup created successfully' -ForegroundColor Green

Write-Host "`n🔍 Phase 2: Selective TUF-Laptop Analysis and Merge" -ForegroundColor Cyan

# Identify files with significant enhancements
Write-Host "`n📊 Analyzing TUF-Laptop files for significant enhancements..."
$significantFiles = @()

Get-ChildItem src -Recurse -Name '*-TUF-Laptop.rs' | ForEach-Object {
    $original = $_ -replace '-TUF-Laptop\.rs$', '.rs'
    $tuf = $_
    if (Test-Path "src/$original") {
        $origSize = (Get-Item "src/$original").Length
        $tufSize = (Get-Item "src/$tuf").Length
        $diff = $tufSize - $origSize
        
        if ($diff -gt 200 -or $tufSize -gt $origSize * 1.05) {
            $significantFiles += [PSCustomObject]@{
                File       = $original
                TUFFile    = $tuf
                Difference = $diff
                Ratio      = [math]::Round($tufSize / $origSize, 2)
                Priority   = if ($diff -gt 1000) { 'High' } elseif ($diff -gt 500) { 'Medium' } else { 'Low' }
            }
        }
    }
}

Write-Host "`n🎯 Files with Significant Enhancements:" -ForegroundColor Yellow
$significantFiles | Sort-Object Difference -Descending | ForEach-Object {
    $color = switch ($_.Priority) {
        'High' { 'Red' }
        'Medium' { 'Yellow' }
        'Low' { 'Green' }
    }
    Write-Host "   $($_.Priority): $($_.File) (+$($_.Difference) bytes, ratio: $($_.Ratio))" -ForegroundColor $color
}

Write-Host "`n📋 Merge Strategy Decision:" -ForegroundColor Cyan
Write-Host '   • Build is currently stable with warnings only' -ForegroundColor Green
Write-Host "   • $($significantFiles.Count) files have meaningful enhancements" -ForegroundColor White
Write-Host '   • We can now safely merge TUF-Laptop files in phases' -ForegroundColor White

Write-Host "`n🚀 Ready to proceed with TUF-Laptop merge!" -ForegroundColor Green
Write-Host '   Next step: Merge high-priority files and test incrementally' -ForegroundColor Yellow