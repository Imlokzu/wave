# Setup Instructions - Premium Landing Pages

## 🚀 Quick Start

### 1. Create New Landing Page

```bash
# Create new folder for your project
mkdir landing/project-name
cd landing/project-name

# Create HTML file
touch index.html
```

### 2. Copy Base Template

Copy the structure from `sport/sports-club-template.html`:

1. Copy the entire `<!doctype html>` structure
2. Keep the `<head>` section with all CDNs
3. Keep the JavaScript at the bottom

### 3. Customize

#### Change Colors
In the `tailwind.config` script:
```javascript
colors: {
    primary: {
        black: '#0a0a0a',  // Change to your color
        red: '#DC143C',    // Change to your color
    }
}
```

#### Change Fonts
In the `<head>`:
```html
<!-- Replace with your font choices -->
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;700&display=swap" rel="stylesheet" />
```

#### Change Logo
Find the logo div and replace the icon:
```html
<div class="club-logo">
    <span class="material-symbols-outlined text-3xl text-white">your_icon</span>
</div>
```

### 4. Test

Open in browser:
```bash
# On Linux
xdg-open index.html

# On Mac
open index.html

# On Windows
start index.html
```

---

## 📁 File Organization

```
landing/
├── project-name/
│   ├── index.html          # Main landing page
│   ├── css/                # Custom CSS (if needed)
│   ├── js/                 # Custom JS (if needed)
│   └── images/             # Images (if needed)
├── sport/
│   └── sports-club-template.html
└── qwen-instructions/
    ├── README.md
    ├── SETUP.md            # This file
    ├── COMPONENTS.md
    └── BEST-PRACTICES.md
```

---

## 🎨 Common Customizations

### Change Brand Name
Search and replace:
- `Sports Club` → Your brand name
- `Since 1945` → Your tagline

### Change Sections
Edit section IDs:
```html
<section id="home">      <!-- Change content -->
<section id="about">     <!-- Change content -->
<section id="contact">   <!-- Change content -->
```

### Update Navigation
```html
<a href="#home">Home</a>      <!-- Update text -->
<a href="#services">Services</a>  <!-- Add/remove links -->
```

### Update Footer Contact
```html
<li>
    <span class="material-symbols-outlined">location_on</span>
    <span>Your Address<br>Your City</span>
</li>
<li>
    <span class="material-symbols-outlined">phone</span>
    <a href="tel:+1234567890">+123 456 7890</a>
</li>
```

---

## 🔧 Troubleshooting

### Icons Show as Text
**Problem:** Icons display as words instead of symbols

**Solution:**
1. Check Google Fonts link has `FILL,GRAD@24,400,1,0`
2. Verify CSS has `font-family: 'Material Symbols Outlined'`
3. Use valid icon names (see README.md)
4. Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`

### Smooth Scroll Not Working
**Problem:** Page doesn't scroll smoothly

**Solution:**
1. Check Lenis script is loaded
2. Verify `lenis.raf(time)` is called
3. Check no JavaScript errors in console

### Animations Not Triggering
**Problem:** Elements don't animate on scroll

**Solution:**
1. Check elements have `.reveal`, `.reveal-left`, or `.reveal-right` class
2. Verify IntersectionObserver is set up
3. Check CSS has `.active` state styles

### Mobile Menu Not Working
**Problem:** Hamburger menu doesn't open

**Solution:**
1. Check all IDs match (`mobileMenuBtn`, `mobileMenu`, etc.)
2. Verify event listeners are attached
3. Check CSS for `.mobile-menu.active` styles

---

## 💡 Pro Tips

1. **Always test on mobile** - Use browser dev tools
2. **Keep animations subtle** - Don't overdo it
3. **Use meaningful icon names** - Check Material Symbols docs
4. **Optimize for speed** - Minimal custom CSS
5. **Test in multiple browsers** - Chrome, Firefox, Safari

---

## 📞 Need Help?

Check these files:
- `README.md` - Full documentation
- `COMPONENTS.md` - Reusable components
- `BEST-PRACTICES.md` - Coding standards
