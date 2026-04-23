'use client'

import { useQuery } from '@tanstack/react-query'
import {
  fetchDashboardKpis,
  fetchDashboardCharts,
  fetchDashboardPerformance,
  fetchDashboardActivity,
  type KpiData,
  type ChartsData,
  type PerformanceData,
  type ActivityResponse,
  fallbackKpi,
  fallbackCharts,
  fallbackPerformance,
} from '@/lib/api/dashboard'

// ── Query Keys ───────────────────────────────────────────────────────────────
export const dashboardKeys = {
  all: ['dashboard'] as const,
  kpis: () => [...dashboardKeys.all, 'kpis'] as const,
  charts: () => [...dashboardKeys.all, 'charts'] as const,
  performance: () => [...dashboardKeys.all, 'performance'] as const,
  activity: (page: number, limit: number) =>
    [...dashboardKeys.all, 'activity', page, limit] as const,
}

// ── Query Config ─────────────────────────────────────────────────────────────
const STALE_TIME = 30_000      // 30s before data considered stale
const REFETCH_INTERVAL = 30_000 // Auto-refetch every 30s
const RETRY = 2

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useDashboardKpis() {
  return useQuery<KpiData>({
    queryKey: dashboardKeys.kpis(),
    queryFn: fetchDashboardKpis,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
    retry: RETRY,
    placeholderData: fallbackKpi,
  })
}

export function useDashboardCharts() {
  return useQuery<ChartsData>({
    queryKey: dashboardKeys.charts(),
    queryFn: fetchDashboardCharts,
    staleTime: STALE_TIME,
    refetchInterval: 60_000, // Charts refresh less often
    refetchOnWindowFocus: true,
    retry: RETRY,
    placeholderData: fallbackCharts,
  })
}

export function useDashboardPerformance() {
  return useQuery<PerformanceData>({
    queryKey: dashboardKeys.performance(),
    queryFn: fetchDashboardPerformance,
    staleTime: STALE_TIME,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
    retry: RETRY,
    placeholderData: fallbackPerformance,
  })
}

export function useDashboardActivity(page = 1, limit = 5) {
  return useQuery<ActivityResponse>({
    queryKey: dashboardKeys.activity(page, limit),
    queryFn: () => fetchDashboardActivity(page, limit),
    staleTime: 15_000, // Activity is more time-sensitive
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: RETRY,
    placeholderData: { data: [], total: 0, page, limit, totalPages: 0 },
  })
}
