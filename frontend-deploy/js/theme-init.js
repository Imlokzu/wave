/**
 * WAVE Messenger - Theme Initialization
 * Apply theme immediately to prevent flash
 */
(function() {
    const theme = localStorage.getItem('theme') || 'dark';
    const html = document.documentElement;
    
    function applyTheme(isDark) {
        if (isDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        
        // Update all logo images
        updateLogos(isDark);
    }
    
    function updateLogos(isDark) {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => updateLogos(isDark));
            return;
        }
        
        const logoSrc = isDark ? '/wavechat.png' : '/lightwave.png';
        
        // Update all images with class 'theme-logo'
        document.querySelectorAll('img.theme-logo, img[data-theme-logo]').forEach(img => {
            img.src = logoSrc;
        });
    }
    
    if (theme === 'dark') {
        applyTheme(true);
    } else if (theme === 'light') {
        applyTheme(false);
    } else if (theme === 'auto') {
        // Auto mode - use system preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(isDark);
    }
    
    // Listen for system theme changes in auto mode
    if (theme === 'auto') {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (localStorage.getItem('theme') === 'auto') {
                applyTheme(e.matches);
            }
        });
    }
    
    // Export function for manual theme changes
    window.updateThemeLogos = function() {
        const isDark = html.classList.contains('dark');
        updateLogos(isDark);
    };
})();
