// Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig } from './config.js';

// Initialize the Supabase client
const supabase = createClient(supabaseConfig.url, supabaseConfig.key);

// Make Supabase client available globally
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

export { supabase };
