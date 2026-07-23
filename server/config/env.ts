import fs from 'fs';

const mode = process.env.NODE_ENV || 'development';

if (mode === 'production' && fs.existsSync('.env.production')) {
  process.loadEnvFile('.env.production');
} else if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
} else if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}
