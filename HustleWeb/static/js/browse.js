document.addEventListener('DOMContentLoaded', function() {
    checkAuth(); 
    loadGames();
    setupEventListeners();
});

function displayGames(featuredGames, gameCategories) {
    const featuredContainer = document.getElementById('featured-games-container');
    featuredContainer.replaceChildren();
    createGameCards(featuredGames, true).forEach(card => featuredContainer.appendChild(card));
    
    const categoriesContainer = document.getElementById('game-categories-container');
    categoriesContainer.replaceChildren();
    
    gameCategories.forEach(category => {
        const gameSection = document.createElement('div');
        gameSection.classList.add('game-section');
        
        const categoryTitle = document.createElement('h2');
        categoryTitle.textContent = category.name;
        
        const gameRow = document.createElement('div');
        gameRow.classList.add('game-row');
        
        createGameCards(category.games).forEach(card => gameRow.appendChild(card));
        
        gameSection.appendChild(categoryTitle);
        gameSection.appendChild(gameRow);
        categoriesContainer.appendChild(gameSection);
    });
    
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const gameId = this.getAttribute('data-game-id');
            console.log("Card clicked:", gameId);
            window.location.href = `/game/${gameId}`;
        });
    });
}

function setupEventListeners() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('game-search');
    
    if (searchButton) {
        searchButton.addEventListener('click', searchGames);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchGames();
        });
    }
    
    const genreFilter = document.getElementById('genre-filter');
    const platformFilter = document.getElementById('platform-filter');
    const sortBy = document.getElementById('sort-by');
    
    if (genreFilter && platformFilter && sortBy) {
        genreFilter.addEventListener('change', filterGames);
        platformFilter.addEventListener('change', filterGames);
        sortBy.addEventListener('change', filterGames);
    }
    
    const categoriesContainer = document.getElementById('game-categories-container');
    if (categoriesContainer) {
        categoriesContainer.addEventListener('click', function(e) {
            const card = e.target.closest('.game-card');
            if (card) {
                const gameId = card.getAttribute('data-game-id');
                window.location.href = `/game/${gameId}`;
            }
        });
    }
}

function displaySearchResults(results, searchTerm) {
    document.querySelector('.featured-games').style.display = 'none';
    
    const categoriesContainer = document.getElementById('game-categories-container');
    categoriesContainer.replaceChildren();
    
    const gameSection = document.createElement('div');
    gameSection.classList.add('game-section');
    
    const title = document.createElement('h2');
    
    if (results.length === 0) {
        title.textContent = `Search results for "${searchTerm}"`;
        
        const noResults = document.createElement('div');
        noResults.classList.add('no-results');
        
        const noResultsTitle = document.createElement('h2');
        noResultsTitle.textContent = 'No games found';
        
        const noResultsText = document.createElement('p');
        noResultsText.textContent = 'Try a different search term';
        
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-search';
        resetButton.classList.add('btn');
        resetButton.textContent = 'Show All Games';
        
        noResults.appendChild(noResultsTitle);
        noResults.appendChild(noResultsText);
        noResults.appendChild(resetButton);
        
        gameSection.appendChild(title);
        gameSection.appendChild(noResults);
    } else {
        title.textContent = `Search results for "${searchTerm}" (${results.length} games found)`;
        
        const gameRow = document.createElement('div');
        gameRow.classList.add('game-row');
        
        createGameCards(results).forEach(card => gameRow.appendChild(card));
        
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-search';
        resetButton.classList.add('btn');
        resetButton.style.margin = '20px auto';
        resetButton.style.display = 'block';
        resetButton.textContent = 'Show All Games';
        
        gameSection.appendChild(title);
        gameSection.appendChild(gameRow);
        gameSection.appendChild(resetButton);
    }
    
    categoriesContainer.appendChild(gameSection);
    
    document.getElementById('reset-search').addEventListener('click', function() {
        document.getElementById('game-search').value = '';
        loadGames();
    });
}

function loadGames() {
    console.log("All games data:", window.allGames);
    console.log("Game categories:", window.gameCategories);
    
    if (!window.allGames || !window.featuredGames || !window.gameCategories) {
        console.error("Game data not available. Make sure games-data.js is loaded correctly.");
        return;
    }
    
    const categories = window.gameCategories.map(cat => ({
        name: cat,
        games: window.allGames.filter(game => game.category === cat)
    }));
    
    console.log("Processed categories:", categories);
    displayGames(window.featuredGames, categories);
}

