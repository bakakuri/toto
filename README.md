# PredictX v3.0 — ფეხბურთის AI პროგნოზები

React/Vite + Supabase football prediction platform for Georgian speakers.

## Quick Start

```bash
# 1. Clone
git clone https://github.com/bakakuri/predictx.git && cd predictx

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Run Supabase schema
# Paste supabase/schema.sql in Supabase SQL Editor

# 5. Deploy
vercel --prod
```

## Tech Stack
- **Frontend**: React 18 + Vite + React Router
- **Backend**: Supabase (Auth, DB, Edge Functions, Realtime)
- **Data**: API-Football (free tier: 100 req/day)
- **Model**: Elo + Poisson + Form + H2H Ensemble v2.0

## Structure
```
src/
├── main.jsx              # Entry + theme init + SW
├── App.jsx               # Routes + all pages
├── App.css               # Brand design system
├── lib/
│   ├── supabase.js       # Client + data fetchers
│   ├── predictions.js    # Ensemble prediction engine
│   ├── i18n.js           # Full Georgian localization
│   └── data.js           # Mock data fallback
├── components/
│   └── MatchCard.jsx     # Reusable match card
└── hooks/
    └── useAuth.js        # Auth context + favorites
```

## Features
✅ Full Georgian localization
✅ Dark/Light theme (auto + manual)
✅ SEO (OG tags, dynamic titles, clean URLs)
✅ PWA (installable, offline cache)
✅ React Router (clean URLs: /match/1, /league/39, /team/ars)
✅ Ensemble v2.0 (Elo + Poisson + Form + H2H)
✅ Value Bets with edge detection
✅ Model Lab (backtesting, calibration)
✅ Supabase Auth ready
✅ Brand identity (custom design system)
