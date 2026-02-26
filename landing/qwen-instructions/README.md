# Qwen Landing Page Coding Instructions

## 🎯 Overview

This guide contains instructions for creating premium, modern landing pages using HTML, Tailwind CSS, GSAP, and Lenis smooth scroll.

---

## 📁 Project Structure

```
landing/
├── sport/                    # Sports club template
│   └── sports-club-template.html
├── qwen-instructions/        # This folder
│   ├── README.md            # This file
│   ├── SETUP.md             # Setup instructions
│   ├── COMPONENTS.md        # Reusable components
│   └── BEST-PRACTICES.md    # Coding best practices
└── [other projects]/
```

---

## 🛠️ Tech Stack

| Technology | Purpose | CDN Link |
|------------|---------|----------|
| **Tailwind CSS** | Utility-first styling | `https://cdn.tailwindcss.com?plugins=forms,container-queries` |
| **Lenis** | Smooth scrolling | `https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js` |
| **GSAP** | Animations | `https://unpkg.com/gsap@3.12.5/dist/gsap.min.js` |
| **ScrollTrigger** | Scroll-based animations | `https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js` |
| **Google Fonts** | Typography | See below |
| **Material Symbols** | Icons | See below |

---

## 📝 Essential Head Setup

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta content="width=device-width, initial-scale=1.0" name="viewport" />
    <title>Your Project Title</title>

    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    
    <!-- Material Symbols Icons -->
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" />
    
    <!-- Icon Styles -->
    <style>
        .material-symbols-outlined {
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-feature-settings: 'liga';
            -webkit-font-smoothing: antialiased;
        }
    </style>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    
    <!-- Tailwind Config -->
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    fontFamily: { 
                        serif: ["Playfair Display", "serif"], 
                        sans: ["Inter", "sans-serif"] 
                    },
                    colors: {
                        // Add custom colors here
                        primary: {
                            black: '#0a0a0a',
                            red: '#DC143C',
                        }
                    }
                },
            },
        };
    </script>
    
    <!-- Lenis Smooth Scroll -->
    <script src="https://unpkg.com/@studio-freight/lenis@1.0.42/dist/lenis.min.js"></script>
    
    <!-- GSAP -->
    <script src="https://unpkg.com/gsap@3.12.5/dist/gsap.min.js"></script>
    <script src="https://unpkg.com/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
</head>
```

---

## 🎨 Color Palette Setup

### Black & Red (Sports Club)
```javascript
colors: {
    club: {
        black: '#0a0a0a',
        red: '#DC143C',
        'red-dark': '#B91C1C',
        'red-light': '#EF4444',
    }
}
```

### Navy & Gold (Premium)
```javascript
colors: {
    navy: {
        50: '#f0f4f8',
        900: '#102a43',
    },
    gold: {
        500: '#ffc107',
        600: '#ffb300',
    }
}
```

---

## 🧩 Essential Components

### 1. Loader
```html
<div class="loader" id="loader">
    <div class="text-center">
        <div class="loader-logo mx-auto">
            <span class="material-symbols-outlined text-5xl text-white">sports</span>
        </div>
        <div class="loader-text">YOUR BRAND</div>
    </div>
</div>
```

### 2. Navigation
```html
<nav id="navbar" class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-20">
            <!-- Logo -->
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-3xl text-white">sports</span>
                </div>
                <div>
                    <span class="font-serif text-xl font-bold block">Brand Name</span>
                    <span class="text-xs text-gray-500 uppercase tracking-widest">Since 1945</span>
                </div>
            </div>
            
            <!-- Desktop Menu -->
            <div class="hidden lg:flex items-center gap-10">
                <a href="#home" class="nav-link text-sm font-medium">Home</a>
                <a href="#about" class="nav-link text-sm font-medium">About</a>
                <a href="#contact" class="nav-link text-sm font-medium">Contact</a>
            </div>
            
            <!-- CTA Button -->
            <a href="#shop" class="btn-primary px-6 py-2.5 rounded-md text-sm font-semibold">Shop</a>
        </div>
    </div>
</nav>
```

### 3. Hero Section
```html
<section id="home" class="hero-section min-h-screen flex items-center relative pt-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div class="grid lg:grid-cols-2 gap-16 items-center">
            <div class="reveal-left">
                <h1 class="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
                    Welcome to<br>
                    <span class="text-gradient">Excellence</span>
                </h1>
                <p class="text-lg text-gray-600 mb-10">Your description here.</p>
                <div class="flex gap-4">
                    <a href="#cta" class="btn-primary px-8 py-4 rounded-md font-semibold">Get Started</a>
                    <a href="#about" class="btn-outline px-8 py-4 rounded-md font-semibold">Learn More</a>
                </div>
            </div>
            <div class="reveal-right hidden lg:block">
                <!-- Hero visual/content -->
            </div>
        </div>
    </div>
</section>
```

### 4. Stats Counter
```html
<div class="grid grid-cols-4 gap-8">
    <div>
        <div class="stat-number counter" data-target="3000">0</div>
        <div class="text-sm text-gray-500 mt-2 uppercase">Members</div>
    </div>
    <div>
        <div class="stat-number counter" data-target="12">0</div>
        <div class="text-sm text-gray-500 mt-2 uppercase">Departments</div>
    </div>