function createGameCards(games, featured = false) {
    if (!games || !Array.isArray(games) || games.length === 0) {
        console.warn("No games to display");
        return [];
    }
    
    return games.map(game => {
        const gameCard = document.createElement('div');
        gameCard.classList.add('game-card');
        if (featured) gameCard.classList.add('featured');
        gameCard.setAttribute('data-game-id', game.game_id);
        
        const gameImage = document.createElement('div');
        gameImage.classList.add('game-image');
        if (game.image) {
            gameImage.style.backgroundColor = game.image;
            gameImage.style.backgroundSize = 'cover';
        } else {
            gameImage.style.backgroundColor = '#333';
        }
        
        const gameTitle = document.createElement('h3');
        gameTitle.textContent = game.title;
        
        const gameInfo = document.createElement('p');
        gameInfo.textContent = `${game.category} | ${new Date(game.release_date).getFullYear()}`;
        
        const gamePlatforms = document.createElement('p');
        gamePlatforms.textContent = game.platforms;
        
        const gamePrice = document.createElement('p');
        gamePrice.classList.add('game-price');
        gamePrice.textContent = `$${game.price.toFixed(2)}`;
        
        gameCard.appendChild(gameImage);
        gameCard.appendChild(gameTitle);
        gameCard.appendChild(gameInfo);
        gameCard.appendChild(gamePlatforms);
        gameCard.appendChild(gamePrice);
        
        return gameCard;
    });
}

function searchGames() {
    const searchTerm = document.getElementById('game-search').value.trim().toLowerCase();
    if (!searchTerm) {
        loadGames();
        return;
    }
    
    const results = window.allGames.filter(game => 
        game.title.toLowerCase().includes(searchTerm) || 
        game.description.toLowerCase().includes(searchTerm)
    );
    
    displaySearchResults(results, searchTerm);
}

function filterGames() {
    const genreFilter = document.getElementById('genre-filter').value;
    const platformFilter = document.getElementById('platform-filter').value;
    const sortBy = document.getElementById('sort-by').value;
    
    let filtered = [...window.allGames];
    
    if (genreFilter) {
        filtered = filtered.filter(game => 
            game.category.toLowerCase() === genreFilter.toLowerCase()
        );
    }
    
    if (platformFilter) {
        filtered = filtered.filter(game => {
            const platforms = game.platforms.split(',')
                .map(p => p.trim().toLowerCase());
            return platforms.includes(platformFilter.toLowerCase());
        });
    }
    
    switch(sortBy) {
        case 'price_asc':
        case 'price':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
        case 'rating':
            filtered.sort((a, b) => b.rating_avg - a.rating_avg);
            break;
        case 'release':
            filtered.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
            break;
        default:
            filtered.sort((a, b) => b.rating_avg - a.rating_avg);
    }
    
    displayFilteredResults(filtered);
}

function displayFilteredResults(filteredGames) {
    const categoriesContainer = document.getElementById('game-categories-container');
    document.querySelector('.featured-games').style.display = 'none';
    
    categoriesContainer.replaceChildren();
    
    if (filteredGames.length === 0) {
        const noResults = document.createElement('div');
        noResults.classList.add('no-results');
        
        const title = document.createElement('h2');
        title.textContent = 'No games found';
        
        const message = document.createElement('p');
        message.textContent = 'Try different filter options';
        
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-filters';
        resetButton.classList.add('btn');
        resetButton.textContent = 'Reset Filters';
        
        noResults.appendChild(title);
        noResults.appendChild(message);
        noResults.appendChild(resetButton);
        categoriesContainer.appendChild(noResults);
    } else {
        const gameSection = document.createElement('div');
        gameSection.classList.add('game-section');
        
        const title = document.createElement('h2');
        title.textContent = `Filtered Games (${filteredGames.length} results)`;
        
        const gameRow = document.createElement('div');
        gameRow.classList.add('game-row');
        
        createGameCards(filteredGames).forEach(card => gameRow.appendChild(card));
        
        const resetButton = document.createElement('button');
        resetButton.id = 'reset-filters';
        resetButton.classList.add('btn');
        resetButton.style.margin = '20px auto';
        resetButton.style.display = 'block';
        resetButton.textContent = 'Reset Filters';
        
        gameSection.appendChild(title);
        gameSection.appendChild(gameRow);
        gameSection.appendChild(resetButton);
        categoriesContainer.appendChild(gameSection);
    }
    
    document.getElementById('reset-filters').addEventListener('click', function() {
        document.getElementById('genre-filter').value = '';
        document.getElementById('platform-filter').value = '';
        document.getElementById('sort-by').value = 'popularity';
        loadGames();
        document.querySelector('.featured-games').style.display = 'block';
    });
}