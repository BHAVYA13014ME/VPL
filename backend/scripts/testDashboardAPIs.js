// Test script to verify dashboard APIs work
const axios = require('axios');

async function testDashboardAPIs() {
  console.log('\n🧪 Testing Dashboard APIs\n');
  console.log('='.repeat(50));
  
  // First login to get a token
  try {
    console.log('\n1️⃣  Testing Admin Login...');
    const loginRes = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@email.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.data.token;
    console.log('✅ Login successful! Token received.');
    
    // Test Admin Dashboard
    console.log('\n2️⃣  Testing Admin Dashboard API...');
    const adminRes = await axios.get('http://localhost:5001/api/dashboard/admin', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Admin Dashboard Response:');
    console.log('   Stats:', JSON.stringify(adminRes.data.data.stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  // Test Teacher Dashboard  
  try {
    console.log('\n3️⃣  Testing Teacher Login...');
    const teacherLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'bhavya@gmail.com',
      password: 'admin123'
    });
    
    const teacherToken = teacherLogin.data.data.token;
    console.log('✅ Teacher login successful!');
    
    console.log('\n4️⃣  Testing Teacher Dashboard API...');
    const teacherRes = await axios.get('http://localhost:5001/api/dashboard/teacher', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    console.log('✅ Teacher Dashboard Response:');
    console.log('   Stats:', JSON.stringify(teacherRes.data.data.stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  // Test Student Dashboard
  try {
    console.log('\n5️⃣  Testing Student Login...');
    const studentLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'kenil@gmail.com',
      password: 'admin123'
    });
    
    const studentToken = studentLogin.data.data.token;
    console.log('✅ Student login successful!');
    
    console.log('\n6️⃣  Testing Student Dashboard API...');
    const studentRes = await axios.get('http://localhost:5001/api/dashboard/student', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    console.log('✅ Student Dashboard Response:');
    console.log('   Stats:', JSON.stringify(studentRes.data.data.stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Dashboard API Tests Complete!\n');
}

testDashboardAPIs();
