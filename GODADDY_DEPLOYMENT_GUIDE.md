# Bulwark CMS - GoDaddy Deployment Guide

## 🚀 GoDaddy Deployment Overview

This guide provides comprehensive instructions for deploying the Bulwark CMS application on GoDaddy hosting services. The application consists of a React frontend and Node.js backend with PostgreSQL database.

## 🎯 GoDaddy Hosting Options

### **Recommended Architecture**

#### **Option 1: Shared Hosting (Budget-Friendly)**
- **Frontend**: GoDaddy Shared Hosting (cPanel)
- **Backend**: External service (Render, Railway, or Heroku)
- **Database**: External PostgreSQL (Render, Railway, or Heroku)
- **Cost**: ~$5-15/month

#### **Option 2: VPS Hosting (Full Control)**
- **Frontend**: GoDaddy VPS (cPanel/WHM)
- **Backend**: Same VPS
- **Database**: PostgreSQL on same VPS
- **Cost**: ~$20-50/month

#### **Option 3: Dedicated Server (High Performance)**
- **Frontend**: GoDaddy Dedicated Server
- **Backend**: Same server
- **Database**: PostgreSQL on same server
- **Cost**: ~$100-300/month

## 🔧 Prerequisites

### **GoDaddy Account Requirements**
- **GoDaddy Account**: Active hosting account
- **Domain Name**: Registered domain (optional)
- **Hosting Plan**: Shared, VPS, or Dedicated hosting
- **cPanel Access**: For shared hosting management

### **Development Requirements**
- **Node.js**: Version 18 or higher
- **Git**: For version control
- **FTP Client**: FileZilla or similar
- **SSH Access**: For VPS/dedicated hosting

## 🌐 Option 1: Shared Hosting Deployment

### **Step 1: Prepare Frontend for Static Hosting**

```bash
# Navigate to frontend directory
cd bulwark-cms-frontend

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in the 'dist' folder
```

### **Step 2: Configure Environment Variables**

Create a `.env.production` file in the frontend directory:

```env
VITE_API_URL=https://your-backend-url.com/api
VITE_FRONTEND_URL=https://your-domain.com
VITE_ENVIRONMENT=production
```

### **Step 3: Upload to GoDaddy Shared Hosting**

1. **Access cPanel**:
   - Login to your GoDaddy account
   - Go to "My Products" → "Web Hosting" → "Manage"
   - Click "cPanel"

2. **Upload Files**:
   - Open "File Manager"
   - Navigate to `public_html` folder
   - Upload all contents from `bulwark-cms-frontend/dist/` folder
   - Ensure `index.html` is in the root of `public_html`

3. **Set Permissions**:
   - Right-click on files and set permissions to 644
   - Right-click on folders and set permissions to 755

### **Step 4: Configure .htaccess for React Router**

Create a `.htaccess` file in `public_html`:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]

# Enable GZIP compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Set cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

## 🖥️ Option 2: VPS Hosting Deployment

### **Step 1: Set Up VPS Environment**

```bash
# Connect to your VPS via SSH
ssh username@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2 for process management
sudo npm install -g pm2

# Install Git
sudo apt install git -y
```

### **Step 2: Clone and Set Up Backend**

```bash
# Clone repository
git clone https://github.com/yourusername/bulwark-cms.git
cd bulwark-cms/bulwark-cms-backend

# Install dependencies
npm install

# Create production environment file
nano .env.production
```

Add the following to `.env.production`:

```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bulwark_cms
DB_USER=bulwark_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

### **Step 3: Set Up PostgreSQL Database**

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE bulwark_cms;
CREATE USER bulwark_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bulwark_cms TO bulwark_user;
\q

# Run database migrations
cd bulwark-cms/bulwark-cms-backend
npm run db:push
npm run db:seed
```

### **Step 4: Set Up Frontend**

```bash
# Navigate to frontend directory
cd ../bulwark-cms-frontend

# Install dependencies
npm install

# Create production environment file
nano .env.production
```

Add the following to `.env.production`:

```env
VITE_API_URL=https://your-domain.com/api
VITE_FRONTEND_URL=https://your-domain.com
VITE_ENVIRONMENT=production
```

```bash
# Build frontend
npm run build

# Create nginx configuration
sudo nano /etc/nginx/sites-available/bulwark-cms
```

