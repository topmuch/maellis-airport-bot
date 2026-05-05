/**
 * Centralized API Client for Maellis Airport Dashboard
 *
 * All fetch calls from the dashboard MUST go through this client.
 * It automatically:
 * - Sends HttpOnly cookies via `credentials: 'include'`
 * - Handles JSON parsing / error normalization
 * - Provides a uniform error interface
 * - Supports timeout on every request
 *
 * Usage:
 *   import { apiClient } from '@/lib/api-client'
 *   const data = await apiClient.get('/api/partners')
 *   const result = await apiClient.post('/api/partners', { name: 'Test' })
 */

export interface ApiError {
  success: false
  error: string
  status?: number
  details?: unknown
}

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
}

export type ApiResult<T = unknown> = ApiSuccess<T> | ApiError

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Internal fetch wrapper with timeout + JSON handling
 */
async function request<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ApiResult<T>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // ← CRITICAL: sends HttpOnly NextAuth cookie
      signal: controller.signal,
      headers: {
        // Only set Content-Type for body requests (don't override for FormData)
        ...(options.body instanceof FormData
          ? {}
          : options.body
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...options.headers,
      },
    })

    // Try to parse JSON
    let json: unknown
    try {
      json = await res.json()
    } catch {
      // Non-JSON response (e.g. blob, text)
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}: ${res.statusText}`, status: res.status }
      }
      // For successful non-JSON responses (e.g. file downloads), return raw
      return { success: true, data: res as T }
    }

    // Normalise error responses
    if (!res.ok) {
      const errorMessage =
        (json as Record<string, string>)?.error ||
        (json as Record<string, string>)?.message ||
        `HTTP ${res.status}: ${res.statusText}`
      return {
        success: false,
        error: errorMessage,
        status: res.status,
        details: json,
      }
    }

    // Shape standard responses: { success, data } | raw data
    const payload = json as Record<string, unknown>
    if (typeof payload === 'object' && payload !== null && 'success' in payload) {
      if (payload.success === false) {
        return {
          success: false,
          error: String(payload.error || 'Request failed'),
          status: res.status,
        }
      }
      return { success: true, data: (payload.data ?? payload) as T }
    }

    // Direct data response (no wrapper)
    return { success: true, data: json as T }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'La requête a expiré (timeout)', status: 408 }
    }
    const message = error instanceof Error ? error.message : 'Erreur réseau'
    console.error(`[API] ${options.method || 'GET'} ${url} failed:`, message)
    return { success: false, error: message }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Public API client
 */
export const apiClient = {
  get<T = unknown>(url: string, timeoutMs?: number): Promise<ApiResult<T>> {
    return request<T>(url, { method: 'GET' }, timeoutMs)
  },

  post<T = unknown>(url: string, body?: unknown, timeoutMs?: number): Promise<ApiResult<T>> {
    return request<T>(
      url,
      { method: 'POST', body: body ? JSON.stringify(body) : undefined },
      timeoutMs,
    )
  },

  put<T = unknown>(url: string, body?: unknown, timeoutMs?: number): Promise<ApiResult<T>> {
    return request<T>(
      url,
      { method: 'PUT', body: body ? JSON.stringify(body) : undefined },
      timeoutMs,
    )
  },

  patch<T = unknown>(url: string, body?: unknown, timeoutMs?: number): Promise<ApiResult<T>> {
    return request<T>(
      url,
      { method: 'PATCH', body: body ? JSON.stringify(body) : undefined },
      timeoutMs,
    )
  },

  delete<T = unknown>(url: string, timeoutMs?: number): Promise<ApiResult<T>> {
    return request<T>(url, { method: 'DELETE' }, timeoutMs)
  },

  /**
   * Upload files via FormData (doesn't set Content-Type — browser sets boundary)
   */
  upload<T = unknown>(url: string, formData: FormData, timeoutMs = 60_000): Promise<ApiResult<T>> {
    return request<T>(url, { method: 'POST', body: formData }, timeoutMs)
  },

  /**
   * Download a file as Blob (e.g. CSV/PDF export)
   * Returns the Blob on success, null on error.
   */
  async download(url: string, filename?: string): Promise<{ blob: Blob; filename: string } | null> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 60_000)

    try {
      const res = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
      })
      if (!res.ok) return null

      const blob = await res.blob()
      // Try to get filename from Content-Disposition header
      const disposition = res.headers.get('content-disposition')
      let extractedName = filename || 'download'
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=(['"]?)([^'";\n]+)\1/)
        if (match?.[2]) extractedName = match[2]
      }
      return { blob, filename: extractedName }
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  },
} as const
