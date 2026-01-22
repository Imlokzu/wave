// Admin Panel JavaScript

// API base URL - detect environment
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168') 
    ? `http://${window.location.hostname}:3001`
    : 'https://api.metrocraft.eu';

let currentPage = 1;
let totalPages = 1;
let searchQuery = '';

// Check authentication - use same token as main site
const token = localStorage.getItem('authToken') || localStorage.getItem('token') || localStorage.getItem('adminToken');
if (!token) {
    window.location.href = '/admin/login.html';
}

// Verify admin access
fetch(`${API_BASE}/api/admin/stats`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(res => {
    if (!res.ok) {
        throw new Error('Admin access required');
    }
    return res.json();
})
.catch(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
});

// Get current user info from /api/auth/me
fetch(`${API_BASE}/api/auth/me`, {
    headers: {
        'Authorization': `Bearer ${token}`
    }
})
.then(res => res.json())
.then(data => {
    if (data.user) {
        document.getElementById('adminUsername').textContent = data.user.username;
    }
})
.catch(console.error);

// Load stats
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load stats');

        const stats = await response.json();
        
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('proUsers').textContent = stats.proUsers;
        document.getElementById('onlineUsers').textContent = stats.onlineUsers;
        document.getElementById('adminUsers').textContent = stats.adminUsers;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load users
async function loadUsers(page = 1) {
    try {
        const searchInput = document.getElementById('searchInput');
        searchQuery = searchInput.value;

        const params = new URLSearchParams({
            page: page.toString(),
            limit: '20'
        });

        if (searchQuery) {
            params.append('search', searchQuery);
        }

        const response = await fetch(`${API_BASE}/api/admin/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load users');

        const data = await response.json();
        
        currentPage = data.pagination.page;
        totalPages = data.pagination.totalPages;

        renderUsers(data.users);
        updatePagination(data.pagination);
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-red-400">
                    Failed to load users. Please try again.
                </td>
            </tr>
        `;
    }
}

// Render users table
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center text-[#90bccb]">
                    No users found.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr class="hover:bg-surface-dark-hover transition-colors">
            <td class="px-6 py-4">
                <div class="flex flex-col">
                    <span class="text-white font-medium">${escapeHtml(user.nickname)}</span>
                    <span class="text-[#90bccb] text-xs">@${escapeHtml(user.username)}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    user.status === 'online' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                }">
                    ${user.status || 'offline'}
                </span>
            </td>
            <td class="px-6 py-4">
                <button 
                    onclick="togglePro('${user.id}', ${!user.isPro})"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                        user.isPro 
                            ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' 
                            : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                    }"
                >
                    ${user.isPro ? 'PRO' : 'FREE'}
                </button>
            </td>
            <td class="px-6 py-4">
                <button 
                    onclick="toggleAdmin('${user.id}', ${!user.isAdmin})"
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors ${
                        user.isAdmin 
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                            : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                    }"
                >
                    ${user.isAdmin ? 'ADMIN' : 'USER'}
                </button>
            </td>
            <td class="px-6 py-4 text-[#90bccb] text-sm">
                ${formatDate(user.createdAt)}
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                    ${!user.is_banned ? `
                        <button 
                            onclick="showBanModal('${user.id}')"
                            class="text-orange-400 hover:text-orange-300 transition-colors"
                            title="Ban user"
                        >
                            <span class="material-symbols-outlined text-sm">block</span>
                        </button>
                    ` : `
                        <button 
                            onclick="unbanUser('${user.id}')"
                            class="text-green-400 hover:text-green-300 transition-colors"
                            title="Unban user"
                        >
                            <span class="material-symbols-outlined text-sm">check_circle</span>
                        </button>
                    `}
                    <button 
                        onclick="deleteUser('${user.id}', '${escapeHtml(user.username)}')"
                        class="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete user"
                    >
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update pagination
function updatePagination(pagination) {
    document.getElementById('paginationInfo').textContent = 
        `Showing ${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`;
    
    document.getElementById('prevButton').disabled = pagination.page === 1;
    document.getElementById('nextButton').disabled = pagination.page === pagination.totalPages;
}

