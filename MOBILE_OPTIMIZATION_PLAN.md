# Mobile Optimization Plan for WaveChat

## Overview
This document outlines the mobile optimizations for AI Chat, Settings, and Feed pages to match the quality and functionality of the mobile-optimized chat.html.

---

## Phase 1: AI Chat Mobile Optimization

### Key Features to Add:
1. **Swipeable Left Sidebar** (like chat.html)
   - Two tabs: "AI Settings" and "Chats"
   - Slide animation when switching tabs
   - Swipe right to open from left edge
   - Swipe left to close

2. **AI Settings Tab Content:**
   - Model selection (Wave Flash 2, Wave Pro, DeepSeek, etc.)
   - Temperature slider
   - Max tokens slider
   - System prompt textarea
   - Thinking mode toggle
   - Search mode toggle
   - Save settings button

3. **Chats Tab Content:**
   - List of saved AI conversations
   - Each chat shows: name, preview, timestamp
   - Tap to load conversation
   - Swipe to delete
   - Search bar at top

4. **Mobile Bottom Navigation:**
   - Same 5-button layout as chat.html
   - Chats, Feed, AI (active), Profile, Settings
   - Compact icons (20px) and text (9px)
   - No horizontal scrolling
   - Bottom padding for phone safe area

5. **Header Optimization:**
   - Hide unnecessary icons on mobile
   - Keep: back button, AI avatar, save, new chat
   - Remove: history, settings (moved to sidebar)

6. **Input Area:**
   - Hide emoji/poll/voice buttons
   - Move to attachment menu (+ button)
   - Fixed at bottom with proper padding

7. **Swipe Gestures:**
   - Swipe RIGHT: open sidebar from left
   - Swipe LEFT: close sidebar
   - Prevent conflicts with bottom nav

---

## Phase 2: Settings Mobile Optimization

### Key Changes:
1. **Responsive Layout:**
   - Single column on mobile
   - Larger touch targets (min 44px)
   - More spacing between elements

2. **Section Cards:**
   - Each settings section in a card
   - Collapsible sections with expand/collapse
   - Icons for each section

3. **Form Elements:**
   - Larger input fields
   - Better spacing
   - Mobile-friendly toggles and sliders

4. **Navigation:**
   - Add mobile bottom nav (same as chat.html)
   - Sticky header with back button

5. **Optimizations:**
   - Hide desktop-only features
   - Simplify complex layouts
   - Touch-friendly buttons

---

## Phase 3: Feed Mobile Optimization

### Key Changes:
1. **Card Layout:**
   - Full-width cards on mobile
   - Larger images
   - Better spacing

2. **Touch Interactions:**
   - Swipe to refresh
   - Pull to load more
   - Tap to expand posts

3. **Navigation:**
   - Add mobile bottom nav
   - Sticky header

4. **Media Handling:**
   - Responsive images
   - Video player optimization
   - Lazy loading

5. **Filters:**
   - Collapsible filter menu
   - Bottom sheet for filters on mobile

---

## Implementation Notes

### CSS Classes to Add:
```css
/* Mobile sidebar animations */
.sidebar-slide-in-left {
    transform: translateX(-100%);
    transition: transform 0.2s ease;
}

.sidebar-slide-in-left.open {
    transform: translateX(0);
}

/* Tab content animations */
.tab-content {
    transition: transform 0.2s ease, opacity 0.2s ease;
}

.tab-content.slide-out-left {
    transform: translateX(-100%);
    opacity: 0;
}

.tab-content.slide-in-right {
    transform: translateX(100%);
    opacity: 0;
}

.tab-content.active {
    transform: translateX(0);
    opacity: 1;
}
```

### JavaScript Functions Needed:
- `initMobileSidebar()` - Setup swipe gestures
- `toggleSidebar()` - Open/close sidebar
- `switchTab(tabName)` - Switch between tabs with animation
- `preventBottomNavScroll()` - Lock bottom nav
- `loadSavedChats()` - Load chat history
- `saveAISettings()` - Save AI configuration

---

## Testing Checklist

### AI Chat:
- [ ] Sidebar swipes open/close smoothly
- [ ] Tabs switch with slide animation
- [ ] Bottom nav doesn't scroll
- [ ] Settings save correctly
- [ ] Chats load and delete properly
- [ ] No conflicts between swipe gestures

### Settings:
- [ ] All sections accessible on mobile
- [ ] Forms work correctly
- [ ] Toggles and sliders responsive
- [ ] Save buttons work
- [ ] Navigation works

### Feed:
- [ ] Cards display correctly
- [ ] Images load properly
- [ ] Swipe to refresh works
- [ ] Filters accessible
- [ ] Navigation works

---

## File Modifications Required

1. **public/ai-chat.html** - Complete mobile restructure
2. **public/settings.html** - Add mobile responsive CSS
3. **public/feed.html** - Add mobile responsive CSS
4. **public/css/mobile-optimizations.css** - New file for shared mobile styles

---

## Priority Order

1. **HIGH**: AI Chat sidebar and navigation
2. **HIGH**: Bottom navigation for all pages
3. **MEDIUM**: Settings mobile layout
4. **MEDIUM**: Feed mobile layout
5. **LOW**: Advanced animations and transitions

