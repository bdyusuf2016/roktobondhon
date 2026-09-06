import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== ''
);

// Demo mode is active when explicitly set or when Supabase credentials are not provided
export const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (!isSupabaseConfigured && import.meta.env.DEV);

let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.info('Connected to Supabase project:', supabaseUrl);
  } catch (err) {
    console.warn('Supabase initialization warning:', err);
  }
} else {
  console.info(
    'Supabase credentials not configured in .env. Running in Local Simulation / Sandbox Engine.'
  );
}

export { supabase };
