import express from 'express';
import { query, validationResult } from 'express-validator';
import { db } from '../config/database.js';
import { users, sales, clients, goals } from '../models/schema.js';
import { authenticateToken } from '../middleware/auth.js';
import { eq, and, desc, asc, gte, lte, sum, count, sql, inArray } from 'drizzle-orm';

const router = express.Router();

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

// Helper function to format user data consistently
const formatTeamMember = (member) => {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    first_name: member.firstName, // For backward compatibility
    last_name: member.lastName,   // For backward compatibility
    email: member.email,
    role: member.role,
    department: member.department,
    position: member.position,
    isActive: member.isActive,
    is_active: member.isActive,   // For backward compatibility
    deletedAt: member.deletedAt,
    deleted_at: member.deletedAt, // For backward compatibility
    hireDate: member.hireDate,
    hire_date: member.hireDate,   // For backward compatibility
    lastLogin: member.lastLogin,
    last_login: member.lastLogin, // For backward compatibility
    // Performance metrics from the database query
    totalSales: member.totalSales || 0,
    total_sales: member.totalSales || 0, // For backward compatibility
    totalSalesCount: member.totalSalesCount || 0,
    total_sales_count: member.totalSalesCount || 0, // For backward compatibility
    totalRevenue: member.totalRevenue || 0,
    total_revenue: member.totalRevenue || 0, // For backward compatibility
    totalCommission: member.totalCommission || 0,
    total_commission: member.totalCommission || 0, // For backward compatibility
    totalClients: member.totalClients || 0,
    total_clients: member.totalClients || 0, // For backward compatibility
    totalProspects: member.totalProspects || 0,
    total_prospects: member.totalProspects || 0, // For backward compatibility
    monthlySales: member.monthlySales || 0,
    monthly_sales: member.monthlySales || 0, // For backward compatibility
    monthlyCommission: member.monthlyCommission || 0,
    monthly_commission: member.monthlyCommission || 0, // For backward compatibility
    monthlyClients: member.monthlyClients || 0,
    monthly_clients: member.monthlyClients || 0, // For backward compatibility
    monthlyProspects: member.monthlyProspects || 0,
    monthly_prospects: member.monthlyProspects || 0 // For backward compatibility
  };
};

