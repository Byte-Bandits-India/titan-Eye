<#
.SYNOPSIS
    Configures and starts TitanEyeAPI Windows Service using offline NSSM.
#>
[CmdletBinding()]
param (
    [string]$AppRoot  = "",
    [string]$ToolsDir = "",
    [string]$ServiceName = "TitanEyeAPI"
)

$ErrorActionPreference = "Stop"

# Auto-resolve AppRoot
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

# Auto-resolve ToolsDir
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

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Step 2: Configuring Titan Eye Windows Service     " -ForegroundColor Cyan
Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
Write-Host " Service Name:     $ServiceName" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Locate NSSM executable
$NssmCandidates = @(
    (Join-Path $ToolsDir "nssm.exe"),
    (Join-Path $AppRoot "tools\nssm.exe"),
    (Join-Path $PSScriptRoot "..\tools\nssm.exe"),
    "C:\tools\nssm.exe",
    "C:\titan\tools\nssm.exe"
)
$NssmExe = ""
foreach ($cand in $NssmCandidates) {
    if (Test-Path $cand) {
        $NssmExe = (Resolve-Path $cand).Path
        break
    }
}
if (-not $NssmExe) {
    $cmd = Get-Command nssm -ErrorAction SilentlyContinue
    if ($cmd) { $NssmExe = $cmd.Source }
}

if (-not $NssmExe) {
    throw "nssm.exe not found in $ToolsDir or standard directories. Please verify tools folder."
}
Write-Host "   [OK] NSSM binary: $NssmExe" -ForegroundColor Green

# Locate Node.js executable
$NodeExe = ""
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $NodeExe = $nodeCmd.Source
} else {
    $nodePaths = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe"
    )
    foreach ($np in $nodePaths) {
        if (Test-Path $np) {
            $NodeExe = $np
            break
        }
    }
}

if (-not $NodeExe) {
    throw "node.exe not found on system. Please run 01-install-iis-prerequisites.ps1 first."
}
Write-Host "   [OK] Node.js binary: $NodeExe" -ForegroundColor Green

# Verify server.js entrypoint exists
$ServerJs = Join-Path $AppRoot "server.js"
if (-not (Test-Path $ServerJs)) {
    throw "server.js entrypoint not found at $ServerJs. Verify application deployment."
}

# Ensure logs directory and 4 categories (audit, signin, err, monitoring)
$LogsDir = Join-Path $AppRoot "logs"
if (-not (Test-Path $LogsDir)) {
    New-Item -Path $LogsDir -ItemType Directory -Force | Out-Null
}
foreach ($sub in @("audit", "signin", "err", "monitoring")) {
    $subDir = Join-Path $LogsDir $sub
    if (-not (Test-Path $subDir)) {
        New-Item -Path $subDir -ItemType Directory -Force | Out-Null
    }
}

# Stop and remove existing service if present
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Stopping and removing existing $ServiceName service..." -ForegroundColor Yellow
    if ($existing.Status -eq "Running") {
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    }
    cmd /c "`"$NssmExe`" stop `"$ServiceName`" >nul 2>&1"
    Start-Sleep -Seconds 2
    cmd /c "`"$NssmExe`" remove `"$ServiceName`" confirm >nul 2>&1"
    Start-Sleep -Seconds 1
}

# Install service with NSSM using cmd /c to avoid PowerShell NativeCommandError
Write-Host "Installing $ServiceName using NSSM..." -ForegroundColor Yellow
cmd /c "`"$NssmExe`" install `"$ServiceName`" `"$NodeExe`" `"server.js`" >nul 2>&1"

# Configure service settings
cmd /c "`"$NssmExe`" set `"$ServiceName`" AppDirectory `"$AppRoot`" >nul 2>&1"
cmd /c "`"$NssmExe`" set `"$ServiceName`" AppParameters `"server.js`" >nul 2>&1"
cmd /c "`"$NssmExe`" set `"$ServiceName`" Start SERVICE_AUTO_START >nul 2>&1"
cmd /c "`"$NssmExe`" set `"$ServiceName`" AppStdout `"$LogsDir\service-out.log`" >nul 2>&1"
cmd /c "`"$NssmExe`" set `"$ServiceName`" AppStderr `"$LogsDir\service-error.log`" >nul 2>&1"
cmd /c "`"$NssmExe`" set `"$ServiceName`" AppRestartDelay 3000 >nul 2>&1"
cmd /c "`"$NssmExe`" set `"$ServiceName`" AppEnvironmentExtra NODE_ENV=production PORT=3001 >nul 2>&1"

# Start service
Write-Host "Starting $ServiceName service..." -ForegroundColor Yellow
Start-Service -Name $ServiceName -ErrorAction SilentlyContinue

# Verify running status with polling up to 10s
$isRunning = $false
for ($i = 0; $i -lt 5; $i++) {
    Start-Sleep -Seconds 2
    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        $isRunning = $true
        break
    }
}

if ($isRunning) {
    Write-Host "   [OK] $ServiceName service is RUNNING" -ForegroundColor Green
} else {
    Write-Warning "$ServiceName status: $($svc.Status). Check $LogsDir\service-error.log"
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Step 2 Completed Successfully!                     " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
