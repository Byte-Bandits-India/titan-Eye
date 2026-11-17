<#
.SYNOPSIS
    Updates or creates Admin credentials in SQLite database and .env configuration.
#>
[CmdletBinding()]
param (
    [string]$AppRoot = "D:\apps\titan",
    [string]$Email = "admin@titan.in",
    [Parameter(Mandatory=$true)]
    [string]$Password
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $AppRoot)) {
    if (Test-Path ".\database.db") {
        $AppRoot = (Get-Location).Path
    } else {
        throw "Target application directory not found: $AppRoot"
    }
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Updating Titan Eye Admin Credentials              " -ForegroundColor Cyan
Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
Write-Host " Admin Email:      $Email" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$jsCode = @"
const crypto = require('crypto');
const Database = require('better-sqlite3');
const path = require('path');

const email = process.argv[2];
const pwd = process.argv[3];
const dbPath = path.join(process.argv[4], 'database.db');

const db = new Database(dbPath);

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(pwd, salt, 64).toString('hex');
const storedPassword = salt + ':' + hash;

const existing = db.prepare('SELECT email FROM users WHERE LOWER(email) = LOWER(?)').get(email);
if (existing) {
  db.prepare('UPDATE users SET password = ?, role = ?, status = ?, failedLoginAttempts = 0, lockedUntil = NULL, microsoftUpn = ? WHERE LOWER(email) = LOWER(?)').run(storedPassword, 'admin', 'active', email, email);
  console.log('[OK] Successfully updated existing user ' + email + ' in SQLite database.');
} else {
  db.prepare('INSERT INTO users (email, name, role, status, password, microsoftUpn, failedLoginAttempts, lockedUntil) VALUES (?, ?, ?, ?, ?, ?, 0, NULL)').run(email, 'Admin', 'admin', 'active', storedPassword, email);
  console.log('[OK] Successfully created new admin user ' + email + ' in SQLite database.');
}

const checkUser = db.prepare('SELECT email, password FROM users WHERE LOWER(email) = LOWER(?)').get(email);
const [s, h] = checkUser.password.split(':');
const verifyHash = crypto.scryptSync(pwd, s, 64).toString('hex');
const isOk = crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(verifyHash, 'hex'));

if (isOk) {
  console.log('[OK] Verification passed: Password matches perfectly.');
} else {
  console.error('[ERROR] Verification failed.');
  process.exit(1);
}
"@

$tempJs = Join-Path $AppRoot "temp-set-admin.cjs"
Set-Content -Path $tempJs -Value $jsCode -Encoding utf8

try {
    & node $tempJs $Email $Password $AppRoot
} finally {
    if (Test-Path $tempJs) {
        Remove-Item $tempJs -Force -ErrorAction SilentlyContinue
    }
}

# Update .env
$envPath = Join-Path $AppRoot ".env"
if (Test-Path $envPath) {
    $c = Get-Content $envPath -Raw
    if ($c -match "(?m)^ADMIN_EMAIL=") {
        $c = [regex]::Replace($c, "(?m)^ADMIN_EMAIL=.*", "ADMIN_EMAIL=$Email")
    } else {
        $c += "`r`nADMIN_EMAIL=$Email"
    }
    if ($c -match "(?m)^ADMIN_PASSWORD=") {
        $c = [regex]::Replace($c, "(?m)^ADMIN_PASSWORD=.*", "ADMIN_PASSWORD=$Password")
    } else {
        $c += "`r`nADMIN_PASSWORD=$Password"
    }
    Set-Content -Path $envPath -Value $c.Trim() -Encoding utf8
    Write-Host "[OK] Updated .env with ADMIN_EMAIL and ADMIN_PASSWORD" -ForegroundColor Green
}

# Restart Service if installed
$svc = Get-Service -Name "TitanEyeAPI" -ErrorAction SilentlyContinue
if ($svc) {
    Write-Host "Restarting TitanEyeAPI Windows Service..." -ForegroundColor Yellow
    Restart-Service -Name "TitanEyeAPI" -Force
    Write-Host "[OK] TitanEyeAPI service restarted successfully." -ForegroundColor Green
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Admin Credentials Updated Successfully!            " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

