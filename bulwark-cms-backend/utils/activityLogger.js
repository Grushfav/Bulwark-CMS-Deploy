import { db } from '../config/database.js';
import { activityLogs, users } from '../models/schema.js';
import { eq, desc, gte, lte, count } from 'drizzle-orm';

/**
 * Activity Logger Service
 * Tracks all important activities in the system for audit purposes
 */
class ActivityLogger {
  /**
   * Log client activity
   */
  static async logClientActivity(userId, action, entityId, details = null, oldValues = null, newValues = null, req = null) {
    try {
      await this.logActivity(userId, 'client', entityId, action, details, oldValues, newValues, req);
    } catch (error) {
      console.error('Error logging client activity:', error);
    }
  }

  /**
   * Log sale activity
   */
  static async logSaleActivity(userId, action, entityId, details = null, oldValues = null, newValues = null, req = null) {
    try {
      await this.logActivity(userId, 'sale', entityId, action, details, oldValues, newValues, req);
    } catch (error) {
      console.error('Error logging sale activity:', error);
    }
  }

  /**
   * Log reminder activity
   */
  static async logReminderActivity(userId, action, entityId, details = null, oldValues = null, newValues = null, req = null) {
    try {
      await this.logActivity(userId, 'reminder', entityId, action, details, oldValues, newValues, req);
    } catch (error) {
      console.error('Error logging reminder activity:', error);
    }
  }

  /**
   * Log goal activity
   */
  static async logGoalActivity(userId, action, entityId, details = null, oldValues = null, newValues = null, req = null) {
    try {
      await this.logActivity(userId, 'goal', entityId, action, details, oldValues, newValues, req);
    } catch (error) {
      console.error('Error logging goal activity:', error);
    }
  }

  /**
   * Log bulk operation
   */
  static async logBulkOperation(userId, entityType, action, details = null, req = null) {
    try {
      await this.logActivity(userId, entityType, null, action, details, null, null, req);
    } catch (error) {
      console.error('Error logging bulk operation:', error);
    }
  }

  /**
   * Core logging method
   */
  static async logActivity(userId, entityType, entityId, action, details = null, oldValues = null, newValues = null, req = null) {
    try {
      const logData = {
        userId: userId,
        entityType: entityType,
        entityId: entityId,
        action: action,
        details: details,
        oldValues: oldValues,
        newValues: newValues,
        ipAddress: req?.ip || null,
        userAgent: req?.headers['user-agent'] || null
      };

      await db.insert(activityLogs).values(logData);
    } catch (error) {
      console.error('Error inserting activity log:', error);
      throw error;
    }
  }

  /**
   * Get activity logs with filtering
   */
  static async getActivityLogs(filters = {}) {
    try {
      let query = db
        .select({
          id: activityLogs.id,
          userId: activityLogs.userId,
          entityType: activityLogs.entityType,
          entityId: activityLogs.entityId,
          action: activityLogs.action,
          details: activityLogs.details,
          oldValues: activityLogs.oldValues,
          newValues: activityLogs.newValues,
          ipAddress: activityLogs.ipAddress,
          userAgent: activityLogs.userAgent,
          createdAt: activityLogs.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          }
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id));

      // Apply filters
      if (filters.entityType) {
        query = query.where(eq(activityLogs.entityType, filters.entityType));
      }
      if (filters.entityId) {
        query = query.where(eq(activityLogs.entityId, filters.entityId));
      }
      if (filters.action) {
        query = query.where(eq(activityLogs.action, filters.action));
      }
      if (filters.userId) {
        query = query.where(eq(activityLogs.userId, filters.userId));
      }
      if (filters.startDate) {
        query = query.where(gte(activityLogs.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        query = query.where(lte(activityLogs.createdAt, filters.endDate));
      }

      // Apply ordering and pagination
      query = query.orderBy(desc(activityLogs.createdAt));
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      const logs = await query;
      return logs;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics
   */
  static async getStats(filters = {}) {
    try {
      let query = db
        .select({
          entityType: activityLogs.entityType,
          action: activityLogs.action,
          count: count()
        })
        .from(activityLogs)
        .groupBy(activityLogs.entityType, activityLogs.action);

      // Apply filters
      if (filters.entityType) {
        query = query.where(eq(activityLogs.entityType, filters.entityType));
      }
      if (filters.startDate) {
        query = query.where(gte(activityLogs.createdAt, filters.startDate));
      }
      if (filters.endDate) {
        query = query.where(lte(activityLogs.createdAt, filters.endDate));
      }

      const stats = await query;
      return stats;
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }

  /**
   * Export logs to CSV format
   */
  static async exportLogs(filters = {}) {
    try {
      const logs = await this.getActivityLogs(filters);
      
      // CSV headers
      const headers = [
        'ID',
        'Date',
        'User',
        'User Email',
        'User Role',
        'Entity Type',
        'Entity ID',
        'Action',
        'Details',
        'IP Address',
        'User Agent'
      ];

      // CSV rows
      const rows = logs.map(log => [
        log.id,
        log.createdAt.toISOString(),
        `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim(),
        log.user?.email || '',
        log.user?.role || '',
        log.entityType,
        log.entityId || '',
        log.action,
        log.details ? JSON.stringify(log.details) : '',
        log.ipAddress || '',
        log.userAgent || ''
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting logs:', error);
      throw error;
    }
  }
}

export { ActivityLogger };
