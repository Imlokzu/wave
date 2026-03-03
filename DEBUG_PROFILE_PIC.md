# Debug Profile Picture Not Loading

## Check in Browser Console (F12)

Run these commands:

```javascript
// Check if bio profile data exists
localStorage.getItem('bioProfileData')

// Parse and see the data
JSON.parse(localStorage.getItem('bioProfileData'))

// Check username
localStorage.getItem('username')

// Test profile picture service
await window.profilePictureService.getProfilePicture(localStorage.getItem('username'))
```

## Common Issues

### 1. Profile Picture Not Saved
- Go to `/profile.html`
- Upload a profile picture
- Click "💾 Save Profile"
- Check if the button turns green (✅ Profile Picture)

### 2. Scripts Not Loading
- Check browser console for errors
- Make sure both scripts are loaded:
  - `/js/profile-picture-service.js`
  - `/js/profile-context-menu.js`

### 3. Timing Issue
- The avatar might load before the scripts
- Try refreshing the page after uploading

## Quick Fix

Add this to browser console to test:

```javascript
// Force reload profile picture
const username = localStorage.getItem('username');
const bioData = JSON.parse(localStorage.getItem('bioProfileData'));
console.log('Username:', username);
console.log('Bio Data:', bioData);
console.log('Profile Pic URL:', bioData?.profilePic);

// Manually set the avatar
const roomAvatar = document.getElementById('roomAvatar');
if (roomAvatar && bioData?.profilePic) {
    roomAvatar.src = bioData.profilePic;
    console.log('Avatar updated!');
}
```
