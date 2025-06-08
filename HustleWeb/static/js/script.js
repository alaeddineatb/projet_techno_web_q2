document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupPageHandlers();
    
    console.log('Auth state on page load:', {
        'Cookies': document.cookie,
        'LocalStorage isLoggedIn': localStorage.getItem('isLoggedIn'),
        'Current page': window.location.pathname
    });
    
    if (window.location.pathname === '/browse' && 
        document.referrer.includes('/login') && 
        localStorage.getItem('isLoggedIn') === 'true') {
        console.log('Post-login page load detected, forcing nav update');
        updateNavigation(true);
    }
});

function setupPageHandlers() {
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').addEventListener('submit', loginUser);
    }
    
    const signupForm = document.getElementById('signup-form');
    if (signupForm && !signupForm.hasAttribute('data-handler-attached')) {
        signupForm.setAttribute('data-handler-attached', 'true');
        signupForm.addEventListener('submit', signupUser);
    }
}

function checkAuth() {
    const isAuthenticated = isUserAuthenticated();
    updateNavigation(isAuthenticated);
    return isAuthenticated;
}

function isUserAuthenticated() {
    const hasCookie = document.cookie.includes('token=');
    const hasLocalStorage = localStorage.getItem('isLoggedIn') === 'true';
    
    return hasCookie || hasLocalStorage;
}

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
        
        const submitButton = event.target.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Logging in...';
            submitButton.disabled = true;
        }
        
        const response = await fetch('/login', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('username', username);
            localStorage.setItem('loginTimestamp', Date.now().toString());
            localStorage.setItem('isAdmin', data.isAdmin); 
            
            console.log('Login successful, updating navigation');
            
            updateNavigation(true);
            
            setTimeout(() => {
                window.location.href = '/browse';
            }, 50);
        } else {
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

async function signupUser(event) {
    event.preventDefault();
    
    try {
        const form = event.target;
        const formData = new FormData(form);
        
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

async function handleLogout(event) {
    if (event) event.preventDefault();
    
    try {
        localStorage.removeItem('isAdmin'); 
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('loginTimestamp');
        
        await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        console.log('Logout successful');
        
        updateNavigation(false);
        
        setTimeout(() => {
            window.location.href = '/';
        }, 50);
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('isLoggedIn');
        window.location.href = '/';
    }
}

function updateNavigation(isAuthenticated) {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
    console.log('Updating navigation. Auth state:', isAuthenticated);
    
    navLinks.replaceChildren();
    
    if (isAuthenticated) {
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
        const homeLink = document.createElement('a');
        homeLink.href = '/';
        homeLink.textContent = 'Home';
        
        const browseLink = document.createElement('a');
        browseLink.href = '/browse';
        browseLink.textContent = 'Browse Games';
        
        const profileLink = document.createElement('a');
        profileLink.href = '/profile';
        profileLink.textContent = 'My Profile';
        
        navLinks.appendChild(homeLink);
        navLinks.appendChild(browseLink);
        navLinks.appendChild(profileLink);
        
        if (isAdmin) {
            const adminLink = document.createElement('a');
            adminLink.href = '/admin';
            adminLink.textContent = 'Admin';
            navLinks.appendChild(adminLink);
        }
        
        const logoutLink = document.createElement('a');
        logoutLink.href = '#';
        logoutLink.id = 'logout-link';
        logoutLink.textContent = 'Logout';
        logoutLink.addEventListener('click', handleLogout);
        navLinks.appendChild(logoutLink);
    } else {
        const homeLink = document.createElement('a');
        homeLink.href = '/';
        homeLink.textContent = 'Home';
        
        const browseLink = document.createElement('a');
        browseLink.href = '/browse';
        browseLink.textContent = 'Browse Games';
        
        const loginLink = document.createElement('a');
        loginLink.href = '/login';
        loginLink.textContent = 'Login';
        
        const signupLink = document.createElement('a');
        signupLink.href = '/signup';
        signupLink.textContent = 'Sign Up';
        
        navLinks.appendChild(homeLink);
        navLinks.appendChild(browseLink);
        navLinks.appendChild(loginLink);
        navLinks.appendChild(signupLink);
    }
}