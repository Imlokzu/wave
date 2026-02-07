/**
 * Simple Auth Guard for Testing
 * Provides basic authentication tokens for development
 * @version 1.0.0
 */

(function() {
    'use strict';
    
    console.log('[AuthGuard] Simple auth guard loaded for development');
    
    // Always create fresh tokens for development
    console.log('[AuthGuard] Creating fresh development tokens');
    
    // Generate a simple development token
    const devToken = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    
    // Store the token immediately
    localStorage.setItem('auth_token', devToken);
    localStorage.setItem('token', devToken);
    
    // Create a basic user object for development
    const devUser = {
        id: 'dev_user_' + Math.random().toString(36).substr(2, 5),
        username: 'Developer',
        email: 'dev@example.com',
        avatar: null,
        isDev: true
    };
    
    localStorage.setItem('user_data', JSON.stringify(devUser));
    localStorage.setItem('currentUser', JSON.stringify(devUser));
    
    console.log('[AuthGuard] Development token and user created:', {
        token: devToken.substr(0, 10) + '...',
        user: devUser.username
    });
    
    // Mark auth as completed
    window.authGuard = {
        completed: true,
        token: devToken,
        user: devUser
    };
    
    // Simulate auth completion event immediately
    window.dispatchEvent(new CustomEvent('authComplete', {
        detail: {
            token: devToken,
            user: devUser
        }
    }));
    
})();