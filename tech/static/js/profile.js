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

// Load user's purchased games
async function loadPurchasedGames() {
    const purchasedGamesContainer = document.getElementById('purchased-games');
    
    try {
        const response = await fetch('/api/user/purchases', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur lors du chargement des jeux');
        const games = await response.json();
        
        purchasedGamesContainer.innerHTML = '';
        
        if (games.length === 0) {
            purchasedGamesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore acheté de jeux.</p>
                    <p>Découvrez notre catalogue !</p>
                    <a href="/browse" class="cta-button">Parcourir les jeux</a>
                </div>
            `;
            return;
        }
        
        games.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <img src="${game.image}" alt="${game.title}" class="game-cover">
                <div class="game-info">
                    <h4>${game.title}</h4>
                    <p>${game.category}</p>
                    <div class="game-rating">
                        ${game.rating_avg ? '★'.repeat(Math.round(game.rating_avg)) + '☆'.repeat(5 - Math.round(game.rating_avg)) : 'Non noté'}
                    </div>
                </div>
            `;
            
            gameCard.addEventListener('click', () => {
                window.location.href = `/game/${game.game_id}`;
            });
            
            purchasedGamesContainer.appendChild(gameCard);
        });
    } catch (error) {
        console.error('Error loading purchases:', error);
        purchasedGamesContainer.innerHTML = `
            <div class="empty-state">
                <p>Une erreur s'est produite lors du chargement de vos jeux.</p>
                <p>Veuillez réessayer plus tard.</p>
            </div>
        `;
    }
}

// Load user ratings
async function loadUserRatings() {
    const ratingsContainer = document.getElementById('user-ratings');
    
    try {
        const response = await fetch('/api/user/ratings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur lors du chargement des notes');
        const ratings = await response.json();
        
        ratingsContainer.innerHTML = '';
        
        if (ratings.length === 0) {
            ratingsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore évalué de jeux.</p>
                    <p>Notez vos jeux pour aider les autres joueurs!</p>
                </div>
            `;
            return;
        }
        
        ratings.forEach(rating => {
            const ratingItem = document.createElement('div');
            ratingItem.className = 'rating-item';
            ratingItem.innerHTML = `
                <img src="${rating.game.image}" alt="${rating.game.title}" class="rating-game-cover">
                <div class="rating-details">
                    <h4 class="rating-game-title">${rating.game.title}</h4>
                    <div class="rating-date">${timeSince(rating.created_at)}</div>
                    <div class="rating-stars">${'★'.repeat(rating.value)}${'☆'.repeat(5 - rating.value)}</div>
                </div>
            `;
            
            ratingItem.addEventListener('click', () => {
                window.location.href = `/game/${rating.game.game_id}`;
            });
            
            ratingsContainer.appendChild(ratingItem);
        });
    } catch (error) {
        console.error('Error loading ratings:', error);
        ratingsContainer.innerHTML = `
            <div class="empty-state">
                <p>Une erreur s'est produite lors du chargement de vos notes.</p>
                <p>Veuillez réessayer plus tard.</p>
            </div>
        `;
    }
}

// Load user messages
async function loadUserMessages() {
    const messagesContainer = document.getElementById('user-messages');
    
    try {
        const response = await fetch('/api/user/messages', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Erreur lors du chargement des messages');
        const messages = await response.json();
        
        messagesContainer.innerHTML = '';
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore posté de messages.</p>
                    <p>Rejoignez les discussions dans les forums de jeux!</p>
                </div>
            `;
            return;
        }
        
        messages.forEach(message => {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            messageItem.innerHTML = `
                <div class="message-header">
                    <div class="message-game">${message.game.title}</div>
                    <div class="message-date">${timeSince(message.created_at)}</div>
                </div>
                <p class="message-content">${message.content}</p>
            `;
            
            messageItem.addEventListener('click', () => {
                window.location.href = `/game/${message.game.game_id}`;
            });
            
            messagesContainer.appendChild(messageItem);
        });
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = `
            <div class="empty-state">
                <p>Une erreur s'est produite lors du chargement de vos messages.</p>
                <p>Veuillez réessayer plus tard.</p>
            </div>
        `;
    }
}

// Helper function to simulate API calls
function simulateApiCall(endpoint, delay = 1000) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Mock data based on endpoint
            if (endpoint.includes('purchases')) {
                resolve([
                    { id: 1, title: 'Cyberpunk 2077', category: 'RPG', image: '#4a2c82', rating: 4 },
                    { id: 2, title: 'FIFA 2025', category: 'Sports', image: '#2c824a', rating: 3 },
                    { id: 3, title: 'Call of Duty: Future Warfare', category: 'FPS', image: '#822c2c', rating: 5 },
                    { id: 4, title: 'Minecraft Universe', category: 'Sandbox', image: '#2c6982', rating: 4 },
                    { id: 5, title: 'Assassin\'s Creed: Quantum', category: 'Action/Adventure', image: '#565682', rating: null }
                ]);
            } else if (endpoint.includes('ratings')) {
                resolve([
                    { 
                        game: { id: 1, title: 'Cyberpunk 2077', image: '#4a2c82' },
                        rating: 4,
                        date: '14 avril 2025'
                    },
                    { 
                        game: { id: 2, title: 'FIFA 2025', image: '#2c824a' },
                        rating: 3,
                        date: '10 avril 2025'
                    },
                    { 
                        game: { id: 3, title: 'Call of Duty: Future Warfare', image: '#822c2c' },
                        rating: 5,
                        date: '5 avril 2025'
                    },
                    { 
                        game: { id: 4, title: 'Minecraft Universe', image: '#2c6982' },
                        rating: 4,
                        date: '1 avril 2025'
                    }
                ]);
            } else if (endpoint.includes('messages')) {
                resolve([
                    {
                        id: 1,
                        game: { id: 1, title: 'Cyberpunk 2077' },
                        content: 'Comment débloque-t-on la fin secrète ? J\'ai essayé plusieurs méthodes mais aucune ne fonctionne...',
                        date: 'Hier à 15:30'
                    },
                    {
                        id: 2,
                        game: { id: 3, title: 'Call of Duty: Future Warfare' },
                        content: 'Le nouveau mode zombie est incroyable ! Qui veut faire équipe pour essayer de battre le record ?',
                        date: '15 avril 2025'
                    },
                    {
                        id: 3,
                        game: { id: 4, title: 'Minecraft Universe' },
                        content: 'J\'ai créé un serveur pour construire une réplique de Paris, rejoignez-moi si ça vous intéresse !',
                        date: '10 avril 2025'
                    }
                ]);
            } else {
                resolve([]);
            }
        }, delay);
    });
}