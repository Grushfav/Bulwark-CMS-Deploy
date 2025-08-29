# 🚀 BULWARK CMS Frontend - Build Guide

## **📋 Prerequisites**

- Node.js 18+ 
- pnpm (recommended) or npm
- Git repository cloned

## **🔧 Installation**

```bash
# Install dependencies
pnpm install
# or
npm install
```

## **🏗️ Build Process**

### **Development Mode:**
```bash
pnpm dev
# or
npm run dev
```

### **Production Build:**
```bash
pnpm build
# or
npm run build
```

### **Preview Build:**
```bash
pnpm preview
# or
npm run preview
```

## **📁 Build Output**

The build creates a `dist/` folder containing:
```
dist/
├── index.html          ← Main entry point
├── assets/             ← CSS, JS, images
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other-assets]
└── [other-static-files]
```

## **⚙️ Configuration**

### **Vite Config (`vite.config.js`)**
- **Port**: 5173 (development)
- **Proxy**: `/api` → `http://127.0.0.1:5000`
- **Alias**: `@` → `./src`

### **Environment Configuration (`src/config.js`)**
```javascript
export const config = {
  local: {
    apiUrl: 'http://localhost:5000/api',
    frontendUrl: 'http://localhost:5173'
  },
  production: {
    apiUrl: 'https://your-backend.com/api',
    frontendUrl: 'https://your-frontend.com'
  },
  current: 'local' // Change this to switch
};
```

## **🚨 Common Build Issues**

### **1. Import Path Resolution**
**Error**: `Could not resolve "../lib/api"`

**Solution**: Use absolute imports with `@` alias:
```javascript
// ❌ Relative import (may fail in build)
import { authAPI } from '../lib/api';

// ✅ Absolute import (recommended)
import { authAPI } from '@/lib/api';
```

### **2. Module Not Found**
**Error**: `Module not found: Can't resolve 'react'`

**Solution**: 
```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### **3. Build Timeout**
**Error**: Build process hangs or times out

**Solution**: 
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build
```

## **🔍 Debugging Build Issues**

### **Run Build Test Script:**
```bash
node build-test.js
```

### **Check File Structure:**
```bash
# Ensure you're in the right directory
ls -la
# Should show: package.json, vite.config.js, src/, etc.

# Check src structure
ls -la src/
# Should show: main.jsx, components/, hooks/, lib/, etc.
```

### **Verify Imports:**
All imports should use the `@` alias:
```javascript
// ✅ Correct imports
import { useAuth } from '@/hooks/useAuth';
import { authAPI } from '@/lib/api';
import { config } from '@/config';

// ❌ Avoid relative imports
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../lib/api';
```

## **🚀 Deployment**

### **Render (Static Site):**
- **Build Command**: `pnpm build`
- **Publish Directory**: `dist`

### **Vercel:**
- **Build Command**: `pnpm build`
- **Output Directory**: `dist`

### **Netlify:**
- **Build Command**: `pnpm build`
- **Publish Directory**: `dist`

## **📊 Build Optimization**

The build includes:
- **Code Splitting**: Vendor and UI chunks
- **Minification**: Terser for production
- **Tree Shaking**: Unused code removal
- **Asset Optimization**: Compressed assets

## **🆘 Troubleshooting**

### **Still Getting Import Errors?**
1. Check all files use `@/` imports
2. Verify `vite.config.js` has correct alias
3. Clear node_modules and reinstall
4. Check for typos in import paths

### **Build Fails on CI/CD?**
1. Ensure Node.js version matches local
2. Check for case-sensitive file systems
3. Verify all dependencies are in package.json
4. Use the build test script

### **Performance Issues?**
1. Check bundle size in build output
2. Verify code splitting is working
3. Check for large dependencies
4. Use build analyzer if needed

---

**🎯 For Render deployment, use `dist` as your publish directory!**
