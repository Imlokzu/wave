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
        // NOTE: chat.html and ai-chat.html are intentionally excluded - mobile users get desktop version (responsive)
        const pageMap = {
            '/profile.html': '/mobile/bio.html',
            '/feed.html': '/mobile/feed.html',
            '/music.html': '/mobile/playlist.html',
            '/': '/chat.html',
            '/index.html': '/chat.html'
        };
        
        return pageMap[currentPath] || null;
    }
    
    // Check if we should redirect
    if (isMobileDevice()) {
        const currentPath = window.location.pathname;
        const isAlreadyMobile = currentPath.includes('/mobile/');
        
        // Only redirect if not already on mobile version
        if (!isAlreadyMobile) {
            const mobilePath = getMobileVersion(currentPath);
            if (mobilePath) {
                // Preserve query parameters
                const search = window.location.search;
                window.location.href = mobilePath + search;
            }
        }
    }
})();
