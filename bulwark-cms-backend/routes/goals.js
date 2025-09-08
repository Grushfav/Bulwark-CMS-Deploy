import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { db } from '../config/database.js';
import { goals, users, sales, clients } from '../models/schema.js';
import { eq, and, or, desc, asc, gte, lte, between, sum, count } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth.js';
import { registerCacheInvalidation } from '../utils/cacheInvalidation.js';
import jobQueue from '../utils/jobQueue.js';

const router = express.Router();

// Enhanced in-memory cache for goals with smart invalidation
const goalCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
const CACHE_MAX_SIZE = 1000; // Maximum cache entries to prevent memory leaks

// Cache metadata for smart invalidation
const cacheMetadata = new Map();

// Helper function to get cached goal data
const getCachedGoal = (goalId) => {
  const cached = goalCache.get(goalId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`✅ Cache hit for goal ${goalId}`);
    return cached.data;
  }
  
  if (cached) {
    console.log(`⏰ Cache expired for goal ${goalId}`);
    goalCache.delete(goalId);
    cacheMetadata.delete(goalId);
  }
  
  return null;
};

// Helper function to set cached goal data with metadata
const setCachedGoal = (goalId, data) => {
  // Prevent cache from growing too large
  if (goalCache.size >= CACHE_MAX_SIZE) {
    console.log('🧹 Cache size limit reached, clearing oldest entries');
    clearOldestCacheEntries();
  }
  
  goalCache.set(goalId, {
    data,
    timestamp: Date.now()
  });
  
  // Store metadata for smart invalidation
  cacheMetadata.set(goalId, {
    agentId: data.agentId,
    metricType: data.metricType,
    goalType: data.goalType,
    lastUpdated: Date.now()
  });
  
  console.log(`💾 Cached goal ${goalId} (${data.metricType} for agent ${data.agentId})`);
};

// Helper function to clear goal cache
const clearGoalCache = (goalId = null) => {
  if (goalId) {
    goalCache.delete(goalId);
    cacheMetadata.delete(goalId);
    console.log(`🗑️ Cleared cache for goal ${goalId}`);
  } else {
    goalCache.clear();
    cacheMetadata.clear();
    console.log('🗑️ Cleared all goal cache');
  }
};

// Helper function to clear cache by agent and metric type (smart invalidation)
const clearGoalCacheByMetric = (agentId, metricTypes = []) => {
  let clearedCount = 0;
  
  for (const [goalId, metadata] of cacheMetadata.entries()) {
    if (metadata.agentId === agentId && 
        (metricTypes.length === 0 || metricTypes.includes(metadata.metricType))) {
      goalCache.delete(goalId);
      cacheMetadata.delete(goalId);
      clearedCount++;
    }
  }
  
  console.log(`🎯 Cleared ${clearedCount} goal caches for agent ${agentId} with metrics: ${metricTypes.join(', ')}`);
};

// Helper function to clear oldest cache entries when limit is reached
const clearOldestCacheEntries = () => {
  const entries = Array.from(cacheMetadata.entries())
    .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);
  
  const toRemove = entries.slice(0, Math.floor(CACHE_MAX_SIZE * 0.2)); // Remove 20% of oldest entries
  
  for (const [goalId] of toRemove) {
    goalCache.delete(goalId);
    cacheMetadata.delete(goalId);
  }
  
  console.log(`🧹 Removed ${toRemove.length} oldest cache entries`);
};

// Helper function to clear goal cache on update
const clearGoalCacheOnUpdate = (goalId) => {
  clearGoalCache(goalId);
};

// Helper function to invalidate cache when sales/clients data changes
const invalidateCacheOnDataChange = (agentId, changeType) => {
  const metricMap = {
    'sale_added': ['sales_count', 'sales_amount', 'commission'],
    'sale_updated': ['sales_count', 'sales_amount', 'commission'],
    'sale_deleted': ['sales_count', 'sales_amount', 'commission'],
    'client_added': ['new_clients'],
    'client_updated': ['new_clients'],
    'client_deleted': ['new_clients']
  };
  
  const metricsToInvalidate = metricMap[changeType] || [];
  clearGoalCacheByMetric(agentId, metricsToInvalidate);
};

// Helper function to safely convert decimal values to numbers
const safeDecimalToNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Helper function to calculate existing data for a goal time period
const calculateExistingData = async (startDate, endDate, agentId, metricType) => {
  try {
    // Safety check for required parameters
    if (!agentId) {
      console.error(`❌ agentId is undefined for metric ${metricType}`);
      return { total: 0, sales: [], clients: [] };
    }
    
    if (!startDate || !endDate) {
      console.error(`❌ startDate or endDate is undefined for agent ${agentId}, metric ${metricType}`);
      return { total: 0, sales: [], clients: [] };
    }
    
    if (!metricType) {
      console.error(`❌ metricType is undefined for agent ${agentId}`);
      return { total: 0, sales: [], clients: [] };
    }

    // Convert dates to Date objects and then to ISO strings for database queries
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Add time to make it a full day range
    startDateObj.setHours(0, 0, 0, 0);
    endDateObj.setHours(23, 59, 59, 999);
    
    // Convert to ISO strings for database queries
    const startDateISO = startDateObj.toISOString();
    const endDateISO = endDateObj.toISOString();
    


    if (metricType === 'new_clients') {
      // Query clients table for new clients created in the date range
      
      // For timestamp fields, we need to use Date objects, not ISO strings
      const clientsInRange = await db.select({
        id: clients.id,
        createdAt: clients.createdAt
      }).from(clients).where(
        and(
          eq(clients.agentId, agentId),
          gte(clients.createdAt, startDateObj),
          lte(clients.createdAt, endDateObj)
        )
      );

      console.log(`👥 Found ${clientsInRange.length} clients created in date range for agent ${agentId}`);
      if (clientsInRange.length > 0) {
        console.log(`👥 Client IDs found:`, clientsInRange.map(c => ({ id: c.id, createdAt: c.createdAt })));
      }

      return {
        total: clientsInRange.length,
        sales: [],
        clients: clientsInRange
      };
    } else {
      // Query sales table for sales in the date range
      console.log(`📊 Querying sales table for agent ${agentId} between ${startDateISO} and ${endDateISO}`);
      
      // For date fields, we can use ISO strings
      const salesInRange = await db.select({
        id: sales.id,
        premiumAmount: sales.premiumAmount,
        commissionAmount: sales.commissionAmount,
        saleDate: sales.saleDate,
        clientId: sales.clientId,
        agentId: sales.agentId
      }).from(sales).where(
        and(
          eq(sales.agentId, agentId),
          gte(sales.saleDate, startDateISO),
          lte(sales.saleDate, endDateISO)
        )
      );

      console.log(`📊 Found ${salesInRange.length} sales in date range for agent ${agentId}`);
      if (salesInRange.length > 0) {
        console.log(`📊 Sales found:`, salesInRange.map(s => ({ 
          id: s.id, 
          saleDate: s.saleDate, 
          premiumAmount: s.premiumAmount,
          commissionAmount: s.commissionAmount
        })));
      }

      let total = 0;
      if (metricType === 'sales_count') {
        total = salesInRange.length;
      } else if (metricType === 'sales_amount') {
        total = salesInRange.reduce((sum, sale) => sum + (parseFloat(sale.premiumAmount) || 0), 0);
      } else if (metricType === 'commission') {
        total = salesInRange.reduce((sum, sale) => sum + (parseFloat(sale.commissionAmount) || 0), 0);
      }

      console.log(`✅ Calculated existing data: ${total} for ${metricType}`);
      return {
        total,
        sales: salesInRange,
        clients: []
      };
    }
  } catch (error) {
    console.error(`❌ Error calculating existing data:`, error);
    return { total: 0, sales: [], clients: [] };
  }
};

// Helper function to format goal data for frontend
const formatGoalForFrontend = (goal) => {
  console.log('🔍 formatGoalForFrontend input:', goal);
  console.log('🔍 Goal ID in input:', goal?.id);
  
  const formatted = {
    id: goal.id, // Explicitly preserve the ID
    agentId: goal.agentId,
    // Ensure values are properly converted to numbers
    target_value: safeDecimalToNumber(goal.targetValue),
    current_value: safeDecimalToNumber(goal.currentValue),
    targetValue: safeDecimalToNumber(goal.targetValue),
    currentValue: safeDecimalToNumber(goal.currentValue),
    // Keep original field names for compatibility
    goal_type: goal.goalType,
    metric_type: goal.metricType,
    start_date: goal.startDate,
    end_date: goal.endDate,
    // Safely convert dates to ISO strings
    startDate: goal.startDate instanceof Date ? goal.startDate.toISOString().split('T')[0] : (typeof goal.startDate === 'string' ? goal.startDate : null),
    endDate: goal.endDate instanceof Date ? goal.endDate.toISOString().split('T')[0] : (typeof goal.endDate === 'string' ? goal.endDate : null),
    // Preserve other fields
    title: goal.title,
    notes: goal.notes,
    isActive: goal.isActive,
    is_active: goal.isActive,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
  };
  
  console.log('🔍 Formatted goal output:', formatted);
  console.log('🔍 Formatted goal ID:', formatted.id);
  
  return formatted;
};

// Helper function to safely format goal output
const formatGoalOutput = (goal) => {
  // Safely convert dates to ISO strings
  const safeDateToString = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    if (typeof dateValue === 'string') {
      // If it's already a string, validate it's a date format
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return dateValue;
      }
    }
    return null;
  };

  const formatted = {
    id: goal.id,
    agentId: goal.agentId,
    goalType: goal.goalType,
    metricType: goal.metricType,
    title: goal.title,
    description: goal.description,
    targetValue: safeDecimalToNumber(goal.targetValue),
    currentValue: safeDecimalToNumber(goal.currentValue),
    // Keep original field names for compatibility
    goal_type: goal.goalType,
    metric_type: goal.metricType,
    start_date: goal.startDate,
    end_date: goal.endDate,
    // Safely convert dates to ISO strings
    startDate: safeDateToString(goal.startDate),
    endDate: safeDateToString(goal.endDate),
    // Preserve other fields
    notes: goal.notes,
    isActive: goal.isActive,
    is_active: goal.isActive,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt
  };
  
  console.log('🔍 Formatted goal output:', formatted);
  console.log('🔍 Formatted goal ID:', formatted.id);
  
  return formatted;
};

// Validation middleware
const validateGoal = [
  body('goalType').optional().isIn(['weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']).withMessage('Valid goal type is required'),
  body('goal_type').optional().isIn(['weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']).withMessage('Valid goal type is required'),
  body('metricType').optional().isIn(['sales_amount', 'client_count', 'commission', 'policies_sold', 'sales_count', 'new_clients']).withMessage('Valid metric type is required'),
  body('metric_type').optional().isIn(['sales_amount', 'client_count', 'commission', 'policies_sold', 'sales_count', 'new_clients']).withMessage('Valid metric type is required'),
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('targetValue').optional().isFloat({ min: 0.01 }).withMessage('Valid target value greater than 0 is required'),
  body('target_value').optional().isFloat({ min: 0.01 }).withMessage('Valid target value greater than 0 is required'),
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('start_date').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('end_date').optional().isISO8601().withMessage('Valid end date is required')
];

// GET /goals - Get all goals (filtered by user role)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('goalType').optional().isIn(['weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']).withMessage('Valid goal type is required'),
  query('goal_type').optional().isIn(['weekly', 'monthly', 'quarterly', 'half_yearly', 'annual']).withMessage('Valid goal type is required'),
  query('metricType').optional().isIn(['sales_amount', 'client_count', 'commission', 'policies_sold', 'sales_count', 'new_clients']).withMessage('Valid metric type is required'),
  query('metric_type').optional().isIn(['sales_amount', 'client_count', 'commission', 'policies_sold', 'sales_count', 'new_clients']).withMessage('Valid metric type is required'),
  query('isActive').optional().isBoolean().withMessage('Valid boolean value is required'),
  // Note: agent_id parameter removed since managers now only see their own goals
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Query parameters:', req.query);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedQuery: req.query
      });
    }

    const { page = 1, limit = 20, goalType, goal_type, metricType, metric_type, isActive } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Map query parameters to handle both field name formats
    const mappedGoalType = goalType || goal_type;
    const mappedMetricType = metricType || metric_type;

    console.log(`🔍 Fetching goals for user ${userId} with role ${userRole}`);

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering - Both managers and agents see only their own goals
      whereConditions.push(eq(goals.agentId, userId));
    console.log(`👤 ${userRole === 'manager' ? 'Manager' : 'Agent'} access: viewing own goals only`);
    
    // Note: Removed agent_id filtering since managers now only see their own goals

    // Filter by goal type
    if (mappedGoalType) {
      whereConditions.push(eq(goals.goalType, mappedGoalType));
      console.log(`🎯 Filtering by goal type: ${mappedGoalType}`);
    }

    // Filter by metric type
    if (mappedMetricType) {
      whereConditions.push(eq(goals.metricType, mappedMetricType));
      console.log(`📊 Filtering by metric type: ${mappedMetricType}`);
    }

    // Filter by active status
    if (isActive !== undefined) {
      whereConditions.push(eq(goals.isActive, isActive === 'true'));
      console.log(`✅ Filtering by active status: ${isActive}`);
    }

    // Build query
    let query = db.select({
      id: goals.id,
      agentId: goals.agentId,
      goalType: goals.goalType,
      metricType: goals.metricType,
      title: goals.title,
      targetValue: goals.targetValue,
      currentValue: goals.currentValue,
      startDate: goals.startDate,
      endDate: goals.endDate,
      isActive: goals.isActive,
      notes: goals.notes,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(goals)
    .leftJoin(users, eq(goals.agentId, users.id));

    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    // Get total count for pagination
    let countQuery = db.select({ count: goals.id }).from(goals);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(and(...whereConditions));
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated results
    const results = await query
      .orderBy(desc(goals.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    console.log(`📊 Found ${results.length} goals out of ${total} total`);

    // Format goals for frontend with proper type conversion
    const formattedGoals = results.map(goal => {
      const formatted = formatGoalForFrontend(goal);
      
      console.log(`🎯 Goal ${goal.id}: ${goal.title}`);
      console.log(`  - target_value: ${formatted.target_value} (type: ${typeof formatted.target_value})`);
      console.log(`  - current_value: ${formatted.current_value} (type: ${typeof formatted.current_value})`);
      
      return formatted;
    });

    // OPTION 2: Always calculate current values from database for accurate display
    console.log('🔄 Calculating current values from database for all goals...');
    const goalsWithCurrentData = await Promise.all(
      formattedGoals.map(async (goal) => {
        try {
          // Clear cache to ensure fresh data
          clearGoalCache(goal.id);
          
          console.log(`🔍 Goal ${goal.id} data:`, {
            agentId: goal.agentId,
            startDate: goal.startDate || goal.start_date,
            endDate: goal.endDate || goal.end_date,
            metricType: goal.metricType || goal.metric_type
          });
          
          // Calculate current value from database for this goal's time period
          const { total: currentData } = await calculateExistingData(
            goal.startDate || goal.start_date, 
            goal.endDate || goal.end_date, 
            goal.agentId, 
            goal.metricType || goal.metric_type
          );
          
          // Update the goal with current database value
          const updatedGoal = {
            ...goal,
            currentValue: currentData,
            current_value: currentData
          };
          
          // Cache the fresh result
          setCachedGoal(goal.id, updatedGoal);
          
          console.log(`✅ Goal ${goal.id}: Updated current value from ${goal.current_value} to ${currentData}`);
          return updatedGoal;
          
        } catch (error) {
          console.error(`❌ Error calculating current value for goal ${goal.id}:`, error);
          return goal; // Return original goal if calculation fails
        }
      })
    );

    // Debug: Log what we're sending to frontend
    console.log('🔍 Backend sending goals to frontend (with current database values):');
    goalsWithCurrentData.forEach(goal => {
      console.log(`Goal ${goal.id}: ${goal.title}`);
      console.log(`  - current_value: ${goal.current_value} (type: ${typeof goal.current_value})`);
      console.log(`  - target_value: ${goal.target_value} (type: ${typeof goal.target_value})`);
    });

    res.json({
      success: true,
      message: 'Goals retrieved successfully',
      data: goalsWithCurrentData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get goals error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /goals/:id - Get goal by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔍 Fetching goal ${goalId} for user ${userId}`);

    // Get goal with agent info
    const goal = await db.select({
      id: goals.id,
      agentId: goals.agentId,
      goalType: goals.goalType,
      metricType: goals.metricType,
      title: goals.title,
      targetValue: goals.targetValue,
      currentValue: goals.currentValue,
      startDate: goals.startDate,
      endDate: goals.endDate,
      isActive: goals.isActive,
      notes: goals.notes,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(goals)
    .leftJoin(users, eq(goals.agentId, users.id))
    .where(eq(goals.id, goalId))
    .limit(1);

    if (!goal || goal.length === 0) {
      console.log(`❌ Goal ${goalId} not found`);
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    let goalData = goal[0];

    // Check access permissions
    if (userRole !== 'manager' && goalData.agent.id !== userId) {
      console.log(`❌ Access denied: User ${userId} cannot access goal ${goalId}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied to this goal',
        code: 'ACCESS_DENIED'
      });
    }

    // Format goal for frontend
    let formattedGoal = formatGoalForFrontend(goalData);

    // OPTION 2: Always calculate current value from database for accurate display
    console.log('🔄 Calculating current value from database for single goal...');
    console.log(`🔍 Single goal data:`, {
      agentId: formattedGoal.agentId,
      startDate: formattedGoal.startDate || formattedGoal.start_date,
      endDate: formattedGoal.endDate || formattedGoal.end_date,
      metricType: formattedGoal.metricType || formattedGoal.metric_type
    });
    
    try {
      const { total: currentData } = await calculateExistingData(
        formattedGoal.startDate || formattedGoal.start_date,
        formattedGoal.endDate || formattedGoal.end_date,
        formattedGoal.agentId,
        formattedGoal.metricType || formattedGoal.metric_type
      );
      
      // Update the goal with current database value
      formattedGoal = {
        ...formattedGoal,
        currentValue: currentData,
        current_value: currentData
      };
      
      console.log(`✅ Single goal ${formattedGoal.id}: Updated current value from ${formattedGoal.current_value} to ${currentData}`);
      
    } catch (error) {
      console.error(`❌ Error calculating current value for single goal ${formattedGoal.id}:`, error);
      // Keep original goal if calculation fails
    }

    // Debug: Log what we're sending to frontend
    console.log('🔍 Backend sending single goal to frontend (with current database value):');
    console.log(`Goal ${formattedGoal.id}: ${formattedGoal.title}`);
    console.log(`  - current_value: ${formattedGoal.current_value} (type: ${typeof formattedGoal.current_value})`);
    console.log(`  - target_value: ${formattedGoal.target_value} (type: ${typeof formattedGoal.target_value})`);

    res.json({
      success: true,
      message: 'Goal retrieved successfully',
      data: formattedGoal
    });

  } catch (error) {
    console.error('❌ Get goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /goals - Create new goal
router.post('/', authenticateToken, validateGoal, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedData: req.body
      });
    }

    const { 
      goalType, 
      goal_type,
      metricType, 
      metric_type,
      title, 
      targetValue, 
      target_value,
      currentValue, 
      current_value,
      startDate, 
      start_date,
      endDate, 
      end_date,
      notes 
    } = req.body;
    
    const agentId = req.user.id;

    // Map fields to handle both snake_case and camelCase
    const mappedGoalType = goalType || goal_type;
    const mappedMetricType = metricType || metric_type;
    const mappedTargetValue = targetValue || target_value;
    const mappedCurrentValue = currentValue || current_value;
    const mappedStartDate = startDate || start_date;
    const mappedEndDate = endDate || end_date;

    // Validate required fields
    if (!mappedGoalType || !mappedMetricType || !mappedTargetValue || !mappedStartDate || !mappedEndDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        details: 'goalType, metricType, targetValue, startDate, and endDate are required'
      });
    }

    // Ensure numeric values are properly converted
    const safeTargetValue = safeDecimalToNumber(mappedTargetValue);
    const safeCurrentValue = safeDecimalToNumber(mappedCurrentValue);

    // Validate target value
    if (safeTargetValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Target value must be greater than 0',
        code: 'INVALID_TARGET_VALUE'
      });
    }

    // Validate date range
    const start = new Date(mappedStartDate);
    const end = new Date(mappedEndDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        code: 'INVALID_DATE',
        details: 'Please provide valid dates in ISO format'
      });
    }
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date',
        code: 'INVALID_DATE_RANGE'
      });
    }

    // Calculate existing data for the new goal's time period
    const { total: existingData, sales: existingSales } = await calculateExistingData(mappedStartDate, mappedEndDate, agentId, mappedMetricType);

    console.log(`📊 Existing data for new goal: ${existingData} for metric ${mappedMetricType}`);

    // Determine the initial current value based on metric type
    let newCurrentValue = 0;
    if (mappedMetricType === 'policies_sold' || mappedMetricType === 'sales_count') {
      // For these count metrics, start at 0 since they count new occurrences
      newCurrentValue = 0;
      console.log(`📋 Goal ${mappedMetricType}: Current value set to 0 as it's a new count metric.`);
    } else if (mappedMetricType === 'client_count' || mappedMetricType === 'new_clients') {
      // For client metrics, use existing data since we want to count all clients in the period
      newCurrentValue = existingData;
      console.log(`👥 Goal ${mappedMetricType}: Current value set to existing client data: ${newCurrentValue}`);
    } else {
      // For amount-based metrics (sales_amount, commission), use existing data
      newCurrentValue = existingData;
      console.log(`📈 Goal ${mappedMetricType}: Current value set to existing data: ${newCurrentValue}`);
    }

    // Update the goal with new current value
    const insertData = {
      agentId,
      goalType: mappedGoalType,
      metricType: mappedMetricType,
      title,
      targetValue: safeTargetValue,
      currentValue: newCurrentValue,
      startDate: mappedStartDate,
      endDate: mappedEndDate,
      isActive: true,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('🔍 Insert data being sent to database:', insertData);
    console.log('🔍 Insert data types:', {
      agentId: typeof agentId,
      goalType: typeof mappedGoalType,
      metricType: typeof mappedMetricType,
      title: typeof title,
      targetValue: typeof safeTargetValue,
      currentValue: typeof newCurrentValue,
      startDate: typeof mappedStartDate,
      endDate: typeof mappedEndDate,
      isActive: typeof true,
      notes: typeof notes,
      createdAt: typeof new Date(),
      updatedAt: typeof new Date()
    });

    // Create goal with explicit field selection
    const insertResult = await db.insert(goals).values(insertData).returning({
      id: goals.id,
      agentId: goals.agentId,
      goalType: goals.goalType,
      metricType: goals.metricType,
      title: goals.title,
      targetValue: goals.targetValue,
      currentValue: goals.currentValue,
      startDate: goals.startDate,
      endDate: goals.endDate,
      isActive: goals.isActive,
      notes: goals.notes,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt
    });
    
    console.log('🔍 Raw database insert result:', insertResult);
    console.log('🔍 First goal object:', insertResult[0]);
    console.log('🔍 Goal ID:', insertResult[0]?.id);
    
    // If returning() doesn't work, try to fetch the goal by agent and title
    let goalToReturn = insertResult[0];
    if (!goalToReturn?.id) {
      console.log('⚠️ returning() didn\'t work, fetching goal by agent and title...');
      const fetchedGoal = await db.select({
        id: goals.id,
        agentId: goals.agentId,
        goalType: goals.goalType,
        metricType: goals.metricType,
        title: goals.title,
        targetValue: goals.targetValue,
        currentValue: goals.currentValue,
        startDate: goals.startDate,
        endDate: goals.endDate,
        isActive: goals.isActive,
        notes: goals.notes,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt
      })
      .from(goals)
      .where(and(
        eq(goals.agentId, agentId),
        eq(goals.title, title),
        eq(goals.goalType, mappedGoalType),
        eq(goals.metricType, mappedMetricType)
      ))
      .orderBy(desc(goals.createdAt))
      .limit(1);
      
      if (fetchedGoal.length > 0) {
        goalToReturn = fetchedGoal[0];
        console.log('✅ Fetched goal after insert:', goalToReturn);
        console.log('✅ Fetched goal ID:', goalToReturn.id);
      }
    }
    
    const formattedGoal = formatGoalForFrontend(goalToReturn);
    console.log('🔍 Formatted goal:', formattedGoal);
    console.log('🔍 Formatted goal ID:', formattedGoal.id);

    console.log(`✅ Goal created successfully:`, formattedGoal);

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: formattedGoal
    });

  } catch (error) {
    console.error('❌ Create goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /goals/:id - Update goal
router.put('/:id', authenticateToken, validateGoal, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedData: req.body
      });
    }

    const goalId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    const { 
      goalType, 
      goal_type,
      metricType, 
      metric_type,
      title, 
      targetValue, 
      target_value,
      currentValue, 
      current_value,
      startDate, 
      start_date,
      endDate, 
      end_date,
      notes 
    } = req.body;

    // Map fields to handle both snake_case and camelCase
    const mappedGoalType = goalType || goal_type;
    const mappedMetricType = metricType || metric_type;
    const mappedTargetValue = targetValue || target_value;
    const mappedCurrentValue = currentValue || current_value;
    const mappedStartDate = startDate || start_date;
    const mappedEndDate = endDate || end_date;

    // Validate required fields
    if (!mappedGoalType || !mappedMetricType || !mappedTargetValue || !mappedStartDate || !mappedEndDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
        details: 'goalType, metricType, targetValue, startDate, and endDate are required'
      });
    }

    // Ensure numeric values are properly converted
    const safeTargetValue = safeDecimalToNumber(mappedTargetValue);
    const safeCurrentValue = safeDecimalToNumber(mappedCurrentValue);

    // Validate target value
    if (safeTargetValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Target value must be greater than 0',
        code: 'INVALID_TARGET_VALUE'
      });
    }

    // Validate date range
    const start = new Date(mappedStartDate);
    const end = new Date(mappedEndDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        code: 'INVALID_DATE',
        details: 'Please provide valid dates in ISO format'
      });
    }
    
    if (start >= end) {
      return res.status(400).json({
        success: false,
        error: 'End date must be after start date',
        code: 'INVALID_DATE_RANGE'
      });
    }

    // Get goal to check permissions
    const existingGoal = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
    
    if (!existingGoal || existingGoal.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    const goalData = existingGoal[0];

    // Check access permissions
    if (userRole !== 'manager' && goalData.agentId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this goal',
        code: 'ACCESS_DENIED'
      });
    }

    console.log(`📝 Updating goal ${goalId} for user ${userId}:`, {
      goalType: mappedGoalType,
      metricType: mappedMetricType,
      targetValue: safeTargetValue,
      currentValue: safeCurrentValue,
      startDate: mappedStartDate,
      endDate: mappedEndDate
    });

    // Update goal
    const updatedGoal = await db.update(goals)
      .set({
        goalType: mappedGoalType,
        metricType: mappedMetricType,
        title,
        targetValue: safeTargetValue,
        currentValue: safeCurrentValue,
        startDate: mappedStartDate,
        endDate: mappedEndDate,
        notes,
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId))
      .returning();

    const formattedGoal = formatGoalForFrontend(updatedGoal[0]);
    
    // Clear cache for this goal to ensure fresh data
    clearGoalCacheOnUpdate(goalId);
    
    console.log(`✅ Goal updated successfully:`, formattedGoal);

    res.json({
      success: true,
      message: 'Goal updated successfully',
      data: formattedGoal
    });

  } catch (error) {
    console.error('❌ Update goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /goals/:id - Delete goal
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🗑️ Deleting goal ${goalId} for user ${userId}`);

    // Get goal to check permissions
    const existingGoal = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
    
    if (!existingGoal || existingGoal.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    const goalData = existingGoal[0];

    // Check access permissions
    if (userRole !== 'manager' && goalData.agentId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this goal',
        code: 'ACCESS_DENIED'
      });
    }

    // Delete goal
    await db.delete(goals).where(eq(goals.id, goalId));

    // Clear cache for this goal
    clearGoalCacheOnUpdate(goalId);

    console.log(`✅ Goal deleted successfully`);

    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete goal error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /goals/:id/progress - Update goal progress
router.put('/:id/progress', authenticateToken, [
  body('currentValue').optional().isFloat({ min: 0 }).withMessage('Valid current value is required'),
  body('current_value').optional().isFloat({ min: 0 }).withMessage('Valid current value is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Progress update validation errors:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
        receivedData: req.body
      });
    }

    const goalId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;
    const { currentValue, current_value } = req.body;

    // Map fields to handle both snake_case and camelCase
    const mappedCurrentValue = currentValue || current_value;

    if (!mappedCurrentValue) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        code: 'MISSING_FIELDS',
        details: 'currentValue is required'
      });
    }

    // Get goal to check permissions
    const existingGoal = await db.select().from(goals).where(eq(goals.id, goalId)).limit(1);
    
    if (!existingGoal || existingGoal.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    const goalData = existingGoal[0];

    // Check access permissions
    if (userRole !== 'manager' && goalData.agentId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this goal',
        code: 'ACCESS_DENIED'
      });
    }

    // Ensure numeric value is properly converted
    const safeCurrentValue = safeDecimalToNumber(mappedCurrentValue);

    // Update goal progress
    const updatedGoal = await db.update(goals)
      .set({
        currentValue: safeCurrentValue,
        updatedAt: new Date()
      })
      .where(eq(goals.id, goalId))
      .returning();

    const formattedGoal = formatGoalForFrontend(updatedGoal[0]);
    
    console.log(`✅ Goal progress updated successfully:`, formattedGoal);

    res.json({
      success: true,
      message: 'Goal progress updated successfully',
      data: formattedGoal
    });

  } catch (error) {
    console.error('❌ Update goal progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /goals/progress - Get goal progress overview
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const { startDate, start_date, endDate, end_date } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Map query parameters to handle both field name formats
    const mappedStartDate = startDate || start_date;
    const mappedEndDate = endDate || end_date;

    console.log(`🔍 Fetching goal progress for user ${userId}`);

    // Build where conditions
    let whereConditions = [];

    // Role-based filtering
    if (userRole === 'manager') {
      // Managers can see all goals
      console.log('👑 Manager access: viewing all goal progress');
    } else {
      // Regular agents can only see their own goals
      whereConditions.push(eq(goals.agentId, userId));
      console.log('👤 Agent access: viewing own goal progress only');
    }

    // Date range filter
    if (mappedStartDate && mappedEndDate) {
      whereConditions.push(
        and(
          gte(goals.startDate, mappedStartDate),
          lte(goals.endDate, mappedEndDate)
        )
      );
      console.log(`📅 Filtering by date range: ${mappedStartDate} to ${mappedEndDate}`);
    }

    // Get active goals
    whereConditions.push(eq(goals.isActive, true));

    // Get goals with progress
    const goalsWithProgress = await db.select({
      id: goals.id,
      title: goals.title,
      goalType: goals.goalType,
      metricType: goals.metricType,
      targetValue: goals.targetValue,
      currentValue: goals.currentValue,
      startDate: goals.startDate,
      endDate: goals.endDate,
      agent: {
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(goals)
    .leftJoin(users, eq(goals.agentId, users.id))
    .where(and(...whereConditions))
    .orderBy(desc(goals.endDate));

    // Format goals and calculate progress
    const formattedGoals = goalsWithProgress.map(goal => {
      const formatted = formatGoalForFrontend(goal);
      const progress = formatted.target_value > 0 ? (formatted.current_value / formatted.target_value) * 100 : 0;
      
      return {
        ...formatted,
        progress: Math.round(progress * 100) / 100 // Round to 2 decimal places
      };
    });

    // Calculate summary statistics
    const totalGoals = formattedGoals.length;
    const completedGoals = formattedGoals.filter(goal => goal.progress >= 100).length;
    const inProgressGoals = formattedGoals.filter(goal => goal.progress > 0 && goal.progress < 100).length;
    const notStartedGoals = formattedGoals.filter(goal => goal.progress === 0).length;

    // Group by goal type
    const goalsByType = formattedGoals.reduce((acc, goal) => {
      if (!acc[goal.goal_type]) {
        acc[goal.goal_type] = [];
      }
      acc[goal.goal_type].push(goal);
      return acc;
    }, {});

    // Group by metric type
    const goalsByMetric = formattedGoals.reduce((acc, goal) => {
      if (!acc[goal.metric_type]) {
        acc[goal.metric_type] = [];
      }
      acc[goal.metric_type].push(goal);
      return acc;
    }, {});

    console.log(`📊 Goal progress summary: ${totalGoals} total, ${completedGoals} completed, ${inProgressGoals} in progress, ${notStartedGoals} not started`);

    res.json({
      success: true,
      message: 'Goal progress retrieved successfully',
      data: {
        summary: {
          total: totalGoals,
          completed: completedGoals,
          inProgress: inProgressGoals,
          notStarted: notStartedGoals,
          completionRate: totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0
        },
        goals: formattedGoals,
        byType: goalsByType,
        byMetric: goalsByMetric
      }
    });

  } catch (error) {
    console.error('❌ Get goal progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});


// POST /goals/sync-all - Sync all goals with current database state
router.post('/sync-all', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Only managers can sync all goals
    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED',
        details: 'Only managers can sync all goals'
      });
    }

    console.log('🔄 Starting goal sync for all active goals...');
    
    // Get all active goals
    const allGoals = await db.select().from(goals).where(eq(goals.isActive, true));
    console.log(`Found ${allGoals.length} active goals to sync`);

    let syncedGoals = 0;
    let errors = [];

    for (const goal of allGoals) {
      try {
        console.log(`🔄 Syncing goal ${goal.id}: ${goal.title} (${goal.metricType})`);
        
        // Calculate current value from database for this goal's time period
        const { total: currentData } = await calculateExistingData(
          goal.startDate, 
          goal.endDate, 
          goal.agentId, 
          goal.metricType
        );
        
        // Update the goal with current database value
        await db.update(goals)
          .set({
            currentValue: currentData,
            updatedAt: new Date()
          })
          .where(eq(goals.id, goal.id));

        console.log(`✅ Synced goal ${goal.id}: ${goal.currentValue} → ${currentData}`);
        syncedGoals++;

      } catch (error) {
        console.error(`❌ Error syncing goal ${goal.id}:`, error);
        errors.push({ goalId: goal.id, error: error.message });
      }
    }

    console.log(`🎯 Goal sync completed: ${syncedGoals} goals synced, ${errors.length} errors`);

    res.json({
      success: true,
      message: 'Goal sync completed successfully',
      data: {
        totalGoals: allGoals.length,
        syncedGoals,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Goal sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /goals/fix-client-counts - Fix all existing client_count goals
router.post('/fix-client-counts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`🔧 Fixing client count goals for user ${userId} (${userRole})`);
    
    // Get all client_count goals for this user
    const clientCountGoals = await db.select().from(goals).where(
      and(
        eq(goals.agentId, userId),
        eq(goals.metricType, 'client_count')
      )
    );
    
    console.log(`👥 Found ${clientCountGoals.length} client_count goals to fix`);
    
    let fixedGoals = 0;
    let errors = [];
    
    for (const goal of clientCountGoals) {
      try {
        console.log(`🔧 Fixing goal ${goal.id}: ${goal.title}`);
        
        // Calculate the correct current value
        const { total: correctValue } = await calculateExistingData(
          goal.startDate,
          goal.endDate,
          goal.agentId,
          goal.metricType
        );
        
        console.log(`📊 Goal ${goal.id}: Current value ${goal.currentValue} → Correct value ${correctValue}`);
        
        // Update the goal with the correct value
        await db.update(goals)
          .set({
            currentValue: correctValue,
            updatedAt: new Date()
          })
          .where(eq(goals.id, goal.id));
        
        console.log(`✅ Fixed goal ${goal.id}`);
        fixedGoals++;
        
      } catch (error) {
        console.error(`❌ Error fixing goal ${goal.id}:`, error);
        errors.push({ goalId: goal.id, error: error.message });
      }
    }
    
    res.json({
      success: true,
      message: 'Client count goals fixed successfully',
      data: {
        userId,
        userRole,
        totalGoals: clientCountGoals.length,
        fixedGoals,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Fix client counts error:', error);
    res.status(500).json({
      success: false,
      error: 'Fix failed',
      code: 'FIX_ERROR',
      details: error.message
    });
  }
});

// Register cache invalidation handler
registerCacheInvalidation('goal_cache_invalidation', async (data) => {
  const { agentId, changeType, affectedMetrics } = data;
  clearGoalCacheByMetric(agentId, affectedMetrics);
});

// POST /goals/recalculate-progress - Queue background job for progress recalculation
router.post('/recalculate-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`🔄 Queuing progress recalculation for user ${userId} (${userRole})`);
    
    // Queue background job for recalculating all goals
    const jobId = await jobQueue.addJob('recalculate_all_goals', {
      agentId: userId
    }, 'high'); // High priority for user-initiated recalculation
    
    res.json({
      success: true,
      message: 'Progress recalculation queued successfully',
      jobId,
      status: 'queued'
    });
    
  } catch (error) {
    console.error('❌ Queue recalculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue recalculation job',
      code: 'QUEUE_ERROR',
      details: error.message
    });
  }
});

// POST /goals/:id/calculate-progress - Queue background job for specific goal
router.post('/:id/calculate-progress', authenticateToken, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🎯 Queuing progress calculation for goal ${goalId}`);

    // Get goal details
    const goal = await db.select()
      .from(goals)
      .where(eq(goals.id, goalId))
      .limit(1);

    if (!goal || goal.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found',
        code: 'GOAL_NOT_FOUND'
      });
    }

    const goalData = goal[0];

    // Check access permissions
    if (userRole !== 'manager' && goalData.agentId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this goal',
        code: 'ACCESS_DENIED'
      });
    }

    // Queue background job for calculating this goal's progress
    const jobId = await jobQueue.addJob('calculate_goal_progress', {
      goalId: goalData.id,
      agentId: goalData.agentId,
      startDate: goalData.startDate,
      endDate: goalData.endDate,
      metricType: goalData.metricType
    }, 'normal');
    
    res.json({
      success: true,
      message: 'Goal progress calculation queued successfully',
      jobId,
      goalId: goalData.id,
      status: 'queued'
    });
    
  } catch (error) {
    console.error('❌ Queue goal calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to queue goal calculation job',
      code: 'QUEUE_ERROR',
      details: error.message
    });
  }
});

