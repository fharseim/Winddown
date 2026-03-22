import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_CONFIGURED = !!(supabaseUrl && supabaseAnonKey)

// When env vars are missing, create a no-op client pointed at a placeholder URL
// so imports don't crash. All actual calls are guarded by SUPABASE_CONFIGURED.
export const supabase = SUPABASE_CONFIGURED
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder')
