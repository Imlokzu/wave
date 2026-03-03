# Quick Fix - Bio Profiles Not Working

## The Problem
You're getting upload and save errors because the database table `bio_profiles` doesn't exist yet.

## The Solution (2 minutes)

### Step 1: Run SQL Migration in Supabase

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Login and select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Run the Migration**
   - Open the file: `sql/bio-profiles-migration.sql` in your code editor
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into Supabase SQL Editor
   - Click the green "Run" button
   - Wait for "Success" message

### Step 2: Restart Backend

```bash
cd backend
npm start
```

### Step 3: Test It

1. Open: http://localhost:3001/profile.html
2. Try uploading an avatar (images work via ImgBB)
3. Fill in your info
4. Click "Save Profile"
5. Should work now!

## What the Migration Does

Creates:
- `bio_profiles` table (stores your profile data)
- Storage buckets for files:
  - `bio-avatars` (profile pictures)
  - `bio-backgrounds` (background videos)
  - `bio-music` (background music)
  - `bio-cursors` (custom cursors)
- Security policies (RLS)
- Helper functions

## Current Status

✅ Backend code ready
✅ Frontend code ready
✅ Auth tokens working
✅ Username auto-loads
✅ Better error messages added
❌ Database table not created yet (YOU NEED TO DO THIS)

## Alternative: Use guns.lol Approach

If you want a simpler static approach like the guns.lol repo (no database, just local files), let me know and I can convert it to that style. It would be:
- No Supabase needed
- Files stored locally in `assets/` folder
- Just HTML/CSS/JS
- No user accounts, just one profile per site

But your current setup is better because:
- Multiple users can have profiles
- Profiles stored in database
- Proper authentication
- Can scale to many users

## Need Help?

If the SQL migration fails, send me the error message and I'll help fix it.
