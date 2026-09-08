import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof process !== 'undefined' && process.env) || {};

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== ''
);

// Demo mode is active when explicitly set or when Supabase credentials are not provided
export const isDemoMode =
  env.VITE_DEMO_MODE === 'true' ||
  (!isSupabaseConfigured && (env.DEV ?? true));

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

export { supabaseUrl, supabaseAnonKey, supabase };

/**
 * Creates an isolated Supabase client with non-persisting auth.
 * Crucial for administrative operations so caller's active session is never replaced.
 */
export function createIsolatedSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
