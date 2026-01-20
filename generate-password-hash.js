// Generate bcrypt hash for password
const bcrypt = require('bcrypt');

const password = 'ml120998';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('\nSQL to create/update user:');
  console.log(`
-- Create or update user lokzu2 with password ml120998
INSERT INTO flux_users (username, nickname, password_hash, is_admin, is_pro)
VALUES ('lokzu2', 'Lokzu', '${hash}', true, true)
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = '${hash}',
  is_admin = true,
  is_pro = true;

-- Verify
SELECT id, username, nickname, is_admin, is_pro, password_hash IS NOT NULL as has_password
FROM flux_users 
WHERE username = 'lokzu2';
  `);
});
