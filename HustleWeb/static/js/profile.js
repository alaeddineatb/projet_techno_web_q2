document.addEventListener('DOMContentLoaded', function() {
    // SUPPRIME cette vérification localStorage
    displayUserInfo();
    setupPhotoUpload();
});

function displayUserInfo() {

    const usernameElement = document.getElementById('profile-username');
    const profilePicElement = document.getElementById('profile-pic');
    
    // Les valeurs seront injectées directement par le backend dans le HTML
    usernameElement.textContent = usernameElement.dataset.username;
    profilePicElement.src = usernameElement.dataset.profilePic || '/static/img/default-avatar.jpg';
}

function setupPhotoUpload() {
    const uploadInput = document.getElementById('photo-upload');
    uploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch('/profile/update', {
                method: 'POST',
                credentials: 'include',  // Garde seulement ça
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('profile-pic').src = data.photo_url + "?t=" + Date.now();
        
            }
        } catch (error) {
            alert('Erreur lors de l\'upload');
        }
    });
}