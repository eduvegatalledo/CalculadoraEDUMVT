import { sb } from './authClient.js';

export async function guard() {
  const { data } = await sb.auth.getSession();
  if (!data?.session) {
    window.location = '/index.html';
  }
}
