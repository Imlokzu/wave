# Bio Profile Setup Instructions

## Current Status
✅ Backend routes integrated and working
✅ Frontend files created (bio-editor.html, bio.html)
✅ Profile page replaced with bio editor
✅ Auth tokens added to all API calls
✅ Username auto-loads from localStorage

## What You Need to Do

### 1. Run SQL Migration (CRITICAL - DO THIS FIRST!)

The bio profiles won't work until you create the database table and storage buckets.

**Steps:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the ENTIRE contents of `sql/bio-profiles-migration.sql`
6. Paste it into the SQL editor
7. Click "Run" button

**What this creates:**
- `bio_profiles` table to store profile data
- Storage buckets: `bio-avatars`, `bio-backgrounds`, `bio-music`, `bio-cursors`
- Row Level Security (RLS) policies for authentication
- Helper functions for views/visits tracking

### 2. Test the Profile Editor

After running the migration:

1. Start your backend: `cd backend && npm start`
2. Open your browser to: `http://localhost:3001/profile.html`
3. You should see the bio profile editor
4. Your username should auto-load
5. Try uploading an avatar
6. Fill in some info and click "Save Profile"

### 3. View Your Profile

After saving, visit: `http://localhost:3001/bio.html?username=YOUR_USERNAME`

Replace `YOUR_USERNAME` with your actual username (e.g., `itzlokzu`)

## Troubleshooting

### "Failed to save profile"
- Make sure you ran the SQL migration
- Check browser console for errors
- Verify you're logged in (check localStorage for `authToken`)

### "Upload failed"
- Make sure storage buckets were created by the migration
- Check Supabase Dashboard > Storage to verify buckets exist
- Verify file is under 10MB

### Username not loading
- Fixed! Username now auto-loads from localStorage
- If still not working, check that `localStorage.getItem('username')` returns your username

### Auth errors
- Make sure you're logged in
- Check that `localStorage.getItem('authToken')` exists
- Try logging out and back in

## Features Available

Once set up, you can customize:
- ✨ Avatar image
- 🎥 Background video
- 🎵 Background music (auto-play optional)
- 🖱️ Custom cursor
- 🎨 7 color themes (default, dark, red, green, orange, pink, cyan)
- 🏆 Badges
- 🔗 Social links (GitHub, Discord, Twitter, YouTube, Instagram, Telegram, Spotify, Website)
- 💪 Skills tags
- 📝 Bio text (500 chars)

## Next Steps

After the migration works:
1. Upload some assets (avatar, background video, music)
2. Customize your theme
3. Add social links
4. Share your profile URL: `/bio.html?username=YOUR_USERNAME`
