// ─────────────────────────────────────────────────────────────────────────────
// MAELLIS Airport Bot — OCR Service (Boarding Pass / Ticket Recognition)
// Hybrid provider system: Mock (sandbox) → Tesseract.js (local) → Google Vision (prod)
// ─────────────────────────────────────────────────────────────────────────────

import { db } from '@/lib/db'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface IOCRProvider {
  name: string
  extractText(imageData: string): Promise<OCRResult>
}

export interface OCRResult {
  text: string
  confidence: number // 0-100
  provider: string
  processingTimeMs: number
}

export interface TicketExtraction {
  pnr?: string | null
  flightNumber?: string | null
  airline?: string | null
  departureCode?: string | null
  arrivalCode?: string | null
  departureCity?: string | null
  arrivalCity?: string | null
  flightDate?: string | null
  seat?: string | null
  boardingTime?: string | null
  gate?: string | null
  terminal?: string | null
  passengerClass?: string | null
  passengerName?: string | null
  confidence: number
  rawText: string
  provider: string
}

export interface AnalyzeImageResult {
  success: boolean
  data?: TicketExtraction
  rawText?: string
  message?: string
  scanId?: string
}

type OCRProviderType = 'mock' | 'tesseract' | 'google'

// ─────────────────────────────────────────────
// Provider: Mock (Sandbox / Test)
// Returns realistic boarding pass text for parsing validation
// ─────────────────────────────────────────────

class MockProvider implements IOCRProvider {
  name = 'mock'

  async extractText(_imageData: string): Promise<OCRResult> {
    const start = Date.now()

    // Realistic boarding pass text with all extractable fields
    const mockText = [
      'AIR FRANCE',
      'BOARDING PASS',
      'Passenger: M. DIAGNE Mamadou',
      'PNR: KXH4M2',
      'Flight: AF  724',
      'From: DSS  Dakar  Senegal',
      'To:   CDG  Paris  France',
      'Date: 15 JUN 2025',
      'Gate: B12',
      'Terminal: 1',
      'Seat: 14A',
      'Boarding: 08:45',
      'Class: ECONOMY',
      'ETKT: 057-1234567890',
      'Seq: 001',
      'Departure: 09:30',
      'Arrival: 16:45',
    ].join('\n')

    return {
      text: mockText,
      confidence: 92,
      provider: this.name,
      processingTimeMs: Date.now() - start,
    }
  }
}

// ─────────────────────────────────────────────
// Provider: Tesseract.js (Local OCR)
// Uses tesseract.js for on-device text extraction
// NOTE: Requires `bun add tesseract.js` to install the package
// The import is fully dynamic to avoid Turbopack resolution issues
// ─────────────────────────────────────────────

class TesseractProvider implements IOCRProvider {
  name = 'tesseract'

