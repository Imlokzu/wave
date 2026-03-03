# Notification System Fix

## Problem
Notifications were not working due to:
1. Missing service worker registration for web push
2. No notification permission request on app startup
3. No Supabase Realtime subscription to listen for new DM messages
4. Missing database trigger for real-time DM notifications

## Solution Implemented

### 1. Service Worker (`/public/sw.js`)
Created a new service worker that handles:
- Push notification events
- Notification click handling (opens chat with sender)
- Cache management for offline support
- Background sync

**Key Features:**
- Shows notifications even when app is in background
- Clicking notification opens the chat with the sender
- Proper caching strategy for better performance

### 2. Frontend Changes

#### `public/js/config.js`
Added Supabase configuration:
```javascript
supabase: {
  url: 'https://vqfippjpzqqzszuapjn.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

#### `public/chat.html`
Added Supabase client library:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

#### `public/js/app.js`
Added multiple notification-related methods:

1. **`registerServiceWorker()`** - Registers the service worker
2. **`requestNotificationPermission()`** - Requests browser notification permission
3. **`subscribeToPush()`** - Subscribes to push notifications (requires VAPID keys for production)
4. **`sendPushSubscriptionToServer()`** - Saves subscription to backend
5. **`setupSupabaseRealtime()`** - Subscribes to DM notifications via Supabase Realtime

**Notification Flow:**
1. On app init → Request notification permission
2. On permission granted → Subscribe to push notifications
3. On new DM → Supabase Realtime triggers event
4. Show toast notification + browser notification
5. Play notification sound
6. Update unread count in sidebar

### 3. Backend Changes

#### `backend/src/services/PushNotificationService.ts` (NEW)
Service for managing push subscriptions and sending push notifications.

**Methods:**
- `saveSubscription()` - Save user's push subscription
- `getSubscriptions()` - Get all subscriptions for a user
- `sendToUser()` - Send push notification to user
- `removeSubscription()` - Remove invalid subscription

#### `sql/supabase-push-notifications.sql` (NEW)
Database migration that:
- Creates `push_subscriptions` table
- Enables Realtime for `direct_messages` and `push_subscriptions` tables
- Creates trigger function `notify_new_dm()` to broadcast new DMs
- Sets up database trigger for real-time notifications

### 4. Notification Permission Request

The app now requests notification permission automatically on startup (after authentication).

**Permission States:**
- `granted` - Notifications will work
- `denied` - User must manually enable in browser settings
- `default` - Permission prompt will show

## Testing Instructions

### 1. Run the Database Migration
```bash
# Connect to your Supabase instance
psql -h db.vqfippjpzqzqzszuapjn.supabase.co -U postgres -d postgres -f sql/supabase-push-notifications.sql
```

Or run it in the Supabase SQL Editor.

### 2. Start the Application
```bash
# Start the backend
cd backend
npm start

# The frontend is served automatically
```

### 3. Test Notification Permission
1. Open the app in browser
2. Login with your account
3. You should see a permission prompt for notifications
4. Click "Allow"

### 4. Test DM Notifications
1. Open the app in **two different browser windows/tabs**
2. Login with **different accounts** in each window
3. In Window A, navigate away from the chat (go to another tab or minimize)
4. In Window B, send a DM to the user in Window A
5. Window A should receive:
   - Toast notification (bottom-right corner)
   - Browser notification (if window is not focused)
   - Notification sound
   - Unread count badge in sidebar

### 5. Test Service Worker
Open browser DevTools → Application → Service Workers
- Should show "Activated and running"
- Can click "Update" to refresh the service worker

### 6. Test Push Notifications (Production)
For full push notification support (when browser is closed):

1. **Generate VAPID Keys:**
```bash
npx web-push generate-vapid-keys
```

2. **Update `app.js`:**
Replace `'YOUR_VAPID_PUBLIC_KEY_HERE'` with your actual VAPID public key.

3. **Setup Push Endpoint in Backend:**
Create `/api/push/subscribe` route to save subscriptions.

4. **Send Test Push:**
Use the `PushNotificationService` to send test notifications.

## Console Output

When working correctly, you should see:

```
[App] Initializing...
[App] User authenticated, showing chat...
[App] Service Worker registered: /sw.js
[App] Notification permission: granted
[App] Subscribed to push notifications
[App] Supabase client initialized
[App] Subscribed to DM notifications channel
```

When receiving a DM:
```
[App] New DM received via Supabase Realtime: { ... }
[App] Showing notification for DM from: username
[App] Push subscription saved to server
```

## Troubleshooting

### Notifications Not Showing

1. **Check permission:**
```javascript
console.log('Notification permission:', Notification.permission);
// Should be 'granted'
```

2. **Check service worker:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs);
});
```

3. **Check Supabase Realtime connection:**
```javascript
console.log('Supabase client:', app.supabase);
console.log('DM Channel:', app.dmChannel);
```

### Service Worker Not Registering

1. **Check HTTPS:** Service workers require HTTPS (or localhost)
2. **Check browser support:** https://caniuse.com/serviceworkers
3. **Clear old service workers:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
});
```

### Supabase Realtime Not Working

1. **Check Realtime is enabled:**
   - Go to Supabase Dashboard → Database → Replication
   - Ensure `direct_messages` table is published

2. **Check RLS policies:**
```sql
-- Ensure users can read their own messages
CREATE POLICY "Users can read own DMs"
ON direct_messages FOR SELECT
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
```

3. **Check database trigger:**
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_new_dm';
```

## Files Modified/Created

### Created:
- `/public/sw.js` - Service worker
- `/backend/src/services/PushNotificationService.ts` - Push notification service
- `/sql/supabase-push-notifications.sql` - Database migration
- `/NOTIFICATION_FIX.md` - This documentation

### Modified:
- `/public/js/config.js` - Added Supabase configuration
- `/public/js/app.js` - Added notification methods and Realtime subscription
- `/public/chat.html` - Added Supabase client library

## Next Steps for Production

1. **Generate and configure VAPID keys** for web push
2. **Setup Firebase Cloud Messaging** or another push service
3. **Add notification preferences** in user settings
4. **Implement notification grouping** for better UX
5. **Add notification history/log** for users to review missed notifications
6. **Setup analytics** to track notification engagement

## Browser Support

- ✅ Chrome/Edge 50+
- ✅ Firefox 44+
- ✅ Safari 16+ (iOS 16.4+)
- ⚠️ Opera - Partial support

**Note:** iOS Safari requires iOS 16.4+ for push notifications and requires the website to be added to home screen.
