@echo off
chcp 65001 >nul
setlocal enableextensions
set "ROOT=%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo [s-qrypt] Node.js not found. Install Node 20 or newer, then run again.
  endlocal & exit /b 1
)
node "%ROOT%scripts\dev-temp.mjs" %*
set "CODE=%ERRORLEVEL%"
endlocal & exit /b %CODE%
