import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase configuration
export const supabaseConfig = {
    url: 'https://tdskwpcssbovburunekn.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkc2t3cGNzc2JvdmJ1cnVuZWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDI1MTUsImV4cCI6MjA2OTU3ODUxNX0.cFVJvrU2TorJMbfy8VpBG2T_pkSAMEoHgBqx-euig6M'
};

// Create and export the Supabase client
export const supabase = createClient(supabaseConfig.url, supabaseConfig.key);