'use client'

import { cn } from '@/lib/utils'

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function ModuleHeader({
  title,
  subtitle,
  actions,
  className,
}: ModuleHeaderProps) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="mt-2 flex items-center gap-2 sm:mt-0">{actions}</div>
      )}
    </div>
  )
}
