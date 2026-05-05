/**
 * Next.js Instrumentation — runs once when the server starts.
 * Loads email config from DB so the first sendEmail() uses DB settings,
 * not just env vars.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/configuring/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Load email config from DB (async, non-blocking)
    try {
      const { loadEmailConfigFromDb } = await import('@/lib/email/core')
      await loadEmailConfigFromDb()
      console.log('[instrumentation] Email config loaded from DB')
    } catch (err) {
      console.warn('[instrumentation] Failed to load email config from DB at startup:', err)
    }
  }
}