  async extractText(imageData: string): Promise<OCRResult> {
    const start = Date.now()

    try {
      // Fully dynamic import that won't cause bundler issues
      const mod = await Function('return import("tesseract.js")')() as {
        recognize: (input: string, lang: string, opts?: Record<string, unknown>) => Promise<{
          data: { text: string; confidence: number }
        }>
      }

      // Determine if base64 or URL
      let imageInput: string
      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        imageInput = imageData
      } else {
        // Strip data URL prefix if present
        imageInput = imageData.replace(/^data:image\/\w+;base64,/, '')
      }

      const result = await mod.recognize(imageInput, 'fra+eng', {
        logger: () => {}, // Suppress progress logs in production
      })

      const text = result.data.text
      const confidence = Math.round(result.data.confidence)

      return {
        text,
        confidence,
        provider: this.name,
        processingTimeMs: Date.now() - start,
      }
    } catch (error) {
      console.error('[ocr.service] TesseractProvider failed:', error)
      throw new Error(`Tesseract OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// ─────────────────────────────────────────────
// Provider: Google Cloud Vision (Production)
// Requires GOOGLE_VISION_API_KEY env var
// ─────────────────────────────────────────────

class GoogleVisionProvider implements IOCRProvider {
  name = 'google'

  async extractText(imageData: string): Promise<OCRResult> {
    const start = Date.now()
    const apiKey = process.env.GOOGLE_VISION_API_KEY

    if (!apiKey) {
      throw new Error('GOOGLE_VISION_API_KEY is not configured. Set it in .env to use Google Vision.')
    }

    try {
      // Prepare image content
      let imageContent: { content: string } | { source: { imageUri: string } }

      if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
        imageContent = { source: { imageUri: imageData } }
      } else {
        // Strip data URL prefix and decode base64
        const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
        imageContent = { content: base64Data }
      }

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                image: imageContent,
                features: [
                  { type: 'TEXT_DETECTION', maxResults: 1 },
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
                ],
                imageContext: {
                  languageHints: ['fr', 'en', 'wo'],
                },
              },
            ],
          }),
        },
      )

      if (!response.ok) {
        const err = await response.json()
        console.error('[ocr.service] Google Vision API error:', err)
        throw new Error(`Google Vision API error: ${response.status}`)
      }

      const data = await response.json()
      const annotation = data.responses?.[0]

      if (!annotation?.fullTextAnnotation?.text) {
        return {
          text: '',
          confidence: 0,
          provider: this.name,
          processingTimeMs: Date.now() - start,
        }
      }

      const text = annotation.fullTextAnnotation.text

      // Calculate average confidence from text annotations
      const textAnnotations = annotation.textAnnotations || []
      let totalConfidence = 0
      let confidenceCount = 0
      for (const ta of textAnnotations) {
        if (ta.confidence !== undefined) {
          totalConfidence += ta.confidence
          confidenceCount++
        }
      }
      const avgConfidence = confidenceCount > 0
        ? Math.round((totalConfidence / confidenceCount) * 100)
        : 75

      return {
        text,
        confidence: avgConfidence,
        provider: this.name,
        processingTimeMs: Date.now() - start,
      }
    } catch (error) {
      console.error('[ocr.service] GoogleVisionProvider failed:', error)
      if (error instanceof Error && error.message.includes('GOOGLE_VISION_API_KEY')) {
        throw error
      }
      throw new Error(`Google Vision failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// ─────────────────────────────────────────────
// Provider Factory (Lazy instantiation — only creates the provider when needed)
// ─────────────────────────────────────────────

function getProvider(): IOCRProvider {
  const providerType = (process.env.OCR_PROVIDER || 'mock') as OCRProviderType

  switch (providerType) {
    case 'tesseract':
      return new TesseractProvider()
    case 'google':
      return new GoogleVisionProvider()
    case 'mock':
    default:
      return new MockProvider()
  }
}

// ─────────────────────────────────────────────
// IATA Airline Code Mapping
// ─────────────────────────────────────────────

const AIRLINE_CODES: Record<string, string> = {
  AF: 'Air France',
  '2S': 'Air Senegal',
  SN: 'Brussels Airlines',
  ET: 'Ethiopian Airlines',
  TK: 'Turkish Airlines',
  EK: 'Emirates',
  QR: 'Qatar Airways',
  IB: 'Iberia',
  LH: 'Lufthansa',
  BA: 'British Airways',
  RB: 'Syrianair',
  IY: 'Yemenia',
  UM: 'Air Maroc',
  AT: 'Royal Air Maroc',
  HF: 'Air Côte d\'Ivoire',
  PN: 'Pan African Airlines',
  HT: 'Air Togo',
  EN: 'Air Guinée',
  R6: 'Air Burkina',
  UG: 'Uganda Airlines',
  KQ: 'Kenya Airways',
  SA: 'South African Airways',
  MS: 'EgyptAir',
  AI: 'Air India',
  DL: 'Delta Air Lines',
  AA: 'American Airlines',
  UA: 'United Airlines',
  UX: 'Air Europa',
  TP: 'TAP Air Portugal',
  SK: 'SAS Scandinavian',
  AY: 'Finnair',
  OS: 'Austrian Airlines',
  LX: 'Swiss International',
  AZ: 'ITA Airways',
  OK: 'Czech Airlines',
  BJ: 'Air Benin',
  C5: 'Camair-Co',
  HC: 'Air Côte d\'Ivoire Express',
  KP: 'ASKY Airlines',
  ZI: 'Aigle Azur',
  SS: 'Corsair International',
  TO: 'Transavia France',
  YN: 'Air Algerie',
  AH: 'Air Algerie',
  TU: 'Tunisair',
  SV: 'Saudi Arabian Airlines',
  RJ: 'Royal Jordanian',
  ME: 'Middle East Airlines',
  WY: 'Oman Air',
  GF: 'Gulf Air',
  '9W': 'Jet Airways',
  '6E': 'IndiGo',
  SG: 'SpiceJet',
  I5: 'AirAsia India',
}

// ─────────────────────────────────────────────
// IATA Airport Code → City Mapping
// ─────────────────────────────────────────────

const AIRPORT_TO_CITY: Record<string, string> = {
  DSS: 'Dakar',
  ABJ: 'Abidjan',
  BKO: 'Bamako',
  OUA: 'Ouagadougou',
  CKY: 'Conakry',
  CMN: 'Casablanca',
  LOS: 'Lagos',
  ACC: 'Accra',
  NBO: 'Nairobi',
  JNB: 'Johannesburg',
  CAI: 'Cairo',
  ADD: 'Addis Ababa',
  CDG: 'Paris',
  ORY: 'Paris Orly',
  LYS: 'Lyon',
  MRS: 'Marseille',
  FCO: 'Rome',
  MAD: 'Madrid',
  BCN: 'Barcelona',
  LIS: 'Lisbon',
  LHR: 'London',
  FRA: 'Frankfurt',
  MUC: 'Munich',
  AMS: 'Amsterdam',
  BRU: 'Brussels',
  IST: 'Istanbul',
  DXB: 'Dubai',
  DOH: 'Doha',
  JFK: 'New York',
  IAD: 'Washington',
  MIA: 'Miami',
  YYZ: 'Toronto',
  GRU: 'Sao Paulo',
  EZE: 'Buenos Aires',
  BEY: 'Beirut',
  AMM: 'Amman',
  RUH: 'Riyadh',
  JED: 'Jeddah',
}

// ─────────────────────────────────────────────
// Regex Parsers
// ─────────────────────────────────────────────

function extractPNR(text: string): string | null {
  // PNR is typically 6 alphanumeric characters
  const patterns = [
    /(?:PNR|Code|Réf|Ref)[\s:]*([A-Z0-9]{6})/i,
    /(?:BOOKING|RESERVATION)[\s:]*([A-Z0-9]{6})/i,
    /\b([A-Z0-9]{6})\b(?:\s*(?:E-TICKET|ETKT|TICKET))/i,
    // Standalone 6-char alphanumeric (must not match words like "AF724")
    /(?:^|\n)\s*([A-Z]{2}[A-Z0-9]{4})\s*(?:$|\n)/m,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1].toUpperCase()
  }

  return null
}

function extractFlightNumber(text: string): string | null {
  // Flight number: 2-letter airline code + 2-4 digits
  const patterns = [
    /(?:Flight|Vol|FL)[\s:.]*([A-Z]{2})\s*(\d{2,4})/i,
    /([A-Z]{2})\s*(\d{2,4})(?:\s+(?:Departure|Arrival|From|To|Gate|Seat))/i,
    /(?:^|\n)\s*([A-Z]{2})\s*(\d{2,4})\s*(?:$|\n)/m,
    /\b([A-Z]{2})\s*(\d{3,4})\b/,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      const code = match[1].toUpperCase()
      const num = match[2].padStart(4, '0')
      return `${code}${num}`
    }
  }

  return null
}

function extractAirline(text: string, flightNumber?: string | null): string | null {
  // 1. Try from flight number prefix
  if (flightNumber && flightNumber.length >= 2) {
    const code = flightNumber.substring(0, 2).toUpperCase()
    if (AIRLINE_CODES[code]) {
      return AIRLINE_CODES[code]
    }
  }

  // 2. Try from airline name patterns in text
  const airlinePatterns = [
    /(?:AIR\s+)([A-Z\s]+?)(?:\n|$)/i,
    /((?:ROYAL\s+)?AIR\s+(?:FRANCE|SENEGAL|MAROC|ALGERIE|CÔTE|IVOIRE|BURKINA|TOGO|GUINÉE|BENIN|CAMEROON))/i,
    /(ETHIOPIAN\s+AIRLINES|TURKISH\s+AIRLINES|EMIRATES|QATAR\s+AIRWAYS|BRUSSELS\s+AIRLINES)/i,
    /(LUFTHANSA|IBERIA|BRITISH\s+AIRWAYS|SAS|FINNAIR|AUSTRIAN|SWISS|ITA\s+AIRWAYS)/i,
    /(DELTA|AMERICAN\s+AIRLINES|UNITED)/i,
  ]

  for (const pattern of airlinePatterns) {
    const match = pattern.exec(text)
    if (match) {
      return match[1].trim()
    }
  }

  return null
}

function extractAirportCodes(text: string): { departure: string | null; arrival: string | null } {
  const lines = text.split(/\n/)

  let departure: string | null = null
  let arrival: string | null = null

  // Pattern 1: "From: XXX city" / "To: XXX city" (strict)
  for (const line of lines) {
    const fromMatch = line.match(/(?:FROM|D[ÉE]PART)\s*[:.]?\s*([A-Z]{3})\b/i)
    if (fromMatch && AIRPORT_TO_CITY[fromMatch[1].toUpperCase()]) {
      departure = fromMatch[1].toUpperCase()
    }

    const toMatch = line.match(/(?:TO|DESTINATION|ARRIV[ÉE]E)\s*[:.]?\s*([A-Z]{3})\b/i)
    if (toMatch && AIRPORT_TO_CITY[toMatch[1].toUpperCase()]) {
      arrival = toMatch[1].toUpperCase()
    }

    // French pattern: "À XXX" (standalone)
    const frenchToMatch = line.match(/(?:\bÀ\s+)([A-Z]{3})\b/i)
    if (frenchToMatch && AIRPORT_TO_CITY[frenchToMatch[1].toUpperCase()]) {
      arrival = arrival || frenchToMatch[1].toUpperCase()
    }
  }

  // Pattern 2: "XXX → YYY" or "XXX - YYY" (arrow/dash between two codes)
  if (!departure || !arrival) {
    const routePattern = text.match(/\b([A-Z]{3})\s*(?:\u2192|\u2014|\u2013|-)\s*([A-Z]{3})\b/)
    if (routePattern) {
      const c1 = routePattern[1].toUpperCase()
      const c2 = routePattern[2].toUpperCase()
      if (AIRPORT_TO_CITY[c1]) departure = departure || c1
      if (AIRPORT_TO_CITY[c2]) arrival = arrival || c2
    }
  }

  // Pattern 3: Known airport codes found anywhere in the text (strict — must be in our dictionary)
  if (!departure || !arrival) {
    const allCodes: string[] = []
    for (const line of lines) {
      const codeMatches = line.matchAll(/\b([A-Z]{3})\b/g)
      for (const m of codeMatches) {
        const code = m[1].toUpperCase()
        // Only select codes that are known airport codes in our dictionary
        if (AIRPORT_TO_CITY[code]) {
          allCodes.push(code)
        }
      }
    }
    // Deduplicate preserving order
    const uniqueCodes = [...new Set(allCodes)]
    if (uniqueCodes.length >= 1 && !departure) departure = uniqueCodes[0]
    if (uniqueCodes.length >= 2 && !arrival) arrival = uniqueCodes[1]
  }

  return { departure, arrival }
}

function extractDate(text: string): string | null {
  // Pattern 1: DD MMM YYYY (15 JUN 2025)
  const months: Record<string, string> = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04',
    MAY: '05', JUN: '06', JUL: '07', AUG: '08',
    SEP: '09', OCT: '10', NOV: '11', DEC: '12',
    JANVIER: '01', 'FÉVRIER': '02', FEVRIER: '02', MARS: '03',
    AVRIL: '04', MAI: '05', JUIN: '06', JUILLET: '07',
    'AOÛT': '08', AOUT: '08', SEPTEMBRE: '09',
    OCTOBRE: '10', NOVEMBRE: '11', 'DÉCEMBRE': '12',
  }

