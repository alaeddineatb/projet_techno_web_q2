document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    checkProfileAuth();
    
    // Setup profile functionality
    displayUserInfo();
    setupPhotoUpload();
    
    // Setup tabs
    setupTabs();
    
    // Load user data
    loadPurchasedGames();

    loadUserMessages();
});

// Check if user is authenticated for profile page
function checkProfileAuth() {
    // Check authentication using both cookies and localStorage
    const isLoggedIn = document.cookie.includes('token=') || 
                       localStorage.getItem('isLoggedIn') === 'true';
    
    // If not logged in, redirect to login page
    if (!isLoggedIn) {
        console.log('User not authenticated, redirecting to login');
        window.location.href = '/login';
        return;
    }
    
    console.log('User authenticated, displaying profile');
}

function displayUserInfo() {
    const usernameElement = document.getElementById('profile-username');
    const profilePicElement = document.getElementById('profile-pic');
    
    // Get values from data attributes (server-side rendered)
    if (usernameElement && usernameElement.dataset.username) {
        usernameElement.textContent = usernameElement.dataset.username;
    } else {
        // Fallback to localStorage if available
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            usernameElement.textContent = storedUsername;
        }
    }
    
    if (profilePicElement) {
        const profilePicSrc = usernameElement && usernameElement.dataset.profilePic || 
                              localStorage.getItem('profilePic') || 
                              '/static/img/default-avatar.jpg';
        profilePicElement.src = profilePicSrc;
    }
    
 
    const memberSinceElement = document.getElementById('member-since');
    if (memberSinceElement) {
        memberSinceElement.textContent = 'Juin 2025';
    }
}

function setupPhotoUpload() {
    const uploadInput = document.getElementById('photo-upload');
    if (!uploadInput) return;
    
    uploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch('/profile/update', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                const newPhotoUrl = data.photo_url + "?t=" + Date.now();
                document.getElementById('profile-pic').src = newPhotoUrl;
                
                // Also store in localStorage as backup
                localStorage.setItem('profilePic', newPhotoUrl);
            } else {
                alert('Error updating profile picture: ' + (await response.text()));
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error during upload. Please try again.');
        }
    });
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and panes
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding pane
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function loadPurchasedGames() {
    const purchasedGamesContainer = document.getElementById('purchased-games');
    
    try {
        purchasedGamesContainer.innerHTML = '<div class="loader">Chargement de vos jeux...</div>';
        
        const response = await fetch('/api/user/purchases', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const purchasedGames = await response.json();
        

        const gamesCountElement = document.getElementById('games-count');
        if (gamesCountElement) {
            gamesCountElement.textContent = purchasedGames.length;
        }
        
        purchasedGamesContainer.innerHTML = '';
        
        if (purchasedGames.length === 0) {
            purchasedGamesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore acheté de jeux.</p>
                    <a href="/browse" class="cta-button">Explorer les jeux</a>
                </div>
            `;
            return;
        }
        

        purchasedGames.forEach(game => {
            const roundedRating = Math.round(game.rating_avg || 0);
            const stars = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);
            
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <div class="game-cover" style="background-color: ${game.image}"></div>
                <div class="game-info">
                    <h4>${game.title}</h4>
                    <p>${game.category}</p>
                    <div class="game-rating">${stars}</div>
                    <div class="purchase-date">Acheté le: ${new Date(game.purchase_date).toLocaleDateString()}</div>
                </div>
            `;
            gameCard.addEventListener('click', () => {
                window.location.href = `/game/${game.id}`;
            });
            purchasedGamesContainer.appendChild(gameCard);
        });
        
    } catch (error) {
        console.error('Erreur:', error);
        purchasedGamesContainer.innerHTML = `
            <div class="error">Erreur de chargement des jeux achetés</div>
        `;
    }
}

async function loadUserMessages() {
     const messagesContainer = document.getElementById('user-messages');
    
    try {
        messagesContainer.innerHTML = '<div class="loader">Chargement de vos messages...</div>';
        
        const response = await fetch('/api/user/messages', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const userMessages = await response.json();
        
        
        messagesContainer.innerHTML = '';
        
        if (userMessages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore envoyé de messages.</p>
                    <a href="/browse" class="cta-button">Explorer et parler de vos jeux préfèrés</a>
                </div>
            `;
            return;
        }
        
      
        userMessages.forEach(message => {
            const messageCard = document.createElement('div');
            messageCard.className = 'message-card';
            
            const messageDate = new Date(message.created_at);
            const formattedDate = `${messageDate.toLocaleDateString()} à ${messageDate.toLocaleTimeString()}`;
            
            messageCard.innerHTML = `
                <div class="message-header">
                    <span class="message-game">${message.game.title}</span>
                    <span class="message-date">${formattedDate}</span>
                </div>
                <div class="message-content">${message.content}</div>
            `;
            
            messageCard.addEventListener('click', () => {
                window.location.href = `/game/${message.game_id}#message-${message.message_id}`;
            });
            
            messagesContainer.appendChild(messageCard);
        });
        
    } catch (error) {
        console.error('Erreur:', error);
        purchasedGamesContainer.innerHTML = `
            <div class="error">Erreur de chargement des jeux achetés</div>
        `;
    }
}























