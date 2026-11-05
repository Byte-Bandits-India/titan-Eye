<#
.SYNOPSIS
    Registers a dedicated Windows Scheduled Task for the 90-Day Log Retention Purge.
#>
[CmdletBinding()]
param (
    [string]$AppRoot   = "",
    [string]$TaskName  = "TitanEye-90Day-LogRetention",
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

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Configuring Windows Task Scheduler for 90-Day Log Purge " -ForegroundColor Cyan
Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
Write-Host " Task Name:        $TaskName" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Resolve absolute path to node.exe
$nodePath = ""
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $nodePath = $nodeCmd.Source
} else {
    $candidates = @(
        "C:\Program Files\nodejs\node.exe",
        "C:\Program Files (x86)\nodejs\node.exe"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $nodePath = $cand
            break
        }
    }
}

if (-not $nodePath) {
    $nodePath = "node.exe"
}

# 2. Ensure dist-server/scripts/retentionPurge.js exists
$purgeScript = Join-Path $AppRoot "dist-server\scripts\retentionPurge.js"
if (-not (Test-Path $purgeScript)) {
    Write-Host "   Compiling server TypeScript..." -ForegroundColor Yellow
    Push-Location $AppRoot
    if (Test-Path "node_modules\typescript\bin\tsc") {
        & node node_modules\typescript\bin\tsc -p tsconfig.server.json
    }
    Pop-Location
}

# 3. Unregister existing task if present
try {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "   [OK] Replaced existing task '$TaskName'" -ForegroundColor Yellow
    }

    # 4. Define Action, Trigger, and Principal
    $Action = New-ScheduledTaskAction `
        -Execute $nodePath `
        -Argument "dist-server/scripts/retentionPurge.js" `
        -WorkingDirectory $AppRoot

    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time

    $Principal = New-ScheduledTaskPrincipal `
        -UserId "NT AUTHORITY\SYSTEM" `
        -LogonType ServiceAccount `
        -RunLevel Highest

    # 5. Register Task
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $Action `
        -Trigger $Trigger `
        -Principal $Principal `
        -Description "Titan Eye Automated 90-Day Log Retention Purge (Audit, Err, Monitoring, Signin)" | Out-Null

    Write-Host "   [OK] Scheduled Task '$TaskName' registered successfully!" -ForegroundColor Green
    Write-Host "   [OK] Schedule: Runs Daily at $Time" -ForegroundColor Green
    Write-Host "   [OK] Account:  NT AUTHORITY\SYSTEM (Highest RunLevel)" -ForegroundColor Green
    Write-Host "   [OK] Command:  $nodePath dist-server/scripts/retentionPurge.js" -ForegroundColor Green
} catch {
    Write-Warning "Could not register 90-day retention task: $_"
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " Step 5 Completed Successfully!                           " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
