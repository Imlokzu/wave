# Wave Admin Panel

Admin panel for managing Wave messenger users and system.

## Features

- **Dashboard Statistics**: View total users, pro users, online users, and admin count
- **User Management**: 
  - View all users with pagination
  - Search users by username or nickname
  - Toggle pro status
  - Grant/revoke admin access
  - Delete users
- **Real-time Updates**: Stats auto-refresh every 30 seconds
- **Secure Access**: Admin-only authentication

## Setup

### 1. Run Database Migration

First, apply the admin role migration to add the `is_admin` column:

```sql
-- Run migrations/010_add_admin_role.sql in your Supabase SQL editor
```

### 2. Make Your User an Admin

In Supabase SQL editor, run:

```sql
UPDATE flux_users 
SET is_admin = TRUE 
WHERE username = 'your_username';
```

Replace `your_username` with your actual username.

### 3. Start Admin Server

```bash
npm run dev:admin
```

The admin panel will be available at: http://localhost:3004

### 4. Login

Use your Wave credentials to login. Only users with `is_admin = TRUE` can access the panel.

## Port Configuration

- Main Wave Server: `3001`
- Telegram Bot API: `3000`
- Admin Panel: `3004`

## Security

- Admin panel requires authentication
- Only users with `is_admin = TRUE` can access
- Admins cannot remove their own admin status
- Admins cannot delete their own account
- All actions are logged server-side

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Validate session

### Admin Operations
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/users` - Get all users (paginated)
- `PATCH /api/admin/users/:userId/pro` - Toggle pro status
- `PATCH /api/admin/users/:userId/admin` - Toggle admin status
- `DELETE /api/admin/users/:userId` - Delete user

## Development

The admin panel uses:
- Express.js backend
- Tailwind CSS for styling
- Wave design system (dark theme, glass morphism)
- Material Symbols icons
- Vanilla JavaScript (no framework)

## Troubleshooting

### "Admin access required" error
- Make sure your user has `is_admin = TRUE` in the database
- Check that you're logged in with the correct account

### Cannot see users
- Verify Supabase connection in `.env`
- Check that the migration was applied successfully
- Look for errors in the server console

### Port already in use
- Change the port in `src/admin-server.ts` (default: 3004)
- Make sure no other service is using port 3004
