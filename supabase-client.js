codex/create-and-configure-environment-variables
codex/create-and-configure-environment-variables
(function initSupabase(){
  const URL = typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined;
  const KEY = typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined;
  if (!URL || !KEY) {
    throw new Error('[Supabase] SUPABASE_URL y SUPABASE_ANON_KEY son requeridas');
  }
  if (window.sb) {
    console.info('[Supabase] using existing client');
    return;
  }
  if (!window.supabase) {
    console.error('[Supabase] SDK no encontrado');
    return;
  }
  try {
    window.sb = window.supabase.createClient(URL, KEY);
    console.info('[Supabase] client inicializado');
  } catch (err) {
    console.error('[Supabase] init error', err);
  }
})();
import { createClient } from '@supabase/supabase-js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-env.js';
main

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
codex/create-and-configure-environment-variables

export default supabase;
main

main
