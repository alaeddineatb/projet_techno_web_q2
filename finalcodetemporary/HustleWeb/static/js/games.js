import { allGames } from './gamesdata.js';

document.addEventListener('DOMContentLoaded', function() {
    const gameId = new URLSearchParams(window.location.search).get('id');
    if (!gameId) {
        window.location.href = '/';
        return;
    }

    loadGameDetails();
    setupRatingStars();

    document.getElementById('purchase-btn').addEventListener('click', purchaseGame);
    document.getElementById('forum-btn').addEventListener('click', goToForum);
    document.getElementById('submit-rating').addEventListener('click', submitRating);

    function loadGameDetails() {
        const game = allGames.find(g => g.game_id == gameId);
        if (!game) {
            console.error('Jeu introuvable');
            return;
        }
        
        document.getElementById('game-title').textContent = game.title;
        document.getElementById('game-publisher').textContent = game.publisher;
        document.getElementById('game-category').textContent = game.category;
        document.getElementById('game-price').textContent = `$${game.price.toFixed(2)}`;
        document.getElementById('game-rating').textContent = game.rating_avg.toFixed(1);
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

    function purchaseGame() {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            window.location.href = '/login';
            return;
        }

        let purchases = JSON.parse(localStorage.getItem('purchases')) || [];
        if (purchases.find(p => p.user_id == userId && p.game_id == gameId)) {
            alert('Vous avez déjà acheté ce jeu.');
            return;
        }

        purchases.push({ user_id: userId, game_id: gameId, date: new Date().toISOString() });
        localStorage.setItem('purchases', JSON.stringify(purchases));
        alert('Achat effectué avec succès!');
    }

    function goToForum() {
        window.location.href = `/message?gameId=${gameId}`;
    }

    function submitRating() {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            window.location.href = '/login';
            return;
        }

        const selectedStar = document.querySelector('#rating-stars span.active:last-child');
        if (!selectedStar) {
            alert('Veuillez sélectionner une note');
            return;
        }

        let ratings = JSON.parse(localStorage.getItem('ratings')) || [];
        ratings.push({ user_id: userId, game_id: gameId, rating: parseInt(selectedStar.getAttribute('data-value')) });
        localStorage.setItem('ratings', JSON.stringify(ratings));
        alert('Merci pour votre évaluation!');
    }
});
