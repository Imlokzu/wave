/**
 * Settings Page JavaScript
 */

// API functions
async function getSubscriptionStatus() {
  const authToken = localStorage.getItem('authToken');

  // If no token, return mock data for testing
  if (!authToken) {
    console.warn('[Settings] No auth token, using mock data');
    return {
      isPro: false,
      subscriptionDaysRemaining: null,
      subscriptionEndsAt: null,
      availableModels: [],
      allModels: [
        { id: 'auto', name: 'Auto Select', tier: 'free', useCase: 'Best model for each task', locked: false },
        { id: 'wave-flash-1', name: 'Wave Flash 1', tier: 'free', useCase: 'Ultra-fast responses', locked: false },
        { id: 'wave-flash-2', name: 'Wave Flash 2', tier: 'free', useCase: 'Quick responses', locked: false },
        { id: 'wave-flash-3', name: 'Wave Flash 3', tier: 'free', useCase: 'Lightweight research', locked: false },
        { id: 'wave-flash-4', name: 'Wave Flash 4', tier: 'free', useCase: 'Efficient dialogue', locked: false },
        { id: 'wave-1', name: 'Wave 1', tier: 'free', useCase: 'Fast balanced model', locked: false },
        { id: 'wave-2', name: 'Wave 2', tier: 'free', useCase: 'General intelligence', locked: false },
        { id: 'wave-3', name: 'Wave 3', tier: 'free', useCase: 'Balanced chat & research', locked: false },
        { id: 'wave-4', name: 'Wave 4', tier: 'pro', useCase: 'High-intelligence tasks', locked: true },
        { id: 'wave-5', name: 'Wave 5', tier: 'pro', useCase: 'Advanced reasoning', locked: true },
        { id: 'wave-o1', name: 'Wave O1', tier: 'free', useCase: 'Fast thinking mode', locked: false },
        { id: 'wave-o2', name: 'Wave O2', tier: 'pro', useCase: 'Reasoning & research', locked: true },
        { id: 'wave-o3', name: 'Wave O3', tier: 'pro', useCase: 'Deep logic (Slow - Deep Thinking)', locked: true },
        { id: 'wave-o4', name: 'Wave O4', tier: 'pro', useCase: 'Expert research (Slow - Deep Thinking)', locked: true },
        { id: 'wave-o5', name: 'Wave O5', tier: 'pro', useCase: 'Premium analysis (Slow - Deep Thinking)', locked: true }
      ]
    };
  }

  const response = await fetch('/api/settings', {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (!response.ok) {
    console.error('API Error:', response.status, response.statusText);

    // If unauthorized, redirect to login
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login.html';
      return;
    }

    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('API Response:', data);

  if (!data.success || !data.data) {
    console.error('Invalid API response:', data);
    throw new Error('Invalid API response structure');
  }

  return data.data;
}

async function upgradeToPro() {
  const authToken = localStorage.getItem('authToken');
  const response = await fetch('/api/settings/upgrade-to-pro', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/login.html';
    return;
  }

  return await response.json();
}

async function downgradeToFree() {
  const authToken = localStorage.getItem('authToken');
  const response = await fetch('/api/settings/downgrade-to-free', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  });

  if (response.status === 401) {
    localStorage.clear();
    window.location.href = '/login.html';
    return;
  }

  return await response.json();
}

// Load user info
function loadUserInfo() {
  const username = localStorage.getItem('username');
  const nickname = localStorage.getItem('nickname');

  // Update avatar in header if it exists
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    const avatarUrl = localStorage.getItem('avatarUrl') || '/nobackweave.png';
    avatar.style.backgroundImage = `url("${avatarUrl}")`;
  }
}

// Load subscription status
async function loadSubscriptionStatus() {
  try {
    const status = await getSubscriptionStatus();
    const { isPro } = status;

    const requestProBtn = document.getElementById('requestProBtn');
    const proDaysLeft = document.getElementById('proDaysLeft');
    const proRenewDate = document.getElementById('proRenewDate');
    const t = window.i18n?.t ? window.i18n.t.bind(window.i18n) : (key) => key;

    if (isPro) {
      if (requestProBtn) requestProBtn.classList.add('hidden');
      if (proDaysLeft) {
        const days = status.subscriptionDaysRemaining;
        proDaysLeft.textContent = Number.isFinite(days) ? String(days) : '—';
      }
      if (proRenewDate) {
        const endsAt = status.subscriptionEndsAt;
        if (endsAt) {
          const date = new Date(endsAt);
          proRenewDate.textContent = `${t('pro.renewDateLabel')}: ${date.toLocaleDateString()}`;
        } else {
          proRenewDate.textContent = t('pro.renewDate');
        }
      }
    } else {
      if (requestProBtn) requestProBtn.classList.remove('hidden');
      if (proDaysLeft) proDaysLeft.textContent = t('pro.daysLeftNone');
      if (proRenewDate) proRenewDate.textContent = t('pro.renewDate');
    }
  } catch (error) {
    console.error('Failed to load subscription status:', error);
  }
}

