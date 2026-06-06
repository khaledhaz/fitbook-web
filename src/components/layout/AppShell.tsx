import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  TrendingUp,
  MessageSquare,
  User,
  Users,
  Dumbbell,
  FileText,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuth } from '../../lib/auth'
import { Avatar } from '../ui/Avatar'

interface NavItem {
  to: string
  icon: React.ElementType
  label: string
}

const TRAINEE_NAV: NavItem[] = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/chats', icon: MessageSquare, label: 'Chat' },
  { to: '/profile', icon: User, label: 'Profile' },
]

const TRAINER_NAV: NavItem[] = [
  { to: '/trainer/home', icon: Home, label: 'Home' },
  { to: '/trainer/trainees', icon: Users, label: 'Trainees' },
  { to: '/trainer/templates', icon: FileText, label: 'Templates' },
  { to: '/chats', icon: MessageSquare, label: 'Chat' },
  { to: '/trainer/profile', icon: User, label: 'Profile' },
]

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { role, user } = useAuth()
  const navItems = role === 'trainer' ? TRAINER_NAV : TRAINEE_NAV

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Sidebar — visible on desktop */}
      <aside
        className="hidden md:flex flex-col w-60 border-r border-divider bg-bg fixed top-0 bottom-0 left-0 z-30"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-16 border-b border-divider flex-shrink-0">
          <Dumbbell className="w-6 h-6 text-primary" aria-hidden="true" />
          <span className="text-lg font-bold text-text tracking-tight">FitBook</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <SidebarLink key={to} to={to} icon={Icon} label={label} />
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="px-3 py-4 border-t border-divider flex-shrink-0">
          <NavLink
            to={role === 'trainer' ? '/trainer/profile' : '/profile'}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-card transition-colors"
          >
            <Avatar src={null} name={user?.email} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-text truncate">{user?.email}</p>
              <p className="text-xs text-text-tertiary capitalize">{role}</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Main content area — offset for sidebar on desktop */}
      <main
        className="flex-1 min-w-0 flex flex-col md:ml-60 pb-16 md:pb-0"
        id="main-content"
      >
        {children}
      </main>

      {/* Bottom tab bar — visible on mobile */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-bg border-t border-divider flex"
        aria-label="Mobile navigation"
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <BottomTab key={to} to={to} icon={Icon} label={label} />
        ))}
      </nav>
    </div>
  )
}

function SidebarLink({ to, icon: Icon, label }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-secondary hover:bg-card hover:text-text'
        )
      }
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  )
}

function BottomTab({ to, icon: Icon, label }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors min-h-[44px] min-w-0',
          isActive ? 'text-primary' : 'text-text-tertiary'
        )
      }
      aria-current={undefined}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('w-5 h-5', isActive && 'text-primary')} aria-hidden="true" />
          <span className="truncate max-w-[3rem]">{label}</span>
        </>
      )}
    </NavLink>
  )
}

// Hook to use the location for guard checks
export function useCurrentPath() {
  return useLocation().pathname
}
