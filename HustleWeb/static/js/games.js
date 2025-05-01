const allGames = window.allGames || [];
let currentGame = null;
let currentUsername = localStorage.getItem('username') || 'Utilisateur';

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and update navigation if script.js is available
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
    const stars = document.querySelectorAll('#rating-stars span');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const value = parseInt(this.getAttribute('data-value'));
            stars.forEach((s, index) => {
                s.classList.toggle('active', index < value);
            });
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
    // Check if user is logged in first
    if (!isUserAuthenticated()) {
        showModal('login-required-modal');
        return;
    }
    
    try {
        const selectedStar = document.querySelector('#rating-stars span.active:last-child');
        if (!selectedStar) {
            alert('Veuillez sélectionner une note');
            return;
        }
        
        const rating = parseInt(selectedStar.getAttribute('data-value'));
        
        const response = await fetch(`/games/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ game_id: gameId, rating: rating })
        });
        
        if (response.ok) {
            alert('Note envoyée!');
        } else {
            const errorText = await response.text();
            alert('Erreur lors de l\'envoi: ' + errorText);
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
    
    // Basic validation
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert('Veuillez remplir tous les champs du formulaire.');
        return;
    }
    
    if (cardNumber.length !== 16) {
        alert('Le numéro de carte doit contenir 16 chiffres.');
        return;
    }
    
    if (cardCvv.length !== 3) {
        alert('Le code CVV doit contenir 3 chiffres.');
        return;
    }
    
    // Show loading state
    const confirmButton = document.getElementById('confirm-purchase');
    confirmButton.textContent = 'Traitement en cours...';
    confirmButton.disabled = true;
    
    try {
        // Simulate API call - in a real app, this would communicate with your backend
        await simulatePaymentProcessing();
        
        // Hide payment modal and show success
        hideAllModals();
        showModal('purchase-success-modal');
        
        // Reset form
        document.getElementById('payment-form').reset();
    } catch (error) {
        alert('Erreur lors du traitement du paiement: ' + error.message);
    } finally {
        // Reset button state
        confirmButton.textContent = 'Confirmer l\'achat';
        confirmButton.disabled = false;
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
    }
    
    // Load existing messages
    loadForumMessages(gameId);
}

async function loadForumMessages(gameId) {
    const messagesContainer = document.getElementById('forum-messages');
    
    // In a real application, you would fetch messages from the server
    // For this demo, we'll simulate some messages
    
    // Clear loading message
    setTimeout(() => {
        messagesContainer.innerHTML = '';
        
        // Add some sample messages
        const sampleMessages = [
            {
                user: 'GameMaster',
                time: '2 heures',
                content: 'Bienvenue dans le forum de ce jeu ! N\'hésitez pas à poser vos questions ou à partager vos expériences.'
            },
            {
                user: 'ProGamer123',
                time: '1 heure',
                content: 'Ce jeu est incroyable ! J\'ai passé 5 heures dessus hier et je n\'ai pas vu le temps passer.'
            },
            {
                user: 'Newbie42',
                time: '30 minutes',
                content: 'Est-ce que quelqu\'un peut m\'aider avec le niveau 3 ? Je reste bloqué au même endroit...'
            },
            {
                user: 'DevFan',
                time: '15 minutes',
                content: 'Les graphismes sont vraiment impressionnants. Quelle carte graphique utilisez-vous pour jouer ?'
            }
        ];
        
        sampleMessages.forEach(message => {
            messagesContainer.appendChild(createMessageElement(message));
        });
        
        // Scroll to bottom of messages
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 1000);
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

function sendForumMessage(gameId) {
    if (!isUserAuthenticated()) {
        showModal('login-required-modal');
        return;
    }
    
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) {
        return; // Don't send empty messages
    }
    
    // In a real app, you would send this to your server
    // For now, we'll just add it to the DOM
    const messagesContainer = document.getElementById('forum-messages');
    
    const newMessage = {
        user: currentUsername,
        time: 'maintenant',
        content: content
    };
    
    messagesContainer.appendChild(createMessageElement(newMessage));
    
    // Clear input and scroll to bottom
    messageInput.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}