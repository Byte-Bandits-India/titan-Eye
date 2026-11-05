<#
.SYNOPSIS
    Installs IIS, URL Rewrite Module 2.1, ARR 3.0, and Node.js v24 completely offline.
#>
[CmdletBinding()]
param (
    [string]$ToolsDir = ""
)

$ErrorActionPreference = "Stop"

# Auto-resolve ToolsDir if not provided
if (-not $ToolsDir) {
    $candidates = @(
        (Join-Path (Split-Path $PSScriptRoot -Parent) "tools"),
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
        $ToolsDir = Join-Path (Split-Path $PSScriptRoot -Parent) "tools"
    }
} else {
    $ToolsDir = [System.IO.Path]::GetFullPath($ToolsDir)
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Step 1: Installing IIS Features & Offline Prereqs " -ForegroundColor Cyan
Write-Host " Tools Source: $ToolsDir" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Enable IIS Windows Features
Write-Host "1. Enabling IIS Features..." -ForegroundColor Yellow
$Features = @(
    "Web-Server", "Web-WebServer", "Web-Common-Http", "Web-Static-Content",
    "Web-Default-Doc", "Web-Http-Errors", "Web-Http-Redirect", "Web-Http-Logging",
    "Web-Request-Monitor", "Web-Filtering", "Web-Stat-Compression", "Web-Dyn-Compression",
    "Web-Mgmt-Console"
)

if (Get-Command Get-WindowsFeature -ErrorAction SilentlyContinue) {
    $missingFeatures = @()
    foreach ($feature in $Features) {
        $chk = Get-WindowsFeature -Name $feature -ErrorAction SilentlyContinue
        if ($chk -and $chk.Installed) {
            Write-Host "   [OK] Already installed: $feature" -ForegroundColor DarkGray
        } else {
            $missingFeatures += $feature
        }
    }

    if ($missingFeatures.Count -gt 0) {
        Write-Host "   Installing missing features: $($missingFeatures -join ', ')..." -ForegroundColor Yellow
        try {
            Install-WindowsFeature -Name $missingFeatures -ErrorAction Stop | Out-Null
            Write-Host "   [OK] IIS Features installed successfully" -ForegroundColor Green
        } catch {
            Write-Warning "Install-WindowsFeature encountered an issue: $_"
        }
    } else {
        Write-Host "   [OK] All required IIS Features are already active" -ForegroundColor Green
    }
} else {
    Write-Host "   [INFO] Get-WindowsFeature not available (Non-Server OS). Assuming IIS features are enabled." -ForegroundColor DarkGray
}

# 2. Install / Upgrade Node.js (Ensures v24 ABI 137 for better-sqlite3 compatibility)
Write-Host "`n2. Checking Node.js runtime..." -ForegroundColor Yellow
$needsNodeInstall = $true
$installedVersion = ""

# Ensure standard Node path is in session
if (Test-Path "C:\Program Files\nodejs\node.exe") {
    if ($env:Path -notlike "*C:\Program Files\nodejs*") {
        $env:Path = "C:\Program Files\nodejs;" + $env:Path
    }
}

try {
    $verOut = & node -v 2>$null
    if ($verOut -and $verOut.StartsWith("v")) {
        $installedVersion = $verOut.Trim()
        $major = [int]($installedVersion.Substring(1).Split(".")[0])
        if ($major -ge 24) {
            $needsNodeInstall = $false
            Write-Host "   [OK] Node.js is already up-to-date ($installedVersion, ABI 137)" -ForegroundColor Green
        } else {
            Write-Host "   Detected older Node.js version ($installedVersion). Upgrading to Node.js v24 (ABI 137)..." -ForegroundColor Yellow
            $needsNodeInstall = $true
        }
    }
} catch {
    $needsNodeInstall = $true
}

if ($needsNodeInstall) {
    $nodeMsi = Get-ChildItem -Path $ToolsDir -Filter "node-v*.msi" -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if ($nodeMsi -and (Test-Path $nodeMsi.FullName)) {
        Write-Host "   Installing Node.js from $($nodeMsi.Name)..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i `"$($nodeMsi.FullName)`" /qn /norestart" -Wait
        $env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $newVer = & node -v 2>$null
        Write-Host "   [OK] Node.js installed/upgraded successfully ($newVer)" -ForegroundColor Green
    } else {
        Write-Warning "Node.js installer not found in $ToolsDir"
    }
}

# 3. Install IIS URL Rewrite Module 2.1
Write-Host "`n3. Checking IIS URL Rewrite Module 2.1..." -ForegroundColor Yellow
$rewriteDll = "$env:SystemRoot\System32\inetsrv\rewrite.dll"
if (Test-Path $rewriteDll) {
    Write-Host "   [OK] IIS URL Rewrite Module is already installed" -ForegroundColor Green
} else {
    $rewriteMsi = Join-Path $ToolsDir "rewrite_amd64_en-US.msi"
    if (Test-Path $rewriteMsi) {
        Write-Host "   Installing IIS URL Rewrite Module 2.1..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i `"$rewriteMsi`" /qn /norestart" -Wait
        Write-Host "   [OK] IIS URL Rewrite Module installed" -ForegroundColor Green
    } else {
        Write-Warning "URL Rewrite installer not found at $rewriteMsi"
    }
}

# 4. Install IIS Application Request Routing (ARR) 3.0
Write-Host "`n4. Checking Application Request Routing (ARR 3.0)..." -ForegroundColor Yellow
$arrDll = "$env:SystemRoot\System32\inetsrv\requestRouter.dll"
if (Test-Path $arrDll) {
    Write-Host "   [OK] Application Request Routing (ARR 3.0) is already installed" -ForegroundColor Green
} else {
    $arrMsi = Join-Path $ToolsDir "requestRouter_amd64.msi"
    if (Test-Path $arrMsi) {
        Write-Host "   Installing Application Request Routing (ARR 3.0)..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i `"$arrMsi`" /qn /norestart" -Wait
        Write-Host "   [OK] Application Request Routing (ARR) installed" -ForegroundColor Green
    } else {
        Write-Warning "ARR installer not found at $arrMsi"
    }
}

# 5. Enable ARR proxy mode
Write-Host "`n5. Enabling ARR proxy mode..." -ForegroundColor Yellow
$appcmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
if (Test-Path $appcmd) {
    try {
        & $appcmd set config -section:system.webServer/proxy /enabled:True /commit:apphost 2>$null | Out-Null
        Write-Host "   [OK] ARR Proxy mode enabled via appcmd.exe" -ForegroundColor Green
    } catch {
        Write-Warning "Could not enable ARR proxy via appcmd. Trying WebAdministration..."
    }
}

try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Section 'system.webServer/proxy' -Name 'enabled' -Value 'true' -ErrorAction SilentlyContinue
} catch {
    # Non-blocking since appcmd already configured proxy
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host " Step 1 Completed Successfully!                     " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