// Toggle pro status
async function togglePro(userId, isPro) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}/pro`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPro })
        });

        if (!response.ok) throw new Error('Failed to update pro status');

        await loadUsers(currentPage);
        await loadStats();
    } catch (error) {
        console.error('Error toggling pro status:', error);
        alert('Failed to update pro status');
    }
}

// Toggle admin status
async function toggleAdmin(userId, isAdmin) {
    if (!confirm(`Are you sure you want to ${isAdmin ? 'grant' : 'revoke'} admin access?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}/admin`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isAdmin })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update admin status');
        }

        await loadUsers(currentPage);
        await loadStats();
    } catch (error) {
        console.error('Error toggling admin status:', error);
        alert(error.message);
    }
}

// Delete user
async function deleteUser(userId, username) {
    if (!confirm(`Are you sure you want to delete user @${username}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to delete user');
        }

        await loadUsers(currentPage);
        await loadStats();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert(error.message);
    }
}

// Pagination
function previousPage() {
    if (currentPage > 1) {
        loadUsers(currentPage - 1);
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        loadUsers(currentPage + 1);
    }
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Search on input
document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        loadUsers(1);
    }, 500);
});

// Initial load
loadStats();
loadUsers();

// Auto-refresh stats every 30 seconds
setInterval(loadStats, 30000);

// Tab switching
let currentTab = 'users';
let banUserId = null;

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.admin-tab').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.classList.remove('text-[#90bccb]', 'border-transparent', 'hover:border-[#223f49]');
            btn.classList.add('text-white', 'border-primary');
        } else {
            btn.classList.remove('text-white', 'border-primary');
            btn.classList.add('text-[#90bccb]', 'border-transparent', 'hover:border-[#223f49]');
        }
    });
    
    // Hide all sections
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const sections = {
        'users': 'usersSection',
        'bugs': 'bugsSection',
        'pro-requests': 'proRequestsSection',
        'scam-reports': 'scamReportsSection',
        'bans': 'bansSection'
    };
    
    document.getElementById(sections[tab]).classList.remove('hidden');
    
    // Load data for the tab
    switch(tab) {
        case 'bugs':
            loadBugReports();
            break;
        case 'pro-requests':
            loadProRequests();
            break;
        case 'scam-reports':
            loadScamReports();
            break;
        case 'bans':
            loadBans();
            break;
    }
}

// Load bug reports
async function loadBugReports() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/reports/bugs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load bug reports');
        
        const data = await response.json();
        renderBugReports(data.reports);
    } catch (error) {
        console.error('Error loading bug reports:', error);
        document.getElementById('bugReportsContent').innerHTML = '<p class="text-red-400 text-center">Failed to load bug reports</p>';
    }
}

function renderBugReports(reports) {
    const content = document.getElementById('bugReportsContent');
    
    if (reports.length === 0) {
        content.innerHTML = '<p class="text-[#90bccb] text-center">No bug reports</p>';
        return;
    }
    
    content.innerHTML = reports.map(report => `
        <div class="bg-[#101e23] rounded-lg p-4 mb-4 border border-[#223f49]">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h4 class="text-white font-bold">${escapeHtml(report.title)}</h4>
                    <p class="text-[#90bccb] text-xs mt-1">By @${escapeHtml(report.user?.username || 'Unknown')} • ${formatDate(report.created_at)}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(report.status)}">
                    ${report.status}
                </span>
            </div>
            <p class="text-gray-300 text-sm mb-3">${escapeHtml(report.description)}</p>
            <div class="flex gap-2">
                <select onchange="updateBugReport('${report.id}', this.value)" class="bg-surface-dark-hover border border-[#223f49] text-white rounded px-3 py-1 text-xs">
                    <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in_progress" ${report.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    <option value="closed" ${report.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
            </div>
        </div>
    `).join('');
}

async function updateBugReport(reportId, status) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/reports/bugs/${reportId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Failed to update bug report');
        
        loadBugReports();
    } catch (error) {
        console.error('Error updating bug report:', error);
        alert('Failed to update bug report');
    }
}

