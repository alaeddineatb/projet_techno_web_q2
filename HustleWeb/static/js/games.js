const allGames = window.allGames || [];
let currentGame = null;
let currentUsername = localStorage.getItem('username') || 'Utilisateur';
let socket = null;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    const gameId = window.location.pathname.split('/game/')[1];
    console.log("GameId:", gameId);
    
    if (gameId) {
        loadGameDetails(gameId);
        setupRatingStars();
        setupModalHandlers();
        setupForumChat(gameId);
    } else {
        console.error("ID du jeu non trouvé dans l'URL");
        setTimeout(() => {
            window.location.href = '/browse';
        }, 1000);
    }

    document.getElementById('purchase-btn').addEventListener('click', () => handlePurchaseClick(gameId));
    document.getElementById('submit-rating').addEventListener('click', () => submitRating(gameId));
    
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', (e) => processPayment(e, gameId));
    }
    
    setupCardInputFormatting();
});

function loadGameDetails(gameId) {
    const gameIdInt = parseInt(gameId);
    currentGame = window.allGames.find(g => g.game_id === gameIdInt || g.game_id === gameId);
    console.log("Jeu trouvé:", currentGame);

    if (!currentGame) {
        console.error('Jeu introuvable');
        alert("Jeu non trouvé. Retour à la liste des jeux.");
        window.location.href = '/browse';
        return;
    }

    document.getElementById('game-title').textContent = currentGame.title;
    document.getElementById('game-publisher').textContent = currentGame.publisher;
    document.getElementById('game-category').textContent = currentGame.category;
    document.getElementById('game-price').textContent = currentGame.price;
    document.getElementById('game-rating').textContent = currentGame.rating_avg;
    document.getElementById('game-description').textContent = currentGame.description;

    if (currentGame.image) {
        document.getElementById('game-img').src = currentGame.image;
    }
    
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
    if (!isUserAuthenticated()) {
        showModal('login-required-modal');
        return;
    }
    
    if (currentGame) {
        document.getElementById('purchase-game-title').textContent = currentGame.title;
        document.getElementById('purchase-price').textContent = `Prix: ${currentGame.price} €`;
    }
    
    showModal('payment-modal');
}

function setupModalHandlers() {
    document.querySelectorAll('.close-button, .close-modal').forEach(button => {
        button.addEventListener('click', function() {
            hideAllModals();
        });
    });
    
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                hideAllModals();
            }
        });
    });
    
    document.getElementById('go-to-login').addEventListener('click', function() {
        window.location.href = '/login';
    });
}

function showModal(modalId) {
    hideAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

async function submitRating(gameId) {
    if (!isUserAuthenticated()) { showModal('login-required-modal'); return; }

    const rating = document.querySelectorAll('#rating-stars span.active').length;
    if (!rating) { alert('Veuillez sélectionner une note'); return; }

    try {
        const response = await fetch('/games/rate', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_id: Number(gameId), rating })
        });

        const result = await response.json();

        if (!response.ok) {
            alert('Erreur: ' + (result.detail || result.message || 'Une erreur est survenue'));
            return;
        }

        alert(result.message);
        document.getElementById('game-rating').textContent = result.new_average.toFixed(1);
        setTimeout(() => document.querySelectorAll('#rating-stars span.active').forEach(s => s.classList.remove('active')), 2000);
    } catch (err) {
        console.error('Rating error:', err);
        alert('Impossible de noter le jeu. Vérifiez votre connexion.');
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
            credentials: 'include'
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

function isUserAuthenticated() {
    return localStorage.getItem('isLoggedIn') === 'true' || 
           localStorage.getItem('token') || 
           document.cookie.includes('token=');
}

function setupCardInputFormatting() {
    const cardNumberInput = document.getElementById('card-number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let input = this.value.replace(/\D/g, '');
            input = input.replace(/(\d{4})(?=\d)/g, '$1 ');
            this.value = input;
        });
    }
    
    const expiryInput = document.getElementById('card-expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let input = this.value.replace(/\D/g, '');
            if (input.length > 2) {
                input = input.substring(0, 2) + '/' + input.substring(2, 4);
            }
            this.value = input;
        });
    }
    
    const cvvInput = document.getElementById('card-cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
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
        if (loginNotice) loginNotice.style.display = 'block';
    } else {
        if (loginNotice) loginNotice.style.display = 'none';
        sendButton.addEventListener('click', () => sendForumMessage(gameId));
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendForumMessage(gameId);
            }
        });
    }
    
    loadForumMessages(gameId);
    setupWebSocket(gameId);
}

function setupWebSocket(gameId) {
    if (socket) socket.close();

    const host = window.location.hostname === 'localhost' 
        ? '127.0.0.1' 
        : window.location.hostname;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const port = window.location.port ? `:${window.location.port}` : '';
    const wsUrl = `${protocol}//${host}${port}/ws/game/${gameId}`;

    console.log('🔌 Connexion WebSocket:', wsUrl);

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000;

    const connect = () => {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
            console.log('✅ WebSocket connecté');
            reconnectAttempts = 0;
        };

        socket.onerror = (error) => {
            console.error('❌ Erreur WebSocket:', error);
        };

        socket.onclose = (event) => {
            console.log(`🔒 WebSocket fermé (${event.code})`);
            if (reconnectAttempts < maxReconnectAttempts) {
                setTimeout(() => {
                    console.log(`🔄 Reconnexion (tentative ${reconnectAttempts+1}/${maxReconnectAttempts})`);
                    reconnectAttempts++;
                    connect();
                }, reconnectDelay);
            }
        };

        socket.onmessage = event => {
            let msg;
            try {
                msg = JSON.parse(event.data);
            } catch (err) {
                console.error('WS JSON parse error', err, event.data);
                return;
            }

            if (msg.type === 'new_message' && msg.data) {
                addMessageToForum(msg.data);
            } else {
                console.warn('WS message ignored', msg);
            }
        };
    };

    connect();
}

