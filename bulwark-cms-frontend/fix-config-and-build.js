import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Fixing configuration and building frontend...');

// Step 1: Update config.js with correct URL
const configPath = path.join(__dirname, 'src', 'config.js');
const configContent = `// Production Configuration for Plesk Deployment
export const config = {
  // Update with your Plesk backend domain
  apiUrl: 'https://backend.quirky-perlman.208-109-228-217.plesk.page/api',
  frontendUrl: 'https://quirky-perlman.208-109-228-217.plesk.page',
  environment: 'production'
};

// Helper function to get current API URL
export const getApiUrl = () => {
  return config.apiUrl;
};`;

fs.writeFileSync(configPath, configContent);
console.log('✅ Updated config.js with correct backend URL');

// Step 2: Update config.production.js as well
const configProdPath = path.join(__dirname, 'src', 'config.production.js');
fs.writeFileSync(configProdPath, configContent);
console.log('✅ Updated config.production.js with correct backend URL');

// Step 3: Clean and build
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  if (fs.existsSync('plesk-build')) {
    fs.rmSync('plesk-build', { recursive: true, force: true });
  }
} catch (e) {
  console.log('⚠️  Cleanup warning:', e.message);
}

// Step 4: Build the application
console.log('🔨 Building React application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 5: Create plesk-build directory
console.log('📦 Creating deployment package...');
const pleskBuildDir = path.join(__dirname, 'plesk-build');
fs.mkdirSync(pleskBuildDir, { recursive: true });

// Copy all files from dist to plesk-build
const distDir = path.join(__dirname, 'dist');
const files = fs.readdirSync(distDir);

files.forEach(file => {
  const srcPath = path.join(distDir, file);
  const destPath = path.join(pleskBuildDir, file);
  
  if (fs.statSync(srcPath).isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    fs.copyFileSync(srcPath, destPath);
  }
});

// Create .htaccess for client-side routing
const htaccessContent = `RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</FilesMatch>

# Don't cache HTML files
<FilesMatch "\.(html)$">
    ExpiresActive On
    ExpiresDefault "access plus 0 seconds"
    Header set Cache-Control "no-cache, no-store, must-revalidate"
    Header set Pragma "no-cache"
</FilesMatch>`;

fs.writeFileSync(path.join(pleskBuildDir, '.htaccess'), htaccessContent);

console.log('✅ Deployment package created in plesk-build/ directory');
console.log('📁 Upload contents of plesk-build/ to your Plesk public_html/ directory');
console.log('🔧 Make sure to clear browser cache after upload!');
