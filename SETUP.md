# Capture Management Tool — Setup Guide

## What You're Deploying
- React app on Vercel (free)
- Database + Auth on Supabase (free)
- AI powered by Anthropic API (~$0.01 per conversation)

---

## Step 1 — Supabase (Database + Auth) ~5 minutes

1. Go to https://supabase.com and create a free account
2. Click "New Project" → name it "capture-management" → set a DB password → Create
3. Wait ~2 minutes for it to provision
4. Go to **SQL Editor** (left sidebar) → click "New Query"
5. Copy the entire contents of `schema.sql` and paste it → click **Run**
6. Go to **Project Settings** → **API**
7. Copy your:
   - `Project URL` → this is REACT_APP_SUPABASE_URL
   - `anon public` key → this is REACT_APP_SUPABASE_ANON_KEY

### Make yourself admin (after first login):
Go to SQL Editor and run:
```sql
UPDATE public.profiles SET role = 'admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

---

## Step 2 — Anthropic API Key ~2 minutes

1. Go to https://console.anthropic.com
2. Sign in → click **API Keys** → **Create Key**
3. Copy the key → this is REACT_APP_ANTHROPIC_KEY

> Cost: Claude Sonnet is ~$3/million tokens. A typical BD conversation uses ~2,000 tokens = $0.006. Very cheap.

---

## Step 3 — Deploy to Vercel ~5 minutes

### Option A: GitHub (Recommended)
1. Push this folder to a GitHub repo (public or private)
2. Go to https://vercel.com → sign up with GitHub → "Add New Project"
3. Import your repo → Vercel auto-detects React
4. Under **Environment Variables**, add all three:
   - `REACT_APP_SUPABASE_URL` = your Supabase project URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your Supabase anon key
   - `REACT_APP_ANTHROPIC_KEY` = your Anthropic API key
5. Click **Deploy** → done in ~2 minutes

### Option B: Vercel CLI
```bash
npm install -g vercel
cd capture-app
vercel
# Follow prompts, then add env vars in Vercel dashboard
```

---

## Step 4 — Add Your Team

1. Share the Vercel URL with your team
2. Each person clicks **Create Account** and signs up with their work email
3. You (admin) can verify them in Supabase → Authentication → Users
4. Everyone sees the same shared pipeline
5. Each person has their own private actions, notes, and Claude chat history

---

## Step 5 — Load Your Opportunities

1. Sign in as admin
2. Click **+ Add Opportunity** in the Pipeline view
3. Fill in the contract details
4. Open any opportunity → click **✦ Ask Claude** → start your BD work

---

## Local Development

```bash
cd capture-app
cp .env.example .env.local
# Fill in your three keys in .env.local
npm install
npm start
# Opens at http://localhost:3000
```

---

## Supabase Auth Settings (Important)

In Supabase → **Authentication** → **Settings**:
- Set **Site URL** to your Vercel URL (e.g. https://capture-yourname.vercel.app)
- Add to **Redirect URLs**: https://capture-yourname.vercel.app

This ensures email confirmation links work correctly.

---

## Security Notes

- All opportunity data is shared (team sees the same pipeline)
- Actions, notes, and Claude chat history are private per user
- Only admins can add/edit/delete opportunities (set via SQL)
- Your Anthropic key is in the browser — for a small trusted team this is fine. For larger deployments, route API calls through a Vercel serverless function.

---

## Files Overview

```
capture-app/
├── public/index.html          # HTML shell
├── src/
│   ├── App.js                 # Root with auth state
│   ├── App.css                # All styles
│   ├── index.js               # Entry point
│   ├── lib/
│   │   ├── supabase.js        # DB + auth helpers
│   │   └── claude.js          # AI chat + quick prompts
│   ├── pages/
│   │   ├── Login.js           # Sign in / sign up
│   │   └── Dashboard.js       # Main app shell
│   └── components/
│       ├── OppCard.js         # Opportunity card with tabs
│       ├── ClaudeChat.js      # AI chat panel
│       ├── OppModal.js        # Add/edit form
│       ├── MorningBrief.js    # Daily briefing view
│       └── ContactsView.js    # All contacts table
├── schema.sql                 # Run this in Supabase SQL Editor
├── vercel.json                # Vercel deploy config
├── .env.example               # Copy to .env.local for local dev
└── package.json
```
