import fs from 'fs';

// Load environment variables natively in Node 20+ before other imports execute
if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
} else if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}
