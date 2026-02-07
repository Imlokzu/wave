// Wave Messenger i18n (Internationalization) System
class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.translations = {};
        this.fallbackLang = 'en';
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`/locales/${lang}.json`);
            if (!response.ok) throw new Error('Translation file not found');
            this.translations[lang] = await response.json();
            return true;
        } catch (error) {
            console.error(`Failed to load translations for ${lang}:`, error);
            return false;
        }
    }

    async init() {
        // Load current language
        await this.loadTranslations(this.currentLang);
        
        // Load fallback if different
        if (this.currentLang !== this.fallbackLang) {
            await this.loadTranslations(this.fallbackLang);
        }
        
        // Apply translations to page
        this.translatePage();
    }

    async setLanguage(lang) {
        if (lang === this.currentLang) return;
        
        // Load new language if not already loaded
        if (!this.translations[lang]) {
            const loaded = await this.loadTranslations(lang);
            if (!loaded) return false;
        }
        
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        
        // Update HTML lang attribute
        document.documentElement.lang = lang;
        
        // Re-translate page
        this.translatePage();
        
        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        
        return true;
    }

    t(key, params = {}) {
        let translation = this.getNestedTranslation(this.translations[this.currentLang], key);
        
        // Fallback to English if not found
        if (!translation && this.currentLang !== this.fallbackLang) {
            translation = this.getNestedTranslation(this.translations[this.fallbackLang], key);
        }
        
        // If still not found, return the key
        if (!translation) {
            console.warn(`Translation not found: ${key}`);
            return key;
        }
        
        // Replace parameters
        return this.interpolate(translation, params);
    }

    getNestedTranslation(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    interpolate(str, params) {
        return str.replace(/\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    translatePage() {
        // Translate elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translated = this.t(key);
            
            // Update text content
            element.textContent = translated;
            
            // Also update value for input elements
            if (element.tagName === 'INPUT' && element.type === 'button') {
                element.value = translated;
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Translate titles
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });

        // Translate aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria');
            element.setAttribute('aria-label', this.t(key));
        });
    }

    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'de', name: 'German', nativeName: 'Deutsch' },
            { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' }
        ];
    }

    getCurrentLanguage() {
        return this.currentLang;
    }
}

// Create global instance
window.i18n = new I18n();
