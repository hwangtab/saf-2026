import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper for server-side fetching (optional, same as client if no cookies/auth needed yet)
export const getSupabaseServer = () => createClient(supabaseUrl, supabaseAnonKey);
