import 'server-only'

import { createClient } from '@supabase/supabase-js'

function readRequiredEnv(name: 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY') {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required server configuration: ${name}`)
  return value
}

export function getSupabaseServerClient() {
  return createClient(readRequiredEnv('SUPABASE_URL'), readRequiredEnv('SUPABASE_SECRET_KEY'), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
}
