@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0stop-server.ps1" %*
pause
