@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo   Dead's Cloner - ligando o site em http://localhost:7777
echo.
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:7777
  python -m http.server 7777
  goto :eof
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
