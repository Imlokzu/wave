/**
 * UI Manager - Handles DOM manipulation and rendering
 * Keeps UI logic separate from business logic
 */

class UIManager {
  constructor() {
    this.elements = {};
    this.messageContainer = null;
    this.typingTimeout = null;
  }

  /**
   * Format markdown text to HTML
   * Supports: **bold**, *italic*, `code`, ```code blocks```
   */
  formatMarkdown(text) {
    if (!text) return '';
    
    // Escape HTML to prevent XSS
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Code blocks with language (```lang\ncode```) - must be before inline code
    formatted = formatted.replace(/```(\w+)?\n([\s\S]+?)```/g, function(match, lang, code) {
      const language = lang || 'code';
      return `<pre class="bg-black/40 p-3 rounded-lg my-2 overflow-x-auto border border-white/10"><div class="text-xs text-slate-400 mb-2 uppercase">${language}</div><code class="text-primary font-mono text-sm">${code.trim()}</code></pre>`;
    });
    
    // Code blocks without language
    formatted = formatted.replace(/```([^`]+)```/g, '<pre class="bg-black/40 p-3 rounded-lg my-2 overflow-x-auto border border-white/10"><code class="text-primary font-mono text-sm">$1</code></pre>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-2 py-0.5 rounded text-primary font-mono text-xs">$1</code>');
    
    // Headings (###, ##, #)
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-white mt-3 mb-2">$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-3 mb-2">$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-3 mb-2">$1</h1>');
    
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    
    // Italic
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
    
    // Unordered lists (- item or * item)
    formatted = formatted.replace(/^[•\-\*] (.+)$/gm, '<li class="ml-4 flex items-start gap-2"><span class="text-primary mt-1">•</span><span>$1</span></li>');
    
    // Numbered lists (1. item)
    let listCounter = 0;
    formatted = formatted.replace(/^\d+\. (.+)$/gm, function(match, text) {
      listCounter++;
      return `<li class="ml-4 flex items-start gap-2"><span class="text-primary font-semibold min-w-[20px]">${listCounter}.</span><span>${text}</span></li>`;
    });
    
    // Wrap consecutive list items in ul
    formatted = formatted.replace(/(<li class="ml-4[^>]*>.*?<\/li>\n?)+/g, function(match) {
      return '<ul class="my-2 space-y-1">' + match + '</ul>';
    });
    
    // Links [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary hover:text-sky-400 underline">$1</a>');
    
    // Blockquotes (> text)
    formatted = formatted.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-primary/50 bg-black/20 pl-3 py-2 italic my-2">$1</blockquote>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  /**
   * Create UI Component (translation, code, etc.)
   */
  createUIComponent(uiComponent) {
    const container = document.createElement('div');
    container.className = 'ui-component';
    
    switch (uiComponent.type) {
      case 'translation':
        return this.createTranslationUI(uiComponent.data);
      case 'code':
        return this.createCodeUI(uiComponent.data);
      case 'search':
        return this.createSearchUI(uiComponent.data);
      case 'summary':
        return this.createSummaryUI(uiComponent.data);
      default:
        container.textContent = 'Unknown UI component';
        return container;
    }
  }

  /**
   * Create Translation UI Component
   */
  createTranslationUI(data) {
    const container = document.createElement('div');
    container.className = 'translation-card bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3';
    
    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 text-blue-400 text-sm font-medium';
    header.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">translate</span>
      <span>Translation</span>
      <span class="text-slate-400 text-xs ml-auto">${data.model || 'AI'}</span>
    `;
    container.appendChild(header);
    
    // Original text
    const originalSection = document.createElement('div');
    originalSection.className = 'space-y-1';
    originalSection.innerHTML = `
      <div class="text-xs text-slate-400 uppercase tracking-wide">Original</div>
      <div class="text-white bg-black/20 rounded-lg p-3">${this.escapeHtml(data.originalText)}</div>
    `;
    container.appendChild(originalSection);
    
    // Arrow
    const arrow = document.createElement('div');
    arrow.className = 'flex justify-center';
    arrow.innerHTML = '<span class="material-symbols-outlined text-blue-400">arrow_downward</span>';
    container.appendChild(arrow);
    
