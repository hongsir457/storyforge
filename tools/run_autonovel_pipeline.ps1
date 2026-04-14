param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PipelineArgs
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$autonovelDir = Join-Path $repoRoot "autonovel"

if (-not (Test-Path $autonovelDir)) {
    throw "autonovel directory not found: $autonovelDir"
}

Push-Location $autonovelDir
try {
    uv sync
    uv run python run_pipeline.py @PipelineArgs
}
finally {
    Pop-Location
}
