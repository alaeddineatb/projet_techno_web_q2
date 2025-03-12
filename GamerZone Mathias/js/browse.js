document.addEventListener('DOMContentLoaded', function() {
    displayGames();
    setupEventListeners();
});

function displayGames() {
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
    
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            alert(`You selected ${title}!`);
        });
    });
}

function createGameCards(games, featured = false) {
    return games.map(game => {
        const cardClass = featured ? 'game-card featured' : 'game-card';
        const platforms = Array.isArray(game.platforms) ? game.platforms.join(', ') : game.platforms;
        const year = game.year ? game.year : '';
        
        return `
            <div class="${cardClass}">
                <div class="game-image" style="background-color: ${game.image};"></div>
                <h3>${game.title}</h3>
                <p>${game.genre}${year ? ' | ' + year : ''}</p>
                ${platforms ? `<p>${platforms}</p>` : ''}
            </div>
        `;
    }).join('');
}

function setupEventListeners() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('game-search');
    
    searchButton.addEventListener('click', function() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        if (searchTerm === '') {
            displayGames();
            return;
        }
        searchGames(searchTerm);
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchButton.click();
        }
    });
    
    const filters = document.querySelectorAll('#genre-filter, #platform-filter, #sort-by');
    filters.forEach(filter => {
        filter.addEventListener('change', filterGames);
    });
}

function searchGames(searchTerm) {
    const allGames = [...featuredGames];
    gameCategories.forEach(category => {
        allGames.push(...category.games);
    });
    
    const uniqueGames = [...new Map(allGames.map(game => [game.title, game])).values()];
    
    const results = uniqueGames.filter(game => 
        game.title.toLowerCase().includes(searchTerm) || 
        game.genre.toLowerCase().includes(searchTerm)
    );
    
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
    
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            alert(`You selected ${title}!`);
        });
    });
    
    document.getElementById('reset-search').addEventListener('click', function() {
        document.getElementById('game-search').value = '';
        document.querySelector('.featured-games').style.display = 'block';
        displayGames();
    });
}

function filterGames() {
    const genreFilter = document.getElementById('genre-filter').value.toLowerCase();
    const platformFilter = document.getElementById('platform-filter').value.toLowerCase();
    const sortBy = document.getElementById('sort-by').value;
    
    if (!genreFilter && !platformFilter && sortBy === 'popularity') {
        displayGames();
        return;
    }
    
    let filteredCategories = JSON.parse(JSON.stringify(gameCategories));
    
    filteredCategories.forEach(category => {
        if (genreFilter) {
            category.games = category.games.filter(game => 
                game.genre.toLowerCase().includes(genreFilter)
            );
        }
        
        if (platformFilter) {
            category.games = category.games.filter(game => {
                if (!game.platforms) return false;
                
                const platforms = Array.isArray(game.platforms) ? 
                    game.platforms.join(' ').toLowerCase() : 
                    game.platforms.toLowerCase();
                
                return platforms.includes(platformFilter) || 
                       platforms.includes('all platforms');
            });
        }
        
        if (sortBy === 'rating') {
            category.games.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === 'release') {
            category.games.sort((a, b) => (b.year || 0) - (a.year || 0));
        }
    });
    
    const totalGames = filteredCategories.reduce(
        (total, category) => total + category.games.length, 0
    );
    
    const categoriesContainer = document.getElementById('game-categories-container');
    
    if (totalGames === 0) {
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
            displayGames();
        });
        
        return;
    }
    
    categoriesContainer.innerHTML = '';
    filteredCategories.forEach(category => {
        if (category.games.length === 0) return;
        
        categoriesContainer.innerHTML += `
            <div class="game-section">
                <h2>${category.name}</h2>
                <div class="game-row">
                    ${createGameCards(category.games)}
                </div>
            </div>
        `;
    });
    
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const title = this.querySelector('h3').textContent;
            alert(`You selected ${title}!`);
        });
    });
}