document.addEventListener('DOMContentLoaded', function() {
    // First make sure authentication is checked and navigation is updated
    checkAuth(); // Use the function from script.js
    
    // Then load games and set up event listeners
    loadGames();
    setupEventListeners();
});

function displayGames(featuredGames, gameCategories) {
    const featuredContainer = document.getElementById('featured-games-container');
    featuredContainer.innerHTML = createGameCards(featuredGames, true);
    
    const categoriesContainer = document.getElementById('game-categories-container');
    categoriesContainer.innerHTML = '';
    
    gameCategories.forEach(category => {
        categoriesContainer.innerHTML += `
            <div class="game-section">
                <h2>${category.name}</h2>
                <div class="game-row">
                    ${createGameCards(category.games)}
                </div>
            </div>
        `;
    });
    
    // Set up click handlers for game cards
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
    
    // Set up filter change listeners
    const genreFilter = document.getElementById('genre-filter');
    const platformFilter = document.getElementById('platform-filter');
    const sortBy = document.getElementById('sort-by');
    
    if (genreFilter && platformFilter && sortBy) {
        genreFilter.addEventListener('change', filterGames);
        platformFilter.addEventListener('change', filterGames);
        sortBy.addEventListener('change', filterGames);
    }
    
    // Add delegation for game card clicks
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
    
    if (results.length === 0) {
        categoriesContainer.innerHTML = `
            <div class="game-section">
                <h2>Search results for "${searchTerm}"</h2>
                <div class="no-results">
                    <h2>No games found</h2>
                    <p>Try a different search term</p>
                    <button id="reset-search" class="btn">Show All Games</button>
                </div>
            </div>
        `;
    } else {
        categoriesContainer.innerHTML = `
            <div class="game-section">
                <h2>Search results for "${searchTerm}" (${results.length} games found)</h2>
                <div class="game-row">
                    ${createGameCards(results)}
                </div>
                <button id="reset-search" class="btn" style="margin: 20px auto; display: block;">Show All Games</button>
            </div>
        `;
    }
    
    document.getElementById('reset-search').addEventListener('click', function() {
        document.getElementById('game-search').value = '';
        loadGames();
    });
}

// Load games from window.gamesData
function loadGames() {
    console.log("Loading games data...");
    
    // Ensure we have access to the games data
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
        return "";
    }
    
    return games.map(game => {
        const cardClass = featured ? 'game-card featured' : 'game-card';
        const imageStyle = game.image 
            ? `background-color: ${game.image}; background-size: cover;` 
            : `background-color: #333;`;
            
        return `
            <div class="${cardClass}" data-game-id="${game.game_id}">
                <div class="game-image" style="${imageStyle}"></div>
                <h3>${game.title}</h3>
                <p>${game.category} | ${new Date(game.release_date).getFullYear()}</p>
                <p>${game.platforms}</p>
                <p class="game-price">$${game.price.toFixed(2)}</p>
            </div>
        `;
    }).join('');
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
        filtered = filtered.filter(game => game.category === genreFilter);
    }
    
    if (platformFilter) {
        filtered = filtered.filter(game => game.platforms.includes(platformFilter));
    }
    
    // Sort results
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
            // Default to popularity (we can use rating as a proxy)
            filtered.sort((a, b) => b.rating_avg - a.rating_avg);
    }
    
    displayFilteredResults(filtered);
}

function displayFilteredResults(filteredGames) {
    const categoriesContainer = document.getElementById('game-categories-container');
    document.querySelector('.featured-games').style.display = 'none';
    
    if (filteredGames.length === 0) {
        categoriesContainer.innerHTML = `
            <div class="no-results">
                <h2>No games found</h2>
                <p>Try different filter options</p>
                <button id="reset-filters" class="btn">Reset Filters</button>
            </div>
        `;
    } else {
        categoriesContainer.innerHTML = `
            <div class="game-section">
                <h2>Filtered Games (${filteredGames.length} results)</h2>
                <div class="game-row">
                    ${createGameCards(filteredGames)}
                </div>
                <button id="reset-filters" class="btn" style="margin: 20px auto; display: block;">Reset Filters</button>
            </div>
        `;
    }
    
    document.getElementById('reset-filters').addEventListener('click', function() {
        document.getElementById('genre-filter').value = '';
        document.getElementById('platform-filter').value = '';
        document.getElementById('sort-by').value = 'popularity';
        loadGames();
        document.querySelector('.featured-games').style.display = 'block';
    });
}