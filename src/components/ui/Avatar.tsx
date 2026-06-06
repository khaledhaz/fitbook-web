import React from 'react'
import { User } from 'lucide-react'
import { cn } from '../../utils/cn'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

function getInitials(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name)
  const sizeClass = sizeMap[size]

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-card-elevated border border-border flex-shrink-0',
        sizeClass,
        className
      )}
      role="img"
      aria-label={name ?? 'User avatar'}
    >
      {src ? (
        <img
          src={src}
          alt={name ?? 'User avatar'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : initials ? (
        <span className="font-semibold text-primary" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <User className="w-1/2 h-1/2 text-text-tertiary" aria-hidden="true" />
      )}
    </div>
  )
}
