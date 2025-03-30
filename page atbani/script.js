const API_KEY = "";
const BASE_URL = "";

function getGameInfo(gameId) {
  const url = BASE_URL + gameId + "?key=" + API_KEY;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      let content = "<h2>" + data.name + "</h2>";
      
      if (data.background_image) {
        content += '<img src="' + data.background_image + '" alt="' + data.name + '">';
      }
      
      content += "<p>" + (data.description_raw || "Pas de description disponible.") + "</p>";
      
      document.getElementById("gameDetails").innerHTML = content;
    })
    .catch(error => {
      console.error("Erreur lors de la récupération du jeu :", error);
    });
}

const listItems = document.querySelectorAll("#gameList li");
listItems.forEach(item => {
  item.addEventListener("click", function() {
    const gameId = this.getAttribute("data-game-id");
    getGameInfo(gameId);
  });
});
