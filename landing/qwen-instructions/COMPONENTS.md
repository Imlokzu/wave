# Reusable Components Library

## 📦 Copy-Paste Components

All components use the standard setup from `README.md`.

---

## 🎯 Buttons

### Primary Button (Black)
```html
<a href="#cta" class="btn-black px-8 py-4 rounded-md font-semibold tracking-wide">
    Button Text
</a>
```

### Primary Button (Red Gradient)
```html
<a href="#cta" class="btn-red px-8 py-4 rounded-md font-semibold tracking-wide inline-flex items-center gap-2 group">
    <span>Button Text</span>
    <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
</a>
```

### Outline Button
```html
<a href="#cta" class="btn-outline px-8 py-4 rounded-md font-semibold tracking-wide">
    Button Text
</a>
```

### Button with Icon
```html
<a href="#cta" class="btn-red px-6 py-3 rounded-md font-semibold inline-flex items-center gap-2">
    <span class="material-symbols-outlined">shopping_bag</span>
    <span>Shop Now</span>
</a>
```

---

## 🏷️ Badges

### Black Badge
```html
<span class="badge badge-black mb-4">Category</span>
```

### Red Badge
```html
<span class="badge badge-red mb-4">New</span>
```

### Gray Badge
```html
<span class="badge badge-gray mb-4">Updated</span>
```

---

## 📊 Stats Counter

### Single Stat
```html
<div>
    <div class="stat-number counter" data-target="3000">0</div>
    <div class="text-sm text-gray-500 mt-2 uppercase">Label</div>
</div>
```

### Stats Grid (4 columns)
```html
<div class="grid grid-cols-4 gap-8 pt-8 border-t border-white/10">
    <div>
        <div class="stat-number-white counter" data-target="3000">0</div>
        <div class="text-sm text-gray-500 mt-2 uppercase">Members</div>
    </div>
    <div>
        <div class="stat-number-white counter" data-target="12">0</div>
        <div class="text-sm text-gray-500 mt-2 uppercase">Departments</div>
    </div>
    <div>
        <div class="stat-number-white counter" data-target="150">0</div>
        <div class="text-sm text-gray-500 mt-2 uppercase">Coaches</div>
    </div>
    <div>
        <div class="stat-number-white">80</div>
        <div class="text-sm text-gray-500 mt-2 uppercase">Years</div>
    </div>
</div>
```

---

## 📰 News Cards

### Standard News Card
```html
<article class="reveal news-card rounded-xl">
    <div class="h-56 bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] relative overflow-hidden">
        <div class="absolute top-4 left-4">
            <span class="badge badge-red">News</span>
        </div>
    </div>
    <div class="p-6">
        <div class="text-xs text-gray-500 mb-3 flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">calendar_today</span>
            February 20, 2026
        </div>
        <h3 class="font-serif text-xl font-bold mb-3">News Title</h3>
        <p class="text-gray-600 text-sm mb-4">Brief description of the news article.</p>
        <a href="#" class="text-red-600 hover:text-red-700 text-sm font-semibold inline-flex items-center gap-1">
            Read More
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
    </div>
</article>
```

---

## 🏅 Feature/Department Cards

### Standard Card
```html
<div class="reveal dept-card rounded-xl p-6 cursor-pointer">
    <div class="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-3xl text-white">sports_soccer</span>
    </div>
    <h3 class="font-serif text-lg font-bold mb-2">Title</h3>
    <p class="text-gray-600 text-sm">Brief description of the feature or department.</p>
</div>
```

### Card Grid (3 columns)
```html
<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Repeat card component -->
</div>
```

---

## 📍 Facility/Location Cards

```html
<div class="reveal card rounded-xl p-6">
    <div class="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-2xl text-red-600">location_on</span>
    </div>
    <h3 class="font-serif text-lg font-bold mb-2">Facility Name</h3>
    <p class="text-gray-600 text-sm">Brief description of the facility.</p>
</div>
```

---

## ⏱️ Timeline Items

```html
<div class="reveal timeline-item">
    <div class="card rounded-2xl p-6">
        <div class="flex items-center gap-3 mb-3">
            <span class="badge badge-red">2025</span>
            <span class="text-gray-500 text-sm">Recent</span>
        </div>
        <h3 class="font-serif text-xl font-bold mb-2">Event Title</h3>
        <p class="text-gray-600">Description of the event or milestone.</p>
    </div>
</div>
```

### Timeline Container
```html
<div class="space-y-8">
    <!-- Repeat timeline-item -->
</div>
```

---

## 🏢 Organization Cards (Clickable)

```html
<a href="#" class="card rounded-xl p-5 flex items-center gap-4 hover:border-red-600">
    <div class="w-14 h-14 bg-gradient-to-br from-black to-gray-800 rounded-xl flex items-center justify-center">
        <span class="material-symbols-outlined text-white text-2xl">leaderboard</span>
    </div>
    <div class="flex-1">
        <h4 class="font-semibold">Department Name</h4>
        <p class="text-gray-600 text-sm">Brief description</p>
    </div>
    <span class="material-symbols-outlined text-gray-400">chevron_right</span>
</a>
```

---

## 📱 Hero Section Components

### Hero Badge
```html
<div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-8 border border-white/20">
    <span class="material-symbols-outlined text-sm text-red-500">celebration</span>
    <span class="text-sm font-semibold tracking-widest uppercase text-white">80 Years</span>
</div>
```

