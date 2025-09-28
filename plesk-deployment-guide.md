# 🚀 Bulwark CMS - Plesk Deployment Guide

This guide will help you deploy your Bulwark CMS application on Plesk hosting.

## 📋 Prerequisites

- Plesk hosting account with Node.js support
- PostgreSQL database access
- Domain name configured in Plesk
- FTP/SFTP access or Plesk File Manager

## 🗂️ File Structure for Deployment

```
your-domain.com/
├── api/                          # Backend Node.js application
│   ├── bulwark-cms-backend/      # All backend files
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── package.json
│   │   ├── .env.production
│   │   ├── plesk-startup.js
│   │   └── ... (all other backend files)
│   └── node_modules/             # Installed dependencies
├── public/                       # Frontend static files
│   ├── index.html
│   ├── assets/
│   └── ... (all built frontend files)
└── .htaccess                     # Apache configuration (if needed)
```

## 🔧 Step-by-Step Deployment

### Step 1: Prepare Files

1. **Backend Files**: Upload all files from `bulwark-cms-backend/` to `/api/` directory
2. **Frontend Build**: Build and upload frontend files to `/public/` directory
3. **Environment**: Configure `.env.production` with your database credentials

### Step 2: Database Setup

1. **Create PostgreSQL Database** in Plesk:
   - Database name: `bulwark_cms`
   - Username: `bulwark_user`
   - Password: (strong password)

2. **Update DATABASE_URL** in `.env.production`:
   ```
   DATABASE_URL='postgresql://bulwark_user:yourpassword@localhost:5432/bulwark_cms'
   ```

### Step 3: Node.js Application Setup

1. **Enable Node.js** in Plesk:
   - Go to "Node.js" section
   - Enable Node.js for your domain
   - Set Application Root to `/api`
   - Set Application Startup File to `plesk-startup.js`

2. **Install Dependencies**:
   ```bash
   cd /api
   npm install
   ```

3. **Run Database Migrations**:
   ```bash
   npm run db:push
   ```

### Step 4: Frontend Build and Deploy

1. **Build Frontend**:
   ```bash
   cd bulwark-cms-frontend
   npm run build
   ```

2. **Upload Build Files**: Upload contents of `dist/` folder to `/public/` directory

3. **Update API URL**: Modify `config.production.js` with your backend URL

### Step 5: SSL Configuration

1. **Enable SSL** in Plesk:
   - Go to "SSL/TLS Certificates"
   - Install Let's Encrypt certificate
   - Force HTTPS redirect

### Step 6: Domain Configuration

1. **Update CORS_ORIGIN** in `.env.production`:
   ```
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **Update Frontend Config**:
   ```javascript
   apiUrl: 'https://api.yourdomain.com/api'
   ```

## 🔐 Security Considerations

1. **Change JWT_SECRET** to a strong, unique value
2. **Use HTTPS** for all communications
3. **Configure proper CORS** origins
4. **Set up firewall** rules if available
5. **Regular backups** of database and files

## 📊 Monitoring and Maintenance

1. **Check Application Logs** in Plesk
2. **Monitor Database Performance**
3. **Set up automated backups**
4. **Update dependencies** regularly

## 🆘 Troubleshooting

### Common Issues:

1. **Node.js not starting**:
   - Check Node.js version (>=18.0.0)
   - Verify startup file path
   - Check application logs

2. **Database connection failed**:
   - Verify DATABASE_URL format
   - Check PostgreSQL service status
   - Verify database credentials

3. **Frontend not loading**:
   - Check file permissions
   - Verify build files uploaded correctly
   - Check browser console for errors

4. **CORS errors**:
   - Verify CORS_ORIGIN configuration
   - Check frontend API URL configuration

## 📞 Support

If you encounter issues:
1. Check Plesk application logs
2. Verify all environment variables
3. Test database connectivity
4. Check file permissions

## 🎯 Post-Deployment Checklist

- [ ] Backend API responding correctly
- [ ] Database connection established
- [ ] Frontend loading without errors
- [ ] SSL certificate installed
- [ ] User authentication working
- [ ] Role-based access control functioning
- [ ] File uploads working
- [ ] Email notifications configured (if needed)
