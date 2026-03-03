# Bio Profile - Shareable Links

## What Changed

✅ **Shareable Profile URLs** - `/bio/username` format
✅ **Profile Editor Renamed** - Now at `/profile.html`
✅ **Copy Share Link** - Easy sharing button

## New URLs

### Editor (Your Profile)
```
http://localhost:3001/profile.html
```

### View Profile (Shareable)
```
http://localhost:3001/bio/username
```

Examples:
- `http://localhost:3001/bio/itzlokzu`
- `http://localhost:3001/bio/testuser`
- `http://localhost:3001/bio/admin`

## How It Works

### 1. Edit Your Profile
1. Go to `/profile.html`
2. Fill in your info
3. Your shareable link shows at the top
4. Click "📋 Copy" to copy the link
5. Click "💾 Save Profile"

### 2. Share Your Profile
Share your link with anyone:
```
http://localhost:3001/bio/YOUR_USERNAME
```

They can view your profile without logging in!

### 3. View Counts
- Each unique visit increments the view counter
- Views are tracked per username in Supabase
- Real analytics!

## Features

### Profile Editor (`/profile.html`)
- 👤 Profile Name (becomes your URL)
- 📝 Bio Messages
- 📷 Profile Picture
- 🎥 Background Video
- 🎵 Background Music
- 🏆 Custom Badges
- 🔗 Social Links
- 🔗 Shareable Link (copy button)

### Profile Viewer (`/bio/username`)
- ✨ All guns.lol animations
- 🎨 5 themes
- 🎵 Music player
- 👁️ Real view counter
- 🏆 Dynamic badges
- 📱 Mobile responsive

## URL Structure

```
/profile.html          → Edit your profile
/bio/:username         → View any profile
/bio-view.html?u=name  → Internal viewer (don't share this)
```

## Examples

### Your Profile
1. Set username to "lokzu"
2. Save profile
3. Share: `http://localhost:3001/bio/lokzu`

### Someone Else's Profile
Visit: `http://localhost:3001/bio/itzlokzu`

## Navigation

From chat/app:
- Click "Profile" → Goes to `/profile.html` (editor)
- Share link → `/bio/username` (viewer)

## Backend Changes

Added route in `server.ts`:
```typescript
app.get('/bio/:username', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/bio.html'));
});
```

This handles the `/bio/:username` URLs and serves the bio.html page.

## Testing

1. Open `/profile.html`
2. Set profile name to "testuser"
3. Save
4. Copy the share link
5. Open in new tab/incognito
6. Views should increment!

## Production URLs

When deployed, your links will be:
```
https://yourdomain.com/bio/username
```

Clean and shareable!

## Notes

- Username is case-insensitive
- Views tracked per username
- No authentication needed to view profiles
- Profile data currently stored in localStorage (for own profile)
- Other users' profiles would load from backend (future enhancement)
