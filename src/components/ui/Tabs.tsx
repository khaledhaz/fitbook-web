import React, { createContext, useContext, useState } from 'react'
import { cn } from '../../utils/cn'

interface TabsContextValue {
  active: string
  setActive: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface TabsProps {
  defaultTab: string
  children: React.ReactNode
  className?: string
  onChange?: (tab: string) => void
}

export function Tabs({ defaultTab, children, className, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultTab)

  const handleChange = (id: string) => {
    setActive(id)
    onChange?.(id)
  }

  return (
    <TabsContext.Provider value={{ active, setActive: handleChange }}>
      <div className={cn('flex flex-col', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: React.ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 bg-card rounded-lg p-1 border border-border overflow-x-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

interface TabProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function Tab({ id, children, className }: TabProps) {
  const ctx = useContext(TabsContext)!
  const isActive = ctx.active === id

  return (
    <button
      role="tab"
      id={`tab-${id}`}
      aria-selected={isActive}
      aria-controls={`tabpanel-${id}`}
      onClick={() => ctx.setActive(id)}
      className={cn(
        'flex-1 min-w-max px-4 py-2 text-sm font-medium rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'min-h-[44px]',
        isActive
          ? 'bg-primary text-text-on-primary'
          : 'text-text-secondary hover:text-text hover:bg-card-elevated',
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabPanelProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function TabPanel({ id, children, className }: TabPanelProps) {
  const ctx = useContext(TabsContext)!
  if (ctx.active !== id) return null

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={cn('min-w-0', className)}
    >
      {children}
    </div>
  )
}