// GET / - Get team information
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let teamMembers = [];

    if (userRole === 'manager') {
      // Managers can see all team members (including suspended ones, but not deleted ones)
      teamMembers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        department: users.department,
        position: users.position,
        isActive: users.isActive,
        deletedAt: users.deletedAt,
        hireDate: users.hireDate,
        lastLogin: users.lastLogin
      })
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`) // Use raw SQL to avoid Drizzle ORM issues
      .orderBy(asc(users.firstName));
    } else {
      // Regular agents can only see themselves
      teamMembers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        department: users.department,
        position: users.position,
        isActive: users.isActive,
        hireDate: users.hireDate,
        lastLogin: users.lastLogin
      })
      .from(users)
      .where(eq(users.id, userId))
      .orderBy(asc(users.firstName));
    }

    // Format team members consistently
    const formattedMembers = teamMembers.map(member => ({
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      first_name: member.firstName,
      last_name: member.lastName,
      email: member.email,
      role: member.role,
      department: member.department,
      position: member.position,
      isActive: member.isActive,
      is_active: member.isActive,
      hireDate: member.hireDate,
      hire_date: member.hireDate,
      lastLogin: member.lastLogin,
      last_login: member.lastLogin
    }));

    res.json({
      message: 'Team information retrieved successfully',
      team: {
        totalMembers: formattedMembers.length,
        members: formattedMembers
      }
    });

  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /members - Get team members with metrics (optimized with JOINs)
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🔍 Fetching team members for user ${userId} with role ${userRole}`);

    let teamMembers = [];

    if (userRole === 'manager') {
      // Managers see all team members (excluding deleted users)
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      
      console.log(`🔍 Date parameters for query:`, {
        currentMonth: currentMonth.toISOString(),
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        monthStartType: typeof monthStart
      });
      
             // Get all team members first
       const allMembers = await db
         .select({
           id: users.id,
           firstName: users.firstName,
           lastName: users.lastName,
           email: users.email,
           role: users.role,
           department: users.department,
           position: users.position,
           hireDate: users.hireDate,
           lastLogin: users.lastLogin,
           isActive: users.isActive
         })
         .from(users)
         .where(sql`${users.deletedAt} IS NULL`)
         .orderBy(asc(users.firstName));

       // Get metrics for each member individually to ensure data isolation
       const membersWithMetrics = await Promise.all(
         allMembers.map(async (member) => {
           // Get sales metrics for this specific member
           const salesMetrics = await db
             .select({
               totalSales: sql`COUNT(DISTINCT ${sales.id})`,
               totalSalesCount: sql`COUNT(DISTINCT ${sales.id})`,
               totalRevenue: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`,
               totalCommission: sql`COALESCE(SUM(${sales.commissionAmount}), 0)`,
               monthlySales: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.premiumAmount} ELSE 0 END), 0)`,
               monthlySalesCount: sql`COUNT(DISTINCT CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.id} END)`,
               monthlyCommission: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.commissionAmount} ELSE 0 END), 0)`
             })
             .from(sales)
             .where(eq(sales.agentId, member.id));

           // Get client metrics for this specific member
           const clientMetrics = await db
             .select({
               totalClients: sql`COUNT(DISTINCT ${clients.id})`,
               totalProspects: sql`SUM(CASE WHEN ${clients.status} = 'prospect' THEN 1 ELSE 0 END)`,
               monthlyClients: sql`COUNT(DISTINCT CASE WHEN ${clients.createdAt} >= ${monthStart.toISOString().split('T')[0]} AND ${clients.createdAt} <= ${monthEnd.toISOString().split('T')[0]} THEN ${clients.id} END)`,
               monthlyProspects: sql`SUM(CASE WHEN ${clients.createdAt} >= ${monthStart.toISOString().split('T')[0]} AND ${clients.createdAt} <= ${monthEnd.toISOString().split('T')[0]} AND ${clients.status} = 'prospect' THEN 1 ELSE 0 END)`
             })
             .from(clients)
             .where(eq(clients.agentId, member.id));

           // Combine user data with their personal metrics
           return {
             ...member,
             ...salesMetrics[0],
             ...clientMetrics[0]
           };
         })
       );

      console.log(`🔍 Optimized query returned ${membersWithMetrics.length} members with metrics`);
      
             // Debug: Check if we're getting any data at all
       if (membersWithMetrics.length > 0) {
         console.log('🔍 Sample member data from query:', {
           id: membersWithMetrics[0].id,
           name: `${membersWithMetrics[0].firstName} ${membersWithMetrics[0].lastName}`,
           totalSales: membersWithMetrics[0].totalSales,
           totalRevenue: membersWithMetrics[0].totalRevenue,
           monthlySales: membersWithMetrics[0].monthlySales,
           monthlySalesCount: membersWithMetrics[0].monthlySalesCount,
           rawValues: {
             totalSales: membersWithMetrics[0].totalSales,
             totalRevenue: membersWithMetrics[0].totalRevenue,
             monthlySales: membersWithMetrics[0].monthlySales
           }
         });
         
         // Show that each member has their own isolated data
         console.log('🔍 Data isolation check - First 3 members:');
         membersWithMetrics.slice(0, 3).forEach((member, index) => {
           console.log(`  Member ${index + 1}: ${member.firstName} ${member.lastName}`);
           console.log(`    - Total Sales: ${member.totalSales}`);
           console.log(`    - Total Revenue: ${member.totalRevenue}`);
           console.log(`    - Monthly Sales: ${member.monthlySales}`);
         });
       } else {
         console.log('⚠️ No members returned from query - this might indicate a JOIN issue');
       }

      // Format the results
      teamMembers = membersWithMetrics.map(member => ({
        ...member,
        // Convert aggregated values to numbers
        totalSales: Number(member.totalSales),
        totalSalesCount: Number(member.totalSalesCount),
        totalRevenue: Number(member.totalRevenue),
        totalCommission: Number(member.totalCommission),
        monthlySales: Number(member.monthlySales),
        monthlySalesCount: Number(member.monthlySalesCount),
        monthlyCommission: Number(member.monthlyCommission),
        totalClients: Number(member.totalClients),
        totalProspects: Number(member.totalProspects),
        monthlyClients: Number(member.monthlyClients),
        monthlyProspects: Number(member.monthlyProspects)
      }));

      // Debug: Log the first member's metrics to see what we're getting
      if (teamMembers.length > 0) {
        console.log('🔍 First member metrics (after conversion):', {
          id: teamMembers[0].id,
          name: `${teamMembers[0].firstName} ${teamMembers[0].lastName}`,
          totalSales: teamMembers[0].totalSales,
          totalRevenue: teamMembers[0].totalRevenue,
          monthlySales: teamMembers[0].monthlySales,
          monthlySalesCount: teamMembers[0].monthlySalesCount
        });
      }



    } else {
      // Regular agents can only see their own data (optimized)
      const currentMonth = new Date();
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
      
      console.log(`🔍 Agent query date parameters:`, {
        currentMonth: currentMonth.toISOString(),
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        monthStartType: typeof monthStart
      });
      
      // OPTIMIZED: Single query for agent's own data
      const agentWithMetrics = await db
        .select({
          // User fields
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          department: users.department,
          position: users.position,
          hireDate: users.hireDate,
          lastLogin: users.lastLogin,
          isActive: users.isActive,
          // Sales metrics - using correct Drizzle field references
          totalSales: sql`COUNT(DISTINCT ${sales.id})`,
          totalSalesCount: sql`COUNT(DISTINCT ${sales.id})`,
          totalRevenue: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`,
          totalCommission: sql`COALESCE(SUM(${sales.commissionAmount}), 0)`,
          // Monthly sales metrics - use proper date range filtering
          monthlySales: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.premiumAmount} ELSE 0 END), 0)`,
          monthlySalesCount: sql`COUNT(DISTINCT CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.id} END)`,
          monthlyCommission: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.commissionAmount} ELSE 0 END), 0)`,
          // Client metrics
          totalClients: sql`COUNT(DISTINCT ${clients.id})`,
          totalProspects: sql`SUM(CASE WHEN ${clients.status} = 'prospect' THEN 1 ELSE 0 END)`,
          // Monthly client metrics - use proper date range filtering
          monthlyClients: sql`COUNT(DISTINCT CASE WHEN ${clients.createdAt} >= ${monthStart.toISOString().split('T')[0]} AND ${clients.createdAt} <= ${monthEnd.toISOString().split('T')[0]} THEN ${clients.id} END)`,
          monthlyProspects: sql`SUM(CASE WHEN ${clients.createdAt} >= ${monthStart.toISOString().split('T')[0]} AND ${clients.createdAt} <= ${monthEnd.toISOString().split('T')[0]} AND ${clients.status} = 'prospect' THEN 1 ELSE 0 END)`
        })
        .from(users)
        .leftJoin(sales, eq(users.id, sales.agentId))
        .leftJoin(clients, eq(users.id, clients.agentId))
        .where(eq(users.id, userId))
        .groupBy(users.id);

      if (agentWithMetrics.length > 0) {
        const member = agentWithMetrics[0];
        
        // Debug: Check agent data from query
        console.log('🔍 Agent data from query:', {
          id: member.id,
          name: `${member.firstName} ${member.lastName}`,
          totalSales: member.totalSales,
          totalRevenue: member.totalRevenue,
          monthlySales: member.monthlySales,
          monthlySalesCount: member.monthlySalesCount,
          rawValues: {
            totalSales: member.totalSales,
            totalRevenue: member.totalRevenue,
            monthlySales: member.monthlySales
          }
        });
        teamMembers = [{
          ...member,
          // Convert aggregated values to numbers
          totalSales: Number(member.totalSales),
          totalSalesCount: Number(member.totalSalesCount),
          totalRevenue: Number(member.totalRevenue),
          totalCommission: Number(member.totalCommission),
          monthlySales: Number(member.monthlySales),
          monthlySalesCount: Number(member.monthlySalesCount),
          monthlyCommission: Number(member.monthlyCommission),
          totalClients: Number(member.totalClients),
          totalProspects: Number(member.totalProspects),
          monthlyClients: Number(member.monthlyClients),
          monthlyProspects: Number(member.monthlyProspects)
        }];

        // Debug: Log the agent's metrics
        console.log('🔍 Agent metrics (after conversion):', {
          id: teamMembers[0].id,
          name: `${teamMembers[0].firstName} ${teamMembers[0].lastName}`,
          totalSales: teamMembers[0].totalSales,
          totalRevenue: teamMembers[0].totalRevenue,
          monthlySales: teamMembers[0].monthlySales,
          monthlySalesCount: teamMembers[0].monthlySalesCount
        });
      }
    }

    // Format members consistently
    const formattedMembers = teamMembers.map(formatTeamMember);
    
    console.log(`🔍 Returning ${formattedMembers.length} formatted team members`);

    res.json({
      message: 'Team members retrieved successfully',
      members: formattedMembers
    });

  } catch (error) {
    console.error('Get team members error:', error);
    
    // Log detailed error information for debugging
    if (error.cause) {
      console.error('Database error details:', {
        code: error.cause.code,
        message: error.cause.message,
        hint: error.cause.hint,
        position: error.cause.position
      });
    }
    
    // Check if it's a column not found error
    if (error.cause?.code === '42703') {
      console.error('❌ Column not found error - check database schema vs Drizzle field mapping');
      console.error('Query that failed:', error.query);
      console.error('Parameters:', error.params);
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching team members'
    });
  }
});

