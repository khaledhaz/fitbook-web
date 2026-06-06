import React from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  as?: React.ElementType
}

export function Card({
  elevated = false,
  padding = 'md',
  as: Tag = 'div',
  className,
  children,
  ...props
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <Tag
      className={cn(
        'rounded-lg border border-border',
        elevated ? 'bg-card-elevated' : 'bg-card',
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-text', className)} {...props}>
      {children}
    </h3>
  )
}
