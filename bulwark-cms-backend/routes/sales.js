import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { sales, clients, users, products, goals } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager, canViewAllData } from '../middleware/roleCheck.js';
import { eq, and, like, or, desc, asc, gte, lte, sum, count } from 'drizzle-orm';
import { invalidateGoalCacheOnSaleChange } from '../utils/cacheInvalidation.js';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const US_DATE_PATTERN = /^\d{2}-\d{2}-\d{4}$/;
const US_SLASH_DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

const normalizeCsvDate = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  if (US_DATE_PATTERN.test(trimmed) || US_SLASH_DATE_PATTERN.test(trimmed)) {
    const [month, day, year] = trimmed.split(/[-/]/);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
};

// GET /sales/stats - Get sales statistics (must come before /:id route)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { agent_id } = req.query; // Optional agent_id for filtering
    
    console.log('📊 Sales Stats API - Starting...', { userId, userRole, agent_id });
    
    // Build where conditions for role-based access
    let whereConditions = [];
    
    if (userRole === 'agent') {
      // Agents can only see their own data
      whereConditions.push(eq(sales.agentId, userId));
      console.log('📊 Sales Stats API - Agent filter applied:', { agentId: userId });
    } else if (userRole === 'manager' && agent_id) {
      // Manager viewing specific agent's data
      whereConditions.push(eq(sales.agentId, parseInt(agent_id)));
      console.log('📊 Sales Stats API - Manager viewing agent data:', { agentId: agent_id });
    } else if (userRole === 'manager') {
      // Manager viewing all data (no filter)
      console.log('📊 Sales Stats API - Manager viewing all data');
    }
    
    // Get total sales count
    let totalSalesQuery = db.select({ count: count(sales.id) }).from(sales);
    if (whereConditions.length > 0) {
      totalSalesQuery = totalSalesQuery.where(and(...whereConditions));
    }
    const totalSalesResult = await totalSalesQuery;
    const totalSales = totalSalesResult[0]?.count || 0;
    
    // Get active sales count
    let activeSalesQuery = db.select({ count: count(sales.id) }).from(sales);
    if (whereConditions.length > 0) {
      activeSalesQuery = activeSalesQuery.where(and(
        eq(sales.status, 'active'),
        ...whereConditions
      ));
    } else {
      activeSalesQuery = activeSalesQuery.where(eq(sales.status, 'active'));
    }
    const activeSalesResult = await activeSalesQuery;
    const activeSales = activeSalesResult[0]?.count || 0;
    
    // Get total premium amount
    let totalPremiumQuery = db.select({ 
      total: sum(sales.premiumAmount) 
    }).from(sales);
    if (whereConditions.length > 0) {
      totalPremiumQuery = totalPremiumQuery.where(and(
        eq(sales.status, 'active'),
        ...whereConditions
      ));
    } else {
      totalPremiumQuery = totalPremiumQuery.where(eq(sales.status, 'active'));
    }
    const totalPremiumResult = await totalPremiumQuery;
    const totalPremium = parseFloat(totalPremiumResult[0]?.total || 0);
    
    // Get total commission amount
    let totalCommissionQuery = db.select({ 
      total: sum(sales.commissionAmount) 
    }).from(sales);
    if (whereConditions.length > 0) {
      totalCommissionQuery = totalCommissionQuery.where(and(
        eq(sales.status, 'active'),
        ...whereConditions
      ));
    } else {
      totalCommissionQuery = totalCommissionQuery.where(eq(sales.status, 'active'));
    }
    const totalCommissionResult = await totalCommissionQuery;
    const totalCommission = parseFloat(totalCommissionResult[0]?.total || 0);
    
    const response = {
      message: 'Sales statistics retrieved successfully',
      stats: {
        totalSales,
        activeSales,
        totalPremium,
        totalCommission
      }
    };
    
    console.log('📊 Sales Stats API - Success:', response);
    res.json(response);
    
  } catch (error) {
    console.error('📊 Sales Stats API - Error:', error);
    console.error('📊 Sales Stats API - Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

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
  query('limit').optional().custom((value) => {
    if (value === undefined) return true;
    const limitInt = parseInt(value, 10);
    if (isNaN(limitInt)) {
      throw new Error('Limit must be a number');
    }
    if (limitInt === 0) {
      return true; // 0 returns all records
    }
    if (limitInt < 1 || limitInt > 100) {
      throw new Error('Limit must be between 1 and 100, or 0 to return all sales');
    }
    return true;
  }),
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
    const limitInt = parseInt(limit);
    const pageInt = parseInt(page);
    const unlimited = limitInt === 0; // Backward-compatible: limit=0 returns all
    const offset = unlimited ? 0 : (pageInt - 1) * limitInt;
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
    let resultsQuery = query.orderBy(desc(sales.saleDate));
    if (!unlimited) {
      resultsQuery = resultsQuery.limit(limitInt).offset(offset);
    }
    const results = await resultsQuery;
    
    console.log('🔍 Sales query results count:', results.length);
    console.log('🔍 First few sales results:', results.slice(0, 3));

    res.json({
      message: 'Sales retrieved successfully',
      sales: results,
      total,
      pagination: unlimited ? undefined : {
        page: pageInt,
        limit: limitInt,
        total,
        pages: Math.ceil(total / (limitInt || 1))
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

    // Invalidate goal cache for this agent
    await invalidateGoalCacheOnSaleChange(agentId, 'sale_added');

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

    // Invalidate goal cache for this agent
    await invalidateGoalCacheOnSaleChange(oldSaleData.agentId, 'sale_updated');

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

// PATCH /sales/:id/notes - Update sale notes only
router.patch('/:id/notes', authenticateToken, [
  body('notes').optional().trim().isLength({ min: 1 }).withMessage('Notes content is required if provided')
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

    const saleId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    const { notes } = req.body;

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

    // Update only the notes field
    const updatedSale = await db.update(sales)
      .set({
        notes,
        updatedAt: new Date()
      })
      .where(eq(sales.id, saleId))
      .returning();

    res.json({
      message: 'Sale notes updated successfully',
      sale: updatedSale[0]
    });

  } catch (error) {
    console.error('Update sale notes error:', error);
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

    // Invalidate goal cache for this agent
    await invalidateGoalCacheOnSaleChange(saleData.agentId, 'sale_deleted');

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
      .innerJoin(users, eq(sales.agentId, users.id));

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

// Configure multer for CSV uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// POST /sales/bulk-import - Bulk import sales from CSV
router.post('/bulk-import', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'NO_FILE'
      });
    }

    console.log('📊 CSV bulk import started for user:', userId);
    console.log('📄 File:', req.file.originalname, 'Size:', req.file.size);

    const results = [];
    const errors = [];
    let importedCount = 0;

    // Read and parse CSV file
    const csvData = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv({
          headers: [
            'clientId',
            'clientEmail',
            'productName', 
            'premiumAmount',
            'commissionAmount',
            'commissionRate',
            'saleDate',
            'policyNumber',
            'status',
            'notes'
          ],
          skipEmptyLines: true
        }))
        .on('data', (data) => {
          // Skip empty rows
          if (!data || Object.keys(data).length === 0) {
            return;
          }
          
          // Skip header row if it's being processed as data
          if ((data.clientEmail === 'clientEmail' || data.clientId === 'clientId') && data.productName === 'productName') {
            return;
          }
          
          csvData.push(data);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Processing ${csvData.length} sales records`);

    // Process each sales record
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because we skip header and start from 1

      try {
        // Validate required fields
        if ((!row.clientId && !row.clientEmail) || !row.productName || !row.premiumAmount || !row.saleDate) {
          errors.push({
            row: rowNumber,
            error: 'Missing required fields (clientId or clientEmail, productName, premiumAmount, saleDate)'
          });
          continue;
        }

        // Find client by ID (preferred) or email (fallback)
        let client = null;
        if (row.clientId) {
          const clientId = parseInt(row.clientId, 10);
          if (isNaN(clientId) || clientId < 1) {
            errors.push({
              row: rowNumber,
              clientId: row.clientId,
              error: 'Invalid client ID'
            });
            continue;
          }

          const clientById = await db.select()
            .from(clients)
            .where(eq(clients.id, clientId))
            .limit(1);

          if (clientById && clientById.length > 0) {
            client = clientById[0];
          } else {
            errors.push({
              row: rowNumber,
              clientId: row.clientId,
              error: 'Client not found with this ID'
            });
            continue;
          }
        } else if (row.clientEmail) {
          const clientByEmail = await db.select()
            .from(clients)
            .where(eq(clients.email, row.clientEmail))
            .limit(1);

          if (clientByEmail && clientByEmail.length > 0) {
            client = clientByEmail[0];
          } else {
            errors.push({
              row: rowNumber,
              clientEmail: row.clientEmail,
              error: 'Client not found with this email'
            });
            continue;
          }
        }

        // Verify agent access
        if (userRole !== 'manager' && client.agentId !== userId) {
          errors.push({
            row: rowNumber,
            clientId: client.id,
            error: 'Access denied to this client'
          });
          continue;
        }

        // Find product by name
        const product = await db.select()
          .from(products)
          .where(eq(products.name, row.productName))
          .limit(1);

        if (!product || product.length === 0) {
          errors.push({
            row: rowNumber,
            productName: row.productName,
            error: 'Product not found with this name'
          });
          continue;
        }

        // Validate and convert data
        const premiumAmount = parseFloat(row.premiumAmount);
        const commissionAmount = row.commissionAmount ? parseFloat(row.commissionAmount) : 0;
        const commissionRate = row.commissionRate ? parseFloat(row.commissionRate) : null;

        if (isNaN(premiumAmount) || premiumAmount <= 0) {
          errors.push({
            row: rowNumber,
            premiumAmount: row.premiumAmount,
            error: 'Invalid premium amount'
          });
          continue;
        }

        // Parse and validate sale date
        const normalizedSaleDate = normalizeCsvDate(row.saleDate);
        if (!normalizedSaleDate) {
          errors.push({
            row: rowNumber,
            saleDate: row.saleDate,
            error: 'Invalid sale date format (use MM-DD-YYYY)'
          });
          continue;
        }
        const saleDate = new Date(normalizedSaleDate);
        if (isNaN(saleDate.getTime())) {
          errors.push({
            row: rowNumber,
            saleDate: row.saleDate,
            error: 'Invalid sale date value'
          });
          continue;
        }
        const isoSaleDate = saleDate.toISOString().split('T')[0];

        // Validate status
        const validStatuses = ['active', 'cancelled', 'expired'];
        const status = row.status && validStatuses.includes(row.status.toLowerCase()) 
          ? row.status.toLowerCase() 
          : 'active';

        // Create sale record
        const newSale = await db.insert(sales).values({
          agentId: userId,
          clientId: client.id,
          productId: product[0].id,
          premiumAmount: premiumAmount.toString(),
          commissionAmount: commissionAmount.toString(),
          commissionRate: commissionRate ? commissionRate.toString() : null,
          saleDate: isoSaleDate,
          policyNumber: row.policyNumber || null,
          status: status,
          productName: row.productName,
          notes: row.notes || null,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();

        console.log(`✅ Sale imported: ${newSale[0].id} - ${client.firstName} ${client.lastName}`);
        
        results.push({
          row: rowNumber,
          saleId: newSale[0].id,
          clientName: `${client.firstName} ${client.lastName}`,
          productName: row.productName,
          premiumAmount: premiumAmount,
          success: true
        });

        importedCount++;

        // Update goal progress
        await updateGoalProgress(userId, newSale[0]);

        // Invalidate goal cache
        await invalidateGoalCacheOnSaleChange(userId, 'sale_added');

      } catch (error) {
        console.error(`❌ Error processing row ${rowNumber}:`, error);
        errors.push({
          row: rowNumber,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Failed to cleanup uploaded file:', cleanupError);
    }

    console.log(`📊 Import completed: ${importedCount} successful, ${errors.length} errors`);

    res.json({
      success: true,
      message: `Sales import completed: ${importedCount} imported, ${errors.length} errors`,
      data: {
        imported_count: importedCount,
        total_rows: csvData.length,
        results: results.slice(0, 10), // Return first 10 results
        errors: errors.slice(0, 10), // Return first 10 errors
        has_more_results: results.length > 10,
        has_more_errors: errors.length > 10
      }
    });

  } catch (error) {
    console.error('❌ CSV bulk import error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'IMPORT_ERROR',
      details: error.message
    });
  }
});

export default router;
