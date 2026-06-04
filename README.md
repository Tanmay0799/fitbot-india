# 💪 FitBot India — Complete Setup & Deployment Guide

A WhatsApp-style fitness & diet mobile web app with Indian language support, Supabase database, voice input, meal suggestions, and smart alarms.

---

## 🗂️ Project Structure

```
fitbot/
├── index.html                  # App entry point (PWA shell)
├── vite.config.js              # Build config
├── vercel.json                 # Vercel deployment config
├── package.json
├── .env.example                # ← copy to .env and fill in keys
├── public/
│   ├── manifest.json           # PWA manifest (Add to Home Screen)
│   ├── sw.js                   # Service worker (offline support)
│   └── icons/                  # App icons
├── src/
│   ├── main.js                 # Full app logic
│   ├── style.css               # All styles
│   └── lib/
│       ├── supabase.js         # Database helpers
│       └── api.js              # Anthropic API helper
└── supabase/
    └── migrations/
        └── 001_schema.sql      # ← Run this in Supabase SQL editor
```

---

## ⚙️ Step 1 — Set up Supabase (database)

1. Go to **[supabase.com](https://supabase.com)** → Create a free account
2. Click **"New Project"** → Name it `fitbot-india` → Choose a region near India (Mumbai/Singapore) → Set a password → Create
3. Wait ~2 minutes for the project to start
4. Go to **SQL Editor** (left sidebar) → **New query**
5. Paste the entire contents of `supabase/migrations/001_schema.sql` → Click **Run**
6. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

## 🔑 Step 2 — Get your Anthropic API key

1. Go to **[console.anthropic.com](https://console.anthropic.com)**
2. Sign in → **API Keys** → **Create Key**
3. Copy the key (starts with `sk-ant-...`)

> ⚠️ **Security note:** For a production app with many users, move the Anthropic key to a backend serverless function (Vercel API route) so it's never exposed in the browser. For personal use, the `.env` approach is fine.

---

## 🛠️ Step 3 — Configure environment

```bash
# In the fitbot/ folder:
cp .env.example .env
```

Open `.env` and fill in:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-anon-key...
VITE_ANTHROPIC_KEY=sk-ant-...your-key...
```

---

## 🚀 Step 4 — Deploy to Vercel (free hosting)

### Option A — Vercel CLI (recommended, 3 commands)
```bash
npm install              # install dependencies
npm install -g vercel    # install Vercel CLI
vercel                   # deploy! Follow the prompts
```

When prompted:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account
- **Link to existing project?** → No
- **Project name?** → fitbot-india
- **Directory?** → ./ (current)
- **Override settings?** → No

Then add environment variables:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_ANTHROPIC_KEY
vercel --prod   # deploy to production
```

### Option B — Vercel Dashboard (no CLI)
1. Push this folder to a **GitHub repo**
2. Go to **[vercel.com](https://vercel.com)** → New Project → Import your GitHub repo
3. In **Environment Variables**, add the 3 keys from your `.env`
4. Click **Deploy** → Done!

Your app will be live at: `https://fitbot-india.vercel.app` (or similar)

---

## 📱 Step 5 — Install on iPhone as an app

1. Open your Vercel URL in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow) at the bottom
3. Scroll down → tap **"Add to Home Screen"**
4. Name it **"FitBot"** → tap **Add**

It will appear on your home screen like a native app — full screen, no Safari bar!

---

## ✅ Enable iPhone notifications (optional)

In iOS 16.4+, PWAs support push notifications:
1. Open the app from your home screen
2. Tap the **🔔 bell** button in the header
3. Tap **Allow** when prompted

---

## 🔐 Supabase Auth Setup

By default, Supabase sends a confirmation email on signup. To skip this for testing:
1. Supabase Dashboard → **Authentication → Settings**
2. Disable **"Enable email confirmations"**

To enable Google/Apple sign-in later:
1. Authentication → **Providers** → Enable Google/Apple
2. Follow the OAuth setup instructions

---

## 🔄 Local development

```bash
npm install
npm run dev      # starts at http://localhost:3000
```

---

## 🌟 Features

| Feature | Description |
|---------|-------------|
| 💬 Chat | WhatsApp-style AI chat, auto-tracks food/workout/water |
| 🥗 Meals | 16 curated Indian meal cards with calorie info |
| ⏰ Alarms | Smart reminders saved to database, with voice set |
| 📊 Log | Daily food/workout/water history from Supabase |
| 🎙️ Voice | Speech-to-text in 9 Indian languages |
| 🌐 Languages | English + 8 Indian languages |
| 👤 Profile | Custom calorie/protein/water/burn goals |
| 📱 PWA | Install on iPhone as home screen app |
| 🔒 Auth | Email sign-up/sign-in via Supabase |
| ☁️ Sync | All data synced to Supabase cloud |

---

## 🧩 Tech Stack

- **Frontend:** Vanilla JS + Vite (no heavy framework)
- **Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **AI:** Anthropic Claude Sonnet
- **Voice:** Web Speech API (Chrome/Safari)
- **Hosting:** Vercel (free tier)
- **Icons:** Tabler Icons

---

## 📞 Support

Having issues? Common fixes:
- **"Missing env vars"** → Make sure `.env` file exists with all 3 keys filled
- **"Auth error"** → Check Supabase URL and anon key are correct
- **"Voice not working"** → Use Chrome on Android or Safari on iOS
- **"Notifications not working"** → Must install as PWA first (Step 5)
