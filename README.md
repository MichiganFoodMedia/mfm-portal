# Michigan Food Media Creator Portal
## Setup & Deployment Guide

---

## STEP 1 — Run the Database Schema in Supabase

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `SUPABASE_SCHEMA.sql` from this folder
5. Copy the entire contents and paste into the SQL editor
6. Click **Run**

This creates all your tables, security rules, and 3 test invite codes.

---

## STEP 2 — Create Your Admin Account

1. Go to your live site (after deploying) or Supabase Auth
2. Sign up with your admin email through the creator signup flow (just use code MFMC-2025)
3. Then go to Supabase → **SQL Editor** and run this:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@here.com';
```

Replace with your actual email. This makes you the admin.

---

## STEP 3 — Deploy to Vercel

1. Go to **github.com** and create a free account if you don't have one
2. Create a **new repository** called `mfm-portal`
3. Upload all files from this folder to that repo
4. Go to **vercel.com** and sign in
5. Click **Add New Project**
6. Import your GitHub repo
7. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://auidnnqoahuodyedrrtl.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your new anon key (reset it in Supabase first!)
8. Click **Deploy**

Vercel will build and deploy your site. You'll get a live URL like `mfm-portal.vercel.app`.

---

## STEP 4 — Configure Supabase Auth

1. In Supabase, go to **Authentication → URL Configuration**
2. Set **Site URL** to your Vercel URL (e.g. `https://mfm-portal.vercel.app`)
3. Add your Vercel URL to **Redirect URLs**

---

## Test Invite Codes (already in database)
- `MFMC-2025`
- `MFMC-FOOD1`  
- `MFMC-ALPHA`

Generate new ones from the Admin → Invite Codes page.

---

## File Structure
```
mfm-portal/
├── pages/
│   ├── index.js          (login page)
│   ├── signup.js         (signup with code gate)
│   ├── agreement.js      (influencer agreement)
│   ├── dashboard.js      (creator dashboard)
│   ├── my-collabs.js     (creator's collabs)
│   ├── open-collabs.js   (browse open slots)
│   ├── messages.js       (creator ↔ agency messaging)
│   ├── profile.js        (creator profile)
│   ├── earnings.js       (payment history)
│   └── admin/
│       ├── login.js      (admin login)
│       ├── dashboard.js  (admin overview)
│       ├── collabs.js    (manage collaborations)
│       ├── creators.js   (manage creators)
│       ├── restaurants.js(manage restaurants)
│       ├── messages.js   (message creators)
│       └── codes.js      (generate invite codes)
├── components/
│   ├── Layout.js         (creator sidebar layout)
│   └── AdminLayout.js    (admin sidebar layout)
├── lib/
│   └── supabase.js       (database client)
├── styles/
│   └── globals.css       (all styles)
├── .env.local            (your API keys - DO NOT share)
├── next.config.js
├── package.json
└── SUPABASE_SCHEMA.sql   (run this first in Supabase)
```
