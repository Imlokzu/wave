# Wave Bio Profiles

A fully integrated bio profile system like guns.lol, built into your Wave chat platform. Users can create customizable profile pages with animated backgrounds, music, badges, and more — all stored in Supabase.

## ✨ Features

- 🎨 **7 Color Themes** - default, dark, red, green, orange, pink, cyan
- 🎵 **Background Music** - Auto-play option with music visualizer
- 🎬 **Video Backgrounds** - Support for animated video backgrounds
- 🖱️ **Custom Cursor** - Optional animated custom cursor
- 🏆 **Badges System** - Display achievements and roles
- 🔗 **Social Links** - Connect all social media profiles
- 💫 **Smooth Animations** - Beautiful entrance and hover effects
- 📊 **View/Visit Stats** - Track profile analytics
- ☁️ **Supabase Storage** - All assets uploaded to Supabase
- 🔐 **Authenticated Uploads** - Secure file uploads with RLS

## 🚀 Setup

### 1. Run Database Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the migration: `sql/bio-profiles-migration.sql`

This creates:
- `bio_profiles` table
- Storage buckets: `bio-avatars`, `bio-backgrounds`, `bio-music`, `bio-cursors`
- RLS policies for secure access
- Helper functions for stats tracking

### 2. Build & Restart Backend

```bash
cd backend
npm run build
npm start
```

### 3. Access Bio Profiles

- **Editor**: `/bio-editor.html`
- **Public Profile**: `/bio/{username}`

## 📁 File Structure

```
public/
├── bio-editor.html       # Profile editor page
├── bio.html              # Public profile viewer (template)
├── css/
│   ├── bio-editor.css    # Editor styles
│   └── bio-profile.css   # Profile viewer styles
└── js/
    ├── bio-editor.js     # Editor functionality
    └── bio-profile.js    # Profile viewer functionality

backend/
├── src/
│   ├── managers/
│   │   └── BioProfileManager.ts    # Supabase integration
│   └── routes/
│       └── bio-profile.ts          # API routes
└── server.ts             # Updated with bio-profile routes

sql/
└── bio-profiles-migration.sql    # Database schema
```

## 🎨 Usage

### Creating a Profile

1. Navigate to `/bio-editor.html`
2. Fill in your profile information:
   - Username (for profile URL)
   - Display name
   - Bio text
   - Upload avatar, background video, music
   - Choose theme color
   - Add badges
   - Add social links
   - Add skills
3. Click **Save Profile**

### Viewing a Profile

Visit `/bio/{username}` where `{username}` is the profile username.

Example: `wave.app/bio/john`

## 📡 API Endpoints

All endpoints require authentication (cookies).

### Get Profile by Username
```
GET /api/bio-profile/:username
```

### Get Current User's Profile
```
GET /api/bio-profile/me/profile
```

### Create/Update Profile
```
POST /api/bio-profile
Body: { username, displayName, bio, theme, ... }
```

### Upload File
```
POST /api/bio-profile/upload/:type
Types: avatar, background, music, cursor
FormData: file
```

### Update Settings
```
PUT /api/bio-profile/settings
Body: { username, displayName, bio, theme, customCursorEnabled, autoPlayMusic }
```

### Update Media URLs
```
PUT /api/bio-profile/media
Body: { avatarUrl, backgroundVideoUrl, backgroundMusicUrl, customCursorUrl }
```

### Update Badges
```
PUT /api/bio-profile/badges
Body: { badges: [{ name, icon }] }
```

### Update Social Links
```
PUT /api/bio-profile/social-links
Body: { socialLinks: [{ platform, name, url }] }
```

### Update Skills
```
PUT /api/bio-profile/skills
Body: { skills: string[] }
```

### Delete Profile
```
DELETE /api/bio-profile
```

## 🎯 Profile Data Structure

```typescript
interface BioProfile {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  backgroundVideoUrl?: string;
  backgroundMusicUrl?: string;
  customCursorUrl?: string;
  theme: string; // default, dark, red, green, orange, pink, cyan
  customCursorEnabled: boolean;
  autoPlayMusic: boolean;
  badges: { name: string; icon: string }[];
  socialLinks: { platform: string; name: string; url: string }[];
  skills: string[];
  views: number;
  visits: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🎬 Getting Media Assets

### Convert YouTube Videos to Background

Use online tools:
- [ClipConverter.cc](https://clipconverter.cc)
- [Y2Mate](https://y2mate.com)

Download as `.mp4` or `.mov` format.

### Free Music Sources

- [NCS (No Copyright Sounds)](https://ncs.io)
- [Bensound](https://bensound.com)
- [Free Music Archive](https://freemusicarchive.org)

### Free Video Backgrounds

- [Pexels Videos](https://pexels.com/videos)
- [Pixabay Videos](https://pixabay.com/videos)
- [Coverr](https://coverr.co)

## ⌨️ Keyboard Shortcuts (Viewer)

| Key | Action |
|-----|--------|
| `Space` | Enter site (on entry screen) |
| `M` | Toggle music |

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Authenticated uploads** - only logged-in users can upload
- **Public read access** - profiles are publicly viewable
- **File size limits** - 10MB max per file
- **User ownership** - users can only edit their own profile

## 🎨 Customization

### Add New Themes

Edit `public/css/bio-profile.css`:

```css
[data-theme="your-theme"] {
    --primary-color: #yourcolor;
    --secondary-color: #yourcolor;
    --accent-color: #yourcolor;
    --glow-color: rgba(r, g, b, 0.5);
    --border-color: rgba(r, g, b, 0.3);
}
```

Then add to theme selector in `bio-editor.html`.

### Custom Fonts

Edit `public/css/bio-profile.css`:

```css
@font-face {
    font-family: 'YourFont';
    src: url('/fonts/yourfont.ttf');
}

:root {
    --font-main: 'YourFont', sans-serif;
}
```

## 🐛 Troubleshooting

**Upload fails:**
- Check Supabase storage buckets exist
- Verify RLS policies are set correctly
- Check file size (max 10MB)

**Profile not loading:**
- Verify username is correct
- Check if profile exists in database
- Check browser console for errors

**Music not playing:**
- Browser may block auto-play (user must interact first)
- Check file format (.mp3 recommended)
- Verify file uploaded successfully

## 📊 Database Schema

The migration creates:

```sql
bio_profiles (
  id UUID,
  user_id UUID (references flux_users),
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  background_video_url TEXT,
  background_music_url TEXT,
  custom_cursor_url TEXT,
  theme VARCHAR,
  custom_cursor_enabled BOOLEAN,
  auto_play_music BOOLEAN,
  badges JSONB,
  social_links JSONB,
  skills JSONB,
  views BIGINT,
  visits BIGINT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## 🚀 Deployment

### Railway/Render

1. Build backend: `npm run build`
2. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
3. Deploy

### Vercel/Netlify (Frontend)

1. Upload `public/` folder
2. Configure API proxy to backend
3. Set CORS origins in backend

## 📄 License

Part of Wave chat platform. MIT License.

## 🤝 Support

For issues or questions:
- Check backend logs
- Review Supabase RLS policies
- Test API endpoints with Postman

---

**Built with ❤️ for Wave**
