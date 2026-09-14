# KHTALK

KHTALK is a Discord-inspired communication platform with an original visual language: deep navy surfaces, luminous blue actions, and compact community tooling.

## Current slice

- React + TypeScript + Vite web app with responsive desktop, tablet, and mobile layouts
- Fastify + TypeScript API boundary
- Prisma PostgreSQL schema for accounts, communities, channels, messages, files, DMs, notifications, premium, moderation, and audit logs
- Zod request validation, CORS, rate limiting, membership checks, and WebSocket channel broadcasts
- Supabase-ready environment variables and a storage bucket boundary for future uploads

## Run the web app

```bash
npm install
npm run dev:web
```

## Run the API

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Apply the development schema with `npm run db:push`.
5. Start the API with `npm run dev:api`.

The web app uses Supabase Auth for login and account creation. After authentication, it exchanges the Supabase access token with `POST /api/auth/session`; the API validates the token and sets an HTTP-only `khtalk_access_token` cookie. Protected API requests must use `credentials: 'include'`. The browser only needs the public `VITE_SUPABASE_ANON_KEY`; never expose a service-role key in the web bundle.

QR login uses short-lived one-time sessions. The API deployment must have `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `WEB_ORIGIN` set, and both the web app and API must be redeployed after QR changes.
