#!/usr/bin/env node

// Test script for sales CSV import functionality
const API_BASE = 'http://localhost:5000/api';
const fs = require('fs');

async function makeRequest(url, options = {}) {
  const fetch = (await import('node-fetch')).default;
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

async function testSalesCSVImport() {
  console.log('🧪 Testing Sales CSV Import...\n');
  
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
    
    if (loginResponse.data && loginResponse.data.access_token) {
      console.log('✅ Authentication successful');
      const token = loginResponse.data.access_token;
      
      // Test 2: Download template (test the template structure)
      console.log('\n📋 Test 2: Testing template structure...');
      const expectedHeaders = [
        'clientEmail',
        'productName', 
        'premiumAmount',
        'commissionAmount',
        'commissionRate',
        'saleDate',
        'policyNumber',
        'status',
        'notes'
      ];
      
      console.log('📊 Expected CSV headers:', expectedHeaders.join(', '));
      
      // Test 3: Test CSV import with FormData
      console.log('\n📋 Test 3: Testing CSV import...');
      
      // Read the test CSV file
      const csvContent = fs.readFileSync('./test-sales-import.csv', 'utf8');
      console.log('📄 Test CSV content:');
      console.log(csvContent);
      
      // Create FormData manually for Node.js
      const FormData = (await import('form-data')).default;
      const formData = new FormData();
      formData.append('file', fs.createReadStream('./test-sales-import.csv'), {
        filename: 'test-sales-import.csv',
        contentType: 'text/csv'
      });
      
      const importResponse = await fetch(`${API_BASE}/sales/bulk-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        },
        body: formData
      });
      
      const importData = await importResponse.json();
      console.log('📊 Import response:', JSON.stringify(importData, null, 2));
      
      if (importData.success) {
        console.log('✅ CSV import test successful!');
        console.log(`📊 Imported: ${importData.data?.imported_count || 0} sales`);
        if (importData.data?.errors && importData.data.errors.length > 0) {
          console.log(`⚠️  Errors: ${importData.data.errors.length}`);
          console.log('📋 Error details:', importData.data.errors);
        }
      } else {
        console.log('❌ CSV import test failed:', importData.error);
      }
      
    } else {
      console.log('❌ Authentication failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSalesCSVImport();
