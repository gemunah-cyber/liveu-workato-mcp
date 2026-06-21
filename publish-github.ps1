# Publish @gemunah-cyber/workato-mcp to GitHub Packages.
# Requires: GitHub PAT with write:packages (and read:packages).
#
# Usage (PowerShell):
#   $env:GITHUB_TOKEN = "ghp_..."
#   .\publish-github.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not $env:GITHUB_TOKEN) {
  Write-Host "Set GITHUB_TOKEN first (PAT with write:packages):" -ForegroundColor Yellow
  Write-Host '  $env:GITHUB_TOKEN = "ghp_..."' -ForegroundColor Cyan
  Write-Host '  .\publish-github.ps1'
  exit 1
}

Set-Location $root

npm install
npm run build

$npmrc = Join-Path $root ".npmrc.publish"
@"
@gemunah-cyber:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=$($env:GITHUB_TOKEN)
"@ | Set-Content -Path $npmrc -Encoding utf8

try {
  npm publish --userconfig $npmrc
  Write-Host ""
  Write-Host "Published @gemunah-cyber/workato-mcp@1.0.0" -ForegroundColor Green
  Write-Host ""
  Write-Host "Cursor Command MCP config:" -ForegroundColor Cyan
  Write-Host '  command: npx'
  Write-Host '  args: ["-y", "@gemunah-cyber/workato-mcp"]'
  Write-Host '  env: WORKATO_API_TOKEN, WORKATO_API_BASE_URL=https://www.workato.com/api'
  Write-Host '  env: NODE_AUTH_TOKEN = same GitHub PAT (read:packages) for Cloud Agent install'
}
finally {
  Remove-Item $npmrc -Force -ErrorAction SilentlyContinue
}
