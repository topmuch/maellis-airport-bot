'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error Boundary] Uncaught error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-white">Une erreur est survenue</h2>
        <p className="text-sm text-slate-400 max-w-md">
          {error.message || 'Erreur inattendue. Veuillez réessayer.'}
        </p>
      </div>

      <Button
        onClick={reset}
        className="gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-6"
      >
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </Button>
    </div>
  )
}
