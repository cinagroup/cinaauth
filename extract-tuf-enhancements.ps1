#!/usr/bin/env pwsh
# Extract only the valuable enhancements from TUF-Laptop files without breaking compatibility

Write-Host '=== AuthFramework TUF-Laptop Enhancement Extractor ===' -ForegroundColor Cyan

# Create enhancement analysis directory
$enhancementDir = "tuf-enhancements-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $enhancementDir -Force | Out-Null
Write-Host "Created enhancement analysis directory: $enhancementDir" -ForegroundColor Green

# Function to analyze differences and extract enhancements
function Extract-Enhancements {
    param($workingFile, $tufFile, $outputFile)
    
    if (-not (Test-Path $workingFile) -or -not (Test-Path $tufFile)) {
        Write-Host "Skipping $workingFile - files not found" -ForegroundColor Yellow
        return
    }
    
    $workingContent = Get-Content $workingFile -Raw
    $tufContent = Get-Content $tufFile -Raw
    
    # Basic size comparison
    $sizeDiff = $tufContent.Length - $workingContent.Length
    
    if ($sizeDiff -gt 100) {
        Write-Host "Analyzing $workingFile (+$sizeDiff bytes)" -ForegroundColor Cyan
        
        # Extract meaningful differences
        $workingLines = Get-Content $workingFile
        $tufLines = Get-Content $tufFile
        
        $enhancements = @()
        $enhancements += "# Enhancements found in: $tufFile"
        $enhancements += "# Size difference: +$sizeDiff bytes"
        $enhancements += "# Analysis date: $(Get-Date)"
        $enhancements += ''
        
        # Find line-by-line differences
        for ($i = 0; $i -lt [Math]::Max($workingLines.Count, $tufLines.Count); $i++) {
            $workingLine = if ($i -lt $workingLines.Count) { $workingLines[$i] } else { '' }
            $tufLine = if ($i -lt $tufLines.Count) { $tufLines[$i] } else { '' }
            
            if ($workingLine -ne $tufLine) {
                $enhancements += "## Line $($i+1) difference:"
                $enhancements += "Working: $workingLine"
                $enhancements += "TUF-Laptop: $tufLine"
                $enhancements += ''
                
                # Stop after finding 20 differences to avoid noise
                if ($enhancements.Count -gt 100) {
                    $enhancements += '... (truncated - too many differences)'
                    break
                }
            }
        }
        
        # Save analysis
        $enhancements | Out-File -FilePath "$enhancementDir\$outputFile" -Encoding UTF8
        Write-Host "Saved enhancement analysis to: $enhancementDir\$outputFile" -ForegroundColor Green
        
        # Return summary
        return @{
            File                 = $workingFile
            SizeDifference       = $sizeDiff
            HasMeaningfulChanges = $sizeDiff -gt 100
            AnalysisFile         = "$enhancementDir\$outputFile"
        }
    }
    
    return $null
}

# Analyze the 3 files we identified as having enhancements
Write-Host "`n=== Analyzing Files with Enhancements ===" -ForegroundColor Yellow

$results = @()

# 1. API Auth file
$result = Extract-Enhancements 'src\api\auth.rs' 'src\api\auth-TUF-Laptop.rs' 'auth-enhancements.md'
if ($result) { $results += $result }

# 2. SAML Module file
$result = Extract-Enhancements 'src\methods\saml\mod.rs' 'src\methods\saml\mod-TUF-Laptop.rs' 'saml-enhancements.md'
if ($result) { $results += $result }

# 3. API Server file  
$result = Extract-Enhancements 'src\api\server.rs' 'src\api\server-TUF-Laptop.rs' 'server-enhancements.md'
if ($result) { $results += $result }

# Generate summary report
Write-Host "`n=== Enhancement Summary ===" -ForegroundColor Cyan

$summary = @()
$summary += '# TUF-Laptop Enhancement Analysis Summary'
$summary += "Generated: $(Get-Date)"
$summary += ''
$summary += '## Files with Enhancements:'
$summary += ''

foreach ($result in $results) {
    $summary += "- **$($result.File)**: +$($result.SizeDifference) bytes"
    $summary += "  - Analysis: $($result.AnalysisFile)"
    $summary += ''
}

$summary += '## Next Steps:'
$summary += '1. Review each analysis file to understand the enhancements'
$summary += '2. Identify which enhancements are valuable and compatible'
$summary += '3. Apply enhancements manually with proper namespace fixes'
$summary += '4. Test each enhancement individually'
$summary += ''

$summary | Out-File -FilePath "$enhancementDir\SUMMARY.md" -Encoding UTF8

Write-Host '=== Analysis Complete ===' -ForegroundColor Green
Write-Host "Results saved in: $enhancementDir" -ForegroundColor Green
Write-Host 'Review SUMMARY.md and individual analysis files' -ForegroundColor Green

# Display quick summary
if ($results.Count -gt 0) {
    Write-Host "`nQuick Summary:" -ForegroundColor Yellow
    foreach ($result in $results) {
        Write-Host "  $($result.File): +$($result.SizeDifference) bytes" -ForegroundColor White
    }
}
else {
    Write-Host 'No meaningful enhancements found' -ForegroundColor Yellow
}