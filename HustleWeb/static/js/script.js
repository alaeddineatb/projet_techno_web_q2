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
    try {
    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);
    
    console.log('Sending data:', Object.fromEntries(formData)); // Debug
        const response = await fetch('/login', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok || response.status === 303) {
            localStorage.setItem('userStatus', 'loggedIn');
            localStorage.setItem('username', username);
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
    
   

    try {
        const formData = new FormData();
        formData.append('username', document.getElementById('username').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('password', document.getElementById('password').value);
    
        console.log('Sending data:', Object.fromEntries(formData)); // Debug
    
        const response = await fetch('/signup', {
            method: 'POST',
            body: formData
        });
    
        console.log('Response status:', response.status); // Debug
        const data = await response.text();
        console.log('Response data:', data); // Debug
    
        if (response.ok || response.status === 303) {
            window.location.href = '/login';
        } else {
            alert('Registration failed: ' + data);
        }
    } catch (error) {
        console.error('Error:', error); // Debug détaillé
        alert('Error occurred');
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
            <a href="profile">Profile</a>
        `;
    }
}