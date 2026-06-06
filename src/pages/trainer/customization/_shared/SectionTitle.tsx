import React from 'react'
import { cn } from '../../../../utils/cn'

interface SectionTitleProps {
  children: React.ReactNode
  className?: string
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <div className={cn('flex items-center gap-2.5 mb-4', className)}>
      <div className="w-0.5 h-4 bg-primary rounded-full flex-shrink-0" aria-hidden="true" />
      <h4 className="text-base font-bold text-text tracking-tight">{children}</h4>
    </div>
  )
}
