import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none select-none'

  const variants = {
    primary: 'bg-primary text-text-on-primary hover:bg-primary-dark active:scale-[0.98]',
    secondary: 'bg-card-elevated text-text hover:bg-card-pressed border border-border',
    ghost: 'text-text hover:bg-card',
    danger: 'bg-error text-white hover:bg-red-700',
    outline: 'border border-primary text-primary hover:bg-primary hover:text-text-on-primary',
  }

  const sizes = {
    sm: 'h-10 px-4 text-sm min-w-[44px]',
    md: 'h-[52px] px-6 text-base min-w-[44px]',
    lg: 'h-14 px-8 text-lg min-w-[44px]',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
}
