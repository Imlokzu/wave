/* ========================================
   Bio Profile Viewer - JavaScript
   ======================================== */

// State
let profileData = null;
let isMusicPlaying = false;
let isMusicInitialized = false;

// DOM Elements
const entryScreen = document.getElementById('entry-screen');
const mainContent = document.getElementById('main-content');
const bgVideo = document.getElementById('bg-video');
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
const musicVisualizer = document.querySelector('.music-visualizer');
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    setupEventListeners();
    document.getElementById('year').textContent = new Date().getFullYear();
});

// ========================================
// Load Profile
// ========================================
async function loadProfile() {
    try {
        // Get username from URL path
        const pathParts = window.location.pathname.split('/');
        const username = pathParts[pathParts.length - 1].replace('.html', '');
        
        if (!username || username === 'bio') {
            showError('No profile specified');
            return;
        }
        
        // Fetch profile data
        const response = await fetch(`/api/bio-profile/${username}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                showError('Profile not found');
            } else {
                showError('Failed to load profile');
            }
            return;
        }
        
        const { profile } = await response.json();
        profileData = profile;
        
        // Update document title
        document.title = `@${profile.username} | Bio Profile`;
        
        // Render profile
        renderProfile(profile);
        
    } catch (error) {
        console.error('Failed to load profile:', error);
        showError('Failed to load profile');
    }
}

// ========================================
// Render Profile
// ========================================
function renderProfile(profile) {
    // Apply theme
    document.documentElement.setAttribute('data-theme', profile.theme || 'default');
    
    // Set avatar
    const avatar = document.getElementById('profile-avatar');
    if (profile.avatarUrl) {
        avatar.src = profile.avatarUrl;
    } else {
        avatar.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%233b82f6%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2265%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2240%22>?</text></svg>';
    }
    
    // Set background video
    if (profile.backgroundVideoUrl) {
        bgVideo.querySelector('source').src = profile.backgroundVideoUrl;
        bgVideo.load();
    }
    
    // Set background music
    if (profile.backgroundMusicUrl) {
        bgMusic.querySelector('source').src = profile.backgroundMusicUrl;
        bgMusic.load();
    }
    
    // Set text content
    document.getElementById('username').textContent = `@${profile.username}`;
    document.getElementById('display-name').textContent = profile.displayName || profile.username;
    document.getElementById('bio').textContent = profile.bio || 'Welcome to my profile';
    document.getElementById('footer-name').textContent = profile.username;
    
    // Render badges
    renderBadges(profile.badges || []);
    
    // Render social links
    renderSocialLinks(profile.socialLinks || []);
    
    // Render skills
    renderSkills(profile.skills || []);
    
    // Set stats
    animateNumber('stat-views', profile.views || 0);
    animateNumber('stat-visits', profile.visits || 0);
    
    // Calculate days since join
    const joinDate = profile.createdAt ? new Date(profile.createdAt) : new Date();
    const days = Math.floor((new Date() - joinDate) / (1000 * 60 * 60 * 24));
    animateNumber('stat-days', days < 1 ? 1 : days);
    
    // Setup cursor
    if (profile.customCursorEnabled) {
        setupCursor(profile.customCursorUrl);
    } else {
        document.body.classList.add('default-cursor');
    }
}

// ========================================
// Render Badges
// ========================================
function renderBadges(badges) {
    const container = document.getElementById('badges-container');
    
    if (!badges || badges.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = badges.map(badge => `
        <div class="badge" data-tooltip="${badge.name}">
            <img src="${badge.icon}" alt="${badge.name}" onerror="this.style.display='none'">
            <span class="tooltip">${badge.name}</span>
        </div>
    `).join('');
}

// ========================================
// Render Social Links
// ========================================
function renderSocialLinks(socialLinks) {
    const container = document.getElementById('social-links');
    
    if (!socialLinks || socialLinks.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const iconMapping = {
        'github': 'fab fa-github',
        'discord': 'fab fa-discord',
        'twitter': 'fab fa-twitter',
        'youtube': 'fab fa-youtube',
        'tiktok': 'fab fa-tiktok',
        'instagram': 'fab fa-instagram',
        'telegram': 'fab fa-telegram',
        'spotify': 'fab fa-spotify',
        'twitch': 'fab fa-twitch',
        'steam': 'fab fa-steam',
        'email': 'fas fa-envelope',
        'website': 'fas fa-globe',
        'custom': 'fas fa-link'
    };
    
    container.innerHTML = socialLinks.map(link => `
        <a href="${link.url}" class="social-link" target="_blank" rel="noopener noreferrer" title="${link.name}">
            <i class="${iconMapping[link.platform] || 'fas fa-link'}"></i>
        </a>
    `).join('');
}

// ========================================
// Render Skills
// ========================================
function renderSkills(skills) {
    const container = document.getElementById('skills-container');
    
    if (!skills || skills.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = skills.map(skill => `
        <span class="skill">${skill}</span>
    `).join('');
}

// ========================================
// Setup Event Listeners
// ========================================
function setupEventListeners() {
    // Entry Screen Click
    entryScreen.addEventListener('click', handleEntryClick);
    
    // Music Toggle
    musicToggle.addEventListener('click', toggleMusic);
    musicToggle.addEventListener('mouseenter', () => cursor?.classList.add('hover'));
    musicToggle.addEventListener('mouseleave', () => cursor?.classList.remove('hover'));
    
    // Social Links hover
    document.addEventListener('mouseenter', (e) => {
        if (e.target.closest('.social-link, .badge, .skill')) {
            cursor?.classList.add('hover');
        }
    }, true);
    
    document.addEventListener('mouseleave', (e) => {
        if (e.target.closest('.social-link, .badge, .skill')) {
            cursor?.classList.remove('hover');
        }
    }, true);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !entryScreen.classList.contains('hidden')) {
            e.preventDefault();
            handleEntryClick();
        }
        if (e.code === 'KeyM' && entryScreen.classList.contains('hidden')) {
            toggleMusic();
        }
    });
}

// ========================================
// Handle Entry Click
// ========================================
function handleEntryClick() {
    entryScreen.classList.add('hidden');
    
    // Start background video
    bgVideo.play().catch(console.log);
    
    // Initialize music on first interaction
    if (!isMusicInitialized) {
        isMusicInitialized = true;
        bgMusic.volume = 0.3;
        
        if (profileData?.autoPlayMusic) {
            toggleMusic();
        }
    }
    
    // Enable custom cursor
    if (!profileData?.customCursorUrl) {
        document.body.classList.remove('default-cursor');
    }
}

// ========================================
// Toggle Music
// ========================================
function toggleMusic() {
    if (isMusicPlaying) {
        bgMusic.pause();
        musicVisualizer.classList.remove('active');
        musicToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
        bgMusic.play().catch(console.log);
        musicVisualizer.classList.add('active');
        musicToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
    isMusicPlaying = !isMusicPlaying;
}

// ========================================
// Custom Cursor
// ========================================
function setupCursor(cursorUrl) {
    if (!cursorUrl) {
        document.body.classList.add('default-cursor');
        return;
    }
    
    // Set custom cursor image
    cursor.style.backgroundImage = `url(${cursorUrl})`;
    cursor.style.backgroundSize = 'contain';
    cursor.style.backgroundPosition = 'center';
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
        cursorDot.style.left = e.clientX + 'px';
        cursorDot.style.top = e.clientY + 'px';
    });
}

// ========================================
// Animate Number Counter
// ========================================
function animateNumber(elementId, target) {
    const element = document.getElementById(elementId);
    const duration = 2000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// ========================================
// Show Error
// ========================================
function showError(message) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #000; color: #fff; flex-direction: column; gap: 20px;">
            <h1 style="font-size: 2rem; color: #ef4444;">Error</h1>
            <p style="color: #a1a1aa;">${message}</p>
            <a href="/" style="padding: 12px 25px; background: #3b82f6; color: white; text-decoration: none; border-radius: 10px;">Go Home</a>
        </div>
    `;
}
