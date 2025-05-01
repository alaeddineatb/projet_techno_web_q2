const allGames = window.allGames || [];

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and update navigation if script.js is available
    if (typeof checkAuth === 'function') {
        checkAuth();
    }
    
    console.log("Données disponibles:", window.allGames); // Debug
    const gameId = window.location.pathname.split('/game/')[1];

    console.log("GameId:", gameId);
    if (gameId) {
        loadGameDetails(gameId);
        setupRatingStars();
    } else {
        console.error("ID du jeu non trouvé dans l'URL");
        // Redirect back to browse if game ID is missing
        setTimeout(() => {
            window.location.href = '/browse';
        }, 1000);
    }

    // Set up event listeners
    document.getElementById('purchase-btn').addEventListener('click', () => purchaseGame(gameId));
    document.getElementById('forum-btn').addEventListener('click', () => goToForum(gameId));
    document.getElementById('submit-rating').addEventListener('click', () => submitRating(gameId));
});

function loadGameDetails(gameId) {
    // Convert to integer for comparison if needed
    const gameIdInt = parseInt(gameId);
    const game = window.allGames.find(g => g.game_id === gameIdInt || g.game_id === gameId);
    console.log("Jeu trouvé:", game); // Debug

    if (!game) {
        console.error('Jeu introuvable');
        alert("Jeu non trouvé. Retour à la liste des jeux.");
        window.location.href = '/browse';
        return;
    }

    // Update the interface
    document.getElementById('game-title').textContent = game.title;
    document.getElementById('game-publisher').textContent = game.publisher;
    document.getElementById('game-category').textContent = game.category;
    document.getElementById('game-price').textContent = game.price;
    document.getElementById('game-rating').textContent = game.rating_avg;
    document.getElementById('game-description').textContent = game.description;

    // Update image if available
    if (game.image) {
        document.getElementById('game-img').src = game.image;
    }
    
    // Update page title
    document.title = `${game.title} - Détails du Jeu - HustleWeb`;
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

async function purchaseGame(gameId) {
    // Check if user is logged in first
    if (!isUserAuthenticated()) {
        alert('Veuillez vous connecter pour acheter ce jeu');
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch(`/games/purchase`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ game_id: gameId })
        });
        
        if (response.ok) {
            alert('Achat réussi!');
        } else {
            const errorText = await response.text();
            alert('Erreur d\'achat: ' + errorText);
        }
    } catch (error) {
        console.error('Purchase error:', error);
        alert('Erreur d\'achat. Veuillez réessayer.');
    }
}

function goToForum(gameId) {
    window.location.href = `/message?gameId=${gameId}`;
}

async function submitRating(gameId) {
    // Check if user is logged in first
    if (!isUserAuthenticated()) {
        alert('Veuillez vous connecter pour noter ce jeu');
        window.location.href = '/login';
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

// Helper function to check if user is authenticated
function isUserAuthenticated() {
    // Check local storage and cookies
    return localStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('token') || document.cookie.includes('token=');
}