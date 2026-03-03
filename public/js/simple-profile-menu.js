// Simple Profile Menu - Just Works™

console.log('[Simple Profile Menu] Loading...');

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileMenu);
} else {
    initProfileMenu();
}

function initProfileMenu() {
    console.log('[Simple Profile Menu] Initializing...');

    // Create menu HTML
    const menuHTML = `
    <div id="simple-profile-menu" style="display: none; position: fixed; z-index: 10000; background: #1a2128; border: 1px solid #2a3440; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); min-width: 240px; padding: 8px;">
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px;">
            <img id="menu-avatar" src="" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #3b82f6; object-fit: cover;">
            <div>
                <div id="menu-username" style="font-weight: 600; color: white; font-size: 14px;"></div>
                <div style="font-size: 12px; color: #22c55e;">Online</div>
            </div>
        </div>
        <div style="height: 1px; background: #2a3440; margin: 8px 0;"></div>
        <button onclick="window.viewProfile()" style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: transparent; border: none; border-radius: 8px; color: white; font-size: 14px; cursor: pointer; text-align: left;" onmouseover="this.style.background='rgba(59,130,246,0.1)'" onmouseout="this.style.background='transparent'">
            <span class="material-symbols-outlined" style="font-size: 20px; width: 24px; text-align: center;">person</span>
            <span>View Profile</span>
        </button>
        <button onclick="window.sendDM()" style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: transparent; border: none; border-radius: 8px; color: white; font-size: 14px; cursor: pointer; text-align: left;" onmouseover="this.style.background='rgba(59,130,246,0.1)'" onmouseout="this.style.background='transparent'">
            <span class="material-symbols-outlined" style="font-size: 20px; width: 24px; text-align: center;">chat_bubble</span>
            <span>Send Message</span>
        </button>
        <button onclick="window.addFriend()" style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: transparent; border: none; border-radius: 8px; color: white; font-size: 14px; cursor: pointer; text-align: left;" onmouseover="this.style.background='rgba(59,130,246,0.1)'" onmouseout="this.style.background='transparent'">
            <span class="material-symbols-outlined" style="font-size: 20px; width: 24px; text-align: center;">person_add</span>
            <span>Add Friend</span>
        </button>
    </div>
    `;

    // Add menu to page
    document.body.insertAdjacentHTML('beforeend', menuHTML);

    const menu = document.getElementById('simple-profile-menu');
    let currentUsername = null;

    // Show menu
    window.showProfileMenu = async function(username, x, y) {
        console.log('[Simple Profile Menu] Showing for:', username, 'at position:', x, y);
        currentUsername = username;
        
        // Update menu content
        document.getElementById('menu-username').textContent = username;
        
        // Load profile picture from bio profile
        if (window.profilePictureService) {
            const avatarUrl = await window.profilePictureService.getProfilePicture(username);
            document.getElementById('menu-avatar').src = avatarUrl;
        } else {
            // Fallback to default
            document.getElementById('menu-avatar').src = `data:image/svg+xml,${encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <circle fill="#3b82f6" cx="50" cy="50" r="50"/>
                    <text x="50" y="65" text-anchor="middle" fill="white" font-size="40">${username.charAt(0).toUpperCase()}</text>
                </svg>
            `)}`;
        }
        
        // Position menu first (before showing)
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        
        // Show menu
        menu.style.display = 'block';
        
        console.log('[Simple Profile Menu] Menu displayed at:', menu.style.left, menu.style.top);
        console.log('[Simple Profile Menu] Menu element:', menu);
    };

    // Hide menu
    window.hideProfileMenu = function() {
        menu.style.display = 'none';
        currentUsername = null;
    };

    // Menu actions
    window.viewProfile = function() {
        if (currentUsername) {
            window.open(`/bio/${currentUsername}`, '_blank');
        }
        window.hideProfileMenu();
    };

    window.sendDM = function() {
        alert(`DM feature coming soon! Would open chat with ${currentUsername}`);
        window.hideProfileMenu();
    };

    window.addFriend = function() {
        alert(`Friend system coming soon! Would add ${currentUsername} as friend`);
        window.hideProfileMenu();
    };

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#simple-profile-menu') && !e.target.closest('[data-profile-click]')) {
            window.hideProfileMenu();
        }
    });

    // Make any image clickable
    window.makeProfileClickable = async function(img, username) {
        console.log('[Simple Profile Menu] Making clickable:', username);
        img.setAttribute('data-profile-click', 'true');
        img.setAttribute('data-username', username);
        img.style.cursor = 'pointer';
        
        // Load profile picture from bio profile
        if (window.profilePictureService) {
            const avatarUrl = await window.profilePictureService.getProfilePicture(username);
            img.src = avatarUrl;
        }
        
        // Use addEventListener instead of onclick to avoid conflicts
        img.addEventListener('click', function(e) {
            console.log('[Simple Profile Menu] Avatar clicked:', username);
            e.stopPropagation();
            e.preventDefault();
            const rect = img.getBoundingClientRect();
            window.showProfileMenu(username, rect.right + 10, rect.top);
        });
    };

    console.log('[Simple Profile Menu] Ready!');
    console.log('[Simple Profile Menu] Functions available:', {
        showProfileMenu: typeof window.showProfileMenu,
        hideProfileMenu: typeof window.hideProfileMenu,
        makeProfileClickable: typeof window.makeProfileClickable
    });
}