// Load pro requests
async function loadProRequests() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/requests/pro`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load pro requests');
        
        const data = await response.json();
        renderProRequests(data.requests);
    } catch (error) {
        console.error('Error loading pro requests:', error);
        document.getElementById('proRequestsContent').innerHTML = '<p class="text-red-400 text-center">Failed to load pro requests</p>';
    }
}

function renderProRequests(requests) {
    const content = document.getElementById('proRequestsContent');
    
    if (requests.length === 0) {
        content.innerHTML = '<p class="text-[#90bccb] text-center">No pro requests</p>';
        return;
    }
    
    content.innerHTML = requests.map(request => `
        <div class="bg-[#101e23] rounded-lg p-4 mb-4 border border-[#223f49]">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h4 class="text-white font-bold">@${escapeHtml(request.user?.username || 'Unknown')}</h4>
                    <p class="text-[#90bccb] text-xs mt-1">${formatDate(request.created_at)}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(request.status)}">
                    ${request.status}
                </span>
            </div>
            <p class="text-gray-300 text-sm mb-3">${escapeHtml(request.reason)}</p>
            ${request.status === 'pending' ? `
                <div class="flex gap-2">
                    <button onclick="processProRequest('${request.id}', 'approved')" class="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">
                        Approve
                    </button>
                    <button onclick="processProRequest('${request.id}', 'rejected')" class="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                        Reject
                    </button>
                </div>
            ` : ''}
        </div>
    `).join('');
}

async function processProRequest(requestId, status) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/requests/pro/${requestId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Failed to process pro request');
        
        loadProRequests();
        loadStats();
    } catch (error) {
        console.error('Error processing pro request:', error);
        alert('Failed to process pro request');
    }
}

// Load scam reports
async function loadScamReports() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/reports/scam`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load scam reports');
        
        const data = await response.json();
        renderScamReports(data.reports);
    } catch (error) {
        console.error('Error loading scam reports:', error);
        document.getElementById('scamReportsContent').innerHTML = '<p class="text-red-400 text-center">Failed to load scam reports</p>';
    }
}

function renderScamReports(reports) {
    const content = document.getElementById('scamReportsContent');
    
    if (reports.length === 0) {
        content.innerHTML = '<p class="text-[#90bccb] text-center">No scam reports</p>';
        return;
    }
    
    content.innerHTML = reports.map(report => `
        <div class="bg-[#101e23] rounded-lg p-4 mb-4 border border-[#223f49]">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h4 class="text-white font-bold">Report against @${escapeHtml(report.reported_user?.username || 'Unknown')}</h4>
                    <p class="text-[#90bccb] text-xs mt-1">By @${escapeHtml(report.reporter?.username || 'Unknown')} • ${formatDate(report.created_at)}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusColor(report.status)}">
                    ${report.status}
                </span>
            </div>
            <p class="text-gray-300 text-sm mb-3"><strong>Reason:</strong> ${escapeHtml(report.reason)}</p>
            ${report.evidence ? `<p class="text-gray-400 text-xs mb-3"><strong>Evidence:</strong> ${escapeHtml(report.evidence)}</p>` : ''}
            <div class="flex gap-2">
                <select onchange="updateScamReport('${report.id}', this.value)" class="bg-surface-dark-hover border border-[#223f49] text-white rounded px-3 py-1 text-xs">
                    <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="investigating" ${report.status === 'investigating' ? 'selected' : ''}>Investigating</option>
                    <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    <option value="dismissed" ${report.status === 'dismissed' ? 'selected' : ''}>Dismissed</option>
                </select>
                ${!report.reported_user?.is_banned ? `
                    <button onclick="showBanModal('${report.reported_user_id}')" class="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">
                        Ban User
                    </button>
                ` : '<span class="text-red-400 text-sm font-bold">User Banned</span>'}
            </div>
        </div>
    `).join('');
}

