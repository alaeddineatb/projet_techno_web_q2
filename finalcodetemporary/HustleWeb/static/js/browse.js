document.addEventListener('DOMContentLoaded', function() {
    updateNav();
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
    
    // Gestion des clics sur les cartes de jeu
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const gameId = this.getAttribute('data-game-id');
            window.location.href = `/games?id=${gameId}`;
        });
    });
}



function setupEventListeners() {
    // Recherche
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('game-search');
    
    searchButton.addEventListener('click', searchGames);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchGames();
    });
    
    // Filtres
    document.querySelectorAll('#genre-filter, #platform-filter, #sort-by').forEach(filter => {
        filter.addEventListener('change', filterGames);
    });
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
        document.querySelector('.featured-games').style.display = 'block';
        loadGames();
    });
}


document.addEventListener('DOMContentLoaded', function() {
    updateNav();
    loadGames(); // Charge directement depuis gamesdata.js
    setupEventListeners();
});

// Charge les données locales
function loadGames() {
    try {
        // Utilise les données de gamesdata.js
        const categories = gameCategories.map(cat => ({
            name: cat,
            games: getGames(cat)
        }));
        
        displayGames(featuredGames, categories);
    } catch (error) {
        console.error('Error loading games:', error);
        alert('Could not load games data');
    }
}

// Modifie la création des cartes pour correspondre à tes données
function createGameCards(games, featured = false) {
    return games.map(game => {
        const cardClass = featured ? 'game-card featured' : 'game-card';
        
        return `
            <div class="${cardClass}" data-game-id="${game.game_id}">
                <div class="game-image" style="background-color: ${game.image}; background-size: cover;"></div>
                <h3>${game.title}</h3>
                <p>${game.category} | ${new Date(game.release_date).getFullYear()}</p>
                <p>${game.platforms}</p>
                <p class="game-price">$${game.price.toFixed(2)}</p>
            </div>
        `;
    }).join('');
}

// Adapte les fonctions de recherche/filtre pour utiliser les données locales
function searchGames() {
    const searchTerm = document.getElementById('game-search').value.trim().toLowerCase();
    const results = allGames.filter(game => 
        game.title.toLowerCase().includes(searchTerm) || 
        game.description.toLowerCase().includes(searchTerm)
    );
    displaySearchResults(results, searchTerm);
}

function filterGames() {
    const genreFilter = document.getElementById('genre-filter').value;
    const platformFilter = document.getElementById('platform-filter').value;
    const sortBy = document.getElementById('sort-by').value;
    
    let filtered = [...allGames];
    
    if (genreFilter) {
        filtered = filtered.filter(game => game.category === genreFilter);
    }
    
    if (platformFilter) {
        filtered = filtered.filter(game => game.platforms.includes(platformFilter));
    }
    
    // Tri
    switch(sortBy) {
        case 'price_asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
        case 'price_desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
        default:
            filtered.sort((a, b) => b.rating_avg - a.rating_avg);
    }
    
    displayFilteredResults(filtered);
}









function displayFilteredResults(filteredGames) {
    const categoriesContainer = document.getElementById('game-categories-container');
    
    if (filteredGames.length === 0) {
        categoriesContainer.innerHTML = `
            <div class="no-results">
                <h2>No games found</h2>
                <p>Try different filter options</p>
                <button id="reset-filters" class="btn">Reset Filters</button>
            </div>
        `;
        
        document.getElementById('reset-filters').addEventListener('click', function() {
            document.getElementById('genre-filter').value = '';
            document.getElementById('platform-filter').value = '';
            document.getElementById('sort-by').value = 'popularity';
            loadGames();
        });
    } else {
        categoriesContainer.innerHTML = `
            <div class="game-section">
                <h2>Filtered Games</h2>
                <div class="game-row">
                    ${createGameCards(filteredGames)}
                </div>
                <button id="reset-filters" class="btn" style="margin: 20px auto; display: block;">Reset Filters</button>
            </div>
        `;
        
        document.getElementById('reset-filters').addEventListener('click', function() {
            document.getElementById('genre-filter').value = '';
            document.getElementById('platform-filter').value = '';
            document.getElementById('sort-by').value = 'popularity';
            loadGames();
        });
    }
}

// Gestion de la navigation
function updateNav() {
    const navLinks = document.getElementById('nav-links');
    if (!navLinks) return;

    // Vérifier si l'utilisateur est connecté (à adapter avec votre système d'authentification)
    const isLoggedIn = localStorage.getItem('auth_token');
    
    if (isLoggedIn) {
        const username = localStorage.getItem('username');
        navLinks.innerHTML = `
            <a href="/">Home</a>
            <a href="/browse">Browse Games</a>
            <a href="/profile">My Profile</a>
            <a href="#" id="logout-link">Logout (${username})</a>
        `;
        
        document.getElementById('logout-link').addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('auth_token');
            localStorage.removeItem('username');
            window.location.href = '/';
        });
    } else {
        navLinks.innerHTML = `
            <a href="/">Home</a>
            <a href="/browse">Browse Games</a>
            <a href="/login">Login</a>
            <a href="/register">Sign Up</a>
        `;
    }
}