// GET /performance - Get team performance overview
router.get('/performance', authenticateToken, [
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

    let whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(sales.saleDate, new Date(startDate)));
    }
    if (endDate) {
      whereConditions.push(lte(sales.saleDate, new Date(endDate)));
    }

    // FIXED: Simplified and optimized performance query
    let performanceQuery;

    if (userRole === 'manager') {
      // Managers see all team performance
      performanceQuery = db.select({
        totalSales: count(sales.id),
        totalRevenue: sum(sales.premiumAmount),
        totalCommission: sum(sales.commissionAmount),
        totalClients: sql`0`, // Simplified for now - will add proper client counting later
        activeAgents: sql`(SELECT COUNT(*) FROM ${users} WHERE ${users.isActive} = true AND ${users.role} = 'agent' AND ${users.deletedAt} IS NULL)`
      })
      .from(sales)
      .innerJoin(users, and(
        eq(sales.agentId, users.id),
        eq(users.isActive, true),
        sql`${users.deletedAt} IS NULL` // Use raw SQL to avoid Drizzle ORM issues
      ))
      .where(and(...whereConditions));
    } else {
      // Regular agents see only their performance
      whereConditions.push(eq(sales.agentId, userId));
      performanceQuery = db.select({
        totalSales: count(sales.id),
        totalRevenue: sum(sales.premiumAmount),
        totalCommission: sum(sales.commissionAmount),
        totalClients: sql`0`, // Simplified for now - will add proper client counting later
        activeAgents: sql`1`
      })
      .from(sales)
      .where(and(...whereConditions));
    }

    const performance = await performanceQuery;
    const result = performance[0] || {
      totalSales: 0,
      totalRevenue: 0,
      totalCommission: 0,
      totalClients: 0,
      activeAgents: 0
    };

    // Format performance data consistently
    const formattedPerformance = {
      totalSales: safeDecimalToNumber(result.totalSales),
      total_sales: safeDecimalToNumber(result.totalSales), // For backward compatibility
      totalRevenue: safeDecimalToNumber(result.totalRevenue),
      total_revenue: safeDecimalToNumber(result.totalRevenue), // For backward compatibility
      totalCommission: safeDecimalToNumber(result.totalCommission),
      total_commission: safeDecimalToNumber(result.totalCommission), // For backward compatibility
      totalClients: safeDecimalToNumber(result.totalClients),
      total_clients: safeDecimalToNumber(result.totalClients), // For backward compatibility
      activeAgents: safeDecimalToNumber(result.activeAgents),
      active_agents: safeDecimalToNumber(result.activeAgents) // For backward compatibility
    };

    res.json({
      message: 'Team performance retrieved successfully',
      performance: formattedPerformance
    });

  } catch (error) {
    console.error('Get team performance error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /leaderboard - Get team leaderboard
router.get('/leaderboard', authenticateToken, [
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Valid period is required'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const { period = 'month', limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // FIXED: Optimized leaderboard query
    let leaderboardQuery = db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      department: users.department,
      totalSales: count(sales.id),
      totalRevenue: sum(sales.premiumAmount),
      totalCommission: sum(sales.commissionAmount),
      totalClients: sql`0` // Simplified for now - will add proper client counting later
    })
    .from(users)
    .leftJoin(sales, and(
      eq(users.id, sales.agentId),
      gte(sales.saleDate, startDate.toISOString())
    ))
    .where(and(
      sql`${users.deletedAt} IS NULL`, // Use raw SQL to avoid Drizzle ORM issues
      userRole === 'agent' ? eq(users.id, userId) : undefined
    ).filter(Boolean))
    .groupBy(users.id)
    .orderBy(desc(sum(sales.premiumAmount)))
    .limit(parseInt(limit));

    if (userRole === 'agent') {
      // Regular agents see only themselves
      leaderboardQuery = leaderboardQuery.where(eq(users.id, userId));
    }

    const leaderboard = await leaderboardQuery;

    // Format leaderboard consistently
    const formattedLeaderboard = leaderboard.map((member, index) => ({
      ...formatTeamMember(member),
      rank: index + 1,
      period: period
    }));

    res.json({
      message: 'Leaderboard retrieved successfully',
      period,
      leaderboard: formattedLeaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /stats - Get team statistics summary
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let stats = {};

    if (userRole === 'manager') {
      // Get overall team statistics
      const teamStats = await db.select({
        totalMembers: count(users.id),
        activeMembers: sql`SUM(CASE WHEN ${users.isActive} = true THEN 1 ELSE 0 END)`,
        managers: sql`SUM(CASE WHEN ${users.role} = 'manager' THEN 1 ELSE 0 END)`,
        agents: sql`SUM(CASE WHEN ${users.role} = 'agent' THEN 1 ELSE 0 END)`
      })
      .from(users)
      .where(sql`${users.deletedAt} IS NULL`); // Use raw SQL to avoid Drizzle ORM issues

      stats = {
        totalMembers: safeDecimalToNumber(teamStats[0]?.totalMembers),
        total_members: safeDecimalToNumber(teamStats[0]?.totalMembers),
        activeMembers: safeDecimalToNumber(teamStats[0]?.activeMembers),
        active_members: safeDecimalToNumber(teamStats[0]?.activeMembers),
        managers: safeDecimalToNumber(teamStats[0]?.managers),
        agents: safeDecimalToNumber(teamStats[0]?.agents)
      };
    } else {
      // Agents see limited stats
      stats = {
        totalMembers: 1,
        total_members: 1,
        activeMembers: 1,
        active_members: 1,
        managers: 0,
        agents: 1
      };
    }

    res.json({
      message: 'Team statistics retrieved successfully',
      stats
    });

  } catch (error) {
    console.error('Get team stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /top-agents - Get top 5 agents by monthly sales
router.get('/top-agents', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Only managers can access this endpoint
    if (userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Calculate current month start
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    // Get top 5 agents by monthly sales count and amount
    const topAgents = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      monthlySalesCount: count(sales.id),
      monthlySalesAmount: sum(sales.premiumAmount)
    })
    .from(users)
    .leftJoin(sales, and(
      eq(users.id, sales.agentId),
      gte(sales.saleDate, monthStart.toISOString())
    ))
    .where(and(
      sql`${users.deletedAt} IS NULL`, // Only non-deleted users
      eq(users.role, 'agent') // Only agents, not managers
    ))
    .groupBy(users.id)
    .orderBy(desc(count(sales.id))) // Order by sales count
    .limit(5);

    // Format the response
    const formattedAgents = topAgents.map(agent => ({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      salesCount: Number(agent.monthlySalesCount) || 0,
      salesAmount: Number(agent.monthlySalesAmount) || 0
    }));

    res.json({
      message: 'Top 5 agents retrieved successfully',
      agents: formattedAgents
    });

  } catch (error) {
    console.error('Get top agents error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /debug-sales - Debug endpoint to test sales calculations
router.get('/debug-sales', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Only managers can access this debug endpoint
    if (userRole !== 'manager') {
      return res.status(403).json({
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    }

    // Calculate current month start and end
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);
    
    console.log('🔍 Debug Sales - Date parameters:', {
      currentMonth: currentMonth.toISOString(),
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      monthStartDate: monthStart.toISOString().split('T')[0],
      monthEndDate: monthEnd.toISOString().split('T')[0]
    });

    // Test 1: Get raw sales data for all users
    const rawSalesData = await db
      .select({
        id: sales.id,
        agentId: sales.agentId,
        premiumAmount: sales.premiumAmount,
        saleDate: sales.saleDate,
        commissionAmount: sales.commissionAmount,
        status: sales.status
      })
      .from(sales)
      .orderBy(desc(sales.saleDate))
      .limit(20);

    // Test 2: Test the monthly calculation manually with proper date filtering
    const manualMonthlyCalculation = await db
      .select({
        totalSales: sql`COUNT(DISTINCT ${sales.id})`,
        totalRevenue: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`,
        monthlySales: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.premiumAmount} ELSE 0 END), 0)`,
        monthlySalesCount: sql`COUNT(DISTINCT CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.id} END)`,
        allSalesInMonth: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`
      })
      .from(sales);

    // Test 3: Check if there are any sales in the current month with proper date filtering
    const currentMonthSales = await db
      .select({
        count: sql`COUNT(*)`,
        total: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`,
        minDate: sql`MIN(${sales.saleDate})`,
        maxDate: sql`MAX(${sales.saleDate})`
      })
      .from(sales)
      .where(sql`${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]}`);

    // Test 4: Check the actual date values and premium amounts in the database
    const dateSample = await db
      .select({
        id: sales.id,
        saleDate: sales.saleDate,
        saleDateType: sql`TYPEOF(${sales.saleDate})`,
        premiumAmount: sales.premiumAmount,
        premiumAmountType: sql`TYPEOF(${sales.premiumAmount})`,
        agentId: sales.agentId
      })
      .from(sales)
      .limit(10);

         // Test 5: Check sales by agent to see distribution
     const salesByAgent = await db
       .select({
         agentId: sales.agentId,
         totalSales: sql`COUNT(DISTINCT ${sales.id})`,
         totalRevenue: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`,
         monthlySales: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.premiumAmount} ELSE 0 END), 0)`
       })
       .from(sales)
       .groupBy(sales.agentId)
       .orderBy(desc(sql`COALESCE(SUM(${sales.premiumAmount}), 0)`));

     // Test 6: Verify data isolation by checking individual agent data
     const individualAgentData = await Promise.all(
       [1, 2, 3].map(async (agentId) => {
         const agentSales = await db
           .select({
             agentId: sales.agentId,
             totalSales: sql`COUNT(DISTINCT ${sales.id})`,
             totalRevenue: sql`COALESCE(SUM(${sales.premiumAmount}), 0)`,
             monthlySales: sql`COALESCE(SUM(CASE WHEN ${sales.saleDate} >= ${monthStart.toISOString().split('T')[0]} AND ${sales.saleDate} <= ${monthEnd.toISOString().split('T')[0]} THEN ${sales.premiumAmount} ELSE 0 END), 0)`
           })
           .from(sales)
           .where(eq(sales.agentId, agentId));
         
         return {
           agentId,
           metrics: agentSales[0] || { totalSales: 0, totalRevenue: 0, monthlySales: 0 }
         };
       })
     );

    res.json({
      message: 'Debug sales data retrieved successfully',
      debug: {
        dateParameters: {
          currentMonth: currentMonth.toISOString(),
          monthStart: monthStart.toISOString(),
          monthEnd: monthEnd.toISOString(),
          monthStartDate: monthStart.toISOString().split('T')[0],
          monthEndDate: monthEnd.toISOString().split('T')[0]
        },
                 rawSalesData: rawSalesData,
         manualCalculation: manualMonthlyCalculation[0] || {},
         currentMonthSummary: currentMonthSales[0] || {},
         dateSample: dateSample,
         salesByAgent: salesByAgent,
         individualAgentData: individualAgentData
      }
    });

  } catch (error) {
    console.error('Debug sales error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

export default router;
