# Dissertation Verifier — Phase 0
Scaffold only. No secrets, no dependencies installed.
## What's here
- `frontend/index.html` — Cloudflare Pages hello-world with placeholder idea input form
- `worker/src/index.js` + `worker/wrangler.toml` — Cloudflare Worker stub
- `supabase/schema.sql` — initial Postgres schema
## Phase 0 verification steps
1. Repo link loads and shows these files.
2. Supabase free-tier project: run `supabase/schema.sql`, confirm `ideas` and `searches` tables exist.
3. Cloudflare: deploy `frontend/` to Pages and `worker/` via wrangler (free tier); Pages URL renders "Dissertation Verifier", Worker root returns {"status":"ok","phase":0}.
