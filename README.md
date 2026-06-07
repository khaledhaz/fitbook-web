# FitBook Web

A website version of the FitBook fitness-coaching app (trainer + trainee). **Live:** https://khaledhaz.github.io/fitbook-web/

## What this is
A standalone React + TypeScript + Vite SPA that mirrors the FitBook mobile app as a website. It talks **directly to the same Supabase backend** the mobile app uses (auth + PostgREST on the `app` schema + RPCs + storage + realtime), governed by the existing RLS policies. Users sign in with their real FitBook accounts and see their real data.

## ⛔ Important: the FitBook project is untouched
This project makes **zero changes** to `/Users/khaled/LocalProjects/FitBook` — no DB, backend, or schema changes. It is a pure client of the existing Supabase project. The Railway Express backend is **not** used (its CORS blocks browsers on a public domain); all data access is Supabase-direct with the public anon key, which is RLS-protected and safe to ship in client JS.

## Stack
React 18, TypeScript (strict), Vite, Tailwind, React Router (HashRouter), TanStack Query, `@supabase/supabase-js`, recharts, lucide-react.

## Develop
```
npm install
npm run dev      # http://localhost:8870  (see .claude/launch.json)
npm run build    # tsc -b && vite build  → dist/
```

## Deploy (GitHub Pages)
```
npm run build
npx gh-pages -d dist -b gh-pages
```
Pages serves the `gh-pages` branch at `/fitbook-web/`. Vite `base: './'` + HashRouter make it work at a subpath with no server rewrites. To use a custom (Cloudflare) domain, point a CNAME at `khaledhaz.github.io` and add a `CNAME` file to the published branch.

## QA
Automated harnesses under `qa/` (Playwright + Vitest). `qa/live-smoke.cjs` runs against the live URL. Trainee flows are fully exercised with a test account; trainer flows are smoke-tested (a live trainer login requires email confirmation).
