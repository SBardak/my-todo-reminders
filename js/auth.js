import { createClient } from 'https://esm.sh/@supabase/supabase-js@next';
import { supabaseConfig } from './config.js';

// Initialize Supabase client
export const supabase = createClient(supabaseConfig.url, supabaseConfig.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event);
  if (event === 'SIGNED_IN') {
    // User signed in
    document.dispatchEvent(new CustomEvent('user-authenticated', { detail: session.user }));
    updateAuthUI(true);
  } else if (event === 'SIGNED_OUT') {
    // User signed out
    document.dispatchEvent(new CustomEvent('user-signed-out'));
    updateAuthUI(false);
  }
});

// Update UI based on auth state
async function updateAuthUI(isAuthenticated) {
  const authElements = document.querySelectorAll('.auth-required');
  const unauthElements = document.querySelectorAll('.unauth-only');
  const userEmail = document.getElementById('user-email');
  
  authElements.forEach(el => el.style.display = isAuthenticated ? 'block' : 'none');
  unauthElements.forEach(el => el.style.display = isAuthenticated ? 'none' : 'block');
  
  if (isAuthenticated && userEmail) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userEmail.textContent = user.email;
    } catch (error) {
      console.error('Error getting user:', error);
    }
  }
}

// Sign up with email and password
export async function signUp(email, password) {
  try {
    // Store the current URL to redirect back after email confirmation
    const returnTo = window.location.pathname + window.location.search;
    localStorage.setItem('returnTo', returnTo);
    
    // For GitHub Pages, we need to handle both repository root and custom domain cases
    const baseUrl = window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://sbardak.github.io';
      
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/callback.html`
      }
    });
    
    if (error) throw error;
    return { user: data.user };
  } catch (error) {
    console.error('Error signing up:', error);
    return { error };
  }
}

// Sign in with email and password
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { user: data.user };
  } catch (error) {
    console.error('Error signing in:', error);
    return { error };
  }
}

// Sign out
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('Error signing out:', error);
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
