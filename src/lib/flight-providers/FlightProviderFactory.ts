// ─────────────────────────────────────────────────────────────────────────────
// FlightProviderFactory — Factory pour instancier le bon provider de vols
// ─────────────────────────────────────────────────────────────────────────────
// Lit SystemConfig depuis la base, instancie le bon provider, et le met en
// cache en mémoire. Le cache est invalidé par invalidateCache().
//
// UTILISATION:
//   import { getFlightProvider, invalidateFlightProviderCache } from '@/lib/flight-providers/FlightProviderFactory'
//   const provider = getFlightProvider()
//   const status = await provider.getFlightStatus({ flightNumber: 'AF123' })
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'
import { MockProvider } from './MockProvider'
import { AviationStackProvider } from './AviationStackProvider'
import { CustomFidsProvider } from './CustomFidsProvider'
import type { IFlightProvider, ProviderTestResult } from './IFlightProvider'
import type { CustomFidsConfig } from './CustomFidsProvider'

// ─── Cache ────────────────────────────────────────────────────────────────────

let cachedProvider: IFlightProvider | null = null
let cachedProviderType: string | null = null
let cacheTimestamp: number = 0

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Config loader ────────────────────────────────────────────────────────────

async function loadConfig() {
  return await db.systemConfig.upsert({
    where: { id: 'global' },
    create: { id: 'global' },
    update: {},
  })
}

// ─── Parser helpers ───────────────────────────────────────────────────────────

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Retourne le provider de vols actif selon SystemConfig.
 * Cache l'instance pendant 5 minutes.
 */
export async function getFlightProvider(): Promise<IFlightProvider> {
  const now = Date.now()

  // Retourner le cache si encore valide
  if (cachedProvider && cachedProviderType && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedProvider
  }

  const config = await loadConfig()
  const providerType = config.flightProvider || 'AVIATION_STACK'

  // Si le type n'a pas changé, on garde le même provider (juste rafraîchi le timestamp)
  if (cachedProvider && cachedProviderType === providerType && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedProvider
  }

  let provider: IFlightProvider

  switch (providerType) {
    case 'AVIATION_STACK': {
      // Priorité: clé en base > variable d'environnement > vide
      const apiKey = config.aviationStackKey || process.env.AVIATION_STACK_KEY || process.env.AVIATION_API_KEY || ''
      provider = new AviationStackProvider(apiKey)
      break
    }

    case 'CUSTOM_FIDS': {
      const fidsConfig: CustomFidsConfig = {
        url: config.customFidsUrl || '',
        headers: parseJsonSafe<Record<string, string>>(config.customFidsHeaders, {}),
        dataPath: config.customFidsDataPath || 'data.flights',
        mapping: parseJsonSafe<Record<string, string>>(config.customFidsMapping, {}),
      }
      provider = new CustomFidsProvider(fidsConfig)
      break
    }

    case 'MOCK':
    default: {
      provider = new MockProvider()
      break
    }
  }

  // Mettre en cache
  cachedProvider = provider
  cachedProviderType = providerType
  cacheTimestamp = now

  return provider
}

/**
 * Invalide le cache du provider. À appeler après toute modification de config.
 */
export function invalidateFlightProviderCache(): void {
  cachedProvider = null
  cachedProviderType = null
  cacheTimestamp = 0
}

/**
 * Teste la connexion du provider actuellement configuré.
 * Crée une instance fraîche (sans cache) pour un résultat fiable.
 */
export async function testCurrentProvider(): Promise<ProviderTestResult> {
  const config = await loadConfig()
  const providerType = config.flightProvider || 'AVIATION_STACK'

  let provider: IFlightProvider

  switch (providerType) {
    case 'AVIATION_STACK': {
      const apiKey = config.aviationStackKey || process.env.AVIATION_STACK_KEY || process.env.AVIATION_API_KEY || ''
      provider = new AviationStackProvider(apiKey)
      break
    }
    case 'CUSTOM_FIDS': {
      const fidsConfig: CustomFidsConfig = {
        url: config.customFidsUrl || '',
        headers: parseJsonSafe<Record<string, string>>(config.customFidsHeaders, {}),
        dataPath: config.customFidsDataPath || 'data.flights',
        mapping: parseJsonSafe<Record<string, string>>(config.customFidsMapping, {}),
      }
      provider = new CustomFidsProvider(fidsConfig)
      break
    }
    default: {
      provider = new MockProvider()
      break
    }
  }

  return provider.testConnection()
}
