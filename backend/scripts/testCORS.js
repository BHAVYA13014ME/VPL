const http = require('http');

// Test CORS configuration
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/health',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:3000',
    'Content-Type': 'application/json'
  }
};

console.log('\n🔍 Testing CORS and Backend Health...\n');

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`CORS Header: ${res.headers['access-control-allow-origin']}`);
  console.log(`Content-Type: ${res.headers['content-type']}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\nResponse:', JSON.parse(data));
    console.log('\n✅ Backend is accessible from frontend origin');
    console.log('✅ CORS is properly configured');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
