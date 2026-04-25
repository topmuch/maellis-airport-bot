// ─────────────────────────────────────────────────────────────────────────────
// CustomFidsProvider — Provider générique REST/JSON pour API FIDS/SITA
// ─────────────────────────────────────────────────────────────────────────────
// Lit la config depuis SystemConfig, injecte les headers personnalisés,
// fetch l'URL, extrait via JSON Path, mappe via le mapping configuré.
// Retourne toujours le format standard IFlightProvider.
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

export interface CustomFidsConfig {
  url: string
  headers: Record<string, string>
  dataPath: string       // ex: "data.flights" ou "flights"
  mapping: Record<string, string>  // ex: { "flightNumber": "flight_no", "status": "state" }
}

// Mapping par défaut si le user n'en fournit pas
const DEFAULT_MAPPING: Record<string, string> = {
  flightNumber: 'flight_number',
  airline: 'airline_name',
  departureCode: 'departure_code',
  arrivalCode: 'arrival_code',
  departureCity: 'departure_city',
  arrivalCity: 'arrival_city',
  scheduledDep: 'scheduled_departure',
  scheduledArr: 'scheduled_arrival',
  actualDep: 'actual_departure',
  actualArr: 'actual_arrival',
  estimatedDep: 'estimated_departure',
  estimatedArr: 'estimated_arrival',
  gate: 'gate',
  terminal: 'terminal',
  status: 'status',
  delayMinutes: 'delay_minutes',
  aircraft: 'aircraft_registration',
  aircraftType: 'aircraft_type',
}

export class CustomFidsProvider implements IFlightProvider {
  readonly id = 'CUSTOM_FIDS'
  readonly name = 'API Interne Aéroport (FIDS)'

  private config: CustomFidsConfig

  constructor(config: CustomFidsConfig) {
    this.config = config
  }

