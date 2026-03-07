# Serve API Documentation Locally
# This script starts a local HTTP server to view the API documentation
# This is necessary because browsers block local file access (CORS)

param(
    [int]$Port = 8000,
    [string]$File = 'index-scalar.html'
)

Write-Host '🚀 Starting local server for API documentation...' -ForegroundColor Cyan
Write-Host "   Port: $Port" -ForegroundColor Gray
Write-Host '   Directory: docs/api' -ForegroundColor Gray

# Change to docs/api directory
Push-Location 'docs/api'

try {
    # Check if the file exists
    if (-not (Test-Path $File)) {
        Write-Host "❌ Error: $File not found in docs/api/" -ForegroundColor Red
        Write-Host '   Available files:' -ForegroundColor Yellow
        Get-ChildItem -Filter '*.html' | ForEach-Object { Write-Host "   - $($_.Name)" -ForegroundColor Gray }
        exit 1
    }

    Write-Host "`n✅ Server ready!" -ForegroundColor Green
    Write-Host "   URL: http://localhost:$Port/$File" -ForegroundColor Cyan
    Write-Host "`n📖 Opening in browser..." -ForegroundColor Cyan
    
    # Open browser after a short delay
    Start-Sleep -Milliseconds 500
    Start-Process "http://localhost:$Port/$File"
    
    Write-Host "`n⚠️  Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

    # Start Python HTTP server
    if (Get-Command python -ErrorAction SilentlyContinue) {
        python -m http.server $Port
    }
    elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        python3 -m http.server $Port
    }
    else {
        Write-Host '❌ Python not found. Please install Python.' -ForegroundColor Red
        exit 1
    }
}
finally {
    Pop-Location
    Write-Host "`n👋 Server stopped." -ForegroundColor Cyan
}
