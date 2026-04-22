import { NextRequest, NextResponse } from 'next/server'

const FLIGHT_SERVICE_URL = 'http://localhost:3006'

// Local airport codes database
const AIRPORT_DATABASE: Record<string, { code: string; name: string; city: string; country: string }> = {
  // Senegal
  DSS: { code: 'DSS', name: 'Aéroport International Blaise Diagne', city: 'Dakar', country: 'Sénégal' },
  // France
  CDG: { code: 'CDG', name: 'Charles de Gaulle International Airport', city: 'Paris', country: 'France' },
  ORY: { code: 'ORY', name: 'Paris Orly Airport', city: 'Paris', country: 'France' },
  MRS: { code: 'MRS', name: 'Marseille Provence Airport', city: 'Marseille', country: 'France' },
  LYS: { code: 'LYS', name: 'Lyon-Saint Exupéry Airport', city: 'Lyon', country: 'France' },
  NCE: { code: 'NCE', name: 'Nice Côte d\'Azur Airport', city: 'Nice', country: 'France' },
  // Belgium
  BRU: { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'Belgium' },
  // Morocco
  CMN: { code: 'CMN', name: 'Mohammed V International Airport', city: 'Casablanca', country: 'Morocco' },
  RAK: { code: 'RAK', name: 'Marrakech Menara Airport', city: 'Marrakech', country: 'Morocco' },
  // Algeria
  ALG: { code: 'ALG', name: 'Houari Boumediene Airport', city: 'Algiers', country: 'Algeria' },
  // Tunisia
  TUN: { code: 'TUN', name: 'Tunis-Carthage International Airport', city: 'Tunis', country: 'Tunisia' },
  // USA
  JFK: { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
  IAD: { code: 'IAD', name: 'Washington Dulles International Airport', city: 'Washington', country: 'USA' },
  // UK
  LHR: { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
  LGW: { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'United Kingdom' },
  // UAE
  DXB: { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
  AUH: { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'UAE' },
  // Ethiopia
  ADD: { code: 'ADD', name: 'Bole International Airport', city: 'Addis Ababa', country: 'Ethiopia' },
  // Kenya
  NBO: { code: 'NBO', name: 'Jomo Kenyatta International Airport', city: 'Nairobi', country: 'Kenya' },
  // DRC
  FIH: { code: 'FIH', name: 'N\'djili International Airport', city: 'Kinshasa', country: 'DRC' },
  // Congo
  BZV: { code: 'BZV', name: 'Maya-Maya Airport', city: 'Brazzaville', country: 'Congo' },
  // Gabon
  LBV: { code: 'LBV', name: 'Léon M\'ba International Airport', city: 'Libreville', country: 'Gabon' },
  // Ivory Coast
  ABJ: { code: 'ABJ', name: 'Félix-Houphouët-Boigny International Airport', city: 'Abidjan', country: 'Côte d\'Ivoire' },
  // Ghana
  ACC: { code: 'ACC', name: 'Kotoka International Airport', city: 'Accra', country: 'Ghana' },
  // Nigeria
  LOS: { code: 'LOS', name: 'Murtala Muhammed International Airport', city: 'Lagos', country: 'Nigeria' },
  // Mauritius
  MRU: { code: 'MRU', name: 'Sir Seewoosagur Ramgoolam International Airport', city: 'Mauritius', country: 'Mauritius' },
  // South Africa
  JNB: { code: 'JNB', name: 'O.R. Tambo International Airport', city: 'Johannesburg', country: 'South Africa' },
  CPT: { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', country: 'South Africa' },
  // Egypt
  CAI: { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'Egypt' },
  // Turkey
  IST: { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey' },
  // Italy
  FCO: { code: 'FCO', name: 'Leonardo da Vinci–Fiumicino Airport', city: 'Rome', country: 'Italy' },
  // Spain
  MAD: { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas Airport', city: 'Madrid', country: 'Spain' },
  BCN: { code: 'BCN', name: 'Josep Tarradellas Barcelona-El Prat Airport', city: 'Barcelona', country: 'Spain' },
  // Portugal
  LIS: { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'Portugal' },
  // Mali
  BKO: { code: 'BKO', name: 'Modibo Keita International Airport', city: 'Bamako', country: 'Mali' },
  // Guinea
  CKY: { code: 'CKY', name: 'Conakry International Airport', city: 'Conakry', country: 'Guinea' },
  // Burkina Faso
  OUA: { code: 'OUA', name: 'Ouagadougou Airport', city: 'Ouagadougou', country: 'Burkina Faso' },
  // Niger
  NIM: { code: 'NIM', name: 'Diori Hamani International Airport', city: 'Niamey', country: 'Niger' },
  // Chad
  NDJ: { code: 'NDJ', name: 'N\'Djamena International Airport', city: 'N\'Djamena', country: 'Chad' },
  // Cameroon
  DLA: { code: 'DLA', name: 'Douala International Airport', city: 'Douala', country: 'Cameroon' },
  NSI: { code: 'NSI', name: 'Nsimalem International Airport', city: 'Yaoundé', country: 'Cameroon' },
  // Benin
  COO: { code: 'COO', name: 'Cadjehoun Airport', city: 'Cotonou', country: 'Benin' },
  // Togo
  LFW: { code: 'LFW', name: 'Lomé–Tokoin Airport', city: 'Lomé', country: 'Togo' },
  // Sao Tome
  TMS: { code: 'TMS', name: 'São Tomé International Airport', city: 'São Tomé', country: 'São Tomé & Príncipe' },
  // Cape Verde
  RAI: { code: 'RAI', name: 'Nelson Mandela International Airport', city: 'Praia', country: 'Cape Verde' },
  // Gambia
  BJL: { code: 'BJL', name: 'Banjul International Airport', city: 'Banjul', country: 'Gambia' },
  // Guinea-Bissau
  OXB: { code: 'OXB', name: 'Osvaldo Vieira International Airport', city: 'Bissau', country: 'Guinea-Bissau' },
}

function searchLocalAirports(query: string) {
  if (!query || query.length < 1) return []

  const q = query.toLowerCase().trim()
  const results = Object.values(AIRPORT_DATABASE).filter((airport) => {
    return (
      airport.code.toLowerCase().includes(q) ||
      airport.name.toLowerCase().includes(q) ||
      airport.city.toLowerCase().includes(q) ||
      airport.country.toLowerCase().includes(q)
    )
  })

  return results.map((airport) => ({
    code: airport.code,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    display: `${airport.city} (${airport.code})`,
  }))
}

// GET /api/flights/airports?q=dakar
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Query parameter "q" is required',
      }, { status: 400 })
    }

    // Step 1: Try flight-service proxy
    try {
      const response = await fetch(
        `${FLIGHT_SERVICE_URL}/api/airports?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(15000),
        }
      )

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          success: true,
          data: data.results || data.data || data,
        })
      }
    } catch {
      // flight-service unavailable, continue with fallback
      console.warn('flight-service (port 3006) unavailable, using local airport search')
    }

    // Step 2: Fallback to local search
    const results = searchLocalAirports(query)

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
    })
  } catch (error) {
    console.error('Error searching airports:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to search airports' },
      { status: 500 }
    )
  }
}
