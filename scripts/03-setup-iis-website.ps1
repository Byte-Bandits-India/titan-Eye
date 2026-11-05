<#
.SYNOPSIS
    Configures IIS Web Site, NTFS Permissions, and Bindings for Titan Eye.
#>
[CmdletBinding()]
param (
    [string]$AppRoot     = "",
    [string]$SiteName    = "TitanEye",
    [string]$HostName    = "titan.xylozentech.com",
    [string]$CertPath    = "",
    [string]$CertPassword= ""
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
Write-Host " Step 3: Configuring IIS Web Site & Permissions    " -ForegroundColor Cyan
Write-Host " Application Root: $AppRoot" -ForegroundColor Cyan
Write-Host " Site Name:        $SiteName" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# 1. Set NTFS Permissions for IIS_IUSRS and IUSR (instant container inheritance, no slow /T on node_modules)
Write-Host "`n1. Applying NTFS Folder Permissions..." -ForegroundColor Yellow
try {
    cmd /c "icacls `"$AppRoot`" /grant IIS_IUSRS:(OI)(CI)F /grant IUSR:(OI)(CI)RX /C /Q >nul 2>&1"
    Write-Host "   [OK] NTFS Permissions applied to $AppRoot" -ForegroundColor Green
} catch {
    Write-Warning "icacls command warning: $_"
}

# 2. Ensure web.config is inside dist folder for IIS SPA & Reverse Proxy routing
$distPath = Join-Path $AppRoot "dist"
if (-not (Test-Path $distPath)) {
    New-Item -Path $distPath -ItemType Directory -Force | Out-Null
}

# Apply explicit permissions to dist folder as well (instant)
cmd /c "icacls `"$distPath`" /grant IIS_IUSRS:(OI)(CI)F /grant IUSR:(OI)(CI)RX /C /Q >nul 2>&1"

$webConfigSrc = Join-Path $AppRoot "web.config"
$webConfigDest = Join-Path $distPath "web.config"

if (Test-Path $webConfigSrc) {
    Copy-Item -Path $webConfigSrc -Destination $webConfigDest -Force
    Write-Host "   [OK] web.config verified in $distPath" -ForegroundColor Green
} else {
    Write-Warning "web.config not found at $webConfigSrc"
}

# 3. Create or Update IIS Web Site
Write-Host "`n2. Configuring IIS Website '$SiteName'..." -ForegroundColor Yellow
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue

    # Resolve port 80 binding conflicts with Default Web Site
    if (Test-Path "IIS:\Sites\Default Web Site") {
        Write-Host "   Disabling conflicting port 80 binding on Default Web Site..." -ForegroundColor Yellow
        Stop-WebSite -Name "Default Web Site" -ErrorAction SilentlyContinue
        Get-WebBinding -Name "Default Web Site" -Port 80 -ErrorAction SilentlyContinue | Remove-WebBinding -ErrorAction SilentlyContinue
    }

    if (Test-Path "IIS:\Sites\$SiteName") {
        Write-Host "   Updating existing IIS site '$SiteName'..." -ForegroundColor Yellow
        Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $distPath
        $hasBinding = Get-WebBinding -Name $SiteName -Port 80 -Protocol http -ErrorAction SilentlyContinue
        if (-not $hasBinding) {
            New-WebBinding -Name $SiteName -Port 80 -Protocol http -IPAddress "*" -ErrorAction SilentlyContinue | Out-Null
        }
    } else {
        New-WebSite -Name $SiteName -Port 80 -PhysicalPath $distPath -ApplicationPool "DefaultAppPool" -Force | Out-Null
        Write-Host "   [OK] Created IIS Site '$SiteName' pointing to $distPath" -ForegroundColor Green
    }

    # Ensure application pool and website are running
    Start-WebAppPool -Name "DefaultAppPool" -ErrorAction SilentlyContinue
    Start-WebSite -Name $SiteName -ErrorAction SilentlyContinue
    Write-Host "   [OK] IIS Site '$SiteName' is ACTIVE on port 80" -ForegroundColor Green
} catch {
    Write-Warning "IIS Configuration warning: $_"
}

# 4. Optional SSL Certificate Binding
if ($CertPath -and (Test-Path $CertPath)) {
    Write-Host "`n3. Importing and Binding SSL Certificate..." -ForegroundColor Yellow
    try {
        $securePass = ConvertTo-SecureString $CertPassword -AsPlainText -Force
        $cert = Import-PfxCertificate -FilePath $CertPath -CertStoreLocation Cert:\LocalMachine\My -Password $securePass

        $existingHttps = Get-WebBinding -Name $SiteName -Protocol https -ErrorAction SilentlyContinue
        if (-not $existingHttps) {
            New-WebBinding -Name $SiteName -Protocol https -Port 443 -IPAddress "*" | Out-Null
        }
        $binding = Get-Item "IIS:\Sites\$SiteName" | Get-WebBinding -Protocol https
        $binding.AddSslCertificate($cert.GetCertHashString(), "My")
        Write-Host "   [OK] SSL Certificate attached to HTTPS port 443 (Thumbprint: $($cert.Thumbprint))" -ForegroundColor Green
    } catch {
        Write-Warning "SSL binding encountered an issue: $_"
    }
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host " Step 3 Completed Successfully!                     " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan
