import express from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../config/database.js';
import { sales, clients, users, goals } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/roleCheck.js';
import { eq, and, desc, asc, gte, lte, sum, count, sql } from 'drizzle-orm';

const router = express.Router();

// GET /dashboard - Get dashboard data
router.get('/dashboard', authenticateToken, [
  query('user_id').optional().isInt({ min: 1 }).withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user.id;
    const userRole = req.user.role;

    // Check permissions
    if (userRole !== 'manager' && userId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Get user's sales data
    const userSales = await db.select({
      totalSales: count(sales.id),
      totalRevenue: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount)
    })
    .from(sales)
    .where(eq(sales.agentId, userId));

    // Get user's clients
    const userClients = await db.select({
      totalClients: count(clients.id)
    })
    .from(clients)
    .where(eq(clients.agentId, userId));

    // Get user's goals
    const userGoals = await db.select({
      totalGoals: count(goals.id),
      activeGoals: count(goals.id)
    })
    .from(goals)
    .where(and(
      eq(goals.agentId, userId),
      eq(goals.isActive, true)
    ));

    res.json({
      message: 'Dashboard data retrieved successfully',
      data: {
        sales: userSales[0] || { totalSales: 0, totalRevenue: 0, totalCommission: 0 },
        clients: userClients[0] || { totalClients: 0 },
        goals: userGoals[0] || { totalGoals: 0, activeGoals: 0 }
      }
    });

  } catch (error) {
    console.error('Get dashboard data error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /sales - Generate sales reports
router.get('/sales', authenticateToken, [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  query('agentId').optional().isInt({ min: 1 }).withMessage('Valid agent ID is required'),
  query('productId').optional().isInt({ min: 1 }).withMessage('Valid product ID is required'),
  query('status').optional().isIn(['active', 'cancelled', 'expired']).withMessage('Valid status is required'),
  query('groupBy').optional().isIn(['day', 'week', 'month', 'quarter', 'year', 'agent', 'product']).withMessage('Valid group by option is required')
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

    const { startDate, endDate, agentId, productId, status, groupBy = 'month' } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate agent ID if provided
    let parsedAgentId = undefined;
    if (agentId !== undefined) {
      parsedAgentId = parseInt(agentId);
      if (isNaN(parsedAgentId) || parsedAgentId <= 0) {
        return res.status(400).json({
          error: 'Invalid agent ID',
          code: 'VALIDATION_ERROR',
          message: 'Agent ID must be a valid positive integer',
          details: { agentId, parsedAgentId }
        });
      }
    }

    // Build where conditions
    let whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(sales.saleDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(sales.saleDate, endDate));
    }
    if (parsedAgentId) {
      whereConditions.push(eq(sales.agentId, parsedAgentId));
    }
    if (productId) {
      whereConditions.push(eq(sales.productId, parseInt(productId)));
    }
    if (status) {
      whereConditions.push(eq(sales.status, status));
    }

    // Role-based filtering
    if (userRole !== 'manager') {
      whereConditions.push(eq(sales.agentId, userId));
    }

    let reportQuery;

    switch (groupBy) {
      case 'day':
        reportQuery = db.select({
          date: sql`DATE(${sales.saleDate})`,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`DATE(${sales.saleDate})`)
        .orderBy(sql`DATE(${sales.saleDate})`);
        break;

      case 'week':
        reportQuery = db.select({
          week: sql`DATE_TRUNC('week', ${sales.saleDate})`,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`DATE_TRUNC('week', ${sales.saleDate})`)
        .orderBy(sql`DATE_TRUNC('week', ${sales.saleDate})`);
        break;

      case 'month':
        reportQuery = db.select({
          month: sql`DATE_TRUNC('month', ${sales.saleDate})`,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`DATE_TRUNC('month', ${sales.saleDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${sales.saleDate})`);
        break;

      case 'quarter':
        reportQuery = db.select({
          quarter: sql`DATE_TRUNC('quarter', ${sales.saleDate})`,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`DATE_TRUNC('quarter', ${sales.saleDate})`)
        .orderBy(sql`DATE_TRUNC('quarter', ${sales.saleDate})`);
        break;

      case 'year':
        reportQuery = db.select({
          year: sql`DATE_TRUNC('year', ${sales.saleDate})`,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sql`DATE_TRUNC('year', ${sales.saleDate})`)
        .orderBy(sql`DATE_TRUNC('year', ${sales.saleDate})`);
        break;

      case 'agent':
        reportQuery = db.select({
          agentId: users.id,
          agentName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .leftJoin(users, eq(sales.agentId, users.id))
        .where(and(...whereConditions))
        .groupBy(users.id, users.firstName, users.lastName)
        .orderBy(desc(sum(sales.premiumAmount)));
        break;

      case 'product':
        reportQuery = db.select({
          productId: sales.productId,
          productName: sales.productName,
          totalSales: count(sales.id),
          totalRevenue: sum(sales.premiumAmount),
          totalCommission: sum(sales.commissionAmount),
          averagePremium: sql`AVG(${sales.premiumAmount})`
        })
        .from(sales)
        .where(and(...whereConditions))
        .groupBy(sales.productId, sales.productName)
        .orderBy(desc(sum(sales.premiumAmount)));
        break;

      default:
        return res.status(400).json({
          error: 'Invalid group by option',
          code: 'INVALID_GROUP_BY'
        });
    }

    const reportData = await reportQuery;

    // Get summary statistics
    const summaryQuery = db.select({
      totalSales: count(sales.id),
      totalRevenue: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      averagePremium: sql`AVG(${sales.premiumAmount})`,
      totalClients: count(clients.id)
    })
    .from(sales)
    .leftJoin(clients, eq(sales.clientId, clients.id))
    .where(and(...whereConditions));

    const summary = await summaryQuery;

    res.json({
      message: 'Sales report generated successfully',
      report: {
        groupBy,
        data: reportData,
        summary: summary[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalCommission: 0,
          averagePremium: 0,
          totalClients: 0
        }
      }
    });

  } catch (error) {
    console.error('Generate sales report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /performance - Generate performance reports
router.get('/performance', authenticateToken, [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  query('agentId').optional().isInt({ min: 1 }).withMessage('Valid agent ID is required')
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

    const { startDate, endDate, agentId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate agent ID if provided
    let parsedAgentId = undefined;
    if (agentId !== undefined) {
      parsedAgentId = parseInt(agentId);
      if (isNaN(parsedAgentId) || parsedAgentId <= 0) {
        return res.status(400).json({
          error: 'Invalid agent ID',
          code: 'VALIDATION_ERROR',
          message: 'Agent ID must be a valid positive integer',
          details: { agentId, parsedAgentId }
        });
      }
    }

    // Build where conditions
    let whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(sales.saleDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(sales.saleDate, endDate));
    }
    if (parsedAgentId) {
      whereConditions.push(eq(sales.agentId, parsedAgentId));
    }

    // Role-based filtering
    if (userRole !== 'manager') {
      whereConditions.push(eq(sales.agentId, userId));
    }

    // Get agent performance data
    const performanceData = await db.select({
      agentId: users.id,
      agentName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      email: users.email,
      role: users.role,
      department: users.department,
      totalSales: count(sales.id),
      totalRevenue: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      averagePremium: sql`AVG(${sales.premiumAmount})`,
      totalClients: count(clients.id),
      conversionRate: sql`CASE WHEN COUNT(DISTINCT ${clients.id}) > 0 THEN (COUNT(${sales.id})::float / COUNT(DISTINCT ${clients.id})::float) * 100 ELSE 0 END`
    })
    .from(users)
    .leftJoin(sales, eq(users.id, sales.agentId))
    .leftJoin(clients, eq(users.id, clients.agentId))
    .where(and(
      eq(users.isActive, true),
      ...whereConditions
    ))
    .groupBy(users.id, users.firstName, users.lastName, users.email, users.role, users.department)
    .orderBy(desc(sum(sales.premiumAmount)));

    // Get team performance summary
    const teamSummary = await db.select({
      totalAgents: count(users.id),
      totalSales: count(sales.id),
      totalRevenue: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      averagePremium: sql`AVG(${sales.premiumAmount})`,
      totalClients: count(clients.id)
    })
    .from(users)
    .leftJoin(sales, eq(users.id, sales.agentId))
    .leftJoin(clients, eq(users.id, clients.agentId))
    .where(and(
      eq(users.isActive, true),
      ...whereConditions
    ));

    res.json({
      message: 'Performance report generated successfully',
      report: {
        performance: performanceData,
        summary: teamSummary[0] || {
          totalAgents: 0,
          totalSales: 0,
          totalRevenue: 0,
          totalCommission: 0,
          averagePremium: 0,
          totalClients: 0
        }
      }
    });

  } catch (error) {
    console.error('Generate performance report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /team - Generate team performance report
router.get('/team', authenticateToken, [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required')
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

    const { startDate, endDate } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only managers can access team reports
    if (userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied. Manager role required.',
        code: 'ACCESS_DENIED'
      });
    }

    // Build where conditions
    let whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(sales.saleDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(sales.saleDate, endDate));
    }

    // Get team performance data with user details
    const teamPerformance = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      totalSales: count(sales.id),
      totalPremium: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      totalClients: count(clients.id),
      averagePremium: sql`AVG(${sales.premiumAmount})`
    })
    .from(users)
    .leftJoin(sales, eq(users.id, sales.agentId))
    .leftJoin(clients, eq(users.id, clients.agentId))
    .where(and(
      eq(users.role, 'agent'),
      eq(users.isActive, true),
      ...whereConditions
    ))
    .groupBy(users.id, users.firstName, users.lastName, users.email, users.role, users.isActive)
    .orderBy(desc(sum(sales.premiumAmount)));

    // Get team summary
    const teamSummary = await db.select({
      totalAgents: count(users.id),
      totalSales: count(sales.id),
      totalPremium: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      totalClients: count(clients.id),
      averagePremium: sql`AVG(${sales.premiumAmount})`
    })
    .from(users)
    .leftJoin(sales, eq(users.id, sales.agentId))
    .leftJoin(clients, eq(users.id, clients.agentId))
    .where(and(
      eq(users.role, 'agent'),
      eq(users.isActive, true),
      ...whereConditions
    ));

    res.json({
      message: 'Team performance report generated successfully',
      data: {
        members: teamPerformance,
        summary: teamSummary[0] || {
          totalAgents: 0,
          totalSales: 0,
          totalPremium: 0,
          totalCommission: 0,
          totalClients: 0,
          averagePremium: 0
        }
      }
    });

  } catch (error) {
    console.error('Generate team performance report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /goals - Generate goal reports
router.get('/goals', authenticateToken, [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  query('goalType').optional().isIn(['weekly', 'monthly', 'half_yearly', 'annual']).withMessage('Valid goal type is required')
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

    const { startDate, endDate, goalType } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build where conditions
    let whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(goals.startDate, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(goals.endDate, endDate));
    }
    if (goalType) {
      whereConditions.push(eq(goals.goalType, goalType));
    }

    // Role-based filtering
    if (userRole !== 'manager') {
      whereConditions.push(eq(goals.agentId, userId));
    }

    // Get goal progress data
    const goalData = await db.select({
      id: goals.id,
      title: goals.title,
      goalType: goals.goalType,
      metricType: goals.metricType,
      targetValue: goals.targetValue,
      currentValue: goals.currentValue,
      startDate: goals.startDate,
      endDate: goals.endDate,
      isActive: goals.isActive,
      progress: sql`CASE WHEN ${goals.targetValue} > 0 THEN (${goals.currentValue}::float / ${goals.targetValue}::float) * 100 ELSE 0 END`,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email
      }
    })
    .from(goals)
    .leftJoin(users, eq(goals.agentId, users.id))
    .where(and(
      eq(goals.isActive, true),
      ...whereConditions
    ))
    .orderBy(desc(sql`CASE WHEN ${goals.targetValue} > 0 THEN (${goals.currentValue}::float / ${goals.targetValue}::float) * 100 ELSE 0 END`));

    // Get goal summary statistics
    const goalSummary = await db.select({
      totalGoals: count(goals.id),
      activeGoals: count(goals.id),
      completedGoals: count(goals.id),
      averageProgress: sql`AVG(CASE WHEN ${goals.targetValue} > 0 THEN (${goals.currentValue}::float / ${goals.targetValue}::float) * 100 ELSE 0 END)`
    })
    .from(goals)
    .where(and(
      eq(goals.isActive, true),
      ...whereConditions
    ));

    res.json({
      message: 'Goal report generated successfully',
      report: {
        goals: goalData,
        summary: goalSummary[0] || {
          totalGoals: 0,
          activeGoals: 0,
          completedGoals: 0,
          averageProgress: 0
        }
      }
    });

  } catch (error) {
    console.error('Generate goal report error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /comprehensive - Generate comprehensive reports for frontend
router.get('/comprehensive', authenticateToken, [
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  query('agentId').optional().isInt({ min: 1 }).withMessage('Valid agent ID is required')
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

    const { startDate, endDate, agentId } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate agent ID if provided
    let parsedAgentId = undefined;
    if (agentId !== undefined) {
      parsedAgentId = parseInt(agentId);
      if (isNaN(parsedAgentId) || parsedAgentId <= 0) {
        return res.status(400).json({
          error: 'Invalid agent ID',
          code: 'VALIDATION_ERROR',
          message: 'Agent ID must be a valid positive integer',
          details: { agentId, parsedAgentId }
        });
      }
    }

    // Set default dates if not provided
    const effectiveStartDate = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const effectiveEndDate = endDate || new Date().toISOString().split('T')[0];

    // Log the parameters for debugging
    console.log('🔍 Reports API called with:', {
      startDate,
      endDate,
      effectiveStartDate,
      effectiveEndDate,
      agentId,
      parsedAgentId,
      userId,
      userRole
    });

    // Build where conditions
    let whereConditions = [];

    if (effectiveStartDate) {
      whereConditions.push(gte(sales.saleDate, effectiveStartDate));
    }
    if (effectiveEndDate) {
      whereConditions.push(lte(sales.saleDate, effectiveEndDate));
    }
    if (parsedAgentId) {
      whereConditions.push(eq(sales.agentId, parsedAgentId));
    }

    // Role-based filtering
    if (userRole !== 'manager') {
      whereConditions.push(eq(sales.agentId, userId));
    }

    // Get sales data
    const salesData = await db.select({
      id: sales.id,
      premiumAmount: sales.premiumAmount,
      commissionAmount: sales.commissionAmount,
      saleDate: sales.saleDate,
      status: sales.status,
      productName: sales.productName,
      agentId: sales.agentId,
      agent: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName
      }
    })
    .from(sales)
    .leftJoin(users, eq(sales.agentId, users.id))
    .where(and(...whereConditions));

    // Get clients data
    let clientsQuery = db.select({
      id: clients.id,
      status: clients.status,
      createdAt: clients.createdAt
    })
    .from(clients);
    
    // Apply role-based filtering for clients
    if (userRole !== 'manager') {
      clientsQuery = clientsQuery.where(eq(clients.agentId, userId));
    } else if (parsedAgentId) {
      clientsQuery = clientsQuery.where(eq(clients.agentId, parsedAgentId));
    }
    
    const clientsData = await clientsQuery;

    // Get goals data
    let goalsQuery = db.select({
      id: goals.id,
      title: goals.title,
      targetValue: goals.targetValue,
      currentValue: goals.currentValue,
      isActive: goals.isActive
    })
    .from(goals);
    
    // Apply role-based filtering for goals
    if (userRole !== 'manager') {
      goalsQuery = goalsQuery.where(eq(goals.agentId, userId));
    } else if (parsedAgentId) {
      goalsQuery = goalsQuery.where(eq(goals.agentId, parsedAgentId));
    }
    
    const goalsData = await goalsQuery;

    // Process sales summary
    const salesSummary = {
      totalSales: salesData.length || 0,
      totalPremium: salesData.reduce((sum, sale) => sum + parseFloat(sale.premiumAmount || 0), 0),
      totalCommission: salesData.reduce((sum, sale) => sum + parseFloat(sale.commissionAmount || 0), 0),
      averageDealSize: salesData.length > 0 ? salesData.reduce((sum, sale) => sum + parseFloat(sale.premiumAmount || 0), 0) / salesData.length : 0
    };

    // Process agent performance
    const agentStats = {};
    if (salesData && salesData.length > 0) {
      salesData.forEach(sale => {
        const agentName = `${sale.agent?.firstName || ''} ${sale.agent?.lastName || ''}`.trim() || 'Unknown Agent';
        const agentId = sale.agentId;
        
        if (!agentStats[agentName]) {
          agentStats[agentName] = {
            name: agentName,
            id: agentId, // Include the actual agent ID
            sales: 0,
            premium: 0,
            commission: 0
          };
        }
        agentStats[agentName].sales += 1;
        agentStats[agentName].premium += parseFloat(sale.premiumAmount || 0);
        agentStats[agentName].commission += parseFloat(sale.commissionAmount || 0);
      });
    }
    const agentPerformance = Object.values(agentStats).sort((a, b) => b.premium - a.premium);

    // Process client analytics
    const clientAnalytics = {
      totalClients: clientsData && clientsData.length > 0 ? clientsData.filter(c => c.status === 'client').length : 0,
      totalProspects: clientsData && clientsData.length > 0 ? clientsData.filter(c => c.status === 'prospect').length : 0,
      conversionRate: clientsData && clientsData.length > 0 ? (clientsData.filter(c => c.status === 'client').length / clientsData.length * 100) : 0
    };

    // Process product performance
    const productStats = {};
    if (salesData && salesData.length > 0) {
      salesData.forEach(sale => {
        const productName = sale.productName || 'Unknown Product';
        if (!productStats[productName]) {
          productStats[productName] = {
            name: productName,
            sales: 0,
            premium: 0,
            commission: 0
          };
        }
        productStats[productName].sales += 1;
        productStats[productName].premium += parseFloat(sale.premiumAmount || 0);
        productStats[productName].commission += parseFloat(sale.commissionAmount || 0);
      });
    }
    const productPerformance = Object.values(productStats);

    // Process monthly trends
    const monthlyStats = {};
    if (salesData && salesData.length > 0) {
      salesData.forEach(sale => {
        try {
          const month = new Date(sale.saleDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          if (!monthlyStats[month]) {
            monthlyStats[month] = {
              month,
              sales: 0,
              premium: 0,
              commission: 0
            };
          }
          monthlyStats[month].sales += 1;
          monthlyStats[month].premium += parseFloat(sale.premiumAmount || 0);
          monthlyStats[month].commission += parseFloat(sale.commissionAmount || 0);
        } catch (dateError) {
          console.warn('Invalid sale date:', sale.saleDate, dateError);
        }
      });
    }
    const monthlyTrends = Object.values(monthlyStats).sort((a, b) => {
      try {
        return new Date(a.month) - new Date(b.month);
      } catch (dateError) {
        console.warn('Error sorting monthly trends:', dateError);
        return 0;
      }
    });

    // Process goal progress
    const goalProgress = goalsData && goalsData.length > 0 ? goalsData.map(goal => {
      try {
        const targetValue = parseFloat(goal.targetValue || 0);
        const currentValue = parseFloat(goal.currentValue || 0);
        return {
          title: goal.title || 'Untitled Goal',
          target: targetValue,
          current: currentValue,
          progress: targetValue > 0 ? (currentValue / targetValue * 100) : 0,
          status: goal.isActive ? 'Active' : 'Inactive'
        };
      } catch (goalError) {
        console.warn('Error processing goal:', goal, goalError);
        return {
          title: goal.title || 'Untitled Goal',
          target: 0,
          current: 0,
          progress: 0,
          status: 'Error'
        };
      }
    }) : [];

    res.json({
      message: 'Comprehensive report generated successfully',
      data: {
        salesSummary,
        agentPerformance,
        clientAnalytics,
        productPerformance,
        monthlyTrends,
        goalProgress
      }
    });

  } catch (error) {
    console.error('Generate comprehensive report error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      userRole: req.user?.role,
      query: req.query
    });
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      message: 'Failed to generate comprehensive report'
    });
  }
});

export default router;
