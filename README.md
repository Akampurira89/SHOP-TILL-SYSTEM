# Shop Till System

A point-of-sale app for sales, inventory, suppliers, expenses, staff, and stock adjustments — backed by a real shared Supabase database, so every device and staff member sees the same live data.

## What's already done
- Database created on Supabase (tables, security rules, default admin login)
- App code (`src/App.jsx`) reads and writes that database via `src/supabaseData.js`

## What's left: getting this onto a real website

See the step-by-step guide document for full details. In short:

1. Create a GitHub repository and upload every file in this folder (keep the `src` folder structure)
2. Create a Vercel account, import that GitHub repository
3. **Important:** in Vercel's project settings, add two Environment Variables before deploying:
   - `VITE_SUPABASE_URL` = `https://gvspxkabjnokvcaefxkg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_PCe_Pt-434xc1rcFfvnXDg_WmZOY7KR`
   (The `.env` file with these same values is on your computer for local testing only — it is intentionally NOT uploaded to GitHub, since `.env` is listed in `.gitignore`. Vercel needs its own copy of these values, entered directly in its dashboard.)
4. Deploy — Vercel gives you a permanent URL like `shop-pos-yourname.vercel.app`

That URL is your real, permanent website. Any staff member can open it from any phone or computer browser, anytime — no Claude needed.

## After deploying
- Log in with `admin` / `admin123`
- Immediately go to Settings and change the admin password
- Add your real staff accounts, products, and suppliers

## If something breaks
- Blank page after deploy → check the Vercel build logs for a red error, send it to Claude
- "Failed to fetch" or login doesn't work → double-check the two environment variable values in Vercel match exactly, with no extra spaces
