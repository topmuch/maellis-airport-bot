'use client'

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'up' | 'down'
  icon: LucideIcon
  description?: string
  /** Colored background theme — when set, renders a full gradient card */
  bgTheme?: 'orange' | 'blue' | 'green' | 'purple'
  iconColor?: string
  iconBgColor?: string
  className?: string
}

const bgThemes = {
  orange: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700',
  blue: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
  green: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700',
  purple: 'bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700',
} as const

export function StatCard({
  title,
  value,
  change,
  changeType = 'up',
  icon: Icon,
  description,
  bgTheme,
  iconColor = 'text-orange-600 dark:text-orange-400',
  iconBgColor = 'bg-orange-500/10 dark:bg-orange-900/30',
  className,
}: StatCardProps) {
  const isPositive = changeType === 'up'
  const isColored = !!bgTheme

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(className)}
    >
      <Card
        className={cn(
          'overflow-hidden py-0',
          isColored ? cn(bgThemes[bgTheme], 'border-0 shadow-lg') : ''
        )}
      >
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span
                className={cn(
                  'text-xs font-bold tracking-wider uppercase',
                  isColored ? 'text-white/80' : 'text-muted-foreground'
                )}
              >
                {title}
              </span>
              <span
                className={cn(
                  'text-2xl font-bold tracking-tight md:text-3xl',
                  isColored ? 'text-white' : 'text-foreground'
                )}
              >
                {value}
              </span>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp
                      className={cn(
                        'size-3.5',
                        isColored ? 'text-green-300' : 'text-green-600 dark:text-green-400'
                      )}
                    />
                  ) : (
                    <TrendingDown
                      className={cn(
                        'size-3.5',
                        isColored ? 'text-red-200' : 'text-red-500 dark:text-red-400'
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isPositive
                        ? isColored
                          ? 'text-green-300'
                          : 'text-green-600 dark:text-green-400'
                        : isColored
                          ? 'text-red-200'
                          : 'text-red-500 dark:text-red-400'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {change}%
                  </span>
                  {description && (
                    <span
                      className={cn(
                        'text-xs',
                        isColored ? 'text-white/70' : 'text-muted-foreground'
                      )}
                    >
                      {description}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl md:size-12',
                isColored ? 'bg-white/20' : iconBgColor
              )}
            >
              <Icon
                className={cn(
                  'size-5 md:size-6',
                  isColored ? 'text-white' : iconColor
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
