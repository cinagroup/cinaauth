#!/usr/bin/env pwsh
# Validate API Routes - Compare code routes with OpenAPI spec
# This script ensures the OpenAPI spec matches actual implemented routes

Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'AuthFramework API Route Validation' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Get project root - script is in scripts/ folder
if ($PSScriptRoot) {
    $projectRoot = Split-Path -Parent $PSScriptRoot
}
else {
    $projectRoot = Get-Location
}

$serverFile = Join-Path $projectRoot 'src' 'api' 'server.rs'
$openapiFile = Join-Path $projectRoot 'docs' 'api' 'openapi.yaml'

Write-Host "Project root: $projectRoot" -ForegroundColor Gray
Write-Host ''

if (-not (Test-Path $serverFile)) {
    Write-Host "ERROR: Could not find server.rs at: $serverFile" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $openapiFile)) {
    Write-Host "ERROR: Could not find openapi.yaml at: $openapiFile" -ForegroundColor Red
    exit 1
}

# Extract routes from server.rs
Write-Host 'Extracting routes from server.rs...' -ForegroundColor Yellow
$serverContent = Get-Content $serverFile -Raw

$routePattern = '\.route\("([^"]+)",\s*(?:get|post|put|delete|patch)\('
$codeRoutes = [System.Collections.Generic.HashSet[string]]::new()

$routeMatches = [regex]::Matches($serverContent, $routePattern)
foreach ($match in $routeMatches) {
    $route = $match.Groups[1].Value
    [void]$codeRoutes.Add($route)
}

Write-Host "Found $($codeRoutes.Count) routes in code" -ForegroundColor Green
Write-Host ''

# Display code routes
Write-Host 'Routes found in code:' -ForegroundColor Cyan
$sortedCodeRoutes = $codeRoutes | Sort-Object
foreach ($route in $sortedCodeRoutes) {
    Write-Host "  $route" -ForegroundColor Gray
}
Write-Host ''

# Extract paths from OpenAPI spec
Write-Host 'Extracting paths from openapi.yaml...' -ForegroundColor Yellow

$pathPattern = '^\s+(/[^:]+):\s*$'
$specPaths = [System.Collections.Generic.HashSet[string]]::new()

$inPaths = $false
foreach ($line in (Get-Content $openapiFile)) {
    if ($line -match '^\s*paths:\s*$') {
        $inPaths = $true
        continue
    }
    if ($inPaths -and $line -match $pathPattern) {
        $path = $matches[1]
        # Convert OpenAPI path parameters {param} to Axum :param format
        $axumPath = $path -replace '\{([^}]+)\}', ':$1'
        [void]$specPaths.Add($axumPath)
    }
    # Stop when we hit components or other top-level keys
    if ($inPaths -and $line -match '^[a-z]+:' -and $line -notmatch '^\s') {
        $inPaths = $false
    }
}

Write-Host "Found $($specPaths.Count) paths in OpenAPI spec" -ForegroundColor Green
Write-Host ''

# Compare
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Comparison Results' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host ''

# Routes in code but not in spec
$missingFromSpec = [System.Linq.Enumerable]::Except($codeRoutes, $specPaths)
if ($missingFromSpec) {
    Write-Host 'Routes in CODE but MISSING from SPEC:' -ForegroundColor Red
    foreach ($route in ($missingFromSpec | Sort-Object)) {
        Write-Host "  $route" -ForegroundColor Red
    }
    Write-Host ''
}
else {
    Write-Host 'All code routes are documented in spec' -ForegroundColor Green
    Write-Host ''
}

# Routes in spec but not in code  
$missingFromCode = [System.Linq.Enumerable]::Except($specPaths, $codeRoutes)
if ($missingFromCode) {
    Write-Host 'Routes in SPEC but MISSING from CODE:' -ForegroundColor Red
    foreach ($route in ($missingFromCode | Sort-Object)) {
        Write-Host "  $route" -ForegroundColor Red
    }
    Write-Host ''
}
else {
    Write-Host 'All spec routes are implemented in code' -ForegroundColor Green
    Write-Host ''
}

# Summary
Write-Host '========================================' -ForegroundColor Cyan
Write-Host 'Summary' -ForegroundColor Cyan
Write-Host '========================================' -ForegroundColor Cyan
Write-Host "Code routes:  $($codeRoutes.Count)" -ForegroundColor Gray
Write-Host "Spec paths:   $($specPaths.Count)" -ForegroundColor Gray
Write-Host "Missing from spec: $(if ($missingFromSpec) { ($missingFromSpec | Measure-Object).Count } else { 0 })" `
    -ForegroundColor $(if ($missingFromSpec) { 'Red' } else { 'Green' })
Write-Host "Missing from code: $(if ($missingFromCode) { ($missingFromCode | Measure-Object).Count } else { 0 })" `
    -ForegroundColor $(if ($missingFromCode) { 'Red' } else { 'Green' })
Write-Host ''

if (-not $missingFromSpec -and -not $missingFromCode) {
    Write-Host 'Perfect! OpenAPI spec matches implementation' -ForegroundColor Green
    exit 0
}
else {
    Write-Host 'OpenAPI spec needs updating' -ForegroundColor Red
    Write-Host 'See OPENAPI_UPDATE_SUMMARY.md for detailed update instructions' -ForegroundColor Yellow
    exit 1
}
