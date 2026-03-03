/* ========================================
   Bio Profile Editor - JavaScript
   ======================================== */

// State
let currentProfile = null;
let selectedTheme = 'default';
let badges = [];
let skills = [];
let socialLinks = [];
let uploadedMedia = {
    avatar: null,
    background: null,
    music: null,
    cursor: null
};

// API Base URL
const API_BASE = '/api/bio-profile';

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFormListeners();
    initUploadListeners();
    initThemeSelector();
    loadProfile();
});

// ========================================
// Navigation
// ========================================
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active nav
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding section
            const sectionId = item.dataset.section;
            document.querySelectorAll('.editor-section').forEach(s => {
                s.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
            
            // Update preview if navigating to preview section
            if (sectionId === 'preview') {
                updatePreview();
            }
        });
    });
}

// ========================================
// Form Listeners
// ========================================
function initFormListeners() {
    // Bio character counter
    const bioInput = document.getElementById('bio');
    const bioCount = document.getElementById('bio-count');
    
    bioInput.addEventListener('input', () => {
        bioCount.textContent = `${bioInput.value.length}/500`;
        updatePreview();
    });
    
    // Basic info inputs
    ['username', 'displayName', 'bio', 'customCursorEnabled', 'autoPlayMusic'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updatePreview);
            el.addEventListener('change', updatePreview);
        }
    });
    
    // Social links
    ['github', 'discord', 'twitter', 'youtube', 'instagram', 'telegram', 'spotify', 'website'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                updateSocialLinks();
                updatePreview();
            });
        }
    });
    
    // Save button
    document.getElementById('save-btn').addEventListener('click', saveProfile);
}

// ========================================
// Upload Listeners
// ========================================
function initUploadListeners() {
    setupUpload('avatar', 'avatar-upload', 'avatar-preview', 'avatar-remove');
    setupUpload('background', 'background-upload', 'background-preview', 'background-remove');
    setupUpload('music', 'music-upload', 'music-preview', 'music-remove');
    setupUpload('cursor', 'cursor-upload', 'cursor-preview', 'cursor-remove');
}

function setupUpload(type, inputId, previewId, removeId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeId);
    
    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showToast('File size must be less than 10MB', 'error');
            return;
        }
        
        // Show loading state
        const originalText = preview.innerHTML;
        preview.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            // Upload to Supabase
            const formData = new FormData();
            formData.append('file', file);
            
            const token = localStorage.getItem('authToken');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE}/upload/${type}`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: formData
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                // Show specific error message
                if (result.code === 'MIGRATION_REQUIRED') {
                    showToast('⚠️ Database not set up! Run SQL migration first. See BIO_SETUP_INSTRUCTIONS.md', 'error');
                } else {
                    showToast(result.error || 'Upload failed', 'error');
                }
                preview.innerHTML = originalText;
                return;
            }
            
            uploadedMedia[type] = result.url;
            
            // Update preview
            if (type === 'avatar' || type === 'cursor') {
                preview.innerHTML = `<img src="${result.url}" alt="${type}">`;
            } else {
                preview.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
            }
            
            // Show remove button
            if (removeBtn) removeBtn.style.display = 'inline-block';
            
            // Add remove listener
            if (removeBtn) {
                removeBtn.onclick = () => removeMedia(type, preview, removeBtn);
            }
            
            showToast(`${type} uploaded successfully!`, 'success');
            updatePreview();
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Upload failed. Please try again.', 'error');
            preview.innerHTML = originalText;
        }
    });
}

function removeMedia(type, preview, removeBtn) {
    uploadedMedia[type] = null;
    
    // Reset preview
    const icons = {
        avatar: '<i class="fas fa-user-circle"></i>',
        background: '<i class="fas fa-video"></i>',
        music: '<i class="fas fa-music"></i>',
        cursor: '<i class="fas fa-mouse-pointer"></i>'
    };
    
    preview.innerHTML = icons[type];
    removeBtn.style.display = 'none';
    
    updatePreview();
}

// ========================================
// Theme Selector
// ========================================
function initThemeSelector() {
    const themeOptions = document.querySelectorAll('.theme-option');
    
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            themeOptions.forEach(o => o.classList.remove('active'));
            option.classList.add('active');
            selectedTheme = option.dataset.theme;
            updatePreview();
        });
    });
}

// ========================================
// Badges Management
// ========================================
document.getElementById('add-badge-btn')?.addEventListener('click', () => {
    const nameInput = document.getElementById('badge-name');
    const iconInput = document.getElementById('badge-icon');
    
    const name = nameInput.value.trim();
    const icon = iconInput.value.trim();
    
    if (!name) {
        showToast('Badge name is required', 'error');
        return;
    }
    
    badges.push({
        name,
        icon: icon || 'assets/images/default-badge.png'
    });
    
    nameInput.value = '';
    iconInput.value = '';
    
    renderBadges();
    updatePreview();
});

function renderBadges() {
    const list = document.getElementById('badges-list');
    if (!list) return;
    
    list.innerHTML = badges.map((badge, index) => `
        <div class="badge-item">
            <img src="${badge.icon}" alt="${badge.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%233b82f6%22 width=%22100%22 height=%22100%22 rx=%2220%22/><text x=%2250%22 y=%2265%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2240%22>★</text></svg>'">
            <div class="badge-item-info">
                <div class="badge-item-name">${badge.name}</div>
            </div>
            <button class="badge-item-remove" onclick="removeBadge(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function removeBadge(index) {
    badges.splice(index, 1);
    renderBadges();
    updatePreview();
}

