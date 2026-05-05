// ─────────────────────────────────────────────────────────────────────────────
// Flight Providers — Point d'entrée unique
// ─────────────────────────────────────────────────────────────────────────────

export type { IFlightProvider, FlightStatusData, FlightSearchResult, FlightSearchParams, FlightStatusParams, AirportData, ProviderTestResult, FlightSearchItem } from './IFlightProvider'
export { MockProvider } from './MockProvider'
export { AviationStackProvider } from './AviationStackProvider'
export { CustomFidsProvider } from './CustomFidsProvider'
export type { CustomFidsConfig } from './CustomFidsProvider'
export { getFlightProvider, invalidateFlightProviderCache, testCurrentProvider } from './FlightProviderFactory'
