# Creates workato-mcp-share.zip for colleagues (no secrets, no research scripts).
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$staging = Join-Path $env:TEMP "workato-mcp-share-$(Get-Date -Format 'yyyyMMddHHmmss')"
$zipPath = Join-Path (Split-Path $root -Parent) "workato-mcp-share.zip"

New-Item -ItemType Directory -Path $staging | Out-Null

$include = @(
    "src",
    "dist",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    ".env.example",
    ".gitignore",
    "README.md",
    "mcp.json.example"
)

foreach ($item in $include) {
    $src = Join-Path $root $item
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $staging $item) -Recurse -Force
    }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $zipPath -Force
Remove-Item $staging -Recurse -Force

Write-Host "Created: $zipPath"
Write-Host "Share this zip with colleagues. They unzip, npm install, npm run build, configure mcp.json."
