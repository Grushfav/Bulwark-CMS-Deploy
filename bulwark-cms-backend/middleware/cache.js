import NodeCache from 'node-cache';

// Create cache instance with default 5-minute TTL
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Don't clone objects for better performance
});

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 * @param {function} keyGenerator - Function to generate cache key from req
 */
export const cacheMiddleware = (duration = 300, keyGenerator = null) => {
  return (req, res, next) => {
    // Skip cache in development if desired
    if (process.env.DISABLE_CACHE === 'true') {
      return next();
    }

    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req) 
      : `${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

    // Try to get cached response
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      console.log(`✅ Cache HIT: ${key}`);
      return res.json(cachedResponse);
    }

    console.log(`❌ Cache MISS: ${key}`);

    // Store original res.json
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, duration);
        console.log(`💾 Cached response: ${key} (TTL: ${duration}s)`);
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Pattern to match keys (supports wildcards)
 */
export const invalidateCache = (pattern) => {
  const keys = cache.keys();
  const invalidated = [];

  keys.forEach(key => {
    if (pattern === '*' || key.includes(pattern)) {
      cache.del(key);
      invalidated.push(key);
    }
  });

  console.log(`🗑️ Invalidated ${invalidated.length} cache entries matching: ${pattern}`);
  return invalidated;
};

/**
 * Invalidate cache for specific user
 * @param {number} userId - User ID
 */
export const invalidateUserCache = (userId) => {
  return invalidateCache(`:${userId}`);
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  cache.flushAll();
  console.log('🗑️ All cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
};

export default cache;
