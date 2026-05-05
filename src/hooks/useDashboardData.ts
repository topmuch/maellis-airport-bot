'use client'

import { useQuery } from '@tanstack/react-query'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface KpiData {
  totalConversations: number
  messagesToday: number
  activeAlerts: number
  revenueToday: number
  totalFlightSearches: number
  totalLoungeBookings: number
  totalTransportBookings: number
}

interface TrafficDataPoint {
  day: string
  messages: number
}

interface IntentDataPoint {
  name: string
  value: number
  fill: string
}

interface LanguageDataPoint {
  code: string
  label: string
  pct: number
  color: string
}

interface ChartsData {
  traffic: TrafficDataPoint[]
  intents: IntentDataPoint[]
  languages: LanguageDataPoint[]
}

interface PerformanceData {
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

interface ActivityData {
  data: RecentConversation[]
  total: number
  page: number
  limit: number
}

// ─── Mock Data ──────────────────────────────────────────────────────────────────

const mockKpi: KpiData = {
  totalConversations: 1247,
  messagesToday: 89,
  activeAlerts: 3,
  revenueToday: 452000,
  totalFlightSearches: 156,
  totalLoungeBookings: 23,
  totalTransportBookings: 45,
}

const mockCharts: ChartsData = {
  traffic: [
    { day: 'Lun', messages: 65 },
    { day: 'Mar', messages: 78 },
    { day: 'Mer', messages: 92 },
    { day: 'Jeu', messages: 84 },
    { day: 'Ven', messages: 110 },
    { day: 'Sam', messages: 56 },
    { day: 'Dim', messages: 43 },
  ],
  intents: [
    { name: 'Recherche Vol', value: 28, fill: '#f97316' },
    { name: 'Bagages', value: 18, fill: '#3b82f6' },
    { name: 'Transport', value: 15, fill: '#22c55e' },
    { name: 'Urgence', value: 8, fill: '#ef4444' },
    { name: 'Lounge VIP', value: 12, fill: '#8b5cf6' },
    { name: 'Paiement', value: 10, fill: '#eab308' },
    { name: 'Autre', value: 9, fill: '#6b7280' },
  ],
  languages: [
    { code: 'FR', label: 'Français', pct: 62, color: 'bg-blue-400' },
    { code: 'EN', label: 'English', pct: 24, color: 'bg-emerald-400' },
    { code: 'AR', label: 'العربية', pct: 9, color: 'bg-amber-400' },
    { code: 'WO', label: 'Wolof', pct: 5, color: 'bg-purple-400' },
  ],
}

function generateSparkline(): number[] {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 80) + 10)
}

const mockPerformance: PerformanceData = {
  resolutionRate: 0.87,
  avgResponseTime: 1.2,
  targetTime: 2.0,
  totalConversations: 1247,
  resolvedConversations: 1085,
  sparkline: generateSparkline(),
}

const mockConversations: RecentConversation[] = [
  {
    id: 'conv-001',
    phone: '+221 77 123 45 67',
    name: 'Moussa Diallo',
    intent: 'recherche_vol',
    language: 'FR',
    status: 'active',
    time: '14:32',
  },
  {
    id: 'conv-002',
    phone: '+221 78 987 65 43',
    name: 'Aminata Ndiaye',
    intent: 'bagages',
    language: 'FR',
    status: 'active',
    time: '14:28',
  },
  {
    id: 'conv-003',
    phone: '+221 76 555 12 34',
    name: 'Ibrahim Sow',
    intent: 'transport',
    language: 'WO',
    status: 'closed',
    time: '14:15',
  },
  {
    id: 'conv-004',
    phone: '+221 77 333 88 99',
    name: 'Fatou Ba',
    intent: 'lounge',
    language: 'EN',
    status: 'escalated',
    time: '13:58',
  },
  {
    id: 'conv-005',
    phone: '+221 78 444 22 11',
    name: 'Omar Diop',
    intent: 'urgence',
    language: 'FR',
    status: 'closed',
    time: '13:42',
  },
  {
    id: 'conv-006',
    phone: '+221 76 111 00 99',
    name: 'Aïssatou Fall',
    intent: 'recherche_vol',
    language: 'AR',
    status: 'active',
    time: '13:30',
  },
  {
    id: 'conv-007',
    phone: '+221 77 666 77 88',
    name: 'Cheikh Sy',
    intent: 'paiements',
    language: 'FR',
    status: 'closed',
    time: '13:12',
  },
]

// ─── Simulated async fetch (mimics API call) ────────────────────────────────────

function fakeFetch<T>(data: T, delay = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay))
}

// ─── Query Hooks ────────────────────────────────────────────────────────────────

export function useDashboardKpis() {
  return useQuery<KpiData>({
    queryKey: ['dashboard', 'kpis'],
    queryFn: () => fakeFetch(mockKpi),
    staleTime: 30_000,
  })
}

export function useDashboardCharts() {
  return useQuery<ChartsData>({
    queryKey: ['dashboard', 'charts'],
    queryFn: () => fakeFetch(mockCharts),
    staleTime: 30_000,
  })
}

export function useDashboardPerformance() {
  return useQuery<PerformanceData>({
    queryKey: ['dashboard', 'performance'],
    queryFn: () => fakeFetch(mockPerformance),
    staleTime: 30_000,
  })
}

export function useDashboardActivity(page: number = 1, limit: number = 10) {
  return useQuery<ActivityData>({
    queryKey: ['dashboard', 'activity', page, limit],
    queryFn: () =>
      fakeFetch({
        data: mockConversations.slice((page - 1) * limit, page * limit),
        total: mockConversations.length,
        page,
        limit,
      }),
    staleTime: 15_000,
  })
}
