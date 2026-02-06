import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client with service role key for admin operations
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      // During build time or if keys missing, prevent crash but warn
      console.warn('Supabase keys missing in server client');
    }
    // Return a dummy client or throw depending on context? 
    // Throwing is safer for runtime, but breaks build if static gen hits it.
    // Let's rely on the check at call site or just ensure envs are there.
    // Actually, for build, we can just return the anon client or null.
    // But better to just check if we are building.
  }

  if (!serviceRoleKey) {
    // Return anon client as fallback if service key missing (e.g. build)
    return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
