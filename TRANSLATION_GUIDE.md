# Translation Guide for Wave Messenger

## How It Works

All text in the app references translation keys. The actual text is stored in JSON files for each language:
- `/public/locales/en.json` - English
- `/public/locales/de.json` - German  
- `/public/locales/uk.json` - Ukrainian

When you change the language in Settings, the app automatically replaces all text with the selected language.

## How to Add Translations

### Step 1: Add the Translation Key to HTML

Instead of hardcoding text, use the `data-i18n` attribute with a key:

```html
<!-- ❌ Old way (hardcoded) -->
<button>Send Message</button>

<!-- ✅ New way (translatable) -->
<button data-i18n="chat.sendMessage">Send Message</button>
```

The text "Send Message" is just a fallback. It will be replaced automatically.

### Step 2: Add Translations to JSON Files

Add the same key to all language files:

**en.json:**
```json
{
  "chat": {
    "sendMessage": "Send Message"
  }
}
```

**de.json:**
```json
{
  "chat": {
    "sendMessage": "Nachricht senden"
  }
}
```

**uk.json:**
```json
{
  "chat": {
    "sendMessage": "Надіслати повідомлення"
  }
}
```

## Translation Attributes

### Text Content (`data-i18n`)
Replaces the element's text:
```html
<span data-i18n="nav.chats">Chats</span>
<button data-i18n="common.save">Save</button>
```

### Placeholders (`data-i18n-placeholder`)
Translates input placeholders:
```html
<input data-i18n-placeholder="chat.typeMessage" placeholder="Type a message...">
```

### Titles (`data-i18n-title`)
Translates hover tooltips:
```html
<button data-i18n-title="common.send" title="Send">📤</button>
```

### ARIA Labels (`data-i18n-aria`)
Translates accessibility labels:
```html
<button data-i18n-aria="common.close" aria-label="Close">×</button>
```

## Translation File Structure

Organize translations by feature/section:

```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "nav": {
    "chats": "Chats",
    "ai": "AI",
    "feed": "Feed"
  },
  "chat": {
    "typeMessage": "Type a message...",
    "sendMessage": "Send Message",
    "online": "Online"
  }
}
```

Use dot notation to access nested values: `chat.sendMessage`

## Adding a New Language

1. **Create the translation file:**
   ```bash
   cp public/locales/en.json public/locales/fr.json
   ```

2. **Translate all values** in the new file (keep the keys the same!)

3. **Register the language** in `/public/js/i18n.js`:
   ```javascript
   getAvailableLanguages() {
       return [
           { code: 'en', name: 'English', nativeName: 'English' },
           { code: 'de', name: 'German', nativeName: 'Deutsch' },
           { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
           { code: 'fr', name: 'French', nativeName: 'Français' } // New!
       ];
   }
   ```

4. **Add to settings dropdown** in `/public/settings.html`:
   ```html
   <option value="fr">Français (French)</option>
   ```

## Quick Reference

### In HTML:
```html
<button data-i18n="common.save">Save</button>
<input data-i18n-placeholder="search" placeholder="Search...">
<div data-i18n-title="tooltip" title="Tooltip">?</div>
```

### In JavaScript:
```javascript
// Get translation
const text = window.i18n.t('chat.newMessage');

// With variables
const msg = window.i18n.t('time.minutesAgo', { count: 5 });
// "5 minutes ago"

// Change language
await window.i18n.setLanguage('de');
```

## Example: Making a Page Translatable

**Before:**
```html
<div class="chat-header">
    <h1>Chats</h1>
    <button>New Message</button>
</div>
```

**After:**
```html
<div class="chat-header">
    <h1 data-i18n="nav.chats">Chats</h1>
    <button data-i18n="chat.newMessage">New Message</button>
</div>
```

Then add to all language files:
```json
{
  "nav": { "chats": "..." },
  "chat": { "newMessage": "..." }
}
```

## Tips

- ✅ Use descriptive keys: `chat.sendMessage` not `btn1`
- ✅ Group by feature: `chat.*`, `nav.*`, `settings.*`
- ✅ Keep keys consistent across all language files
- ✅ Test language switching after adding new keys
- ❌ Don't hardcode text in HTML anymore
- ❌ Don't translate keys themselves (only values in JSON)
