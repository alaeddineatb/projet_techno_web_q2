const allGames = window.allGames || [];
let currentGame = null;
let currentUsername = localStorage.getItem('username') || 'Utilisateur';
let socket;

document.addEventListener('DOMContentLoaded', function() {

    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    // Extract game ID from URL
    const gameId = window.location.pathname.split('/game/')[1];
    console.log("GameId:", gameId);
    
    if (gameId) {
        loadGameDetails(gameId);
        setupRatingStars();
        setupModalHandlers();
        setupForumChat(gameId);
    } else {
        console.error("ID du jeu non trouvé dans l'URL");
        // Redirect back to browse if game ID is missing
        setTimeout(() => {
            window.location.href = '/browse';
        }, 1000);
    }

    // Set up event listeners
    document.getElementById('purchase-btn').addEventListener('click', () => handlePurchaseClick(gameId));
    document.getElementById('submit-rating').addEventListener('click', () => submitRating(gameId));
    
    // Set up payment form
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => processPayment(e, gameId));
    }
    
    // Card input formatting
    setupCardInputFormatting();
});

function loadGameDetails(gameId) {
    // Convert to integer for comparison if needed
    const gameIdInt = parseInt(gameId);
    currentGame = window.allGames.find(g => g.game_id === gameIdInt || g.game_id === gameId);
    console.log("Jeu trouvé:", currentGame);

    if (!currentGame) {
        console.error('Jeu introuvable');
        alert("Jeu non trouvé. Retour à la liste des jeux.");
        window.location.href = '/browse';
        return;
    }

    // Update the interface
    document.getElementById('game-title').textContent = currentGame.title;
    document.getElementById('game-publisher').textContent = currentGame.publisher;
    document.getElementById('game-category').textContent = currentGame.category;
    document.getElementById('game-price').textContent = currentGame.price;
    document.getElementById('game-rating').textContent = currentGame.rating_avg;
    document.getElementById('game-description').textContent = currentGame.description;

    // Update image if available
    document.getElementById('game-img').src = currentGame.image;
    
    // Update page title
    document.title = `${currentGame.title} - Détails du Jeu - HustleWeb`;
}

function setupRatingStars() {
    const starsContainer = document.getElementById('rating-stars');
    const stars = document.querySelectorAll('#rating-stars span');
    let currentRating = 0;

    // Style initial des étoiles
    function updateStars(rating) {
        stars.forEach((star, index) => {
            star.style.color = index < rating ? '#00ff00' : '#666';
            star.classList.toggle('active', index < rating);
        });
        currentRating = rating;
    }

    // Événements pour chaque étoile
    stars.forEach(star => {
        // Survol
        star.addEventListener('mouseover', function() {
            const value = parseInt(this.getAttribute('data-value'));
            updateStars(value);
        });

        // Clic
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            currentRating = value;
            updateStars(value);
        });
    });

    // Quitter la zone des étoiles
    starsContainer.addEventListener('mouseleave', () => {
        updateStars(currentRating);
    });
}

function handlePurchaseClick(gameId) {
    // Check if user is logged in first
    if (!isUserAuthenticated()) {
        showModal('login-required-modal');
        return;
    }
    
    // User is authenticated, show payment modal
    if (currentGame) {
        document.getElementById('purchase-game-title').textContent = currentGame.title;
        document.getElementById('purchase-price').textContent = `Prix: ${currentGame.price} €`;
    }
    
    showModal('payment-modal');
}

function setupModalHandlers() {
    // Close buttons for all modals
    document.querySelectorAll('.close-button, .close-modal').forEach(button => {
        button.addEventListener('click', function() {
            hideAllModals();
        });
    });
    
    // Outside click to close modals
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                hideAllModals();
            }
        });
    });
    
    // Login redirect button
    document.getElementById('go-to-login').addEventListener('click', function() {
        window.location.href = '/login';
    });
}

function showModal(modalId) {
    hideAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto'; // Re-enable scrolling
}

async function submitRating(gameId) {
    if (!isUserAuthenticated()) {
        showModal('login-required-modal');
        return;
    }
    
    try {
        const selectedStars = document.querySelectorAll('#rating-stars span.active');
        const rating = selectedStars.length;
        
        if (rating === 0) {
            alert('Veuillez sélectionner une note entre 1 et 5 étoiles');
            return;
        }
        
        const response = await fetch(`/api/games/${gameId}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rating: rating })
        });
        
        if (response.ok) {
            const result = await response.json();
            document.getElementById('game-rating').textContent = result.new_rating_avg.toFixed(1);
            alert('Votre note a été enregistrée !');
        } else {
            const error = await response.json();
            alert(error.detail || 'Erreur lors de l\'envoi de la note');
        }
    } catch (error) {
        console.error('Rating error:', error);
        alert('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
}

async function processPayment(event, gameId) {
    event.preventDefault();
    
    const cardName = document.getElementById('card-name').value;
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;
    
    // Validation basique
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    const confirmButton = document.getElementById('confirm-purchase');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Traitement...';

    try {
        // Appel réel au backend
        const response = await fetch(`/purchase/${gameId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || "Échec de l'achat");
        }

        hideAllModals();
        showModal('purchase-success-modal');
        document.getElementById('payment-form').reset();

    } catch (error) {
        alert(`ERREUR: ${error.message}`);
    } finally {
        confirmButton.disabled = false;
        confirmButton.textContent = 'Confirmer l\'achat';
    }
}

// Helper function to simulate payment processing
function simulatePaymentProcessing() {
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            resolve({ success: true });
        }, 1500);
    });
}