async function updateScamReport(reportId, status) {
    try {
        const response = await fetch(`${API_BASE}/api/admin/reports/scam/${reportId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) throw new Error('Failed to update scam report');
        
        loadScamReports();
    } catch (error) {
        console.error('Error updating scam report:', error);
        alert('Failed to update scam report');
    }
}

// Load bans
async function loadBans() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/bans`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load bans');
        
        const data = await response.json();
        renderBans(data.bans);
    } catch (error) {
        console.error('Error loading bans:', error);
        document.getElementById('bansContent').innerHTML = '<p class="text-red-400 text-center">Failed to load bans</p>';
    }
}

function renderBans(bans) {
    const content = document.getElementById('bansContent');
    
    if (bans.length === 0) {
        content.innerHTML = '<p class="text-[#90bccb] text-center">No active bans</p>';
        return;
    }
    
    content.innerHTML = bans.map(ban => `
        <div class="bg-[#101e23] rounded-lg p-4 mb-4 border border-[#223f49]">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h4 class="text-white font-bold">@${escapeHtml(ban.user?.username || 'Unknown')}</h4>
                    <p class="text-[#90bccb] text-xs mt-1">Banned by @${escapeHtml(ban.banned_by_user?.username || 'Unknown')} • ${formatDate(ban.created_at)}</p>
                </div>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400">
                    ${ban.ban_type}
                </span>
            </div>
            <p class="text-gray-300 text-sm mb-3"><strong>Reason:</strong> ${escapeHtml(ban.reason)}</p>
            ${ban.expires_at ? `<p class="text-gray-400 text-xs mb-3"><strong>Expires:</strong> ${formatDate(ban.expires_at)}</p>` : ''}
            <button onclick="unbanUser('${ban.user_id}')" class="px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors">
                Unban User
            </button>
        </div>
    `).join('');
}

// Ban modal functions
function showBanModal(userId) {
    banUserId = userId;
    document.getElementById('banModal').classList.remove('hidden');
    document.getElementById('banType').value = 'permanent';
    document.getElementById('banExpiryDiv').classList.add('hidden');
}

function closeBanModal() {
    banUserId = null;
    document.getElementById('banModal').classList.add('hidden');
    document.getElementById('banReason').value = '';
}

document.getElementById('banType').addEventListener('change', (e) => {
    if (e.target.value === 'temporary') {
        document.getElementById('banExpiryDiv').classList.remove('hidden');
    } else {
        document.getElementById('banExpiryDiv').classList.add('hidden');
    }
});

async function confirmBan() {
    const reason = document.getElementById('banReason').value;
    const banType = document.getElementById('banType').value;
    const expiresAt = banType === 'temporary' ? document.getElementById('banExpiry').value : null;
    
    if (!reason) {
        alert('Please enter a ban reason');
        return;
    }
    
    if (banType === 'temporary' && !expiresAt) {
        alert('Please select an expiry date for temporary ban');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${banUserId}/ban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason, banType, expiresAt })
        });
        
        if (!response.ok) throw new Error('Failed to ban user');
        
        closeBanModal();
        loadUsers(currentPage);
        loadBans();
        if (currentTab === 'scam-reports') loadScamReports();
    } catch (error) {
        console.error('Error banning user:', error);
        alert('Failed to ban user');
    }
}

async function unbanUser(userId) {
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}/unban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to unban user');
        
        loadBans();
        loadUsers(currentPage);
    } catch (error) {
        console.error('Error unbanning user:', error);
        alert('Failed to unban user');
    }
}

function getStatusColor(status) {
    const colors = {
        'pending': 'bg-yellow-500/10 text-yellow-400',
        'in_progress': 'bg-blue-500/10 text-blue-400',
        'investigating': 'bg-blue-500/10 text-blue-400',
        'resolved': 'bg-green-500/10 text-green-400',
        'closed': 'bg-gray-500/10 text-gray-400',
        'dismissed': 'bg-gray-500/10 text-gray-400',
        'approved': 'bg-green-500/10 text-green-400',
        'rejected': 'bg-red-500/10 text-red-400'
    };
    return colors[status] || 'bg-gray-500/10 text-gray-400';
}