  // DD MMM YYYY
  const dmyPattern = text.match(/(\d{1,2})\s+([A-Z]{3,9})\s+(\d{4})/i)
  if (dmyPattern) {
    const day = dmyPattern[1].padStart(2, '0')
    const monthStr = dmyPattern[2].toUpperCase()
    const year = dmyPattern[3]
    const month = months[monthStr] || months[monthStr.substring(0, 3)]
    if (month) return `${year}-${month}-${day}`
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const slashPattern = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
  if (slashPattern) {
    const day = slashPattern[1].padStart(2, '0')
    const month = slashPattern[2].padStart(2, '0')
    const year = slashPattern[3]
    return `${year}-${month}-${day}`
  }

  // YYYY-MM-DD (ISO)
  const isoPattern = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoPattern) return isoPattern[0]

  return null
}

function extractSeat(text: string): string | null {
  const patterns = [
    /(?:SEAT|SIÈGE|SIEGE|PLACE)\s*[:.]?\s*([0-9]{1,2}[A-K])/i,
    /\b([0-9]{1,2}[A-K])\b(?:\s+(?:WINDOW|AISLE|MIDDLE|MILIEU|HUBLOT|COULOIR))/i,
    // Seat pattern like "14A" or "3F" near flight-related text
    /(?:SEAT|SIÈGE)\s*[:.]?\s*([0-9]{1,2}[A-K])/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1].toUpperCase()
  }

  return null
}

