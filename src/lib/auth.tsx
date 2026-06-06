import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { UserRole } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  role: UserRole
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    role: 'trainer' | 'trainee'
  ) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function detectRole(userId: string): Promise<UserRole> {
  // Check trainers first
  const { data: trainer, error: tErr } = await supabase
    .from('trainers')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!tErr && trainer) return 'trainer'

  const { data: trainee, error: trErr } = await supabase
    .from('trainees')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!trErr && trainee) return 'trainee'

  return 'none'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>('loading')
  const [isLoading, setIsLoading] = useState(true)

  const refreshRole = useCallback(async () => {
    const currentUser = supabase.auth.getUser()
    const uid = (await currentUser).data.user?.id
    if (!uid) {
      setRole('none')
      return
    }
    const detected = await detectRole(uid)
    setRole(detected)
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const detected = await detectRole(s.user.id)
        setRole(detected)
      } else {
        setRole('none')
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const detected = await detectRole(s.user.id)
        setRole(detected)
      } else {
        setRole('none')
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error: error as Error | null }
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string, role: 'trainer' | 'trainee') => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
        },
      })
      if (error) return { error: error as Error | null }

      // After signup, create the appropriate role row
      // (The DB trigger should handle this, but we set metadata as fallback signal)
      const uid = data.user?.id
      if (uid && role === 'trainer') {
        await supabase.from('trainers').upsert({ id: uid })
      } else if (uid && role === 'trainee') {
        await supabase.from('trainees').upsert({ id: uid })
      }

      return { error: null }
    },
    []
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setRole('none')
  }, [])

  const value: AuthContextValue = {
    session,
    user,
    role,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
