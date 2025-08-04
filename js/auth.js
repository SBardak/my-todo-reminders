// Import Supabase client
import { supabase } from './supabase.js';

// Function to ensure Supabase client is initialized
async function ensureSupabase() {
  if (!supabase) {
    console.error('Supabase client not properly initialized');
    return false;
  }
  
  // If auth isn't available yet, wait a bit
  if (!supabase.auth) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (!supabase.auth) {
      console.error('Supabase auth not available');
      return false;
    }
  }
  
  return true;
}

// Initialize auth state listener after DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const isReady = await ensureSupabase();
    if (!isReady) {
      console.error('Supabase initialization failed');
      return;
    }
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      // Ensure supabase is still available
      const ready = await ensureSupabase();
      if (!ready) return;
      
      if (event === "SIGNED_IN") {
        // User signed in
        document.dispatchEvent(
          new CustomEvent("user-authenticated", { detail: { user: session.user } })
        );
        updateAuthUI(true);
      } else if (event === "SIGNED_OUT") {
        // User signed out
        document.dispatchEvent(new CustomEvent("user-signed-out"));
        updateAuthUI(false);
      }
    });

    // Return cleanup function
    return () => {
      if (subscription?.unsubscribe) {
        subscription.unsubscribe();
      }
    };
  } catch (error) {
    console.error('Error initializing auth state listener:', error);
  }
});

// Update UI based on auth state
async function updateAuthUI(isAuthenticated) {
  const authElements = document.querySelectorAll(".auth-required");
  const unauthElements = document.querySelectorAll(".unauth-only");
  const userEmail = document.getElementById("user-email");

  authElements.forEach(
    (el) => (el.style.display = isAuthenticated ? "block" : "none")
  );
  unauthElements.forEach(
    (el) => (el.style.display = isAuthenticated ? "none" : "block")
  );

  if (isAuthenticated && userEmail) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) userEmail.textContent = user.email;
    } catch (error) {
      console.error("Error getting user:", error);
    }
  }
}

// Sign up with email and password
async function signUp(email, password) {
  try {
    // Store the current URL to redirect back after email confirmation
    const returnTo = window.location.pathname + window.location.search;
    localStorage.setItem("returnTo", returnTo);

    // Use the redirect URL from config
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: supabaseConfig.redirectUrl,
      },
    });

    if (error) throw error;
    return { user: data.user };
  } catch (error) {
    console.error("Error signing up:", error);
    return { error };
  }
}

// Sign in with email and password
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user };
  } catch (error) {
    console.error("Error signing in:", error);
    return { error };
  }
}

// Handle email confirmation
async function handleEmailConfirmation() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    // Check if we have a valid session
    if (data?.session?.user) {
      // Check if email is confirmed
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email_confirmed_at) {
        // Email is confirmed
        return { confirmed: true, user: userData.user };
      }
      // Email not confirmed yet
      return { confirmed: false, user: userData.user };
    }
    
    return { confirmed: false, user: null };
  } catch (error) {
    console.error("Error checking email confirmation:", error);
    return { confirmed: false, error, user: null };
  }
}

// Sign out
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

// Get current user
async function getCurrentUser() {
  try {
    const isReady = await ensureSupabase();
    if (!isReady) {
      console.error('Cannot get current user: Supabase not ready');
      return null;
    }
    
    // First try to get the session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }
    
    // If no session, check if we can get the user directly
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user || null;
    } catch (error) {
      if (error.message.includes('Auth session missing')) {
        console.log('No active session found');
        return null;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

// Check if user is authenticated
async function isAuthenticated() {
  try {
    const isReady = await ensureSupabase();
    if (!isReady) {
      console.error('Cannot check authentication: Supabase not ready');
      return false;
    }
    
    // Try to get the session first
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return true;
    }
    
    // If no session, try to get the user directly
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      if (error.message.includes('Auth session missing')) {
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in isAuthenticated:", error);
    return false;
  }
}

// Export all functions and the supabase client in a single, organized export statement
export {
  // Supabase client
  supabase,
  
  // Auth state functions
  ensureSupabase,
  isAuthenticated,
  getCurrentUser,
  
  // Auth operations
  signIn,
  signUp,
  signOut,
  handleEmailConfirmation,
  
  // UI function
  updateAuthUI
};
