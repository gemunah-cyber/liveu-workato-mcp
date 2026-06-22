@echo off
REM Quick Workato API smoke test (no MCP, no PowerShell scripts)
cd /d "%~dp0"

for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" if not "%%~B"=="" set "%%A=%%B"
)

if "%WORKATO_API_TOKEN%"=="" (
  echo ERROR: WORKATO_API_TOKEN missing in .env
  exit /b 1
)

echo Calling Workato API: %WORKATO_API_BASE_URL%/folders
curl -s -H "Authorization: Bearer %WORKATO_API_TOKEN%" "%WORKATO_API_BASE_URL%/folders" | more
echo.
echo If you see JSON folder data above, your Workato token works.
