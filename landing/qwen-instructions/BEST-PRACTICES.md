# Best Practices - Landing Page Development

## 📖 Coding Standards

### 1. HTML Structure

✅ **DO:**
```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Clear, Descriptive Title</title>
</head>
<body>
    <!-- Loader -->
    <!-- Navigation -->
    <!-- Main Content -->
    <!-- Scripts -->
</body>
</html>
```

❌ **DON'T:**
- Skip meta tags
- Use outdated HTML versions
- Forget lang attribute

---

### 2. Class Naming

✅ **DO:**
```html
<div class="reveal card rounded-xl p-6">
<div class="btn-red px-8 py-4">
```

❌ **DON'T:**
```html
<div class="my-custom-class-123">
<div style="background: red; padding: 20px;">
```

**Use Tailwind utilities first, custom CSS only when necessary.**

---

### 3. Icons

✅ **DO:**
```html
<span class="material-symbols-outlined text-3xl text-white">sports_soccer</span>
```

❌ **DON'T:**
```html
<span class="material-symbols-outlined">archery</span>  <!-- Invalid icon name -->
<i class="fa fa-soccer"></i>  <!-- Inconsistent with project -->
```

**Always verify icon names exist in Material Symbols!**

---

### 4. Colors

✅ **DO:**
```javascript
// Define in tailwind.config
colors: {
    primary: {
        red: '#DC143C',
    }
}
```

```html
<!-- Use in HTML -->
<div class="text-primary-red bg-primary-red/10">
```

❌ **DON'T:**
```html
<div class="text-[#DC143C]">  <!-- Inline colors everywhere -->
```

---

### 5. Responsive Design

✅ **DO:**
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
<div class="hidden lg:flex">  <!-- Hide on mobile -->
```

❌ **DON'T:**
- Design only for desktop
- Forget mobile menu
- Use fixed widths

---

### 6. Animations

✅ **DO:**
```html
<div class="reveal">Content</div>
<div class="reveal-left">Content</div>
<div class="reveal-right">Content</div>
```

```javascript
// Use IntersectionObserver
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
});
```

❌ **DON'T:**
- Animate everything
- Use long animation durations (>2s)
- Forget to add `.active` styles

---

### 7. Smooth Scroll

✅ **DO:**
```javascript
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

❌ **DON'T:**
- Forget to call `lenis.raf()` in animation frame
- Skip smooth scroll on mobile

---

### 8. Navigation

✅ **DO:**
```html
<nav class="fixed top-0 left-0 right-0 z-50">
<a href="#section" class="nav-link">Section</a>
```

```javascript
// Add scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('nav-scrolled');
    }
});
```

❌ **DON'T:**
- Use `position: fixed` without `z-index`
- Forget mobile menu
- Skip scroll effect

---

### 9. Links & Anchors

✅ **DO:**
```html
<a href="#section">Link</a>
<a href="tel:+1234567890">Call Us</a>
<a href="mailto:hello@example.com">Email</a>
```

```javascript
// Handle smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href === '#') return;  // Skip empty hashes
        const target = document.querySelector(href);
        if (target) {
            lenis.scrollTo(target, { offset: -80 });
        }
    });
});
```

❌ **DON'T:**
```html
<a href="#">Link</a>  <!-- Causes errors -->
<a onclick="scrollToSection()">Link</a>  <!-- Not accessible -->
```

---

### 10. Performance

✅ **DO:**
- Use CDN for libraries
- Minimize custom CSS
- Lazy load images (if many)
- Keep animations GPU-accelerated

❌ **DON'T:**
- Load unnecessary libraries
- Add heavy custom JavaScript
- Use large images without optimization

---

## 🎨 Design Best Practices

### Typography

✅ **DO:**
```html
<!-- Use font families consistently -->
<h1 class="font-serif text-5xl">Serif for headings</h1>
<p class="font-sans text-lg">Sans for body</p>
```

**Hierarchy:**
- H1: 5xl-7xl (48px-72px)
- H2: 4xl-5xl (36px-48px)
- H3: lg-xl (18px-20px)
- Body: base-lg (16px-18px)

---

### Spacing

✅ **DO:**
```html
<div class="section-padding">  <!-- 7rem top/bottom on desktop -->
<div class="mb-16">  <!-- Consistent spacing -->
<div class="gap-6">  <!-- Grid gaps -->
```

