#!/usr/bin/env pwsh
# Simple script to start the debug server
# Run this in a SEPARATE terminal window and leave it running

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host 'Debug Server Starter' -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host 'Starting debug server on http://localhost:8088...' -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

# Run the server (this will block)
cargo run --example debug_server