// ========================================
// Skills Management
// ========================================
document.getElementById('add-skill-btn')?.addEventListener('click', () => {
    const input = document.getElementById('skill-input');
    const skill = input.value.trim();
    
    if (!skill) {
        showToast('Enter a skill name', 'error');
        return;
    }
    
    skills.push(skill);
    input.value = '';
    
    renderSkills();
    updatePreview();
});

document.getElementById('skill-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('add-skill-btn')?.click();
    }
});

function renderSkills() {
    const list = document.getElementById('skills-list');
    if (!list) return;
    
    list.innerHTML = skills.map((skill, index) => `
        <div class="skill-tag">
            ${skill}
            <button class="skill-tag-remove" onclick="removeSkill(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function removeSkill(index) {
    skills.splice(index, 1);
    renderSkills();
    updatePreview();
}

// ========================================
// Social Links
// ========================================
function updateSocialLinks() {
    const platformMap = {
        github: 'GitHub',
        discord: 'Discord',
        twitter: 'Twitter',
        youtube: 'YouTube',
        instagram: 'Instagram',
        telegram: 'Telegram',
        spotify: 'Spotify',
        website: 'Website'
    };
    
    socialLinks = [];
    
    Object.keys(platformMap).forEach(platform => {
        const url = document.getElementById(platform).value.trim();
        if (url) {
            socialLinks.push({
                platform,
                name: platformMap[platform],
                url
            });
        }
    });
}

// ========================================
// Load Profile
// ========================================
async function loadProfile() {
    try {
        // Get auth token
        const token = localStorage.getItem('authToken');
        const username = localStorage.getItem('username');
        
        if (!token) {
            console.error('No auth token found');
            // Auto-fill username from localStorage if available
            if (username) {
                document.getElementById('username').value = username;
            }
            // Try to load from localStorage bioProfileData
            loadFromLocalStorage();
            return;
        }
        
        const response = await fetch(`${API_BASE}/me/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const { profile } = await response.json();
            currentProfile = profile;
            loadProfileData(profile);
        } else {
            // If no profile exists yet, auto-fill username
            if (username) {
                document.getElementById('username').value = username;
            }
            // Try to load from localStorage bioProfileData
            loadFromLocalStorage();
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        // Auto-fill username from localStorage on error
        const username = localStorage.getItem('username');
        if (username) {
            document.getElementById('username').value = username;
        }
        // Try to load from localStorage bioProfileData
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    const bioData = localStorage.getItem('bioProfileData');
    if (bioData) {
        try {
            const data = JSON.parse(bioData);
            console.log('Loading profile from localStorage:', data);
            
            // Map localStorage data to profile format
            const profile = {
                username: data.username || localStorage.getItem('username'),
                displayName: data.displayName || data.name,
                bio: data.bio,
                avatarUrl: data.profilePic,
                backgroundVideoUrl: data.backgroundVideo,
                backgroundMusicUrl: data.music,
                theme: data.theme || 'default',
                customCursorEnabled: data.customCursor !== false,
                autoPlayMusic: data.autoPlayMusic || false,
                badges: data.badges || [],
                socialLinks: data.socialLinks || [],
                skills: data.skills || []
            };
            
            loadProfileData(profile);
            showToast('Loaded profile from local storage. Click Save to sync to database.', 'info');
        } catch (error) {
            console.error('Failed to parse localStorage bioProfileData:', error);
        }
    }
}

function loadProfileData(profile) {
    // Basic info
    document.getElementById('username').value = profile.username || '';
    document.getElementById('displayName').value = profile.displayName || '';
    document.getElementById('bio').value = profile.bio || '';
    document.getElementById('bio-count').textContent = `${profile.bio?.length || 0}/500`;
    document.getElementById('customCursorEnabled').checked = profile.customCursorEnabled ?? true;
    document.getElementById('autoPlayMusic').checked = profile.autoPlayMusic ?? false;
    
    // Theme
    selectedTheme = profile.theme || 'default';
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === selectedTheme);
    });
    
    // Media
    if (profile.avatarUrl) {
        uploadedMedia.avatar = profile.avatarUrl;
        document.getElementById('avatar-preview').innerHTML = `<img src="${profile.avatarUrl}" alt="Avatar">`;
        document.getElementById('avatar-remove').style.display = 'inline-block';
    }
    
    if (profile.backgroundVideoUrl) {
        uploadedMedia.background = profile.backgroundVideoUrl;
        document.getElementById('background-preview').innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
        document.getElementById('background-remove').style.display = 'inline-block';
    }
    
    if (profile.backgroundMusicUrl) {
        uploadedMedia.music = profile.backgroundMusicUrl;
        document.getElementById('music-preview').innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
        document.getElementById('music-remove').style.display = 'inline-block';
    }
    
    if (profile.customCursorUrl) {
        uploadedMedia.cursor = profile.customCursorUrl;
        document.getElementById('cursor-preview').innerHTML = `<img src="${profile.customCursorUrl}" alt="Cursor">`;
        document.getElementById('cursor-remove').style.display = 'inline-block';
    }
    
    // Badges
    badges = profile.badges || [];
    renderBadges();
    
    // Social links
    profile.socialLinks?.forEach(link => {
        const input = document.getElementById(link.platform);
        if (input) {
            input.value = link.url;
        }
    });
    updateSocialLinks();
    
    // Skills
    skills = profile.skills || [];
    renderSkills();
}

