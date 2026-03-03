# guns.lol Style Bio Profile - Editor & Viewer

## What I Did

✅ Moved guns.lol files to your project:
- `public/bio-view.html` - The guns.lol profile viewer (keeps all the cool effects!)
- `public/js/bio-view.js` - The animations and interactions
- `public/css/bio-view.css` - The styling

✅ Created a simple editor:
- `public/bio-editor-simple.html` - Edit your profile data

## How It Works

### 1. Edit Your Profile
Open: `http://localhost:3001/bio-editor-simple.html`

You can edit:
- 👤 Profile Name (shows at the top)
- 📝 Bio Messages (multiple lines, they rotate/typewrite)
- 📷 Profile Picture (uploads to ImgBB)
- 🎥 Background Video (saved to localStorage)
- 🔗 Social Links (Discord, GitHub, YouTube, TikTok)

Click "Save Profile" when done.

### 2. View Your Profile
Click "View Profile" button or open: `http://localhost:3001/bio-view.html`

This shows the full guns.lol experience with:
- ✨ Animated profile picture with orbit effect
- 📝 Typewriter bio text
- 🎨 5 theme buttons (home, hacker, rain, anime, car)
- 🎵 Volume controls
- 👁️ Transparency slider
- 🎯 All the original guns.lol animations and effects!

## Features Kept from guns.lol

✅ Custom cursor
✅ Glitch effects
✅ Profile picture orbit animation
✅ Typewriter text effect
✅ 5 different themes
✅ Background video
✅ Volume controls
✅ Transparency controls
✅ Social links
✅ Visitor counter
✅ Skills section (hacker theme)
✅ 3D tilt effect on profile card
✅ All GSAP animations

## How Data Flows

1. You edit in `/bio-editor-simple.html`
2. Data saves to localStorage
3. `/bio-view.html` loads data from localStorage
4. guns.lol animations use the loaded data

## Adding Assets

The guns.lol profile needs these assets in the `assets/` folder:
- `background.mp4` - Default background video
- `hacker_background.mp4` - Hacker theme video
- `rain_background.mov` - Rain theme video
- `anime_background.mp4` - Anime theme video
- `car_background.mp4` - Car theme video
- `background_music.mp3` - Default music
- `hacker_music.mp3` - Hacker theme music
- `rain_music.mp3` - Rain theme music
- `anime_music.mp3` - Anime theme music
- `car_music.mp3` - Car theme music
- `custom_cursor.png` - Custom cursor image
- Badge GIFs (staff.gif, owner.gif, etc.)
- Social icons (discord.png, github.png, etc.)

You can add these files to the `assets/` folder, or the editor will use defaults.

## Next Steps

1. Open `/bio-editor-simple.html`
2. Fill in your info
3. Upload profile picture
4. Save
5. Click "View Profile" to see the result!

The viewer keeps ALL the guns.lol features - themes, animations, effects, everything!
