// ─────────────────────────────────────────────────────────────────────────────
// MockProvider — Provider de données statiques pour développement et tests
// ─────────────────────────────────────────────────────────────────────────────
// Retourne des données réalistes basées sur l'aéroport AIBD (DSS / Dakar).
// Utilisé en Mode Test et comme fallback ultime.
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

// ─── Données statiques ────────────────────────────────────────────────────────

const MOCK_STATUSES: Record<string, FlightStatusData> = {
  AF123: {
    flightNumber: 'AF123',
    airline: 'Air France',
    departureCode: 'DSS',
    arrivalCode: 'CDG',
    departureCity: 'Dakar',
    arrivalCity: 'Paris CDG',
    scheduledDep: '2025-07-15T08:30:00Z',
    scheduledArr: '2025-07-15T18:45:00Z',
    estimatedDep: '2025-07-15T09:15:00Z',
    estimatedArr: '2025-07-15T19:30:00Z',
    gate: 'A12',
    terminal: 'T1',
    status: 'delayed',
    delayMinutes: 45,
    aircraft: 'F-GSPK',
    aircraftType: 'A330-200',
  },
  SN201: {
    flightNumber: 'SN201',
    airline: 'Brussels Airlines',
    departureCode: 'DSS',
    arrivalCode: 'BRU',
    departureCity: 'Dakar',
    arrivalCity: 'Bruxelles',
    scheduledDep: '2025-07-15T22:00:00Z',
    scheduledArr: '2025-07-16T06:30:00Z',
    gate: 'B05',
    terminal: 'T2',
    status: 'scheduled',
    delayMinutes: 0,
    aircraft: 'OO-SFP',
    aircraftType: 'A330-300',
  },
  HC301: {
    flightNumber: 'HC301',
    airline: 'Air Sénégal',
    departureCode: 'DSS',
    arrivalCode: 'CDG',
    departureCity: 'Dakar',
    arrivalCity: 'Paris CDG',
    scheduledDep: '2025-07-15T10:00:00Z',
    scheduledArr: '2025-07-15T16:30:00Z',
    gate: 'A03',
    terminal: 'T1',
    status: 'boarding',
    delayMinutes: 0,
    aircraft: '6V-AAH',
    aircraftType: 'A321neo',
  },
  ET509: {
    flightNumber: 'ET509',
    airline: 'Ethiopian Airlines',
    departureCode: 'DSS',
    arrivalCode: 'ADD',
    departureCity: 'Dakar',
    arrivalCity: 'Addis-Ababa',
    scheduledDep: '2025-07-15T23:30:00Z',
    scheduledArr: '2025-07-16T06:00:00Z',
    gate: 'C01',
    terminal: 'T1',
    status: 'scheduled',
    delayMinutes: 0,
    aircraftType: 'B787-8',
  },
  TK587: {
    flightNumber: 'TK587',
    airline: 'Turkish Airlines',
    departureCode: 'DSS',
    arrivalCode: 'IST',
    departureCity: 'Dakar',
    arrivalCity: 'Istanbul',
    scheduledDep: '2025-07-15T03:45:00Z',
    scheduledArr: '2025-07-15T11:20:00Z',
    actualDep: '2025-07-15T03:50:00Z',
    gate: 'B02',
    terminal: 'T2',
    status: 'in_flight',
    delayMinutes: 5,
    aircraftType: 'A321',
  },
  EK793: {
    flightNumber: 'EK793',
    airline: 'Emirates',
    departureCode: 'DSS',
    arrivalCode: 'DXB',
    departureCity: 'Dakar',
    arrivalCity: 'Dubai',
    scheduledDep: '2025-07-15T14:15:00Z',
    scheduledArr: '2025-07-16T01:00:00Z',
    gate: 'A08',
    terminal: 'T1',
    status: 'scheduled',
    delayMinutes: 0,
    aircraftType: 'B777-300ER',
  },
}

const MOCK_AIRLINES = [
  { name: 'Air Sénégal', code: 'HC' },
  { name: 'Air France', code: 'AF' },
  { name: 'Brussels Airlines', code: 'SN' },
  { name: 'Royal Air Maroc', code: 'AT' },
  { name: 'Emirates', code: 'EK' },
  { name: 'Ethiopian Airlines', code: 'ET' },
  { name: 'Turkish Airlines', code: 'TK' },
  { name: 'ASKY Airlines', code: 'KP' },
  { name: 'RwandAir', code: 'WB' },
  { name: 'Kenya Airways', code: 'KQ' },
]