**Standard spacing:**
- Section padding: `7rem` (desktop), `4rem` (mobile)
- Between elements: `mb-4`, `mb-6`, `mb-8`
- Grid gaps: `gap-4`, `gap-6`, `gap-8`

---

### Colors

✅ **DO:**
- Use 1 primary color + neutrals
- Maintain contrast for readability
- Use gradients sparingly

**Recommended palettes:**
- Black + Red (Sports)
- Navy + Gold (Premium)
- Green + White (Eco/Health)

---

### Images & Icons

✅ **DO:**
- Use Material Symbols consistently
- Keep icon sizes proportional
- Use SVG when possible

**Icon sizes:**
- Small: `text-sm` (14px)
- Medium: `text-2xl` (24px)
- Large: `text-3xl`-`text-4xl` (36px-48px)
- Hero: `text-5xl`+ (64px+)

---

## 📱 Mobile Best Practices

### Touch Targets

✅ **DO:**
```html
<button class="px-6 py-3">  <!-- Minimum 44x44px -->
<a class="block py-3 px-4">  <!-- Easy to tap -->
```

❌ **DON'T:**
- Tiny buttons (< 44px)
- Links too close together
- Hover-only interactions

---

### Mobile Menu

✅ **DO:**
```javascript
// Handle body scroll
function openMobileMenu() {
    mobileMenu.classList.add('active');
    document.body.style.overflow = 'hidden';  // Prevent scroll
}
```

```css
.mobile-menu {
    position: fixed;
    right: -100%;  /* Slide from right */
    transition: right 0.4s ease;
}
.mobile-menu.active {
    right: 0;
}
```

---

### Responsive Grids

✅ **DO:**
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Breakpoints:**
- Mobile: 1 column
- Tablet (sm): 2 columns
- Desktop (lg): 3-4 columns

---

## ⚡ Performance Tips

### 1. Minimize Reflows

✅ **DO:**
```css
.card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}
```

❌ **DON'T:**
```css
.card {
    transition: all 0.3s ease;  /* Triggers more reflows */
}
```

---

### 2. GPU Acceleration

✅ **DO:**
```css
transform: translateY(0);  /* GPU accelerated */
opacity: 1;
```

❌ **DON'T:**
```css
top: 0;  /* CPU intensive */
margin-top: 20px;
```

---

### 3. Lazy Loading

```html
<img src="image.jpg" loading="lazy" alt="Description">
```

---

## 🔍 Accessibility

### Semantic HTML

✅ **DO:**
```html
<nav>Navigation</nav>
<main>Main content</main>
<section>Section</section>
<article>Article</article>
<footer>Footer</footer>
```

---

### ARIA Labels

```html
<button aria-label="Open menu">
<nav aria-label="Main navigation">
```

---

### Color Contrast

- Text on background: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Icons: ensure visibility

---

## 🧪 Testing Checklist

### Before Delivery:

- [ ] **Desktop** - Chrome, Firefox, Safari
- [ ] **Mobile** - iOS Safari, Chrome Android
- [ ] **Tablet** - iPad, Android tablets
- [ ] **Animations** - All trigger correctly
- [ ] **Forms** - Submit and validation work
- [ ] **Links** - All navigate correctly
- [ ] **Images** - All load properly
- [ ] **Icons** - All display as symbols (not text)
- [ ] **Console** - No JavaScript errors
- [ ] **Performance** - Fast load time
- [ ] **Mobile menu** - Opens/closes correctly
- [ ] **Smooth scroll** - Works on all pages

---

## 📝 Code Review Checklist

### HTML:
- [ ] Valid HTML5
- [ ] All tags closed properly
- [ ] Semantic elements used
- [ ] Alt text on images
- [ ] Proper heading hierarchy

### CSS:
- [ ] Tailwind utilities preferred
- [ ] No inline styles
- [ ] Consistent naming
- [ ] Mobile-first responsive

### JavaScript:
- [ ] No console errors
- [ ] Event listeners cleaned up
- [ ] Smooth scroll implemented
- [ ] Animations performant
- [ ] Mobile menu functional

---

## 🚀 Deployment Tips

### 1. File Size
- Keep HTML under 100KB
- Minify if possible
- Remove unused CSS

### 2. CDN Links
- Use reliable CDNs
- Include version numbers
- Have fallbacks if needed

### 3. Testing Live
- Test on actual domain
- Check SSL (HTTPS)
- Verify all links work

---

**Follow these practices for professional, production-ready landing pages!**
