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
