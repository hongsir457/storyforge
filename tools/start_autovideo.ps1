param(
    [switch]$Production
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$deployDir = if ($Production) {
    Join-Path $repoRoot "deploy\\production"
} else {
    Join-Path $repoRoot "deploy"
}

if (-not (Test-Path $deployDir)) {
    throw "Frametale deploy directory not found: $deployDir"
}

$envFile = Join-Path $deployDir ".env"
$envExample = Join-Path $deployDir ".env.example"

if (-not (Test-Path $envFile)) {
    if (-not (Test-Path $envExample)) {
        throw "Missing Frametale env example: $envExample"
    }
    Copy-Item $envExample $envFile
    Write-Host "Created Frametale env file:" $envFile
    Write-Host "Edit it before first real run if you need custom settings."
}

Push-Location $deployDir
try {
    docker compose up -d --build
}
finally {
    Pop-Location
}

Write-Host "Frametale should be starting at http://localhost:1241"
