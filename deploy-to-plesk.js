#!/usr/bin/env node

/**
 * Complete Plesk Deployment Script
 * This script prepares both backend and frontend for Plesk deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Preparing Bulwark CMS for Plesk Deployment...');
console.log('⏰ Start Time:', new Date().toISOString());

try {
  // Create deployment directory
  const deployDir = path.join(__dirname, 'plesk-deployment');
  
  if (fs.existsSync(deployDir)) {
    console.log('🗑️  Cleaning existing deployment directory...');
    fs.rmSync(deployDir, { recursive: true, force: true });
  }
  
  fs.mkdirSync(deployDir, { recursive: true });
  console.log('📁 Created deployment directory:', deployDir);

  // Step 1: Prepare Backend
  console.log('\n🔧 Preparing Backend...');
  
  const backendDir = path.join(deployDir, 'backend');
  const sourceBackendDir = path.join(__dirname, 'bulwark-cms-backend');
  
  // Copy backend files
  execSync(`xcopy "${sourceBackendDir}" "${backendDir}" /E /I /H /Y`, { 
    stdio: 'inherit',
    shell: true 
  });
  
  // Update package.json for production
  const packageJsonPath = path.join(backendDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Remove devDependencies for production
  delete packageJson.devDependencies;
  
  // Update scripts for production
  packageJson.scripts = {
    start: "node plesk-startup.js",
    postinstall: "npm run db:push"
  };
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('✅ Backend prepared');

  // Step 2: Prepare Frontend
  console.log('\n🎨 Preparing Frontend...');
  
  const frontendDir = path.join(deployDir, 'frontend');
  const sourceFrontendDir = path.join(__dirname, 'bulwark-cms-frontend');
  
  // Update frontend config for production
  const configProdPath = path.join(sourceFrontendDir, 'src', 'config.production.js');
  const configPath = path.join(sourceFrontendDir, 'src', 'config.js');
  
  if (fs.existsSync(configProdPath)) {
    fs.copyFileSync(configProdPath, configPath);
    console.log('📝 Updated frontend configuration for production');
  }

  // Build frontend
  console.log('🔨 Building frontend...');
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: sourceFrontendDir 
  });
  
  // Copy built frontend
  const distPath = path.join(sourceFrontendDir, 'dist');
  execSync(`xcopy "${distPath}\\*" "${frontendDir}\\" /E /I /H /Y`, { 
    stdio: 'inherit',
    shell: true 
  });
  
  // Add .htaccess for Apache
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
  
  fs.writeFileSync(path.join(frontendDir, '.htaccess'), htaccessContent);
  
  console.log('✅ Frontend prepared');

  // Step 3: Create deployment documentation
  console.log('\n📋 Creating deployment documentation...');
  
  const deploymentGuide = `
# Bulwark CMS - Plesk Deployment Package

## 📦 Package Contents

This deployment package contains:

### Backend (backend/ directory)
- Complete Node.js application
- Production-ready configuration
- Database migration scripts
- All dependencies listed in package.json

### Frontend (frontend/ directory)
- Built React application
- Optimized static files
- Apache configuration (.htaccess)
- Production configuration

## 🚀 Deployment Steps

### 1. Database Setup
1. Create PostgreSQL database in Plesk
2. Update DATABASE_URL in backend/.env.production
3. Run database migrations: \`npm run db:push\`

### 2. Backend Deployment
1. Upload backend/ directory to your Plesk hosting
2. Configure Node.js application in Plesk:
   - Application Root: backend/
   - Application Startup File: plesk-startup.js
   - Node.js Version: 18+
3. Install dependencies: \`npm install\`
4. Start the application

### 3. Frontend Deployment
1. Upload all files from frontend/ directory to public_html/
2. Ensure .htaccess file is uploaded
3. Set proper file permissions (644 for files, 755 for directories)

### 4. Domain Configuration
1. Update CORS_ORIGIN in backend/.env.production
2. Update API URL in frontend configuration
3. Configure SSL certificates
4. Set up domain redirects if needed

## 🔧 Configuration Files

### Backend Environment (.env.production)
\`\`\`
DATABASE_URL='postgresql://username:password@localhost:5432/bulwark_cms'
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
\`\`\`

### Frontend Configuration
Update config.js with your actual domain:
\`\`\`javascript
apiUrl: 'https://yourdomain.com/api'
\`\`\`

## ✅ Post-Deployment Checklist

- [ ] Backend API responding at /api endpoint
- [ ] Database connection established
- [ ] Frontend loading without errors
- [ ] User authentication working
- [ ] Role-based access control functioning
- [ ] SSL certificate installed
- [ ] File uploads working
- [ ] All features tested

## 🆘 Troubleshooting

### Common Issues:
1. **Node.js not starting**: Check Node.js version and startup file
2. **Database errors**: Verify DATABASE_URL and PostgreSQL service
3. **CORS errors**: Check CORS_ORIGIN configuration
4. **Frontend not loading**: Verify file permissions and .htaccess

### Support:
- Check Plesk application logs
- Verify environment variables
- Test database connectivity
- Check browser console for errors

Generated on: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(path.join(deployDir, 'DEPLOYMENT_GUIDE.md'), deploymentGuide);
  
  // Step 4: Create quick setup script
  const setupScript = `#!/bin/bash
# Quick Plesk Setup Script

echo "🚀 Setting up Bulwark CMS on Plesk..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Run database migrations
echo "🗄️  Setting up database..."
npm run db:push

# Start the application
echo "🚀 Starting application..."
npm start

echo "✅ Setup complete!"
`;
  
  fs.writeFileSync(path.join(deployDir, 'setup.sh'), setupScript);
  
  // Make setup script executable
  try {
    execSync(`chmod +x "${path.join(deployDir, 'setup.sh')}"`, { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️  Could not make setup.sh executable (Windows)');
  }
  
  console.log('\n🎉 Deployment package created successfully!');
  console.log('📁 Location:', deployDir);
  console.log('\n📋 Next Steps:');
  console.log('1. Upload backend/ directory to your Plesk hosting');
  console.log('2. Upload frontend/ contents to public_html/');
  console.log('3. Configure Node.js application in Plesk');
  console.log('4. Set up PostgreSQL database');
  console.log('5. Update environment variables');
  console.log('6. Test the deployment');
  
  console.log('\n📖 See DEPLOYMENT_GUIDE.md for detailed instructions');
  
} catch (error) {
  console.error('❌ Deployment preparation failed:', error.message);
  process.exit(1);
}
