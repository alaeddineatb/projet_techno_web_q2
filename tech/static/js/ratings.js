document.addEventListener('DOMContentLoaded', function() {

    populateGameFilter();
    loadRatings();

// L
    document.getElementById('game-filter').addEventListener('change', loadRatings);
    document.getElementById('rating-filter').addEventListener('change', loadRatings);

    // Remplir le filtre des jeux
    function populateGameFilter() {
        const filter = document.getElementById('game-filter');
        
        // Option par défaut
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Tous les jeux';
        filter.appendChild(defaultOption);

        // Options des jeux
        allGames.forEach(game => {
            const option = document.createElement('option');
            option.value = game.game_id;
            option.textContent = game.title;
            filter.appendChild(option);
        });
    }

    // Charger les évaluations
    async function loadRatings() {
        const gameId = document.getElementById('game-filter').value;
        const ratingValue = document.getElementById('rating-filter').value;

        try {
            // Simulation de données d'évaluation
            const simulatedRatings = simulateRatings(gameId, ratingValue);
            displayRatings(simulatedRatings);
        } catch (error) {
            console.error('Error loading ratings:', error);
            document.getElementById('ratings').innerHTML = 
                '<p class="error">Erreur de chargement des évaluations</p>';
        }
    }

    // Simuler des données d'évaluation
    function simulateRatings(gameId, ratingFilter) {
        const ratings = [];
        const baseDate = new Date();

        // Générer des évaluations aléatoires
        const gamesToRate = gameId ? allGames.filter(g => g.game_id == gameId) : allGames;
        
        gamesToRate.forEach(game => {
            const ratingCount = Math.floor(Math.random() * 5) + 1; // 1-5 ratings par jeu
            
            for (let i = 0; i < ratingCount; i++) {
                const ratingValue = Math.floor(Math.random() * 5) + 1;
                
                if (ratingFilter && ratingValue != ratingFilter) continue;
                
                ratings.push({
                    game_id: game.game_id,
                    game_title: game.title,
                    rating: ratingValue,
                    comment: getRandomComment(ratingValue, game.title),
                    username: `Joueur${Math.floor(Math.random() * 1000)}`,
                    created_at: new Date(baseDate - Math.random() * 30 * 24 * 60 * 60 * 1000)
                });
            }
        });

        return ratings.sort((a, b) => b.created_at - a.created_at); // Tri par date récente
    }

    // Afficher les évaluations
    function displayRatings(ratings) {
        const container = document.getElementById('ratings');
        container.innerHTML = '';

        if (ratings.length === 0) {
            container.innerHTML = '<p>Aucune évaluation trouvée</p>';
            return;
        }

        ratings.forEach(rating => {
            const card = document.createElement('div');
            card.className = 'rating-card';
            
            const stars = '★'.repeat(rating.rating) + '☆'.repeat(5 - rating.rating);
            
            card.innerHTML = `
                <div class="rating-header">
                    <span class="rating-game">${rating.game_title}</span>
                    <span class="rating-stars" data-rating="${rating.rating}">${stars}</span>
                </div>
                <p class="rating-comment">${rating.comment}</p>
                <div class="rating-footer">
                    <span class="rating-user">${rating.username}</span>
                    <span class="rating-date">${rating.created_at.toLocaleDateString()}</span>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    // Générateur de commentaires aléatoires
    function getRandomComment(rating, gameTitle) {
        const positive = [
            `J'adore ${gameTitle}! Le gameplay est incroyable.`,
            `Graphismes à couper le souffle dans ${gameTitle}.`,
            `Des heures de jeu sans voir le temps passer.`
        ];
        
        const neutral = [
            `${gameTitle} est correct sans plus.`,
            `Assez bon jeu mais pourrait être amélioré.`,
            `Expérience de jeu moyenne.`
        ];
        
        const negative = [
            `Déçu par ${gameTitle}, pas à la hauteur.`,
            `Problèmes techniques fréquents.`,
            `Ne vaut pas son prix selon moi.`
        ];
        
        if (rating >= 4) return positive[Math.floor(Math.random() * positive.length)];
        if (rating >= 2) return neutral[Math.floor(Math.random() * neutral.length)];
        return negative[Math.floor(Math.random() * negative.length)];
    }
});