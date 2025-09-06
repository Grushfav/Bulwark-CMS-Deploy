import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { clients, users, clientNotes, goals } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager, canViewAllData } from '../middleware/roleCheck.js';
import { uploadBulk } from '../middleware/upload.js';
import { eq, and, like, or, desc, asc, count } from 'drizzle-orm';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Function to update goal progress when a client is created
const updateGoalProgressOnClientCreate = async (agentId) => {
  try {
    // Get all active client_count goals for this agent
    const clientCountGoals = await db.select().from(goals).where(
      and(
        eq(goals.agentId, agentId),
        eq(goals.metricType, 'client_count'),
        eq(goals.isActive, true)
      )
    );

    for (const goal of clientCountGoals) {
      // Increment the current value by 1 for each new client
      const newCurrentValue = parseFloat(goal.currentValue) + 1;
      
      await db.update(goals)
        .set({
          currentValue: newCurrentValue,
          updatedAt: new Date()
        })
        .where(eq(goals.id, goal.id));
      
      console.log(`Updated client_count goal ${goal.id} from ${goal.currentValue} to ${newCurrentValue}`);
    }
  } catch (error) {
    console.error('Error updating goal progress on client create:', error);
    // Don't fail the client creation if goal update fails
  }
};

// Validation middleware
const validateClient = [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name is required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().isLength({ min: 7, max: 15 }).withMessage('Phone number must be between 7 and 15 characters'),
  body('status').optional().isIn(['prospect', 'client']).withMessage('Valid status is required')
];

const validateClientNote = [
  body('note').trim().isLength({ min: 1 }).withMessage('Note content is required'),
  body('noteType').optional().isIn(['general', 'follow_up', 'policy', 'important']).withMessage('Valid note type is required')
];

// Debug endpoint to check user permissions and client access
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Get total client counts
    const totalClients = await db.select({ count: count(clients.id) }).from(clients);
    const userClients = await db.select({ count: count(clients.id) }).from(clients).where(eq(clients.agentId, userId));
    
    res.json({
      message: 'Client debug info',
      user: {
        id: userId,
        role: userRole,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      clientCounts: {
        total: totalClients[0]?.count || 0,
        userOwned: userClients[0]?.count || 0
      },
      permissions: {
        canViewAllClients: userRole === 'manager',
        canViewOwnClients: userRole === 'agent',
        canCreateClients: userRole === 'manager' || userRole === 'agent'
      }
    });
  } catch (error) {
    console.error('Client debug endpoint error:', error);
    res.status(500).json({ error: 'Client debug failed' });
  }
});