function addMessageToForum(messageData) {
    const { content, created_at } = messageData;
    const username = messageData.user?.username || 'Anonyme';
    const container = document.getElementById('forum-messages');
    if (!container) return;

    const loader = container.querySelector('.loading-messages');
    if (loader) loader.remove();

    const messageEl = document.createElement('div');
    messageEl.className = 'forum-message';
    
    const messageHeader = document.createElement('div');
    messageHeader.className = 'message-header';
    
    const messageUser = document.createElement('span');
    messageUser.className = 'message-user';
    messageUser.textContent = username;
    
    const messageTime = document.createElement('span');
    messageTime.className = 'message-time';
    messageTime.textContent = timeSince(created_at);
    
    const messageContent = document.createElement('p');
    messageContent.className = 'message-content';
    messageContent.textContent = content;
    
    messageHeader.appendChild(messageUser);
    messageHeader.appendChild(messageTime);
    messageEl.appendChild(messageHeader);
    messageEl.appendChild(messageContent);
    
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateY(20px)';
    container.appendChild(messageEl);
    
    setTimeout(() => {
        messageEl.style.transition = 'all 0.3s ease';
        messageEl.style.opacity = '1';
        messageEl.style.transform = 'translateY(0)';
        container.scrollTop = container.scrollHeight;
    }, 10);

    console.log('✅ Message ajouté au forum:', messageData);
}

async function loadForumMessages(gameId) {
    const messagesContainer = document.getElementById('forum-messages');
    if (!messagesContainer) return;

    try {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-messages';
        const loadingText = document.createElement('p');
        loadingText.textContent = 'Chargement des messages...';
        loadingDiv.appendChild(loadingText);
        
        messagesContainer.replaceChildren();
        messagesContainer.appendChild(loadingDiv);

        const response = await fetch(`/games/${gameId}/messages`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const messages = await response.json();

        messagesContainer.replaceChildren();

        if (messages.length === 0) {
            const noMessages = document.createElement('div');
            noMessages.className = 'no-messages';
            const noMessagesText = document.createElement('p');
            noMessagesText.textContent = 'Aucun message pour le moment. Soyez le premier à commenter !';
            noMessages.appendChild(noMessagesText);
            messagesContainer.appendChild(noMessages);
        } else {
            const sortedMessages = messages.sort((a, b) => {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return dateA - dateB;
            });

            console.log('📝 Messages triés par date:', sortedMessages.map(m => m.created_at));

            sortedMessages.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.className = 'forum-message';
                
                const messageHeader = document.createElement('div');
                messageHeader.className = 'message-header';
                
                const messageUser = document.createElement('span');
                messageUser.className = 'message-user';
                messageUser.textContent = msg.user.username;
                
                const messageTime = document.createElement('span');
                messageTime.className = 'message-time';
                messageTime.textContent = timeSince(msg.created_at);
                
                const messageContent = document.createElement('p');
                messageContent.className = 'message-content';
                messageContent.textContent = msg.content;
                
                messageHeader.appendChild(messageUser);
                messageHeader.appendChild(messageTime);
                messageElement.appendChild(messageHeader);
                messageElement.appendChild(messageContent);
                
                messagesContainer.appendChild(messageElement);
            });
        }

        messagesContainer.scrollTop = messagesContainer.scrollHeight;

    } catch (error) {
        console.error('Erreur chargement messages:', error);
        messagesContainer.replaceChildren();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = 'Erreur de chargement des messages';
        messagesContainer.appendChild(errorDiv);
    }
}

async function sendForumMessage(gameId) {
    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();
    
    if (!content) {
        alert('Veuillez saisir un message');
        return;
    }
    
    const sendButton = document.getElementById('send-message');
    const originalText = sendButton.textContent;
    sendButton.disabled = true;
    sendButton.textContent = 'Envoi...';
    
    try {
        const formData = new URLSearchParams();
        formData.append('content', content);

        const response = await fetch(`/games/${gameId}/messages`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        messageInput.value = '';
        
        console.log('✅ Message envoyé avec succès:', data);

    } catch (error) {
        console.error('❌ Erreur envoi message:', error);
        alert(`ERREUR: ${error.message}`);
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = originalText;
    }
}

function timeSince(dateString) {
    const isoDateString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
    const date = new Date(isoDateString);
    
    if (isNaN(date)) {
        console.error(`Date invalide : ${dateString}`);
        return 'date inconnue';
    }

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

window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.close(1000, 'Page fermée');
    }
});

function reconnectWebSocket(gameId) {
    console.log('🔄 Reconnexion manuelle WebSocket...');
    setupWebSocket(gameId);
}