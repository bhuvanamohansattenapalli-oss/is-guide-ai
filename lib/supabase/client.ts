import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ivoczodisinkjptrvyjr.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2b2N6b2Rpc2lua2pwdHJ2eWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAwMDAwMDAsImV4cCI6MjAyMDAwMDAwMH0.demo_placeholder_key_for_client_bootstrap'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export const supabase = createClient()
