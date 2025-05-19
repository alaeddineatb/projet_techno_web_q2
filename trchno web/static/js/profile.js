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

// Load purchased games from server or mock data
async function loadPurchasedGames() {
    const purchasedGamesContainer = document.getElementById('purchased-games');
    
    try {
        // In a real application, this would be a fetch request to your API
        // For this demo, we'll simulate an API response with mock data
        const mockApiResponse = await simulateApiCall('/api/user/purchases', 1000);
        
        // Update games count
        const gamesCountElement = document.getElementById('games-count');
        if (gamesCountElement) {
            gamesCountElement.textContent = mockApiResponse.length;
        }
        
        // Clear loading state
        purchasedGamesContainer.innerHTML = '';
        
        if (mockApiResponse.length === 0) {
            // Show empty state
            purchasedGamesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore acheté de jeux.</p>
                    <p>Parcourez notre catalogue et commencez votre collection!</p>
                    <a href="/browse" class="cta-button">Explorer les jeux</a>
                </div>
            `;
            return;
        }
        
        // Create game cards
        mockApiResponse.forEach(game => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <div class="game-cover" style="background-color: ${game.image}"></div>
                <div class="game-info">
                    <h4>${game.title}</h4>
                    <p>${game.category}</p>
                    <div class="game-rating">
                        ${game.rating ? '★'.repeat(game.rating) + '☆'.repeat(5 - game.rating) : 'Non noté'}
                    </div>
                </div>
            `;
            
            // Add click handler to navigate to game details
            gameCard.addEventListener('click', () => {
                window.location.href = `/game/${game.id}`;
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

// Load user ratings from server or mock data
async function loadUserRatings() {
    const ratingsContainer = document.getElementById('user-ratings');
    
    try {
        // In a real application, this would be a fetch request to your API
        // For this demo, we'll simulate an API response with mock data
        const mockApiResponse = await simulateApiCall('/api/user/ratings', 1500);
        
        // Clear loading state
        ratingsContainer.innerHTML = '';
        
        if (mockApiResponse.length === 0) {
            // Show empty state
            ratingsContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore évalué de jeux.</p>
                    <p>Notez vos jeux pour aider les autres joueurs!</p>
                </div>
            `;
            return;
        }
        
        // Create rating items
        mockApiResponse.forEach(rating => {
            const ratingItem = document.createElement('div');
            ratingItem.className = 'rating-item';
            ratingItem.innerHTML = `
                <div class="rating-game-cover" style="background-color: ${rating.game.image}"></div>
                <div class="rating-details">
                    <h4 class="rating-game-title">${rating.game.title}</h4>
                    <div class="rating-date">${rating.date}</div>
                    <div class="rating-stars">${'★'.repeat(rating.rating)}${'☆'.repeat(5 - rating.rating)}</div>
                </div>
            `;
            
            // Add click handler to navigate to game details
            ratingItem.addEventListener('click', () => {
                window.location.href = `/game/${rating.game.id}`;
            });
            
            ratingsContainer.appendChild(ratingItem);
        });
    } catch (error) {
        console.error('Error loading ratings:', error);
        ratingsContainer.innerHTML = `
            <div class="empty-state">
                <p>Une erreur s'est produite lors du chargement de vos évaluations.</p>
                <p>Veuillez réessayer plus tard.</p>
            </div>
        `;
    }
}

// Load user forum messages from server or mock data
async function loadUserMessages() {
    const messagesContainer = document.getElementById('user-messages');
    
    try {
        // In a real application, this would be a fetch request to your API
        // For this demo, we'll simulate an API response with mock data
        const mockApiResponse = await simulateApiCall('/api/user/messages', 2000);
        
        // Clear loading state
        messagesContainer.innerHTML = '';
        
        if (mockApiResponse.length === 0) {
            // Show empty state
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <p>Vous n'avez pas encore posté de messages.</p>
                    <p>Rejoignez les discussions dans les forums de jeux!</p>
                </div>
            `;
            return;
        }
        
        // Create message items
        mockApiResponse.forEach(message => {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            messageItem.innerHTML = `
                <div class="message-header">
                    <div class="message-game">${message.game.title}</div>
                    <div class="message-date">${message.date}</div>
                </div>
                <p class="message-content">${message.content}</p>
            `;
            
            // Add click handler to navigate to game forum
            messageItem.addEventListener('click', () => {
                window.location.href = `/game/${message.game.id}`;
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