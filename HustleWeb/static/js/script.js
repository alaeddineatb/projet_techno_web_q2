document.addEventListener('DOMContentLoaded', function() {
    updateNav();
    

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
        
        const data = await response.json();
        if (response.ok || response.status === 303) {
            window.location.href = '/browse';
        } else {
            alert('Login failed - please check your credentials');
        }
    } catch (error) {
        console.log('Sending data:', error);
        alert('Network error - please try again');
    }
}


async function signupUser(event) {
    event.preventDefault();
    try {
        const form = event.target; 
        const formData = new FormData(form); 

        const response = await fetch('/signup', {
            method: 'POST',
            body: formData 
        });

        if (response.ok) window.location.href = '/login';
        else alert('Erreur: ' + await response.text());
    } catch (error) {
        alert('Erreur réseau');
    }
}

function handleLogout() {

    window.location.href = '';
}


function updateNav() {
    const navLinks = document.getElementById('nav-links');
    const token = document.cookie.includes('token=');

    if (!navLinks) return;



    if (token) {
        navLinks.innerHTML = `
            <a href="browse">Home</a>
            <a href="browse">Browse Games</a>
            <a href="profile">My Profile</a>
            <a href="#" id="logout-link">Logout</a>
        `;
        
        const logoutLink = document.getElementById('logout-link');
        e.preventDefault();
        window.location.href = '/profile';
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