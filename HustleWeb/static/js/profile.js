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
    loadUserRatings();
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
    
    // Set joined date (mock data, in a real app this would come from the server)
    const memberSinceElement = document.getElementById('member-since');
    if (memberSinceElement) {
        memberSinceElement.textContent = 'Mars 2025';
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
        
        // Créer les cartes de jeu
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




async function loadUserRatings() {
    const ratingsContainer = document.getElementById('user-ratings-container');
    if (!ratingsContainer) return; // Garde contre les éléments manquants
    
    try {
        ratingsContainer.innerHTML = '<div class="loader">Chargement de vos évaluations...</div>';
        
        const response = await fetch('/api/user/ratings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            // Amélioration du message d'erreur
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
        }
        
        const userRatings = await response.json();
        console.log("Réponse API des évaluations:", userRatings); // Debug
        
        // Validation des données
        if (!Array.isArray(userRatings)) {
            throw new Error('Réponse API invalide: les évaluations ne sont pas un tableau');
        }
        
        ratingsContainer.innerHTML = '';
        
        if (userRatings.length === 0) {
            ratingsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore évalué de jeux.</p>
                </div>
            `;
            return;
        }
        
        // Créer les cartes d'évaluation avec validation robuste
        userRatings.forEach(rating => {
            // Validation des propriétés essentielles
            if (!rating || typeof rating !== 'object') {
                console.warn('Évaluation invalide:', rating);
                return;
            }
            
            // Utiliser des valeurs par défaut pour les propriétés manquantes
            const game = rating.game || {};
            const gameId = game.id || rating.game_id || 'inconnu';
            const gameTitle = game.title || 'Jeu inconnu';
            const ratingValue = rating.value || 0;
            const createdAt = rating.created_at ? new Date(rating.created_at) : new Date();
            
            const formattedDate = `${createdAt.toLocaleDateString()} à ${createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            const avgRating = game.rating_avg || 0;
            
            const ratingCard = document.createElement('div');
            ratingCard.className = 'rating-card';
            ratingCard.innerHTML = `
                <div class="rating-header">
                    <span class="rating-game">${gameTitle}</span>
                    <span class="rating-date">${formattedDate}</span>
                </div>
                <div class="rating-content">
                    <div class="user-rating">
                        <span>Votre note:</span>
                        <div class="stars" 
                             data-game-id="${gameId}" 
                             data-rating="${ratingValue}">
                        </div>
                    </div>
                    <div class="avg-rating">
                        <span>Note moyenne:</span>
                        <div class="stars">${createStars(avgRating)}</div>
                    </div>
                </div>
            `;
            
            ratingCard.addEventListener('click', () => {
                window.location.href = `/game/${gameId}`;
            });
            
            ratingsContainer.appendChild(ratingCard);
        });
        
        // Ajouter les étoiles interactives
        setupRatingStarsInProfile();
        
    } catch (error) {
        console.error('Erreur lors du chargement des évaluations:', error);
        ratingsContainer.innerHTML = `
            <div class="error">
                <p>Erreur de chargement des évaluations</p>
                <p>${error.message}</p>
                <button class="retry-btn" onclick="loadUserRatings()">Réessayer</button>
            </div>
        `;
    }
}

// Fonction utilitaire pour créer les étoiles avec validation
function createStars(rating) {
    // S'assurer que rating est un nombre
    const numericRating = Number(rating) || 0;
    const roundedRating = Math.min(5, Math.max(0, Math.round(numericRating)));
    return '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);
}

// Fonction pour configurer les étoiles dans le profil
function setupRatingStarsInProfile() {
    const starsContainers = document.querySelectorAll('.user-rating .stars');
    
    starsContainers.forEach(starsContainer => {
        const gameId = starsContainer.dataset.gameId;
        const userRating = parseInt(starsContainer.dataset.rating) || 0;
        
        // Nettoyer le conteneur
        starsContainer.innerHTML = '';
        
        // Créer les étoiles avec validation
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('span');
            star.className = 'star';
            star.textContent = i <= userRating ? '★' : '☆';
            star.dataset.value = i;
            starsContainer.appendChild(star);
        }
    });
}


















