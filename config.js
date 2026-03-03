/* ========================================
   Profile Configuration
   ========================================
   Edit this file to customize your profile
   ======================================== */

const profileConfig = {
    // Basic Info
    username: "yourname",           // Your username (shown in big gradient text)
    displayName: "Your Name",       // Your display name (smaller text below username)
    bio: "Welcome to my profile! I'm a developer, designer, and creator. Love building cool stuff.",
    footerName: "yourname",         // Name shown in footer
    
    // Join Date (for stats calculation) - Format: "YYYY-MM-DD"
    joinDate: "2024-01-01",
    
    // Profile Avatar (path to your image)
    avatar: "assets/images/profile.gif",
    
    // Background Video (path to your video)
    backgroundVideo: "assets/videos/background.mp4",
    
    // Background Music (path to your audio)
    backgroundMusic: "assets/music/background_music.mp3",
    
    // Auto-play music on entry (true/false)
    autoPlayMusic: false,
    
    // Enable custom cursor (true/false)
    customCursor: true,
    
    // Available themes: default, dark, red, green, orange, pink, cyan
    themes: ["default", "dark", "red", "green", "orange", "pink", "cyan"],
    defaultTheme: 0,  // Index of default theme (0 = first theme)
    
    // Badges (shown below avatar)
    // Add your badge images to assets/images/
    badges: [
        { name: "Owner", icon: "assets/images/owner.gif" },
        { name: "Verified", icon: "assets/images/verified.gif" },
        { name: "Developer", icon: "assets/images/developer.png" },
        { name: "Partner", icon: "assets/images/partner.gif" }
    ],
    
    // Social Links
    // Supported platforms: github, discord, twitter, youtube, tiktok, 
    //                      instagram, telegram, spotify, twitch, steam, 
    //                      email, website, custom
    socialLinks: [
        { platform: "github", name: "GitHub", url: "https://github.com/yourusername" },
        { platform: "discord", name: "Discord", url: "https://discord.gg/yourserver" },
        { platform: "twitter", name: "Twitter", url: "https://twitter.com/yourusername" },
        { platform: "youtube", name: "YouTube", url: "https://youtube.com/@yourchannel" },
        { platform: "instagram", name: "Instagram", url: "https://instagram.com/yourusername" },
        { platform: "telegram", name: "Telegram", url: "https://t.me/yourusername" },
        { platform: "spotify", name: "Spotify", url: "https://open.spotify.com/user/yourusername" },
        { platform: "website", name: "Website", url: "https://yourwebsite.com" }
    ],
    
    // Skills/Languages (shown at bottom of card)
    skills: [
        "JavaScript",
        "TypeScript",
        "Python",
        "Node.js",
        "React",
        "Vue",
        "CSS",
        "HTML"
    ]
};
