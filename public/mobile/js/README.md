# Mobile JavaScript Modules

This directory contains mobile-specific JavaScript modules for Wave Messenger's mobile web interface. These modules provide mobile-optimized UI components and touch gesture handling.

## Directory Structure

```
/public/mobile/js/
├── index.js              # Main entry point, exports all modules
├── mobile-ui.js          # Base UI component classes and utilities
├── touch-handlers.js     # Touch gesture detection and handling
└── README.md            # This file
```

## Modules

### mobile-ui.js

Provides base classes and utilities for building mobile UI components.

**Classes:**
- `MobileUIComponent` - Base class for all mobile UI components with lifecycle management
- `MobileUIUtils` - Collection of utility functions for mobile UI

**Features:**
- Component lifecycle management (render, setState, destroy)
- Event listener tracking and cleanup
- DOM element creation helpers
- HTML sanitization for XSS prevention
- Time formatting utilities
- Loading, error, and empty state helpers
- Screen size and orientation detection
- Debounce and throttle utilities
- Clipboard operations
- Toast notifications

**Usage Example:**
```javascript
class MyChatList extends MobileUIComponent {
    constructor(containerId) {
        super(containerId);
        this.state = {
            conversations: [],
            loading: true
        };
    }
    
    render() {
        if (this.state.loading) {
            this.showLoading();
            return;
        }
        
        const list = this.createElement('div', { className: 'chat-list' });
        this.state.conversations.forEach(conv => {
            const item = this.createElement('div', {
                className: 'chat-item',
                onClick: () => this.selectChat(conv.id)
            }, conv.name);
            list.appendChild(item);
        });
        
        this.container.innerHTML = '';
        this.container.appendChild(list);
    }
    
    selectChat(chatId) {
        console.log('Selected chat:', chatId);
    }
}

// Create instance
const chatList = new MyChatList('chat-list-container');
chatList.render();
```

### touch-handlers.js

Provides touch gesture detection and handling for mobile interactions.

**Classes:**
- `TouchHandler` - Comprehensive touch gesture handler
- `LongPressDetector` - Simplified long-press detection
- `SwipeDetector` - Simplified swipe detection
- `PullToRefresh` - Pull-to-refresh gesture implementation

**Supported Gestures:**
- Tap (single tap)
- Double tap
- Long press (press and hold)
- Swipe (left, right, up, down)
- Slide (continuous movement tracking)

**Usage Example:**
```javascript
// Using TouchHandler for comprehensive gesture detection
const messageElement = document.getElementById('message-123');
const touchHandler = new TouchHandler(messageElement);

touchHandler
    .on('tap', (event) => {
        console.log('Message tapped at', event.x, event.y);
    })
    .on('longPress', (event) => {
        console.log('Long press detected, show context menu');
        showContextMenu(event.x, event.y);
    })
    .on('swipeLeft', (event) => {
        console.log('Swiped left, show delete option');
    });

// Using LongPressDetector for simple long-press
const button = document.getElementById('record-button');
const longPress = new LongPressDetector(button, (event) => {
    console.log('Start recording voice message');
    startRecording();
}, 500);

// Using SwipeDetector for swipe gestures
const chatList = document.getElementById('chat-list');
const swipe = new SwipeDetector(chatList, {
    threshold: 50,
    onSwipeLeft: () => console.log('Swipe left to archive'),
    onSwipeRight: () => console.log('Swipe right to mark as read')
});

// Using PullToRefresh
const container = document.getElementById('messages-container');
const pullToRefresh = new PullToRefresh(container, (done) => {
    // Refresh data
    fetchNewMessages().then(() => {
        done(); // Call done when refresh is complete
    });
}, { threshold: 80 });
```

## Integration with Existing Code

These modules are designed to work alongside the existing Wave Messenger codebase:

**Reusable Modules (from /public/js/):**
- `api.js` - API client for backend communication
- `socket.js` - Socket.IO manager for real-time features
- `state.js` - State management
- `utils.js` - General utility functions

**Mobile-Specific Modules (this directory):**
- `mobile-ui.js` - Mobile UI components
- `touch-handlers.js` - Touch gesture handling

## Loading Modules

### Option 1: Script Tags (Recommended for now)

```html
<!-- Load in order -->
<script src="/js/api.js"></script>
<script src="/js/socket.js"></script>
<script src="/js/state.js"></script>
<script src="/mobile/js/mobile-ui.js"></script>
<script src="/mobile/js/touch-handlers.js"></script>
<script src="/mobile/js/index.js"></script>
```

### Option 2: ES6 Modules (Future)

```javascript
import { MobileUIComponent, MobileUIUtils } from '/mobile/js/mobile-ui.js';
import { TouchHandler, LongPressDetector } from '/mobile/js/touch-handlers.js';
```

## Design Principles

1. **Mobile-First**: All components are optimized for touch interactions and small screens
2. **Progressive Enhancement**: Core functionality works first, then enhanced features
3. **Reusability**: Components can be extended and composed
4. **Performance**: Efficient event handling and DOM manipulation
5. **Accessibility**: Touch targets meet 44x44px minimum size requirement
6. **Responsive**: Adapts to different screen sizes (phone vs tablet)

## Requirements Mapping

These modules implement the following requirements from the mobile-feature-parity spec:

- **Requirement 20.1**: Single-column layout for phones, two-column for tablets
- **Requirement 20.2**: Responsive layout adaptation based on screen size
- **Requirement 20.3**: Touch targets at least 44x44 pixels
- **Requirement 20.4**: Portrait and landscape orientation support
- **Requirement 20.5**: Adaptive font sizes and spacing

## Testing

Unit tests for these modules will be created in subsequent tasks. The modules are designed to be testable with:

- Unit tests for individual functions and methods
- Integration tests for component interactions
- Property-based tests for gesture detection accuracy

## Next Steps

The following components will be built on top of these base modules:

1. MobileChatList - Chat list with DM/Room tabs
2. MobileConversationView - Message display and scrolling
3. MobileMessageComposer - Message input with attachments
4. FileUploadHandler - File upload with progress
5. VoiceRecorder - Voice message recording
6. ThemeManager - Theme customization
7. ContextMenu - Message action menu
8. And more...

## Contributing

When adding new mobile components:

1. Extend `MobileUIComponent` for UI components
2. Use `TouchHandler` or its simplified variants for gesture detection
3. Follow the existing code style and patterns
4. Document public APIs with JSDoc comments
5. Add unit tests for new functionality
6. Update this README with new components

## Browser Compatibility

These modules are designed to work on:

- Chrome/Edge (latest 2 versions)
- Safari iOS (latest 2 versions)
- Firefox (latest 2 versions)
- Samsung Internet (latest version)

Minimum requirements:
- ES6 support (classes, arrow functions, template literals)
- Touch events API
- Modern DOM APIs (querySelector, classList, etc.)
