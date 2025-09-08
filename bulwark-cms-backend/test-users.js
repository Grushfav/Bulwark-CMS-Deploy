#!/usr/bin/env node

// Test script to check existing users
import { db } from './config/database.js';
import { users } from './models/schema.js';

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users...');
    
    const existingUsers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      isActive: users.isActive
    }).from(users);
    
    console.log(`📊 Found ${existingUsers.length} users:`);
    
    existingUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`);
    });
    
    if (existingUsers.length === 0) {
      console.log('❌ No users found. You may need to create a user first.');
    } else {
      console.log('\n✅ Users found. You can use any of these emails for testing.');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await db.$disconnect();
  }
}

checkUsers();
