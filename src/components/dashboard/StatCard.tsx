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
  iconColor?: string
  iconBgColor?: string
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'up',
  icon: Icon,
  description,
  iconColor = 'text-orange-600 dark:text-orange-400',
  iconBgColor = 'bg-orange-500/10 dark:bg-orange-900/30',
  className,
}: StatCardProps) {
  const isPositive = changeType === 'up'

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(className)}
    >
      <Card className="overflow-hidden py-0">
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground md:text-sm">
                {title}
              </span>
              <span className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {value}
              </span>
              {change !== undefined && (
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <TrendingUp className="size-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="size-3.5 text-red-500 dark:text-red-400" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isPositive
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-500 dark:text-red-400'
                    )}
                  >
                    {isPositive ? '+' : ''}
                    {change}%
                  </span>
                  {description && (
                    <span className="text-xs text-muted-foreground">
                      {description}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl md:size-12',
                iconBgColor
              )}
            >
              <Icon className={cn('size-5 md:size-6', iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
