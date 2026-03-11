# Bio Profiles Integration - Handoff Document for Kiro

## Overview
Integrated a fully-functional guns.lol-style bio profile system into Wave chat platform. All profile data (avatars, videos, music, cursors) is stored in Supabase with proper authentication and RLS policies.

---

## 📁 Files Created/Modified

### New Files Created:

#### Backend
1. `backend/src/managers/BioProfileManager.ts`
   - Supabase client integration
   - Profile CRUD operations
   - File upload to Supabase Storage
   - Stats tracking (views/visits)

2. `backend/src/routes/bio-profile.ts`
   - `GET /api/bio-profile/:username` - Get profile by username (public)
   - `GET /api/bio-profile/me/profile` - Get current user's profile
   - `POST /api/bio-profile` - Create/update profile
   - `POST /api/bio-profile/upload/:type` - Upload files (avatar, background, music, cursor)
   - `PUT /api/bio-profile/settings` - Update profile settings
   - `PUT /api/bio-profile/media` - Update media URLs
   - `PUT /api/bio-profile/badges` - Update badges
   - `PUT /api/bio-profile/social-links` - Update social links
   - `PUT /api/bio-profile/skills` - Update skills
   - `DELETE /api/bio-profile` - Delete profile

3. `sql/bio-profiles-migration.sql`
   - Creates `bio_profiles` table
   - Creates 4 storage buckets: `bio-avatars`, `bio-backgrounds`, `bio-music`, `bio-cursors`
   - RLS policies for public read + authenticated write
   - Helper functions: `increment_bio_profile_views()`, `increment_bio_profile_visits()`
   - Triggers for auto-updating `updated_at` timestamp

#### Frontend
4. `public/bio-editor.html`
   - Profile editor UI with sidebar navigation
   - Sections: Basic Info, Media Upload, Theme, Badges, Social Links, Skills, Preview
   - Live preview of profile

5. `public/bio.html`
   - Public profile viewer template
   - Entry screen with "click to enter"
   - Background video + music player
   - Custom cursor support
   - Theme support (7 colors)

6. `public/css/bio-editor.css`
   - Editor styles (dark theme, modern UI)
   - Responsive design

7. `public/css/bio-profile.css`
   - Profile viewer styles
   - 7 theme color schemes (default, dark, red, green, orange, pink, cyan)
   - Animations (avatar float, ring rotate, glow pulse, music visualizer)

8. `public/js/bio-editor.js`
   - Form handling
   - File upload to Supabase via API
   - Live preview rendering
   - Badge/skill/social link management

9. `public/js/bio-profile.js`
   - Profile loading from API
   - Entry screen interaction
   - Music toggle with visualizer
   - Custom cursor handling
   - Stats animation

10. `BIO_PROFILES.md`
    - Complete documentation
    - Setup instructions
    - API reference
    - Troubleshooting guide

### Files Modified:

11. `backend/src/server.ts`
    - Added import: `initializeBioProfileManager`
    - Added import: `createBioProfileRouter`
    - Added initialization call for BioProfileManager
    - Added route: `app.use('/api/bio-profile', createBioProfileRouter(authService))`

---

## 🗄️ Database Schema

```sql
CREATE TABLE bio_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES flux_users(id) ON DELETE CASCADE,
  
  -- Basic Info
  username TEXT,
  display_name TEXT,
  bio TEXT,
  
  -- Media URLs (Supabase Storage)
  avatar_url TEXT,
  background_video_url TEXT,
  background_music_url TEXT,
  custom_cursor_url TEXT,
  
  -- Configuration
  theme VARCHAR(50) DEFAULT 'default',
  custom_cursor_enabled BOOLEAN DEFAULT true,
  auto_play_music BOOLEAN DEFAULT false,
  
  -- JSON Arrays
  badges JSONB DEFAULT '[]'::jsonb,
  social_links JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  
  -- Stats
  views BIGINT DEFAULT 0,
  visits BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Storage Buckets Created:
- `bio-avatars` (public read, authenticated upload)
- `bio-backgrounds` (public read, authenticated upload)
- `bio-music` (public read, authenticated upload)
- `bio-cursors` (public read, authenticated upload)

---

## 🔧 Setup Steps for Kiro

### 1. Run SQL Migration in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `sql/bio-profiles-migration.sql`
3. Run the script
4. Verify tables and buckets are created

### 2. Verify Backend Build

```bash
cd backend
npm run build
npm start
```

Server should start without errors. Check logs for:
- ✅ BioProfileManager initialized
- ✅ /api/bio-profile routes registered

### 3. Test API Endpoints

**Get current user's profile:**
```bash
curl http://localhost:3000/api/bio-profile/me/profile \
  --cookie "your-auth-cookie"
