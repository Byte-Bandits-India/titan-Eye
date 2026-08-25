import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const localDataDir = path.join(rootDir, 'localData');
const deployPkgDir = path.join(localDataDir, 'deploy-package');
const zipFilePath = path.join(localDataDir, 'deploy-package.zip');

// Check CLI arguments (default: bundle node_modules for offline deployment)
const args = process.argv.slice(2);
const includeNodeModules = !args.includes('--no-node-modules');

console.log('====================================================');
console.log('   Starting Production Deployment Package Assembly   ');
console.log(`   Offline node_modules: ${includeNodeModules ? 'INCLUDED' : 'EXCLUDED'}`);
console.log('====================================================\n');

// 1. Build frontend & backend
console.log('1. Building frontend (Vite) and backend (Node/TS)...');
execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

// Function to check if a file or directory should be excluded
function shouldExclude(name) {
  const lower = name.toLowerCase();
  return (
    name === '.DS_Store' ||
    name === 'Thumbs.db' ||
    name === '__MACOSX' ||
    lower.startsWith('.env') ||
    lower.endsWith('.env') ||
    lower.endsWith('.db') ||
    lower.includes('.db-') ||
    lower.endsWith('.sqlite') ||
    lower.endsWith('.sqlite3') ||
    lower.includes('.sqlite-') ||
    lower.endsWith('.log') ||
    lower === 'localdata' ||
    lower === 'data' ||
    lower === 'logs' ||
    lower === 'uploads' ||
    lower === 'scratch'
  );
}

// Helper to copy directory recursively (excluding unwanted files)
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Warning: source directory does not exist: ${src}`);
    return;
  }
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldExclude(entry.name)) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Clean or prepare target deploy-package directory
if (!fs.existsSync(localDataDir)) {
  fs.mkdirSync(localDataDir, { recursive: true });
}

if (fs.existsSync(deployPkgDir)) {
  console.log('\n2. Cleaning existing deploy-package directory...');
  fs.rmSync(deployPkgDir, { recursive: true, force: true });
}
fs.mkdirSync(deployPkgDir, { recursive: true });

// 3. Copy frontend dist
console.log('\n3. Copying frontend build (dist)...');
copyDirSync(path.join(rootDir, 'dist'), path.join(deployPkgDir, 'dist'));

// Ensure web.config is inside dist for IIS SPA routing
if (fs.existsSync(path.join(rootDir, 'web.config'))) {
  fs.copyFileSync(path.join(rootDir, 'web.config'), path.join(deployPkgDir, 'dist', 'web.config'));
}

// 4. Copy backend dist-server
console.log('\n4. Copying compiled backend (dist-server)...');
copyDirSync(path.join(rootDir, 'dist-server'), path.join(deployPkgDir, 'dist-server'));

// 5. Copy root configuration and entrypoint files
console.log('\n5. Copying root server & configuration files...');
const filesToCopy = ['server.js', 'web.config', 'package.json', 'package-lock.json'];
for (const file of filesToCopy) {
  const srcFile = path.join(rootDir, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(deployPkgDir, file));
    console.log(`   ✓ Copied ${file}`);
  }
}

// 6. Bundle node_modules for offline deployment
if (includeNodeModules) {
  console.log('\n6. Bundling production node_modules for offline deployment...');
  const srcNm = path.join(rootDir, 'node_modules');
  const destNm = path.join(deployPkgDir, 'node_modules');

  if (fs.existsSync(srcNm)) {
    if (process.platform === 'win32') {
      execSync(`robocopy "${srcNm}" "${destNm}" /E /XF *.log *.db .DS_Store /XD logs data uploads localData /NP /NFL /NDO || exit 0`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`cp -R "${srcNm}" "${destNm}"`, { stdio: 'inherit' });
    }
    console.log('   ✓ Bundled node_modules with Windows x64 prebuilt native binaries.');
  } else {
    console.warn('   ⚠️ node_modules not found in workspace, skipping.');
  }
}

// 7. Security verification scan (ensure NO .env or .db exists in deploy package)
console.log('\n7. Running security exclusion check on package contents...');
function verifyNoSensitiveFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (
      entry.name.startsWith('.env') ||
      entry.name.endsWith('.db') ||
      entry.name.includes('.db-') ||
      entry.name.endsWith('.sqlite')
    ) {
      throw new Error(`CRITICAL: Prohibited sensitive file found in deploy package: ${fullPath}`);
    }
    if (entry.isDirectory() && entry.name !== 'node_modules') {
      verifyNoSensitiveFiles(fullPath);
    }
  }
}
verifyNoSensitiveFiles(deployPkgDir);
console.log('   ✓ Verified: No .env, .db, or sqlite files are present.');

// 8. Create ZIP archive
console.log('\n8. Creating clean ZIP archive (this may take a moment with node_modules)...');
if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

try {
  if (process.platform === 'win32') {
    execSync(
      `powershell -Command "Compress-Archive -Path '${deployPkgDir}\\*' -DestinationPath '${zipFilePath}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`cd "${deployPkgDir}" && zip -r -q -X "${zipFilePath}" . -x "*.DS_Store" -x "__MACOSX*" -x "*.db" -x "*.db-*" -x "*.env*"`, {
      stdio: 'inherit',
    });
  }
  const stats = fs.statSync(zipFilePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n====================================================`);
  console.log(`   Offline Deployment Package ZIP successfully created!`);
  console.log(`   Path: ${zipFilePath}`);
  console.log(`   Size: ${sizeMB} MB`);
  console.log(`====================================================\n`);
} catch (err) {
  console.error('Error creating ZIP file:', err);
  process.exit(1);
}