// GET /clients - Get all clients (filtered by user role)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim(),
  query('status').optional().isIn(['prospect', 'client']).withMessage('Valid status is required'),
  query('agent_id').optional().isInt({ min: 1 }).withMessage('Valid agent ID is required')
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

    const { page = 1, limit = 20, search, status, agent_id } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering
    console.log('🔍 Role-based filtering - User role:', userRole, 'User ID:', userId);
    if (userRole === 'manager') {
      // Managers can see all clients
      console.log('🔍 Manager access - can see all clients');
      if (agent_id) {
        whereConditions.push(eq(clients.agentId, parseInt(agent_id)));
        console.log('🔍 Filtering by specific agent:', agent_id);
      }
    } else {
      // Regular agents can only see their own clients
      console.log('🔍 Agent access - can only see own clients');
      whereConditions.push(eq(clients.agentId, userId));
    }
    
    console.log('🔍 Where conditions:', whereConditions);

    // Status filter
    if (status) {
      whereConditions.push(eq(clients.status, status));
    }

    // Search filter
    if (search) {
      whereConditions.push(
        or(
          like(clients.firstName, `%${search}%`),
          like(clients.lastName, `%${search}%`),
          like(clients.email, `%${search}%`),
          like(clients.phone, `%${search}%`),
          like(clients.employer, `%${search}%`)
        )
      );
    }

    // Build query
    let query = db.select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      dateOfBirth: clients.dateOfBirth,
      employer: clients.employer,
      status: clients.status,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      notes: clients.notes,
      agentId: clients.agentId,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(clients)
    .leftJoin(users, eq(clients.agentId, users.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Get total count for pagination
    const countQuery = db.select({ count: count(clients.id) }).from(clients);
    let finalCountQuery = countQuery;
    if (whereConditions.length > 0) {
      finalCountQuery = countQuery.where(and(...whereConditions));
    }
    const totalResult = await finalCountQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    console.log('🔍 Executing final query with conditions:', whereConditions);
    const results = await query
      .orderBy(desc(clients.createdAt))
      .limit(parseInt(limit))
      .offset(offset);
    
    console.log('🔍 Query results count:', results.length);
    console.log('🔍 First few results:', results.slice(0, 3));

    res.json({
      message: 'Clients retrieved successfully',
      clients: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /clients/:id - Get client by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get client with agent info
    const client = await db.select({
      id: clients.id,
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      dateOfBirth: clients.dateOfBirth,
      employer: clients.employer,
      status: clients.status,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      notes: clients.notes,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(clients)
    .leftJoin(users, eq(clients.agentId, users.id))
    .where(eq(clients.id, clientId))
    .limit(1);

    if (!client || client.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientData = client[0];

    // Check access permissions
    if (userRole !== 'manager' && clientData.agent.id !== userId) {
      return res.status(403).json({
        error: 'Access denied to this client',
        code: 'ACCESS_DENIED'
      });
    }

    // Get client notes
    const notes = await db.select().from(clientNotes)
      .where(eq(clientNotes.clientId, clientId))
      .orderBy(desc(clientNotes.createdAt));

    res.json({
      message: 'Client retrieved successfully',
      client: {
        ...clientData,
        notes
      }
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /clients - Create new client
router.post('/', authenticateToken, validateClient, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Client validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { firstName, lastName, email, phone, dateOfBirth, employer, status, notes } = req.body;
    const agentId = req.user.id;

    // Check if email already exists (if provided)
    if (email) {
      const existingClient = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
      if (existingClient && existingClient.length > 0) {
        return res.status(409).json({
          error: 'Client with this email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Create client
    const newClient = await db.insert(clients).values({
      agentId,
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth: dateOfBirth || null, // Keep as string for date field
      employer,
      status: status || 'prospect',
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Update goal progress after client creation
    await updateGoalProgressOnClientCreate(agentId);

    res.status(201).json({
      message: 'Client created successfully',
      client: newClient[0]
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /clients/:id - Update client
router.put('/:id', authenticateToken, validateClient, async (req, res) => {
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

    const clientId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    const { firstName, lastName, email, phone, dateOfBirth, employer, status, notes } = req.body;

    // Get client to check permissions
    const existingClient = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    
    if (!existingClient || existingClient.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientData = existingClient[0];

    // Check access permissions
    if (userRole !== 'manager' && clientData.agentId !== userId) {
      return res.status(403).json({
        error: 'Access denied to this client',
        code: 'ACCESS_DENIED'
      });
    }

    // Check if email already exists (if changed)
    if (email && email !== clientData.email) {
      const emailExists = await db.select().from(clients).where(eq(clients.email, email)).limit(1);
      if (emailExists && emailExists.length > 0) {
        return res.status(409).json({
          error: 'Client with this email already exists',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Update client
    const updatedClient = await db.update(clients)
      .set({
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth || null, // Keep as string for date field
        employer,
        status,
        notes,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId))
      .returning();

    res.json({
      message: 'Client updated successfully',
      client: updatedClient[0]
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /clients/:id - Delete client
router.delete('/:id', authenticateToken, requireManager, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);

    // Check if client exists
    const existingClient = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    
    if (!existingClient || existingClient.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    // Delete client notes first
    await db.delete(clientNotes).where(eq(clientNotes.clientId, clientId));

    // Delete client
    await db.delete(clients).where(eq(clients.id, clientId));

    res.json({
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /clients/:id/notes - Add note to client
router.post('/:id/notes', authenticateToken, validateClientNote, async (req, res) => {
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

    const clientId = parseInt(req.params.id);
    const agentId = req.user.id;
    const { note, noteType, isPrivate } = req.body;

    // Check if client exists and user has access
    const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    
    if (!client || client.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientData = client[0];

    // Check access permissions
    if (req.user.role !== 'manager' && clientData.agentId !== agentId) {
      return res.status(403).json({
        error: 'Access denied to this client',
        code: 'ACCESS_DENIED'
      });
    }

    // Create note
    const newNote = await db.insert(clientNotes).values({
      clientId,
      agentId,
      note,
      noteType: noteType || 'general',
      isPrivate: isPrivate || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.status(201).json({
      message: 'Note added successfully',
      note: newNote[0]
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /clients/:id/notes - Get all notes for a client
router.get('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const agentId = req.user.id;

    // Check if client exists and user has access
    const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    
    if (!client || client.length === 0) {
      return res.status(404).json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientData = client[0];

    // Check access permissions
    if (req.user.role !== 'manager' && clientData.agentId !== agentId) {
      return res.status(403).json({
        error: 'Access denied to this client',
        code: 'ACCESS_DENIED'
      });
    }

    // Get notes for this client
    const notes = await db.select({
      id: clientNotes.id,
      note: clientNotes.note,
      noteType: clientNotes.noteType,
      isPrivate: clientNotes.isPrivate,
      createdAt: clientNotes.createdAt,
      updatedAt: clientNotes.updatedAt,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(clientNotes)
    .leftJoin(users, eq(clientNotes.agentId, users.id))
    .where(eq(clientNotes.clientId, clientId))
    .orderBy(desc(clientNotes.createdAt));

    res.json({
      message: 'Notes retrieved successfully',
      notes: notes
    });

  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /clients/bulk-import - Bulk import clients from CSV
router.post('/bulk-import', authenticateToken, uploadBulk, async (req, res) => {
  try {
    console.log('📁 CSV Import - Request received:', {
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : null,
      user: req.user
    });

    if (!req.file) {
      console.log('❌ CSV Import - No file provided');
      return res.status(400).json({
        error: 'CSV file is required',
        code: 'FILE_REQUIRED'
      });
    }

    const filePath = req.file.path;
    const results = [];
    const errors = [];

    console.log('📁 CSV Import - Starting file parsing:', filePath);
    
    // Parse CSV file
    fs.createReadStream(filePath)
      .pipe(csv({
        headers: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'employer', 'status', 'notes'],
        skipEmptyLines: true
      }))
      .on('data', (data) => {
        console.log('📁 CSV Import - Parsing row:', data);
        
        // Skip header row if it's being processed as data
        if (data.firstName === 'firstName' && data.lastName === 'lastName') {
          console.log('📁 CSV Import - Skipping header row');
          return;
        }
        
        // Validate required fields
        if (!data.firstName || !data.lastName) {
          errors.push({
            row: results.length + 1,
            error: 'First name and last name are required'
          });
          return;
        }

        // Validate email format if provided
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
          errors.push({
            row: results.length + 1,
            error: 'Invalid email format'
          });
          return;
        }

        // Validate status if provided
        if (data.status && !['client', 'prospect'].includes(data.status.toLowerCase())) {
          errors.push({
            row: results.length + 1,
            error: 'Status must be either "client" or "prospect"'
          });
          return;
        }

        // Parse date of birth if provided
        let dateOfBirth = null;
        if (data.dateOfBirth || data.date_of_birth) {
          const dateStr = data.dateOfBirth || data.date_of_birth;
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            dateOfBirth = parsedDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
          }
        }

        results.push({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email ? data.email.trim() : null,
          phone: data.phone ? data.phone.trim() : null,
          dateOfBirth: dateOfBirth,
          employer: data.employer ? data.employer.trim() : null,
          status: data.status && data.status.toLowerCase() === 'client' ? 'client' : 'prospect',
          notes: data.notes ? data.notes.trim() : null
        });
      })
      .on('end', async () => {
        try {
          // Clean up file
          fs.unlinkSync(filePath);

          if (errors.length > 0) {
            return res.status(400).json({
              error: 'CSV validation failed',
              code: 'CSV_VALIDATION_ERROR',
              errors,
              validRows: results.length
            });
          }

          // Insert clients in batches
          const batchSize = 100;
          const insertedClients = [];

          for (let i = 0; i < results.length; i += batchSize) {
            const batch = results.slice(i, i + batchSize);
            const batchData = batch.map(client => ({
              ...client,
              agentId: req.user.id,
              createdAt: new Date(),
              updatedAt: new Date()
            }));

            const inserted = await db.insert(clients).values(batchData).returning();
            insertedClients.push(...inserted);
          }

          res.json({
            message: 'Bulk import completed successfully',
            imported_count: insertedClients.length,
            totalRows: results.length
          });

        } catch (error) {
          console.error('Bulk import error:', error);
          res.status(500).json({
            error: 'Bulk import failed',
            code: 'BULK_IMPORT_ERROR'
          });
        }
      })
      .on('error', (error) => {
        console.error('📁 CSV Import - Parsing error:', error);
        
        // Clean up file
        try {
          fs.unlinkSync(filePath);
          console.log('📁 CSV Import - File cleaned up after error');
        } catch (unlinkError) {
          console.error('📁 CSV Import - Error deleting file:', unlinkError);
        }

        res.status(400).json({
          error: 'Invalid CSV file',
          code: 'INVALID_CSV',
          details: error.message
        });
      });

  } catch (error) {
    console.error('📁 CSV Import - Main error:', error);
    console.error('📁 CSV Import - Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// GET /clients/export - Export clients to CSV
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { status, agent_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering
    if (userRole === 'manager') {
      if (agent_id) {
        whereConditions.push(eq(clients.agentId, parseInt(agent_id)));
      }
    } else {
      whereConditions.push(eq(clients.agentId, userId));
    }

    // Status filter
    if (status) {
      whereConditions.push(eq(clients.status, status));
    }

    // Get clients
    let query = db.select({
      firstName: clients.firstName,
      lastName: clients.lastName,
      email: clients.email,
      phone: clients.phone,
      employer: clients.employer,
      status: clients.status,
      createdAt: clients.createdAt,
      agentName: users.firstName
    })
    .from(clients)
    .leftJoin(users, eq(clients.agentId, users.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const results = await query.orderBy(asc(clients.lastName));

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=clients-${Date.now()}.csv`);

    // Write CSV header
    res.write('First Name,Last Name,Email,Phone,Employer,Status,Created At,Agent\n');

    // Write CSV data
    results.forEach(client => {
      const row = [
        client.firstName,
        client.lastName,
        client.email || '',
        client.phone || '',
        client.employer || '',
        client.status,
        client.createdAt.toISOString().split('T')[0],
        client.agentName || ''
      ].map(field => `"${field}"`).join(',');
      
      res.write(row + '\n');
    });

    res.end();

  } catch (error) {
    console.error('Export clients error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
