#!/usr/bin/env node

// Create a test user for API testing
import { db } from './config/database.js';
import { users } from './models/schema.js';
import bcrypt from 'bcryptjs';

async function createTestUser() {
  try {
    console.log('👤 Creating test user for API testing...');
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('testpass123', saltRounds);
    
    // Create test user
    const testUser = await db.insert(users).values({
      email: 'testmanager@bulwark.com',
      passwordHash: passwordHash,
      firstName: 'Test',
      lastName: 'Manager',
      role: 'manager',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('✅ Test user created successfully:');
    console.log(`   Email: testmanager@bulwark.com`);
    console.log(`   Password: testpass123`);
    console.log(`   Role: manager`);
    console.log(`   ID: ${testUser[0].id}`);
    
  } catch (error) {
    if (error.message && error.message.includes('duplicate key')) {
      console.log('⚠️  Test user already exists');
    } else {
      console.error('❌ Error creating test user:', error);
    }
  }
}

createTestUser();
