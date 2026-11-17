<#
.SYNOPSIS
    Fast Production Update Script for Existing Titan Eye Deployment.
    Safely updates an existing installation (e.g. D:\apps\titan) in seconds without touching database, uploads, or .env.
.DESCRIPTION
    1. Stops TitanEyeAPI Windows Service.
    2. Takes a lightweight safety backup of the existing dist & dist-server.
    3. Replaces dist/, dist-server/, server.js, web.config, and maintenance scripts.
    4. Applies IIS header hardening (suppresses X-Powered-By: ARR/3.0 & Server headers).
    5. Starts TitanEyeAPI service and recycles IIS AppPool.
    6. Verifies backend API health.
#>
[CmdletBinding()]
param (
    [string]$AppRoot = "D:\apps\titan"
)

$ErrorActionPreference = "Stop"

# Auto-detect AppRoot if default does not exist
if (-not (Test-Path $AppRoot)) {
    if (Test-Path "D:\apps\titan\server.js") {
        $AppRoot = "D:\apps\titan"
    } elseif (Test-Path "C:\titan\server.js") {
        $AppRoot = "C:\titan"
    } elseif (Test-Path "$PSScriptRoot\..\server.js") {
        $AppRoot = (Resolve-Path "$PSScriptRoot\..").Path
    } else {
        $AppRoot = "D:\apps\titan"
    }
} else {
    $AppRoot = [System.IO.Path]::GetFullPath($AppRoot)
}

$PackageRoot = (Resolve-Path "$PSScriptRoot\..").Path

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TITAN EYE - FAST PRODUCTION UPDATE                     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Target App Directory : $AppRoot" -ForegroundColor Yellow
Write-Host " Source Update Package: $PackageRoot" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Check Administrator Privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "CRITICAL: This update script must be executed with Administrator privileges (Run as Administrator)!"
    exit 1
}

# 1. Stop Windows Service
Write-Host "`n1. Stopping TitanEyeAPI Windows Service..." -ForegroundColor Yellow
try {
    $svc = Get-Service -Name "TitanEyeAPI" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        Stop-Service -Name "TitanEyeAPI" -Force -ErrorAction Stop
        Write-Host "   [OK] Service TitanEyeAPI stopped." -ForegroundColor Green
    } else {
        Write-Host "   [INFO] TitanEyeAPI service is not running or not installed." -ForegroundColor DarkGray
    }
} catch {
    Write-Warning "Could not cleanly stop TitanEyeAPI: $_. Continuing..."
}

# 2. Safety Backup of previous dist & dist-server
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $AppRoot "backups\pre-update-$timestamp"
Write-Host "`n2. Creating safety snapshot of existing binaries in $backupDir..." -ForegroundColor Yellow
try {
    if (-not (Test-Path $backupDir)) {
        New-Item -Path $backupDir -ItemType Directory -Force | Out-Null
    }
    if (Test-Path "$AppRoot\dist") {
        Copy-Item -Path "$AppRoot\dist" -Destination "$backupDir\dist" -Recurse -Force
    }
    if (Test-Path "$AppRoot\dist-server") {
        Copy-Item -Path "$AppRoot\dist-server" -Destination "$backupDir\dist-server" -Recurse -Force
    }
    if (Test-Path "$AppRoot\web.config") {
        Copy-Item -Path "$AppRoot\web.config" -Destination "$backupDir\web.config" -Force
    }
    Write-Host "   [OK] Pre-update snapshot saved to $backupDir" -ForegroundColor Green
} catch {
    Write-Warning "Safety backup encountered a non-fatal warning: $_"
}

# 3. Deploy Updated Binaries and Configurations
Write-Host "`n3. Deploying updated frontend, backend, and security configurations..." -ForegroundColor Yellow

