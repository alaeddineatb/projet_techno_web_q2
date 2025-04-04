// games-data.js - Version compatible avec le modèle backend
const gameCategories = ["Action", "RPG", "Strategy", "Adventure", "Sports", "Simulation"];
const gamePlatforms = ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"];

// Format des jeux correspondant au modèle Game
const featuredGames = [
    {
        game_id: 1,
        title: "Cyber Odyssey",
        description: "Un RPG d'action futuriste avec une histoire immersive",
        price: 59.99,
        release_date: "2025-03-15T00:00:00Z",
        publisher: "Neon Games",
        category: "RPG",
        rating_avg: 4.8,
        platforms: "PC,PlayStation,Xbox",
        image: "#333"
    },
    {
        game_id: 2,
        title: "Galaxy Commander",
        description: "Stratégie spatiale avec gestion de ressources complexes",
        price: 49.99,
        release_date: "2024-11-20T00:00:00Z",
        publisher: "StrategySoft",
        category: "Strategy",
        rating_avg: 4.5,
        platforms: "PC,Mobile",
        image: "#333"
    }
];

const allGames = [
    ...featuredGames,
    {
        game_id: 3,
        title: "Speed Demons",
        description: "Course de rue avec personnalisation poussée des véhicules",
        price: 39.99,
        release_date: "2025-01-10T00:00:00Z",
        publisher: "Racing Entertainment",
        category: "Racing",
        rating_avg: 4.7,
        platforms: "PlayStation,Xbox,PC",
        image: "#333"
    },
    {
        game_id: 4,
        title: "Mystic Lands",
        description: "MMORPG fantastique avec monde ouvert gigantesque",
        price: 29.99,
        release_date: "2024-09-05T00:00:00Z",
        publisher: "Fantasy Studios",
        category: "RPG",
        rating_avg: 4.9,
        platforms: "PC",
        image: "#333"
    }
];

// Fonction utilitaire pour récupérer les jeux
function getGames(category = null) {
    if (!category) return allGames;
    return allGames.filter(game => game.category === category);
}

// Export pour utilisation dans d'autres fichiers
export { featuredGames, allGames, getGames, gameCategories, gamePlatforms };