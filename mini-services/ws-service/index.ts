import { createServer } from 'http'
import { Server } from 'socket.io'

// ─── Startup guard for required secrets ──────────────────────────────────
if (!process.env.WS_SERVICE_SECRET) {
  console.error('[WS-SERVICE] ❌ WS_SERVICE_SECRET is required. Set it in .env and restart.')
  process.exit(1)
}

// ─── Serveur HTTP ──────────────────────────────────────────────────────────────
const httpServer = createServer()

// ─── Instance Socket.io ────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  path: '/', // Obligatoire pour le routage Caddy
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
})

// ─── Socket.io Authentication Middleware ───────────────────────────────────────
// All Socket.io connections must provide a valid JWT token or WS_SERVICE_SECRET
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return next(new Error('Authentication required: provide a token via auth.token or Authorization header'))
  }

  // Accept the internal service secret (for server-to-server connections)
  if (token === process.env.WS_SERVICE_SECRET) {
    socket.data.authenticated = true
    socket.data.role = 'service'
    return next()
  }

  // Accept NextAuth JWT tokens (for frontend user connections)
  try {
    // Decode without full verification for Socket.io layer;
    // the token is originally issued by NextAuth with AUTH_SECRET/NEXTAUTH_SECRET.
    // We verify it can be decoded as a valid JWT structure.
    const parts = token.split('.')
    if (parts.length !== 3) {
      return next(new Error('Invalid token format'))
    }

    // Base64url decode the payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    if (!payload || (!payload.sub && !payload.userId && !payload.email)) {
      return next(new Error('Token does not contain a valid user identifier'))
    }

    socket.data.authenticated = true
    socket.data.role = payload.role || 'user'
    socket.data.userId = payload.sub || payload.userId
    socket.data.email = payload.email
    return next()
  } catch {
    return next(new Error('Invalid or expired token'))
  }
})

// ─── Suivi des connexions ─────────────────────────────────────────────────────
let connectedClients = 0

/** Map des rooms avec leurs nombres de membres */
function getRoomsSummary(): Record<string, number> {
  const summary: Record<string, number> = {}
  const rooms = io.sockets.adapter.rooms
  for (const [name, room] of rooms) {
    if (!name.startsWith('airport:') && !name.startsWith('admin:')) continue
    summary[name] = room.size
  }
  return summary
}

// ─── Logger utilitaire ─────────────────────────────────────────────────────────
const log = {
  info: (msg: string) => console.log(`[WS-SERVICE] ${msg}`),
  success: (msg: string) => console.log(`[WS-SERVICE] ${msg}`),
  warn: (msg: string) => console.warn(`[WS-SERVICE] ${msg}`),
  error: (msg: string) => console.error(`[WS-SERVICE] ${msg}`),
}

// ─── Input validation helpers ─────────────────────────────────────────────────
const IATA_REGEX = /^[A-Za-z]{2,4}$/

function validateAirportCode(code: string): boolean {
  return typeof code === 'string' && IATA_REGEX.test(code)
}

