import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { db } from '../config/database.js';
import { users } from '../models/schema.js';
import { generateToken, refreshToken } from '../config/auth.js';
import { authenticateToken } from '../middleware/auth.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('role').isIn(['agent', 'manager']).withMessage('Valid role is required')
];

// POST /auth/login - User login
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (!user || user.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const userData = user[0];

    // Check if account is locked
    if (userData.accountLockedUntil && new Date() < new Date(userData.accountLockedUntil)) {
      return res.status(423).json({
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: userData.accountLockedUntil
      });
    }

    // Check if account is active
    if (!userData.isActive) {
      return res.status(401).json({
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = (userData.failedLoginAttempts || 0) + 1;
      let accountLockedUntil = null;
      
      // Lock account after 5 failed attempts for 15 minutes
      if (failedAttempts >= 5) {
        accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      
      await db.update(users)
        .set({ 
          failedLoginAttempts: failedAttempts,
          accountLockedUntil
        })
        .where(eq(users.id, userData.id));
      
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
        failedAttempts,
        accountLocked: !!accountLockedUntil
      });
    }

    // Reset failed login attempts on successful login
    await db.update(users)
      .set({ 
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        lastLogin: new Date()
      })
      .where(eq(users.id, userData.id));

    // Generate tokens
    const accessToken = generateToken({
      id: userData.id,
      email: userData.email,
      role: userData.role
    });

    const refreshTokenValue = refreshToken({
      id: userData.id,
      email: userData.email
    });

    // Return user data (excluding sensitive information)
    const userResponse = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      isActive: userData.isActive,
      managerId: userData.managerId,
      department: userData.department,
      position: userData.position,
      avatarPath: userData.avatarPath,
      lastLogin: userData.lastLogin
    };

    res.json({
      message: 'Login successful',
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /auth/logout - User logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /auth/refresh - Refresh access token
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verify refresh token
    const decoded = refreshToken(refresh_token);
    
    // Find user
    const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    
    if (!user || user.length === 0 || !user[0].isActive) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Generate new access token
    const newAccessToken = generateToken({
      id: user[0].id,
      email: user[0].email,
      role: user[0].role
    });

    res.json({
      message: 'Token refreshed successfully',
      access_token: newAccessToken
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      error: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
});

// GET /auth/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = user[0];

    // Return user profile (excluding sensitive information)
    const profile = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      isActive: userData.isActive,
      bio: userData.bio,
      avatarPath: userData.avatarPath,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      address: userData.address,
      city: userData.city,
      state: userData.state,
      zipCode: userData.zipCode,
      country: userData.country,
      linkedinUrl: userData.linkedinUrl,
      twitterUrl: userData.twitterUrl,
      facebookUrl: userData.facebookUrl,
      websiteUrl: userData.websiteUrl,
      employeeId: userData.employeeId,
      department: userData.department,
      position: userData.position,
      hireDate: userData.hireDate,
      managerId: userData.managerId,
      timezone: userData.timezone,
      language: userData.language,
      dateFormat: userData.dateFormat,
      timeFormat: userData.timeFormat,
      emailNotifications: userData.emailNotifications,
      smsNotifications: userData.smsNotifications,
      pushNotifications: userData.pushNotifications,
      profileVisibility: userData.profileVisibility,
      showContactInfo: userData.showContactInfo,
      showPerformanceStats: userData.showPerformanceStats,
      twoFactorEnabled: userData.twoFactorEnabled,
      lastLogin: userData.lastLogin,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };

    res.json({
      message: 'Profile retrieved successfully',
      profile
    });

  } catch (error) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /auth/register - User registration (managers only)
router.post('/register', validateRegistration, authenticateToken, async (req, res) => {
  try {
    // Check if user is manager
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        error: 'Only managers can register new users',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if email already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (existingUser && existingUser.length > 0) {
      return res.status(409).json({
        error: 'Email already exists',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await db.insert(users).values({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      isActive: true,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Generate token for new user
    const accessToken = generateToken({
      id: newUser[0].id,
      email: newUser[0].email,
      role: newUser[0].role
    });

    // Return user data (excluding password)
    const userResponse = {
      id: newUser[0].id,
      email: newUser[0].email,
      firstName: newUser[0].firstName,
      lastName: newUser[0].lastName,
      role: newUser[0].role,
      isActive: newUser[0].isActive,
      createdAt: newUser[0].createdAt
    };

    res.status(201).json({
      message: 'User registered successfully',
      access_token: accessToken,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /auth/change-password - Change password
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current user
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user[0].passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Current password is incorrect',
        code: 'INCORRECT_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.update(users)
      .set({ 
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
