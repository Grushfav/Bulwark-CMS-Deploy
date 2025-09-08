-- Performance optimization indexes for goal progress calculation
-- These indexes will significantly improve query performance for date range queries

-- Sales table indexes for goal progress calculation
-- Composite index for agent + date range queries (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_agent_date_composite 
ON sales(agent_id, sale_date);

-- Composite index for agent + status + date (for active sales filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_agent_status_date 
ON sales(agent_id, status, sale_date);

-- Clients table indexes for goal progress calculation
-- Composite index for agent + created_at (for new clients goals)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_agent_created_composite 
ON clients(agent_id, created_at);

-- Composite index for agent + status + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_agent_status_created 
ON clients(agent_id, status, created_at);

-- Goals table indexes for filtering and queries
-- Composite index for agent + active status (most common filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_agent_active_composite 
ON goals(agent_id, is_active);

-- Composite index for agent + goal_type + active (for filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_agent_type_active 
ON goals(agent_id, goal_type, is_active);

-- Composite index for agent + metric_type + active (for filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_agent_metric_active 
ON goals(agent_id, metric_type, is_active);

-- Date range index for goals (for date-based filtering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_date_range 
ON goals(start_date, end_date);

-- Partial index for active goals only (smaller, faster)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_active_only 
ON goals(agent_id, goal_type, metric_type) 
WHERE is_active = true;

-- Comments for documentation
COMMENT ON INDEX idx_sales_agent_date_composite IS 'Optimizes sales queries by agent and date range for goal progress calculation';
COMMENT ON INDEX idx_sales_agent_status_date IS 'Optimizes active sales queries by agent, status, and date';
COMMENT ON INDEX idx_clients_agent_created_composite IS 'Optimizes client creation queries by agent and date for new client goals';
COMMENT ON INDEX idx_clients_agent_status_created IS 'Optimizes client queries by agent, status, and creation date';
COMMENT ON INDEX idx_goals_agent_active_composite IS 'Optimizes goal queries by agent and active status';
COMMENT ON INDEX idx_goals_agent_type_active IS 'Optimizes goal filtering by agent, type, and active status';
COMMENT ON INDEX idx_goals_agent_metric_active IS 'Optimizes goal filtering by agent, metric, and active status';
COMMENT ON INDEX idx_goals_date_range IS 'Optimizes goal queries by date range';
COMMENT ON INDEX idx_goals_active_only IS 'Partial index for active goals only - smaller and faster';
