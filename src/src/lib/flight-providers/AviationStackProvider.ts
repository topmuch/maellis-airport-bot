// ─────────────────────────────────────────────────────────────────────────────
// AviationStackProvider — Wrapper autour de l'API AviationStack
// ─────────────────────────────────────────────────────────────────────────────
// Utilise la clé API stockée en base (SystemConfig) OU fallback sur
// process.env.AVIATION_STACK_KEY pour compatibilité ascendante.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  IFlightProvider,
  FlightStatusData,
  FlightSearchResult,
  FlightSearchParams,
  FlightStatusParams,
  AirportData,
  ProviderTestResult,
} from './IFlightProvider'

const AVIATION_STACK_BASE = 'http://api.aviationstack.com/v1'

export class AviationStackProvider implements IFlightProvider {
  readonly id = 'AVIATION_STACK'
  readonly name = 'AviationStack (Démo)'

  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private isConfigured(): boolean {
    return !!this.apiKey
  }

  /** Helper pour construire l'URL avec la clé */
  private url(endpoint: string, params: Record<string, string> = {}): string {
    const sp = new URLSearchParams({ access_key: this.apiKey, ...params })
    return `${AVIATION_STACK_BASE}${endpoint}?${sp.toString()}`
  }

  async getFlightStatus(params: FlightStatusParams): Promise<FlightStatusData> {
    if (!this.isConfigured()) {
      throw new Error('Clé AviationStack non configurée')
    }

    const searchParams: Record<string, string> = { flight_icao: params.flightNumber.toUpperCase().trim() }
    if (params.date) {
      searchParams.date = params.date
    }

    const res = await fetch(this.url('/flights', searchParams), {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error(`AviationStack HTTP ${res.status}: ${await res.text().catch(() => 'Unknown error')}`)
    }

    const json = await res.json() as Record<string, unknown>
    const data = (json.data as Record<string, unknown>[]) || []
    const raw = data[0] as Record<string, unknown> | undefined

    if (!raw) {
      throw new Error(`Vol ${params.flightNumber} non trouvé dans AviationStack`)
    }

    const dep = raw.departure as Record<string, unknown> | undefined
    const arr = raw.arrival as Record<string, unknown> | undefined
    const airline = raw.airline as Record<string, unknown> | undefined

    const flight = raw.flight as Record<string, unknown> | undefined
    return {
      flightNumber: (flight?.icao as string) || (flight?.iata as string) || params.flightNumber.toUpperCase(),
      airline: (airline?.name as string) || 'Inconnu',
      departureCode: (dep?.icao as string) || (raw.dep_icao as string) || '',
      arrivalCode: (arr?.icao as string) || (raw.arr_icao as string) || '',
      departureCity: (dep?.city as string) || undefined,
      arrivalCity: (arr?.city as string) || undefined,
      scheduledDep: (dep?.scheduled as string) || undefined,
      scheduledArr: (arr?.scheduled as string) || undefined,
      actualDep: (dep?.actual as string) || undefined,
      actualArr: (arr?.actual as string) || undefined,
      estimatedDep: (dep?.estimated as string) || undefined,
      estimatedArr: (arr?.estimated as string) || undefined,
      gate: (dep?.gate as string) || undefined,
      terminal: (dep?.terminal as string) || undefined,
      status: (raw.flight_status as string) || 'scheduled',
      delayMinutes: parseInt(String(dep?.delay || '0'), 10) || 0,
      aircraft: ((raw.aircraft as Record<string, unknown> | undefined)?.registration as string) || undefined,
      aircraftType: ((raw.aircraft as Record<string, unknown> | undefined)?.iata as string) || undefined,
    }
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Clé AviationStack non configurée')
    }

    const searchParams: Record<string, string> = {
      dep_icao: params.departureCode.toUpperCase().trim(),
      limit: '20',
    }
    if (params.arrivalCode) {
      searchParams.arr_icao = params.arrivalCode.toUpperCase().trim()
    }
    if (params.flightNumber) {
      searchParams.flight_icao = params.flightNumber.toUpperCase().trim()
    }

    const res = await fetch(this.url('/flights', searchParams), {
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      throw new Error(`AviationStack HTTP ${res.status}`)
    }

    const json = await res.json() as Record<string, unknown>
    const data = (json.data as Record<string, unknown>[]) || []

    const flights = data.map((raw, i) => {
      const dep = raw.departure as Record<string, unknown> | undefined
      const arr = raw.arrival as Record<string, unknown> | undefined
      const airline = raw.airline as Record<string, unknown> | undefined

      const depScheduled = dep?.scheduled as string
      const arrScheduled = arr?.scheduled as string
      let duration = ''
      if (depScheduled && arrScheduled) {
        const diffMs = new Date(arrScheduled).getTime() - new Date(depScheduled).getTime()
        const diffH = Math.floor(diffMs / 3600000)
        const diffM = Math.floor((diffMs % 3600000) / 60000)
        duration = `${diffH}h${diffM}m`
      }

      const flight2 = raw.flight as Record<string, unknown> | undefined
      const aircraft2 = raw.aircraft as Record<string, unknown> | undefined
      return {
        id: `FLT-AS-${Date.now()}-${i}`,
        flightNumber: (flight2?.iata as string) || (flight2?.icao as string) || '',
        airline: (airline?.name as string) || 'Inconnu',
        departureCode: (dep?.icao as string) || '',
        arrivalCode: (arr?.icao as string) || '',
        departureCity: (dep?.city as string) || undefined,
        arrivalCity: (arr?.city as string) || undefined,
        departureTime: depScheduled || undefined,
        arrivalTime: arrScheduled || undefined,
        duration,
        stops: 0,
        currency: 'XOF',
        aircraftType: (aircraft2?.iata as string) || undefined,
        class: (flight2?.codeshared ? 'Codeshare' : 'Economy'),
      }
    })

    return {
      flights,
      totalResults: flights.length,
    }
  }

  async searchAirports(query: string): Promise<AirportData[]> {
    if (!this.isConfigured()) {
      throw new Error('Clé AviationStack non configurée')
    }

    const res = await fetch(this.url('/airports', { search: query, limit: '20' }), {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error(`AviationStack HTTP ${res.status}`)
    }

    const json = await res.json() as Record<string, unknown>
    const data = (json.data as Record<string, unknown>[]) || []

    return data.map((raw) => ({
      iataCode: (raw.iata_code as string) || '',
      name: (raw.airport_name as string) || '',
      city: ((raw.city as Record<string, unknown> | undefined)?.name as string) || undefined,
      country: ((raw.country as Record<string, unknown> | undefined)?.name as string) || undefined,
    }))
  }

  async testConnection(): Promise<ProviderTestResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Clé AviationStack non configurée',
      }
    }

    const start = Date.now()
    try {
      const res = await fetch(this.url('/airports', { limit: '1' }), {
        signal: AbortSignal.timeout(5000),
      })
      const latency = Date.now() - start

      if (res.ok) {
        const json = await res.json() as Record<string, unknown>
        const total = ((json.pagination as Record<string, unknown> | undefined)?.total as number) || 0
        return {
          success: true,
          message: `Connecté — ${total} aéroports disponibles`,
          latencyMs: latency,
        }
      }

      return {
        success: false,
        message: `Erreur HTTP ${res.status} — clé invalide ?`,
        latencyMs: Date.now() - start,
      }
    } catch (err) {
      return {
        success: false,
        message: `Impossible de joindre AviationStack: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        latencyMs: Date.now() - start,
      }
    }
  }
}
