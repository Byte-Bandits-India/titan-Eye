import fs from 'fs';

if (fs.existsSync('.env')) {
  try {
    process.loadEnvFile('.env');
  } catch (e) {
    console.warn('Could not load .env:', e);
  }
}

if (fs.existsSync('.env.local')) {
  try {
    process.loadEnvFile('.env.local');
  } catch (e) {
    console.warn('Could not load .env.local:', e);
  }
}

if (fs.existsSync('.env.production')) {
  try {
    process.loadEnvFile('.env.production');
  } catch (e) {
    console.warn('Could not load .env.production:', e);
  }
}