    // Translated text
    const translatedSection = document.createElement('div');
    translatedSection.className = 'space-y-1';
    translatedSection.innerHTML = `
      <div class="text-xs text-blue-400 uppercase tracking-wide">${data.targetLang}</div>
      <div class="text-white bg-blue-500/10 rounded-lg p-3 font-medium">${this.escapeHtml(data.translatedText)}</div>
    `;
    container.appendChild(translatedSection);
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'w-full mt-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2';
    copyBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">content_copy</span><span>Copy Translation</span>';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(data.translatedText);
      copyBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span><span>Copied!</span>';
      setTimeout(() => {
        copyBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">content_copy</span><span>Copy Translation</span>';
      }, 2000);
    };
    container.appendChild(copyBtn);
    
    return container;
  }

  /**
   * Escape HTML for safe display
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Initialize UI elements
   */
  init() {
    // Screens
    this.elements.loginScreen = document.getElementById('loginScreen');
    this.elements.chatScreen = document.getElementById('chatScreen');

    // No login form needed - handled by separate login page

    // Chat elements
    this.elements.messagesContainer = document.getElementById('messages');
    this.elements.messageInput = document.getElementById('messageInput');
    this.elements.sendButton = document.getElementById('sendButton');
    this.elements.userNickname = document.getElementById('userNickname');
    this.elements.roomName = document.getElementById('roomName');
    this.elements.roomNameRight = document.getElementById('roomNameRight');
    this.elements.roomsList = document.getElementById('roomsListContainer');
    this.elements.dmsList = document.getElementById('dmsListContainer');

    this.messageContainer = this.elements.messagesContainer;
  }

  /**
   * Show/hide screens
   */
  showLogin() {
    if (this.elements.loginScreen) {
      this.elements.loginScreen.classList.remove('hidden');
      this.elements.loginScreen.style.display = 'flex';
    }
    if (this.elements.chatScreen) {
      this.elements.chatScreen.classList.remove('active');
      this.elements.chatScreen.style.display = 'none';
    }
  }

  showChat() {
    if (this.elements.loginScreen) {
      this.elements.loginScreen.classList.add('hidden');
      this.elements.loginScreen.style.display = 'none';
    }
    if (this.elements.chatScreen) {
      this.elements.chatScreen.classList.add('active');
      this.elements.chatScreen.style.display = 'flex';
    }
    this.elements.messageInput?.focus();
  }

  /**
   * Show messages container
   */
  showMessages() {
    if (this.messageContainer) {
      this.messageContainer.style.display = 'block';
    }
    // Hide empty state if it exists
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.remove();
    }
  }

  /**
   * Hide messages container
   */
  hideMessages() {
    if (this.messageContainer) {
      this.messageContainer.style.display = 'none';
    }
  }

  /**
   * Show empty state for tabs
   */
  showEmptyState(tabName) {
    const messagesParent = this.messageContainer?.parentElement;
    if (!messagesParent) return;

    // Remove existing empty state
    const existing = document.getElementById('emptyState');
    if (existing) {
      existing.remove();
    }

    // Create empty state
    const emptyState = document.createElement('div');
    emptyState.id = 'emptyState';
    emptyState.className = 'flex flex-col items-center justify-center h-full text-center p-8';
    
    const icon = tabName === 'Clans' ? 'groups' : 'person_add';
    const title = tabName === 'Clans' ? 'No Clans Yet' : 'No Guests Yet';
    const description = tabName === 'Clans' 
      ? 'Create or join a clan to start collaborating with your team.'
      : 'Invite guests to join your conversations.';

    emptyState.innerHTML = `
      <div class="w-24 h-24 rounded-full bg-surface-lighter flex items-center justify-center mb-6">
        <span class="material-symbols-outlined text-slate-500 text-5xl">${icon}</span>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">${title}</h3>
      <p class="text-slate-400 text-sm max-w-md mb-6">${description}</p>
      <button class="px-6 py-3 bg-primary hover:bg-primary-hover rounded-lg text-white font-medium transition-colors">
        ${tabName === 'Clans' ? 'Create Clan' : 'Invite Guest'}
      </button>
    `;

    messagesParent.appendChild(emptyState);
  }

  /**
   * Display error message
   */
  showError(message, duration = 5000) {
    if (!this.elements.loginError) return;

    this.elements.loginError.textContent = message;
    this.elements.loginError.style.display = 'block';

    setTimeout(() => {
      this.elements.loginError.style.display = 'none';
    }, duration);
  }

  /**
   * Update user info in sidebar
   */
  updateUserInfo(nickname) {
    if (this.elements.userNickname) {
      this.elements.userNickname.textContent = nickname;
    }
  }

  /**
   * Update room name
   */
  updateRoomName(name) {
    if (this.elements.roomName) {
      this.elements.roomName.textContent = name;
    }
    if (this.elements.roomNameRight) {
      this.elements.roomNameRight.textContent = name;
    }
  }

  /**
   * Update rooms list in sidebar
   */
  updateRoomsList(rooms) {
    if (!this.elements.roomsList) return;

    this.elements.roomsList.innerHTML = '';

    rooms.forEach(room => {
      const roomEl = document.createElement('div');
      roomEl.className = 'px-4 py-3 hover:bg-surface-lighter cursor-pointer transition-colors border-l-2 border-primary bg-surface-lighter/50';
      
      roomEl.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-primary">waves</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-white truncate">${room.name || 'Room'}</h3>
              <span class="text-xs text-slate-500">now</span>
            </div>
            <p class="text-xs text-slate-400 truncate">Active room</p>
          </div>
        </div>
      `;

      this.elements.roomsList.appendChild(roomEl);
    });
  }

  /**
   * Update room members list
   */
  updateRoomMembers(members) {
    console.log('[UI] updateRoomMembers called with:', members);
    const membersList = document.getElementById('roomMembersList');
    console.log('[UI] membersList element:', membersList);
    if (!membersList) {
      console.error('[UI] roomMembersList element NOT FOUND!');
      return;
    }

    if (!members || members.length === 0) {
      console.log('[UI] No members, showing empty state');
      membersList.innerHTML = '<div class="text-xs text-slate-400 text-center py-2">No members</div>';
      return;
    }

    // Deduplicate members by nickname (case-insensitive)
    const seen = new Set();
    const uniqueMembers = members.filter(member => {
      const key = (member.nickname || member.username || 'User').toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    console.log('[UI] Rendering', uniqueMembers.length, 'unique members:', uniqueMembers.map(m => `${m.nickname}${m.isAway ? ' (away)' : ''}`));

    // Determine status based on isAway flag
    membersList.innerHTML = uniqueMembers.map(member => {
      const isAway = member.isAway === true;
      const statusColor = isAway ? 'bg-yellow-500' : 'bg-green-500';
      const statusText = isAway ? 'Away' : 'Online';
      
      return `
        <div class="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-lighter transition-colors">
          <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 relative">
            <span class="material-symbols-outlined text-primary text-[16px]">person</span>
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColor} rounded-full border-2 border-surface-dark"></div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-white truncate">${member.nickname || member.username || 'User'}</div>
            <div class="text-xs ${isAway ? 'text-yellow-400' : 'text-green-400'} truncate">${statusText}</div>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('[UI] Members list updated successfully');
  }

  /**
   * Render message
   */
  renderMessage(message, currentUserId) {
    // Don't show deleted messages
    if (message.isDeleted) {
      return;
    }

    // Check if message is own - compare by senderId OR by nickname if senderId doesn't match
    // This handles the case where socket.id changes after page reload
    const currentNickname = state?.get('user.nickname');
    const isOwn = message.senderId === currentUserId || 
                  (currentNickname && message.senderNickname === currentNickname);
    
    const messageEl = this.createMessageElement(message, isOwn);
    
    // Add animation class
    messageEl.classList.add('message-enter');
    
    // Check if user was scrolled to bottom before adding message
    const wasAtBottom = this.isScrolledToBottom();
    
    this.messageContainer.appendChild(messageEl);
    
    // Auto-scroll if user was at bottom OR if it's their own message
    if (wasAtBottom || isOwn) {
      this.scrollToBottom(true);
    } else {
      // Show scroll button with unread indicator
      this.updateScrollButton();
    }
  }

  /**
   * Create message DOM element
   */
  createMessageElement(message, isOwn) {
    const messageEl = document.createElement('div');
    messageEl.dataset.messageId = message.id;

    // System messages
    if (message.type === 'system') {
      return this.createSystemMessage(message.content);
    }

    // Invite messages
    if (message.type === 'invite') {
      return this.createInviteMessage(message);
    }

    // Regular messages
    if (isOwn) {
      messageEl.className = 'flex flex-row-reverse gap-4 max-w-3xl ml-auto group/msg';
      messageEl.appendChild(this.createOwnMessageContent(message));
    } else {
      messageEl.className = 'flex gap-4 max-w-3xl group/msg';
      messageEl.appendChild(this.createOtherMessageContent(message));
    }

    return messageEl;
  }

  /**
   * Create own message content
   */
  createOwnMessageContent(message) {
    console.log('[UI] Creating own message content:', { id: message.id, type: message.type });
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex flex-col gap-1 items-end';

    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'relative';

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'bg-gradient-to-r from-primary to-accent-cyan p-4 rounded-2xl rounded-tr-none shadow-md text-white text-sm leading-relaxed';
    
    // Handle different message types
    if (message.type === 'image' && message.imageUrl) {
      // Image message with download button
      const imageContainer = document.createElement('div');
      imageContainer.className = 'relative group/image';
      
      const img = document.createElement('img');
      img.src = message.imageUrl;
      img.alt = 'Uploaded image';
      img.className = 'max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity';
      img.onclick = () => window.open(message.imageUrl, '_blank');
      
      // Download button overlay
      const downloadBtn = document.createElement('a');
      downloadBtn.href = message.imageUrl;
      downloadBtn.download = `image_${Date.now()}.jpg`;
      downloadBtn.className = 'absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity';
      downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-white">download</span>';
      downloadBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        fetch(message.imageUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `image_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          })
          .catch(err => {
            console.error('Download failed:', err);
            window.open(message.imageUrl, '_blank');
          });
      };
      
      imageContainer.appendChild(img);
      imageContainer.appendChild(downloadBtn);
      bubbleEl.appendChild(imageContainer);
      
      // Add caption if there's content
      if (message.content) {
        const caption = document.createElement('p');
        caption.className = 'mt-2';
        caption.innerHTML = this.formatMarkdown(message.content);
        bubbleEl.appendChild(caption);
      }
    } else if (message.type === 'file' && message.fileUrl) {
      // File message - check if it's audio
      const isAudio = message.fileName && (
        message.fileName.toLowerCase().endsWith('.mp3') ||
        message.fileName.toLowerCase().endsWith('.wav') ||
        message.fileName.toLowerCase().endsWith('.ogg') ||
        message.fileName.toLowerCase().endsWith('.m4a') ||
        message.fileName.toLowerCase().endsWith('.webm')
      );
      
      if (isAudio) {
        // Custom audio player with modern UI
        const audioContainer = document.createElement('div');
        audioContainer.className = 'relative group/audio flex flex-col gap-2 min-w-[320px] max-w-[400px]';
        
        // Hidden audio element
        const audioElement = document.createElement('audio');
        audioElement.src = message.fileUrl;
        audioElement.preload = 'metadata';
        
        // Player wrapper
        const playerWrapper = document.createElement('div');
        playerWrapper.className = 'relative bg-white/10 rounded-lg p-4';
        
        // Custom player controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'flex items-center gap-3';
        
        // Play/Pause button
        const playBtn = document.createElement('button');
        playBtn.className = 'w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors shrink-0';
        playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px]">play_arrow</span>';
        
        let isPlaying = false;
        playBtn.onclick = () => {
          if (isPlaying) {
            audioElement.pause();
            playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px]">play_arrow</span>';
          } else {
            audioElement.play();
            playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px]">pause</span>';
          }
          isPlaying = !isPlaying;
        };
        
        // Progress container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'flex-1 flex flex-col gap-1';
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'w-full h-1 bg-white/20 rounded-full cursor-pointer relative';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'h-full bg-white rounded-full transition-all';
        progressFill.style.width = '0%';
        progressBar.appendChild(progressFill);
        
        // Time display
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'flex justify-between text-xs opacity-70';
        timeDisplay.innerHTML = '<span class="current-time">0:00</span><span class="duration">0:00</span>';
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(timeDisplay);
        
        controlsContainer.appendChild(playBtn);
        controlsContainer.appendChild(progressContainer);
        
        // Audio event listeners
        audioElement.addEventListener('loadedmetadata', () => {
          const duration = audioElement.duration;
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          timeDisplay.querySelector('.duration').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        audioElement.addEventListener('timeupdate', () => {
          const progress = (audioElement.currentTime / audioElement.duration) * 100;
          progressFill.style.width = `${progress}%`;
          
          const currentTime = audioElement.currentTime;
          const minutes = Math.floor(currentTime / 60);
          const seconds = Math.floor(currentTime % 60);
          timeDisplay.querySelector('.current-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        audioElement.addEventListener('ended', () => {
          isPlaying = false;
          playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px]">play_arrow</span>';
          progressFill.style.width = '0%';
          audioElement.currentTime = 0;
        });
        
        // Progress bar click to seek
        progressBar.onclick = (e) => {
          const rect = progressBar.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          audioElement.currentTime = percent * audioElement.duration;
        };
        
        // Download button overlay
        const downloadBtn = document.createElement('a');
        downloadBtn.href = message.fileUrl;
        downloadBtn.download = message.fileName || 'audio';
        downloadBtn.className = 'absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover/audio:opacity-100 transition-opacity z-10';
        downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-white">download</span>';
        downloadBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          fetch(message.fileUrl)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = message.fileName || 'audio';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => {
              console.error('Download failed:', err);
              window.open(message.fileUrl, '_blank');
            });
        };
        
        playerWrapper.appendChild(downloadBtn);
        playerWrapper.appendChild(controlsContainer);
        
        // Audio info below player
        const audioInfo = document.createElement('div');
        audioInfo.className = 'flex items-center gap-2 text-xs opacity-80 px-1';
        
        const audioIcon = document.createElement('span');
        audioIcon.className = 'material-symbols-outlined text-[16px]';
        audioIcon.textContent = 'audio_file';
        
        const audioName = document.createElement('span');
        audioName.className = 'truncate flex-1';
        audioName.textContent = message.fileName || 'Audio';
        
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs opacity-60';
        fileSize.textContent = this.formatFileSize(message.fileSize || 0);
        
        audioInfo.appendChild(audioIcon);
        audioInfo.appendChild(audioName);
        audioInfo.appendChild(fileSize);
        
        audioContainer.appendChild(playerWrapper);
        audioContainer.appendChild(audioInfo);
        bubbleEl.appendChild(audioContainer);
      } else {
        // Regular file
        const fileContainer = document.createElement('div');
        fileContainer.className = 'flex items-center gap-3 min-w-[250px]';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0';
        fileIcon.innerHTML = '<span class="material-symbols-outlined">description</span>';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex-1 min-w-0';
        
        const fileName = document.createElement('div');
        fileName.className = 'font-medium truncate';
        fileName.textContent = message.fileName || 'File';
        
        const fileSize = document.createElement('div');
        fileSize.className = 'text-xs opacity-80';
        fileSize.textContent = this.formatFileSize(message.fileSize || 0);
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        
        const downloadBtn = document.createElement('a');
        downloadBtn.href = message.fileUrl;
        downloadBtn.download = message.fileName || 'file';
        downloadBtn.rel = 'noopener noreferrer';
        downloadBtn.className = 'w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition-colors';
        downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">download</span>';
        downloadBtn.onclick = (e) => {
          // Force download for all file types
          e.preventDefault();
          fetch(message.fileUrl)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = message.fileName || 'file';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => {
              console.error('Download failed:', err);
              // Fallback to opening in new tab
              window.open(message.fileUrl, '_blank');
            });
        };
        
        fileContainer.appendChild(fileIcon);
        fileContainer.appendChild(fileInfo);
        fileContainer.appendChild(downloadBtn);
        bubbleEl.appendChild(fileContainer);
      }
    } else if (message.type === 'poll' && message.pollData) {
      // Poll message - render interactive poll
      bubbleEl.appendChild(this.createPollContent(message));
    } else if (message.uiComponent) {
      // UI Component message (translation, code, etc.)
      bubbleEl.appendChild(this.createUIComponent(message.uiComponent));
    } else {
      // Text message - format markdown
      bubbleEl.innerHTML = this.formatMarkdown(message.content);
    }

    // Action buttons
    const actionsDiv = this.createMessageActions(message.id, message.content, message.type);
    bubbleWrapper.appendChild(actionsDiv);
    bubbleWrapper.appendChild(bubbleEl);

    contentDiv.appendChild(bubbleWrapper);

    // Message status row (time + read status)
    const statusRow = document.createElement('div');
    statusRow.className = 'flex items-center gap-1 mt-1';
    
    // Timestamp
    const timeSpan = document.createElement('span');
    timeSpan.className = 'text-xs text-slate-400';
    const msgTime = message.timestamp ? new Date(message.timestamp) : new Date();
    timeSpan.textContent = msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    statusRow.appendChild(timeSpan);

    // Edited indicator
    if (message.isEdited) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'text-xs text-slate-400';
      editedSpan.textContent = '· edited';
      statusRow.appendChild(editedSpan);
    }

    // Read status checkmarks (for both rooms and DMs)
    const currentContext = window.app?.state?.getCurrentContext();
    const isDM = currentContext?.type === 'dm';
    
    // Show checkmarks for own messages
    const checkmarks = document.createElement('span');
    checkmarks.className = 'material-symbols-outlined text-[14px] ml-1 cursor-pointer';
    checkmarks.dataset.messageId = message.id;
    
    // Determine read status
    const readBy = message.readBy || [];
    const viewerCount = readBy.length;
    
    if (viewerCount > 0) {
      // Message has been read - double blue checkmark
      checkmarks.textContent = 'done_all';
      checkmarks.className += ' text-accent-cyan';
      if (isDM) {
        checkmarks.title = `Read by ${readBy[0]?.nickname || 'recipient'}`;
      } else {
        checkmarks.title = `Read by ${viewerCount} ${viewerCount === 1 ? 'person' : 'people'}`;
      }
      
      // Add click handler to show who read the message (only for rooms)
      if (!isDM) {
        checkmarks.onclick = (e) => {
          e.stopPropagation();
          this.showReadByList(message.id, readBy);
        };
      }
    } else if (message.delivered) {
      // Message delivered but not read - double gray checkmark
      checkmarks.textContent = 'done_all';
      checkmarks.className += ' text-slate-400';
      checkmarks.title = 'Delivered';
    } else {
      // Message sent - single gray checkmark
      checkmarks.textContent = 'check';
      checkmarks.className += ' text-slate-400';
      checkmarks.title = 'Sent';
    }
    
    statusRow.appendChild(checkmarks);
    contentDiv.appendChild(statusRow);

    return contentDiv;
  }

  /**
   * Create other user message content
   */
  createOtherMessageContent(message) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex gap-4';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'w-10 h-10 rounded-full bg-surface-lighter shrink-0 mt-1 flex items-center justify-center overflow-hidden';
    
    // Check if user has avatar
    if (message.senderAvatar || message.avatar) {
      const avatarImg = document.createElement('img');
      avatarImg.src = message.senderAvatar || message.avatar;
      avatarImg.alt = message.senderNickname || 'User';
      avatarImg.className = 'w-full h-full object-cover';
      avatarImg.onerror = function() {
        // Fallback to icon if image fails to load
        this.parentElement.innerHTML = '<span class="material-symbols-outlined text-slate-400">person</span>';
      };
      avatar.appendChild(avatarImg);
    } else {
      avatar.innerHTML = '<span class="material-symbols-outlined text-slate-400">person</span>';
    }

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'flex flex-col gap-1';

    // Name
    const nameDiv = document.createElement('div');
    nameDiv.className = 'flex items-baseline gap-2';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'text-sm font-bold text-white';
    nameSpan.textContent = message.senderNickname || 'Unknown';
    nameDiv.appendChild(nameSpan);

    // Edited indicator
    if (message.isEdited) {
      const editedSpan = document.createElement('span');
      editedSpan.className = 'text-xs text-slate-500 ml-2';
      editedSpan.textContent = '(edited)';
      nameDiv.appendChild(editedSpan);
    }

    // Bubble
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'bg-surface-dark p-4 rounded-2xl rounded-tl-none shadow-sm text-slate-200 text-sm leading-relaxed border border-slate-800';
    
    // Handle different message types
    if (message.type === 'image' && message.imageUrl) {
      // Image message with download button
      const imageContainer = document.createElement('div');
      imageContainer.className = 'relative group/image';
      
      const img = document.createElement('img');
      img.src = message.imageUrl;
      img.alt = 'Uploaded image';
      img.className = 'max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity';
      img.onclick = () => window.open(message.imageUrl, '_blank');
      
      // Download button overlay
      const downloadBtn = document.createElement('a');
      downloadBtn.href = message.imageUrl;
      downloadBtn.download = `image_${Date.now()}.jpg`;
      downloadBtn.className = 'absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity';
      downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-white">download</span>';
      downloadBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        fetch(message.imageUrl)
          .then(response => response.blob())
          .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `image_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          })
          .catch(err => {
            console.error('Download failed:', err);
            window.open(message.imageUrl, '_blank');
          });
      };
      
      imageContainer.appendChild(img);
      imageContainer.appendChild(downloadBtn);
      bubbleEl.appendChild(imageContainer);
      
      // Add caption if there's content
      if (message.content) {
        const caption = document.createElement('p');
        caption.className = 'mt-2';
        caption.innerHTML = this.formatMarkdown(message.content);
        bubbleEl.appendChild(caption);
      }
    } else if (message.type === 'file' && message.fileUrl) {
      // File message - check if it's audio
      const isAudio = message.fileName && (
        message.fileName.toLowerCase().endsWith('.mp3') ||
        message.fileName.toLowerCase().endsWith('.wav') ||
        message.fileName.toLowerCase().endsWith('.ogg') ||
        message.fileName.toLowerCase().endsWith('.m4a') ||
        message.fileName.toLowerCase().endsWith('.webm')
      );
      
      if (isAudio) {
        // Audio player with better styling
        // Custom audio player with modern UI
        const audioContainer = document.createElement('div');
        audioContainer.className = 'relative group/audio flex flex-col gap-2 min-w-[320px] max-w-[400px]';
        
        // Hidden audio element
        const audioElement = document.createElement('audio');
        audioElement.src = message.fileUrl;
        audioElement.preload = 'metadata';
        
        // Player wrapper
        const playerWrapper = document.createElement('div');
        playerWrapper.className = 'relative bg-slate-700/50 rounded-lg p-4';
        
        // Custom player controls
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'flex items-center gap-3';
        
        // Play/Pause button
        const playBtn = document.createElement('button');
        playBtn.className = 'w-10 h-10 rounded-full bg-slate-600 hover:bg-slate-500 flex items-center justify-center transition-colors shrink-0';
        playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px] text-primary">play_arrow</span>';
        
        let isPlaying = false;
        playBtn.onclick = () => {
          if (isPlaying) {
            audioElement.pause();
            playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px] text-primary">play_arrow</span>';
          } else {
            audioElement.play();
            playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px] text-primary">pause</span>';
          }
          isPlaying = !isPlaying;
        };
        
        // Progress container
        const progressContainer = document.createElement('div');
        progressContainer.className = 'flex-1 flex flex-col gap-1';
        
        // Progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'w-full h-1 bg-slate-600 rounded-full cursor-pointer relative';
        
        const progressFill = document.createElement('div');
        progressFill.className = 'h-full bg-primary rounded-full transition-all';
        progressFill.style.width = '0%';
        progressBar.appendChild(progressFill);
        
        // Time display
        const timeDisplay = document.createElement('div');
        timeDisplay.className = 'flex justify-between text-xs text-slate-400';
        timeDisplay.innerHTML = '<span class="current-time">0:00</span><span class="duration">0:00</span>';
        
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(timeDisplay);
        
        controlsContainer.appendChild(playBtn);
        controlsContainer.appendChild(progressContainer);
        
        // Audio event listeners
        audioElement.addEventListener('loadedmetadata', () => {
          const duration = audioElement.duration;
          const minutes = Math.floor(duration / 60);
          const seconds = Math.floor(duration % 60);
          timeDisplay.querySelector('.duration').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        audioElement.addEventListener('timeupdate', () => {
          const progress = (audioElement.currentTime / audioElement.duration) * 100;
          progressFill.style.width = `${progress}%`;
          
          const currentTime = audioElement.currentTime;
          const minutes = Math.floor(currentTime / 60);
          const seconds = Math.floor(currentTime % 60);
          timeDisplay.querySelector('.current-time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        });
        
        audioElement.addEventListener('ended', () => {
          isPlaying = false;
          playBtn.innerHTML = '<span class="material-symbols-outlined text-[24px] text-primary">play_arrow</span>';
          progressFill.style.width = '0%';
          audioElement.currentTime = 0;
        });
        
        // Progress bar click to seek
        progressBar.onclick = (e) => {
          const rect = progressBar.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          audioElement.currentTime = percent * audioElement.duration;
        };
        
        // Download button overlay
        const downloadBtn = document.createElement('a');
        downloadBtn.href = message.fileUrl;
        downloadBtn.download = message.fileName || 'audio';
        downloadBtn.className = 'absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover/audio:opacity-100 transition-opacity z-10';
        downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-white">download</span>';
        downloadBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          fetch(message.fileUrl)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = message.fileName || 'audio';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => {
              console.error('Download failed:', err);
              window.open(message.fileUrl, '_blank');
            });
        };
        
        playerWrapper.appendChild(downloadBtn);
        playerWrapper.appendChild(controlsContainer);
        
        // Audio info below player
        const audioInfo = document.createElement('div');
        audioInfo.className = 'flex items-center gap-2 text-xs text-slate-400 px-1';
        
        const audioIcon = document.createElement('span');
        audioIcon.className = 'material-symbols-outlined text-[16px] text-primary';
        audioIcon.textContent = 'audio_file';
        
        const audioName = document.createElement('span');
        audioName.className = 'truncate flex-1 text-white';
        audioName.textContent = message.fileName || 'Audio';
        
        const fileSize = document.createElement('span');
        fileSize.className = 'text-xs opacity-60';
        fileSize.textContent = this.formatFileSize(message.fileSize || 0);
        
        audioInfo.appendChild(audioIcon);
        audioInfo.appendChild(audioName);
        audioInfo.appendChild(fileSize);
        
        audioContainer.appendChild(playerWrapper);
        audioContainer.appendChild(audioInfo);
        bubbleEl.appendChild(audioContainer);
      } else {
        // Regular file
        const fileContainer = document.createElement('div');
        fileContainer.className = 'flex items-center gap-3 min-w-[250px]';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0';
        fileIcon.innerHTML = '<span class="material-symbols-outlined text-primary">description</span>';
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'flex-1 min-w-0';
        
        const fileName = document.createElement('div');
        fileName.className = 'font-medium truncate text-white';
        fileName.textContent = message.fileName || 'File';
        
        const fileSize = document.createElement('div');
        fileSize.className = 'text-xs text-slate-400';
        fileSize.textContent = this.formatFileSize(message.fileSize || 0);
        
        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);
        
        const downloadBtn = document.createElement('a');
        downloadBtn.href = message.fileUrl;
        downloadBtn.download = message.fileName || 'file';
        downloadBtn.rel = 'noopener noreferrer';
        downloadBtn.className = 'w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center shrink-0 transition-colors';
        downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[18px] text-primary">download</span>';
        downloadBtn.onclick = (e) => {
          // Force download for all file types
          e.preventDefault();
          fetch(message.fileUrl)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = message.fileName || 'file';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => {
              console.error('Download failed:', err);
              // Fallback to opening in new tab
              window.open(message.fileUrl, '_blank');
            });
        };
        
        fileContainer.appendChild(fileIcon);
        fileContainer.appendChild(fileInfo);
        fileContainer.appendChild(downloadBtn);
        bubbleEl.appendChild(fileContainer);
      }
    } else if (message.type === 'poll' && message.pollData) {
      // Poll message - render interactive poll
      bubbleEl.appendChild(this.createPollContent(message));
    } else if (message.uiComponent) {
      // UI Component message (translation, code, etc.)
      bubbleEl.appendChild(this.createUIComponent(message.uiComponent));
    } else {
      // Text message - format markdown
      bubbleEl.innerHTML = this.formatMarkdown(message.content);
    }

    // Add action buttons for other users' messages too
    const bubbleWrapper = document.createElement('div');
    bubbleWrapper.className = 'relative';
    
    const actionsDiv = this.createMessageActions(message.id, message.content, message.type);
    bubbleWrapper.appendChild(actionsDiv);
    bubbleWrapper.appendChild(bubbleEl);

    contentDiv.appendChild(nameDiv);
    contentDiv.appendChild(bubbleWrapper);
    wrapper.appendChild(avatar);
    wrapper.appendChild(contentDiv);

    return wrapper;
  }

  /**
   * Create message action buttons
   */
  createMessageActions(messageId, content, messageType = 'text') {
    const actionsDiv = document.createElement('div');
    // Position buttons to the left, hidden by default, visible on hover
    actionsDiv.className = 'absolute -left-14 top-1 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1';

    // Check if this is the current user's message
    const currentUserId = state?.get('user.id');
    const currentUsername = state?.get('user.username');
    const currentNickname = state?.get('user.nickname');
    
    // Get message details from state to check ownership
    const messages = state?.get('messages') || [];
    const message = messages.find(m => m.id === messageId);
    
    // Check if user owns this message by comparing username or nickname
    const isOwnMessage = message && (
      message.senderId === currentUserId ||
      message.senderNickname === currentNickname ||
      message.senderNickname === currentUsername
    );

    // Only show edit/delete buttons for own messages
    if (!isOwnMessage) {
      // For other users' messages, show report button
      const reportBtn = document.createElement('button');
      reportBtn.className = 'w-7 h-7 rounded-lg bg-surface-dark hover:bg-red-600 text-slate-400 hover:text-white transition-colors flex items-center justify-center shadow-lg border border-slate-700';
      reportBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">flag</span>';
      reportBtn.title = 'Report message';
      reportBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('[UI] Report clicked for message:', messageId);
        if (this.onReportClick) {
          this.onReportClick(messageId, message);
        }
      };
      actionsDiv.appendChild(reportBtn);
      return actionsDiv;
    }

    // Edit button - only for text messages
    if (messageType === 'text' || messageType === 'normal' || !messageType) {
      const editBtn = document.createElement('button');
      editBtn.className = 'w-7 h-7 rounded-lg bg-surface-dark hover:bg-surface-lighter text-slate-400 hover:text-primary transition-colors flex items-center justify-center shadow-lg border border-slate-700';
      editBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">edit</span>';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('[UI] ✅ Edit clicked for message:', messageId);
        if (this.onEditClick) {
          this.onEditClick(messageId, content);
        }
      };
      actionsDiv.appendChild(editBtn);
    }

    // Delete button - for all message types (but only own messages)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'w-7 h-7 rounded-lg bg-surface-dark hover:bg-red-600 text-slate-400 hover:text-white transition-colors flex items-center justify-center shadow-lg border border-slate-700';
    deleteBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">delete</span>';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('[UI] ✅ Delete clicked for message:', messageId, 'type:', messageType);
      if (this.onDeleteClick) {
        this.onDeleteClick(messageId);
      }
    };
    actionsDiv.appendChild(deleteBtn);

    console.log('[UI] Created action buttons for message:', messageId, 'type:', messageType, 'isOwn:', isOwnMessage);
    return actionsDiv;
  }

  /**
   * Create system message
   */
  createSystemMessage(text) {
    const messageEl = document.createElement('div');
    messageEl.className = 'flex justify-center w-full my-4 transition-opacity duration-500';

    const innerEl = document.createElement('div');
    innerEl.className = 'px-4 py-2 rounded-full bg-surface-lighter border border-slate-700';

    const textEl = document.createElement('p');
    textEl.className = 'text-slate-400 text-xs font-medium';
    textEl.textContent = text;

    innerEl.appendChild(textEl);
    messageEl.appendChild(innerEl);

    // Auto-remove system messages after 5 seconds
    setTimeout(() => {
      messageEl.style.opacity = '0';
      setTimeout(() => {
        messageEl.remove();
      }, 500); // Wait for fade out animation
    }, 5000);

    return messageEl;
  }

  /**
   * Create invite message
   */
  createInviteMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'flex justify-center w-full my-6';
    messageEl.dataset.messageId = message.id;

    const inviteBox = document.createElement('div');
    inviteBox.className = 'max-w-md w-full bg-surface-dark border-2 border-primary rounded-2xl p-6 shadow-2xl';
    
    inviteBox.innerHTML = `
      <div class="flex items-start gap-4 mb-4">
        <div class="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-primary text-3xl">mail</span>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2 mb-2">
            <span class="material-symbols-outlined text-primary text-[18px]">group_add</span>
            <span class="text-xs font-bold text-primary uppercase tracking-wide">Room Invite</span>
          </div>
          <h3 class="text-lg font-bold text-white mb-1">${message.fromUsername}</h3>
          <p class="text-sm text-slate-300">invited you to join room</p>
          <p class="text-xl font-mono font-bold text-primary mt-2">${message.roomCode}</p>
        </div>
      </div>
      
      <div class="border-t border-slate-700 pt-4 mb-4">
        <p class="text-xs text-slate-400 text-center">Would you like to join this room?</p>
      </div>
      
      <div class="flex gap-3">
        <button class="invite-accept-btn flex-1 py-3 px-4 bg-primary hover:bg-primary-hover rounded-xl text-white font-semibold transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[20px]">check_circle</span>
          Accept & Join
        </button>
        <button class="invite-decline-btn flex-1 py-3 px-4 bg-surface-lighter hover:bg-slate-700 rounded-xl text-slate-300 font-medium transition-colors flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[20px]">cancel</span>
          Decline
        </button>
      </div>
    `;
    
    // Add event listeners
    const acceptBtn = inviteBox.querySelector('.invite-accept-btn');
    const declineBtn = inviteBox.querySelector('.invite-decline-btn');
    
    acceptBtn.addEventListener('click', () => {
      if (window.app) {
        window.app.handleAcceptInvite(message.inviteData);
      }
    });
    
    declineBtn.addEventListener('click', () => {
      if (window.app) {
        window.app.handleDeclineInvite(message.inviteData);
      }
    });
    
    messageEl.appendChild(inviteBox);
    return messageEl;
  }

  /**
   * Update message in DOM
   */
  updateMessage(messageId, updates) {
    const messageEl = this.messageContainer.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.remove();
      // Re-render will be handled by the app controller
    }
  }

  /**
   * Remove message from DOM
   */
  removeMessage(messageId) {
    const messageEl = this.messageContainer.querySelector(`[data-message-id="${messageId}"]`);
    if (messageEl) {
      messageEl.remove();
    }
  }

  /**
   * Clear all messages
   */
  clearMessages() {
    if (this.messageContainer) {
      this.messageContainer.innerHTML = '';
    }
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom(smooth = true) {
    if (this.messageContainer) {
      const parent = this.messageContainer.parentElement;
      if (parent) {
        parent.scrollTo({
          top: parent.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  }

  /**
   * Check if scrolled to bottom
   */
  isScrolledToBottom() {
    const parent = this.messageContainer?.parentElement;
    if (!parent) return true;
    
    const threshold = 100; // pixels from bottom
    return parent.scrollHeight - parent.scrollTop - parent.clientHeight < threshold;
  }

  /**
   * Show/hide scroll to bottom button
   */
  updateScrollButton() {
    const scrollBtn = document.getElementById('scrollToBottomBtn');
    if (!scrollBtn) return;
    
    if (this.isScrolledToBottom()) {
      scrollBtn.classList.add('hidden');
    } else {
      scrollBtn.classList.remove('hidden');
    }
  }

  /**
   * Get input value
   */
  getMessageInput() {
    return this.elements.messageInput?.value.trim() || '';
  }

  /**
   * Set input value
   */
  setMessageInput(value) {
    if (this.elements.messageInput) {
      this.elements.messageInput.value = value;
    }
  }

  /**
   * Clear input
   */
  clearMessageInput() {
    this.setMessageInput('');
  }

  /**
   * Focus input
   */
  focusMessageInput() {
    this.elements.messageInput?.focus();
  }

  /**
   * Select input text
   */
  selectMessageInput() {
    this.elements.messageInput?.select();
  }

  /**
   * Update send button for editing
   */
  setSendButtonEditMode(isEditing) {
    if (!this.elements.sendButton) return;

    if (isEditing) {
      this.elements.sendButton.innerHTML = '<span class="material-symbols-outlined text-[20px]">check</span>';
      this.elements.sendButton.classList.add('bg-green-600', 'hover:bg-green-700');
      this.elements.sendButton.classList.remove('bg-primary', 'hover:bg-primary-hover');
    } else {
      this.elements.sendButton.innerHTML = '<span class="material-symbols-outlined text-[20px]">send</span>';
      this.elements.sendButton.classList.remove('bg-green-600', 'hover:bg-green-700');
      this.elements.sendButton.classList.add('bg-primary', 'hover:bg-primary-hover');
    }
  }

  /**
   * Show connection status
   */
  showConnectionStatus(status) {
    // Could add a status indicator in the UI
    console.log('[UI] Connection status:', status);
  }

  /**
   * Event handlers (to be set by controller)
   */
  onEditClick(messageId, content) {
    // Override in controller
  }

  onDeleteClick(messageId) {
    // Override in controller
  }

  /**
   * Show list of users who read a message
   */
  showReadByList(messageId, readBy) {
    // Remove existing popup if any
    const existing = document.getElementById('readByPopup');
    if (existing) {
      existing.style.opacity = '0';
      existing.style.transform = 'translate(-50%, -50%) scale(0.92)';
      setTimeout(() => existing.remove(), 400);
      return;
    }

    if (!readBy || readBy.length === 0) {
      return;
    }

    // Create popup
    const popup = document.createElement('div');
    popup.id = 'readByPopup';
    popup.className = 'fixed bg-surface-dark border border-slate-700 rounded-lg shadow-xl p-4 z-50 max-w-xs';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%) scale(0.92)';
    popup.style.opacity = '0';
    popup.style.transition = 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3 pb-2 border-b border-slate-700';
    header.innerHTML = `
      <span class="text-sm font-bold text-white">Read by ${readBy.length}</span>
      <button class="text-slate-400 hover:text-white transition-colors" onclick="document.getElementById('readByPopup').style.opacity='0'; document.getElementById('readByPopup').style.transform='translate(-50%, -50%) scale(0.92)'; setTimeout(() => document.getElementById('readByPopup').remove(), 400)">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    `;
    popup.appendChild(header);

    // List of readers
    const list = document.createElement('div');
    list.className = 'space-y-2 max-h-48 overflow-y-auto';

    readBy.forEach(reader => {
      const item = document.createElement('div');
      item.className = 'flex items-center gap-2 text-sm';
      
      const readTime = reader.readAt ? new Date(reader.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      
      item.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-surface-lighter flex items-center justify-center">
          <span class="material-symbols-outlined text-slate-400 text-[16px]">person</span>
        </div>
        <div class="flex-1">
          <span class="text-white">${reader.nickname || 'Unknown'}</span>
          <span class="text-slate-500 text-xs ml-2">${readTime}</span>
        </div>
        <span class="material-symbols-outlined text-accent-cyan text-[14px]">done_all</span>
      `;
      list.appendChild(item);
    });

    popup.appendChild(list);
    document.body.appendChild(popup);

    // Trigger animation
    requestAnimationFrame(() => {
      popup.style.opacity = '1';
      popup.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    // Close on click outside
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target)) {
          popup.style.opacity = '0';
          popup.style.transform = 'translate(-50%, -50%) scale(0.92)';
          setTimeout(() => popup.remove(), 400);
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
  }

  /**
   * Create poll content with voting interface
   */
  createPollContent(message) {
    const pollContainer = document.createElement('div');
    pollContainer.className = 'poll-container min-w-[300px]';
    
    // Helper function to check if text is an image URL
    const isImageUrl = (text) => {
      if (!text) return false;
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      const lowerText = text.toLowerCase();
      return imageExtensions.some(ext => lowerText.includes(ext)) || 
             lowerText.includes('imgbb.com') || 
             lowerText.includes('supabase.co') ||
             lowerText.startsWith('http') && (lowerText.includes('image') || lowerText.includes('img'));
    };
    
    // Helper function to render text or image
    const renderContent = (text, className = '') => {
      if (isImageUrl(text)) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'relative group/pollimg ' + className;
        
        const img = document.createElement('img');
        img.src = text;
        img.alt = 'Poll image';
        img.className = 'max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity';
        img.onclick = () => window.open(text, '_blank');
        
        // Download button
        const downloadBtn = document.createElement('a');
        downloadBtn.href = text;
        downloadBtn.download = `poll_image_${Date.now()}.jpg`;
        downloadBtn.className = 'absolute top-1 right-1 w-6 h-6 rounded bg-black/60 hover:bg-black/80 flex items-center justify-center opacity-0 group-hover/pollimg:opacity-100 transition-opacity';
        downloadBtn.innerHTML = '<span class="material-symbols-outlined text-[14px] text-white">download</span>';
        downloadBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          fetch(text)
            .then(response => response.blob())
            .then(blob => {
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `poll_image_${Date.now()}.jpg`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            })
            .catch(err => {
              console.error('Download failed:', err);
              window.open(text, '_blank');
            });
        };
        
        imageContainer.appendChild(img);
        imageContainer.appendChild(downloadBtn);
        return imageContainer;
      } else {
        const textEl = document.createElement('span');
        textEl.className = className;
        textEl.textContent = text;
        return textEl;
      }
    };
    
    // Poll question
    const questionContainer = document.createElement('div');
    questionContainer.className = 'font-bold text-base mb-3';
    const questionContent = renderContent(message.pollData.question, 'font-bold text-base');
    questionContainer.appendChild(questionContent);
    pollContainer.appendChild(questionContainer);
    
    // Poll options
    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'space-y-2';
    
    const totalVotes = message.pollData.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
    const currentUserId = state?.get('user.id');
    const hasVoted = message.pollData.options.some(opt => opt.votes?.includes(currentUserId));
    
    console.log('[Poll] Rendering poll:', {
      messageId: message.id,
      currentUserId,
      currentUserIdType: typeof currentUserId,
      hasVoted,
      totalVotes,
      options: message.pollData.options.map(o => ({ 
        text: o.text, 
        votes: o.votes,
        votesTypes: o.votes?.map(v => typeof v)
      }))
    });
    
    message.pollData.options.forEach((option) => {
      const optionDiv = document.createElement('div');
      optionDiv.className = 'poll-option';
      
      const voteCount = option.votes?.length || 0;
      const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
      const userVoted = option.votes?.includes(currentUserId);
      
      console.log('[Poll] Option:', option.text, 'userVoted:', userVoted, 'votes:', option.votes);
      
      if (message.pollData.isClosed || hasVoted) {
        // Show results
        optionDiv.className += ' relative bg-white/5 rounded-lg p-3 overflow-hidden';
        
        const progressBar = document.createElement('div');
        progressBar.className = 'absolute inset-0 bg-primary/20';
        progressBar.style.width = `${percentage}%`;
        optionDiv.appendChild(progressBar);
        
        const content = document.createElement('div');
        content.className = 'relative flex items-center justify-between';
        
        // Check if option text is an image URL
        if (isImageUrl(option.text)) {
          const optionContent = document.createElement('div');
          optionContent.className = 'flex items-center gap-2 flex-1';
          optionContent.appendChild(renderContent(option.text, 'font-medium'));
          const voteInfo = document.createElement('span');
          voteInfo.className = 'text-sm ml-2';
          voteInfo.textContent = `${voteCount} (${percentage}%)`;
          optionContent.appendChild(voteInfo);
          content.appendChild(optionContent);
        } else {
          content.innerHTML = `
            <span class="font-medium">${option.text}</span>
            <span class="text-sm">${voteCount} (${percentage}%)</span>
          `;
        }
        
        optionDiv.appendChild(content);
        
        if (userVoted) {
          const votedLabel = document.createElement('div');
          votedLabel.className = 'relative text-xs text-primary mt-1';
          votedLabel.textContent = '✓ You voted';
          optionDiv.appendChild(votedLabel);
        }
      } else {
        // Show vote button
        optionDiv.className += ' bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-colors';
        
        const voteContent = document.createElement('div');
        voteContent.className = 'flex items-center justify-between';
        
        // Check if option text is an image URL
        if (isImageUrl(option.text)) {
          voteContent.appendChild(renderContent(option.text, 'font-medium'));
        } else {
          const optionText = document.createElement('span');
          optionText.className = 'font-medium';
          optionText.textContent = option.text;
          voteContent.appendChild(optionText);
        }
        
        const radioIcon = document.createElement('span');
        radioIcon.className = 'material-symbols-outlined text-[18px]';
        radioIcon.textContent = 'radio_button_unchecked';
        voteContent.appendChild(radioIcon);
        
        optionDiv.appendChild(voteContent);
        optionDiv.onclick = () => {
          // Vote on poll
          if (window.socketManager) {
            window.socketManager.votePoll(message.id, option.id);
          }
        };
      }
      
      optionsContainer.appendChild(optionDiv);
    });
    
    pollContainer.appendChild(optionsContainer);
    
    // Poll footer
    const footer = document.createElement('div');
    footer.className = 'mt-3 text-xs text-slate-400 flex items-center justify-between';
    
    const voteText = document.createElement('span');
    voteText.textContent = `${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}`;
    footer.appendChild(voteText);
    
    if (message.pollData.isClosed) {
      const closedLabel = document.createElement('span');
      closedLabel.className = 'text-red-400';
      closedLabel.textContent = 'Poll closed';
      footer.appendChild(closedLabel);
    }
    
    pollContainer.appendChild(footer);
    
    return pollContainer;
  }

  /**
   * Format file size in human-readable format
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Create singleton instance
const ui = new UIManager();

// Make available globally
window.ui = ui;
