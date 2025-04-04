document.addEventListener('DOMContentLoaded', function() {
    updateNav();
    
    // Écouteurs pour les formulaires
    if (document.getElementById('login-form')) {
        document.getElementById('login-form').addEventListener('submit', loginUser);
    }
    if (document.getElementById('signup-form')) {
        document.getElementById('signup-form').addEventListener('submit', signupUser);
    }
});


async function loginUser(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        });

        if (response.ok) {
            localStorage.setItem('userStatus', 'loggedIn');
            localStorage.setItem('email', email);
            window.location.href = 'browse';
        } else {
            alert('Login failed - please check your credentials');
        }
    } catch (error) {
        alert('Network error - please try again');
    }
}


async function signupUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        });

        if (response.ok) {
            alert('Registration successful! Please login.');
            window.location.href = 'login';
        } else {
            alert('Registration failed - email may be taken');
        }
    } catch (error) {
        alert('Network error - please try again');
    }
}


function handleLogout() {
    localStorage.setItem('userStatus', 'guest');
    window.location.href = '';
}


function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    const userStatus = localStorage.getItem('userStatus') || 'guest';

    if (userStatus === 'loggedIn') {
        navLinks.innerHTML = `
            <a href="browse">Home</a>
            <a href="profile">My Profile</a>
            <a href="#" id="logout-link">Logout</a>
        `;
        
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(event) {
                event.preventDefault();
                handleLogout();
            });
        }
    } else {
        navLinks.innerHTML = `
            <a href="">Welcome</a>
            <a href="browse">Browse Games</a>
            <a href="login">Login</a>
            <a href="signup">Sign Up</a>
        `;
    }
}