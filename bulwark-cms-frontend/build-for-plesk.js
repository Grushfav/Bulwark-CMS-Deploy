#!/usr/bin/env node

/**
 * Build Script for Plesk Deployment
 * This script prepares the frontend for Plesk deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Building Bulwark CMS Frontend for Plesk Deployment...');

try {
  // Step 1: Replace config.js with production config
  console.log('📝 Updating configuration for production...');
  
  const configProdPath = path.join(__dirname, 'src', 'config.production.js');
  const configPath = path.join(__dirname, 'src', 'config.js');
  
  if (fs.existsSync(configProdPath)) {
    fs.copyFileSync(configProdPath, configPath);
    console.log('✅ Configuration updated for production');
  } else {
    console.log('⚠️  Production config not found, using existing config');
  }

  // Step 2: Build the application
  console.log('🔨 Building React application...');
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('✅ Build completed successfully');

  // Step 3: Create deployment package
  console.log('📦 Creating deployment package...');
  
  const distPath = path.join(__dirname, 'dist');
  const pleskPath = path.join(__dirname, 'plesk-build');
  
  // Remove existing plesk-build directory
  if (fs.existsSync(pleskPath)) {
    fs.rmSync(pleskPath, { recursive: true, force: true });
  }
  
  // Create new plesk-build directory
  fs.mkdirSync(pleskPath, { recursive: true });
  
  // Copy dist contents to plesk-build
  execSync(`xcopy "${distPath}\\*" "${pleskPath}\\" /E /I /H /Y`, { 
    stdio: 'inherit',
    shell: true 
  });
  
  // Create .htaccess for Apache (if needed)
  const htaccessContent = `
# Bulwark CMS - Apache Configuration
RewriteEngine On

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Frame-Options DENY
Header always set X-Content-Type-Options nosniff
Header always set X-XSS-Protection "1; mode=block"

# Cache static assets
<FilesMatch "\\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
</FilesMatch>
`;
  
  fs.writeFileSync(path.join(pleskPath, '.htaccess'), htaccessContent);
  
  console.log('✅ Deployment package created in plesk-build/ directory');
  console.log('📁 Upload contents of plesk-build/ to your Plesk public_html/ directory');
  
  // Step 4: Create deployment instructions
  const instructions = `
# Plesk Deployment Instructions

## Frontend Files Ready!
The frontend has been built and prepared for Plesk deployment.

## Upload Instructions:
1. Upload all files from 'plesk-build/' directory to your Plesk 'public_html/' directory
2. Make sure .htaccess file is uploaded (for Apache configuration)
3. Verify file permissions (644 for files, 755 for directories)

## Backend Setup:
1. Upload backend files to a subdirectory like 'api/' or 'backend/'
2. Configure Node.js application in Plesk
3. Set up PostgreSQL database
4. Update environment variables

## Configuration:
- Frontend is configured to use production API URL
- Make sure to update config.js with your actual domain
- SSL certificates should be installed for HTTPS

## Testing:
1. Visit your domain to test frontend
2. Test API endpoints
3. Verify authentication works
4. Check role-based access control

Happy deployment! 🚀
`;
  
  fs.writeFileSync(path.join(__dirname, 'PLESK_DEPLOYMENT_INSTRUCTIONS.txt'), instructions);
  console.log('📋 Deployment instructions saved to PLESK_DEPLOYMENT_INSTRUCTIONS.txt');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
