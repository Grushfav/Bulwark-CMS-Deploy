#!/usr/bin/env node

/**
 * Plesk Node.js Startup Script
 * This script handles the startup process for Plesk deployment
 */

import { spawn } from 'child_process';
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
} else {
    console.log('⚠️  Production environment file not found, using existing .env');
}

// Start the server
const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'production'
    }
});

serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

serverProcess.on('exit', (code) => {
    console.log(`🛑 Server exited with code ${code}`);
    process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
});
