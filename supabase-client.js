import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-env.js';

// Supabase singleton
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export default supabase;
