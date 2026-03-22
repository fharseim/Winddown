import { useState, useEffect } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'

const DEMO_USER = { id: 'demo', email: 'demo@rise.local', demo: true }

export function useAuth() {
  const [user, setUser] = useState(isDemoMode ? DEMO_USER : null)
  const [loading, setLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (isDemoMode || !supabase) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    }).catch(() => {
      setUser(null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) => {
    if (isDemoMode || !supabase) return Promise.resolve({ error: null })
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = () => {
    if (isDemoMode || !supabase) return Promise.resolve()
    return supabase.auth.signOut()
  }

  return { user, loading, signIn, signOut, demoMode: isDemoMode }
}
