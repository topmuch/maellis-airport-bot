// ============================================================================
// MAELLIS Flight Service — All TypeScript Interfaces
// ============================================================================

export interface FlightStatusResponse {
  success: boolean;
  flight: {
    iata: string;
    airline: string;
    departure: {
      iata: string;
      city?: string;
      terminal: string;
      gate: string;
      scheduled: string;
      estimated?: string;
      actual?: string;
      delay?: number;
    };
    arrival: {
      iata: string;
      city?: string;
      terminal: string;
      gate: string;
      scheduled: string;
      estimated?: string;
      actual?: string;
      delay?: number;
    };
    status: 'scheduled' | 'active' | 'landed' | 'cancelled' | 'delayed' | 'diverted';
    aircraft?: string;
  };
  notifications?: FlightNotification[];
}

export interface FlightSearchResponse {
  success: boolean;
  query: {
    departureCode: string;
    arrivalCode?: string;
    date?: string;
    flightNumber?: string;
  };
  results: FlightResult[];
  total: number;
  source: 'aviationstack' | 'mock';
}

export interface FlightResult {
  airline: string;
  flightNumber: string;
  departureCode: string;
  arrivalCode: string;
  departureCity?: string;
  arrivalCity?: string;
  departureTime: string;
  arrivalTime: string;
  departureTerminal: string;
  arrivalTerminal: string;
  departureGate: string;
  arrivalGate: string;
  status: string;
  isDelayed: boolean;
  delayMinutes: number;
  duration?: number;
  aircraft?: string;
  price?: number;
}

export interface FlightNotification {
  type: 'gate_change' | 'delay' | 'boarding' | 'cancellation' | 'diversion';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface AirportResult {
  city: string;
  code: string;
  country?: string;
}

export interface FlightSubscription {
  id: string;
  flightNumber: string;
  phone: string;
  events: string[];
  createdAt: string;
}

// ---- Internal Search Param Types ----

export interface FlightSearchParams {
  departureCode?: string;
  arrivalCode?: string;
  date?: string;
  flightNumber?: string;
  timeFrom?: string;
  timeTo?: string;
}
