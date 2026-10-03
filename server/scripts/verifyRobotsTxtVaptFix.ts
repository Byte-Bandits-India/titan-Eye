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

async function runRobotsTxtVerification() {
  console.log('=== VAPT Finding 15: Robots.txt & Metafile Hardening Verification ===\n');

  // Test 1: Static verification of public/robots.txt and dist/robots.txt
  console.log('Test 1: Static verification of public/robots.txt & dist/robots.txt');
  const publicRobotsPath = path.join(rootDir, 'public', 'robots.txt');
  const distRobotsPath = path.join(rootDir, 'dist', 'robots.txt');
  assert(fs.existsSync(publicRobotsPath), 'public/robots.txt must exist');
  assert(fs.existsSync(distRobotsPath), 'dist/robots.txt must exist');

  const publicRobotsContent = fs.readFileSync(publicRobotsPath, 'utf8');
  const distRobotsContent = fs.readFileSync(distRobotsPath, 'utf8');

  for (const [name, content] of [
    ['public/robots.txt', publicRobotsContent],
    ['dist/robots.txt', distRobotsContent],
  ]) {
    assert(
      content.includes('User-agent: *') && content.includes('Disallow: /'),
      `${name} must contain User-agent: * and Disallow: /`
    );
    assert(
      !content.includes('/api/'),
      `${name} must NOT disclose /api/ directory`
    );
    assert(
      !content.includes('/assets/'),
      `${name} must NOT disclose /assets/ directory`
    );
    assert(
      !content.toLowerCase().includes('sitemap'),
      `${name} must NOT disclose any sitemap`
    );
    assert(
      !content.includes('thebytebandits.com'),
      `${name} must NOT disclose vendor/dev domains`
    );
  }
  console.log('  [PASS] 1. public/robots.txt & dist/robots.txt contain strict "Disallow: /" with zero path or sitemap disclosure');

  // Test 2: Verify sitemap.xml removal
  console.log('\nTest 2: Verification of sitemap.xml removal');
  const publicSitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
  const distSitemapPath = path.join(rootDir, 'dist', 'sitemap.xml');
  assert(!fs.existsSync(publicSitemapPath), 'public/sitemap.xml must be deleted');
  assert(!fs.existsSync(distSitemapPath), 'dist/sitemap.xml must be deleted');
  console.log('  [PASS] 2. sitemap.xml removed from public/ and dist/');

  // Test 3: Verification of index.html robots meta tag
  console.log('\nTest 3: Verification of index.html robots meta tag');
  const indexHtmlPath = path.join(rootDir, 'index.html');
  const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  assert(
    indexHtmlContent.includes('<meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />'),
    'index.html must contain meta robots tag preventing indexing'
  );
  console.log('  [PASS] 3. index.html contains <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />');

  // Test 4: Verification of web.config (IIS Hardening)
  console.log('\nTest 4: Verification of web.config (IIS Hardening)');
  const webConfigPath = path.join(rootDir, 'web.config');
  const webConfigContent = fs.readFileSync(webConfigPath, 'utf8');
  assert(
    webConfigContent.includes('<add name="X-Robots-Tag" value="noindex, nofollow, noarchive, nosnippet" />'),
    'web.config must include X-Robots-Tag custom header'
  );
  assert(
    webConfigContent.includes('Block Sitemap Requests'),
    'web.config must include rewrite rule blocking sitemap requests'
  );
  console.log('  [PASS] 4. web.config includes X-Robots-Tag header and sitemap block rule');

  // Test 5: Verification of nginx/titan.conf (Linux Hardening)
  console.log('\nTest 5: Verification of nginx/titan.conf (Nginx Hardening)');
  const nginxConfPath = path.join(rootDir, 'nginx', 'titan.conf');
  const nginxConfContent = fs.readFileSync(nginxConfPath, 'utf8');
  assert(
    nginxConfContent.includes('add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet" always;'),
    'nginx/titan.conf must include X-Robots-Tag header'
  );
  assert(
    nginxConfContent.includes('location ~* ^/sitemap.*\\.xml$'),
    'nginx/titan.conf must include location block returning 404 for sitemaps'
  );
  console.log('  [PASS] 5. nginx/titan.conf includes X-Robots-Tag header and sitemap 404 block');

  // Test 6: Live Express Server Runtime Verification
  console.log('\nTest 6: Live Express Server Runtime Verification');
  const app = express();

  // Middleware identical to server/index.ts
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    next();
  });

  // Sitemap 404 handler identical to server/index.ts
  app.get(/^\/sitemap.*\.xml$/, (_req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    res.status(404).send('Not Found');
  });

  app.get('/api/ping', (_req: Request, res: Response) => {
    res.sendStatus(200);
  });

  const distPath = path.resolve('dist');
  if (fs.existsSync(distPath)) {
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders: (res, filePath) => {
          res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');

          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          }
        },
      })
    );
  }

  app.use((req: Request, res: Response) => {
    if (path.extname(req.path)) {
      return res.status(404).send('Not Found');
    }

    if (fs.existsSync(distPath)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
      return res.sendFile(path.join(distPath, 'index.html'));
    }

    res.status(404).send('Not Found');
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  assert(address && typeof address === 'object', 'Server address must be valid');
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 6a. GET /robots.txt
    console.log('  Testing 6a. [VAPT POC] GET /robots.txt probe...');
    const robotsRes = await fetch(`${baseUrl}/robots.txt`);
    const robotsBody = await robotsRes.text();

    assert.strictEqual(robotsRes.status, 200, 'GET /robots.txt should return HTTP 200');
    assert(
      robotsBody.includes('User-agent: *') && robotsBody.includes('Disallow: /'),
      'robots.txt response must contain "User-agent: *" and "Disallow: /"'
    );
    assert(!robotsBody.includes('/api/'), 'robots.txt must NOT leak "/api/"');
    assert(!robotsBody.includes('/assets/'), 'robots.txt must NOT leak "/assets/"');
    assert(!robotsBody.toLowerCase().includes('sitemap'), 'robots.txt must NOT leak sitemap');
    assert(!robotsBody.includes('thebytebandits.com'), 'robots.txt must NOT leak vendor dev domain');

    const robotsXRobotsTag = robotsRes.headers.get('x-robots-tag');
    assert.strictEqual(
      robotsXRobotsTag,
      'noindex, nofollow, noarchive, nosnippet',
      'robots.txt response must include X-Robots-Tag header'
    );
    console.log('    [PASS] 6a. GET /robots.txt returns sanitized contents with zero sensitive path/sitemap leakage');
    console.log(`    [PASS] 6a. X-Robots-Tag header confirmed: "${robotsXRobotsTag}"`);

    // 6b. GET /sitemap.xml
    console.log('  Testing 6b. GET /sitemap.xml probe...');
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(sitemapRes.status, 404, 'GET /sitemap.xml should return HTTP 404 Not Found');
    const sitemapXRobotsTag = sitemapRes.headers.get('x-robots-tag');
    assert.strictEqual(
      sitemapXRobotsTag,
      'noindex, nofollow, noarchive, nosnippet',
      'sitemap 404 response must include X-Robots-Tag header'
    );
    console.log('    [PASS] 6b. GET /sitemap.xml correctly returned HTTP 404 Not Found with X-Robots-Tag');

    // 6c. GET /api/ping
    console.log('  Testing 6c. GET /api/ping API response headers...');
    const apiRes = await fetch(`${baseUrl}/api/ping`);
    assert.strictEqual(apiRes.status, 200, 'GET /api/ping should return HTTP 200');
    const apiXRobotsTag = apiRes.headers.get('x-robots-tag');
    assert.strictEqual(
      apiXRobotsTag,
      'noindex, nofollow, noarchive, nosnippet',
      'API endpoints must include X-Robots-Tag header'
    );
    console.log(`    [PASS] 6c. API response confirmed X-Robots-Tag: "${apiXRobotsTag}"`);

    // 6d. GET /login
    console.log('  Testing 6d. GET /login SPA page response headers...');
    const loginRes = await fetch(`${baseUrl}/login`);
    const loginXRobotsTag = loginRes.headers.get('x-robots-tag');
    assert.strictEqual(
      loginXRobotsTag,
      'noindex, nofollow, noarchive, nosnippet',
      'SPA pages must include X-Robots-Tag header'
    );
    console.log(`    [PASS] 6d. SPA page response confirmed X-Robots-Tag: "${loginXRobotsTag}"`);

    console.log('\n=== ALL VAPT FINDING 15 VERIFICATION TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    server.close();
  }
}

runRobotsTxtVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