function extractGate(text: string): string | null {
  const patterns = [
    /(?:GATE|PORTE)\s*[:.]?\s*([A-Z]?\d{1,3})/i,
    /\bGATE\s+([A-Z]?\d{1,3})\b/i,
    /\bPORTE\s+([A-Z]?\d{1,3})\b/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1].toUpperCase()
  }

  return null
}

function extractTerminal(text: string): string | null {
  const patterns = [
    /(?:TERMINAL|TERM)\s*[:.]?\s*(\d{1,2})/i,
    /\bTERMINAL\s+(\d{1,2})\b/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1]
  }

  return null
}

function extractBoardingTime(text: string): string | null {
  const patterns = [
    /(?:BOARDING|EMBARQUEMENT)\s*[:.]?\s*(\d{1,2}[:.]\d{2})/i,
    /\b(\d{1,2}h\d{2})\b/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) return match[1].replace('h', ':').replace('.', ':')
  }

  return null
}

function extractPassengerClass(text: string): string | null {
  const lower = text.toLowerCase()

  if (/\b(first|première|1ère|1ere|la première)\b/i.test(lower)) return 'first'
  if (/\b(business|affaires|classe\s*affaires)\b/i.test(lower)) return 'business'
  if (/\b(econom[yi]|eco|éco|y|coach|touriste)\b/i.test(lower)) return 'economy'
  if (/\b(premium\s*econom[yi]|premium\s*eco)\b/i.test(lower)) return 'premium_economy'

  return null
}

