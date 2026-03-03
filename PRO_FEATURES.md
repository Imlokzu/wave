# 🌟 Wave Pro Features

## Overview
Wave Pro is the premium subscription tier that unlocks advanced features and capabilities in Wave Messenger.

---

## 🤖 AI Features

### Premium AI Models
Pro users get access to 11 additional AI models (14 total vs 3 free):

#### Free Models (3)
- **Wave Flash 1-4** - Ultra-fast responses for simple questions
- **Wave 1-3** - Balanced models for general tasks
- **Wave O1** - Fast thinking mode

#### Pro-Only Models (11)
- **Wave 4** - High-intelligence tasks with very strong reasoning
- **Wave 5** - Advanced reasoning with structured outputs
- **Wave O2** - Reasoning & research with thinking toggle
- **Wave O3** - Deep logic for complex reasoning
- **Wave O4** - Expert research with very strong reasoning
- **Wave O5** - Premium analysis with deepest reasoning

### AI Feed Summarization
- **Feature**: AI-powered summarization of feed posts
- **Location**: Feed page
- **Benefit**: Quickly understand long posts without reading everything

=
## 🎨 Appearance & Customization

### Advanced Theme System
- **Dark/Light Themes**: Full theme customization
- **Custom Color Schemes**: Personalize your interface colors
- **Custom Backgrounds**: Upload your own chat backgrounds
- **Transparency Mode**: Customizable blur effects

---

## 💬 Messaging Features

### Offline Message Download
- **Feature**: Download message history for offline access
- **Benefit**: Access your conversations without internet
- **Format**: Exportable message archives

---

## 🎁 Additional Benefits

### Priority Support
- Faster response times for support requests
- Direct access to development team
- Feature request priority

### Pro Badge
- Visible Pro badge on your profile
- Stand out in user directory
- Show your support for Wave

---

## 📊 Feature Comparison

| Feature | Free | Pro |
|---------|------|-----|
| AI Models | 3 basic models | 14 models (3 free + 11 pro) |
| AI Feed Summarization | ❌ | ✅ |
| Music Upload | ❌ | ✅ (50MB/track) |
| Music Storage | ❌ | ✅ Unlimited |
| Offline Downloads | ❌ | ✅ |
| Custom Backgrounds | ❌ | ✅ |
| Advanced Themes | ❌ | ✅ |
| Message Export | ❌ | ✅ |
| Priority Support | ❌ | ✅ |
| Pro Badge | ❌ | ✅ |

---

## 🚀 How to Enable Pro

### For Users
1. Go to Settings → Pro tab
2. Click "Request Pro Access"
3. Fill out the request form
4. Wait for admin approval

### For Admins
Use the admin panel or run:
```bash
cd backend
node enable-pro.js <username>
```

---

## 💡 Pro Model Details

### Wave Flash Series (Free)
- **Wave Flash 1**: Ultra-fast responses (liquid/lfm-2.5-1.2b-instruct)
- **Wave Flash 2**: Quick responses (qwen/qwen3-4b)
- **Wave Flash 3**: Lightweight research (google/gemma-3n-e4b-it)
- **Wave Flash 4**: Efficient dialogue (google/gemma-3-12b-it)

### Wave Standard Series
- **Wave 1** (Free): Fast balanced model (nvidia/nemotron-3-nano-30b-a3b)
- **Wave 2** (Free): General intelligence (arcee-ai/trinity-mini)
- **Wave 3** (Free): Balanced chat & research (google/gemma-3-27b-it)
- **Wave 4** (Pro): High-intelligence tasks (meta-llama/llama-3.3-70b-instruct)
- **Wave 5** (Pro): Advanced reasoning (arcee-ai/trinity-large-preview)

### Wave O Series (Thinking Models)
- **Wave O1** (Free): Fast thinking mode (liquid/lfm-2.5-1.2b-thinking)
- **Wave O2** (Pro): Reasoning & research (z-ai/glm-4.5-air)
- **Wave O3** (Pro): Deep logic (stepfun/step-3.5-flash)
- **Wave O4** (Pro): Expert research (tngtech/tng-r1t-chimera)
- **Wave O5** (Pro): Premium analysis (deepseek/deepseek-r1-0528)

---

## 🔧 Technical Implementation

### Database
- Pro status stored in `flux_users.is_pro` column
- Subscription details in `subscriptions` table
- Pro requests tracked in `pro_requests` table

### API Endpoints
- `GET /api/subscription/status` - Check pro status
- `POST /api/subscription/upgrade` - Upgrade to pro
- `POST /api/subscription/downgrade` - Downgrade to free
- `PATCH /api/admin/users/:userId/pro` - Admin toggle pro status

### Frontend Checks
```javascript
// Check if user is pro
const status = await getSubscriptionStatus();
if (status.isPro) {
  // Show pro features
}

// Show upgrade prompt
showProUpgradePrompt('Music Upload');
```

---

## 📝 Notes

- Pro status is checked on every feature access
- Locked features show upgrade prompts to free users
- Pro models are hidden from free users in settings
- All pro features are fully implemented and functional
