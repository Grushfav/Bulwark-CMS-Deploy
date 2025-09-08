import { db } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyActivityLogsMigration() {
  try {
    console.log('🔄 Applying activity logs migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/create_activity_logs_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.execute(migrationSQL);
    
    console.log('✅ Activity logs migration applied successfully!');
    console.log('📋 Created table: activity_logs');
    console.log('📋 Created indexes: activity_user_idx, activity_entity_idx, activity_action_idx, activity_created_at_idx, activity_composite_idx');
    
  } catch (error) {
    console.error('❌ Failed to apply activity logs migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyActivityLogsMigration();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyActivityLogsMigration() {
  try {
    console.log('🔄 Applying activity logs migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/create_activity_logs_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.execute(migrationSQL);
    
    console.log('✅ Activity logs migration applied successfully!');
    console.log('📋 Created table: activity_logs');
    console.log('📋 Created indexes: activity_user_idx, activity_entity_idx, activity_action_idx, activity_created_at_idx, activity_composite_idx');
    
  } catch (error) {
    console.error('❌ Failed to apply activity logs migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyActivityLogsMigration();
