#!/usr/bin/env node

// Script to apply database indexes for goal performance optimization
import { db } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyIndexes() {
  try {
    console.log('🚀 Starting database index application...');
    
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_goal_performance_indexes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded from:', migrationPath);
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`);
        console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
        
        // Execute the SQL statement
        await db.execute(statement);
        
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
        
      } catch (error) {
        // Check if it's a "already exists" error (which is okay)
        if (error.message && error.message.includes('already exists')) {
          console.log(`⚠️  Index already exists (skipping): ${error.message}`);
          successCount++;
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log('\n🎉 Database index application completed!');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🚀 All indexes applied successfully! Performance should be improved.');
    } else {
      console.log('\n⚠️  Some indexes failed to apply. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error applying indexes:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.$disconnect();
  }
}

// Run the script
applyIndexes().catch(console.error);
