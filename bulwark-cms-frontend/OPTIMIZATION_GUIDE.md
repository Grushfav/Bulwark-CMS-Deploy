# Bulwark CMS Performance Optimization Guide

## Overview
This guide documents all performance optimizations implemented and recommended for the Bulwark CMS application.

---

## ✅ Already Implemented Optimizations

### 1. **Reduced Auto-Fetching**
- **GoalsTracking**: Removed auto-recalculation on page load
- **Reports**: Changed to manual report generation (click "Generate" button)
- **Dashboard**: Only fetches on user ID or view mode change
- **GoalsContext**: Fixed infinite loop by removing `fetchGoals` from dependencies

### 2. **Rate Limiting Bypass for Development**
- Goals and Reports endpoints skip rate limiting in `NODE_ENV=development`
- Prevents 429 errors during active development

### 3. **Backend File Proxying**
- Preview/Download proxy B2 files through backend to avoid CORS
- Reduces direct browser-to-B2 requests

---

## 🚀 High-Impact Optimizations to Implement

### 1. **React Query / TanStack Query** ⭐⭐⭐⭐⭐

**Impact**: 70-90% reduction in API calls

**Installation**:
```bash
cd bulwark-cms-frontend
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

**Setup** (`main.jsx`):
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

**Usage Example**:
```jsx
// Replace this:
const fetchGoals = async () => {
  const response = await goalsAPI.getGoals();
  setGoals(response.data);
};

// With this:
const { data: goals, isLoading, refetch } = useQuery({
  queryKey: ['goals', user?.id],
  queryFn: () => goalsAPI.getGoals({ agent_id: user?.id }),
  staleTime: 5 * 60 * 1000,
  enabled: !!user?.id
});
```

**Benefits**:
- Automatic caching
- Background refetching
- Deduplication
- Optimistic updates
- Pagination support

---

### 2. **Backend Response Caching with node-cache** ⭐⭐⭐⭐

**Impact**: 50-70% reduction in database queries

**Installation**:
```bash
cd bulwark-cms-backend
pnpm add node-cache
```

**Implementation**: Already created `middleware/cache.js`

**Apply to routes**:
```javascript
import { cacheMiddleware } from '../middleware/cache.js';

// Cache goals for 5 minutes
router.get('/', authenticateToken, cacheMiddleware(300), async (req, res) => {
  // ... existing code
});

// Cache reports for 10 minutes
router.get('/comprehensive', authenticateToken, cacheMiddleware(600), async (req, res) => {
  // ... existing code
});
```

**Cache Invalidation**:
```javascript
// In sales.js after creating a sale:
import { invalidateUserCache } from '../middleware/cache.js';

await db.insert(sales).values(newSale);
invalidateUserCache(agentId); // Clear this user's cached data
```

---

### 3. **Request Debouncing for Search/Filters** ⭐⭐⭐⭐

**Impact**: 60-80% reduction in search API calls

**Already Created**: `hooks/useDebounce.js`

**Apply to search inputs**:
```jsx
import { useDebounce } from '@/hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 500); // 500ms delay

useEffect(() => {
  if (debouncedSearch) {
    fetchClients({ search: debouncedSearch });
  }
}, [debouncedSearch]); // Only triggers after user stops typing
```

---

### 4. **Lazy Loading & Code Splitting** ⭐⭐⭐⭐

**Impact**: 40-60% reduction in initial bundle size

**Implementation**:
```jsx
// App.jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Reports = lazy(() => import('./components/Reports'));
const GoalsTracking = lazy(() => import('./components/GoalsTracking'));

<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/reports" element={<Reports />} />
  </Routes>
</Suspense>
```

---

### 5. **Implement Infinite Scroll / Virtual Scrolling** ⭐⭐⭐⭐

**Impact**: 80-90% reduction in data transferred for large lists

**Installation**:
```bash
pnpm add @tanstack/react-virtual
```

**Example**:
```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: clients.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50, // Row height
  overscan: 5
});

