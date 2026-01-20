/**
 * API Client - Handles all backend communication
 * LOCALHOST TESTING VERSION
 */

class APIClient {
  constructor(baseURL = '') {
    // API base URL - LOCALHOST for testing
    this.baseURL = baseURL || 'http://localhost:3001';
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
    const authToken = localStorage.getItem('authToken');
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

      if (!response.ok) {
        // Handle auth errors
        if (response.status === 401) {
          // Clear auth data and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('username');
          localStorage.removeItem('nickname');
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('login.html')) {
            setTimeout(() => {
              window.location.href = '/login.html';
            }, 1000);
          }
        }
        
        throw new APIError(
          data.error?.message || data.error || 'Request failed',
          data.code || 'UNKNOWN_ERROR',
          response.status
        );
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
