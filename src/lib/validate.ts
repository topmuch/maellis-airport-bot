/**
 * Shared validation utilities for API routes.
 * Provides consistent ID validation, body parsing, and pagination helpers.
 */

// ─── ID Validation ──────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CUID_REGEX = /^[a-z0-9]{20,}$/

/**
 * Validate that an ID string is a valid UUID or CUID format.
 * Throws if invalid, so callers can use early return.
 */
export function validateId(id: string, fieldName = 'id'): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} is required`)
  }
  if (!UUID_REGEX.test(id) && !CUID_REGEX.test(id)) {
    throw new ValidationError(`Invalid ${fieldName} format. Expected UUID or CUID.`)
  }
}

// ─── Body Parsing ───────────────────────────────────────────────────────────

/**
 * Safely parse a JSON request body with proper 400 error on malformed JSON.
 * Returns the parsed body or throws a ValidationError.
 */
export async function parseBody<T = any>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new ValidationError('Invalid JSON body')
  }
}

// ─── Pagination ─────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

/**
 * Extract and validate pagination parameters from URL search params.
 * Always returns valid, clamped values.
 */
export function getPagination(searchParams: URLSearchParams, defaults?: { page?: number; limit?: number }): PaginationParams {
  const rawPage = Number(searchParams.get('page')) || defaults?.page || DEFAULT_PAGE
  const rawLimit = Number(searchParams.get('limit')) || defaults?.limit || DEFAULT_LIMIT

  const page = Math.max(1, Math.round(rawPage))
  const limit = Math.max(1, Math.min(MAX_LIMIT, Math.round(rawLimit)))

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  }
}

/**
 * Safety limit for queries that don't support pagination.
 * Always use this as a `take` value for unbounded queries.
 */
export const SAFETY_TAKE = 100

// ─── Validation Error Class ─────────────────────────────────────────────────

export class ValidationError extends Error {
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = statusCode
  }
}