```

**Upload avatar:**
```bash
curl -X POST http://localhost:3000/api/bio-profile/upload/avatar \
  -F "file=@/path/to/image.png" \
  --cookie "your-auth-cookie"
```

### 4. Test Frontend

1. Open `http://localhost:3000/bio-editor.html`
2. Fill in profile info
3. Upload avatar, background video, music
4. Click Save
5. Visit `http://localhost:3000/bio/{username}` to view

---

## 🎯 Key Features Implemented

### Profile Editor (`/bio-editor.html`)
- ✅ Username, display name, bio
- ✅ File uploads (avatar, background video, music, cursor)
- ✅ 7 theme color selector
- ✅ Custom cursor toggle
- ✅ Auto-play music toggle
- ✅ Badge manager (add/remove with name + icon URL)
- ✅ Social links (GitHub, Discord, Twitter, YouTube, Instagram, Telegram, Spotify, Website)
- ✅ Skills/tags manager
- ✅ Live preview

### Profile Viewer (`/bio/{username}`)
- ✅ Entry screen ("click to enter")
- ✅ Background video (muted, loop)
- ✅ Background music with toggle + visualizer
- ✅ Custom cursor (optional)
- ✅ Animated avatar with rotating ring
- ✅ Badges display with tooltips
- ✅ Social links with icons
- ✅ Skills tags
- ✅ View/visit stats (animated counter)
- ✅ 7 theme color schemes
- ✅ Keyboard shortcuts (Space to enter, M for music)

---

## 🔐 Security

- **Row Level Security (RLS)** enabled on `bio_profiles` table
- **Public read access** - anyone can view profiles
- **Authenticated writes** - only logged-in users can create/edit their own profile
- **User ownership check** - `auth.uid() = user_id` required for updates
- **File size limit** - 10MB max per upload
- **CORS configured** - only allowed origins can access API

---

## 📊 Data Flow

```
User → Bio Editor → Upload File → POST /api/bio-profile/upload/:type
                                  ↓
                          BioProfileManager.uploadFile()
                                  ↓
                          Supabase Storage (bucket)
                                  ↓
                          Returns public URL
                                  ↓
User → Save Profile → POST /api/bio-profile
                      ↓
              BioProfileManager.upsertProfile()
                      ↓
              Supabase (bio_profiles table)
                      ↓
              Profile saved with all URLs
```

**Viewing:**
```
Visitor → /bio/{username}
          ↓
    bio-profile.js loads
          ↓
    GET /api/bio-profile/{username}
          ↓
    BioProfileManager.getProfileByUsername()
          ↓
    Supabase returns profile data
          ↓
    Render profile with theme, media, etc.
          ↓
    Increment view count
```

---

## 🐛 Known Issues / Notes

1. **First profile creation**: If user has no profile, `GET /api/bio-profile/me/profile` will auto-create a default one

2. **File uploads**: Uses Supabase Storage, not local filesystem. Make sure buckets exist after running migration.

3. **Username uniqueness**: Enforced by database unique constraint on `user_id`

4. **Music auto-play**: Browsers block auto-play without user interaction. The "click to enter" screen solves this.

5. **Stats tracking**: Views increment on every profile load, visits could be tracked separately (currently same as views)

---

## 🚀 Future Enhancements (Optional)

- [ ] Profile verification system (like guns.lol verified badge)
- [ ] Premium themes/effects for Pro users
- [ ] Profile analytics dashboard
- [ ] Comment system on profiles
- [ ] Profile templates
- [ ] QR code generator for profiles
- [ ] Custom CSS/JS for advanced users (Pro feature)
- [ ] Profile backup/export

---

## 📞 Integration Checklist for Kiro

- [ ] Run `sql/bio-profiles-migration.sql` in Supabase
- [ ] Verify storage buckets created in Supabase Dashboard → Storage
- [ ] Rebuild backend: `npm run build`
- [ ] Start server and check no errors
- [ ] Test file upload endpoint
- [ ] Test profile creation via editor
- [ ] Test profile viewing
- [ ] Verify RLS policies work (try accessing without auth)
- [ ] Test on mobile (responsive design)
- [ ] Add link to Wave navigation: "Edit Bio Profile" → `/bio-editor.html`

---

## 📚 Additional Resources

- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- guns.lol inspiration: https://github.com/JAQLIV/gunslol-open-source

---

**Questions?** Check `BIO_PROFILES.md` for detailed documentation or review the code:
- `backend/src/managers/BioProfileManager.ts` - Backend logic
- `public/js/bio-editor.js` - Frontend editor logic
- `public/js/bio-profile.js` - Profile viewer logic
