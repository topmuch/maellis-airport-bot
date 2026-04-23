// ─── Dashboard API Layer ────────────────────────────────────────────────────
// Typed fetch functions for all dashboard endpoints.
// Uses retry=2, timeout=5000ms as specified.

const BASE = '/api/dashboard'

// ── Types ───────────────────────────────────────────────────────────────────

export interface KpiData {
  totalConversations: number
  messagesToday: number
  activeAlerts: number
  revenueToday: number
  totalFlightSearches: number
  totalLoungeBookings: number
  totalTransportBookings: number
}

export interface TrafficPoint {
  day: string
  messages: number
}

export interface IntentPoint {
  name: string
  value: number
  fill: string
}

export interface LanguagePoint {
  code: string
  label: string
  pct: number
  color: string
}

export interface ChartsData {
  traffic: TrafficPoint[]
  intents: IntentPoint[]
  languages: LanguagePoint[]
}

export interface PerformanceData {
  resolutionRate: number
  avgResponseTime: number
  targetTime: number
  totalConversations: number
  resolvedConversations: number
  sparkline: number[]
}

export interface RecentConversation {
  id: string
  phone: string
  name: string
  intent: string
  language: string
  status: string
  time: string
}

export interface ActivityResponse {
  data: RecentConversation[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 5000
const RETRY_COUNT = 2

async function fetchWithTimeout(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ── Fallback data (used when API fails) ─────────────────────────────────────

export const fallbackKpi: KpiData = {
  totalConversations: 0,
  messagesToday: 0,
  activeAlerts: 0,
  revenueToday: 0,
  totalFlightSearches: 0,
  totalLoungeBookings: 0,
  totalTransportBookings: 0,
}

export const fallbackCharts: ChartsData = {
  traffic: [
    { day: 'Lun', messages: 0 },
    { day: 'Mar', messages: 0 },
    { day: 'Mer', messages: 0 },
    { day: 'Jeu', messages: 0 },
    { day: 'Ven', messages: 0 },
    { day: 'Sam', messages: 0 },
    { day: 'Dim', messages: 0 },
  ],
  intents: [],
  languages: [],
}

export const fallbackPerformance: PerformanceData = {
  resolutionRate: 0,
  avgResponseTime: 0,
  targetTime: 2.0,
  totalConversations: 0,
  resolvedConversations: 0,
  sparkline: [],
}

// ── API Functions ───────────────────────────────────────────────────────────

export async function fetchDashboardKpis(): Promise<KpiData> {
  try {
    const res = await fetchWithTimeout(`${BASE}/stats`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (error) {
    console.error('[api/dashboard] fetchKpis failed:', error)
    return fallbackKpi
  }
}

export async function fetchDashboardCharts(): Promise<ChartsData> {
  try {
    const res = await fetchWithTimeout(`${BASE}/charts`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.success && json.data) return json.data
    return fallbackCharts
  } catch (error) {
    console.error('[api/dashboard] fetchCharts failed:', error)
    return fallbackCharts
  }
}

export async function fetchDashboardPerformance(): Promise<PerformanceData> {
  try {
    const res = await fetchWithTimeout(`${BASE}/performance`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.success && json.data) return json.data
    return fallbackPerformance
  } catch (error) {
    console.error('[api/dashboard] fetchPerformance failed:', error)
    return fallbackPerformance
  }
}

export async function fetchDashboardActivity(
  page = 1,
  limit = 5,
): Promise<ActivityResponse> {
  try {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await fetchWithTimeout(`${BASE}/activity?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    if (json.success) return json
    return { data: [], total: 0, page, limit, totalPages: 0 }
  } catch (error) {
    console.error('[api/dashboard] fetchActivity failed:', error)
    return { data: [], total: 0, page, limit, totalPages: 0 }
  }
}