const MOCK_AIRPORTS: AirportData[] = [
  { iataCode: 'DSS', name: 'Aéroport International Blaise Diagne', city: 'Dakar', country: 'Sénégal' },
  { iataCode: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France' },
  { iataCode: 'ORY', name: 'Orly', city: 'Paris', country: 'France' },
  { iataCode: 'BRU', name: 'Brussels Airport', city: 'Bruxelles', country: 'Belgique' },
  { iataCode: 'ADD', name: 'Bole International', city: 'Addis-Ababa', country: 'Éthiopie' },
  { iataCode: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'EAU' },
  { iataCode: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turquie' },
  { iataCode: 'CMN', name: 'Mohammed V', city: 'Casablanca', country: 'Maroc' },
  { iataCode: 'NBO', name: 'Jomo Kenyatta', city: 'Nairobi', country: 'Kenya' },
  { iataCode: 'ACC', name: 'Kotoka International', city: 'Accra', country: 'Ghana' },
  { iataCode: 'ABJ', name: 'Félix Houphouët-Boigny', city: 'Abidjan', country: 'Côte d\'Ivoire' },
  { iataCode: 'LIS', name: 'Humberto Delgado', city: 'Lisbonne', country: 'Portugal' },
  { iataCode: 'MAD', name: 'Barajas', city: 'Madrid', country: 'Espagne' },
  { iataCode: 'FCO', name: 'Leonardo da Vinci', city: 'Rome', country: 'Italie' },
  { iataCode: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'États-Unis' },
]

const CITY_NAMES: Record<string, string> = {
  DSS: 'Dakar', DKR: 'Dakar', CDG: 'Paris', ORY: 'Paris', BRU: 'Bruxelles',
  NCE: 'Nice', LIS: 'Lisbonne', CMN: 'Casablanca', ALG: 'Alger', TUN: 'Tunis',
  JFK: 'New York', LHR: 'Londres', DXB: 'Dubai', ADD: 'Addis-Ababa', NBO: 'Nairobi',
  ABJ: 'Abidjan', ACC: 'Accra', LOS: 'Lagos', IST: 'Istanbul', FCO: 'Rome',
  MAD: 'Madrid', BCN: 'Barcelone', MRS: 'Marseille', JNB: 'Johannesbourg',
}

function getCityName(code: string): string {
  return CITY_NAMES[code.toUpperCase()] || code
}

// ─── Provider Implementation ─────────────────────────────────────────────────

export class MockProvider implements IFlightProvider {
  readonly id = 'MOCK'
  readonly name = 'Mode Test (Mock)'

  async getFlightStatus(params: FlightStatusParams): Promise<FlightStatusData> {
    const { flightNumber } = params
    const upper = flightNumber.toUpperCase().trim()

    const cached = MOCK_STATUSES[upper]
    if (cached) return { ...cached }

    // Générer des données génériques pour un vol inconnu
    return {
      flightNumber: upper,
      airline: 'Compagnie inconnue',
      departureCode: 'DSS',
      arrivalCode: 'CDG',
      departureCity: 'Dakar',
      arrivalCity: 'Paris',
      scheduledDep: '2025-07-15T14:00:00Z',
      scheduledArr: '2025-07-15T20:00:00Z',
      gate: 'A01',
      terminal: 'T1',
      status: 'scheduled',
      delayMinutes: 0,
      aircraftType: 'B737-800',
    }
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResult> {
    const { departureCode, arrivalCode, date, flightNumber, passengers } = params
    const depCode = departureCode.toUpperCase().trim()
    const arrCode = (arrivalCode || '').toUpperCase().trim()

    // Si on cherche un vol spécifique par numéro
    if (flightNumber) {
      const upper = flightNumber.toUpperCase().trim()
      const status = MOCK_STATUSES[upper]
      if (status) {
        return {
          flights: [{
            id: `FLT-MOCK-${upper}`,
            flightNumber: status.flightNumber,
            airline: status.airline,
            departureCode: status.departureCode,
            arrivalCode: status.arrivalCode,
            departureCity: status.departureCity,
            arrivalCity: status.arrivalCity,
            departureTime: status.scheduledDep,
            arrivalTime: status.scheduledArr,
            duration: '4h30',
            stops: 0,
            price: 250000,
            currency: 'XOF',
            seatsAvailable: 8,
            aircraftType: status.aircraftType,
            class: 'Economy',
          }],
          totalResults: 1,
          cheapestPrice: 250000,
        }
      }
    }

    // Sinon, générer des résultats aléatoires
    const airlines = MOCK_AIRLINES.slice(0, 3 + Math.floor(Math.random() * 4))
    const results = airlines.map((airline, i) => {
      const hours = 4 + Math.floor(Math.random() * 8)
      const depHour = 6 + i * 3
      const price = 150000 + Math.floor(Math.random() * 350000)
      const stops = Math.random() > 0.6 ? 1 : 0
      const arrIata = arrCode || ['CDG', 'BRU', 'ADD', 'DXB', 'IST', 'CMN'][i % 6]

      return {
        id: `FLT-MOCK-${Date.now()}-${i}`,
        flightNumber: `${airline.code}${100 + Math.floor(Math.random() * 900)}`,
        airline: airline.name,
        departureCode: depCode,
        arrivalCode: arrIata,
        departureCity: getCityName(depCode),
        arrivalCity: getCityName(arrIata),
        departureTime: `${date || '2025-07-15'}T${String(depHour).padStart(2, '0')}:00:00Z`,
        arrivalTime: `${date || '2025-07-15'}T${String(depHour + hours).padStart(2, '0')}:00:00Z`,
        duration: `${hours}h${Math.floor(Math.random() * 60)}m`,
        stops,
        price,
        currency: 'XOF',
        seatsAvailable: 2 + Math.floor(Math.random() * 15),
        aircraftType: ['A320', 'B737', 'A330', 'B787', 'A321neo'][Math.floor(Math.random() * 5)],
        class: 'Economy',
      }
    })

    return {
      flights: results,
      totalResults: results.length,
      cheapestPrice: Math.min(...results.map((r) => r.price)),
    }
  }

  async searchAirports(query: string): Promise<AirportData[]> {
    const q = query.toUpperCase().trim()
    return MOCK_AIRPORTS.filter(
      (a) =>
        a.iataCode.includes(q) ||
        a.name.toUpperCase().includes(q) ||
        a.city?.toUpperCase().includes(q) ||
        a.country?.toUpperCase().includes(q)
    )
  }

  async testConnection(): Promise<ProviderTestResult> {
    return {
      success: true,
      message: 'Mode Mock actif — données de test disponibles',
      latencyMs: 0,
      sample: MOCK_STATUSES.HC301,
    }
  }
}
