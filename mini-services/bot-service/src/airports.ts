// ============================================================================
// MAELLIS Airport Bot — Comprehensive Airport Codes Database
// ============================================================================

/**
 * City name (lowercase) → IATA airport code mapping.
 * Covers Africa (priority), Europe, Americas, Asia, Middle East, Oceania.
 */
export const AIRPORT_CODES: Record<string, string> = {
  // ---- Africa (Priority airports for MAELLIS) ----
  "dakar": "DSS",
  "dss": "DSS",
  "abidjan": "ABJ",
  "abj": "ABJ",
  "bamako": "BKO",
  "bko": "BKO",
  "ouagadougou": "OUA",
  "oua": "OUA",
  "lagos": "LOS",
  "los": "LOS",
  "accra": "ACC",
  "acc": "ACC",
  "nairobi": "NBO",
  "nbo": "NBO",
  "casablanca": "CMN",
  "cmn": "CMN",
  "marrakech": "RAK",
  "tunis": "TUN",
  "tun": "TUN",
  "algiers": "ALG",
  "alg": "ALG",
  "cairo": "CAI",
  "cai": "CAI",
  "addis ababa": "ADD",
  "add": "ADD",
  "johannesburg": "JNB",
  "jnb": "JNB",
  "cape town": "CPT",
  "cpt": "CPT",
  "durban": "DUR",
  "abuja": "ABV",
  "dar es salaam": "DAR",
  "monrovia": "ROB",
  "freetown": "FNA",
  "conakry": "CKY",
  "bissau": "OXB",
  "nouakchott": "NKC",
  "niamey": "NIM",
  "ndjamena": "NDJ",
  "libreville": "LBV",
  "douala": "DLA",
  "yaounde": "NSI",
  "kinshasa": "FIH",
  "luanda": "LAD",
  "maputo": "MPM",
  "antananarivo": "TNR",
  "mauritius": "MRU",
  "kigali": "KGL",
  "bujumbura": "BJM",
  "djibouti": "JIB",
  "asmara": "ASM",
  "harare": "HRE",
  "lilongwe": "LLW",
  "lusaka": "LUN",
  "gaborone": "GBE",
  "windhoek": "WDH",
  "malabo": "SSG",
  "saotome": "TMS",

  // ---- North America ----
  "new york": "JFK",
  "nyc": "JFK",
  "los angeles": "LAX",
  "la": "LAX",
  "chicago": "ORD",
  "miami": "MIA",
  "houston": "IAH",
  "dallas": "DFW",
  "phoenix": "PHX",
  "philadelphia": "PHL",
  "atlanta": "ATL",
  "boston": "BOS",
  "san francisco": "SFO",
  "denver": "DEN",
  "seattle": "SEA",
  "las vegas": "LAS",
  "orlando": "MCO",
  "washington dc": "IAD",
  "toronto": "YYZ",
  "montreal": "YUL",
  "vancouver": "YVR",
  "calgary": "YYC",
  "edmonton": "YEG",
  "ottawa": "YOW",
  "winnipeg": "YWG",
  "halifax": "YHZ",
  "quebec": "YQB",
  "mexico city": "MEX",
  "cancun": "CUN",
  "guadalajara": "GDL",
  "monterrey": "MTY",

  // ---- Europe ----
  "london": "LHR",
  "paris": "CDG",
  "frankfurt": "FRA",
  "amsterdam": "AMS",
  "madrid": "MAD",
  "barcelona": "BCN",
  "rome": "FCO",
  "milan": "MXP",
  "venice": "VCE",
  "berlin": "BER",
  "munich": "MUC",
  "hamburg": "HAM",
  "zurich": "ZRH",
  "geneva": "GVA",
  "vienna": "VIE",
  "brussels": "BRU",
  "oslo": "OSL",
  "stockholm": "ARN",
  "copenhagen": "CPH",
  "helsinki": "HEL",
  "dublin": "DUB",
  "lisbon": "LIS",
  "porto": "OPO",
  "athens": "ATH",
  "prague": "PRG",
  "budapest": "BUD",
  "warsaw": "WAW",
  "bucharest": "OTP",
  "sofia": "SOF",
  "zagreb": "ZAG",

  // ---- Asia ----
  "tokyo": "HND",
  "osaka": "KIX",
  "seoul": "ICN",
  "beijing": "PEK",
  "shanghai": "PVG",
  "guangzhou": "CAN",
  "hong kong": "HKG",
  "taipei": "TPE",
  "singapore": "SIN",
  "kuala lumpur": "KUL",
  "jakarta": "CGK",
  "bangkok": "BKK",
  "phuket": "HKT",
  "manila": "MNL",
  "ho chi minh": "SGN",
  "hanoi": "HAN",
  "phnom penh": "PNH",
  "mumbai": "BOM",
  "delhi": "DEL",
  "bangalore": "BLR",
  "chennai": "MAA",
  "hyderabad": "HYD",
  "kolkata": "CCU",

  // ---- Middle East ----
  "dubai": "DXB",
  "abu dhabi": "AUH",
  "doha": "DOH",
  "riyadh": "RUH",
  "jeddah": "JED",
  "kuwait": "KWI",
  "muscat": "MCT",
  "manama": "BAH",
  "tel aviv": "TLV",
  "amman": "AMM",
  "beirut": "BEY",
  "istanbul": "IST",

  // ---- South America ----
  "sao paulo": "GRU",
  "rio de janeiro": "GIG",
  "buenos aires": "EZE",
  "santiago": "SCL",
  "lima": "LIM",
  "bogota": "BOG",
  "medellin": "MDE",

  // ---- Oceania ----
  "sydney": "SYD",
  "melbourne": "MEL",
  "brisbane": "BNE",
  "auckland": "AKL",
};

