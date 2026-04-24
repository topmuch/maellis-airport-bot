'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

// Avoid useState+useEffect for mounted flag — useSyncExternalStore is the
// React 19 idiomatic way to get a single client-only truthy value.
const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useIsMounted()

  const cycleTheme = () => {
    if (!mounted) return
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      cycleTheme()
    }
  }

  const resolvedTheme = !mounted ? 'loading' : theme
  const label =
    resolvedTheme === 'loading'
      ? 'Chargement du thème'
      : resolvedTheme === 'dark'
        ? 'Mode sombre actif — cliquez pour mode système'
        : resolvedTheme === 'light'
          ? 'Mode clair actif — cliquez pour mode sombre'
          : 'Mode système actif — cliquez pour mode clair'

  return (
    <button
      type="button"
      onClick={cycleTheme}
      onKeyDown={handleKeyDown}
      aria-label={label}
      title={label}
      className={cn(
        'relative flex size-9 items-center justify-center rounded-lg',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'cursor-pointer'
      )}
    >
      {/* Sun — visible when theme is light */}
      <Sun
        className={cn(
          'size-4 absolute transition-all duration-300',
          mounted && theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        )}
      />
      {/* Moon — visible when theme is dark */}
      <Moon
        className={cn(
          'size-4 absolute transition-all duration-300',
          mounted && theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        )}
      />
      {/* Monitor — visible when theme is system */}
      <Monitor
        className={cn(
          'size-4 absolute transition-all duration-300',
          mounted && theme === 'system'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        )}
      />
      <span className="sr-only">{label}</span>
    </button>
  )
}
