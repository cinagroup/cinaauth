# Build API Documentation with Dark Theme
# This script builds the AuthFramework API documentation with a dark theme optimized for developers

Write-Host 'Building AuthFramework API Documentation with Dark Theme...' -ForegroundColor Cyan

# Define theme options
$themeOptions = @(
    "--theme.openapi.theme.colors.primary.main='#60a5fa'"
    "--theme.openapi.theme.colors.success.main='#10b981'"
    "--theme.openapi.theme.colors.warning.main='#f59e0b'"
    "--theme.openapi.theme.colors.error.main='#ef4444'"
    "--theme.openapi.theme.colors.text.primary='#f9fafb'"
    "--theme.openapi.theme.colors.text.secondary='#d1d5db'"
    "--theme.openapi.theme.colors.http.get='#10b981'"
    "--theme.openapi.theme.colors.http.post='#60a5fa'"
    "--theme.openapi.theme.colors.http.put='#f59e0b'"
    "--theme.openapi.theme.colors.http.patch='#a78bfa'"
    "--theme.openapi.theme.colors.http.delete='#f87171'"
    "--theme.openapi.theme.sidebar.backgroundColor='#1e293b'"
    "--theme.openapi.theme.sidebar.textColor='#d1d5db'"
    "--theme.openapi.theme.sidebar.activeTextColor='#60a5fa'"
    "--theme.openapi.theme.rightPanel.backgroundColor='#0f172a'"
    "--theme.openapi.theme.rightPanel.textColor='#e2e8f0'"
    "--theme.openapi.theme.typography.fontSize='16px'"
    "--theme.openapi.theme.typography.fontFamily='Inter, sans-serif'"
)

# Build command
$command = "redocly build-docs docs/api/openapi-modular.yaml --output docs/api/index.html $($themeOptions -join ' ')"

Write-Host "Executing: $command" -ForegroundColor Gray

# Execute build
Invoke-Expression $command

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Documentation built successfully!" -ForegroundColor Green
    Write-Host 'Output: docs/api/index.html' -ForegroundColor Cyan
    
    # Ask to open
    $open = Read-Host "`nOpen in browser? (y/n)"
    if ($open -eq 'y') {
        Start-Process 'docs/api/index.html'
    }
}
else {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    exit 1
}
