import { db } from '@/lib/db'
import { headers } from 'next/headers'

// Audit action types
type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'view'
  | 'configure'

interface AuditOptions {
  adminId?: string
  action: AuditAction
  module: string
  details?: string
  ipAddress?: string
}

/**
 * Log an audit entry to the ActivityLog table.
 * Never throws — audit failures should not break the main flow.
 */
export async function logAudit(options: AuditOptions): Promise<void> {
  try {
    let ip = options.ipAddress

    // Try to get IP from request headers if not provided
    if (!ip) {
      try {
        const headersList = await headers()
        ip =
          headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          headersList.get('x-real-ip') ||
          'unknown'
      } catch {
        ip = 'unknown'
      }
    }

    await db.activityLog.create({
      data: {
        adminId: options.adminId ?? null,
        action: options.action,
        module: options.module,
        details: options.details ?? null,
        ipAddress: ip,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[AUDIT] ${options.action.toUpperCase()} | module=${options.module} | admin=${options.adminId ?? 'system'} | ip=${ip} | ${options.details ?? ''}`
      )
    }
  } catch (error) {
    // Audit must never break the main flow
    console.error('[AUDIT] Failed to write audit log:', error)
  }
}
