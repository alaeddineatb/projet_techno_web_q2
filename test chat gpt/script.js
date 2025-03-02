document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
  
    // Écoute de l'événement submit pour validation personnalisée
    loginForm.addEventListener('submit', function(event) {
      // Récupération et vérification des valeurs saisies
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();
  
      if (!username || !password) {
        event.preventDefault(); // Empêche l'envoi du formulaire
        alert('Veuillez remplir tous les champs.');
        return;
      }
  
      // Vous pouvez ajouter ici d'autres validations (par exemple, vérification du format)
      // ou même envoyer le formulaire via AJAX si nécessaire.
  
      // Pour l'instant, si tout est OK, le formulaire se soumet normalement.
    });
  });
  