// ─────────────────────────────────────────────────────────────────────────────
// IFlightProvider — Interface standard pour les fournisseurs de données vols
// ─────────────────────────────────────────────────────────────────────────────
// Chaque provider (AviationStack, CustomFIDS, Mock) doit implémenter cette
// interface. Le reste du système n'appelle JAMAIS directement un provider :
// tout passe par getFlightProvider() depuis FlightProviderFactory.
// ─────────────────────────────────────────────────────────────────────────────

/** Format standardisé pour les données de statut d'un vol */
export interface FlightStatusData {
  flightNumber: string
  airline: string
  departureCode: string
  arrivalCode: string
  departureCity?: string
  arrivalCity?: string
  scheduledDep?: string
  scheduledArr?: string
  actualDep?: string
  actualArr?: string
  estimatedDep?: string
  estimatedArr?: string
  gate?: string
  terminal?: string
  status: string
  delayMinutes: number
  aircraft?: string
  aircraftType?: string
}

/** Format standardisé pour les résultats de recherche de vols */
export interface FlightSearchResult {
  flights: FlightSearchItem[]
  totalResults: number
  cheapestPrice?: number
}

export interface FlightSearchItem {
  id: string
  flightNumber: string
  airline: string
  departureCode: string
  arrivalCode: string
  departureCity?: string
  arrivalCity?: string
  departureTime?: string
  arrivalTime?: string
  duration?: string
  stops?: number
  price?: number
  currency?: string
  seatsAvailable?: number
  aircraftType?: string
  class?: string
}

/** Format standardisé pour les données d'un aéroport */
export interface AirportData {
  iataCode: string
  name: string
  city?: string
  country?: string
}

/** Résultat de test de connexion */
export interface ProviderTestResult {
  success: boolean
  message: string
  latencyMs?: number
  sample?: FlightStatusData
}

/** Paramètres de recherche */
export interface FlightSearchParams {
  departureCode: string
  arrivalCode?: string
  date?: string
  flightNumber?: string
  passengers?: number
}

/** Paramètres de statut */
export interface FlightStatusParams {
  flightNumber: string
  date?: string
}

// ─── Interface principale ─────────────────────────────────────────────────

export interface IFlightProvider {
  /** Identifiant unique du provider */
  readonly id: string

  /** Nom lisible du provider */
  readonly name: string

  /** Obtenir le statut d'un vol */
  getFlightStatus(params: FlightStatusParams): Promise<FlightStatusData>

  /** Rechercher des vols */
  searchFlights(params: FlightSearchParams): Promise<FlightSearchResult>

  /** Rechercher des aéroports */
  searchAirports(query: string): Promise<AirportData[]>

  /** Tester la connexion au provider */
  testConnection(): Promise<ProviderTestResult>
}
