# New Device Login Alerts

Automatically send email notifications when users log in from a new device or location.

## Features

✅ **Automatic Detection** - Detects new devices based on IP + Device + Browser combination
✅ **Email Notifications** - Sends beautiful branded emails with login details
✅ **Location Tracking** - Shows city, country, and IP address
✅ **Device Information** - Displays device type, browser, and OS
✅ **Security Actions** - Provides links to view sessions and change password
✅ **IP Geolocation** - Uses ip-api.com for free geolocation (45 req/min limit)

## How It Works

1. **User logs in** from any device
2. **Auth middleware** captures the request and extracts:
   - IP address (handles proxies/load balancers)
   - User agent (browser, OS, device type)
   - Timestamp
3. **IP Tracking Service** checks if this is a new device:
   - Compares IP + Device + Browser with previous sessions
   - If new, triggers email alert
4. **Geolocation API** fetches location data:
   - City, country, region
   - Latitude/longitude for map display
   - ISP and organization info
5. **Email Service** sends alert with:
   - Device details
   - Location information
   - Security recommendations
   - Quick action buttons

## Email Template

The new device alert email includes:

- 🔐 **Security header** with warning icon
- 📱 **Device information** (type, browser, OS)
- 📍 **Location details** (city, country, IP)
- 🕐 **Login timestamp** (formatted with timezone)
- ✅ **"Was this you?"** confirmation section
- ⚠️ **Security warning** if not recognized
- 🔗 **Action buttons**:
  - View Active Sessions
  - Change Password
- 🛡️ **Security tips** for account protection

## Setup

### 1. Install Dependencies

Already included in `package.json`:
- `nodemailer` - Email sending
- `axios` - HTTP requests for geolocation

```bash
cd backend
npm install
```

### 2. Configure Environment

Your `.env` already has SMTP configured:

```env
SMTP_HOST="smtp-relay.brevo.com"
SMTP_PORT=587
SMTP_USER="a1795d001@smtp-brevo.com"
SMTP_PASS="bski0jEZT0ZEFgK"
EMAIL_FROM="noreply@waveio.me"
EMAIL_FROM_NAME="Wave Messenger"
```

### 3. Build and Start

```bash
npm run build
npm start
```

### 4. Test the Feature

1. **First login**: Log in from your browser
   - No email sent (first device is not "new")

2. **New device**: Log in from a different:
   - Browser (Chrome → Firefox)
   - Device (Desktop → Mobile)
   - Location (different IP)
   - You'll receive an email alert!

3. **Check email**: Look for "🔐 New device login detected"

## API Endpoints

### View Active Sessions
```
GET /api/sessions/current
Authorization: Bearer <token>
```

Returns all active sessions (last 30 minutes) with location data.

### View Session History
```
GET /api/sessions/history
Authorization: Bearer <token>
```

Returns all sessions for the user.

### Terminate Session
```
DELETE /api/sessions/:ip
Authorization: Bearer <token>
```

Terminates a specific session by IP address.

### Terminate All Other Sessions
```
DELETE /api/sessions/all
Authorization: Bearer <token>
```

Terminates all sessions except the current one.

### Get Map Data
```
GET /api/sessions/map-data
Authorization: Bearer <token>
```

Returns location data for displaying sessions on a map.

## Frontend Integration

### Sessions Map Page

Visit `/sessions-map.html` to see:
- 🗺️ **Interactive map** with session markers
- 📊 **Statistics** (active sessions, locations)
- 📋 **Session list** with device details
- 🗑️ **Terminate buttons** for each session

### Settings Integration

The "Active Sessions" button in Settings now links to the sessions map page.

## Detection Logic

A device is considered "new" if the combination of:
- **IP Address** + **Device Type** + **Browser**

...has never been seen before for this user.

### Examples:

**Triggers Alert:**
- Same IP, different browser (Chrome → Firefox)
- Same browser, different IP (home → office)
- Same IP, different device (Desktop → Mobile)

