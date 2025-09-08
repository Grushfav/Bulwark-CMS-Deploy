import express from 'express';
import { query, validationResult } from 'express-validator';
import { ActivityLogger } from '../utils/activityLogger.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireManager } from '../middleware/roleCheck.js';

const router = express.Router();

// GET /activity-logs - Get activity logs with filtering
router.get('/', authenticateToken, requireManager, [
  query('entityType').optional().isIn(['client', 'sale', 'reminder', 'goal']),
  query('entityId').optional().isInt({ min: 0 }),
  query('action').optional().isIn(['created', 'updated', 'deleted', 'imported', 'exported']),
  query('userId').optional().isInt({ min: 1 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('offset').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      entityType,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const logs = await ActivityLogger.getActivityLogs({
      entityType: entityType || null,
      entityId: entityId ? parseInt(entityId) : null,
      action: action || null,
      userId: userId ? parseInt(userId) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /activity-logs/stats - Get activity statistics
router.get('/stats', authenticateToken, requireManager, [
  query('entityType').optional().isIn(['client', 'sale', 'reminder', 'goal']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { entityType, startDate, endDate } = req.query;

    const stats = await ActivityLogger.getStats({
      entityType: entityType || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity statistics',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /activity-logs/export - Export activity logs to CSV
router.get('/export', authenticateToken, requireManager, [
  query('entityType').optional().isIn(['client', 'sale', 'reminder', 'goal']),
  query('action').optional().isIn(['created', 'updated', 'deleted', 'imported', 'exported']),
  query('userId').optional().isInt({ min: 1 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      entityType,
      action,
      userId,
      startDate,
      endDate
    } = req.query;

    const csvData = await ActivityLogger.exportLogs({
      entityType: entityType || null,
      action: action || null,
      userId: userId ? parseInt(userId) : null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activity_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.send(csvData);
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export activity logs',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
