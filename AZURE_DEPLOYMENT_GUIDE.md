# Bulwark CMS - Azure Deployment Guide

## 🚀 Azure Deployment Overview

This guide provides step-by-step instructions for deploying the Bulwark CMS frontend to Azure Static Web Apps, with options for backend deployment to Azure App Service.

## 🎯 Recommended Azure Architecture

### **Frontend: Azure Static Web Apps**
- **Service**: Azure Static Web Apps
- **Benefits**: 
  - Built-in CI/CD with GitHub
  - Global CDN with Azure CDN
  - Built-in authentication
  - Cost-effective ($0.50/month Standard tier)
  - Native Azure integration

### **Backend: Azure App Service (Optional)**
- **Service**: Azure App Service
- **Benefits**:
  - Managed Node.js hosting
  - Auto-scaling capabilities
  - Built-in monitoring
  - Easy deployment from Git

### **Database: Azure Database for PostgreSQL (Optional)**
- **Service**: Azure Database for PostgreSQL
- **Benefits**:
  - Managed PostgreSQL service
  - High availability options
  - Automated backups
  - Advanced security features

## 🔧 Prerequisites

### **Azure Requirements**
- **Azure Subscription**: Active Azure subscription
- **Azure CLI**: Installed and configured
- **GitHub Account**: For CI/CD integration
- **Domain Name**: Custom domain (optional but recommended)

### **Development Requirements**
- **Node.js**: Version 18 or higher
- **Git**: For version control
- **Azure CLI**: For Azure management

## 🚀 Azure Static Web Apps Deployment

### **Step 1: Install Azure CLI**
```bash
# Windows (using winget)
winget install Microsoft.AzureCLI

# macOS (using Homebrew)
brew install azure-cli

# Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### **Step 2: Login to Azure**
```bash
az login
# This will open a browser window for authentication
```

### **Step 3: Set Azure Subscription**
```bash
# List available subscriptions
az account list --output table

# Set active subscription
az account set --subscription "Your-Subscription-Name"
```

### **Step 4: Create Resource Group**
```bash
# Create resource group
az group create \
  --name "bulwark-cms-rg" \
  --location "East US" \
  --tags "Project=BulwarkCMS" "Environment=Production"
```

### **Step 5: Create Static Web App**
```bash
# Create Static Web App
az staticwebapp create \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --source "https://github.com/yourusername/bulwark-cms" \
  --branch "main" \
  --app-location "bulwark-cms-frontend" \
  --api-location "" \
  --output-location "dist" \
  --login-with-github
```

### **Step 6: Configure Environment Variables**
```bash
# Set environment variables
az staticwebapp appsettings set \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --setting-names \
    VITE_API_URL="https://bulwark-cms-backend.onrender.com/api" \
    VITE_FRONTEND_URL="https://your-app-name.azurestaticapps.net" \
    VITE_ENVIRONMENT="production"
```

### **Step 7: Configure Custom Domain**
```bash
# Add custom domain
az staticwebapp hostname add \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --hostname "your-domain.com"

# Add www subdomain
az staticwebapp hostname add \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --hostname "www.your-domain.com"
```

## 🌐 Alternative: Azure App Service Deployment

### **Step 1: Create App Service Plan**
```bash
# Create App Service Plan
az appservice plan create \
  --name "bulwark-cms-plan" \
  --resource-group "bulwark-cms-rg" \
  --sku "B1" \
  --is-linux
```

### **Step 2: Create Web App**
```bash
# Create Web App
az webapp create \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --plan "bulwark-cms-plan" \
  --runtime "NODE|18-lts"
```

### **Step 3: Configure Web App**
```bash
# Set Node.js version
az webapp config appsettings set \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --settings \
    WEBSITE_NODE_DEFAULT_VERSION="18-lts" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"

# Set environment variables
az webapp config appsettings set \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --settings \
    VITE_API_URL="https://bulwark-cms-backend.onrender.com/api" \
    VITE_FRONTEND_URL="https://your-app-name.azurewebsites.net" \
    VITE_ENVIRONMENT="production"