</div>
```

### 5. Card Grid
```html
<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="reveal card rounded-xl p-6">
        <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-2xl text-red-600">icon_name</span>
        </div>
        <h3 class="font-serif text-lg font-bold mb-2">Title</h3>
        <p class="text-gray-600 text-sm">Description</p>
    </div>
</div>
```

### 6. Timeline
```html
<div class="space-y-8">
    <div class="reveal timeline-item">
        <div class="card rounded-2xl p-6">
            <span class="badge badge-primary">1945</span>
            <h3 class="font-serif text-xl font-bold mb-2">Event Title</h3>
            <p class="text-gray-600">Description</p>
        </div>
    </div>
</div>
```

---

## ⚡ JavaScript Setup

```javascript
// Lenis Smooth Scroll
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: 'vertical',
    smooth: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// Loader
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
    }, 2000);
});

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('nav-scrolled');
    } else {
        navbar.classList.remove('nav-scrolled');
    }
});

// Reveal animations
const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

revealElements.forEach(el => revealObserver.observe(el));

// Counter animation
const counters = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counter = entry.target;
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000;
            const increment = target / (duration / 16);
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < target) {
                    counter.textContent = Math.floor(current);
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };
            updateCounter();
            counterObserver.unobserve(counter);
        }
    });
}, { threshold: 0.5 });

counters.forEach(counter => counterObserver.observe(counter));

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            lenis.scrollTo(target, { offset: -80 });
        }
    });
});
```

---

## 🎯 Icon Usage

### Valid Material Symbols Names:
- `sports` - General sports
- `sports_soccer` - Football/Soccer
- `sports_basketball` - Basketball
- `sports_tennis` - Tennis
- `sports_volleyball` - Volleyball
- `sports_martial_arts` - Karate/Martial Arts
- `fitness_center` - Gym/Fitness
- `directions_bike` - Cycling
- `target` - Archery/Target
- `chess` - Chess
- `table_bar` - Table Tennis
- `sports_handball` - Handball/Stock sports
- `beach_access` - Beach sports
- `school` - Education/School
- `apartment` - Building/Facility
- `location_on` - Location
- `celebration` - Party/Celebration
- `shopping_bag` - Shop
- `handshake` - Partnership
- `calendar_today` - Calendar/Date
- `arrow_forward` - Arrow
- `menu` - Menu
- `close` - Close
- `verified` - Checkmark
- `diversity_3` - People/Group
- `leaderboard` - Board/Management
- `auto_stories` - Books/Documents
- `groups` - Groups/Team
- `account_balance` - Organization
- `phone` - Phone
- `email` - Email
- `facebook` - Facebook
- `photo_camera` - Camera/Instagram

### Usage:
```html
<span class="material-symbols-outlined text-3xl text-white">sports_soccer</span>
```

---

## 📱 Mobile Menu Setup

```html
<!-- Mobile Menu Button -->
<button id="mobileMenuBtn" class="lg:hidden p-2">
    <span class="material-symbols-outlined text-2xl">menu</span>
</button>

<!-- Mobile Menu Overlay -->
<div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>

<!-- Mobile Menu -->
<div class="mobile-menu" id="mobileMenu">
    <div class="p-6">
        <button id="closeMobileMenu" class="p-2">
            <span class="material-symbols-outlined text-2xl">close</span>
        </button>
        <nav class="space-y-4">
            <a href="#home" class="block py-3 px-4 hover:bg-gray-50">Home</a>
        </nav>
    </div>
</div>
```

```javascript
// Mobile menu JS
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const closeMobileMenu = document.getElementById('closeMobileMenu');
const mobileMenu = document.getElementById('mobileMenu');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

function openMobileMenu() {
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenuFn() {
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

mobileMenuBtn.addEventListener('click', openMobileMenu);
closeMobileMenu.addEventListener('click', closeMobileMenuFn);
mobileMenuOverlay.addEventListener('click', closeMobileMenuFn);
```

---

## 🎨 CSS Classes Reference

### Reveal Animations:
- `.reveal` - Fade up
- `.reveal-left` - Slide from left
- `.reveal-right` - Slide from right
- `.reveal-scale` - Scale up

### Buttons:
- `.btn-primary` - Primary filled button
- `.btn-outline` - Outlined button
- `.btn-black` - Black button
- `.btn-red` - Red gradient button

### Cards:
- `.card` - Basic card
- `.card-premium` - Premium gradient card
- `.dept-card` - Department card with hover line

### Badges:
- `.badge` - Base badge
- `.badge-black` - Black badge
- `.badge-red` - Red badge
- `.badge-gray` - Gray badge

---

## ✅ Checklist Before Delivery

- [ ] All icons display correctly (not as text)
- [ ] Smooth scroll works
- [ ] All animations trigger on scroll
- [ ] Counter animations work
- [ ] Mobile menu functions properly
- [ ] All links work (no `href="#"` errors)
- [ ] Responsive on all screen sizes
- [ ] No console errors
- [ ] Loader displays and hides correctly
- [ ] Navbar scroll effect works

---

## 📚 Resources

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [GSAP Docs](https://greensock.com/docs/)
- [Lenis GitHub](https://github.com/studio-freight/lenis)
- [Material Symbols](https://fonts.google.com/icons)
- [Google Fonts](https://fonts.google.com/)

---

**Made for Qwen Code - Premium Landing Page Development**
