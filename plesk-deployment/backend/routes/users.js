import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { users } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/roleCheck.js';
import { eq, and, like, desc, asc, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Validation middleware
const validateUser = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').isLength({ min: 1, max: 100 }).withMessage('First name is required (1-100 characters)'),
  body('lastName').isLength({ min: 1, max: 100 }).withMessage('Last name is required (1-100 characters)'),
  body('role').isIn(['manager', 'agent']).withMessage('Valid role is required'),
  body('department').optional().isLength({ min: 1, max: 100 }).withMessage('Department must be 1-100 characters'),
  body('position').optional().isLength({ min: 1, max: 100 }).withMessage('Position must be 1-100 characters')
];

// GET / - Get all users (managers only)
router.get('/', authenticateToken, requireManager, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['manager', 'agent']).withMessage('Valid role is required'),
  query('department').optional().isLength({ min: 1 }).withMessage('Department is required if provided'),
  query('search').optional().isLength({ min: 1 }).withMessage('Search term is required if provided')
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

    const { page = 1, limit = 20, role, department, search } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('🔍 [GET /api/users] Query params:', { page, limit, role, department, search });

    // Build where conditions
    let whereConditions = [];

    // Always exclude deleted users
    whereConditions.push(sql`${users.deletedAt} IS NULL`);

    if (role) {
      whereConditions.push(eq(users.role, role));
    }

    if (department) {
      whereConditions.push(eq(users.department, department));
    }

    if (search) {
      whereConditions.push(
        or(
          like(users.firstName, `%${search}%`),
          like(users.lastName, `%${search}%`),
          like(users.email, `%${search}%`)
        )
      );
    }

    // Build query
    let query = db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
      department: users.department,
      position: users.position,
      hireDate: users.hireDate,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLogin: users.lastLogin
    }).from(users);

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Get total count for pagination
    const countQuery = db.select({ count: users.id }).from(users);
    if (whereConditions.length > 0) {
      countQuery.where(and(...whereConditions));
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;
    
    console.log('🔍 [GET /api/users] Total users found:', total);

    // Get paginated results
    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(parseInt(limit))
      .offset(offset);
    
    console.log('🔍 [GET /api/users] Results:', results.length, 'users returned');
    console.log('🔍 [GET /api/users] First user sample:', results[0]);

    res.json({
      message: 'Users retrieved successfully',
      users: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST / - Create new user (managers only)
router.post('/', authenticateToken, requireManager, [
  body('email').isEmail().withMessage('Valid email is required'),
  body('firstName').isLength({ min: 1, max: 100 }).withMessage('First name is required (1-100 characters)'),
  body('lastName').isLength({ min: 1, max: 100 }).withMessage('Last name is required (1-100 characters)'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').isIn(['manager', 'agent']).withMessage('Valid role is required')
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

    const { email, firstName, lastName, password, role } = req.body;

    // Check if user already exists
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const newUser = await db.insert(users).values({
      email,
      firstName,
      lastName,
      passwordHash: hashedPassword,
      role,
      isActive: true,
      hireDate: new Date().toISOString().split('T')[0], // Convert to YYYY-MM-DD format for date field
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    if (newUser.length === 0) {
      throw new Error('Failed to create user');
    }

    const createdUser = newUser[0];

    // Return user without password
    const { password: _, ...userWithoutPassword } = createdUser;

    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /:id - Update user (managers only)
router.put('/:id', authenticateToken, requireManager, [
  body('email').optional().isEmail().withMessage('Valid email is required if provided'),
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters if provided'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters if provided'),
  body('role').optional().isIn(['manager', 'agent']).withMessage('Valid role is required if provided'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean if provided')
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

    const userId = parseInt(req.params.id);
    const updateData = req.body;

    // Check if user exists
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if email is being changed and if it's already taken
    if (updateData.email) {
      const emailCheck = await db.select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.email, updateData.email),
          eq(users.id, userId)
        ))
        .limit(1);

      if (emailCheck.length === 0) {
        return res.status(409).json({
          error: 'Email is already taken by another user',
          code: 'EMAIL_TAKEN'
        });
      }
    }

    // Update user
    const updatedUser = await db.update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      throw new Error('Failed to update user');
    }

    const user = updatedUser[0];
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: 'User updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /:id - Delete user (managers only)
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existingUser = await db.select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent deleting the last manager
    if (existingUser[0].role === 'manager') {
      // Count only active managers
      const managerCountResult = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(and(
          eq(users.role, 'manager'),
          eq(users.isActive, true)
        ));

      const activeManagerCount = parseInt(managerCountResult[0]?.count || 0);
      
      if (activeManagerCount <= 1) {
        return res.status(400).json({
          error: 'Cannot delete the last active manager',
          code: 'LAST_MANAGER'
        });
      }
    }

    // Soft delete by setting isActive to false and recording deletion timestamp
    await db.update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /:id/reactivate - Reactivate deleted user (managers only)
router.put('/:id/reactivate', authenticateToken, requireManager, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // Check if user exists
    const existingUser = await db.select({ id: users.id, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is actually deleted
    if (!existingUser[0].deletedAt) {
      return res.status(400).json({
        error: 'User is not deleted',
        code: 'USER_NOT_DELETED'
      });
    }

    // Reactivate user by clearing deletedAt and setting isActive to true
    await db.update(users)
      .set({
        isActive: true,
        deletedAt: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    res.json({
      message: 'User reactivated successfully'
    });

  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /agents - Get all agents (for dropdowns)
router.get('/agents', authenticateToken, async (req, res) => {
  try {
    const agents = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      department: users.department
    })
    .from(users)
    .where(and(
      eq(users.isActive, true),
      eq(users.deletedAt, null)
    ))
    .orderBy(asc(users.firstName));

    res.json({
      message: 'Agents retrieved successfully',
      agents
    });

  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive,
      deletedAt: users.deletedAt,
      bio: users.bio,
      avatarPath: users.avatarPath,
      phone: users.phone,
      dateOfBirth: users.dateOfBirth,
      address: users.address,
      city: users.city,
      state: users.state,
      zipCode: users.zipCode,
      country: users.country,
      department: users.department,
      position: users.position,
      hireDate: users.hireDate,
      managerId: users.managerId,
      timezone: users.timezone,
      language: users.language,
      dateFormat: users.dateFormat,
      timeFormat: users.timeFormat,
      linkedinUrl: users.linkedinUrl,
      twitterUrl: users.twitterUrl,
      facebookUrl: users.facebookUrl,
      websiteUrl: users.websiteUrl,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLogin: users.lastLogin
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Map the response to frontend format
    const userData = user[0];
    const profileData = {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      isActive: userData.isActive,
      deletedAt: userData.deletedAt,
      bio: userData.bio,
      avatarPath: userData.avatarPath,
      phone: userData.phone,
      dateOfBirth: userData.dateOfBirth,
      address: userData.address,
      location: userData.city, // Map city to location for frontend
      state: userData.state,
      zipCode: userData.zipCode,
      country: userData.country,
      department: userData.department,
      position: userData.position,
      hireDate: userData.hireDate,
      managerId: userData.managerId,
      timezone: userData.timezone,
      language: userData.language,
      dateFormat: userData.dateFormat,
      timeFormat: userData.timeFormat,
      website: userData.websiteUrl, // Map websiteUrl to website for frontend
      linkedin: userData.linkedinUrl, // Map linkedinUrl to linkedin for frontend
      twitter: userData.twitterUrl, // Map twitterUrl to twitter for frontend
      facebook: userData.facebookUrl, // Map facebookUrl to facebook for frontend
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLogin: userData.lastLogin
    };

    res.json({
      message: 'Profile retrieved successfully',
      profile: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /settings - Get current user settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await db.select({
      id: users.id,
      timezone: users.timezone,
      language: users.language,
      dateFormat: users.dateFormat,
      timeFormat: users.timeFormat,
      emailNotifications: users.emailNotifications,
      smsNotifications: users.smsNotifications,
      pushNotifications: users.pushNotifications,
      notifySalesUpdates: users.notifySalesUpdates,
      notifyClientActivities: users.notifyClientActivities,
      notifyGoalProgress: users.notifyGoalProgress,
      notifyReminders: users.notifyReminders,
      notifyTeamUpdates: users.notifyTeamUpdates,
      profileVisibility: users.profileVisibility,
      showContactInfo: users.showContactInfo,
      showPerformanceStats: users.showPerformanceStats
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const userData = user[0];
    const settings = {
      preferences: {
        timezone: userData.timezone,
        language: userData.language,
        dateFormat: userData.dateFormat,
        timeFormat: userData.timeFormat
      },
      notifications: {
        email_enabled: userData.emailNotifications,
        sms_enabled: userData.smsNotifications,
        push_enabled: userData.pushNotifications,
        sales_updates: userData.notifySalesUpdates,
        client_activities: userData.notifyClientActivities,
        goal_progress: userData.notifyGoalProgress,
        reminders: userData.notifyReminders,
        team_updates: userData.notifyTeamUpdates
      },
      privacy: {
        profile_visibility: userData.profileVisibility,
        show_contact_info: userData.showContactInfo,
        show_performance_stats: userData.showPerformanceStats
      }
    };

    res.json({
      message: 'Settings retrieved successfully',
      settings: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /notifications - Get current user notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    // For now, return empty notifications array
    // This can be expanded later with actual notification system
    res.json({
      message: 'Notifications retrieved successfully',
      notifications: []
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PATCH /notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    // For now, just return success since we don't have a notifications table yet
    // This can be expanded later with actual notification system
    res.json({
      message: 'Notification marked as read successfully'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PATCH /notifications/read-all - Mark all notifications as read
router.patch('/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    // For now, just return success since we don't have a notifications table yet
    // This can be expanded later with actual notification system
    res.json({
      message: 'All notifications marked as read successfully'
    });

  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /settings/preferences - Update user preferences
router.put('/settings/preferences', authenticateToken, [
  body('timezone').optional().isLength({ max: 50 }).withMessage('Timezone must be less than 50 characters'),
  body('language').optional().isLength({ max: 10 }).withMessage('Language must be less than 10 characters'),
  body('dateFormat').optional().isLength({ max: 20 }).withMessage('Date format must be less than 20 characters'),
  body('timeFormat').optional().isLength({ max: 10 }).withMessage('Time format must be less than 10 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    const updatedUser = await db.update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Preferences updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /settings/notifications - Update notification settings
router.put('/settings/notifications', authenticateToken, [
  body('email_enabled').optional().isBoolean().withMessage('Email notifications must be a boolean'),
  body('sms_enabled').optional().isBoolean().withMessage('SMS notifications must be a boolean'),
  body('push_enabled').optional().isBoolean().withMessage('Push notifications must be a boolean'),
  body('sales_updates').optional().isBoolean().withMessage('Sales updates must be a boolean'),
  body('client_activities').optional().isBoolean().withMessage('Client activities must be a boolean'),
  body('goal_progress').optional().isBoolean().withMessage('Goal progress must be a boolean'),
  body('reminders').optional().isBoolean().withMessage('Reminders must be a boolean'),
  body('team_updates').optional().isBoolean().withMessage('Team updates must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Map frontend field names to database field names
    const mappedData = {};
    if (updateData.email_enabled !== undefined) mappedData.emailNotifications = updateData.email_enabled;
    if (updateData.sms_enabled !== undefined) mappedData.smsNotifications = updateData.sms_enabled;
    if (updateData.push_enabled !== undefined) mappedData.pushNotifications = updateData.push_enabled;
    if (updateData.sales_updates !== undefined) mappedData.notifySalesUpdates = updateData.sales_updates;
    if (updateData.client_activities !== undefined) mappedData.notifyClientActivities = updateData.client_activities;
    if (updateData.goal_progress !== undefined) mappedData.notifyGoalProgress = updateData.goal_progress;
    if (updateData.reminders !== undefined) mappedData.notifyReminders = updateData.reminders;
    if (updateData.team_updates !== undefined) mappedData.notifyTeamUpdates = updateData.team_updates;

    mappedData.updatedAt = new Date();

    const updatedUser = await db.update(users)
      .set(mappedData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Notification settings updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /settings/privacy - Update privacy settings
router.put('/settings/privacy', authenticateToken, [
  body('profile_visibility').optional().isIn(['public', 'team', 'private']).withMessage('Profile visibility must be public, team, or private'),
  body('show_contact_info').optional().isBoolean().withMessage('Show contact info must be a boolean'),
  body('show_performance_stats').optional().isBoolean().withMessage('Show performance stats must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = req.body;

    // Map frontend field names to database field names
    const mappedData = {};
    if (updateData.profile_visibility !== undefined) mappedData.profileVisibility = updateData.profile_visibility;
    if (updateData.show_contact_info !== undefined) mappedData.showContactInfo = updateData.show_contact_info;
    if (updateData.show_performance_stats !== undefined) mappedData.showPerformanceStats = updateData.show_performance_stats;

    mappedData.updatedAt = new Date();

    const updatedUser = await db.update(users)
      .set(mappedData)
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      message: 'Privacy settings updated successfully',
      user: updatedUser[0]
    });

  } catch (error) {
    console.error('Update privacy error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /profile/password - Change current user password
router.put('/profile/password', authenticateToken, [
  body('current_password').isLength({ min: 1 }).withMessage('Current password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    // Get current user with password hash
    const user = await db.select({
      id: users.id,
      passwordHash: users.passwordHash
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

    if (!user || user.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user[0].passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Current password is incorrect',
        code: 'INVALID_PASSWORD'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    const updatedUser = await db.update(users)
      .set({
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      throw new Error('Failed to update password');
    }

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /debug-token - Debug endpoint to test token decoding (temporary)
router.get('/debug-token', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Debug Token Endpoint - req.user:', req.user);
    console.log('🔍 Debug Token Endpoint - req.user.id:', req.user.id, 'Type:', typeof req.user.id);
    console.log('🔍 Debug Token Endpoint - isNaN(req.user.id):', isNaN(req.user.id));
    
    res.json({
      message: 'Token debug info',
      user: req.user,
      userId: req.user.id,
      userIdType: typeof req.user.id,
      isNaN: isNaN(req.user.id),
      headers: {
        authorization: req.headers.authorization ? 'Token present' : 'No token',
        contentType: req.headers['content-type']
      }
    });
  } catch (error) {
    console.error('Debug token error:', error);
    res.status(500).json({
      error: 'Debug endpoint error',
      code: 'DEBUG_ERROR'
    });
  }
});

// PUT /profile - Update current user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),
  body('lastName').optional().isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),
  body('phone').optional().isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),
  body('bio').optional().isLength({ max: 1000 }).withMessage('Bio must be less than 1000 characters'),
  body('department').optional().isLength({ max: 100 }).withMessage('Department must be less than 100 characters'),
  body('position').optional().isLength({ max: 100 }).withMessage('Position must be less than 100 characters'),
  body('location').optional().isLength({ max: 100 }).withMessage('Location must be less than 100 characters'),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
  body('linkedin').optional().isURL().withMessage('LinkedIn must be a valid URL'),
  body('twitter').optional().isURL().withMessage('Twitter must be a valid URL')
], async (req, res) => {
  try {
    console.log('Profile update - req.user:', req.user);
    console.log('Profile update - req.user.id:', req.user.id, 'Type:', typeof req.user.id);
    console.log('Profile update - req.user.id === NaN:', req.user.id === NaN);
    console.log('Profile update - req.user.id === null:', req.user.id === null);
    console.log('Profile update - req.user.id === undefined:', req.user.id === undefined);
    console.log('Profile update - Number.isNaN(req.user.id):', Number.isNaN(req.user.id));
    console.log('Profile update - Object.is(req.user.id, NaN):', Object.is(req.user.id, NaN));
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Profile update - Validation errors:', errors.array());
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const userId = req.user.id;
    console.log('Profile update - userId before validation:', userId, 'Type:', typeof userId);
    
    // Enhanced validation to catch NaN and invalid user IDs
    if (!userId || isNaN(userId) || typeof userId !== 'number' || userId <= 0) {
      console.error('Profile update - Invalid userId:', userId, 'Type:', typeof userId, 'isNaN:', isNaN(userId));
      return res.status(400).json({
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID',
        details: {
          userId: userId,
          type: typeof userId,
          isNaN: isNaN(userId)
        }
      });
    }
    
    const validUserId = parseInt(userId, 10);
    console.log('Profile update - validUserId after parseInt:', validUserId, 'Type:', typeof validUserId);
    
    if (isNaN(validUserId) || validUserId <= 0) {
      console.error('Profile update - Failed to parse userId:', validUserId);
      return res.status(400).json({
        error: 'Invalid user ID format',
        code: 'INVALID_USER_ID_FORMAT',
        details: {
          originalUserId: userId,
          parsedUserId: validUserId
        }
      });
    }

    const updateData = req.body;
    console.log('Profile update - updateData:', updateData);
    console.log('Profile update - updateData keys:', Object.keys(updateData));

    // Remove fields that shouldn't be updated by users
    delete updateData.id;
    delete updateData.email;
    delete updateData.role;
    delete updateData.isActive;
    delete updateData.passwordHash;
    delete updateData.createdAt;

    // Map frontend field names to database field names
    const mappedData = {};
    
    // Only include fields that exist in the database schema
    if (updateData.firstName !== undefined) mappedData.firstName = updateData.firstName;
    if (updateData.lastName !== undefined) mappedData.lastName = updateData.lastName;
    if (updateData.phone !== undefined) mappedData.phone = updateData.phone;
    if (updateData.bio !== undefined) mappedData.bio = updateData.bio;
    if (updateData.department !== undefined) mappedData.department = updateData.department;
    if (updateData.position !== undefined) mappedData.position = updateData.position;
    
    // Map location to city (if city field exists)
    if (updateData.location !== undefined) mappedData.city = updateData.location;
    
    // Map social media fields (if they exist)
    if (updateData.website !== undefined) mappedData.websiteUrl = updateData.website;
    if (updateData.linkedin !== undefined) mappedData.linkedinUrl = updateData.linkedin;
    if (updateData.twitter !== undefined) mappedData.twitterUrl = updateData.twitter;
    
    // Only include these if they exist in schema
    if (updateData.timezone !== undefined) mappedData.timezone = updateData.timezone;
    if (updateData.language !== undefined) mappedData.language = updateData.language;

    console.log('Profile update - mappedData:', mappedData);
    console.log('Profile update - mappedData keys:', Object.keys(mappedData));

    // Check if we have any data to update
    if (Object.keys(mappedData).length === 0) {
      console.log('Profile update - No valid fields to update');
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'NO_VALID_FIELDS'
      });
    }

    // Add updated timestamp
    mappedData.updatedAt = new Date();

    console.log('Profile update - About to update database with:', mappedData);
    console.log('Profile update - SQL WHERE condition: userId =', validUserId);

    try {
      const updatedUser = await db.update(users)
        .set(mappedData)
        .where(eq(users.id, validUserId))
        .returning();

      console.log('Profile update - Database update result:', updatedUser);

      if (!updatedUser || updatedUser.length === 0) {
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Map the response back to frontend format
      const user = updatedUser[0];
      const responseUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        phone: user.phone || '',
        bio: user.bio || '',
        department: user.department || '',
        position: user.position || '',
        location: user.city || '', // Map from city back to location
        website: user.websiteUrl || '', // Map from websiteUrl back to website
        linkedin: user.linkedinUrl || '', // Map from linkedinUrl back to linkedin
        twitter: user.twitterUrl || '', // Map from twitterUrl back to twitter
        timezone: user.timezone || 'UTC',
        language: user.language || 'en',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin
      };

      console.log('Profile update - Final response user:', responseUser);
      console.log('Profile update - Response user keys:', Object.keys(responseUser));

      res.json({
        message: 'Profile updated successfully',
        user: responseUser
      });

    } catch (dbError) {
      console.error('Profile update - Database error:', dbError);
      
      // Check if it's a column not found error
      if (dbError.message && dbError.message.includes('column') && dbError.message.includes('does not exist')) {
        return res.status(400).json({
          error: 'Some profile fields are not supported',
          code: 'UNSUPPORTED_FIELDS',
          details: 'The database schema does not support all requested fields'
        });
      }
      
      // Generic database error
      return res.status(500).json({
        error: 'Database update failed',
        code: 'DB_UPDATE_ERROR',
        details: dbError.message
      });
    }

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /:id/reset-password - Reset user password (managers only)
router.post('/:id/reset-password', authenticateToken, requireManager, [
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
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

    const userId = parseInt(req.params.id);
    const { new_password } = req.body;

    console.log('🔧 Password reset - User ID:', userId);
    console.log('🔧 Password reset - New password length:', new_password.length);

    // Check if user exists
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user || user.length === 0) {
      console.log('🔧 Password reset - User not found');
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log('🔧 Password reset - User found:', user[0].email);

    // Hash the new password
    const saltRounds = 12; // Standardized to match profile password change
    const hashedPassword = await bcrypt.hash(new_password, saltRounds);
    
    console.log('🔧 Password reset - Password hashed successfully');
    console.log('🔧 Password reset - Hash length:', hashedPassword.length);

    // Update the user's password
    const updatedUser = await db.update(users)
      .set({
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    console.log('🔧 Password reset - Database update successful');
    console.log('🔧 Password reset - Updated user ID:', updatedUser[0].id);

    res.json({
      message: 'Password reset successfully',
      user: {
        id: updatedUser[0].id,
        passwordUpdated: true,
        updatedAt: updatedUser[0].updatedAt
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
