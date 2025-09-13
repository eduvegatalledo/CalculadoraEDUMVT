import { sb as supabase } from '../supabase-client.js';

async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    sessionStorage.setItem('landingMsg', 'Inicia sesión para continuar.');
    location.href = '/';
    return;
  }
  document.getElementById('btnLogout')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.href = '/';
  });
}

ensureSession();
