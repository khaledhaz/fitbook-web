import React from 'react'
import { Construction } from 'lucide-react'

interface StubPageProps {
  title: string
  description?: string
}

export function StubPage({ title, description }: StubPageProps) {
  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-card-elevated border border-border flex items-center justify-center mb-4" aria-hidden="true">
        <Construction className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-xl font-bold text-text mb-2">{title}</h1>
      <p className="text-text-secondary text-sm max-w-xs">
        {description ?? 'This screen is coming soon. The foundation is wired — a feature agent will build it out.'}
      </p>
    </div>
  )
}
