const allGames = window.allGames || [];
let currentGame = null;
let currentUsername = localStorage.getItem('username') || 'Utilisateur';

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
    if (currentGame.image) {
        document.getElementById('game-img').src = currentGame.image;
    }
    
    // Update page title
    document.title = `${currentGame.title} - Détails du Jeu - HustleWeb`;
}

function setupRatingStars() {
    const container = document.getElementById('rating-stars');
    if (!container) return;
    
    const stars = container.querySelectorAll('span');
    
    container.addEventListener('click', (e) => {
        if (!e.target.matches('span')) return;
        
        const clickedValue = parseInt(e.target.getAttribute('data-value'));
        
        stars.forEach((star, index) => {
            if (index < clickedValue) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
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
        const activeStars = document.querySelectorAll('#rating-stars span.active');
        if (activeStars.length === 0) {
            alert('Veuillez sélectionner une note');
            return;
        }
        
        const rating = activeStars.length;
        
        const response = await fetch(`/games/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                game_id: Number(gameId),
                rating: rating 
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message);
            document.getElementById('game-rating').textContent = result.new_rating.toFixed(1);
            

            setTimeout(() => {
                document.querySelectorAll('#rating-stars span.active').forEach(star => {
                    star.classList.remove('active');
                });
            }, 2000);
        } 
        else {
            alert('Erreur: ' + (result.detail || 'Une erreur est survenue'));
        }
    } catch (error) {
        console.error('Rating error:', error);
    }
}

async function processPayment(event, gameId) {
    event.preventDefault();
    
    const cardName = document.getElementById('card-name').value;
    const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('card-expiry').value;
    const cardCvv = document.getElementById('card-cvv').value;
    

    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert('Veuillez remplir tous les champs');
        return;
    }

    const confirmButton = document.getElementById('confirm-purchase');
    confirmButton.disabled = true;
    confirmButton.textContent = 'Traitement...';

    try {
        const response = await fetch(`/purchase/${gameId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400 && data.detail.includes("déjà")) {
                hideAllModals();
                showModal('already-purchased-modal');
            } else {
                throw new Error(data.detail || "Échec de l'achat");
            }
            return;
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


function setupForumChat(gameId) {
    const isLoggedIn = isUserAuthenticated();
    const sendButton = document.getElementById('send-message');
    const messageInput = document.getElementById('message-input');
    const loginNotice = document.querySelector('.login-required-notice');
    

    if (!isLoggedIn) {
        sendButton.disabled = true;
        messageInput.disabled = true;
        messageInput.placeholder = "Connectez-vous pour participer...";
        loginNotice.style.display = 'block';
    } else {

        sendButton.addEventListener('click', () => sendForumMessage(gameId));
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendForumMessage(gameId);
            }
        });
    }
    

    loadForumMessages(gameId);
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
    try {
        const response = await fetch(`/games/${gameId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
                content: messageInput.value.trim() 
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || "Erreur lors de l'envoi");
        }

    
        await loadForumMessages(gameId);
        messageInput.value = '';

    } catch (error) {
        alert(`ERREUR: ${error.message}`);
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
    
    const intervals = {
        année: 31536000,
        mois:  2592000,
        jour:   86400,
        heure:   3600,
        minute:    60
    };


    let largestUnit = 'seconde';
    let largestValue = 0;
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            largestUnit = unit;
            largestValue = interval;
            break; 
        }
    }


    if (largestUnit === 'seconde') {
        return 'à l\'instant';
    }
    
    const plural = largestValue > 1 ? 's' : '';
    return `il y a ${largestValue} ${largestUnit}${plural}`;
}