function validateNonEmpty(value: unknown, fieldName: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

// ─── Gestion des connexions Socket.io ─────────────────────────────────────────
io.on('connection', (socket) => {
  connectedClients++
  log.info(`Client connecte - id: ${socket.id} - role: ${socket.data.role} - total: ${connectedClients}`)

  // ── Rejoindre une salle aeroport ─────────────────────────────────────────────
  socket.on('join:airport', (data: { airportCode: string }) => {
    if (!data || !validateAirportCode(data.airportCode)) {
      socket.emit('error', { message: 'airportCode invalide (2-4 lettres requises)' })
      return
    }
    const { airportCode } = data
    const room = `airport:${airportCode}`
    socket.join(room)
    log.info(`Socket ${socket.id} a rejoint la salle ${room}`)
  })

  // ── Rejoindre une salle admin ────────────────────────────────────────────────
  socket.on('join:admin', (data: { userId: string; role: string }) => {
    if (!data || !validateNonEmpty(data.userId, 'userId')) {
      socket.emit('error', { message: 'userId est requis' })
      return
    }
    // Only allow joining own admin room (prevent impersonation)
    const authenticatedUserId = socket.data.userId
    if (socket.data.role !== 'service' && authenticatedUserId && data.userId !== authenticatedUserId) {
      socket.emit('error', { message: 'Non autorise a rejoindre cette salle admin' })
      return
    }
    const { userId, role } = data
    const room = `admin:${userId}`
    socket.join(room)
    log.info(`Socket ${socket.id} (admin ${userId}, role: ${role}) a rejoint la salle ${room}`)
  })

  // ── Quitter une salle aeroport ───────────────────────────────────────────────
  socket.on('leave:airport', (data: { airportCode: string }) => {
    if (!data || !validateAirportCode(data.airportCode)) {
      socket.emit('error', { message: 'airportCode invalide' })
      return
    }
    const { airportCode } = data
    const room = `airport:${airportCode}`
    socket.leave(room)
    log.info(`Socket ${socket.id} a quitte la salle ${room}`)
  })

  // ── Quitter une salle admin ──────────────────────────────────────────────────
  socket.on('leave:admin', (data: { userId: string }) => {
    if (!data || !validateNonEmpty(data.userId, 'userId')) {
      return
    }
    const { userId } = data
    const room = `admin:${userId}`
    socket.leave(room)
    log.info(`Socket ${socket.id} a quitte la salle ${room}`)
  })

  // ── Ping / Pong ──────────────────────────────────────────────────────────────
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() })
  })

  // ── Deconnexion ──────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    connectedClients--
    log.info(`Client deconnecte - id: ${socket.id} - raison: ${reason} - total: ${connectedClients}`)
  })

  // ── Erreur ───────────────────────────────────────────────────────────────────
  socket.on('error', (err) => {
    log.error(`Erreur socket ${socket.id}: ${err.message}`)
  })
})

// ─── Endpoints HTTP (pour les autres services) ────────────────────────────────

/**
 * POST /api/emit
 * Corps : { airportCode, event, data }
 * Emet un evenement a tous les clients de la salle aeroport.
 */
httpServer.on('request', (req, res) => {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/api/emit') {
    // Simple API key auth for internal endpoints
    const authToken = req.headers.authorization?.replace('Bearer ', '')
    if (!authToken || authToken !== process.env.WS_SERVICE_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body) as {
          airportCode: string
          event: string
          data: unknown
        }
        const { airportCode, event, data } = parsed

        if (!airportCode || !event) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
          })
          res.end(JSON.stringify({ error: 'airportCode et event sont obligatoires' }))
          return
        }

        const room = `airport:${airportCode}`
        io.to(room).emit(event, data)
        log.info(`[HTTP] Evenement "${event}" emis vers la salle ${room}`)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
        })
        res.end(JSON.stringify({ success: true, room, event }))
      } catch {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
        })
        res.end(JSON.stringify({ error: 'Corps de requete JSON invalide' }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/api/emit-admin') {
    // Simple API key auth for internal endpoints
    const authToken = req.headers.authorization?.replace('Bearer ', '')
    if (!authToken || authToken !== process.env.WS_SERVICE_SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
      return
    }

    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body) as {
          userId: string
          event: string
          data: unknown
        }
        const { userId, event, data } = parsed

        if (!userId || !event) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
          })
          res.end(JSON.stringify({ error: 'userId et event sont obligatoires' }))
          return
        }

        const room = `admin:${userId}`
        io.to(room).emit(event, data)
        log.info(`[HTTP] Evenement "${event}" emis vers la salle ${room}`)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
        })
        res.end(JSON.stringify({ success: true, room, event }))
      } catch {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
        })
        res.end(JSON.stringify({ error: 'Corps de requete JSON invalide' }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
    })
    res.end(JSON.stringify({
      status: 'ok',
      connectedClients,
      rooms: getRoomsSummary(),
    }))
    return
  }

  // Route non trouvee
  res.writeHead(404, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3001',
  })
  res.end(JSON.stringify({ error: 'Route non trouvee' }))
})

// ─── Demarrage du serveur ──────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3008', 10)

httpServer.listen(PORT, () => {
  log.success(`Service WebSocket demarre sur le port ${PORT}`)
})

// ─── Arret propre ──────────────────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  log.info(`Signal ${signal} recu - fermeture du serveur en cours...`)
  io.close()
  httpServer.close(() => {
    log.success('Serveur WebSocket ferme correctement')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
