#!/usr/bin/env node

/**
 * Plesk Node.js Startup Script
 * This script handles the startup process for Plesk deployment
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Bulwark CMS Backend on Plesk...');
console.log('📁 Working Directory:', __dirname);
console.log('⏰ Start Time:', new Date().toISOString());

// Check if production environment file exists
const envProdPath = path.join(__dirname, '.env.production');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envProdPath)) {
    console.log('📝 Using production environment file');
    fs.copyFileSync(envProdPath, envPath);
    console.log('✅ Environment file copied to .env');
} else {
    console.log('⚠️  Production environment file not found, using existing .env');
}

// Set production environment
process.env.NODE_ENV = 'production';

console.log('🚀 Starting server directly...');

// Import and start the server directly instead of spawning
try {
    // Import the server module
    const serverModule = await import('./server.js');
    console.log('✅ Server module loaded successfully');
} catch (error) {
    console.error('❌ Failed to load server module:', error);
    process.exit(1);
}
