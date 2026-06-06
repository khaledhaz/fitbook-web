import React from 'react'
import { AlertCircle, InboxIcon, WifiOff } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../utils/cn'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center px-4', className)}>
      <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center mb-4" aria-hidden="true">
        {icon ?? <InboxIcon className="w-7 h-7 text-text-tertiary" />}
      </div>
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      {description && <p className="text-sm text-text-secondary mb-6 max-w-xs">{description}</p>}
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center px-4', className)} role="alert">
      <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mb-4" aria-hidden="true">
        <AlertCircle className="w-7 h-7 text-error" />
      </div>
      <h3 className="text-base font-semibold text-text mb-1">{title}</h3>
      {message && <p className="text-sm text-text-secondary mb-6 max-w-xs">{message}</p>}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function OfflineState({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center px-4', className)} role="alert">
      <div className="w-14 h-14 rounded-full bg-card-elevated flex items-center justify-center mb-4" aria-hidden="true">
        <WifiOff className="w-7 h-7 text-text-tertiary" />
      </div>
      <h3 className="text-base font-semibold text-text mb-1">No connection</h3>
      <p className="text-sm text-text-secondary">Check your internet and try again.</p>
    </div>
  )
}