### **Step 5: Configure Nginx**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend
    location / {
        root /home/username/bulwark-cms/bulwark-cms-frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /uploads {
        alias /home/username/bulwark-cms/bulwark-cms-backend/uploads;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/bulwark-cms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### **Step 6: Start Backend with PM2**

```bash
# Navigate to backend directory
cd /home/username/bulwark-cms/bulwark-cms-backend

# Start with PM2
pm2 start server.js --name "bulwark-backend" --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## 🔒 SSL Certificate Setup

### **Using Let's Encrypt (Free)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test renewal
sudo certbot renew --dry-run
```

### **Using GoDaddy SSL (Paid)**

1. **Purchase SSL Certificate**:
   - Login to GoDaddy account
   - Go to "SSL Certificates"
   - Purchase appropriate certificate

2. **Install Certificate**:
   - Download certificate files
   - Upload to server via cPanel or SSH
   - Configure in nginx or Apache

## 📊 Database Management

### **Backup Database**

```bash
# Create backup
pg_dump -h localhost -U bulwark_user -d bulwark_cms > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql -h localhost -U bulwark_user -d bulwark_cms < backup_file.sql
```

### **Database Monitoring**

```bash
# Check database status
sudo systemctl status postgresql

# Monitor connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('bulwark_cms'));"
```

## 🔧 Performance Optimization

### **Nginx Optimization**

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Caching
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### **Node.js Optimization**

```bash
# Set Node.js environment variables
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Monitor PM2 processes
pm2 monit
pm2 logs bulwark-backend
```

## 🚨 Troubleshooting Common Issues

### **Frontend Issues**

```bash
# Check if files are uploaded correctly
ls -la /home/username/public_html/

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t
```

### **Backend Issues**

```bash
# Check PM2 status
pm2 status
pm2 logs bulwark-backend

# Restart backend
pm2 restart bulwark-backend

# Check database connection
sudo -u postgres psql -c "\l"
```

### **Database Issues**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname='bulwark_cms';"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

## 📈 Monitoring and Maintenance

### **Set Up Monitoring**

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor system resources
htop
iotop
nethogs

# Check disk usage
df -h
du -sh /home/username/bulwark-cms/
```

### **Automated Backups**

Create a backup script:

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/username/backups"
DB_NAME="bulwark_cms"
DB_USER="bulwark_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/db_backup_$DATE.sql

# Backup application files
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/username/bulwark-cms/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make script executable
chmod +x backup.sh

# Add to crontab for daily backups
crontab -e
# Add this line:
0 2 * * * /home/username/backup.sh
```

## 💰 Cost Estimation

### **GoDaddy Hosting Costs**

| Service | Plan | Monthly Cost | Features |
|---------|------|--------------|----------|
| **Shared Hosting** | Economy | $5.99 | 1 website, 25GB storage |
| **Shared Hosting** | Deluxe | $7.99 | Unlimited websites, 100GB storage |
| **VPS Hosting** | 1 vCPU | $19.99 | 1GB RAM, 40GB SSD |
| **VPS Hosting** | 2 vCPU | $39.99 | 4GB RAM, 100GB SSD |
| **Dedicated Server** | Basic | $99.99 | 4GB RAM, 500GB HDD |

### **Additional Costs**
- **Domain Name**: $12-15/year
- **SSL Certificate**: $0-100/year (Let's Encrypt is free)
- **Backup Storage**: $0-10/month
- **Monitoring Tools**: $0-20/month

### **Total Estimated Monthly Cost**
- **Shared Hosting**: $6-8/month
- **VPS Hosting**: $20-40/month
- **Dedicated Server**: $100-300/month

## 📋 Post-Deployment Checklist

### **Functionality Testing**
- [ ] Frontend loads correctly
- [ ] Authentication working
- [ ] API calls successful
- [ ] Database operations functional
- [ ] File uploads working
- [ ] Mobile responsiveness verified
- [ ] SSL certificate active

### **Performance Testing**
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] GZIP compression enabled
- [ ] Caching headers set

### **Security Testing**
- [ ] HTTPS redirect working
- [ ] CORS configured correctly
- [ ] Environment variables secure
- [ ] Database credentials protected
- [ ] Firewall rules configured

## 🎯 Next Steps

### **Immediate Actions**
1. **Choose hosting option** based on budget and requirements
2. **Set up GoDaddy hosting** account and domain
3. **Deploy frontend** to shared hosting or VPS
4. **Deploy backend** to VPS or external service
5. **Configure database** and run migrations

### **Optional Enhancements**
1. **Set up CDN** for better performance
2. **Implement monitoring** and alerting
3. **Set up automated backups**
4. **Configure load balancing** (for high traffic)
5. **Implement caching** strategies

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Prepared By**: Development Team  
**Status**: Ready for GoDaddy Deployment

## 📞 GoDaddy Support Resources

### **Official Documentation**
- [GoDaddy Help Center](https://www.godaddy.com/help)
- [cPanel Documentation](https://docs.cpanel.net/)
- [VPS Management Guide](https://www.godaddy.com/help/vps-hosting)

### **Support Channels**
- **GoDaddy Support**: 24/7 phone and chat support
- **Community Forums**: GoDaddy Community
- **Knowledge Base**: Comprehensive guides and tutorials
- **Video Tutorials**: Step-by-step deployment guides

