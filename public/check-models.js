// ============================================
// Wave AI Models Diagnostic Script
// Run this in browser console on settings page
// ============================================

console.log('🔍 Wave AI Models Diagnostic\n');
console.log('=' .repeat(50));

// 1. Check Authentication
console.log('\n📝 1. AUTHENTICATION STATUS');
console.log('-'.repeat(50));
const authToken = localStorage.getItem('authToken');
const userId = localStorage.getItem('userId');
const username = localStorage.getItem('username');

console.log('Auth Token:', authToken ? '✅ Present (' + authToken.substring(0, 20) + '...)' : '❌ Missing');
console.log('User ID:', userId || '❌ Missing');
console.log('Username:', username || '❌ Missing');

// 2. Test API Connection
console.log('\n🌐 2. API CONNECTION TEST');
console.log('-'.repeat(50));

async function testAPI() {
  try {
    const response = await fetch('/api/settings', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('Status Code:', response.status);
    console.log('Status Text:', response.ok ? '✅ OK' : '❌ Error');
    
    if (!response.ok) {
      if (response.status === 401) {
        console.log('❌ Authentication required. Please login.');
        console.log('\n💡 SOLUTION: Run login script or go to /login.html');
      } else if (response.status === 404) {
        console.log('❌ API endpoint not found. Is backend running?');
        console.log('💡 SOLUTION: Start backend with `npm start`');
      }
      return null;
    }
    
    const data = await response.json();
    console.log('✅ API Response:', data);
    return data;
  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.log('💡 SOLUTION: Check if backend is running on port 3001');
    return null;
  }
}

// 3. Check Models
console.log('\n🤖 3. AI MODELS CHECK');
console.log('-'.repeat(50));

async function checkModels() {
  const data = await testAPI();
  
  if (!data) {
    console.log('\n❌ Cannot check models - API not accessible');
    return;
  }
  
  const models = data.data?.allModels || data.data?.availableModels || [];
  console.log('Total Models:', models.length);
  
  if (models.length === 0) {
    console.log('❌ No models returned from API');
    console.log('💡 SOLUTION: Restart backend server');
    return;
  }
  
  console.log('\n📋 AVAILABLE MODELS:');
  models.forEach((model, i) => {
    const lockStatus = model.locked ? '🔒 LOCKED' : '🔓 UNLOCKED';
    console.log(`  ${i+1}. ${model.name} (${model.id}) - ${model.tier.toUpperCase()} ${lockStatus}`);
  });
  
  // Check if we have NVIDIA models
  const nvidiaModels = models.filter(m => 
    ['step-3.5-flash', 'glm5', 'qwen3.5-vl', 'kimi-k2.5'].includes(m.id)
  );
  
  console.log('\n✅ NVIDIA MODELS PRESENT:', nvidiaModels.length === 4 ? 'YES (4/4)' : `NO (only ${nvidiaModels.length}/4)`);
  
  if (nvidiaModels.length !== 4) {
    console.log('💡 SOLUTION: Restart backend to load new AIModelConfig.ts');
  }
  
  // Check for old Wave models
  const oldWaveModels = models.filter(m => m.id.startsWith('wave-'));
  if (oldWaveModels.length > 0) {
    console.log('\n⚠️  WARNING: Old Wave models still present:', oldWaveModels.length);
    console.log('💡 SOLUTION: Update AIModelConfig.ts and restart backend');
  }
}

// 4. Check Preferred Model
console.log('\n⚙️  4. PREFERRED MODEL');
console.log('-'.repeat(50));
const preferredModel = localStorage.getItem('preferredAIModel');
console.log('Saved Model:', preferredModel || 'auto (default)');

// Migration check
const oldModelIds = ['wave-flash-1', 'wave-flash-2', 'wave-1', 'wave-2', 'wave-o1', 'wave-o2'];
if (oldModelIds.includes(preferredModel)) {
  console.log('⚠️  Old model ID detected - will be migrated on page load');
}

// 5. Backend Status
console.log('\n🖥️  5. BACKEND STATUS');
console.log('-'.repeat(50));
console.log('Backend URL: http://localhost:3001');
console.log('Check console for any 404/500 errors above');

// Run checks
console.log('\n' + '='.repeat(50));
console.log('🚀 RUNNING DIAGNOSTICS...\n');
checkModels();

// Helper: Quick Login Function
window.quickLogin = function(username, password) {
  console.log('\n🔐 Attempting login...');
  fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(r => r.json())
  .then(data => {
    if (data.token) {
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userId', data.user?.id);
      localStorage.setItem('username', data.user?.username);
      console.log('✅ Login successful! Refresh page.');
      location.reload();
    } else {
      console.error('❌ Login failed:', data);
    }
  })
  .catch(e => console.error('❌ Login error:', e));
};

console.log('\n💡 TIP: Use quickLogin("youruser", "yourpass") to login from console');
