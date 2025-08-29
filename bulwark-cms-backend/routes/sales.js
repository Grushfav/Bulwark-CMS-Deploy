import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { sales, clients, users, products, goals } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager, canViewAllData } from '../middleware/roleCheck.js';
import { eq, and, like, or, desc, asc, gte, lte, sum, count } from 'drizzle-orm';

const router = express.Router();

// Function to update goal progress when a sale is created
const updateGoalProgress = async (agentId, saleData) => {
  try {
    console.log(`🔄 Updating goal progress for agent ${agentId} after sale creation`);
    console.log('Sale data:', saleData);
    
    // Get all active goals for this agent
    const agentGoals = await db.select().from(goals).where(
      and(
        eq(goals.agentId, agentId),
        eq(goals.isActive, true)
      )
    );

    console.log(`Found ${agentGoals.length} active goals for agent ${agentId}`);
    console.log('Agent goals:', agentGoals);

    for (const goal of agentGoals) {
      let shouldUpdate = false;
      let newCurrentValue = Number(goal.currentValue) || 0; // Convert to number, default to 0

      // Check if this goal should be updated based on the sale
      switch (goal.metricType) {
        case 'sales_amount':
          // Update sales amount goal
          shouldUpdate = true;
          newCurrentValue = newCurrentValue + parseFloat(saleData.premiumAmount);
          console.log(`📈 Updating sales_amount goal ${goal.id}: ${newCurrentValue - parseFloat(saleData.premiumAmount)} + ${saleData.premiumAmount} = ${newCurrentValue}`);
          break;
        
        case 'commission':
          // Update commission goal
          shouldUpdate = true;
          newCurrentValue = newCurrentValue + parseFloat(saleData.commissionAmount);
          console.log(`💰 Updating commission goal ${goal.id}: ${newCurrentValue - parseFloat(saleData.commissionAmount)} + ${saleData.commissionAmount} = ${newCurrentValue}`);
          break;
        
        case 'policies_sold':
        case 'sales_count':
          // Update policies sold goal (count) - both types work the same way
          shouldUpdate = true;
          newCurrentValue = newCurrentValue + 1;
          console.log(`📋 Updating ${goal.metricType} goal ${goal.id}: ${newCurrentValue - 1} + 1 = ${newCurrentValue}`);
          break;
        
        case 'client_count':
        case 'new_clients':
          // Check if this is a new client (you might need to add logic here)
          // For now, we'll assume each sale represents a new client interaction
          shouldUpdate = true;
          newCurrentValue = newCurrentValue + 1;
          console.log(`👥 Updating ${goal.metricType} goal ${goal.id}: ${newCurrentValue - 1} + 1 = ${newCurrentValue}`);
          break;
      }

      // Update the goal if needed
      if (shouldUpdate) {
        await db.update(goals)
          .set({
            currentValue: newCurrentValue,
            updatedAt: new Date()
          })
          .where(eq(goals.id, goal.id));
        
        console.log(`✅ Successfully updated goal ${goal.id} (${goal.metricType}) from ${goal.currentValue} to ${newCurrentValue}`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating goal progress:', error);
    // Don't fail the sale creation if goal update fails
  }
};

// Function to handle goal progress updates when a sale is modified
const updateGoalProgressOnModify = async (agentId, oldSaleData, newSaleData) => {
  try {
    console.log(`🔄 Updating goal progress for agent ${agentId} after sale modification`);
    
    // Get all active goals for this agent
    const agentGoals = await db.select().from(goals).where(
      and(
        eq(goals.agentId, agentId),
        eq(goals.isActive, true)
      )
    );

    for (const goal of agentGoals) {
      let shouldUpdate = false;
      let newCurrentValue = Number(goal.currentValue) || 0; // Convert to number, default to 0

      // Calculate the difference and update accordingly
      switch (goal.metricType) {
        case 'sales_amount':
          const salesDiff = parseFloat(newSaleData.premiumAmount) - parseFloat(oldSaleData.premiumAmount);
          if (salesDiff !== 0) {
            shouldUpdate = true;
            newCurrentValue = newCurrentValue + salesDiff;
            console.log(`📈 Updating sales_amount goal ${goal.id}: ${newCurrentValue - salesDiff} + ${salesDiff} = ${newCurrentValue}`);
          }
          break;
        
        case 'commission':
          const commissionDiff = parseFloat(newSaleData.commissionAmount) - parseFloat(oldSaleData.commissionAmount);
          if (commissionDiff !== 0) {
            shouldUpdate = true;
            newCurrentValue = newCurrentValue + commissionDiff;
            console.log(`💰 Updating commission goal ${goal.id}: ${newCurrentValue - commissionDiff} + ${commissionDiff} = ${newCurrentValue}`);
          }
          break;
        
        case 'policies_sold':
        case 'sales_count':
          // For policies sold and sales count, we don't change the count on update
          break;
        
        case 'client_count':
        case 'new_clients':
          // For client count and new clients, we don't change on update
          break;
      }

      // Update the goal if needed
      if (shouldUpdate) {
        await db.update(goals)
          .set({
            currentValue: newCurrentValue,
            updatedAt: new Date()
          })
          .where(eq(goals.id, goal.id));
        
        console.log(`✅ Successfully updated goal ${goal.id} (${goal.metricType}) from ${goal.currentValue} to ${newCurrentValue}`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating goal progress on modify:', error);
  }
};

// Function to handle goal progress updates when a sale is deleted
const updateGoalProgressOnDelete = async (agentId, saleData) => {
  try {
    console.log(`🔄 Updating goal progress for agent ${agentId} after sale deletion`);
    
    // Get all active goals for this agent
    const agentGoals = await db.select().from(goals).where(
      and(
        eq(goals.agentId, agentId),
        eq(goals.isActive, true)
      )
    );

    for (const goal of agentGoals) {
      let shouldUpdate = false;
      let newCurrentValue = Number(goal.currentValue) || 0; // Convert to number, default to 0

      // Reverse the sale impact on goals
      switch (goal.metricType) {
        case 'sales_amount':
          shouldUpdate = true;
          newCurrentValue = Math.max(0, newCurrentValue - parseFloat(saleData.premiumAmount));
          console.log(`📈 Reversing sales_amount goal ${goal.id}: ${newCurrentValue + parseFloat(saleData.premiumAmount)} - ${saleData.premiumAmount} = ${newCurrentValue}`);
          break;
        
        case 'commission':
          shouldUpdate = true;
          newCurrentValue = Math.max(0, newCurrentValue - parseFloat(saleData.commissionAmount));
          console.log(`💰 Reversing commission goal ${goal.id}: ${newCurrentValue + parseFloat(saleData.commissionAmount)} - ${saleData.commissionAmount} = ${newCurrentValue}`);
          break;
        
        case 'policies_sold':
        case 'sales_count':
          shouldUpdate = true;
          newCurrentValue = Math.max(0, newCurrentValue - 1);
          console.log(`📋 Reversing ${goal.metricType} goal ${goal.id}: ${newCurrentValue + 1} - 1 = ${newCurrentValue}`);
          break;
        
        case 'client_count':
        case 'new_clients':
          shouldUpdate = true;
          newCurrentValue = Math.max(0, newCurrentValue - 1);
          console.log(`👥 Reversing ${goal.metricType} goal ${goal.id}: ${newCurrentValue + 1} - 1 = ${newCurrentValue}`);
          break;
      }

      // Update the goal if needed (ensure it doesn't go below 0)
      if (shouldUpdate) {
        newCurrentValue = Math.max(0, newCurrentValue); // Don't allow negative values
        await db.update(goals)
          .set({
            currentValue: newCurrentValue,
            updatedAt: new Date()
          })
          .where(eq(goals.id, goal.id));
        
        console.log(`✅ Successfully reversed goal ${goal.id} (${goal.metricType}) from ${goal.currentValue} to ${newCurrentValue}`);
      }
    }
  } catch (error) {
    console.error('❌ Error updating goal progress on delete:', error);
  }
};

// Validation middleware
const validateSale = [
  body('clientId').custom((value) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Valid client ID is required');
    }
    return true;
  }),
  body('productId').custom((value) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Valid product ID is required');
    }
    return true;
  }),
  body('premiumAmount').custom((value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      throw new Error('Valid premium amount is required');
    }
    return true;
  }),
  body('commissionAmount').custom((value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      throw new Error('Valid commission amount is required');
    }
    return true;
  }),
  body('saleDate').custom((value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error('Valid sale date is required');
    }
    return true;
  }),
  body('policyNumber').optional().trim().isLength({ min: 1 }).withMessage('Policy number is required if provided')
];

