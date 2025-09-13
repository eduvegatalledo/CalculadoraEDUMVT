import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const url = window.__ENV?.SUPABASE_URL || window.SUPABASE_URL || '';
const key = window.__ENV?.SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || '';

export const sb = createClient(url, key);
export default sb;
