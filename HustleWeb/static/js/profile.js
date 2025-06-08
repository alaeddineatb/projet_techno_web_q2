document.addEventListener('DOMContentLoaded', function() {
    checkProfileAuth();
    displayUserInfo();
    setupPhotoUpload();
    setupTabs();
    loadPurchasedGames();
    loadUserMessages();
});

function checkProfileAuth() {
    const isLoggedIn = document.cookie.includes('token=') || 
                       localStorage.getItem('isLoggedIn') === 'true';
    
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
    
    if (usernameElement && usernameElement.dataset.username) {
        usernameElement.textContent = usernameElement.dataset.username;
    } else {
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
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

async function loadPurchasedGames() {
    const purchasedGamesContainer = document.getElementById('purchased-games');
    
    try {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.textContent = 'Chargement de vos jeux...';
        
        purchasedGamesContainer.replaceChildren();
        purchasedGamesContainer.appendChild(loader);
        
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
        
        purchasedGamesContainer.replaceChildren();
        
        if (purchasedGames.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const emptyText = document.createElement('p');
            emptyText.textContent = "Vous n'avez pas encore acheté de jeux.";
            
            const exploreLink = document.createElement('a');
            exploreLink.href = '/browse';
            exploreLink.className = 'cta-button';
            exploreLink.textContent = 'Explorer les jeux';
            
            emptyState.appendChild(emptyText);
            emptyState.appendChild(exploreLink);
            purchasedGamesContainer.appendChild(emptyState);
            return;
        }
        
        purchasedGames.forEach(game => {
            const roundedRating = Math.round(game.rating_avg || 0);
            const stars = '★'.repeat(roundedRating) + '☆'.repeat(5 - roundedRating);
            
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            
            const gameCover = document.createElement('div');
            gameCover.className = 'game-cover';
            gameCover.style.backgroundColor = game.image;
            
            const gameInfo = document.createElement('div');
            gameInfo.className = 'game-info';
            
            const gameTitle = document.createElement('h4');
            gameTitle.textContent = game.title;
            
            const gameCategory = document.createElement('p');
            gameCategory.textContent = game.category;
            
            const gameRating = document.createElement('div');
            gameRating.className = 'game-rating';
            gameRating.textContent = stars;
            
            const purchaseDate = document.createElement('div');
            purchaseDate.className = 'purchase-date';
            purchaseDate.textContent = `Acheté le: ${new Date(game.purchase_date).toLocaleDateString()}`;
            
            gameInfo.appendChild(gameTitle);
            gameInfo.appendChild(gameCategory);
            gameInfo.appendChild(gameRating);
            gameInfo.appendChild(purchaseDate);
            
            gameCard.appendChild(gameCover);
            gameCard.appendChild(gameInfo);
            
            gameCard.addEventListener('click', () => {
                window.location.href = `/game/${game.id}`;
            });
            
            purchasedGamesContainer.appendChild(gameCard);
        });
        
    } catch (error) {
        console.error('Erreur:', error);
        purchasedGamesContainer.replaceChildren();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'Erreur de chargement des jeux achetés';
        purchasedGamesContainer.appendChild(errorDiv);
    }
}

async function loadUserMessages() {
    const messagesContainer = document.getElementById('user-messages');
    
    try {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.textContent = 'Chargement de vos messages...';
        
        messagesContainer.replaceChildren();
        messagesContainer.appendChild(loader);
        
        const response = await fetch('/api/user/messages', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur de chargement');
        
        const userMessages = await response.json();
        
        messagesContainer.replaceChildren();
        
        if (userMessages.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            
            const emptyText = document.createElement('p');
            emptyText.textContent = "Vous n'avez pas encore envoyé de messages.";
            
            const exploreLink = document.createElement('a');
            exploreLink.href = '/browse';
            exploreLink.className = 'cta-button';
            exploreLink.textContent = 'Explorer et parler de vos jeux préfèrés';
            
            emptyState.appendChild(emptyText);
            emptyState.appendChild(exploreLink);
            messagesContainer.appendChild(emptyState);
            return;
        }
        
        userMessages.forEach(message => {
            const messageCard = document.createElement('div');
            messageCard.className = 'message-card';
            
            const messageHeader = document.createElement('div');
            messageHeader.className = 'message-header';
            
            const messageGame = document.createElement('span');
            messageGame.className = 'message-game';
            messageGame.textContent = message.game.title;
            
            const messageDate = new Date(message.created_at);
            const formattedDate = `${messageDate.toLocaleDateString()} à ${messageDate.toLocaleTimeString()}`;
            
            const messageDateSpan = document.createElement('span');
            messageDateSpan.className = 'message-date';
            messageDateSpan.textContent = formattedDate;
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = message.content;
            
            messageHeader.appendChild(messageGame);
            messageHeader.appendChild(messageDateSpan);
            messageCard.appendChild(messageHeader);
            messageCard.appendChild(messageContent);
            
            messageCard.addEventListener('click', () => {
                window.location.href = `/game/${message.game_id}#message-${message.message_id}`;
            });
            
            messagesContainer.appendChild(messageCard);
        });
        
    } catch (error) {
        console.error('Erreur:', error);
        messagesContainer.replaceChildren();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'Erreur de chargement des messages';
        messagesContainer.appendChild(errorDiv);
    }
}