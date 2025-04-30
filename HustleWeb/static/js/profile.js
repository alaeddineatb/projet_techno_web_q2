document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('token')) {
        window.location.href = '/login';
        return;
    }
    displayUserInfo();
    setupPhotoUpload();
});

function displayUserInfo() {
    const username = localStorage.getItem('username');
    document.getElementById('profile-username').textContent = username;
    const profilePic = localStorage.getItem('profilePic') || '/static/img/default-avatar.jpg';
    document.getElementById('profile-pic').src = profilePic;
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
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('profile-pic').src = data.photo_url;
                localStorage.setItem('profilePic', data.photo_url);
                alert('Photo mise à jour!');
            }
        } catch (error) {
            alert('Erreur lors de l\'upload');
        }
    });
}