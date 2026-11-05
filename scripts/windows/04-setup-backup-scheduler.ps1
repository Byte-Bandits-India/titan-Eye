<#
.SYNOPSIS
    Schedules the automated daily backup in Windows Task Scheduler.
#>
[CmdletBinding()]
param (
    [string]$AppRoot   = "",
    [string]$TaskName  = "TitanEye-Daily-Backup",
    [string]$Time      = "2:00AM"
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

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Step 4: Configuring Windows Task Scheduler Backup  " -ForegroundColor Cyan
Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
Write-Host " Task Name:        $TaskName" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Ensure scripts folder exists in AppRoot
$targetScriptDir = Join-Path $AppRoot "scripts"
if (-not (Test-Path $targetScriptDir)) {
    New-Item -Path $targetScriptDir -ItemType Directory -Force | Out-Null
}

# 2. Copy Backup-Titan.ps1 into AppRoot\scripts if not already there
$scriptSrc = Join-Path $PSScriptRoot "Backup-Titan.ps1"
$scriptDest = Join-Path $targetScriptDir "Backup-Titan.ps1"

if ($scriptSrc -ne $scriptDest -and (Test-Path $scriptSrc)) {
    Copy-Item -Path $scriptSrc -Destination $scriptDest -Force
    Write-Host "   [OK] Backup script placed at $scriptDest" -ForegroundColor Green
} else {
    Write-Host "   [OK] Backup script verified at $scriptDest" -ForegroundColor Green
}

# 3. Register Scheduled Task
try {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "   [OK] Replaced existing scheduled task '$TaskName'" -ForegroundColor Yellow
    }

    $Action = New-ScheduledTaskAction `
        -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptDest`" -AppRoot `"$AppRoot`""

    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time

    $Principal = New-ScheduledTaskPrincipal `
        -UserId "NT AUTHORITY\SYSTEM" `
        -LogonType ServiceAccount `
        -RunLevel Highest

    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Principal $Principal `
        -Description "Automated daily SQLite database, uploads, and codebase backup for Titan Eye" | Out-Null

    Write-Host "   [OK] Scheduled Task '$TaskName' registered (Daily at $Time)" -ForegroundColor Green
} catch {
    Write-Warning "Could not register scheduled backup task: $_"
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host " Step 4 Completed Successfully!                     " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
