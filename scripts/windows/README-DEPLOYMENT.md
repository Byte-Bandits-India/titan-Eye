# 🚀 Titan Eye — Air-Gapped / Offline Windows Server Deployment & Operations Guide

This package provides a **100% offline, air-gapped production deployment** for Titan Eye on Windows Server (2016, 2019, 2022). No internet connection is required on the target server.

---

## 📂 Flexible Installation Directory (Custom Path Support)

Titan Eye has **zero hardcoded path dependencies**. The application, database, uploads, encrypted logging, and PowerShell automation scripts can be deployed to **ANY folder or drive of your choice**:

| Deployment Scenario | Target Path Example | Command Example |
|---|---|---|
| **Secondary Fast Drive (Recommended)** | `D:\TitanEye` or `D:\apps\titan` | `cd D:\TitanEye\scripts; .\00-INSTALL-OFFLINE-ALL.ps1` |
| **Standard IIS Web Root** | `C:\inetpub\wwwroot\titan` | `cd C:\inetpub\wwwroot\titan\scripts; .\00-INSTALL-OFFLINE-ALL.ps1` |
| **Enterprise Application Partition** | `E:\Services\TitanEye` | `cd E:\Services\TitanEye\scripts; .\00-INSTALL-OFFLINE-ALL.ps1` |

### How Dynamic Path Auto-Detection Works:
- **Zero Configuration Needed**: All automation scripts automatically detect their application root dynamically:
  ```powershell
  $AppRoot = (Split-Path $PSScriptRoot -Parent)
  ```
  Wherever you extract the ZIP archive, the scripts automatically discover the parent directory and configure:
  1. **NSSM Windows Service (`TitanEyeAPI`)**: Working directory (`AppDirectory`) is set directly to your custom path.
  2. **IIS Web Site**: Physical path is pointed to `<AppRoot>\dist`.
  3. **Node.js Express API**: Database, uploads, and logs are resolved relative to `<AppRoot>` (`process.cwd()`).
  4. **Task Scheduler**: Daily backups and 90-day retention purges are scheduled referencing `<AppRoot>`.

---

## 🏛️ System Architecture

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │                     Windows Server                     │
                                    │                                                        │
