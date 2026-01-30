# 🎨 Wave Messenger - Theme System Guide

## Quick Start - Change Your Theme in 3 Steps!

1. **Open** `public/css/theme-config.css`
2. **Edit** the 3 color variables at the top:
   ```css
   --color-primary: #00d9ff;    /* Main brand color */
   --color-secondary: #90bccb;  /* Secondary UI color */
   --color-tertiary: #34caff;   /* Accent highlights */
   ```
3. **Save** and refresh your browser - Done! ✨

## 🎨 Color System

### Primary Color (`--color-primary`)
**Used for:**
- Buttons and CTAs
- Active links
- Selected states
- Brand highlights
- Progress indicators

**Default:** `#00d9ff` (Cyan Blue)

**Try these:**
- `#ff006e` - Hot Pink
- `#7c3aed` - Purple
- `#10b981` - Green
- `#f97316` - Orange

### Secondary Color (`--color-secondary`)
**Used for:**
- Inactive text
- Secondary buttons
- Borders
- Icons
- Muted elements

**Default:** `#90bccb` (Muted Cyan)

**Try these:**
- `#94a3b8` - Slate Gray
- `#a78bfa` - Light Purple
- `#6ee7b7` - Mint Green

### Tertiary Color (`--color-tertiary`)
**Used for:**
- Hover states
- Badges
- Notifications
- Accent highlights
- Interactive feedback

**Default:** `#34caff` (Bright Cyan)

**Try these:**
- `#ff1493` - Deep Pink
- `#a855f7` - Vivid Purple
- `#34d399` - Emerald

## 🎭 Preset Themes

Uncomment any preset in `theme-config.css`:

### Purple Dream 💜
```css
--color-primary: #a855f7;
--color-secondary: #c4b5fd;
--color-tertiary: #d946ef;
```

### Emerald Forest 🌲
```css
--color-primary: #10b981;
--color-secondary: #6ee7b7;
--color-tertiary: #34d399;
```

### Hot Pink 💗
```css
--color-primary: #ff006e;
--color-secondary: #ff6ba9;
--color-tertiary: #ff1493;
```

### Ocean Blue 🌊
```css
--color-primary: #0ea5e9;
--color-secondary: #7dd3fc;
--color-tertiary: #38bdf8;
```

### Sunset Orange 🌅
```css
--color-primary: #f97316;
--color-secondary: #fdba74;
--color-tertiary: #fb923c;
```

### Royal Gold 👑
```css
--color-primary: #fbbf24;
--color-secondary: #fcd34d;
--color-tertiary: #fde047;
```

## 🔧 Advanced Customization

### Alpha Variations
When you change `--color-primary`, update the RGB values:

```css
/* For #a855f7 (Purple) */
--primary-rgb: 168, 85, 247;
--primary-10: rgba(168, 85, 247, 0.1);
--primary-20: rgba(168, 85, 247, 0.2);
--primary-30: rgba(168, 85, 247, 0.3);
--primary-50: rgba(168, 85, 247, 0.5);
```

**How to get RGB values:**
1. Use a color picker tool
2. Or convert hex: `#a855f7` → R:168, G:85, B:247

### CSS Variable Reference

All available theme variables in `theme.css`:

```css
/* Main Theme Colors */
--color-primary
--color-secondary
--color-tertiary

/* Backgrounds */
--bg-primary
--bg-secondary
--surface
--surface-dark
--surface-hover
--surface-dark-hover

/* Text */
--text-primary
--text-secondary
--text-muted

/* Borders */
--border
--border-dark
--border-subtle

/* Accents */
--accent
--accent-hover
--accent-glow

/* Status Colors */
--success
--warning
--error
```

## 🎨 Using Theme Colors in HTML

### Background Colors
```html
<div class="bg-primary">Primary background</div>
<div class="bg-secondary">Secondary background</div>
<div class="bg-tertiary">Tertiary background</div>
```

### Text Colors
```html
<span class="text-primary">Primary text</span>
<span class="text-secondary">Secondary text</span>
<span class="text-tertiary">Tertiary text</span>
```

### Hover States
```html
<button class="hover:bg-primary">Hover me</button>
<a class="hover:text-primary">Hover link</a>
```

### Opacity Variants
```html
<div class="bg-primary/10">10% opacity</div>
<div class="bg-primary/20">20% opacity</div>
<div class="bg-primary/50">50% opacity</div>
```

## 📁 File Structure

```
public/css/
├── theme.css           # Core theme system (don't edit)
├── theme-config.css    # YOUR THEME COLORS (edit this!)
└── THEME_GUIDE.md      # This guide
```

## 🚀 Best Practices

1. **Only edit `theme-config.css`** - Don't modify `theme.css` directly
2. **Test your colors** - Make sure they have good contrast
3. **Use the presets** - Start with a preset and tweak from there
4. **Keep it consistent** - Use the 3-color system throughout
5. **Update RGB values** - When changing primary color, update the alpha variants

## 🐛 Troubleshooting

**Colors not changing?**
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Check that `theme-config.css` is loaded after `theme.css`
- Make sure you're editing the right file

**Some elements not themed?**
- They might use hardcoded colors
- Check if the element has inline styles
- Report it as a bug to add to the theme system

**Want to add more colors?**
- Add new CSS variables in `theme-config.css`
- Follow the naming pattern: `--color-name`
- Create utility classes in `theme.css`

## 💡 Tips

- **Use a color picker** - Tools like [Coolors.co](https://coolors.co) help find matching colors
- **Check accessibility** - Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Save your theme** - Keep a backup of your custom colors
- **Share themes** - Export your `theme-config.css` to share with others

## 🎉 Examples

### Gaming Theme (Green/Black)
```css
--color-primary: #00ff41;
--color-secondary: #00cc33;
--color-tertiary: #39ff14;
```

### Corporate Blue
```css
--color-primary: #0066cc;
--color-secondary: #6699cc;
--color-tertiary: #3399ff;
```

### Sunset Vibes
```css
--color-primary: #ff6b35;
--color-secondary: #f7931e;
--color-tertiary: #fdc500;
```

---

**Need help?** Check the code comments in `theme-config.css` or ask in the community!