### Hero Title
```html
<h1 class="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
    Welcome to<br>
    <span class="text-gradient-red">Excellence</span>
</h1>
```

### Hero Description
```html
<p class="text-lg text-gray-400 mb-10 leading-relaxed max-w-xl">
    Your compelling description that explains what you offer and why visitors should care.
</p>
```

### Hero CTA Buttons
```html
<div class="flex flex-col sm:flex-row gap-4 mb-16">
    <a href="#cta" class="btn-red px-8 py-4 rounded-md font-semibold tracking-wide inline-flex items-center justify-center gap-2 group">
        <span>Primary Action</span>
        <span class="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
    </a>
    <a href="#learn" class="btn-outline px-8 py-4 rounded-md font-semibold tracking-wide" style="border-color: rgba(255,255,255,0.3); color: white;">
        Secondary Action
    </a>
</div>
```

---

## 📞 Contact/Footer Components

### Social Links
```html
<div class="flex gap-3">
    <a href="#" class="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
        <span class="material-symbols-outlined text-gray-400 hover:text-white text-sm">facebook</span>
    </a>
    <a href="#" class="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
        <span class="material-symbols-outlined text-gray-400 hover:text-white text-sm">alternate_email</span>
    </a>
    <a href="#" class="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
        <span class="material-symbols-outlined text-gray-400 hover:text-white text-sm">photo_camera</span>
    </a>
</div>
```

### Contact Info List
```html
<ul class="space-y-3 text-gray-400 text-sm">
    <li class="flex items-start gap-3">
        <span class="material-symbols-outlined text-red-600 text-sm">location_on</span>
        <span>123 Street Name<br>City, Country</span>
    </li>
    <li class="flex items-center gap-3">
        <span class="material-symbols-outlined text-red-600 text-sm">phone</span>
        <a href="tel:+1234567890" class="hover:text-red-600 transition-colors">+123 456 7890</a>
    </li>
    <li class="flex items-center gap-3">
        <span class="material-symbols-outlined text-red-600 text-sm">email</span>
        <a href="mailto:hello@example.com" class="hover:text-red-600 transition-colors">hello@example.com</a>
    </li>
</ul>
```

---

## 🎯 Call-to-Action Section

```html
<section class="section-padding bg-gradient-to-br from-black to-gray-900 relative overflow-hidden">
    <div class="absolute inset-0 opacity-10">
        <div class="absolute top-0 right-0 w-96 h-96 bg-red-600 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 left-0 w-96 h-96 bg-black rounded-full blur-3xl"></div>
    </div>
    <div class="max-w-4xl mx-auto px-4 text-center relative z-10 reveal">
        <span class="material-symbols-outlined text-6xl text-red-600 mb-6">celebration</span>
        <h2 class="font-serif text-4xl sm:text-5xl font-bold mb-6 text-white">
            Become Part of Our Community
        </h2>
        <div class="divider mb-8"></div>
        <p class="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Your compelling call-to-action message that motivates visitors to take action.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#join" class="btn-red px-10 py-4 rounded-md font-bold tracking-wide inline-flex items-center justify-center gap-2">
                <span class="material-symbols-outlined">person_add</span>
                <span>Join Now</span>
            </a>
            <a href="#learn" class="btn-outline px-10 py-4 rounded-md font-bold tracking-wide" style="border-color: rgba(255,255,255,0.3); color: white;">
                <span class="material-symbols-outlined">info</span>
                <span>Learn More</span>
            </a>
        </div>
    </div>
</section>
```

---

## 📱 Mobile Menu Component

```html
<!-- Menu Button -->
<button id="mobileMenuBtn" class="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors">
    <span class="material-symbols-outlined text-2xl">menu</span>
</button>

<!-- Overlay -->
<div class="mobile-menu-overlay" id="mobileMenuOverlay"></div>

<!-- Menu Panel -->
<div class="mobile-menu" id="mobileMenu">
    <div class="p-6">
        <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
                <div class="club-logo w-12 h-12">
                    <span class="material-symbols-outlined text-2xl text-white">sports</span>
                </div>
                <div>
                    <span class="font-serif text-lg font-bold block">Brand</span>
                    <span class="text-xs text-gray-500 uppercase">Since 1945</span>
                </div>
            </div>
            <button id="closeMobileMenu" class="p-2 hover:bg-gray-100 rounded-lg">
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
        </div>
        <nav class="space-y-4">
            <a href="#home" class="block py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Home</a>
            <a href="#about" class="block py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">About</a>
            <a href="#contact" class="block py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors font-medium">Contact</a>
        </nav>
    </div>
</div>
```

---

## 🎨 Section Headers

### Standard Section Header
```html
<div class="text-center mb-16 reveal">
    <span class="badge badge-black mb-4">Category</span>
    <h2 class="font-serif text-4xl sm:text-5xl font-bold mb-4">Section Title</h2>
    <div class="divider mb-6"></div>
    <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Brief description that explains what this section is about.
    </p>
</div>
```

---

## 💡 Usage Tips

1. **Copy the entire component** - Don't mix and match classes
2. **Keep animation classes** - `.reveal`, `.reveal-left`, etc.
3. **Update colors** - Replace `red-600` with your color
4. **Change icons** - Use valid Material Symbols names
5. **Test responsiveness** - Check on mobile and desktop

---

**All components are production-ready and tested!**
