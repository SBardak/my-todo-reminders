// Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { supabaseConfig } from './config.js';

// Initialize the Supabase client
let supabase;

// Function to initialize the Supabase client
function initSupabase() {
  if (!supabase) {
    try {
      supabase = createClient(supabaseConfig.url, supabaseConfig.key);
      
      // Make Supabase client available globally
      if (typeof window !== 'undefined') {
        window.supabase = supabase;
      }
      
      console.log('Supabase client initialized');
      return supabase;
    } catch (error) {
      console.error('Error initializing Supabase client:', error);
      throw error;
    }
  }
  return supabase;
}

// Initialize immediately
initSupabase();

// Export the initialized client
export { supabase };
