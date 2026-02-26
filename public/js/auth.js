/**
 * Simple Authentication Helper
 * Handles login, signup, and magic link authentication
 */

const AUTH_API = window.location.origin;

// Get stored auth token
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getAuthToken();
}

// Get auth headers for API requests
function getAuthHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

// Login with username and password
async function login(username, password) {
  const response = await fetch(`${AUTH_API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const data = await response.json();
  
  // Store auth data
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userId', data.user.id);
  localStorage.setItem('username', data.user.username);
  localStorage.setItem('nickname', data.user.nickname);
  
  return data;
}

// Signup with username, nickname, password, and email
async function signup(username, nickname, password, email) {
  const response = await fetch(`${AUTH_API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, nickname, password, email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Signup failed');
  }

  const data = await response.json();

  // Store auth data
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userId', data.user.id);
  localStorage.setItem('username', data.user.username);
  localStorage.setItem('nickname', data.user.nickname);

  return data;
}

// Request magic link (email-based login)
async function requestMagicLink(email) {
  const response = await fetch(`${AUTH_API}/api/auth/magic-link/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send magic link');
  }

  return await response.json();
}

// Verify magic link token
async function verifyMagicLink(token) {
  const response = await fetch(`${AUTH_API}/api/auth/magic-link/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Invalid or expired link');
  }

  const data = await response.json();
  
  // Store auth data
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('userId', data.user.id);
  localStorage.setItem('username', data.user.username);
  localStorage.setItem('nickname', data.user.nickname);
  
  return data;
}

// Logout
async function logout() {
  const token = getAuthToken();
  
  if (token) {
    try {
      await fetch(`${AUTH_API}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  // Clear local storage
  localStorage.clear();
  
  // Redirect to login
  window.location.href = '/login.html';
}

// Check authentication and redirect if needed
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// Export functions
window.auth = {
  getAuthToken,
  isAuthenticated,
  getAuthHeaders,
  login,
  signup,
  requestMagicLink,
  verifyMagicLink,
  logout,
  requireAuth
};
