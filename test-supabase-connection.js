// Test Supabase connection and check for user lokzu2
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n📡 Test 1: Testing connection...');
    const { data: tables, error: tablesError } = await supabase
      .from('flux_users')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Connection failed:', tablesError.message);
      return;
    }
    console.log('✅ Connection successful');

    // Test 2: Check if user lokzu2 exists
    console.log('\n👤 Test 2: Checking for user lokzu2...');
    const { data: user, error: userError } = await supabase
      .from('flux_users')
      .select('*')
      .eq('username', 'lokzu2')
      .single();

    if (userError) {
      console.error('❌ User not found:', userError.message);
      console.log('\n💡 You need to create the user. Run this SQL in Supabase:');
      console.log(`
INSERT INTO flux_users (username, nickname, password_hash, is_admin, is_pro)
VALUES (
  'lokzu2',
  'Lokzu',
  '$2b$10$YourHashedPasswordHere',
  true,
  true
);
      `);
      return;
    }

    console.log('✅ User found:');
    console.log('  - ID:', user.id);
    console.log('  - Username:', user.username);
    console.log('  - Nickname:', user.nickname);
    console.log('  - Is Admin:', user.is_admin);
    console.log('  - Is Pro:', user.is_pro);
    console.log('  - Has Password:', user.password_hash ? 'YES' : 'NO');
    console.log('  - Password Hash Length:', user.password_hash ? user.password_hash.length : 0);

    // Test 3: Try to hash the password and compare
    if (user.password_hash) {
      const bcrypt = require('bcrypt');
      const testPassword = 'ml120998';
      console.log('\n🔐 Test 3: Testing password...');
      const isValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log('  - Password "ml120998" is:', isValid ? '✅ VALID' : '❌ INVALID');
      
      if (!isValid) {
        console.log('\n💡 Password hash is incorrect. To reset password, run:');
        const newHash = await bcrypt.hash(testPassword, 10);
        console.log(`
UPDATE flux_users 
SET password_hash = '${newHash}'
WHERE username = 'lokzu2';
        `);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testConnection();
