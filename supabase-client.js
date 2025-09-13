(function initSupabase(){
  const URL = 'https://nzzzeycpfdtvzphbupbf.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56enpleWNwZmR0dnpwaGJ1cGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDA3MTIsImV4cCI6MjA3MzAxNjcxMn0.HoAjTwnWdtjueVALlX4-du7uF919QEMj8SS2CHP0N44';
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
