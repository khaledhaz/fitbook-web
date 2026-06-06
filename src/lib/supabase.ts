import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vaywkjksblafjgduecip.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZheXdramtzYmxhZmpnZHVlY2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMjQxNTAsImV4cCI6MjA3MTkwMDE1MH0.Hta6vxkopZwI0QnzYEeIatoFg11J4M8qIg8WD1KZ42w'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'app' },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
