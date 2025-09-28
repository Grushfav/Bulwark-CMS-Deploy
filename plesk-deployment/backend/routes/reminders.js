import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { reminders, clients, users } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { eq, and, like, desc, asc, or, gte, lte, count } from 'drizzle-orm';

const router = express.Router();

// Validation middleware
const validateReminder = [
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required (1-255 characters)'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('reminderDate').optional().isISO8601().withMessage('Valid reminder date is required'),
  body('reminder_date').optional().isISO8601().withMessage('Valid reminder date is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  body('type').optional().isIn(['call_back', 'outstanding_documents', 'delayed_start_date', 'follow_up', 'policy_renewal']).withMessage('Valid reminder type is required'),
  body('clientId').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return Number.isInteger(parseInt(value)) && parseInt(value) > 0;
  }).withMessage('Client ID must be a positive integer if provided'),
  body('client_id').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return Number.isInteger(parseInt(value)) && parseInt(value) > 0;
  }).withMessage('Client ID must be a positive integer if provided')
];

// GET / - Get reminders (filtered by user role)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Valid priority is required'),
  query('type').optional().isIn(['call_back', 'outstanding_documents', 'delayed_start_date', 'follow_up', 'policy_renewal']).withMessage('Valid reminder type is required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  // Note: agent_id parameter removed since managers now only see their own reminders
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedData: req.body
      });
    }

    const { page = 1, limit = 20, priority, type, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering - Both managers and agents see only their own reminders
    whereConditions.push(eq(reminders.agentId, userId));
    console.log(`👤 ${userRole === 'manager' ? 'Manager' : 'Agent'} access: viewing own reminders only`);
    
    // Note: Removed agent_id filtering since managers now only see their own reminders
    
    // Apply other filters for all users
    if (priority) {
      whereConditions.push(eq(reminders.priority, priority));
    }
    if (type) {
      whereConditions.push(eq(reminders.type, type));
    }

    // Date range filter
    if (startDate) {
      whereConditions.push(gte(reminders.reminderDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(reminders.reminderDate, endDate));
    }

    // Build query
    let query = db.select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      reminder_date: reminders.reminderDate, // Frontend expects reminder_date
      priority: reminders.priority,
      status: reminders.type, // Frontend expects status, not type
      is_completed: reminders.isCompleted, // Frontend expects is_completed
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      client_id: reminders.clientId, // Add client_id for reference
      client_name: clients.firstName, // We'll handle concatenation in the response
      client_last_name: clients.lastName, // Add last name separately
      agent_id: reminders.agentId
    })
    .from(reminders)
    .leftJoin(clients, eq(reminders.clientId, clients.id))
    .leftJoin(users, eq(reminders.agentId, users.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Get total count for pagination
    let countQuery = db.select({ count: count(reminders.id) }).from(reminders);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions));
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const results = await query
      .orderBy(asc(reminders.reminderDate))
      .limit(parseInt(limit))
      .offset(offset);

    // Process results to concatenate client names
    const processedResults = results.map(reminder => ({
      ...reminder,
      client_name: reminder.client_name && reminder.client_last_name ? 
        `${reminder.client_name} ${reminder.client_last_name}` : 
        null
    }));

    res.json({
      message: 'Reminders retrieved successfully',
      reminders: processedResults,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST / - Create new reminder
router.post('/', authenticateToken, validateReminder, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedData: req.body
      });
    }

    const userId = req.user.id;
    const requestBody = req.body;
    
    // Map both snake_case and camelCase field names
    const reminderData = {
      title: requestBody.title,
      description: requestBody.description,
      reminderDate: new Date(requestBody.reminder_date || requestBody.reminderDate), // Convert to Date object
      priority: requestBody.priority,
      type: requestBody.type, // Frontend sends 'type', backend expects 'type'
      clientId: requestBody.client_id || requestBody.clientId || null
    };

    // Validate date
    if (isNaN(reminderData.reminderDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        code: 'INVALID_DATE',
        details: 'Please provide a valid date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'
      });
    }

    // Create reminder
    const newReminder = await db.insert(reminders).values({
      title: reminderData.title,
      description: reminderData.description,
      reminderDate: reminderData.reminderDate,
      priority: reminderData.priority,
      type: reminderData.type,
      clientId: reminderData.clientId,
      agentId: userId,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder: newReminder[0]
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /:id - Get reminder by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get reminder with client and agent information
    const reminder = await db.select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      reminder_date: reminders.reminderDate, // Frontend expects reminder_date
      priority: reminders.priority,
      status: reminders.type, // Frontend expects status, not type
      is_completed: reminders.isCompleted, // Frontend expects is_completed
      createdAt: reminders.createdAt,
      updatedAt: reminders.updatedAt,
      client_id: reminders.clientId, // Add client_id for reference
      client_name: clients.firstName, // We'll handle concatenation in the response
      client_last_name: clients.lastName, // Add last name separately
      agent_id: reminders.agentId
    })
    .from(reminders)
    .leftJoin(clients, eq(reminders.clientId, clients.id))
    .leftJoin(users, eq(reminders.agentId, users.id))
    .where(eq(reminders.id, reminderId))
    .limit(1);

    if (!reminder || reminder.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND'
      });
    }

    const item = reminder[0];

    // Process item to concatenate client names
    const processedItem = {
      ...item,
      client_name: item.client_name && item.client_last_name ? 
        `${item.client_name} ${item.client_last_name}` : 
        null
    };

    // Check access permissions
    if (processedItem.agent_id !== userId && userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      message: 'Reminder retrieved successfully',
      reminder: processedItem
    });

  } catch (error) {
    console.error('Get reminder by ID error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /:id - Update reminder
router.put('/:id', authenticateToken, validateReminder, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedData: req.body
      });
    }

    const reminderId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if reminder exists and user has permission to edit
    const existingReminder = await db.select({
      id: reminders.id,
      agentId: reminders.agentId
    })
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .limit(1);

    if (!existingReminder || existingReminder.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND'
      });
    }

    const item = existingReminder[0];

    // Check edit permissions
    if (item.agentId !== userId && userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    const requestBody = req.body;
    
    // Map both snake_case and camelCase field names
    const updateData = {
      title: requestBody.title,
      description: requestBody.description,
      reminderDate: new Date(requestBody.reminder_date || requestBody.reminderDate), // Convert to Date object
      priority: requestBody.priority,
      type: requestBody.type, // Frontend sends 'type', backend expects 'type'
      clientId: requestBody.client_id || requestBody.clientId || null,
      updatedAt: new Date()
    };

    // Validate date
    if (isNaN(updateData.reminderDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        code: 'INVALID_DATE',
        details: 'Please provide a valid date in ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)'
      });
    }

    // Update reminder
    const updatedReminder = await db.update(reminders)
      .set(updateData)
      .where(eq(reminders.id, reminderId))
      .returning();

    res.json({
      message: 'Reminder updated successfully',
      reminder: updatedReminder[0]
    });

  } catch (error) {
    console.error('Update reminder error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /:id - Delete reminder
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if reminder exists and user has permission to delete
    const existingReminder = await db.select({
      id: reminders.id,
      agentId: reminders.agentId
    })
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .limit(1);

    if (!existingReminder || existingReminder.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND'
      });
    }

    const item = existingReminder[0];

    // Check delete permissions
    if (item.agentId !== userId && userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete reminder
    await db.delete(reminders).where(eq(reminders.id, reminderId));

    res.json({
      message: 'Reminder deleted successfully'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /upcoming - Get upcoming reminders for dashboard
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const today = new Date().toISOString().split('T')[0]; // Get today's date as YYYY-MM-DD

    // Build where conditions
    let whereConditions = [
      gte(reminders.reminderDate, today),
      eq(reminders.isCompleted, false)
    ];

    // Role-based filtering
    if (userRole !== 'manager') {
      whereConditions.push(eq(reminders.agentId, userId));
    }

    // Get upcoming reminders
    const upcomingReminders = await db.select({
      id: reminders.id,
      title: reminders.title,
      description: reminders.description,
      reminder_date: reminders.reminderDate, // Frontend expects reminder_date
      priority: reminders.priority,
      status: reminders.type, // Frontend expects status, not type
      is_completed: reminders.isCompleted, // Frontend expects is_completed
      client_id: reminders.clientId, // Add client_id for reference
      client_name: clients.firstName, // We'll handle concatenation in the response
      client_last_name: clients.lastName, // Add last name separately
      agent_id: reminders.agentId
    })
    .from(reminders)
    .leftJoin(clients, eq(reminders.clientId, clients.id))
    .leftJoin(users, eq(reminders.agentId, users.id))
    .where(and(...whereConditions))
    .orderBy(asc(reminders.reminderDate))
    .limit(10);

    // Process results to concatenate client names
    const processedUpcomingReminders = upcomingReminders.map(reminder => ({
      ...reminder,
      client_name: reminder.client_name && reminder.client_last_name ? 
        `${reminder.client_name} ${reminder.client_last_name}` : 
        null
    }));

    res.json({
      message: 'Upcoming reminders retrieved successfully',
      reminders: processedUpcomingReminders
    });

  } catch (error) {
    console.error('Get upcoming reminders error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /:id/complete - Mark reminder as completed
router.put('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const reminderId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if reminder exists and user has permission to complete
    const existingReminder = await db.select({
      id: reminders.id,
      agentId: reminders.agentId,
      isCompleted: reminders.isCompleted
    })
    .from(reminders)
    .where(eq(reminders.id, reminderId))
    .limit(1);

    if (!existingReminder || existingReminder.length === 0) {
      return res.status(404).json({
        error: 'Reminder not found',
        code: 'REMINDER_NOT_FOUND'
      });
    }

    const item = existingReminder[0];

    // Check permissions
    if (item.agentId !== userId && userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    if (item.isCompleted) {
      return res.status(400).json({
        error: 'Reminder is already completed',
        code: 'ALREADY_COMPLETED'
      });
    }

    // Mark as completed
    const updatedReminder = await db.update(reminders)
      .set({
        isCompleted: true,
        updatedAt: new Date()
      })
      .where(eq(reminders.id, reminderId))
      .returning();

    res.json({
      message: 'Reminder marked as completed',
      reminder: updatedReminder[0]
    });

  } catch (error) {
    console.error('Complete reminder error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
