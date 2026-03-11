# Profile Picture System

## What Was Created

✅ **Profile Picture Service** - Manages profile pictures across the app
✅ **Context Menu** - Click any profile picture to see options
✅ **Unified System** - Bio profile picture shows everywhere

## Files Created

1. `public/js/profile-picture-service.js` - Profile picture management
2. `public/js/profile-context-menu.js` - Context menu component

## How to Integrate

### Step 1: Add Scripts to chat.html

Add these scripts before the closing `</body>` tag:

```html
<script src="/js/profile-picture-service.js"></script>
<script src="/js/profile-context-menu.js"></script>
```

### Step 2: Use Profile Pictures

Anywhere you show a profile picture, use this:

```javascript
// Get profile picture URL
const avatar = await window.profilePictureService.getProfilePicture(username);
img.src = avatar;

// Make it clickable with context menu
window.makeProfileMenuTrigger(img, username);
```

### Step 3: Update When Bio Changes

When user updates their bio profile picture:

```javascript
window.profilePictureService.updateMyProfilePicture(newUrl);
```

This automatically updates all instances in the app!

## Context Menu Features

When you click on any profile picture, you get:

1. **👤 View Profile** - Opens `/bio/username` in new tab
2. **💬 Send Message** - Opens DM with user (coming soon)
3. **➕ Add Friend** - Adds user as friend (coming soon)
4. **📨 Invite to Room** - Invites user to current room (coming soon)

## Example Usage

### In Messages

```javascript
// When rendering a message
const messageEl = document.createElement('div');
const avatar = document.createElement('img');

// Load profile picture
const avatarUrl = await window.profilePictureService.getProfilePicture(message.username);
avatar.src = avatarUrl;
avatar.className = 'message-avatar';

// Make it clickable
window.makeProfileMenuTrigger(avatar, message.username);

messageEl.appendChild(avatar);
```

### In User List

```javascript
// When rendering user list
users.forEach(async (user) => {
    const userEl = document.createElement('div');
    const avatar = document.createElement('img');
    
    const avatarUrl = await window.profilePictureService.getProfilePicture(user.username);
    avatar.src = avatarUrl;
    
    window.makeProfileMenuTrigger(avatar, user.username);
    
    userEl.appendChild(avatar);
});
```

## Features

### Profile Picture Service

- ✅ Caches profile pictures for performance
- ✅ Loads from bio profile data
- ✅ Generates default avatars (colored circles with initials)
- ✅ Updates all instances when picture changes
- ✅ Works for current user and other users

### Context Menu

- ✅ Beautiful dark theme design
- ✅ Shows user avatar and name
- ✅ 4 action buttons
- ✅ Smart positioning (stays on screen)
- ✅ Closes when clicking outside
- ✅ Smooth animations

## Default Avatars

If a user doesn't have a profile picture, the system generates a colored circle with their initial:

- Different colors based on username
- First letter of username
- Clean SVG design

## Next Steps

To fully integrate:

1. Add scripts to `chat.html`
2. Update message rendering to use profile pictures
3. Update user list to use profile pictures
4. Update room participants to use profile pictures
5. Implement DM, friend, and invite features

## API

### ProfilePictureService

```javascript
// Get profile picture
const url = await profilePictureService.getProfilePicture('username');

// Update current user's picture
profilePictureService.updateMyProfilePicture(newUrl);

// Generate default avatar
const defaultUrl = profilePictureService.generateDefaultAvatar('username');
```

### ProfileContextMenu

```javascript
// Show menu
profileContextMenu.show('username', x, y);

// Hide menu
profileContextMenu.hide();
```

### Helper Function

```javascript
// Make any image trigger the context menu
makeProfileMenuTrigger(imgElement, 'username');
```

## Styling

The context menu is fully styled and matches your dark theme:
- Dark background with blur
- Blue accents
- Smooth hover effects
- Responsive positioning

All styles are injected automatically, no CSS file needed!
