@echo off
cd /d "%~dp0"
powershell.exe -NoLogo -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %errorlevel% neq 0 pause
