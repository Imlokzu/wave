# Simple Bio Profile Editor - guns.lol Style

## What I Created

A simple, clean bio profile editor inspired by guns.lol that works WITHOUT needing the SQL migration!

## File Created

`public/bio-profile.html` - A single-page editor with live preview

## Features

✅ Live preview as you type
✅ Avatar upload (uses ImgBB - no database needed)
✅ Username auto-loads from localStorage
✅ Display name
✅ Bio text
✅ Social links (GitHub, Discord, Twitter, YouTube)
✅ Saves to localStorage (no database needed)
✅ Clean guns.lol-inspired design
✅ Smooth animations with GSAP

## How to Use

1. Open: `http://localhost:3001/bio-profile.html`
2. Your username will auto-load
3. Fill in your info
4. Upload an avatar (uses ImgBB API)
5. Add social links
6. Click "Save Profile"
7. Done!

## Why This Works

- No SQL migration needed
- No Supabase storage needed
- No RLS policy issues
- Uses ImgBB for image hosting (already configured in your .env)
- Saves data to localStorage
- Works immediately

## Next Steps (Optional)

If you want to make profiles public and shareable:

1. Create a simple backend route to save/load profiles
2. Store in Supabase `bio_profiles` table (after running migration)
3. Create a viewer page at `/bio/{username}`

But for now, this works perfectly for editing and saving your own profile!

## Differences from guns.lol

guns.lol is a static single-page site with:
- All content hardcoded in HTML
- Multiple themes with different videos/music
- Custom cursor effects
- Animated backgrounds
- Skills section with progress bars

This editor is:
- Simpler and cleaner
- Focused on editing, not viewing
- No themes (just one clean design)
- No background videos (keeps it fast)
- Live preview
- Easy to customize

## To Make It More Like guns.lol

If you want the full guns.lol experience with themes, videos, music, etc., let me know and I can:

1. Add theme selector (5 themes like guns.lol)
2. Add background video upload
3. Add background music upload
4. Add custom cursor
5. Add skills section with progress bars
6. Add visitor counter
7. Create a separate viewer page with all the animations

But this simple version works great for now!
