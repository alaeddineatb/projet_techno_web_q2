document.addEventListener('DOMContentLoaded', function() {
    // Force immediate authentication check on page load
    checkAuth();
    
    // Set up page-specific event listeners
    setupPageHandlers();
    
    // Debug: Log current auth state
    console.log('Auth state on page load:', {
        'Cookies': document.cookie,
        'LocalStorage isLoggedIn': localStorage.getItem('isLoggedIn'),
        'Current page': window.location.pathname
    });
    
    // Important: If we just arrived at /browse from login, ensure nav is updated
    if (window.location.pathname === '/browse' && 
        document.referrer.includes('/login') && 
        localStorage.getItem('isLoggedIn') === 'true') {
        console.log('Post-login page load detected, forcing nav update');
        updateNavigation(true);
    }
});

// Set up event handlers based on current page
function setupPageHandlers() {
    // Login form handler
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').addEventListener('submit', loginUser);
    }
    
    // Signup form handler - Only add event listener if not already present
    const signupForm = document.getElementById('signup-form');
    if (signupForm && !signupForm.hasAttribute('data-handler-attached')) {
        signupForm.setAttribute('data-handler-attached', 'true');
        signupForm.addEventListener('submit', signupUser);
    }
}

// Check if user is authenticated and update UI accordingly
function checkAuth() {
    const isAuthenticated = isUserAuthenticated();
    updateNavigation(isAuthenticated);
    return isAuthenticated;
}

// Determine if user is authenticated
function isUserAuthenticated() {
    // Check several possible auth indicators
    const hasCookie = document.cookie.includes('token=');
    const hasLocalStorage = localStorage.getItem('isLoggedIn') === 'true';
    
    // Return true if any auth method indicates the user is logged in
    return hasCookie || hasLocalStorage;
}

// Login form submission handler
async function loginUser(event) {
    event.preventDefault();
    
    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            alert('Please enter both username and password');
            return;
        }
        
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        // Show some feedback that the login is processing
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
        }
        
        // Make the login request
        const response = await fetch('/login', {
            method: 'POST',
            body: formData,
            credentials: 'include' // Important for cookies
        });
        
        if (response.ok) {
            // IMPORTANT: Set auth state BEFORE redirecting
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            localStorage.setItem('loginTimestamp', Date.now().toString());
            
            console.log('Login successful, updating navigation');
            
            // Force a navigation update before redirecting
            updateNavigation(true);
            
            // Use a slight delay to ensure state is saved before redirect
            setTimeout(() => {
                window.location.href = '/browse';
            }, 50);
        } else {
            // Reset button state
            if (submitButton) {
                submitButton.textContent = 'Login';
                submitButton.disabled = false;
            }
            
            const errorText = await response.text();
            alert('Login failed: ' + (errorText || 'Please check your credentials'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Network error - please try again');
    }
}

// Signup form submission handler
async function signupUser(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        
        // Show feedback during signup process
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Creating Account...';
            submitButton.disabled = true;
        }
        
        const response = await fetch('/signup', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('Account created! Please log in.');
            window.location.href = '/login';
        } else {
            // Reset button state
            if (submitButton) {
                submitButton.textContent = 'Sign Up';
                submitButton.disabled = false;
            }
            
            const errorText = await response.text();
            alert('Signup failed: ' + (errorText || 'Please try again'));
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Network error - please try again');
    }
}

// Handle logout action
async function handleLogout(event) {
    if (event) event.preventDefault();
    
    try {
        // Clear client-side auth state first
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('loginTimestamp');
        
        // Make logout request to server
        await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        console.log('Logout successful');
        
        // Force navigation update before redirect
        updateNavigation(false);
        
        // Use small delay to ensure state is updated
        setTimeout(() => {
            window.location.href = '/';
        }, 50);
    } catch (error) {
        console.error('Logout error:', error);
        // Still redirect even on error
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/';
    }
}

// Update navigation based on authentication state
function updateNavigation(isAuthenticated) {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    console.log('Updating navigation. Auth state:', isAuthenticated);
    
    if (isAuthenticated) {
        // User is logged in - show profile and logout options
        navLinks.innerHTML = `
            <a href="/">Home</a>
            <a href="/browse">Browse Games</a>
            <a href="/profile">My Profile</a>
            <a href="#" id="logout-link">Logout</a>
        `;
        
        // Add event listener to logout link
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', handleLogout);
        }
    } else {
        // User is not logged in - show login and signup options
        navLinks.innerHTML = `
            <a href="/">Home</a>
            <a href="/browse">Browse Games</a>
            <a href="/login">Login</a>
            <a href="/signup">Sign Up</a>
        `;
    }
}