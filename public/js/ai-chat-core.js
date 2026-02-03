// AI Chat Core - Shared between desktop and mobile
// This file contains all the AI chat logic that works on both platforms

class AIChatCore {
    constructor() {
        this.socket = io();
        this.conversationHistory = [];
        this.thinkingEnabled = false;
        this.searchEnabled = false;
        this.conversationRestored = false;
        this.currentAICommand = null;
        this.attachedCode = null;
        
        this.init();
    }

    init() {
        // Check authentication
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            window.location.href = '/login.html';
            return;
        }

        // Register user for socket events
        const userId = localStorage.getItem('userId');
        if (userId) {
            this.socket.emit('user:setup', { userId });
        }

        // Restore or show welcome message
        if (!localStorage.getItem('aiCurrentConversation')) {
            setTimeout(() => {
                this.addMessage('Hello! I\'m WaveBot 🌊 your AI assistant. How can I help you today?', false);
            }, 500);
        } else {
            this.restoreConversation();
        }
    }

    // Conversation Management
    saveConversation() {
        try {
            localStorage.setItem('aiCurrentConversation', JSON.stringify({
                history: this.conversationHistory,
                timestamp: Date.now(),
                model: localStorage.getItem('preferredAIModel') || 'wave-flash-2'
            }));
        } catch (e) {
            console.error('Failed to save conversation:', e);
        }
    }

    restoreConversation() {
        if (this.conversationRestored) return;
        
        try {
            const saved = localStorage.getItem('aiCurrentConversation');
            if (saved) {
                const data = JSON.parse(saved);
                if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                    this.conversationHistory = data.history || [];
                    this.conversationHistory.forEach(msg => {
                        if (msg._hidden) return;
                        if (msg.role === 'user') {
                            this.addMessage(msg.parts[0].text, true);
                        } else if (msg.role === 'model') {
                            this.addMessage(msg.parts[0].text, false);
                        }
                    });
                    this.conversationRestored = true;
                }
            }
        } catch (e) {
            console.error('Failed to restore conversation:', e);
        }
    }

    clearChat() {
        if (confirm('Start a new chat? Current conversation will be cleared.')) {
            this.conversationHistory = [];
            const container = document.getElementById('chat-container');
            container.innerHTML = '<div class="flex justify-center my-4"><span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase bg-surface-dark px-3 py-1 rounded-full border border-white/5">Today</span></div>';
            localStorage.removeItem('aiCurrentConversation');
            this.addMessage('Hello! I\'m WaveBot 🌊 How can I help you today?', false);
        }
    }

    // Saved Chats Management
    loadSavedChats() {
        try {
            const savedChats = JSON.parse(localStorage.getItem('aiSavedChats') || '[]');
            return savedChats;
        } catch (e) {
            console.error('Failed to load saved chats:', e);
            return [];
        }
    }

    saveChat(name) {
        if (this.conversationHistory.length === 0) {
            alert('No conversation to save!');
            return false;
        }
        
        if (!name || !name.trim()) {
            alert('Please enter a chat name!');
            return false;
        }
        
        try {
            const savedChats = JSON.parse(localStorage.getItem('aiSavedChats') || '[]');
            const newChat = {
                id: Date.now(),
                name: name.trim(),
                history: this.conversationHistory,
                timestamp: Date.now()
            };
            savedChats.unshift(newChat);
            localStorage.setItem('aiSavedChats', JSON.stringify(savedChats));
            return true;
        } catch (e) {
            console.error('Failed to save chat:', e);
            return false;
        }
    }

    loadChat(chatId) {
        try {
            const savedChats = JSON.parse(localStorage.getItem('aiSavedChats') || '[]');
            const chat = savedChats.find(c => c.id === chatId);
            
            if (chat) {
                this.conversationHistory = chat.history;
                const container = document.getElementById('chat-container');
                container.innerHTML = '<div class="flex justify-center my-4"><span class="text-[10px] font-semibold tracking-wider text-slate-500 uppercase bg-surface-dark px-3 py-1 rounded-full border border-white/5">Today</span></div>';
                
                this.conversationHistory.forEach(msg => {
                    if (msg._hidden) return;
                    if (msg.role === 'user') {
                        this.addMessage(msg.parts[0].text, true);
                    } else if (msg.role === 'model') {
                        this.addMessage(msg.parts[0].text, false);
                    }
                });
                
                this.saveConversation();
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to load chat:', e);
            return false;
        }
    }

    deleteChat(chatId) {
        try {
            const savedChats = JSON.parse(localStorage.getItem('aiSavedChats') || '[]');
            const filtered = savedChats.filter(c => c.id !== chatId);
            localStorage.setItem('aiSavedChats', JSON.stringify(filtered));
            return true;
        } catch (e) {
            console.error('Failed to delete chat:', e);
            return false;
        }
    }

    // Toggle Features
    toggleThinking() {
        this.thinkingEnabled = !this.thinkingEnabled;
        const btn = document.getElementById('thinkingToggle');
        if (!btn) return;
        
        const icon = btn.querySelector('.material-symbols-outlined');
        const text = btn.querySelector('.text-xs');
        
        if (this.thinkingEnabled) {
            btn.classList.add('bg-primary', 'border-primary');
            btn.classList.remove('bg-surface-dark');
            if (icon) {
                icon.classList.remove('text-slate-400');
                icon.classList.add('text-white');
            }
            if (text) {
                text.classList.remove('text-slate-400');
                text.classList.add('text-white');
            }
        } else {
            btn.classList.remove('bg-primary', 'border-primary');
            btn.classList.add('bg-surface-dark');
            if (icon) {
                icon.classList.add('text-slate-400');
                icon.classList.remove('text-white');
            }
            if (text) {
                text.classList.add('text-slate-400');
                text.classList.remove('text-white');
            }
        }
    }

    toggleSearch() {
        this.searchEnabled = !this.searchEnabled;
        const btn = document.getElementById('searchToggle');
        if (!btn) return;
        
        const icon = btn.querySelector('.material-symbols-outlined');
        const text = btn.querySelector('.text-xs');
        
        if (this.searchEnabled) {
            btn.classList.add('bg-primary', 'border-primary');
            btn.classList.remove('bg-surface-dark');
            if (icon) {
                icon.classList.remove('text-slate-400');
                icon.classList.add('text-white');
            }
            if (text) {
                text.classList.remove('text-slate-400');
                text.classList.add('text-white');
            }
        } else {
            btn.classList.remove('bg-primary', 'border-primary');
            btn.classList.add('bg-surface-dark');
            if (icon) {
                icon.classList.add('text-slate-400');
                icon.classList.remove('text-white');
            }
            if (text) {
                text.classList.add('text-slate-400');
                text.classList.remove('text-white');
            }
        }
    }

    // Message Handling
    async sendMessage(content) {
        if (!content || !content.trim()) return;

        let userMessage = content;
        let aiPrompt = content;
        
        // Handle attached code
        if (this.attachedCode) {
            userMessage = `📎 Attached ${this.attachedCode.filename || this.attachedCode.language} code (${this.attachedCode.lineCount} lines)\n${content}`;
            aiPrompt = `Here's the code:\n\`\`\`${this.attachedCode.language}\n${this.attachedCode.code}\n\`\`\`\n\n${content}`;
            this.attachedCode = null;
            
            const input = document.getElementById('messageInput');
            if (input) {
                input.placeholder = 'Message or type / for commands...';
                input.classList.remove('text-primary');
            }
        }

        this.addMessage(userMessage, true);
        
        this.conversationHistory.push({
            role: 'user',
            parts: [{ text: aiPrompt }]
        });
        this.saveConversation();
        
        const streamingDiv = this.createStreamingMessage();
        
        try {
            const preferredModel = localStorage.getItem('preferredAIModel') || 'wave-flash-2';
            const messages = [
                {
                    role: 'system',
                    content: 'You are WaveBot, the AI assistant for WaveChat. You are helpful, friendly, and concise. Keep responses clear and use emojis occasionally 🌊'
                }
            ];
            
            for (let i = 0; i < this.conversationHistory.length; i++) {
                const msg = this.conversationHistory[i];
                messages.push({
                    role: msg.role === 'model' ? 'assistant' : msg.role,
                    content: msg.parts[0].text
                });
            }
            
            const response = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: messages,
                    model: preferredModel,
                    enableSearch: this.searchEnabled
                })
            });
            
            if (!response.ok) {
                throw new Error('AI request failed');
            }
            
            const data = await response.json();
            const aiResponse = data.response;
            
            const contentDiv = streamingDiv.querySelector('.streaming-content');
            contentDiv.innerHTML = this.formatAIContent(aiResponse);
            
            this.conversationHistory.push({
                role: 'model',
                parts: [{ text: aiResponse }]
            });
            this.saveConversation();
            
        } catch (error) {
            console.error('AI error:', error);
            streamingDiv.remove();
            this.addMessage('Sorry, I encountered an error. Please try again.', false);
        }
    }

    createStreamingMessage() {
        const container = document.getElementById('chat-container');
        const div = document.createElement('div');
        div.className = 'flex gap-3 group';
        div.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-white text-[18px]">smart_toy</span>
            </div>
            <div class="flex flex-col gap-1 max-w-[85%]">
                <p class="text-[10px] font-medium text-slate-400 ml-1">AI</p>
                <div class="bg-surface-dark p-3 rounded-2xl rounded-bl-none border border-white/5">
                    <div class="streaming-content text-sm leading-relaxed text-slate-200">
                        <span class="inline-block w-2 h-4 bg-primary animate-pulse"></span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    addMessage(content, isUser = false) {
        const container = document.getElementById('chat-container');
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'flex gap-3 flex-row-reverse group' : 'flex gap-3 group';
        
        const avatar = isUser 
            ? `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-white text-[18px]">person</span>
               </div>`
            : `<div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-white text-[18px]">smart_toy</span>
               </div>`;
        
        const alignment = isUser ? 'items-end' : 'items-start';
        const bgColor = isUser ? 'bg-primary' : 'bg-surface-dark';
        const roundedCorner = isUser ? 'rounded-br-none' : 'rounded-bl-none';
        const label = isUser ? 'You' : 'AI';
        
        messageDiv.innerHTML = `
            ${avatar}
            <div class="flex flex-col gap-1 max-w-[85%] ${alignment}">
                <p class="text-[10px] font-medium text-slate-400 ml-1">${label}</p>
                <div class="${bgColor} p-3 rounded-2xl ${roundedCorner} border border-white/5">
                    <div class="text-sm leading-relaxed text-white whitespace-pre-wrap">${this.formatAIContent(content)}</div>
                </div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        return messageDiv;
    }

    formatAIContent(text) {
        // Basic markdown formatting
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/`(.+?)`/g, '<code class="bg-black/30 px-1 py-0.5 rounded text-xs">$1</code>');
        
        // Code blocks
        text = text.replace(/```(\w+)?\n([\s\S]+?)```/g, '<pre class="bg-black/30 p-3 rounded-lg mt-2 mb-2 overflow-x-auto"><code>$2</code></pre>');
        
        return text;
    }

    // Code/File Attachment
    attachCode(code, language, lineCount, filename) {
        this.attachedCode = { code, language, lineCount, filename };
        const input = document.getElementById('messageInput');
        if (input) {
            input.placeholder = `📎 ${filename || language} code attached (${lineCount} lines) - Type your question...`;
            input.classList.add('text-primary');
        }
    }

    clearAttachment() {
        this.attachedCode = null;
        const input = document.getElementById('messageInput');
        if (input) {
            input.placeholder = 'Message or type / for commands...';
            input.classList.remove('text-primary');
        }
    }
}

// Export for use in both desktop and mobile
window.AIChatCore = AIChatCore;
