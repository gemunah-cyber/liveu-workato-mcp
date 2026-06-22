@echo off
REM Run Workato MCP locally (bypasses PowerShell execution policy on npx.ps1)
cd /d "%~dp0"

if not exist dist\index.js (
  echo Building...
  call npm.cmd run build
  if errorlevel 1 exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" if not "%%~B"=="" set "%%A=%%B"
)

echo Starting Workato MCP (stdio). Press Ctrl+C to stop.
node dist\index.js
