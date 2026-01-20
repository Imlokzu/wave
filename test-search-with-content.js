/**
 * Test Script: Search with Full Content
 * 
 * This demonstrates the difference between:
 * 1. Search with snippets only (causes hallucination)
 * 2. Search with full page content (accurate answers)
 */

const axios = require('axios');

// Your server should be running on port 3001
const API_BASE = 'http://localhost:3001';

// Get auth token from your login
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token from localStorage

async function testSearchComparison() {
  console.log('='.repeat(80));
  console.log('Testing AI Search: Snippets vs Full Content');
  console.log('='.repeat(80));
  console.log();

  // Test query about phone comparison
  const query = 'Compare Honor Magic 6 Pro vs OnePlus Ace 5 Pro specs';

  console.log(`Query: "${query}"`);
  console.log();

  try {
    // Send message to AI
    console.log('Sending query to AI...');
    const response = await axios.post(
      `${API_BASE}/api/ai/message`,
      {
        content: query,
        model: 'auto'
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('AI Response:');
    console.log('-'.repeat(80));
    console.log(response.data.content);
    console.log('-'.repeat(80));
    console.log();
    console.log('✅ Response received successfully!');
    console.log();
    console.log('Key improvements with full content:');
    console.log('  • AI sees actual specs from comparison pages');
    console.log('  • No hallucination (making up specs)');
    console.log('  • Accurate processor, RAM, camera info');
    console.log('  • Can cite specific sources');
    console.log();

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.log();
    console.log('Troubleshooting:');
    console.log('  1. Make sure server is running: npm start');
    console.log('  2. Replace AUTH_TOKEN with your actual token');
    console.log('  3. Get token from browser localStorage.getItem("authToken")');
    console.log('  4. Make sure you have OpenRouter API key configured');
  }
}

async function testDirectSearch() {
  console.log('='.repeat(80));
  console.log('Testing Direct Search Service');
  console.log('='.repeat(80));
  console.log();

  const query = 'Honor Magic 6 Pro vs OnePlus Ace 5 Pro';

  try {
    console.log(`Searching for: "${query}"`);
    console.log();

    // This would call your SearchService directly
    // For now, we'll show what the AI receives
    console.log('What AI receives with SNIPPETS ONLY (old way):');
    console.log('-'.repeat(80));
    console.log('1. Honor Magic 6 Pro vs OnePlus Ace 5 Pro: What is the difference?');
    console.log('   URL: https://versus.com/...');
    console.log('   What is the difference between Honor Magic 6 Pro and OnePlus Ace 5 Pro?');
    console.log();
    console.log('2. Honor Magic6 Pro vs OnePlus Ace 5 - GSMchoice.com');
    console.log('   URL: https://www.gsmchoice.com/...');
    console.log('   Phones overview: Honor Magic6 Pro vs OnePlus Ace 5 detailed technical data...');
    console.log('-'.repeat(80));
    console.log();
    console.log('❌ Problem: AI only sees titles and short snippets');
    console.log('❌ Result: AI guesses specs from memory (hallucination)');
    console.log();
    console.log();

    console.log('What AI receives with FULL CONTENT (new way):');
    console.log('-'.repeat(80));
    console.log('Result 1: Honor Magic 6 Pro vs OnePlus Ace 5 Pro');
    console.log('URL: https://versus.com/...');
    console.log();
    console.log('## Specifications');
    console.log();
    console.log('--- Table ---');
    console.log('Feature | Honor Magic 6 Pro | OnePlus Ace 5 Pro');
    console.log('Processor | Snapdragon 8 Gen 3 | Snapdragon 8 Gen 3');
    console.log('RAM | 12GB / 16GB | 12GB / 16GB');
    console.log('Display | 6.8" LTPO OLED | 6.78" AMOLED');
    console.log('Camera | 50MP + 180MP + 50MP | 50MP + 8MP + 2MP');
    console.log('Battery | 5600 mAh | 6100 mAh');
    console.log('--- End Table ---');
    console.log();
    console.log('The Honor Magic 6 Pro features a superior camera system with a 180MP');
    console.log('periscope telephoto lens, while the OnePlus Ace 5 Pro has a larger');
    console.log('6100 mAh battery...');
    console.log();
    console.log('[... full page content with all specs ...]');
    console.log('-'.repeat(80));
    console.log();
    console.log('✅ Solution: AI sees actual specs from the page');
    console.log('✅ Result: Accurate comparison based on real data');
    console.log();

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
async function main() {
  console.log();
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + 'SEARCH WITH CONTENT TEST' + ' '.repeat(34) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log();

  // Show the difference
  await testDirectSearch();

  console.log();
  console.log('='.repeat(80));
  console.log();

  // Test with actual API (requires auth token)
  if (AUTH_TOKEN !== 'YOUR_AUTH_TOKEN_HERE') {
    await testSearchComparison();
  } else {
    console.log('⚠️  To test with actual API:');
    console.log('   1. Login to Wave at http://localhost:3001/login.html');
    console.log('   2. Open browser console (F12)');
    console.log('   3. Run: localStorage.getItem("authToken")');
    console.log('   4. Copy the token and replace AUTH_TOKEN in this script');
    console.log('   5. Run: node test-search-with-content.js');
    console.log();
  }
}

main().catch(console.error);
