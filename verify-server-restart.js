// Verify the server has restarted and reports endpoint is available
const http = require('http');

console.log('\n=== Verifying Server Restart ===\n');

// Test 1: Check if server is running
console.log('Test 1: Checking if server is running on port 3001...');
const healthCheck = http.get('http://localhost:3001/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Server is running');
      console.log('   Response:', JSON.parse(data));
      
      // Test 2: Check if reports endpoint exists
      console.log('\nTest 2: Checking if /api/reports/bug endpoint exists...');
      const reportsCheck = http.get('http://localhost:3001/api/reports/bug', (res2) => {
        let data2 = '';
        res2.on('data', chunk => data2 += chunk);
        res2.on('end', () => {
          const response = JSON.parse(data2);
          
          if (res2.statusCode === 401 && response.code === 'NO_TOKEN') {
            console.log('✅ Reports endpoint EXISTS and requires authentication');
            console.log('   This is correct! The endpoint is working.');
            console.log('\n=== SUCCESS ===');
            console.log('The server has been restarted correctly.');
            console.log('Now login and try submitting a bug report!\n');
          } else if (response.code === 'NOT_FOUND') {
            console.log('❌ Reports endpoint NOT FOUND');
            console.log('   The server needs to be restarted.');
            console.log('\n=== ACTION REQUIRED ===');
            console.log('1. Stop the server (Ctrl+C)');
            console.log('2. Run: npm run dev');
            console.log('3. Run this script again\n');
          } else {
            console.log('⚠️  Unexpected response:', response);
          }
        });
      });
      
      reportsCheck.on('error', (err) => {
        console.log('❌ Error checking reports endpoint:', err.message);
      });
      
    } else {
      console.log('❌ Server returned status:', res.statusCode);
    }
  });
});

healthCheck.on('error', (err) => {
  console.log('❌ Server is not running on port 3001');
  console.log('   Error:', err.message);
  console.log('\n=== ACTION REQUIRED ===');
  console.log('Start the server with: npm run dev\n');
});
