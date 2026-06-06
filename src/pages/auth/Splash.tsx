import React from 'react'
import { Dumbbell } from 'lucide-react'
import { Spinner } from '../../components/ui/Spinner'

export function SplashPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-bg gap-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Dumbbell className="w-10 h-10 text-primary" aria-hidden="true" />
      </div>
      <Spinner size="md" label="Loading FitBook…" />
    </div>
  )
}