// Only render visible rows
{rowVirtualizer.getVirtualItems().map((virtualRow) => {
  const client = clients[virtualRow.index];
  return <ClientRow key={client.id} client={client} />;
})}
```

---

### 6. **Add Redis for Backend Caching** ⭐⭐⭐⭐⭐ (Production)

**Impact**: 80-95% reduction in database queries

**Installation**:
```bash
pnpm add redis ioredis
```

**Implementation**:
```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Cache wrapper
const getCachedOrFetch = async (key, fetchFn, ttl = 300) => {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const data = await fetchFn();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
};

// Usage in routes
const goals = await getCachedOrFetch(
  `goals:${userId}`,
  () => db.select().from(goals).where(eq(goals.agentId, userId)),
  300 // 5 minutes
);
```

---

### 7. **Optimize Database Queries** ⭐⭐⭐⭐

**A. Add Database Indexes** (if not already present):
```sql
-- Already have most of these, but verify:
CREATE INDEX IF NOT EXISTS idx_content_author_public ON content(author_id, is_public);
CREATE INDEX IF NOT EXISTS idx_sales_agent_date ON sales(agent_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_goals_agent_active ON goals(agent_id, is_active);
```

**B. Use SELECT only needed fields**:
```javascript
// Instead of:
const users = await db.select().from(users);

// Do this:
const users = await db.select({
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName
}).from(users);
```

**C. Batch queries with Promise.all**:
```javascript
// Already doing this in some places - apply everywhere:
const [sales, clients, goals] = await Promise.all([
  salesAPI.getSales(),
  clientsAPI.getClients(),
  goalsAPI.getGoals()
]);
```

---

### 8. **Implement Service Worker Caching** ⭐⭐⭐

**Impact**: Instant page loads on repeat visits

**Already have**: `sw-register.js` - just needs configuration

**Update** `vite.config.js`:
```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.backblazeb2\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'b2-files-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: /\/api\/(goals|clients|sales)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ]
});
```

---

### 9. **Memoization with useMemo/useCallback** ⭐⭐⭐

**Impact**: 30-50% reduction in unnecessary re-renders

**Apply throughout**:
```jsx
// Expensive calculations
const sortedGoals = useMemo(() => {
  return goals.sort((a, b) => b.currentValue - a.currentValue);
}, [goals]);

// Callback functions
const handleCreateGoal = useCallback(async (data) => {
  await createGoal(data);
}, [createGoal]);

// Filtered data
const activeGoals = useMemo(() => {
  return goals.filter(g => g.isActive);
}, [goals]);
```

---

### 10. **WebSocket for Real-Time Updates** ⭐⭐⭐⭐ (Advanced)

**Impact**: Eliminates polling, reduces API calls by 90% for real-time data

**Installation**:
```bash
# Backend
pnpm add socket.io

# Frontend
pnpm add socket.io-client
```

**Backend** (`server.js`):
```javascript
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
  });
});

// Emit updates when data changes
export const notifyDataUpdate = (userId, type, data) => {
  io.to(`user:${userId}`).emit(type, data);
};
```

**Frontend**:
```jsx
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

useEffect(() => {
  socket.emit('join', user.id);
  
  socket.on('goal-updated', (goal) => {
    setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
  });
  
  return () => socket.disconnect();
}, [user?.id]);
```

---

### 11. **Implement ETags for Conditional Requests** ⭐⭐⭐

**Impact**: 40-60% reduction in data transfer

**Installation**:
```bash
pnpm add etag
```

**Backend**:
```javascript
import etag from 'etag';

router.get('/goals', authenticateToken, async (req, res) => {
  const goals = await db.select().from(goals);
  const data = JSON.stringify(goals);
  const etagValue = etag(data);
  
  // Check if client has cached version
  if (req.headers['if-none-match'] === etagValue) {
    return res.status(304).send(); // Not Modified
  }
  
  res.setHeader('ETag', etagValue);
  res.setHeader('Cache-Control', 'max-age=300'); // 5 minutes
  res.json(goals);
});
```

---

### 12. **Frontend State Management Optimization** ⭐⭐⭐

**A. Use Zustand instead of Context for complex state**:
```bash
pnpm add zustand
```

```javascript
import create from 'zustand';
import { persist } from 'zustand/middleware';

