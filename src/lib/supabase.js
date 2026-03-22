import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isDemoMode = !(supabaseUrl && supabaseAnonKey)
export const SUPABASE_CONFIGURED = !isDemoMode

// Export null when env vars are missing to avoid createClient crashing
// with invalid placeholder credentials. All callers guard with isDemoMode.
export const supabase = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
