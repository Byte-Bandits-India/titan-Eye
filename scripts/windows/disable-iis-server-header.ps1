<#
.SYNOPSIS
    Hardens Windows IIS, HTTP.sys, and ARR to suppress all server and runtime disclosure headers.
    Remediates VAPT Findings 21, 22, 24, 28, 33 (Server / Microsoft-IIS / Microsoft-HTTPAPI / X-Powered-By: ARR).
.DESCRIPTION
    1. Sets DisableServerHeader = 2 in HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters
       (suppresses "Server: Microsoft-HTTPAPI/2.0" and "Server: Microsoft-IIS/10.0").
    2. appcmd: requestFiltering removeServerHeader, ARR arrResponseHeader=False, httpErrors PassThrough.
    3. Allows the RESPONSE_* server variables used by the web.config outbound rules.
    4. Removes WebDAVModule / WebDAV handler at server level.
    5. Restarts the HTTP driver and IIS.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Hardening Server & Runtime Disclosure Headers       " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. HTTP.sys kernel header
Write-Host "1. Configuring HTTP.sys DisableServerHeader..." -ForegroundColor Yellow
try {
    $paramPath = "HKLM:\SYSTEM\CurrentControlSet\Services\HTTP\Parameters"
    if (-not (Test-Path $paramPath)) { New-Item -Path $paramPath -Force | Out-Null }
    Set-ItemProperty -Path $paramPath -Name "DisableServerHeader" -Value 2 -Type DWord -Force
    Write-Host "   [OK] DisableServerHeader = 2" -ForegroundColor Green
} catch {
    Write-Warning "Failed to set DisableServerHeader in Registry: $_"
}

# 2. IIS / ARR configuration via appcmd
$appcmd = "$env:SystemRoot\System32\inetsrv\appcmd.exe"
if (Test-Path $appcmd) {
    Write-Host "`n2. Configuring IIS (requestFiltering, ARR, httpErrors)..." -ForegroundColor Yellow
    & $appcmd set config -section:system.webServer/security/requestFiltering /removeServerHeader:True /commit:apphost | Out-Null
    & $appcmd set config -section:system.webServer/proxy /arrResponseHeader:False /commit:apphost | Out-Null
    & $appcmd set config -section:system.webServer/httpErrors /existingResponse:PassThrough /commit:apphost | Out-Null

    Write-Host "`n3. Allowing outbound-rule server variables..." -ForegroundColor Yellow
    foreach ($v in @("RESPONSE_SERVER", "RESPONSE_X_POWERED_BY", "RESPONSE_X-Powered-By", "RESPONSE_X_ASPNET_VERSION", "RESPONSE_X_ASPNETMVC_VERSION")) {
        & $appcmd set config -section:system.webServer/rewrite/allowedServerVariables /+"[name='$v']" /commit:apphost 2>$null | Out-Null
    }

    Write-Host "`n4. Removing WebDAVModule and WebDAV handler at server level..." -ForegroundColor Yellow
    & $appcmd set config -section:system.webServer/modules /-"[name='WebDAVModule']" /commit:apphost 2>$null | Out-Null
    & $appcmd set config -section:system.webServer/handlers /-"[name='WebDAV']" /commit:apphost 2>$null | Out-Null
    Write-Host "   [OK] appcmd configuration applied" -ForegroundColor Green
} else {
    Write-Warning "appcmd.exe not found - IIS is not installed on this machine."
}

# 5. Restart HTTP driver + IIS (equivalent of: net stop http /y ; net start w3svc)
Write-Host "`n5. Restarting HTTP.sys and IIS (net stop http /y; net start w3svc)..." -ForegroundColor Yellow
try {
    & net stop http /y | Out-Null
    & net start w3svc | Out-Null
    Write-Host "   [OK] HTTP driver and W3SVC restarted" -ForegroundColor Green
} catch {
    Write-Warning "Restart failed: $_. Run 'net stop http /y' then 'net start w3svc' manually."
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host " Header Hardening Complete!                         " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