// Helper function to check if user is authenticated
function isUserAuthenticated() {
    // Check local storage and cookies
    return localStorage.getItem('isLoggedIn') === 'true' || 
           localStorage.getItem('token') || 
           document.cookie.includes('token=');
}

// Set up card number formatting
function setupCardInputFormatting() {
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            // Remove non-digits
            let input = this.value.replace(/\D/g, '');
            
            // Add space after every 4 digits
            input = input.replace(/(\d{4})(?=\d)/g, '$1 ');
            
            // Update input value
            this.value = input;
        });
    }
    
    const expiryInput = document.getElementById('card-expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            // Remove non-digits
            let input = this.value.replace(/\D/g, '');
            
            // Add slash after month
            if (input.length > 2) {
                input = input.substring(0, 2) + '/' + input.substring(2, 4);
            }
            
            // Update input value
            this.value = input;
        });
    }
    
    const cvvInput = document.getElementById('card-cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            // Allow only digits
            this.value = this.value.replace(/\D/g, '');
        });
    }
}

// Forum/Chat functionality
function setupForumChat(gameId) {
    const isLoggedIn = isUserAuthenticated();
    const sendButton = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');
    const loginNotice = document.querySelector('.login-required-notice');
    
    // Show/hide appropriate elements based on login status
    if (!isLoggedIn) {
        sendButton.disabled = true;
        messageInput.disabled = true;
        messageInput.placeholder = "Connectez-vous pour participer...";
        loginNotice.style.display = 'block';
    } else {
        // Set up message sending functionality
        sendButton.addEventListener('click', () => sendForumMessage(gameId));
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendForumMessage(gameId);
            }
        });

        // Initialiser WebSocket
        setupWebSocket(gameId);
    }
    
    // Load existing messages
    loadForumMessages(gameId);
}

function setupWebSocket(gameId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat/${gameId}`;
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('WebSocket connecté');
    };

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        appendNewMessage(message);
    };

    socket.onerror = (error) => {
        console.error('WebSocket erreur:', error);
    };

    socket.onclose = () => {
        console.log('WebSocket déconnecté');
        // Tentative de reconnexion après 5 secondes
        setTimeout(() => setupWebSocket(gameId), 5000);
    };

    // Nettoyer la connexion WebSocket lors de la fermeture de la page
    window.addEventListener('beforeunload', () => {
        if (socket) {
            socket.close();
        }
    });
}

function appendNewMessage(message) {
    const messagesContainer = document.getElementById('forum-messages');
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadForumMessages(gameId) {
    const messagesContainer = document.getElementById('forum-messages');
    if (!messagesContainer) return;

    try {
        // Afficher un loader
        messagesContainer.innerHTML = '<div class="loader">Chargement des messages...</div>';

        // Appel API
        const response = await fetch(`/games/${gameId}/messages`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const messages = await response.json();

        // Vider le conteneur
        messagesContainer.innerHTML = '';

        // Ajouter chaque message
        messages.forEach(msg => {
            const messageElement = document.createElement('div');
            messageElement.className = 'forum-message';
            messageElement.innerHTML = `
                <div class="message-header">
                    <span class="message-user">${msg.user.username}</span>
                    <span class="message-time">${timeSince(msg.created_at)}</span>
                </div>
                <p class="message-content">${msg.content}</p>
            `;
            messagesContainer.appendChild(messageElement);
        });

        // Scroll automatique vers le bas
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Erreur chargement messages:', error);
        messagesContainer.innerHTML = '<div class="error">Erreur de chargement des messages</div>';
    }
}

function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'forum-message';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';
    
    const userSpan = document.createElement('span');
    userSpan.className = 'message-user';
    userSpan.textContent = message.user;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.textContent = `Il y a ${message.time}`;
    
    headerDiv.appendChild(userSpan);
    headerDiv.appendChild(timeSpan);
    
    const contentP = document.createElement('p');
    contentP.className = 'message-content';
    contentP.textContent = message.content;
    
    messageDiv.appendChild(headerDiv);
    messageDiv.appendChild(contentP);
    
    return messageDiv;
}

async function sendForumMessage(gameId) {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`/api/games/${gameId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ content: content })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || "Erreur lors de l'envoi");
        }

        // Vider l'input après envoi réussi
        messageInput.value = '';
        
        // Le message sera affiché via WebSocket

    } catch (error) {
        alert(`Erreur: ${error.message}`);
        console.error("Erreur complète:", error);
    }
}

function timeSince(dateString) {
    // 1. Forcer le format UTC si absent
    const isoDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(isoDateString);
    
    // 2. Validation de la date
    if (isNaN(date)) {
        console.error(`Date invalide : ${dateString}`);
        return 'date inconnue';
    }

    // 3. Calcul en UTC pour éviter les décalages
    const nowUTC = Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
        new Date().getUTCHours(),
        new Date().getUTCMinutes(),
        new Date().getUTCSeconds()
    );
    
    const dateUTC = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds()
    );

    const seconds = Math.floor((nowUTC - dateUTC) / 1000);
    
    // 4. Détection précise des intervalles
    const intervals = {
        année: 31536000,
        mois:  2592000,
        jour:   86400,
        heure:   3600,
        minute:    60
    };

    // 5. Trouver le plus grand intervalle
    let largestUnit = 'seconde';
    let largestValue = 0;
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            largestUnit = unit;
            largestValue = interval;
            break; // Prend le premier intervalle valide
        }
    }

    // 6. Formatage intelligent
    if (largestUnit === 'seconde') {
        return 'à l\'instant';
    }
    
    const plural = largestValue > 1 ? 's' : '';
    return `il y a ${largestValue} ${largestUnit}${plural}`;
}