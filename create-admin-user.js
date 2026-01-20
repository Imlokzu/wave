// Quick script to create an admin user with proper password hash
// Run with: node create-admin-user.js

const bcrypt = require('bcrypt');

async function createAdminUser() {
    const username = 'admin';
    const password = 'admin123'; // Change this!
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    console.log('\n=== Admin User Setup ===\n');
    console.log('Run this SQL in Supabase:\n');
    console.log(`-- Ensure is_admin column exists`);
    console.log(`ALTER TABLE flux_users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;\n`);
    console.log(`-- Create or update admin user`);
    console.log(`INSERT INTO flux_users (username, nickname, password_hash, is_admin, is_pro)`);
    console.log(`VALUES ('${username}', 'Admin', '${passwordHash}', TRUE, TRUE)`);
    console.log(`ON CONFLICT (username) DO UPDATE SET`);
    console.log(`    password_hash = '${passwordHash}',`);
    console.log(`    is_admin = TRUE,`);
    console.log(`    is_pro = TRUE;\n`);
    console.log('Then login with:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}\n`);
    console.log('IMPORTANT: Change the password after first login!\n');
}

createAdminUser().catch(console.error);
