# OpenAPI Modular Specification Validation Script
# Validates the modular OpenAPI specification structure

Write-Host '==================================' -ForegroundColor Cyan
Write-Host 'OpenAPI Modular Spec Validation' -ForegroundColor Cyan
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''

$baseDir = "$PSScriptRoot\..\docs\api"
$mainFile = "$baseDir\openapi-modular.yaml"
$errors = 0
$warnings = 0

# Check if main file exists
Write-Host 'Checking main entry point...' -ForegroundColor Yellow
if (Test-Path $mainFile) {
    Write-Host '  ✓ openapi-modular.yaml found' -ForegroundColor Green
}
else {
    Write-Host '  ✗ openapi-modular.yaml NOT FOUND' -ForegroundColor Red
    $errors++
}
Write-Host ''

# Check directory structure
Write-Host 'Checking directory structure...' -ForegroundColor Yellow
$requiredDirs = @('paths', 'schemas', 'components')
foreach ($dir in $requiredDirs) {
    $dirPath = "$baseDir\$dir"
    if (Test-Path $dirPath) {
        Write-Host "  ✓ $dir/ directory exists" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ $dir/ directory MISSING" -ForegroundColor Red
        $errors++
    }
}
Write-Host ''

# Check path files
Write-Host 'Checking path files...' -ForegroundColor Yellow
$pathFiles = @('health.yaml', 'auth.yaml', 'users.yaml', 'mfa.yaml', 'oauth.yaml', 'rbac.yaml', 'admin.yaml')
foreach ($file in $pathFiles) {
    $filePath = "$baseDir\paths\$file"
    if (Test-Path $filePath) {
        Write-Host "  ✓ paths/$file exists" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ paths/$file MISSING" -ForegroundColor Red
        $errors++
    }
}
Write-Host ''

# Check schema files
Write-Host 'Checking schema files...' -ForegroundColor Yellow
$schemaFiles = @('common.yaml', 'health.yaml', 'auth.yaml', 'users.yaml', 'mfa.yaml', 'oauth.yaml', 'rbac.yaml', 'admin.yaml')
foreach ($file in $schemaFiles) {
    $filePath = "$baseDir\schemas\$file"
    if (Test-Path $filePath) {
        Write-Host "  ✓ schemas/$file exists" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ schemas/$file MISSING" -ForegroundColor Red
        $errors++
    }
}
Write-Host ''

# Check component files
Write-Host 'Checking component files...' -ForegroundColor Yellow
$componentFiles = @('security.yaml', 'parameters.yaml', 'responses.yaml')
foreach ($file in $componentFiles) {
    $filePath = "$baseDir\components\$file"
    if (Test-Path $filePath) {
        Write-Host "  ✓ components/$file exists" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ components/$file MISSING" -ForegroundColor Red
        $errors++
    }
}
Write-Host ''

# Check for documentation
Write-Host 'Checking documentation...' -ForegroundColor Yellow
if (Test-Path "$baseDir\README-MODULAR.md") {
    Write-Host '  ✓ README-MODULAR.md exists' -ForegroundColor Green
}
else {
    Write-Host '  ⚠ README-MODULAR.md not found' -ForegroundColor Yellow
    $warnings++
}
if (Test-Path "$baseDir\MODULARIZATION_COMPLETE.md") {
    Write-Host '  ✓ MODULARIZATION_COMPLETE.md exists' -ForegroundColor Green
}
else {
    Write-Host '  ⚠ MODULARIZATION_COMPLETE.md not found' -ForegroundColor Yellow
    $warnings++
}
Write-Host ''

# Count total files created
Write-Host 'Counting files...' -ForegroundColor Yellow
$pathCount = (Get-ChildItem "$baseDir\paths\*.yaml" -ErrorAction SilentlyContinue).Count
$schemaCount = (Get-ChildItem "$baseDir\schemas\*.yaml" -ErrorAction SilentlyContinue).Count
$componentCount = (Get-ChildItem "$baseDir\components\*.yaml" -ErrorAction SilentlyContinue).Count
$docCount = (Get-ChildItem "$baseDir\*.md" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like '*MODULAR*' }).Count

Write-Host "  Path files: $pathCount (expected: 7)" -ForegroundColor Cyan
Write-Host "  Schema files: $schemaCount (expected: 8)" -ForegroundColor Cyan
Write-Host "  Component files: $componentCount (expected: 3)" -ForegroundColor Cyan
Write-Host "  Documentation files: $docCount (expected: 2)" -ForegroundColor Cyan
Write-Host ''