# Copy dist (Frontend)
if (Test-Path "$PackageRoot\dist") {
    robocopy "$PackageRoot\dist" "$AppRoot\dist" /E /PURGE /R:1 /W:1 | Out-Null
    if ($LASTEXITCODE -gt 7) {
        Write-Error "CRITICAL: robocopy failed to sync dist (exit code $LASTEXITCODE)"
        exit 1
    }
    if (Test-Path "$AppRoot\dist\dist") {
        Remove-Item -Path "$AppRoot\dist\dist" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "   [OK] Updated frontend SPA in $AppRoot\dist" -ForegroundColor Green
} else {
    Write-Error "CRITICAL: dist directory missing in update package!"
    exit 1
}

# Copy dist-server (Backend)
if (Test-Path "$PackageRoot\dist-server") {
    robocopy "$PackageRoot\dist-server" "$AppRoot\dist-server" /E /PURGE /R:1 /W:1 | Out-Null
    if ($LASTEXITCODE -gt 7) {
        Write-Error "CRITICAL: robocopy failed to sync dist-server (exit code $LASTEXITCODE)"
        exit 1
    }
    Write-Host "   [OK] Updated backend in $AppRoot\dist-server" -ForegroundColor Green
} else {
    Write-Error "CRITICAL: dist-server directory missing in update package!"
    exit 1
}

# Copy server.js & web.config
$rootFiles = @("server.js", "web.config", "package.json", "package-lock.json")
foreach ($f in $rootFiles) {
    if (Test-Path "$PackageRoot\$f") {
        Copy-Item -Path "$PackageRoot\$f" -Destination "$AppRoot\$f" -Force
        Write-Host "   [OK] Updated $f" -ForegroundColor Green
    }
}

# Ensure web.config is inside dist as well for IIS SPA routing
if (Test-Path "$PackageRoot\web.config") {
    Copy-Item -Path "$PackageRoot\web.config" -Destination "$AppRoot\dist\web.config" -Force
}

# Copy updated scripts
if (Test-Path "$PackageRoot\scripts") {
    Copy-Item -Path "$PackageRoot\scripts" -Destination "$AppRoot\scripts" -Recurse -Force
    Write-Host "   [OK] Updated maintenance and automation scripts" -ForegroundColor Green
}

# 4. Apply IIS Permissions & Header Hardening
Write-Host "`n4. Applying IIS NTFS permissions and server header hardening..." -ForegroundColor Yellow
try {
    cmd /c "icacls `"$AppRoot\dist`" /grant IIS_IUSRS:(OI)(CI)F /grant IUSR:(OI)(CI)RX /C /Q >nul 2>&1"
    Write-Host "   [OK] NTFS Permissions applied to $AppRoot\dist" -ForegroundColor Green
} catch {
    Write-Warning "icacls warning: $_"
}

$headerScript = Join-Path $AppRoot "scripts\disable-iis-server-header.ps1"
if (Test-Path $headerScript) {
    try {
        & "$headerScript"
        Write-Host "   [OK] IIS & ARR server headers hardened" -ForegroundColor Green
    } catch {
        Write-Warning "Header hardening script warning: $_"
    }
}

# 5. Start Windows Service & Recycle IIS
Write-Host "`n5. Starting TitanEyeAPI Windows Service & Recycling IIS..." -ForegroundColor Yellow
try {
    Start-Service -Name "TitanEyeAPI" -ErrorAction Stop
    Write-Host "   [OK] TitanEyeAPI service started successfully" -ForegroundColor Green
} catch {
    Write-Warning "Failed to start service TitanEyeAPI: $_. Please check Windows Services."
}

try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Restart-WebAppPool -Name "DefaultAppPool" -ErrorAction SilentlyContinue
    Write-Host "   [OK] IIS DefaultAppPool recycled" -ForegroundColor Green
} catch {
    # Non-blocking
}

# 6. Post-Update Health Verification
Write-Host "`n6. Verifying API health on http://localhost:3001/api/ping..." -ForegroundColor Yellow
$healthy = $false
for ($i = 1; $i -le 6; $i++) {
    Start-Sleep -Seconds 2
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3001/api/ping" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($res.StatusCode -eq 200) {
            $healthy = $true
            Write-Host "   [OK] Backend API is responding (Status: 200 OK)" -ForegroundColor Green
            break
        }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -in @(200, 401)) {
            $healthy = $true
            Write-Host "   [OK] Backend API is responding (Status: Online)" -ForegroundColor Green
            break
        }
        Write-Host "   Waiting for backend to bind (Attempt $i/6)..." -ForegroundColor DarkGray
    }
}

if ($healthy) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host "   UPDATE COMPLETED SUCCESSFULLY IN SECONDS!              " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
    Write-Host " Safety Backup   : $backupDir" -ForegroundColor Cyan
    Write-Host " Domain          : https://trvc.titan.in" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Warning "Backend did not respond within 12s. Check logs at $AppRoot\logs\service-error.log"
}

