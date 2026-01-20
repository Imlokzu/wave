// Mobile device detection and redirect
(function() {
    function isMobileDevice() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        // Check for mobile devices
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobile = mobileRegex.test(userAgent);
        
        // Also check screen size
        const isSmallScreen = window.innerWidth <= 768;
        
        return isMobile || isSmallScreen;
    }
    
    function getMobileVersion(currentPath) {
        // Map desktop pages to mobile versions
        const pageMap = {
            '/chat.html': '/mobile/chat.html',
            '/ai-chat.html': '/mobile/aichat.html',
            '/profile.html': '/mobile/bio.html',
            '/feed.html': '/mobile/feed.html',
            '/music.html': '/mobile/playlist.html',
            '/settings.html': '/mobile/settings.html',
            '/': '/mobile/chat.html',
            '/index.html': '/mobile/chat.html'
        };
        
        return pageMap[currentPath] || null;
    }
    
    // Check if we should redirect
    if (isMobileDevice()) {
        const currentPath = window.location.pathname;
        const isAlreadyMobile = currentPath.includes('/mobile/');
        
        // Don't redirect chat.html if user is opening a specific chat/DM
        const hasChatContext = localStorage.getItem('currentDM') || localStorage.getItem('currentRoomCode');
        const isChatPage = currentPath === '/chat.html';
        
        // Only redirect if not already on mobile version and not opening a specific chat
        if (!isAlreadyMobile && !(isChatPage && hasChatContext)) {
            const mobilePath = getMobileVersion(currentPath);
            if (mobilePath) {
                // Preserve query parameters
                const search = window.location.search;
                window.location.href = mobilePath + search;
            }
        }
    }
})();
