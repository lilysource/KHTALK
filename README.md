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

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Install dependencies with `npm install`.
3. Generate the Prisma client with `npm run db:generate`.
4. Apply the development schema with `npm run db:push`.
5. Start the API with `npm run dev:api`.

The web shell currently includes development fallback data while the authenticated API client is being connected. Production authentication should use Supabase Auth and pass verified server-side claims into the API; no secret keys belong in the web bundle.
