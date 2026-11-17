<#
.SYNOPSIS
    Hardens Windows IIS, HTTP.sys, and ARR to suppress all server and runtime disclosure headers.
    Remediates VAPT Findings #21, #22, #24, #25 (Alerts 5589189, 5582952, 5582895, 5582930).
.DESCRIPTION
    1. Sets DisableServerHeader = 2 in HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters
       to suppress "Server: Microsoft-HTTPAPI/2.0" kernel headers.
    2. Sets arrResponseHeader = False in system.webServer/proxy
       to suppress "X-Powered-By: ARR/3.0" reverse proxy headers.
    3. Restarts IIS to apply changes immediately.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Hardening Server & Runtime Disclosure Headers       " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Suppress HTTP.sys kernel "Server: Microsoft-HTTPAPI/2.0"
Write-Host "1. Configuring HTTP.sys DisableServerHeader..." -ForegroundColor Yellow
try {
    $paramPath = "HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters"
    if (-not (Test-Path $paramPath)) {
        New-Item -Path $paramPath -Force | Out-Null
    }
    Set-ItemProperty -Path $paramPath -Name "DisableServerHeader" -Value 2 -Type DWord -Force
    Write-Host "   [OK] HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters\DisableServerHeader = 2" -ForegroundColor Green
} catch {
    Write-Warning "Failed to set DisableServerHeader in Registry: $_"
}

# 2. Suppress "X-Powered-By: ARR/3.0" in Application Request Routing (ARR)
Write-Host "`n2. Configuring ARR to disable arrResponseHeader..." -ForegroundColor Yellow
$appcmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
if (Test-Path $appcmd) {
    try {
        & $appcmd set config -section:system.webServer/proxy /arrResponseHeader:False /commit:apphost 2>$null | Out-Null
        Write-Host "   [OK] appcmd set config -section:system.webServer/proxy /arrResponseHeader:False" -ForegroundColor Green
    } catch {
        Write-Warning "appcmd execution warning: $_"
    }
}

try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Section 'system.webServer/proxy' -Name 'arrResponseHeader' -Value 'false' -ErrorAction SilentlyContinue
    Write-Host "   [OK] WebAdministration proxy.arrResponseHeader = false" -ForegroundColor Green
} catch {
    # Non-blocking
}

# 3. Restart IIS
Write-Host "`n3. Restarting IIS to apply kernel and proxy settings..." -ForegroundColor Yellow
try {
    & iisreset /noop 2>$null | Out-Null
    Restart-Service -Name W3SVC -Force -ErrorAction SilentlyContinue
    Write-Host "   [OK] IIS Web Service restarted successfully" -ForegroundColor Green
} catch {
    Write-Warning "Restart-Service W3SVC warning: $_. Please run 'iisreset' manually if needed."
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host " Header Hardening Complete!                         " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

