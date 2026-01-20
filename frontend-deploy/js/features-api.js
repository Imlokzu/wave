/**
 * Features API Module
 * Handles API calls for AI, Profile, Music, and Settings pages
 */

// API base URL - always use production
const API_BASE = 'https://api.metrocraft.eu';

// Get auth token
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Get auth headers
function getAuthHeaders() {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// ============================================================================
// AI API
// ============================================================================

async function sendAIMessage(content) {
    const apiKey = localStorage.getItem('openRouterApiKey');
    const preferredModel = localStorage.getItem('preferredAIModel') || 'auto';
    const headers = getAuthHeaders();
    
    // Add API key if available
    if (apiKey) {
        headers['X-API-Key'] = apiKey;
    }
    
    const response = await fetch(`${API_BASE}/api/ai/message`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
            content,
            model: preferredModel
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send AI message');
    }
    
    return await response.json();
}

async function getAIStatus() {
    const response = await fetch(`${API_BASE}/api/ai/status`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get AI status');
    }
    
    return await response.json();
}

async function getAIHelp() {
    const response = await fetch(`${API_BASE}/api/ai/help`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get AI help');
    }
    
    return await response.json();
}


// ============================================================================
// Profile API
// ============================================================================

async function getMyProfile() {
    const response = await fetch(`${API_BASE}/api/profile/me`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get profile');
    }
    
    return await response.json();
}

async function updateBio(bio) {
    const response = await fetch(`${API_BASE}/api/profile/bio`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bio })
    });
    
    if (!response.ok) {
        throw new Error('Failed to update bio');
    }
    
    return await response.json();
}

async function updateTheme(primaryColor, accentColor) {
    const response = await fetch(`${API_BASE}/api/profile/theme`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ primaryColor, accentColor })
    });
    
    if (!response.ok) {
        throw new Error('Failed to update theme');
    }
    
    return await response.json();
}

async function addSocialLink(platform, url) {
    const response = await fetch(`${API_BASE}/api/profile/social-link`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform, url })
    });
    
    if (!response.ok) {
        throw new Error('Failed to add social link');
    }
    
    return await response.json();
}

// ============================================================================
// Music API
// ============================================================================

async function getUserPlaylists() {
    const response = await fetch(`${API_BASE}/api/music/playlists`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get playlists');
    }
    
    return await response.json();
}

async function getPlaylist(playlistId) {
    const response = await fetch(`${API_BASE}/api/music/playlist/${playlistId}`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get playlist');
    }
    
    return await response.json();
}

async function createPlaylist(name, description, isPublic) {
    const response = await fetch(`${API_BASE}/api/music/playlist`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, description, isPublic })
    });
    
    if (!response.ok) {
        throw new Error('Failed to create playlist');
    }
    
    return await response.json();
}

async function streamTrack(trackId) {
    const response = await fetch(`${API_BASE}/api/music/stream/${trackId}`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to stream track');
    }
    
    return await response.json();
}

async function uploadTrack(file, isPublic = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPublic', isPublic.toString());

    const response = await fetch(`${API_BASE}/api/music/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload track');
    }
    return await response.json();
}

async function getUserTracks() {
    const response = await fetch(`${API_BASE}/api/music/tracks`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get tracks');
    }
    
    return await response.json();
}

async function downloadTrack(trackId) {
    const response = await fetch(`${API_BASE}/api/music/download/${trackId}`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download track');
    }
    
    return await response.blob();
}

async function deleteTrack(trackId) {
    const response = await fetch(`${API_BASE}/api/music/track/${trackId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to delete track');
    }
    
    return await response.json();
}

async function addTrackToPlaylist(playlistId, trackId) {
    const response = await fetch(`${API_BASE}/api/music/playlist/${playlistId}/track`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ trackId })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add track to playlist');
    }
    
    return await response.json();
}

// ============================================================================
// Subscription API
// ============================================================================

async function getSubscriptionStatus() {
    const response = await fetch(`${API_BASE}/api/subscription/status`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to get subscription status');
    }
    
    return await response.json();
}

async function upgradeToPro() {
    const response = await fetch(`${API_BASE}/api/subscription/upgrade`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to upgrade to Pro');
    }
    
    return await response.json();
}

async function downgradeToFree() {
    const response = await fetch(`${API_BASE}/api/subscription/downgrade`, {
        method: 'POST',
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to downgrade');
    }
    
    return await response.json();
}

async function checkFeatureAccess(featureName) {
    const response = await fetch(`${API_BASE}/api/subscription/feature/${featureName}`, {
        headers: getAuthHeaders()
    });
    
    if (!response.ok) {
        throw new Error('Failed to check feature access');
    }
    
    return await response.json();
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has Pro subscription
 * @returns {Promise<boolean>} True if user is Pro
 */
async function isProUser() {
    try {
        const status = await getSubscriptionStatus();
        return status.isPro || false;
    } catch (error) {
        console.error('Failed to check Pro status:', error);
        return false;
    }
}

/**
 * Show upgrade prompt for Pro features
 * @param {string} featureName - Name of the feature requiring Pro
 */
function showProUpgradePrompt(featureName = 'This feature') {
    if (confirm(`🌟 ${featureName} is a Pro feature!\n\nWould you like to upgrade to Wave Pro?`)) {
        window.location.href = '/settings.html';
    }
}