**Does NOT Trigger Alert:**
- Same IP + Device + Browser (returning user)
- Just different OS version (Windows 10 → Windows 11)

## Geolocation Service

Uses **ip-api.com** (free tier):
- ✅ No API key required
- ✅ 45 requests per minute
- ✅ Accurate city-level geolocation
- ✅ ISP and organization data
- ⚠️ Rate limited (cached for 1 hour)

### Private IPs

For localhost/private IPs (development):
- Returns mock location: "Localhost, Local"
- No external API call made
- Coordinates: (0, 0)

## Security Considerations

### Email Delivery
- Emails sent asynchronously (non-blocking)
- Failures logged but don't block login
- Uses Brevo's reliable SMTP service

### Privacy
- IP addresses stored in memory only
- Sessions cleared after 30 minutes of inactivity
- No persistent storage of location data

### Rate Limiting
- Geolocation API cached for 1 hour per IP
- Prevents excessive API calls
- Respects ip-api.com rate limits

## Customization

### Change Detection Criteria

Edit `IPTrackingService.ts`:

```typescript
private async isNewDevice(userId: string, ip: string, device: string, browser: string): Promise<boolean> {
  // Customize detection logic here
  // Example: Only check IP (ignore device/browser)
  const seenBefore = existingSessions.some(s => s.ip === ip);
  return !seenBefore;
}
```

### Customize Email Template

Edit `EmailService.ts` → `getNewDeviceAlertTemplate()`:

```typescript
private getNewDeviceAlertTemplate(username: string, deviceInfo: any): string {
  // Customize HTML template here
  return `...`;
}
```

### Change Geolocation Provider

Replace ip-api.com with another service:

```typescript
// In IPTrackingService.ts
private readonly API_URL = 'https://your-api.com/json';
```

Popular alternatives:
- **ipapi.co** (1000 req/day free)
- **ipgeolocation.io** (1000 req/day free)
- **ipstack.com** (10,000 req/month free)

## Troubleshooting

### Emails not sending?

1. Check SMTP credentials in `.env`
2. Verify Brevo account is active
3. Check server logs: `[IPTracking] Sending new device alert`
4. Test email service manually

### Not detecting new devices?

1. Clear browser cache and cookies
2. Try incognito/private mode
3. Use different browser
4. Check logs: `[IPTracking] Session tracked`

### Geolocation not working?

1. Check rate limits (45 req/min)
2. Verify IP is public (not localhost)
3. Check logs: `[IPTracking] Failed to get location`
4. Test API directly: `curl http://ip-api.com/json/8.8.8.8`

### Sessions not showing on map?

1. Verify `/api/sessions/current` returns data
2. Check browser console for errors
3. Ensure Leaflet.js loaded correctly
4. Check if markers array is populated

## Production Checklist

- [ ] Install dependencies: `npm install`
- [ ] Configure SMTP in `.env`
- [ ] Test email delivery
- [ ] Verify geolocation API works
- [ ] Test new device detection
- [ ] Check email spam folder
- [ ] Set up email monitoring
- [ ] Consider upgrading geolocation API for higher limits
- [ ] Add database persistence for sessions (optional)
- [ ] Set up alerts for failed emails

## Future Enhancements

Potential improvements:
- 📧 **Email preferences** - Let users opt-in/out
- 🔔 **In-app notifications** - Show alerts in UI
- 📊 **Analytics dashboard** - Track login patterns
- 🗄️ **Database persistence** - Store session history
- 🔒 **2FA integration** - Require 2FA for new devices
- 🌍 **Suspicious location detection** - Flag unusual countries
- ⏰ **Time-based alerts** - Flag logins at odd hours
- 📱 **Push notifications** - Mobile app alerts

---

**Note**: This feature enhances security by keeping users informed about account access. The email alerts help users quickly identify unauthorized access and take action.
