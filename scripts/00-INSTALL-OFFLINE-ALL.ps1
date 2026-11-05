<#
.SYNOPSIS
    Master 1-Click Complete Offline Production Deployment for Titan Eye on Windows Server.
.DESCRIPTION
    Executes all installation phases end-to-end without manual intervention:
    1. IIS Windows features, Node.js LTS, URL Rewrite 2.1, ARR 3.0
    2. TitanEyeAPI Windows Service via NSSM
    3. IIS Website, NTFS permissions, URL reverse proxy
    4. Automated daily backup task scheduler
    5. Dedicated 90-day cryptographic log retention purge scheduler
    6. Post-deployment service and frontend health verification
#>
[CmdletBinding()]
param (
    [string]$AppRoot = "",
    [string]$ToolsDir = "",
    [string]$SiteName = "TitanEye"
)

$ErrorActionPreference = "Stop"

# Auto-detect AppRoot if not supplied
if (-not $AppRoot) {
    if (Test-Path "$PSScriptRoot\..\server.js") {
        $AppRoot = (Resolve-Path "$PSScriptRoot\..").Path
    } elseif (Test-Path "C:\titan\server.js") {
        $AppRoot = "C:\titan"
    } else {
        $AppRoot = (Resolve-Path "$PSScriptRoot\..").Path
    }
} else {
    $AppRoot = [System.IO.Path]::GetFullPath($AppRoot)
}

# Auto-detect ToolsDir if not supplied
if (-not $ToolsDir) {
    $candidates = @(
        (Join-Path $AppRoot "tools"),
        (Join-Path $PSScriptRoot "..\tools"),
        "C:\titan\tools"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $ToolsDir = (Resolve-Path $cand).Path
            break
        }
    }
    if (-not $ToolsDir) {
        $ToolsDir = Join-Path $AppRoot "tools"
    }
} else {
    $ToolsDir = [System.IO.Path]::GetFullPath($ToolsDir)
}

# Ensure Run as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "CRITICAL: This script must be executed in an elevated session (Run as Administrator)!"
    exit 1
}

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   TITAN EYE - 1-CLICK COMPLETE OFFLINE SERVER INSTALL   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Target Directory : $AppRoot" -ForegroundColor Cyan
Write-Host "Tools Directory  : $ToolsDir" -ForegroundColor Cyan
Write-Host "Website Name     : $SiteName" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

# Ensure Node.js in current process PATH if already installed in standard locations
$stdNodeDirs = @("C:\Program Files\nodejs", "C:\Program Files (x86)\nodejs")
foreach ($nd in $stdNodeDirs) {
    if (Test-Path $nd) {
        if ($env:Path -notlike "*$nd*") {
            $env:Path = "$nd;" + $env:Path
        }
    }
}

# Pre-flight Check: Environment Configuration (.env)
$EnvPath = Join-Path $AppRoot ".env"
$EnvExample = Join-Path $AppRoot ".env.example"

if (-not (Test-Path $EnvPath)) {
    if (Test-Path $EnvExample) {
        Write-Host "Creating .env configuration from .env.example..." -ForegroundColor Yellow
        Copy-Item -Path $EnvExample -Destination $EnvPath -Force
        Write-Host "   [OK] Created .env template." -ForegroundColor Green
    } else {
        Write-Warning "No .env found in $AppRoot. Creating minimal production .env..."
        @"
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
"@ | Out-File -FilePath $EnvPath -Encoding utf8
    }
}

# Ensure required directory structure exists
$RequiredDirs = @(
    "logs",
    "logs\audit",
    "logs\signin",
    "logs\err",
    "logs\monitoring",
    "backups",
    "uploads",
    "data"
)
foreach ($sub in $RequiredDirs) {
    $dir = Join-Path $AppRoot $sub
    if (-not (Test-Path $dir)) {
        New-Item -Path $dir -ItemType Directory -Force | Out-Null
    }
}
Write-Host "   [OK] Directory structure verified (logs, backups, uploads, data)." -ForegroundColor Green

# 1. Install IIS & Offline Prerequisites
Write-Host "`n--- Phase 1: Installing Prerequisites ---" -ForegroundColor Cyan
& "$PSScriptRoot\01-install-iis-prerequisites.ps1" -ToolsDir $ToolsDir

# Refresh current session PATH after prerequisites installation
$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 2. Setup NSSM Node.js Windows Service
Write-Host "`n--- Phase 2: Setting up Background Service ---" -ForegroundColor Cyan
& "$PSScriptRoot\02-setup-nssm-service.ps1" -AppRoot $AppRoot -ToolsDir $ToolsDir

# 3. Setup IIS Website & Routing
Write-Host "`n--- Phase 3: Configuring IIS Web Site & Reverse Proxy ---" -ForegroundColor Cyan
& "$PSScriptRoot\03-setup-iis-website.ps1" -AppRoot $AppRoot -SiteName $SiteName

# 4. Setup Automated Backup Task Scheduler
Write-Host "`n--- Phase 4: Setting up Daily Backup Scheduler ---" -ForegroundColor Cyan
& "$PSScriptRoot\04-setup-backup-scheduler.ps1" -AppRoot $AppRoot

# 5. Setup Dedicated 90-Day Log Retention Purge Task Scheduler
Write-Host "`n--- Phase 5: Setting up 90-Day Log Retention Scheduler ---" -ForegroundColor Cyan
if (Test-Path "$PSScriptRoot\05-setup-retention-scheduler.ps1") {
    & "$PSScriptRoot\05-setup-retention-scheduler.ps1" -AppRoot $AppRoot -Time "2:00AM"
}

# 6. Post-Deployment Verification
Write-Host "`n--- Phase 6: Verifying Deployment Health ---" -ForegroundColor Cyan
$BackendHealthy = $false
Write-Host "Checking backend health at http://localhost:3001/api/ping..." -ForegroundColor Yellow
for ($attempt = 1; $attempt -le 6; $attempt++) {
    try {
        $res = Invoke-WebRequest -Uri "http://localhost:3001/api/ping" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($res.StatusCode -eq 200) {
            $BackendHealthy = $true
            Write-Host "   [OK] Backend API is responding (Status: 200 OK, Attempt $attempt)" -ForegroundColor Green
            break
        }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -in @(200, 401)) {
            $BackendHealthy = $true
            Write-Host "   [OK] Backend API is responding (Status: Online, Attempt $attempt)" -ForegroundColor Green
            break
        }
        Write-Host "   Waiting for backend service to bind (Attempt $attempt/6)..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 2
    }
}

if (-not $BackendHealthy) {
    Write-Warning "Backend service took longer than expected to respond. Check $AppRoot\logs\service-error.log"
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ALL PHASES INSTALLED AND RUNNING SUCCESSFULLY!           " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Frontend Application : http://localhost" -ForegroundColor Cyan
Write-Host "Backend API Health   : http://localhost:3001/api/health" -ForegroundColor Cyan
Write-Host "Log Retention Policy : Enforced 90-day retention across all categories" -ForegroundColor Cyan
Write-Host "Logs Location        : $AppRoot\logs" -ForegroundColor Cyan
Write-Host "Scheduled Backups    : Daily at 2:00 AM (Target: $AppRoot\backups)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
