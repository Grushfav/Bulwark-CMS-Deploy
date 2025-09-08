// Cache invalidation utility for goal progress
// This module provides functions to invalidate goal caches when related data changes

// Cache invalidation events (can be extended for other caching systems)
const cacheInvalidationEvents = new Map();

// Register cache invalidation handler
export const registerCacheInvalidation = (eventType, handler) => {
  if (!cacheInvalidationEvents.has(eventType)) {
    cacheInvalidationEvents.set(eventType, []);
  }
  cacheInvalidationEvents.get(eventType).push(handler);
};

// Trigger cache invalidation event
export const triggerCacheInvalidation = async (eventType, data) => {
  const handlers = cacheInvalidationEvents.get(eventType);
  if (handlers) {
    console.log(`🔄 Triggering cache invalidation for ${eventType}:`, data);
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`❌ Cache invalidation error for ${eventType}:`, error);
      }
    }
  }
};

// Specific invalidation functions for goal-related data changes
export const invalidateGoalCacheOnSaleChange = async (agentId, changeType) => {
  console.log(`🎯 Invalidating goal cache for agent ${agentId} due to sale ${changeType}`);
  await triggerCacheInvalidation('goal_cache_invalidation', {
    agentId,
    changeType,
    affectedMetrics: ['sales_count', 'sales_amount', 'commission']
  });
};

export const invalidateGoalCacheOnClientChange = async (agentId, changeType) => {
  console.log(`👥 Invalidating goal cache for agent ${agentId} due to client ${changeType}`);
  await triggerCacheInvalidation('goal_cache_invalidation', {
    agentId,
    changeType,
    affectedMetrics: ['new_clients']
  });
};

// Utility function to determine affected metrics based on change type
export const getAffectedMetrics = (changeType) => {
  const metricMap = {
    'sale_added': ['sales_count', 'sales_amount', 'commission'],
    'sale_updated': ['sales_count', 'sales_amount', 'commission'],
    'sale_deleted': ['sales_count', 'sales_amount', 'commission'],
    'client_added': ['new_clients'],
    'client_updated': ['new_clients'],
    'client_deleted': ['new_clients']
  };
  
  return metricMap[changeType] || [];
};
