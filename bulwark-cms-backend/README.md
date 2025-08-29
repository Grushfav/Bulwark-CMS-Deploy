# Bulwark CMS Backend

A comprehensive Node.js backend API for the Bulwark Insurance Agent CMS, built with Express, Drizzle ORM, and Neon PostgreSQL.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user lifecycle management with different roles (Manager, Senior Agent, Agent)
- **Client Management**: Full CRUD operations for client records with notes and bulk import/export
- **Sales Tracking**: Comprehensive sales management and analytics
- **Goals & KPIs**: Goal setting and progress tracking
- **Reminders System**: Automated reminder and follow-up management
- **Content Management**: Document and content organization
- **Team Management**: Team performance analytics and management
- **Reporting**: Comprehensive business intelligence and reporting
- **File Management**: Secure file upload and management
- **API Security**: Rate limiting, input validation, and security headers

## 🏗️ Architecture

- **Framework**: Express.js with modern ES6+ syntax
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: JWT tokens with refresh mechanism
- **File Upload**: Multer with configurable storage
- **Validation**: Express-validator for input sanitization
- **Security**: Helmet, CORS, rate limiting, and input validation

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Neon PostgreSQL database account

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bulwark-cms-backend
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp env.example .env
   
   # Edit .env with your configuration
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=5000
   ```

4. **Database Setup**
   ```bash
   # Generate database migrations
   pnpm db:generate
   
   # Push schema to database
   pnpm db:push
   
   # Or run migrations
   pnpm db:migrate
   ```

5. **Start Development Server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

## 🗄️ Database Schema

The backend includes comprehensive database schemas for:

- **Users**: Complete user profiles with roles, preferences, and settings
- **Clients**: Client management with notes and status tracking
- **Sales**: Sales tracking with commission calculations
- **Goals**: KPI and goal management
- **Reminders**: Automated reminder system
- **Content**: Document and content management
- **Teams**: Team structure and performance tracking

## 🔌 API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User authentication
- `POST /logout` - User logout
- `POST /refresh` - Refresh access token
- `GET /profile` - Get user profile
- `POST /register` - Register new user (managers only)
- `POST /change-password` - Change user password

### User Management (`/api/users`)
- `GET /` - Get all users (managers only)
- `POST /` - Create new user (managers only)
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user
- `PUT /profile` - Update own profile

### Client Management (`/api/clients`)
- `GET /` - Get clients (filtered by user role)
- `POST /` - Create new client
- `GET /:id` - Get client by ID
- `PUT /:id` - Update client
- `DELETE /:id` - Delete client (managers only)
- `POST /:id/notes` - Add note to client
- `POST /bulk-import` - Bulk import from CSV
- `GET /export` - Export to CSV

### Sales Tracking (`/api/sales`)
- `GET /` - Get sales (filtered by user role)
- `POST /` - Create new sale
- `GET /:id` - Get sale by ID
- `PUT /:id` - Update sale
- `DELETE /:id` - Delete sale
- `GET /dashboard` - Get sales dashboard data

### Goals Management (`/api/goals`)
- `GET /` - Get goals (filtered by user role)
- `POST /` - Create new goal
- `GET /:id` - Get goal by ID
- `PUT /:id` - Update goal
- `DELETE /:id` - Delete goal
- `GET /progress` - Get goal progress

### Content Management (`/api/content-management`)
- `GET /content` - Get content (filtered by user role)
- `POST /content` - Create new content
- `GET /content/:id` - Get content by ID
- `PUT /content/:id` - Update content
- `DELETE /content/:id` - Delete content
- `GET /content/:id/download` - Download content file

### Team Management (`/api/team`)
- `GET /` - Get team information
- `GET /members` - Get team members
- `GET /performance` - Get team performance
- `GET /leaderboard` - Get leaderboard data

### Reports (`/api/reports`)
- `GET /sales` - Generate sales reports
- `GET /performance` - Generate performance reports
- `GET /goals` - Generate goal reports
- `POST /export` - Export reports to CSV/Excel

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Manager, Senior Agent, and Agent roles
- **Input Validation**: Comprehensive input sanitization and validation
- **Rate Limiting**: API rate limiting to prevent abuse
- **Security Headers**: Helmet.js for security headers
- **CORS Protection**: Configurable CORS policies
- **File Upload Security**: File type and size validation

## 🚀 Development

### Available Scripts

```bash
# Development
pnpm dev          # Start development server with nodemon
pnpm start        # Start production server

# Database
pnpm db:generate  # Generate database migrations
pnpm db:migrate   # Run database migrations
pnpm db:push      # Push schema changes to database
pnpm db:studio    # Open Drizzle Studio
pnpm db:seed      # Seed database with sample data

# Linting
pnpm lint         # Run ESLint
```

### Project Structure

```
bulwark-cms-backend/
├── config/           # Configuration files
│   ├── database.js   # Database configuration
│   ├── auth.js       # JWT configuration
│   └── multer.js     # File upload configuration
├── models/           # Database models and schema
│   ├── schema.js     # Drizzle schema definitions
│   └── index.js      # Model exports
├── routes/           # API route handlers
│   ├── auth.js       # Authentication routes
│   ├── clients.js    # Client management
│   ├── sales.js      # Sales tracking
│   └── ...          # Other route files
├── middleware/       # Custom middleware
│   ├── auth.js       # Authentication middleware
│   ├── roleCheck.js  # Role-based access control
│   └── upload.js     # File upload handling
├── utils/            # Utility functions
├── uploads/          # File storage
├── migrations/       # Database migrations
├── server.js         # Main server entry point
├── app.js            # Express app configuration
└── drizzle.config.js # Drizzle ORM configuration
```

## 🗄️ Database Management

### Using Drizzle Studio

```bash
pnpm db:studio
```

This opens a web interface to view and manage your database schema and data.

### Running Migrations

```bash
# Generate new migration
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema changes (development)
pnpm db:push
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🚀 Deployment

### Production Build

```bash
# Install production dependencies
pnpm install --production

# Set environment variables
NODE_ENV=production

# Start server
pnpm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

## 📊 Monitoring & Health Checks

- **Health Endpoint**: `GET /health` - Server status and uptime
- **API Documentation**: `GET /api` - Available endpoints
- **Error Logging**: Comprehensive error logging and monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software for Bulwark Insurance.

## 🆘 Support

For support and questions:
- Check the API documentation at `/api`
- Review the health endpoint at `/health`
- Check server logs for detailed error information

---

**Note**: This backend is designed to work with the Bulwark CMS Frontend. Ensure both applications are properly configured and running for full functionality.
