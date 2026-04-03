import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl ? '✅ Found' : '❌ Missing')
console.log('Supabase Key:', supabaseAnonKey ? '✅ Found' : '❌ Missing')

if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL missing')
if (!supabaseAnonKey) throw new Error('VITE_SUPABASE_ANON_KEY missing')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)