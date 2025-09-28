
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
3. Run database migrations: `npm run db:push`

### 2. Backend Deployment
1. Upload backend/ directory to your Plesk hosting
2. Configure Node.js application in Plesk:
   - Application Root: backend/
   - Application Startup File: plesk-startup.js
   - Node.js Version: 18+
3. Install dependencies: `npm install`
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
```
DATABASE_URL='postgresql://username:password@localhost:5432/bulwark_cms'
JWT_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

### Frontend Configuration
Update config.js with your actual domain:
```javascript
apiUrl: 'https://yourdomain.com/api'
```

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

Generated on: 2025-09-27T14:35:33.643Z
