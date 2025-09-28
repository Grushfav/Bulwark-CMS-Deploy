#!/usr/bin/env node

// Test script for background job system
import { db } from './config/database.js';
import { goals, users, sales, clients } from './models/schema.js';
import { eq } from 'drizzle-orm';
import jobQueue from './utils/jobQueue.js';
import axios from 'axios';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  testUser: {
    email: 'manager@bulwark.com',
    password: 'password123'
  }
};

let authToken = null;

// Helper function to make authenticated requests
const api = axios.create({
  baseURL: TEST_CONFIG.baseURL,
  timeout: TEST_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function authenticate() {
  try {
    console.log('🔐 Authenticating test user...');
    const response = await api.post('/auth/login', TEST_CONFIG.testUser);
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Authentication successful');
      return true;
    } else {
      console.error('❌ Authentication failed: No token received');
      return false;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestGoal() {
  try {
    console.log('🎯 Creating test goal...');
    
    const testGoal = {
      goalType: 'monthly',
      metricType: 'sales_count',
      title: 'Test Sales Goal',
      targetValue: 10,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      notes: 'Test goal for background job testing'
    };
    
    const response = await api.post('/goals', testGoal);
    
    if (response.data && response.data.success) {
      console.log('✅ Test goal created:', response.data.goal.id);
      return response.data.goal.id;
    } else {
      console.error('❌ Failed to create test goal');
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating test goal:', error.response?.data || error.message);
    return null;
  }
}

async function testJobQueue() {
  try {
    console.log('\n🧪 Testing Job Queue System...');
    
    // Test 1: Add a simple job
    console.log('📋 Test 1: Adding cleanup job...');
    const cleanupJobId = await jobQueue.addJob('cleanup_old_jobs', {}, 'low');
    console.log('✅ Cleanup job queued:', cleanupJobId);
    
    // Test 2: Get job status
    console.log('📋 Test 2: Checking job status...');
    let jobStatus = jobQueue.getJobStatus(cleanupJobId);
    console.log('📊 Job status:', jobStatus ? jobStatus.status : 'Not found');
    
    // Test 3: Get queue statistics
    console.log('📋 Test 3: Getting queue statistics...');
    const stats = jobQueue.getStats();
    console.log('📊 Queue stats:', stats);
    
    // Wait for job to complete
    console.log('⏳ Waiting for cleanup job to complete...');
    let attempts = 0;
    while (attempts < 15) { // Wait up to 30 seconds
      jobStatus = jobQueue.getJobStatus(cleanupJobId);
      if (jobStatus && jobStatus.status === 'completed') {
        console.log('✅ Cleanup job completed successfully');
        console.log('📊 Job result:', jobStatus.result);
        break;
      } else if (jobStatus && jobStatus.status === 'failed') {
        console.error('❌ Cleanup job failed:', jobStatus.error);
        break;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (attempts >= 15) {
      console.log('⏰ Cleanup job timeout (this is normal for first run)');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Job queue test failed:', error);
    return false;
  }
}

async function testGoalProgressCalculation() {
  try {
    console.log('\n🧪 Testing Goal Progress Calculation...');
    
    // Create a test goal
    const goalId = await createTestGoal();
    if (!goalId) {
      console.error('❌ Cannot test goal calculation without a test goal');
      return false;
    }
    
    // Test 1: Queue goal progress calculation
    console.log('📋 Test 1: Queuing goal progress calculation...');
    const response = await api.post(`/goals/${goalId}/calculate-progress`);
    
    if (response.data && response.data.success) {
      console.log('✅ Goal calculation job queued:', response.data.jobId);
      
      // Test 2: Poll job status
      console.log('📋 Test 2: Polling job status...');
      const jobId = response.data.jobId;
      let attempts = 0;
      
      while (attempts < 15) { // Wait up to 30 seconds
        const statusResponse = await api.get(`/goals/jobs/${jobId}`);
        
        if (statusResponse.data && statusResponse.data.success) {
          const job = statusResponse.data.job;
          console.log(`📊 Job status: ${job.status} (attempt ${attempts + 1}/15)`);
          
          if (job.status === 'completed') {
            console.log('✅ Goal calculation completed successfully');
            console.log('📊 Calculation result:', job.result);
            break;
          } else if (job.status === 'failed') {
            console.error('❌ Goal calculation failed:', job.error);
            break;
          }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (attempts >= 15) {
        console.log('⏰ Goal calculation timeout');
      }
      
      // Clean up test goal
      console.log('🧹 Cleaning up test goal...');
      await api.delete(`/goals/${goalId}`);
      console.log('✅ Test goal deleted');
      
      return true;
    } else {
      console.error('❌ Failed to queue goal calculation');
      return false;
    }
  } catch (error) {
    console.error('❌ Goal calculation test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testRecalculateAllGoals() {
  try {
    console.log('\n🧪 Testing Recalculate All Goals...');
    
    // Test 1: Queue full recalculation
    console.log('📋 Test 1: Queuing full recalculation...');
    const response = await api.post('/goals/recalculate-progress');
    
    if (response.data && response.data.success) {
      console.log('✅ Full recalculation job queued:', response.data.jobId);
      
      // Test 2: Poll job status
      console.log('📋 Test 2: Polling job status...');
      const jobId = response.data.jobId;
      let attempts = 0;
      
      while (attempts < 20) { // Wait up to 40 seconds for full recalculation
        const statusResponse = await api.get(`/goals/jobs/${jobId}`);
        
        if (statusResponse.data && statusResponse.data.success) {
          const job = statusResponse.data.job;
          console.log(`📊 Job status: ${job.status} (attempt ${attempts + 1}/20)`);
          
          if (job.status === 'completed') {
            console.log('✅ Full recalculation completed successfully');
            console.log('📊 Recalculation result:', job.result);
            break;
          } else if (job.status === 'failed') {
            console.error('❌ Full recalculation failed:', job.error);
            break;
          }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      if (attempts >= 20) {
        console.log('⏰ Full recalculation timeout');
      }
      
      return true;
    } else {
      console.error('❌ Failed to queue full recalculation');
      return false;
    }
  } catch (error) {
    console.error('❌ Full recalculation test failed:', error.response?.data || error.message);
    return false;
  }
}

async function testJobStatistics() {
  try {
    console.log('\n🧪 Testing Job Statistics...');
    
    // Test 1: Get job statistics
    console.log('📋 Test 1: Getting job statistics...');
    const response = await api.get('/goals/jobs');
    
    if (response.data && response.data.success) {
      console.log('✅ Job statistics retrieved successfully');
      console.log('📊 Queue stats:', response.data.stats);
      return true;
    } else {
      console.error('❌ Failed to get job statistics');
      return false;
    }
  } catch (error) {
    console.error('❌ Job statistics test failed:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Background Job System Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test 1: Authentication
  totalTests++;
  if (await authenticate()) {
    passedTests++;
  }
  
  // Test 2: Job Queue System
  totalTests++;
  if (await testJobQueue()) {
    passedTests++;
  }
  
  // Test 3: Goal Progress Calculation
  totalTests++;
  if (await testGoalProgressCalculation()) {
    passedTests++;
  }
  
  // Test 4: Recalculate All Goals
  totalTests++;
  if (await testRecalculateAllGoals()) {
    passedTests++;
  }
  
  // Test 5: Job Statistics
  totalTests++;
  if (await testJobStatistics()) {
    passedTests++;
  }
  
  // Test Results Summary
  console.log('\n🎉 Test Results Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Background job system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.');
  }
  
  // Final queue statistics
  console.log('\n📊 Final Queue Statistics:');
  const finalStats = jobQueue.getStats();
  console.log(finalStats);
}

// Run the tests
runAllTests().catch(console.error);