// Reverse lookup: IATA code → list of city names
const CODE_TO_CITY: Record<string, string[]> = {};
for (const [city, code] of Object.entries(AIRPORT_CODES)) {
  if (!CODE_TO_CITY[code]) CODE_TO_CITY[code] = [];
  CODE_TO_CITY[code].push(city);
}

/**
 * Find the IATA code for a given city name (case-insensitive).
 * Returns null if not found.
 */
export function findAirportCode(cityName: string): string | null {
  const lower = cityName.toLowerCase().trim();
  return AIRPORT_CODES[lower] ?? null;
}

/**
 * Find city name(s) for a given IATA code.
 */
export function findCityName(iataCode: string): string | null {
  const upper = iataCode.toUpperCase().trim();
  return CODE_TO_CITY[upper]?.[0] ?? null;
}

/**
 * Search airports by partial city name or code.
 */
export function searchAirports(query: string): Array<{ city: string; code: string }> {
  const lower = query.toLowerCase().trim();
  const results: Array<{ city: string; code: string }> = [];
  const seen = new Set<string>();

  for (const [city, code] of Object.entries(AIRPORT_CODES)) {
    const key = code;
    if (!seen.has(key) && (city.includes(lower) || code.toLowerCase() === lower)) {
      results.push({ city, code });
      seen.add(key);
    }
  }

  return results;
}

/**
 * Extract all recognized airport/city entities from a message.
 */
export function extractEntities(message: string): string[] {
  const found: string[] = [];
  const lower = message.toLowerCase();

  for (const [city, code] of Object.entries(AIRPORT_CODES)) {
    if (lower.includes(city) && city.length > 2) {
      found.push(`${city} (${code})`);
    }
  }

  // Also check for standalone IATA codes (3 uppercase letters)
  const codePattern = /\b([A-Z]{3})\b/g;
  let match: RegExpExecArray | null;
  while ((match = codePattern.exec(message)) !== null) {
    const c = match[1];
    if (CODE_TO_CITY[c] && !found.some((e) => e.includes(`(${c})`))) {
      found.push(`${CODE_TO_CITY[c][0]} (${c})`);
    }
  }

  return found;
}

export { CODE_TO_CITY };
