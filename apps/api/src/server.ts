import 'dotenv/config'
import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })
const sockets = new Map<string, Set<{ send: (payload: string) => void }>>()
const qrSessions = new Map<string, { createdAt: number; accessToken?: string; refreshToken?: string }>()
const qrSessionLifetimeMs = 2 * 60 * 1000
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY

const messageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().cuid().optional()
})

const createServerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  iconUrl: z.string().startsWith('data:image/').max(200000),
  backgroundUrl: z.string().startsWith('data:image/').max(500000).optional()
})

const updateServerSchema = createServerSchema.pick({ name: true, iconUrl: true, backgroundUrl: true })
const qrTokenSchema = z.object({ token: z.string().min(32).max(128) })

type SupabaseUser = {
  id: string
  email?: string
  user_metadata?: { display_name?: string; username?: string }
}

async function getSupabaseUser(accessToken: string): Promise<SupabaseUser | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`
    }
  })
  if (!response.ok) return null
  return response.json() as Promise<SupabaseUser>
}

function getAccessToken(request: FastifyRequest) {
  const authorization = request.headers.authorization
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7)

  const cookies = request.headers.cookie?.split(';').map((part) => part.trim()) ?? []
  return cookies.find((cookie) => cookie.startsWith('khtalk_access_token='))?.slice('khtalk_access_token='.length)
}

async function establishApiSession(request: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ accessToken: z.string().min(1) }).safeParse(request.body)
  if (!body.success) return reply.code(400).send({ error: 'Access token is required' })

  const supabaseUser = await getSupabaseUser(body.data.accessToken)
  if (!supabaseUser?.email) return reply.code(401).send({ error: 'Invalid Supabase session' })

  reply.header(
    'Set-Cookie',
    `khtalk_access_token=${encodeURIComponent(body.data.accessToken)}; HttpOnly; Path=/; SameSite=${process.env.NODE_ENV === 'production' ? 'None; Secure' : 'Lax'}`
  )
  return reply.send({ userId: supabaseUser.id })
}

function createQrSession() {
  const token = randomBytes(32).toString('base64url')
  qrSessions.set(token, { createdAt: Date.now() })
  return token
}

function getQrSession(token: string) {
  const session = qrSessions.get(token)
  if (!session) return null
  if (Date.now() - session.createdAt > qrSessionLifetimeMs) {
    qrSessions.delete(token)
    return null
  }
  return session
}

async function getSessionTokens(request: FastifyRequest, reply: FastifyReply) {
  const body = z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }).and(qrTokenSchema).safeParse(request.body)
  if (!body.success) return reply.code(400).send({ error: 'QR token and session tokens are required' })

  const qrSession = getQrSession(body.data.token)
  if (!qrSession) return reply.code(410).send({ error: 'QR code expired' })

  const supabaseUser = await getSupabaseUser(body.data.accessToken)
  if (!supabaseUser?.email) return reply.code(401).send({ error: 'Invalid Supabase session' })

  qrSession.accessToken = body.data.accessToken
  qrSession.refreshToken = body.data.refreshToken
  return reply.send({ status: 'approved' })
}

async function readQrSession(request: FastifyRequest, reply: FastifyReply) {
  const body = qrTokenSchema.safeParse(request.body)
  if (!body.success) return reply.code(400).send({ error: 'QR token is required' })

  const qrSession = getQrSession(body.data.token)
  if (!qrSession) return reply.send({ status: 'expired' })
  if (!qrSession.accessToken || !qrSession.refreshToken) return reply.send({ status: 'pending' })

  qrSessions.delete(body.data.token)
  return reply.send({ status: 'approved', accessToken: qrSession.accessToken, refreshToken: qrSession.refreshToken })
}

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return reply.code(401).send({ error: 'Authentication required' })
  }

  const supabaseUser = await getSupabaseUser(accessToken)
  if (!supabaseUser?.email) return reply.code(401).send({ error: 'Invalid authentication session' })

  const metadata = supabaseUser.user_metadata ?? {}
  const displayName = metadata.display_name || supabaseUser.email.split('@')[0]
  const username = (metadata.username || displayName).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || `user_${supabaseUser.id.slice(0, 8)}`
  const subject = supabaseUser.id
  let user = await prisma.user.findUnique({ where: { authSubject: subject } })
  if (!user) {
    user = await prisma.user.create({ data: { authSubject: subject, email: supabaseUser.email, displayName, username } })
  }
  request.user = user
}

declare module 'fastify' {
  interface FastifyRequest { user?: { id: string; authSubject: string } }
}

const configuredWebOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173'
await app.register(cors, {
  origin: [configuredWebOrigin, 'https://khtalk-web-git-main-lilysources-projects.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
})
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
await app.register(websocket)

app.get('/', async () => ({ name: 'KHTALK API', status: 'ok', message: 'API is running' }))
app.get('/health', async () => ({ name: 'KHTALK API', status: 'ok', timestamp: new Date().toISOString() }))
app.post('/api/auth/qr/create', async (_request, reply) => reply.send({ token: createQrSession(), expiresIn: qrSessionLifetimeMs }))
app.post('/api/auth/qr/approve', getSessionTokens)
app.post('/api/auth/qr/status', readQrSession)
app.post('/api/auth/session', establishApiSession)
app.post('/api/auth/signout', async (_request, reply) => {
  reply.header('Set-Cookie', 'khtalk_access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return reply.code(204).send()
})

app.post('/api/servers', { preHandler: authenticate }, async (request, reply) => {
  const body = createServerSchema.safeParse(request.body)
  if (!body.success) return reply.code(400).send({ error: 'Invalid community details' })

  const server = await prisma.$transaction(async (transaction) => {
    const created = await transaction.server.create({
      data: {
        name: body.data.name,
        slug: body.data.slug,
        iconUrl: body.data.iconUrl,
        backgroundUrl: body.data.backgroundUrl,
        ownerId: request.user!.id,
        members: { create: { userId: request.user!.id } },
        channels: {
          create: [
            { name: 'general', topic: 'Welcome to your new community', type: 'TEXT' },
            { name: 'General', topic: 'Community voice chat', type: 'VOICE', position: 1 }
          ]
        }
      },
      include: { channels: { orderBy: { position: 'asc' } } }
    })
    return created
  })

  return reply.code(201).send(server)
})

app.patch('/api/servers/:serverId', { preHandler: authenticate }, async (request, reply) => {
  const params = z.object({ serverId: z.string().cuid() }).safeParse(request.params)
  const body = updateServerSchema.safeParse(request.body)
  if (!params.success || !body.success) return reply.code(400).send({ error: 'Invalid community details' })
  const server = await prisma.server.findUnique({ where: { id: params.data.serverId }, select: { ownerId: true } })
  if (!server) return reply.code(404).send({ error: 'Community not found' })
  if (server.ownerId !== request.user!.id) return reply.code(403).send({ error: 'Only the community owner can edit it' })
  const updated = await prisma.server.update({ where: { id: params.data.serverId }, data: body.data })
  return reply.send(updated)
})

app.get('/api/channels/:channelId/messages', { preHandler: authenticate }, async (request, reply) => {
  const params = z.object({ channelId: z.string().cuid() }).safeParse(request.params)
  if (!params.success) return reply.code(400).send({ error: 'Invalid channel id' })
  const channel = await prisma.channel.findUnique({ where: { id: params.data.channelId }, select: { serverId: true } })
  if (!channel) return reply.code(404).send({ error: 'Channel not found' })
  const membership = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: channel.serverId, userId: request.user!.id } } })
  if (!membership) return reply.code(403).send({ error: 'You are not a member of this server' })
  return prisma.message.findMany({ where: { channelId: params.data.channelId, deleted: false }, include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, attachments: true, reactions: true }, orderBy: { createdAt: 'asc' }, take: 100 })
})

app.delete('/api/channels/:channelId', { preHandler: authenticate }, async (request, reply) => {
  const params = z.object({ channelId: z.string().cuid() }).safeParse(request.params)
  if (!params.success) return reply.code(400).send({ error: 'Invalid channel id' })
  const channel = await prisma.channel.findUnique({ where: { id: params.data.channelId }, select: { serverId: true } })
  if (!channel) return reply.code(404).send({ error: 'Channel not found' })
  const server = await prisma.server.findUnique({ where: { id: channel.serverId }, select: { ownerId: true } })
  if (!server || server.ownerId !== request.user!.id) return reply.code(403).send({ error: 'Only the server owner can delete channels' })
  await prisma.channel.delete({ where: { id: params.data.channelId } })
  return reply.code(204).send()
})

app.post('/api/channels/:channelId/messages', { preHandler: authenticate }, async (request, reply) => {
  const params = z.object({ channelId: z.string().cuid() }).safeParse(request.params)
  const body = messageSchema.safeParse(request.body)
  if (!params.success || !body.success) return reply.code(400).send({ error: 'Invalid message payload' })
  const channel = await prisma.channel.findUnique({ where: { id: params.data.channelId }, select: { serverId: true } })
  if (!channel) return reply.code(404).send({ error: 'Channel not found' })
  const membership = await prisma.serverMember.findUnique({ where: { serverId_userId: { serverId: channel.serverId, userId: request.user!.id } } })
  if (!membership) return reply.code(403).send({ error: 'You are not a member of this server' })
  const message = await prisma.message.create({ data: { channelId: params.data.channelId, authorId: request.user!.id, content: body.data.content, replyToId: body.data.replyToId }, include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } }, attachments: true, reactions: true } })
  const listeners = sockets.get(params.data.channelId) ?? new Set()
  const payload = JSON.stringify({ type: 'message:create', data: message })
  listeners.forEach((socket) => socket.send(payload))
  return reply.code(201).send(message)
})

app.get('/ws', { websocket: true }, (socket, request) => {
  const query = z.object({ channelId: z.string().cuid() }).safeParse(request.query)
  if (!query.success) return socket.close(1008, 'Invalid channel')
  const channelId = query.data.channelId
  const listeners = sockets.get(channelId) ?? new Set()
  const client = { send: (payload: string) => socket.send(payload) }
  listeners.add(client)
  sockets.set(channelId, listeners)
  socket.on('close', () => { listeners.delete(client); if (!listeners.size) sockets.delete(channelId) })
  socket.send(JSON.stringify({ type: 'connected', channelId }))
})

const port = Number(process.env.PORT ?? 4000)
app.listen({ port, host: '0.0.0.0' }).then(() => app.log.info(`KHTALK API listening on ${port}`)).catch(async (error) => { app.log.error(error); await prisma.$disconnect(); process.exit(1) })
