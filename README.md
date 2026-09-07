# DevFolio — AI-Powered GitHub Portfolio Generator

Users sign in with GitHub, the app pulls their public repos via Octokit, and
**Google Gemini** generates a polished summary, tech tags, and a highlight line
per repo. Publish → live shareable page at `/[username]`.

## Quick start (works without any keys — demo mode)

```bash
npm install
npx prisma migrate dev   # SQLite, zero-config
npm run dev              # http://localhost:3000
```

Open `/demo` → enter any GitHub username (e.g. `torvalds`) → fetch repos live →
“✨ Summarize all with Gemini”.

## Full mode (login + persistence + publish)

1. Create a GitHub OAuth App: https://github.com/settings/developers
   - Callback URL: `http://localhost:3000/api/auth/callback/github`
2. Get a Gemini key: https://aistudio.google.com/app/apikey (starts with `AIza…`)
3. Copy `.env.example` → `.env` and fill in:
   - `GITHUB_ID`, `GITHUB_SECRET`
   - `GEMINI_API_KEY`
   - `NEXTAUTH_SECRET` (any long random string)
4. `npx prisma migrate dev && npm run dev` → open `/dashboard`

> Note: the key `AQ.Ab8RN6…` supplied in the brief is **not** a valid Gemini key
> (Gemini keys start with `AIza`). The app detects this and falls back to a
> heuristic summary so the UI never breaks — replace it with a real key for true
> AI output. The code tries `gemini-2.0-flash → 1.5-flash → 2.5-flash` automatically.

## Routes

| Route | What |
|---|---|
| `/` | Landing page |
| `/dashboard` | Login → sync repos → generate/edit/pin/hide → publish |
| `/demo` + `/demo/[username]` | No-login live demo (public GitHub API + Gemini) |
| `/[username]` | Public portfolio (DB if published, else live GitHub fallback) |
| `GET /api/repos` | Octokit fetch + Prisma upsert (auth) · `?username=` demo mode |
| `POST /api/generate` | `{ repoId }` or `{ all: true }`, cached unless `force` / repo changed |
| `POST /api/generate-public` | No-auth demo generation `{ owner, name, … }` |
| `PATCH /api/repo` | Edit summary/tags/highlight, pin/hide |
| `POST /api/portfolio/publish` | `{ publish: true/false }` |

## Deploy (Vercel + Neon/Supabase Postgres)

1. Change `prisma/schema.prisma` datasource provider to `postgresql`
2. Set `DATABASE_URL` to your Postgres URL + run `npx prisma migrate deploy`
3. Set `NEXTAUTH_URL` to your Vercel URL, add GitHub callback URL there too
4. Add `GEMINI_API_KEY`

## Stack

Next.js 14 · TypeScript · Tailwind v4 · NextAuth (GitHub) · Prisma ·
Octokit · Gemini (`@google/generative-ai`) · SQLite (dev) / Postgres (prod)
