'use client'

import { useState } from 'react'
import {
  BookOpen,
  Settings,
  Code,
  Rocket,
  Wrench,
  Copy,
  Check,
  AlertCircle,
  ChevronRight,
  Terminal,
  Database,
  Globe,
  Shield,
  Plane,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

// ============================================================================
// Copy Button Hook
// ============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1 px-2 text-xs text-gray-500 hover:text-emerald-600"
    >
      {copied ? (
        <>
          <Check className="size-3" />
          <span>Copié</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          <span>Copier</span>
        </>
      )}
    </Button>
  )
}

// ============================================================================
// Code Block Component
// ============================================================================

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {language || 'bash'}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {code}
        </code>
      </pre>
    </div>
  )
}

// ============================================================================
// Configuration Tab Content
// ============================================================================

const envVariables = [
  {
    key: 'WHATSAPP_VERIFY_TOKEN',
    description: 'Token de vérification webhook WhatsApp',
    example: 'maellis_verify_token_2024',
  },
  {
    key: 'WHATSAPP_ACCESS_TOKEN',
    description: 'Token d\'accès API WhatsApp Cloud',
    example: 'EAAxxxxx...',
  },
  {
    key: 'WHATSAPP_PHONE_NUMBER_ID',
    description: 'ID du numéro WhatsApp Business',
    example: '123456789012345',
  },
  {
    key: 'GROQ_API_KEY',
    description: 'Clé API Groq pour le LLM',
    example: 'gsk_xxxxx...',
  },
  {
    key: 'GROQ_MODEL',
    description: 'Modèle LLM à utiliser',
    example: 'llama-3.3-70b-versatile',
  },
  {
    key: 'AVIATION_STACK_KEY',
    description: 'Clé API AviationStack pour les vols',
    example: 'xxxxxxxxxxxxxxxxx',
  },
  {
    key: 'CINETPAY_API_KEY',
    description: 'Clé API CinetPay (paiements)',
    example: 'xxxxxxxx',
  },
  {
    key: 'CINETPAY_SITE_ID',
    description: 'ID du site CinetPay',
    example: '123456',
  },
  {
    key: 'CINETPAY_SECRET_KEY',
    description: 'Clé secrète CinetPay',
    example: 'xxxxxxxxxxxx',
  },
  {
    key: 'JWT_SECRET',
    description: 'Secret pour les tokens JWT (bagages QR)',
    example: 'your-super-secret-jwt-key',
  },
  {
    key: 'DATABASE_URL',
    description: 'URL de connexion à la base de données',
    example: 'file:./db/dev.db',
  },
  {
    key: 'NEXTAUTH_SECRET',
    description: 'Secret pour NextAuth.js',
    example: 'your-nextauth-secret',
  },
]

