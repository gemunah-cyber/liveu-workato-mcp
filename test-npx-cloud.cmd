@echo off
REM Test the same install path Cursor Cloud Agent uses (npx + private GitHub package)
cd /d "%~dp0"

if "%NODE_AUTH_TOKEN%"=="" (
  echo ERROR: Set NODE_AUTH_TOKEN first ^(GitHub PAT with read:packages^):
  echo   set NODE_AUTH_TOKEN=ghp_...
  exit /b 1
)

for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" if not "%%~B"=="" set "%%A=%%B"
)

echo Testing npx.cmd @gemunah-cyber/workato-mcp ...
echo {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}} | npx.cmd -y @gemunah-cyber/workato-mcp
