@echo off
setlocal EnableDelayedExpansion
title Titan Eye - Automated Offline Production Deployment

:: ================================================================
:: TITAN EYE 1-CLICK COMPLETE OFFLINE INSTALLATION LAUNCHER
:: ================================================================

:: Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ================================================================
    echo  ERROR: ADMINISTRATOR PRIVILEGES REQUIRED
    echo ================================================================
    echo  This installation script must be run as an Administrator.
    echo  Please right-click on install.cmd and select "Run as administrator".
    echo ================================================================
    echo.
    pause
    exit /b 1
)

:: Auto-detect Application Root Directory
set "CURRENT_DIR=%~dp0"
if "%CURRENT_DIR:~-1%"=="\" set "CURRENT_DIR=%CURRENT_DIR:~0,-1%"

if exist "%CURRENT_DIR%\server.js" (
    set "APP_ROOT=%CURRENT_DIR%"
    set "SCRIPT_PATH=%CURRENT_DIR%\scripts\00-INSTALL-OFFLINE-ALL.ps1"
) else if exist "%CURRENT_DIR%\..\server.js" (
    for %%I in ("%CURRENT_DIR%\..") do set "APP_ROOT=%%~fI"
    set "SCRIPT_PATH=%CURRENT_DIR%\00-INSTALL-OFFLINE-ALL.ps1"
) else (
    set "APP_ROOT=%CURRENT_DIR%"
    set "SCRIPT_PATH=%CURRENT_DIR%\scripts\00-INSTALL-OFFLINE-ALL.ps1"
)

echo ================================================================
echo    TITAN EYE - 1-CLICK COMPLETE OFFLINE PRODUCTION INSTALLER
echo ================================================================
echo  Target App Root  : %APP_ROOT%
echo  Execution Script : %SCRIPT_PATH%
echo ================================================================
echo.

if not exist "%SCRIPT_PATH%" (
    echo ERROR: Cannot find master setup script at: "%SCRIPT_PATH%"
    echo Please verify the package was extracted properly.
    echo.
    pause
    exit /b 1
)

:: Execute Master PowerShell Deployment Script with Bypass Execution Policy
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_PATH%' -AppRoot '%APP_ROOT%'"

set "PS_EXIT=!errorlevel!"
if !PS_EXIT! neq 0 (
    echo.
    echo ================================================================
    echo  INSTALLATION ENCOUNTERED AN ERROR (Exit Code: !PS_EXIT!)
    echo  Please review the log messages above for details.
    echo ================================================================
    echo.
    pause
    exit /b !PS_EXIT!
)

echo.
echo ================================================================
echo  TITAN EYE DEPLOYMENT FINISHED SUCCESSFULLY!
echo ================================================================
echo  Frontend Application : http://localhost
echo  Backend Health Check : http://localhost:3001/api/health
echo  Logs Directory       : %APP_ROOT%\logs
echo ================================================================
echo.
pause

