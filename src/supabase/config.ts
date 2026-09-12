import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type RuntimeEnv = {
  VITE_DEMO_MODE?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  DEV?: boolean;
  NODE_ENV?: string;
};

export function resolveDemoMode(env: RuntimeEnv = {}): boolean {
  if (env.VITE_DEMO_MODE === 'true') {
    return true;
  }

  const hasSupabaseConfig = Boolean(
    env.VITE_SUPABASE_URL &&
      env.VITE_SUPABASE_URL.trim() !== '' &&
      env.VITE_SUPABASE_ANON_KEY &&
      env.VITE_SUPABASE_ANON_KEY.trim() !== ''
  );

  const isLocalDev = env.DEV === true || env.NODE_ENV === 'development';

  return !hasSupabaseConfig && isLocalDev;
}

const env = (typeof import.meta !== 'undefined' && import.meta.env) || (typeof process !== 'undefined' && process.env) || {};

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== ''
);

export const isDemoMode = resolveDemoMode(env);
export const isProductionMode = isSupabaseConfigured && !isDemoMode;

export function getEnvironmentStatus() {
  return {
    isDemoMode,
    isSupabaseConfigured,
    isProductionMode,
    modeLabel: isProductionMode ? 'production' : isDemoMode ? 'demo' : 'sandbox',
  };
}

if (!isSupabaseConfigured && !isDemoMode) {
  console.warn('Supabase credentials are not configured for production mode; live database access is disabled.');
}

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
