 codex/add-minimalist-dashboard-with-three-cards
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
=======
import { sb } from './authClient.js';

export async function guard() {
  const { data } = await sb.auth.getSession();
  if (!data?.session) {
    window.location = '/index.html';
  }
}
 main
