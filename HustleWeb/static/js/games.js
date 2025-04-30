const allGames = window.allGames || [];



document.addEventListener('DOMContentLoaded', function() {
    console.log("Données disponibles:", window.allGames); // Debug
    const gameId = window.location.pathname.split('/game/')[1];

    console.log("GameId:", gameId);
    if (gameId) {
        loadGameDetails();
        setupRatingStars();
    
    }

    document.getElementById('purchase-btn').addEventListener('click', purchaseGame);
    document.getElementById('forum-btn').addEventListener('click', goToForum);
    document.getElementById('submit-rating').addEventListener('click', submitRating);

    function loadGameDetails() {
        const game = window.allGames.find(g => g.game_id === parseInt(gameId));
    console.log("Jeu trouvé:", game); // Debug


        if (!game) {
            console.error('Jeu introuvable');
            return;
        }
    
        // Mettre à jour l'interface
        document.getElementById('game-title').textContent = game.title;
        document.getElementById('game-publisher').textContent = game.publisher;
        document.getElementById('game-category').textContent = game.category;
        document.getElementById('game-price').textContent = game.price;
        document.getElementById('game-rating').textContent = game.rating_avg;
        document.getElementById('game-description').textContent = game.description;
    
        
        if (game.image) {
            document.getElementById('game-img').src = game.image;
        }
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

    async function purchaseGame() {
        try {
            const response = await fetch(`/games/purchase`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ game_id: gameId })
            });
            if (response.ok) alert('Achat réussi!');
        } catch (error) {
            alert('Erreur d\'achat');
        }
    }

    function goToForum() {
        window.location.href = `/message?gameId=${gameId}`;
    }

    async function submitRating() {
        try {
            const selectedStar = document.querySelector('#rating-stars span.active:last-child');
            const rating = parseInt(selectedStar.getAttribute('data-value'));
            
            const response = await fetch(`/games/rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ game_id: gameId, rating: rating })
            });
            
            if (response.ok) alert('Note envoyée!');
        } catch (error) {
            alert('Erreur lors de l\'envoi');
        }
    }
});
