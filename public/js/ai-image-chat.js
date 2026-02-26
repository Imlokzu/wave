/**
 * AI Image Chat Module
 * Handles image uploads and vision-based AI chat with NVIDIA NIM models
 * Supports Qwen3.5-VL and Qwen3.5-397B-A17B
 */

class AIImageChat {
    constructor() {
        this.attachedImages = [];
        this.maxImages = 5;
        this.currentModel = null;
        this.init();
    }

    /**
     * Initialize image chat functionality
     */
    init() {
        this.setupImageUpload();
        this.setupModelListener();
        console.log('[AIImageChat] Initialized');
    }

    /**
     * Setup image upload handlers
     */
    setupImageUpload() {
        // Listen for file input changes
        const fileInput = document.getElementById('imageInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleImageSelect(e));
        }

        // Setup drag and drop
        this.setupDragAndDrop();
    }

    /**
     * Setup drag and drop for images
     */
    setupDragAndDrop() {
        const dropZone = document.getElementById('chatContainer') || document.body;
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, true);
        });

        dropZone.addEventListener('dragenter', (e) => {
            if (this.isVisionModelSelected()) {
                dropZone.classList.add('drag-over');
            }
        }, true);

        dropZone.addEventListener('dragleave', (e) => {
            if (e.target === dropZone || !dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('drag-over');
            }
        }, true);

        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.handleFiles(files);
            }
        }, true);
    }

    /**
     * Setup model selection listener
     */
    setupModelListener() {
        // Listen for model changes
        document.addEventListener('aiModelChanged', (e) => {
            this.currentModel = e.detail?.modelId;
            this.updateImageUI();
        });

        // Check current model on load
        const savedSettings = JSON.parse(localStorage.getItem('aiSettings') || '{}');
        this.currentModel = savedSettings.model || 'auto';
        this.updateImageUI();
    }

    /**
     * Check if current model supports vision
     */
    isVisionModelSelected() {
        if (!this.currentModel) return false;
        
        // Import vision check from nvidiaClient
        if (window.modelSupportsVision) {
            return window.modelSupportsVision(this.currentModel);
        }
        
        // Fallback: check known vision models
        const visionModels = ['qwen3.5-vl', 'qwen3.5-397b-a17b', 'kimi-k2.5'];
        return visionModels.includes(this.currentModel);
    }

    /**
     * Handle image file selection
     */
    handleImageSelect(event) {
        const files = event.target?.files;
        if (files && files.length > 0) {
            this.handleFiles(files);
        }
        // Reset input so same file can be selected again
        if (event.target) {
            event.target.value = '';
        }
    }

    /**
     * Handle files (from input or drag-drop)
     */
    handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            console.warn('[AIImageChat] No image files detected');
            return;
        }

        if (!this.isVisionModelSelected()) {
            alert('Please select a vision-enabled AI model (Qwen3.5-VL or Qwen3.5-397B-A17B) to analyze images.');
            return;
        }

        const remainingSlots = this.maxImages - this.attachedImages.length;
        const filesToAdd = imageFiles.slice(0, remainingSlots);

        if (filesToAdd.length < imageFiles.length) {
            alert(`Maximum ${this.maxImages} images allowed. Adding ${filesToAdd.length} of ${imageFiles.length} selected.`);
        }

        filesToAdd.forEach(file => {
            this.addImage(file);
        });
    }

    /**
     * Add image to attachment list
     */
    addImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.attachedImages.push({
                file,
                preview: e.target?.result,
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            });
            this.renderImagePreviews();
        };
        reader.readAsDataURL(file);
    }

    /**
     * Remove image from attachment list
     */
    removeImage(imageId) {
        this.attachedImages = this.attachedImages.filter(img => img.id !== imageId);
        this.renderImagePreviews();
    }

    /**
     * Clear all attached images
     */
    clearImages() {
        this.attachedImages = [];
        this.renderImagePreviews();
    }

    /**
     * Render image preview thumbnails
     */
    renderImagePreviews() {
        const previewContainer = document.getElementById('imagePreviewContainer');
        if (!previewContainer) return;

        if (this.attachedImages.length === 0) {
            previewContainer.innerHTML = '';
            previewContainer.classList.add('hidden');
            return;
        }

        previewContainer.classList.remove('hidden');
        previewContainer.innerHTML = this.attachedImages.map(img => `
            <div class="relative group inline-block m-1" data-image-id="${img.id}">
                <img src="${img.preview}" alt="Preview" class="h-20 w-20 object-cover rounded-lg border border-primary/30" />
                <button 
                    onclick="window.aiImageChat?.removeImage('${img.id}')"
                    class="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                >
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        `).join('');
    }

    /**
     * Update UI based on model selection
     */
    updateImageUI() {
        const imageInput = document.getElementById('imageInput');
        const imageLabel = document.getElementById('imageLabel');
        
        if (!imageInput || !imageLabel) return;

        const isVision = this.isVisionModelSelected();
        
        if (isVision) {
            imageLabel.classList.remove('opacity-50', 'cursor-not-allowed');
            imageLabel.title = 'Upload image for AI analysis';
        } else {
            imageLabel.classList.add('opacity-50', 'cursor-not-allowed');
            imageLabel.title = 'Select a vision model (Qwen3.5-VL or Qwen3.5-397B-A17B) to enable image upload';
        }
    }

    /**
     * Get attached images as File array
     */
    getAttachedImages() {
        return this.attachedImages.map(img => img.file);
    }

    /**
     * Send images with prompt to AI
     */
    async sendWithImages(prompt, onChunk, onDone, onError) {
        if (!this.isVisionModelSelected()) {
            throw new Error('Vision model not selected');
        }

        const images = this.getAttachedImages();
        if (images.length === 0) {
            throw new Error('No images attached');
        }

        // Import from nvidiaClient
        if (!window.streamVisionChat) {
            throw new Error('NVIDIA client not loaded');
        }

        try {
            await window.streamVisionChat(this.currentModel, prompt, images, {
                onContent: onChunk,
                onChunk: onChunk,
                onDone: () => {
                    this.clearImages();
                    onDone();
                },
                onError: onError
            });
        } catch (error) {
            onError?.(error);
            throw error;
        }
    }
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.aiImageChat = new AIImageChat();
}
