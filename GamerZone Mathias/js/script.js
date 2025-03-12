document.addEventListener('DOMContentLoaded', function() {
    updateNav();
});

function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    const userStatus = localStorage.getItem('userStatus') || 'guest';

    if (userStatus === 'loggedIn') {
        navLinks.innerHTML = `
            <a href="browse.html">Home</a>
            <a href="profile.html">My Profile</a>
            <a href="#" id="logout-link">Logout</a>
        `;
        
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(event) {
                event.preventDefault();
                localStorage.setItem('userStatus', 'guest');
                window.location.href = 'index.html';
            });
        }
    } else {
        navLinks.innerHTML = `
            <a href="index.html">Welcome</a>
            <a href="browse.html">Browse Games</a>
            <a href="login.html">Login</a>
            <a href="signup.html">Sign Up</a>
        `;
    }
}

function loginUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (username && password) {
        // Store login status (in a real app, this would involve server authentication)
        localStorage.setItem('userStatus', 'loggedIn');
        localStorage.setItem('username', username);
        
        window.location.href = 'browse.html';
    } else {
        alert('Please enter both username and password');
    }
}

function signupUser() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (username && email && password) {
        localStorage.setItem('userStatus', 'loggedIn');
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        
        window.location.href = 'browse.html';
    } else {
        alert('Please fill in all fields');
    }
}