// Load AI models
async function loadAIModels() {
  try {
    const data = await getSubscriptionStatus();
    const isPro = data.isPro;
    const allModels = data.allModels || data.availableModels || [];

    console.log('[AI Models] Loading models:', { isPro, modelCount: allModels.length });

    const container = document.getElementById('aiModelsContainer');

    const t = window.i18n && window.i18n.t ? window.i18n.t.bind(window.i18n) : (k, opts) => {
      if (opts && opts.model) return `${opts.model}`;
      return k;
    };

    // Get saved preferred model
    const savedModel = localStorage.getItem('preferredAIModel') || 'auto';

    // Create model selection UI
    let html = `
      <div class="px-6 py-4 space-y-3">
        <div class="flex items-center justify-between mb-3">
          <div>
            <span class="text-sm font-semibold text-slate-200">${t('settings.aiModelSelection')}</span>
            <p class="text-xs text-slate-500 mt-0.5">${t('settings.chooseModel')}</p>
          </div>
          <span class="text-xs px-2 py-1 rounded-full ${isPro ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}">${isPro ? t('settings.proTier') : t('settings.freeTier')}</span>
        </div>
    `;

    // Auto mode option
    html += `
      <label class="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-slate-800/80 to-slate-800/50 border ${savedModel === 'auto' ? 'border-primary shadow-[0_0_20px_rgba(91,141,239,0.15)]' : 'border-slate-700'} cursor-pointer hover:border-slate-600 transition-all group">
        <div class="flex items-center gap-3">
          <input type="radio" name="aiModel" value="auto" ${savedModel === 'auto' ? 'checked' : ''} onchange="selectAIModel('auto')" class="w-4 h-4 text-primary"/>
          <div>
            <div class="text-sm font-semibold text-white flex items-center gap-2">
              ${t('settings.autoSelect')}
              <span class="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
            </div>
            <div class="text-xs text-slate-400 mt-0.5">${t('settings.autoSelectDesc')}</div>
          </div>
        </div>
        ${savedModel === 'auto' ? '<span class="material-symbols-outlined text-primary text-[20px]">check_circle</span>' : ''}
      </label>
    `;

    // Group models by type
    const flashModels = allModels.filter(m => m.id.startsWith('wave-flash-'));
    const standardModels = allModels.filter(m => m.id.startsWith('wave-') && !m.id.startsWith('wave-flash-') && !m.id.startsWith('wave-o'));
    const oModels = allModels.filter(m => m.id.startsWith('wave-o'));

    // Wave Flash section
    if (flashModels.length > 0) {
      html += `
        <div class="pt-2">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">${t('settings.waveFlashTitle')}</div>
      `;

      flashModels.forEach(model => {
        const isSelected = savedModel === model.id;
        const isLocked = model.tier === 'pro' && !isPro;

        html += `
          <label class="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(91,141,239,0.1)]' : 'border-slate-700'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800 hover:border-slate-600'} transition-all mb-2 group">
            <div class="flex items-center gap-3 flex-1">
              <input type="radio" name="aiModel" value="${model.id}" ${isSelected ? 'checked' : ''} ${isLocked ? 'disabled' : ''} onchange="selectAIModel('${model.id}')" class="w-4 h-4 text-primary"/>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-white">${model.name}</span>
                  ${model.tier === 'pro' ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">PRO</span>' : ''}
                </div>
                <div class="text-xs text-slate-400 mt-0.5">${model.useCase || model.reasoning || 'AI model'}</div>
              </div>
            </div>
            ${isLocked ? '<span class="material-symbols-outlined text-slate-600 text-[18px]">lock</span>' : isSelected ? '<span class="material-symbols-outlined text-primary text-[18px]">check_circle</span>' : ''}
          </label>
        `;
      });

      html += `</div>`;
    }

    // Wave (Standard) section
    if (standardModels.length > 0) {
      html += `
        <div class="pt-2">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">${t('settings.waveDefaultTitle')}</div>
      `;

      standardModels.forEach(model => {
        const isSelected = savedModel === model.id;
        const isLocked = model.tier === 'pro' && !isPro;

        html += `
          <label class="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(91,141,239,0.1)]' : 'border-slate-700'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800 hover:border-slate-600'} transition-all mb-2 group">
            <div class="flex items-center gap-3 flex-1">
              <input type="radio" name="aiModel" value="${model.id}" ${isSelected ? 'checked' : ''} ${isLocked ? 'disabled' : ''} onchange="selectAIModel('${model.id}')" class="w-4 h-4 text-primary"/>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-white">${model.name}</span>
                  ${model.tier === 'pro' ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">PRO</span>' : ''}
                </div>
                <div class="text-xs text-slate-400 mt-0.5">${model.useCase || model.reasoning || 'AI model'}</div>
              </div>
            </div>
            ${isLocked ? '<span class="material-symbols-outlined text-slate-600 text-[18px]">lock</span>' : isSelected ? '<span class="material-symbols-outlined text-primary text-[18px]">check_circle</span>' : ''}
          </label>
        `;
      });

      html += `</div>`;
    }

    // Wave O (Reasoning) section
    if (oModels.length > 0) {
      html += `
        <div class="pt-2">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">${t('settings.waveThinkingTitle')}</div>
      `;

      oModels.forEach(model => {
        const isSelected = savedModel === model.id;
        const isLocked = model.tier === 'pro' && !isPro;

        html += `
          <label class="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/50 border ${isSelected ? 'border-primary shadow-[0_0_15px_rgba(91,141,239,0.1)]' : 'border-slate-700'} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-800 hover:border-slate-600'} transition-all mb-2 group">
            <div class="flex items-center gap-3 flex-1">
              <input type="radio" name="aiModel" value="${model.id}" ${isSelected ? 'checked' : ''} ${isLocked ? 'disabled' : ''} onchange="selectAIModel('${model.id}')" class="w-4 h-4 text-primary"/>
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-white">${model.name}</span>
                  ${model.tier === 'pro' ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">PRO</span>' : ''}
                </div>
                <div class="text-xs text-slate-400 mt-0.5">${model.useCase || model.reasoning || 'AI model'}</div>
              </div>
            </div>
            ${isLocked ? '<span class="material-symbols-outlined text-slate-600 text-[18px]">lock</span>' : isSelected ? '<span class="material-symbols-outlined text-primary text-[18px]">check_circle</span>' : ''}
          </label>
        `;
      });

      html += `</div>`;
    }

    if (flashModels.length === 0 && standardModels.length === 0 && oModels.length === 0) {
      html += `
        <div class="p-4 text-center text-slate-400 text-sm">
            <p>${t('settings.noModelsAvailable')}</p>
            <p class="text-xs mt-1">${t('settings.usingAutoSelect')}</p>
          </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  } catch (error) {
    console.error('Failed to load AI models:', error);
    const container = document.getElementById('aiModelsContainer');
    container.innerHTML = `
      <div class="px-6 py-4">
        <div class="p-4 text-center text-slate-400 text-sm">
          <p>Failed to load AI models</p>
          <p class="text-xs mt-1">Using auto-select mode</p>
        </div>
      </div>
    `;
  }
}

// Select AI model
function selectAIModel(modelId) {
  localStorage.setItem('preferredAIModel', modelId);
  console.log('Selected AI model:', modelId);

  // Show feedback
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 text-white px-6 py-3 rounded-full z-50';
  toast.style.cssText = `
    background: linear-gradient(135deg, rgba(13, 185, 242, 0.5) 0%, rgba(13, 185, 242, 0.7) 100%);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 
      0 8px 24px rgba(13, 185, 242, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  `;
  const t = window.i18n && window.i18n.t ? window.i18n.t.bind(window.i18n) : (k, opts) => {
    if (opts && opts.model) return `${opts.model}`;
    return k;
  };
  toast.textContent = modelId === 'auto' ? t('settings.modelChangedAuto') : t('settings.modelChanged', { model: modelId });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// Handle upgrade
async function handleUpgrade() {
  if (confirm('Upgrade to Pro? This will unlock all premium AI models and features.')) {
    try {
      await upgradeToPro();
      alert('Successfully upgraded to Pro! 🎉');
      await loadSubscriptionStatus();
      await loadAIModels(); // Reload models to show unlocked ones
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to upgrade. Please try again.');
    }
  }
}

// Handle downgrade
async function handleDowngrade() {
  if (confirm('Downgrade to Free? You will lose access to Pro AI models.')) {
    try {
      await downgradeToFree();
      alert('Downgraded to Free tier');
      await loadSubscriptionStatus();
      await loadAIModels(); // Reload models to show locked ones

      // Reset to auto if current model is Pro-only
      const savedModel = localStorage.getItem('preferredAIModel');
      const { allModels } = await getSubscriptionStatus();
      const currentModel = allModels.find(m => m.id === savedModel);
      if (currentModel && currentModel.locked) {
        localStorage.setItem('preferredAIModel', 'auto');
      }
    } catch (error) {
      console.error('Downgrade failed:', error);
      alert('Failed to downgrade. Please try again.');
    }
  }
}

// Toggle setting with backend sync
async function toggleSetting(setting, value) {
  localStorage.setItem(setting, value);
  console.log(`${setting} set to ${value}`);

  // Show feedback toast
  showToast(`${setting} ${value ? 'enabled' : 'disabled'}`);

  // Sync to backend
  try {
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      await fetch('/api/settings/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [setting]: value })
      });
    }
  } catch (error) {
    console.error('Failed to sync setting:', error);
  }
}

// Clear cache
function clearCache() {
  if (confirm('Clear all cached data? This will not delete your messages.')) {
    const keysToKeep = ['authToken', 'userId', 'username', 'nickname', 'preferredAIModel'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    alert('Cache cleared successfully!');
  }
}

// Logout
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.clear();
    window.location.href = '/login.html';
  }
}

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 text-white px-6 py-3 rounded-full z-50';
  toast.style.cssText = `
    background: linear-gradient(135deg, rgba(13, 185, 242, 0.5) 0%, rgba(13, 185, 242, 0.7) 100%);
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid rgba(255, 255, 255, 0.25);
    box-shadow: 
      0 8px 24px rgba(13, 185, 242, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.1);
    animation: slideDown 0.3s ease-out;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideUp 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Theme switcher
function setTheme(theme) {
  const html = document.documentElement;

  if (theme === 'dark') {
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else if (theme === 'light') {
    html.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else if (theme === 'auto') {
    // Auto mode - use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('theme', 'auto');
  }

  // Update logos
  if (typeof window.updateThemeLogos === 'function') {
    window.updateThemeLogos();
  }

  showToast(`Theme: ${theme}`);
  updateThemeButtons(theme);
}

// Update theme button states
function updateThemeButtons(activeTheme) {
  const buttons = document.querySelectorAll('[data-theme]');
  buttons.forEach(btn => {
    const theme = btn.getAttribute('data-theme');
    if (theme === activeTheme) {
      btn.classList.add('border-primary', 'ring-2', 'ring-primary/30', 'shadow-[0_0_10px_rgba(56,189,248,0.4)]');
      btn.classList.remove('border-slate-300', 'border-slate-600');
    } else {
      btn.classList.remove('border-primary', 'ring-2', 'ring-primary/30', 'shadow-[0_0_10px_rgba(56,189,248,0.4)]');
      if (theme === 'light') {
        btn.classList.add('border-slate-300');
      } else {
        btn.classList.add('border-slate-600');
      }
    }
  });
}

// Font size selector
let currentFontSize = 'medium';
function cycleFontSize() {
  const sizes = ['small', 'medium', 'large'];
  const currentIndex = sizes.indexOf(currentFontSize);
  currentFontSize = sizes[(currentIndex + 1) % sizes.length];

  // Apply font size
  const root = document.documentElement;
  if (currentFontSize === 'small') {
    root.style.fontSize = '14px';
  } else if (currentFontSize === 'large') {
    root.style.fontSize = '18px';
  } else {
    root.style.fontSize = '16px';
  }

  localStorage.setItem('fontSize', currentFontSize);
  document.querySelector('[data-font-size-label]').textContent = currentFontSize.charAt(0).toUpperCase() + currentFontSize.slice(1);
  showToast(`Font size: ${currentFontSize}`);
}

// Blocked users page
function openBlockedUsers() {
  showToast('Opening blocked users...');
  // TODO: Create blocked users modal/page
  setTimeout(() => {
    alert('Blocked Users feature coming soon!\n\nYou can block users from their profile or chat options.');
  }, 500);
}

// Load storage info
async function loadStorageInfo() {
  try {
    console.log('[Storage] Fetching storage info...');
    const authToken = localStorage.getItem('authToken');
    const response = await fetch('/api/settings/storage', {
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
    });

    console.log('[Storage] Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch storage info: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Storage] API response:', data);

    if (data.success) {
      console.log('[Storage] Updating UI with real data');
      updateStorageUI(data.data);
    } else {
      throw new Error('API returned success: false');
    }
  } catch (error) {
    console.error('[Storage] Failed to load storage info:', error);
    console.log('[Storage] Using fallback data (empty storage)');
    // Use fallback data - empty storage since uploads folder is empty
    updateStorageUI({
      totalBytes: 0,
      maxBytes: 5368709120, // 5 GB
      breakdown: {
        images: 0,
        videos: 0,
        files: 0,
        cache: 0
      }
    });
  }
}

// Update storage UI
function updateStorageUI(storageData) {
  const { totalBytes, maxBytes, breakdown } = storageData;

  // Format bytes to readable size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const totalFormatted = formatBytes(totalBytes);
  const maxFormatted = formatBytes(maxBytes);
  const percentage = Math.round((totalBytes / maxBytes) * 100);

  // Update storage breakdown
  const storageImages = document.getElementById('storageImages');
  const storageVideos = document.getElementById('storageVideos');
  const storageFiles = document.getElementById('storageFiles');
  const storageCache = document.getElementById('storageCache');
  const storageTotal = document.getElementById('storageTotal');
  const storageProgress = document.getElementById('storageProgress');
  const storageLimit = document.getElementById('storageLimit');

  if (storageImages) storageImages.textContent = formatBytes(breakdown.images || 0);
  if (storageVideos) storageVideos.textContent = formatBytes(breakdown.videos || 0);
  if (storageFiles) storageFiles.textContent = formatBytes(breakdown.files || 0);
  if (storageCache) storageCache.textContent = formatBytes(breakdown.cache || 0);
  if (storageTotal) storageTotal.textContent = totalFormatted;
  if (storageProgress) storageProgress.style.width = `${percentage}%`;
  if (storageLimit) storageLimit.textContent = `${totalFormatted} / ${maxFormatted} used`;
}

// Manage storage
function manageStorage() {
  const breakdown = window.storageBreakdown || {
    total: '2.4 GB',
    max: '5 GB',
    images: '1.2 GB',
    videos: '0.8 GB',
    files: '0.3 GB',
    cache: '0.1 GB'
  };

  const message = `
Storage Breakdown:
• Images: ${breakdown.images}
• Videos: ${breakdown.videos}
• Files: ${breakdown.files}
• Cache: ${breakdown.cache}

Total: ${breakdown.total} / ${breakdown.max}

Tip: Clear cache to free up space!
  `.trim();

  alert(message);
}

// Open links
function openTerms() {
  window.open('https://wavechat.example.com/terms', '_blank');
}

function openPrivacy() {
  window.open('https://wavechat.example.com/privacy', '_blank');
}

function openCredits() {
  alert('WaveChat v4.2.0\n\nDeveloped with ❤️\n\nBuilt with:\n• Node.js & Express\n• Supabase\n• Socket.io\n• Tailwind CSS\n\n© 2025 WaveChat');
}

// Load saved settings on startup
function loadSavedSettings() {
  // Load theme
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  // Load font size
  const savedFontSize = localStorage.getItem('fontSize') || 'medium';
  currentFontSize = savedFontSize;
  const root = document.documentElement;
  if (currentFontSize === 'small') {
    root.style.fontSize = '14px';
  } else if (currentFontSize === 'large') {
    root.style.fontSize = '18px';
  }
  if (document.querySelector('[data-font-size-label]')) {
    document.querySelector('[data-font-size-label]').textContent = currentFontSize.charAt(0).toUpperCase() + currentFontSize.slice(1);
  }
}

// Save profile information
async function saveProfileInfo() {
  const displayName = document.getElementById('displayName').value;
  const username = document.getElementById('username').value;
  const bio = document.getElementById('bio').value;

  if (!displayName || !username) {
    showToast('Please fill in all required fields');
    return;
  }

  // Save to localStorage
  localStorage.setItem('nickname', displayName);
  localStorage.setItem('username', username.replace('@', ''));
  localStorage.setItem('bio', bio);

  // Sync to backend
  try {
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      await fetch('/api/settings/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ displayName, username, bio })
      });
    }
  } catch (error) {
    console.error('Failed to sync profile:', error);
  }

  showToast('Profile updated successfully!');
  loadUserInfo(); // Refresh display
}

// Save API key
function saveApiKey() {
  const apiKey = document.getElementById('apikey').value;

  if (!apiKey) {
    showToast('Please enter an API key');
    return;
  }

  if (!apiKey.startsWith('sk-or-v1-')) {
    showToast('Invalid OpenRouter API key format');
    return;
  }

  localStorage.setItem('openRouterApiKey', apiKey);
  showToast('API key saved successfully!');
}

// Clear cache
function clearCacheData() {
  if (confirm('Clear all cached data? This will not delete your messages or settings.')) {
    const keysToKeep = ['authToken', 'userId', 'username', 'nickname', 'bio', 'preferredAIModel', 'openRouterApiKey', 'theme', 'fontSize'];
    const allKeys = Object.keys(localStorage);
    let cleared = 0;

    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        cleared++;
      }
    });

    showToast(`Cache cleared! ${cleared} items removed`);
  }
}

// Export data
async function exportData() {
  showToast('Preparing data export...');

  const data = {
    profile: {
      username: localStorage.getItem('username'),
      nickname: localStorage.getItem('nickname'),
      bio: localStorage.getItem('bio')
    },
    settings: {
      theme: localStorage.getItem('theme'),
      fontSize: localStorage.getItem('fontSize'),
      preferredAIModel: localStorage.getItem('preferredAIModel')
    },
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wave-data-export-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Data exported successfully!');
}

// Delete all data
function deleteAllData() {
  const confirmation = prompt('Type "DELETE" to permanently delete all your data:');

  if (confirmation === 'DELETE') {
    if (confirm('Are you absolutely sure? This action cannot be undone!')) {
      localStorage.clear();
      showToast('All data deleted. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    }
  } else if (confirmation !== null) {
    showToast('Deletion cancelled - incorrect confirmation');
  }
}

// Load user profile data
function loadUserProfile() {
  const displayName = localStorage.getItem('nickname') || '';
  const username = localStorage.getItem('username') || '';
  const bio = localStorage.getItem('bio') || '';

  const displayNameInput = document.getElementById('displayName');
  const usernameInput = document.getElementById('username');
  const bioInput = document.getElementById('bio');

  if (displayNameInput) displayNameInput.value = displayName;
  if (usernameInput) usernameInput.value = username ? `@${username}` : '';
  if (bioInput) bioInput.value = bio;
}

// Load API key
function loadApiKey() {
  const apiKey = localStorage.getItem('openRouterApiKey') || '';
  const apiKeyInput = document.getElementById('apikey');

  if (apiKeyInput && apiKey) {
    apiKeyInput.value = apiKey;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Prevent any unwanted prompts on page load
  const originalPrompt = window.prompt;
  let pageLoaded = false;

  // Block prompts during initial page load
  window.prompt = function (...args) {
    if (!pageLoaded) {
      console.log('[Settings] Blocked unwanted prompt during page load:', args);
      return null;
    }
    return originalPrompt.apply(this, args);
  };

  // Re-enable prompts after page is fully loaded
  setTimeout(() => {
    pageLoaded = true;
    window.prompt = originalPrompt;
  }, 1000);

  // Auth is already validated by auth-guard.js
  loadUserInfo();
  loadUserProfile();
  loadApiKey();
  loadSubscriptionStatus();
  loadSavedSettings();
  loadStorageInfo();

  // Load AI models when API tab is opened
  let aiModelsLoaded = false;
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      if (tabName === 'api' && !aiModelsLoaded) {
        loadAIModels();
        aiModelsLoaded = true;
      }
    });
  });

  // Detect browser
  const browserInfo = document.getElementById('browserInfo');
  if (browserInfo) {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    browserInfo.textContent = browser;
  }

  // Attach event listeners
  const saveProfileBtn = document.getElementById('saveProfile');
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveProfileInfo);
  }

  // Auto-save API key on input (debounced) and on blur
  const apiKeyInputEl = document.getElementById('apikey');
  if (apiKeyInputEl) {
    let saveTimeout = null;
    apiKeyInputEl.addEventListener('input', () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveApiKey();
        saveTimeout = null;
      }, 800);
    });
    apiKeyInputEl.addEventListener('blur', () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      saveApiKey();
    });
  }

  // Privacy toggles
  const profileVisibility = document.getElementById('profileVisibility');
  if (profileVisibility) {
    profileVisibility.value = localStorage.getItem('profileVisibility') || 'everyone';
    profileVisibility.addEventListener('change', (e) => {
      localStorage.setItem('profileVisibility', e.target.value);
      showToast(`Profile visibility: ${e.target.options[e.target.selectedIndex].text}`);
    });
  }

  const onlineStatus = document.getElementById('onlineStatus');
  if (onlineStatus) {
    onlineStatus.checked = localStorage.getItem('onlineStatus') !== 'false';
    onlineStatus.addEventListener('change', (e) => {
      toggleSetting('onlineStatus', e.target.checked);
    });
  }

  const readReceipts = document.getElementById('readReceipts');
  if (readReceipts) {
    readReceipts.checked = localStorage.getItem('readReceipts') !== 'false';
    readReceipts.addEventListener('change', (e) => {
      toggleSetting('readReceipts', e.target.checked);
    });
  }

  const typingIndicators = document.getElementById('typingIndicators');
  if (typingIndicators) {
    typingIndicators.checked = localStorage.getItem('typingIndicators') !== 'false';
    typingIndicators.addEventListener('change', (e) => {
      toggleSetting('typingIndicators', e.target.checked);
    });
  }

  // Notification toggles
  const desktopNotifications = document.getElementById('desktopNotifications');
  if (desktopNotifications) {
    desktopNotifications.checked = localStorage.getItem('desktopNotifications') === 'true';
    desktopNotifications.addEventListener('change', (e) => {
      toggleSetting('desktopNotifications', e.target.checked);
      if (e.target.checked && 'Notification' in window) {
        Notification.requestPermission();
      }
    });
  }

  const soundNotifications = document.getElementById('soundNotifications');
  if (soundNotifications) {
    soundNotifications.checked = localStorage.getItem('soundNotifications') === 'true';
    soundNotifications.addEventListener('change', (e) => {
      toggleSetting('soundNotifications', e.target.checked);
    });
  }

  const messagePreview = document.getElementById('messagePreview');
  if (messagePreview) {
    messagePreview.checked = localStorage.getItem('messagePreview') !== 'false';
    messagePreview.addEventListener('change', (e) => {
      toggleSetting('messagePreview', e.target.checked);
    });
  }

  // Accessibility toggles
  const reduceMotion = document.getElementById('reduceMotion');
  if (reduceMotion) {
    reduceMotion.checked = localStorage.getItem('reduceMotion') === 'true';
    reduceMotion.addEventListener('change', (e) => {
      toggleSetting('reduceMotion', e.target.checked);
      if (e.target.checked) {
        document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      } else {
        document.documentElement.style.removeProperty('--animation-duration');
      }
    });
  }

  const highContrast = document.getElementById('highContrast');
  if (highContrast) {
    highContrast.checked = localStorage.getItem('highContrast') === 'true';
    highContrast.addEventListener('change', (e) => {
      toggleSetting('highContrast', e.target.checked);
      if (e.target.checked) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
    });
  }

  // Text size slider
  const textSizeSlider = document.getElementById('textSizeSlider');
  const textSizeValue = document.getElementById('textSizeValue');
  if (textSizeSlider && textSizeValue) {
    const savedSize = localStorage.getItem('textSize') || '16';
    textSizeSlider.value = savedSize;
    textSizeValue.textContent = `${savedSize}px`;
    document.documentElement.style.fontSize = `${savedSize}px`;

    textSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      textSizeValue.textContent = `${size}px`;
      document.documentElement.style.fontSize = `${size}px`;
      localStorage.setItem('textSize', size);
    });
  }

  const keyboardShortcuts = document.getElementById('keyboardShortcuts');
  if (keyboardShortcuts) {
    keyboardShortcuts.checked = localStorage.getItem('keyboardShortcuts') !== 'false';
    keyboardShortcuts.addEventListener('change', (e) => {
      toggleSetting('keyboardShortcuts', e.target.checked);
    });
  }

  // Auto-download toggles
  const autoDownloadPhotos = document.getElementById('autoDownloadPhotos');
  if (autoDownloadPhotos) {
    autoDownloadPhotos.checked = localStorage.getItem('autoDownloadPhotos') !== 'false';
    autoDownloadPhotos.addEventListener('change', (e) => {
      toggleSetting('autoDownloadPhotos', e.target.checked);
    });
  }

  const autoDownloadVideos = document.getElementById('autoDownloadVideos');
  if (autoDownloadVideos) {
    autoDownloadVideos.checked = localStorage.getItem('autoDownloadVideos') === 'true';
    autoDownloadVideos.addEventListener('change', (e) => {
      toggleSetting('autoDownloadVideos', e.target.checked);
    });
  }

  // Language & Region selectors
  const displayLanguage = document.getElementById('displayLanguage');
  if (displayLanguage) {
    displayLanguage.value = localStorage.getItem('displayLanguage') || 'en-US';
    displayLanguage.addEventListener('change', (e) => {
      localStorage.setItem('displayLanguage', e.target.value);
      showToast(`Language: ${e.target.options[e.target.selectedIndex].text}`);
    });
  }

  const timeZone = document.getElementById('timeZone');
  if (timeZone) {
    timeZone.value = localStorage.getItem('timeZone') || 'auto';
    timeZone.addEventListener('change', (e) => {
      localStorage.setItem('timeZone', e.target.value);
      showToast(`Time zone updated`);
    });
  }

  const dateFormat = document.getElementById('dateFormat');
  if (dateFormat) {
    dateFormat.value = localStorage.getItem('dateFormat') || 'MM/DD/YYYY';
    dateFormat.addEventListener('change', (e) => {
      localStorage.setItem('dateFormat', e.target.value);
      showToast(`Date format: ${e.target.value}`);
    });
  }

  const timeFormat = document.getElementById('timeFormat');
  if (timeFormat) {
    timeFormat.value = localStorage.getItem('timeFormat') || '12';
    timeFormat.addEventListener('change', (e) => {
      localStorage.setItem('timeFormat', e.target.value);
      showToast(`Time format: ${e.target.value === '12' ? '12-hour' : '24-hour'}`);
    });
  }

  // Background theme selector
  initBackgroundSelector();
});

