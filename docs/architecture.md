# KHTALK architecture

The web client talks to the Fastify API over REST for normal operations and WebSockets for channel events. PostgreSQL is accessed only through Prisma. Supabase Auth owns password, verification, reset, and session flows; the API maps the verified auth subject to a local User row.

Uploaded bytes belong behind a storage adapter, with Supabase Storage as the development implementation and an R2 implementation as a later deployment option. Attachment rows retain provider-neutral metadata: safe storage path, URL, MIME type, size, and original filename.

The API keeps authorization at the route boundary. Membership is checked before reading or writing channel messages. WebSocket connections must be upgraded to the same verified session middleware before production use; the initial channel broadcaster is intentionally small and can move to Redis-backed fanout without changing message events.
