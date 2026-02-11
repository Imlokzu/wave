/**
 * API Client - Handles all backend communication
 * LOCALHOST TESTING VERSION
 */

class APIClient {
  constructor(baseURL = '') {
    // API base URL - LOCALHOST for testing (use same origin as browser)
    this.baseURL = baseURL || window.location.origin;
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Generic request handler with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Add auth token if available
    let authToken = null;
    if (window.clerkAuth?.getToken) {
      authToken = await window.clerkAuth.getToken();
    }
    if (!authToken) {
      authToken = localStorage.getItem('authToken');
    }
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };
    
    if (authToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const config = {
      ...options,
      headers
    };

    console.log('[API] Request:', options.method || 'GET', url);

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      console.log('[API] Response:', response.status, data);

      // Track 401s in sessionStorage
      if (!window._api401Count) window._api401Count = 0;

      if (!response.ok) {
        // Only handle auth/session for 401/403
        if (response.status === 401 || response.status === 403) {
          window._api401Count = (window._api401Count || 0) + 1;
          // Clear auth data
          if (window.clerkAuth?.clearAuthStorage) {
            window.clerkAuth.clearAuthStorage();
          } else {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            localStorage.removeItem('nickname');
          }

          // Show session expired UI after 2 consecutive 401/403s
          if (window._api401Count >= 2) {
            if (!document.getElementById('session-expired-banner')) {
              const banner = document.createElement('div');
              banner.id = 'session-expired-banner';
              banner.style = 'position:fixed;top:0;left:0;width:100vw;background:#f87171;color:#fff;padding:16px 0;text-align:center;z-index:9999;font-size:1.1rem;font-family:inherit;box-shadow:0 2px 8px #0002;';
              banner.innerText = 'Your session has expired. Please log in again.';
              document.body.appendChild(banner);
            }
            setTimeout(() => {
              window.location.href = '/login.html';
            }, 2000);
          }

          // Avoid redirect loops when Clerk is active; let the caller handle it for first 401/403
          if (!window.clerkAuth && window._api401Count < 2) {
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('login.html')) {
              setTimeout(() => {
                window.location.href = '/login.html';
              }, 1000);
            }
          }
        } else {
          // Reset 401 count on other errors
          window._api401Count = 0;
        }
        // For non-auth errors, do NOT clear session or redirect
        throw new APIError(
          data.error?.message || data.error || 'Request failed',
          data.code || 'UNKNOWN_ERROR',
          response.status
        );
      } else {
        // Reset 401 count on success
        window._api401Count = 0;
      }

      return data;
    } catch (error) {
      console.error('[API] Error:', error);
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(
        error.message || 'Network error',
        'NETWORK_ERROR',
        0
      );
    }
  }

  // Room API
  async createRoom(maxUsers = 10) {
    return this.request('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ maxUsers })
    });
  }

  async getRoomInfo(code) {
    return this.request(`/api/rooms/${code}`);
  }

  async joinRoom(code, nickname) {
    return this.request(`/api/rooms/${code}/join`, {
      method: 'POST',
      body: JSON.stringify({ nickname })
    });
  }

  async leaveRoom(roomId, participantId) {
    return this.request(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ participantId })
    });
  }

  async lockRoom(roomId, userId) {
    return this.request(`/api/rooms/${roomId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  async unlockRoom(roomId, userId) {
    return this.request(`/api/rooms/${roomId}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // Message API
  async getMessages(roomId) {
    return this.request(`/api/rooms/${roomId}/messages`);
  }

  // Get messages with cache (2 minute expiry)
  async getMessagesCached(roomId) {
    const cacheKey = `msg_${roomId}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_t`);
    
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 120000) {
      console.log('[API] Using cached messages for:', roomId);
      return JSON.parse(cached);
    }
    
    const result = await this.getMessages(roomId);
    localStorage.setItem(cacheKey, JSON.stringify(result));
    localStorage.setItem(`${cacheKey}_t`, Date.now().toString());
    return result;
  }

  // Clear message cache for a room
  invalidateMessageCache(roomId) {
    localStorage.removeItem(`msg_${roomId}`);
    localStorage.removeItem(`msg_${roomId}_t`);
  }

  async clearMessages(roomId, preserveSystem = true) {
    return this.request(`/api/rooms/${roomId}/clear`, {
      method: 'POST',
      body: JSON.stringify({ preserveSystem })
    });
  }

  async editMessage(messageId, userId, content) {
    return this.request(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, content })
    });
  }

  async deleteMessage(messageId, userId, isModerator = false) {
    return this.request(`/api/messages/${messageId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, isModerator })
    });
  }

  async pinMessage(messageId, userId, isModerator) {
    return this.request(`/api/messages/${messageId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ userId, isModerator })
    });
  }

  async unpinMessage(messageId, userId, isModerator) {
    return this.request(`/api/messages/${messageId}/pin`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, isModerator })
    });
  }

  async addReaction(messageId, userId, emoji) {
    return this.request(`/api/messages/${messageId}/react`, {
      method: 'POST',
      body: JSON.stringify({ userId, emoji })
    });
  }

  async removeReaction(messageId, userId, emoji) {
    return this.request(`/api/messages/${messageId}/react`, {
      method: 'DELETE',
      body: JSON.stringify({ userId, emoji })
    });
  }

  // File Upload API
  async uploadImage(roomId, senderId, senderNickname, file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('senderId', senderId);
    formData.append('senderNickname', senderNickname);

    return this.request(`/api/rooms/${roomId}/image`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData
    });
  }

  async uploadFile(roomId, senderId, senderNickname, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('senderId', senderId);
    formData.append('senderNickname', senderNickname);

    return this.request(`/api/rooms/${roomId}/file`, {
      method: 'POST',
      headers: {},
      body: formData
    });
  }

  async uploadVoice(roomId, senderId, senderNickname, blob, duration) {
    const formData = new FormData();
    formData.append('voice', blob, 'voice.webm');
    formData.append('senderId', senderId);
    formData.append('senderNickname', senderNickname);
    formData.append('duration', duration.toString());

    return this.request(`/api/rooms/${roomId}/voice`, {
      method: 'POST',
      headers: {},
      body: formData
    });
  }

  // Poll API
  async createPoll(roomId, senderId, senderNickname, question, options, allowMultiple = false) {
    return this.request(`/api/rooms/${roomId}/poll`, {
      method: 'POST',
      body: JSON.stringify({
        senderId,
        senderNickname,
        question,
        options,
        allowMultiple
      })
    });
  }

  async votePoll(messageId, userId, optionId) {
    return this.request(`/api/messages/${messageId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ userId, optionId })
    });
  }

  async closePoll(messageId, userId) {
    return this.request(`/api/messages/${messageId}/close`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  }

  // Health Check
  async healthCheck() {
    return this.request('/health');
  }

  // DM Conversations API
  async getMyConversations() {
    const userId = localStorage.getItem('userId');
    if (!userId) return { success: false, data: [] };
    
    // Check cache first (5 minute expiry)
    const cacheKey = `conversations_${userId}`;
    const cached = localStorage.getItem(cacheKey);
    const cacheTime = localStorage.getItem(`${cacheKey}_t`);
    
    if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < 300000) {
      console.log('[API] Using cached conversations');
      return JSON.parse(cached);
    }
    
    try {
      const result = await this.request(`/api/dms/conversations/${userId}`);
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(`${cacheKey}_t`, Date.now().toString());
      return result;
    } catch (err) {
      console.error('[API] Failed to load conversations:', err);
      return { success: false, data: [] };
    }
  }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
  }
}

// Export singleton instance
const api = new APIClient();

// Make available globally
window.api = api;