function ConfigurationTab() {
  return (
    <div className="space-y-8">
      {/* Environment Variables */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Globe className="size-5 text-emerald-600" />
          Variables d&apos;Environnement
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Configurez ces variables dans votre fichier <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">.env</code> à la racine du projet.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900">
                <TableHead className="font-semibold">Clé</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="font-semibold">Exemple</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envVariables.map((env) => (
                <TableRow key={env.key}>
                  <TableCell>
                    <code className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                      {env.key}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{env.description}</TableCell>
                  <TableCell>
                    <code className="rounded bg-gray-50 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {env.example}
                    </code>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Separator />

      {/* WhatsApp Setup */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <svg className="size-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Configuration WhatsApp
        </h3>
        <div className="space-y-3">
          {[
            'Créez un compte Meta for Developers sur developers.facebook.com',
            'Créez une application de type "Business" dans le Dashboard Meta',
            'Ajoutez le produit "WhatsApp" à votre application',
            'Sélectionnez ou créez un numéro WhatsApp Business',
            'Récupérez le Phone Number ID et l\'Access Token permanent',
            'Configurez le Webhook Callback URL: https://votre-domaine.com/webhook',
            'Ajoutez la subscription "messages" au webhook',
            'Définissez le Verify Token dans les paramètres du webhook',
            'Copiez les variables WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN et WHATSAPP_PHONE_NUMBER_ID dans votre .env',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Groq AI Setup */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Code className="size-5 text-emerald-600" />
          Configuration IA Groq
        </h3>
        <div className="space-y-3">
          {[
            'Créez un compte sur console.groq.com',
            'Générez une clé API dans la section "API Keys"',
            'Choisissez le modèle: llama-3.3-70b-versatile (recommandé)',
            'Configurez les variables GROQ_API_KEY et GROQ_MODEL dans votre .env',
            'Testez la connexion: bun run dev puis accédez à /api/bot/chat',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* AviationStack Setup */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Plane className="size-5 text-emerald-600" />
          Configuration AviationStack
        </h3>
        <div className="space-y-3">
          {[
            'Créez un compte sur aviationstack.com',
            'Souscrivez un plan (Free: 100 requêtes/mois, Pro: illimité)',
            'Récupérez votre clé API dans le Dashboard',
            'Configurez AVIATION_STACK_KEY dans votre .env',
            'Le bot utilisera les données simulées si la clé est absente',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* CinetPay Setup */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Shield className="size-5 text-emerald-600" />
          Configuration CinetPay (Paiements)
        </h3>
        <div className="space-y-3">
          {[
            'Créez un compte marchand sur cinetpay.com',
            'Activez votre compte et vérifiez votre identité',
            'Récupérez votre API Key, Site ID et Secret Key',
            'Configurez CINETPAY_API_KEY, CINETPAY_SITE_ID et CINETPAY_SECRET_KEY dans votre .env',
            'Activez les méthodes de paiement: Orange Money, Wave',
            'Configurez les URLs de callback pour les notifications de paiement',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}



// ============================================================================
// API Endpoints Data
// ============================================================================

const apiEndpoints = [
  { method: 'GET', path: '/webhook', description: 'Vérification webhook WhatsApp (Meta challenge)' },
  { method: 'POST', path: '/webhook', description: 'Réception messages WhatsApp entrants' },
  { method: 'GET', path: '/health', description: 'Vérification santé du service bot' },
  { method: 'POST', path: '/chat', description: 'Envoyer un message au bot et recevoir une réponse' },
  { method: 'GET', path: '/airports', description: 'Rechercher des aéroports par nom ou code IATA' },
  { method: 'GET', path: '/track/:token', description: 'Suivre un bagage par token JWT' },
  { method: 'GET', path: '/flight/status/:number', description: 'Statut en temps réel d\'un vol' },
  { method: 'POST', path: '/flight/search', description: 'Rechercher des vols entre deux aéroports' },
  { method: 'POST', path: '/baggage/generate', description: 'Générer un QR code de bagage JWT' },
]

function getMethodColor(method: string) {
  switch (method) {
    case 'GET':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'POST':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
    case 'PUT':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
    case 'PATCH':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
    case 'DELETE':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// ============================================================================
// Services API Tab Content
// ============================================================================

function ServicesApiTab() {
  return (
    <div className="space-y-8">
      {/* Endpoints Table */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Terminal className="size-5 text-emerald-600" />
          Endpoints API
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Toutes les routes sont préfixées par <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">/?XTransformPort=3005</code> via le gateway.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900">
                <TableHead className="w-24 font-semibold">Méthode</TableHead>
                <TableHead className="font-semibold">Chemin</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiEndpoints.map((ep) => (
                <TableRow key={`${ep.method}-${ep.path}`}>
                  <TableCell>
                    <Badge variant="secondary" className={`font-mono text-xs ${getMethodColor(ep.method)}`}>
                      {ep.method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-medium text-gray-800 dark:text-gray-200">
                      {ep.path}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{ep.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Separator />

      {/* POST /chat Example */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <ChevronRight className="size-5 text-emerald-600" />
          Exemple: POST /chat
        </h3>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Requête:</p>
            <CodeBlock
              language="json"
              code={`{
  "message": "Statut du vol AF123",
  "phone": "+221771234567",
  "language": "fr"
}`}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Réponse:</p>
            <CodeBlock
              language="json"
              code={`{
  "success": true,
  "response": {
    "type": "text",
    "text": "🔍 *Statut de Vol* — AviationStack API\\n\\n✈️ *Air France AF123*\\n🛫 CDG Paris → 🛬 DSS Dakar\\n\\n📋 *Statut:* 🟢 En vol\\n..."
  },
  "intent": "flight_status",
  "confidence": 0.94,
  "language": "fr",
  "processingTime": 245
}`}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* POST /flight/search Example */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <ChevronRight className="size-5 text-emerald-600" />
          Exemple: POST /flight/search
        </h3>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Requête:</p>
            <CodeBlock
              language="json"
              code={`{
  "departureCode": "DSS",
  "arrivalCode": "ABJ",
  "date": "2024-12-15",
  "passengers": 2
}`}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Réponse:</p>
            <CodeBlock
              language="json"
              code={`{
  "success": true,
  "flights": [
    {
      "airline": "Air Sénégal",
      "flightNumber": "2S221",
      "departureTime": "07:30",
      "arrivalTime": "09:45",
      "departureGate": "A12",
      "arrivalGate": "C03",
      "status": "active",
      "isDelayed": false,
      "delayMinutes": 0
    }
  ],
  "source": "aviationstack",
  "count": 3
}`}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* POST /baggage/generate Example */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <ChevronRight className="size-5 text-emerald-600" />
          Exemple: POST /baggage/generate
        </h3>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Requête:</p>
            <CodeBlock
              language="json"
              code={`{
  "passenger": "Mamadou Diallo",
  "flightNumber": "2S221",
  "pnr": "XK7T9M",
  "tagNumber": "DSS12345678",
  "weight": 18.5,
  "destination": "ABJ"
}`}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Réponse:</p>
            <CodeBlock
              language="json"
              code={`{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "qrCodeUrl": "data:image/png;base64,...",
  "expiresAt": "2024-12-22T12:00:00Z",
  "trackUrl": "/track/eyJhbGciOiJIUzI1NiIs..."
}`}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// Deployment Tab Content
// ============================================================================

function DeploymentTab() {
  return (
    <div className="space-y-8">
      {/* Docker Compose */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Database className="size-5 text-emerald-600" />
          Docker Compose
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Déploiement complet avec Docker Compose pour les services et la base de données.
        </p>
        <CodeBlock
          language="yaml"
          code={`# docker-compose.yml
version: '3.8'

services:
  # Application Next.js
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/data/dev.db
    volumes:
      - ./db:/data
    restart: unless-stopped

  # Bot Service (Bun)
  bot-service:
    build:
      context: ./mini-services/bot-service
      dockerfile: Dockerfile
    ports:
      - "3005:3005"
    env_file:
      - .env
    restart: unless-stopped

  # Caddy Reverse Proxy + HTTPS
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
      - bot-service
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:`}
        />
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Commandes:</p>
          <CodeBlock language="bash" code={`# Construire et démarrer
docker compose up -d --build

# Voir les logs
docker compose logs -f

# Redémarrer un service
docker compose restart bot-service

# Arrêter tout
docker compose down`} />
        </div>
      </section>

      <Separator />

      {/* Vercel + Railway */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Rocket className="size-5 text-emerald-600" />
          Vercel + Railway
        </h3>
        <div className="space-y-3">
          {[
            {
              title: 'Frontend (Vercel)',
              steps: [
                'Connectez votre dépôt GitHub à Vercel',
                'Configurez les variables d\'environnement dans le Dashboard Vercel',
                'Déployez automatiquement à chaque push sur main',
                'Domaine personnalisé: Configurez DNS A record vers Vercel',
              ],
            },
            {
              title: 'Bot Service (Railway)',
              steps: [
                'Créez un nouveau projet sur railway.app',
                'Ajoutez le service bot-service depuis GitHub',
                'Définissez le port: 3005',
                'Ajoutez toutes les variables d\'environnement',
                'Utilisez Railway Volume pour persister la base de données',
              ],
            },
            {
              title: 'Webhook URL',
              steps: [
                'Combinez les deux URLs: Vercel pour le frontend, Railway pour le bot',
                'Configurez le webhook WhatsApp vers: https://bot.votre-domaine.com/webhook',
                'Utilisez un sous-domaine ou un reverse proxy pour la communication',
              ],
            },
          ].map((item, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-1.5">
                  {item.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="mt-0.5 size-5 shrink-0 rounded-full bg-emerald-50 text-center text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {j + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* VPS Deployment */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Terminal className="size-5 text-emerald-600" />
          VPS (Déploiement Manuelle)
        </h3>
        <CodeBlock
          language="bash"
          code={`# 1. Cloner le projet
git clone https://github.com/votre-org/maellis-bot.git
cd maellis-bot

# 2. Installer les dépendances
bun install

# 3. Configurer l'environnement
cp .env.example .env
nano .env  # Remplissez les variables

# 4. Initialiser la base de données
bun run db:push

# 5. Construire l'application
bun run build

# 6. Démarrer les services (avec PM2)
pm2 start npm --name "maellis-app" -- start
cd mini-services/bot-service
pm2 start bun --name "maellis-bot" -- index.ts
pm2 save
pm2 startup`}
        />
      </section>

      <Separator />

      {/* Caddy HTTPS */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Shield className="size-5 text-emerald-600" />
          Caddy HTTPS
        </h3>
        <CodeBlock
          language="caddyfile"
          code={`# Caddyfile
votre-domaine.com {
    # Next.js Application
    reverse_proxy localhost:3000

    # Bot Service API
    handle /api/bot/* {
        reverse_proxy localhost:3005
    }

    # WhatsApp Webhook
    handle /webhook {
        reverse_proxy localhost:3005
    }

    # Logging
    log {
        output file /var/log/caddy/maellis.log
    }
}`}
        />
      </section>

      <Separator />

      {/* Cron Jobs */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Settings className="size-5 text-emerald-600" />
          Tâches Planifiées (Cron)
        </h3>
        <CodeBlock
          language="bash"
          code={`# Sauvegarde quotidienne de la base de données
0 2 * * * cp /path/to/db/dev.db /backups/db_$(date +\\%Y\\%m\\%d).db

# Nettoyage des QR codes expirés (7 jours)
0 3 * * * curl -s https://votre-domaine.com/api/baggage/cleanup

# Redémarrage du service bot (hebdomadaire)
0 4 * * 0 pm2 restart maellis-bot

# Vérification de santé
*/5 * * * * curl -sf https://votre-domaine.com/api/health || pm2 restart maellis-bot`}
        />
      </section>

      <Separator />

      {/* Production Env Vars */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Globe className="size-5 text-emerald-600" />
          Variables de Production
        </h3>
        <CodeBlock
          language="bash"
          code={`# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
DATABASE_URL=file:/data/prod.db
NEXTAUTH_URL=https://votre-domaine.com

# Webhook URL (doit être HTTPS)
PUBLIC_WEBHOOK_URL=https://votre-domaine.com/webhook`}
        />
      </section>
    </div>
  )
}

// ============================================================================
// Troubleshooting Tab Content
// ============================================================================

const troubleshootingItems = [
  {
    problem: 'Webhook WhatsApp ne reçoit pas de messages',
    cause: 'URL incorrecte, token invalide, ou mode sandbox actif',
    solution: '1. Vérifiez que le Verify Token correspond côté serveur\n2. Testez avec curl: curl "https://votre-domaine.com/webhook?hub.mode=subscribe&hub.verify_token=VOTRE_TOKEN&hub.challenge=CHALLENGE"\n3. Vérifiez que le webhook est abonné aux événements "messages"\n4. Assurez-vous que le numéro est en mode production (pas sandbox)',
    severity: 'critical',
  },
  {
    problem: 'Erreurs Groq API (429 / 500)',
    cause: 'Limite de débit atteinte ou clé API expirée',
    solution: '1. Vérifiez la validité de votre clé API Groq\n2. Vérifiez votre quota sur console.groq.com\n3. En cas de 429, le bot utilise un fallback par mots-clés\n4. Implémentez un retry avec backoff exponentiel',
    severity: 'high',
  },
  {
    problem: 'Limite AviationStack atteinte',
    cause: 'Plan gratuit limité à 100 requêtes/mois',
    solution: '1. Vérifiez votre quota sur aviationstack.com\n2. Upgradez vers un plan payant si nécessaire\n3. Le bot utilise des données simulées en cas d\'erreur\n4. Implémentez un cache pour les requêtes fréquentes',
    severity: 'medium',
  },
  {
    problem: 'Connexion base de données échouée',
    cause: 'Fichier SQLite verrouillé ou permissions incorrectes',
    solution: '1. Vérifiez les permissions: chmod 644 db/dev.db\n2. Arrêtez les processus qui utilisent la DB: lsof db/dev.db\n3. Redémarrez Prisma: bun run db:push\n4. Vérifiez DATABASE_URL dans .env',
    severity: 'high',
  },
  {
    problem: 'Conflit de ports (3000, 3005)',
    cause: 'Un autre processus utilise le port',
    solution: '1. Identifiez le processus: lsof -i :3000 ou lsof -i :3005\n2. Tuez le processus: kill -9 PID\n3. Ou changez le port dans les variables d\'environnement\n4. Vérifiez que Caddy redirige vers les bons ports',
    severity: 'medium',
  },
  {
    problem: 'Paiements CinetPay échouent',
    cause: 'Clé API invalide ou callback URL mal configurée',
    solution: '1. Vérifiez CINETPAY_API_KEY et CINETPAY_SITE_ID\n2. Testez la connexion API: curl https://api.cinetpay.com/v2/...\n3. Vérifiez les URLs de notification dans le dashboard CinetPay\n4. Les paiements test sont disponibles en mode sandbox',
    severity: 'high',
  },
  {
    problem: 'QR Code bagage invalide',
    cause: 'JWT secret modifié ou token expiré',
    solution: '1. Vérifiez JWT_SECRET dans .env (ne pas changer en production)\n2. Les tokens expirent après 7 jours par défaut\n3. Régénérez le QR code via POST /baggage/generate\n4. Le endpoint /track/:token vérifie la signature JWT',
    severity: 'low',
  },
  {
    problem: 'Réponses du bot lentes (> 3s)',
    cause: 'Latence Groq API ou requêtes AviationStack lentes',
    solution: '1. Vérifiez la latence réseau vers api.groq.com\n2. Activez le cache pour les recherches de vols\n3. Le fallback par mots-clés répond en < 100ms\n4. Envisagez un CDN pour les requêtes API',
    severity: 'medium',
  },
]

function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'critical':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Critique</Badge>
    case 'high':
      return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Élevé</Badge>
    case 'medium':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Moyen</Badge>
    case 'low':
      return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">Faible</Badge>
    default:
      return null
  }
}

function TroubleshootingTab() {
  return (
    <div className="space-y-8">
      {/* Issues Table */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Wrench className="size-5 text-emerald-600" />
          Problèmes Courants et Solutions
        </h3>
        <div className="space-y-4">
          {troubleshootingItems.map((item, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 size-5 shrink-0 text-gray-400" />
                    <CardTitle className="text-base">{item.problem}</CardTitle>
                  </div>
                  {getSeverityBadge(item.severity)}
                </div>
                <CardDescription>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Cause probable : </span>
                  {item.cause}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Solution
                  </p>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                    {item.solution}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Log Locations */}
      <section>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <Settings className="size-5 text-emerald-600" />
          Emplacement des Logs
        </h3>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-900">
                <TableHead className="font-semibold">Service</TableHead>
                <TableHead className="font-semibold">Emplacement</TableHead>
                <TableHead className="font-semibold">Commande d&apos;accès</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Next.js App</TableCell>
                <TableCell>
                  <code className="text-xs">console output / PM2 logs</code>
                </TableCell>
                <TableCell>
                  <code className="text-xs">pm2 logs maellis-app</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Bot Service</TableCell>
                <TableCell>
                  <code className="text-xs">console output / PM2 logs</code>
                </TableCell>
                <TableCell>
                  <code className="text-xs">pm2 logs maellis-bot</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Caddy</TableCell>
                <TableCell>
                  <code className="text-xs">/var/log/caddy/</code>
                </TableCell>
                <TableCell>
                  <code className="text-xs">tail -f /var/log/caddy/maellis.log</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Docker</TableCell>
                <TableCell>
                  <code className="text-xs">docker compose logs</code>
                </TableCell>
                <TableCell>
                  <code className="text-xs">docker compose logs -f bot-service</code>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Vercel</TableCell>
                <TableCell>
                  <code className="text-xs">Dashboard Vercel → Logs</code>
                </TableCell>
                <TableCell>
                  <code className="text-xs">vercel logs --follow</code>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function DocsModule() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <BookOpen className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Documentation Administrateur
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Guide complet pour la configuration, le déploiement et la maintenance de MAELLIS
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="configuration" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="size-4 hidden sm:block" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1.5 text-xs sm:text-sm">
            <Code className="size-4 hidden sm:block" />
            Services API
          </TabsTrigger>
          <TabsTrigger value="deployment" className="gap-1.5 text-xs sm:text-sm">
            <Rocket className="size-4 hidden sm:block" />
            Déploiement
          </TabsTrigger>
          <TabsTrigger value="troubleshooting" className="gap-1.5 text-xs sm:text-sm">
            <Wrench className="size-4 hidden sm:block" />
            Dépannage
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="rounded-lg border p-4 md:p-6" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <TabsContent value="configuration" className="mt-0">
            <ConfigurationTab />
          </TabsContent>
          <TabsContent value="api" className="mt-0">
            <ServicesApiTab />
          </TabsContent>
          <TabsContent value="deployment" className="mt-0">
            <DeploymentTab />
          </TabsContent>
          <TabsContent value="troubleshooting" className="mt-0">
            <TroubleshootingTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