function extractPassengerName(text: string): string | null {
  const patterns = [
    // "Passenger: M. DIAGNE Mamadou" → extract the full name after the title
    /(?:PASSAGER|PASSENGER|PAX)\s*[:.]?\s*(?:M\.|Mme\.|Mr\.|Ms\.)\s*([A-Za-z\s\-'.]{3,40})/i,
    // "NOM: John Doe" or "NAME: John Doe"
    /(?:NOM|NAME)\s*[:.]?\s*([A-Za-z\s\-'.]{3,40})/i,
    // "MR John Doe" or "MME Jane Smith"
    /(?:MR|MME|MADAME|MONSIEUR)\s+([A-Za-z\s\-'.]{3,40})/i,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      let name = match[1].trim()
      // Clean up: remove trailing non-name text (stop at newline)
      name = name.split(/\n/)[0].trim()
      // Must have at least a first and last name (2+ words)
      if (name.split(/\s+/).length >= 2) {
        return name
      }
    }
  }

  return null
}

// ─────────────────────────────────────────────
// Main extraction function
// ─────────────────────────────────────────────

function parseBoardingPass(rawText: string): TicketExtraction {
  // Normalize text: remove excessive whitespace but preserve line structure
  const text = rawText.replace(/\r\n/g, '\n').replace(/\t/g, ' ').replace(/ +/g, ' ')

  // Extract all fields
  const pnr = extractPNR(text)
  const flightNumber = extractFlightNumber(text)
  const airline = extractAirline(text, flightNumber)
  const { departure: departureCode, arrival: arrivalCode } = extractAirportCodes(text)
  const flightDate = extractDate(text)
  const seat = extractSeat(text)
  const gate = extractGate(text)
  const terminal = extractTerminal(text)
  const boardingTime = extractBoardingTime(text)
  const passengerClass = extractPassengerClass(text)
  const passengerName = extractPassengerName(text)

  // Map airport codes to cities
  const departureCity = departureCode ? (AIRPORT_TO_CITY[departureCode] || null) : null
  const arrivalCity = arrivalCode ? (AIRPORT_TO_CITY[arrivalCode] || null) : null

  // Calculate overall confidence based on what we extracted
  const fields = [pnr, flightNumber, airline, departureCode, arrivalCode, flightDate]
  const foundFields = fields.filter(Boolean).length
  const confidence = Math.round((foundFields / fields.length) * 100)

  return {
    pnr,
    flightNumber,
    airline,
    departureCode,
    arrivalCode,
    departureCity,
    arrivalCity,
    flightDate,
    seat,
    boardingTime,
    gate,
    terminal,
    passengerClass,
    passengerName,
    confidence,
    rawText: text,
    provider: '',
  }
}

// ─────────────────────────────────────────────
// 1. analyzeImage — Main OCR pipeline
// ─────────────────────────────────────────────

export async function analyzeImage(params: {
  imageData: string // base64 or URL
  phone: string
  source?: string
}): Promise<AnalyzeImageResult> {
  const { imageData, phone, source = 'whatsapp' } = params

  if (!imageData) {
    return { success: false, message: 'Aucune image fournie.' }
  }

  if (!phone) {
    return { success: false, message: 'Numéro de téléphone requis.' }
  }

  try {
    // Step 1: Get the configured OCR provider
    const provider = getProvider()
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ocr.service] Using provider: ${provider.name}`)
    }

    // Step 2: Extract text from image
    const ocrResult = await provider.extractText(imageData)

    if (!ocrResult.text || ocrResult.text.trim().length < 10) {
      // Not enough text extracted — might not be a boarding pass
      const scan = await db.ticketScan.create({
        data: {
          id: crypto.randomUUID(),
          phone,
          rawText: ocrResult.text || '',
          confidence: 0,
          provider: ocrResult.provider,
          status: 'rejected',
          rejectedAt: new Date(),
          source,
          updatedAt: new Date(),
        },
      })

      return {
        success: false,
        message: "Je n'ai pas pu lire de texte sur cette image. Est-ce bien une carte d'embarquement ? Envoyez-moi votre code PNR (6 caractères) pour continuer.",
        scanId: scan.id,
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ocr.service] OCR extracted ${ocrResult.text.length} chars in ${ocrResult.processingTimeMs}ms (confidence: ${ocrResult.confidence}%)`)
    }

    // Step 3: Parse the extracted text for boarding pass fields
    const extraction = parseBoardingPass(ocrResult.text)
    extraction.provider = ocrResult.provider

    // Use the lower of OCR confidence and extraction confidence
    extraction.confidence = Math.min(ocrResult.confidence, extraction.confidence)

    if (process.env.NODE_ENV === 'development') {
      console.log(`[ocr.service] Extraction result:`, JSON.stringify({
        pnr: extraction.pnr,
        flight: extraction.flightNumber,
        airline: extraction.airline,
        route: `${extraction.departureCode || '?'} → ${extraction.arrivalCode || '?'}`,
        date: extraction.flightDate,
        confidence: extraction.confidence,
      }))
    }

    // Step 4: Check if minimum viable data was extracted (PNR or flight number)
    const hasMinimum = extraction.pnr || extraction.flightNumber

    // Step 5: Persist to database
    const scan = await db.ticketScan.create({
      data: {
        id: crypto.randomUUID(),
        phone,
        passengerName: extraction.passengerName || null,
        pnr: extraction.pnr || null,
        flightNumber: extraction.flightNumber || null,
        airline: extraction.airline || null,
        departureCode: extraction.departureCode || null,
        arrivalCode: extraction.arrivalCode || null,
        departureCity: extraction.departureCity || null,
        arrivalCity: extraction.arrivalCity || null,
        flightDate: extraction.flightDate || null,
        seat: extraction.seat || null,
        boardingTime: extraction.boardingTime || null,
        gate: extraction.gate || null,
        terminal: extraction.terminal || null,
        class: extraction.passengerClass || null,
        rawText: extraction.rawText,
        confidence: extraction.confidence,
        provider: extraction.provider,
        status: hasMinimum ? 'pending' : 'rejected',
        rejectedAt: hasMinimum ? null : new Date(),
        source,
        updatedAt: new Date(),
      },
    })

    // Step 6: Return result
    if (hasMinimum && extraction.confidence >= 30) {
      return {
        success: true,
        data: extraction,
        rawText: extraction.rawText,
        scanId: scan.id,
      }
    }

    return {
      success: false,
      message: "Je n'ai pas bien lu votre billet. Pouvez-vous me donner votre code PNR (6 caractères) ou le numéro de vol ?",
      scanId: scan.id,
    }
  } catch (error) {
    console.error('[ocr.service] analyzeImage failed:', error)

    // Try to save a failed scan record
    try {
      await db.ticketScan.create({
        data: {
          id: crypto.randomUUID(),
          phone,
          rawText: '',
          confidence: 0,
          provider: getProvider().name,
          status: 'rejected',
          rejectedAt: new Date(),
          source,
          metadata: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown' }),
          updatedAt: new Date(),
        },
      })
    } catch {
      // Ignore save errors
    }

    return {
      success: false,
      message: "Une erreur est survenue lors de l'analyse de votre image. Veuillez réessayer ou saisir vos informations manuellement.",
    }
  }
}

// ─────────────────────────────────────────────
// 2. confirmScan — User confirms OCR extraction
// ─────────────────────────────────────────────

export async function confirmScan(scanId: string) {
  try {
    const scan = await db.ticketScan.findUnique({ where: { id: scanId } })
    if (!scan) {
      throw new Error(`TicketScan "${scanId}" not found`)
    }

    if (scan.status !== 'pending') {
      throw new Error(`Cannot confirm scan with status "${scan.status}"`)
    }

    return db.ticketScan.update({
      where: { id: scanId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[ocr.service] confirmScan failed:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 3. rejectScan — User rejects OCR extraction
// ─────────────────────────────────────────────

export async function rejectScan(scanId: string) {
  try {
    const scan = await db.ticketScan.findUnique({ where: { id: scanId } })
    if (!scan) {
      throw new Error(`TicketScan "${scanId}" not found`)
    }

    return db.ticketScan.update({
      where: { id: scanId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[ocr.service] rejectScan failed:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 4. getScans — List ticket scans (admin)
// ─────────────────────────────────────────────

export async function getScans(params?: {
  phone?: string
  status?: string
  page?: number
  limit?: number
}) {
  try {
    const page = Math.max(1, params?.page || 1)
    const limit = Math.min(100, Math.max(1, params?.limit || 20))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (params?.phone) where.phone = params.phone
    if (params?.status) where.status = params.status

    const [scans, total] = await Promise.all([
      db.ticketScan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.ticketScan.count({ where }),
    ])

    return {
      scans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  } catch (error) {
    console.error('[ocr.service] getScans failed:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 5. getScanStats — Dashboard stats
// ─────────────────────────────────────────────

export async function getScanStats() {
  try {
    const [
      totalScans,
      pendingScans,
      confirmedScans,
      rejectedScans,
      expiredScans,
    ] = await Promise.all([
      db.ticketScan.count(),
      db.ticketScan.count({ where: { status: 'pending' } }),
      db.ticketScan.count({ where: { status: 'confirmed' } }),
      db.ticketScan.count({ where: { status: 'rejected' } }),
      db.ticketScan.count({ where: { status: 'expired' } }),
    ])

    // Average confidence for confirmed scans
    const confirmedWithConfidence = await db.ticketScan.aggregate({
      where: { status: 'confirmed', confidence: { gt: 0 } },
      _avg: { confidence: true },
    })

    // Top airlines
    const airlineAgg = await db.ticketScan.groupBy({
      by: ['airline'],
      where: { airline: { not: null }, status: 'confirmed' },
      _count: { airline: true },
      orderBy: { _count: { airline: 'desc' } },
      take: 5,
    })

    // Top routes
    const routeAgg = await db.ticketScan.groupBy({
      by: ['departureCode', 'arrivalCode'],
      where: {
        departureCode: { not: null },
        arrivalCode: { not: null },
        status: 'confirmed',
      },
      _count: { departureCode: true },
      orderBy: { _count: { departureCode: 'desc' } },
      take: 5,
    })

    // Scans over last 7 days (daily counts)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentScans = await db.ticketScan.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    })

    // Provider distribution
    const providerAgg = await db.ticketScan.groupBy({
      by: ['provider'],
      _count: { provider: true },
    })

    return {
      totalScans,
      pendingScans,
      confirmedScans,
      rejectedScans,
      expiredScans,
      successRate: totalScans > 0
        ? Math.round(((confirmedScans + rejectedScans) / totalScans) * 100)
        : 0,
      avgConfidence: confirmedWithConfidence._avg.confidence
        ? Math.round(confirmedWithConfidence._avg.confidence)
        : 0,
      topAirlines: airlineAgg.map((a) => ({
        airline: a.airline,
        count: a._count.airline,
      })),
      topRoutes: routeAgg.map((r) => ({
        from: r.departureCode,
        to: r.arrivalCode,
        count: r._count.departureCode,
      })),
      providerDistribution: providerAgg.map((p) => ({
        provider: p.provider,
        count: p._count.provider,
      })),
    }
  } catch (error) {
    console.error('[ocr.service] getScanStats failed:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// 6. getLatestScanByPhone — Get user's latest scan
// ─────────────────────────────────────────────

export async function getLatestScanByPhone(phone: string) {
  try {
    return db.ticketScan.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    })
  } catch (error) {
    console.error('[ocr.service] getLatestScanByPhone failed:', error)
    throw error
  }
}

// ─────────────────────────────────────────────
// Utility: format extraction for WhatsApp response
// ─────────────────────────────────────────────

export function formatExtractionConfirmation(extraction: TicketExtraction): string {
  const lines: string[] = ['📋 *J\'ai lu votre carte d\'embarquement !*\n']

  if (extraction.passengerName) lines.push(`👤 Passager : ${extraction.passengerName}`)
  if (extraction.airline) lines.push(`✈️ Compagnie : ${extraction.airline}`)
  if (extraction.flightNumber) lines.push(`🔢 Vol : ${extraction.flightNumber}`)
  if (extraction.flightDate) lines.push(`📅 Date : ${extraction.flightDate}`)
  if (extraction.departureCity && extraction.departureCode) {
    lines.push(`🛫 Départ : ${extraction.departureCity} (${extraction.departureCode})`)
  }
  if (extraction.arrivalCity && extraction.arrivalCode) {
    lines.push(`🛬 Arrivée : ${extraction.arrivalCity} (${extraction.arrivalCode})`)
  }
  if (extraction.seat) lines.push(`💺 Siège : ${extraction.seat}`)
  if (extraction.gate) lines.push(`🚪 Porte : ${extraction.gate}`)
  if (extraction.terminal) lines.push(`🏢 Terminal : ${extraction.terminal}`)
  if (extraction.boardingTime) lines.push(`⏰ Embarquement : ${extraction.boardingTime}`)
  if (extraction.pnr) lines.push(`🔖 PNR : ${extraction.pnr}`)

  lines.push('\n*C\'est bien cela ?*')

  return lines.join('\n')
}
