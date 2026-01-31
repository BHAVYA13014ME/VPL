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

async function testAssignmentsAPI() {
  console.log('\n🧪 Testing Assignments API\n');
  
  // Login as admin
  const loginRes = await makeRequest('/auth/login', 'POST', null, {
    email: 'admin@email.com',
    password: 'admin123'
  });
  
  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes.data);
    return;
  }
  
  const token = loginRes.data.data.token;
  console.log('✅ Login successful\n');
  
  // Test GET /api/assignments (admin endpoint)
  console.log('Testing GET /api/assignments (admin)...');
  const assignRes = await makeRequest('/assignments', 'GET', token);
  
  if (assignRes.status === 200) {
    console.log('✅ Admin assignments endpoint working');
    console.log('Response structure:', Object.keys(assignRes.data));
    console.log('Data structure:', assignRes.data.data ? Object.keys(assignRes.data.data) : 'N/A');
    console.log('Assignments count:', assignRes.data.data?.assignments?.length || 0);
    console.log('Total:', assignRes.data.data?.total || 0);
    
    if (assignRes.data.data?.assignments?.length > 0) {
      console.log('\nFirst assignment:');
      console.log('- ID:', assignRes.data.data.assignments[0]._id);
      console.log('- Title:', assignRes.data.data.assignments[0].title);
      console.log('- Course:', assignRes.data.data.assignments[0].course?.title || 'N/A');
    }
  } else {
    console.error('❌ Admin assignments endpoint failed');
    console.error('Status:', assignRes.status);
    console.error('Response:', JSON.stringify(assignRes.data, null, 2));
  }
}

testAssignmentsAPI().catch(console.error);
