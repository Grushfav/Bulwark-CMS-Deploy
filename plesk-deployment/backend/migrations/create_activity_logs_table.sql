-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS activity_user_idx ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS activity_entity_idx ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS activity_action_idx ON activity_logs(action);
CREATE INDEX IF NOT EXISTS activity_created_at_idx ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS activity_composite_idx ON activity_logs(entity_type, action, created_at);
