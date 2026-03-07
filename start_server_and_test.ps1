#!/usr/bin/env pwsh
# Script to start debug server and run tests

$ErrorActionPreference = 'Stop'
$baseUrl = 'http://localhost:8088'

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host 'Starting Debug Server and Running Tests' -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if server is already running
Write-Host 'Checking if server is already running...' -ForegroundColor Gray
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Server is already running on $baseUrl" -ForegroundColor Green
    $serverWasRunning = $true
}
catch {
    Write-Host '⚠️  Server is not running, will start it now...' -ForegroundColor Yellow
    $serverWasRunning = $false
}

# Start server if not already running
if (-not $serverWasRunning) {
    Write-Host "`nStarting debug server..." -ForegroundColor Gray
    
    # Kill any existing cargo/debug_server processes first
    Get-Process | Where-Object { $_.ProcessName -like '*debug_server*' -or ($_.ProcessName -eq 'cargo' -and $_.CommandLine -like '*debug_server*') } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    # Start the server
    $job = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        cargo run --example debug_server 2>&1
    }
    
    Write-Host "Server job started (ID: $($job.Id))" -ForegroundColor Gray
    Write-Host 'Waiting for server to be ready...' -ForegroundColor Gray
    
    # Wait for server to be ready (max 30 seconds)
    $maxAttempts = 30
    $attempt = 0
    $serverReady = $false
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        Start-Sleep -Seconds 1
        
        try {
            $null = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
            $serverReady = $true
            Write-Host "✅ Server is ready! (took $attempt seconds)" -ForegroundColor Green
            break
        }
        catch {
            Write-Host '.' -NoNewline -ForegroundColor Gray
        }
    }
    
    Write-Host ''  # New line after dots
    
    if (-not $serverReady) {
        Write-Host "❌ Server failed to start after $maxAttempts seconds" -ForegroundColor Red
        Write-Host "`nServer job output:" -ForegroundColor Yellow
        Receive-Job -Job $job | Select-Object -First 20
        Stop-Job -Job $job
        Remove-Job -Job $job
        exit 1
    }
}

# Run the tests
Write-Host "`nRunning security tests...`n" -ForegroundColor Cyan
try {
    & .\test_security_features.ps1
    $testExitCode = $LASTEXITCODE
}
catch {
    Write-Host "`n❌ Test script encountered an error: $_" -ForegroundColor Red
    $testExitCode = 1
}

# Cleanup if we started the server
if (-not $serverWasRunning) {
    Write-Host "`nCleaning up..." -ForegroundColor Gray
    
    if ($job) {
        Write-Host 'Stopping server job...' -ForegroundColor Gray
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -ErrorAction SilentlyContinue
    }
    
    # Kill any remaining processes
    Get-Process | Where-Object { $_.ProcessName -like '*debug_server*' -or $_.ProcessName -like '*cargo*' } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host '✅ Cleanup complete' -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($testExitCode -eq 0) {
    Write-Host '✅ All tests completed successfully!' -ForegroundColor Green
}
else {
    Write-Host "❌ Tests failed with exit code: $testExitCode" -ForegroundColor Red
}
Write-Host "========================================`n" -ForegroundColor Cyan

exit $testExitCode