export const useGoalsStore = create(
  persist(
    (set, get) => ({
      goals: [],
      fetchGoals: async () => {
        const response = await goalsAPI.getGoals();
        set({ goals: response.data });
      },
      addGoal: (goal) => set(state => ({ 
        goals: [...state.goals, goal] 
      }))
    }),
    { name: 'goals-storage' } // Persist to localStorage
  )
);
```

**B. Implement optimistic updates**:
```javascript
const createGoal = async (goalData) => {
  // Immediately update UI
  const tempId = Date.now();
  const optimisticGoal = { ...goalData, id: tempId };
  setGoals(prev => [...prev, optimisticGoal]);
  
  try {
    const response = await goalsAPI.createGoal(goalData);
    // Replace temp with real
    setGoals(prev => prev.map(g => g.id === tempId ? response.data : g));
  } catch (error) {
    // Rollback on error
    setGoals(prev => prev.filter(g => g.id !== tempId));
    throw error;
  }
};
```

---

### 13. **Database Connection Pooling** ⭐⭐⭐⭐

**Current**: `config/database.js` already has `max: 10`

**Optimization**:
```javascript
const client = postgres(connectionString, {
  max: 20, // Increase for production
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
  // Add prepared statements for frequently-used queries
  prepare: true,
  // Enable transform for better JSON handling
  transform: {
    undefined: null
  }
});
```

---

### 14. **Compress API Responses** ⭐⭐⭐

**Already enabled**: `compression` middleware in `server.js`

**Verify it's working**:
- Check response headers for `Content-Encoding: gzip`
- Can reduce payload size by 70-90%

---

### 15. **Implement GraphQL (Advanced)** ⭐⭐⭐⭐⭐

**Impact**: Request exactly what you need, reduce over-fetching by 80%

**Installation**:
```bash
pnpm add @apollo/server @apollo/client graphql
```

**Benefits**:
- Single endpoint
- Fetch related data in one request
- No over-fetching
- Built-in caching

---

### 16. **Background Job Queue** ⭐⭐⭐⭐

**Already Implemented**: `utils/jobQueue.js`

**Current Usage**: Goal recalculation

**Expand to**:
- Bulk imports
- Report generation
- Email notifications
- File processing

---

### 17. **Static Asset Optimization** ⭐⭐⭐

**A. Image Optimization**:
```bash
pnpm add vite-plugin-imagemin
```

**B. Bundle Analysis**:
```bash
pnpm add rollup-plugin-visualizer

# In vite.config.js
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({ open: true })
]

# Run build to see bundle size
pnpm build
```

**C. Tree Shaking**: Ensure imports are specific
```javascript
// Bad
import * as icons from 'lucide-react';

// Good
import { TrendingUp, Users } from 'lucide-react';
```

---

### 18. **API Request Batching** ⭐⭐⭐

**Implementation**:
```javascript
// Frontend utility
class RequestBatcher {
  constructor(batchDelay = 50) {
    this.queue = [];
    this.batchDelay = batchDelay;
    this.timeout = null;
  }

  add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push({ request, resolve, reject });
      
      if (this.timeout) clearTimeout(this.timeout);
      
      this.timeout = setTimeout(() => {
        this.flush();
      }, this.batchDelay);
    });
  }

  async flush() {
    const batch = [...this.queue];
    this.queue = [];
    
    try {
      const results = await Promise.all(
        batch.map(({ request }) => request())
      );
      
      batch.forEach(({ resolve }, i) => resolve(results[i]));
    } catch (error) {
      batch.forEach(({ reject }) => reject(error));
    }
  }
}

