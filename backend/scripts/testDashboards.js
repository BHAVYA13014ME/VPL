const http = require('http');

function makeRequest(path, method = 'GET', token = null, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testDashboard(role, email, password) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${role.toUpperCase()} Dashboard`);
  console.log('='.repeat(60));
  
  // Login
  const loginRes = await makeRequest('/auth/login', 'POST', null, { email, password });
  
  if (loginRes.status !== 200) {
    console.error(`❌ Login failed:`, loginRes.data);
    return;
  }
  
  const token = loginRes.data.data.token;
  console.log(`✅ Login successful for ${email}`);
  
  // Get Dashboard
  const dashboardRes = await makeRequest(`/dashboard/${role}`, 'GET', token);
  
  if (dashboardRes.status !== 200) {
    console.error(`❌ Dashboard failed:`, dashboardRes.data);
    return;
  }
  
  console.log(`✅ Dashboard data retrieved successfully\n`);
  console.log('Stats:', JSON.stringify(dashboardRes.data.data.stats, null, 2));
  
  if (role === 'student') {
    console.log('\nEnrolled Courses:', dashboardRes.data.data.enrolledCourses?.length || 0);
  }
  
  if (role === 'teacher' || role === 'student') {
    console.log('Recent Activity:', dashboardRes.data.data.recentActivity?.length || 0);
  }
}

async function runTests() {
  console.log('\n🧪 Testing All Dashboard APIs\n');
  
  try {
    await testDashboard('admin', 'admin@email.com', 'admin123');
    await testDashboard('teacher', 'bhavya@gmail.com', 'admin123');
    await testDashboard('student', 'kenil@gmail.com', 'admin123');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

runTests();
