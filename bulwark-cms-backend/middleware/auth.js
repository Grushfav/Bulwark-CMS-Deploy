import { verifyToken } from '../config/auth.js';
import { db } from '../config/database.js';
import { users } from '../models/schema.js';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

// JWT Authentication middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    console.log('🔐 Auth middleware - JWT decoded:', {
      decoded: decoded,
      decodedId: decoded.id,
      decodedIdType: typeof decoded.id,
      decodedIdIsNaN: isNaN(decoded.id)
    });
    
    // Also decode without verification to see raw token content
    try {
      const rawDecoded = jwt.decode(token);
      console.log('🔐 Auth middleware - Raw JWT decoded (no verification):', {
        rawDecoded: rawDecoded,
        rawDecodedId: rawDecoded?.id,
        rawDecodedIdType: typeof rawDecoded?.id,
        rawDecodedIdIsNaN: isNaN(rawDecoded?.id)
      });
    } catch (rawError) {
      console.log('🔐 Auth middleware - Could not decode raw token:', rawError.message);
    }
    
    // Check if user still exists and is active
    console.log('🔐 Auth middleware - About to query database with decoded.id:', decoded.id, 'Type:', typeof decoded.id);
    
    try {
      const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      
      console.log('🔐 Auth middleware - Database query result:', {
        user: user,
        userLength: user?.length,
        firstUser: user?.[0],
        firstUserId: user?.[0]?.id,
        firstUserIdType: typeof user?.[0]?.id,
        firstUserIdIsNaN: isNaN(user?.[0]?.id),
        firstUserIdStringified: JSON.stringify(user?.[0]?.id)
      });
      
      if (!user || user.length === 0) {
        return res.status(401).json({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }
      
      // Validate the user ID from database
      const dbUserId = user[0].id;
      console.log('🔐 Auth middleware - Database user ID validation:', {
        dbUserId: dbUserId,
        dbUserIdType: typeof dbUserId,
        dbUserIdIsNaN: isNaN(dbUserId),
        dbUserIdStringified: JSON.stringify(dbUserId),
        dbUserIdNumber: Number(dbUserId),
        dbUserIdParseInt: parseInt(dbUserId, 10)
      });
      
      if (isNaN(dbUserId) || dbUserId === null || dbUserId === undefined) {
        console.error('🔐 Auth middleware - CRITICAL: Database returned invalid user ID:', {
          dbUserId: dbUserId,
          dbUserIdType: typeof dbUserId,
          decodedId: decoded.id,
          decodedIdType: typeof decoded.id
        });
        return res.status(500).json({
          error: 'Database returned invalid user ID',
          code: 'INVALID_DB_USER_ID'
        });
      }
      
      // Now set req.user with the validated database user ID
      req.user = {
        id: dbUserId, // Use the validated database user ID
        email: user[0].email,
        firstName: user[0].firstName,
        lastName: user[0].lastName,
        role: user[0].role,
        isActive: user[0].isActive,
        managerId: user[0].managerId,
        department: user[0].department,
        position: user[0].position
      };
      
    } catch (dbError) {
      console.error('🔐 Auth middleware - Database query error:', dbError);
      return res.status(500).json({
        error: 'Database query failed',
        code: 'DB_QUERY_ERROR'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ 
        error: 'User account is deactivated',
        code: 'USER_DEACTIVATED'
      });
    }

    // Check if account is locked
    if (req.user.accountLockedUntil && new Date() < new Date(req.user.accountLockedUntil)) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED',
        lockedUntil: req.user.accountLockedUntil
      });
    }

    // Debug: Log the user object being set
    console.log('🔐 Auth middleware - Setting req.user:', {
      id: req.user.id,
      idType: typeof req.user.id,
      idIsNaN: isNaN(req.user.id),
      email: req.user.email,
      role: req.user.role
    });
    
    // Additional validation before setting req.user
    if (isNaN(req.user.id) || req.user.id === null || req.user.id === undefined) {
      console.error('🔐 Auth middleware - CRITICAL: Invalid user ID detected:', {
        id: req.user.id,
        idType: typeof req.user.id,
        idIsNaN: isNaN(req.user.id),
        originalDecodedId: decoded.id,
        originalDecodedIdType: typeof decoded.id,
        databaseUserId: user[0].id,
        databaseUserIdType: typeof user[0].id
      });
      return res.status(500).json({
        error: 'Authentication failed - Invalid user ID',
        code: 'INVALID_USER_ID_IN_AUTH'
      });
    }

    next();
  } catch (error) {
    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }
    
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      
      if (user && user.length > 0 && user[0].isActive) {
        req.user = {
          id: user[0].id,
          email: user[0].email,
          firstName: user[0].firstName,
          lastName: user[0].lastName,
          role: user[0].role,
          isActive: user[0].isActive,
          managerId: user[0].managerId,
          department: user[0].department,
          position: user[0].position
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Refresh token middleware
export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    
    // Check if user exists and is active
    const user = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    
    if (!user || user.length === 0 || !user[0].isActive) {
      return res.status(401).json({ 
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      });
    }

    req.user = {
      id: user[0].id,
      email: user[0].email,
      firstName: user[0].firstName,
      lastName: user[0].lastName,
      role: user[0].role
    };

    next();
  } catch (error) {
    return res.status(401).json({ 
      error: 'Invalid refresh token',
      code: 'REFRESH_TOKEN_INVALID'
    });
  }
};