export const batcher = new RequestBatcher();
```

---

### 19. **Database Query Optimization** ⭐⭐⭐⭐

**A. Add composite indexes**:
```sql
-- For frequently-filtered queries
CREATE INDEX idx_content_author_public_type ON content(author_id, is_public, content_type);
CREATE INDEX idx_sales_agent_date_status ON sales(agent_id, sale_date, status);
```

**B. Use query planning**:
```javascript
// In Drizzle Studio or psql:
EXPLAIN ANALYZE SELECT * FROM goals WHERE agent_id = 1 AND is_active = true;
```

**C. Avoid N+1 queries**:
```javascript
// Bad - N+1 queries
for (const goal of goals) {
  const agent = await db.select().from(users).where(eq(users.id, goal.agentId));
}

// Good - Single join
const goalsWithAgents = await db.select()
  .from(goals)
  .leftJoin(users, eq(goals.agentId, users.id));
```

---

### 20. **Frontend Performance Monitoring** ⭐⭐⭐

**Installation**:
```bash
pnpm add web-vitals
```

**Implementation** (`main.jsx`):
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

---

## 📊 Recommended Implementation Priority

### Phase 1 (Immediate - Low Effort, High Impact):
1. ✅ Fix useEffect dependencies (DONE)
2. ✅ Add debouncing to search inputs (Hook created)
3. ✅ Backend caching middleware (Created)
4. Apply caching to routes
5. Add debouncing to filters

### Phase 2 (Short Term - Medium Effort, High Impact):
1. Implement React Query
2. Add lazy loading for routes
3. Implement optimistic updates
4. Add Redis caching (production)

### Phase 3 (Long Term - High Effort, Very High Impact):
1. Implement WebSockets for real-time updates
2. Add virtual scrolling for large lists
3. Consider GraphQL migration
4. Implement CDN for static assets

---

## 🔧 Quick Wins You Can Implement Now

### Apply node-cache to expensive routes:

**1. Goals routes** (already created `middleware/cache.js`):
```javascript
// routes/goals.js
import { cacheMiddleware, invalidateUserCache } from '../middleware/cache.js';

router.get('/', authenticateToken, cacheMiddleware(300), async (req, res) => {
  // Cache for 5 minutes
});

// Invalidate after create/update/delete
router.post('/', authenticateToken, async (req, res) => {
  const newGoal = await createGoal();
  invalidateUserCache(req.user.id);
  res.json(newGoal);
});
```

**2. Add debouncing to search**:
```javascript
// In any search component
const debouncedSearch = useDebounce(searchTerm, 500);
```

**3. Lazy load heavy components**:
```javascript
const Reports = lazy(() => import('./components/Reports'));
```

---

## 📈 Expected Performance Improvements

| Optimization | API Call Reduction | Page Load Improvement |
|--------------|-------------------|----------------------|
| Fix useEffect deps | 60-80% | - |
| React Query | 70-90% | 40-60% |
| Backend caching | 50-70% | 30-50% |
| Debouncing | 60-80% | - |
| Lazy loading | - | 40-60% |
| Virtual scrolling | - | 70-90% (large lists) |
| Redis | 80-95% | 50-70% |
| WebSockets | 90-95% | - |

---

## 🎯 Monitoring & Measuring

**Add performance logging**:
```javascript
// Frontend - measure API call time
const startTime = performance.now();
const response = await api.get('/goals');
console.log(`Goals API took ${performance.now() - startTime}ms`);

// Backend - already have this in server.js
// Logs: "📊 GET /api/goals - 200 (404ms)"
```

**Track API call count**:
```javascript
// Frontend interceptor
let apiCallCount = 0;
api.interceptors.request.use(config => {
  apiCallCount++;
  console.log(`API Call #${apiCallCount}: ${config.url}`);
  return config;
});
```

---

## 💡 Best Practices Going Forward

1. **Always use React Query** for data fetching (prevents most issues)
2. **Cache aggressively** on backend (5-10 minutes for read-heavy data)
3. **Debounce user inputs** (search, filters, etc.)
4. **Lazy load routes** and heavy components
5. **Batch API calls** when fetching related data
6. **Monitor performance** regularly with web-vitals
7. **Use indexes** for all filtered/joined database columns
8. **Implement pagination** for all lists (already have this)
9. **Add loading states** to prevent duplicate requests
10. **Use optimistic updates** for better UX

---

Would you like me to implement any of these optimizations now?
