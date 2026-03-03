/**
 * Profile Context Menu
 * Shows options when clicking on a profile picture
 */

console.log('[Profile Context Menu] Script loading...');

class ProfileContextMenu {
    constructor() {
        console.log('[Profile Context Menu] Initializing...');
        this.menu = null;
        this.currentUsername = null;
        this.init();
        console.log('[Profile Context Menu] Initialized successfully');
    }

    init() {
        // Create menu element
        this.menu = document.createElement('div');
        this.menu.id = 'profile-context-menu';
        this.menu.className = 'profile-context-menu hidden';
        this.menu.innerHTML = `
            <div class="menu-header">
                <img class="menu-avatar" src="" alt="Avatar">
                <div class="menu-user-info">
                    <div class="menu-username"></div>
                    <div class="menu-status">Online</div>
                </div>
            </div>
            <div class="menu-divider"></div>
            <button class="menu-item" data-action="view-profile">
                <span class="menu-icon">👤</span>
                <span>View Profile</span>
            </button>
            <button class="menu-item" data-action="send-dm">
                <span class="menu-icon">💬</span>
                <span>Send Message</span>
            </button>
            <button class="menu-item" data-action="add-friend">
                <span class="menu-icon">➕</span>
                <span>Add Friend</span>
            </button>
            <button class="menu-item" data-action="invite-room">
                <span class="menu-icon">📨</span>
                <span>Invite to Room</span>
            </button>
        `;
        document.body.appendChild(this.menu);

        // Add styles
        this.addStyles();

        // Event listeners
        this.menu.addEventListener('click', (e) => {
            const item = e.target.closest('.menu-item');
            if (item) {
                const action = item.dataset.action;
                this.handleAction(action);
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-context-menu') && !e.target.closest('[data-profile-menu]')) {
                this.hide();
            }
        });
    }

    addStyles() {
        if (document.getElementById('profile-context-menu-styles')) return;

        const style = document.createElement('style');
        style.id = 'profile-context-menu-styles';
        style.textContent = `
            .profile-context-menu {
                position: fixed;
                z-index: 10000;
                background: #1a2128;
                border: 1px solid #2a3440;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                min-width: 240px;
                padding: 8px;
                backdrop-filter: blur(20px);
            }

            .profile-context-menu.hidden {
                display: none;
            }

            .menu-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
            }

            .menu-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid #3b82f6;
                object-fit: cover;
            }

            .menu-user-info {
                flex: 1;
            }

            .menu-username {
                font-weight: 600;
                color: white;
                font-size: 14px;
            }

            .menu-status {
                font-size: 12px;
                color: #22c55e;
            }

            .menu-divider {
                height: 1px;
                background: #2a3440;
                margin: 8px 0;
            }

            .menu-item {
                width: 100%;
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 12px;
                background: transparent;
                border: none;
                border-radius: 8px;
                color: white;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
                text-align: left;
            }

            .menu-item:hover {
                background: rgba(59, 130, 246, 0.1);
            }

            .menu-icon {
                font-size: 18px;
                width: 24px;
                text-align: center;
            }

            [data-profile-menu] {
                cursor: pointer;
                transition: transform 0.2s;
            }

            [data-profile-menu]:hover {
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
    }

    async show(username, x, y) {
        console.log('[Profile Context Menu] Showing menu for:', username, 'at', x, y);
        this.currentUsername = username;

        // Update menu content
        const avatar = await window.profilePictureService.getProfilePicture(username);
        this.menu.querySelector('.menu-avatar').src = avatar;
        this.menu.querySelector('.menu-username').textContent = username;

        // Position menu
        this.menu.classList.remove('hidden');
        console.log('[Profile Context Menu] Menu visible');
        
        // Adjust position to keep menu on screen
        const rect = this.menu.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        
        this.menu.style.left = Math.min(x, maxX) + 'px';
        this.menu.style.top = Math.min(y, maxY) + 'px';
        console.log('[Profile Context Menu] Positioned at:', this.menu.style.left, this.menu.style.top);
    }

    hide() {
        this.menu.classList.add('hidden');
        this.currentUsername = null;
    }

    handleAction(action) {
        const username = this.currentUsername;
        this.hide();

        switch (action) {
            case 'view-profile':
                window.open(`/bio/${username}`, '_blank');
                break;

            case 'send-dm':
                // TODO: Open DM with user
                console.log('Send DM to:', username);
                alert(`DM feature coming soon! Would open chat with ${username}`);
                break;

            case 'add-friend':
                // TODO: Add friend
                console.log('Add friend:', username);
                alert(`Friend system coming soon! Would add ${username} as friend`);
                break;

            case 'invite-room':
                // TODO: Invite to current room
                console.log('Invite to room:', username);
                alert(`Invite feature coming soon! Would invite ${username} to current room`);
                break;
        }
    }
}

// Initialize when DOM is ready (only once)
console.log('[Profile Context Menu] Checking initialization...', {
    exists: !!window.profileContextMenu,
    readyState: document.readyState
});

if (!window.profileContextMenu) {
    if (document.readyState === 'loading') {
        console.log('[Profile Context Menu] Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', () => {
            if (!window.profileContextMenu) {
                console.log('[Profile Context Menu] Creating instance (DOMContentLoaded)...');
                window.profileContextMenu = new ProfileContextMenu();
            }
        });
    } else {
        console.log('[Profile Context Menu] Creating instance (immediate)...');
        window.profileContextMenu = new ProfileContextMenu();
    }
} else {
    console.log('[Profile Context Menu] Already initialized');
}

console.log('[Profile Context Menu] Final check:', window.profileContextMenu);


/**
 * Helper function to make any image a profile menu trigger
 */
function makeProfileMenuTrigger(img, username) {
    if (!img || !username) {
        console.error('[Profile Menu] Invalid parameters:', { img, username });
        return;
    }
    
    console.log('[Profile Menu] Adding trigger for:', username);
    
    img.setAttribute('data-profile-menu', 'true');
    img.setAttribute('data-username', username);
    img.style.cursor = 'pointer';
    
    // Remove any existing click handlers
    const newImg = img.cloneNode(true);
    if (img.parentNode) {
        img.parentNode.replaceChild(newImg, img);
    }
    
    newImg.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('[Profile Menu] Clicked on:', username);
        
        if (!window.profileContextMenu) {
            console.error('[Profile Menu] Context menu not initialized!');
            return;
        }
        
        const rect = newImg.getBoundingClientRect();
        window.profileContextMenu.show(username, rect.right + 10, rect.top);
    });
    
    return newImg;
}

window.makeProfileMenuTrigger = makeProfileMenuTrigger;