// ========================================
// Save Profile
// ========================================
async function saveProfile() {
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const profileData = {
            username: document.getElementById('username').value.trim(),
            displayName: document.getElementById('displayName').value.trim(),
            bio: document.getElementById('bio').value.trim(),
            theme: selectedTheme,
            customCursorEnabled: document.getElementById('customCursorEnabled').checked,
            autoPlayMusic: document.getElementById('autoPlayMusic').checked,
            avatarUrl: uploadedMedia.avatar,
            backgroundVideoUrl: uploadedMedia.background,
            backgroundMusicUrl: uploadedMedia.music,
            customCursorUrl: uploadedMedia.cursor,
            badges,
            socialLinks,
            skills
        };
        
        // Validate
        if (!profileData.username) {
            showToast('Username is required', 'error');
            return;
        }
        
        const token = localStorage.getItem('authToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(profileData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.code === 'MIGRATION_REQUIRED') {
                showToast('⚠️ Database not set up! You need to run the SQL migration in Supabase. Check BIO_SETUP_INSTRUCTIONS.md', 'error');
            } else {
                showToast(errorData.error || 'Failed to save profile', 'error');
            }
            return;
        }
        
        const result = await response.json();
        currentProfile = result.profile;
        
        showToast('Profile saved successfully!', 'success');
        
        // Update preview
        updatePreview();
    } catch (error) {
        console.error('Save error:', error);
        showToast('Failed to save profile. Please try again.', 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ========================================
// Update Preview
// ========================================
function updatePreview() {
    const preview = document.getElementById('preview-content');
    if (!preview) return;
    
    const username = document.getElementById('username').value || 'username';
    const displayName = document.getElementById('displayName').value || 'Display Name';
    const bio = document.getElementById('bio').value || 'Your bio will appear here...';
    const avatarUrl = uploadedMedia.avatar || null;
    
    // Get theme colors
    const themeColors = {
        default: { primary: '#7c3aed', accent: '#c084fc' },
        dark: { primary: '#3b82f6', accent: '#60a5fa' },
        red: { primary: '#ef4444', accent: '#f87171' },
        green: { primary: '#22c55e', accent: '#4ade80' },
        orange: { primary: '#f97316', accent: '#fb923c' },
        pink: { primary: '#ec4899', accent: '#f472b6' },
        cyan: { primary: '#06b6d4', accent: '#22d3ee' }
    };
    
    const colors = themeColors[selectedTheme] || themeColors.default;
    
    // Render social links preview
    const socialPreview = socialLinks.slice(0, 5).map(link => {
        const icons = {
            github: 'fab fa-github',
            discord: 'fab fa-discord',
            twitter: 'fab fa-twitter',
            youtube: 'fab fa-youtube',
            instagram: 'fab fa-instagram',
            telegram: 'fab fa-telegram',
            spotify: 'fab fa-spotify',
            website: 'fas fa-globe'
        };
        return `<span class="social-icon"><i class="${icons[link.platform] || 'fas fa-link'}"></i></span>`;
    }).join('');
    
    // Render badges stores preview
    const badgesPreview = badges.slice(0, 4).map(badge => 
        `<span class="badge-preview" style="background: ${colors.primary};">${badge.name.charAt(0)}</span>`
    ).join('');
    
    // Render skills preview
    const skillsPreview = skills.slice(0, 5).map(skill => 
        `<span class="skill-preview">${skill}</span>`
    ).join('');
    
    preview.innerHTML = `
        <style>
            .preview-avatar {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                border: 3px solid ${colors.primary};
                object-fit: cover;
                margin: 0 auto 20px;
                display: block;
                background: ${avatarUrl ? 'transparent' : '#252535'};
            }
            .preview-username {
                font-size: 1.8rem;
                font-weight: 700;
                background: linear-gradient(135deg, ${colors.primary}, ${colors.accent});
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-align: center;
                margin-bottom: 5px;
            }
            .preview-display-name {
                text-align: center;
                color: #a1a1aa;
                margin-bottom: 20px;
            }
            .preview-bio {
                background: rgba(255,255,255,0.03);
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                color: #a1a1aa;
                margin-bottom: 20px;
            }
            .preview-badges {
                display: flex;
                justify-content: center;
                gap: 8px;
                margin-bottom: 20px;
            }
            .badge-preview {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                color: white;
            }
            .preview-social {
                display: flex;
                justify-content: center;
                gap: 12px;
                margin-bottom: 20px;
            }
            .social-icon {
                width: 45px;
                height: 45px;
                border-radius: 12px;
                background: rgba(255,255,255,0.05);
                border: 2px solid ${colors.primary};
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            .preview-skills {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 10px;
            }
            .skill-preview {
                padding: 8px 15px;
                background: rgba(255,255,255,0.05);
                border-radius: 20px;
                font-size: 0.85rem;
                border: 1px solid ${colors.primary};
            }
        </style>
        
        ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" class="preview-avatar">` : '<div class="preview-avatar"></div>'}
        
        <div class="preview-username">@${username}</div>
        <div class="preview-display-name">${displayName}</div>
        
        ${badges ? `<div class="preview-badges">${badgesPreview}</div>` : ''}
        
        <div class="preview-bio">${bio}</div>
        
        ${socialLinks.length ? `<div class="preview-social">${socialPreview}</div>` : ''}
        
        ${skills.length ? `<div class="preview-skills">${skillsPreview}</div>` : ''}
    `;
}

// ========================================
// Toast Notifications
// ========================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Expose functions for inline handlers
window.removeBadge = removeBadge;
window.removeSkill = removeSkill;
