import { createServer } from 'http'
import { Server } from 'socket.io'

// ─── Serveur HTTP ──────────────────────────────────────────────────────────────
const httpServer = createServer()

// ─── Instance Socket.io ────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  path: '/', // Obligatoire pour le routage Caddy
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
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
  info: (msg: string) => console.log(`[WS-SERVICE] ℹ️  ${msg}`),
  success: (msg: string) => console.log(`[WS-SERVICE] ✅ ${msg}`),
  warn: (msg: string) => console.warn(`[WS-SERVICE] ⚠️  ${msg}`),
  error: (msg: string) => console.error(`[WS-SERVICE] ❌ ${msg}`),
}

// ─── Gestion des connexions Socket.io ─────────────────────────────────────────
io.on('connection', (socket) => {
  connectedClients++
  log.info(`Client connecté — id: ${socket.id} — total: ${connectedClients}`)

  // ── Rejoindre une salle aéroport ─────────────────────────────────────────────
  socket.on('join:airport', (data: { airportCode: string }) => {
    const { airportCode } = data
    const room = `airport:${airportCode}`
    socket.join(room)
    log.info(`Socket ${socket.id} a rejoint la salle ${room}`)
  })

  // ── Rejoindre une salle admin ────────────────────────────────────────────────
  socket.on('join:admin', (data: { userId: string; role: string }) => {
    const { userId, role } = data
    const room = `admin:${userId}`
    socket.join(room)
    log.info(`Socket ${socket.id} (admin ${userId}, rôle: ${role}) a rejoint la salle ${room}`)
  })

  // ── Quitter une salle aéroport ───────────────────────────────────────────────
  socket.on('leave:airport', (data: { airportCode: string }) => {
    const { airportCode } = data
    const room = `airport:${airportCode}`
    socket.leave(room)
    log.info(`Socket ${socket.id} a quitté la salle ${room}`)
  })

  // ── Quitter une salle admin ──────────────────────────────────────────────────
  socket.on('leave:admin', (data: { userId: string }) => {
    const { userId } = data
    const room = `admin:${userId}`
    socket.leave(room)
    log.info(`Socket ${socket.id} a quitté la salle ${room}`)
  })

  // ── Ping / Pong ──────────────────────────────────────────────────────────────
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() })
  })

  // ── Déconnexion ──────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    connectedClients--
    log.info(`Client déconnecté — id: ${socket.id} — raison: ${reason} — total: ${connectedClients}`)
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
 * Émet un événement à tous les clients de la salle aéroport.
 */
httpServer.on('request', (req, res) => {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/api/emit') {
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
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ error: 'airportCode et event sont obligatoires' }))
          return
        }

        const room = `airport:${airportCode}`
        io.to(room).emit(event, data)
        log.info(`[HTTP] Événement "${event}" émis vers la salle ${room}`)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ success: true, room, event }))
      } catch {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ error: 'Corps de requête JSON invalide' }))
      }
    })
    return
  }

  if (req.method === 'POST' && req.url === '/api/emit-admin') {
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
            'Access-Control-Allow-Origin': '*',
          })
          res.end(JSON.stringify({ error: 'userId et event sont obligatoires' }))
          return
        }

        const room = `admin:${userId}`
        io.to(room).emit(event, data)
        log.info(`[HTTP] Événement "${event}" émis vers la salle ${room}`)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ success: true, room, event }))
      } catch {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ error: 'Corps de requête JSON invalide' }))
      }
    })
    return
  }

  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({
      status: 'ok',
      connectedClients,
      rooms: getRoomsSummary(),
    }))
    return
  }

  // Route non trouvée
  res.writeHead(404, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({ error: 'Route non trouvée' }))
})

// ─── Démarrage du serveur ──────────────────────────────────────────────────────
const PORT = 3008

httpServer.listen(PORT, () => {
  log.success(`Service WebSocket démarré sur le port ${PORT}`)
})

// ─── Arrêt propre ──────────────────────────────────────────────────────────────
function gracefulShutdown(signal: string) {
  log.info(`Signal ${signal} reçu — fermeture du serveur en cours...`)
  io.close()
  httpServer.close(() => {
    log.success('Serveur WebSocket fermé correctement')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
