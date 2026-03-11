/**
 * Profile Picture Service
 * Manages profile pictures across the app
 */

console.log('[Profile Picture Service] Loading...');

class ProfilePictureService {
    constructor() {
        this.cache = new Map();
        this.defaultAvatar = this.generateDefaultAvatar();
    }

    /**
     * Get profile picture URL for a user
     */
    async getProfilePicture(username) {
        // Check cache first
        if (this.cache.has(username)) {
            return this.cache.get(username);
        }

        try {
            // First, try to fetch from bio profile (new system)
            const bioResponse = await fetch(`/api/bio-profile/${username}`);
            if (bioResponse.ok) {
                const data = await bioResponse.json();
                if (data.profile && data.profile.avatarUrl) {
                    this.cache.set(username, data.profile.avatarUrl);
                    return data.profile.avatarUrl;
                }
            }
        } catch (error) {
            console.log('[Profile Picture Service] Could not fetch bio profile for:', username);
        }

        try {
            // Fallback to old avatar system (flux_users.avatar_url)
            const userResponse = await fetch(`/api/users/${username}/avatar`);
            if (userResponse.ok) {
                const data = await userResponse.json();
                if (data.avatarUrl) {
                    this.cache.set(username, data.avatarUrl);
                    return data.avatarUrl;
                }
            }
        } catch (error) {
            console.log('[Profile Picture Service] Could not fetch user avatar for:', username);
        }

        // Fallback to default avatar with username initial
        const avatar = this.generateDefaultAvatar(username);
        this.cache.set(username, avatar);
        return avatar;
    }

    /**
     * Generate default avatar (colored circle with initial)
     */
    generateDefaultAvatar(username = '?') {
        const initial = username.charAt(0).toUpperCase();
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
        const color = colors[username.length % colors.length];
        
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle fill="${color}" cx="50" cy="50" r="50"/>
                <text x="50" y="65" text-anchor="middle" fill="white" font-size="40" font-family="Arial">${initial}</text>
            </svg>
        `)}`;
    }

    /**
     * Update current user's profile picture
     */
    updateMyProfilePicture(url) {
        const username = localStorage.getItem('username');
        if (username) {
            this.cache.set(username, url);
            // Update all instances in the DOM
            this.refreshAllProfilePictures(username);
        }
    }

    /**
     * Refresh all profile pictures for a user in the DOM
     */
    refreshAllProfilePictures(username) {
        const pics = document.querySelectorAll(`[data-username="${username}"]`);
        pics.forEach(async (img) => {
            const url = await this.getProfilePicture(username);
            img.src = url;
        });
    }
}

// Global instance (only create once)
if (!window.profilePictureService) {
    window.profilePictureService = new ProfilePictureService();
}
