/**
 * Auto-update checker for Wave Messenger
 * Checks for new versions and prompts users to update
 */

const CURRENT_VERSION = '4.2.0';
const UPDATE_CHECK_INTERVAL = 3600000; // Check every hour
const VERSION_STORAGE_KEY = 'wave_last_version_check';
const CURRENT_VERSION_KEY = 'wave_current_version';
const SEEN_CHANGELOG_KEY = 'wave_seen_changelog';

class UpdateChecker {
    constructor() {
        this.currentVersion = CURRENT_VERSION;
        this.updateAvailable = false;
        this.latestVersion = null;
        this.checkIfUpdated();
    }

    /**
     * Check if the app was just updated and show changelog
     */
    checkIfUpdated() {
        const savedVersion = localStorage.getItem(CURRENT_VERSION_KEY);
        const seenChangelog = localStorage.getItem(SEEN_CHANGELOG_KEY);

        // First time user or version changed
        if (!savedVersion || savedVersion !== this.currentVersion) {
            // Only show changelog if not first time and version actually changed
            if (savedVersion && savedVersion !== this.currentVersion && seenChangelog !== this.currentVersion) {
                this.showChangelogModal();
            }
            // Update stored version
            localStorage.setItem(CURRENT_VERSION_KEY, this.currentVersion);
        }
    }

    /**
     * Show changelog modal for new version
     */
    async showChangelogModal() {
        try {
            const response = await fetch('/api/version');
            if (!response.ok) return;

            const data = await response.json();
            
            // Add styles if not already added
            if (!document.getElementById('updateCheckerStyles')) {
                const style = document.createElement('style');
                style.id = 'updateCheckerStyles';
                style.textContent = `
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes slideDown {
                        from { transform: translateY(-100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                    #updateBanner { animation: slideDown 0.4s ease-out; }
                `;
                document.head.appendChild(style);
            }
            
            const modal = document.createElement('div');
            modal.id = 'changelogModal';
            modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm';
            modal.style.animation = 'fadeIn 0.3s ease-out';
            modal.innerHTML = `
                <div class="bg-surface-dark rounded-2xl p-8 max-w-2xl w-full mx-4 border border-primary/30 shadow-2xl animate-fade-in">
                    <div class="flex items-center gap-4 mb-6">
                        <div class="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                            <span class="material-symbols-outlined text-primary text-3xl">celebration</span>
                        </div>
                        <div>
                            <h2 class="text-3xl font-black text-white">What's New in ${data.version}</h2>
                            <p class="text-slate-400">Wave Messenger has been updated!</p>
                        </div>
                    </div>
                    
                    <div class="bg-background-dark rounded-xl p-6 mb-6">
                        <h3 class="text-white font-bold mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-primary">new_releases</span>
                            New Features & Improvements
                        </h3>
                        <ul class="space-y-2">
                            ${data.features.map(feature => `
                                <li class="text-slate-300 flex items-start gap-2">
                                    <span class="material-symbols-outlined text-primary text-sm mt-1">check_circle</span>
                                    <span>${feature}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="flex justify-end gap-3">
                        <button onclick="updateChecker.closeChangelog()" class="px-6 py-3 rounded-lg bg-primary text-black font-semibold hover:bg-primary/90 transition-colors">
                            Got it!
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            
            // Mark as seen
            localStorage.setItem(SEEN_CHANGELOG_KEY, this.currentVersion);
        } catch (error) {
            console.error('Failed to show changelog:', error);
        }
    }

    /**
     * Close changelog modal
     */
    closeChangelog() {
        const modal = document.getElementById('changelogModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Check for updates from the server
     */
    async checkForUpdates() {
        try {
            const response = await fetch('/api/version');
            if (!response.ok) return;

            const data = await response.json();
            this.latestVersion = data.version;

            // Compare versions
            if (this.isNewerVersion(data.version, this.currentVersion)) {
                this.updateAvailable = true;
                this.showUpdateNotification(data);
            }

            // Store last check time
            localStorage.setItem(VERSION_STORAGE_KEY, Date.now().toString());
        } catch (error) {
            console.error('Update check failed:', error);
        }
    }

    /**
     * Compare version strings (semantic versioning)
     */
    isNewerVersion(latest, current) {
        const latestParts = latest.split('.').map(Number);
        const currentParts = current.split('.').map(Number);

        for (let i = 0; i < 3; i++) {
            if (latestParts[i] > currentParts[i]) return true;
            if (latestParts[i] < currentParts[i]) return false;
        }
        return false;
    }

    /**
     * Show update notification banner
     */
    showUpdateNotification(data) {
        // Check if user dismissed this version
        const dismissedVersion = localStorage.getItem('wave_dismissed_update');
        if (dismissedVersion === data.version) return;

        // Create notification banner
        const banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.className = 'fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-primary to-cyan-600 text-white px-6 py-4 shadow-lg';
        banner.innerHTML = `
            <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-2xl animate-pulse">system_update</span>
                    <div>
                        <p class="font-bold">New version available: ${data.version}</p>
                        <p class="text-sm opacity-90">${data.message || 'Update now to get the latest features and improvements'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="updateChecker.updateNow()" class="bg-white text-primary px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                        Update Now
                    </button>
                    <button onclick="updateChecker.dismissUpdate('${data.version}')" class="text-white hover:text-gray-200 p-2">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>
        `;

        document.body.prepend(banner);

        // Add padding to body to prevent content from being hidden
        document.body.style.paddingTop = '80px';
    }

    /**
     * Reload the page to get the latest version
     */
    updateNow() {
        // Clear service worker cache if available
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                registrations.forEach(registration => registration.unregister());
            });
        }

        // Clear browser cache and reload
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            }).then(() => {
                window.location.reload(true);
            });
        } else {
            window.location.reload(true);
        }
    }

    /**
     * Dismiss update notification for this version
     */
    dismissUpdate(version) {
        localStorage.setItem('wave_dismissed_update', version);
        const banner = document.getElementById('updateBanner');
        if (banner) {
            banner.remove();
            document.body.style.paddingTop = '0';
        }
    }

    /**
     * Start periodic update checks
     */
    startPeriodicChecks() {
        // Check immediately
        this.checkForUpdates();

        // Then check periodically
        setInterval(() => {
            this.checkForUpdates();
        }, UPDATE_CHECK_INTERVAL);
    }

    /**
     * Check if it's time to check for updates
     */
    shouldCheckForUpdates() {
        const lastCheck = localStorage.getItem(VERSION_STORAGE_KEY);
        if (!lastCheck) return true;

        const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
        return timeSinceLastCheck > UPDATE_CHECK_INTERVAL;
    }
}

// Create global instance
const updateChecker = new UpdateChecker();

// Start checking for updates when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (updateChecker.shouldCheckForUpdates()) {
            updateChecker.startPeriodicChecks();
        }
    });
} else {
    if (updateChecker.shouldCheckForUpdates()) {
        updateChecker.startPeriodicChecks();
    }
}