// GET /goals/jobs/:jobId - Get job status
router.get('/jobs/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const jobStatus = jobQueue.getJobStatus(jobId);
    
    if (!jobStatus) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        code: 'JOB_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      job: {
        id: jobStatus.id,
        type: jobStatus.type,
        status: jobStatus.status,
        progress: jobStatus.status === 'completed' ? 100 : 
                  jobStatus.status === 'failed' ? 0 : 50,
        result: jobStatus.result,
        error: jobStatus.error,
        createdAt: jobStatus.createdAt,
        startedAt: jobStatus.startedAt,
        completedAt: jobStatus.completedAt,
        attempts: jobStatus.attempts,
        maxAttempts: jobStatus.maxAttempts
      }
    });
    
  } catch (error) {
    console.error('❌ Get job status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job status',
      code: 'JOB_STATUS_ERROR',
      details: error.message
    });
  }
});

// GET /goals/jobs - Get job queue statistics
router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only managers can view job statistics
    if (userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied - Manager role required',
        code: 'ACCESS_DENIED'
      });
    }
    
    const stats = jobQueue.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        queueHealth: stats.processingCapacity > 0 ? 'healthy' : 'busy'
      }
    });
    
  } catch (error) {
    console.error('❌ Get job stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job statistics',
      code: 'JOB_STATS_ERROR',
      details: error.message
    });
  }
});

// Export cache functions for use in job queue
export { clearGoalCache, clearGoalCacheByMetric };

export default router;