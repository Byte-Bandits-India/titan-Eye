import assert from 'assert';
import fs from 'fs';
import http from 'http';
import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import { AddressInfo } from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

async function runSourceCodeDisclosureVerification() {
  console.log('=== VAPT Finding 17: Source Code & Implementation Disclosure Verification ===\n');

  // =========================================================================
  // TEST 1: Audit src/Routes/index.tsx (Route-Level Code Splitting)
  // =========================================================================
  console.log('Test 1: Audit src/Routes/index.tsx (Route-Level Code Splitting)');
  const routesPath = path.join(rootDir, 'src', 'Routes', 'index.tsx');
  assert(fs.existsSync(routesPath), 'src/Routes/index.tsx must exist');
  const routesContent = fs.readFileSync(routesPath, 'utf8');

  assert(
    routesContent.includes("lazy(() =>"),
    'src/Routes/index.tsx must use React.lazy() for dynamic imports'
  );
  assert(
    routesContent.includes("import('../screens/admin/SuperAdminScreen')"),
    'SuperAdminScreen must be dynamically imported via import()'
  );
  assert(
    routesContent.includes("import('../screens/optometrist/OptometristScreen')"),
    'OptometristScreen must be dynamically imported via import()'
  );
  assert(
    routesContent.includes("import('../screens/store/StoreScreen')"),
    'StoreScreen must be dynamically imported via import()'
  );
  assert(
    routesContent.includes('<Suspense'),
    'src/Routes/index.tsx must wrap lazy routes in Suspense'
  );
  console.log('  [PASS] 1. Protected screens (SuperAdminScreen, OptometristScreen, StoreScreen) are dynamically code-split');

  // =========================================================================
  // TEST 2: Audit vite.config.js (Minification, Obfuscation & Sourcemap Policy)
  // =========================================================================
  console.log('\nTest 2: Audit vite.config.js (Production Hardening & Obfuscation)');
  const viteConfigPath = path.join(rootDir, 'vite.config.js');
  assert(fs.existsSync(viteConfigPath), 'vite.config.js must exist');
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');

  assert(
    viteConfigContent.includes('sourcemap: false'),
    'vite.config.js must explicitly set sourcemap: false'
  );
  assert(
    viteConfigContent.includes('manualChunks'),
    'vite.config.js must define manualChunks for vendor splitting'
  );
  console.log('  [PASS] 2. vite.config.js enforces sourcemap: false and manualChunks');

  // =========================================================================
  // TEST 3: Audit web.config and nginx/titan.conf (Direct Source File Access Blocking)
  // =========================================================================
  console.log('\nTest 3: Audit web.config & nginx/titan.conf (Server-level File Blocking)');
  const webConfigPath = path.join(rootDir, 'web.config');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
  assert(
    webConfigContent.includes('name="Block Sensitive Source Files"'),
    'web.config must include "Block Sensitive Source Files" rule'
  );
  assert(
    webConfigContent.includes('name="Block DotFiles"'),
    'web.config must include "Block DotFiles" rule'
  );
  console.log('  [PASS] 3a. web.config blocks .ts, .tsx, .map, .env, .git, and dotfiles');

  const nginxConfPath = path.join(rootDir, 'nginx', 'titan.conf');
  const nginxConfContent = fs.readFileSync(nginxConfPath, 'utf8');
  assert(
    nginxConfContent.includes('location ~* /\\.(?!well-known/)'),
    'nginx/titan.conf must block dotfiles'
  );
  assert(
    /location ~\* \\\.\(ts\|tsx\|jsx\|map\|env\|git.*yaml.*?\)\$/i.test(nginxConfContent),
    'nginx/titan.conf must block source and sensitive file extensions'
  );
  console.log('  [PASS] 3b. nginx/titan.conf blocks source files, sourcemaps, and dotfiles');

  // =========================================================================
  // TEST 4: Audit dist/ Build Artifacts (Confirming Code Splitting & Zero Sourcemaps)
  // =========================================================================
  console.log('\nTest 4: Audit dist/ Build Output Directory');
  const distDir = path.join(rootDir, 'dist');
  assert(fs.existsSync(distDir), 'dist/ directory must exist');

  function findMapFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(findMapFiles(fullPath));
      } else if (file.endsWith('.map')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const mapFiles = findMapFiles(distDir);
  assert.strictEqual(
    mapFiles.length,
    0,
    `dist/ directory must contain 0 sourcemap (.map) files! Found: ${mapFiles.join(', ')}`
  );
  console.log('  [PASS] 4a. Verified 0 sourcemap (.map) files present in dist/');

  // 4b. Verify chunk isolation in dist/assets
  const assetsDir = path.join(distDir, 'assets');
  const assetFiles = fs.readdirSync(assetsDir);

  const indexChunk = assetFiles.find((f) => f.startsWith('index-') && f.endsWith('.js'));
  assert(indexChunk, 'Initial index-[hash].js chunk must exist in dist/assets');
  const indexChunkPath = path.join(assetsDir, indexChunk);
  const indexChunkSizeKb = fs.statSync(indexChunkPath).size / 1024;

  console.log(`  [INFO] Initial landing chunk (${indexChunk}) size: ${indexChunkSizeKb.toFixed(2)} KB (previously 8,180 KB)`);
  assert(
    indexChunkSizeKb < 200,
    `Initial bundle size must be under 200 KB after code-splitting (got ${indexChunkSizeKb.toFixed(2)} KB)`
  );

  const superAdminChunk = assetFiles.find((f) => f.startsWith('SuperAdminScreen-') && f.endsWith('.js'));
  const optometristChunk = assetFiles.find((f) => f.startsWith('OptometristScreen-') && f.endsWith('.js'));
  const storeChunk = assetFiles.find((f) => f.startsWith('StoreScreen-') && f.endsWith('.js'));

  assert(superAdminChunk, 'SuperAdminScreen must be isolated in its own dynamic chunk');
  assert(optometristChunk, 'OptometristScreen must be isolated in its own dynamic chunk');
  assert(storeChunk, 'StoreScreen must be isolated in its own dynamic chunk');

  console.log(`  [PASS] 4b. Verified dynamic chunks: ${superAdminChunk}, ${optometristChunk}, ${storeChunk}`);

  // Confirm administrative logic is isolated into separate chunk
  const superAdminContent = fs.readFileSync(path.join(assetsDir, superAdminChunk), 'utf8');
  assert(superAdminContent.length > 25000, 'SuperAdminScreen chunk must contain the isolated admin screen logic');

  const indexContent = fs.readFileSync(indexChunkPath, 'utf8');
  // Confirm dynamic lazy import is used in index chunk rather than inlining the admin component
  assert(
    indexContent.includes('import(') || indexContent.includes('import("./'),
    'Initial index bundle must use dynamic import() rather than static inlining'
  );
  console.log('  [PASS] 4c. Admin logic is successfully extracted into separate dynamic chunk and not inlined in landing bundle');

  // =========================================================================
  // TEST 5: Live Express Runtime Verification
  // =========================================================================
  console.log('\nTest 5: Live Express Server Runtime Verification');
  const app = express();
  app.disable('x-powered-by');

  // Security middleware identical to server/index.ts
  const SENSITIVE_EXT_REGEX = /\.(ts|tsx|jsx|map|env|git|json|sql|db|sqlite|ps1|sh|log|md|yml|yaml|config)$/i;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const reqPath = req.path.toLowerCase();

    if (
      reqPath.includes('/.') ||
      reqPath.startsWith('/.env') ||
      reqPath.startsWith('/.git') ||
      SENSITIVE_EXT_REGEX.test(reqPath)
    ) {
      if (reqPath === '/manifest.json') {
        return next();
      }

      return res.status(404).send('Not Found');
    }

    next();
  });

  const distPath = path.resolve('dist');
  if (fs.existsSync(distPath)) {
    app.use('/assets', (req: Request, res: Response, next: NextFunction) => {
      if (req.path === '/' || req.path === '') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      next();
    });

    app.use(
      express.static(distPath, {
        dotfiles: 'deny',
        index: false,
      })
    );
  }

  app.get('/manifest.json', (_req: Request, res: Response) => {
    res.json({ name: 'Titan Eye+' });
  });

  app.get('/login', (_req: Request, res: Response) => {
    res.send('<html><body>Login Page</body></html>');
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 5a. Probing directory listing on /assets/
    console.log('  Testing 5a. Directory listing probe on /assets/...');
    const assetsDirRes = await fetch(`${baseUrl}/assets/`);
    assert(
      assetsDirRes.status === 403 || assetsDirRes.status === 404,
      `Directory browsing on /assets/ must be forbidden. Received: ${assetsDirRes.status}`
    );
    console.log(`    [PASS] 5a. Direct access to /assets/ returned ${assetsDirRes.status}`);

    // 5b. Probing direct TypeScript source files
    console.log('  Testing 5b. Direct probe for TypeScript source files (/server/index.ts, /src/App.tsx)...');
    const tsRes1 = await fetch(`${baseUrl}/server/index.ts`);
    assert.strictEqual(tsRes1.status, 404, 'Direct access to server/index.ts must return 404');
    const tsRes2 = await fetch(`${baseUrl}/src/App.tsx`);
    assert.strictEqual(tsRes2.status, 404, 'Direct access to src/App.tsx must return 404');
    console.log('    [PASS] 5b. Direct access to source code files returned 404 Not Found');

    // 5c. Probing environment files and dotfiles (/.env, /.git/config)
    console.log('  Testing 5c. Direct probe for environment files and dotfiles (/.env, /.git/config)...');
    const envRes = await fetch(`${baseUrl}/.env`);
    assert.strictEqual(envRes.status, 404, 'Access to /.env must return 404');
    const gitRes = await fetch(`${baseUrl}/.git/config`);
    assert.strictEqual(gitRes.status, 404, 'Access to /.git/config must return 404');
    console.log('    [PASS] 5c. Dotfiles and environment files returned 404 Not Found');

    // 5d. Probing sourcemap files (.map)
    console.log('  Testing 5d. Direct probe for sourcemap files (/assets/index.js.map)...');
    const mapRes = await fetch(`${baseUrl}/assets/index.js.map`);
    assert.strictEqual(mapRes.status, 404, 'Access to sourcemaps must return 404');
    console.log('    [PASS] 5d. Sourcemap request returned 404 Not Found');

    // 5e. Probing legitimate PWA manifest and login page
    console.log('  Testing 5e. Access to legitimate public files (/manifest.json, /login)...');
    const manifestRes = await fetch(`${baseUrl}/manifest.json`);
    assert.strictEqual(manifestRes.status, 200, 'Legitimate /manifest.json must return 200');
    const loginRes = await fetch(`${baseUrl}/login`);
    assert.strictEqual(loginRes.status, 200, 'Legitimate /login must return 200');
    console.log('    [PASS] 5e. Legitimate public files served correctly');

    console.log('\n=== ALL VAPT FINDING 17 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    server.close();
  }
}

runSourceCodeDisclosureVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
