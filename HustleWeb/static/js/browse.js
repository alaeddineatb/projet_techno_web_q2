//import { featuredGames, allGames, getGames, gameCategories } from './games-data.js';


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
    console.log("Attaching listeners"); 
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const gameId = this.getAttribute('data-game-id');
            console.log("Card clicked:", this.getAttribute('data-game-id'));
            window.location.href = `/game/${gameId}`;
        });
    });
}


function setupEventListeners() {

    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('game-search');
    
    searchButton.addEventListener('click', searchGames);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchGames();
    });
    

    document.getElementById('game-categories-container').addEventListener('click', function(e) {
        const card = e.target.closest('.game-card');
        if (card) {
            console.log("Click!");
            const gameId = card.getAttribute('data-game-id');
            window.location.href = `/game/${gameId}`;
        }
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
    console.log("Categories:", window.gameCategories);
    console.log("AllGames:", window.allGames);
    const categories = window.gameCategories.map(cat => ({
        name: cat,
        games: window.allGames.filter(game => game.category === cat)
    }));
    console.log("Processed categories:", categories);
    displayGames(window.featuredGames, categories);
}


function categorizeGames(games) {
    // Groupe les jeux par catégorie
    return games.reduce((acc, game) => {
        if (!acc[game.category]) acc[game.category] = [];
        acc[game.category].push(game);
        return acc;
    }, {});
}


// Modifie la création des cartes pour correspondre à tes données
function createGameCards(games, featured = false) {
    console.log("Creating cards:", games);
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

    const token = localStorage.getItem('token'); 
    
    if (token) {
        const username = localStorage.getItem('username');
        navLinks.innerHTML = `
            <a href="/">Home</a>
            <a href="/browse">Browse Games</a>
            <a href="/profile">My Profile</a>
            <a href="#" id="logout-link">Logout (${username})</a>
        `;
        
        document.getElementById('logout-link').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = '/login';
        });
    } else {
        navLinks.innerHTML = `
            <a href="/">Home</a>
            <a href="/browse">Browse Games</a>
            <a href="/login">Login</a>
            <a href="/signup">Sign Up</a>
            <a href="/profile">My Profile</a>
        `;
    }
}