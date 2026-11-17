$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$previewDir = Join-Path $repoRoot "apps/windows-preview"
$outputDir = Join-Path $repoRoot "artifacts"
$outputExe = Join-Path $outputDir "Menstruation Tracker.exe"

if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    throw "Go is required to build the Windows preview executable. Install Go 1.23 or newer."
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
Push-Location $previewDir
try {
    $env:GOOS = "windows"
    $env:GOARCH = "amd64"
    $env:CGO_ENABLED = "0"
    go build -trimpath -ldflags="-s -w -H=windowsgui" -o $outputExe .
    if ($LASTEXITCODE -ne 0) { throw "Go build failed with exit code $LASTEXITCODE" }
} finally {
    Pop-Location
    Remove-Item Env:GOOS -ErrorAction SilentlyContinue
    Remove-Item Env:GOARCH -ErrorAction SilentlyContinue
    Remove-Item Env:CGO_ENABLED -ErrorAction SilentlyContinue
}

Write-Host "Built Windows x64 preview: $outputExe" -ForegroundColor Green