# Check for references in main file
Write-Host 'Checking references in main file...' -ForegroundColor Yellow
if (Test-Path $mainFile) {
    $content = Get-Content $mainFile -Raw
    $refPattern = '\$ref:\s*[''"]?\.\/paths\/|\.\/schemas\/|\.\/components\/'
    $refs = [regex]::Matches($content, $refPattern)
    Write-Host "  Found $($refs.Count) references to modular files" -ForegroundColor Cyan
    
    # Check for common reference patterns
    $hasPathRefs = $content -match '\$ref:\s*[''"]?\.\/paths\/'
    $hasSchemaRefs = $content -match '\$ref:\s*[''"]?\.\/schemas\/'
    $hasComponentRefs = $content -match '\$ref:\s*[''"]?\.\/components\/'
    
    if ($hasPathRefs) {
        Write-Host '  ✓ Contains path references' -ForegroundColor Green
    }
    else {
        Write-Host '  ⚠ No path references found' -ForegroundColor Yellow
        $warnings++
    }
    
    if ($hasSchemaRefs) {
        Write-Host '  ✓ Contains schema references' -ForegroundColor Green
    }
    else {
        Write-Host '  ⚠ No schema references found' -ForegroundColor Yellow
        $warnings++
    }
    
    if ($hasComponentRefs) {
        Write-Host '  ✓ Contains component references' -ForegroundColor Green
    }
    else {
        Write-Host '  ⚠ No component references found' -ForegroundColor Yellow
        $warnings++
    }
}
Write-Host ''

# Validate YAML syntax (if yq is available)
Write-Host 'Checking for validation tools...' -ForegroundColor Yellow
$yqAvailable = Get-Command yq -ErrorAction SilentlyContinue
$swaggerCliAvailable = Get-Command swagger-cli -ErrorAction SilentlyContinue

if ($yqAvailable) {
    Write-Host '  ✓ yq is available for YAML validation' -ForegroundColor Green
}
else {
    Write-Host '  ⚠ yq not found (install for YAML validation)' -ForegroundColor Yellow
    $warnings++
}

if ($swaggerCliAvailable) {
    Write-Host '  ✓ swagger-cli is available for OpenAPI validation' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Running OpenAPI validation...' -ForegroundColor Yellow
    try {
        $validateOutput = swagger-cli validate $mainFile 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host '  ✓ OpenAPI specification is valid!' -ForegroundColor Green
        }
        else {
            Write-Host '  ✗ OpenAPI validation failed:' -ForegroundColor Red
            Write-Host $validateOutput -ForegroundColor Red
            $errors++
        }
    }
    catch {
        Write-Host "  ⚠ Error running swagger-cli: $_" -ForegroundColor Yellow
        $warnings++
    }
}
else {
    Write-Host '  ⚠ swagger-cli not found (install with: npm install -g @apidevtools/swagger-cli)' -ForegroundColor Yellow
    $warnings++
}
Write-Host ''

# Summary
Write-Host '==================================' -ForegroundColor Cyan
Write-Host 'Validation Summary' -ForegroundColor Cyan
Write-Host '==================================' -ForegroundColor Cyan
Write-Host ''

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host '✓ All checks passed!' -ForegroundColor Green
    Write-Host ''
    Write-Host 'The modular OpenAPI specification is correctly structured.' -ForegroundColor Green
    Write-Host ''
    Write-Host 'Next steps:' -ForegroundColor Cyan
    Write-Host "  1. Preview in Swagger UI: swagger-ui serve $mainFile" -ForegroundColor White
    Write-Host "  2. Validate with swagger-cli: swagger-cli validate $mainFile" -ForegroundColor White
    Write-Host "  3. Generate SDK: openapi-generator-cli generate -i $mainFile -g rust -o sdk/rust" -ForegroundColor White
    exit 0
}
else {
    if ($errors -gt 0) {
        Write-Host "✗ $errors error(s) found" -ForegroundColor Red
    }
    if ($warnings -gt 0) {
        Write-Host "⚠ $warnings warning(s) found" -ForegroundColor Yellow
    }
    Write-Host ''
    Write-Host 'Please address the issues above before proceeding.' -ForegroundColor Yellow
    exit 1
}
