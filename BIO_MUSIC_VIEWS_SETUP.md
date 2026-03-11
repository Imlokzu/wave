# Bio Profile - Music & Real Views Setup

## What's New

✅ **Background Music Upload** - Upload your own music
✅ **Real Profile Views** - Tracked in Supabase (increments on each view)

## Setup Steps

### 1. Run SQL Migration for Views

**IMPORTANT:** Run this in Supabase Dashboard → SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor"
4. Copy contents of `sql/bio-profile-views.sql`
5. Paste and click "Run"

This creates the `bio_profile_views` table to track real views.

### 2. Restart Backend

```bash
cd backend
npm start
```

### 3. Upload Music

1. Open `/bio-editor-simple.html`
2. Click "🎵 Background Music"
3. Select an MP3 file (max 10MB)
4. Click "💾 Save Profile"
5. Click "👁️ View Profile"

Your music will play automatically!

## How Views Work

### Before (Fake):
- Views were stored in localStorage
- Started at 921234
- Same for everyone

### Now (Real):
- Each profile view increments the counter in Supabase
- Unique per username
- Starts at 1 for new profiles
- Persists across sessions
- Real analytics!

## Features Summary

### Editor (`/bio-editor-simple.html`):
- 👤 Profile Name
- 📝 Bio Messages (multiple lines)
- 📷 Profile Picture (ImgBB)
- 🎥 Background Video (localStorage)
- 🎵 Background Music (localStorage) ← NEW!
- 🏆 Custom Badges
- 🔗 Social Links

### Viewer (`/bio-view.html`):
- ✨ All guns.lol animations
- 🎨 5 themes
- 🎵 Music player with volume control
- 👁️ Real view counter ← NEW!
- 🖱️ Normal cursor (fixed)
- 🏆 Dynamic badges

## API Endpoints

### Get Views
```
GET /api/bio-views/:username
```

Returns:
```json
{
  "views": 123
}
```

### Increment Views
```
POST /api/bio-views/:username/increment
```

Returns:
```json
{
  "views": 124
}
```

## Testing

1. Open `/bio-editor-simple.html`
2. Set your profile name to "testuser"
3. Save
4. Open `/bio-view.html` - views should be 1
5. Refresh page - views should be 2
6. Open in incognito - views should be 3

Each view increments the counter!

## Notes

- Music files are stored in localStorage (base64)
- Keep music files under 10MB for best performance
- Views are tracked per username
- Views persist in Supabase database
- No authentication needed for viewing

## Troubleshooting

### Music not playing?
- Check file size (must be < 10MB)
- Try MP3 format
- Check browser console for errors

### Views not incrementing?
- Make sure you ran the SQL migration
- Check backend is running
- Check browser console for API errors
- Verify Supabase connection in .env
