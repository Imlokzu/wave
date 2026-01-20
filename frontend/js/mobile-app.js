// Mobile App - Shared functionality for mobile pages
// Uses the same backend APIs as desktop version

class MobileApp {
    constructor() {
        this.socket = null;
        this.userId = localStorage.getItem('userId');
        this.username = localStorage.getItem('username');
        this.authToken = localStorage.getItem('authToken');
    }

    // Check authentication
    checkAuth() {
        if (!this.authToken) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    // Initialize Socket.IO connection
    initSocket() {
        if (!this.socket) {
            this.socket = io(window.API_URL);
            this.socket.emit('user:setup', { userId: this.userId });
        }
        return this.socket;
    }

    // API call helper
    async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.authToken}`
            }
        };

        const response = await fetch(endpoint, { ...defaultOptions, ...options });
        
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }

        return response.json();
    }

    // Format time ago
    timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
        
        return new Date(date).toLocaleDateString();
    }

    // Navigate to page
    navigate(page) {
        window.location.href = `/mobile/${page}`;
    }
}

// Create global instance
window.mobileApp = new MobileApp();