[Client Browser] ──Port 80/443────► │  IIS (Internet Information Services)                   │
                                    │  ├── Static Files SPA (<AppRoot>\dist\)                │
                                    │  └── URL Rewrite / ARR Proxy Rules                     │
                                    │          │ (Reverse Proxy: /api/* -> Port 3001)        │
                                    │          ▼                                             │
                                    │  NSSM Windows Service: "TitanEyeAPI"                   │
                                    │  └── Node.js Runtime (server.js / dist-server)         │
                                    │          ├── App Working Directory: <AppRoot>          │
                                    │          ├── SQLite Database (WAL mode: database.db)   │
                                    │          ├── Uploads Storage (<AppRoot>\uploads\)      │
                                    │          └── Encrypted Log Subsystem (AES-256-GCM)     │
                                    │              ├── <AppRoot>\logs\audit\       (90d)    │
                                    │              ├── <AppRoot>\logs\signin\      (90d)    │
                                    │              ├── <AppRoot>\logs\err\         (90d)    │
                                    │              └── <AppRoot>\logs\monitoring\  (90d)    │
                                    │                                                        │
                                    │  Windows Task Scheduler: "TitanEye-Daily-Backup"       │
                                    │  └── Backup-Titan.ps1 -AppRoot "<AppRoot>"             │
                                    │      ├── Online SQLite Checkpoint (backup.js)          │
                                    │      ├── 90-Day Log Retention Purge (retentionPurge)  │
                                    │      └── Timestamped Snapshot Archive                  │
                                    └────────────────────────────────────────────────────────┘
```

---

## 📦 What is Included in this Offline Package

1. **Frontend Application (`dist/`)**: Vite React production build with hardened SPA routing rules in `web.config`.
2. **Backend API & Tools (`dist-server/`)**: Compiled Node.js TypeScript Express server and administrative scripts.
3. **Pre-bundled Dependencies (`node_modules/`)**: Complete production `node_modules` with prebuilt Windows x64 native binaries (including `better-sqlite3`).
4. **Offline Installers (`tools/`)**:
   - `node-v20.18.0-x64.msi`: Node.js LTS 64-bit runtime installer.
   - `rewrite_amd64_en-US.msi`: Microsoft IIS URL Rewrite Module 2.1 installer.
   - `requestRouter_amd64.msi`: Microsoft Application Request Routing (ARR) 3.0 installer.
   - `nssm.exe`: Non-Sucking Service Manager for hosting Node.js as a resilient Windows Service.
5. **Automation Suite (`scripts/`)**:
   - `00-INSTALL-OFFLINE-ALL.ps1`: 1-Click master installer with dynamic path auto-detection.
   - `01-install-iis-prerequisites.ps1`: Installs IIS features, URL Rewrite, ARR 3.0, and Node.js.
   - `02-setup-nssm-service.ps1`: Registers and starts the `TitanEyeAPI` Windows Service.
   - `03-setup-iis-website.ps1`: Configures the IIS site, NTFS permissions, and reverse proxying.
   - `04-setup-backup-scheduler.ps1`: Configures Task Scheduler for automated daily backups and 90-day log purges.
   - `Backup-Titan.ps1`: Checkpoint backup and log retention engine.
6. **Configuration**:
   - `.env.example`: Comprehensive environment template with Microsoft Entra ID, ACS, and log encryption keys.

---

## ⚡ Quick 1-Click Installation (Administrator)

### Step 1: Extract Package to Your Chosen Directory
Extract the deployment ZIP archive to your desired application location:
- Example A (Custom Drive): `D:\TitanEye`
- Example B (Default Web Root): `C:\inetpub\wwwroot\titan`

*(In the commands below, replace `<AppRoot>` with your chosen directory path, e.g., `D:\TitanEye`)*

### Step 2: Configure Production Environment (`.env`)
In `<AppRoot>`, copy `.env.example` to `.env`:
```powershell
cd <AppRoot>
Copy-Item .env.example .env
```
Open `.env` in Notepad and verify/configure:
- `PORT=3001`
- `NODE_ENV=production`
- `ALLOWED_ORIGINS=https://titan.xylozentech.com,http://localhost:3001`
- `LOG_ENCRYPTION_ENABLED=true`
- `LOG_ENCRYPTION_KEY=<64-hex-character-key>` *(generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)*
- `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, `ENTRA_REDIRECT_URI`
- `ACS_CONNECTION_STRING`, `ACS_ENDPOINT`, `TEAMS_MEETING_ORGANIZER_UPN`

### Step 3: Run Master Installer
Open **PowerShell as Administrator** and execute:

#### Option A: Auto-Detected (Recommended)
Simply `cd` into the `scripts` folder inside your extracted directory and run the installer without any flags:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd <AppRoot>\scripts
.\00-INSTALL-OFFLINE-ALL.ps1
```
*The installer automatically resolves `$AppRoot` to the parent folder `<AppRoot>`.*

#### Option B: Explicit Custom Path
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd <AppRoot>\scripts
.\00-INSTALL-OFFLINE-ALL.ps1 -AppRoot "D:\TitanEye"
```

The master installer automatically:
- Installs IIS role and required sub-features offline.
- Installs Node.js LTS, URL Rewrite 2.1, and ARR 3.0 offline.
- Enables Application Request Routing proxying with host-header preservation.
- Pre-creates categorized encrypted log directories (`<AppRoot>\logs\audit`, `signin`, `err`, `monitoring`).
- Grants `IIS_IUSRS` full control permissions over `<AppRoot>`.
- Registers and launches the `TitanEyeAPI` Windows Service with auto-restart, pointing to `<AppRoot>`.
- Binds IIS Site `TitanEye` to `<AppRoot>\dist` and routes `/api/*` to `http://localhost:3001`.
- Configures Windows Task Scheduler (`TitanEye-Daily-Backup`) to run daily backups at 2:00 AM.

---

## 🛡️ Log Subsystem, 90-Day Retention & Encryption

All application logs are categorized into 4 subdirectories under `<AppRoot>\logs`:

| Subfolder | Contents | Retention | Security / Integrity |
|---|---|---|---|
| `<AppRoot>\logs\audit\` | Clinical actions, prescription edits, user role updates | **90 Days** | AES-256-GCM Encrypted + SHA-256 Tamper-Evident Hash Chain |
| `<AppRoot>\logs\signin\` | Entra ID and local logins, logouts, auth failures | **90 Days** | AES-256-GCM Encrypted + SHA-256 Tamper-Evident Hash Chain |
| `<AppRoot>\logs\err\` | Unhandled exceptions, crashes, 5xx server errors | **90 Days** | AES-256-GCM Encrypted |
| `<AppRoot>\logs\monitoring\`| HTTP latency, status codes, health checks, memory | **90 Days** | AES-256-GCM Encrypted |

### Encryption-at-Rest Format
Every log line is encrypted independently using AES-256-GCM:
```text
ENC:v1:<12-byte-IV-hex>:<16-byte-AuthTag-hex>:<ciphertext-hex>
```
- **Line-by-line isolation**: If a power outage occurs mid-write, previous lines remain 100% valid and readable.
- **Tamper protection**: The 16-byte GCM Auth Tag prevents undetected modification of stored logs.

---

## 📖 Operational Log CLI Commands

Administrators can inspect, stream, and verify encrypted logs using the included Node.js CLI tools:

```powershell
cd <AppRoot>

# 1. Decrypt and view monitoring logs in terminal
npm run logs:decrypt -- logs/monitoring/monitoring-2026-11-03.log

# 2. Decrypt and view audit logs
npm run logs:decrypt -- logs/audit/audit-2026-11-03.log

# 3. Decrypt and view sign-in logs
npm run logs:decrypt -- logs/signin/signin-2026-11-03.log

# 4. Decrypt and view error logs
npm run logs:decrypt -- logs/err/error-2026-11-03.log

# 5. Bulk decrypt an entire directory
npm run logs:decrypt -- logs/audit

# 6. Export decrypted logs to a file
npm run logs:decrypt -- logs/audit/audit-2026-11-03.log --out logs/audit-decrypted.json

# 7. Live stream / tail logs in plaintext (--tail)
npm run logs:tail -- logs/monitoring/monitoring-2026-11-03.log

# 8. Verify tamper-proof cryptographic hash chain
npm run verify-logs

# 9. Force run 90-day retention purge
npm run purge-logs
```

---

## 💾 Automated Backup & Disaster Recovery

### What Gets Backed Up
The automated backup runs daily at **2:00 AM** via Windows Task Scheduler (`TitanEye-Daily-Backup`):
1. **Online SQLite Checkpoint**: Uses `better-sqlite3` native checkpoint backup (`dist-server/scripts/backup.js`). Safe during active application writes.
2. **Log Retention Purge**: Prunes logs exceeding 90 days across all 4 categories.
3. **Uploads Directory**: All patient documents, images, and attachments (`<AppRoot>\uploads\`).
4. **Environment Secrets**: Active `<AppRoot>\.env` file.
5. **Codebase Snapshot**: `dist/`, `dist-server/`, `server.js`, `web.config`, and `package.json`.
6. **Archive Compression & Retention**: Compressed into timestamped archive `titan-backup-YYYYMMDD_HHMMSS.zip` (default retention: 14 days). Default backup directory is `D:\TitanBackups` (or falls back to `<AppRoot>\backups` if `D:\` drive is not present).

### Manual Backup Run
```powershell
# Auto-detects AppRoot
& "<AppRoot>\scripts\Backup-Titan.ps1"

# Or with custom backup target directory
& "<AppRoot>\scripts\Backup-Titan.ps1" -AppRoot "<AppRoot>" -BackupDir "D:\TitanBackups"
```

### Disaster Recovery: Restoring from Backup
To restore Titan Eye from a backup ZIP:
1. Stop the Windows Service:
   ```powershell
   Stop-Service TitanEyeAPI
   ```
2. Extract the backup archive to a temporary directory:
   ```powershell
   Expand-Archive -Path "D:\TitanBackups\titan-backup-<TIMESTAMP>.zip" -DestinationPath "C:\temp\restore"
   ```
3. Copy restored items back to `<AppRoot>`:
   ```powershell
   Copy-Item "C:\temp\restore\database.db" "<AppRoot>\database.db" -Force
   Copy-Item "C:\temp\restore\uploads\*" "<AppRoot>\uploads" -Recurse -Force
   Copy-Item "C:\temp\restore\.env" "<AppRoot>\.env" -Force
   ```
4. Restart the service:
   ```powershell
   Start-Service TitanEyeAPI
   ```

---

## 🔍 Verification & Health Checks

| Check | PowerShell Command | Expected Result |
|---|---|---|
| **Backend API Health** | `Invoke-RestMethod http://localhost:3001/api/health` | `{"status":"ok", ...}` |
| **Windows Service Status** | `Get-Service TitanEyeAPI` | `Status: Running` |
| **IIS Site Status** | `Get-Website -Name TitanEye` | `State: Started` |
| **Service Stdout Log** | `Get-Content <AppRoot>\logs\service-out.log -Tail 20` | Server listening on port 3001 |
| **Service Stderr Log** | `Get-Content <AppRoot>\logs\service-error.log -Tail 20` | Empty (no unhandled crashes) |
| **Security Log Verification**| `npm run verify-logs` | Chains verified intact |

---

## 🛠️ Step-by-Step Phased Installation (Optional)

If your organization prefers executing installation steps individually:

```powershell
cd <AppRoot>\scripts

# Step 1: Install IIS, URL Rewrite, ARR 3.0, and Node.js
.\01-install-iis-prerequisites.ps1

# Step 2: Configure & start TitanEyeAPI Windows Service (Auto-detects AppRoot)
.\02-setup-nssm-service.ps1 -AppRoot "<AppRoot>"

# Step 3: Configure IIS Website & Reverse Proxy
.\03-setup-iis-website.ps1 -AppRoot "<AppRoot>" -SiteName "TitanEye"

# Step 4: Configure Daily Backup & Retention Task Scheduler
.\04-setup-backup-scheduler.ps1 -AppRoot "<AppRoot>"

# Step 5: Configure Dedicated 90-Day Log Retention Purge Task Scheduler
.\05-setup-retention-scheduler.ps1 -AppRoot "<AppRoot>" -Time "2:00AM"
```

---

## 🔒 Service Management Cheat Sheet

```powershell
# Restart the Node backend service
Restart-Service TitanEyeAPI

# Stop the Node backend service
Stop-Service TitanEyeAPI

# Start the Node backend service
Start-Service TitanEyeAPI

# View live service console output
Get-Content <AppRoot>\logs\service-out.log -Wait

# Recycle IIS application pool
Restart-WebAppPool -Name "DefaultAppPool"
```
