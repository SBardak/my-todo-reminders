// Supabase configuration
const supabaseConfig = {
  url: "https://tdskwpcssbovburunekn.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkc2t3cGNzc2JvdmJ1cnVuZWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDI1MTUsImV4cCI6MjA2OTU3ODUxNX0.cFVJvrU2TorJMbfy8VpBG2T_pkSAMEoHgBqx-euig6M",
  redirectUrl: window.location.hostname === "localhost"
    ? "http://localhost:8000/callback.html"
    : "https://sbardak.github.io/my-todo-reminders/callback.html"
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.supabaseConfig = supabaseConfig;
}

export { supabaseConfig };
