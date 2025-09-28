#!/usr/bin/env node

// Simple API test for background jobs
const API_BASE = 'http://localhost:5000/api';

async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  const data = await response.json();
  return { data, status: response.status };
}

async function testAPI() {
  console.log('🧪 Testing Background Job API...\n');
  
  try {
    // Test 1: Login
    console.log('📋 Test 1: Authenticating...');
    const loginResponse = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        email: 'testmanager@bulwark.com',
        password: 'testpass123'
      })
    });
    
    console.log('📊 Login response:', loginResponse);
    
    if (loginResponse.data && loginResponse.data.access_token) {
      console.log('✅ Authentication successful');
      const token = loginResponse.data.access_token;
      
      // Test 2: Queue recalculation job
      console.log('\n📋 Test 2: Queuing recalculation job...');
      const recalculationResponse = await makeRequest(
        `${API_BASE}/goals/recalculate-progress`,
        {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('📊 Recalculation response:', recalculationResponse);
      
      if (recalculationResponse.data && recalculationResponse.data.success) {
        console.log('✅ Recalculation job queued:', recalculationResponse.data.jobId);
        
        // Test 3: Check job status
        console.log('\n📋 Test 3: Checking job status...');
        const jobId = recalculationResponse.data.jobId;
        
        // Poll job status a few times
        for (let i = 0; i < 5; i++) {
          const statusResponse = await makeRequest(
            `${API_BASE}/goals/jobs/${jobId}`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          
          if (statusResponse.data && statusResponse.data.success) {
            const job = statusResponse.data.job;
            console.log(`📊 Job status (${i + 1}/5): ${job.status}`);
            
            if (job.status === 'completed') {
              console.log('✅ Job completed successfully!');
              break;
            } else if (job.status === 'failed') {
              console.log('❌ Job failed:', job.error);
              break;
            }
          }
          
          // Wait 2 seconds before next check
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Test 4: Get job statistics
        console.log('\n📋 Test 4: Getting job statistics...');
        const statsResponse = await makeRequest(
          `${API_BASE}/goals/jobs`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        console.log('📊 Stats response:', statsResponse);
        
        if (statsResponse.data && statsResponse.data.success) {
          console.log('✅ Job statistics retrieved:', statsResponse.data.stats);
        } else {
          console.log('❌ Failed to get job statistics');
        }
        
      } else {
        console.log('❌ Failed to queue recalculation job');
      }
      
    } else {
      console.log('❌ Authentication failed');
    }
    
    console.log('\n🎉 API tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testAPI();
