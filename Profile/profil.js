// profile.js
document.addEventListener('DOMContentLoaded', function() {
    // Load user data from localStorage
    const username = localStorage.getItem('username') || 'Player';
    const email = localStorage.getItem('email') || 'player@gamerzone.com';
    
    document.getElementById('username-display').textContent = username;
    
    // Set current date as member since (for demo)
    const currentDate = new Date();
    const options = { year: 'numeric', month: 'long' };
    document.querySelector('.member-since').textContent = `Member since: ${currentDate.toLocaleDateString('en-US', options)}`;
    
    // Set username and email in account details
    const detailItems = document.querySelectorAll('.detail-item');
    detailItems[0].querySelector('p').textContent = username;
    detailItems[1].querySelector('p').textContent = email;
});