// Background theme selector functions
function initBackgroundSelector() {
  // Load saved background settings
  const savedBackground = localStorage.getItem('chatBackground') || 'none';
  const savedOpacity = localStorage.getItem('bgOpacity') || '10';
  const savedBlur = localStorage.getItem('bgBlur') || '4';

  // Update UI to reflect saved settings
  updateBackgroundSelection(savedBackground);

  const bgOpacitySlider = document.getElementById('bgOpacitySlider');
  const bgOpacityValue = document.getElementById('bgOpacityValue');
  const bgBlurSlider = document.getElementById('bgBlurSlider');
  const bgBlurValue = document.getElementById('bgBlurValue');

  if (bgOpacitySlider && bgOpacityValue) {
    bgOpacitySlider.value = savedOpacity;
    bgOpacityValue.textContent = `${savedOpacity}%`;

    bgOpacitySlider.addEventListener('input', (e) => {
      const value = e.target.value;
      bgOpacityValue.textContent = `${value}%`;
      localStorage.setItem('bgOpacity', value);
      applyBackgroundToChat();
    });
  }

  if (bgBlurSlider && bgBlurValue) {
    bgBlurSlider.value = savedBlur;
    bgBlurValue.textContent = `${savedBlur}px`;

    bgBlurSlider.addEventListener('input', (e) => {
      const value = e.target.value;
      bgBlurValue.textContent = `${value}px`;
      localStorage.setItem('bgBlur', value);
      applyBackgroundToChat();
    });
  }

  // Background option buttons
  const backgroundOptions = document.querySelectorAll('.background-option');
  backgroundOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const background = option.dataset.background;
      if (background) {
        selectBackground(background);
      }
    });
  });

  // Custom background upload
  const customBackgroundInput = document.getElementById('customBackgroundInput');
  if (customBackgroundInput) {
    customBackgroundInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        // Show loading toast
        showToast('Uploading background...');

        try {
          // Upload to Supabase via backend
          const formData = new FormData();
          formData.append('background', file);

          const authToken = localStorage.getItem('authToken');
          const response = await fetch('/api/settings/background', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`
            },
            body: formData
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const data = await response.json();

          if (data.success && data.data.backgroundUrl) {
            // Store the Supabase URL instead of base64
            localStorage.setItem('customBackgroundUrl', data.data.backgroundUrl);
            selectBackground('custom');
            showToast('Background uploaded successfully!');
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } catch (error) {
          console.error('[Background] Upload error:', error);
          showToast('Failed to upload background');
        }
      }
    });
  }
}

function selectBackground(backgroundType) {
  localStorage.setItem('chatBackground', backgroundType);
  updateBackgroundSelection(backgroundType);
  applyBackgroundToChat();
  showToast(`Background: ${backgroundType}`);
}

function updateBackgroundSelection(activeBackground) {
  const backgroundOptions = document.querySelectorAll('.background-option');
  backgroundOptions.forEach(option => {
    const background = option.dataset.background;
    const checkIcon = option.querySelector('.material-symbols-outlined:last-child');

    if (background === activeBackground) {
      option.classList.add('border-primary', 'bg-surface-dark-hover');
      option.classList.remove('border-[#223f49]');
      if (checkIcon && !checkIcon.classList.contains('text-primary')) {
        checkIcon.classList.remove('hidden');
      }
    } else {
      option.classList.remove('border-primary', 'bg-surface-dark-hover');
      option.classList.add('border-[#223f49]');
      if (checkIcon && checkIcon.classList.contains('text-primary')) {
        checkIcon.classList.add('hidden');
      }
    }
  });
}

function applyBackgroundToChat() {
  // This function will be called to apply the background to chat.html
  // The actual application happens in chat.html on page load
  // We just save the settings here
  console.log('[Background] Settings saved, will apply on next chat page load');
}