// GET /sales - Get all sales (filtered by user role)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  query('status').optional().isIn(['active', 'cancelled', 'expired']).withMessage('Valid status is required'),
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

    const { page = 1, limit = 20, startDate, endDate, status, agent_id } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('🔍 Sales filtering - User role:', userRole, 'User ID:', userId);
    console.log('🔍 Query parameters received:', { page, limit, startDate, endDate, status, agent_id });

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering
    if (userRole === 'manager') {
      console.log('🔍 Manager access - can see all sales');
      if (agent_id) {
        whereConditions.push(eq(sales.agentId, parseInt(agent_id)));
        console.log('🔍 Filtering by specific agent:', agent_id);
      }
    } else {
      console.log('🔍 Agent access - can only see own sales');
      // For agents, always filter by their own ID, regardless of query params
      whereConditions.push(eq(sales.agentId, userId));
      console.log('🔍 Agent filtered to own sales only, userId:', userId);
    }
    
    console.log('🔍 Sales where conditions:', whereConditions);

    // Date range filter
    if (startDate) {
      whereConditions.push(gte(sales.saleDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(sales.saleDate, endDate));
    }

    // Status filter
    if (status) {
      whereConditions.push(eq(sales.status, status));
    }

    // Build query
    let query = db.select({
      id: sales.id,
      premiumAmount: sales.premiumAmount,
      commissionAmount: sales.commissionAmount,
      commissionRate: sales.commissionRate,
      saleDate: sales.saleDate,
      policyNumber: sales.policyNumber,
      status: sales.status,
      productName: sales.productName,
      notes: sales.notes,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
      client: {
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email
      },
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      },
      product: {
        id: products.id,
        name: products.name,
        category: products.category
      }
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .leftJoin(users, eq(sales.agentId, users.id))
    .leftJoin(products, eq(sales.productId, products.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
      console.log('🔍 Final query with WHERE conditions applied');
    } else {
      console.log('🔍 No WHERE conditions applied - query will return all sales');
    }

    // Get total count for pagination
    let countQuery = db.select({ count: count(sales.id) }).from(sales);
    let finalCountQuery = countQuery;
    if (whereConditions.length > 0) {
      finalCountQuery = countQuery.where(and(...whereConditions));
    }
    const totalResult = await finalCountQuery;
    const total = totalResult[0]?.count || 0;
    
    console.log('🔍 Sales count query result:', total);

    // Get paginated results
    console.log('🔍 Executing sales query with conditions:', whereConditions);
    const results = await query
      .orderBy(desc(sales.saleDate))
      .limit(parseInt(limit))
      .offset(offset);
    
    console.log('🔍 Sales query results count:', results.length);
    console.log('🔍 First few sales results:', results.slice(0, 3));

    res.json({
      message: 'Sales retrieved successfully',
      sales: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /sales/:id - Get sale by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get sale with related data
    const sale = await db.select({
      id: sales.id,
      premiumAmount: sales.premiumAmount,
      commissionAmount: sales.commissionAmount,
      commissionRate: sales.commissionRate,
      saleDate: sales.saleDate,
      policyNumber: sales.policyNumber,
      status: sales.status,
      productName: sales.productName,
      notes: sales.notes,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
      client: {
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email,
        phone: clients.phone
      },
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      },
      product: {
        id: products.id,
        name: products.name,
        description: products.description,
        category: products.category
      }
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .leftJoin(users, eq(sales.agentId, users.id))
    .leftJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.id, saleId))
    .limit(1);

    if (!sale || sale.length === 0) {
      return res.status(404).json({
        error: 'Sale not found',
        code: 'SALE_NOT_FOUND'
      });
    }

    const saleData = sale[0];

    // Check access permissions
    if (userRole !== 'manager' && saleData.agent.id !== userId) {
      return res.status(403).json({
        error: 'Access denied to this sale',
        code: 'ACCESS_DENIED'
      });
    }

    res.json({
      message: 'Sale retrieved successfully',
      sale: saleData
    });

  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Debug endpoint to check user permissions
router.get('/debug', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Debug info',
      user: {
        id: req.user.id,
        role: req.user.role,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      },
      permissions: {
        canCreateSales: req.user.role === 'manager' || req.user.role === 'agent',
        canViewAllSales: req.user.role === 'manager',
        canViewOwnSales: req.user.role === 'agent'
      }
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

// POST /sales - Create new sale
router.post('/', authenticateToken, validateSale, async (req, res) => {
  try {
    console.log('🔍 Creating sale with body:', req.body);
    console.log('🔍 User ID:', req.user.id);
    console.log('🔍 User role:', req.user.role);
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Sales validation errors:', errors.array());
      console.log('❌ Request body:', req.body);
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      });
    }

    const { 
      clientId, 
      productId, 
      premiumAmount, 
      commissionAmount, 
      commissionRate, 
      saleDate, 
      policyNumber, 
      productName, 
      notes 
    } = req.body;
    
    const agentId = req.user.id;

    // Check if client exists and user has access
    console.log('🔍 Checking client access for clientId:', clientId);
    const client = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
    
    if (!client || client.length === 0) {
      console.log('❌ Client not found:', clientId);
      return res.status(404).json({
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      });
    }

    const clientData = client[0];
    console.log('🔍 Client data:', clientData);
    console.log('🔍 User role:', req.user.role);
    console.log('🔍 User ID:', agentId);
    console.log('🔍 Client agent ID:', clientData.agentId);

    // Check access permissions
    if (req.user.role !== 'manager' && clientData.agentId !== agentId) {
      console.log('❌ Access denied: User role is not manager and client does not belong to user');
      return res.status(403).json({
        error: 'Access denied to this client',
        code: 'ACCESS_DENIED'
      });
    }
    
    console.log('✅ Client access granted');

    // Check if product exists
    const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    
    if (!product || product.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // Create sale
    const newSale = await db.insert(sales).values({
      agentId,
      clientId,
      productId,
      premiumAmount: parseFloat(premiumAmount),
      commissionAmount: parseFloat(commissionAmount),
      commissionRate: commissionRate ? parseFloat(commissionRate) : null,
      saleDate: saleDate,
      policyNumber,
      status: 'active',
      productName: productName || product[0].name,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ Sale created successfully:', newSale[0]);

    // Update goal progress after sale creation
    console.log('🔄 Calling updateGoalProgress function...');
    await updateGoalProgress(agentId, newSale[0]);
    console.log('✅ Goal progress update completed');

    res.status(201).json({
      message: 'Sale created successfully',
      sale: newSale[0]
    });

  } catch (error) {
    console.error('❌ Create sale error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// PUT /sales/:id - Update sale
router.put('/:id', authenticateToken, validateSale, async (req, res) => {
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

    const saleId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    const { 
      clientId, 
      productId, 
      premiumAmount, 
      commissionAmount, 
      commissionRate, 
      saleDate, 
      policyNumber, 
      productName, 
      status, 
      notes 
    } = req.body;

    // Get sale to check permissions
    const existingSale = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    
    if (!existingSale || existingSale.length === 0) {
      return res.status(404).json({
        error: 'Sale not found',
        code: 'SALE_NOT_FOUND'
      });
    }

    const oldSaleData = existingSale[0];

    // Check access permissions
    if (userRole !== 'manager' && oldSaleData.agentId !== userId) {
      return res.status(403).json({
        error: 'Access denied to this sale',
        code: 'ACCESS_DENIED'
      });
    }

    // Update sale
    const updatedSale = await db.update(sales)
      .set({
        clientId: parseInt(clientId),
        productId: parseInt(productId),
        premiumAmount: parseFloat(premiumAmount),
        commissionAmount: parseFloat(commissionAmount),
        commissionRate: commissionRate ? parseFloat(commissionRate) : null,
        saleDate: saleDate,
        policyNumber,
        status: status || oldSaleData.status,
        productName: productName || oldSaleData.productName,
        notes,
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId))
      .returning();

    // Update goal progress after sale modification
    await updateGoalProgressOnModify(oldSaleData.agentId, oldSaleData, updatedSale[0]);

    res.json({
      message: 'Sale updated successfully',
      sale: updatedSale[0]
    });

  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /sales/:id - Delete sale
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const saleId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get sale to check permissions
    const existingSale = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
    
    if (!existingSale || existingSale.length === 0) {
      return res.status(404).json({
        error: 'Sale not found',
        code: 'SALE_NOT_FOUND'
      });
    }

    const saleData = existingSale[0];

    // Check access permissions
    if (userRole !== 'manager' && saleData.agentId !== userId) {
      return res.status(403).json({
        error: 'Access denied to this sale',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete sale
    await db.delete(sales).where(eq(sales.id, saleId));

    // Update goal progress after sale deletion
    await updateGoalProgressOnDelete(saleData.agentId, saleData);

    res.json({
      message: 'Sale deleted successfully'
    });

  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /sales/dashboard - Get sales dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, agent_id } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering
    if (userRole === 'manager') {
      if (agent_id) {
        whereConditions.push(eq(sales.agentId, parseInt(agent_id)));
      }
    } else {
      whereConditions.push(eq(sales.agentId, userId));
    }

    // Date range filter
    if (startDate) {
      whereConditions.push(gte(sales.saleDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(sales.saleDate, endDate));
    }

    // Default to current month if no dates provided
    if (!startDate && !endDate) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      whereConditions.push(gte(sales.saleDate, firstDay));
      whereConditions.push(lte(sales.saleDate, lastDay));
    }

    // Get sales summary
    const summaryQuery = db.select({
      totalSales: count(sales.id),
      totalPremium: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      averageCommission: sum(sales.commissionAmount) / count(sales.id)
    }).from(sales);

    if (whereConditions.length > 0) {
      summaryQuery.where(and(...whereConditions));
    }

    const summary = await summaryQuery;

    // Get sales by status
    const statusQuery = db.select({
      status: sales.status,
      count: count(sales.id),
      totalPremium: sum(sales.premiumAmount)
    }).from(sales);

    if (whereConditions.length > 0) {
      statusQuery.where(and(...whereConditions));
    }

    const statusBreakdown = await statusQuery
      .groupBy(sales.status)
      .orderBy(desc(count(sales.id)));

    // Get recent sales
    const recentSalesQuery = db.select({
      id: sales.id,
      premiumAmount: sales.premiumAmount,
      commissionAmount: sales.commissionAmount,
      saleDate: sales.saleDate,
      status: sales.status,
      clientName: clients.firstName,
      productName: sales.productName
    }).from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id));

    if (whereConditions.length > 0) {
      recentSalesQuery.where(and(...whereConditions));
    }

    const recentSales = await recentSalesQuery
      .orderBy(desc(sales.saleDate))
      .limit(10);

    // Get top performing agents (managers only)
    let topAgents = [];
    if (userRole === 'manager') {
      const agentQuery = db.select({
        agentId: sales.agentId,
        agentName: users.firstName,
        totalSales: count(sales.id),
        totalPremium: sum(sales.premiumAmount),
        totalCommission: sum(sales.commissionAmount)
      }).from(sales)
      .leftJoin(users, eq(sales.agentId, users.id));

      if (whereConditions.length > 0) {
        agentQuery.where(and(...whereConditions));
      }

      topAgents = await agentQuery
        .groupBy(sales.agentId, users.firstName)
        .orderBy(desc(sum(sales.premiumAmount)))
        .limit(5);
    }

    res.json({
      message: 'Sales dashboard data retrieved successfully',
      dashboard: {
        summary: summary[0] || {
          totalSales: 0,
          totalPremium: 0,
          totalCommission: 0,
          averageCommission: 0
        },
        statusBreakdown,
        recentSales,
        topAgents
      }
    });

  } catch (error) {
    console.error('Get sales dashboard error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
