<#
.SYNOPSIS
    Titan Eye Production Automated Backup Script
.DESCRIPTION
    1. Triggers SQLite online backup via better-sqlite3 (checkpoint safe).
    2. Archives database, uploads/, .env, and codebase.
    3. Prunes archives older than retention days (default: 14 days).
#>
[CmdletBinding()]
param (
    [string]$AppRoot    = "",
    [string]$BackupDir  = "D:\TitanBackups",
    [int]$RetentionDays = 14
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

# Verify backup target drive exists; fallback to $AppRoot\backups if drive is not found
$drive = Split-Path $BackupDir -Qualifier
if ($drive -and -not (Test-Path "$drive\")) {
    Write-Warning "Target drive '$drive' not found on system. Defaulting backup directory to $AppRoot\backups"
    $BackupDir = Join-Path $AppRoot "backups"
}

if (-not (Test-Path $BackupDir)) {
    New-Item -Path $BackupDir -ItemType Directory -Force | Out-Null
}

$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$TempDir = Join-Path $BackupDir "temp_$Timestamp"
$ZipTarget = Join-Path $BackupDir "titan-backup-$Timestamp.zip"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " [Titan Eye] Starting Production Backup: $Timestamp" -ForegroundColor Cyan
Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
Write-Host " Backup Directory: $BackupDir" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

try {
    New-Item -Path $TempDir -ItemType Directory -Force | Out-Null

    # 1. Trigger safe online SQLite checkpoint backup
    Write-Host "`n1. Running safe online SQLite checkpoint backup..." -ForegroundColor Yellow
    Push-Location $AppRoot
    if (Test-Path "dist-server\scripts\backup.js") {
        & node dist-server/scripts/backup.js
    }
    
    # 1b. Enforce 90-day log retention policy across audit, signin, err, and monitoring
    Write-Host "`n1b. Running 90-day log retention purge..." -ForegroundColor Yellow
    if (Test-Path "dist-server\scripts\retentionPurge.js") {
        & node dist-server/scripts/retentionPurge.js
    }
    Pop-Location

    $LatestDb = Get-ChildItem -Path (Join-Path $AppRoot "backups") -Filter "database-*.db" -ErrorAction SilentlyContinue | 
                Sort-Object LastWriteTime -Descending | Select-Object -First 1

    if ($LatestDb) {
        Copy-Item -Path $LatestDb.FullName -Destination (Join-Path $TempDir "database.db") -Force
        Write-Host "   [OK] Online DB checkpoint backed up: $($LatestDb.Name)" -ForegroundColor Green
    } elseif (Test-Path (Join-Path $AppRoot "database.db")) {
        Copy-Item -Path (Join-Path $AppRoot "database.db*") -Destination $TempDir -Force
        Write-Host "   [OK] Local DB file copied" -ForegroundColor Yellow
    }

    # 2. Backup Uploads
    $UploadsDir = Join-Path $AppRoot "uploads"
    if (Test-Path $UploadsDir) {
        Copy-Item -Path $UploadsDir -Destination (Join-Path $TempDir "uploads") -Recurse -Force
        Write-Host "   [OK] Uploads folder archived" -ForegroundColor Green
    }

    # 3. Backup .env Configuration
    $EnvFile = Join-Path $AppRoot ".env"
    if (Test-Path $EnvFile) {
        Copy-Item -Path $EnvFile -Destination (Join-Path $TempDir ".env") -Force
        Write-Host "   [OK] Production .env configuration archived" -ForegroundColor Green
    }

    # 4. Backup Codebase Build
    $CodeDir = Join-Path $TempDir "codebase"
    New-Item -Path $CodeDir -ItemType Directory -Force | Out-Null
    foreach ($item in @("dist", "dist-server", "server.js", "web.config", "package.json")) {
        $src = Join-Path $AppRoot $item
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination (Join-Path $CodeDir $item) -Recurse -Force
        }
    }
    Write-Host "   [OK] Codebase release files archived" -ForegroundColor Green

    # 5. Compress Snapshot
    Write-Host "`n5. Compressing snapshot archive..." -ForegroundColor Yellow
    Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipTarget -CompressionLevel Optimal -Force
    Remove-Item -Path $TempDir -Recurse -Force
    Write-Host "   [OK] Backup archive created: $ZipTarget" -ForegroundColor Green

    # 6. Apply Retention Policy
    $Cutoff = (Get-Date).AddDays(-$RetentionDays)
    $OldFiles = Get-ChildItem -Path $BackupDir -Filter "titan-backup-*.zip" | 
                Where-Object { $_.LastWriteTime -lt $Cutoff }

    foreach ($file in $OldFiles) {
        Remove-Item -Path $file.FullName -Force
        Write-Host "   Removed expired backup: $($file.Name)" -ForegroundColor DarkGray
    }

    Write-Host "`n====================================================" -ForegroundColor Green
    Write-Host " Backup Completed Successfully!" -ForegroundColor Green
    Write-Host "====================================================" -ForegroundColor Green
}
catch {
    Write-Error "Backup failed: $_"
    if (Test-Path $TempDir) {
        Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    exit 1
}
