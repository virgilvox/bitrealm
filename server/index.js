import Fastify from 'fastify'
import { Server } from '@colyseus/core'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { monitor } from '@colyseus/monitor'
import { playground } from '@colyseus/playground'
import cors from '@fastify/cors'
import staticFiles from '@fastify/static'
import helmet from 'helmet'
import multipart from '@fastify/multipart'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { assetPackRoutes } from './api/assetPacks.js'
import { spriteAnimationRoutes } from './api/spriteAnimation.js'
import { projectRoutes } from './api/projects.js'

// Import API routes  
import { apiRoutes } from './api/index.js'
import { authRoutes, registerAuthMiddleware } from './api/auth.js'
import { assetRoutes } from './api/assets.js'

// Import room handlers
import { GameRoom } from './rooms/GameRoom.js'
import { EditorRoom } from './rooms/EditorRoom.js'

// Import database
import { initDatabase, query } from './database/index.js'
import { initializeBuckets } from './utils/minio.js'

// Import custom plugins
import colyseusPlugin from './plugins/colyseus.js'

// Import rate limiting
import rateLimit from '@fastify/rate-limit'

// Load environment variables from .env (only during local development)
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PORT = process.env.PORT || 4000
const HOST = process.env.HOST || 'localhost'

async function bootstrap() {
  // Initialize database
  await initDatabase()

  // Initialize MinIO buckets (non-fatal)
  try {
    await initializeBuckets()
  } catch (err) {
    console.warn('⚠️  MinIO unavailable or misconfigured – continuing with limited functionality:', err.message)
  }

  // Create Fastify instance
  const fastify = Fastify({
    logger: true,
    trustProxy: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })

  // Register authentication middleware
  registerAuthMiddleware(fastify)

  // Security middleware (skip strict CSP in development for Vite HMR)
  if (process.env.NODE_ENV === 'production') {
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    })
  }

  // CORS
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://bitrealm.gg', /\.bitrealm\.gg$/]
      : ['http://localhost:3000', 'http://localhost:3001', 'http://0.0.0.0:3001'],
    credentials: true
  })

  // Static files
  await fastify.register(staticFiles, {
    root: join(__dirname, '../public'),
    prefix: '/public/'
  })

  // Serve the main client
  await fastify.register(staticFiles, {
    root: join(__dirname, '../client'),
    prefix: '/',
    decorateReply: false
  })

  // Serve the editor app
  await fastify.register(staticFiles, {
    root: join(__dirname, '../client/editor'),
    prefix: '/editor/',
    decorateReply: false 
  })

  // Handle SPA routing for the main app
  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api')) {
      return reply.code(404).send({ error: 'Not Found' })
    }
    if (request.raw.url && request.raw.url.startsWith('/editor')) {
      return reply.sendFile('index.html', join(__dirname, '../client/editor'))
    }
    reply.sendFile('index.html', join(__dirname, '../client'))
  })

  // Serve uploaded files
  await fastify.register(staticFiles, {
    root: join(__dirname, '../uploads'),
    prefix: '/uploads/',
    decorateReply: false
  })

  // Rate Limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  })

  // Multipart support for file uploads
  await fastify.register(multipart)

  // API routes
  await fastify.register(authRoutes, { prefix: '/api/auth' })
  await fastify.register(assetRoutes, { prefix: '/api/assets' })
  await fastify.register(assetPackRoutes, { prefix: '/api/assets' })
  await fastify.register(spriteAnimationRoutes, { prefix: '/api/sprites' })
  await fastify.register(projectRoutes, { prefix: '/api/projects' })
  await fastify.register(apiRoutes, { prefix: '/api' })

  // Create Colyseus server
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: fastify.server
    })
  })

  // Define room handlers
  gameServer.define('game_room', GameRoom)
  gameServer.define('editor_room', EditorRoom)

  // Colyseus monitor (development only)
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(colyseusPlugin, { gameServer })
  }

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  })

  // Hub endpoint - list available worlds
  fastify.get('/hub', async (request, reply) => {
    const rooms = await gameServer.presence.find({})
    const publicWorlds = rooms
      .filter(room => room.metadata?.isPublic)
      .map(room => ({
        id: room.roomId,
        name: room.metadata?.name || 'Untitled World',
        description: room.metadata?.description || '',
        author: room.metadata?.author || 'Anonymous',
        players: room.clients,
        maxPlayers: room.maxClients,
        thumbnail: room.metadata?.thumbnail || null,
        tags: room.metadata?.tags || [],
        slug: room.metadata?.slug || room.roomId
      }))

    return { worlds: publicWorlds }
  })

  // Join world endpoint
  fastify.get('/play/:slug', async (request, reply) => {
    const { slug } = request.params
    const rooms = await gameServer.presence.find({ 'metadata.slug': slug })
    
    if (rooms.length === 0) {
      return reply.code(404).send({ error: 'World not found' })
    }

    const room = rooms[0]
    const roomUrl = `${request.protocol}://${request.hostname}/join/${room.roomId}`
    
    return reply.redirect(roomUrl)
  })

  // Start server
  try {
    // Test database connection
    await query('SELECT NOW()')
    console.log('✅ Database connected')

    await fastify.listen({ 
      port: PORT, 
      host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : HOST 
    })
    console.log(`🚀 Bitrealm server running on http://${HOST}:${PORT}`)
    console.log(`📊 Monitor: http://${HOST}:${PORT}/monitor`)
    console.log(`🎮 Playground: http://${HOST}:${PORT}/playground`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }

  // Graceful shutdown
  const signals = ['SIGINT', 'SIGTERM']
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`Received ${signal}, shutting down gracefully`)
      await fastify.close()
      await gameServer.gracefullyShutdown()
      process.exit(0)
    })
  })
}

bootstrap().catch(console.error)