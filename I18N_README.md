# Wave Messenger - Multi-language Support

Wave Messenger now supports multiple languages! 🌍

## Available Languages

- 🇬🇧 **English** (en) - Default
- 🇩🇪 **German** (de) - Deutsch
- 🇺🇦 **Ukrainian** (uk) - Українська

## How to Change Language

1. Go to **Settings** → **Language**
2. Select your preferred language from the dropdown
3. The app will reload with your selected language

## For Developers

### Translation Files

Translation files are located in `/public/locales/`:
- `en.json` - English (base)
- `de.json` - German
- `uk.json` - Ukrainian

### Using Translations in HTML

Add `data-i18n` attribute to elements:

```html
<span data-i18n="nav.chats">Chats</span>
<input data-i18n-placeholder="chat.typeMessage" placeholder="Type a message...">
<button data-i18n-title="common.send" title="Send">Send</button>
```

### Using Translations in JavaScript

```javascript
// Get translation
const text = window.i18n.t('chat.newMessage');

// With parameters
const text = window.i18n.t('time.minutesAgo', { count: 5 });

// Change language programmatically
await window.i18n.setLanguage('de');
```

### Adding a New Language

1. Create a new JSON file in `/public/locales/` (e.g., `fr.json`)
2. Copy the structure from `en.json`
3. Translate all values
4. Add the language to `getAvailableLanguages()` in `i18n.js`
5. Add the option to the language selector in `settings.html`

### Translation Structure

```json
{
  "common": {
    "appName": "Wave Messenger",
    "loading": "Loading...",
    ...
  },
  "nav": { ... },
  "chat": { ... },
  "ai": { ... }
}
```

### Events

Listen for language changes:

```javascript
window.addEventListener('languageChanged', (event) => {
    console.log('Language changed to:', event.detail.lang);
    // Update dynamic content
});
```

## Storage

The selected language is stored in `localStorage` as `language` key and persists across sessions.
