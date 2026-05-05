// Consent types
export interface CookieConsent {
  essential: boolean  // always true
  analytics: boolean
  marketing: boolean
  timestamp: string   // ISO date string
  version: string     // consent version
}

const CONSENT_KEY = 'smartly_consent'
const CONSENT_VERSION = '1.0'

// Get current consent state from localStorage
export function getConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

// Check if consent has been given
export function hasConsented(): boolean {
  return getConsent() !== null
}

// Save consent to localStorage
export function saveConsent(partial: Partial<CookieConsent>): CookieConsent {
  const consent: CookieConsent = {
    essential: true,
    analytics: partial.analytics ?? false,
    marketing: partial.marketing ?? false,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent))
  }
  return consent
}

// Accept all cookies
export function acceptAll(): CookieConsent {
  return saveConsent({ analytics: true, marketing: true })
}

// Reject non-essential cookies
export function rejectNonEssential(): CookieConsent {
  return saveConsent({ analytics: false, marketing: false })
}

// Save custom preferences
export function savePreferences(prefs: { analytics: boolean; marketing: boolean }): CookieConsent {
  return saveConsent(prefs)
}

// Check if analytics cookies are allowed
export function canUseAnalytics(): boolean {
  const consent = getConsent()
  return consent?.analytics ?? false
}

// Check if marketing cookies are allowed
export function canUseMarketing(): boolean {
  const consent = getConsent()
  return consent?.marketing ?? false
}

// Reset consent (for "Personalize" opening)
export function resetConsent(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CONSENT_KEY)
  }
}
