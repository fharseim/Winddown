import { useState, useEffect } from 'react'
import { supabase, SUPABASE_CONFIGURED } from '../lib/supabase'

const DEMO_USER = { id: 'demo', email: 'demo@rise.local', demo: true }

export function useAuth() {
  const [user, setUser] = useState(SUPABASE_CONFIGURED ? null : DEMO_USER)
  const [loading, setLoading] = useState(SUPABASE_CONFIGURED)

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return

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

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  return { user, loading, signIn, signOut, demoMode: !SUPABASE_CONFIGURED }
}
