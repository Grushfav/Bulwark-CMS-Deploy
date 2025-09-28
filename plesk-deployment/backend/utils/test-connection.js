import { testConnection, closeConnection } from '../config/database.js';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection test successful!');
      console.log('🚀 Backend is ready to run');
    } else {
      console.log('❌ Database connection test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Database connection test error:', error);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

// Run the test
testDatabaseConnection();
