document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupAdminPage();
    setupPageHandlers();
    
    console.log('Admin page loaded');
});

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

function updateNavigation(isAuthenticated) {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;
    
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
            adminLink.href = '/admin.html';
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

async function handleLogout(event) {
    if (event) event.preventDefault();
    
    try {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('loginTimestamp');
        
        await fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
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

function setupAdminPage() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'manage-users') {
                loadUsers();
            }
        });
    });
    
    const gameForm = document.getElementById('game-form');
    if (gameForm) {
        gameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                price: parseFloat(document.getElementById('price').value),
                publisher: document.getElementById('publisher').value,
                category: document.getElementById('category').value,
                platforms: document.getElementById('platforms').value,
                image_url: document.getElementById('image_url').value
            };
            
            try {
                const response = await fetch('/games/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                if (response.ok) {
                    alert('Jeu ajouté avec succès!');
                    document.getElementById('game-form').reset();
                } else {
                    const error = await response.text();
                    alert(`Erreur: ${error}`);
                }
            } catch (err) {
                alert('Erreur réseau: ' + err.message);
            }
        });
    }
    
    const manageUsersTab = document.getElementById('manage-users');
    if (manageUsersTab && manageUsersTab.classList.contains('active')) {
        loadUsers();
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/admin/users');
        if (!response.ok) throw new Error('Erreur serveur');
        
        const users = await response.json();
        renderUsers(users);
    } catch (err) {
        console.error('Erreur chargement utilisateurs:', err);
        alert('Impossible de charger les utilisateurs');
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-list-body');
    if (!tbody) return;
    
    tbody.replaceChildren();
    
    users.forEach(user => {
        const tr = document.createElement('tr');
        
        const tdId = document.createElement('td');
        tdId.textContent = user.user_id;
        
        const tdUsername = document.createElement('td');
        tdUsername.textContent = user.username;
        
        const tdEmail = document.createElement('td');
        tdEmail.textContent = user.email;
        
        const tdStatus = document.createElement('td');
        const statusSpan = document.createElement('span');
        statusSpan.classList.add('user-status');
        statusSpan.classList.add(user.is_banned ? 'status-banned' : 'status-active');
        statusSpan.textContent = user.is_banned ? 'Banni' : 'Actif';
        tdStatus.appendChild(statusSpan);
        
        const tdActions = document.createElement('td');
        const actionBtn = document.createElement('button');
        
        if (user.is_banned) {
            actionBtn.classList.add('action-btn', 'unban-btn');
            actionBtn.textContent = 'Débannir';
            actionBtn.addEventListener('click', () => unbanUser(user.user_id));
        } else {
            actionBtn.classList.add('action-btn', 'ban-btn');
            actionBtn.textContent = 'Bannir';
            actionBtn.addEventListener('click', () => banUser(user.user_id));
        }
        
        tdActions.appendChild(actionBtn);
        
        tr.appendChild(tdId);
        tr.appendChild(tdUsername);
        tr.appendChild(tdEmail);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);
        
        tbody.appendChild(tr);
    });
}

async function banUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir bannir cet utilisateur ?')) return;
    
    try {
        const response = await fetch(`/admin/ban/${userId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadUsers();
        } else {
            const error = await response.text();
            alert(`Erreur: ${error}`);
        }
    } catch (err) {
        alert('Erreur réseau: ' + err.message);
    }
}

async function unbanUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir débannir cet utilisateur ?')) return;
    
    try {
        const response = await fetch(`/admin/unban/${userId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            loadUsers();
        } else {
            const error = await response.text();
            alert(`Erreur: ${error}`);
        }
    } catch (err) {
        alert('Erreur réseau: ' + err.message);
    }
}