```

## 🔒 Security Configuration

### **Azure Static Web Apps Security**
```json
// staticwebapp.config.json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/admin/*",
      "allowedRoles": ["admin"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html"
    }
  }
}
```

### **CORS Configuration for Backend**
```javascript
// Backend CORS settings for Azure
const corsOptions = {
  origin: [
    'https://your-app-name.azurestaticapps.net',
    'https://your-domain.com',
    'https://www.your-domain.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

## 📊 Performance Optimization

### **Azure CDN Configuration**
```bash
# Enable Azure CDN
az cdn profile create \
  --name "bulwark-cms-cdn" \
  --resource-group "bulwark-cms-rg" \
  --sku "Standard_Microsoft"

# Add CDN endpoint
az cdn endpoint create \
  --name "bulwark-cms" \
  --profile-name "bulwark-cms-cdn" \
  --resource-group "bulwark-cms-rg" \
  --origin "your-app-name.azurestaticapps.net" \
  --origin-host-header "your-app-name.azurestaticapps.net"
```

### **Build Optimization for Azure**
```javascript
// vite.config.js optimizations for Azure
export default defineConfig({
  build: {
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  },
  // Azure-specific optimizations
  base: '/',
  assetsDir: 'assets'
});
```

## 🔄 CI/CD with GitHub Actions

### **GitHub Actions Workflow for Azure**
```yaml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: true

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: |
          cd bulwark-cms-frontend
          npm ci

      - name: Build
        run: |
          cd bulwark-cms-frontend
          npm run build

      - name: Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          azure_static_web_apps_api_token_build: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_BUILD }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          app_location: "bulwark-cms-frontend"
          api_location: ""
          output_location: "dist"
          skip_app_build: false
```

### **Required GitHub Secrets**
```bash
# Get these values from Azure Static Web Apps
AZURE_STATIC_WEB_APPS_API_TOKEN=your_deployment_token
AZURE_STATIC_WEB_APPS_API_TOKEN_BUILD=your_build_token
```

## 📈 Monitoring and Analytics

### **Azure Application Insights**
```bash
# Create Application Insights
az monitor app-insights component create \
  --app "bulwark-cms-insights" \
  --location "East US" \
  --resource-group "bulwark-cms-rg" \
  --application-type "web"

# Get instrumentation key
az monitor app-insights component show \
  --app "bulwark-cms-insights" \
  --resource-group "bulwark-cms-rg" \
  --query "instrumentationKey" \
  --output tsv
```

### **Frontend Monitoring Setup**
```javascript
// Add Application Insights to your React app
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const appInsights = new ApplicationInsights({
  config: {
    connectionString: 'YOUR_CONNECTION_STRING',
    enableAutoRouteTracking: true,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true
  }
});

appInsights.loadAppInsights();
appInsights.trackPageView();
```

## 💰 Cost Estimation

### **Azure Static Web Apps Pricing**
| Tier | Cost | Features |
|------|------|----------|
| **Free** | $0/month | 2GB bandwidth, 250MB storage |
| **Standard** | $0.50/month | 15GB bandwidth, 250MB storage |
| **Premium** | $1.50/month | 100GB bandwidth, 1GB storage |

### **Additional Azure Services (Optional)**
| Service | Cost | Description |
|---------|------|-------------|
| **Azure CDN** | $0.081/GB | Global content delivery |
| **Application Insights** | $2.30/GB | Application monitoring |
| **Custom Domain** | $12/year | Domain registration |

### **Total Estimated Monthly Cost**
- **Basic Setup**: $0.50/month (Static Web Apps Standard)
- **With CDN**: $1-5/month (depending on traffic)
- **With Monitoring**: $3-8/month (depending on usage)

## 🔧 Troubleshooting Common Issues

### **Build Failures**
```bash
# Check build logs
az staticwebapp show \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --query "defaultHostname"

# View deployment logs
az staticwebapp deployment list \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg"
```

### **Environment Variable Issues**
```bash
# List current settings
az staticwebapp appsettings list \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg"

# Update specific setting
az staticwebapp appsettings set \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --setting-names "VITE_API_URL=https://new-url.com/api"
```

### **Custom Domain Issues**
```bash
# Check domain status
az staticwebapp hostname list \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg"

# Verify DNS configuration
nslookup your-domain.com
```

## 🚨 Emergency Procedures

### **Rollback Deployment**
```bash
# List deployments
az staticwebapp deployment list \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg"

# Rollback to previous deployment
az staticwebapp deployment rollback \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --deployment-id "previous-deployment-id"
```

### **Disaster Recovery**
```bash
# Backup configuration
az staticwebapp show \
  --name "bulwark-cms-frontend" \
  --resource-group "bulwark-cms-rg" \
  --output json > backup-config.json

# Restore from backup
# (Manual process using Azure Portal or CLI)
```

## 📋 Post-Deployment Checklist

### **Functionality Testing**
- [ ] Frontend loads correctly
- [ ] Authentication working
- [ ] API calls successful
- [ ] Mobile responsiveness verified
- [ ] Dark mode functional
- [ ] All routes accessible

### **Performance Testing**
- [ ] Page load times < 3 seconds
- [ ] CDN delivering assets
- [ ] Images optimized
- [ ] Code splitting working

### **Security Testing**
- [ ] HTTPS redirect working
- [ ] CORS configured correctly
- [ ] Environment variables secure
- [ ] Authentication tokens valid

## 🎯 Next Steps

### **Immediate Actions**
1. **Set up Azure subscription** and resource group
2. **Deploy to Azure Static Web Apps** using the guide above
3. **Configure custom domain** and SSL
4. **Set up monitoring** with Application Insights

### **Optional Enhancements**
1. **Enable Azure CDN** for global performance
2. **Set up Azure App Service** for backend (if migrating from Render)
3. **Configure Azure Database** for PostgreSQL (if migrating from Render)
4. **Implement Azure DevOps** for advanced CI/CD

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Prepared By**: Development Team  
**Status**: Ready for Azure Deployment

## 📞 Azure Support Resources

### **Official Documentation**
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
- [Azure Pricing Calculator](https://azure.microsoft.com/en-us/pricing/calculator/)

### **Support Channels**
- **Azure Support**: Available through Azure Portal
- **Community Forums**: Microsoft Q&A and Stack Overflow
- **Documentation**: Comprehensive guides and tutorials
- **Training**: Microsoft Learn modules
