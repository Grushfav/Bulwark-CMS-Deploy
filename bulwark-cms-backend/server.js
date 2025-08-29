import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import app configuration
import app from './app.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

// Create Express server
const server = express();

// Security middleware
server.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

console.log('🔧 CORS Configuration:', {
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  parsedOrigins: corsOrigins,
  environment: process.env.NODE_ENV
});

// Enhanced CORS configuration
server.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('🚫 CORS blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Rate limiting - More appropriate for development
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow 10 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Speed limiting - More lenient for development
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 200, // allow 200 requests per 15 minutes, then...
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 200;
  }
});

// Apply rate limiting to specific routes
server.use('/api/auth', authLimiter); // Stricter for auth
server.use('/api/', generalLimiter); // General rate limiting for other routes
server.use('/api/', speedLimiter); // Speed limiting

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  server.use(morgan('dev'));
} else {
  server.use(morgan('combined'));
}

// Compression middleware
server.use(compression());

// Body parsing middleware
server.use(express.json({ limit: '10mb' }));
server.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
server.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API routes
server.use('/api', app);

// Debug middleware to log all requests
server.use((req, res, next) => {
  console.log('🌐 Incoming request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  next();
});

// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log when request finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    // Log all requests with timing
    console.log(`📊 ${req.method} ${req.path} - ${status} (${duration}ms)`);
    
    // Warn about slow requests
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Alert about very slow requests
    if (duration > 5000) {
      console.error(`🚨 Very slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

// 404 handler
server.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
server.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const httpServer = server.listen(PORT, () => {
  console.log(`🚀 Bulwark CMS Backend server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default server;
