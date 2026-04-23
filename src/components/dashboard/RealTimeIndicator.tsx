'use client'

import { useSocketConnection } from '@/hooks/useSocketConnection'

export function RealTimeIndicator() {
  const { isConnected } = useSocketConnection(true)

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block size-2 rounded-full ${
          isConnected
            ? 'animate-pulse bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
            : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]'
        }`}
      />
      <span
        className={`hidden text-[11px] font-medium sm:inline ${
          isConnected ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
        }`}
      >
        {isConnected ? 'En ligne' : 'Hors ligne'}
      </span>
    </div>
  )
}
