# Bulwark CMS - Technical Deployment Guide

## 🚀 Production Deployment Checklist

### **Pre-Deployment Requirements**

#### **1. Code Quality & Testing**
- [ ] All tests passing
- [ ] No console errors in browser
- [ ] Mobile responsiveness verified
- [ ] Dark mode functionality tested
- [ ] All API endpoints responding correctly
- [ ] Authentication flow working
- [ ] Role-based access control verified

#### **2. Environment Configuration**
- [ ] Production environment variables set
- [ ] API endpoints pointing to production backend
- [ ] CORS configured for production domains
- [ ] SSL certificates configured
- [ ] Database connection strings updated

#### **3. Security Review**
- [ ] JWT secret keys rotated
- [ ] Environment variables secured
- [ ] API rate limiting configured
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled

## 🔧 Vercel Deployment Steps

### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

### **Step 2: Login to Vercel**
```bash
vercel login
```

### **Step 3: Deploy Frontend**
```bash
cd bulwark-cms-frontend
vercel --prod
```

### **Step 4: Configure Environment Variables**
In Vercel dashboard:
```
VITE_API_URL=https://bulwark-cms-backend.onrender.com/api
VITE_FRONTEND_URL=https://your-domain.vercel.app
VITE_ENVIRONMENT=production
```

### **Step 5: Configure Custom Domain**
1. Go to Vercel project settings
2. Add custom domain
3. Update DNS records
4. Wait for SSL certificate generation

## 🌐 Alternative Deployment Options

### **Netlify Deployment**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and deploy
netlify login
netlify deploy --prod --dir=dist
```

### **AWS S3 + CloudFront**
```bash
# Install AWS CLI
aws configure

# Create S3 bucket
aws s3 mb s3://your-bucket-name

# Upload files
aws s3 sync dist/ s3://your-bucket-name

# Configure CloudFront distribution
# (Use AWS Console for this step)
```

## 🔒 Security Configuration

### **Environment Variables Security**
```bash
# Never commit these files
.env
.env.local
.env.production
.env.vercel

# Use hosting provider's secure environment variable storage
```

### **CORS Configuration**
```javascript
// Backend CORS settings for production
const corsOptions = {
  origin: [
    'https://your-domain.com',
    'https://your-domain.vercel.app',
    'https://bulwark-cms-frontend.onrender.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
```

### **API Security Headers**
```javascript
// Add security headers
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:", "https:"],
  },
}));
```

## 📊 Performance Optimization

### **Build Optimization**
```javascript
// vite.config.js optimizations
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
  }
});
```

### **Image Optimization**
- Use WebP format where possible
- Implement lazy loading
- Optimize image sizes
- Use CDN for image delivery

### **Code Splitting**
- Route-based code splitting
- Component lazy loading
- Vendor chunk separation
- Dynamic imports for heavy components

## 🔍 Monitoring & Analytics

### **Error Tracking**
```javascript
// Add error boundary
import { ErrorBoundary } from 'react-error-boundary';

// Add performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
```

### **Performance Monitoring**
- Core Web Vitals tracking
- API response time monitoring
- User interaction tracking
- Error rate monitoring

### **Health Checks**
```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

## 🚨 Post-Deployment Checklist

### **Functionality Testing**
- [ ] User authentication working
- [ ] All CRUD operations functional
- [ ] File uploads working
- [ ] Email notifications sending
- [ ] Dashboard metrics displaying
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested

### **Performance Testing**
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database query performance acceptable
- [ ] Image loading optimized
- [ ] Caching working correctly

### **Security Testing**
- [ ] HTTPS redirect working
- [ ] Authentication tokens secure
- [ ] Role-based access enforced
- [ ] Input validation working
- [ ] SQL injection prevention verified

## 🔧 Troubleshooting Common Issues

### **Build Failures**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version compatibility
node --version
npm --version
```

### **Environment Variable Issues**
```bash
# Verify environment variables are set
echo $VITE_API_URL
echo $VITE_ENVIRONMENT

# Check Vercel environment variables
vercel env ls
```

### **CORS Issues**
```javascript
// Check CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

### **Database Connection Issues**
```javascript
// Verify database connection
const testConnection = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};
```

## 📈 Scaling Considerations

### **Database Scaling**
- Monitor connection pool usage
- Consider read replicas for heavy queries
- Implement query optimization
- Add database caching layer

### **Application Scaling**
- Implement horizontal scaling
- Add load balancing
- Use microservices architecture
- Implement caching strategies

### **CDN Configuration**
- Configure edge locations
- Set up cache policies
- Monitor CDN performance
- Optimize asset delivery

## 🔄 Deployment Automation

### **GitHub Actions Workflow**
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### **Environment-Specific Deployments**
```bash
# Staging deployment
vercel --env staging

# Production deployment
vercel --prod

# Preview deployment
vercel
```

## 📞 Emergency Procedures

### **Rollback Procedure**
```bash
# Rollback to previous version
vercel rollback

# Check deployment history
vercel ls

# Revert to specific deployment
vercel rollback <deployment-id>
```

### **Database Recovery**
```bash
# Restore from backup
pg_restore -d database_name backup_file.sql

# Check backup status
# (Use Render.com dashboard)
```

### **Emergency Contacts**
- **System Administrator**: [Phone/Email]
- **Hosting Provider**: Render.com Support
- **Database Provider**: Render.com Support
- **Domain Provider**: [Provider Support]

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Prepared By**: Development Team  
**Status**: Ready for Deployment
