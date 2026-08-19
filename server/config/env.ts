import fs from 'fs';

// Load base .env if present
if (fs.existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {
    console.warn('Could not load .env:', e);
  }
}

// Load .env.local if present (local development overrides)
if (fs.existsSync('.env.local')) {
  try {
    process.loadEnvFile('.env.local');
  } catch (e) {
    console.warn('Could not load .env.local:', e);
  }
}

// Load .env.production if present (production overrides)
if (fs.existsSync('.env.production')) {
  try {
    process.loadEnvFile('.env.production');
  } catch (e) {
    console.warn('Could not load .env.production:', e);
  }
}
