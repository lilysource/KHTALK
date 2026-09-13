import 'dotenv/config'
import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })
const sockets = new Map<string, Set<{ send: (payload: string) => void }>>()

const messageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  replyToId: z.string().cuid().optional()
})

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const subject = request.headers['x-auth-subject']
  if (typeof subject !== 'string' || subject.length < 1) {
    return reply.code(401).send({ error: 'Authentication required' })
  }
  const user = await prisma.user.findUnique({ where: { authSubject: subject } })
  if (!user) return reply.code(401).send({ error: 'User account not found' })
  request.user = user
}

declare module 'fastify' {
  interface FastifyRequest { user?: { id: string; authSubject: string } }
}

await app.register(cors, { origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', credentials: true })
await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
await app.register(websocket)

app.get('/health', async () => ({ name: 'KHTALK API', status: 'ok', timestamp: new Date().toISOString() }))

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
