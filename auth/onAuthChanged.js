import { sb } from './authClient.js';

sb.auth.onAuthStateChange((_, session) => {
  if (!session) {
    window.location = '/index.html';
  }
});
