document.addEventListener("DOMContentLoaded", function() {
    const emailForm = document.getElementById("email-form");
    const codeForm = document.getElementById("code-form");
    const passwordForm = document.getElementById("password-form");

    const emailInput = document.getElementById("email");
    const codeInput = document.getElementById("code");
    const newPasswordInput = document.getElementById("new-password");

    const emailError = document.getElementById("email-error");
    const codeError = document.getElementById("code-error");
    const passwordError = document.getElementById("password-error");
    const successMessage = document.getElementById("success-message");

    let userEmail = "";

    // Étape 1 : Envoi du code par email
    emailForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        userEmail = emailInput.value;

        try {
            const response = await fetch("/forgot", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ email: userEmail })
            });

            if (response.ok) {
                emailForm.classList.add("hidden");
                codeForm.classList.remove("hidden");
            } else {
                emailError.textContent = "Email introuvable";
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    });

    // Étape 2 : Validation du code
    codeForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const code = codeInput.value;

        try {
            const response = await fetch("/validate-code", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ emailuser: userEmail, code: code })
            });

            if (response.ok) {
                codeForm.classList.add("hidden");
                passwordForm.classList.remove("hidden");
            } else {
                codeError.textContent = "Code incorrect";
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    });

    // Étape 3 : Réinitialisation du mot de passe
    passwordForm.addEventListener("submit", async function(event) {
        event.preventDefault();
        const newPassword = newPasswordInput.value;

        try {
            const response = await fetch("/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ email: userEmail, new_password: newPassword })
            });

            if (response.ok) {
                passwordForm.classList.add("hidden");
                successMessage.classList.remove("hidden");
                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);
            } else {
                passwordError.textContent = "Erreur lors de la réinitialisation";
            }
        } catch (error) {
            console.error("Erreur:", error);
        }
    });
});
