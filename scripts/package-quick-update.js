import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const localDataDir = path.join(rootDir, 'localData');
const quickPkgDir = path.join(localDataDir, 'quick-update');
const zipFilePath = path.join(localDataDir, 'titan-update-D-apps-titan.zip');

console.log('====================================================');
console.log('   Creating Fast Production Update Package           ');
console.log('   Target Directory: D:\\apps\\titan                ');
console.log('   Domain: trvc.titan.in                            ');
console.log('====================================================\n');

// 1. Prepare clean directory
if (fs.existsSync(quickPkgDir)) {
  fs.rmSync(quickPkgDir, { recursive: true, force: true });
}
fs.mkdirSync(quickPkgDir, { recursive: true });

// Helper to copy directory
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// 2. Copy dist (Frontend)
console.log('1. Copying latest compiled frontend (dist)...');
copyDirSync(path.join(rootDir, 'dist'), path.join(quickPkgDir, 'dist'));
if (fs.existsSync(path.join(rootDir, 'web.config'))) {
  fs.copyFileSync(path.join(rootDir, 'web.config'), path.join(quickPkgDir, 'dist', 'web.config'));
}

// 3. Copy dist-server (Backend)
console.log('2. Copying latest compiled backend (dist-server)...');
copyDirSync(path.join(rootDir, 'dist-server'), path.join(quickPkgDir, 'dist-server'));

// 4. Copy root files
console.log('3. Copying configuration and server files...');
for (const file of ['server.js', 'web.config', 'package.json', 'package-lock.json']) {
  const src = path.join(rootDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(quickPkgDir, file));
    console.log(`   ✓ Copied ${file}`);
  }
}

// 5. Copy scripts
console.log('4. Copying deployment & update automation scripts...');
const scriptsDir = path.join(quickPkgDir, 'scripts');
copyDirSync(path.join(rootDir, 'scripts', 'windows'), scriptsDir);
console.log('   ✓ Copied scripts (including 00-UPDATE-EXISTING.ps1 & disable-iis-server-header.ps1)');

// 6. Copy .env template
const envExample = path.join(rootDir, '.env.production.example');
if (fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, path.join(quickPkgDir, '.env.example'));
  console.log('   ✓ Copied .env.example (configured for trvc.titan.in)');
}

// 7. Create 1-click update.cmd
console.log('5. Creating 1-click update.cmd launcher...');
const updateCmdContent = `@echo off
setlocal EnableDelayedExpansion
title Titan Eye - Fast Production Update

:: Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ================================================================
    echo  ERROR: ADMINISTRATOR PRIVILEGES REQUIRED
    echo ================================================================
    echo  This update script must be run as an Administrator.
    echo  Please right-click on update.cmd and select "Run as administrator".
    echo ================================================================
    echo.
    pause
    exit /b 1
)

echo ================================================================
echo    TITAN EYE - FAST PRODUCTION UPDATE LAUNCHER
echo    Target: D:\\apps\\titan (or auto-detected directory)
echo ================================================================
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0scripts\\00-UPDATE-EXISTING.ps1' -AppRoot 'D:\\apps\\titan'"

set "PS_EXIT=!errorlevel!"
if !PS_EXIT! neq 0 (
    echo.
    echo ================================================================
    echo  UPDATE FAILED (Exit Code: !PS_EXIT!)
    echo ================================================================
    echo.
    pause
    exit /b !PS_EXIT!
)

echo.
echo ================================================================
echo  TITAN EYE SUCCESSFULLY UPDATED IN PRODUCTION!
echo ================================================================
pause
`;
fs.writeFileSync(path.join(quickPkgDir, 'update.cmd'), updateCmdContent, 'utf8');
console.log('   ✓ Created update.cmd');

// 8. Security verification check
console.log('6. Security verification check (zero secrets/DBs)...');
function verify(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    const lower = item.name.toLowerCase();
    if (lower === '.env' || (lower.startsWith('.env.') && !lower.includes('example')) || lower.endsWith('.db') || lower.endsWith('.sqlite')) {
      throw new Error(`CRITICAL: Prohibited file found: ${full}`);
    }
    if (item.isDirectory()) verify(full);
  }
}
verify(quickPkgDir);
console.log('   ✓ Security check passed.');

// 9. Create ZIP archive
console.log('7. Compressing quick update archive...');
if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);

execSync(`tar.exe -a -c -f "${zipFilePath}" -C "${quickPkgDir}" .`, { stdio: 'inherit' });

const stats = fs.statSync(zipFilePath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('\n====================================================');
console.log('   Fast Update ZIP Successfully Created!');
console.log(`   Path: ${zipFilePath}`);
console.log(`   Size: ${sizeMB} MB`);
console.log('====================================================\n');

