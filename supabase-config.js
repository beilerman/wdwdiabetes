// Supabase configuration
// Replace these values with your Supabase project credentials.
// You can find them at: https://supabase.com/dashboard → Project → Settings → API
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
