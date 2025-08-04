import { signIn, signUp, signOut, isAuthenticated } from './auth.js';

// DOM Elements
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login');
const registerForm = document.getElementById('register');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const closeModal = document.querySelector('.close');

// Show login form
function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    authModal.style.display = 'block';
}

// Show register form
function showRegister() {
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('login-form').style.display = 'none';
    authModal.style.display = 'block';
}

// Close modal
function closeAuthModal() {
    authModal.style.display = 'none';
    // Reset forms
    loginForm.reset();
    registerForm.reset();
}

// Event Listeners
if (loginBtn) loginBtn.addEventListener('click', showLogin);
if (registerBtn) registerBtn.addEventListener('click', showRegister);
if (closeModal) closeModal.addEventListener('click', closeAuthModal);
if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    showRegister();
});
if (showLoginLink) showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeAuthModal();
    }
});

// Login form submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const { user, error } = await signIn(email, password);
        
        if (error) {
            alert(error.message);
            return;
        }
        
        closeAuthModal();
        // The auth state change listener will handle the UI update
    });
}

// Register form submission
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }
        
        const { user, error } = await signUp(email, password);
        
        if (error) {
            alert(error.message);
            return;
        }
        
        alert('Registration successful! Please check your email to confirm your account.');
        showLogin(); // Switch to login form after registration
    });
}

// Logout button
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await signOut();
        // The auth state change listener will handle the UI update
    });
}

// Initialize auth state
if (isAuthenticated()) {
    document.dispatchEvent(new CustomEvent('user-authenticated', { 
        detail: { user: { email: document.getElementById('user-email').textContent } } 
    }));
} else {
    document.dispatchEvent(new CustomEvent('user-signed-out'));
}
