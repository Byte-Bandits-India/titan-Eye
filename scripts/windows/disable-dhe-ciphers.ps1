<#
.SYNOPSIS
    Disables Diffie-Hellman (DHE) key exchange and DHE cipher suites on Windows Schannel (IIS).
    Remediates VAPT Finding 9 - Diffie-Hellman Ephemeral Key Exchange DoS (D(HE)ater).
.DESCRIPTION
    - Disables TLS_DHE_RSA_WITH_AES_128_GCM_SHA256 / TLS_DHE_RSA_WITH_AES_256_GCM_SHA384 (and other DHE suites).
    - Sets Schannel KeyExchangeAlgorithms\Diffie-Hellman Enabled = 0.
    - Ensures KeyExchangeAlgorithms\ECDH stays enabled (forward secrecy through ECDHE).
    - Disables client-initiated TLS renegotiation.
    A reboot is required. Verify afterwards with: nmap --script ssl-enum-ciphers -p 443 <host>
#>
[CmdletBinding()]
param()

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    exit 1
}

$ErrorActionPreference = "Continue"

Write-Host "1. Disabling DHE cipher suites..." -ForegroundColor Yellow
$dheSuites = @(
    "TLS_DHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_DHE_RSA_WITH_AES_256_GCM_SHA384",
    "TLS_DHE_RSA_WITH_AES_128_CBC_SHA",
    "TLS_DHE_RSA_WITH_AES_256_CBC_SHA",
    "TLS_DHE_RSA_WITH_AES_128_CBC_SHA256",
    "TLS_DHE_RSA_WITH_AES_256_CBC_SHA256",
    "TLS_DHE_DSS_WITH_AES_128_CBC_SHA",
    "TLS_DHE_DSS_WITH_AES_256_CBC_SHA"
)
foreach ($suite in $dheSuites) {
    try {
        Disable-TlsCipherSuite -Name $suite -ErrorAction Stop
        Write-Host "   [OK] Disabled $suite" -ForegroundColor Green
    } catch {
        Write-Host "   [--] $suite not present / already disabled" -ForegroundColor DarkGray
    }
}

Write-Host "`n2. Setting Schannel key-exchange algorithms..." -ForegroundColor Yellow
$base = "HKLM:\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL"
function Set-Schannel($path, $enabled) {
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    New-ItemProperty -Path $path -Name "Enabled" -Value $enabled -PropertyType DWord -Force | Out-Null
}
Set-Schannel "$base\KeyExchangeAlgorithms\Diffie-Hellman" 0
Write-Host "   [OK] KeyExchangeAlgorithms\Diffie-Hellman Enabled = 0" -ForegroundColor Green
Set-Schannel "$base\KeyExchangeAlgorithms\ECDH" 0xffffffff
Write-Host "   [OK] KeyExchangeAlgorithms\ECDH Enabled = 0xffffffff (kept enabled)" -ForegroundColor Green

Write-Host "`n3. Disabling server-side TLS renegotiation..." -ForegroundColor Yellow
New-ItemProperty -Path $base -Name "DisableRenegoOnServer" -Value 1 -PropertyType DWord -Force | Out-Null
Write-Host "   [OK] DisableRenegoOnServer = 1" -ForegroundColor Green

Write-Host "`nDone. REBOOT the server for Schannel changes to take effect." -ForegroundColor Cyan