  /** Extrait une valeur nested d'un objet via un path "a.b.c" */
  private getNestedValue(obj: unknown, path: string): unknown {
    if (!path) return obj
    const parts = path.split('.')
    let current: unknown = obj
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined
      }
      current = (current as Record<string, unknown>)[part]
    }
    return current
  }

  /** Extrait la liste des vols depuis la réponse en suivant dataPath */
  private extractFlightArray(response: unknown): unknown[] {
    const flights = this.getNestedValue(response, this.config.dataPath)
    if (Array.isArray(flights)) return flights
    if (flights && typeof flights === 'object') return [flights]
    return []
  }

  /** Mappe un objet brut vers le format FlightStatusData */
  private mapFlightStatus(raw: Record<string, unknown>): FlightStatusData {
    const mapping = { ...DEFAULT_MAPPING, ...this.config.mapping }

    const get = (standardField: string): string | undefined => {
      const sourceField = mapping[standardField] || standardField
      const val = this.getNestedValue(raw, sourceField)
      return val !== null && val !== undefined ? String(val) : undefined
    }

    const getNum = (standardField: string, fallback = 0): number => {
      const val = get(standardField)
      if (!val) return fallback
      const n = parseInt(val, 10)
      return isNaN(n) ? fallback : n
    }

    return {
      flightNumber: get('flightNumber') || raw.flight_number as string || 'UNKNOWN',
      airline: get('airline') || 'Inconnu',
      departureCode: get('departureCode') || '',
      arrivalCode: get('arrivalCode') || '',
      departureCity: get('departureCity'),
      arrivalCity: get('arrivalCity'),
      scheduledDep: get('scheduledDep'),
      scheduledArr: get('scheduledArr'),
      actualDep: get('actualDep'),
      actualArr: get('actualArr'),
      estimatedDep: get('estimatedDep'),
      estimatedArr: get('estimatedArr'),
      gate: get('gate'),
      terminal: get('terminal'),
      status: get('status') || 'scheduled',
      delayMinutes: getNum('delayMinutes'),
      aircraft: get('aircraft'),
      aircraftType: get('aircraftType'),
    }
  }

  /** Effectue un fetch vers l'API custom */
  private async fetchFromApi(endpoint?: string): Promise<unknown> {
    const url = endpoint || this.config.url
    if (!url) {
      throw new Error('URL FIDS non configurée')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.headers,
    }

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API FIDS HTTP ${res.status}: ${text.slice(0, 200)}`)
    }

    return res.json()
  }

  async getFlightStatus(params: FlightStatusParams): Promise<FlightStatusData> {
    const response = await this.fetchFromApi()
    const flights = this.extractFlightArray(response)
    const upper = params.flightNumber.toUpperCase().trim()

    const found = flights.find((f) => {
      const raw = f as Record<string, unknown>
      const fn = (
        this.getNestedValue(raw, this.config.mapping.flightNumber || 'flight_number') ||
        raw.flight_number
      )
      return String(fn || '').toUpperCase().trim() === upper
    })

    if (!found) {
      throw new Error(`Vol ${params.flightNumber} non trouvé dans l'API FIDS`)
    }

    return this.mapFlightStatus(found as Record<string, unknown>)
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
    const response = await this.fetchFromApi()
    const flights = this.extractFlightArray(response)

    let filtered = flights

    // Filtrer par departureCode si spécifié
    if (params.departureCode) {
      const depCode = params.departureCode.toUpperCase().trim()
      filtered = filtered.filter((f) => {
        const raw = f as Record<string, unknown>
        const dc = this.getNestedValue(raw, this.config.mapping.departureCode || 'departure_code')
        return String(dc || '').toUpperCase().trim() === depCode
      })
    }

    // Filtrer par arrivalCode si spécifié
    if (params.arrivalCode) {
      const arrCode = params.arrivalCode.toUpperCase().trim()
      filtered = filtered.filter((f) => {
        const raw = f as Record<string, unknown>
        const ac = this.getNestedValue(raw, this.config.mapping.arrivalCode || 'arrival_code')
        return String(ac || '').toUpperCase().trim() === arrCode
      })
    }

    // Filtrer par flightNumber si spécifié
    if (params.flightNumber) {
      const fn = params.flightNumber.toUpperCase().trim()
      filtered = filtered.filter((f) => {
        const raw = f as Record<string, unknown>
        const fnum = this.getNestedValue(raw, this.config.mapping.flightNumber || 'flight_number')
        return String(fnum || '').toUpperCase().trim().includes(fn)
      })
    }

    const results = filtered.map((f, i) => {
      const status = this.mapFlightStatus(f as Record<string, unknown>)
      return {
        id: `FLT-FIDS-${Date.now()}-${i}`,
        flightNumber: status.flightNumber,
        airline: status.airline,
        departureCode: status.departureCode,
        arrivalCode: status.arrivalCode,
        departureCity: status.departureCity,
        arrivalCity: status.arrivalCity,
        departureTime: status.scheduledDep,
        arrivalTime: status.scheduledArr,
        aircraftType: status.aircraftType,
        class: 'Economy',
        currency: 'XOF',
      }
    })

    return {
      flights: results,
      totalResults: results.length,
    }
  }

  async searchAirports(query: string): Promise<AirportData[]> {
    // Les API FIDS n'ont généralement pas d'endpoint dédié aux aéroports
    // On retourne un aéroport par défaut basé sur la config
    return [{
      iataCode: 'DSS',
      name: 'API FIDS configurée',
      city: 'Voir configuration',
      country: 'Aéroport client',
    }].filter(() => !query)
  }

  async testConnection(): Promise<ProviderTestResult> {
    if (!this.config.url) {
      return {
        success: false,
        message: 'URL FIDS non configurée',
      }
    }

    const start = Date.now()
    try {
      const response = await this.fetchFromApi()
      const flights = this.extractFlightArray(response)
      const latency = Date.now() - start

      // Essayer de prendre un échantillon
      let sample: FlightStatusData | undefined
      if (flights.length > 0) {
        sample = this.mapFlightStatus(flights[0] as Record<string, unknown>)
      }

      return {
        success: true,
        message: `Connecté — ${flights.length} vol(s) récupéré(s)`,
        latencyMs: latency,
        sample,
      }
    } catch (err) {
      return {
        success: false,
        message: `Erreur API FIDS: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
        latencyMs: Date.now() - start,
      }
    }
  }
}
