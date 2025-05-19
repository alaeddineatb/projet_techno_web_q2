document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgot-form');
    const codeSection = document.getElementById('code-section');

    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
        e.preventDefault();  // Bloque le comportement par défaut
        
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch('/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })  // Envoi en JSON
            });
            
            if (response.ok) {

                document.getElementById('email-form').classList.add('hidden');
                document.getElementById('code-form').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    });

    document.getElementById('reset-password').addEventListener('click', async function() {
        const email = document.getElementById('email').value;
        const code = document.getElementById('code').value;
        const newPassword = document.getElementById('new-password').value;

        try {
            // Validation du code
            const codeResponse = await fetch('/validate-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ emailuser: email, code: code })
            });

            if (!codeResponse.ok) {
                alert('Code invalide');
                return;
            }

            // Réinitialisation du mot de passe
            const resetResponse = await fetch('/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, new_password: newPassword })
            });

            if (resetResponse.ok) {
                alert('Mot de passe réinitialisé avec succès!');
                window.location.href = '/login';
            } else {
                alert('Erreur lors de la réinitialisation du mot de passe');
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    });


    async function handleForgotPassword() {
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch('/forgot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // <-- ESSENTIEL
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email }) // Format JSON
            });
    
            if (response.ok) {

            }
        } catch (error) {
            console.error("Erreur :", error);
        }
    }
});
